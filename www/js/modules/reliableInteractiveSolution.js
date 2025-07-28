// =================================================================================
//  Güvenilir İnteraktif Çözüm Sistemi - API Hata Toleranslı + State Güvenli
//  Sorunlar: API 503 hataları, seçeneklerin kaybolması, render sıralaması
// =================================================================================

export class ReliableInteractiveSolutionManager {
    constructor() {
        this.solutionData = null;
        this.currentStep = 0;
        this.totalSteps = 0;
        this.totalAttempts = 0;
        this.maxAttempts = 3;
        this.stepHistory = [];
        this.isProcessing = false;
        
        // API güvenilirlik sistemi
        this.apiRetryCount = 0;
        this.maxApiRetries = 2;
        this.apiCooldown = false;
        this.fallbackMode = false;
        
        // Step cache sistemi
        this.stepOptionsCache = new Map();
        this.fallbackDistractorBank = new Map();
        
        // State güvenlik sistemi
        this.lastValidState = null;
        this.stateValidator = new InteractiveStateValidator();
        
        console.log('🚀 ReliableInteractiveSolutionManager initialized');
    }

    // =================================================================================
    //  ANA İNİTİALİZASYON - Güvenilir başlatma
    // =================================================================================
    
    async initializeInteractiveSolution(solutionData) {
        console.log('🎯 Güvenilir interaktif çözüm başlatılıyor...');
        
        try {
            // 1. Veri doğrulama
            if (!this.validateSolutionData(solutionData)) {
                throw new Error('Geçersiz çözüm verisi');
            }
            
            // 2. Sistem sıfırlama
            this.reset();
            
            // 3. Veriyi kaydet
            this.solutionData = solutionData;
            this.totalSteps = solutionData.adimlar.length;
            this.maxAttempts = Math.max(3, this.totalSteps); // Minimum 3, karmaşık problemlerde daha fazla
            
            // 4. Fallback distractor bank'ini hazırla
            this.prepareFallbackDistractors();
            
            // 5. İlk state'i kaydet
            this.saveValidState();
            
            console.log(`✅ Sistem başlatıldı: ${this.totalSteps} adım, ${this.maxAttempts} deneme hakkı`);
            
            return {
                totalSteps: this.totalSteps,
                maxAttempts: this.maxAttempts,
                currentStep: this.currentStep + 1,
                ready: true
            };
            
        } catch (error) {
            console.error('❌ İnteraktif çözüm başlatma hatası:', error);
            throw error;
        }
    }

    // =================================================================================
    //  STEP OPTIONS OLUŞTURMA - Güçlü hata toleransı ile
    // =================================================================================
    
    async generateStepOptions(stepIndex) {
        console.log(`🔄 Adım ${stepIndex + 1} seçenekleri oluşturuluyor...`);
        
        try {
            // 1. Cache kontrolü
            const cacheKey = `step-${stepIndex}`;
            if (this.stepOptionsCache.has(cacheKey)) {
                console.log('📋 Cache\'den seçenekler alındı');
                return this.stepOptionsCache.get(cacheKey);
            }
            
            // 2. Veri doğrulama
            if (stepIndex >= this.totalSteps || stepIndex < 0) {
                throw new Error(`Geçersiz adım indeksi: ${stepIndex}`);
            }
            
            const stepData = this.solutionData.adimlar[stepIndex];
            if (!stepData) {
                throw new Error(`Adım ${stepIndex + 1} verisi bulunamadı`);
            }
            
            // 3. Doğru seçeneği hazırla
            const correctOption = this.createCorrectOption(stepData, stepIndex);
            
            // 4. Çeldiricileri oluştur (API + Fallback hibrit sistem)
            const distractors = await this.createDistractorsWithFallback(stepData, stepIndex);
            
            // 5. Seçenekleri karıştır ve ID'leri ata
            const allOptions = [correctOption, ...distractors];
            const shuffledOptions = this.shuffleAndAssignIds(allOptions);
            
            // 6. Sonuç objesi oluştur
            const stepOptions = {
                stepNumber: stepIndex + 1,
                totalSteps: this.totalSteps,
                stepDescription: stepData.adimAciklamasi || `Adım ${stepIndex + 1}`,
                options: shuffledOptions,
                attempts: this.totalAttempts,
                maxAttempts: this.maxAttempts,
                remainingAttempts: this.maxAttempts - this.totalAttempts,
                apiMode: !this.fallbackMode,
                generated: new Date().toISOString()
            };
            
            // 7. Cache'e kaydet
            this.stepOptionsCache.set(cacheKey, stepOptions);
            
            // 8. State'i doğrula ve kaydet
            if (this.stateValidator.validate(stepOptions)) {
                this.saveValidState();
            }
            
            console.log(`✅ Adım ${stepIndex + 1} seçenekleri hazır:`, stepOptions);
            return stepOptions;
            
        } catch (error) {
            console.error(`❌ Adım ${stepIndex + 1} seçenekleri oluşturulamadı:`, error);
            
            // Kritik hata durumunda son geçerli state'e dön
            if (this.lastValidState) {
                console.log('🔄 Son geçerli state kullanılıyor');
                return this.lastValidState;
            }
            
            // Tamamen fallback seçenekler oluştur
            return this.createEmergencyStepOptions(stepIndex);
        }
    }
    
    // =================================================================================
    //  ÇELDİRİCİ OLUŞTURMA - API + Fallback hibrit sistem
    // =================================================================================
    
    async createDistractorsWithFallback(stepData, stepIndex) {
        console.log(`🎭 Çeldiriciler oluşturuluyor - API Retry: ${this.apiRetryCount}/${this.maxApiRetries}`);
        
        // API cooldown kontrolü
        if (this.apiCooldown) {
            console.log('⏱️ API cooldown aktif, fallback kullanılıyor');
            return this.createFallbackDistractors(stepData, stepIndex);
        }
        
        // Fallback mode kontrolü
        if (this.fallbackMode) {
            console.log('🔧 Fallback mode aktif');
            return this.createFallbackDistractors(stepData, stepIndex);
        }
        
        try {
            // API ile çeldiriciler oluştur
            const apiDistractors = await this.generateApiDistractors(stepData, stepIndex);
            
            if (apiDistractors && apiDistractors.length >= 2) {
                console.log('✅ API çeldiriciler başarıyla oluşturuldu');
                this.apiRetryCount = 0; // Başarılı olduğunda retry count'u sıfırla
                return apiDistractors;
            } else {
                throw new Error('API geçersiz çeldirici döndürdü');
            }
            
        } catch (error) {
            console.warn(`⚠️ API çeldirici hatası:`, error);
            
            // Retry logicİ
            this.apiRetryCount++;
            
            if (this.apiRetryCount <= this.maxApiRetries) {
                console.log(`🔄 API retry ${this.apiRetryCount}/${this.maxApiRetries}`);
                
                // Kısa bekleme sonrası tekrar dene
                await this.delay(1000 * this.apiRetryCount); // Exponential backoff
                return this.createDistractorsWithFallback(stepData, stepIndex);
                
            } else {
                console.log('❌ API retry limiti aşıldı, fallback moda geçiliyor');
                
                // Fallback moda geç ve cooldown başlat
                this.fallbackMode = true;
                this.startApiCooldown();
                
                return this.createFallbackDistractors(stepData, stepIndex);
            }
        }
    }
    
    // API çeldiriciler oluştur
    async generateApiDistractors(stepData, stepIndex) {
        const prompt = `
        ${stepIndex + 1}. matematik adımı için 2 adet gerçekçi çeldirici seçenek oluştur.
        
        DOĞRU ÇÖZÜM: ${stepData.cozum_lateks}
        ADIM AÇIKLAMASI: ${stepData.adimAciklamasi}
        
        ÇALDIRICILER:
        - Gerçekçi matematik hataları olmalı
        - Öğrencilerin yapabileceği yaygın hatalar
        - Doğru cevaba yakın ama yanlış
        
        JSON formatında yanıt ver:
        {
            "distractors": [
                {
                    "text": "Çeldirici açıklama (kısa, net)",
                    "latex": "$$yanlış_matematik_ifadesi$$",
                    "commonMistake": "Hata türü",
                    "reasoning": "Neden yanıltıcı"
                },
                {
                    "text": "İkinci çeldirici açıklama",
                    "latex": "$$ikinci_yanlış_ifade$$", 
                    "commonMistake": "İkinci hata türü",
                    "reasoning": "İkinci mantık"
                }
            ]
        }
        
        SADECE JSON DÖNDÜR, BAŞKA METİN YOK.
        `;
        
        if (typeof window.makeApiCall !== 'function') {
            throw new Error('makeApiCall fonksiyonu bulunamadı');
        }
        
        const response = await window.makeApiCall({
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }]
        });
        
        if (!response || !response.distractors || !Array.isArray(response.distractors)) {
            throw new Error('API geçersiz yanıt döndürdü');
        }
        
        if (response.distractors.length < 2) {
            throw new Error('Yetersiz çeldirici sayısı');
        }
        
        // API çeldiricilerini format'a dönüştür
        return response.distractors.slice(0, 2).map((distractor, index) => ({
            id: index + 1,
            text: distractor.text || `Çeldirici ${index + 1}`,
            latex: distractor.latex || '',
            isCorrect: false,
            explanation: distractor.reasoning || 'Bu yaklaşım doğru değildir.',
            commonMistake: distractor.commonMistake || 'Genel hata',
            apiGenerated: true,
            displayId: index + 1
        }));
    }
    
    // Fallback çeldiriciler oluştur
    createFallbackDistractors(stepData, stepIndex) {
        console.log(`🔧 Fallback çeldiriciler oluşturuluyor - Adım ${stepIndex + 1}`);
        
        const correctLatex = stepData.cozum_lateks || '';
        const distractors = [];
        
        // Fallback distractor bank'ten al
        const bankKey = `step-${stepIndex}`;
        if (this.fallbackDistractorBank.has(bankKey)) {
            console.log('📦 Distractor bank\'ten alınıyor');
            return this.fallbackDistractorBank.get(bankKey);
        }
        
        // Gerçek zamanlı fallback oluştur
        
        // 1. İşaret hatası çeldiricisi
        let signErrorLatex = correctLatex;
        if (signErrorLatex.includes('+')) {
            signErrorLatex = signErrorLatex.replace(/\+/g, '-');
        } else if (signErrorLatex.includes('-')) {
            signErrorLatex = signErrorLatex.replace(/-/g, '+');
        } else {
            // Sayısal değer varsa işaretini değiştir
            signErrorLatex = correctLatex.replace(/(\d+)/g, (match) => {
                const num = parseInt(match);
                return isNaN(num) ? match : (-num).toString();
            });
        }
        
        distractors.push({
            id: 1,
            text: "İşaret hatası yapılmış hesaplama",
            latex: signErrorLatex,
            isCorrect: false,
            explanation: "İşaret hatası yapılmıştır.",
            commonMistake: "İşaret karışıklığı",
            apiGenerated: false,
            displayId: 1
        });
        
        // 2. Sayısal hesap hatası çeldiricisi
        let calcErrorLatex = correctLatex;
        calcErrorLatex = calcErrorLatex.replace(/(\d+)/g, (match) => {
            const num = parseInt(match);
            if (!isNaN(num)) {
                const error = Math.floor(Math.random() * 5) + 1;
                const newNum = Math.random() > 0.5 ? num + error : Math.max(1, num - error);
                return newNum.toString();
            }
            return match;
        });
        
        distractors.push({
            id: 2,
            text: "Hesaplama hatası yapılmış sonuç",
            latex: calcErrorLatex,
            isCorrect: false,
            explanation: "Aritmetik hesaplamada hata yapılmıştır.",
            commonMistake: "Hesap hatası",
            apiGenerated: false,
            displayId: 2
        });
        
        // Bank'e kaydet
        this.fallbackDistractorBank.set(bankKey, distractors);
        
        console.log('✅ Fallback çeldiriciler oluşturuldu');
        return distractors;
    }
    
    // =================================================================================
    //  SEÇİM DEĞERLENDİRME - Güvenilir state yönetimi
    // =================================================================================
    
    evaluateSelection(selectedOptionId) {
        console.log(`🎯 Seçim değerlendiriliyor: Option ID ${selectedOptionId}`);
        
        try {
            // 1. İşlem durumu kontrolü
            if (this.isProcessing) {
                console.warn('⚠️ Başka bir işlem devam ediyor');
                return { error: "İşlem zaten devam ediyor, lütfen bekleyin." };
            }
            
            this.isProcessing = true;
            
            // 2. Deneme hakkı kontrolü
            if (this.totalAttempts >= this.maxAttempts) {
                console.log('❌ Deneme hakkı bitti');
                return {
                    error: "Tüm deneme haklarınız bitti.",
                    shouldResetToSetup: true,
                    attempts: this.totalAttempts,
                    remaining: 0
                };
            }
            
            // 3. Mevcut step options'ı al
            const currentStepOptions = this.getCurrentStepOptions();
            if (!currentStepOptions) {
                console.error('❌ Mevcut adım seçenekleri bulunamadı');
                return { error: "Adım verileri bulunamadı." };
            }
            
            // 4. Seçilen seçeneği bul
            const selectedOption = currentStepOptions.options.find(opt => 
                opt.displayId === selectedOptionId
            );
            
            if (!selectedOption) {
                console.error('❌ Seçenek bulunamadı:', selectedOptionId);
                return { error: "Geçersiz seçenek." };
            }
            
            // 5. Doğru seçeneği bul
            const correctOption = currentStepOptions.options.find(opt => opt.isCorrect);
            
            // 6. Deneme sayısını güncelle (yanlış cevaplarda)
            let newAttempts = this.totalAttempts;
            if (!selectedOption.isCorrect) {
                newAttempts = this.totalAttempts + 1;
                this.totalAttempts = newAttempts;
            }
            
            // 7. Sonuç objesi oluştur
            const result = {
                isCorrect: selectedOption.isCorrect,
                explanation: selectedOption.explanation || 'Değerlendirme tamamlandı',
                selectedOption: selectedOption,
                correctOption: correctOption,
                attempts: newAttempts,
                remainingAttempts: this.maxAttempts - newAttempts,
                currentStep: this.currentStep + 1,
                totalSteps: this.totalSteps,
                evaluatedAt: new Date().toISOString()
            };
            
            // 8. Doğru cevap işlemi
            if (selectedOption.isCorrect) {
                console.log(`✅ Doğru cevap! Adım ${this.currentStep + 1} tamamlandı`);
                
                // Adımı geçmişe kaydet
                this.stepHistory.push({
                    stepIndex: this.currentStep,
                    completedAt: Date.now(),
                    attempts: newAttempts,
                    selectedOption: selectedOption
                });
                
                // Sonraki adıma geç
                this.currentStep++;
                
                if (this.currentStep >= this.totalSteps) {
                    // Tüm adımlar tamamlandı
                    result.isCompleted = true;
                    result.completionStats = this.getCompletionStats();
                    console.log('🎉 Tüm adımlar tamamlandı!');
                } else {
                    // Sonraki adım hazırla (Promise olarak)
                    result.shouldProceed = true;
                    result.nextStepPromise = this.generateStepOptions(this.currentStep);
                    console.log(`➡️ Sonraki adıma geçiliyor: ${this.currentStep + 1}`);
                }
                
            } else {
                // 9. Yanlış cevap işlemi
                console.log(`❌ Yanlış cevap! Adım ${this.currentStep + 1}, Deneme: ${newAttempts}`);
                
                // API çeldirici detaylı feedback
                if (selectedOption.apiGenerated) {
                    result.detailedFeedback = {
                        commonMistake: selectedOption.commonMistake,
                        apiGenerated: true,
                        learningNote: `Yaygın hata: "${selectedOption.commonMistake}"`
                    };
                }
                
                if (this.currentStep === 0) {
                    // İlk adımda hata - adımı tekrarla
                    result.restartCurrentStep = true;
                    result.message = "İlk adımda hata yaptınız. Bu adımı tekrar çözmeniz gerekiyor.";
                    result.nextStepPromise = this.generateStepOptions(this.currentStep);
                    
                } else {
                    // Diğer adımlarda hata - baştan başla
                    this.currentStep = 0;
                    result.restartFromBeginning = true;
                    result.message = "Adımda hata yaptınız. Baştan başlayacaksınız.";
                    result.nextStepPromise = this.generateStepOptions(this.currentStep);
                }
                
                // Son deneme kontrolü
                if (newAttempts >= this.maxAttempts) {
                    result.shouldResetToSetup = true;
                    result.message = "Tüm deneme haklarınız bitti. Ana menüye dönüyorsunuz.";
                }
            }
            
            console.log('📊 Değerlendirme sonucu:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Seçim değerlendirme hatası:', error);
            return {
                error: "Değerlendirme sırasında hata oluştu: " + error.message,
                shouldRetry: true
            };
        } finally {
            this.isProcessing = false;
        }
    }
    
    // =================================================================================
    //  YARDIMCI FONKSİYONLAR
    // =================================================================================
    
    validateSolutionData(solutionData) {
        if (!solutionData) {
            console.error('❌ Solution data null');
            return false;
        }
        
        if (!solutionData.adimlar || !Array.isArray(solutionData.adimlar)) {
            console.error('❌ adimlar array eksik');
            return false;
        }
        
        if (solutionData.adimlar.length === 0) {
            console.error('❌ adimlar array boş');
            return false;
        }
        
        return true;
    }
    
    prepareFallbackDistractors() {
        console.log('📦 Fallback distractor bank hazırlanıyor...');
        
        this.solutionData.adimlar.forEach((step, index) => {
            const bankKey = `step-${index}`;
            if (!this.fallbackDistractorBank.has(bankKey)) {
                this.createFallbackDistractors(step, index);
            }
        });
        
        console.log(`✅ ${this.fallbackDistractorBank.size} adım için fallback bank hazır`);
    }
    
    createCorrectOption(stepData, stepIndex) {
        return {
            id: 0,
            text: stepData.adimAciklamasi || `Adım ${stepIndex + 1}`,
            latex: stepData.cozum_lateks || '',
            isCorrect: true,
            explanation: "Bu doğru çözüm adımıdır.",
            displayId: 0
        };
    }
    
    shuffleAndAssignIds(options) {
        // Önce karıştır
        const shuffled = [...options];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        // Sonra displayId'leri yeniden ata
        return shuffled.map((option, index) => ({
            ...option,
            displayId: index
        }));
    }
    
    getCurrentStepOptions() {
        const cacheKey = `step-${this.currentStep}`;
        return this.stepOptionsCache.get(cacheKey) || this.lastValidState;
    }
    
    createEmergencyStepOptions(stepIndex) {
        console.log('🚨 Emergency step options oluşturuluyor');
        
        const stepData = this.solutionData.adimlar[stepIndex];
        const correctOption = this.createCorrectOption(stepData, stepIndex);
        
        const emergencyDistractors = [
            {
                id: 1,
                text: "Alternatif yaklaşım (kontrol edin)",
                latex: "$$\\text{Alternatif hesaplama}$$",
                isCorrect: false,
                explanation: "Bu yaklaşımı kontrol ediniz.",
                emergency: true,
                displayId: 1
            },
            {
                id: 2,
                text: "Farklı yöntem (kontrol edin)",
                latex: "$$\\text{Farklı yöntem}$$", 
                isCorrect: false,
                explanation: "Bu yöntemi kontrol ediniz.",
                emergency: true,
                displayId: 2
            }
        ];
        
        return {
            stepNumber: stepIndex + 1,
            totalSteps: this.totalSteps,
            stepDescription: stepData.adimAciklamasi || `Adım ${stepIndex + 1}`,
            options: [correctOption, ...emergencyDistractors],
            attempts: this.totalAttempts,
            maxAttempts: this.maxAttempts,
            remainingAttempts: this.maxAttempts - this.totalAttempts,
            emergencyMode: true
        };
    }
    
    saveValidState() {
        const currentOptions = this.getCurrentStepOptions();
        if (currentOptions && this.stateValidator.validate(currentOptions)) {
            this.lastValidState = JSON.parse(JSON.stringify(currentOptions));
            console.log('💾 Geçerli state kaydedildi');
        }
    }
    
    getCompletionStats() {
        const endTime = Date.now();
        const totalTime = endTime - (this.stepHistory[0]?.completedAt || Date.now());
        
        return {
            totalSteps: this.totalSteps,
            completedSteps: this.stepHistory.length,
            totalAttempts: this.totalAttempts,
            maxAttempts: this.maxAttempts,
            successRate: this.totalSteps > 0 ? (this.totalSteps / (this.totalSteps + this.totalAttempts - this.totalSteps)) * 100 : 0,
            totalTimeMs: totalTime,
            totalTimeFormatted: this.formatTime(totalTime),
            performance: this.calculatePerformance()
        };
    }
    
    calculatePerformance() {
        const efficiency = this.totalSteps > 0 ? this.totalSteps / this.totalAttempts : 0;
        
        if (efficiency >= 0.9) return 'excellent';
        if (efficiency >= 0.7) return 'good';
        if (efficiency >= 0.5) return 'average';
        return 'needs_improvement';
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
    
    startApiCooldown() {
        this.apiCooldown = true;
        console.log('⏱️ API cooldown başlatıldı (30 saniye)');
        
        setTimeout(() => {
            this.apiCooldown = false;
            this.apiRetryCount = 0;
            console.log('✅ API cooldown bitti, tekrar denenebilir');
        }, 30000); // 30 saniye cooldown
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    reset() {
        console.log('🔄 İnteraktif çözüm sistemi sıfırlanıyor...');
        
        this.currentStep = 0;
        this.totalAttempts = 0;
        this.stepHistory = [];
        this.isProcessing = false;
        
        // Cache'leri temizle
        this.stepOptionsCache.clear();
        this.fallbackDistractorBank.clear();
        
        // API durumunu sıfırla
        this.apiRetryCount = 0;
        this.fallbackMode = false;
        this.apiCooldown = false;
        
        // State'i sıfırla
        this.lastValidState = null;
        
        console.log('✅ Sistem tamamen sıfırlandı');
    }
    
    getCurrentState() {
        return {
            currentStep: this.currentStep + 1,
            totalSteps: this.totalSteps,
            attempts: this.totalAttempts,
            maxAttempts: this.maxAttempts,
            remainingAttempts: this.maxAttempts - this.totalAttempts,
            isCompleted: this.currentStep >= this.totalSteps,
            canContinue: this.totalAttempts < this.maxAttempts && this.currentStep < this.totalSteps,
            apiMode: !this.fallbackMode,
            isProcessing: this.isProcessing
        };
    }
}

// =================================================================================
//  STATE VALIDATOR - Güvenlik katmanı
// =================================================================================

class InteractiveStateValidator {
    validate(stepOptions) {
        if (!stepOptions) return false;
        
        // Temel alanlar kontrolü
        if (!stepOptions.options || !Array.isArray(stepOptions.options)) {
            console.warn('⚠️ State validation: options array eksik');
            return false;
        }
        
        if (stepOptions.options.length < 3) {
            console.warn('⚠️ State validation: yetersiz seçenek sayısı');
            return false;
        }
        
        // Doğru seçenek kontrolü
        const correctOptions = stepOptions.options.filter(opt => opt.isCorrect);
        if (correctOptions.length !== 1) {
            console.warn('⚠️ State validation: doğru seçenek sayısı hatalı');
            return false;
        }
        
        // DisplayId kontrolü
        const displayIds = stepOptions.options.map(opt => opt.displayId);
        const uniqueDisplayIds = [...new Set(displayIds)];
        if (displayIds.length !== uniqueDisplayIds.length) {
            console.warn('⚠️ State validation: duplicate displayId detected');
            return false;
        }
        
        console.log('✅ State validation passed');
        return true;
    }
}

// =================================================================================
//  GELİŞTİRİLMİŞ RENDER FONKSİYONU - Güvenilir UI güncellemeleri
// =================================================================================

export async function renderInteractiveSolutionReliable(solution, containerElement) {
    console.log('🎨 Güvenilir interaktif çözüm render ediliyor...');
    
    if (!solution || !containerElement) {
        throw new Error('Geçersiz parametreler');
    }
    
    try {
        // 1. Reliable manager instance oluştur
        const manager = new ReliableInteractiveSolutionManager();
        
        // 2. Loading state göster
        containerElement.innerHTML = createLoadingHTML();
        
        // 3. Sistemi başlat
        const initResult = await manager.initializeInteractiveSolution(solution);
        console.log('✅ Sistem başlatıldı:', initResult);
        
        // 4. İlk adım seçeneklerini al
        console.log('🔄 İlk adım seçenekleri alınıyor...');
        const firstStepData = await manager.generateStepOptions(0);
        
        if (!firstStepData) {
            throw new Error('İlk adım seçenekleri oluşturulamadı');
        }
        
        console.log('✅ İlk adım seçenekleri hazır:', firstStepData);
        
        // 5. UI'ı render et
        await renderInteractiveStepReliable(firstStepData, containerElement, manager);
        
        console.log('✅ Güvenilir interaktif render tamamlandı');
        return manager;
        
    } catch (error) {
        console.error('❌ Güvenilir render hatası:', error);
        
        // Error state göster
        containerElement.innerHTML = createErrorHTML(error.message);
        throw error;
    }
}

// =================================================================================
//  GÜVENİLİR STEP RENDER - State korumalı
// =================================================================================

async function renderInteractiveStepReliable(stepData, containerElement, manager) {
    console.log('🔧 Güvenilir adım render ediliyor:', stepData);
    
    try {
        // 1. Veri doğrulama
        if (!validateStepData(stepData)) {
            throw new Error('Geçersiz adım verisi');
        }
        
        // 2. HTML oluştur
        const htmlContent = createInteractiveStepHTML(stepData);
        
        // 3. DOM'u güncelle
        containerElement.innerHTML = htmlContent;
        
        // 4. Event listener'ları kur
        setupInteractiveEventListeners(containerElement, manager, stepData);
        
        // 5. Math render (opsiyonel - hata olsa da devam et)
        try {
            if (typeof window.renderMathInContainer === 'function') {
                await window.renderMathInContainer(containerElement, false);
            }
        } catch (renderError) {
            console.warn('⚠️ Math render uyarısı (görmezden gelindi):', renderError);
        }
        
        console.log('✅ Güvenilir adım render tamamlandı');
        
    } catch (error) {
        console.error('❌ Adım render hatası:', error);
        containerElement.innerHTML = createStepErrorHTML(error.message);
        throw error;
    }
}

// =================================================================================
//  EVENT LİSTENER KURULUMU - Güvenilir event handling
// =================================================================================

function setupInteractiveEventListeners(containerElement, manager, stepData) {
    console.log('🔗 Güvenilir event listener kurulumu...');
    
    try {
        // 1. Submit button
        const submitBtn = containerElement.querySelector('#reliable-submit-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await handleReliableSubmission(manager, stepData, containerElement);
            });
        }
        
        // 2. Option selection
        const radioButtons = containerElement.querySelectorAll('input[name="reliable-options"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', () => {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('opacity-50');
                }
                
                // Visual feedback
                updateOptionSelection(containerElement, radio.value);
            });
        });
        
        // 3. Reset button
        const resetBtn = containerElement.querySelector('#reliable-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Baştan başlamak istediğinizden emin misiniz?')) {
                    manager.reset();
                    // Ana menüye dönüş logic buraya
                    if (typeof window.stateManager !== 'undefined') {
                        window.stateManager.setView('summary');
                    }
                }
            });
        }
        
        console.log('✅ Event listener kurulumu tamamlandı');
        
    } catch (error) {
        console.error('❌ Event listener kurulum hatası:', error);
    }
}

// =================================================================================
//  GÜVENİLİR SUBMİSSİON HANDLER - Sağlam hata yönetimi
// =================================================================================

async function handleReliableSubmission(manager, stepData, containerElement) {
    console.log('🎯 Güvenilir submission handler başlatıldı');
    
    const submitBtn = containerElement.querySelector('#reliable-submit-btn');
    const originalText = submitBtn ? submitBtn.textContent : '';
    
    try {
        // 1. Seçim kontrolü
        const selectedRadio = containerElement.querySelector('input[name="reliable-options"]:checked');
        if (!selectedRadio) {
            showNotification(containerElement, 'Lütfen bir seçenek seçin.', 'warning');
            return;
        }
        
        const selectedOptionId = parseInt(selectedRadio.value);
        console.log('📝 Seçilen option ID:', selectedOptionId);
        
        // 2. UI'ı loading state'e geçir
        setSubmitButtonLoading(submitBtn, true);
        disableOptionsTemporarily(containerElement);
        
        // 3. Seçimi değerlendir
        console.log('⚖️ Seçim değerlendiriliyor...');
        const evaluation = manager.evaluateSelection(selectedOptionId);
        
        // 4. Hata kontrolü
        if (evaluation.error) {
            console.error('❌ Değerlendirme hatası:', evaluation.error);
            
            setSubmitButtonLoading(submitBtn, false, originalText);
            enableOptions(containerElement);
            
            if (evaluation.shouldResetToSetup) {
                showCriticalError(containerElement, evaluation.error);
            } else {
                showNotification(containerElement, evaluation.error, 'error');
            }
            return;
        }
        
        console.log('📊 Değerlendirme sonucu:', evaluation);
        
        // 5. Sonucu göster
        displayEvaluationResult(containerElement, evaluation);
        
        // 6. Sonraki adım logic
        if (evaluation.isCorrect) {
            console.log('✅ Doğru cevap işlemi');
            
            if (evaluation.isCompleted) {
                // Tamamlandı
                setTimeout(() => {
                    displayCompletionScreen(containerElement, evaluation.completionStats);
                }, 3000);
                
            } else if (evaluation.nextStepPromise) {
                // Sonraki adıma geç
                console.log('➡️ Sonraki adım yükleniyor...');
                
                setTimeout(async () => {
                    try {
                        showTransitionLoading(containerElement);
                        const nextStepData = await evaluation.nextStepPromise;
                        await renderInteractiveStepReliable(nextStepData, containerElement, manager);
                    } catch (nextStepError) {
                        console.error('❌ Sonraki adım yükleme hatası:', nextStepError);
                        showCriticalError(containerElement, 'Sonraki adım yüklenemedi. Lütfen sayfayı yenileyin.');
                    }
                }, 2500);
            }
            
        } else {
            console.log('❌ Yanlış cevap işlemi');
            
            if (evaluation.shouldResetToSetup) {
                // Deneme hakkı bitti
                setTimeout(() => {
                    showFinalError(containerElement, evaluation.message || 'Deneme hakkınız bitti.');
                }, 3000);
                
            } else if (evaluation.nextStepPromise) {
                // Yeniden başla veya aynı adımı tekrarla
                setTimeout(async () => {
                    try {
                        showTransitionLoading(containerElement);
                        const newStepData = await evaluation.nextStepPromise;
                        await renderInteractiveStepReliable(newStepData, containerElement, manager);
                    } catch (retryStepError) {
                        console.error('❌ Yeniden başlama hatası:', retryStepError);
                        showCriticalError(containerElement, 'Sistem hatası. Lütfen sayfayı yenileyin.');
                    }
                }, 3000);
            }
        }
        
    } catch (error) {
        console.error('❌ Submission handler kritik hatası:', error);
        
        // UI'ı eski haline getir
        setSubmitButtonLoading(submitBtn, false, originalText);
        enableOptions(containerElement);
        
        showCriticalError(containerElement, 'Beklenmeyen hata oluştu. Lütfen sayfayı yenileyin.');
    }
}

// =================================================================================
//  HTML OLUŞTURMA FONKSİYONLARI
// =================================================================================

function createLoadingHTML() {
    return `
        <div class="reliable-loading text-center p-8 bg-blue-50 rounded-lg">
            <div class="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 class="text-lg font-semibold text-blue-800 mb-2">İnteraktif Çözüm Hazırlanıyor</h3>
            <p class="text-blue-600">Güvenilir sistem başlatılıyor...</p>
        </div>
    `;
}

function createErrorHTML(errorMessage) {
    return `
        <div class="reliable-error p-6 bg-red-50 rounded-lg border border-red-200">
            <div class="text-center">
                <div class="text-4xl mb-4">❌</div>
                <h3 class="text-lg font-semibold text-red-800 mb-2">İnteraktif Çözüm Başlatılamadı</h3>
                <p class="text-red-700 mb-4">${errorMessage}</p>
                <button onclick="location.reload()" class="btn btn-primary">Sayfayı Yenile</button>
            </div>
        </div>
    `;
}

function createInteractiveStepHTML(stepData) {
    const progress = (stepData.stepNumber / stepData.totalSteps) * 100;
    
    return `
        <div class="reliable-interactive-step p-6 bg-white rounded-lg shadow-md">
            <!-- Header -->
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold text-gray-800">
                    ${stepData.apiMode ? '🎯' : '🔧'} İnteraktif Çözüm
                    ${stepData.emergencyMode ? ' (Acil Durum Modu)' : ''}
                </h3>
                <div class="text-sm text-gray-500">
                    ${stepData.apiMode ? 'AI Çeldiriciler' : 'Fallback Mod'}
                </div>
            </div>
            
            <!-- Progress -->
            <div class="progress-section mb-6">
                <div class="flex justify-between items-center mb-2">
                    <h4 class="text-lg font-semibold">Adım ${stepData.stepNumber} / ${stepData.totalSteps}</h4>
                    <span class="text-sm text-gray-500">${Math.round(progress)}% tamamlandı</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-3">
                    <div class="bg-blue-500 h-3 rounded-full transition-all duration-500" style="width: ${progress}%"></div>
                </div>
            </div>
            
            <!-- Attempt Info -->
            <div class="attempt-info mb-6 p-4 rounded-lg ${stepData.remainingAttempts <= 1 ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'} border">
                <div class="flex justify-between items-center">
                    <div>
                        <h5 class="font-semibold ${stepData.remainingAttempts <= 1 ? 'text-red-800' : 'text-blue-800'}">
                            Deneme Hakkı: ${stepData.remainingAttempts} / ${stepData.maxAttempts}
                        </h5>
                        <p class="text-sm ${stepData.remainingAttempts <= 1 ? 'text-red-600' : 'text-blue-600'}">
                            ${stepData.remainingAttempts <= 1 ? 'Son deneme hakkınız!' : 'Dikkatli seçim yapın'}
                        </p>
                    </div>
                    <div class="flex gap-1">
                        ${Array.from({length: stepData.maxAttempts}, (_, i) => `
                            <div class="w-3 h-3 rounded-full ${
                                i < stepData.attempts ? 'bg-red-400' : 'bg-gray-200'
                            }"></div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <!-- Step Description -->
            <div class="step-description mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 class="font-semibold text-blue-800 mb-2">Bu Adımda:</h4>
                <p class="text-blue-700">${stepData.stepDescription}</p>
            </div>
            
            <!-- Options -->
            <div class="options-section mb-6">
                <h4 class="font-semibold text-gray-800 mb-4">Doğru çözüm adımını seçin:</h4>
                <div id="reliable-options-container" class="space-y-3">
                    ${createOptionsHTML(stepData.options)}
                </div>
            </div>
            
            <!-- Actions -->
            <div class="actions-section mb-4">
                <button id="reliable-submit-btn" class="btn btn-primary w-full opacity-50" disabled>
                    Seçimi Onayla
                </button>
                <button id="reliable-reset-btn" class="btn btn-secondary w-full mt-2">
                    🔄 Baştan Başla
                </button>
            </div>
            
            <!-- Result Container -->
            <div id="reliable-result-container" class="hidden"></div>
            
            <!-- Notification Container -->
            <div id="reliable-notification-container"></div>
        </div>
    `;
}

function createOptionsHTML(options) {
    return options.map((option, index) => {
        const letter = String.fromCharCode(65 + index);
        return `
            <label class="option-item relative flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-all duration-200" data-option-id="${option.displayId}">
                <input type="radio" name="reliable-options" value="${option.displayId}" class="sr-only">
                <div class="option-letter w-8 h-8 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center font-bold text-sm mr-3 mt-0.5">
                    ${letter}
                </div>
                <div class="option-content flex-1">
                    <div class="option-text text-gray-800 font-medium">${option.text}</div>
                    ${option.latex ? `<div class="option-latex text-sm text-gray-600 mt-1 font-mono">${option.latex}</div>` : ''}
                    ${option.emergency ? '<div class="text-xs text-orange-600 mt-1">⚠️ Acil durum seçeneği</div>' : ''}
                </div>
            </label>
        `;
    }).join('');
}

// =================================================================================
//  UI HELPER FONKSİYONLARI
// =================================================================================

function validateStepData(stepData) {
    if (!stepData || !stepData.options || stepData.options.length < 3) {
        console.error('❌ Step data validation failed');
        return false;
    }
    return true;
}

function setSubmitButtonLoading(button, loading, originalText = 'Seçimi Onayla') {
    if (!button) return;
    
    if (loading) {
        button.disabled = true;
        button.innerHTML = `
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Değerlendiriliyor...
        `;
    } else {
        button.disabled = false;
        button.textContent = originalText;
    }
}

function disableOptionsTemporarily(container) {
    const options = container.querySelectorAll('.option-item');
    options.forEach(option => {
        option.style.pointerEvents = 'none';
        option.style.opacity = '0.7';
    });
}

function enableOptions(container) {
    const options = container.querySelectorAll('.option-item');
    options.forEach(option => {
        option.style.pointerEvents = 'auto';
        option.style.opacity = '1';
    });
}

function updateOptionSelection(container, selectedValue) {
    const options = container.querySelectorAll('.option-item');
    options.forEach(option => {
        option.classList.remove('border-blue-500', 'bg-blue-50');
        if (option.dataset.optionId === selectedValue) {
            option.classList.add('border-blue-500', 'bg-blue-50');
        }
    });
}

function showNotification(container, message, type = 'info') {
    const notificationContainer = container.querySelector('#reliable-notification-container');
    if (!notificationContainer) return;
    
    const colors = {
        info: 'bg-blue-100 border-blue-300 text-blue-800',
        warning: 'bg-yellow-100 border-yellow-300 text-yellow-800',
        error: 'bg-red-100 border-red-300 text-red-800',
        success: 'bg-green-100 border-green-300 text-green-800'
    };
    
    notificationContainer.innerHTML = `
        <div class="notification p-3 rounded-lg border ${colors[type]} mb-4">
            ${message}
        </div>
    `;
    
    setTimeout(() => {
        notificationContainer.innerHTML = '';
    }, 5000);
}

function showTransitionLoading(container) {
    const resultContainer = container.querySelector('#reliable-result-container');
    if (!resultContainer) return;
    
    resultContainer.className = '';
    resultContainer.innerHTML = `
        <div class="transition-loading text-center p-4 bg-blue-50 rounded-lg">
            <div class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p class="text-blue-700 text-sm">Sonraki adım yükleniyor...</p>
        </div>
    `;
}

function displayEvaluationResult(container, evaluation) {
    const resultContainer = container.querySelector('#reliable-result-container');
    if (!resultContainer) return;
    
    resultContainer.className = '';
    
    if (evaluation.isCorrect) {
        resultContainer.innerHTML = `
            <div class="evaluation-result success p-4 rounded-lg bg-green-100 border border-green-300 mb-4">
                <div class="flex items-center gap-3">
                    <div class="text-3xl">✅</div>
                    <div>
                        <h4 class="font-semibold text-green-800">Doğru!</h4>
                        <p class="text-green-700 text-sm">${evaluation.explanation}</p>
                        ${evaluation.isCompleted ? 
                            '<p class="text-green-600 text-sm mt-2">🎉 Tüm adımları tamamladınız!</p>' :
                            '<p class="text-green-600 text-sm mt-2">➡️ Sonraki adıma geçiliyor...</p>'
                        }
                    </div>
                </div>
            </div>
        `;
    } else {
        const isLastAttempt = evaluation.remainingAttempts <= 0;
        resultContainer.innerHTML = `
            <div class="evaluation-result error p-4 rounded-lg ${isLastAttempt ? 'bg-red-100 border-red-300' : 'bg-orange-100 border-orange-300'} mb-4">
                <div class="flex items-center gap-3">
                    <div class="text-3xl">${isLastAttempt ? '❌' : '⚠️'}</div>
                    <div>
                        <h4 class="font-semibold ${isLastAttempt ? 'text-red-800' : 'text-orange-800'}">
                            ${isLastAttempt ? 'Deneme Hakkınız Bitti!' : 'Yanlış Seçim'}
                        </h4>
                        <p class="${isLastAttempt ? 'text-red-700' : 'text-orange-700'} text-sm">${evaluation.explanation}</p>
                        <p class="${isLastAttempt ? 'text-red-600' : 'text-orange-600'} text-sm mt-1">
                            Kalan deneme: ${evaluation.remainingAttempts}
                        </p>
                        ${evaluation.message ? `<p class="text-sm mt-2 font-medium">${evaluation.message}</p>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
}

// Export edilen fonksiyon
