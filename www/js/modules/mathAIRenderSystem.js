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
        
        // YENİ: Gelişmiş LaTeX işleme için özel parser
        this.latexProcessor = {
            // Karmaşık LaTeX ifadelerini düzelt - GELİŞTİRİLDİ
            fixComplexLatex: (latex) => {
                if (!latex || typeof latex !== 'string') return latex;
                
                let fixed = latex;
                
                // 1. Türkçe karakter düzeltmeleri
                const turkishCharMap = {
                    '\\c': 'ç', '\\C': 'Ç',
                    '\\g': 'ğ', '\\G': 'Ğ', 
                    '\\i': 'ı', '\\I': 'İ',
                    '\\o': 'ö', '\\O': 'Ö',
                    '\\s': 'ş', '\\S': 'Ş',
                    '\\u': 'ü', '\\U': 'Ü'
                };
                
                Object.entries(turkishCharMap).forEach(([escaped, correct]) => {
                    const regex = new RegExp(escaped.replace(/\\/g, '\\\\') + '(?![a-zA-Z])', 'g');
                    fixed = fixed.replace(regex, correct);
                });
                
                // 2. Karmaşık integral ifadelerini düzelt
                // Örnek: \([\frac{3}{8}x^{\frac{8}{3}} + \frac{6}{5}x^{\frac{5}{3}}]_{1}^{2}\)
                fixed = fixed.replace(/\\\[([^\]]+)\\\]/g, '\\left[$1\\right]');
                
                // 3. Üslü ifadelerdeki parantezleri düzelt
                fixed = fixed.replace(/([a-zA-Z])\^\{([^}]+)\}/g, '$1^{$2}');
                fixed = fixed.replace(/([a-zA-Z])_\{([^}]+)\}/g, '$1_{$2}');
                
                // 4. Kesir ifadelerini düzelt
                fixed = fixed.replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, '\\frac{$1}{$2}');
                
                // 5. Kök ifadelerini düzelt
                fixed = fixed.replace(/\\sqrt\[([^\]]*)\]\{([^}]*)\}/g, '\\sqrt[$1]{$2}');
                
                // 6. Logaritma ifadelerini düzelt - GELİŞTİRİLDİ
                fixed = fixed.replace(/\\log_(\d+)\s*\(([^)]+)\)/g, '\\log_{$1}($2)');
                fixed = fixed.replace(/\\ln\s*\(([^)]+)\)/g, '\\ln($1)');
                fixed = fixed.replace(/\\log\s*\(([^)]+)\)/g, '\\log($1)');
                fixed = fixed.replace(/\\log_\{([^}]+)\}\s*\(([^)]+)\)/g, '\\log_{$1}($2)');
                
                // 7. Türev ifadelerini düzelt - GELİŞTİRİLDİ
                fixed = fixed.replace(/\\frac\s*d\s*\{([^}]*)\}\s*d\s*\{([^}]*)\}/g, '\\frac{d$1}{d$2}');
                fixed = fixed.replace(/\\frac\s*\\partial\s*\{([^}]*)\}\s*\\partial\s*\{([^}]*)\}/g, '\\frac{\\partial $1}{\\partial $2}');
                fixed = fixed.replace(/\\frac\{d([^}]+)\}\{d([^}]+)\}/g, '\\frac{d$1}{d$2}');
                fixed = fixed.replace(/\\frac\{([^}]+)\}\{d([^}]+)\}/g, '\\frac{$1}{d$2}');
                
                // 8. Limit ifadelerini düzelt - GELİŞTİRİLDİ
                fixed = fixed.replace(/\\lim_\{([^}]+)\}\s*([^\\]+)/g, '\\lim_{$1} $2');
                fixed = fixed.replace(/\\lim\s*([^\\]+)/g, '\\lim $1');
                fixed = fixed.replace(/\\lim_\{([^}]+)\}/g, '\\lim_{$1}');
                
                // 9. Toplam ifadelerini düzelt - GELİŞTİRİLDİ
                fixed = fixed.replace(/\\sum_\{([^}]+)\}\^\{([^}]+)\}/g, '\\sum_{$1}^{$2}');
                fixed = fixed.replace(/\\sum_\{([^}]+)\}/g, '\\sum_{$1}');
                fixed = fixed.replace(/\\sum\^\{([^}]+)\}/g, '\\sum^{$1}');
                
                // 10. İntegral ifadelerini düzelt - GELİŞTİRİLDİ
                fixed = fixed.replace(/\\int_\{([^}]+)\}\^\{([^}]+)\}/g, '\\int_{$1}^{$2}');
                fixed = fixed.replace(/\\int_\{([^}]+)\}/g, '\\int_{$1}');
                fixed = fixed.replace(/\\int\^\{([^}]+)\}/g, '\\int^{$1}');
                
                // 11. Parantez düzeltmeleri - GELİŞTİRİLDİ
                fixed = fixed.replace(/\\left\(([^)]+)\\right\)/g, '\\left($1\\right)');
                fixed = fixed.replace(/\\left\[([^\]]+)\\right\]/g, '\\left[$1\\right]');
                fixed = fixed.replace(/\\left\{([^}]+)\\right\}/g, '\\left\\{$1\\right\\}');
                
                // 12. Trigonometrik fonksiyonları düzelt
                fixed = fixed.replace(/\\sin\s*\(([^)]+)\)/g, '\\sin($1)');
                fixed = fixed.replace(/\\cos\s*\(([^)]+)\)/g, '\\cos($1)');
                fixed = fixed.replace(/\\tan\s*\(([^)]+)\)/g, '\\tan($1)');
                fixed = fixed.replace(/\\cot\s*\(([^)]+)\)/g, '\\cot($1)');
                fixed = fixed.replace(/\\sec\s*\(([^)]+)\)/g, '\\sec($1)');
                fixed = fixed.replace(/\\csc\s*\(([^)]+)\)/g, '\\csc($1)');
                
                // 13. Üstel ve logaritmik fonksiyonları düzelt
                fixed = fixed.replace(/\\exp\s*\(([^)]+)\)/g, '\\exp($1)');
                fixed = fixed.replace(/\\ln\s*\(([^)]+)\)/g, '\\ln($1)');
                
                // 14. Matematiksel operatörleri düzelt
                fixed = fixed.replace(/\\cdot\s*/g, '\\cdot ');
                fixed = fixed.replace(/\\times\s*/g, '\\times ');
                fixed = fixed.replace(/\\div\s*/g, '\\div ');
                fixed = fixed.replace(/\\pm\s*/g, '\\pm ');
                fixed = fixed.replace(/\\mp\s*/g, '\\mp ');
                
                // 15. Karşılaştırma operatörleri
                fixed = fixed.replace(/\\leq\s*/g, '\\leq ');
                fixed = fixed.replace(/\\geq\s*/g, '\\geq ');
                fixed = fixed.replace(/\\neq\s*/g, '\\neq ');
                fixed = fixed.replace(/\\approx\s*/g, '\\approx ');
                fixed = fixed.replace(/\\equiv\s*/g, '\\equiv ');
                
                // 16. Birleşik kelimeleri ayır
                fixed = fixed.replace(/([a-zğüşıöç])([A-ZĞÜŞİÖÇ])/g, '$1 $2');
                
                // 17. Fazla boşlukları temizle
                fixed = fixed.replace(/\s+/g, ' ').trim();
                
                // 18. Eksik parantezleri kontrol et ve düzelt
                const openParens = (fixed.match(/\\left\(/g) || []).length;
                const closeParens = (fixed.match(/\\right\)/g) || []).length;
                if (openParens > closeParens) {
                    fixed += '\\right)'.repeat(openParens - closeParens);
                }
                
                // 19. Eksik köşeli parantezleri kontrol et ve düzelt
                const openBrackets = (fixed.match(/\\left\[/g) || []).length;
                const closeBrackets = (fixed.match(/\\right\]/g) || []).length;
                if (openBrackets > closeBrackets) {
                    fixed += '\\right]'.repeat(openBrackets - closeBrackets);
                }
                
                return fixed;
            },
            
            // LaTeX içeriğini analiz et
            analyzeLatex: (latex) => {
                const analysis = {
                    complexity: 0,
                    hasFractions: false,
                    hasIntegrals: false,
                    hasSuperscripts: false,
                    hasSubscripts: false,
                    hasRoots: false,
                    hasTurkish: false,
                    isValid: true
                };
                
                if (!latex) return analysis;
                
                // Karmaşıklık hesaplama
                analysis.hasFractions = /\\frac/.test(latex);
                analysis.hasIntegrals = /\\int/.test(latex);
                analysis.hasSuperscripts = /\^/.test(latex);
                analysis.hasSubscripts = /_/.test(latex);
                analysis.hasRoots = /\\sqrt/.test(latex);
                analysis.hasTurkish = /[ğĞıİöÖşŞüÜçÇ]/.test(latex);
                
                // Karmaşıklık skoru
                analysis.complexity = [
                    analysis.hasFractions,
                    analysis.hasIntegrals,
                    analysis.hasSuperscripts,
                    analysis.hasSubscripts,
                    analysis.hasRoots
                ].filter(Boolean).length;
                
                return analysis;
            }
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
                autoProcessApiResponses: true,
                enableLatexOptimization: true, // YENİ
                enableProgressiveRendering: true, // YENİ
                maxRetryAttempts: 3 // YENİ
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
     * API yanıtını işler ve render eder - GELİŞTİRİLDİ
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
            
            // YENİ: API yanıtını ön işleme
            const preprocessedResponse = this.preprocessApiResponse(apiResponse);
            
            // API Response Processor'ı yükle
            const processor = await this.getApiResponseProcessor();
            
            // API yanıtını işle
            const result = await processor.processApiResponse(
                preprocessedResponse, 
                container, 
                { ...this.config, ...options }
            );
            
            // Başarı durumunda additional processing yap
            if (result.success) {
                await this.performAdditionalProcessing(container, result);
                
                // YENİ: Progressive rendering
                if (this.config.enableProgressiveRendering) {
                    await this.performProgressiveRendering(container);
                }
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
            
            // YENİ: Retry mekanizması
            if (options.retryCount < this.config.maxRetryAttempts) {
                console.log(`🔄 Retry attempt ${options.retryCount + 1}/${this.config.maxRetryAttempts}`);
                return await this.processApiResponse(apiResponse, targetContainer, {
                    ...options,
                    retryCount: (options.retryCount || 0) + 1
                });
            }
            
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
     * YENİ: API yanıtını ön işleme
     */
    preprocessApiResponse(response) {
        const processed = JSON.parse(JSON.stringify(response));
        
        const processValue = (value) => {
            if (typeof value === 'string') {
                // LaTeX optimizasyonu
                if (this.config.enableLatexOptimization) {
                    value = this.latexProcessor.fixComplexLatex(value);
                }
                return value;
            } else if (Array.isArray(value)) {
                return value.map(item => processValue(item));
            } else if (typeof value === 'object' && value !== null) {
                const result = {};
                for (const key in value) {
                    result[key] = processValue(value[key]);
                }
                return result;
            }
            return value;
        };

        return processValue(processed);
    }

    /**
     * YENİ: Progressive rendering
     */
    async performProgressiveRendering(container) {
        const mathElements = container.querySelectorAll('.latex-content, .math-content, .smart-content');
        
        // İlk 3 elementi hemen render et
        const immediateElements = Array.from(mathElements).slice(0, 3);
        for (const element of immediateElements) {
            await this.renderElementWithRetry(element);
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Geri kalan elementleri lazy load et
        const remainingElements = Array.from(mathElements).slice(3);
        if (remainingElements.length > 0) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.renderElementWithRetry(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            }, { 
                rootMargin: '100px',
                threshold: 0.1 
            });

            remainingElements.forEach(element => observer.observe(element));
        }
    }

    /**
     * YENİ: Element render with retry - GELİŞTİRİLDİ
     */
    async renderElementWithRetry(element, maxRetries = 2) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // Loading state göster
                element.classList.add('rendering');
                
                if (element.dataset.latex) {
                    // LaTeX içeriğini ön işleme
                    const processedLatex = this.latexProcessor.fixComplexLatex(element.dataset.latex);
                    
                    await enhancedMathRenderer.renderContent(element, processedLatex, {
                        displayMode: true,
                        enableTurkishSupport: true,
                        enableFallback: true,
                        maxRetries: 1
                    });
                } else if (element.dataset.content) {
                    await enhancedMathRenderer.renderContent(element, element.dataset.content, {
                        displayMode: false,
                        enableTurkishSupport: true,
                        enableFallback: true,
                        maxRetries: 1
                    });
                }
                
                // Başarılı render
                element.classList.remove('rendering');
                element.classList.add('rendered');
                break;
                
            } catch (error) {
                console.warn(`Render attempt ${attempt + 1} failed:`, error);
                element.classList.remove('rendering');
                
                if (attempt === maxRetries) {
                    // Son çare: gelişmiş fallback göster
                    await this.performAdvancedFallback(element);
                } else {
                    // Kısa bekleme sonra tekrar dene
                    await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
                }
            }
        }
    }

    /**
     * YENİ: Gelişmiş fallback render
     */
    async performAdvancedFallback(element) {
        try {
            const content = element.dataset.latex || element.dataset.content || '';
            
            // MixedContentRenderer'ı kullanarak fallback render
            const { mixedContentRenderer } = await import('./mixedContentRenderer.js');
            const renderer = new mixedContentRenderer();
            
            const optimizedContent = renderer.optimizeLatex(content);
            const fallbackHtml = renderer.createSimpleMathFallback(
                optimizedContent, 
                'math-fallback-advanced', 
                content
            );
            
            element.innerHTML = fallbackHtml;
            element.classList.add('render-fallback');
            element.classList.add('advanced-fallback');
            
            console.log('✅ Gelişmiş fallback render başarılı');
            
        } catch (fallbackError) {
            console.error('❌ Fallback render hatası:', fallbackError);
            
            // En son çare: plain text göster
            element.textContent = element.dataset.latex || element.dataset.content || '';
            element.classList.add('render-fallback');
            element.classList.add('plain-text-fallback');
        }
    }

    /**
     * Tekil matematik içeriği render eder - GELİŞTİRİLDİ
     * @param {string} content - Render edilecek içerik
     * @param {HTMLElement|string} targetElement - Hedef element
     * @param {Object} options - Render seçenekleri
     * @returns {Promise<Object>} - Render sonucu
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
            return { success: false, error: 'Hedef element bulunamadı' };
        }

        try {
            // YENİ: LaTeX optimizasyonu
            if (this.config.enableLatexOptimization) {
                content = this.latexProcessor.fixComplexLatex(content);
            }
            
            const result = await enhancedMathRenderer.renderContent(
                element, 
                content, 
                { ...this.config, ...options }
            );
            
            this.systemMetrics.totalRenderOperations++;
            return result;
            
        } catch (error) {
            console.error('❌ Matematik render hatası:', error);
            
            // YENİ: Gelişmiş hata yönetimi kullan
            return await this.handleRenderError(error, element, content, options);
        }
    }

    /**
     * YENİ: Fallback render sistemi
     */
    async performFallbackRender(element, content, options) {
        console.log('🔄 Fallback render deneniyor...');
        
        try {
            // 1. Basit LaTeX render
            if (content.includes('\\')) {
                element.innerHTML = `<span class="latex-fallback">${this.escapeHtml(content)}</span>`;
                element.classList.add('render-fallback');
                return true;
            }
            
            // 2. Plain text render
            element.textContent = content;
            element.classList.add('render-fallback');
            return true;
            
        } catch (error) {
            console.error('❌ Fallback render da başarısız:', error);
            element.textContent = content || 'Render hatası';
            element.classList.add('render-error');
            return false;
        }
    }

    /**
     * YENİ: Gelişmiş hata yönetimi ve retry mekanizması
     */
    async handleRenderError(error, element, content, options, attempt = 0) {
        const maxRetries = options.maxRetries || this.config.maxRetryAttempts || 3;
        
        console.warn(`⚠️ Render hatası (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
        
        if (attempt < maxRetries) {
            // Kısa bekleme sonra tekrar dene
            const delay = Math.pow(2, attempt) * 100; // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay));
            
            try {
                // İçeriği tekrar optimize et
                const reoptimizedContent = this.latexProcessor.fixComplexLatex(content);
                
                // Farklı render stratejisi dene
                const fallbackOptions = {
                    ...options,
                    forceRenderer: attempt === 0 ? 'katex' : (attempt === 1 ? 'mathjax' : 'html'),
                    enableFallback: true
                };
                
                return await this.renderMathContent(reoptimizedContent, element, fallbackOptions);
                
            } catch (retryError) {
                return await this.handleRenderError(retryError, element, content, options, attempt + 1);
            }
        } else {
            // Maksimum deneme sayısına ulaşıldı, gelişmiş fallback kullan
            console.error('❌ Maksimum retry sayısına ulaşıldı, gelişmiş fallback kullanılıyor');
            return await this.performAdvancedFallback(element);
        }
    }

    /**
     * YENİ: Sistem stabilite kontrolü
     */
    async checkSystemStability() {
        const stabilityReport = {
            isStable: true,
            issues: [],
            recommendations: []
        };
        
        try {
            // KaTeX kontrolü
            if (!window.katex) {
                stabilityReport.isStable = false;
                stabilityReport.issues.push('KaTeX yüklenmemiş');
                stabilityReport.recommendations.push('KaTeX kütüphanesini yükleyin');
            }
            
            // MathJax kontrolü
            if (!window.MathJax) {
                stabilityReport.issues.push('MathJax yüklenmemiş (fallback için)');
                stabilityReport.recommendations.push('MathJax kütüphanesini yükleyin');
            }
            
            // Cache performansı kontrolü
            if (this.renderCache.size > 1000) {
                stabilityReport.issues.push('Cache boyutu çok büyük');
                stabilityReport.recommendations.push('Cache temizliği yapın');
            }
            
            // Sistem metrikleri kontrolü
            const avgRenderTime = this.systemMetrics.averageRenderTime || 0;
            if (avgRenderTime > 1000) {
                stabilityReport.issues.push('Ortalama render süresi çok yüksek');
                stabilityReport.recommendations.push('Render optimizasyonu yapın');
            }
            
            console.log('📊 Sistem stabilite raporu:', stabilityReport);
            return stabilityReport;
            
        } catch (error) {
            console.error('❌ Sistem stabilite kontrolü hatası:', error);
            return {
                isStable: false,
                issues: ['Sistem kontrolü başarısız'],
                recommendations: ['Sistemi yeniden başlatın']
            };
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