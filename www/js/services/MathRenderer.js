// www/js/services/MathRenderer.js

export class MathRenderer {
    constructor() {
        this.mathJaxReady = false;
        this.katexReady = false; // KaTeX için hazırlandı, ancak şu an kullanılmıyor
        this.renderQueue = [];
        this.cache = new Map();
        this.initialized = false;

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
            await this.loadMathJax();
            this.initialized = true;
            console.log('MathRenderer başarıyla başlatıldı');
        } catch (error) {
            console.error('MathRenderer başlatılamadı:', error);
            throw error;
        }
    }

    /**
     * MathJax kütüphanesini yükler.
     */
    async loadMathJax() {
        return new Promise((resolve) => {
            if (window.MathJax) {
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
                console.log('MathJax betiği başarıyla yüklendi');
            };

            mathJaxScript.onerror = () => {
                console.error('MathJax yüklenemedi, temel render moduna geçiliyor.');
                this.mathJaxReady = false;
                resolve(); // Hata olsa bile devam et, MathJax olmadan çalışsın
            };
            
            document.head.appendChild(mathJaxScript);
        });
    }

    /**
     * Bir element içindeki matematiksel içeriği render eder.
     * @param {HTMLElement} element - Matematik içeriği olan element.
     * @param {Object} options - Render seçenekleri.
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
            if (this.mathJaxReady && window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
                await window.MathJax.typesetPromise([element]);
            }
        } catch (error) {
            console.error('Matematik render hatası:', error);
            this.renderFallback(element); // Hata durumunda düz metin göster
        }
    }

    /**
     * Akıllı içeriği (Türkçe metin ve LaTeX karışımı) render eder.
     * @param {HTMLElement} element 
     * @param {string} content 
     * @param {Object} options 
     */
    async renderSmartContent(element, content, options = {}) {
        if (!content) return;

        try {
            const analysis = this.analyzeContent(content);

            if (analysis.hasComplexMath) {
                await this.renderWithMathJax(element, content, options);
            } else if (analysis.hasBasicMath) {
                this.renderBasicMath(element, content, options);
            } else {
                this.renderPlainText(element, content, options);
            }
        } catch (error) {
            console.error('Akıllı içerik render hatası:', error);
            element.textContent = content; // Hata durumunda içeriği düz metin olarak ata
        }
    }

    /**
     * Render stratejisini belirlemek için içeriği analiz eder.
     * @param {string} content 
     * @returns {Object} Analiz sonuçları.
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
     * İçeriği MathJax ile render eder.
     */
    async renderWithMathJax(element, content) {
        if (!this.mathJaxReady || !window.MathJax) {
            console.warn('MathJax hazır değil, temel render moduna geçiliyor.');
            this.renderBasicMath(element, content);
            return;
        }

        try {
            element.innerHTML = this.preprocessContent(content);
            element.classList.add('tex2jax_process');
            await window.MathJax.typesetPromise([element]);
            console.log('MathJax render işlemi tamamlandı.');
        } catch (error) {
            console.error('MathJax render hatası, temel render moduna geçiliyor:', error);
            this.renderBasicMath(element, content);
        }
    }

    /**
     * Temel matematik ifadelerini MathJax olmadan render eder.
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
     * Düz metni Türkçe desteğiyle render eder.
     */
    renderPlainText(element, content) {
        element.textContent = content;
    }

    /**
     * Render öncesi içeriği ön işler.
     */
    preprocessContent(content) {
        return content
            .replace(/\$\$\s*\$\$/g, '') // Boş matematik bloklarını kaldır
            .replace(/\$\s*\$/g, '')     // Boş inline matematik ifadelerini kaldır
            .replace(/\\{2,}/g, '\\')   // Birden fazla backslash'ı düzelt
            .replace(/\s+/g, ' ')       // Boşlukları normalleştir
            .trim();
    }

    /**
     * Matematik render işlemi başarısız olduğunda yedek içeriği gösterir.
     */
    renderFallback(element) {
        const smartElements = element.querySelectorAll('.smart-content[data-content]');
        smartElements.forEach(smartElement => {
            const content = smartElement.getAttribute('data-content');
            if (content) {
                smartElement.textContent = content;
            }
        });
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

        // Zamanlayıcı ile render işleminin DOM güncellendikten sonra çalışmasını sağla
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
                        ${step.aciklama ? `<div class="step-explanation mb-2"><strong>Açıklama:</strong> <span class="smart-content" data-content="${this.escapeHtml(step.aciklama)}"></span></div>` : ''}
                        ${step.islem ? `<div class="step-operation mb-2"><strong>İşlem:</strong> <span class="smart-content" data-content="${this.escapeHtml(step.islem)}"></span></div>` : ''}
                        ${step.sonuc ? `<div class="step-result"><strong>Sonuç:</strong> <span class="smart-content" data-content="${this.escapeHtml(step.sonuc)}"></span></div>` : ''}
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
            cacheSize: this.cache.size,
            queueSize: this.renderQueue.length,
            initialized: this.initialized
        };
    }
}

// Singleton instance oluştur ve dışa aktar
export const mathRenderer = new MathRenderer();