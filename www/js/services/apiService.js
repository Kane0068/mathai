// www/js/services/apiService.js - VEKİL (PROXY) MODELİ İÇİN HATA GİDERİLMİŞ SON HALİ

// --- GEREKLİ MODÜLLERİ IMPORT ET ---
import {
    buildUnifiedSolutionPrompt,
    buildCorrectionPrompt,
    buildMathValidationPrompt,
    buildFlexibleStepValidationPrompt,
    buildVerificationPrompt,
    buildInputModerationPrompt
} from './promptBuilder.js';

// DÜZELTME 1: Firebase Functions için gerekli modülleri import ediyoruz.
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";


// --- AYARLAR ---
const MAX_RETRIES = 3;
const INITIAL_DELAY = 1500;

// DÜZELTME 2: Functions servisini projedeki diğer dosyalar gibi başlatıyoruz.
// Kullandığınız bölge 'europe-west1' ise bu satırı değiştirmeyin.
const functions = getFunctions(undefined, 'europe-west1');


// --- YARDIMCI FONKSİYONLAR (DEĞİŞİKLİK YOK) ---
function extractJson(text) {
    if (!text || typeof text !== 'string') return null;
    const jsonRegex = /```(json)?\s*(\{[\s\S]*\})\s*```/;
    const match = text.match(jsonRegex);
    if (match && match[2]) {
        return match[2];
    }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        return text.substring(firstBrace, lastBrace + 1);
    }
    return null;
}

function safeJsonParse(jsonString) {
    if (!jsonString) return null;
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('JSON Parse Hatası:', error.message);
        return null;
    }
}


// --- GÜNCELLENMİŞ API ÇAĞRI MANTIĞI ---
async function callGeminiSmart(initialPrompt, imageBase64, onProgress) {
    let lastError = null;
    let lastFaultyResponse = '';
    let currentPrompt = initialPrompt;
    let delay = INITIAL_DELAY;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        console.log(`API İsteği Deneme #${attempt}.`);
        if (attempt > 1 && onProgress) {
            const message = lastError && (lastError.toLowerCase().includes('json')) ?
                'Yapay zeka yanıt formatını düzeltiyor...' :
                `Geçici bir sorun oluştu. ${delay / 1000}s sonra yeniden denenecek...`;
            onProgress(message);
        }

        try {
            // DÜZELTME 3: Firebase v9+ sentaksı ile fonksiyonu çağırıyoruz.
            const callGeminiProxy = httpsCallable(functions, 'callGeminiProxy');
            
            const serverPayload = { prompt: currentPrompt };
            if (imageBase64 && attempt === 1) {
                serverPayload.imageBase64 = imageBase64;
            }

            const result = await callGeminiProxy(serverPayload);
            const rawText = result.data.responseText;
            // DEĞİŞİKLİK BURADA BİTİYOR

            if (!rawText) {
                throw new Error('API yanıtı (sunucudan gelen) boş veya geçersiz formatta.');
            }

            lastFaultyResponse = rawText;
            const jsonString = extractJson(rawText);
            
            if (!jsonString) {
                throw new Error('Yanıt içinde JSON formatı bulunamadı.');
            }

            const parsedJson = safeJsonParse(jsonString);

            if (!parsedJson) {
                throw new Error('JSON parse edilemedi (Syntax hatası).');
            }

            console.log(`API isteği Deneme #${attempt} başarılı!`);
            return parsedJson;

        } catch (error) {
            if (error.code && error.message) { // Firebase'den gelen HttpsError
                console.error(`Firebase Function Hatası: ${error.code} - ${error.message}`);
                const userMessage = error.code === 'resource-exhausted'
                    ? 'Sorgu hakkınız bitti. Daha fazla hak için mağazayı ziyaret edebilirsiniz.'
                    : `Bir sunucu hatası oluştu: ${error.message}`;
                
                window.dispatchEvent(new CustomEvent('show-error-message', {
                    detail: { message: userMessage, isCritical: true }
                }));
                return null; // Yeniden deneme yapma, işlemi sonlandır.
            }
            
            // Diğer hatalar (JSON parse vs.)
            lastError = error.message;
            console.warn(`Deneme #${attempt} başarısız oldu: ${lastError}`);

            if (attempt >= MAX_RETRIES) break;
            
            if (lastError.toLowerCase().includes('json')) {
                currentPrompt = buildCorrectionPrompt(initialPrompt, lastFaultyResponse, lastError);
                continue;
            }

            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }

    console.error("Tüm API denemeleri başarısız oldu. Son Hata:", lastError);
    window.dispatchEvent(new CustomEvent('show-error-message', {
         detail: { message: `API ile iletişim kurulamadı. Hata: ${lastError}`, isCritical: true }
    }));
    return null;
}

// --- DIŞA AKTARILAN FONKSİYONLAR (DEĞİŞİKLİK YOK) ---
export async function getUnifiedSolution(problemContext, imageBase64, onProgress) {
    if (onProgress) onProgress('Çözüm yolu oluşturuluyor...');
    const generationPrompt = buildUnifiedSolutionPrompt(problemContext);
    const initialSolution = await callGeminiSmart(generationPrompt, imageBase64, onProgress);

    if (!initialSolution) {
        console.error("İlk çözüm üretme aşaması başarısız oldu.");
        return null;
    }
    console.log('✅ Aşama 1/2: İlk çözüm başarıyla üretildi.');

    const difficulty = initialSolution.problemOzeti?.zorlukSeviyesi;
    if (difficulty === 'orta') {
        if (onProgress) onProgress('Bu orta zorlukta bir problem, çözüm ek olarak kontrol ediliyor...');
        const verificationPrompt = buildVerificationPrompt(JSON.stringify(initialSolution, null, 2));
        const finalVerifiedSolution = await callGeminiSmart(verificationPrompt, null, onProgress);

        if (!finalVerifiedSolution) {
            console.warn("⚠️ Doğrulama aşaması başarısız oldu. İlk sonuç kullanılacak.");
            return initialSolution;
        }
        return finalVerifiedSolution;
    } else {
        return initialSolution;
    }
}

export async function validateMathProblem(problemContext, imageBase64 = null, onProgress) {
    const promptText = buildMathValidationPrompt(problemContext);
    return await callGeminiSmart(promptText, imageBase64, onProgress);
}

export async function validateStudentStep(studentInput, stepData, mistakeHistory) { // <-- mistakeHistory eklendi
    const promptText = buildFlexibleStepValidationPrompt(studentInput, stepData, mistakeHistory); // <-- mistakeHistory iletildi
    return await callGeminiSmart(promptText, null, () => {});
}

// =============================================================
// 🎯 1. ADIM İÇİN YENİ EKLENEN VE MEVCUT YAPIYLA UYUMLU FONKSİYON
// =============================================================
/**
 * Kullanıcı girdisini uygunluk için denetler. Mevcut callGeminiSmart yapısını kullanır.
 * @param {string} userInput Denetlenecek metin.
 * @returns {Promise<{isSafe: boolean, reason: string}>} Denetleme sonucu.
 */
export async function moderateUserInput(userInput) {
    try {
        console.log(`🤖 Kullanıcı girdisi denetleniyor: "${userInput}"`);
        const prompt = buildInputModerationPrompt(userInput);
        
        // Mevcut akıllı API çağrı fonksiyonunu kullanıyoruz.
        // Bu, yeniden deneme ve JSON işleme gibi özellikleri otomatik olarak dahil eder.
        // Progress callback'i olarak boş bir fonksiyon geçiyoruz çünkü bu hızlı bir işlem.
        const result = await callGeminiSmart(prompt, null, () => {});

        if (!result) {
            // Eğer callGeminiSmart tüm denemelere rağmen null dönerse,
            // riske atmamak için girdiyi güvenli değil olarak kabul edelim.
            console.warn("Moderasyon API çağrısı başarısız oldu, girdi güvenli değil olarak işaretlendi.");
            return { isSafe: false, reason: 'moderation_error' };
        }

        console.log('✅ Denetleme sonucu:', result);
        // callGeminiSmart zaten parse edilmiş JSON döndürdüğü için doğrudan sonucu döndürüyoruz.
        return result;

    } catch (error) {
        console.error("İçerik denetleme sırasında beklenmedik bir hata oluştu:", error);
        return { isSafe: false, reason: 'moderation_exception' };
    }
}


