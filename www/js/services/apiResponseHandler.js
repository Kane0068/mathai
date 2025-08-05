// services/apiResponseHandler.js

import { safeJsonParse } from '../utils/safeJsonParser.js';

/**
 * Claude API yanıtını güvenli bir şekilde işler
 */
export async function handleClaudeResponse(responseText, promptType = 'general') {
    console.log(`Processing ${promptType} response...`);
    
    // 1. Güvenli JSON parse
    const parsed = safeJsonParse(responseText);
    
    if (!parsed) {
        console.error('Failed to parse API response');
        throw new Error('API yanıtı işlenemedi. Lütfen tekrar deneyin.');
    }
    
    // 2. Yanıt tipine göre validasyon
    switch (promptType) {
        case 'validation':
            return validateMathProblemResponse(parsed);
            
        case 'summary':
            return validateSummaryResponse(parsed);
            
        case 'steps':
            return validateStepsResponse(parsed);
            
        case 'interactive':
            return validateInteractiveResponse(parsed);
            
        default:
            return parsed;
    }
}

/**
 * Matematik sorusu validasyon yanıtını kontrol eder
 */
function validateMathProblemResponse(response) {
    const required = ['isMathProblem', 'confidence', 'category', 'reason', 'educationalMessage'];
    
    for (const field of required) {
        if (!(field in response)) {
            console.error(`Missing required field: ${field}`);
            return {
                isMathProblem: false,
                confidence: 0,
                category: 'not_math',
                reason: 'Yanıt formatı hatalı',
                educationalMessage: 'Bir hata oluştu, lütfen tekrar deneyin.'
            };
        }
    }
    
    // Tip kontrolü
    if (typeof response.isMathProblem !== 'boolean') {
        response.isMathProblem = false;
    }
    
    if (typeof response.confidence !== 'number') {
        response.confidence = 0;
    }
    
    return response;
}

/**
 * Özet yanıtını kontrol eder
 */
function validateSummaryResponse(response) {
    if (!response.problemOzeti) {
        throw new Error('Problem özeti bulunamadı');
    }
    
    const ozet = response.problemOzeti;
    
    // Varsayılan değerler
    if (!Array.isArray(ozet.verilenler)) {
        ozet.verilenler = [];
    }
    
    if (!ozet.istenen) {
        ozet.istenen = 'Belirtilmemiş';
    }
    
    if (!ozet.konu) {
        ozet.konu = 'Genel Matematik';
    }
    
    // LaTeX içeriğini temizle
    ozet.verilenler = ozet.verilenler.map(cleanLatexContent);
    ozet.istenen = cleanLatexContent(ozet.istenen);
    
    return response;
}

/**
 * Adımlar yanıtını kontrol eder
 */
function validateStepsResponse(response) {
    if (!response.adimlar || !Array.isArray(response.adimlar)) {
        throw new Error('Çözüm adımları bulunamadı');
    }
    
    // Her adımı validate et
    response.adimlar = response.adimlar.map((adim, index) => {
        // Zorunlu alanlar
        if (!adim.adimNo) {
            adim.adimNo = index + 1;
        }
        
        if (!adim.adimBasligi) {
            adim.adimBasligi = `${adim.adimNo}. Adım`;
        }
        
        if (!adim.cozum_lateks) {
            console.warn(`Step ${adim.adimNo} missing LaTeX content`);
            adim.cozum_lateks = '';
        }
        
        // LaTeX'i temizle
        adim.cozum_lateks = cleanLatexContent(adim.cozum_lateks);
        
        // Opsiyonel alanlar için varsayılanlar
        adim.adimAciklamasi = adim.adimAciklamasi || '';
        adim.ipucu = adim.ipucu || '';
        adim.yayginHatalar = adim.yayginHatalar || [];
        
        return adim;
    });
    
    // tamCozumLateks kontrolü
    if (!Array.isArray(response.tamCozumLateks)) {
        response.tamCozumLateks = response.adimlar.map(a => a.cozum_lateks);
    }
    
    return response;
}

/**
 * İnteraktif seçenekler yanıtını kontrol eder
 */
function validateInteractiveResponse(response) {
    if (!response.yanlisSecenekler || !Array.isArray(response.yanlisSecenekler)) {
        console.warn('Invalid interactive options response, using fallback');
        return {
            yanlisSecenekler: [
                {
                    metin: "İşlem hatası",
                    hataAciklamasi: "Hesaplama yanlış yapılmıştır"
                },
                {
                    metin: "Yöntem hatası",
                    hataAciklamasi: "Farklı bir yöntem kullanılmalıdır"
                }
            ]
        };
    }
    
    // Her seçeneği temizle
    response.yanlisSecenekler = response.yanlisSecenekler.map(secenek => ({
        metin: cleanLatexContent(secenek.metin || ''),
        hataAciklamasi: secenek.hataAciklamasi || 'Hata açıklaması yok'
    }));
    
    return response;
}

/**
 * LaTeX içeriğini temizler
 */
function cleanLatexContent(content) {
    if (!content) return '';
    
    return content
        // Markdown bold işaretlerini kaldır
        .replace(/\*\*(.*?)\*\*/g, '$1')
        // Çoklu delimiter'ları düzelt
        .replace(/\$\$\$/g, '$$')
        .replace(/\$\s+\$/g, '$$')
        // Başındaki ve sonundaki boşlukları temizle
        .trim();
}