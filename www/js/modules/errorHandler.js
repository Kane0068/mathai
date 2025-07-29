// Dosya Adı: www/js/modules/errorHandler.js

export class AdvancedErrorHandler {
    constructor() {
        this.maxRetries = 2; // Maksimum deneme sayısı
        this.retryDelay = 1500; // Denemeler arası bekleme süresi
        this.setupGlobalErrorHandlers();
    }

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
        window.addEventListener('offline', () => this.handleNetworkChange(false));
        window.addEventListener('online', () => this.handleNetworkChange(true));
    }

    /**
     * API veya diğer kritik hataları yönetir.
     * @param {Error} error - Yakalanan hata nesnesi.
     * @param {Object} context - Hatanın oluştuğu bağlam (örn: hangi operasyon).
     * @returns {Promise<Object|null>} - Fallback verisi veya yeniden deneme sonucu.
     */
    async handleError(error, context = { operation: null, payload: null }) {
        const errorType = this.classifyError(error);

        const errorInfo = {
            type: errorType,
            message: error.message,
            context: context.operation,
            timestamp: new Date().toISOString(),
        };

        this.logError(errorType, errorInfo);

        // Kullanıcıya her zaman bir hata gösterelim
        this.showUserError(errorType, errorInfo);
        
        // Sadece belirli hatalar için fallback verisi döndür
        return this.getFallbackData(errorType);
    }

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
        
        // Global showError fonksiyonunu çağır
        if (typeof window.showError === 'function') {
            window.showError(message, true);
        } else {
            // Fallback: event yayınla
            window.dispatchEvent(new CustomEvent('show-error-message', {
                detail: { message: message, isCritical: true }
            }));
        }
    }

    createErrorModal() {
        // Bu kısım artık `ui.js` veya `index.js` içinde yönetilecek.
        // `showError` fonksiyonu bu işlevi görecek.
    }

    logError(type, error) {
        console.group(`[Hata Yönetimi] Tip: ${type}`);
        console.error(error);
        console.groupEnd();

        // İleride buraya Sentry, LogRocket gibi bir servise hata gönderme kodu eklenebilir.
    }

    getFallbackData(errorType) {
        // Sadece belirli, kurtarılamaz hatalarda fallback verisi döndür
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

        // Bildirimi göster
        notification.classList.remove('translate-x-full');

        // Bir süre sonra gizle
        setTimeout(() => {
            notification.classList.add('translate-x-full');
        }, 3000);
    }
}
// 2. Enhanced Error Handler
class EnhancedAdvancedErrorHandler extends AdvancedErrorHandler {
    constructor() {
        super();
        this.errorPatterns = new Map();
        this.recoveryStrategies = new Map();
        this.errorMetrics = {
            totalErrors: 0,
            recoveredErrors: 0,
            criticalErrors: 0,
            errorsByType: {}
        };
        
        this.setupErrorPatterns();
        this.setupRecoveryStrategies();
    }
    
    setupErrorPatterns() {
        // Canvas related errors
        this.errorPatterns.set('canvas', {
            patterns: [
                /canvas/i,
                /getContext/i,
                /drawImage/i,
                /toDataURL/i
            ],
            severity: 'medium',
            category: 'canvas'
        });
        
        // Math rendering errors
        this.errorPatterns.set('math', {
            patterns: [
                /mathjax/i,
                /katex/i,
                /latex/i,
                /render/i,
                /math.*render/i
            ],
            severity: 'medium',
            category: 'math'
        });
        
        // State management errors
        this.errorPatterns.set('state', {
            patterns: [
                /state/i,
                /setState/i,
                /getState/i,
                /subscribe/i
            ],
            severity: 'high',
            category: 'state'
        });
        
        // Network/API errors
        this.errorPatterns.set('network', {
            patterns: [
                /fetch/i,
                /network/i,
                /api/i,
                /xhr/i,
                /timeout/i
            ],
            severity: 'high',
            category: 'network'
        });
        
        // Interactive solution errors
        this.errorPatterns.set('interactive', {
            patterns: [
                /interactive/i,
                /solution.*manager/i,
                /step.*option/i,
                /evaluation/i
            ],
            severity: 'medium',
            category: 'interactive'
        });
    }
    
    setupRecoveryStrategies() {
        // Canvas recovery
        this.recoveryStrategies.set('canvas', {
            name: 'Canvas Recovery',
            actions: [
                () => this.reinitializeCanvas(),
                () => this.fallbackToTextInput(),
                () => this.disableCanvasFeatures()
            ]
        });
        
        // Math rendering recovery
        this.recoveryStrategies.set('math', {
            name: 'Math Rendering Recovery',
            actions: [
                () => this.switchMathRenderer(),
                () => this.clearMathCache(),
                () => this.fallbackToPlainText()
            ]
        });
        
        // State recovery
        this.recoveryStrategies.set('state', {
            name: 'State Recovery',
            actions: [
                () => this.restoreStateFromBackup(),
                () => this.resetToSafeState(),
                () => this.emergencyStateReset()
            ]
        });
        
        // Network recovery
        this.recoveryStrategies.set('network', {
            name: 'Network Recovery',
            actions: [
                () => this.retryNetworkRequest(),
                () => this.switchToOfflineMode(),
                () => this.showNetworkError()
            ]
        });
        
        // Interactive recovery
        this.recoveryStrategies.set('interactive', {
            name: 'Interactive Solution Recovery',
            actions: [
                () => this.reinitializeInteractiveSystem(),
                () => this.fallbackToManualSolution(),
                () => this.redirectToStaticSolution()
            ]
        });
    }
    
    handleError(error, context = {}) {
        try {
            this.errorMetrics.totalErrors++;
            
            // Analyze error
            const analysis = this.analyzeError(error, context);
            
            // Log error with analysis
            console.error('🔍 Enhanced Error Analysis:', {
                error: error.message,
                category: analysis.category,
                severity: analysis.severity,
                context,
                analysis
            });
            
            // Update metrics
            this.updateErrorMetrics(analysis);
            
            // Attempt recovery
            const recovered = this.attemptRecovery(error, analysis, context);
            
            if (recovered) {
                this.errorMetrics.recoveredErrors++;
                console.log('✅ Error recovery successful');
            } else {
                if (analysis.severity === 'high') {
                    this.errorMetrics.criticalErrors++;
                    this.handleCriticalError(error, analysis, context);
                }
            }
            
            // Call parent handler
            return super.handleError(error, context);
            
        } catch (handlerError) {
            console.error('❌ Error handler itself failed:', handlerError);
            this.emergencyErrorHandling(error, handlerError);
        }
    }
    
    analyzeError(error, context) {
        const analysis = {
            category: 'unknown',
            severity: 'low',
            patterns: [],
            recoverable: true,
            confidence: 0
        };
        
        const errorMessage = error.message || error.toString();
        
        // Pattern matching
        for (const [categoryName, categoryData] of this.errorPatterns) {
            const matchCount = categoryData.patterns.filter(pattern => 
                pattern.test(errorMessage)
            ).length;
            
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
        
        // Context-based severity adjustment
        if (context.operation === 'critical' || context.isCritical) {
            analysis.severity = 'high';
        }
        
        if (context.retryCount && context.retryCount > 2) {
            analysis.severity = 'high';
            analysis.recoverable = false;
        }
        
        return analysis;
    }
    
    updateErrorMetrics(analysis) {
        const category = analysis.category;
        if (!this.errorMetrics.errorsByType[category]) {
            this.errorMetrics.errorsByType[category] = 0;
        }
        this.errorMetrics.errorsByType[category]++;
    }
    
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
                const result = action();
                
                if (result !== false) {
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
    
    // Recovery action implementations
    reinitializeCanvas() {
        try {
            if (window.enhancedCanvasManager) {
                // Try to reinitialize main canvas
                const canvasIds = ['handwritingCanvas', 'guide-handwriting-canvas'];
                
                for (const canvasId of canvasIds) {
                    const element = document.getElementById(canvasId);
                    if (element) {
                        window.enhancedCanvasManager.destroy(canvasId);
                        window.enhancedCanvasManager.initCanvas(canvasId);
                    }
                }
                
                console.log('✅ Canvas reinitialization successful');
                return true;
            }
        } catch (error) {
            console.error('❌ Canvas reinitialization failed:', error);
        }
        return false;
    }
    
    switchMathRenderer() {
        try {
            if (window.enhancedMathRenderer) {
                // Clear cache and try different renderer
                window.enhancedMathRenderer.clearCache();
                
                console.log('✅ Math renderer switched');
                return true;
            }
        } catch (error) {
            console.error('❌ Math renderer switch failed:', error);
        }
        return false;
    }
    
    restoreStateFromBackup() {
        try {
            if (window.stateManager && window.stateManager.restoreFromBackup) {
                return window.stateManager.restoreFromBackup();
            }
        } catch (error) {
            console.error('❌ State restore failed:', error);
        }
        return false;
    }
    
    reinitializeInteractiveSystem() {
        try {
            if (window.interactiveSolutionManager) {
                window.interactiveSolutionManager.reset();
                console.log('✅ Interactive system reinitialized');
                return true;
            }
        } catch (error) {
            console.error('❌ Interactive system reinit failed:', error);
        }
        return false;
    }
    
    fallbackToTextInput() {
        try {
            // Switch to keyboard input mode
            if (window.stateManager) {
                window.stateManager.setState({
                    ui: { handwritingInputType: 'keyboard' }
                });
                
                if (window.showInViewNotification) {
                    window.showInViewNotification(
                        'Canvas hatası nedeniyle klavye moduna geçildi.',
                        'warning',
                        true,
                        3000
                    );
                }
                
                return true;
            }
        } catch (error) {
            console.error('❌ Fallback to text input failed:', error);
        }
        return false;
    }
    
    handleCriticalError(error, analysis, context) {
        console.error('🚨 Critical error detected:', {
            error: error.message,
            analysis,
            context
        });
        
        // Show critical error dialog
        if (window.showError) {
            window.showError(
                `Kritik sistem hatası (${analysis.category}): ${error.message}`,
                true,
                () => {
                    // Last resort recovery
                    if (confirm('Sistem yeniden başlatılsın mı?')) {
                        window.location.reload();
                    }
                }
            );
        }
    }
    
    emergencyErrorHandling(originalError, handlerError) {
        console.error('🚨 Emergency: Error handler failed!', {
            original: originalError,
            handler: handlerError
        });
        
        // Show alert as last resort
        alert(`CRITICAL ERROR: ${originalError.message}\n\nHandler Error: ${handlerError.message}\n\nPage will reload.`);
        
        setTimeout(() => {
            window.location.reload();
        }, 2000);
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
        this.errorMetrics = {
            totalErrors: 0,
            recoveredErrors: 0,
            criticalErrors: 0,
            errorsByType: {}
        };
        
        if (this.errorHistory) {
            this.errorHistory = [];
        }
        
        console.log('🧹 Error history cleared');
    }
}

// Global bir instance oluşturup dışa aktar
// export const errorHandler = new AdvancedErrorHandler();