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
                element.classList.add('render-fallback');
                element.setAttribute('data-render-error', error.message);
                console.log(`🔄 Fallback render başarılı (${elementId})`);
                return true;
            } else {
                element.classList.add('render-failed');
                element.innerHTML = this.escapeHtml(content);
                console.log(`💥 Render tamamen başarısız (${elementId})`);
                return false;
            }

        } finally {
            this.renderLocks.delete(elementId);
        }
    }

    /**
     * İçerik tipini analiz eder (YENİ ve DAHA AKILLI VERSİYON)
     * @param {string} content - Analiz edilecek içerik
     * @returns {Promise<Object>} - Analiz sonucu
     */
    async analyzeContent(content) {
        const trimmed = content.trim();
        
        const patterns = {
            hasLatexCommands: /\\(frac|sqrt|sum|int|lim|sin|cos|tan|log|ln|exp|alpha|beta|gamma|delta|theta|pi|sigma|infty|text|left|right|begin|end)\b/.test(trimmed),
            hasDisplayMath: /\$\$[^$]+\$\$/.test(trimmed),
            hasInlineMath: /\$[^$]+\$/.test(trimmed) || /\\\([^)]+\\\)/.test(trimmed),
            hasBraces: /[{}]/.test(trimmed),
            hasPowerOrIndex: /[\^_]/.test(trimmed),
            hasMathFunctions: /\b(log|sin|cos|tan|ln|exp)\b/i.test(trimmed), // 'i' flag for case-insensitivity
            hasOnlyMathChars: /^[\d\s\+\-\*\/=\(\)\[\]\{\}\^_.,\\:a-zA-Z]+$/.test(trimmed.replace(/\s/g, '')),
            hasText: /[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(trimmed)
        };

        let contentType = 'pure_text';
        let confidence = 0.5;

        // Karar Ağacı
        if (patterns.hasLatexCommands || patterns.hasDisplayMath || patterns.hasInlineMath) {
            contentType = patterns.hasText ? 'mixed' : 'pure_latex';
            confidence = 0.95;
        } else if (patterns.hasMathFunctions && (patterns.hasPowerOrIndex || patterns.hasBraces)) {
            contentType = patterns.hasText ? 'mixed' : 'pure_latex';
            confidence = 0.9;
        } else if (patterns.hasPowerOrIndex && patterns.hasBraces) {
            contentType = 'pure_latex';
            confidence = 0.85;
        } else if (patterns.hasOnlyMathChars && !patterns.hasText) {
             contentType = 'mathematical_expression';
             confidence = 0.8;
        } else if(patterns.hasText) {
            contentType = 'pure_text';
            confidence = 0.7;
        }
        
        const complexity = this.calculateComplexity(trimmed);
        
        return {
            contentType,
            confidence,
            complexity,
            patterns,
            length: trimmed.length,
            recommendedRenderer: this.getRecommendedRenderer(contentType, complexity)
        };
    }

    /**
     * Uygun renderer'ı seçer ve çalıştırır
     * @param {HTMLElement} element - Render edilecek element
     * @param {string} content - Render edilecek içerik
     * @param {Object} analysis - İçerik analizi sonucu
     * @param {Object} options - Render seçenekleri
     * @returns {Promise<Object>} - Render sonucu
     */
    async selectAndRender(element, content, analysis, options) {
        const renderer = options.forceRenderer || analysis.recommendedRenderer;
        
        try {
            switch (renderer) {
                case 'mixed':
                    const mixedRenderer = await this.getMixedContentRenderer();
                    await mixedRenderer.renderMixedContent(element, content, options);
                    return { success: true, strategy: 'mixed-content-renderer' };
                    
                case 'katex':
                    await this.renderWithKatex(element, content, options);
                    return { success: true, strategy: 'katex' };
                    
                case 'mathjax':
                    await this.renderWithMathJax(element, content, options);
                    return { success: true, strategy: 'mathjax' };
                    
                case 'html':
                    await this.renderAsHtml(element, content, options);
                    return { success: true, strategy: 'html-fallback' };
                    
                default:
                    throw new Error(`Bilinmeyen renderer: ${renderer}`);
            }
            
        } catch (error) {
            return { success: false, error: error.message, strategy: renderer };
        }
    }

    /**
     * KaTeX ile render eder
     * @param {HTMLElement} element - Render edilecek element
     * @param {string} content - Render edilecek içerik
     * @param {Object} options - Render seçenekleri
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
     * MathJax ile render eder
     * @param {HTMLElement} element - Render edilecek element
     * @param {string} content - Render edilecek içerik
     * @param {Object} options - Render seçenekleri
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
     * HTML olarak render eder (fallback)
     * @param {HTMLElement} element - Render edilecek element
     * @param {string} content - Render edilecek içerik
     * @param {Object} options - Render seçenekleri
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
     * @param {HTMLElement} element - Render edilecek element
     * @param {string} content - Render edilecek içerik
     * @param {Object} options - Render seçenekleri
     * @returns {Promise<boolean>} - Fallback başarı durumu
     */
    async performFallbackRender(element, content, options) {
        for (const strategy of this.fallbackStrategies) {
            try {
                console.log(`🔄 Fallback deneniyor: ${strategy}`);
                
                switch (strategy) {
                    case 'katex':
                        await this.renderWithKatex(element, content, options);
                        break;
                    case 'mathjax':
                        await this.renderWithMathJax(element, content, options);
                        break;
                    case 'html':
                        await this.renderAsHtml(element, content, options);
                        break;
                }
                
                console.log(`✅ Fallback başarılı: ${strategy}`);
                return true;
                
            } catch (error) {
                console.warn(`⚠️ Fallback başarısız (${strategy}):`, error);
                continue;
            }
        }
        
        return false;
    }

    /**
     * Karmaşıklık hesaplama
     * @param {string} content - Analiz edilecek içerik
     * @returns {number} - Karmaşıklık skoru (0-10)
     */
    calculateComplexity(content) {
        let complexity = 0;
        
        // LaTeX komut sayısı
        const latexCommands = (content.match(/\\\w+/g) || []).length;
        complexity += latexCommands * 0.5;
        
        // Parantez derinliği
        const maxNesting = this.calculateNestingDepth(content);
        complexity += maxNesting * 0.3;
        
        // Özel karakterler
        const specialChars = (content.match(/[{}[\]()$^_]/g) || []).length;
        complexity += specialChars * 0.1;
        
        // İçerik uzunluğu
        complexity += content.length / 100;
        
        return Math.min(complexity, 10);
    }

    /**
     * Parantez derinliğini hesaplar
     * @param {string} content - Analiz edilecek içerik
     * @returns {number} - Maksimum derinlik
     */
    calculateNestingDepth(content) {
        let maxDepth = 0;
        let currentDepth = 0;
        
        for (const char of content) {
            if (char === '{' || char === '(' || char === '[') {
                currentDepth++;
                maxDepth = Math.max(maxDepth, currentDepth);
            } else if (char === '}' || char === ')' || char === ']') {
                currentDepth--;
            }
        }
        
        return maxDepth;
    }

    /**
     * Render süresini tahmin eder
     * @param {string} contentType - İçerik tipi
     * @param {number} complexity - Karmaşıklık skoru
     * @param {number} length - İçerik uzunluğu
     * @returns {number} - Tahmini render süresi (ms)
     */
    estimateRenderTime(contentType, complexity, length) {
        let baseTime = 0;
        
        switch (contentType) {
            case 'mixed':
                baseTime = 50;
                break;
            case 'pure_latex':
                baseTime = 30;
                break;
            case 'mathematical_expression':
                baseTime = 25;
                break;
            case 'pure_text':
                baseTime = 10;
                break;
        }
        
        return baseTime + (complexity * 5) + (length / 10);
    }

    /**
     * Önerilen renderer'ı belirler
     * @param {string} contentType - İçerik tipi
     * @param {number} complexity - Karmaşıklık skoru
     * @returns {string} - Önerilen renderer
     */
    getRecommendedRenderer(contentType, complexity) {
        switch (contentType) {
            case 'mixed':
                return 'mixed';
            case 'pure_latex':
                return complexity > 5 ? 'mathjax' : 'katex';
            case 'mathematical_expression':
                return 'katex';
            case 'pure_text':
                return 'html';
            default:
                return 'mixed'; // Safe fallback
        }
    }

    /**
     * Container içindeki tüm render edilebilir elementleri render eder
     * @param {HTMLElement} container - Container element
     * @param {Object} options - Render seçenekleri
     * @returns {Promise<Object>} - Render sonuç özeti
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

    // js/modules/enhancedMathRenderer.js İÇİNE YAPIŞTIRILACAK KOD

    /**
     * Container içindeki render edilebilir elementleri toplar (GÜNCELLENDİ ve HATAYA DAYANIKLI)
     * @param {HTMLElement} container - Container element
     * @returns {Array} - Render edilebilir element listesi
     */
    collectRenderableElements(container) {
        const elements = [];
        const addedElements = new Set(); // YENİ: Eklenen elementleri takip ederek kopyaları önler

        const addElementToList = (el, content, displayMode) => {
            // Eğer element DOM'da yoksa veya daha önce eklendiyse işlemi atla
            if (!el || addedElements.has(el)) {
                return;
            }
            
            // Render edilmişse tekrar ekleme
            if (this.isAlreadyRendered(el)) {
                addedElements.add(el); // Render edilmiş olsa bile tekrar taranmaması için ekle
                return;
            }

            elements.push({ element: el, content, displayMode });
            addedElements.add(el); // Elementi eklenmiş olarak işaretle
        };

        // Tüm potansiyel render hedeflerini tek bir sorguda topla
        const candidates = container.querySelectorAll(
            '.smart-content[data-content], .latex-content[data-latex], .option-text, .problem-text'
        );

        candidates.forEach(el => {
            if (el.matches('.latex-content[data-latex]')) {
                addElementToList(el, el.getAttribute('data-latex'), true);
            } else if (el.matches('.smart-content[data-content]')) {
                addElementToList(el, el.getAttribute('data-content'), false);
            } else if (el.matches('.option-text') || el.matches('.problem-text')) {
                const content = el.getAttribute('data-content') || el.textContent;
                if (content) {
                    // Bu element aynı zamanda .latex-content veya .smart-content olabilir,
                    // addElementToList fonksiyonu kopyaları engelleyecektir.
                    addElementToList(el, content, false);
                }
            }
        });

        return elements;
    }

    /**
     * Yardımcı fonksiyonlar
     */
    
    getElementId(element) {
        if (!element.id) {
            element.id = `render-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        return element.id;
    }
    
    generateCacheKey(content, options) {
        return `${this.hashString(content)}-${this.hashString(JSON.stringify(options))}`;
    }
    
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    isAlreadyRendered(element) {
        return element.classList.contains('render-success') || 
               element.classList.contains('render-fallback') ||
               element.hasAttribute('data-rendered');
    }
    
    updateAverageRenderTime(newTime) {
        this.metrics.averageRenderTime = 
            (this.metrics.averageRenderTime * (this.metrics.totalRenders - 1) + newTime) / 
            this.metrics.totalRenders;
    }

    /**
     * Debug ve istatistik fonksiyonları
     */
    
    getMetrics() {
        const errorTypesSummary = {};
        this.metrics.errorTypes.forEach((count, type) => {
            errorTypesSummary[type] = count;
        });
        
        return {
            ...this.metrics,
            errorTypes: errorTypesSummary,
            successRate: (this.metrics.successfulRenders / this.metrics.totalRenders * 100).toFixed(2) + '%',
            cacheHitRate: (this.metrics.cacheHits / this.metrics.totalRenders * 100).toFixed(2) + '%',
            fallbackRate: (this.metrics.fallbackRenders / this.metrics.totalRenders * 100).toFixed(2) + '%'
        };
    }
    
    clearCache() {
        this.renderCache.clear();
        // Mixed content renderer cache'ini de temizle (eğer yüklendiyse)
        if (this.mixedContentRenderer && typeof this.mixedContentRenderer.clearCache === 'function') {
            this.mixedContentRenderer.clearCache();
        }
        console.log('🧹 Tüm render cache temizlendi');
    }
    
    async debugRender(content, options = {}) {
        console.group(`🔍 Debug Render: ${content.substring(0, 50)}...`);
        
        const analysis = await this.analyzeContent(content);
        console.log('📊 İçerik Analizi:', analysis);
        
        // Mixed content renderer debug (eğer gerekirse)
        let segments = null;
        if (analysis.contentType === 'mixed') {
            try {
                const mixedRenderer = await this.getMixedContentRenderer();
                if (typeof mixedRenderer.debugSegmentation === 'function') {
                    segments = mixedRenderer.debugSegmentation(content);
                    console.log('🧩 Segmentasyon:', segments);
                }
            } catch (error) {
                console.warn('Mixed content debug hatası:', error);
            }
        }
        
        // Test element oluştur
        const testElement = document.createElement('div');
        testElement.style.position = 'absolute';
        testElement.style.left = '-9999px';
        document.body.appendChild(testElement);
        
        try {
            const result = await this.renderContent(testElement, content, options);
            console.log('✅ Render Sonucu:', result);
            console.log('🎨 Render Edilmiş HTML:', testElement.innerHTML);
            
            return {
                analysis,
                segments,
                renderResult: result,
                renderedHtml: testElement.innerHTML
            };
        } finally {
            document.body.removeChild(testElement);
            console.groupEnd();
        }
    }

    /**
     * Content analysis fonksiyonları (artık bind sorunsuz)
     */
    analyzeMixedContent(content) {
        const hasText = /[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+/.test(content);
        const hasMath = /\$|\\\w+/.test(content);
        return hasText && hasMath;
    }

    analyzePureLatex(content) {
        return /^[\s]*[\$\\]/.test(content.trim()) && !/[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+(?![^$]*\$)/.test(content);
    }

    analyzePureText(content) {
        return !/\$|\\\w+/.test(content);
    }

    analyzeMathExpression(content) {
        return /[\d\+\-\*\/\=\(\)\[\]\{\}]/.test(content) && !/[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(content);
    }
}

// Global instance oluştur
export const enhancedMathRenderer = new EnhancedMathRenderer();

// Auto-init
if (typeof window !== 'undefined') {
    window.enhancedMathRenderer = enhancedMathRenderer;
    console.log('✅ Gelişmiş Math Renderer hazır');
}