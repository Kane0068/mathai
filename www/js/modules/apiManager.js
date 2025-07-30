/**
 * APIManager - Handles all API communication, response parsing, and validation
 * Extracts from index.js: API calls, response parsing, validation, retry logic
 */

import { GEMINI_API_URL } from './utils.js';
import { showLoading } from './ui.js';

export class APIManager {
    constructor() {
        this.masterSolutionPrompt = `Solve the math problem and respond in the following JSON format.

CRITICAL: ALL RESPONSES MUST BE IN TURKISH LANGUAGE. Mathematical expressions must follow the exact LaTeX format compatible with MathJax v3 and KaTeX renderer.

INTELLIGENT STEP CREATION RULES:
- Analyze the problem complexity and create appropriate number of steps
- Simple concept questions (like "which is irrational?"): 1-2 steps maximum
- Multiple choice questions: Focus on the logical reasoning, not checking each option separately
- Calculation problems: Break into natural mathematical steps
- Complex proofs: More detailed steps are acceptable

ROADMAP CONTENT RULES FOR adimAciklamasi AND ipucu:
- ABSOLUTELY NO LaTeX expressions in adimAciklamasi and ipucu fields
- Use ONLY verbal explanations in Turkish
- Be brief and direct about what to think or do
- Focus on the thinking process, not showing calculations
- Example GOOD: "Hangi sayının rasyonel olmadığını belirlemek için kök altındaki sayıları incele"
- Example BAD: "√2 ifadesini kontrol et" (no LaTeX symbols)

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
    }

    /**
     * Make API call with retry logic
     */
    async makeApiCallWithRetry(sourceType, sourceData, problemContextForPrompt, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 API çağrısı deneme ${attempt}/${maxRetries}`);
                
                const promptText = this.masterSolutionPrompt.replace('{PROBLEM_CONTEXT}', problemContextForPrompt);
                const payloadParts = [{ text: promptText }];
                
                if (sourceType !== 'text') {
                    payloadParts.push({ inlineData: { mimeType: 'image/png', data: sourceData } });
                }
                
                // Son çağrıyı kaydet (retry için)
                window.lastApiCall = () => this.makeApiCall({ contents: [{ role: "user", parts: payloadParts }] });
                
                const solution = await this.makeApiCall({ contents: [{ role: "user", parts: payloadParts }] });
                
                if (solution && solution.problemOzeti) {
                    console.log(`✅ API çağrısı başarılı - deneme ${attempt}`);
                    return solution;
                } else {
                    throw new Error('API yanıtı geçersiz format');
                }
                
            } catch (error) {
                lastError = error;
                console.error(`❌ API çağrısı deneme ${attempt} başarısız:`, error.message);
                
                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                    console.log(`⏳ ${delay}ms bekleniyor, sonra tekrar denenecek...`);
                    
                    // Loading mesajını güncelle
                    showLoading(`API hatası - ${maxRetries - attempt} deneme kaldı. ${delay/1000}s bekleniyor...`);
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        // Tüm denemeler başarısız
        console.error('❌ Tüm API denemeleri başarısız');
        throw lastError || new Error('API çağrısı maksimum deneme sayısına ulaştı');
    }

    /**
     * Make basic API call
     */
    async makeApiCall(payload) {
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
                return this.parseApiResponse(content);
            }

            throw new Error('Geçersiz API yanıt yapısı');
        } catch (error) {
            console.error('API çağrısı hatası:', error);
            throw error;
        }
    }

    /**
     * Parse API response with enhanced error handling
     */
    parseApiResponse(content) {
        console.log('🔄 Enhanced API response parsing...');
        
        // Strategy 1: Direct JSON parse with enhanced error handling
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                console.log('✅ Direct JSON parse successful');
                return this.validateAndFixApiResponse(result);
            }
        } catch (directParseError) {
            console.log('⚠️ Direct parse failed, trying cleanup...');
        }
        
        // Strategy 2: Enhanced content cleaning
        try {
            let cleanedContent = this.enhancedCleanApiContent(content);
            const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                console.log('✅ Enhanced cleanup parse successful');
                return this.validateAndFixApiResponse(result);
            }
        } catch (cleanParseError) {
            console.log('⚠️ Cleanup parse failed, trying extraction...');
        }
        
        // Strategy 3: Enhanced regex extraction
        try {
            const result = this.enhancedExtractDataWithRegex(content);
            console.log('✅ Enhanced extraction successful');
            return this.validateAndFixApiResponse(result);
        } catch (regexError) {
            console.log('⚠️ All parsing failed, using fallback...');
        }
        
        // Strategy 4: Fallback
        return this.createEnhancedFallbackResponse();
    }

    /**
     * Enhanced content cleaning
     */
    enhancedCleanApiContent(content) {
        return content
            // Unicode normalization
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u2013\u2014]/g, "-")
            
            // LaTeX backslash normalization BEFORE JSON parsing
            .replace(/\\{4,}/g, '\\\\')  // Quadruple+ -> double for JSON
            .replace(/\\{3}/g, '\\\\')   // Triple -> double for JSON
            
            // Control character cleanup
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
            
            // JSON structure fixes
            .replace(/,(\s*[}\]])/g, '$1')  // Trailing commas
            .replace(/\s+/g, ' ')           // Normalize spaces
            .trim();
    }

    /**
     * Enhanced regex-based data extraction
     */
    enhancedExtractDataWithRegex(content) {
        const result = {
            problemOzeti: { verilenler: [], istenen: "" },
            adimlar: [],
            tamCozumLateks: []
        };
        
        // Extract with multiple patterns and better LaTeX normalization
        try {
            // Problem summary extraction
            const verilenlerMatch = content.match(/verilenler["\s]*:\s*\[(.*?)\]/s);
            if (verilenlerMatch) {
                result.problemOzeti.verilenler = this.extractAndNormalizeArray(verilenlerMatch[1]);
            }
            
            const istenenMatch = content.match(/istenen["\s]*:\s*["']([^"']{10,}?)["']/s);
            if (istenenMatch) {
                result.problemOzeti.istenen = this.normalizeLatexFromAPI(istenenMatch[1]);
            }
            
            // Steps extraction with LaTeX normalization
            const stepDescriptions = this.extractMultipleMatches(content, /adimAciklamasi["\s]*:\s*["']([^"']{5,}?)["']/g);
            const stepLatex = this.extractMultipleMatches(content, /cozum_lateks["\s]*:\s*["']([^"']{3,}?)["']/g);
            const stepHints = this.extractMultipleMatches(content, /ipucu["\s]*:\s*["']([^"']{3,}?)["']/g);
            
            const maxSteps = Math.max(stepDescriptions.length, stepLatex.length, 1);
            for (let i = 0; i < maxSteps; i++) {
                result.adimlar.push({
                    adimAciklamasi: stepDescriptions[i] || `Adım ${i + 1}`,
                    cozum_lateks: this.normalizeLatexFromAPI(stepLatex[i] || "\\text{Çözüm eksik}"),
                    ipucu: stepHints[i] || "İpucu mevcut değil"
                });
            }
            
            // Full solution extraction
            result.tamCozumLateks = result.adimlar.map(step => step.cozum_lateks);
            
            return result;
        } catch (error) {
            console.error('Enhanced extraction error:', error);
            throw error;
        }
    }

    /**
     * Extract multiple regex matches
     */
    extractMultipleMatches(content, pattern) {
        const matches = [];
        let match;
        while ((match = pattern.exec(content)) !== null) {
            matches.push(match[1].trim());
        }
        return matches;
    }

    /**
     * Extract and normalize array from string
     */
    extractAndNormalizeArray(arrayStr) {
        try {
            const items = arrayStr.split(/,|;|\n/)
                .map(item => item.replace(/["']/g, '').trim())
                .filter(item => item.length > 0)
                .slice(0, 5);
            
            return items.map(item => this.normalizeLatexFromAPI(item));
        } catch (error) {
            return ["Problem özeti eksik"];
        }
    }

    /**
     * Validate and fix API response
     */
    validateAndFixApiResponse(data) {
        console.log('🔍 Enhanced API response validation...');
        
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data structure');
        }
        
        // Fix problem summary
        if (!data.problemOzeti) {
            data.problemOzeti = {
                verilenler: ["Problem özeti eksik"],
                istenen: "Çözüm isteniyor"
            };
        }
        
        // Normalize LaTeX in problem summary
        if (data.problemOzeti.verilenler) {
            data.problemOzeti.verilenler = data.problemOzeti.verilenler.map(item => 
                this.normalizeLatexFromAPI(item)
            );
        }
        
        if (data.problemOzeti.istenen) {
            data.problemOzeti.istenen = this.normalizeLatexFromAPI(data.problemOzeti.istenen);
        }
        
        // Fix and normalize steps
        if (!data.adimlar || !Array.isArray(data.adimlar) || data.adimlar.length === 0) {
            data.adimlar = [{
                adimAciklamasi: "API'dan adım bilgisi alınamadı",
                cozum_lateks: "\\text{Çözüm gösterilemiyor}",
                ipucu: "Lütfen tekrar deneyin"
            }];
        }
        
        // Normalize LaTeX in each step
        data.adimlar.forEach((step, index) => {
            if (!step.adimAciklamasi) {
                step.adimAciklamasi = `Adım ${index + 1} açıklaması eksik`;
            }
            
            if (!step.cozum_lateks) {
                step.cozum_lateks = "\\text{LaTeX çözümü eksik}";
            } else {
                // CRITICAL: Normalize LaTeX content
                step.cozum_lateks = this.normalizeLatexFromAPI(step.cozum_lateks);
            }
            
            if (!step.ipucu) {
                step.ipucu = "İpucu mevcut değil";
            }
        });
        
        // Fix and normalize full solution
        if (!data.tamCozumLateks || !Array.isArray(data.tamCozumLateks) || data.tamCozumLateks.length === 0) {
            data.tamCozumLateks = data.adimlar.map(step => step.cozum_lateks);
        } else {
            // Normalize each LaTeX expression
            data.tamCozumLateks = data.tamCozumLateks.map(latex => this.normalizeLatexFromAPI(latex));
        }
        
        console.log('✅ Enhanced API response validation completed');
        return data;
    }

    /**
     * Normalize LaTeX content from API
     */
    normalizeLatexFromAPI(content) {
        if (!content || typeof content !== 'string') return content;
        
        return content
            // Double backslash normalization for LaTeX
            .replace(/\\{4,}/g, '\\\\')  // 4+ backslashes -> 2
            .replace(/\\{3}/g, '\\\\')   // 3 backslashes -> 2
            // Keep existing double backslashes as is
            .replace(/\\\\/g, '\\\\')
            // Handle common LaTeX patterns
            .replace(/\\text\s*{/g, '\\text{')
            .replace(/\\frac\s*{/g, '\\frac{')
            .replace(/\\sqrt\s*{/g, '\\sqrt{')
            .trim();
    }

    /**
     * Create enhanced fallback response
     */
    createEnhancedFallbackResponse() {
        return {
            problemOzeti: {
                verilenler: ["API yanıtı işlenemedi - Enhanced normalizer aktif"],
                istenen: "Çözüm gösterilemiyor (backslash sorunu tespit edildi)"
            },
            adimlar: [{
                adimAciklamasi: "API backslash tutarsızlığı tespit edildi",
                cozum_lateks: "\\text{Backslash normalizasyonu gerekli}",
                ipucu: "LaTeX render sistemi güncellenmeli"
            }],
            tamCozumLateks: ["\\text{Enhanced normalizer ile yeniden deneyin}"],
            _enhanced_fallback: true,
            _backslash_issue: true
        };
    }

    /**
     * Check API health
     */
    async checkApiHealth() {
        try {
            const testPayload = {
                contents: [{
                    role: "user",
                    parts: [{ text: "Test: 2+2=?" }]
                }]
            };
            
            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testPayload)
            });
            
            return {
                healthy: response.ok,
                status: response.status,
                statusText: response.statusText
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }
}

// Export singleton instance for backward compatibility
export const apiManager = new APIManager();