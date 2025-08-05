// www/js/services/apiService.js - YENİ VE MERKEZİLEŞTİRİLMİŞ VERSİYON

import {
    buildUnifiedSolutionPrompt,
    buildCorrectionPrompt,
    buildMathValidationPrompt
} from './promptBuilder.js';

// --- Sabitler ve Ayarlar ---
// API Anahtarınızı buraya güvenli bir şekilde ekleyin. Bu sadece bir örnek.
const GEMINI_API_KEY = "AIzaSyDHFrVt_EBJkb-pRhpSorA_RLxTdrxHuKo";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
const MAX_RETRIES = 2; // Başarısız istek en fazla 2 kez daha denenecek (toplamda 3 deneme).

/**
 * API'den gelen metin içinde gömülü olan JSON verisini güvenli bir şekilde çıkarır.
 * Kod bloklarını (```json ... ```) ve diğer metinleri temizler.
 * @param {string} text API'den gelen ham metin.
 * @returns {string|null} Ayıklanmış JSON dizesi veya bulunamazsa null.
 */
function extractJson(text) {
    if (!text) return null;

    // ```json veya ``` ile başlayıp ``` ile biten kod bloklarını ara
    const jsonRegex = /```(json)?\s*(\{[\s\S]*\})\s*```/;
    const match = text.match(jsonRegex);

    if (match && match[2]) {
        return match[2];
    }

    // Eğer kod bloğu yoksa, metnin içindeki ilk { ve son } arasındaki kısmı almayı dene
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        return text.substring(firstBrace, lastBrace + 1);
    }

    return null; // JSON bulunamadı
}


/**
 * Bir JSON dizesini güvenli bir şekilde parse eder. Hata durumunda null döner.
 * @param {string} jsonString Parse edilecek JSON dizesi.
 * @returns {object|null} Parse edilmiş nesne veya null.
 */
function safeJsonParse(jsonString) {
    if (!jsonString) return null;
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('JSON Parse hatası:', error.message);
        console.log('Sorunlu JSON dizesi:', jsonString);
        return null;
    }
}


// js/services/apiService.js dosyasındaki mevcut callGeminiSmart fonksiyonunu silip bu versiyonu yapıştırın.

async function callGeminiSmart(initialPrompt, imageBase64, onProgress) {
    let lastError = null;
    let lastFaultyResponse = '';
    let currentPrompt = initialPrompt;

    // Exponential Backoff için başlangıç ayarları
    const maxRetries = 4; // Toplamda 4 deneme
    let delay = 1000; // Başlangıç gecikmesi 1 saniye

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`API İsteği Deneme #${attempt}. Bekleme süresi: ${delay}ms`);
        if (attempt > 1 && onProgress) {
            const message = lastError && (lastError.includes('JSON') || lastError.includes('parse')) ?
                'Yapay zeka yanıtı düzeltiyor, lütfen bekleyin...' :
                `API Limiti Aşıldı. ${delay/1000} saniye sonra yeniden denenecek...`;
            onProgress(message);
        }

        const payloadParts = [{ text: currentPrompt }];
        if (imageBase64 && attempt === 1) {
            payloadParts.push({ inlineData: { mimeType: 'image/png', data: imageBase64 } });
        }

        const payload = { contents: [{ role: "user", parts: payloadParts }] };

        try {
            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // 429 hatasını burada özel olarak yakala
            if (response.status === 429) {
                lastError = `API Rate Limit Aşıldı (429).`;
                // Eğer son deneme değilse, döngünün bir sonraki adımına geçmeden önce bekle
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // Bekleme süresini ikiye katla
                    continue; // Döngünün bir sonraki adımına geç
                } else {
                    // Son denemede de 429 hatası alınırsa, hata fırlat
                    throw new Error(lastError);
                }
            }

            if (!response.ok) {
                throw new Error(`API HTTP Hatası: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!rawText) throw new Error('API yanıtı boş veya geçersiz formatta.');

            lastFaultyResponse = rawText;
            const jsonString = extractJson(rawText);

            if (!jsonString) throw new Error('Yanıt içinde JSON formatı bulunamadı.');

            const parsedJson = safeJsonParse(jsonString);

            if (!parsedJson) throw new Error('JSON parse edilemedi.');

            console.log(`Deneme #${attempt} başarılı!`);
            return parsedJson; // Başarılı olursa döngüden çık ve sonucu döndür

        } catch (error) {
            lastError = error.message;
            console.warn(`Deneme #${attempt} başarısız oldu: ${lastError}`);

            // Eğer hata JSON ile ilgiliyse ve son deneme değilse, düzeltme prompt'u ile tekrar dene
            if (lastError.toLowerCase().includes('json') || lastError.toLowerCase().includes('parse')) {
                currentPrompt = buildCorrectionPrompt(initialPrompt, lastFaultyResponse, lastError);
            }
            
            // Eğer son deneme ise, döngüyü sonlandır ve nihai hatayı göster
            if (attempt >= maxRetries) {
                 console.error("Tüm API denemeleri başarısız oldu.");
                 window.dispatchEvent(new CustomEvent('show-error-message', {
                     detail: { message: `API ile iletişim kurulamadı. Hata: ${lastError}`, isCritical: true }
                 }));
                 return null;
            }

            // Eğer hata 429 değilse ve son deneme değilse, bir sonraki deneme için bekle
            if (!lastError.includes('429')) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Bekleme süresini ikiye katla
            }
        }
    }
    return null; // Döngü biterse null döndür
}

// --- YENİ BİRLEŞİK SERVİS FONKSİYONLARI ---

/**
 * Bir matematik problemi için tüm çözüm verilerini (özet, adımlar, seçenekler) tek bir API çağrısıyla alır.
 * @param {string} problemContext Problemin metin açıklaması.
 * @param {string|null} imageBase64 Problemin görseli (base64 formatında).
 * @param {function} onProgress İlerleme durumunu bildiren callback.
 * @returns {Promise<object|null>} Birleşik çözüm verisi nesnesi.
 */
export async function getUnifiedSolution(problemContext, imageBase64, onProgress) {
    const promptText = buildUnifiedSolutionPrompt(problemContext);
    return await callGeminiSmart(promptText, imageBase64, onProgress);
}

/**
 * Verilen bir metnin matematik problemi olup olmadığını doğrular.
 * @param {string} problemContext Doğrulanacak metin.
 * @param {string|null} imageBase64 Metne eşlik eden görsel.
 * @param {function} onProgress İlerleme durumunu bildiren callback.
 * @returns {Promise<object|null>} Doğrulama sonucu nesnesi.
 */
export async function validateMathProblem(problemContext, imageBase64 = null, onProgress) {
    const promptText = buildMathValidationPrompt(problemContext);

    try {
        const result = await callGeminiSmart(promptText, imageBase64, onProgress);

        if (!result || typeof result.isMathProblem !== 'boolean') {
            console.warn('Matematik validasyon yanıtı geçersiz, fallback kullanılıyor.');
            return {
                isMathProblem: false,
                confidence: 0,
                category: "not_math",
                reason: "İçerik analiz edilemedi veya geçersiz bir formatta.",
                educationalMessage: "Lütfen daha net bir matematik sorusu göndermeyi deneyin."
            };
        }
        return result;
    } catch (error) {
        console.error('Matematik validasyon API çağrısı sırasında hata:', error);
        return {
            isMathProblem: false,
            confidence: 0,
            category: "error",
            reason: "Doğrulama servisiyle iletişim kurulamadı.",
            educationalMessage: "Bir hata oluştu. Lütfen internet bağlantınızı kontrol edip tekrar deneyin."
        };
    }
}

// js/services/apiService.js dosyasındaki mevcut validateStudentStep fonksiyonunu silip bu DÜZELTİLMİŞ versiyonu yapıştırın.

export async function validateStudentStep(studentInput, stepData) {
    // Problemin tam çözüm akışını string'e çevirirken 'correctAnswer' kullanılıyor.
    const allStepsString = JSON.stringify(stepData.allSteps.map(s => s.correctAnswer));

    const validationPrompt = `
        Sen, son derece anlayışlı, esnek ve teşvik edici bir matematik öğretmenisin. Görevin, öğrencinin cevabını, çözüm akışının tamamını göz önünde bulundurarak değerlendirmektir.

        **TEMEL KURAL: MATEMATİKSEL EŞDEĞERLİK VE ADIM ATLAMAYI ANLAMA**
        Öğrencinin cevabı, beklenen adıma veya **gelecekteki herhangi bir adıma** matematiksel olarak eşdeğerse, cevabı DOĞRU kabul et.

        **DEĞERLENDİRME BİLGİLERİ:**
        - Problemin Tam Çözüm Akışı: ${allStepsString}
        - Mevcut Adım Açıklaması: "${stepData.description}"
        - Mevcut Adımda Beklenen Cevap (LaTeX): "${stepData.correctAnswer}"
        - Öğrencinin Verdiği Cevap: "${studentInput}"
        - Mevcut Adım Numarası: ${stepData.currentStepIndex + 1}

        **DEĞERLENDİRME KURALLARI:**
        1.  **Eşdeğerlik Kontrolü:** Öğrencinin cevabının, çözüm akışındaki adımlardan herhangi birine matematiksel olarak eşdeğer olup olmadığını kontrol et. (Örn: "2(x+5)" ile "2x+10" eşdeğerdir).
        2.  **Adım Tespiti:** Eğer cevap doğruysa, çözüm akışında hangi adıma karşılık geldiğini bul (örneğin, 3. adıma).
        3.  **Geri Bildirim Stili:** ASLA "Yanlış cevap", "Hatalı" gibi yargılayıcı ifadeler kullanma. Her zaman yapıcı, yol gösterici ve pozitif bir dil kullan. Öğrencinin yazdığı ifadeye doğrudan atıfta bulunarak geri bildirim ver.
        4.  **Final Cevap Tespiti:** Eğer öğrenci doğrudan final cevabı verdiyse (genellikle son adım), bunu 'isFinalAnswer' olarak işaretle.

        **İSTENEN JSON YANIT FORMATI (SADECE JSON):**
        {
          "isCorrect": boolean,
          "matchedStepIndex": number,
          "isFinalAnswer": boolean,
          "feedbackMessage": "Kişiselleştirilmiş, sıcak ve eğitici geri bildirim mesajı. Öğrencinin cevabına atıfta bulunsun.",
          "hintForNext": "Eğer cevap doğruysa bir sonraki adım için kısa bir ipucu veya yanlışsa mevcut adımı çözmek için bir yönlendirme."
        }

        Lütfen SADECE JSON formatında bir yanıt ver.
    `;

    const result = await callGeminiSmart(validationPrompt, null, () => {});
    return result;
}