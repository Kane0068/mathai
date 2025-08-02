// =================================================================================
//  İnteraktif Çözüm Yöneticisi - Gemini API Entegrasyonu ile Tam Sürüm
// =================================================================================

// Gerekli servisleri ve yardımcıları import et
import { getInteractiveOptions } from '../services/apiService.js';
import { makeLatexJsonSafe } from '../utils/safeJsonParser.js';

export class InteractiveSolutionManager {
    constructor() {
        this.solutionData = null;
        this.currentStep = 0;
        this.totalSteps = 0;
        this.isProcessing = false;
        
        // Deneme sistemi
        this.totalAttempts = 0;
        this.maxAttempts = 3;
        this.attemptHistory = [];

        // Seçenek sistemi
        this.currentOptions = [];
        this.selectedOption = null;
        
        // Sonuç takibi
        this.completedSteps = [];
        this.startTime = null;
        this.isCompleted = false;
        
        console.log('✅ InteractiveSolutionManager başlatıldı');
    }

    /**
     * Seçenekleri oluşturur, hata durumunda fallback mekanizmasını kullanır.
     */
    async generateOptions(stepData, allSteps, currentStepIndex) {
        console.log(`🎯 Adım ${currentStepIndex + 1} için seçenekler üretiliyor`);
        
        try {
            // Doğru seçeneği hazırla
            const correctOption = {
                id: 0,
                text: stepData.adimBasligi,
                latex: stepData.cozum_lateks,
                isCorrect: true,
                explanation: stepData.adimAciklamasi || "Doğru! Bu adım çözüm için gerekli."
            };
            
            // API'den yanlış seçenekleri üret
            const wrongOptions = await this.generateWrongOptions(stepData, allSteps, currentStepIndex);
            
            // Tüm seçenekleri birleştir ve karıştır
            const allOptions = [correctOption, ...wrongOptions];
            return this.shuffleAndAssignIds(allOptions);
            
        } catch (error) {
            console.error('Seçenek üretimi tamamen başarısız oldu, fallback kullanılıyor:', error);
            // Hata durumunda statik fallback seçeneklerini döndür
            return this.getFallbackOptions(stepData);
        }
    }

    /**
     * Yanlış seçenekleri üretmek için Gemini API'yi kullanır.
     * Başarısız olursa matematiksel varyasyonlara geçer.
     */
    async generateWrongOptions(stepData, allSteps, currentStepIndex) {
        const wrongOptions = [];
        
        try {
            // Mevcut apiService'i kullanarak seçenekleri iste.
            // Bu servis zaten yeniden deneme ve hata yönetimi içeriyor.
            const parsed = await getInteractiveOptions(stepData, allSteps, currentStepIndex);
            
            if (parsed && parsed.yanlisSecenekler && parsed.yanlisSecenekler.length >= 2) {
                // API'den gelen seçenekleri kullan
                parsed.yanlisSecenekler.slice(0, 2).forEach((secenek, index) => {
                    wrongOptions.push({
                        id: index + 1,
                        text: `Alternatif ${index + 1}`,
                        latex: secenek.metin,
                        isCorrect: false,
                        explanation: secenek.hataAciklamasi
                    });
                });
                console.log("✅ Gemini API'den çeldirici seçenekler başarıyla alındı.");
            } else {
                throw new Error("API'den beklenen formatta çeldirici gelmedi.");
            }
            
        } catch (error) {
            console.warn('API\'den çeldirici alınamadı, matematiksel varyasyonlar kullanılacak.', error);
            // API başarısız olursa, fallback olarak matematiksel varyasyonlar oluştur
            wrongOptions.push(...this.generateMathematicalVariations(stepData));
        }
        
        // Eğer hala yeterli seçenek yoksa (API hatası vb.), genel hatalar ekle
        while (wrongOptions.length < 2) {
            wrongOptions.push(this.generateGenericWrongOption(wrongOptions.length + 1));
        }
        
        return wrongOptions.slice(0, 2); // Her zaman 2 yanlış seçenek döndür
    }

    /**
     * API'nin çalışmadığı durumlar için matematiksel olarak hatalı seçenekler üretir.
     */
    generateMathematicalVariations(stepData) {
        const variations = [];
        const originalLatex = stepData.cozum_lateks;
        
        const numberPattern = /\d+/g;
        const numbers = originalLatex.match(numberPattern);
        
        if (numbers && numbers.length > 0) {
            // Varyasyon 1: Sayısal hata
            const num = parseInt(numbers[0]);
            const variation1 = originalLatex.replace(numbers[0], (num + Math.floor(Math.random() * 3) + 1).toString());
            variations.push({
                id: variations.length + 1,
                text: "Hesaplama hatası",
                latex: variation1,
                isCorrect: false,
                explanation: "Hesaplama sırasında bir hata yapılmış gibi görünüyor. Sayıları tekrar kontrol et."
            });
            
            // Varyasyon 2: İşaret hatası
            let variation2 = originalLatex;
            if (originalLatex.includes('+')) {
                variation2 = originalLatex.replace('+', '-');
            } else if (originalLatex.includes('-')) {
                variation2 = originalLatex.replace('-', '+');
            }
            
            if (variation2 !== originalLatex) {
                variations.push({
                    id: variations.length + 1,
                    text: "İşaret hatası",
                    latex: variation2,
                    isCorrect: false,
                    explanation: "İşlem işareti yanlış kullanılmış olabilir. İşaretleri kontrol et."
                });
            }
        }
        
        return variations;
    }
    
    /**
     * Çok genel ve konudan bağımsız yanlış seçenekler üretir.
     */
    generateGenericWrongOption(id) {
        const genericOptions = [
            { text: "Farklı yöntem", latex: "\\text{Bu adımda farklı bir yöntem kullanılmalı}", explanation: "Bu yöntem bu problem için uygun değil." },
            { text: "Eksik işlem", latex: "\\text{Bu adım atlanabilir}", explanation: "Bu adım çözüm için gereklidir, atlanamaz." },
            { text: "Yanlış sıralama", latex: "\\text{Bu işlem daha sonra yapılmalı}", explanation: "İşlem sırası doğru, değiştirilemez." }
        ];
        const selected = genericOptions[id % genericOptions.length];
        return { id, isCorrect: false, ...selected };
    }

    /**
     * İnteraktif çözümü başlatır.
     */
    initializeInteractiveSolution(solutionData) {
        try {
            console.log('🔄 İnteraktif çözüm başlatılıyor...', solutionData);
            if (!solutionData || !solutionData.adimlar || !Array.isArray(solutionData.adimlar) || solutionData.adimlar.length === 0) {
                throw new Error('Geçersiz veya boş çözüm verisi.');
            }
            
            this.reset();
            this.solutionData = solutionData;
            this.totalSteps = solutionData.adimlar.length;
            this.maxAttempts = Math.max(3, this.totalSteps);
            this.startTime = Date.now();
            
            console.log(`✅ İnteraktif çözüm başlatıldı - ${this.totalSteps} adım, ${this.maxAttempts} deneme hakkı`);
            return { success: true, totalSteps: this.totalSteps, maxAttempts: this.maxAttempts, currentStep: 1 };
        } catch (error) {
            console.error('❌ İnteraktif çözüm başlatma hatası:', error);
            throw error;
        }
    }
    
    /**
     * Belirli bir adım için seçenekleri hazırlar.
     */
    async generateStepOptions(stepIndex) {
        try {
            console.log(`🔄 Adım ${stepIndex + 1} seçenekleri hazırlanıyor...`);
            if (!this.solutionData || stepIndex >= this.totalSteps || stepIndex < 0) {
                throw new Error("Geçersiz adım indeksi.");
            }
            
            const currentStepData = this.solutionData.adimlar[stepIndex];
            
            // Eğer adım için yanlış seçenekler daha önce üretilmemişse üret
            if (!currentStepData.yanlisSecenekler || currentStepData.yanlisSecenekler.length === 0) {
                 const wrongOptions = await this.generateWrongOptions(currentStepData, this.solutionData.adimlar, stepIndex);
                 currentStepData.yanlisSecenekler = wrongOptions.map(opt => ({ metin: opt.latex, hataAciklamasi: opt.explanation }));
            }
            
            const options = [];
            options.push({ id: 0, text: currentStepData.cozum_lateks, latex: currentStepData.cozum_lateks, isCorrect: true, explanation: currentStepData.adimAciklamasi });
            currentStepData.yanlisSecenekler.slice(0, 2).forEach((opt, i) => {
                options.push({ id: i + 1, text: opt.metin, latex: opt.metin, isCorrect: false, explanation: opt.hataAciklamasi });
            });
            
            this.currentOptions = this.shuffleAndAssignIds(options);
            
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
            console.error('❌ Seçenek hazırlama hatası:', error);
            return null;
        }
    }
    
    /**
     * Seçenekleri karıştırır ve görüntüleme için ID atar.
     */
    shuffleAndAssignIds(options) {
        const shuffled = [...options].sort(() => Math.random() - 0.5);
        return shuffled.map((option, index) => ({ ...option, displayId: index }));
    }

    /**
     * Kullanıcının seçimini değerlendirir.
     */
    evaluateSelection(selectedOptionId) {
        try {
            if (this.isProcessing || this.isCompleted) return { error: "İşlem devam ediyor veya tamamlandı", success: false };
            if (this.totalAttempts >= this.maxAttempts) {
                return { error: "Tüm deneme haklarınız bitti.", forceReset: true, success: false };
            }

            this.isProcessing = true;
            const selectedOption = this.findOptionByDisplayId(selectedOptionId);
            if (!selectedOption) throw new Error("Geçersiz seçenek ID.");

            const correctOption = this.currentOptions.find(opt => opt.isCorrect);
            let result = { isCorrect: selectedOption.isCorrect, explanation: selectedOption.explanation, selectedOption, correctOption, attempts: this.totalAttempts, remainingAttempts: this.maxAttempts - this.totalAttempts, currentStep: this.currentStep + 1, totalSteps: this.totalSteps, success: true };

            if (selectedOption.isCorrect) {
                this.currentStep++;
                if (this.currentStep >= this.totalSteps) {
                    this.isCompleted = true;
                    result.isCompleted = true;
                    result.completionStats = this.getCompletionStats();
                } else {
                    // Bir sonraki adım için seçenekleri asenkron olarak hazırla
                    result.nextStepPromise = this.generateStepOptions(this.currentStep);
                }
            } else {
                this.totalAttempts++;
                result.attempts = this.totalAttempts;
                result.remainingAttempts = this.maxAttempts - this.totalAttempts;

                if (result.remainingAttempts <= 0) {
                     result.forceReset = true;
                     result.message = "Tüm deneme haklarınız bitti.";
                } else {
                    this.currentStep = 0; // Başa dön
                    result.restartFromBeginning = true;
                    result.message = "Yanlış cevap, baştan başlıyorsunuz.";
                    result.nextStepPromise = this.generateStepOptions(0);
                }
            }
            
            this.isProcessing = false;
            return result;
        } catch (error) {
            this.isProcessing = false;
            console.error('❌ Seçim değerlendirme hatası:', error);
            return { error: "Değerlendirme sırasında hata oluştu.", success: false };
        }
    }
    
    findOptionByDisplayId(displayId) {
        return this.currentOptions.find(option => option.displayId === parseInt(displayId)) || null;
    }
    
    /**
     * Yardımcı: Belirtilen milisaniye kadar bekler.
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * API çağrısı başarısız olduğunda veya seçenek üretilemediğinde kullanılacak statik seçenekler.
     */
    getFallbackOptions(stepData) {
        const options = [
            { id: 0, text: stepData.adimBasligi, latex: stepData.cozum_lateks, isCorrect: true, explanation: "Doğru! Bu adım çözüm için gerekli." },
            { id: 1, text: "Alternatif 1", latex: "\\text{Farklı bir yaklaşım}", isCorrect: false, explanation: "Bu yaklaşım bu problem için uygun değil." },
            { id: 2, text: "Alternatif 2", latex: "\\text{Hatalı işlem}", isCorrect: false, explanation: "Bu işlemde bir hata var." }
        ];
        return this.shuffleAndAssignIds(options);
    }
    
    getCompletionStats() {
        // ... (Bu fonksiyonun içeriği aynı kalabilir)
        const endTime = Date.now();
        const totalTime = endTime - this.startTime;
        return { totalTimeFormatted: this.formatTime(totalTime), totalAttempts: this.totalAttempts, totalSteps: this.totalSteps, successRate: ((this.totalSteps) / (this.totalSteps + this.totalAttempts)) * 100, performance: 'good' };
    }

    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        return `${minutes}m ${seconds % 60}s`;
    }
    
    getHint() {
        if (!this.solutionData || this.currentStep >= this.totalSteps) return null;
        const stepData = this.solutionData.adimlar[this.currentStep];
        return { hint: stepData.ipucu || "Bu adımda dikkatli düşünün.", stepDescription: stepData.adimAciklamasi };
    }

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
        console.log('✅ İnteraktif çözüm sistemi sıfırlandı.');
    }
}

// Singleton export
export const interactiveSolutionManager = new InteractiveSolutionManager();