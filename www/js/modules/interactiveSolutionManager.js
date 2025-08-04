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

    generateStepOptions(stepIndex) {
        if (!this.solutionData || stepIndex >= this.totalSteps) {
            throw new Error("Geçersiz adım");
        }

        const stepData = this.solutionData.adimlar[stepIndex];
        const options = [
            {
                latex: stepData.cozum_lateks,
                isCorrect: true,
                explanation: stepData.adimAciklamasi
            }
        ];

        // Yanlış seçenekler ekle
        if (stepData.yanlisSecenekler) {
            stepData.yanlisSecenekler.forEach(opt => {
                options.push({
                    latex: opt.metin_lateks,
                    isCorrect: false,
                    explanation: opt.hataAciklamasi
                });
            });
        }

        // Karıştır
        return {
            stepNumber: stepIndex + 1,
            totalSteps: this.totalSteps,
            stepDescription: stepData.adimAciklamasi,
            options: options.sort(() => Math.random() - 0.5).map((opt, i) => ({...opt, id: i}))
        };
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