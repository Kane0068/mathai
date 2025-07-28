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
        
        // İpucu sistemi
        this.hintCount = 0;
        this.usedHints = new Set();
        this.isHintVisible = false;
        
        // YENİ EKLEME: Deneme sistemi
        this.attemptsPerStep = new Map(); // Her adım için deneme sayısı
        this.maxAttemptsPerStep = 3; // Adım başına maksimum deneme
        this.currentStepAttempts = 0; // Mevcut adımdaki deneme sayısı
        this.stepFailed = false; // Adım başarısız oldu mu?
        
        // Canvas için gerekli referanslar
        this.canvasManager = null;
        this.activeCanvasId = null;

        // YENİ: Adım zorunluluğu sistemi
        this.stepEnforcementRules = {
            minStepsRequired: 2, // En az 2 adım gerekli
            finalAnswerEarlyThreshold: 0.7, // %70'den erken final cevap verilirse uyarı
            consecutiveFinalAnswers: 0, // Arka arkaya final cevap sayısı
            maxConsecutiveFinalAnswers: 2, // Maksimum arka arkaya final cevap
            adaptiveDifficulty: true // Zorluk derecesine göre uyarlanır
        };
        
        this.learningPath = {
            totalProblemsAttempted: 0,
            earlyFinalAnswerCount: 0,
            averageStepsCompleted: 0,
            learningScore: 100 // 100'den başlar, suistimal ederse düşer
        };
    }

    // Adım zorunluluğunu kontrol et
    checkStepEnforcement(currentStepIndex, totalSteps, studentInput, isLikelyFinalAnswer) {
        const progressPercentage = (currentStepIndex + 1) / totalSteps;
        const enforcement = {
            allowFinalAnswer: true,
            warningMessage: null,
            penaltyApplied: false,
            requiredStepsRemaining: 0,
            educationalReason: null
        };

        // Çok erken final cevap kontrolü
        if (isLikelyFinalAnswer && progressPercentage < this.stepEnforcementRules.finalAnswerEarlyThreshold) {
            
            // Arka arkaya final cevap sayısını artır
            this.stepEnforcementRules.consecutiveFinalAnswers++;
            
            // Eğitim puanını düşür
            this.learningPath.learningScore = Math.max(0, this.learningPath.learningScore - 10);
            
            if (this.stepEnforcementRules.consecutiveFinalAnswers >= this.stepEnforcementRules.maxConsecutiveFinalAnswers) {
                // Fazla suistimal - adım atlamayı engelle
                enforcement.allowFinalAnswer = false;
                enforcement.warningMessage = `🚫 Adım atlanamaz! Bu problemde adım adım çözüm yapmalısınız. (${Math.ceil((1 - progressPercentage) * totalSteps)} adım kaldı)`;
                enforcement.requiredStepsRemaining = Math.ceil((1 - progressPercentage) * totalSteps);
                enforcement.educationalReason = "Matematik öğrenmek için her adımı anlamanız önemlidir.";
                enforcement.penaltyApplied = true;
            } else {
                // Uyarı ver ama izin ver
                enforcement.warningMessage = `⚠️ Çok hızlı gidiyorsunuz! Öğrenmek için adımları tamamlamanız önerilir. (${this.stepEnforcementRules.maxConsecutiveFinalAnswers - this.stepEnforcementRules.consecutiveFinalAnswers} hak kaldı)`;
                enforcement.educationalReason = "Her adımı çözerek matematik düşünce sürecinizi geliştirebilirsiniz.";
            }
            
        } else {
            // Normal ilerleyiş - sayacı sıfırla
            this.stepEnforcementRules.consecutiveFinalAnswers = 0;
        }

        return enforcement;
    }

    // Problem tipine göre zorunluluk seviyesini belirle
    calculateEnforcementLevel(problemData) {
        const { adimlar, problemOzeti } = problemData;
        
        let enforcementLevel = 'normal'; // normal, strict, flexible
        
        // Problem karmaşıklığını analiz et
        const complexity = this.analyzeProblemComplexity(problemData);
        
        if (complexity.isSimple && adimlar.length <= 2) {
            enforcementLevel = 'flexible'; // Basit problemlerde esnek
        } else if (complexity.isComplex || adimlar.length >= 4) {
            enforcementLevel = 'strict'; // Karmaşık problemlerde sıkı
        }
        
        // Öğrenci öğrenme puanına göre ayarla
        if (this.learningPath.learningScore < 70) {
            enforcementLevel = 'strict'; // Düşük puan = sıkı denetim
        }
        
        return enforcementLevel;
    }

    // Problem karmaşıklığını analiz et
    analyzeProblemComplexity(problemData) {
        const { adimlar, problemOzeti } = problemData;
        
        let complexityScore = 0;
        
        // Adım sayısı faktörü
        complexityScore += adimlar.length * 10;
        
        // Matematik operatörü analizi
        adimlar.forEach(step => {
            const latex = step.cozum_lateks || '';
            
            // Karmaşık operatörler
            if (latex.includes('\\frac')) complexityScore += 15;
            if (latex.includes('\\sqrt')) complexityScore += 10;
            if (latex.includes('^')) complexityScore += 5;
            if (latex.includes('\\int') || latex.includes('\\sum')) complexityScore += 25;
            if (latex.includes('sin') || latex.includes('cos') || latex.includes('tan')) complexityScore += 15;
            
            // Denklem sistemi
            if (latex.includes('=') && latex.split('=').length > 2) complexityScore += 20;
        });
        
        return {
            score: complexityScore,
            isSimple: complexityScore < 30,
            isComplex: complexityScore > 80,
            requiresStrictEnforcement: complexityScore > 60
        };
    }

    // Öğrenci davranışını takip et
    trackLearningBehavior(stepIndex, totalSteps, wasCorrect, wasFinalAnswer) {
        this.learningPath.totalProblemsAttempted++;
        
        if (wasFinalAnswer && (stepIndex + 1) / totalSteps < 0.7) {
            this.learningPath.earlyFinalAnswerCount++;
        }
        
        // Ortalama tamamlanan adım sayısını güncelle
        const completedSteps = stepIndex + 1;
        this.learningPath.averageStepsCompleted = 
            (this.learningPath.averageStepsCompleted + completedSteps) / 2;
        
        // Öğrenme puanını güncelle
        if (wasCorrect && !wasFinalAnswer) {
            // Normal adım çözümü ödüllendir
            this.learningPath.learningScore = Math.min(100, this.learningPath.learningScore + 2);
        }
    }

    // Öğrenci performans raporu
    getLearningReport() {
        const earlyAnswerRate = this.learningPath.totalProblemsAttempted > 0 ? 
            (this.learningPath.earlyFinalAnswerCount / this.learningPath.totalProblemsAttempted) * 100 : 0;
        
        let performance = 'excellent';
        if (earlyAnswerRate > 60) performance = 'needs_improvement';
        else if (earlyAnswerRate > 30) performance = 'good';
        
        return {
            learningScore: this.learningPath.learningScore,
            earlyAnswerRate: Math.round(earlyAnswerRate),
            averageStepsCompleted: Math.round(this.learningPath.averageStepsCompleted * 10) / 10,
            performance: performance,
            recommendation: this.getRecommendation(performance)
        };
    }

    // Öğrenme önerisi
    getRecommendation(performance) {
        const recommendations = {
            excellent: "Harika çalışıyorsunuz! Adım adım çözüm yaklaşımınız matematik anlayışınızı güçlendiriyor.",
            good: "İyi ilerliyorsunuz. Bazı adımları atlamaya çalışıyorsunuz, her adımı çözmeye odaklanın.",
            needs_improvement: "Matematik öğrenmek için adım adım çözüm çok önemli. Final cevapları erken vermeye çalışmak yerine süreci takip edin."
        };
        
        return recommendations[performance] || recommendations.needs_improvement;
    }



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
            
            // YENİ: Zorunluluk seviyesini hesapla
            const enforcementLevel = this.calculateEnforcementLevel(solutionData);
            
            // Zorunluluk kurallarını ayarla
            this.stepEnforcementRules.minStepsRequired = Math.max(2, this.guidanceData.totalSteps - 1);
            
            switch(enforcementLevel) {
                case 'flexible':
                    this.stepEnforcementRules.finalAnswerEarlyThreshold = 0.5; // %50'den sonra izin ver
                    this.stepEnforcementRules.maxConsecutiveFinalAnswers = 3;
                    break;
                case 'strict':
                    this.stepEnforcementRules.finalAnswerEarlyThreshold = 0.8; // %80'den sonra izin ver
                    this.stepEnforcementRules.maxConsecutiveFinalAnswers = 1;
                    break;
                default: // normal
                    this.stepEnforcementRules.finalAnswerEarlyThreshold = 0.7; // %70'den sonra izin ver
                    this.stepEnforcementRules.maxConsecutiveFinalAnswers = 2;
            }
            
            // Enforcement sistemini sıfırla
            this.resetEnforcement();
            
            console.log(`Rehberlik sistemi başlatıldı - Seviye: ${enforcementLevel}, Toplam adım: ${this.guidanceData.totalSteps}`);
            
            return this.guidanceData;
        } catch (error) {
            this.errorHandler.handleError(error, { 
                operation: 'initializeGuidance',
                fallbackMessage: 'Rehberlik sistemi başlatılamadı'
            });
            throw error;
        }
    }

    

    // Belirli bir adıma git
    goToStep(stepIndex) {
        if (stepIndex >= 0 && stepIndex < this.guidanceData.totalSteps) {
            this.currentStep = stepIndex;
            this.progressiveHints = [];
            return true;
        }
        return false;
    }

    // İpucu göster/gizle - Güncellenmiş versiyon
    toggleHint() {
        this.isHintVisible = !this.isHintVisible;
        this.isCanvasHintActive = this.isHintVisible;
        
        if (this.isHintVisible && !this.usedHints.has(this.currentStep)) {
            this.hintCount++;
            this.usedHints.add(this.currentStep);
        }
        
        return {
            isVisible: this.isHintVisible,
            isCanvasActive: this.isCanvasHintActive,
            hintCount: this.hintCount,
            stepHint: this.getCurrentStepHint()
        };
    }

    // Canvas hint durumunu sıfırla
    clearCanvasHint() {
        this.isCanvasHintActive = false;
        this.isHintVisible = false;
    }

    // Adım değiştiğinde hint'i sıfırla
    resetHintForCurrentStep() {
        this.isHintVisible = false;
        this.isCanvasHintActive = false;
    }

    // Mevcut adımın ipucunu al - Sadece sözel
    getCurrentStepHint() {
        if (!this.guidanceData || this.currentStep >= this.guidanceData.totalSteps) {
            return null;
        }
        
        const stepData = this.guidanceData.steps[this.currentStep];
        return {
            stepNumber: this.currentStep + 1,
            description: stepData.description, // Bu LaTeX içerebilir (çözüm için)
            hint: stepData.ipucu || 'Bu adımda dikkatli düşünün.', // Bu sadece sözel olmalı
            ipucu: stepData.ipucu || 'Bu adımda dikkatli düşünün.', // Ek erişim için
            correctAnswer: stepData.correctAnswer // Bu LaTeX içerebilir (API validasyon için)
        };
    }

        // Mevcut adımın deneme bilgilerini al
    getCurrentStepAttemptInfo() {
        const stepKey = this.currentStep;
        const attempts = this.attemptsPerStep.get(stepKey) || 0;
        const remaining = this.maxAttemptsPerStep - attempts;
        
        return {
            stepNumber: this.currentStep + 1,
            attempts: attempts,
            remaining: remaining,
            maxAttempts: this.maxAttemptsPerStep,
            canAttempt: remaining > 0,
            isFailed: this.stepFailed
        };
    }

    // Deneme sayısını artır
    incrementStepAttempt() {
        const stepKey = this.currentStep;
        const currentAttempts = this.attemptsPerStep.get(stepKey) || 0;
        const newAttempts = currentAttempts + 1;
        
        this.attemptsPerStep.set(stepKey, newAttempts);
        this.currentStepAttempts = newAttempts;
        
        // Son deneme miydi kontrol et
        if (newAttempts >= this.maxAttemptsPerStep) {
            this.stepFailed = true;
        }
        
        return {
            attempts: newAttempts,
            remaining: this.maxAttemptsPerStep - newAttempts,
            isFinalAttempt: newAttempts >= this.maxAttemptsPerStep
        };
    }

    // Adım başarılı olduğunda çağrılır
    markStepAsSuccess() {
        const stepKey = this.currentStep;
        // Bu adımı başarılı olarak işaretle, deneme sayısını koru
        this.stepFailed = false;
        return {
            stepNumber: this.currentStep + 1,
            attempts: this.attemptsPerStep.get(stepKey) || 1,
            success: true
        };
    }

    // Tüm sistemi sıfırla (3 deneme bittikten sonra)
    resetAllAttempts() {
        this.attemptsPerStep.clear();
        this.currentStepAttempts = 0;
        this.stepFailed = false;
        this.currentStep = 0;
        this.progressiveHints = [];
        
        // İpucu sistemini de sıfırla
        this.hintCount = 0;
        this.usedHints = new Set();
        this.isHintVisible = false;
        
        console.log('Tüm deneme sistemi sıfırlandı');
    }

    // Bir sonraki adıma geç (deneme sayısını sıfırla)
    proceedToNextStep() {
        if (this.currentStep < this.guidanceData.totalSteps - 1) {
            this.currentStep++;
            this.progressiveHints = [];
            this.resetHintForCurrentStep();
            
            // YENİ ADIM İÇİN DENEMELERİ SIFIRLA
            this.currentStepAttempts = 0;
            this.stepFailed = false;
            
            return true;
        }
        return false; // Son adıma ulaşıldı
    }

    // Mevcut adım başarısız durumda mı?
    isCurrentStepFailed() {
        return this.stepFailed;
    }

    // Genel istatistikler
    getAttemptStats() {
        let totalAttempts = 0;
        let completedSteps = 0;
        
        this.attemptsPerStep.forEach((attempts, stepIndex) => {
            totalAttempts += attempts;
            if (stepIndex < this.currentStep || (stepIndex === this.currentStep && !this.stepFailed)) {
                completedSteps++;
            }
        });
        
        return {
            totalAttempts,
            completedSteps,
            currentStep: this.currentStep + 1,
            totalSteps: this.guidanceData?.totalSteps || 0,
            averageAttemptsPerStep: completedSteps > 0 ? (totalAttempts / completedSteps).toFixed(1) : 0
        };
    }

    // İpucu sayısını al
    getHintStats() {
        return {
            totalHints: this.hintCount,
            usedSteps: Array.from(this.usedHints),
            currentStepUsedHint: this.usedHints.has(this.currentStep)
        };
    }

    // İpucuyu sıfırla (yeni adıma geçerken)
    resetHintForCurrentStep() {
        this.isHintVisible = false;
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

    // smartGuide.js'de güncellenmiş reset fonksiyonu

reset() {
    this.currentStep = 0;
    this.studentAttempts = [];
    this.guidanceData = null;
    this.progressiveHints = [];
    this.isProcessing = false;
    
    // İpucu verilerini sıfırla
    this.hintCount = 0;
    this.usedHints = new Set();
    this.isHintVisible = false;
    
    // Deneme verilerini sıfırla
    this.attemptsPerStep.clear();
    this.currentStepAttempts = 0;
    this.stepFailed = false;
    
    // YENİ: Zorunluluk verilerini sıfırla (ama öğrenme verilerini koru)
    this.resetEnforcement();
    
    console.log('SmartGuide sistemi tamamen sıfırlandı - yeni problem için hazır');
}

// Sadece enforcement verilerini sıfırla (öğrenme verilerini koruyarak)
resetEnforcement() {
    this.stepEnforcementRules.consecutiveFinalAnswers = 0;
    // learningPath verileri korunur - uzun vadeli öğrenme takibi için
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

    // smartGuide.js'de güncellenmiş evaluateStudentStep fonksiyonu

    async evaluateStudentStep(studentInput, inputType = 'text') {
        if (this.isProcessing) return;
        
        // Deneme hakkı kontrolü
        const attemptInfo = this.getCurrentStepAttemptInfo();
        if (!attemptInfo.canAttempt) {
            return {
                isCorrect: false,
                message: 'Bu adım için deneme hakkınız kalmadı.',
                hint: 'Tüm adımlar sıfırlanacak. Lütfen baştan başlayın.',
                shouldProceed: false,
                shouldReset: true,
                attempts: attemptInfo.attempts,
                remaining: 0
            };
        }
        
        this.isProcessing = true;
        
        try {
            // Deneme sayısını artır
            const attemptResult = this.incrementStepAttempt();
            
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
                timestamp: Date.now(),
                attemptNumber: attemptResult.attempts
            });

            // YENİ: Final cevap olup olmadığını kontrol et
            const finalAnswerCheck = await this.checkForFinalAnswer(studentInput, attemptResult.attempts, attemptResult.isFinalAttempt);
            
            // YENİ: Adım zorunluluğu kontrolü
            const enforcement = this.checkStepEnforcement(
                this.currentStep, 
                this.guidanceData.totalSteps, 
                studentInput, 
                finalAnswerCheck.isFinalAnswer
            );
            
            if (finalAnswerCheck.isFinalAnswer) {
                // Final cevap tespit edildi
                
                if (!enforcement.allowFinalAnswer) {
                    // Final cevap engellendi
                    return {
                        isCorrect: false,
                        message: enforcement.warningMessage,
                        hint: enforcement.educationalReason,
                        shouldProceed: false,
                        attempts: attemptResult.attempts,
                        remaining: attemptResult.remaining,
                        stepSkippingBlocked: true,
                        requiredStepsRemaining: enforcement.requiredStepsRemaining
                    };
                }
                
                if (finalAnswerCheck.isCorrect) {
                    // Final cevap doğru ama uyarı ile
                    
                    // Öğrenme davranışını takip et
                    this.trackLearningBehavior(this.currentStep, this.guidanceData.totalSteps, true, true);
                    
                    const response = {
                        isCorrect: true,
                        message: finalAnswerCheck.message,
                        hint: 'Tebrikler! Problemin final cevabını doğru verdiniz.',
                        shouldProceed: true,
                        shouldComplete: true,
                        attempts: attemptResult.attempts,
                        remaining: this.maxAttemptsPerStep - attemptResult.attempts,
                        stepCompleted: true,
                        finalAnswerGiven: true
                    };
                    
                    // Uyarı mesajı varsa ekle
                    if (enforcement.warningMessage) {
                        response.warningMessage = enforcement.warningMessage;
                        response.educationalNote = enforcement.educationalReason;
                    }
                    
                    return response;
                }
            }

            // Normal adım kontrolü (eğer final cevap değilse veya yanlışsa)
            const apiResult = await this.performDetailedApiValidation(
                studentInput, 
                currentStepData, 
                attemptResult.attempts,
                attemptResult.isFinalAttempt
            );
            
            if (apiResult.isCorrect) {
                // Normal adım başarılı
                const successInfo = this.markStepAsSuccess();
                
                // Öğrenme davranışını takip et
                this.trackLearningBehavior(this.currentStep, this.guidanceData.totalSteps, true, false);
                
                return {
                    ...apiResult,
                    shouldProceed: true,
                    attempts: successInfo.attempts,
                    remaining: this.maxAttemptsPerStep - successInfo.attempts,
                    stepCompleted: true
                };
            } else {
                // Yanlış - son deneme mi kontrol et
                
                // Öğrenme davranışını takip et
                this.trackLearningBehavior(this.currentStep, this.guidanceData.totalSteps, false, finalAnswerCheck.isFinalAnswer);
                
                if (attemptResult.isFinalAttempt) {
                    return {
                        ...apiResult,
                        shouldProceed: false,
                        shouldReset: true,
                        attempts: attemptResult.attempts,
                        remaining: 0,
                        finalAttempt: true,
                        message: apiResult.message + ' 3 deneme hakkınız da bitti. Sistem sıfırlanacak.'
                    };
                } else {
                    return {
                        ...apiResult,
                        shouldProceed: false,
                        attempts: attemptResult.attempts,
                        remaining: attemptResult.remaining,
                        canRetry: true
                    };
                }
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
                shouldProceed: false,
                attempts: this.getCurrentStepAttemptInfo().attempts,
                remaining: this.getCurrentStepAttemptInfo().remaining
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
    // Final cevap kontrolü metodu
    async checkForFinalAnswer(studentInput, attemptNumber, isFinalAttempt) {
        if (!this.guidanceData || !this.guidanceData.steps) {
            return { isFinalAnswer: false };
        }
        
        // Son adımın doğru cevabını al (genellikle problemin final cevabıdır)
        const lastStep = this.guidanceData.steps[this.guidanceData.steps.length - 1];
        const finalAnswer = lastStep?.correctAnswer;
        
        if (!finalAnswer) {
            return { isFinalAnswer: false };
        }
        
        const finalAnswerPrompt = `
        Öğrencinin verdiği cevabın problemin final cevabı olup olmadığını kontrol et:
        
        Problemin final doğru cevabı: ${finalAnswer}
        Öğrenci cevabı: ${studentInput}
        Mevcut adım: ${this.currentStep + 1}/${this.guidanceData.totalSteps}
        
        Yanıt formatı:
        {
            "isFinalAnswer": boolean,
            "isCorrect": boolean,
            "confidence": number (0-1),
            "message": "string - Açıklama mesajı"
        }
        
        KURALLAR:
        - Eğer öğrenci problemin final cevabını doğru verdiyse isFinalAnswer: true
        - Sadece ara adım cevabı verdiyse isFinalAnswer: false
        - Matematiksel eşdeğerliği kontrol et (örn: 1/2 = 0.5)
        - Türkçe yanıt ver
        `;

        try {
            if (typeof window.makeApiCall !== 'function') {
                // Fallback: Basit string karşılaştırması
                const similarity = this.calculateSimilarity(studentInput, finalAnswer);
                return {
                    isFinalAnswer: similarity > 0.8,
                    isCorrect: similarity > 0.8,
                    confidence: similarity,
                    message: similarity > 0.8 ? 
                        'Final cevabı doğru verdiniz!' : 
                        'Bu ara adım cevabı gibi görünüyor.'
                };
            }
            
            const response = await window.makeApiCall({
                contents: [{
                    role: "user",
                    parts: [{ text: finalAnswerPrompt }]
                }]
            });

            if (response && response.isFinalAnswer !== undefined) {
                return {
                    isFinalAnswer: response.isFinalAnswer && response.isCorrect,
                    isCorrect: response.isCorrect,
                    confidence: response.confidence || 0,
                    message: response.message || 'Final cevap kontrolü tamamlandı'
                };
            } else {
                // Fallback
                const similarity = this.calculateSimilarity(studentInput, finalAnswer);
                return {
                    isFinalAnswer: similarity > 0.8,
                    isCorrect: similarity > 0.8,
                    confidence: similarity,
                    message: similarity > 0.8 ? 
                        'Final cevabı doğru verdiniz!' : 
                        'Bu ara adım cevabı gibi görünüyor.'
                };
            }
            
        } catch (error) {
            console.warn('Final cevap kontrolü başarısız, fallback kullanılıyor:', error);
            
            // Fallback: Basit karşılaştırma
            const similarity = this.calculateSimilarity(studentInput, finalAnswer);
            return {
                isFinalAnswer: similarity > 0.8,
                isCorrect: similarity > 0.8,
                confidence: similarity,
                message: similarity > 0.8 ? 
                    'Final cevabı doğru verdiniz!' : 
                    'Bu ara adım cevabı gibi görünüyor.'
            };
        }
    }

    // Tüm problemi tamamla (final cevap verildiğinde)
    completeProblem() {
        // Kalan tüm adımları başarılı olarak işaretle
        for (let i = this.currentStep; i < this.guidanceData.totalSteps; i++) {
            if (!this.attemptsPerStep.has(i)) {
                this.attemptsPerStep.set(i, 1); // 1 deneme ile tamamlandı
            }
        }
        
        // Son adıma geç
        this.currentStep = this.guidanceData.totalSteps - 1;
        this.stepFailed = false;
        
        return {
            totalStepsCompleted: this.guidanceData.totalSteps,
            currentStep: this.currentStep + 1,
            completedByFinalAnswer: true
        };
    }

    // Detaylı API validasyonu - Kısa ve sözel feedback için optimize edilmiş
    async performDetailedApiValidation(studentInput, stepData, attemptNumber, isFinalAttempt) {
        const validationPrompt = `
        Öğrencinin matematik adımını kısaca değerlendir ve JSON formatında yanıt ver:
        
        Beklenen çözüm: ${stepData.correctAnswer}
        Öğrenci cevabı: ${studentInput}
        Adım açıklaması: ${stepData.description}
        Deneme sayısı: ${attemptNumber}/3
        Son deneme: ${isFinalAttempt ? 'Evet' : 'Hayır'}
        
        Yanıt formatı:
        {
            "isCorrect": boolean,
            "feedback": "string - KISA ve sözel geri bildirim (maksimum 2 cümle)",
            "errorType": "string or null - Hata türü",
            "improvement": "string - Kısa öneri (maksimum 1 cümle)",
            "encouragement": "string - Kısa teşvik mesajı (maksimum 1 cümle)"
        }
        
        ÖNEMLI KURALLAR:
        - SADECE SÖZEL açıklama yap, LaTeX veya matematik sembolleri KULLANMA
        - Çok kısa ve net ol, uzun açıklamalar yapma
        - Ne yapması gerektiğini söyle, işlem gösterme
        - Konu hatırlatması yap, formül verme
        - Öğrenciyi cesaretlendir ama kısa tut
        - Türkçe yanıt ver
        
        Örnek doğru yanıt:
        {
            "isCorrect": false,
            "feedback": "Bu adımda toplama işlemini yanlış yaptınız. Ondalıklı sayılarla toplama yaparken virgül hizalaması önemlidir.",
            "errorType": "calculation_error",
            "improvement": "Virgülleri alt alta getirerek tekrar toplayın.",
            "encouragement": "Dikkatli olursanız yapabilirsiniz!"
        }
        `;

        try {
            if (typeof window.makeApiCall !== 'function') {
                console.warn('makeApiCall fonksiyonu tanımlı değil, fallback kullanılıyor');
                return this.generateFallbackValidation(studentInput, stepData, attemptNumber, isFinalAttempt);
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
                    hint: response.improvement || 'Tekrar deneyin',
                    errorType: response.errorType,
                    encouragement: response.encouragement,
                    accuracy: response.accuracy || 0
                };
            } else {
                return this.generateFallbackValidation(studentInput, stepData, attemptNumber, isFinalAttempt);
            }
            
        } catch (error) {
            console.warn('API validasyonu başarısız, fallback kullanılıyor:', error);
            return this.generateFallbackValidation(studentInput, stepData, attemptNumber, isFinalAttempt);
        }
    }

    // Fallback validasyon - Kısa versiyonu
    generateFallbackValidation(studentInput, stepData, attemptNumber, isFinalAttempt) {
        const similarity = this.calculateSimilarity(studentInput, stepData.correctAnswer);
        
        if (similarity > 0.7) {
            return {
                isCorrect: true,
                message: 'Bu adım doğru görünüyor!',
                hint: 'Bir sonraki adıma geçebilirsiniz',
                accuracy: similarity,
                encouragement: 'Harika çalışma!'
            };
        } else {
            const remainingAttempts = 3 - attemptNumber;
            return {
                isCorrect: false,
                message: `Bu adımda bir hata var. Lütfen hesabınızı kontrol edin.`,
                hint: isFinalAttempt ? 
                    'Bu konuyu tekrar gözden geçirmenizi öneririm.' : 
                    'Daha dikkatli hesap yapın.',
                accuracy: similarity,
                errorType: 'general_error',
                encouragement: remainingAttempts > 0 ? 'Tekrar deneyin!' : 'Öğrenme sürecinin parçası.'
            };
        }
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

    

    // Bir sonraki adıma geç
    proceedToNextStep() {
        if (this.currentStep < this.guidanceData.totalSteps - 1) {
            this.currentStep++;
            this.progressiveHints = [];
            this.resetHintForCurrentStep(); // İpucuyu sıfırla
            return true;
        }
        return false; // Son adıma ulaşıldı
    }

    // Önceki adıma geç
goToPreviousStep() {
    if (this.currentStep > 0) {
        this.currentStep--;
        this.progressiveHints = [];
        this.resetHintForCurrentStep(); // İpucuyu sıfırla
        return true;
    }
    return false; // İlk adımda
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