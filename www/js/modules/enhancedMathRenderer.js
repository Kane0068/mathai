// =================================================================================
//  Geliştirilmiş Ana Matematik Renderer - enhancedMathRenderer.js
//  Ana render sistemini karışık içerik desteği ile güçlendirir
// =================================================================================

export class EnhancedMathRenderer {
    constructor() {
        this.renderCache = new Map();
        this.renderLocks = new Set();
        this.fallbackStrategies = ['katex', 'mathjax', 'html'];
        this.mixedContentRenderer = null; // Lazy loading için
        
        // Render stratejileri Map'i - YENİ EKLENDİ
        this.renderStrategies = new Map([
            ['katex', (element, content, options) => this.renderWithKatex(element, content, options)],
            ['mathjax', (element, content, options) => this.renderWithMathJax(element, content, options)],
            ['html', (element, content, options) => this.renderAsHtml(element, content, options)],
            ['mixed', async (element, content, options) => {
                const renderer = await this.getMixedContentRenderer();
                return renderer.renderMixedContent(element, content, options);
            }]
        ]);
        
        // Render metrikleri
        this.metrics = {
            totalRenders: 0,
            successfulRenders: 0,
            fallbackRenders: 0,
            mixedContentRenders: 0,
            cacheHits: 0,
            averageRenderTime: 0,
            errorTypes: new Map()
        };
        
        // Content type analyzers (bind sorunu çözüldü)
        this.contentAnalyzers = new Map([
            ['mixed', (content) => this.analyzeMixedContent(content)],
            ['pure_latex', (content) => this.analyzePureLatex(content)],
            ['pure_text', (content) => this.analyzePureText(content)],
            ['mathematical_expression', (content) => this.analyzeMathExpression(content)]
        ]);
    }

    /**
     * Mixed content renderer'ı lazy load eder
     */
    async getMixedContentRenderer() {
        if (!this.mixedContentRenderer) {
            try {
                const { mixedContentRenderer } = await import('./mixedContentRenderer.js');
                this.mixedContentRenderer = mixedContentRenderer;
            } catch (error) {
                console.error('Mixed content renderer yüklenemedi:', error);
                // Fallback: basit mixed content handler
                this.mixedContentRenderer = {
                    renderMixedContent: async (element, content, options) => {
                        // Basit fallback implementation
                        element.innerHTML = this.escapeHtml(content);
                        return true;
                    }
                };
            }
        }
        return this.mixedContentRenderer;
    }

    /**
     * Ana render fonksiyonu - content tipini analiz eder ve uygun renderer'ı seçer
     * @param {HTMLElement} element - Render edilecek element
     * @param {string} content - Render edilecek içerik
     * @param {Object} options - Render seçenekleri
     * @returns {Promise<boolean>} - Render başarı durumu
     */
    async renderContent(element, content, options = {}) {
        if (!element || !content) {
            console.warn('❌ Geçersiz render parametreleri');
            return false;
        }

        // Türkçe karakter düzeltmesi
        if (options.enableTurkishSupport !== false) {
            content = this.fixTurkishCharacters(content);
        }

        const startTime = performance.now();
        const elementId = this.getElementId(element);
        
        // Render kilidi kontrolü
        if (this.renderLocks.has(elementId)) {
            console.log(`⏳ Element zaten render ediliyor: ${elementId}`);
            return false;
        }

        this.renderLocks.add(elementId);
        this.metrics.totalRenders++;

        try {
            // Cache kontrolü
            const cacheKey = this.generateCacheKey(content, options);
            if (this.renderCache.has(cacheKey)) {
                element.innerHTML = this.renderCache.get(cacheKey);
                element.classList.add('cache-rendered');
                this.metrics.cacheHits++;
                console.log(`✨ Cache hit: ${elementId}`);
                return true;
            }

            // İçerik analizi
            const analysis = await this.analyzeContent(content);
            console.log(`🔍 İçerik analizi (${elementId}):`, analysis);

            // Uygun renderer'ı seç ve çalıştır
            const renderResult = await this.selectAndRender(element, content, analysis, options);
            
            if (renderResult.success) {
                // Cache'e kaydet
                this.renderCache.set(cacheKey, element.innerHTML);
                
                // Metrics güncelle
                this.metrics.successfulRenders++;
                if (analysis.contentType === 'mixed') {
                    this.metrics.mixedContentRenders++;
                }
                
                const renderTime = performance.now() - startTime;
                this.updateAverageRenderTime(renderTime);
                
                // Success class ekle
                element.classList.add('render-success', `render-${analysis.contentType}`);
                element.setAttribute('data-render-strategy', renderResult.strategy);
                element.setAttribute('data-render-time', renderTime.toFixed(2));
                
                console.log(`✅ Render başarılı (${elementId}): ${renderResult.strategy} - ${renderTime.toFixed(2)}ms`);
                return true;
                
            } else {
                throw new Error(`Render başarısız: ${renderResult.error}`);
            }

        } catch (error) {
            console.error(`❌ Render hatası (${elementId}):`, error);
            
            // Error tipini kaydet
            const errorType = error.constructor.name;
            const currentCount = this.metrics.errorTypes.get(errorType) || 0;
            this.metrics.errorTypes.set(errorType, currentCount + 1);
            
            // Fallback render
            const fallbackResult = await this.performFallbackRender(element, content, options);
            
            if (fallbackResult) {
                this.metrics.fallbackRenders++;
                console.log(`✅ Fallback render başarılı (${elementId})`);
                return true;
            }
            
            return false;
            
        } finally {
            this.renderLocks.delete(elementId);
        }
    }

    /**
     * İçerik analizi - GELİŞTİRİLDİ
     */
    async analyzeContent(content) {
        const analysis = {
            contentType: 'unknown',
            confidence: 0,
            complexity: 0,
            patterns: {},
            length: content.length,
            hasLatex: false,
            hasTurkish: false
        };

        // Türkçe karakter kontrolü
        const turkishChars = /[ğĞıİöÖşŞüÜçÇ]/;
        analysis.hasTurkish = turkishChars.test(content);

        // Boş içerik kontrolü
        if (!content || content.trim().length === 0) {
            analysis.contentType = 'empty';
            analysis.confidence = 1;
            return analysis;
        }

        // LaTeX pattern kontrolü - GELİŞTİRİLDİ
        const latexPatterns = {
            commands: /\\(?:log|ln|sin|cos|tan|sqrt|frac|int|sum|prod|lim)(?:_\{[^}]*\})?(?:\^\{[^}]*\})?/g,
            inlineMath: /\$[^\$]+\$/g,
            displayMath: /\$\$[^\$]+\$\$|\\\[[^\]]+\\\]/g,
            environments: /\\begin\{[^}]+\}/g,
            fractions: /\\frac\s*\{[^}]*\}\s*\{[^}]*\}/g,
            superSubscript: /_\{[^}]+\}|\^\{[^}]+\}|_[a-zA-Z0-9]|\^[a-zA-Z0-9]/g,
            greekLetters: /\\(?:alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega)/g
        };

        // Her pattern için kontrol
        let latexMatchCount = 0;
        let mathComplexity = 0;

        for (const [patternName, pattern] of Object.entries(latexPatterns)) {
            const matches = content.match(pattern);
            if (matches) {
                analysis.patterns[patternName] = matches.length;
                latexMatchCount += matches.length;
                
                // Karmaşıklık hesaplama
                switch(patternName) {
                    case 'fractions':
                    case 'environments':
                        mathComplexity += matches.length * 3;
                        break;
                    case 'commands':
                    case 'superSubscript':
                        mathComplexity += matches.length * 2;
                        break;
                    default:
                        mathComplexity += matches.length;
                }
            }
        }

        analysis.hasLatex = latexMatchCount > 0;
        analysis.complexity = mathComplexity / 10; // Normalize et

        // İçerik tipi belirleme
        if (latexMatchCount === 0 && !content.includes('$')) {
            // Saf metin
            analysis.contentType = 'pure_text';
            analysis.confidence = 0.7;
        } else if (latexMatchCount > 5 || content.includes('\\begin{')) {
            // Saf LaTeX
            analysis.contentType = 'pure_latex';
            analysis.confidence = 0.85;
        } else if (content.match(/^[0-9\+\-\*\/\=\.\,\s\(\)]+$/)) {
            // Basit matematiksel ifade
            analysis.contentType = 'mathematical_expression';
            analysis.confidence = 0.8;
        } else {
            // Karışık içerik
            analysis.contentType = 'mixed';
            analysis.confidence = 0.95;
        }

        return analysis;
    }

    /**
     * Türkçe karakterleri düzelt
     */
    fixTurkishCharacters(content) {
        // Escape karakterleri düzelt
        const turkishCharMap = {
            '\\c': 'ç', '\\C': 'Ç',
            '\\g': 'ğ', '\\G': 'Ğ',
            '\\i': 'ı', '\\I': 'İ',
            '\\o': 'ö', '\\O': 'Ö',
            '\\s': 'ş', '\\S': 'Ş',
            '\\u': 'ü', '\\U': 'Ü'
        };

        let fixed = content;
        
        // LaTeX komutlarını koruyarak Türkçe karakterleri düzelt
        Object.entries(turkishCharMap).forEach(([escaped, correct]) => {
            // Sadece kelime sınırında olan escape karakterleri düzelt
            const regex = new RegExp(escaped.replace(/\\/g, '\\\\') + '(?![a-zA-Z])', 'g');
            fixed = fixed.replace(regex, correct);
        });
        
        // Unicode birleşik karakterleri düzelt
        fixed = fixed.replace(/g\u02d8/g, 'ğ');
        fixed = fixed.replace(/s\u0327/g, 'ş');
        fixed = fixed.replace(/c\u0327/g, 'ç');
        
        return fixed;
    }

    /**
     * Uygun renderer'ı seç ve render et - DÜZELTİLDİ
     */
    async selectAndRender(element, content, analysis, options) {
        try {
            const rendererType = this.getRenderer(analysis, options);
            const renderStrategy = this.renderStrategies.get(rendererType);
            
            if (!renderStrategy) {
                throw new Error(`Bilinmeyen renderer: ${rendererType}`);
            }

            await renderStrategy(element, content, options);
            
            return {
                success: true,
                strategy: rendererType
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                attemptedStrategy: rendererType
            };
        }
    }

    /**
     * İçerik tipine göre uygun renderer'ı belirle
     */
    getRenderer(analysis, options) {
        // Zorla belirtilmiş renderer varsa kullan
        if (options.forceRenderer) {
            return options.forceRenderer;
        }

        // İçerik tipine göre seç
        switch (analysis.contentType) {
            case 'mixed':
                return 'mixed';
            case 'pure_latex':
                return window.katex ? 'katex' : (window.MathJax ? 'mathjax' : 'html');
            case 'mathematical_expression':
                return window.katex ? 'katex' : 'html';
            case 'pure_text':
                return 'html';
            default:
                return 'html'; // Safe fallback
        }
    }

    /**
     * KaTeX ile render et
     */
    async renderWithKatex(element, content, options) {
        if (!window.katex) {
            throw new Error('KaTeX bulunamadı');
        }

        const displayMode = options.displayMode || false;
        
        katex.render(content, element, {
            displayMode: displayMode,
            throwOnError: false,
            output: 'html',
            trust: true,
            strict: false,
            macros: {
                '\\R': '\\mathbb{R}',
                '\\C': '\\mathbb{C}',
                '\\N': '\\mathbb{N}',
                '\\Z': '\\mathbb{Z}',
                '\\Q': '\\mathbb{Q}'
            }
        });
    }

    /**
     * MathJax ile render et
     */
    async renderWithMathJax(element, content, options) {
        if (!window.MathJax?.typesetPromise) {
            throw new Error('MathJax bulunamadı');
        }

        const displayMode = options.displayMode || false;
        const mathContent = displayMode ? `\\[${content}\\]` : `\\(${content}\\)`;
        
        element.innerHTML = mathContent;
        await MathJax.typesetPromise([element]);
    }

    /**
     * HTML olarak render et (fallback)
     */
    async renderAsHtml(element, content, options) {
        let processedContent = this.escapeHtml(content);
        
        // Türkçe karakter desteği
        if (/[ğüşıöçĞÜŞİÖÇ]/.test(content)) {
            processedContent = `<span class="turkish-text">${processedContent}</span>`;
        }
        
        // Matematik ifadeleri için temel styling
        if (/\$|\\\w+/.test(content)) {
            processedContent = `<code class="math-fallback">${processedContent}</code>`;
        }
        
        element.innerHTML = processedContent;
    }

    /**
     * Fallback render stratejisi
     */
    async performFallbackRender(element, content, options) {
        for (const strategy of this.fallbackStrategies) {
            try {
                console.log(`🔄 Fallback deneniyor: ${strategy}`);
                
                const renderStrategy = this.renderStrategies.get(strategy);
                if (renderStrategy) {
                    await renderStrategy(element, content, options);
                    console.log(`✅ Fallback başarılı: ${strategy}`);
                    return true;
                }
                
            } catch (error) {
                console.warn(`⚠️ Fallback başarısız (${strategy}):`, error);
                continue;
            }
        }
        
        // Son çare: düz metin
        element.textContent = content;
        return true;
    }

    /**
     * Container içindeki tüm render edilebilir elementleri render eder
     */
    async renderContainer(container, options = {}) {
        if (!container) {
            console.warn('❌ Geçersiz container');
            return { success: false, processed: 0, successful: 0 };
        }

        console.log('🚀 Container render başlıyor:', container);

        const elements = this.collectRenderableElements(container);
        console.log(`📊 Render edilecek element sayısı: ${elements.length}`);

        if (elements.length === 0) {
            return { success: true, processed: 0, successful: 0 };
        }

        let successful = 0;
        const results = [];

        // Paralel render (performans için)
        const renderPromises = elements.map(async ({ element, content, displayMode }) => {
            try {
                const renderOptions = { ...options, displayMode };
                const result = await this.renderContent(element, content, renderOptions);
                if (result) successful++;
                results.push({ element, content, success: result });
                return result;
            } catch (error) {
                console.error('Element render hatası:', error);
                results.push({ element, content, success: false, error });
                return false;
            }
        });

        await Promise.all(renderPromises);

        const summary = {
            success: successful > 0,
            processed: elements.length,
            successful: successful,
            failed: elements.length - successful,
            successRate: ((successful / elements.length) * 100).toFixed(1) + '%',
            results: results
        };

        console.log('✅ Container render tamamlandı:', summary);
        return summary;
    }

    /**
     * Container içindeki render edilebilir elementleri toplar
     */
    collectRenderableElements(container) {
        const elements = [];
        const addedElements = new Set();

        const addElementToList = (el, content, displayMode) => {
            if (!el || addedElements.has(el)) return;
            
            addedElements.add(el);
            elements.push({ element: el, content, displayMode });
        };

        // Data-math-content attribute'una sahip elementler
        const mathElements = container.querySelectorAll('[data-math-content="true"]');
        mathElements.forEach(el => {
            const content = el.textContent || el.innerText || '';
            if (content.trim()) {
                const displayMode = el.getAttribute('data-display-mode') === 'true' || 
                                  el.classList.contains('math-display');
                addElementToList(el, content, displayMode);
            }
        });

        // KaTeX class'larına sahip elementler
        const katexElements = container.querySelectorAll('.katex-render:not(.katex-rendered)');
        katexElements.forEach(el => {
            const content = el.getAttribute('data-latex') || el.textContent || '';
            if (content.trim()) {
                addElementToList(el, content, el.classList.contains('katex-display'));
            }
        });

        // MathJax için işaretlenmiş elementler
        const mathjaxElements = container.querySelectorAll('.math-tex, .math-tex-original');
        mathjaxElements.forEach(el => {
            if (!el.classList.contains('mathjax-rendered')) {
                const content = el.textContent || '';
                if (content.trim()) {
                    addElementToList(el, content, false);
                }
            }
        });

        return elements;
    }

    /**
     * Utility fonksiyonlar
     */
    getElementId(element) {
        if (element.id) return element.id;
        
        // Unique ID oluştur
        const randomId = `render-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        element.setAttribute('data-render-id', randomId);
        return randomId;
    }

    generateCacheKey(content, options) {
        const optionString = JSON.stringify(options);
        return `${content.length}_${this.hashCode(content)}_${this.hashCode(optionString)}`;
    }

    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateAverageRenderTime(newTime) {
        const currentAvg = this.metrics.averageRenderTime;
        const totalRenders = this.metrics.successfulRenders;
        
        this.metrics.averageRenderTime = 
            (currentAvg * (totalRenders - 1) + newTime) / totalRenders;
    }

    /**
     * Metrik ve debug fonksiyonları
     */
    getMetrics() {
        const errorTypesSummary = {};
        this.metrics.errorTypes.forEach((count, type) => {
            errorTypesSummary[type] = count;
        });
        
        return {
            ...this.metrics,
            errorTypes: errorTypesSummary,
            successRate: this.metrics.totalRenders > 0 ? 
                (this.metrics.successfulRenders / this.metrics.totalRenders * 100).toFixed(2) + '%' : '0%',
            cacheHitRate: this.metrics.totalRenders > 0 ? 
                (this.metrics.cacheHits / this.metrics.totalRenders * 100).toFixed(2) + '%' : '0%',
            fallbackRate: this.metrics.totalRenders > 0 ? 
                (this.metrics.fallbackRenders / this.metrics.totalRenders * 100).toFixed(2) + '%' : '0%'
        };
    }

    clearCache() {
        this.renderCache.clear();
        if (this.mixedContentRenderer && typeof this.mixedContentRenderer.clearCache === 'function') {
            this.mixedContentRenderer.clearCache();
        }
        console.log('🧹 Tüm render cache temizlendi');
    }

    /**
     * Content analysis helper fonksiyonları
     */
    analyzeMixedContent(content) {
        const hasText = /[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+/.test(content);
        const hasMath = /\$|\\\w+/.test(content);
        return hasText && hasMath;
    }

    analyzePureLatex(content) {
        return /^[\s]*[\$\\]/.test(content.trim()) && 
               !/[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+(?![^{]*\})/.test(content);
    }

    analyzePureText(content) {
        return !/\$|\\\w+|[\^_{}]/.test(content);
    }

    analyzeMathExpression(content) {
        return /^[0-9\+\-\*\/\=\.\,\s\(\)\[\]\{\}]+$/.test(content.trim());
    }
}

// Singleton instance
export const enhancedMathRenderer = new EnhancedMathRenderer();

// Debug için global erişim
if (typeof window !== 'undefined') {
    window._enhancedMathRenderer = enhancedMathRenderer;
}