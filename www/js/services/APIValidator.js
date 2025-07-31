// www/js/services/APIValidator.js

export class APIValidator {
    /**
     * Validate API response structure and content
     * @param {Object} response - API response to validate
     * @returns {Object} Validation result with valid flag, errors, warnings, and corrected response
     */
    static validateApiResponse(response) {
        const result = {
            valid: false,
            errors: [],
            warnings: [],
            correctedResponse: null
        };

        try {
            // Check if response exists
            if (!response) {
                result.errors.push('API yanıtı boş');
                return result;
            }

            // Check required top-level properties
            const requiredFields = ['problemOzeti', 'solution'];
            const missingFields = requiredFields.filter(field => !response[field]);
            
            if (missingFields.length > 0) {
                result.errors.push(`Eksik alanlar: ${missingFields.join(', ')}`);
            }

            // Validate problemOzeti
            const problemValidation = this.validateProblemOzeti(response.problemOzeti);
            result.errors.push(...problemValidation.errors);
            result.warnings.push(...problemValidation.warnings);

            // Validate solution
            const solutionValidation = this.validateSolution(response.solution);
            result.errors.push(...solutionValidation.errors);
            result.warnings.push(...solutionValidation.warnings);

            // If there are errors but we can create a corrected response
            if (result.errors.length > 0) {
                const corrected = this.attemptAutoCorrection(response);
                if (corrected) {
                    result.correctedResponse = corrected;
                    result.warnings.push('Yanıt otomatik olarak düzeltildi');
                }
            }

            // Response is valid if no critical errors remain
            result.valid = result.errors.length === 0 || result.correctedResponse !== null;

            return result;

        } catch (error) {
            result.errors.push(`Doğrulama hatası: ${error.message}`);
            return result;
        }
    }

    /**
     * Validate problem summary structure
     */
    static validateProblemOzeti(problemOzeti) {
        const result = { errors: [], warnings: [] };

        if (!problemOzeti) {
            result.errors.push('Problem özeti bulunamadı');
            return result;
        }

        // Check for required fields
        if (!problemOzeti.verilenler) {
            result.warnings.push('Verilenler alanı eksik');
        } else if (!Array.isArray(problemOzeti.verilenler)) {
            result.errors.push('Verilenler array olmalı');
        } else if (problemOzeti.verilenler.length === 0) {
            result.warnings.push('Verilenler listesi boş');
        }

        if (!problemOzeti.istenen) {
            result.warnings.push('İstenen alanı eksik');
        } else if (typeof problemOzeti.istenen !== 'string') {
            result.errors.push('İstenen string olmalı');
        }

        return result;
    }

    /**
     * Validate solution structure
     */
    static validateSolution(solution) {
        const result = { errors: [], warnings: [] };

        if (!solution) {
            result.errors.push('Çözüm bulunamadı');
            return result;
        }

        // Check for steps
        if (!solution.adimlar) {
            result.errors.push('Çözüm adımları bulunamadı');
        } else if (!Array.isArray(solution.adimlar)) {
            result.errors.push('Adımlar array olmalı');
        } else if (solution.adimlar.length === 0) {
            result.errors.push('Çözüm adımları boş');
        } else {
            // Validate each step
            solution.adimlar.forEach((step, index) => {
                const stepValidation = this.validateSolutionStep(step, index);
                result.errors.push(...stepValidation.errors);
                result.warnings.push(...stepValidation.warnings);
            });
        }

        // Check for final answer
        if (!solution.sonuclar) {
            result.warnings.push('Sonuçlar alanı eksik');
        }

        return result;
    }

    /**
     * Validate individual solution step
     */
    static validateSolutionStep(step, index) {
        const result = { errors: [], warnings: [] };

        if (!step) {
            result.errors.push(`Adım ${index + 1} boş`);
            return result;
        }

        // Check required step fields
        if (!step.aciklama) {
            result.warnings.push(`Adım ${index + 1}: Açıklama eksik`);
        }

        if (!step.islem) {
            result.warnings.push(`Adım ${index + 1}: İşlem eksik`);
        }

        if (!step.sonuc) {
            result.warnings.push(`Adım ${index + 1}: Sonuç eksik`);
        }

        // Validate step content quality
        if (step.aciklama && step.aciklama.length < 10) {
            result.warnings.push(`Adım ${index + 1}: Açıklama çok kısa`);
        }

        return result;
    }

    /**
     * Attempt to auto-correct common API response issues
     */
    static attemptAutoCorrection(response) {
        try {
            const corrected = JSON.parse(JSON.stringify(response)); // Deep clone

            // Fix problemOzeti if missing or malformed
            if (!corrected.problemOzeti) {
                corrected.problemOzeti = {
                    verilenler: ['Verilen bilgiler API yanıtında bulunamadı'],
                    istenen: 'İstenen API yanıtında bulunamadı'
                };
            }

            if (!corrected.problemOzeti.verilenler || !Array.isArray(corrected.problemOzeti.verilenler)) {
                corrected.problemOzeti.verilenler = ['Verilen bilgiler düzgün formatlanmamış'];
            }

            if (!corrected.problemOzeti.istenen) {
                corrected.problemOzeti.istenen = 'İstenen bilgi belirtilmemiş';
            }

            // Fix solution if missing or malformed
            if (!corrected.solution) {
                corrected.solution = {
                    adimlar: [{
                        aciklama: 'Çözüm API yanıtında eksik veya hatalı',
                        islem: 'Tekrar deneyin',
                        sonuc: 'Çözüm bulunamadı'
                    }],
                    sonuclar: ['Çözüm tamamlanamadı']
                };
            }

            if (!corrected.solution.adimlar || !Array.isArray(corrected.solution.adimlar)) {
                corrected.solution.adimlar = [{
                    aciklama: 'Çözüm adımları düzgün formatlanmamış',
                    islem: 'Manuel kontrol gerekli',
                    sonuc: 'Hatalı format'
                }];
            }

            // Ensure each step has required fields
            corrected.solution.adimlar = corrected.solution.adimlar.map((step, index) => ({
                aciklama: step.aciklama || `Adım ${index + 1} açıklaması eksik`,
                islem: step.islem || 'İşlem belirtilmemiş',
                sonuc: step.sonuc || 'Sonuç hesaplanamadı',
                ...step // Preserve any additional fields
            }));

            return corrected;

        } catch (error) {
            console.error('Auto-correction failed:', error);
            return null;
        }
    }

    /**
     * Validate mathematical content in text
     */
    static validateMathContent(text) {
        if (!text || typeof text !== 'string') {
            return { valid: false, issues: ['Metin içeriği geçersiz'] };
        }

        const issues = [];

        // Check for common LaTeX syntax errors
        const latexPatterns = {
            unbalancedBraces: /\{[^{}]*\{[^{}]*\}[^{}]*\}/g,
            unbalancedDollar: /\$[^$]*\$/g,
            invalidCommands: /\\[a-zA-Z]+\{[^}]*\}/g
        };

        // Check for unbalanced delimiters
        const openBraces = (text.match(/\{/g) || []).length;
        const closeBraces = (text.match(/\}/g) || []).length;
        if (openBraces !== closeBraces) {
            issues.push('Süslü parantezler dengelenmemiş');
        }

        const dollarSigns = (text.match(/\$/g) || []).length;
        if (dollarSigns % 2 !== 0) {
            issues.push('Dollar işaretleri dengelenmemiş');
        }

        return {
            valid: issues.length === 0,
            issues: issues
        };
    }

    /**
     * Sanitize and clean API response content
     */
    static sanitizeContent(content) {
        if (typeof content !== 'string') return content;

        // Remove potentially harmful content
        let cleaned = content
            .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
            .replace(/javascript:/gi, '') // Remove javascript: URLs
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .trim();

        // Fix common LaTeX formatting issues
        cleaned = cleaned
            .replace(/\$\$\s*\$\$/g, '') // Remove empty math blocks
            .replace(/\$\s*\$/g, '') // Remove empty inline math
            .replace(/\\{2,}/g, '\\') // Fix multiple backslashes
            .replace(/\s+/g, ' '); // Normalize whitespace

        return cleaned;
    }

    /**
     * Extract and validate mathematical expressions
     */
    static extractMathExpressions(text) {
        if (!text) return [];

        const expressions = [];
        
        // Find dollar-delimited math
        const dollarMatches = text.match(/\$([^$]+)\$/g) || [];
        expressions.push(...dollarMatches.map(match => ({
            type: 'inline',
            content: match,
            valid: this.validateMathContent(match).valid
        })));

        // Find double-dollar-delimited math
        const doubleDollarMatches = text.match(/\$\$([^$]+)\$\$/g) || [];
        expressions.push(...doubleDollarMatches.map(match => ({
            type: 'block',
            content: match,
            valid: this.validateMathContent(match).valid
        })));

        return expressions;
    }
}