// enhancedAdvancedMathRenderer.js
// MathJax, KaTeX ve fallback ile gelişmiş matematik render sistemi.
// Sadece matematik render işlemleri burada olmalı.
// Ortak yardımcılar utils.js'e taşınmalı.

/**
 * Enhanced Advanced Math Renderer v2
 * - API tutarsızlığı çözümü
 * - Türkçe + LaTeX karışık içerik desteği
 * - DOM timing sorunları çözümü
 * - Akıllı fallback sistemi
 */
export class EnhancedAdvancedMathRenderer {
    constructor() {
        this.mathJaxReady = false;
        this.katexReady = false;
        this.initializationPromise = null;
        this.renderQueue = [];
        this.cache = new Map();
        this.observers = new WeakMap();
        
        // Render stratejileri
        this.renderStrategies = new Map();
        this.fallbackOrder = ['katex', 'mathjax', 'fallback'];
        
        // LaTeX normalizasyon patterns
        this.normalizationPatterns = this.initializeNormalizationPatterns();
        
        // Türkçe karşık içerik patterns
        this.mixedContentPatterns = this.initializeMixedContentPatterns();
        
        // Performance metrikleri
        this.stats = {
            totalRenders: 0,
            successfulRenders: 0,
            failedRenders: 0,
            cacheHits: 0,
            averageRenderTime: 0,
            strategyUsage: { katex: 0, mathjax: 0, fallback: 0 }
        };
        
        this.initializeSystem();
    }
    
    /**
     * Sistem başlatma - Promise tabanlı güvenli başlatma
     */
    async initializeSystem() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        
        this.initializationPromise = this.performInitialization();
        return this.initializationPromise;
    }
    
    async performInitialization() {
        console.log('🚀 Enhanced Math Renderer v2 başlatılıyor...');
        
        // Paralel başlatma
        const [mathJaxResult, katexResult] = await Promise.allSettled([
            this.initializeMathJax(),
            this.initializeKaTeX()
        ]);
        
        // Render stratejilerini kur
        this.setupRenderStrategies();
        
        // Queue'yu işle
        this.processQueue();
        
        console.log(`✅ Sistem hazır - MathJax: ${this.mathJaxReady}, KaTeX: ${this.katexReady}`);
        return true;
    }
    
    /**
     * MathJax v3 optimize edilmiş başlatma
     */
    async initializeMathJax() {
    if (typeof window.MathJax !== 'undefined' && window.MathJax.startup?.document) {
        this.mathJaxReady = true;
        return true;
    }
    
    return new Promise((resolve) => {
        window.MathJax = {
            tex: {
                inlineMath: [['$', '$'], ['\\(', '\\)']],
                displayMath: [['$$', '$$'], ['\\[', '\\]']],
                processEscapes: true,
                processEnvironments: true,
                processRefs: true,
                tags: 'ams',
                macros: {
                    '\\R': '\\mathbb{R}',
                    '\\C': '\\mathbb{C}',
                    '\\N': '\\mathbb{N}',
                    '\\Z': '\\mathbb{Z}',
                    '\\Q': '\\mathbb{Q}',
                    '\\tr': '\\text{#1}',
                    '\\turkce': '\\text{#1}'
                },
                packages: {
                    '[+]': ['ams', 'newcommand', 'configmacros', 'action', 'unicode', 'color']
                }
            },
            svg: {
                fontCache: 'global',
                displayAlign: 'left',
                displayIndent: '0',
                scale: 1,
                minScale: 0.5,
                mtextInheritFont: true
            },
            options: {
                ignoreHtmlClass: 'tex2jax_ignore|mathjax_ignore',
                processHtmlClass: 'tex2jax_process|mathjax_process|smart-content|latex-content',
                enableMenu: false
            },
            startup: {
                ready: () => {
                    console.log('✅ MathJax v3 hazır');
                    this.mathJaxReady = true;
                    window.MathJax.startup.defaultReady();
                    resolve(true);
                },
                // FIX: Güvenli pageReady implementasyonu
                pageReady: () => {
                    try {
                        // MathJax'ın kendi varsayılan pageReady metodunu çağır
                        if (window.MathJax.startup && typeof window.MathJax.startup.defaultPageReady === 'function') {
                            return window.MathJax.startup.defaultPageReady();
                        } else {
                            // Fallback: Manual initialization
                            console.log('🔧 MathJax pageReady fallback');
                            return Promise.resolve();
                        }
                    } catch (error) {
                        console.error('❌ MathJax pageReady error:', error);
                        return Promise.resolve(); // Hatayı yutarak devam et
                    }
                }
            },
            loader: {
                load: ['[tex]/ams', '[tex]/newcommand', '[tex]/configmacros', '[tex]/unicode', '[tex]/color']
            }
        };
            
            // MathJax script yükleme
            if (!document.getElementById('mathjax-script')) {
                const script = document.createElement('script');
                script.id = 'mathjax-script';
                script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
                script.async = true;
                script.onload = () => {
                    setTimeout(() => {
                        if (!this.mathJaxReady) {
                            console.warn('⚠️ MathJax yüklendi ama hazır değil, 1s bekleniyor...');
                            setTimeout(() => resolve(this.mathJaxReady), 1000);
                        }
                    }, 500);
                };
                script.onerror = () => {
                    console.error('❌ MathJax yüklenemedi');
                    resolve(false);
                };
                document.head.appendChild(script);
            }
        });
    }
    
    /**
     * KaTeX optimize edilmiş kontrol
     */
    async initializeKaTeX() {
        this.katexReady = typeof window.katex !== 'undefined';
        if (this.katexReady) {
            console.log('✅ KaTeX hazır');
        } else {
            console.warn('⚠️ KaTeX bulunamadı');
        }
        return this.katexReady;
    }
    
    /**
     * LaTeX normalizasyon patterns - API tutarsızlığı çözümü
     */
    initializeNormalizationPatterns() {
        return [
            // Backslash normalizasyonu - en kritik
            {
                name: 'backslash_normalization',
                pattern: /\\{3,}/g,
                replacement: '\\\\',
                description: 'Fazla backslash temizleme'
            },
            {
                name: 'single_backslash_commands',
                pattern: /\\([a-zA-Z]+)(?!\\)/g,
                replacement: '\\\\$1',
                description: 'Tek backslash komutları düzeltme',
                test: (content) => {
                    // Zaten çift backslash olanları atlama
                    return !content.includes('\\\\') && /\\[a-zA-Z]/.test(content);
                }
            },
            // Frac normalizasyonu
            {
                name: 'frac_normalization',
                pattern: /\\frac\s*\{\s*([^}]*)\s*\}\s*\{\s*([^}]*)\s*\}/g,
                replacement: '\\\\frac{$1}{$2}',
                description: 'Frac komutları normalizasyonu'
            },
            // Text içindeki özel karakterler
            {
                name: 'text_content_normalization',
                pattern: /\\text\{([^}]*)\}/g,
                replacement: (match, content) => {
                    // İçerdeki Türkçe karakterleri koru
                    const cleanContent = content.replace(/[{}]/g, '');
                    return `\\\\text{${cleanContent}}`;
                },
                description: 'Text içeriği normalizasyonu'
            },
            // Matematik sembolleri
            {
                name: 'math_symbols',
                pattern: /\\(sqrt|sum|int|lim|frac|dfrac|tfrac)\b/g,
                replacement: '\\\\$1',
                description: 'Matematik sembolleri normalizasyonu'
            }
        ];
    }
    
    /**
     * Türkçe karışık içerik patterns
     */
    initializeMixedContentPatterns() {
        return {
            // Türkçe kelimeler
            turkishWords: /\b(değer|değeri|olduğu|olduğuna|göre|için|ile|den|dan|da|de|bu|şu|o|ve|veya|eğer|ise|durumda|durumunda|sonuç|sonucu|cevap|cevabı|problem|problemi|soru|sorusu|çözüm|çözümü|adım|adımı|hesapla|hesaplama|bul|bulma|kaç|kaçtır|nedir|neye|nasıl)\b/gi,
            
            // Türkçe karakterler
            turkishChars: /[ğüşıöçĞÜŞİÖÇ]/g,
            
            // LaTeX delimiters
            latexDelimiters: /(\$[^$]*\$|\\\([^)]*\\\)|\\\[[^\]]*\\\]|\$\$[^$]*\$\$)/g,
            
            // Karışık içerik tespiti
            mixedContent: /(.*?)(\$[^$]*\$|\\\([^)]*\\\)|\\\[[^\]]*\\\])(.*)/g
        };
    }
    
    /**
     * Render stratejilerini kur
     */
    setupRenderStrategies() {
        // KaTeX stratejisi
        this.renderStrategies.set('katex', {
            name: 'KaTeX',
            available: () => this.katexReady,
            render: (content, element, options) => this.renderWithKaTeX(content, element, options),
            supports: (content) => {
                // KaTeX limitations check
                const unsupportedPatterns = [
                    /\\begin\{align\*?\}/,
                    /\\begin\{cases\}/,
                    /\\substack/,
                    /\\overset/,
                    /\\underset/
                ];
                return !unsupportedPatterns.some(pattern => pattern.test(content));
            }
        });
        
        // MathJax stratejisi
        this.renderStrategies.set('mathjax', {
            name: 'MathJax',
            available: () => this.mathJaxReady,
            render: (content, element, options) => this.renderWithMathJax(content, element, options),
            supports: (content) => true // MathJax her şeyi destekler
        });
        
        // Fallback stratejisi
        this.renderStrategies.set('fallback', {
            name: 'Fallback',
            available: () => true,
            render: (content, element, options) => this.renderFallback(content, element, options),
            supports: (content) => true
        });
    }
    
    /**
     * Ana render fonksiyonu - Geliştirilmiş versiyon
     */
    async render(content, element, options = {}) {
        if (!content || !element) {
            console.warn('⚠️ Render: İçerik veya element eksik');
            return false;
        }
        
        const startTime = performance.now();
        const { displayMode = false, forceStrategy = null } = options;
        
        // Cache kontrolü
        const cacheKey = `${content}-${displayMode}`;
        if (this.cache.has(cacheKey)) {
            element.innerHTML = this.cache.get(cacheKey);
            this.stats.cacheHits++;
            return true;
        }
        
        try {
            // Sistemi başlatma bekleme
            await this.initializeSystem();
            
            // İçerik analizi ve normalizasyonu
            const normalizedContent = this.normalizeLatexContent(content);
            const analysis = this.analyzeContent(normalizedContent);
            
            console.log('🔍 Content Analysis:', { 
                original: content, 
                normalized: normalizedContent, 
                analysis 
            });
            
            // Render stratejisi seçimi
            const strategy = this.selectRenderStrategy(normalizedContent, analysis, forceStrategy);
            
            if (!strategy) {
                throw new Error('Uygun render stratejisi bulunamadı');
            }
            
            // Rendering
            const result = await strategy.render(normalizedContent, element, { 
                displayMode, 
                analysis 
            });
            
            if (result) {
                // Cache'e kaydet
                this.cache.set(cacheKey, element.innerHTML);
                
                // Stilleri uygula
                this.applyStyles(element, displayMode, strategy.name);
                
                // İstatistikleri güncelle
                this.updateStats(startTime, strategy.name, true);
                
                console.log(`✅ Render başarılı: ${strategy.name}`);
                return true;
            } else {
                throw new Error(`${strategy.name} render başarısız`);
            }
            
        } catch (error) {
            console.error('❌ Render hatası:', error);
            this.renderFallback(content, element, { displayMode, error });
            this.updateStats(startTime, 'fallback', false);
            return false;
        }
    }
    
    /**
     * LaTeX içerik normalizasyonu - API tutarsızlığı çözümü
     */
    normalizeLatexContent(content) {
        if (!content || typeof content !== 'string') return '';
        
        let normalized = content.trim();
        
        // Normalizasyon patterns uygula
        for (const pattern of this.normalizationPatterns) {
            if (pattern.test && !pattern.test(normalized)) {
                continue;
            }
            
            if (typeof pattern.replacement === 'function') {
                normalized = normalized.replace(pattern.pattern, pattern.replacement);
            } else {
                normalized = normalized.replace(pattern.pattern, pattern.replacement);
            }
        }
        
        // Dış delimiterleri temizle
        normalized = normalized
            .replace(/^\$+|\$+$/g, '')
            .replace(/^\\\(|\\\)$/g, '')
            .replace(/^\\\[|\\\]$/g, '');
        
        // Çoklu boşlukları temizle
        normalized = normalized.replace(/\s+/g, ' ').trim();
        
        return normalized;
    }
    
    /**
     * Geliştirilmiş içerik analizi
     */
    analyzeContent(content) {
        const analysis = {
            type: 'unknown',
            complexity: 'simple',
            hasTurkish: false,
            hasLatex: false,
            isMixed: false,
            confidence: 0,
            patterns: []
        };
        
        // Türkçe karakterler/kelimeler kontrolü
        analysis.hasTurkish = this.mixedContentPatterns.turkishChars.test(content) ||
                              this.mixedContentPatterns.turkishWords.test(content);
        
        // LaTeX kontrolleri
        const latexIndicators = [
            /\\[a-zA-Z]+/,
            /\{[^}]*\}/,
            /\^|\_{/,
            /\$|\\\(|\\\[/
        ];
        
        analysis.hasLatex = latexIndicators.some(pattern => pattern.test(content));
        
        // Karışık içerik kontrolü
        analysis.isMixed = analysis.hasTurkish && analysis.hasLatex;
        
        // Komplekslik analizi
        const complexPatterns = [
            /\\begin\{[^}]+\}/,
            /\\frac/g,
            /\\sqrt/g,
            /\\sum|\\int|\\prod/g,
            /\\overset|\\underset/g,
            /\^{[^}]+}|_{[^}]+}/g
        ];
        
        let complexityScore = 0;
        complexPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) complexityScore += matches.length;
        });
        
        if (complexityScore === 0) {
            analysis.complexity = 'simple';
            analysis.type = analysis.hasTurkish ? 'text' : 'simple_math';
        } else if (complexityScore <= 3) {
            analysis.complexity = 'medium';
            analysis.type = analysis.isMixed ? 'mixed' : 'math';
        } else {
            analysis.complexity = 'complex';
            analysis.type = analysis.isMixed ? 'mixed_complex' : 'complex_math';
        }
        
        // Güven skoru hesaplama
        analysis.confidence = Math.min(0.9, 0.3 + (complexityScore * 0.1));
        
        return analysis;
    }
    
    /**
     * Render stratejisi seçimi
     */
    selectRenderStrategy(content, analysis, forceStrategy = null) {
        if (forceStrategy && this.renderStrategies.has(forceStrategy)) {
            const strategy = this.renderStrategies.get(forceStrategy);
            if (strategy.available()) {
                return strategy;
            }
        }
        
        // Akıllı strateji seçimi
        for (const strategyName of this.fallbackOrder) {
            const strategy = this.renderStrategies.get(strategyName);
            
            if (strategy.available() && strategy.supports(content)) {
                // Özel durumlar
                if (strategyName === 'katex' && analysis.complexity === 'complex') {
                    continue; // KaTeX karmaşık ifadeler için atla
                }
                
                if (strategyName === 'katex' && analysis.isMixed) {
                    continue; // KaTeX karışık içerik için güvenilir değil
                }
                
                return strategy;
            }
        }
        
        return null;
    }
    
    /**
     * KaTeX render - optimize edilmiş
     */
    async renderWithKaTeX(content, element, options = {}) {
        if (!this.katexReady) return false;
        
        try {
            const katexOptions = {
                displayMode: options.displayMode || false,
                throwOnError: false,
                output: 'html',
                trust: false,
                strict: 'ignore', // Türkçe karakterler için
                macros: {
                    '\\tr': '\\text{#1}',
                    '\\turkce': '\\text{#1}'
                }
            };
            
            window.katex.render(content, element, katexOptions);
            return true;
            
        } catch (error) {
            console.warn('⚠️ KaTeX render hatası:', error.message);
            return false;
        }
    }
    
    /**
     * MathJax render - optimize edilmiş
     */
    async renderWithMathJax(content, element, options = {}) {
        if (!this.mathJaxReady) return false;
        
        try {
            // İçerik türüne göre delimiters
            const displayMode = options.displayMode || false;
            const mathContent = displayMode ? `\\[${content}\\]` : `\\(${content}\\)`;
            
            // Geçici element - Türkçe karışık içerik için
            const tempElement = document.createElement('div');
            tempElement.innerHTML = mathContent;
            tempElement.style.position = 'absolute';
            tempElement.style.left = '-9999px';
            tempElement.style.visibility = 'hidden';
            document.body.appendChild(tempElement);
            
            // MathJax render
            await window.MathJax.typesetPromise([tempElement]);
            
            // Sonucu ana element'e kopyala
            element.innerHTML = tempElement.innerHTML;
            
            // Geçici element'i kaldır
            document.body.removeChild(tempElement);
            
            return true;
            
        } catch (error) {
            console.error('❌ MathJax render hatası:', error);
            return false;
        }
    }
    
    /**
     * Karışık içerik render - Türkçe + LaTeX
     */
    async renderMixedContent(content, element, options = {}) {
        try {
            const parts = this.splitMixedContentSafe(content);
            element.innerHTML = '';
            element.classList.add('mixed-content-container');
            
            for (const part of parts) {
                const partElement = document.createElement('span');
                
                if (part.type === 'latex') {
                    partElement.className = 'latex-inline-part';
                    
                    // LaTeX part render
                    const success = await this.renderWithMathJax(part.content, partElement, { displayMode: false });
                    
                    if (!success) {
                        // Fallback to KaTeX
                        const katexSuccess = await this.renderWithKaTeX(part.content, partElement, { displayMode: false });
                        if (!katexSuccess) {
                            partElement.textContent = `$${part.content}$`;
                            partElement.classList.add('render-failed');
                        }
                    }
                    
                } else {
                    // Text part
                    partElement.className = 'text-inline-part';
                    partElement.textContent = part.content;
                }
                
                element.appendChild(partElement);
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Mixed content render hatası:', error);
            return false;
        }
    }
    
    /**
     * Güvenli karışık içerik ayırma
     */
    splitMixedContentSafe(content) {
        const parts = [];
        const latexPattern = /(\$[^$]+\$|\\\([^)]+\\\)|\\\[[^\]]+\\\])/g;
        
        let lastIndex = 0;
        let match;
        let iteration = 0;
        const maxIterations = 100;
        
        while ((match = latexPattern.exec(content)) !== null && iteration < maxIterations) {
            iteration++;
            
            // Önceki metin kısmı
            if (match.index > lastIndex) {
                const textPart = content.slice(lastIndex, match.index);
                if (textPart.trim()) {
                    parts.push({ 
                        type: 'text', 
                        content: textPart.trim()
                    });
                }
            }
            
            // LaTeX kısmı
            let latexContent = match[1];
            
            // Delimiterleri temizle
            if (latexContent.startsWith('$') && latexContent.endsWith('$')) {
                latexContent = latexContent.slice(1, -1);
            } else if (latexContent.startsWith('\\(') && latexContent.endsWith('\\)')) {
                latexContent = latexContent.slice(2, -2);
            } else if (latexContent.startsWith('\\[') && latexContent.endsWith('\\]')) {
                latexContent = latexContent.slice(2, -2);
            }
            
            if (latexContent.trim()) {
                parts.push({ 
                    type: 'latex', 
                    content: latexContent.trim()
                });
            }
            
            lastIndex = match.index + match[0].length;
        }
        
        // Kalan metin
        if (lastIndex < content.length) {
            const remainingText = content.slice(lastIndex);
            if (remainingText.trim()) {
                parts.push({ 
                    type: 'text', 
                    content: remainingText.trim()
                });
            }
        }
        
        // Hiç LaTeX bulunmadıysa
        if (parts.length === 0) {
            parts.push({ type: 'text', content: content });
        }
        
        return parts;
    }
    
    /**
     * Fallback render
     */
    renderFallback(content, element, options = {}) {
        const { error, displayMode = false } = options;
        
        element.innerHTML = `
            <div class="math-fallback ${displayMode ? 'display-mode' : 'inline-mode'}">
                <span class="fallback-content">${this.escapeHtml(content)}</span>
                ${error ? `<small class="fallback-error" title="${error.message}">⚠️</small>` : ''}
            </div>
        `;
        
        element.classList.add('math-render-fallback');
        return true;
    }
    
    /**
     * Container render - toplu işlem
     */
    async renderContainer(container, displayMode = false) {
        if (!container) return;
        
        // Tüm render görevlerini topla
        const renderTasks = [];
        
        // data-latex attribute'u olanlar
        const latexElements = container.querySelectorAll('[data-latex]');
        latexElements.forEach(element => {
            const latex = element.getAttribute('data-latex');
            if (latex) {
                renderTasks.push({ element, content: latex, displayMode });
            }
        });
        
        // .smart-content sınıfı olanlar
        const smartElements = container.querySelectorAll('.smart-content[data-content]');
        smartElements.forEach(element => {
            const content = element.getAttribute('data-content');
            if (content) {
                renderTasks.push({ element, content, displayMode: false });
            }
        });
        
        // .latex-content sınıfı olanlar
        const latexContentElements = container.querySelectorAll('.latex-content[data-latex]');
        latexContentElements.forEach(element => {
            const content = element.getAttribute('data-latex');
            if (content) {
                renderTasks.push({ element, content, displayMode: true });
            }
        });
        
        // Batch render
        await this.batchRender(renderTasks);
    }
    
    /**
     * Batch render - performance optimized
     */
    async batchRender(renderTasks, batchSize = 5) {
        const results = [];
        
        for (let i = 0; i < renderTasks.length; i += batchSize) {
            const batch = renderTasks.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (task) => {
                try {
                    return await this.render(task.content, task.element, { 
                        displayMode: task.displayMode 
                    });
                } catch (error) {
                    console.warn('Batch render item hatası:', error);
                    return false;
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Batch'ler arası kısa bekleme
            if (i + batchSize < renderTasks.length) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        
        return results;
    }
    
    /**
     * Stilleri uygula
     */
    applyStyles(element, displayMode, rendererName) {
        element.classList.add('math-rendered', `rendered-by-${rendererName.toLowerCase()}`);
        
        if (displayMode) {
            element.classList.add('math-display');
            element.style.display = 'block';
            element.style.textAlign = 'center';
            element.style.margin = '1rem auto';
        } else {
            element.classList.add('math-inline');
            element.style.display = 'inline-block';
            element.style.verticalAlign = 'middle';
            element.style.margin = '0 2px';
        }
        
        // Renderer-specific styles
        if (rendererName === 'KaTeX') {
            element.style.lineHeight = '1.6';
        } else if (rendererName === 'MathJax') {
            element.style.lineHeight = '1.8';
        }
    }
    
    /**
     * Queue yönetimi
     */
    addToQueue(content, element, options) {
        this.renderQueue.push({ content, element, options });
    }
    
    async processQueue() {
        if (this.renderQueue.length === 0) return;
        
        console.log(`📋 Queue işleniyor: ${this.renderQueue.length} görev`);
        
        const queue = [...this.renderQueue];
        this.renderQueue = [];
        
        for (const item of queue) {
            await this.render(item.content, item.element, item.options);
        }
    }
    
    /**
     * Observer-based DOM watching
     */
    observeElement(element, callback) {
        if (this.observers.has(element)) return;
        
        const observer = new MutationObserver((mutations) => {
            let shouldRerender = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || 
                    (mutation.type === 'attributes' && 
                     ['data-latex', 'data-content'].includes(mutation.attributeName))) {
                    shouldRerender = true;
                }
            });
            
            if (shouldRerender) {
                callback();
            }
        });
        
        observer.observe(element, {
            childList: true,
            attributes: true,
            attributeFilter: ['data-latex', 'data-content'],
            subtree: true
        });
        
        this.observers.set(element, observer);
    }
    
    /**
     * İstatistikleri güncelle
     */
    updateStats(startTime, strategy, success) {
        const renderTime = performance.now() - startTime;
        
        this.stats.totalRenders++;
        if (success) {
            this.stats.successfulRenders++;
        } else {
            this.stats.failedRenders++;
        }
        
        this.stats.strategyUsage[strategy.toLowerCase()]++;
        
        // Ortalama render time güncelle
        const totalTime = this.stats.averageRenderTime * (this.stats.totalRenders - 1) + renderTime;
        this.stats.averageRenderTime = totalTime / this.stats.totalRenders;
    }
    
    /**
     * Cache yönetimi
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 Render cache temizlendi');
    }
    
    getCacheStats() {
        return {
            size: this.cache.size,
            hitRate: this.stats.totalRenders > 0 ? 
                (this.stats.cacheHits / this.stats.totalRenders) * 100 : 0
        };
    }
    
    /**
     * Debug ve istatistikler
     */
    getStats() {
        return {
            ...this.stats,
            cache: this.getCacheStats(),
            systemReady: {
                mathJax: this.mathJaxReady,
                katex: this.katexReady,
                initialized: this.initializationPromise !== null
            },
            strategies: Array.from(this.renderStrategies.keys()).map(key => ({
                name: key,
                available: this.renderStrategies.get(key).available()
            }))
        };
    }
    
    /**
     * Sistem sağlığı kontrolü
     */
    async healthCheck() {
        const health = {
            status: 'healthy',
            checks: {},
            timestamp: new Date().toISOString()
        };
        
        // MathJax kontrolü
        health.checks.mathjax = {
            available: this.mathJaxReady,
            version: this.mathJaxReady ? window.MathJax?.version : null
        };
        
        // KaTeX kontrolü
        health.checks.katex = {
            available: this.katexReady,
            version: this.katexReady ? window.katex?.version : null
        };
        
        // Test render
        try {
            const testElement = document.createElement('div');
            testElement.style.position = 'absolute';
            testElement.style.left = '-9999px';
            document.body.appendChild(testElement);
            
            const testResult = await this.render('x^2 + y^2 = z^2', testElement);
            health.checks.testRender = { success: testResult };
            
            document.body.removeChild(testElement);
        } catch (error) {
            health.checks.testRender = { success: false, error: error.message };
            health.status = 'degraded';
        }
        
        // Cache performansı
        const cacheStats = this.getCacheStats();
        health.checks.cache = {
            size: cacheStats.size,
            hitRate: cacheStats.hitRate,
            healthy: cacheStats.hitRate > 20 || this.stats.totalRenders < 10
        };
        
        return health;
    }
    
    /**
     * Yardımcı fonksiyonlar
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Cleanup
     */
    destroy() {
        // Observers temizle
        this.observers.forEach((observer, element) => {
            observer.disconnect();
        });
        this.observers.clear();
        
        // Cache temizle
        this.clearCache();
        
        // Queue temizle
        this.renderQueue = [];
        
        console.log('🧹 Enhanced Math Renderer destroyed');
    }
}
// Enhanced LaTeX Normalizer - Complete Solution for Math Rendering
// Fixes backslash inconsistency from API responses

export class EnhancedLatexNormalizer {
    constructor() {
        this.patterns = this.initializeNormalizationPatterns();
        this.cache = new Map();
        this.debugMode = false;
    }

    /**
     * Main normalization function - handles all API inconsistencies
     * @param {string} content - Raw LaTeX content from API
     * @returns {string} - Normalized LaTeX ready for rendering
     */
    normalizeLatex(content) {
        if (!content || typeof content !== 'string') {
            return '';
        }

        // Check cache first
        const cacheKey = this.generateCacheKey(content);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        let normalized = content.trim();

        // Step 1: Clean and prepare
        normalized = this.cleanRawContent(normalized);

        // Step 2: Normalize backslashes (CRITICAL)
        normalized = this.normalizeBackslashes(normalized);

        // Step 3: Fix common LaTeX patterns  
        normalized = this.fixLatexPatterns(normalized);

        // Step 4: Remove outer delimiters
        normalized = this.removeOuterDelimiters(normalized);

        // Step 5: Final cleanup
        normalized = this.finalCleanup(normalized);

        // Cache result
        this.cache.set(cacheKey, normalized);

        if (this.debugMode) {
            console.log('LaTeX Normalization:', {
                original: content,
                normalized: normalized,
                changes: content !== normalized
            });
        }

        return normalized;
    }

    /**
     * Clean raw content from API response
     */
    cleanRawContent(content) {
        return content
            // Remove Unicode issues
            .replace(/[\u201C\u201D]/g, '"')  // Smart quotes
            .replace(/[\u2018\u2019]/g, "'")  // Smart apostrophes
            .replace(/[\u2013\u2014]/g, "-")  // En/em dashes
            
            // Remove control characters
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
            
            // Normalize whitespace
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * CRITICAL: Normalize backslashes from API inconsistency
     * APIs return 1, 2, or 4 backslashes inconsistently
     */
    normalizeBackslashes(content) {
        // Strategy: Convert all to single backslash first, then to proper LaTeX

        let normalized = content;

        // Step 1: Detect and fix quadruple backslashes (\\\\)
        normalized = normalized.replace(/\\{4,}/g, '\\');

        // Step 2: Fix triple backslashes (\\\)
        normalized = normalized.replace(/\\{3}/g, '\\');

        // Step 3: Handle double backslashes - keep only for line breaks
        // Preserve \\ for actual line breaks in LaTeX, but fix command backslashes
        normalized = this.intelligentDoubleBackslashFix(normalized);

        return normalized;
    }

    /**
     * Intelligent handling of double backslashes
     * Preserves legitimate \\ (line breaks) while fixing command backslashes
     */
    intelligentDoubleBackslashFix(content) {
        // Common LaTeX commands that should have single backslash
        const commands = [
            'frac', 'sqrt', 'sum', 'int', 'lim', 'sin', 'cos', 'tan', 'log', 'ln',
            'alpha', 'beta', 'gamma', 'delta', 'theta', 'lambda', 'mu', 'pi', 'sigma',
            'text', 'mathbb', 'mathbf', 'mathrm', 'left', 'right', 'begin', 'end',
            'times', 'div', 'pm', 'mp', 'leq', 'geq', 'neq', 'approx', 'infty'
        ];

        let result = content;

        // Fix double backslashes before known commands
        commands.forEach(cmd => {
            const pattern = new RegExp(`\\\\\\\\${cmd}\\b`, 'g');
            result = result.replace(pattern, `\\${cmd}`);
        });

        // Fix double backslashes in common patterns
        result = result
            // Fix \\{ and \\}
            .replace(/\\\\([{}])/g, '\\$1')
            // Fix \\( and \\)
            .replace(/\\\\([()])/g, '\\$1')
            // Fix \\[ and \\]
            .replace(/\\\\([\[\]])/g, '\\$1')
            // Fix \\^, \\_, etc.
            .replace(/\\\\([_^&%$#])/g, '\\$1');

        return result;
    }

    /**
     * Fix common LaTeX patterns
     */
    fixLatexPatterns(content) {
        let result = content;

        this.patterns.forEach(pattern => {
            if (typeof pattern.replacement === 'function') {
                result = result.replace(pattern.pattern, pattern.replacement);
            } else {
                result = result.replace(pattern.pattern, pattern.replacement);
            }
        });

        return result;
    }

    /**
     * Remove outer delimiters that shouldn't be there
     */
    removeOuterDelimiters(content) {
        return content
            .replace(/^\$+|\$+$/g, '')        // Remove outer $
            .replace(/^\\\(|\\\)$/g, '')      // Remove outer \( \)
            .replace(/^\\\[|\\\]$/g, '')      // Remove outer \[ \]
            .replace(/^\${2,}|\${2,}$/g, ''); // Remove outer $$
    }

    /**
     * Final cleanup
     */
    finalCleanup(content) {
        return content
            .replace(/\s+/g, ' ')  // Normalize spaces
            .replace(/\s*([{}])\s*/g, '$1')  // Remove spaces around braces
            .trim();
    }

    /**
     * Initialize normalization patterns
     */
    initializeNormalizationPatterns() {
        return [
            // Fraction normalization
            {
                name: 'frac_spaces',
                pattern: /\\frac\s*\{\s*([^}]*)\s*\}\s*\{\s*([^}]*)\s*\}/g,
                replacement: '\\frac{$1}{$2}'
            },

            // Square root normalization  
            {
                name: 'sqrt_spaces',
                pattern: /\\sqrt\s*\{\s*([^}]*)\s*\}/g,
                replacement: '\\sqrt{$1}'
            },

            // Text command normalization
            {
                name: 'text_normalization',
                pattern: /\\text\s*\{\s*([^}]*)\s*\}/g,
                replacement: '\\text{$1}'
            },

            // Sum, integral, limit normalization
            {
                name: 'math_operators',
                pattern: /\\(sum|int|lim|prod)\s*_\s*\{\s*([^}]*)\s*\}\s*\^\s*\{\s*([^}]*)\s*\}/g,
                replacement: '\\$1_{$2}^{$3}'
            },

            // Superscript/subscript spacing
            {
                name: 'super_sub_script',
                pattern: /([a-zA-Z0-9}])\s*([_^])\s*\{\s*([^}]*)\s*\}/g,
                replacement: '$1$2{$3}'
            },

            // Left/right delimiter spacing
            {
                name: 'left_right_delimiters',
                pattern: /\\left\s*([()[\]|])\s*(.*?)\s*\\right\s*([()[\]|])/g,
                replacement: '\\left$1$2\\right$3'
            }
        ];
    }

    /**
     * Generate cache key
     */
    generateCacheKey(content) {
        // Simple hash for caching
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Enable/disable debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }

    /**
     * Get normalization statistics
     */
    getStats() {
        return {
            cacheSize: this.cache.size,
            patternsCount: this.patterns.length
        };
    }
}

/**
 * Enhanced Math Renderer with proper normalization
 */
export class EnhancedMathRenderer {
    constructor() {
        this.normalizer = new EnhancedLatexNormalizer();
        this.mathJaxReady = false;
        this.katexReady = false;
        this.cache = new Map();
        
        this.initializeRenderers();
    }

    async initializeRenderers() {
        // Initialize MathJax
        await this.initializeMathJax();
        
        // Check KaTeX
        this.katexReady = typeof window.katex !== 'undefined';
        
        console.log(`Math Renderer Ready - MathJax: ${this.mathJaxReady}, KaTeX: ${this.katexReady}`);
    }

    async initializeMathJax() {
        if (typeof window.MathJax !== 'undefined') {
            this.mathJaxReady = true;
            return;
        }

        return new Promise((resolve) => {
            window.MathJax = {
                tex: {
                    inlineMath: [['$', '$'], ['\\(', '\\)']],
                    displayMath: [['$$', '$$'], ['\\[', '\\]']],
                    processEscapes: true,
                    processEnvironments: true,
                    tags: 'ams',
                    macros: {
                        '\\R': '\\mathbb{R}',
                        '\\C': '\\mathbb{C}',
                        '\\N': '\\mathbb{N}',
                        '\\Z': '\\mathbb{Z}',
                        '\\Q': '\\mathbb{Q}'
                    }
                },
                svg: {
                    fontCache: 'global',
                    displayAlign: 'left',
                    scale: 1
                },
                startup: {
                    ready: () => {
                        this.mathJaxReady = true;
                        window.MathJax.startup.defaultReady();
                        resolve();
                    }
                }
            };

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
            script.async = true;
            document.head.appendChild(script);
        });
    }

    /**
     * Main render function with normalization
     */
    async render(content, element, options = {}) {
        if (!content || !element) {
            console.warn('Missing content or element for rendering');
            return false;
        }

        try {
            // CRITICAL: Normalize LaTeX first
            const normalizedContent = this.normalizer.normalizeLatex(content);
            
            if (!normalizedContent) {
                element.textContent = content;
                return false;
            }

            // Try rendering with available engines
            if (this.mathJaxReady) {
                return await this.renderWithMathJax(normalizedContent, element, options);
            } else if (this.katexReady) {
                return await this.renderWithKaTeX(normalizedContent, element, options);
            } else {
                // Fallback
                element.textContent = content;
                element.classList.add('math-fallback');
                return false;
            }

        } catch (error) {
            console.error('Math rendering error:', error);
            element.textContent = content;
            element.classList.add('math-render-error');
            return false;
        }
    }

    async renderWithMathJax(content, element, options = {}) {
        if (!this.mathJaxReady) return false;

        try {
            const displayMode = options.displayMode || false;
            const mathContent = displayMode ? `\\[${content}\\]` : `\\(${content}\\)`;
            
            element.innerHTML = mathContent;
            await window.MathJax.typesetPromise([element]);
            
            return true;
        } catch (error) {
            console.error('MathJax render error:', error);
            return false;
        }
    }

    async renderWithKaTeX(content, element, options = {}) {
        if (!this.katexReady) return false;

        try {
            const katexOptions = {
                displayMode: options.displayMode || false,
                throwOnError: false,
                strict: 'ignore'
            };

            window.katex.render(content, element, katexOptions);
            return true;
        } catch (error) {
            console.error('KaTeX render error:', error);
            return false;
        }
    }

    /**
     * Render container with all math content
     */
    async renderContainer(container, displayMode = false) {
        if (!container) return;

        const mathElements = container.querySelectorAll('[data-latex], .smart-content[data-content]');
        
        for (const element of mathElements) {
            const content = element.getAttribute('data-latex') || element.getAttribute('data-content');
            if (content) {
                await this.render(content, element, { displayMode });
            }
        }
    }

    /**
     * Enable debug mode for normalizer
     */
    enableDebug() {
        this.normalizer.setDebugMode(true);
    }

    /**
     * Get system status
     */
    getStatus() {
        return {
            mathJaxReady: this.mathJaxReady,
            katexReady: this.katexReady,
            normalizerStats: this.normalizer.getStats()
        };
    }
}

// Example usage and testing
export function testNormalization() {
    const normalizer = new EnhancedLatexNormalizer();
    normalizer.setDebugMode(true);

    const testCases = [
        // API inconsistency examples
        '\\\\frac{1}{2}',           // Double backslash
        '\\\\\\\\frac{a}{b}',       // Quadruple backslash  
        '\\frac{x}{y}',             // Single backslash (correct)
        '\\\\sum_{i=1}^{n} x_i',    // Mixed backslashes
        '\\\\sqrt{\\\\frac{a}{b}}', // Nested double backslashes
        
        // Complex expressions
        '$\\\\int_{0}^{\\\\infty} e^{-x} dx$',
        '\\\\left(\\\\frac{1}{2}\\\\right)^2',
        '\\\\text{Solution: } x = \\\\frac{-b \\\\pm \\\\sqrt{b^2-4ac}}{2a}'
    ];

    console.log('=== LaTeX Normalization Tests ===');
    testCases.forEach((test, index) => {
        const result = normalizer.normalizeLatex(test);
        console.log(`Test ${index + 1}:`, {
            input: test,
            output: result,
            changed: test !== result
        });
    });
}

// Create global instance
export const mathRenderer = new EnhancedMathRenderer();

// Make available globally
if (typeof window !== 'undefined') {
    window.mathRenderer = mathRenderer;
    window.testNormalization = testNormalization;
    
    console.log('Enhanced Math Renderer loaded. Try: testNormalization()');
}
// =================================================================================
//  Enhanced UI Module - DOM Timing Sorunları Çözümü
// =================================================================================

/**
 * Enhanced UI fonksiyonları - DOM timing sorunları çözümü
 */
export class EnhancedMathUI {
    constructor(renderer) {
        this.renderer = renderer;
        this.pendingRenders = new Set();
        this.domReady = document.readyState === 'complete';
        
        if (!this.domReady) {
            document.addEventListener('DOMContentLoaded', () => {
                this.domReady = true;
                this.processPendingRenders();
            });
        }
    }
    
    /**
     * DOM-ready aware render
     */
    async renderMath(content, element, options = {}) {
        if (!this.domReady) {
            this.pendingRenders.add({ content, element, options });
            return false;
        }
        
        // Element DOM'da mı kontrol et
        if (!document.contains(element)) {
            console.warn('⚠️ Element DOM\'da değil, render bekletiliyor');
            await this.waitForElementInDOM(element);
        }
        
        return await this.renderer.render(content, element, options);
    }
    
    /**
     * Element DOM'a eklenmesini bekle
     */
    async waitForElementInDOM(element, timeout = 5000) {
        return new Promise((resolve) => {
            if (document.contains(element)) {
                resolve(true);
                return;
            }
            
            const observer = new MutationObserver((mutations) => {
                if (document.contains(element)) {
                    observer.disconnect();
                    resolve(true);
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            // Timeout
            setTimeout(() => {
                observer.disconnect();
                resolve(false);
            }, timeout);
        });
    }
    
    /**
     * Bekleyen render'ları işle
     */
    async processPendingRenders() {
        if (this.pendingRenders.size === 0) return;
        
        console.log(`📋 Bekleyen ${this.pendingRenders.size} render işleniyor...`);
        
        const renders = Array.from(this.pendingRenders);
        this.pendingRenders.clear();
        
        for (const { content, element, options } of renders) {
            await this.renderMath(content, element, options);
        }
    }
    
    /**
     * Container render - improved timing
     */
    async renderMathInContainer(container, displayMode = false) {
        if (!container) {
            console.warn('⚠️ Container eksik');
            return;
        }
        
        if (!this.domReady) {
            this.pendingRenders.add({ 
                method: 'renderContainer', 
                args: [container, displayMode] 
            });
            return;
        }
        
        try {
            await this.renderer.renderContainer(container, displayMode);
            console.log('✅ Container render tamamlandı');
        } catch (error) {
            console.error('❌ Container render hatası:', error);
        }
    }
    
    /**
     * Smart content render - auto-detect
     */
    async renderSmartContent(container) {
        if (!container) return;
        
        const smartElements = container.querySelectorAll('.smart-content[data-content]');
        const renderTasks = [];
        
        smartElements.forEach(element => {
            const content = element.getAttribute('data-content');
            if (content) {
                renderTasks.push({ 
                    element, 
                    content, 
                    displayMode: false 
                });
            }
        });
        
        await this.renderer.batchRender(renderTasks);
    }
    
    /**
     * LaTeX content render
     */
    async renderLatexContent(container) {
        if (!container) return;
        
        const latexElements = container.querySelectorAll('.latex-content[data-latex]');
        const renderTasks = [];
        
        latexElements.forEach(element => {
            const latex = element.getAttribute('data-latex');
            if (latex) {
                renderTasks.push({ 
                    element, 
                    content: latex, 
                    displayMode: true 
                });
            }
        });
        
        await this.renderer.batchRender(renderTasks);
    }
    
    /**
     * Auto-observer setup
     */
    observeAndRender(container) {
        this.renderer.observeElement(container, () => {
            this.renderMathInContainer(container);
        });
    }
}

// =================================================================================
//  Singleton Instances ve Export
// =================================================================================

// Enhanced renderer instance
export const enhancedMathRenderer = new EnhancedAdvancedMathRenderer();

// Enhanced UI instance
export const enhancedMathUI = new EnhancedMathUI(enhancedMathRenderer);

// Backward compatibility
export const advancedMathRenderer = enhancedMathRenderer;


// Global erişim
if (typeof window !== 'undefined') {
    window.enhancedMathRenderer = enhancedMathRenderer;
    window.enhancedMathUI = enhancedMathUI;
    window.advancedMathRenderer = enhancedMathRenderer; // Backward compatibility
    
    // Debug konsol komutları
    window.mathDebug = {
        stats: () => enhancedMathRenderer.getStats(),
        health: () => enhancedMathRenderer.healthCheck(),
        clearCache: () => enhancedMathRenderer.clearCache(),
        testRender: async (content) => {
            const testEl = document.createElement('div');
            document.body.appendChild(testEl);
            const result = await enhancedMathRenderer.render(content, testEl);
            console.log('Test render result:', result, testEl.innerHTML);
            document.body.removeChild(testEl);
            return result;
        }
    };
}

console.log('🚀 Enhanced Advanced Math Renderer v2 yüklendi');