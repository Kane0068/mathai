// www/js/services/apiService.js - KENDİ KENDİNİ İYİLEŞTİREN NİHAİ VERSİYON

import {
    buildSummaryPrompt,
    buildFullSolutionPrompt,
    buildInteractiveOptionsPrompt,
    buildStepValidationPrompt,
    buildCorrectionPrompt
} from './promptBuilder.js';

// --- Sabitler ve Ayarlar ---
const GEMINI_API_KEY = "AIzaSyDbjH9TXIFLxWH2HuYJlqIFO7Alhk1iQQs";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
const MAX_RETRIES = 2; // Başarısız istek en fazla 2 kez daha denenecek (toplamda 3 deneme).

// --- Yardımcı Fonksiyonlar ---
function extractJson(text) {
    if (!text) return null;
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return null;
    return text.substring(firstBrace, lastBrace + 1);
}

// --- ÇEKİRDEK AKILLI API FONKSİYONU ---
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
        if (imageBase64 && attempt === 1) { // Resmi sadece ilk denemede gönder
            payloadParts.push({ inlineData: { mimeType: 'image/png', data: imageBase64 } });
        }
        
        const payload = { contents: [{ role: "user", parts: payloadParts }] };

        try {
            const response = await fetch(GEMINI_API_URL, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`API HTTP Hatası: ${response.status}`);
            
            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!rawText) throw new Error('API yanıtı boş veya geçersiz.');
            
            lastFaultyResponse = rawText;
            const jsonString = extractJson(rawText);
            
            const parsedJson = JSON.parse(jsonString);
            console.log(`Deneme #${attempt} başarılı!`);
            return parsedJson;

        } catch (error) {
            lastError = error.message;
            console.warn(`Deneme #${attempt} başarısız oldu: ${lastError}`);
            if (lastError.toLowerCase().includes('json')) {
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

export async function getInteractiveOptions(stepData, onProgress) {
    const promptText = buildInteractiveOptionsPrompt(stepData);
    return await callGeminiSmart(promptText, null, onProgress);
}

export async function validateStudentStep(studentInput, expectedStepData, onProgress) {
    const promptText = buildStepValidationPrompt(studentInput, expectedStepData);
    return await callGeminiSmart(promptText, null, onProgress);
}