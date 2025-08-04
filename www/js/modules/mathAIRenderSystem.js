// =================================================================================
//  Ana Entegrasyon Dosyası - main.js
//  Tüm render sistemlerini birleştiren ve API yanıtlarını işleyen ana çözüm
// =================================================================================

import { enhancedMathRenderer } from './enhancedMathRenderer.js';

/**
 * Ana MathAI Render Sistemi
 * Tüm matematik render ihtiyaçlarını karşılayan birleşik çözüm
 */
class MathAIRenderSystem {
    constructor() {
        this.isInitialized = false;
        this.renderQueue = [];
        this.isProcessingQueue = false;
        this.apiResponseProcessor = null; // Lazy loading
        this.isProcessingManualRender = false;
        
        // Sistem metrikleri
        this.systemMetrics = {
            initTime: null,
            totalApiResponses: 0,
            totalRenderOperations: 0,
            systemUptime: Date.now(),
            performanceScore: 0
        };
        
        console.log('🚀 MathAI Render System başlatılıyor...');
    }

    /**
     * API Response Processor'ı lazy load eder
     */
    async getApiResponseProcessor() {
        if (!this.apiResponseProcessor) {
            try {
                const { apiResponseProcessor } = await import('./apiResponseProcessor.js');
                this.apiResponseProcessor = apiResponseProcessor;
            } catch (error) {
                console.error('API Response Processor yüklenemedi:', error);
                throw error;
            }
        }
        return this.apiResponseProcessor;
    }

    /**
     * Sistem başlatma
     * @param {Object} config - Sistem konfigürasyonu
     * @returns {Promise<boolean>} - Başlatma durumu
     */
    async initialize(config = {}) {
        const startTime = performance.now();
        
        try {
            console.log('⚙️ Sistem bileşenleri kontrol ediliyor...');
            
            // Matematik kütüphanelerini kontrol et
            await this.checkMathLibraries();
            
            // Default konfigürasyon
            const defaultConfig = {
                enableTurkishSupport: true,
                enableMixedContent: true,
                enableCaching: true,
                debugMode: false,
                autoProcessApiResponses: true
            };
            
            this.config = { ...defaultConfig, ...config };
            
            // Bileşenleri konfigüre et
            this.configureMixedContentRenderer();
            this.configureEnhancedMathRenderer();
            this.configureApiResponseProcessor();
            
            // Global event listeners
            this.setupGlobalEventListeners();
            
            // CSS stillerini ekle
            this.injectStyles();
            
            this.isInitialized = true;
            this.systemMetrics.initTime = performance.now() - startTime;
            
            console.log(`✅ MathAI Render System başarıyla başlatıldı (${this.systemMetrics.initTime.toFixed(2)}ms)`);
            return true;
            
        } catch (error) {
            console.error('❌ Sistem başlatma hatası:', error);
            return false;
        }
    }

    /**
     * API yanıtını işler ve render eder
     * @param {Object} apiResponse - API'den gelen yanıt
     * @param {HTMLElement|string} targetContainer - Hedef container (element veya selector)
     * @param {Object} options - Render seçenekleri
     * @returns {Promise<Object>} - İşleme sonucu
     */
    async processApiResponse(apiResponse, targetContainer, options = {}) {
        if (!this.isInitialized) {
            console.warn('⚠️ Sistem henüz başlatılmamış, başlatılıyor...');
            await this.initialize();
        }

        // Container'ı resolve et
        const container = typeof targetContainer === 'string' ? 
            document.querySelector(targetContainer) : 
            targetContainer;

        if (!container) {
            throw new Error('Hedef container bulunamadı');
        }

        console.log('🎯 API yanıtı işleniyor:', {
            responseKeys: Object.keys(apiResponse),
            containerClass: container.className,
            options
        });
        this.isProcessingManualRender = true;

        try {
            // Loading state göster
            this.showLoadingState(container);
            
            // API Response Processor'ı yükle
            const processor = await this.getApiResponseProcessor();
            
            // API yanıtını işle
            const result = await processor.processApiResponse(
                apiResponse, 
                container, 
                { ...this.config, ...options }
            );
            
            // Başarı durumunda additional processing yap
            if (result.success) {
                await this.performAdditionalProcessing(container, result);
            }
            
            // Loading state'i kaldır
            this.hideLoadingState(container);
            
            // Metrikleri güncelle
            this.systemMetrics.totalApiResponses++;
            
            console.log('✅ API yanıtı başarıyla işlendi:', result);
            return result;
            
        } catch (error) {
            this.hideLoadingState(container);
            console.error('❌ API yanıt işleme hatası:', error);
            
            // Error state göster
            this.showErrorState(container, error);
            
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
        finally {
            // YENİ: Manuel render işlemi bittiğinde bayrağı indir
            this.isProcessingManualRender = false;
        }
    
    }

    /**
     * Tekil matematik içeriği render eder
     * @param {string} content - Render edilecek içerik
     * @param {HTMLElement|string} targetElement - Hedef element
     * @param {Object} options - Render seçenekleri
     * @returns {Promise<boolean>} - Render başarı durumu
     */
    async renderMathContent(content, targetElement, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const element = typeof targetElement === 'string' ? 
            document.querySelector(targetElement) : 
            targetElement;

        if (!element) {
            console.error('❌ Hedef element bulunamadı');
            return false;
        }

        try {
            const result = await enhancedMathRenderer.renderContent(
                element, 
                content, 
                { ...this.config, ...options }
            );
            
            this.systemMetrics.totalRenderOperations++;
            return result;
            
        } catch (error) {
            console.error('❌ Matematik render hatası:', error);
            return false;
        }
    }

    /**
     * Container içindeki tüm matematik içeriklerini render eder
     * @param {HTMLElement|string} container - Container element
     * @param {Object} options - Render seçenekleri
     * @returns {Promise<Object>} - Render sonuç özeti
     */
    async renderContainer(container, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const containerElement = typeof container === 'string' ? 
            document.querySelector(container) : 
            container;

        if (!containerElement) {
            throw new Error('Container bulunamadı');
        }

        try {
            const result = await enhancedMathRenderer.renderContainer(
                containerElement, 
                { ...this.config, ...options }
            );
            
            this.systemMetrics.totalRenderOperations++;
            return result;
            
        } catch (error) {
            console.error('❌ Container render hatası:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Örnek API yanıtını test eder (debug amaçlı)
     * @param {string} problemText - Test problem metni
     * @returns {Promise<Object>} - Test sonucu
     */
    async testWithSampleResponse(problemText) {
        console.log('🧪 Örnek API yanıtı test ediliyor...');
        
        // Örnek problematik API yanıtı (sorunları içeren)
        const sampleApiResponse = {
            problemOzeti: {
                verilenler: [
                    "İntegral: \\(\\int_{1}^{2} (x + 2) \\cdot \\sqrt[3]{x^2} dx\\)",
                    "Belirliintegralindeg˘erinibulun"
                ],
                istenen: "Belirli integralin değerini bulunuz",
                konu: "İntegral Hesabı",
                zorlukSeviyesi: "orta"
            },
            adimlar: [
                {
                    adimNo: 1,
                    adimBasligi: "İntegrali Yeniden Yazma",
                    adimAciklamasi: "Önce $\\sqrt[3]{x^2}$ ifadesini üstel formda yazalım.",
                    cozum_lateks: "\\sqrt[3]{x^2} = x^{\\frac{2}{3}}",
                    ipucu: "Kökleri üstel forma çevirmek integrasyon için daha kolaydır.",
                    yanlisSecenekler: [
                        {
                            metin_lateks: "\\sqrt[3]{x^2} = x^{\\frac{3}{2}}",
                            hataAciklamasi: "Üs hesaplama hatası. Küp kök için 1/3 ile çarpmalıyız."
                        }
                    ]
                },
                {
                    adimNo: 2,
                    adimBasligi: "İntegrali Açma",
                    adimAciklamasi: "İntegrali iki parçaya ayıralım: $(x + 2) \\cdot x^{\\frac{2}{3}}$",
                    cozum_lateks: "\\int_{1}^{2} (x + 2) \\cdot x^{\\frac{2}{3}} dx = \\int_{1}^{2} (x^{\\frac{5}{3}} + 2x^{\\frac{2}{3}}) dx",
                    ipucu: "Dağılma özelliğini kullanıyoruz.",
                    yanlisSecenekler: [
                        {
                            metin_lateks: "\\int_{1}^{2} x^{\\frac{2}{3}} + 2x^{\\frac{2}{3}} dx",
                            hataAciklamasi: "x katsayısını unutmuşsunuz."
                        }
                    ]
                }
            ],
            tamCozumLateks: [
                "\\int_{1}^{2} (x + 2) \\cdot x^{\\frac{2}{3}} dx",
                "= \\int_{1}^{2} (x^{\\frac{5}{3}} + 2x^{\\frac{2}{3}}) dx",
                "= \\left[\\frac{3}{8}x^{\\frac{8}{3}} + \\frac{6}{5}x^{\\frac{5}{3}}\\right]_{1}^{2}",
                "= \\frac{3}{8} \\cdot 2^{\\frac{8}{3}} + \\frac{6}{5} \\cdot 2^{\\frac{5}{3}} - \\frac{3}{8} - \\frac{6}{5}",
                "≈ 2.64"
            ],
            sonucKontrolu: "Sonucucontroletmekiçinnumerikintegrasyon kullanabilirsiniz."
        };
        
        // Test container oluştur
        const testContainer = document.createElement('div');
        testContainer.className = 'test-api-response-container';
        testContainer.style.position = 'absolute';
        testContainer.style.left = '-9999px';
        document.body.appendChild(testContainer);
        
        try {
            const result = await this.processApiResponse(sampleApiResponse, testContainer);
            
            console.log('🎯 Test Sonucu:', result);
            console.log('📱 Oluşturulan HTML:', testContainer.innerHTML.substring(0, 200) + '...');
            
            return {
                success: result.success,
                testContainer: testContainer,
                generatedHtml: testContainer.innerHTML,
                processingResult: result
            };
            
        } finally {
            // Test container'ı kaldır (isteğe bağlı)
            if (!this.config.debugMode) {
                document.body.removeChild(testContainer);
            }
        }
    }

    // js/modules/mathAIRenderSystem.js İÇİNE YAPIŞTIRILACAK KOD

    /**
     * Sistem performansını ölçer ve raporlar (GÜNCELLENDİ)
     * @returns {Object} - Performans raporu
     */
    getSystemPerformance() {
        const uptime = Date.now() - this.systemMetrics.systemUptime;
        
        // Metrikleri ilgili modüllerden al
        const enhancedMetrics = enhancedMathRenderer.getMetrics();
        const mixedContentMetrics = enhancedMathRenderer.mixedContentRenderer?.getMetrics() || { successRate: '0.00%' };
        const apiMetrics = this.apiResponseProcessor?.getMetrics() || { successRate: '0.00%', turkishContentRate: '0.00%' };

        // Ortalama başarı oranını hesapla
        const rates = [
            parseFloat(enhancedMetrics.successRate),
            parseFloat(mixedContentMetrics.successRate),
            parseFloat(apiMetrics.successRate)
        ].filter(rate => !isNaN(rate) && rate > 0); // Sadece geçerli ve 0'dan büyük oranları al

        const overallSuccessRate = rates.length > 0 
            ? (rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(2)
            : '0.00';
        
        return {
            systemInfo: {
                uptime: `${Math.floor(uptime / 1000)} saniye`,
                initTime: this.systemMetrics.initTime,
                totalApiResponses: this.systemMetrics.totalApiResponses,
                totalRenderOperations: this.systemMetrics.totalRenderOperations,
                isInitialized: this.isInitialized
            },
            performance: {
                overallSuccessRate: `${overallSuccessRate}%`,
                averageRenderTime: enhancedMetrics.averageRenderTime.toFixed(2) + 'ms',
                cacheEfficiency: enhancedMetrics.cacheHitRate,
                turkishContentSupport: apiMetrics.turkishContentRate
            },
            componentMetrics: {
                mixedContentRenderer: mixedContentMetrics,
                enhancedMathRenderer: enhancedMetrics,
                apiResponseProcessor: apiMetrics
            }
        };
    }
    /**
     * Sistem konfigürasyonunu günceller
     * @param {Object} newConfig - Yeni konfigürasyon
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Bileşenleri yeniden konfigüre et
        this.configureMixedContentRenderer();
        this.configureEnhancedMathRenderer();
        this.configureApiResponseProcessor();
        
        console.log('⚙️ Sistem konfigürasyonu güncellendi:', this.config);
    }

    /**
     * Sistem cache'ini temizler
     */
    clearSystemCache() {
        enhancedMathRenderer.clearCache();
        console.log('🧹 Tüm sistem cache\'i temizlendi');
    }

    /**
     * Özel hata yakalama ve raporlama
     * @param {Error} error - Yakalanan hata
     * @param {string} context - Hata bağlamı
     */
    handleSystemError(error, context) {
        console.error(`❌ Sistem Hatası [${context}]:`, error);
        
        // Hata raporlama (isteğe bağlı)
        if (this.config.errorReporting) {
            this.reportError(error, context);
        }
    }

    // ============= PRIVATE METHODS =============

    async checkMathLibraries() {
        const libraries = {
            katex: !!window.katex,
            mathjax: !!(window.MathJax && window.MathJax.typesetPromise)
        };

        console.log('📚 Matematik kütüphaneleri:', libraries);

        if (!libraries.katex && !libraries.mathjax) {
            console.warn('⚠️ Hiçbir matematik kütüphanesi bulunamadı! En az KaTeX veya MathJax gerekli.');
        }

        return libraries;
    }

    configureMixedContentRenderer() {
        // Mixed content renderer lazy loading nedeniyle direkt konfigürasyona gerek yok
        // Konfigürasyon render sırasında yapılacak
    }

    configureEnhancedMathRenderer() {
        // Enhanced renderer için özel konfigürasyon
        enhancedMathRenderer.config = {
            enableCache: this.config.enableCaching,
            debugMode: this.config.debugMode
        };
    }

    async configureApiResponseProcessor() {
        try {
            const processor = await this.getApiResponseProcessor();
            processor.turkishCharacterFix = this.config.enableTurkishSupport;
            processor.spacePreservation = true;
        } catch (error) {
            console.warn('API Response Processor konfigüre edilemedi:', error);
        }
    }

    setupGlobalEventListeners() {
        // Sayfa yüklendiğinde otomatik render
        if (this.config.autoProcessApiResponses) {
            document.addEventListener('DOMContentLoaded', () => {
                this.autoProcessExistingContent();
            });
        }

        // Window resize olaylarını dinle
        window.addEventListener('resize', this.debounce(() => {
            this.handleWindowResize();
        }, 250));

        // Dynamically added content detection
        if (typeof MutationObserver !== 'undefined') {
            this.setupMutationObserver();
        }
    }

    autoProcessExistingContent() {
        // Sayfa yüklendiğinde mevcut matematik içeriklerini render et
        const containers = document.querySelectorAll('.math-content-container, .api-response-container');
        containers.forEach(container => {
            this.renderContainer(container).catch(error => {
                console.warn('⚠️ Otomatik render hatası:', error);
            });
        });
    }

    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.processNewlyAddedNode(node);
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        this.mutationObserver = observer;
    }

    processNewlyAddedNode(node) {
        // Yeni eklenen node'larda matematik içeriği var mı kontrol et
        if (this.isProcessingManualRender) {
            return;
        }
        if (node.classList && 
            (node.classList.contains('smart-content') || 
             node.classList.contains('latex-content') ||
             node.classList.contains('api-response-container'))) {
            if (node.closest('.render-success, .render-fallback')) {
                return;
            }
            setTimeout(() => {
                this.renderContainer(node).catch(error => {
                    console.warn('⚠️ Dinamik render hatası:', error);
                });
            }, 100);
        }
    }

    handleWindowResize() {
        // Responsive matematik içerikleri için yeniden boyutlandırma
        const mathElements = document.querySelectorAll('.math-zoomed');
        mathElements.forEach(el => {
            el.classList.remove('math-zoomed');
        });

        console.log('📱 Window resize - matematik içerikleri güncellendi');
    }

    showLoadingState(container) {
        container.classList.add('api-processing');
        container.innerHTML = `
            <div class="loading-indicator">
                <div class="loading-spinner"></div>
                <p>Matematik içeriği hazırlanıyor...</p>
            </div>
        `;
    }

    hideLoadingState(container) {
        container.classList.remove('api-processing');
        const loadingIndicator = container.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
    }

    showErrorState(container, error) {
        container.classList.add('api-error');
        container.innerHTML = `
            <div class="error-indicator">
                <div class="error-icon">⚠️</div>
                <h3>İçerik Yükleme Hatası</h3>
                <p>Matematik içeriği yüklenirken bir sorun oluştu.</p>
                <details>
                    <summary>Teknik Detaylar</summary>
                    <code>${error.message}</code>
                </details>
                <button onclick="location.reload()" class="retry-button">
                    🔄 Sayfayı Yenile
                </button>
            </div>
        `;
    }

    async performAdditionalProcessing(container, result) {
        // Başarılı render sonrası ek işlemler
        
        // Smooth scroll to content
        if (this.config.enableSmoothScroll) {
            container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Analytics tracking (isteğe bağlı)
        if (this.config.enableAnalytics) {
            this.trackRenderSuccess(container, result);
        }

        // Performance optimization
        this.optimizeRenderedContent(container);
    }

    optimizeRenderedContent(container) {
        // Görünmeyen elementleri lazy load et
        const mathElements = container.querySelectorAll('.latex-content, .smart-content');
        
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('math-visible');
                        observer.unobserve(entry.target);
                    }
                });
            });

            mathElements.forEach(el => observer.observe(el));
        }
    }

    trackRenderSuccess(container, result) {
        // Analytics tracking implementation
        console.log('📊 Render success tracked:', {
            container: container.className,
            renderTime: result.processingTime,
            timestamp: new Date().toISOString()
        });
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    injectStyles() {
        if (document.getElementById('mathai-render-styles')) return;

        const styles = `
            <style id="mathai-render-styles">
                /* Loading States */
                .api-processing {
                    position: relative;
                    min-height: 100px;
                }
                
                .loading-indicator {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    color: #666;
                }
                
                .loading-spinner {
                    width: 32px;
                    height: 32px;
                    border: 3px solid #f3f3f3;
                    border-top: 3px solid #007bff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 1rem;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                /* Error States */
                .api-error {
                    border: 2px solid #dc3545;
                    border-radius: 8px;
                    padding: 1rem;
                    background-color: #f8d7da;
                }
                
                .error-indicator {
                    text-align: center;
                    color: #721c24;
                }
                
                .error-icon {
                    font-size: 2rem;
                    margin-bottom: 0.5rem;
                }
                
                .retry-button {
                    background-color: #007bff;
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 1rem;
                }
                
                .retry-button:hover {
                    background-color: #0056b3;
                }
                
                /* Render Success States */
                .render-success {
                    opacity: 1;
                    transition: opacity 0.3s ease;
                }
                
                .render-fallback {
                    opacity: 0.8;
                    border-left: 3px solid #ffc107;
                    padding-left: 0.5rem;
                }
                
                .render-failed {
                    opacity: 0.6;
                    border-left: 3px solid #dc3545;
                    padding-left: 0.5rem;
                }
                
                /* Turkish Text Support */
                .turkish-text {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    font-feature-settings: "locl" 1;
                }
                
                /* Math Content Styling */
                .math-zoomed {
                    transform: scale(1.2);
                    transition: transform 0.2s ease;
                    z-index: 10;
                    position: relative;
                    background: white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    padding: 0.25rem;
                    border-radius: 4px;
                }
                
                .math-fallback {
                    background-color: #f8f9fa;
                    padding: 0.25rem 0.5rem;
                    border-radius: 3px;
                    font-family: 'Courier New', monospace;
                    border-left: 3px solid #17a2b8;
                }
                
                .math-error {
                    background-color: #f8d7da;
                    padding: 0.25rem 0.5rem;
                    border-radius: 3px;
                    font-family: 'Courier New', monospace;
                    border-left: 3px solid #dc3545;
                    color: #721c24;
                }
                
                /* Solution Steps */
                .solution-step {
                    margin-bottom: 1.5rem;
                    padding: 1rem;
                    border: 1px solid #e9ecef;
                    border-radius: 8px;
                    background-color: #ffffff;
                    transition: box-shadow 0.2s ease;
                }
                
                .solution-step:hover {
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                
                .solution-step:focus {
                    outline: 2px solid #007bff;
                    outline-offset: 2px;
                }
                
                .step-title {
                    color: #495057;
                    margin-bottom: 0.5rem;
                    font-size: 1.1rem;
                    font-weight: 600;
                }
                
                .step-explanation {
                    margin-bottom: 1rem;
                    line-height: 1.6;
                    color: #6c757d;
                }
                
                .step-solution {
                    background-color: #f8f9fa;
                    padding: 1rem;
                    border-radius: 6px;
                    margin: 1rem 0;
                    border-left: 4px solid #007bff;
                }
                
                /* Hints and Wrong Options */
                .step-hint, .wrong-options {
                    margin-top: 1rem;
                    padding: 0.75rem;
                    background-color: #fff3cd;
                    border-radius: 6px;
                    border-left: 4px solid #ffc107;
                }
                
                .step-hint.collapsed .hint-content,
                .wrong-options.collapsed .wrong-options-list {
                    display: none;
                }
                
                .hint-toggle-btn, .wrong-options-toggle-btn {
                    background: none;
                    border: none;
                    color: #856404;
                    cursor: pointer;
                    font-weight: 500;
                    padding: 0;
                    text-decoration: underline;
                }
                
                .wrong-option {
                    margin-bottom: 1rem;
                    padding: 0.75rem;
                    background-color: #f8d7da;
                    border-radius: 4px;
                    border-left: 3px solid #dc3545;
                }
                
                .wrong-explanation {
                    margin-top: 0.5rem;
                    font-size: 0.9rem;
                    color: #721c24;
                    font-style: italic;
                }
                
                /* Responsive Design */
                @media (max-width: 768px) {
                    .mobile-math-content .solution-step {
                        padding: 0.75rem;
                        margin-bottom: 1rem;
                    }
                    
                    .mobile-math-content .step-solution {
                        padding: 0.75rem;
                        font-size: 0.9rem;
                    }
                    
                    .math-zoomed {
                        transform: scale(1.1);
                    }
                }
                
                /* Animation Support */
                .math-visible {
                    animation: fadeInUp 0.5s ease forwards;
                }
                
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                /* Section Styling */
                .problem-summary-section,
                .solution-steps-section,
                .complete-solution-section,
                .verification-section {
                    margin-bottom: 2rem;
                }
                
                .section-title {
                    color: #212529;
                    border-bottom: 2px solid #007bff;
                    padding-bottom: 0.5rem;
                    margin-bottom: 1.5rem;
                    font-size: 1.25rem;
                    font-weight: 600;
                }
                
                .given-data, .requested-data {
                    margin-bottom: 1rem;
                }
                
                .given-data h4, .requested-data h4 {
                    color: #495057;
                    margin-bottom: 0.5rem;
                    font-size: 1rem;
                    font-weight: 500;
                }
                
                .given-data ul {
                    padding-left: 1.5rem;
                }
                
                .given-data li {
                    margin-bottom: 0.25rem;
                    line-height: 1.5;
                }
                
                /* Complete Solution */
                .complete-solution-step {
                    margin-bottom: 0.75rem;
                    padding: 0.75rem;
                    background-color: #e9ecef;
                    border-radius: 4px;
                    border-left: 3px solid #6c757d;
                }
                
                .verification-content {
                    background-color: #d1ecf1;
                    padding: 1rem;
                    border-radius: 6px;
                    border-left: 4px solid #17a2b8;
                    color: #0c5460;
                    line-height: 1.6;
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
        console.log('🎨 MathAI Render System stilleri eklendi');
    }
}

// Global instance oluştur ve export et
export const mathAIRenderSystem = new MathAIRenderSystem();

// Auto-init ve global binding
if (typeof window !== 'undefined') {
    window.MathAI = mathAIRenderSystem;
    
    // jQuery benzeri kısa erişim
    window.$ = window.$ || {};
    window.$.mathAI = mathAIRenderSystem;
    
    console.log('🌟 MathAI Render System global olarak erişilebilir:');
    console.log('   - window.MathAI');
    console.log('   - window.$.mathAI');
    console.log('   - mathAIRenderSystem (import ile)');
}

// Kullanım örnekleri ve API dokümantasyonu
export const MathAIUsageExamples = {
    // Temel kullanım
    basicUsage: {
        // API yanıtını işleme
        processApiResponse: `
            await MathAI.processApiResponse(apiResponse, '#result-container');
        `,
        
        // Tekil matematik render
        renderMath: `
            await MathAI.renderMathContent('\\\\frac{x}{y}', '#math-element');
        `,
        
        // Container render
        renderContainer: `
            await MathAI.renderContainer('.math-container');
        `
    },
    
    // Gelişmiş kullanım
    advancedUsage: {
        // Konfigürasyon ile başlatma
        initialize: `
            await MathAI.initialize({
                enableTurkishSupport: true,
                enableMixedContent: true,
                debugMode: true
            });
        `,
        
        // Özel seçeneklerle API işleme
        processWithOptions: `
            await MathAI.processApiResponse(apiResponse, container, {
                displayMode: true,
                enableAnimations: true
            });
        `,
        
        // Performans izleme
        getPerformance: `
            const performance = MathAI.getSystemPerformance();
            console.log('Başarı oranı:', performance.performance.overallSuccessRate);
        `
    },
    
    // Test ve debug
    testingAndDebug: {
        // Test API yanıtı
        testSample: `
            const testResult = await MathAI.testWithSampleResponse('test problem');
        `,
        
        // Cache temizleme
        clearCache: `
            MathAI.clearSystemCache();
        `,
        
        // Debug mode aktifleştirme
        enableDebug: `
            MathAI.updateConfig({ debugMode: true });
        `
    }
};

console.log('✅ MathAI Render System - Tam Entegrasyon Çözümü hazır!');
console.log('📖 Kullanım örnekleri: MathAIUsageExamples');