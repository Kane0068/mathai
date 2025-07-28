// =================================================================================
//  İnteraktif Çözüm Sistemi - Düzeltilmiş Versiyon
//  Sorun 1: İkinci adımda seçenekler görünmeme sorunu düzeltildi
//  Sorun 2: AI Çeldirici etiketleri kaldırıldı
// =================================================================================

// 1. interactiveSolutionManager.js'de değişiklik gerekli:

export class ImprovedInteractiveSolutionManager {
    constructor() {
        this.solutionData = null;
        this.currentStep = 0;
        this.totalSteps = 0;
        this.isProcessing = false;
        
        // Deneme sistemi
        this.totalAttempts = 0;
        this.maxAttempts = 3;
        this.attemptHistory = [];
        this.completedSteps = [];
        this.startTime = null;
        this.isCompleted = false;
        
        // API üretimi çeldiriciler için cache
        this.distractorCache = new Map();
        this.currentOptions = []; // EKLEME: Mevcut seçenekleri saklamak için
    }

    // API'den çeldiriciler oluştur (değişiklik yok)
    async generateDistractorsForStep(stepIndex, correctAnswer, stepDescription) {
        const cacheKey = `${stepIndex}-${correctAnswer}`;
        
        if (this.distractorCache.has(cacheKey)) {
            return this.distractorCache.get(cacheKey);
        }
        
        const prompt = `
        Matematik probleminin ${stepIndex + 1}. adımı için gerçekçi çeldiriciler oluştur.
        
        DOĞRU CEVAP: ${correctAnswer}
        ADIM AÇIKLAMASI: ${stepDescription}
        ADIM NUMARASI: ${stepIndex + 1}
        
        Aşağıdaki JSON formatında yanıt ver:
        {
            "distractors": [
                {
                    "text": "Çeldirici seçenek açıklaması (kısa ve net)",
                    "latex": "$$çeldirici_matematik_ifadesi$$",
                    "reasoning": "Bu çeldiricinin neden yanıltıcı olduğu",
                    "commonMistake": "Hangi yaygın hatayı temsil ettiği"
                },
                {
                    "text": "İkinci çeldirici açıklama", 
                    "latex": "$$ikinci_çeldirici_ifade$$",
                    "reasoning": "İkinci çeldiricinin mantığı",
                    "commonMistake": "İkinci yaygın hata türü"
                }
            ]
        }
        
        SADECE JSON FORMATINDA YANIT VER, BAŞKA METİN EKLEME.
        `;
        
        try {
            if (typeof window.makeApiCall !== 'function') {
                console.warn('makeApiCall bulunamadı, fallback çeldiriciler kullanılıyor');
                return this.generateFallbackDistractors(correctAnswer, stepIndex);
            }
            
            const response = await window.makeApiCall({
                contents: [{
                    role: "user",
                    parts: [{ text: prompt }]
                }]
            });
            
            if (response && response.distractors && Array.isArray(response.distractors)) {
                this.distractorCache.set(cacheKey, response.distractors);
                return response.distractors;
            } else {
                console.warn('API yanıtı geçersiz, fallback kullanılıyor');
                return this.generateFallbackDistractors(correctAnswer, stepIndex);
            }
            
        } catch (error) {
            console.error('Çeldirici API hatası:', error);
            return this.generateFallbackDistractors(correctAnswer, stepIndex);
        }
    }

    // Fallback çeldiriciler (aynı)
    generateFallbackDistractors(correctAnswer, stepIndex) {
        const distractors = [];
        
        if (correctAnswer.includes('=')) {
            const parts = correctAnswer.split('=');
            if (parts.length === 2) {
                const rightSide = parts[1].trim();
                const numberMatch = rightSide.match(/(-?\d+(?:\.\d+)?)/);
                if (numberMatch) {
                    const num = parseFloat(numberMatch[1]);
                    
                    distractors.push({
                        text: "İşaret hatası yapılmış sonuç",
                        latex: correctAnswer.replace(numberMatch[1], (-num).toString()),
                        reasoning: "İşaret hatası",
                        commonMistake: "Negatif/pozitif karışıklığı"
                    });
                    
                    distractors.push({
                        text: "Hesaplama hatası yapılmış sonuç", 
                        latex: correctAnswer.replace(numberMatch[1], (num + Math.floor(Math.random() * 5) + 1).toString()),
                        reasoning: "Aritmetik hata",
                        commonMistake: "Temel işlem hatası"
                    });
                }
            }
        }
        
        while (distractors.length < 2) {
            distractors.push({
                text: `${stepIndex + 1}. adım için alternatif çözüm`,
                latex: "$$\\text{Hesaplama hatası}$$",
                reasoning: "Genel hesap hatası",
                commonMistake: "Yanlış yöntem"
            });
        }
        
        return distractors.slice(0, 2);
    }
    
    // DÜZELTİLDİ: Adım seçenekleri oluşturma
    async generateStepOptions(stepIndex) {
        console.log(`generateStepOptions çağrıldı - stepIndex: ${stepIndex}, totalSteps: ${this.totalSteps}`);
        
        if (!this.solutionData || stepIndex >= this.totalSteps) {
            console.error('generateStepOptions: Geçersiz veri', { stepIndex, totalSteps: this.totalSteps, hasSolutionData: !!this.solutionData });
            return null;
        }
        
        const currentStepData = this.solutionData.adimlar[stepIndex];
        console.log(`generateStepOptions: Step ${stepIndex} data:`, currentStepData);
        
        // Doğru cevap seçeneği
        const correctOption = {
            id: 0,
            text: currentStepData.adimAciklamasi || `Adım ${stepIndex + 1}`,
            latex: currentStepData.cozum_lateks || '',
            isCorrect: true,
            explanation: "Bu doğru çözüm adımıdır.",
            displayId: 0 // EKLEME: displayId'yi başlangıçta ayarla
        };
        
        try {
            // API'den çeldiriciler al
            console.log('API\'den çeldiriciler alınıyor...');
            const apiDistractors = await this.generateDistractorsForStep(
                stepIndex, 
                currentStepData.cozum_lateks,
                currentStepData.adimAciklamasi
            );
            
            const options = [correctOption];
            
            // API çeldiricilerini ekle
            apiDistractors.forEach((distractor, index) => {
                options.push({
                    id: index + 1,
                    text: distractor.text || `Yanlış seçenek ${index + 1}`,
                    latex: distractor.latex || '',
                    isCorrect: false,
                    explanation: distractor.reasoning || "Bu yanlış bir çözüm adımıdır.",
                    commonMistake: distractor.commonMistake || "Genel hata",
                    apiGenerated: true,
                    displayId: index + 1 // EKLEME: displayId'yi başlangıçta ayarla
                });
            });
            
            // Seçenekleri karıştır
            this.currentOptions = this.shuffleOptions(options);
            console.log('generateStepOptions: Oluşturulan seçenekler:', this.currentOptions);
            
            const result = {
                stepNumber: stepIndex + 1,
                totalSteps: this.totalSteps,
                stepDescription: currentStepData.adimAciklamasi || `Adım ${stepIndex + 1}`,
                options: this.currentOptions,
                attempts: this.totalAttempts,
                maxAttempts: this.maxAttempts,
                remainingAttempts: this.maxAttempts - this.totalAttempts
            };
            
            console.log('generateStepOptions: Final result:', result);
            return result;
            
        } catch (error) {
            console.error('generateStepOptions API hatası:', error);
            
            // Fallback: Basit seçeneklerle devam et
            const fallbackOptions = [
                correctOption,
                {
                    id: 1,
                    text: "Alternatif yöntem (yanlış)",
                    latex: currentStepData.cozum_lateks || "$$\\text{Hesap hatası}$$",
                    isCorrect: false,
                    explanation: "Bu yaklaşım doğru değildir.",
                    displayId: 1
                },
                {
                    id: 2,
                    text: "Farklı hesaplama (yanlış)",
                    latex: "$$\\text{İşlem sırası hatası}$$",
                    isCorrect: false,
                    explanation: "İşlem sırası yanlış uygulanmıştır.",
                    displayId: 2
                }
            ];
            
            this.currentOptions = this.shuffleOptions(fallbackOptions);
            
            return {
                stepNumber: stepIndex + 1,
                totalSteps: this.totalSteps,
                stepDescription: currentStepData.adimAciklamasi || `Adım ${stepIndex + 1}`,
                options: this.currentOptions,
                attempts: this.totalAttempts,
                maxAttempts: this.maxAttempts,
                remainingAttempts: this.maxAttempts - this.totalAttempts,
                fallbackMode: true
            };
        }
    }
    
    // DÜZELTİLDİ: Seçenek değerlendirme
    evaluateSelection(selectedOptionId) {
        console.log(`evaluateSelection çağrıldı - selectedOptionId: ${selectedOptionId}`);
        console.log('Mevcut seçenekler:', this.currentOptions);
        
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
        console.log('Seçilen seçenek:', selectedOption);
        
        if (!selectedOption) {
            this.isProcessing = false;
            console.error('Seçenek bulunamadı:', selectedOptionId, this.currentOptions);
            return { error: "Geçersiz seçenek" };
        }
        
        // Deneme sayısını artır (sadece yanlış cevaplarda)
        let newAttemptCount = this.totalAttempts;
        if (!selectedOption.isCorrect) {
            newAttemptCount = this.totalAttempts + 1;
            this.totalAttempts = newAttemptCount;
        }
        
        const result = {
            isCorrect: selectedOption.isCorrect,
            explanation: selectedOption.explanation,
            selectedOption: selectedOption,
            correctOption: this.currentOptions.find(opt => opt.isCorrect),
            attempts: newAttemptCount,
            remainingAttempts: this.maxAttempts - newAttemptCount,
            currentStep: this.currentStep + 1,
            totalSteps: this.totalSteps
        };
        
        // API üretimi çeldirici için detaylı feedback (ama UI'da göstermeyeceğiz)
        if (!selectedOption.isCorrect && selectedOption.apiGenerated) {
            result.detailedFeedback = {
                commonMistake: selectedOption.commonMistake,
                apiGenerated: true,
                learningNote: `Bu hata türü: "${selectedOption.commonMistake}" - Yaygın bir hata!`
            };
        }
        
        if (selectedOption.isCorrect) {
            // Doğru cevap - ilerleme
            this.completedSteps.push({
                stepIndex: this.currentStep,
                completedAt: Date.now(),
                usedAttempt: false
            });
            
            console.log(`Doğru cevap! Adım ${this.currentStep} tamamlandı. Sonraki adım: ${this.currentStep + 1}`);
            this.currentStep++;
            
            if (this.currentStep >= this.totalSteps) {
                this.isCompleted = true;
                result.isCompleted = true;
                result.completionStats = this.getCompletionStats();
                console.log('Tüm adımlar tamamlandı!');
            } else {
                // DÜZELTME: Sonraki adımı hemen hazırla
                console.log(`Sonraki adım (${this.currentStep}) hazırlanıyor...`);
                result.nextStepPromise = this.generateStepOptions(this.currentStep);
            }
            
        } else {
            // Yanlış cevap işlemi
            console.log(`Yanlış cevap! Mevcut adım: ${this.currentStep}, Toplam deneme: ${newAttemptCount}`);
            
            if (this.currentStep === 0) {
                result.restartCurrentStep = true;
                result.message = "İlk adımda hata yaptınız. Bu adımı tekrar çözmeniz gerekiyor.";
                // İlk adımı tekrar hazırla
                result.nextStepPromise = this.generateStepOptions(this.currentStep);
            } else {
                this.currentStep = 0;
                result.restartFromBeginning = true;
                result.message = `Adım ${this.currentStep + 1}'de hata yaptınız. Baştan başlayacaksınız.`;
                // İlk adımdan başla
                result.nextStepPromise = this.generateStepOptions(this.currentStep);
            }
            
            if (newAttemptCount >= this.maxAttempts) {
                result.shouldResetToSetup = true;
                result.message = "Tüm deneme haklarınız bitti. Ana menüye dönüyorsunuz.";
            }
        }
        
        this.isProcessing = false;
        console.log('evaluateSelection sonucu:', result);
        return result;
    }
    
    // DİĞER METODLAR (değişiklik yok)
    shuffleOptions(options) {
        const shuffled = [...options];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        // DÜZELTME: displayId'yi shuffle sonrası tekrar ayarla
        return shuffled.map((option, index) => ({ ...option, displayId: index }));
    }
    
    initializeInteractiveSolution(solutionData) {
        if (!solutionData) {
            throw new Error('Çözüm verisi bulunamadı');
        }
        
        this.solutionData = solutionData;
        this.totalSteps = solutionData.adimlar.length;
        this.currentStep = 0;
        this.totalAttempts = 0;
        this.maxAttempts = Math.max(3, this.totalSteps);
        this.attemptHistory = [];
        this.completedSteps = [];
        this.startTime = Date.now();
        this.isCompleted = false;
        this.currentOptions = []; // EKLEME: Seçenekleri sıfırla
        
        console.log(`İnteraktif çözüm başlatıldı - ${this.totalSteps} adım, ${this.maxAttempts} deneme hakkı`);
        
        return {
            totalSteps: this.totalSteps,
            maxAttempts: this.maxAttempts,
            currentStep: this.currentStep + 1
        };
    }
    
    // Reset metodunda da currentOptions'ı sıfırla
    reset() {
        this.currentStep = 0;
        this.totalAttempts = 0;
        this.attemptHistory = [];
        this.completedSteps = [];
        this.solutionData = null;
        this.currentOptions = []; // EKLEME
        this.startTime = null;
        this.isCompleted = false;
        this.isProcessing = false;
        
        console.log('İnteraktif çözüm sistemi sıfırlandı');
    }
    
    // Diğer metodlar aynı...
    getCompletionStats() {
        const endTime = Date.now();
        const totalTime = endTime - this.startTime;
        
        const wrongAttempts = this.attemptHistory.filter(attempt => !attempt.wasCorrect).length;
        const correctAttempts = this.attemptHistory.filter(attempt => attempt.wasCorrect).length;
        
        return {
            totalSteps: this.totalSteps,
            completedSteps: this.completedSteps.length,
            totalAttempts: this.totalAttempts,
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
    
    getCurrentState() {
        return {
            currentStep: this.currentStep + 1,
            totalSteps: this.totalSteps,
            attempts: this.totalAttempts,
            maxAttempts: this.maxAttempts,
            remainingAttempts: this.maxAttempts - this.totalAttempts,
            isCompleted: this.isCompleted,
            completedSteps: this.completedSteps.length,
            canContinue: this.totalAttempts < this.maxAttempts && !this.isCompleted
        };
    }
    
    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        }
        return `${remainingSeconds}s`;
    }
    
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
}

export const improvedInteractiveSolutionManager = new ImprovedInteractiveSolutionManager();
