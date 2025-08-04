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
     * Ana render fonksiyonu - GELİŞTİRİLDİ
     * @param {HTMLElement} element - Render edilecek element
     * @param {string} content - Render edilecek içerik
     * @param {Object} options - Render seçenekleri
     * @returns {Promise<Object>} - Render sonucu
     */
    async renderContent(element, content, options = {}) {
        if (!element || !content) {
            throw new Error('Element ve içerik gerekli');
        }

        const startTime = performance.now();
        
        try {
            // Cache kontrolü
            const cacheKey = this.generateCacheKey(content, options);
            if (this.renderCache.has(cacheKey)) {
                const cachedResult = this.renderCache.get(cacheKey);
                element.innerHTML = cachedResult.html;
                element.className = cachedResult.className;
                return cachedResult;
            }

            // İçerik analizi
            const analysis = await this.analyzeContent(content);
            
            // Renderer seçimi ve render
            const result = await this.selectAndRender(element, content, analysis, options);
            
            if (result.success) {
                // Cache'e kaydet
                const renderTime = performance.now() - startTime;
                this.updateAverageRenderTime(renderTime);
                
                const cacheData = {
                    html: element.innerHTML,
                    className: element.className,
                    strategy: result.strategy,
                    renderTime: renderTime
                };
                this.renderCache.set(cacheKey, cacheData);
                
                return {
                    success: true,
                    strategy: result.strategy,
                    renderTime: renderTime,
                    analysis: analysis
                };
            } else {
                // Render başarısız, fallback dene
                if (options.enableFallback !== false) {
                    return await this.performFallbackRender(element, content, options);
                } else {
                    throw new Error(`Render başarısız: ${result.error}`);
                }
            }
            
        } catch (error) {
            console.error('Render hatası:', error);
            
            // Fallback render dene
            if (options.enableFallback !== false) {
                return await this.performFallbackRender(element, content, options);
            } else {
                throw error;
            }
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
            hasTurkish: false,
            latexAnalysis: null // YENİ
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
            greekLetters: /\\(?:alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega)/g,
            // YENİ: Karmaşık LaTeX pattern'leri
            complexIntegrals: /\\\[[^\]]+\\\]/g,
            complexFractions: /\\frac\s*\{[^}]*\}\s*\{[^}]*\}/g,
            complexRoots: /\\sqrt(?:\[[^\]]*\])?\{[^}]*\}/g,
            complexSuperscripts: /[a-zA-Z]\^\{[^}]+\}/g,
            complexSubscripts: /[a-zA-Z]_\{[^}]+\}/g,
            turkishLatex: /\\[cCgGiIoOsSuU]/g
        };

        // Her pattern için kontrol
        let totalLatexMatches = 0;
        let latexContentRatio = 0;

        Object.entries(latexPatterns).forEach(([patternName, pattern]) => {
            const matches = content.match(pattern);
            if (matches) {
                analysis.patterns[patternName] = matches.length;
                totalLatexMatches += matches.length;
                analysis.hasLatex = true;
            }
        });

        // LaTeX içerik oranını hesapla
        if (analysis.hasLatex) {
            const latexContent = content.match(/\$[^\$]+\$|\$\$[^\$]+\$\$|\\\[[^\]]+\\\]|\\[a-zA-Z]+/g);
            if (latexContent) {
                const totalLatexLength = latexContent.join('').length;
                latexContentRatio = totalLatexLength / content.length;
            }
        }

        // YENİ: LaTeX analizi
        if (analysis.hasLatex) {
            analysis.latexAnalysis = this.analyzeLatexContent(content);
        }

        // İçerik tipini belirle
        if (analysis.hasLatex && latexContentRatio > 0.3) {
            analysis.contentType = 'pure_latex';
            analysis.confidence = Math.min(0.9, latexContentRatio);
        } else if (analysis.hasLatex && latexContentRatio > 0.1) {
            analysis.contentType = 'mixed';
            analysis.confidence = 0.7;
        } else if (analysis.hasTurkish && !analysis.hasLatex) {
            analysis.contentType = 'pure_text';
            analysis.confidence = 0.8;
        } else if (content.length < 50 && /[a-zA-Z]/.test(content)) {
            analysis.contentType = 'mathematical_expression';
            analysis.confidence = 0.6;
        } else {
            analysis.contentType = 'pure_text';
            analysis.confidence = 0.5;
        }

        // Karmaşıklık hesaplama - GELİŞTİRİLDİ
        analysis.complexity = this.calculateComplexity(analysis);

        return analysis;
    }

    /**
     * YENİ: LaTeX içerik analizi - GELİŞTİRİLDİ
     */
    analyzeLatexContent(content) {
        const analysis = {
            complexity: 0,
            hasFractions: false,
            hasIntegrals: false,
            hasSuperscripts: false,
            hasSubscripts: false,
            hasRoots: false,
            hasTurkish: false,
            hasComplexStructures: false,
            hasLogarithms: false,
            hasDerivatives: false,
            hasLimits: false,
            hasSums: false,
            isValid: true,
            issues: []
        };

        // Temel yapıları kontrol et
        analysis.hasFractions = /\\frac/.test(content);
        analysis.hasIntegrals = /\\int/.test(content);
        analysis.hasSuperscripts = /\^/.test(content);
        analysis.hasSubscripts = /_/.test(content);
        analysis.hasRoots = /\\sqrt/.test(content);
        analysis.hasTurkish = /[ğĞıİöÖşŞüÜçÇ]/.test(content);
        analysis.hasLogarithms = /\\log/.test(content);
        analysis.hasDerivatives = /\\frac\s*d/.test(content) || /\\partial/.test(content);
        analysis.hasLimits = /\\lim/.test(content);
        analysis.hasSums = /\\sum/.test(content);
        
        // Karmaşık yapıları kontrol et
        analysis.hasComplexStructures = /\\\[[^\]]+\\\]/.test(content) || 
                                       /\\frac\s*\{[^}]*\}\s*\{[^}]*\}/.test(content) ||
                                       /\\sqrt(?:\[[^\]]*\])?\{[^}]*\}/.test(content) ||
                                       /\\left[\(\)\[\]\{\}][^\\]*\\right[\(\)\[\]\{\}]/.test(content);

        // Sorunları tespit et
        if (content.includes('\\[') && !content.includes('\\]')) {
            analysis.issues.push('Unclosed display math');
            analysis.isValid = false;
        }
        
        if (content.includes('\\frac{') && !content.includes('}')) {
            analysis.issues.push('Unclosed fraction');
            analysis.isValid = false;
        }

        if (content.includes('\\sqrt{') && !content.includes('}')) {
            analysis.issues.push('Unclosed root');
            analysis.isValid = false;
        }

        if (content.includes('\\int_') && !content.includes('^') && !content.includes('d')) {
            analysis.issues.push('Incomplete integral');
            analysis.isValid = false;
        }

        // Karmaşıklık skoru - GELİŞTİRİLDİ
        const complexityFactors = [
            analysis.hasFractions,
            analysis.hasIntegrals,
            analysis.hasSuperscripts,
            analysis.hasSubscripts,
            analysis.hasRoots,
            analysis.hasComplexStructures,
            analysis.hasLogarithms,
            analysis.hasDerivatives,
            analysis.hasLimits,
            analysis.hasSums
        ];
        
        analysis.complexity = complexityFactors.filter(Boolean).length;

        return analysis;
    }

    /**
     * YENİ: Karmaşıklık hesaplama
     */
    calculateComplexity(analysis) {
        let complexity = 0;
        
        // LaTeX karmaşıklığı
        if (analysis.hasLatex) {
            complexity += 2;
            if (analysis.latexAnalysis) {
                complexity += analysis.latexAnalysis.complexity;
            }
        }
        
        // Türkçe karakter karmaşıklığı
        if (analysis.hasTurkish) {
            complexity += 1;
        }
        
        // İçerik uzunluğu karmaşıklığı
        if (analysis.length > 100) {
            complexity += 1;
        }
        
        // Pattern karmaşıklığı
        const patternCount = Object.keys(analysis.patterns).length;
        complexity += Math.min(patternCount, 3);
        
        return Math.min(complexity, 10); // Maksimum 10
    }

    /**
     * Türkçe karakter düzeltmeleri - GELİŞTİRİLDİ
     */
    fixTurkishCharacters(content) {
        if (!content || typeof content !== 'string') return content;
        
        let fixed = content;
        
        // 1. Escape karakterleri düzelt
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
        
        // 2. Unicode birleşik karakterleri düzelt
        fixed = fixed.replace(/g\u02d8/g, 'ğ');
        fixed = fixed.replace(/s\u0327/g, 'ş');
        fixed = fixed.replace(/c\u0327/g, 'ç');
        
        // 3. Zero-width space karakterlerini temizle
        fixed = fixed.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
        
        // 4. Birleşik kelimeleri akıllıca ayır
        fixed = fixed.replace(/([a-zğüşıöç])([A-ZĞÜŞİÖÇ])/g, '$1 $2');
        
        // 5. LaTeX komutlarından sonra gelen metni ayır
        fixed = fixed.replace(/(\})([a-zA-ZğüşıöçĞÜŞİÖÇ])/g, '$1 $2');
        fixed = fixed.replace(/([a-zA-ZğüşıöçĞÜŞİÖÇ])(\$)/g, '$1 $2');
        
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
        
        try {
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
                    '\\Q': '\\mathbb{Q}',
                    '\\lim': '\\lim',
                    '\\log': '\\log',
                    '\\ln': '\\ln',
                    '\\sin': '\\sin',
                    '\\cos': '\\cos',
                    '\\tan': '\\tan',
                    '\\cot': '\\cot',
                    '\\sec': '\\sec',
                    '\\csc': '\\csc',
                    '\\exp': '\\exp',
                    '\\int': '\\int',
                    '\\sum': '\\sum',
                    '\\prod': '\\prod',
                    '\\partial': '\\partial',
                    '\\infty': '\\infty',
                    '\\alpha': '\\alpha',
                    '\\beta': '\\beta',
                    '\\gamma': '\\gamma',
                    '\\delta': '\\delta',
                    '\\epsilon': '\\epsilon',
                    '\\zeta': '\\zeta',
                    '\\eta': '\\eta',
                    '\\theta': '\\theta',
                    '\\iota': '\\iota',
                    '\\kappa': '\\kappa',
                    '\\lambda': '\\lambda',
                    '\\mu': '\\mu',
                    '\\nu': '\\nu',
                    '\\xi': '\\xi',
                    '\\pi': '\\pi',
                    '\\rho': '\\rho',
                    '\\sigma': '\\sigma',
                    '\\tau': '\\tau',
                    '\\upsilon': '\\upsilon',
                    '\\phi': '\\phi',
                    '\\chi': '\\chi',
                    '\\psi': '\\psi',
                    '\\omega': '\\omega'
                },
                errorColor: '#cc0000',
                minRuleThickness: 0.05,
                colorIsTextColor: false,
                maxSize: Infinity,
                maxExpand: 1000,
                strict: false
            });
        } catch (error) {
            console.warn('KaTeX render hatası:', error);
            // Fallback: HTML olarak göster
            element.innerHTML = `<span class="math-error" title="Render hatası: ${error.message}">${this.escapeHtml(content)}</span>`;
            element.classList.add('render-fallback');
        }
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
     * Fallback render - GELİŞTİRİLDİ
     */
    async performFallbackRender(element, content, options) {
        try {
            console.log('🔄 Fallback render deneniyor...');
            
            // MixedContentRenderer'ı kullan
            const mixedRenderer = await this.getMixedContentRenderer();
            
            // İçeriği optimize et
            const optimizedContent = mixedRenderer.optimizeLatex(content);
            
            // Fallback HTML oluştur
            const fallbackHtml = mixedRenderer.createSimpleMathFallback(
                optimizedContent,
                'math-fallback-enhanced',
                content
            );
            
            element.innerHTML = fallbackHtml;
            element.classList.add('render-fallback');
            element.classList.add('enhanced-fallback');
            
            console.log('✅ Fallback render başarılı');
            
            return {
                success: true,
                strategy: 'fallback',
                renderTime: 0,
                analysis: { contentType: 'fallback' }
            };
            
        } catch (fallbackError) {
            console.error('❌ Fallback render hatası:', fallbackError);
            
            // En son çare: plain text göster
            element.textContent = content;
            element.classList.add('render-fallback');
            element.classList.add('plain-text-fallback');
            
            return {
                success: false,
                strategy: 'plain-text',
                error: fallbackError.message,
                renderTime: 0,
                analysis: { contentType: 'plain-text' }
            };
        }
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