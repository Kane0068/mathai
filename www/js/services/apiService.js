// www/js/services/apiService.js - YENİ VE MERKEZİLEŞTİRİLMİŞ VERSİYON

// www/js/services/apiService.js - YENİ VE GÜÇLENDİRİLMİŞ VERSİYON

import {
    buildUnifiedSolutionPrompt,
    buildCorrectionPrompt,
    buildMathValidationPrompt,
    buildFlexibleStepValidationPrompt 
} from './promptBuilder.js';

// --- Sabitler ve Ayarlar ---
const GEMINI_API_KEY = "AIzaSyCUHwxUUId-SKY-3-LZlWQPmLJyNgO8GpM";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
const MAX_RETRIES = 3; // Başarısız istek en fazla 2 kez daha denenecek.
const INITIAL_DELAY = 1500; // Yeniden deneme için başlangıç gecikmesi (ms)

/**
 * API'den gelen metin içinde gömülü olan JSON verisini güvenli bir şekilde çıkarır.
 * Kod bloklarını (```json ... ```) ve diğer metinleri temizler.
 * @param {string} text API'den gelen ham metin.
 * @returns {string|null} Ayıklanmış JSON dizesi veya bulunamazsa null.
 */
function extractJson(text) {
    if (!text || typeof text !== 'string') return null;

    // 1. ```json veya ``` ile başlayıp ``` ile biten kod bloklarını ara (en güvenilir yöntem)
    const jsonRegex = /```(json)?\s*(\{[\s\S]*\})\s*```/;
    const match = text.match(jsonRegex);

    if (match && match[2]) {
        console.log("JSON, markdown kod bloğu içinden başarıyla ayıklandı.");
        return match[2];
    }

    // 2. Eğer kod bloğu yoksa, metnin içindeki ilk '{' ve son '}' arasındaki kısmı almayı dene.
    // Bu, API'nin başına veya sonuna metin eklediği durumları çözer.
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        console.log("JSON, metin içindeki ilk ve son süslü parantezler arası alınarak ayıklandı.");
        return text.substring(firstBrace, lastBrace + 1);
    }

    console.warn("Metin içinde geçerli bir JSON yapısı bulunamadı.");
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
        // Hata mesajını daha bilgilendirici hale getir
        console.error('JSON Parse Hatası:', error.message);
        // Sorunlu JSON'ın bir kısmını logla ki neyin yanlış gittiğini görebilelim
        const errorPosition = error.message.match(/position (\d+)/);
        if (errorPosition) {
            const pos = parseInt(errorPosition[1]);
            const context = jsonString.substring(Math.max(0, pos - 30), Math.min(jsonString.length, pos + 30));
            console.error(`Hatanın olduğu bölge: ...${context}...`);
        }
        return null;
    }
}


/**
 * Gemini API'sini akıllı ve dayanıklı bir şekilde çağırır.
 * JSON hatalarını düzeltmeye çalışır ve ağ hatalarını yeniden dener.
 * @param {string} initialPrompt - İlk gönderilecek prompt.
 * @param {string|null} imageBase64 - Base64 formatında resim verisi.
 * @param {function} onProgress - Yükleme durumu hakkında bilgi veren callback.
 * @returns {Promise<object|null>} Başarılı olursa parse edilmiş JSON nesnesi, aksi takdirde null.
 */
async function callGeminiSmart(initialPrompt, imageBase64, onProgress) {
    let lastError = null;
    let lastFaultyResponse = '';
    let currentPrompt = initialPrompt;
    let delay = INITIAL_DELAY;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        console.log(`API İsteği Deneme #${attempt}.`);
        if (attempt > 1 && onProgress) {
            const message = lastError && (lastError.toLowerCase().includes('json')) ?
                'Yapay zeka yanıt formatını düzeltiyor, lütfen bekleyin...' :
                `Geçici bir sorun oluştu. ${delay / 1000} saniye sonra yeniden denenecek...`;
            onProgress(message);
        }

        const payloadParts = [{ text: currentPrompt }];
        if (imageBase64 && attempt === 1) { // Resmi sadece ilk denemede gönder
            payloadParts.push({ inlineData: { mimeType: 'image/png', data: imageBase64 } });
        }

        const payload = {
            contents: [{ role: "user", parts: payloadParts }],
            // YENİ: API'nin kesinlikle JSON döndürmesini sağlamak için ek ayar
            generationConfig: {
                responseMimeType: "application/json",
            }
        };

        try {
            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                 // API'den gelen daha detaylı hata mesajını logla
                const errorData = await response.json().catch(() => null);
                console.error("API HTTP Hatası Detayları:", errorData);
                throw new Error(`API HTTP Hatası: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!rawText) {
                throw new Error('API yanıtı boş veya geçersiz formatta.');
            }

            // GÜÇLENDİRİLMİŞ PARSE MANTIĞI
            lastFaultyResponse = rawText; // Düzeltme promptu için ham yanıtı sakla
            const jsonString = extractJson(rawText); // Önce JSON'ı ayıkla
            
            if (!jsonString) {
                // Eğer extractJson bile bir şey bulamadıysa, yanıt tamamen bozuk demektir.
                throw new Error('Yanıt içinde JSON formatı bulunamadı.');
            }

            const parsedJson = safeJsonParse(jsonString); // Sonra parse etmeyi dene

            if (!parsedJson) {
                // Eğer parse yine de başarısız olursa, bu bir syntax hatasıdır.
                throw new Error('JSON parse edilemedi (Syntax hatası).');
            }

            console.log(`API isteği Deneme #${attempt} başarılı!`);
            return parsedJson; // BAŞARILI! Döngüden çık ve sonucu döndür.

        } catch (error) {
            lastError = error.message;
            console.warn(`Deneme #${attempt} başarısız oldu: ${lastError}`);

            // Eğer son deneme ise, daha fazla deneme yapma.
            if (attempt >= MAX_RETRIES) {
                break; 
            }
            
            // Hata JSON ile ilgiliyse, düzeltme prompt'u ile tekrar dene.
            if (lastError.toLowerCase().includes('json')) {
                console.log("JSON hatası tespit edildi. Düzeltme prompt'u hazırlanıyor...");
                currentPrompt = buildCorrectionPrompt(initialPrompt, lastFaultyResponse, lastError);
                // JSON hatalarında bekleme süresini artırma, hemen düzeltmeyi denesin.
                continue;
            }

            // Diğer hatalar (ağ, sunucu vb.) için bekleme süresini artırarak tekrar dene.
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
        }
    }

    // Tüm denemeler başarısız olduysa...
    console.error("Tüm API denemeleri başarısız oldu. Son Hata:", lastError);
    // Global bir event fırlatarak UI'ın hatayı göstermesini sağla
     window.dispatchEvent(new CustomEvent('show-error-message', {
         detail: { message: `API ile iletişim kurulamadı. Hata: ${lastError}`, isCritical: true }
     }));
    return null; // Nihai başarısızlık
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
 * Öğrencinin adımını esnek bir şekilde doğrulamak için API'yi çağırır.
 * @param {string} studentInput Öğrencinin girdiği cevap.
 * @param {object} stepData Mevcut adım ve tüm çözümle ilgili veriler.
 * @returns {Promise<object|null>} Değerlendirme sonucu nesnesi.
 */
export async function validateStudentStep(studentInput, stepData) {
    // Yeni ve akıllı prompt'u oluştur
    const promptText = buildFlexibleStepValidationPrompt(studentInput, stepData);

    // API'yi çağır ve sonucu bekle
    const result = await callGeminiSmart(promptText, null, () => {}); // onProgress callback'i şimdilik boş olabilir

    return result;
}