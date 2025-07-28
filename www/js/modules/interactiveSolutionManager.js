// =================================================================================
//  İnteraktif Çözüm Yöneticisi - TAMAMEN DÜZELTİLMİŞ VERSİYON
//  Ana Sorunlar ve Çözümler:
//  1. Sonsuz döngü sorunu çözüldü
//  2. displayId mantığı düzeltildi  
//  3. Async/await sorunları giderildi
//  4. DOM render güvenliği artırıldı
// =================================================================================

export class InteractiveSolutionManager {
    constructor() {
        this.solutionData = null;
        this.currentStep = 0;
        this.totalSteps = 0;
        this.isProcessing = false;
        
        // Deneme sistemi - SABIT KALACAK
        this.totalAttempts = 0;
        this.maxAttempts = 3;
        this.attemptHistory = [];
        
        // Seçenek sistemi - DÜZELTİLDİ
        this.currentOptions = [];
        this.selectedOption = null;
        
        // Sonuç takibi
        this.completedSteps = [];
        this.startTime = null;
        this.isCompleted = false;
        
        console.log('✅ InteractiveSolutionManager başlatıldı');
    }
    
    // İnteraktif çözümü başlat - GÜVENLİ VERSİYON
    initializeInteractiveSolution(solutionData) {
        try {
            console.log('🔄 İnteraktif çözüm başlatılıyor...', solutionData);
            
            if (!solutionData || !solutionData.adimlar || !Array.isArray(solutionData.adimlar)) {
                throw new Error('Geçersiz çözüm verisi: adimlar dizisi bulunamadı');
            }
            
            if (solutionData.adimlar.length === 0) {
                throw new Error('Çözüm adımları boş');
            }
            
            // Sistem durumunu sıfırla
            this.reset();
            
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
            
            console.log(`✅ İnteraktif çözüm başlatıldı - ${this.totalSteps} adım, ${this.maxAttempts} deneme hakkı`);
            
            return {
                totalSteps: this.totalSteps,
                maxAttempts: this.maxAttempts,
                currentStep: this.currentStep + 1,
                success: true
            };
            
        } catch (error) {
            console.error('❌ İnteraktif çözüm başlatma hatası:', error);
            throw error;
        }
    }
    
    // Mevcut adım için seçenekleri oluştur - TAMAMEN YENİDEN YAZILDI
    generateStepOptions(stepIndex) {
        try {
            console.log(`🔄 Adım ${stepIndex + 1} seçenekleri oluşturuluyor...`);
            
            if (!this.solutionData || stepIndex >= this.totalSteps || stepIndex < 0) {
                console.error('❌ Geçersiz adım indeksi:', stepIndex, 'Toplam:', this.totalSteps);
                return null;
            }
            
            const currentStepData = this.solutionData.adimlar[stepIndex];
            if (!currentStepData) {
                console.error('❌ Adım verisi bulunamadı:', stepIndex);
                return null;
            }
            
            // Seçenekleri oluştur
            const options = [];
            
            // 1. Doğru cevap - HER ZAMAN VARDIR
            const correctOption = {
                id: 0,
                text: currentStepData.adimAciklamasi || `Adım ${stepIndex + 1}`,
                latex: currentStepData.cozum_lateks || '',
                isCorrect: true,
                explanation: "Bu doğru çözüm adımıdır."
            };
            options.push(correctOption);
            
            // 2. Yanlış seçenekler - GÜVENLİ EKLENİR
            if (currentStepData.yanlisSecenekler && Array.isArray(currentStepData.yanlisSecenekler)) {
                currentStepData.yanlisSecenekler.slice(0, 2).forEach((wrongOption, index) => {
                    options.push({
                        id: index + 1,
                        text: wrongOption.metin || `Yanlış seçenek ${index + 1}`,
                        latex: wrongOption.latex || '',
                        isCorrect: false,
                        explanation: wrongOption.yanlisGeriBildirimi || "Bu yanlış bir çözüm adımıdır."
                    });
                });
            }
            
            // 3. Eksik seçenekleri tamamla - GÜVENLİ FALLBACK
            while (options.length < 3) {
                const fallbackOption = this.generateFallbackWrongOption(currentStepData, options.length);
                options.push(fallbackOption);
            }
            
            // 4. Seçenekleri karıştır ve displayId ekle - DÜZELTİLMİŞ ALGORİTMA
            this.currentOptions = this.shuffleAndAssignIds(options);
            
            console.log(`✅ Adım ${stepIndex + 1} seçenekleri hazırlandı:`, this.currentOptions.length, 'seçenek');
            
            return {
                stepNumber: stepIndex + 1,
                totalSteps: this.totalSteps,
                stepDescription: currentStepData.adimAciklamasi || `Adım ${stepIndex + 1}`,
                options: this.currentOptions,
                attempts: this.totalAttempts,
                maxAttempts: this.maxAttempts,
                remainingAttempts: this.maxAttempts - this.totalAttempts,
                success: true
            };
            
        } catch (error) {
            console.error('❌ Seçenek oluşturma hatası:', error);
            return null;
        }
    }
    
    // Seçenekleri karıştır ve displayId ata - YENİ GÜVENLİ ALGORİTMA
    shuffleAndAssignIds(options) {
        if (!Array.isArray(options) || options.length === 0) {
            console.error('❌ Geçersiz seçenekler:', options);
            return [];
        }
        
        // Önce güvenli bir kopya oluştur
        const shuffled = options.map(option => ({...option}));
        
        // Fisher-Yates algoritması ile karıştır
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        // displayId'leri sırayla ata
        return shuffled.map((option, index) => ({
            ...option,
            displayId: index
        }));
    }
    
    // Seçenek değerlendirme - TAMAMEN YENİDEN YAZILDI
    evaluateSelection(selectedOptionId) {
        try {
            console.log(`🔄 Seçenek değerlendiriliyor: ${selectedOptionId}`);
            
            // İşlem durumu kontrolü
            if (this.isProcessing || this.isCompleted) {
                return { 
                    error: "İşlem zaten devam ediyor veya tamamlandı",
                    success: false
                };
            }
            
            // ✅ FIX: Deneme hakkı kontrolü - DAHA NET
            if (this.totalAttempts >= this.maxAttempts) {
                console.log('❌ TÜM DENEME HAKLARI BİTTİ - SETUP\'A YÖNLENDİRİLİYOR');
                return { 
                    error: "Tüm deneme haklarınız bitti. Soru yükleme ekranına yönlendiriliyorsunuz.",
                    shouldResetToSetup: true,
                    totalAttemptsExceeded: true, // ✅ YENİ FLAG
                    success: false
                };
            }
            
            this.isProcessing = true;
            
            // Seçilen seçeneği bul
            const selectedOption = this.findOptionByDisplayId(selectedOptionId);
            
            if (!selectedOption) {
                this.isProcessing = false;
                return { 
                    error: "Geçersiz seçenek ID: " + selectedOptionId,
                    success: false
                };
            }
            
            // Doğru seçeneği bul
            const correctOption = this.currentOptions.find(opt => opt.isCorrect === true);
            
            // Deneme sayısını artır - SADECE YANLIŞTA
            let newAttemptCount = this.totalAttempts;
            if (!selectedOption.isCorrect) {
                newAttemptCount = this.totalAttempts + 1;
                this.totalAttempts = newAttemptCount;
                
                console.log(`❌ Yanlış cevap! Deneme: ${newAttemptCount}/${this.maxAttempts}`);
                
                // Yanlış denemeyi kaydet
                this.attemptHistory.push({
                    step: this.currentStep,
                    attempt: newAttemptCount,
                    selectedOption: selectedOptionId,
                    timestamp: Date.now(),
                    wasCorrect: false
                });
            } else {
                console.log(`✅ Doğru cevap! Adım ${this.currentStep + 1} tamamlandı`);
                
                // Doğru cevap için kayıt (deneme sayısını artırmadan)
                this.attemptHistory.push({
                    step: this.currentStep,
                    selectedOption: selectedOptionId,
                    timestamp: Date.now(),
                    wasCorrect: true,
                    noAttemptUsed: true
                });
            }
            
            // Sonuç nesnesi
            const result = {
                isCorrect: selectedOption.isCorrect,
                explanation: selectedOption.explanation,
                selectedOption: selectedOption,
                correctOption: correctOption,
                attempts: newAttemptCount,
                remainingAttempts: this.maxAttempts - newAttemptCount,
                currentStep: this.currentStep + 1,
                totalSteps: this.totalSteps,
                success: true
            };
            
            if (selectedOption.isCorrect) {
                // DOĞRU CEVAP İŞLEMİ
                this.completedSteps.push({
                    stepIndex: this.currentStep,
                    completedAt: Date.now(),
                    usedAttempt: false
                });
                
                this.currentStep++;
                
                if (this.currentStep >= this.totalSteps) {
                    // TÜM ADIMLAR TAMAMLANDI
                    this.isCompleted = true;
                    result.isCompleted = true;
                    result.completionStats = this.getCompletionStats();
                    console.log('🎉 Tüm adımlar tamamlandı!');
                } else {
                    // SONRAKİ ADIMA GEÇ
                    result.nextStep = this.generateStepOptions(this.currentStep);
                }
                
            } else {
                // YANLIŞ CEVAP İŞLEMİ
                
                // ✅ FIX: Deneme hakkı bitti mi kontrol et
                if (newAttemptCount >= this.maxAttempts) {
                    result.shouldResetToSetup = true;
                    result.totalAttemptsExceeded = true; // ✅ YENİ FLAG
                    result.message = "Tüm deneme haklarınız bitti. Soru yükleme ekranına yönlendiriliyorsunuz.";
                    console.log('🔚 TÜM DENEME HAKLARI BİTTİ - SETUP RESET FLAG SET EDİLDİ');
                } else {
                    // Henüz deneme hakkı var
                    if (this.currentStep === 0) {
                        // İlk adımda yanlış - adımı tekrarla
                        result.restartCurrentStep = true;
                        result.message = "İlk adımda hata yaptınız. Bu adımı tekrar çözmeniz gerekiyor.";
                        result.nextStep = this.generateStepOptions(this.currentStep);
                    } else {
                        // Diğer adımlarda yanlış - başa dön
                        this.currentStep = 0;
                        this.completedSteps = [];
                        result.restartFromBeginning = true;
                        result.message = "Yanlış cevap verdiniz. Baştan başlayacaksınız.";
                        result.nextStep = this.generateStepOptions(this.currentStep);
                    }
                }
            }
            
            this.isProcessing = false;
            
            console.log('✅ Değerlendirme tamamlandı:', result);
            return result;
            
        } catch (error) {
            this.isProcessing = false;
            console.error('❌ Seçenek değerlendirme hatası:', error);
            return {
                error: "Değerlendirme sırasında hata oluştu: " + error.message,
                success: false
            };
        }
    }
    
    // Seçeneği displayId ile bul - GÜVENLİ ARAMA
    findOptionByDisplayId(displayId) {
        if (!Array.isArray(this.currentOptions)) {
            console.error('❌ currentOptions bir dizi değil:', this.currentOptions);
            return null;
        }
        
        // displayId tipini normalize et
        const normalizedId = parseInt(displayId);
        
        if (isNaN(normalizedId)) {
            console.error('❌ Geçersiz displayId:', displayId);
            return null;
        }
        
        const found = this.currentOptions.find(option => 
            option.displayId === normalizedId || 
            parseInt(option.displayId) === normalizedId
        );
        
        console.log(`🔍 DisplayId ${displayId} aranıyor... Bulunan:`, found ? '✅' : '❌');
        
        return found || null;
    }
    
    // Yedek yanlış seçenek oluştur - GÜVENLİ
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
    
    // Tamamlanma istatistikleri - DÜZELTİLMİŞ
    getCompletionStats() {
        const endTime = Date.now();
        const totalTime = endTime - this.startTime;
        
        const wrongAttempts = this.attemptHistory.filter(attempt => !attempt.wasCorrect).length;
        const correctAttempts = this.attemptHistory.filter(attempt => attempt.wasCorrect).length;
        
        return {
            totalSteps: this.totalSteps,
            completedSteps: this.completedSteps.length,
            totalAttempts: wrongAttempts, // Sadece yanlış cevaplar
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
    
    // Performans hesaplama
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
    
    // Mevcut durumu al
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
    
    // İpucu al
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
    
    // Sistemi sıfırla - TAMAMEN SIFIRLA
    reset() {
        console.log('🔄 İnteraktif çözüm sistemi sıfırlanıyor...');
        
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
        
        console.log('✅ İnteraktif çözüm sistemi sıfırlandı');
    }
}

// Singleton export
export const interactiveSolutionManager = new InteractiveSolutionManager();