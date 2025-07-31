// =================================================================================
//  MathAi - API Manager Modülü
//  API çağrıları, validation ve response işlemleri
// =================================================================================

// API sabitleri
const GEMINI_API_KEY = "AIzaSyDbjH9TXIFLxWH2HuYJlqIFO7Alhk1iQQs";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// Master solution prompt
const masterSolutionPrompt = `MATEMATIK PROBLEM ÇÖZÜCÜ - KATKI KURALLARI

🚨 KRİTİK TALİMATLAR - MUTLAKA TAKİP ET:

1. YANIT FORMATI GEREKSİNİMLERİ:
   - Yanıt SADECE geçerli JSON olmalı
   - JSON'dan önce veya sonra ASLA ekstra metin yazma
   - Tüm string'ler için çift tırnak kullan
   - Sondaki virgülleri kaldır
   - Karakter kaçışlarını doğru yap (\\n, \\", \\\\)

2. ALAN ÖZEL KURALLARI - MUTLAKA UYULACAK:
   
   adimAciklamasi alanı için:
   ✅ SADECE Türkçe metin: "Verilen değerleri yerine koy"
   ❌ YASAK: √, ∫, ∑, π, α, β, θ, ≤, ≥, ≠, ±, $, $$, \\(, \\), \\[, \\]
   ❌ YASAK: \\frac, \\sqrt, \\sum, \\int, herhangi bir LaTeX komut
   
   ipucu alanı için:
   ✅ SADECE Türkçe metin: "Bu adımda işlem sırasına dikkat et"
   ❌ YASAK: Tüm matematik sembolleri ve LaTeX komutları
   
   cozum_lateks alanı için:
   ✅ SADECE LaTeX: "$$x = \\frac{a + b}{c}$$"
   ✅ MUTLAKA $$ ile başla ve bitir
   ❌ YASAK: Türkçe kelimeler bu alanda

3. ZORUNLU DOĞRULAMA KELİMELERİ:
   - Türkçe alanlarda kullan: "hesapla", "bul", "belirle", "çöz", "yerine koy"
   - Matematik sembolleri yerine kelime kullan: "karekök" (√ değil), "pi sayısı" (π değil)

4. ÖRNEK DOĞRU FORMAT:
   ✅ "adimAciklamasi": "Denklemin sol tarafındaki değerleri topla"
   ❌ "adimAciklamasi": "x + y = 5 denklemini çöz"
   
   ✅ "cozum_lateks": "$$x + y = 5$$"
   ❌ "cozum_lateks": "x + y = 5"

5. JSON ŞEMA GEREKSİNİMLERİ:
   - problemOzeti, adimlar ve tamCozumLateks alanları MUTLAKA olmalı
   - adimlar array'i boş olmamalı
   - Her adımda adimAciklamasi ve cozum_lateks MUTLAKA olmalı

INTELLIGENT STEP CREATION RULES:
- Analyze the problem complexity and create appropriate number of steps
- Simple concept questions (like "which is irrational?"): 1-2 steps maximum
- Multiple choice questions: Focus on the logical reasoning, not checking each option separately
- Calculation problems: Break into natural mathematical steps
- Complex proofs: More detailed steps are acceptable

JSON SCHEMA:
{
  "problemOzeti": {
    "verilenler": [
      "Turkish explanation text with math: $LaTeX_inline$",
      "Another data in Turkish: $\\\\frac{a}{b} = 5$"
    ],
    "istenen": "What is requested in Turkish: $\\\\sqrt{x^2 + y^2}$"
  },
  "adimlar": [
    {
      "adimAciklamasi": "PURE VERBAL Turkish explanation - NO MATH SYMBOLS OR LaTeX",
      "cozum_lateks": "$$pure_latex_expression$$",
      "ipucu": "PURE VERBAL Turkish helpful hint - NO MATH SYMBOLS OR LaTeX", 
      "yanlisSecenekler": [
        {
          "metin": "$$wrong_latex_expression$$",
          "yanlisGeriBildirimi": "Turkish explanation why it's wrong with math: $LaTeX_inline$"
        }
      ]
    }
  ],
  "tamCozumLateks": [
    "$$step_1_pure_latex$$",
    "$$step_2_pure_latex$$", 
    "$$final_answer_pure_latex$$"
  ]
}

STEP EXAMPLES BY PROBLEM TYPE:

For "Which number is irrational?" type questions:
- Step 1: "Rasyonel ve irrasyonel sayıları ayırt etme kurallarını hatırla"
- Step 2: "Verilen seçenekleri tek tek incele ve hangisinin kesir şeklinde yazılamayacağını belirle"

For calculation problems:
- Step 1: "Verilen değerleri formülde yerine koy"
- Step 2: "İşlem sırasını takip ederek hesapla"
- Step 3: "Sonucu kontrol et"

For geometry problems:
- Step 1: "Şeklin özelliklerini belirle"
- Step 2: "Uygun formülü seç"
- Step 3: "Hesaplamaları yap"

IMPORTANT: Keep adimAciklamasi and ipucu fields completely free of mathematical symbols, fractions, square roots, or any LaTeX. Use only descriptive Turkish words.

Problem: {PROBLEM_CONTEXT}

RESPOND ONLY IN JSON FORMAT, NO OTHER TEXT.`;

/**
 * API yanıt doğrulama şeması
 */
const responseValidationSchema = {
    required: ["problemOzeti", "adimlar", "tamCozumLateks"],
    properties: {
        problemOzeti: {
            required: ["verilenler", "istenen"],
            verilenler: { type: "array", minItems: 1 },
            istenen: { type: "string", minLength: 1 }
        },
        adimlar: {
            type: "array",
            minItems: 1,
            itemSchema: {
                required: ["adimAciklamasi", "cozum_lateks"],
                adimAciklamasi: { 
                    type: "string",
                    forbiddenChars: /[\$\\√∫∑π±≤≥≠αβθγδ]/g,
                    minLength: 5
                },
                cozum_lateks: { 
                    type: "string",
                    requiredPattern: /^\$\$.*\$\$$/,
                    minLength: 4
                },
                ipucu: { 
                    type: "string",
                    forbiddenChars: /[\$\\√∫∑π±≤≥≠αβθγδ]/g,
                    optional: true
                }
            }
        },
        tamCozumLateks: {
            type: "array",
            minItems: 1
        }
    }
};

/**
 * Ana API çağrısı fonksiyonu
 * @param {Object} payload - API payload
 * @returns {Promise<Object>} - Parsed ve validate edilmiş response
 */
export async function makeApiCall(payload) {
    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const content = data.candidates[0].content.parts[0].text;
            
            try {
                // Güvenli JSON parse kullan
                const parsedContent = safeJsonParse(content);
                // Basit validation - şimdilik sadece parse edilen response'u döndür
                console.log('API response başarıyla parse edildi');
                return parsedContent;
                
                
            } catch (parseError) {
                console.error('JSON parse hatası:', parseError);
                throw new Error(`Yanıt işleme hatası: ${parseError.message}`);
            }
        }
        
        throw new Error('Geçersiz API yanıtı - content bulunamadı');
    } catch (error) {
        console.error('API çağrısı hatası:', error);
        throw error;
    }
}

/**
 * Problem context ile API çağrısı
 * @param {string} problemContext - Problem açıklaması
 * @param {string} sourceData - Base64 image data (opsiyonel)
 * @returns {Promise<Object>} - Çözüm verisi
 */
export async function solveProblem(problemContext, sourceData = null) {
    const promptText = masterSolutionPrompt.replace('{PROBLEM_CONTEXT}', problemContext);
    const payloadParts = [{ text: promptText }];
    
    if (sourceData) {
        payloadParts.push({ 
            inlineData: { 
                mimeType: 'image/png', 
                data: sourceData 
            } 
        });
    }
    
    return await makeApiCall({ 
        contents: [{ 
            role: "user", 
            parts: payloadParts 
        }] 
    });
}

/**
 * API yanıtını doğrulama fonksiyonu
 * @param {Object} response - API response
 * @returns {Object} - Validation result
 */
function validateApiResponse(response) {
    const errors = [];
    const warnings = [];
    
    try {
        // 1. Temel yapı kontrolü
        if (!response || typeof response !== 'object') {
            errors.push('Geçersiz JSON yapısı');
            return { valid: false, errors, warnings, correctedResponse: null };
        }
        
        // 2. Zorunlu alan kontrolü
        responseValidationSchema.required.forEach(field => {
            if (!response[field]) {
                errors.push(`Zorunlu alan eksik: ${field}`);
            }
        });
        
        // 3. problemOzeti kontrolü
        if (response.problemOzeti) {
            if (!response.problemOzeti.verilenler || !Array.isArray(response.problemOzeti.verilenler)) {
                errors.push('problemOzeti.verilenler array olmalı');
            }
            if (!response.problemOzeti.istenen || typeof response.problemOzeti.istenen !== 'string') {
                errors.push('problemOzeti.istenen string olmalı');
            }
        }
        
        // 4. adimlar array kontrolü
        if (response.adimlar) {
            if (!Array.isArray(response.adimlar) || response.adimlar.length === 0) {
                errors.push('adimlar boş olmayan array olmalı');
            } else {
                response.adimlar.forEach((step, index) => {
                    // adimAciklamasi kontrolü
                    if (!step.adimAciklamasi) {
                        errors.push(`Adım ${index + 1}: adimAciklamasi eksik`);
                    } else {
                        const forbiddenMatches = step.adimAciklamasi.match(/[\$\\√∫∑π±≤≥≠αβθγδ]/g);
                        if (forbiddenMatches) {
                            errors.push(`Adım ${index + 1}: adimAciklamasi'da yasak karakterler: ${forbiddenMatches.join(', ')}`);
                        }
                        if (step.adimAciklamasi.length < 5) {
                            warnings.push(`Adım ${index + 1}: adimAciklamasi çok kısa`);
                        }
                    }
                    
                    // cozum_lateks kontrolü
                    if (!step.cozum_lateks) {
                        errors.push(`Adım ${index + 1}: cozum_lateks eksik`);
                    } else {
                        if (!step.cozum_lateks.startsWith('$$') || !step.cozum_lateks.endsWith('$$')) {
                            errors.push(`Adım ${index + 1}: cozum_lateks $$ ile başlayıp bitmeli`);
                        }
                        if (step.cozum_lateks.length < 4) {
                            errors.push(`Adım ${index + 1}: cozum_lateks çok kısa`);
                        }
                    }
                    
                    // ipucu kontrolü (opsiyonel)
                    if (step.ipucu) {
                        const forbiddenMatches = step.ipucu.match(/[\$\\√∫∑π±≤≥≠αβθγδ]/g);
                        if (forbiddenMatches) {
                            errors.push(`Adım ${index + 1}: ipucu'da yasak karakterler: ${forbiddenMatches.join(', ')}`);
                        }
                    }
                });
            }
        }
        
        // 5. tamCozumLateks kontrolü
        if (response.tamCozumLateks) {
            if (!Array.isArray(response.tamCozumLateks) || response.tamCozumLateks.length === 0) {
                errors.push('tamCozumLateks boş olmayan array olmalı');
            }
        }
        
        return { 
            valid: errors.length === 0, 
            errors, 
            warnings,
            correctedResponse: errors.length > 0 ? autoCorrectResponse(response, errors) : response
        };
        
    } catch (validationError) {
        errors.push(`Doğrulama hatası: ${validationError.message}`);
        return { valid: false, errors, warnings, correctedResponse: null };
    }
}

/**
 * Otomatik düzeltme fonksiyonu
 * @param {Object} response - Düzeltilecek response
 * @param {Array} errors - Hata listesi
 * @returns {Object} - Düzeltilmiş response
 */
function autoCorrectResponse(response, errors) {
    let corrected = JSON.parse(JSON.stringify(response));
    
    try {
        // adimlar düzeltmeleri
        if (corrected.adimlar && Array.isArray(corrected.adimlar)) {
            corrected.adimlar.forEach((step, index) => {
                // adimAciklamasi düzeltme
                if (step.adimAciklamasi) {
                    step.adimAciklamasi = cleanTextFromMathSymbols(step.adimAciklamasi);
                }
                
                // ipucu düzeltme
                if (step.ipucu) {
                    step.ipucu = cleanTextFromMathSymbols(step.ipucu);
                }
                
                // cozum_lateks format düzeltme
                if (step.cozum_lateks) {
                    if (!step.cozum_lateks.startsWith('$$')) {
                        step.cozum_lateks = `$$${step.cozum_lateks.replace(/^\$+|\$+$/g, '')}$$`;
                    }
                    if (!step.cozum_lateks.endsWith('$$') && step.cozum_lateks.startsWith('$$')) {
                        step.cozum_lateks = step.cozum_lateks + '$$';
                    }
                }
            });
        }
        
        // Eksik alanları varsayılan değerlerle doldur
        if (!corrected.problemOzeti) {
            corrected.problemOzeti = {
                verilenler: ["Problem verisi analiz edildi"],
                istenen: "Problemin çözümü"
            };
        }
        
        if (!corrected.tamCozumLateks || !Array.isArray(corrected.tamCozumLateks)) {
            corrected.tamCozumLateks = ["$$\\text{Çözüm adımları üretildi}$$"];
        }
        
        return corrected;
        
    } catch (correctionError) {
        console.error('Otomatik düzeltme hatası:', correctionError);
        return response; // Orijinali döndür
    }
}

/**
 * Metinden matematik sembollerini temizleme
 * @param {string} text - Temizlenecek metin
 * @returns {string} - Temizlenmiş metin
 */
function cleanTextFromMathSymbols(text) {
    if (!text || typeof text !== 'string') return text;
    
    return text
        // LaTeX komutlarını kaldır
        .replace(/\\[a-zA-Z]+\{[^}]*\}/g, '')
        .replace(/\\[a-zA-Z]+/g, '')
        // Matematik sembollerini kaldır
        .replace(/[\$\\√∫∑π±≤≥≠αβθγδ]/g, '')
        // Delimiterleri kaldır
        .replace(/\$+/g, '')
        .replace(/\\\(/g, '').replace(/\\\)/g, '')
        .replace(/\\\[/g, '').replace(/\\\]/g, '')
        // Fazla boşlukları temizle
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * JSON parse'ı güvenli hale getirme - Düzeltilmiş versiyon
 * @param {string} text - Parse edilecek text
 * @returns {Object} - Parsed object
 */
function safeJsonParse(text) {
    try {
        // Önce temel temizlik
        let cleaned = text.trim();
        
        // JSON dışındaki metinleri kaldır - daha güvenli regex
        const jsonStart = cleaned.indexOf('{');
        const jsonEnd = cleaned.lastIndexOf('}');
        
        if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
            throw new Error('JSON yapısı bulunamadı');
        }
        
        cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
        
        // Önce basit parse dene
        try {
            return JSON.parse(cleaned);
        } catch (firstError) {
            console.log('İlk parse başarısız, temizlik yapılıyor...');
            
            // Daha agresif temizlik
            cleaned = cleaned
                // Sondaki virgülleri kaldır
                .replace(/,(\s*[}\]])/g, '$1')
                // Yanlış escape'leri düzelt
                .replace(/\\(?!["\\/bfnrtu])/g, '\\\\')
                // Control karakterleri kaldır
                .replace(/[\x00-\x1F\x7F]/g, '')
                // Çift tırnak içindeki problematik karakterleri düzelt
                .replace(/"([^"]*?)\\([^"\\\/bfnrtu])([^"]*?)"/g, '"$1\\\\$2$3"');
            
            // İkinci deneme
            try {
                return JSON.parse(cleaned);
            } catch (secondError) {
                console.log('İkinci parse da başarısız, manuel düzeltme...');
                
                // Son çare: problematik kısımları temizle
                cleaned = cleaned
                    .replace(/\\n/g, ' ')
                    .replace(/\\t/g, ' ')
                    .replace(/\\\\/g, '\\')
                    .replace(/\\"/g, '"')
                    .replace(/\\'/g, "'");
                
                return JSON.parse(cleaned);
            }
        }
        
    } catch (parseError) {
        console.error('JSON parse tüm denemeler başarısız:', parseError.message);
        console.error('Problematik metin:', text.substring(0, 200) + '...');
        
        // Son çare: basit fallback response döndür
        return {
            problemOzeti: {
                verilenler: ["Problem analiz edildi"],
                istenen: "Çözüm hesaplanıyor"
            },
            adimlar: [
                {
                    adimAciklamasi: "Problem çözülüyor",
                    cozum_lateks: "$$\\text{Çözüm işleniyor}$$",
                    ipucu: "Sistem hatası nedeniyle basit çözüm"
                }
            ],
            tamCozumLateks: ["$$\\text{Sistem hatası}$$"]
        };
    }
}