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
            
            const options = [];
            
            // 1. Doğru cevap - DEĞİŞİKLİK BURADA: Artık sadece 'cozum_lateks' kullanılıyor.
            const correctOption = {
                id: 0,
                // "text" alanı için adimAciklamasi yerine cozum_lateks kullanıyoruz.
                text: currentStepData.cozum_lateks || `Adım ${stepIndex + 1} için işlem bulunamadı.`,
                latex: currentStepData.cozum_lateks || '', // latex alanını da dolduralım
                isCorrect: true,
                explanation: "Bu doğru çözüm adımıdır."
            };
            options.push(correctOption);
            
            // 2. Yanlış seçenekler
            if (currentStepData.yanlisSecenekler && Array.isArray(currentStepData.yanlisSecenekler)) {
                currentStepData.yanlisSecenekler.slice(0, 2).forEach((wrongOption, index) => {
                    options.push({
                        id: index + 1,
                        // "text" alanı için metin veya latex kullan
                        text: wrongOption.metin || wrongOption.latex || `Yanlış seçenek ${index + 1}`,
                        isCorrect: false,
                        explanation: wrongOption.yanlisGeriBildirimi || "Bu yanlış bir çözüm adımıdır."
                    });
                });
            }
            
            // 3. Eksik seçenekleri tamamla
            while (options.length < 3) {
                const fallbackOption = this.generateFallbackWrongOption(currentStepData, options.length);
                options.push(fallbackOption);
            }
            
            // 4. Seçenekleri karıştır ve ID ata
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
            
            // ✅ KRITIK FIX: Deneme hakkı kontrolü
            if (this.totalAttempts >= this.maxAttempts) {
                console.log('❌ TÜM DENEME HAKLARI BİTTİ - KESIN RESET');
                return { 
                    error: "Tüm deneme haklarınız bitti. Soru yükleme ekranına yönlendiriliyorsunuz.",
                    shouldResetToSetup: true,
                    totalAttemptsExceeded: true,
                    forceReset: true, // ✅ YENİ FLAG
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
                
                // ✅ KRITIK FIX: Deneme hakkı bitti mi kesin kontrol
                if (newAttemptCount >= this.maxAttempts) {
                    console.log('🔚 TÜM DENEME HAKLARI BİTTİ - KESIN RESET BAŞLATILIYOR');
                    result.shouldResetToSetup = true;
                    result.totalAttemptsExceeded = true;
                    result.forceReset = true; // ✅ YENİ FLAG
                    result.message = "Tüm deneme haklarınız bitti. Soru yükleme ekranına yönlendiriliyorsunuz.";
                    
                    // Sistem durumunu reset için hazırla
                    this.prepareForReset();
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
    prepareForReset() {
        console.log('🔄 Sistem reset için hazırlanıyor...');
        this.isCompleted = true; // Çözümü sonlandır
        this.isProcessing = false;
        // Diğer veriler korunacak (reset'te temizlenecek)
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