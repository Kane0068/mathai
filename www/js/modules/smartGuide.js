// =================================================================================
//  Akıllı Rehber Sistemi - smartGuide.js
//  Matematik problemlerini adım adım çözmek için akıllı rehberlik sistemi
// =================================================================================

// makeApiCall fonksiyonu pages/index.js'de tanımlanmış, bu yüzden global olarak erişilecek
import { showError, showSuccess, renderMath } from './ui.js';
import { AdvancedErrorHandler } from './errorHandler.js';
import { StateManager } from './stateManager.js';

export class SmartGuideSystem {
    constructor() {
        this.errorHandler = new AdvancedErrorHandler();
        this.stateManager = new StateManager();
        this.currentStep = 0;
        this.studentAttempts = [];
        this.guidanceData = null;
        this.localValidationRules = this.initializeValidationRules();
        this.progressiveHints = [];
        this.isProcessing = false;
        
        // Canvas için gerekli referanslar
        this.canvasManager = null;
        this.activeCanvasId = null;
    }

    // Başlangıç rehberlik verilerini API'den al (tek seferlik)
    async initializeGuidance(solutionData) {
        if (!solutionData) {
            throw new Error('Çözüm verisi bulunamadı');
        }

        try {
            // Mevcut çözüm verisinden rehberlik verisi oluştur
            this.guidanceData = this.processGuidanceData(solutionData);
            this.currentStep = 0;
            this.studentAttempts = [];
            this.progressiveHints = [];
            
            return this.guidanceData;
        } catch (error) {
            this.errorHandler.handleError(error, { 
                operation: 'initializeGuidance',
                fallbackMessage: 'Rehberlik sistemi başlatılamadı'
            });
            throw error;
        }
    }

    // Çözüm verisini rehberlik formatına dönüştür
    processGuidanceData(solutionData) {
        const { adimlar, tamCozumLateks, problemOzeti } = solutionData;
        
        if (!adimlar || !Array.isArray(adimlar)) {
            throw new Error('Adım bilgileri eksik');
        }

        return {
            totalSteps: adimlar.length,
            problemSummary: problemOzeti,
            steps: adimlar.map((step, index) => ({
                stepNumber: index + 1,
                description: step.adimAciklamasi || `${index + 1}. Adım`,
                correctAnswer: step.cozum_lateks || '',
                hints: this.generateProgressiveHints(step),
                commonMistakes: step.yanlisSecenekler || [],
                validationKeywords: this.extractValidationKeywords(step.cozum_lateks || ''),
                ipucu: step.ipucu || 'Bu adımda dikkatli olun.',
                difficulty: this.calculateStepDifficulty(step)
            }))
        };
    }

    // Progresif ipuçları oluştur
    generateProgressiveHints(stepData) {
        const hints = [];
        
        // Temel ipucu
        if (stepData.ipucu) {
            hints.push({
                level: 1,
                text: stepData.ipucu,
                type: 'general'
            });
        }

        // Matematiksel ipucu
        if (stepData.cozum_lateks) {
            hints.push({
                level: 2,
                text: 'Bu adımda kullanılacak matematiksel işlem hakkında düşünün.',
                type: 'mathematical'
            });
        }

        // Detaylı ipucu
        hints.push({
            level: 3,
            text: 'Önceki adımdan gelen sonucu kullanmayı unutmayın.',
            type: 'detailed'
        });

        return hints;
    }

    // Validasyon anahtar kelimeleri çıkar
    extractValidationKeywords(latexString) {
        const keywords = [];
        
        // Temel matematik operatörleri
        const operators = ['+', '-', '*', '/', '=', '^', '\\sqrt', '\\frac'];
        operators.forEach(op => {
            if (latexString.includes(op)) {
                keywords.push(op);
            }
        });

        // Sayıları çıkar
        const numbers = latexString.match(/\d+/g);
        if (numbers) {
            keywords.push(...numbers);
        }

        return keywords;
    }

    // Adım zorluğunu hesapla
    calculateStepDifficulty(stepData) {
        let difficulty = 1;
        
        const latex = stepData.cozum_lateks || '';
        
        // Karmaşık operatörler varsa zorluk artar
        if (latex.includes('\\frac')) difficulty += 2;
        if (latex.includes('\\sqrt')) difficulty += 2;
        if (latex.includes('^')) difficulty += 1;
        if (latex.includes('\\sum') || latex.includes('\\int')) difficulty += 3;
        
        return Math.min(difficulty, 5); // Max 5 zorluk
    }

    // Lokal validasyon kurallarını başlat
    initializeValidationRules() {
        return {
            // Temel matematik kuralları
            basicMath: {
                addition: /\+/,
                subtraction: /-/,
                multiplication: /\*/,
                division: /\//,
                equals: /=/,
                parentheses: /\(|\)/
            },
            
            // Yaygın hatalar
            commonErrors: [
                {
                    pattern: /(\d+)\s*[+\-*/]\s*(\d+)\s*=\s*(\d+)/,
                    validator: (match) => {
                        const [, a, op, b, result] = match;
                        const numA = parseInt(a), numB = parseInt(b), numResult = parseInt(result);
                        
                        switch(op.trim()) {
                            case '+': return numA + numB === numResult;
                            case '-': return numA - numB === numResult;
                            case '*': return numA * numB === numResult;
                            case '/': return numA / numB === numResult;
                            default: return false;
                        }
                    }
                }
            ],
            
            // Matematik sembolleri
            mathSymbols: /[+\-*/=()^√∫∑]/
        };
    }

    // Öğrenci adımını değerlendir
    async evaluateStudentStep(studentInput, inputType = 'text') {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        
        try {
            // Mevcut adım verilerini al
            const currentStepData = this.guidanceData.steps[this.currentStep];
            if (!currentStepData) {
                throw new Error('Geçerli adım verisi bulunamadı');
            }

            // Öğrenci girişini kaydet
            this.studentAttempts.push({
                step: this.currentStep,
                input: studentInput,
                inputType: inputType,
                timestamp: Date.now()
            });

            // Önce lokal validasyon yap
            const localValidation = this.performLocalValidation(studentInput, currentStepData);
            
            if (localValidation.isValid) {
                // Doğru cevap
                return this.handleCorrectAnswer(localValidation);
            } else if (localValidation.needsApiCheck) {
                // API kontrolü gerekiyor
                return await this.performApiValidation(studentInput, currentStepData);
            } else {
                // Lokal olarak yanlış tespit edildi
                return this.handleIncorrectAnswer(localValidation);
            }
            
        } catch (error) {
            this.errorHandler.handleError(error, {
                operation: 'evaluateStudentStep',
                context: { step: this.currentStep, inputType }
            });
            
            return {
                isCorrect: false,
                message: 'Değerlendirme sırasında bir hata oluştu',
                hint: 'Lütfen tekrar deneyin',
                shouldProceed: false
            };
        } finally {
            this.isProcessing = false;
        }
    }

    // Lokal validasyon gerçekleştir
    performLocalValidation(studentInput, stepData) {
        const result = {
            isValid: false,
            needsApiCheck: false,
            confidence: 0,
            errorType: null,
            suggestion: null
        };

        // Boş girdi kontrolü
        if (!studentInput || studentInput.trim().length === 0) {
            result.errorType = 'empty_input';
            result.suggestion = 'Lütfen bir çözüm yazın';
            return result;
        }

        // Temel format kontrolü
        if (!this.localValidationRules.mathSymbols.test(studentInput)) {
            result.errorType = 'no_math_symbols';
            result.suggestion = 'Matematiksel semboller kullanın (+, -, *, /, = vb.)';
            return result;
        }

        // Anahtar kelime kontrolü
        const matchedKeywords = stepData.validationKeywords.filter(keyword => 
            studentInput.includes(keyword)
        );

        if (matchedKeywords.length === 0) {
            result.needsApiCheck = true;
            result.confidence = 0.3;
            return result;
        }

        // Yüksek eşleşme varsa doğru kabul et
        const matchRatio = matchedKeywords.length / stepData.validationKeywords.length;
        if (matchRatio >= 0.7) {
            result.isValid = true;
            result.confidence = matchRatio;
            return result;
        }

        // Orta eşleşme - API kontrolü gerekli
        result.needsApiCheck = true;
        result.confidence = matchRatio;
        return result;
    }

    // API ile detaylı validasyon
    async performApiValidation(studentInput, stepData) {
        const validationPrompt = `
        Öğrencinin matematik adımını değerlendir ve JSON formatında yanıt ver:
        
        Beklenen çözüm: ${stepData.correctAnswer}
        Öğrenci cevabı: ${studentInput}
        Adım açıklaması: ${stepData.description}
        
        Yanıt formatı:
        {
            "isCorrect": boolean,
            "accuracy": number (0-1),
            "feedback": "string",
            "specificError": "string or null",
            "improvement": "string"
        }
        `;

        try {
            // makeApiCall fonksiyonunun tanımlı olup olmadığını kontrol et
            if (typeof window.makeApiCall !== 'function') {
                console.warn('makeApiCall fonksiyonu tanımlı değil, fallback kullanılıyor');
                return this.generateFallbackResponse(studentInput, stepData);
            }
            
            const response = await window.makeApiCall({
                contents: [{
                    role: "user",
                    parts: [{ text: validationPrompt }]
                }]
            });

            if (response && response.isCorrect !== undefined) {
                return {
                    isCorrect: response.isCorrect,
                    message: response.feedback || 'Değerlendirme tamamlandı',
                    hint: response.improvement || 'Devam edebilirsiniz',
                    shouldProceed: response.isCorrect,
                    accuracy: response.accuracy || 0
                };
            } else {
                // API'den geçerli yanıt alınamadı, fallback kullan
                return this.generateFallbackResponse(studentInput, stepData);
            }
            
        } catch (error) {
            console.warn('API validasyonu başarısız, fallback kullanılıyor:', error);
            return this.generateFallbackResponse(studentInput, stepData);
        }
    }

    // Fallback yanıt oluştur
    generateFallbackResponse(studentInput, stepData) {
        // Temel benzerlik kontrolü
        const similarity = this.calculateSimilarity(studentInput, stepData.correctAnswer);
        
        if (similarity > 0.6) {
            return {
                isCorrect: true,
                message: 'Bu adım doğru görünüyor!',
                hint: 'Bir sonraki adıma geçebilirsiniz',
                shouldProceed: true,
                accuracy: similarity
            };
        } else {
            return {
                isCorrect: false,
                message: 'Bu adımda bir sorun var gibi görünüyor',
                hint: this.getNextHint(),
                shouldProceed: false,
                accuracy: similarity
            };
        }
    }

    // Doğru cevabı işle
    handleCorrectAnswer(validationResult) {
        const stepData = this.guidanceData.steps[this.currentStep];
        
        return {
            isCorrect: true,
            message: `Tebrikler! ${this.currentStep + 1}. adımı doğru çözdünüz.`,
            hint: this.currentStep < this.guidanceData.totalSteps - 1 ? 
                'Bir sonraki adıma geçebilirsiniz' : 
                'Tüm adımları tamamladınız!',
            shouldProceed: true,
            accuracy: validationResult.confidence || 1,
            nextStep: this.currentStep + 1
        };
    }

    // Yanlış cevabı işle
    handleIncorrectAnswer(validationResult) {
        const hint = this.getNextHint();
        
        return {
            isCorrect: false,
            message: validationResult.suggestion || 'Bu adımda bir hata var',
            hint: hint.text,
            shouldProceed: false,
            accuracy: validationResult.confidence || 0,
            errorType: validationResult.errorType
        };
    }

    // Sonraki ipucunu al
    getNextHint() {
        const stepData = this.guidanceData.steps[this.currentStep];
        const attemptCount = this.studentAttempts.filter(a => a.step === this.currentStep).length;
        
        // İpucu seviyesini attempt sayısına göre belirle
        const hintLevel = Math.min(attemptCount, stepData.hints.length);
        
        if (hintLevel === 0) {
            return {
                text: 'Bu adımı dikkatle düşünün',
                type: 'general'
            };
        }
        
        return stepData.hints[hintLevel - 1] || {
            text: stepData.ipucu || 'Doğru cevap: ' + stepData.correctAnswer,
            type: 'final'
        };
    }

    // Bir sonraki adıma geç
    proceedToNextStep() {
        if (this.currentStep < this.guidanceData.totalSteps - 1) {
            this.currentStep++;
            this.progressiveHints = [];
            return true;
        }
        return false; // Son adıma ulaşıldı
    }

    // Mevcut adım bilgilerini al
    getCurrentStepInfo() {
        if (!this.guidanceData || this.currentStep >= this.guidanceData.totalSteps) {
            return null;
        }
        
        const stepData = this.guidanceData.steps[this.currentStep];
        return {
            stepNumber: stepData.stepNumber,
            description: stepData.description,
            totalSteps: this.guidanceData.totalSteps,
            progress: ((this.currentStep + 1) / this.guidanceData.totalSteps) * 100,
            difficulty: stepData.difficulty,
            hasHints: stepData.hints.length > 0
        };
    }

    // İlerleme durumunu al
    getProgress() {
        return {
            currentStep: this.currentStep + 1,
            totalSteps: this.guidanceData?.totalSteps || 0,
            completedSteps: this.currentStep,
            attempts: this.studentAttempts.length,
            accuracy: this.calculateOverallAccuracy()
        };
    }

    // Genel doğruluk oranını hesapla
    calculateOverallAccuracy() {
        if (this.studentAttempts.length === 0) return 0;
        
        const correctAttempts = this.studentAttempts.filter(attempt => 
            attempt.wasCorrect === true
        ).length;
        
        return (correctAttempts / this.studentAttempts.length) * 100;
    }

    // Benzerlik hesapla (basit string benzerliği)
    calculateSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;
        
        const len1 = str1.length;
        const len2 = str2.length;
        const maxLen = Math.max(len1, len2);
        
        if (maxLen === 0) return 1;
        
        // Levenshtein distance'a benzer basit algoritma
        let matches = 0;
        const minLen = Math.min(len1, len2);
        
        for (let i = 0; i < minLen; i++) {
            if (str1[i] === str2[i]) matches++;
        }
        
        return matches / maxLen;
    }

    // Sistemi sıfırla
    reset() {
        this.currentStep = 0;
        this.studentAttempts = [];
        this.guidanceData = null;
        this.progressiveHints = [];
        this.isProcessing = false;
    }

    // Canvas referansını ayarla
    setCanvasManager(canvasManager) {
        this.canvasManager = canvasManager;
    }

    // Aktif canvas ID'sini ayarla
    setActiveCanvasId(canvasId) {
        this.activeCanvasId = canvasId;
    }

    // Canvas'dan metin al
    async getCanvasText() {
        if (!this.canvasManager || !this.activeCanvasId) {
            throw new Error('Canvas manager veya canvas ID tanımlanmamış');
        }
        
        return this.canvasManager.toDataURL(this.activeCanvasId);
    }
}

// Singleton pattern için export
export const smartGuide = new SmartGuideSystem();