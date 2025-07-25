/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

//const {setGlobalOptions} = require("firebase-functions");
//const {onRequest} = require("firebase-functions/https");
//const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
//setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });


// functions/index.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();
const db = admin.firestore();

// API Anahtarını güvenli bir şekilde sakla
// Terminalden: firebase functions:config:set gemini.apikey="SENIN_GEMINI_API_ANAHTARIN"
const genAI = new GoogleGenerativeAI(functions.config().gemini.apikey);

// Rate limiting ve Firestore sayaç fonksiyonları
async function checkRateLimit(userId) {
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();
    if (!doc.exists) return false;

    const userData = doc.data();
    const queryLimit = userData.membershipType === 'premium' ? 200 : 5;
    return userData.dailyQueryCount < queryLimit;
}

async function updateQueryCount(userId) {
    const userRef = db.collection('users').doc(userId);
    await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(userRef);
        if (!doc.exists) return;
        const newCount = (doc.data().dailyQueryCount || 0) + 1;
        transaction.update(userRef, { dailyQueryCount: newCount });
    });
}

exports.solveMathProblem = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Kullanıcı Kimlik Doğrulaması
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Bu işlemi yapmak için giriş yapmalısınız.');
    }
    const userId = context.auth.uid;

    // 2. Rate Limiting Kontrolü
    const canMakeRequest = await checkRateLimit(userId);
    if (!canMakeRequest) {
        throw new functions.https.HttpsError('resource-exhausted', 'Günlük sorgu limitinize ulaştınız.');
    }

    const { problemData, type } = data;

    // 3. Input Validation
    if (!problemData || !type) {
        throw new functions.https.HttpsError('invalid-argument', 'Geçersiz istek: "problemData" ve "type" alanları zorunludur.');
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Model adını kontrol et

        // problemData'yı `generateContent` formatına uygun hale getir
        const requestParts = [
            { text: masterSolutionPrompt.replace('{PROBLEM_CONTEXT}', type === 'text' ? problemData.text : "Görseldeki problemi çöz.") },
            problemData.sourcePayloadPart
        ];

        const result = await model.generateContent({ contents: [{ role: "user", parts: requestParts }] });

        // API yanıtını işle
        const responseText = result.response.candidates[0].content.parts[0].text;
        
        // JSON yanıtını güvenli bir şekilde parse et
        const parsedResponse = processGeminiResponse(responseText);
        
        // LaTeX formatını doğrula ve düzelt
        const validatedResponse = validateAndFixLatexFormat(parsedResponse);

        // 4. Kullanım Sayacını Güncelle
        await updateQueryCount(userId);

        // Yanıtı gönder
        return validatedResponse;

    } catch (error) {
        console.error('Math solver error:', error);
        throw new functions.https.HttpsError('internal', 'Problem çözülürken bir sunucu hatası oluştu.');
    }
});

// Bu prompt'u frontend'den backend'e taşıdık
const masterSolutionPrompt = `Matematik problemini çöz ve sadece JSON formatında yanıt ver.

ÖNEMLİ KURALLAR:
1. TÜM matematiksel ifadeleri LaTeX formatında yaz
2. Düz metin olarak matematiksel ifade yazma (1/2 yerine \\frac{1}{2})
3. Sadece JSON yanıt ver, başka hiçbir metin yazma
4. Her adımda cozum_lateks alanı MUTLAKA LaTeX formatında olmalı

Yanıt formatı:
{
  "problemOzeti": {
    "verilenler": ["metin (matematiksel ifadeler LaTeX formatında olmalı)"],
    "istenen": "metin (matematiksel ifadeler LaTeX formatında olmalı)"
  },
  "adimlar": [
    {
      "adimAciklamasi": "metin (matematiksel ifadeler LaTeX formatında olmalı)",
      "cozum_lateks": "LaTeX formatında matematiksel ifade (\\frac{1}{2}, x^2, \\sqrt{a+b} gibi)",
      "ipucu": "metin (matematiksel ifadeler LaTeX formatında olmalı)",
      "yanlisSecenekler": [
        {"metin": "LaTeX formatında yanlış seçenek", "yanlisGeriBildirimi": "metin"},
        {"metin": "LaTeX formatında yanlış seçenek", "yanlisGeriBildirimi": "metin"}
      ]
    }
  ],
  "tamCozumLateks": ["LaTeX formatında matematiksel ifadeler listesi"]
}

LaTeX ÖRNEKLERİ:
- Kesir: \\frac{a}{b} (1/2 yerine \\frac{1}{2})
- Üs: x^2, (a+b)^3
- Kök: \\sqrt{x}, \\sqrt[3]{x}
- Türev: \\frac{d}{dx}(x^2) = 2x
- İntegral: \\int x^2 dx = \\frac{x^3}{3} + C
- Limit: \\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1
- Toplam: \\sum_{n=1}^{\\infty} \\frac{1}{n^2}
- Trigonometrik: \\sin(x), \\cos(x), \\tan(x)
- Logaritma: \\log(x), \\ln(x)
- Eşitlik: a = b, x + y = 10
- Eşitsizlik: x > 0, a \\leq b

ÖRNEK KULLANIM:
- Problem özeti: "Bir kenar uzunluğu: $\\sqrt{8}$ cm"
- Adım açıklaması: "$\\sqrt{8}$'i sadeleştir"
- Çözüm: "\\sqrt{8} = \\sqrt{4 \\times 2} = 2\\sqrt{2}"

Sadece JSON yanıt ver, başka hiçbir metin yazma.
Problem: {PROBLEM_CONTEXT}`;

// API yanıtını güvenli bir şekilde işle
function processGeminiResponse(responseText) {
    try {
        // JSON bloğunu bul
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('JSON bloğu bulunamadı');
        }
        
        // JSON'u parse et
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Temel yapı kontrolü
        if (!parsed.adimlar || !Array.isArray(parsed.adimlar)) {
            throw new Error('Geçersiz yanıt yapısı: adimlar eksik');
        }
        
        return parsed;
    } catch (error) {
        console.error('API yanıt işleme hatası:', error);
        throw new Error('API yanıtı işlenemedi: ' + error.message);
    }
}

// LaTeX formatını doğrula ve düzelt
function validateAndFixLatexFormat(response) {
    try {
        // Problem özetini kontrol et
        if (response.problemOzeti) {
            if (response.problemOzeti.verilenler) {
                response.problemOzeti.verilenler = response.problemOzeti.verilenler.map(fixLatexInText);
            }
            if (response.problemOzeti.istenen) {
                response.problemOzeti.istenen = fixLatexInText(response.problemOzeti.istenen);
            }
        }
        
        // Adımları kontrol et
        if (response.adimlar) {
            response.adimlar = response.adimlar.map(step => {
                if (step.adimAciklamasi) {
                    step.adimAciklamasi = fixLatexInText(step.adimAciklamasi);
                }
                if (step.cozum_lateks) {
                    step.cozum_lateks = fixLatexFormat(step.cozum_lateks);
                }
                if (step.ipucu) {
                    step.ipucu = fixLatexInText(step.ipucu);
                }
                if (step.yanlisSecenekler) {
                    step.yanlisSecenekler = step.yanlisSecenekler.map(option => ({
                        metin: fixLatexFormat(option.metin),
                        yanlisGeriBildirimi: option.yanlisGeriBildirimi
                    }));
                }
                return step;
            });
        }
        
        // Tam çözüm LaTeX'ini kontrol et
        if (response.tamCozumLateks) {
            response.tamCozumLateks = response.tamCozumLateks.map(fixLatexFormat);
        }
        
        return response;
    } catch (error) {
        console.error('LaTeX doğrulama hatası:', error);
        return response; // Hata durumunda orijinal yanıtı döndür
    }
}

// Metin içindeki LaTeX formatını düzelt
function fixLatexInText(text) {
    if (!text || typeof text !== 'string') return text;
    
    // Düz metin kesirleri LaTeX'e çevir
    text = text.replace(/(\d+)\/(\d+)/g, '\\frac{$1}{$2}');
    
    // Düz metin üsleri LaTeX'e çevir
    text = text.replace(/(\w+)\^(\w+)/g, '$1^{$2}');
    
    // Düz metin kökleri LaTeX'e çevir
    text = text.replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}');
    
    return text;
}

// Sadece LaTeX formatını düzelt
function fixLatexFormat(latex) {
    if (!latex || typeof latex !== 'string') return latex;
    
    // Düz metin kesirleri LaTeX'e çevir
    latex = latex.replace(/(\d+)\/(\d+)/g, '\\frac{$1}{$2}');
    
    // Düz metin üsleri LaTeX'e çevir
    latex = latex.replace(/(\w+)\^(\w+)/g, '$1^{$2}');
    
    // Düz metin kökleri LaTeX'e çevir
    latex = latex.replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}');
    
    // Trigonometrik fonksiyonları düzelt
    latex = latex.replace(/(sin|cos|tan|cot|sec|csc)\(([^)]+)\)/g, '\\$1($2)');
    
    // Logaritma fonksiyonlarını düzelt
    latex = latex.replace(/log_(\w+)\(([^)]+)\)/g, '\\log_{$1}($2)');
    latex = latex.replace(/ln\(([^)]+)\)/g, '\\ln($1)');
    
    return latex;
}