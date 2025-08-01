// www/js/services/MathRenderer.js - Fixed Version

export class MathRenderer {
    constructor() {
        this.mathJaxReady = false;
        this.katexReady = false;
        this.renderQueue = [];
        this.cache = new Map();
        this.initialized = false;
        this.fallbackMode = false;

        // Türkçe metin tanıma desenleri
        this.turkishPatterns = {
            words: /\b(değer|değeri|olduğu|olduğuna|göre|için|ile|den|dan|da|de|bu|şu|o|ve|veya|eğer|ise|durumda|durumunda|sonuç|sonucu|cevap|cevabı|problem|problemi|soru|sorusu|çözüm|çözümü|adım|adımı|hesapla|hesaplama|bul|bulma|kaç|kaçtır|nedir|neye|nasıl)\b/gi,
            chars: /[ğüşıöçĞÜŞİÖÇ]/g,
            verbs: /\b(olur|olacak|oluyor|olmuş|gelir|gider|yapar|yapıyor|eder|ediyor|alır|alıyor|verir|veriyor)\b/gi,
            numbers: /\b(bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on|yüz|bin|milyon|birinci|ikinci|üçüncü)\b/gi
        };

        // LaTeX karmaşıklık desenleri
        this.latexComplexity = {
            simple: /^[\s\d\w+\-*/=<>()[\]{}^_.,!?]*$/,
            basicMath: /\\(frac|sqrt|sum|int|lim|log|sin|cos|tan|sec|csc|cot|arcsin|arccos|arctan)\{[^}]*\}/g,
            advanced: /\\(begin|end|usepackage|newcommand|def|DeclareMathOperator|text|mathrm|mathbb|mathcal|mathfrak)/g,
            delimiters: /(\$\$[^$]*?\$\$|\$[^$\n]*?\$|\\\([^\\]*?\\\)|\\\[[^\\]*?\\\])/g,
            dollarSingle: /\$([^$\n]+?)\$/g,
            dollarDouble: /\$\$([^$]+?)\$\$/g,
            parentheses: /\\\(([^\\]+?)\\\)/g,
            brackets: /\\\[([^\\]+?)\\\]/g
        };
    }

    /**
     * Math Renderer'ı başlatır.
     */
    async init() {
        if (this.initialized) return;

        try {
            // Önce KaTeX'i dene
            if (await this.tryKaTeX()) {
                console.log('KaTeX render modu aktif');
                this.initialized = true;
                return;
            }

            // KaTeX yoksa MathJax'i dene
            if (await this.tryMathJax()) {
                console.log('MathJax render modu aktif');
                this.initialized = true;
                return;
            }

            // Her ikisi de yoksa fallback moda geç
            console.warn('Ne MathJax ne de KaTeX bulunamadı, fallback moduna geçiliyor');
            this.fallbackMode = true;
            this.initialized = true;
            
        } catch (error) {
            console.error('MathRenderer başlatılamadı:', error);
            this.fallbackMode = true;
            this.initialized = true;
        }
    }

    /**
     * KaTeX kütüphanesini kontrol et ve kullan
     */
    async tryKaTeX() {
        if (typeof window.katex !== 'undefined') {
            this.katexReady = true;
            console.log('KaTeX mevcut ve hazır');
            return true;
        }

        // KaTeX'i yüklemeyi dene
        try {
            if (!document.querySelector('link[href*="katex"]')) {
                const katexCSS = document.createElement('link');
                katexCSS.rel = 'stylesheet';
                katexCSS.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
                document.head.appendChild(katexCSS);
            }

            if (!document.querySelector('script[src*="katex"]')) {
                await this.loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js');
            }

            this.katexReady = typeof window.katex !== 'undefined';
            return this.katexReady;
        } catch (error) {
            console.warn('KaTeX yüklenemedi:', error);
            return false;
        }
    }

    /**
     * MathJax kütüphanesini kontrol et ve kullan
     */
    async tryMathJax() {
        // MathJax zaten yüklü mü kontrol et
        if (typeof window.MathJax !== 'undefined') {
            // MathJax'in hazır olup olmadığını kontrol et
            if (this.isMathJaxReady()) {
                this.mathJaxReady = true;
                console.log('MathJax mevcut ve hazır');
                return true;
            }
        }

        // MathJax'i yüklemeyi dene
        try {
            await this.loadMathJax();
            return this.mathJaxReady;
        } catch (error) {
            console.warn('MathJax yüklenemedi:', error);
            return false;
        }
    }

    /**
     * MathJax'in hazır olup olmadığını kontrol et
     */
    isMathJaxReady() {
        return window.MathJax && 
               window.MathJax.startup && 
               window.MathJax.startup.ready && 
               (window.MathJax.typesetPromise || window.MathJax.typeset);
    }

    /**
     * Script yükleme yardımcı fonksiyonu
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * MathJax kütüphanesini yükler.
     */
    async loadMathJax() {
        return new Promise((resolve, reject) => {
            if (window.MathJax && this.isMathJaxReady()) {
                this.mathJaxReady = true;
                resolve();
                return;
            }

            // MathJax yapılandırması
            window.MathJax = {
                tex: {
                    inlineMath: [['$', '$'], ['\\(', '\\)']],
                    displayMath: [['$$', '$$'], ['\\[', '\\]']],
                    processEscapes: true,
                    processEnvironments: true,
                    tags: 'ams'
                },
                options: {
                    ignoreHtmlClass: 'tex2jax_ignore',
                    processHtmlClass: 'tex2jax_process'
                },
                startup: {
                    ready: () => {
                        console.log('MathJax yüklendi ve hazır');
                        this.mathJaxReady = true;
                        resolve();
                    }
                }
            };

            // MathJax betiğini yükle
            const mathJaxScript = document.createElement('script');
            mathJaxScript.id = 'MathJax-script';
            mathJaxScript.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
            mathJaxScript.async = true;
            
            mathJaxScript.onload = () => {
                console.log('MathJax betiği yüklendi');
                // Startup'ın tamamlanmasını bekle
                setTimeout(() => {
                    if (this.isMathJaxReady()) {
                        this.mathJaxReady = true;
                        resolve();
                    } else {
                        console.warn('MathJax yüklendi ama hazır değil');
                        reject(new Error('MathJax not ready after load'));
                    }
                }, 1000);
            };

            mathJaxScript.onerror = () => {
                console.error('MathJax yüklenemedi');
                reject(new Error('MathJax script load failed'));
            };
            
            document.head.appendChild(mathJaxScript);

            // Timeout ekle
            setTimeout(() => {
                if (!this.mathJaxReady) {
                    reject(new Error('MathJax load timeout'));
                }
            }, 10000);
        });
    }

    /**
     * Bir element içindeki matematiksel içeriği render eder.
     */
    async renderContent(element, options = {}) {
        if (!element) {
            console.warn('Render edilecek element bulunamadı.');
            return;
        }

        try {
            await this.init();

            const smartElements = element.querySelectorAll('.smart-content[data-content]');

            for (const smartElement of smartElements) {
                const content = smartElement.getAttribute('data-content');
                if (content) {
                    await this.renderSmartContent(smartElement, content, options);
                }
            }

            // Zaten var olan matematiksel içeriği de render et
            await this.renderMathInElement(element);
            
        } catch (error) {
            console.error('Matematik render hatası:', error);
            this.renderFallback(element);
        }
    }

    /**
     * Element içindeki mevcut matematik içeriğini render et
     */
    async renderMathInElement(element) {
        if (this.katexReady && window.katex) {
            // KaTeX ile render
            this.renderWithKaTeX(element);
        } else if (this.mathJaxReady && this.isMathJaxReady()) {
            // MathJax ile render
            await this.renderWithMathJaxSafe(element);
        } else {
            // Fallback render
            console.log('Math render: Fallback modunda');
        }
    }

    /**
     * Güvenli MathJax render
     */
    async renderWithMathJaxSafe(element) {
        try {
            if (!window.MathJax || !this.isMathJaxReady()) {
                console.warn('MathJax hazır değil');
                return;
            }

            // typesetPromise varsa kullan
            if (typeof window.MathJax.typesetPromise === 'function') {
                await window.MathJax.typesetPromise([element]);
            }
            // Yoksa typeset fonksiyonunu dene
            else if (typeof window.MathJax.typeset === 'function') {
                window.MathJax.typeset([element]);
            }
            // Hub varsa (MathJax v2 uyumluluğu)
            else if (window.MathJax.Hub && typeof window.MathJax.Hub.Queue === 'function') {
                window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub, element]);
            }
            else {
                console.warn('MathJax render fonksiyonu bulunamadı');
                throw new Error('No MathJax render function available');
            }

            console.log('MathJax render başarılı');
        } catch (error) {
            console.warn('MathJax render hatası:', error);
            throw error;
        }
    }

    /**
     * KaTeX ile render
     */
    renderWithKaTeX(element) {
        try {
            // KaTeX auto-render extension kullan
            if (window.renderMathInElement) {
                window.renderMathInElement(element, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '$', right: '$', display: false},
                        {left: '\\(', right: '\\)', display: false},
                        {left: '\\[', right: '\\]', display: true}
                    ]
                });
            } else {
                // Manuel KaTeX render
                this.manualKaTeXRender(element);
            }
            console.log('KaTeX render başarılı');
        } catch (error) {
            console.warn('KaTeX render hatası:', error);
            throw error;
        }
    }

    /**
     * Manuel KaTeX render
     */
    manualKaTeXRender(element) {
        const mathElements = element.querySelectorAll('.math, [data-math]');
        mathElements.forEach(mathEl => {
            const mathText = mathEl.textContent || mathEl.getAttribute('data-math');
            if (mathText) {
                try {
                    const rendered = window.katex.renderToString(mathText, {
                        throwOnError: false,
                        displayMode: mathEl.classList.contains('display-math')
                    });
                    mathEl.innerHTML = rendered;
                } catch (e) {
                    console.warn('KaTeX render hatası:', e);
                }
            }
        });
    }

    /**
     * Akıllı içeriği render eder.
     */
    async renderSmartContent(element, content, options = {}) {
        if (!content) return;

        try {
            const analysis = this.analyzeContent(content);

            if (analysis.hasComplexMath || analysis.hasBasicMath) {
                if (this.katexReady) {
                    this.renderWithKaTeXContent(element, content);
                } else if (this.mathJaxReady) {
                    await this.renderWithMathJaxContent(element, content);
                } else {
                    this.renderBasicMath(element, content, options);
                }
            } else {
                this.renderPlainText(element, content, options);
            }
        } catch (error) {
            console.error('Akıllı içerik render hatası:', error);
            element.textContent = content;
        }
    }

    /**
     * KaTeX ile içerik render
     */
    renderWithKaTeXContent(element, content) {
        element.innerHTML = this.preprocessContent(content);
        
        // KaTeX auto-render varsa kullan
        if (window.renderMathInElement) {
            window.renderMathInElement(element, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false}
                ]
            });
        }
    }

    /**
     * MathJax ile içerik render
     */
    async renderWithMathJaxContent(element, content) {
        element.innerHTML = this.preprocessContent(content);
        element.classList.add('tex2jax_process');
        await this.renderWithMathJaxSafe(element);
    }

    /**
     * İçeriği analiz eder
     */
    analyzeContent(content) {
        const analysis = {
            hasComplexMath: false,
            hasBasicMath: false,
            hasTurkishText: false,
            mathExpressions: [],
            complexity: 'simple'
        };

        analysis.hasTurkishText = this.turkishPatterns.chars.test(content) || this.turkishPatterns.words.test(content);

        analysis.hasComplexMath = this.latexComplexity.advanced.test(content) ||
            this.latexComplexity.basicMath.test(content) ||
            this.latexComplexity.delimiters.test(content);

        analysis.hasBasicMath = /[+\-*/=<>^_{}()[\]\\$]/.test(content) && !analysis.hasComplexMath;

        analysis.mathExpressions = content.match(this.latexComplexity.delimiters) || [];

        if (analysis.hasComplexMath) {
            analysis.complexity = 'complex';
        } else if (analysis.hasBasicMath) {
            analysis.complexity = 'basic';
        }

        return analysis;
    }

    /**
     * Temel matematik ifadelerini render eder.
     */
    renderBasicMath(element, content) {
        let formatted = content
            .replace(/\^(\w+)/g, '<sup>$1</sup>')
            .replace(/_(\w+)/g, '<sub>$1</sub>')
            .replace(/\*/g, '×')
            .replace(/\+-/g, '±');
        element.innerHTML = formatted;
    }

    /**
     * Düz metni render eder.
     */
    renderPlainText(element, content) {
        element.textContent = content;
    }

    /**
     * İçeriği ön işler.
     */
    preprocessContent(content) {
        return content
            .replace(/\$\$\s*\$\$/g, '')
            .replace(/\$\s*\$/g, '')
            .replace(/\\{2,}/g, '\\')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Fallback render
     */
    renderFallback(element) {
        const smartElements = element.querySelectorAll('.smart-content[data-content]');
        smartElements.forEach(smartElement => {
            const content = smartElement.getAttribute('data-content');
            if (content) {
                // Basit matematiksel sembolleri Unicode ile değiştir
                let processedContent = content
                    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
                    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
                    .replace(/\\pi/g, 'π')
                    .replace(/\\alpha/g, 'α')
                    .replace(/\\beta/g, 'β')
                    .replace(/\\gamma/g, 'γ')
                    .replace(/\\delta/g, 'δ')
                    .replace(/\\theta/g, 'θ')
                    .replace(/\\lambda/g, 'λ')
                    .replace(/\\mu/g, 'μ')
                    .replace(/\\sigma/g, 'σ')
                    .replace(/\\phi/g, 'φ')
                    .replace(/\\omega/g, 'ω')
                    .replace(/\\sum/g, '∑')
                    .replace(/\\int/g, '∫')
                    .replace(/\\infty/g, '∞')
                    .replace(/\\le/g, '≤')
                    .replace(/\\ge/g, '≥')
                    .replace(/\\ne/g, '≠')
                    .replace(/\\pm/g, '±')
                    .replace(/\\times/g, '×')
                    .replace(/\\div/g, '÷')
                    .replace(/\$\$([^$]+)\$\$/g, '$1')
                    .replace(/\$([^$]+)\$/g, '$1');

                smartElement.textContent = processedContent;
            }
        });

        console.log('Fallback render uygulandı');
    }

    /**
     * Problem özetini render eder.
     */
    async renderProblemSummary(problemOzeti, container) {
        if (!problemOzeti || !container) return;

        const { verilenler, istenen } = problemOzeti;
        let summaryHTML = `
            <div class="problem-summary bg-blue-50 p-4 rounded-lg mb-4">
                <h3 class="font-semibold text-blue-800 mb-2">Problem Özeti:</h3>`;

        if (verilenler && verilenler.length > 0) {
            summaryHTML += `
                <div class="mb-2">
                    <strong>Verilenler:</strong>
                    <ul class="list-disc list-inside ml-4">
                        ${verilenler.map((veri, index) => `
                            <li class="smart-content" data-content="${this.escapeHtml(veri)}" id="verilen-${index}"></li>
                        `).join('')}
                    </ul>
                </div>`;
        }

        if (istenen) {
            summaryHTML += `
                <div>
                    <strong>İstenen:</strong> 
                    <span class="smart-content" data-content="${this.escapeHtml(istenen)}" id="istenen-content"></span>
                </div>`;
        }

        summaryHTML += '</div>';
        container.innerHTML = summaryHTML;

        setTimeout(() => this.renderContent(container), 50);
    }

    /**
     * Tam çözümü render eder.
     */
    async renderFullSolution(solution, container) {
        if (!solution || !container) return;

        let html = `
            <div class="full-solution-container">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-800">Tam Çözüm</h3>
                    <button id="back-to-main-menu-btn" class="btn btn-secondary">Ana Menüye Dön</button>
                </div>`;

        if (solution.adimlar && solution.adimlar.length > 0) {
            solution.adimlar.forEach((step, index) => {
                html += `
                    <div class="solution-step p-4 mb-3 bg-gray-50 rounded-lg">
                        <div class="step-number font-semibold text-blue-600 mb-2">${index + 1}. Adım</div>
                        ${step.adimAciklamasi ? `<div class="step-explanation mb-2"><strong>Açıklama:</strong> <span class="smart-content" data-content="${this.escapeHtml(step.adimAciklamasi)}"></span></div>` : ''}
                        ${step.cozum_lateks ? `<div class="step-formula mb-2"><strong>Formül:</strong> <span class="smart-content" data-content="${this.escapeHtml(step.cozum_lateks)}"></span></div>` : ''}
                        ${step.ipucu ? `<div class="step-hint"><strong>İpucu:</strong> <span class="smart-content" data-content="${this.escapeHtml(step.ipucu)}"></span></div>` : ''}
                    </div>`;
            });
        }

        if (solution.sonuclar && solution.sonuclar.length > 0) {
            html += `
                <div class="final-results p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 class="font-semibold text-green-800 mb-2">Final Sonuçlar:</h4>
                    <ul class="list-disc list-inside">
                        ${solution.sonuclar.map((sonuc, index) => `
                            <li class="smart-content" data-content="${this.escapeHtml(sonuc)}" id="sonuc-${index}"></li>
                        `).join('')}
                    </ul>
                </div>`;
        }

        html += '</div>';
        container.innerHTML = html;

        setTimeout(() => this.renderContent(container), 50);
    }

    /**
     * HTML karakterlerini güvenli hale getirir.
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Önbelleği temizler.
     */
    clearCache() {
        this.cache.clear();
        console.log('Math renderer önbelleği temizlendi.');
    }

    /**
     * Render istatistiklerini alır.
     */
    getStats() {
        return {
            mathJaxReady: this.mathJaxReady,
            katexReady: this.katexReady,
            fallbackMode: this.fallbackMode,
            cacheSize: this.cache.size,
            queueSize: this.renderQueue.length,
            initialized: this.initialized
        };
    }
}

// Singleton instance oluştur ve dışa aktar
export const mathRenderer = new MathRenderer();