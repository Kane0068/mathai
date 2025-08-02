// www/js/services/apiService.js - KENDİ KENDİNİ İYİLEŞTİREN NİHAİ VERSİYON

import {
    buildSummaryPrompt,
    buildFullSolutionPrompt,
    buildInteractiveOptionsPrompt,
    buildStepValidationPrompt,
    buildCorrectionPrompt,
    normalizeApiResponse ,
    buildMathValidationPrompt
} from './promptBuilder.js';

// --- Sabitler ve Ayarlar ---
const GEMINI_API_KEY = "AIzaSyDbjH9TXIFLxWH2HuYJlqIFO7Alhk1iQQs";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
const MAX_RETRIES = 2; // Başarısız istek en fazla 2 kez daha denenecek (toplamda 3 deneme).

// --- Yardımcı Fonksiyonlar ---
function extractJson(text) {
    if (!text) return null;
    
    // Önce basit JSON çıkarma deneyelim
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return null;
    
    let jsonString = text.substring(firstBrace, lastBrace + 1);
    
    // JSON'u temizle ve düzelt
    try {
        // Yaygın escape sorunlarını düzelt
        jsonString = jsonString
            // Tek ters slash'ları çift yap (LaTeX için)
            .replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\')
            // Satır sonlarını düzelt
            .replace(/\r\n/g, '\\n')
            .replace(/\r/g, '\\n')
            // Tab karakterlerini düzelt
            .replace(/\t/g, '\\t')
            // Kontrol karakterlerini temizle
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '');
        
        // JSON'u parse etmeyi dene
        JSON.parse(jsonString);
        return jsonString;
        
    } catch (e) {
        // Hala hata varsa, daha agresif temizleme yap
        console.warn('JSON temizleme gerekiyor:', e.message);
        
        // LaTeX ifadelerini geçici olarak değiştir
        const latexPlaceholders = [];
        let placeholderIndex = 0;
        
        jsonString = jsonString.replace(/"\$\$[^"]+\$\$"/g, (match) => {
            const placeholder = `"__LATEX_${placeholderIndex}__"`;
            latexPlaceholders[placeholderIndex] = match;
            placeholderIndex++;
            return placeholder;
        });
        
        // Sorunlu karakterleri temizle
        jsonString = jsonString
            .replace(/\\/g, '\\\\')  // Tüm tek slash'ları çift yap
            .replace(/"/g, '\\"')    // Tırnak işaretlerini escape et
            .replace(/\n/g, '\\n')   // Satır sonlarını escape et
            .replace(/\r/g, '\\r');  // Carriage return'leri escape et
        
        // Placeholder'ları geri koy
        latexPlaceholders.forEach((original, index) => {
            jsonString = jsonString.replace(`"__LATEX_${index}__"`, original);
        });
        
        return jsonString;
    }
}

// API yanıtını daha güvenli parse et
function safeJsonParse(jsonString) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('JSON Parse hatası:', error.message);
        console.log('Sorunlu JSON:', jsonString);
        
        // Manuel düzeltme dene
        try {
            // Regex ile yaygın hataları düzelt
            const cleanJson = jsonString
                .replace(/,\s*}/g, '}')  // Son virgülleri kaldır
                .replace(/,\s*]/g, ']')  // Array'lerde son virgülleri kaldır
                .replace(/([^"\\])\\([^"\\\/bfnrt])/g, '$1\\\\$2'); // Escape edilmemiş backslash'ları düzelt
            
            return JSON.parse(cleanJson);
        } catch (secondError) {
            console.error('JSON düzeltme başarısız:', secondError);
            return null;
        }
    }
}

// callGeminiSmart fonksiyonunu güncelle
async function callGeminiSmart(initialPrompt, imageBase64, onProgress) {
    let lastError = null;
    let lastFaultyResponse = '';
    let currentPrompt = initialPrompt;

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
        console.log(`API İsteği Deneme #${attempt}`);
        if (attempt > 1 && onProgress) {
            const message = lastError && lastError.includes('JSON')
                ? 'Yapay zeka yanıtı düzeltiyor, lütfen bekleyin...'
                : 'Bağlantı sorunu, çözüm tekrar deneniyor...';
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

            if (!response.ok) throw new Error(`API HTTP Hatası: ${response.status}`);
            
            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!rawText) throw new Error('API yanıtı boş veya geçersiz.');
            
            lastFaultyResponse = rawText;
            const jsonString = extractJson(rawText);
            
            if (!jsonString) throw new Error('JSON formatı bulunamadı');
            
            const parsedJson = safeJsonParse(jsonString);
            
            if (!parsedJson) throw new Error('JSON parse edilemedi');
            
            console.log(`Deneme #${attempt} başarılı!`);
            return parsedJson;

        } catch (error) {
            lastError = error.message;
            console.warn(`Deneme #${attempt} başarısız oldu: ${lastError}`);
            
            // JSON hatası ise düzeltme promptu gönder
            if (lastError.toLowerCase().includes('json') || lastError.toLowerCase().includes('parse')) {
                currentPrompt = buildCorrectionPrompt(initialPrompt, lastFaultyResponse, lastError);
            }
        }
    }

    console.error("Tüm API denemeleri başarısız oldu.");
    return null;
}

// --- DIŞARIYA AÇILAN SERVİS FONKSİYONLARI ---
export async function getProblemSummary(problemContext, imageBase64, onProgress) {
    const promptText = buildSummaryPrompt(problemContext);
    return await callGeminiSmart(promptText, imageBase64, onProgress);
}

export async function getFullSolution(problemContext, imageBase64, onProgress) {
    const promptText = buildFullSolutionPrompt(problemContext);
    return await callGeminiSmart(promptText, imageBase64, onProgress);
}


export async function getInteractiveOptions(stepData, allSteps, currentStepIndex, onProgress) {
    // Tüm adımları ve mevcut indeksi gönder
    const promptText = buildInteractiveOptionsPrompt(stepData, allSteps, currentStepIndex);
    return await callGeminiSmart(promptText, null, onProgress);
}

export async function validateStudentStep(customPrompt, stepData, onProgress) {
    // Eğer özel prompt verilmişse onu kullan
    const promptText = customPrompt || buildStepValidationPrompt(
        stepData.studentInput, 
        stepData
    );
    
    return await callGeminiSmart(promptText, null, onProgress);
}

// apiService.js'e ekleyin

export async function validateMathProblem(problemContext, imageBase64 = null, onProgress) {
    const promptText = buildMathValidationPrompt(problemContext);
    
    try {
        const result = await callGeminiSmart(promptText, imageBase64, onProgress);
        
        if (!result || result.isMathProblem === undefined) {
            // Fallback
            return {
                isMathProblem: false,
                confidence: 0,
                category: "not_math",
                reason: "İçerik analiz edilemedi",
                educationalMessage: "Lütfen açık ve net bir matematik sorusu sorun."
            };
        }
        
        return result;
        
    } catch (error) {
        console.error('Matematik validasyon hatası:', error);
        return {
            isMathProblem: false,
            confidence: 0,
            category: "error",
            reason: "Validasyon başarısız",
            educationalMessage: "Bir hata oluştu. Lütfen tekrar deneyin."
        };
    }
}

