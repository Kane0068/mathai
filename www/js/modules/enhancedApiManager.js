// =================================================================================
//  Gelişmiş API Hata Yönetimi - 503 Model Overload Optimized
//  Gemini API aşırı yüklenme durumuna özel çözümler
// =================================================================================

export class EnhancedApiManager {
    constructor() {
        this.maxRetries = 3;
        this.baseDelay = 2000; // 2 saniye başlangıç
        this.maxDelay = 30000; // 30 saniye max
        this.overloadCooldown = 60000; // 60 saniye overload cooldown
        this.consecutiveFailures = 0;
        this.lastSuccessTime = Date.now();
        this.isInOverloadMode = false;
        this.overloadStartTime = null;
        
        // Request queue sistemi
        this.requestQueue = [];
        this.isProcessingQueue = false;
        this.maxQueueSize = 5;
        
        // Statistics
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            overloadCount: 0,
            averageResponseTime: 0
        };
    }

    // =================================================================================
    //  ANA API ÇAĞRISI - 503 Optimized
    // =================================================================================
    
    async makeApiCall(payload, priority = 'normal') {
        const requestId = this.generateRequestId();
        console.log(`🚀 API Request ${requestId} başlatılıyor (Priority: ${priority})`);
        
        this.stats.totalRequests++;
        
        // Overload mode kontrolü
        if (this.isInOverloadMode) {
            const timeSinceOverload = Date.now() - this.overloadStartTime;
            if (timeSinceOverload < this.overloadCooldown) {
                console.log(`⏱️ Overload mode aktif - ${Math.ceil((this.overloadCooldown - timeSinceOverload) / 1000)}s kaldı`);
                throw new Error(`API aşırı yüklenmiş. ${Math.ceil((this.overloadCooldown - timeSinceOverload) / 1000)} saniye sonra tekrar deneyin.`);
            } else {
                console.log('✅ Overload cooldown bitti, normal mod');
                this.exitOverloadMode();
            }
        }
        
        // Queue sistemi (yüksek öncelik için)
        if (priority === 'high' || !this.isProcessingQueue) {
            return await this.executeApiCall(payload, requestId);
        } else {
            return await this.queueApiCall(payload, requestId, priority);
        }
    }
    
    async executeApiCall(payload, requestId) {
        const startTime = Date.now();
        let lastError = null;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                console.log(`🔄 Request ${requestId} - Deneme ${attempt}/${this.maxRetries}`);
                
                // Adaptive delay - consecutive failures arttıkça delay artar
                if (attempt > 1) {
                    const delay = this.calculateDelay(attempt);
                    console.log(`⏱️ ${delay}ms bekleniyor...`);
                    await this.delay(delay);
                }
                
                // Request timeout - adaptive
                const timeout = this.calculateTimeout();
                const result = await this.performRequest(payload, timeout);
                
                // Başarı durumu
                const responseTime = Date.now() - startTime;
                this.handleSuccess(responseTime);
                
                console.log(`✅ Request ${requestId} başarılı - ${responseTime}ms`);
                return result;
                
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Request ${requestId} Deneme ${attempt} başarısız:`, error.message);
                
                // 503 özel handling
                if (this.is503Error(error)) {
                    console.log('🔥 503 Model Overload detected');
                    this.handle503Error(attempt);
                    
                    // 503 durumunda daha uzun bekle
                    if (attempt < this.maxRetries) {
                        const overloadDelay = this.calculateOverloadDelay(attempt);
                        console.log(`🔥 Overload delay: ${overloadDelay / 1000}s`);
                        await this.delay(overloadDelay);
                    }
                    continue;
                }
                
                // Diğer hatalar için normal retry logic
                if (this.isRetryableError(error)) {
                    this.consecutiveFailures++;
                    continue;
                } else {
                    // Non-retryable error, immediately fail
                    console.error(`❌ Non-retryable error for ${requestId}:`, error);
                    this.handleFailure();
                    throw error;
                }
            }
        }
        
        // Tüm denemeler başarısız
        console.error(`❌ Request ${requestId} tüm denemeler başarısız`);
        this.handleFailure();
        
        // 503 error ise overload mode'a geç
        if (lastError && this.is503Error(lastError)) {
            this.enterOverloadMode();
        }
        
        throw lastError;
    }
    
    // =================================================================================
    //  503 OVERLOAD ÖZEL HANDLİNG
    // =================================================================================
    
    is503Error(error) {
        return error.message.includes('503') || 
               error.message.includes('overloaded') ||
               error.message.includes('UNAVAILABLE');
    }
    
    handle503Error(attempt) {
        this.stats.overloadCount++;
        
        // Consecutive 503 errors tracking
        if (attempt >= 2) {
            console.log('🔥 Multiple 503 errors - entering overload handling');
        }
    }
    
    calculateOverloadDelay(attempt) {
        // 503 için exponential backoff + jitter
        const baseOverloadDelay = 5000; // 5 saniye başlangıç
        const exponential = baseOverloadDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 2000; // 0-2 saniye random
        return Math.min(exponential + jitter, this.maxDelay);
    }
    
    enterOverloadMode() {
        console.log('🔥 Overload Mode AÇIK - 60 saniye cooldown');
        this.isInOverloadMode = true;
        this.overloadStartTime = Date.now();
        
        // User notification
        this.notifyOverloadMode();
    }
    
    exitOverloadMode() {
        console.log('✅ Overload Mode KAPALI');
        this.isInOverloadMode = false;
        this.overloadStartTime = null;
        this.consecutiveFailures = 0;
    }
    
    notifyOverloadMode() {
        // UI notification için event dispatch
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('api-overload', {
                detail: {
                    message: 'AI sistem yoğunluğu nedeniyle 1 dakika bekleme süresi',
                    cooldownSeconds: Math.ceil(this.overloadCooldown / 1000)
                }
            }));
        }
    }
    
    // =================================================================================
    //  REQUEST EXECUTION
    // =================================================================================
    
    async performRequest(payload, timeout) {
        const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyDbjH9TXIFLxWH2HuYJlqIFO7Alhk1iQQs`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'MathAI-App/1.0'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            // Response handling
            if (!response.ok) {
                let errorBody = '';
                try {
                    errorBody = await response.text();
                } catch (e) {
                    errorBody = 'Response body okunamadı';
                }
                
                throw new Error(`API Error: ${response.status} - ${response.statusText}. Body: ${errorBody}`);
            }
            
            const data = await response.json();
            return this.processApiResponse(data);
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error(`Request timeout (${timeout}ms)`);
            }
            
            throw error;
        }
    }
    
    processApiResponse(data) {
        // Response validation
        if (!data) {
            throw new Error('API boş response döndürdü');
        }
        
        if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
            throw new Error('API geçersiz candidates döndürdü');
        }
        
        const candidate = data.candidates[0];
        if (!candidate?.content?.parts?.[0]?.text) {
            throw new Error('API geçersiz content structure döndürdü');
        }
        
        const content = candidate.content.parts[0].text;
        return this.parseJsonResponse(content);
    }
    
    parseJsonResponse(content) {
        try {
            // JSON extraction with multiple strategies
            const strategies = [
                // Strategy 1: Direct JSON match
                () => {
                    const match = content.match(/\{[\s\S]*\}/);
                    return match ? JSON.parse(match[0]) : null;
                },
                
                // Strategy 2: Code block extraction
                () => {
                    const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
                    return codeBlockMatch ? JSON.parse(codeBlockMatch[1]) : null;
                },
                
                // Strategy 3: Line-by-line assembly
                () => {
                    const lines = content.split('\n').filter(line => 
                        line.trim().includes('{') || 
                        line.trim().includes('}') || 
                        line.includes('"') || 
                        line.includes(':')
                    );
                    if (lines.length > 0) {
                        const jsonString = lines.join('\n');
                        return JSON.parse(jsonString);
                    }
                    return null;
                }
            ];
            
            for (const strategy of strategies) {
                try {
                    const result = strategy();
                    if (result) {
                        console.log('✅ JSON parse başarılı');
                        return result;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            throw new Error('JSON formatı hiçbir strateji ile parse edilemedi');
            
        } catch (error) {
            console.error('JSON parse hatası:', error.message);
            console.error('Content:', content.substring(0, 300));
            throw new Error(`JSON parse hatası: ${error.message}`);
        }
    }
    
    // =================================================================================
    //  QUEUE SİSTEMİ
    // =================================================================================
    
    async queueApiCall(payload, requestId, priority) {
        return new Promise((resolve, reject) => {
            const queueItem = {
                payload,
                requestId,
                priority,
                resolve,
                reject,
                timestamp: Date.now()
            };
            
            if (this.requestQueue.length >= this.maxQueueSize) {
                reject(new Error('Request queue full'));
                return;
            }
            
            this.requestQueue.push(queueItem);
            this.processQueue();
        });
    }
    
    async processQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0) return;
        
        this.isProcessingQueue = true;
        
        while (this.requestQueue.length > 0) {
            const item = this.requestQueue.shift();
            
            try {
                const result = await this.executeApiCall(item.payload, item.requestId);
                item.resolve(result);
            } catch (error) {
                item.reject(error);
            }
            
            // Queue items arasında kısa bekleme
            await this.delay(1000);
        }
        
        this.isProcessingQueue = false;
    }
    
    // =================================================================================
    //  ADAPTIVE CALCULATIONS
    // =================================================================================
    
    calculateDelay(attempt) {
        // Exponential backoff with jitter
        const exponential = this.baseDelay * Math.pow(2, attempt - 2);
        const jitter = Math.random() * 1000;
        const adaptiveMultiplier = Math.min(this.consecutiveFailures * 0.5 + 1, 3);
        
        return Math.min(exponential * adaptiveMultiplier + jitter, this.maxDelay);
    }
    
    calculateTimeout() {
        // Adaptive timeout based on recent performance
        const baseTimeout = 30000; // 30 saniye
        const adaptiveMultiplier = this.consecutiveFailures > 0 ? 1.5 : 1;
        return Math.min(baseTimeout * adaptiveMultiplier, 60000); // Max 60 saniye
    }
    
    isRetryableError(error) {
        const retryablePatterns = [
            '503', '502', '504', '429',
            'timeout', 'network', 'connection',
            'UNAVAILABLE', 'overloaded'
        ];
        
        return retryablePatterns.some(pattern => 
            error.message.toLowerCase().includes(pattern.toLowerCase())
        );
    }
    
    // =================================================================================
    //  SUCCESS/FAILURE HANDLİNG
    // =================================================================================
    
    handleSuccess(responseTime) {
        this.consecutiveFailures = 0;
        this.lastSuccessTime = Date.now();
        this.stats.successfulRequests++;
        
        // Update average response time
        this.updateAverageResponseTime(responseTime);
        
        // Exit overload mode if in it
        if (this.isInOverloadMode) {
            this.exitOverloadMode();
        }
    }
    
    handleFailure() {
        this.consecutiveFailures++;
        this.stats.failedRequests++;
    }
    
    updateAverageResponseTime(responseTime) {
        if (this.stats.averageResponseTime === 0) {
            this.stats.averageResponseTime = responseTime;
        } else {
            this.stats.averageResponseTime = 
                (this.stats.averageResponseTime * 0.8) + (responseTime * 0.2);
        }
    }
    
    // =================================================================================
    //  UTILITY FONKSİYONLAR
    // =================================================================================
    
    generateRequestId() {
        return Math.random().toString(36).substr(2, 9);
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    getStats() {
        const successRate = this.stats.totalRequests > 0 
            ? (this.stats.successfulRequests / this.stats.totalRequests) * 100 
            : 0;
            
        return {
            ...this.stats,
            successRate: Math.round(successRate * 100) / 100,
            consecutiveFailures: this.consecutiveFailures,
            isInOverloadMode: this.isInOverloadMode,
            timeSinceLastSuccess: Date.now() - this.lastSuccessTime
        };
    }
    
    reset() {
        this.consecutiveFailures = 0;
        this.isInOverloadMode = false;
        this.overloadStartTime = null;
        this.requestQueue = [];
        this.isProcessingQueue = false;
        
        console.log('🔄 ApiManager reset');
    }
}

// =================================================================================
//  FALLBACK ÇELDİRİCİ SİSTEMİ - API 503 için optimize
// =================================================================================

export class AdvancedFallbackGenerator {
    constructor() {
        this.patterns = this.initializeMathPatterns();
        this.cache = new Map();
    }
    
    initializeMathPatterns() {
        return {
            // Matematik hata türleri
            signError: (latex) => this.generateSignError(latex),
            calcError: (latex) => this.generateCalculationError(latex),
            orderError: (latex) => this.generateOrderError(latex),
            fractionError: (latex) => this.generateFractionError(latex),
            powerError: (latex) => this.generatePowerError(latex)
        };
    }
    
    generateFallbackDistractors(stepData, stepIndex) {
        console.log(`🔧 Advanced fallback çeldiriciler - Adım ${stepIndex + 1}`);
        
        const cacheKey = `fallback-${stepIndex}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        const correctLatex = stepData.cozum_lateks || '';
        const distractors = [];
        
        // Pattern-based distractor generation
        const errorTypes = Object.keys(this.patterns);
        for (let i = 0; i < 2 && i < errorTypes.length; i++) {
            const errorType = errorTypes[i];
            const generator = this.patterns[errorType];
            
            try {
                const distractor = generator(correctLatex);
                distractors.push({
                    id: i + 1,
                    text: distractor.text,
                    latex: distractor.latex,
                    isCorrect: false,
                    explanation: distractor.explanation,
                    commonMistake: distractor.commonMistake,
                    apiGenerated: false,
                    fallbackGenerated: true,
                    displayId: i + 1
                });
            } catch (error) {
                console.warn(`Fallback ${errorType} generator hatası:`, error);
                
                // Emergency distractor
                distractors.push({
                    id: i + 1,
                    text: `Alternatif yaklaşım ${i + 1}`,
                    latex: this.generateEmergencyLatex(correctLatex, i),
                    isCorrect: false,
                    explanation: "Bu yaklaşımı kontrol ediniz.",
                    commonMistake: "Genel hata",
                    emergency: true,
                    displayId: i + 1
                });
            }
        }
        
        // Ensure we have exactly 2 distractors
        while (distractors.length < 2) {
            const index = distractors.length;
            distractors.push({
                id: index + 1,
                text: `Hesaplama kontrolü ${index + 1}`,
                latex: this.generateEmergencyLatex(correctLatex, index),
                isCorrect: false,
                explanation: "Bu hesaplamayı kontrol ediniz.",
                commonMistake: "Hesap kontrolü",
                emergency: true,
                displayId: index + 1
            });
        }
        
        this.cache.set(cacheKey, distractors);
        return distractors;
    }
    
    generateSignError(latex) {
        let errorLatex = latex;
        if (latex.includes('+')) {
            errorLatex = latex.replace(/\+/g, '-');
        } else if (latex.includes('-')) {
            errorLatex = latex.replace(/-/g, '+');
        } else {
            errorLatex = latex.replace(/(\d+)/g, (match) => {
                const num = parseInt(match);
                return isNaN(num) ? match : (-num).toString();
            });
        }
        
        return {
            text: "İşaret hatası yapılmış hesaplama",
            latex: errorLatex,
            explanation: "İşaret hatası yapılmıştır.",
            commonMistake: "İşaret karışıklığı"
        };
    }
    
    generateCalculationError(latex) {
        const errorLatex = latex.replace(/(\d+)/g, (match) => {
            const num = parseInt(match);
            if (!isNaN(num)) {
                const error = Math.floor(Math.random() * 5) + 1;
                const newNum = Math.random() > 0.5 ? num + error : Math.max(1, num - error);
                return newNum.toString();
            }
            return match;
        });
        
        return {
            text: "Aritmetik hesaplama hatası",
            latex: errorLatex,
            explanation: "Hesaplama işleminde hata yapılmıştır.",
            commonMistake: "Hesap hatası"
        };
    }
    
    generateOrderError(latex) {
        // İşlem sırası hatası simüle et
        let errorLatex = latex;
        if (latex.includes('*') && latex.includes('+')) {
            errorLatex = latex.replace(/(\d+)\s*\*\s*(\d+)\s*\+\s*(\d+)/, '$1 + $2 * $3');
        } else if (latex.includes('/') && latex.includes('-')) {
            errorLatex = latex.replace(/(\d+)\s*\/\s*(\d+)\s*-\s*(\d+)/, '$1 - $2 / $3');
        }
        
        return {
            text: "İşlem sırası hatası",
            latex: errorLatex,
            explanation: "İşlem önceliği yanlış uygulanmıştır.",
            commonMistake: "İşlem sırası"
        };
    }
    
    generateFractionError(latex) {
        if (latex.includes('\\frac')) {
            // Kesir hatası - pay/payda karışıklığı
            const errorLatex = latex.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '\\frac{$2}{$1}');
            return {
                text: "Kesir pay/payda karışıklığı",
                latex: errorLatex,
                explanation: "Pay ve payda yerleri karıştırılmıştır.",
                commonMistake: "Kesir hatası"
            };
        }
        
        return this.generateCalculationError(latex);
    }
    
    generatePowerError(latex) {
        if (latex.includes('^')) {
            // Üs hatası
            const errorLatex = latex.replace(/\^(\d+)/g, (match, exp) => {
                const num = parseInt(exp);
                const newExp = Math.random() > 0.5 ? num + 1 : Math.max(1, num - 1);
                return `^${newExp}`;
            });
            
            return {
                text: "Üs hesaplama hatası",
                latex: errorLatex,
                explanation: "Üs hesaplamasında hata yapılmıştır.",
                commonMistake: "Üs hatası"
            };
        }
        
        return this.generateCalculationError(latex);
    }
    
    generateEmergencyLatex(originalLatex, index) {
        if (!originalLatex) {
            return `$$\\text{Kontrol ${index + 1}}$$`;
        }
        
        // Basit transformasyon
        const simple = originalLatex.replace(/[{}\\]/g, '').replace(/\$+/g, '');
        return `$$\\text{${simple} kontrolü}$$`;
    }
}

// =================================================================================
//  EXPORTS
// =================================================================================

//export { EnhancedApiManager, AdvancedFallbackGenerator };