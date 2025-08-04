// =================================================================================
//  MathAi - Gelişmiş Matematiksel İfade Render Modülü
//  MathJax v3 + KaTeX Hybrid Sistem - Türkçe Optimized - Güçlendirilmiş Sürüm
// =================================================================================

/**
 * Gelişmiş Hybrid Math Renderer - MathJax v3 & KaTeX
 * Türkçe metin + LaTeX karışık içerik için optimize edilmiş
 */
export class AdvancedMathRenderer {
    constructor() {
        this.mathJaxReady = false;
        this.katexReady = false;
        this.renderQueue = [];
        this.cache = new Map();
        this.analysisCache = new Map(); // Analiz sonuçları için cache

        // 1. Render Queue Yönetimi Güçlendirmesi
        this.renderingInProgress = new Set(); // Aktif render işlemleri
        this.renderTimeout = 10000; // 10 saniye timeout
        this.retryAttempts = new Map(); // Başarısız render denemeleri

        // Türkçe metin tanıma patterns
        this.turkishPatterns = {
            words: /\b(değer|değeri|olduğu|olduğuna|göre|için|ile|den|dan|da|de|bu|şu|o|ve|veya|eğer|ise|durumda|durumunda|sonuç|sonucu|cevap|cevabı|problem|problemi|soru|sorusu|çözüm|çözümü|adım|adımı|hesapla|hesaplama|bul|bulma|kaç|kaçtır|nedir|neye|nasıl|kimse|kimde|nerede|ne|neler|hangi|hangisi)\b/gi,
            chars: /[ğüşıöçĞÜŞİÖÇ]/g,
            verbs: /\b(olur|olacak|oluyor|olmuş|gelir|gider|yapar|yapıyor|eder|ediyor|alır|alıyor|verir|veriyor)\b/gi,
            numbers: /\b(bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on|yüz|bin|milyon|birinci|ikinci|üçüncü)\b/gi
        };

        // LaTeX complexity patterns
        this.latexComplexity = {
            simple: /^[\s\d\w+\-*/=<>()[\]{}^_.,!?]*$/,
            basicMath: /\\(frac|sqrt|sum|int|lim|log|sin|cos|tan|sec|csc|cot|arcsin|arccos|arctan)\{[^}]*\}/g,
            advanced: /\\(begin|end|usepackage|newcommand|def|DeclareMathOperator|text|mathrm|mathbb|mathcal|mathfrak)/g,
            delimiters: /(\$[^$]*\$|\\\([^)]*\\\)|\\\[[^\]]*\\\]|\$\$[^$]*\$\$)/g
        };

        this.initializeRenderers();
    }

    /**
     * Render sistemlerini başlat
     */
    async initializeRenderers() {
        await this.initializeMathJax();
        this.initializeKaTeX();
        this.processQueue();
    }

    /**
     * MathJax v3 başlatma
     */
    async initializeMathJax() {
        if (typeof MathJax !== 'undefined') {
            this.mathJaxReady = true;
            return;
        }
        
        // MathJax v3 konfigürasyonu
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
                    '\\T': '\\text{#1}',
                    '\\tr': '\\text{#1}'
                },
                packages: {
                    '[+]': ['ams', 'newcommand', 'configmacros', 'action', 'unicode']
                }
            },
            svg: {
                fontCache: 'global',
                displayAlign: 'left',
                displayIndent: '0'
            },
            options: {
                ignoreHtmlClass: 'tex2jax_ignore|mathjax_ignore',
                processHtmlClass: 'tex2jax_process|mathjax_process|smart-content',
                enableMenu: true,
                menuOptions: {
                    settings: {
                        assistiveMml: true,
                        collapsible: false,
                        explorer: true
                    }
                }
            },
            startup: {
                ready: () => {
                    console.log('MathJax v3 hazır');
                    this.mathJaxReady = true;
                    MathJax.startup.defaultReady();
                    this.processQueue();
                }
            },
            loader: {
                load: ['[tex]/ams', '[tex]/newcommand', '[tex]/configmacros']
            }
        };
        
        // MathJax v3 script yükle
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
        script.async = true;
        document.head.appendChild(script);
        
        // Promise ile yüklenmesini bekle
        return new Promise((resolve) => {
            script.onload = () => {
                setTimeout(() => {
                    if (this.mathJaxReady) resolve();
                }, 100);
            };
        });
    }

    /**
     * KaTeX başlatma kontrolü
     */
    initializeKaTeX() {
        this.katexReady = typeof katex !== 'undefined';
        if (this.katexReady) {
            console.log('KaTeX hazır');
        }
    }

    // =======================================================================
    // YENİ: GÜÇLENDİRİLMİŞ RENDER YÖNETİMİ
    // =======================================================================

    /**
     * Güvenli render wrapper. Timeout ve retry mekanizması içerir.
     */
    async safeRender(content, element, displayMode = false) {
        // Element ID'si yoksa rastgele bir tane ata (takip için)
        if (!element.id) {
            element.id = `math-render-el-${Math.random().toString(36).substring(2, 9)}`;
        }
        const renderKey = `${content}-${element.id}`;

        // Aynı içerik zaten render ediliyorsa bekle
        if (this.renderingInProgress.has(renderKey)) {
            console.log(`Render bekleniyor: ${renderKey}`);
            return await this.waitForRender(renderKey);
        }

        this.renderingInProgress.add(renderKey);

        try {
            // Element'in DOM'da olduğundan emin ol
            if (!document.body.contains(element)) {
                throw new Error("Element DOM'da değil");
            }

            // Render işlemi
            const result = await this.renderWithTimeout(content, element, displayMode);

            this.renderingInProgress.delete(renderKey);
            this.retryAttempts.delete(renderKey); // Başarılı olunca denemeleri sıfırla
            return result;

        } catch (error) {
            this.renderingInProgress.delete(renderKey);

            // Retry mekanizması
            const attempts = this.retryAttempts.get(renderKey) || 0;
            if (attempts < 2) { // Maksimum 2 yeniden deneme
                this.retryAttempts.set(renderKey, attempts + 1);
                console.warn(`Render hatası (${error.message}), yeniden deniyor... (${attempts + 1}/2)`);
                await new Promise(resolve => setTimeout(resolve, 500)); // 500ms bekle
                return this.safeRender(content, element, displayMode);
            }

            console.error(`Render kalıcı olarak başarısız oldu: ${renderKey}`, error);
            this.renderFallback(content, element, error);
            throw error;
        }
    }

    /**
     * Belirtilen render işleminin tamamlanmasını bekler.
     */
    async waitForRender(renderKey) {
        return new Promise(resolve => {
            const check = () => {
                if (!this.renderingInProgress.has(renderKey)) {
                    resolve(true);
                } else {
                    setTimeout(check, 100); // 100ms'de bir kontrol et
                }
            };
            check();
        });
    }

    /**
     * Render işlemini belirli bir zaman aşımı ile çalıştırır.
     */
    async renderWithTimeout(content, element, displayMode) {
        return Promise.race([
            this.render(content, element, displayMode),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Render işlemi zaman aşımına uğradı')), this.renderTimeout)
            )
        ]);
    }

    // =======================================================================
    // ANA RENDER VE ANALİZ FONKSİYONLARI
    // =======================================================================
    
    /**
     * Ana render fonksiyonu - Hybrid sistem
     */
    async render(content, element, displayMode = false) {
        if (!content || !element) {
            console.warn('Render: İçerik veya element eksik');
            return false;
        }

        // Cache kontrolü
        const cacheKey = `${content}-${displayMode}`;
        if (this.cache.has(cacheKey)) {
            element.innerHTML = this.cache.get(cacheKey);
            return true;
        }

        try {
            // İçerik analizi
            const analysis = this.analyzeContentAdvanced(content);
            console.log('Content Analysis:', { content, analysis });

            let result = false;

            switch (analysis.type) {
                case 'text':
                    result = this.renderPlainText(content, element);
                    break;

                case 'simple_math':
                    // Basit matematik için KaTeX (hızlı)
                    result = await this.renderWithKaTeX(content, element, displayMode);
                    if (!result && this.mathJaxReady) {
                        // KaTeX başarısız olursa MathJax'e fallback
                        result = await this.renderWithMathJax(content, element, displayMode);
                    }
                    break;

                case 'complex_math':
                    // Karmaşık matematik için MathJax (güvenilir)
                    result = await this.renderWithMathJax(content, element, displayMode);
                    break;

                case 'mixed':
                    result = await this.renderMixedContent(content, element, displayMode);
                    break;

                default:
                    // Auto-detection
                    result = await this.renderAuto(content, element, displayMode);
            }

            // Başarılı render'ı cache'le
            if (result && element.innerHTML) {
                this.cache.set(cacheKey, element.innerHTML);
            }

            return result;

        } catch (error) {
            console.error('Render hatası:', error);
            this.renderFallback(content, element, error);
            return false;
        }
    }

    /**
     * Gelişmiş içerik analizi - Türkçe optimized - YENİ SÜRÜM
     */
    analyzeContentAdvanced(content) {
        const trimmed = content.trim();

        // Önce cache'e bak
        const cacheKey = `analysis-${trimmed}`;
        if (this.analysisCache && this.analysisCache.has(cacheKey)) {
            return this.analysisCache.get(cacheKey);
        }

        // Daha hassas LaTeX algılama
        const latexPatterns = {
            inline: /\$(?!\$)([^$]+)\$/g,
            display: /\$\$([^$]+)\$\$/g,
            parentheses: /\\\(([^)]+)\\\)/g,
            brackets: /\\\[([^\]]+)\\\]/g,
            commands: /\\(?:frac|sqrt|sum|int|lim|sin|cos|tan|log|ln|exp|alpha|beta|gamma|delta|theta|pi|sigma|infty|pm|times|div|leq|geq|neq|approx)\b/g
        };

        let hasLatex = false;
        let latexCount = 0;

        for (const pattern of Object.values(latexPatterns)) {
            const matches = trimmed.match(pattern);
            if (matches) {
                hasLatex = true;
                latexCount += matches.length;
            }
        }

        // Türkçe karakter analizi
        const turkishCount = (trimmed.match(/[ğüşıöçĞÜŞİÖÇ]/g) || []).length;
        const wordCount = trimmed.split(/\s+/).length;

        let result;

        if (hasLatex && (turkishCount > 2 || wordCount > 5)) {
            result = { type: 'mixed', confidence: 0.95, latexCount, turkishCount };
        } else if (hasLatex) {
            const complexity = latexCount > 3 ? 'complex_math' : 'simple_math';
            result = { type: complexity, confidence: 0.9, latexCount };
        } else if (turkishCount > 0 || wordCount > 5) {
            result = { type: 'text', confidence: 0.85, turkishCount, wordCount };
        } else {
             // Heuristics for single expressions without delimiters
             const mathIndicators = ['+', '-', '*', '/', '=', '<', '>', '^', '_'];
             const hasMathSymbols = mathIndicators.some(symbol => trimmed.includes(symbol));
             if (hasMathSymbols && wordCount < 4) {
                 result = { type: 'simple_math', confidence: 0.7 };
             } else {
                 result = { type: 'text', confidence: 0.6 };
             }
        }

        // Cache'le
        this.analysisCache.set(cacheKey, result);

        return result;
    }


    /**
     * KaTeX ile render
     */
    async renderWithKaTeX(content, element, displayMode = false) {
        if (!this.katexReady) {
            console.warn('KaTeX hazır değil');
            return false;
        }

        try {
            // İçeriği temizle
            const cleanedContent = this.cleanLatexContent(content);

            const options = {
                displayMode: displayMode,
                throwOnError: false,
                output: 'html',
                trust: true,
                strict: false,
                macros: {
                    '\\R': '\\mathbb{R}',
                    '\\C': '\\mathbb{C}',
                    '\\N': '\\mathbb{N}',
                    '\\tr': '\\text{#1}'
                }
            };

            katex.render(cleanedContent, element, options);
            this.applyStyles(element, displayMode, 'katex');

            console.log('KaTeX render başarılı:', cleanedContent);
            return true;

        } catch (error) {
            console.warn('KaTeX render hatası:', error.message);
            element.classList.add('katex-error');
            return false;
        }
    }

    /**
     * MathJax v3 ile render
     */
    async renderWithMathJax(content, element, displayMode = false) {
        if (!this.mathJaxReady) {
            console.warn('MathJax hazır değil, kuyruğa ekleniyor');
            this.addToQueue(content, element, displayMode);
            return false;
        }

        try {
            // İçeriği temizle ve hazırla
            const cleanedContent = this.cleanLatexContent(content);
            const mathContent = displayMode ? `\\[${cleanedContent}\\]` : `\\(${cleanedContent}\\)`;

            // Geçici element oluştur
            const tempElement = document.createElement('div');
            tempElement.innerHTML = mathContent;
            tempElement.classList.add('mathjax_process');
            
            // Sayfaya ekle (MathJax'in görmesi için)
            document.body.appendChild(tempElement);
            
            // MathJax ile render et
            await MathJax.typesetPromise([tempElement]);
            
            // Sonucu ana element'e kopyala
            element.innerHTML = tempElement.innerHTML;

            // Geçici element'i kaldır
            document.body.removeChild(tempElement);
            
            this.applyStyles(element, displayMode, 'mathjax');

            console.log('MathJax render başarılı:', cleanedContent);
            return true;

        } catch (error) {
            console.error('MathJax render hatası:', error);
            return false;
        }
    }

    /**
     * Karışık içerik render (Türkçe + LaTeX)
     */
    async renderMixedContent(content, element, displayMode = false) {
        try {
            const parts = this.splitMixedContentSafe(content);
            element.innerHTML = '';
            element.classList.add('mixed-content-container');

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const partElement = document.createElement('span');

                if (part.type === 'latex') {
                    partElement.className = 'latex-inline-part';

                    // Basit LaTeX için KaTeX, karmaşık için MathJax
                    const analysis = this.analyzeContentAdvanced(part.content);
                    const isComplex = analysis.type === 'complex_math';

                    let rendered = false;
                    if (!isComplex && this.katexReady) {
                        rendered = await this.renderWithKaTeX(part.content, partElement, false);
                    }

                    if (!rendered && this.mathJaxReady) {
                        rendered = await this.renderWithMathJax(part.content, partElement, false);
                    }

                    if (!rendered) {
                        partElement.textContent = `$${part.content}$`;
                        partElement.classList.add('render-failed');
                    }

                } else {
                    partElement.className = 'text-inline-part';
                    partElement.textContent = part.content;
                }

                element.appendChild(partElement);
            }

            this.applyStyles(element, displayMode, 'mixed');
            console.log('Mixed content render başarılı:', parts.length, 'parça');
            return true;

        } catch (error) {
            console.error('Mixed content render hatası:', error);
            return false;
        }
    }

    /**
     * Güvenli karışık içerik ayırma
     */
    splitMixedContentSafe(content) {
        const parts = [];

        // Gelişmiş regex - daha güvenli
        const latexPattern = /(\$[^$]+\$|\\\([^)]+\\\)|\\\[[^\]]+\\\]|\$\$[^$]+\$\$)/g;

        let lastIndex = 0;
        let match;

        while ((match = latexPattern.exec(content)) !== null) {
            // Önceki metin kısmı
            if (match.index > lastIndex) {
                const textPart = content.slice(lastIndex, match.index);
                if (textPart.trim()) {
                    parts.push({ type: 'text', content: textPart });
                }
            }

            // LaTeX kısmı
            let latexContent = match[1];

            // Delimiterleri temizle
            if (latexContent.startsWith('$$') && latexContent.endsWith('$$')) {
                latexContent = latexContent.slice(2, -2);
            } else if (latexContent.startsWith('$') && latexContent.endsWith('$')) {
                latexContent = latexContent.slice(1, -1);
            } else if (latexContent.startsWith('\\(') && latexContent.endsWith('\\)')) {
                latexContent = latexContent.slice(2, -2);
            } else if (latexContent.startsWith('\\[') && latexContent.endsWith('\\]')) {
                latexContent = latexContent.slice(2, -2);
            }

            if (latexContent.trim()) {
                parts.push({ type: 'latex', content: latexContent.trim() });
            }

            lastIndex = match.index + match[0].length;
        }

        // Kalan metin
        if (lastIndex < content.length) {
            const remainingText = content.slice(lastIndex);
            if (remainingText.trim()) {
                parts.push({ type: 'text', content: remainingText });
            }
        }

        // Eğer hiç LaTeX bulunmadıysa, tüm içeriği text olarak döndür
        if (parts.length === 0 && content.trim()) {
            parts.push({ type: 'text', content: content });
        }

        return parts;
    }

    /**
     * LaTeX içeriğini temizle
     */
    cleanLatexContent(content) {
        if (!content || typeof content !== 'string') return '';
        
        let cleaned = content
            .replace(/^\$+|\$+$/g, '')
            .replace(/^\\\(|\\\)$/g, '')
            .replace(/^\\\[|\\\]$/g, '')
            .trim();
        
        cleaned = cleaned.replace(/\s+/g, ' ');
        
        cleaned = cleaned.replace(/\\text\{([^}]*)\}/g, (match, text) => {
            return `\\text{${text}}`;
        });
        
        return cleaned;
    }
    
    /**
     * Düz metin render
     */
    renderPlainText(content, element) {
        element.textContent = content;
        element.classList.add('math-text', 'plain-text');
        this.applyStyles(element, false, 'text');
        return true;
    }
    
    /**
     * Auto render - akıllı algılama
     */
    async renderAuto(content, element, displayMode = false) {
        if (this.katexReady) {
            const katexResult = await this.renderWithKaTeX(content, element, displayMode);
            if (katexResult) return true;
        }
        
        if (this.mathJaxReady) {
            const mathJaxResult = await this.renderWithMathJax(content, element, displayMode);
            if (mathJaxResult) return true;
        }
        
        return this.renderPlainText(content, element);
    }
    
    /**
     * Fallback render
     */
    renderFallback(content, element, error) {
        element.innerHTML = `
            <div class="render-error">
                <span class="error-content" title="${this.escapeHtml(content)}">[Render Hatası]</span>
                <small class="error-message">${error.message}</small>
            </div>
        `;
        element.classList.add('math-render-error');
    }
    
    /**
     * Stilleri uygula
     */
    applyStyles(element, displayMode, renderer) {
        element.classList.add(`math-rendered`, `rendered-by-${renderer}`);
        
        if (renderer === 'text') {
            element.style.display = 'inline';
            return;
        }
        
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
        
        if (renderer === 'katex') {
            element.style.lineHeight = '1.6';
        } else if (renderer === 'mathjax') {
            element.style.lineHeight = '1.8';
        }
    }
    
    /**
     * Render kuyruğu yönetimi
     */
    addToQueue(content, element, displayMode) {
        this.renderQueue.push({ content, element, displayMode });
    }
    
    async processQueue() {
        if (!this.mathJaxReady || this.renderQueue.length === 0) return;
        
        console.log(`İşleniyor: ${this.renderQueue.length} render görev(ler)i`);
        
        const queue = [...this.renderQueue];
        this.renderQueue = [];
        
        for (const item of queue) {
            await this.safeRender(item.content, item.element, item.displayMode);
        }
    }
    
    /**
     * Container render - toplu işlem
     */
    async renderContainer(container, displayMode = false) {
        if (!container) return;
        
        const elementsToRender = container.querySelectorAll('[data-latex], .smart-content, .latex-content');
        const renderPromises = [];

        for (const element of elementsToRender) {
             const content = element.getAttribute('data-latex') || 
                           element.getAttribute('data-content') || 
                           element.textContent || 
                           element.innerHTML;
            if (content) {
                // Her bir render işlemini safeRender ile başlat
                renderPromises.push(this.safeRender(content, element, displayMode));
            }
        }
        
        // Tüm render işlemleri tamamlanana kadar bekle
        await Promise.allSettled(renderPromises);
        console.log("Container render tamamlandı.");
    }
    
    /**
     * HTML escape
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Cache temizleme
     */
    clearCache() {
        this.cache.clear();
        this.analysisCache.clear();
        console.log('Render ve analiz cache temizlendi');
    }
    
    /**
     * Debug bilgileri
     */
    getStats() {
        return {
            mathJaxReady: this.mathJaxReady,
            katexReady: this.katexReady,
            queueLength: this.renderQueue.length,
            cacheSize: this.cache.size,
            analysisCacheSize: this.analysisCache.size,
            renderingInProgress: this.renderingInProgress.size,
        };
    }
}

// Singleton instance oluştur
export const advancedMathRenderer = new AdvancedMathRenderer();

// Backward compatibility için eski interface'i GÜVENLİ metoda yönlendir
export const mathRenderer = {
    render: (content, element, displayMode) => advancedMathRenderer.safeRender(content, element, displayMode),
    renderContainer: (container, displayMode) => advancedMathRenderer.renderContainer(container, displayMode),
    isSimpleText: (content) => {
        const analysis = advancedMathRenderer.analyzeContentAdvanced(content);
        return analysis.type === 'text';
    }
};

// Global erişim için
window.advancedMathRenderer = advancedMathRenderer;