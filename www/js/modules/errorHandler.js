// errorHandler.js
// Gelişmiş ve birleştirilmiş hata yönetimi, desen tanıma ve kurtarma stratejileri.
// Bu modül, AdvancedErrorHandler ve EnhancedErrorHandler sınıflarını tek bir
// kapsamlı sınıf altında birleştirir.

import { logError as logErrorToFile, sleep } from './utils.js';

export class EnhancedErrorHandler {
    constructor() {
        // Temel hata yönetimi özellikleri
        this.maxRetries = 2; // Maksimum deneme sayısı
        this.retryDelay = 1500; // Denemeler arası bekleme süresi

        // Gelişmiş desen tanıma ve kurtarma özellikleri
        this.errorPatterns = new Map();
        this.recoveryStrategies = new Map();
        this.errorMetrics = {
            totalErrors: 0,
            recoveredErrors: 0,
            criticalErrors: 0,
            errorsByType: {}
        };

        // Kurulum metodlarını çağır
        this.setupGlobalErrorHandlers();
        this.setupErrorPatterns();
        this.setupRecoveryStrategies();
    }

    /**
     * Tüm global ve yakalanamayan hataları dinlemek için olay dinleyicileri kurar.
     */
    setupGlobalErrorHandlers() {
        // Yakalanamayan promise hataları
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.logError('UNHANDLED_PROMISE_REJECTION', event.reason);
            this.showUserError('UNKNOWN_ERROR', { message: 'Beklenmedik bir sorun oluştu.' });
            event.preventDefault();
        });

        // Global JavaScript hataları
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.logError('GLOBAL_ERROR', event.error);
        });

        // Ağ bağlantısı durumunu dinle
        if (typeof window !== 'undefined') {
            window.addEventListener('offline', () => this.handleNetworkChange(false));
            window.addEventListener('online', () => this.handleNetworkChange(true));
        }
    }

    /**
     * Hata mesajlarındaki kalıpları tanımak için regex desenleri tanımlar.
     */
    setupErrorPatterns() {
        this.errorPatterns.set('canvas', {
            patterns: [/canvas/i, /getContext/i, /drawImage/i, /toDataURL/i],
            severity: 'medium',
            category: 'canvas'
        });
        this.errorPatterns.set('math', {
            patterns: [/mathjax/i, /katex/i, /latex/i, /render/i, /math.*render/i],
            severity: 'medium',
            category: 'math'
        });
        this.errorPatterns.set('state', {
            patterns: [/state/i, /setState/i, /getState/i, /subscribe/i],
            severity: 'high',
            category: 'state'
        });
        this.errorPatterns.set('network', {
            patterns: [/fetch/i, /network/i, /api/i, /xhr/i, /timeout/i],
            severity: 'high',
            category: 'network'
        });
        this.errorPatterns.set('interactive', {
            patterns: [/interactive/i, /solution.*manager/i, /step.*option/i, /evaluation/i],
            severity: 'medium',
            category: 'interactive'
        });
    }

    /**
     * Belirli hata kategorileri için kurtarma stratejileri ve eylemleri tanımlar.
     */
    setupRecoveryStrategies() {
        this.recoveryStrategies.set('canvas', {
            name: 'Canvas Recovery',
            actions: [() => this.reinitializeCanvas(), () => this.fallbackToTextInput(), () => this.disableCanvasFeatures()]
        });
        this.recoveryStrategies.set('math', {
            name: 'Math Rendering Recovery',
            actions: [() => this.switchMathRenderer(), () => this.clearMathCache(), () => this.fallbackToPlainText()]
        });
        this.recoveryStrategies.set('state', {
            name: 'State Recovery',
            actions: [() => this.restoreStateFromBackup(), () => this.resetToSafeState(), () => this.emergencyStateReset()]
        });
        this.recoveryStrategies.set('network', {
            name: 'Network Recovery',
            actions: [() => this.retryNetworkRequest(), () => this.switchToOfflineMode(), () => this.showNetworkError()]
        });
        this.recoveryStrategies.set('interactive', {
            name: 'Interactive Solution Recovery',
            actions: [() => this.reinitializeInteractiveSystem(), () => this.fallbackToManualSolution(), () => this.redirectToStaticSolution()]
        });
    }

    /**
     * API veya diğer kritik hataları yöneten birleşik ana metod.
     * Analiz, kurtarma denemesi, kullanıcı bildirimi ve fallback adımlarını içerir.
     * @param {Error} error - Yakalanan hata nesnesi.
     * @param {Object} context - Hatanın oluştuğu bağlam.
     * @returns {Promise<Object|null>} - Fallback verisi veya yeniden deneme sonucu.
     */
    async handleError(error, context = { operation: null, payload: null, isCritical: false }) {
        try {
            this.errorMetrics.totalErrors++;

            // Adım 1: Gelişmiş hata analizi yap
            const analysis = this.analyzeError(error, context);
            console.error('🔍 Enhanced Error Analysis:', {
                error: error.message,
                category: analysis.category,
                severity: analysis.severity,
                context,
                analysis
            });
            this.updateErrorMetrics(analysis);

            // Adım 2: Kurtarma stratejilerini dene
            const recovered = this.attemptRecovery(error, analysis, context);
            if (recovered) {
                this.errorMetrics.recoveredErrors++;
                console.log('✅ Error recovery successful');
                // Kurtarma başarılıysa, hatayı daha fazla yayma ve null dön.
                return null;
            }
            
            if (analysis.severity === 'high') {
                this.errorMetrics.criticalErrors++;
                this.handleCriticalError(error, analysis, context);
            }

            // Adım 3: Temel hata sınıflandırması ve kullanıcıya gösterme (kurtarma başarısızsa)
            const errorType = this.classifyError(error);
            const errorInfo = {
                type: errorType,
                message: error.message,
                context: context.operation,
                timestamp: new Date().toISOString(),
            };

            this.logError(errorType, errorInfo);
            this.showUserError(errorType, errorInfo);

            // Adım 4: Fallback verisi döndür
            return this.getFallbackData(errorType);

        } catch (handlerError) {
            console.error('❌ Error handler itself failed:', handlerError);
            this.emergencyErrorHandling(error, handlerError);
            return null;
        }
    }

    /**
     * Gelişmiş desen tanıma kullanarak hatayı analiz eder.
     * @param {Error} error - Hata nesnesi.
     * @param {Object} context - Hata bağlamı.
     * @returns {Object} - Analiz sonucu.
     */
    analyzeError(error, context) {
        const analysis = {
            category: 'unknown',
            severity: 'low',
            patterns: [],
            recoverable: true,
            confidence: 0
        };
        const errorMessage = error.message || error.toString();

        for (const [categoryName, categoryData] of this.errorPatterns) {
            const matchCount = categoryData.patterns.filter(pattern => pattern.test(errorMessage)).length;
            if (matchCount > 0) {
                const confidence = matchCount / categoryData.patterns.length;
                if (confidence > analysis.confidence) {
                    analysis.category = categoryName;
                    analysis.severity = categoryData.severity;
                    analysis.confidence = confidence;
                    analysis.patterns = categoryData.patterns.filter(p => p.test(errorMessage));
                }
            }
        }

        if (context.isCritical) analysis.severity = 'high';
        if (context.retryCount && context.retryCount > 2) {
            analysis.severity = 'high';
            analysis.recoverable = false;
        }
        return analysis;
    }

    /**
     * Kullanıcı mesajları ve temel mantık için hatayı sınıflandırır.
     * @param {Error} error - Hata nesnesi.
     * @returns {String} - Hata tipi.
     */
    classifyError(error) {
        const message = error.message?.toLowerCase() || '';
        const status = error.status || 0;

        if (!navigator.onLine) return 'NETWORK_ERROR';
        if (status === 429 || message.includes('rate limit')) return 'RATE_LIMIT_EXCEEDED';
        if (status === 401 || status === 403) return 'AUTHENTICATION_ERROR';
        if (status >= 500) return 'SERVER_ERROR';
        if (message.includes('timeout') || error.name === 'AbortError') return 'TIMEOUT_ERROR';
        if (message.includes('json') || message.includes('parse')) return 'PARSE_ERROR';
        
        return 'UNKNOWN_ERROR';
    }

    /**
     * Tanımlanan kurtarma stratejisini çalıştırmayı dener.
     * @param {Error} error - Hata nesnesi.
     * @param {Object} analysis - `analyzeError`'dan gelen analiz.
     * @param {Object} context - Hata bağlamı.
     * @returns {boolean} - Kurtarmanın başarılı olup olmadığı.
     */
    attemptRecovery(error, analysis, context) {
        const strategy = this.recoveryStrategies.get(analysis.category);
        if (!strategy || !analysis.recoverable) {
            console.log('⚠️ No recovery strategy available or error not recoverable');
            return false;
        }

        console.log(`🔄 Attempting recovery with strategy: ${strategy.name}`);
        for (let i = 0; i < strategy.actions.length; i++) {
            try {
                const action = strategy.actions[i];
                if (action() !== false) {
                    console.log(`✅ Recovery action ${i + 1} successful`);
                    return true;
                }
            } catch (recoveryError) {
                console.warn(`⚠️ Recovery action ${i + 1} failed:`, recoveryError);
            }
        }
        console.error('❌ All recovery actions failed');
        return false;
    }
    
    /**
     * Hata tipine göre kullanıcıya bir mesaj gösterir.
     * @param {String} errorType - Hata tipi.
     * @param {Object} errorInfo - Hata hakkında detaylar.
     */
    showUserError(errorType, errorInfo) {
        const messages = {
            RATE_LIMIT_EXCEEDED: 'Günlük kullanım limitinize ulaştınız veya çok sık istek gönderiyorsunuz. Lütfen daha sonra tekrar deneyin.',
            NETWORK_ERROR: 'İnternet bağlantınız yok gibi görünüyor. Lütfen bağlantınızı kontrol edin.',
            SERVER_ERROR: 'Sunucularımızda geçici bir sorun var. Ekibimiz ilgileniyor, lütfen biraz sonra tekrar deneyin.',
            TIMEOUT_ERROR: 'İstek çok uzun sürdü ve zaman aşımına uğradı. İnternet bağlantınızı kontrol edip tekrar deneyin.',
            PARSE_ERROR: 'Sunucudan beklenmedik bir yanıt alındı. Lütfen tekrar deneyin.',
            AUTHENTICATION_ERROR: 'Yetkilendirme hatası. Lütfen yeniden giriş yapmayı deneyin.',
            UNKNOWN_ERROR: 'Beklenmeyen bir hata oluştu. Sorun devam ederse lütfen bize bildirin.'
        };
        const message = messages[errorType] || messages['UNKNOWN_ERROR'];
        
        if (typeof window.showError === 'function') {
            window.showError(message, true);
        } else {
            window.dispatchEvent(new CustomEvent('show-error-message', {
                detail: { message: message, isCritical: true }
            }));
        }
    }

    /**
     * Belirli hata türleri için bir geri dönüş (fallback) veri nesnesi sağlar.
     * @param {String} errorType - Hata tipi.
     * @returns {Object|null}
     */
    getFallbackData(errorType) {
        const fallbackErrorTypes = ['SERVER_ERROR', 'PARSE_ERROR', 'TIMEOUT_ERROR', 'UNKNOWN_ERROR'];
        if (fallbackErrorTypes.includes(errorType)) {
            return {
                problemOzeti: {
                    verilenler: ["Problem analiz edilirken bir sorun oluştu."],
                    istenen: "Lütfen soruyu daha net bir şekilde tekrar deneyin."
                },
                adimlar: [],
                tamCozumLateks: ["\\text{Çözüm adımları üretilemedi.}"],
                _error: 'Fallback data due to ' + errorType,
                _fallback: true
            };
        }
        return null;
    }
    
    /**
     * Hataları konsola ve potansiyel olarak harici bir loglama servisine kaydeder.
     * @param {String} type - Hatanın sınıflandırılmış tipi.
     * @param {Error|Object} error - Hata nesnesi veya bilgisi.
     */
    logError(type, error) {
        console.group(`[Hata Yönetimi] Tip: ${type}`);
        console.error(error);
        console.groupEnd();
        // İleride buraya Sentry, LogRocket gibi bir servise hata gönderme kodu eklenebilir.
        // logErrorToFile(type, error);
    }
    
    /**
     * Ağ bağlantısı durumundaki değişiklikleri yönetir ve bir bildirim gösterir.
     * @param {boolean} isOnline - Ağ bağlantısının durumu.
     */
    handleNetworkChange(isOnline) {
        let notification = document.getElementById('network-status-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'network-status-notification';
            notification.className = 'fixed top-4 right-4 text-white px-4 py-2 rounded-lg z-50 transition-transform duration-300 translate-x-full';
            document.body.appendChild(notification);
        }
        if (isOnline) {
            notification.textContent = 'İnternet bağlantısı yeniden kuruldu!';
            notification.classList.remove('bg-red-600');
            notification.classList.add('bg-green-600');
        } else {
            notification.textContent = 'İnternet bağlantınız kesildi.';
            notification.classList.remove('bg-green-600');
            notification.classList.add('bg-red-600');
        }
        notification.classList.remove('translate-x-full');
        setTimeout(() => {
            notification.classList.add('translate-x-full');
        }, 3000);
    }
    
    // --- Kurtarma Eylemleri ---
    
    retryNetworkRequest() {
        console.log('🔄 Network request retry attempted');
        if (window.lastApiCall) {
            console.log('🔄 Retrying last API call...');
            return window.lastApiCall();
        }
        return false;
    }

    switchToOfflineMode() {
        console.log('🔄 Switching to offline mode...');
        if (window.showInViewNotification) {
            window.showInViewNotification('İnternet bağlantısı sorunlu. Lütfen bağlantınızı kontrol edin.', 'warning', false);
        }
        if (window.stateManager) {
            window.stateManager.setError('Çevrimdışı mod - bağlantınızı kontrol edin');
        }
        return true;
    }

    showNetworkError() {
        console.log('🔄 Showing network error...');
        if (window.showError) {
            window.showError('Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edip tekrar deneyin.', true, () => window.location.reload());
            return true;
        }
        return false;
    }

    reinitializeCanvas() {
        console.log('🔄 Reinitializing canvas...');
        if (window.canvasManager) {
            ['handwritingCanvas', 'guide-handwriting-canvas'].forEach(id => {
                const el = document.getElementById(id);
                if(el) window.canvasManager.initCanvas(id);
            });
            return true;
        }
        return false;
    }

    fallbackToTextInput() {
        console.log('🔄 Falling back to text input...');
        if (window.stateManager) {
            window.stateManager.setHandwritingInputType('keyboard');
        }
        if (window.showInViewNotification) {
            window.showInViewNotification('Canvas hatası nedeniyle klavye moduna geçildi.', 'warning', true, 3000);
        }
        return true;
    }

    disableCanvasFeatures() {
        console.log('🔄 Disabling canvas features...');
        document.querySelectorAll('button[id*="canvas"], button[data-mode="canvas"]').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.title = 'Canvas özelliği geçici olarak devre dışı';
        });
        return true;
    }
    
    switchMathRenderer() {
        console.log('🔄 Switching math renderer...');
        if (window.enhancedMathRenderer) {
            window.enhancedMathRenderer.initializeSystem();
            return true;
        }
        return false;
    }

    clearMathCache() {
        console.log('🔄 Clearing math cache...');
        if (window.enhancedMathRenderer) {
            window.enhancedMathRenderer.clearCache();
        }
        document.querySelectorAll('.math-rendered').forEach(el => el.classList.remove('math-rendered'));
        return true;
    }

    fallbackToPlainText() {
        console.log('🔄 Falling back to plain text...');
        document.querySelectorAll('[data-latex]').forEach(el => {
            el.textContent = el.dataset.latex;
            el.style.fontFamily = 'monospace';
        });
        if (window.showInViewNotification) {
            window.showInViewNotification('Matematik render hatası - düz metin modunda gösteriliyor.', 'warning', true, 3000);
        }
        return true;
    }

    restoreStateFromBackup() {
        console.log('🔄 Restoring state from backup...');
        if (window.stateManager && typeof window.stateManager.restoreFromBackup === 'function') {
            if (window.stateManager.restoreFromBackup()) {
                console.log('✅ State restored from backup');
                return true;
            }
        }
        return false;
    }

    resetToSafeState() {
        console.log('🔄 Resetting to safe state...');
        if (window.stateManager && typeof window.stateManager.resetToSetupSafely === 'function') {
            window.stateManager.resetToSetupSafely();
            return true;
        }
        return false;
    }

    emergencyStateReset() {
        console.log('🚨 Emergency state reset...');
        if (window.interactiveSolutionManager) window.interactiveSolutionManager.reset();
        if (window.stateManager) window.stateManager.setView('setup');
        if (window.showError) window.showError('Sistem acil durumda sıfırlandı. Yeni bir problem yükleyebilirsiniz.', false);
        return true;
    }
    
    reinitializeInteractiveSystem() {
        console.log('🔄 Reinitializing interactive system...');
        if(window.interactiveSolutionManager) {
            window.interactiveSolutionManager.reset();
            return true;
        }
        return false;
    }
    
    fallbackToManualSolution() {
        console.log('🔄 Falling back to manual solution...');
        if (window.stateManager) {
            window.stateManager.setView('fullSolution');
            if (window.showInViewNotification) window.showInViewNotification('İnteraktif çözüm hatası - tam çözüm görünümüne geçildi.', 'info', true);
            return true;
        }
        return false;
    }

    redirectToStaticSolution() {
        console.log('🔄 Redirecting to static solution...');
        if (window.stateManager) {
            window.stateManager.setView('solving');
            if (window.showInViewNotification) window.showInViewNotification('Adım adım çözüm moduna yönlendirildi.', 'info', true);
            return true;
        }
        return false;
    }
    
    // --- Diğer Yardımcı Metodlar ---
    
    updateErrorMetrics(analysis) {
        const category = analysis.category;
        this.errorMetrics.errorsByType[category] = (this.errorMetrics.errorsByType[category] || 0) + 1;
    }
    
    handleCriticalError(error, analysis, context) {
        console.error('🚨 Critical error detected:', { error: error.message, analysis, context });
        if (window.showError) {
            window.showError(`Kritik sistem hatası (${analysis.category}): ${error.message}`, true, () => {
                if (confirm('Sistem yeniden başlatılsın mı?')) {
                    window.location.reload();
                }
            });
        }
    }

    emergencyErrorHandling(originalError, handlerError) {
        console.error('🚨 Emergency: Error handler failed!', { original: originalError, handler: handlerError });
        alert(`CRITICAL ERROR: ${originalError.message}\n\nHandler Error: ${handlerError.message}\n\nSayfa yeniden yüklenecek.`);
        setTimeout(() => window.location.reload(), 2000);
    }
    
    getErrorReport() {
        return {
            metrics: { ...this.errorMetrics },
            recentErrors: this.errorHistory ? this.errorHistory.slice(-10) : [],
            patterns: Array.from(this.errorPatterns.keys()),
            strategies: Array.from(this.recoveryStrategies.keys()),
            timestamp: new Date().toISOString()
        };
    }
    
    clearErrorHistory() {
        this.errorMetrics = { totalErrors: 0, recoveredErrors: 0, criticalErrors: 0, errorsByType: {} };
        if (this.errorHistory) this.errorHistory = [];
        console.log('🧹 Error history cleared');
    }
}

// Global kullanım için singleton olarak dışa aktar
export const errorHandler = new EnhancedErrorHandler();