// =================================================================================
//  İnteraktif Çözüm Yöneticisi - YENİ MİMARİ VERSİYONU (API ÇAĞRISI YOK)
// =================================================================================

export class InteractiveSolutionManager {
    constructor() {
        this.solutionData = null;
        this.currentStep = 0;
        this.totalSteps = 0;
        this.isProcessing = false;
        this.totalAttempts = 0;
        this.maxAttempts = 3; // Başlangıç değeri, initialize'da güncellenebilir
        this.currentOptions = [];
        this.startTime = null;
        this.isCompleted = false;
        console.log('✅ InteractiveSolutionManager başlatıldı (Yeni Mimari)');
    }

    /**
     * İnteraktif çözümü, önceden alınmış olan tam çözüm verisiyle başlatır.
     * @param {object} solutionData - getUnifiedSolution'dan gelen tam çözüm nesnesi.
     */
    initializeInteractiveSolution(solutionData) {
        console.log('🔄 İnteraktif çözüm başlatılıyor...', solutionData);
        if (!solutionData || !solutionData.adimlar || solutionData.adimlar.length === 0) {
            throw new Error('Geçersiz veya boş çözüm verisi.');
        }

        this.reset();
        this.solutionData = solutionData;
        this.totalSteps = solutionData.adimlar.length;
        // Toplam deneme hakkını adım sayısına göre daha mantıklı bir şekilde ayarlayalım
        this.maxAttempts = Math.max(3, Math.floor(this.totalSteps * 1.5));
        this.startTime = Date.now();
    }

    /**
     * Belirli bir adım için seçenekleri, mevcut çözüm verisinden hazırlar. API ÇAĞRISI YAPMAZ.
     * @param {number} stepIndex - Seçenekleri hazırlanacak olan adımın indeksi.
     * @returns {object} Arayüzde gösterilecek adım verisi.
     */
    generateStepOptions(stepIndex) {
        if (!this.solutionData || stepIndex >= this.totalSteps || stepIndex < 0) {
            throw new Error("Geçersiz adım indeksi.");
        }

        const currentStepData = this.solutionData.adimlar[stepIndex];
        const options = [];

        // 1. Doğru seçeneği ekle
        options.push({
            latex: currentStepData.cozum_lateks,
            isCorrect: true,
            explanation: currentStepData.adimAciklamasi || "Bu adım, çözüm için doğru yaklaşımdır."
        });

        // 2. Önceden alınmış yanlış seçenekleri ekle
        if (currentStepData.yanlisSecenekler && currentStepData.yanlisSecenekler.length > 0) {
            currentStepData.yanlisSecenekler.slice(0, 2).forEach(opt => {
                options.push({
                    latex: opt.metin_lateks,
                    isCorrect: false,
                    explanation: opt.hataAciklamasi
                });
            });
        }

        // 3. Eğer yeterli yanlış seçenek yoksa, genel bir tane ekle
        while (options.length < 3) {
            options.push({
                latex: `\\text{Hatalı Yaklaşım ${options.length}}`,
                isCorrect: false,
                explanation: "Bu yöntem veya hesaplama bu adım için doğru değil."
            });
        }

        this.currentOptions = this.shuffleAndAssignIds(options);

        return {
            stepNumber: stepIndex + 1,
            totalSteps: this.totalSteps,
            stepDescription: currentStepData.adimAciklamasi || `Adım ${stepIndex + 1} için doğru işlemi seçin.`,
            options: this.currentOptions,
            remainingAttempts: this.maxAttempts - this.totalAttempts
        };
    }

    /**
     * Seçenekleri karıştırır ve arayüzde kullanılmak üzere geçici ID'ler atar.
     * @param {Array<object>} options Karıştırılacak seçenekler dizisi.
     * @returns {Array<object>} Karıştırılmış ve ID atanmış seçenekler.
     */
    shuffleAndAssignIds(options) {
        const shuffled = [...options].sort(() => Math.random() - 0.5);
        return shuffled.map((option, index) => ({ ...option, displayId: index }));
    }

    evaluateSelection(selectedDisplayId) {
        if (this.isCompleted || this.totalAttempts >= this.maxAttempts) {
            return { error: "Değerlendirme yapılamaz, çözüm tamamlandı veya deneme hakkı bitti." };
        }

        const selectedOption = this.currentOptions.find(opt => opt.displayId === selectedDisplayId);
        if (!selectedOption) {
            return { error: "Geçersiz seçenek." };
        }

        const correctOption = this.currentOptions.find(opt => opt.isCorrect);
        let result = {
            isCorrect: selectedOption.isCorrect,
            explanation: selectedOption.explanation,
            selectedOption,
            correctOption,
            remainingAttempts: this.maxAttempts - this.totalAttempts
        };

        if (result.isCorrect) {
            this.currentStep++;
            if (this.currentStep >= this.totalSteps) {
                this.isCompleted = true;
                result.isCompleted = true;
                result.completionStats = this.getCompletionStats();
            } else {
                // *** DÜZELTME BURADA: Bir sonraki adımın verisini doğrudan sonuç nesnesine ekliyoruz.
                result.nextStepData = this.generateStepOptions(this.currentStep);
            }
        } else {
            this.totalAttempts++;
            result.remainingAttempts--;
            if (result.remainingAttempts <= 0) {
                result.forceReset = true;
                result.message = "Tüm deneme haklarınız bitti.";
            } else {
                this.currentStep = 0; // Yanlış cevapta başa dön
                result.restartFromBeginning = true;
                result.message = `Yanlış cevap! Baştan başlıyorsunuz. Kalan deneme hakkınız: ${result.remainingAttempts}`;
            }
        }
        return result;
    }

    getCompletionStats() {
        const endTime = Date.now();
        const totalTime = this.startTime ? endTime - this.startTime : 0;
        const successRate = this.totalSteps > 0 ? ((this.totalSteps) / (this.totalSteps + this.totalAttempts)) * 100 : 0;
        
        let performance = 'needs_improvement';
        if(successRate > 85) performance = 'excellent';
        else if(successRate > 60) performance = 'good';

        const formatTime = (ms) => {
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            return `${minutes}dk ${seconds % 60}sn`;
        };

        return {
            totalTimeFormatted: formatTime(totalTime),
            totalAttempts: this.totalAttempts,
            totalSteps: this.totalSteps,
            successRate: Math.round(successRate),
            performance: performance
        };
    }
    
    getHint() {
        if (!this.solutionData || this.currentStep >= this.totalSteps) return null;
        const stepData = this.solutionData.adimlar[this.currentStep];
        return { 
            hint: stepData.ipucu || "Bu adımda kullanılacak temel formülü veya kuralı düşünün.",
            stepDescription: stepData.adimAciklamasi 
        };
    }

    reset() {
        this.solutionData = null;
        this.currentStep = 0;
        this.totalSteps = 0;
        this.totalAttempts = 0;
        this.currentOptions = [];
        this.startTime = null;
        this.isCompleted = false;
        this.isProcessing = false;
        console.log('✅ İnteraktif çözüm sistemi sıfırlandı.');
    }
}

// Singleton export
export const interactiveSolutionManager = new InteractiveSolutionManager();