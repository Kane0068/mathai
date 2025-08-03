// www/js/services/apiService.js - YENİ VE MERKEZİLEŞTİRİLMİŞ VERSİYON

import {
    buildUnifiedSolutionPrompt,
    buildCorrectionPrompt,
    buildMathValidationPrompt
} from './promptBuilder.js';

// --- Sabitler ve Ayarlar ---
// API Anahtarınızı buraya güvenli bir şekilde ekleyin. Bu sadece bir örnek.
const GEMINI_API_KEY = "AIzaSyDbjH9TXIFLxWH2HuYJlqIFO7Alhk1iQQs";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
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


/**
 * Gemini API'sine akıllı ve kendini düzelten bir istek gönderir.
 * JSON formatlama hatalarını yakalayıp düzeltme prompt'u ile yeniden dener.
 * @param {string} initialPrompt İlk gönderilecek prompt.
 * @param {string|null} imageBase64 Eğer varsa, base64 formatında resim verisi.
 * @param {function} onProgress İlerleme durumunu bildirmek için bir callback fonksiyonu.
 * @returns {Promise<object|null>} Başarılı olursa parse edilmiş JSON nesnesi, aksi takdirde null.
 */
async function callGeminiSmart(initialPrompt, imageBase64, onProgress) {
    let lastError = null;
    let lastFaultyResponse = '';
    let currentPrompt = initialPrompt;

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
        console.log(`API İsteği Deneme #${attempt}`);
        if (attempt > 1 && onProgress) {
            const message = lastError && lastError.includes('JSON') ?
                'Yapay zeka yanıtı düzeltiyor, lütfen bekleyin...' :
                'Bağlantı sorunu, çözüm tekrar deneniyor...';
            onProgress(message);
        }

        const payloadParts = [{ text: currentPrompt }];
        if (imageBase64 && attempt === 1) { // Resmi sadece ilk denemede gönder
            payloadParts.push({ inlineData: { mimeType: 'image/png', data: imageBase64 } });
        }

        const payload = { contents: [{ role: "user", parts: payloadParts }] };

        try {
            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API HTTP Hatası: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Güvenli erişim
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) {
                throw new Error('API yanıtı boş veya geçersiz formatta.');
            }

            lastFaultyResponse = rawText; // Düzeltme için son hatalı yanıtı sakla
            const jsonString = extractJson(rawText);

            if (!jsonString) {
                throw new Error('Yanıt içinde JSON formatı bulunamadı.');
            }

            const parsedJson = safeJsonParse(jsonString);

            if (!parsedJson) {
                throw new Error('JSON parse edilemedi.');
            }

            console.log(`Deneme #${attempt} başarılı!`);
            return parsedJson;

        } catch (error) {
            lastError = error.message;
            console.warn(`Deneme #${attempt} başarısız oldu: ${lastError}`);

            // Eğer hata JSON ile ilgiliyse, bir sonraki denemede düzeltme prompt'u kullan
            if (lastError.toLowerCase().includes('json') || lastError.toLowerCase().includes('parse')) {
                currentPrompt = buildCorrectionPrompt(initialPrompt, lastFaultyResponse, lastError);
            }
            // Diğer hatalar için (örn: ağ hatası), aynı prompt ile tekrar denenecek.
        }
    }

    console.error("Tüm API denemeleri başarısız oldu.");
    // Nihai hata durumunda kullanıcıya bilgi verilebilir.
    window.dispatchEvent(new CustomEvent('show-error-message', {
        detail: { message: `API ile iletişim kurulamadı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin. Hata: ${lastError}`, isCritical: true }
    }));
    return null;
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

/**
 * Akıllı rehber modunda öğrencinin adımını değerlendirmek için API çağrısı yapar.
 * @param {string} studentInput Öğrencinin girdiği cevap.
 * @param {object} stepData Mevcut adıma ait veriler (beklenen cevap, açıklama vb.).
 * @returns {Promise<object|null>} Değerlendirme sonucu.
 */
export async function validateStudentStep(studentInput, stepData) {
    // NOT: Bu fonksiyonun prompt'u artık smartGuide.js içinde dinamik olarak oluşturulacak
    // çünkü bağlama (önceki adımlar, deneme sayısı vb.) ihtiyaç duyar.
    // Bu fonksiyon şimdilik bir iskelet olarak kalabilir veya direkt smartGuide içine taşınabilir.
    // Şimdilik esnek bir prompt ile doğrudan API'yi çağıralım.

    const validationPrompt = `
        Sen, son derece anlayışlı, esnek ve teşvik edici bir matematik mentorusun. Görevin, öğrencinin cevabını sadece doğru ya da yanlış olarak etiketlemek değil, onun düşünce sürecini anlamak ve onu nazikçe doğru yola yönlendirmektir.

        **MENTORLUK FELSEFEN:**
        1.  **Matematiksel Eşdeğerlik Esastır:** Bir denklemin taraflarının yer değiştirmesi (a=b vs b=a) veya bir işlemin farklı bir sırayla ama doğru yapılması sonucu değiştirmez. "2 * (2x - 1) = 4 * 5" ile "20 = 4x - 2" tamamen aynı anlama gelir ve DOĞRU kabul edilmelidir. Katı bir şekilde sadece beklenen cevabı arama.
        2.  **Geri Bildirim Kişiseldir:** "Yanlış cevap" gibi genel ifadeler kullanma. Geri bildirimin, öğrencinin yazdığı spesifik cevap üzerinden olmalıdır. Örn: "Harika bir başlangıç, içler dışlar çarpımı doğru fikir! Ancak '4 kere 5' işleminin sonucunu tekrar kontrol edebilir misin?" gibi.
        3.  **Asla Yanıltma:** Görevin öğrenciyi doğruya ulaştırmaktır. Verdiğin ipuçları veya yaptığın yorumlar KESİNLİKLE matematiksel olarak doğru olmalı.
        4.  **Cevabı Hazır Verme:** İpuçların, öğrencinin hatasını kendisinin bulmasını sağlayacak sorular veya küçük yönlendirmeler içermeli.
        5.  **Notasyon Anlayışı:** Sayılar arasında kullanılan nokta (.) karakterini (örn: 5.4) bir ondalık ayırıcı olarak değil, bir **çarpma işlemi (5 * 4)** olarak yorumla. Bu, öğrenciler arasında yaygın bir kullanımdır. Sadece 0.5 gibi açıkça ondalık olan durumları ondalık olarak kabul et.
        6.  **Ara İşlemleri Kabul Et:** Eğer öğrencinin cevabı, beklenen cevaba giden yolda atılmış doğru bir ara işlem ise (örn: beklenen "3x = 18" iken öğrenci "3x + 10 - 10 = 8" yazdıysa), bunu **"dogruMu: true"** olarak kabul et. Geri bildiriminde ise onu tebrik edip "Şimdi bu denklemi sadeleştirerek devam edelim" gibi bir ifadeyle bir sonraki adıma yönlendir.


        ---
        **DEĞERLENDİRME BAĞLAMI:**
        - **Adımın Amacı:** "${stepData.description}"
        - **Beklenen Cevap (Sadece bir referans, katı bir kural değil):** "${stepData.correctAnswer}"
        - **ÖĞRENCİNİN CEVABI (Bütün yorumların bu cevap üzerine olmalı):** "${studentInput}"
        ---

        **İSTENEN YANIT FORMATI (SADECE JSON):**
        {
          "dogruMu": boolean,
          "isFinalAnswer": boolean,
          "geriBildirim": "Öğrencinin cevabına yönelik kişisel ve teşvik edici ana mesajın.",
          "neden": "Eğer cevap yanlışsa, öğrencinin cevabındaki spesifik hatanın ne olduğunun SÖZEL açıklaması. (örn: 'İçler dışlar çarpımını doğru yapmışsın ama parantezi dağıtırken küçük bir işlem hatası olmuş.')",
          "ipucu": "Öğrencinin, kendi hatasını fark etmesini sağlayacak yönlendirici bir SÖZEL soru veya öneri. (örn: '2 ile (2x-1) ifadesini çarptığımızda her bir terimi 2 ile çarpmamız gerekmiyor mu?')"
        }
    `;
    return await callGeminiSmart(validationPrompt, null, () => {}); // onProgress şimdilik boş
}