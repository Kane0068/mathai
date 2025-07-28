// =================================================================================
//  İnteraktif Çözüm Yöneticisi - Düzeltilmiş Versiyon
//  Deneme hakkı sadece yanlış cevaplarda azalır
// =================================================================================

export class InteractiveSolutionManager {
    constructor() {
        this.solutionData = null;
        this.currentStep = 0;
        this.totalSteps = 0;
        this.isProcessing = false;
        
        // Deneme sistemi - DÜZELTME: Sadece yanlış cevaplarda azalır
        this.totalAttempts = 0;
        this.maxAttempts = 3; // Minimum 3 hak
        this.attemptHistory = []; // Hangi adımda hangi deneme yapıldığını takip
        
        // Seçenek sistemi
        this.currentOptions = [];
        this.selectedOption = null;
        
        // Sonuç takibi
        this.completedSteps = [];
        this.startTime = null;
        this.isCompleted = false;
    }
    
    // İnteraktif çözümü başlat
    initializeInteractiveSolution(solutionData) {
        if (!solutionData || !solutionData.adimlar || !Array.isArray(solutionData.adimlar)) {
            throw new Error('Geçersiz çözüm verisi');
        }
        
        this.solutionData = solutionData;
        this.totalSteps = solutionData.adimlar.length;
        this.currentStep = 0;
        this.isCompleted = false;
        
        // Deneme hakkını hesapla: minimum 3, maksimum adım sayısı
        this.maxAttempts = Math.max(3, this.totalSteps);
        this.totalAttempts = 0;
        this.attemptHistory = [];
        this.completedSteps = [];
        
        this.startTime = Date.now();
        
        console.log(`İnteraktif çözüm başlatıldı - ${this.totalSteps} adım, ${this.maxAttempts} deneme hakkı`);
        
        return {
            totalSteps: this.totalSteps,
            maxAttempts: this.maxAttempts,
            currentStep: this.currentStep + 1
        };
    }
    
    // Mevcut adım için seçenekleri oluştur
    generateStepOptions(stepIndex) {
        if (!this.solutionData || stepIndex >= this.totalSteps) {
            return null;
        }
        
        const currentStepData = this.solutionData.adimlar[stepIndex];
        const options = [];
        
        // Doğru cevap
        const correctOption = {
            id: 0,
            text: currentStepData.adimAciklamasi || `Adım ${stepIndex + 1}`,
            latex: currentStepData.cozum_lateks || '',
            isCorrect: true,
            explanation: "Bu doğru çözüm adımıdır."
        };
        options.push(correctOption);
        
        // Yanlış seçenekler - mevcut yanlış seçenekleri kullan
        const wrongOptions = currentStepData.yanlisSecenekler || [];
        
        wrongOptions.slice(0, 2).forEach((wrongOption, index) => {
            options.push({
                id: index + 1,
                text: wrongOption.metin || `Yanlış seçenek ${index + 1}`,
                latex: wrongOption.latex || '',
                isCorrect: false,
                explanation: wrongOption.yanlisGeriBildirimi || "Bu yanlış bir çözüm adımıdır."
            });
        });
        
        // Eğer yeterli yanlış seçenek yoksa, otomatik oluştur
        while (options.length < 3) {
            const fallbackOption = this.generateFallbackWrongOption(currentStepData, options.length);
            options.push(fallbackOption);
        }
        
        // Seçenekleri karıştır
        this.currentOptions = this.shuffleOptions(options);
        
        return {
            stepNumber: stepIndex + 1,
            totalSteps: this.totalSteps,
            stepDescription: currentStepData.adimAciklamasi || `Adım ${stepIndex + 1}`,
            options: this.currentOptions,
            attempts: this.totalAttempts,
            maxAttempts: this.maxAttempts,
            remainingAttempts: this.maxAttempts - this.totalAttempts
        };
    }
    
    // Seçenek değerlendirme - DÜZELTME: Deneme hakkı sadece yanlış cevaplarda azalır
    evaluateSelection(selectedOptionId) {
        if (this.isProcessing || this.isCompleted) {
            return { error: "İşlem zaten devam ediyor veya tamamlandı" };
        }
        
        if (this.totalAttempts >= this.maxAttempts) {
            return { 
                error: "Tüm deneme haklarınız bitti",
                shouldResetToSetup: true
            };
        }
        
        this.isProcessing = true;
        
        // Seçilen seçeneği bul
        const selectedOption = this.currentOptions.find(opt => opt.displayId === selectedOptionId);
        
        if (!selectedOption) {
            this.isProcessing = false;
            return { error: "Geçersiz seçenek" };
        }
        
        // DÜZELTME: Sadece yanlış cevaplarda deneme sayısını artır
        let newAttemptCount = this.totalAttempts;
        if (!selectedOption.isCorrect) {
            newAttemptCount = this.totalAttempts + 1;
            this.totalAttempts = newAttemptCount;
            
            // Deneme geçmişine ekle (sadece yanlış cevaplar için)
            this.attemptHistory.push({
                step: this.currentStep,
                attempt: newAttemptCount,
                selectedOption: selectedOptionId,
                timestamp: Date.now(),
                wasCorrect: false
            });
        } else {
            // Doğru cevap için deneme geçmişine ekle ama sayacı artırma
            this.attemptHistory.push({
                step: this.currentStep,
                selectedOption: selectedOptionId,
                timestamp: Date.now(),
                wasCorrect: true,
                noAttemptUsed: true // Bu başarılı için deneme kullanılmadığını belirt
            });
        }
        
        const result = {
            isCorrect: selectedOption.isCorrect,
            explanation: selectedOption.explanation,
            selectedOption: selectedOption,
            correctOption: this.currentOptions.find(opt => opt.isCorrect),
            attempts: newAttemptCount, // Güncel deneme sayısı
            remainingAttempts: this.maxAttempts - newAttemptCount,
            currentStep: this.currentStep + 1,
            totalSteps: this.totalSteps
        };
        
        if (selectedOption.isCorrect) {
            // Doğru cevap
            this.completedSteps.push({
                stepIndex: this.currentStep,
                completedAt: Date.now(),
                usedAttempt: false // Doğru cevap için deneme kullanılmadı
            });
            
            // Sonraki adıma geç
            this.currentStep++;
            
            if (this.currentStep >= this.totalSteps) {
                // Tüm adımlar tamamlandı
                this.isCompleted = true;
                result.isCompleted = true;
                result.completionStats = this.getCompletionStats();
            } else {
                result.nextStep = this.generateStepOptions(this.currentStep);
            }
            
        } else {
            // Yanlış cevap
            if (this.currentStep === 0) {
                // İlk adımda yanlış - adımı tekrarla
                result.restartCurrentStep = true;
                result.message = "İlk adımda hata yaptınız. Bu adımı tekrar çözmeniz gerekiyor.";
            } else {
                // Diğer adımlarda yanlış - başa dön
                this.currentStep = 0;
                result.restartFromBeginning = true;
                result.message = `Adım ${this.currentStep + 1}'de hata yaptınız. Baştan başlayacaksınız.`;
                result.nextStep = this.generateStepOptions(this.currentStep);
            }
            
            // Deneme hakkı kontrolü
            if (newAttemptCount >= this.maxAttempts) {
                result.shouldResetToSetup = true;
                result.message = "Tüm deneme haklarınız bitti. Ana menüye dönüyorsunuz.";
            }
        }
        
        this.isProcessing = false;
        return result;
    }
    
    // Tamamlanma istatistikleri - DÜZELTME: Doğru deneme hesaplaması
    getCompletionStats() {
        const endTime = Date.now();
        const totalTime = endTime - this.startTime;
        
        // Sadece yanlış cevapların deneme sayısını hesapla
        const wrongAttempts = this.attemptHistory.filter(attempt => !attempt.wasCorrect).length;
        const correctAttempts = this.attemptHistory.filter(attempt => attempt.wasCorrect).length;
        
        return {
            totalSteps: this.totalSteps,
            completedSteps: this.completedSteps.length,
            totalAttempts: this.totalAttempts, // Bu sadece yanlış cevaplar
            wrongAttempts: wrongAttempts,
            correctAttempts: correctAttempts,
            maxAttempts: this.maxAttempts,
            successRate: this.totalSteps > 0 ? (this.totalSteps / (this.totalSteps + wrongAttempts)) * 100 : 0,
            totalTimeMs: totalTime,
            totalTimeFormatted: this.formatTime(totalTime),
            averageTimePerStep: this.completedSteps.length > 0 ? totalTime / this.completedSteps.length : 0,
            performance: this.calculatePerformance()
        };
    }
    
    // Performans hesaplama - DÜZELTME: Doğru hesaplama
    calculatePerformance() {
        const wrongAttempts = this.attemptHistory.filter(attempt => !attempt.wasCorrect).length;
        const totalInteractions = this.attemptHistory.length;
        
        if (totalInteractions === 0) return 'excellent';
        
        const successRate = ((totalInteractions - wrongAttempts) / totalInteractions) * 100;
        const efficiencyRate = this.maxAttempts > 0 ? ((this.maxAttempts - wrongAttempts) / this.maxAttempts) * 100 : 0;
        
        if (successRate >= 90 && efficiencyRate >= 80) return 'excellent';
        if (successRate >= 70 && efficiencyRate >= 60) return 'good';
        if (successRate >= 50) return 'average';
        return 'needs_improvement';
    }
    
    // Zamanı formatla
    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        }
        return `${remainingSeconds}s`;
    }
    
    // Mevcut durumu al - DÜZELTME: Doğru deneme bilgisi
    getCurrentState() {
        return {
            currentStep: this.currentStep + 1,
            totalSteps: this.totalSteps,
            attempts: this.totalAttempts, // Sadece yanlış cevaplar
            maxAttempts: this.maxAttempts,
            remainingAttempts: this.maxAttempts - this.totalAttempts,
            isCompleted: this.isCompleted,
            completedSteps: this.completedSteps.length,
            canContinue: this.totalAttempts < this.maxAttempts && !this.isCompleted
        };
    }
    
    // Sistemi sıfırla
    reset() {
        this.solutionData = null;
        this.currentStep = 0;
        this.totalSteps = 0;
        this.totalAttempts = 0;
        this.maxAttempts = 3;
        this.attemptHistory = [];
        this.completedSteps = [];
        this.currentOptions = [];
        this.selectedOption = null;
        this.startTime = null;
        this.isCompleted = false;
        this.isProcessing = false;
        
        console.log('İnteraktif çözüm sistemi sıfırlandı');
    }
    
    // Yedek yanlış seçenek oluştur
    generateFallbackWrongOption(stepData, optionIndex) {
        const fallbackOptions = [
            {
                id: optionIndex,
                text: "Bu adımda farklı bir yaklaşım kullanmalıyız",
                latex: "",
                isCorrect: false,
                explanation: "Bu yaklaşım bu adım için uygun değildir."
            },
            {
                id: optionIndex,
                text: "Önceki adımın sonucunu yanlış kullanmak",
                latex: "",
                isCorrect: false,
                explanation: "Önceki adımın sonucu doğru şekilde kullanılmamıştır."
            },
            {
                id: optionIndex,
                text: "İşlem sırasını yanlış uygulamak",
                latex: "",
                isCorrect: false,
                explanation: "Matematik işlem sırası doğru uygulanmamıştır."
            }
        ];
        
        const randomIndex = Math.floor(Math.random() * fallbackOptions.length);
        return fallbackOptions[randomIndex];
    }
    
    // Seçenekleri karıştır
    shuffleOptions(options) {
        const shuffled = [...options];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled.map((option, index) => ({ ...option, displayId: index }));
    }
    
    // İpucu al (opsiyonel özellik)
    getHint(stepIndex = this.currentStep) {
        if (!this.solutionData || stepIndex >= this.totalSteps) {
            return null;
        }
        
        const stepData = this.solutionData.adimlar[stepIndex];
        return {
            hint: stepData.ipucu || "Bu adımda dikkatli düşünün.",
            stepDescription: stepData.adimAciklamasi || `Adım ${stepIndex + 1}`
        };
    }
}

// Singleton export
export const interactiveSolutionManager = new InteractiveSolutionManager();