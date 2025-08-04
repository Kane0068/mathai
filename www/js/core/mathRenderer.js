// www/js/core/mathRenderer.js - BİRLEŞTİRİLMİŞ RENDER SİSTEMİ

class MathRenderer {
    constructor() {
        this.mathjax = null;
        this.isInitialized = false;
        this.renderQueue = [];
        this.isProcessing = false;
        this.renderStats = { total: 0, success: 0, failed: 0 };
    }

    async initialize() {
        if (this.isInitialized) return true;
        
        try {
            // MathJax yükle
            if (!window.MathJax) {
                await this.loadMathJax();
            }
            
            this.mathjax = window.MathJax;
            this.isInitialized = true;
            console.log('✅ MathRenderer başlatıldı');
            return true;
        } catch (error) {
            console.error('❌ MathRenderer başlatılamadı:', error);
            return false;
        }
    }

    async loadMathJax() {
        return new Promise((resolve, reject) => {
            window.MathJax = {
                tex: {
                    inlineMath: [['$', '$']],
                    displayMath: [['$$', '$$']],
                    processEscapes: true,
                    processEnvironments: true
                },
                options: {
                    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
                },
                startup: {
                    ready: () => {
                        MathJax.startup.defaultReady();
                        resolve();
                    }
                }
            };

            const script = document.createElement('script');
            script.src = 'https://polyfill.io/v3/polyfill.min.js?features=es6';
            script.onload = () => {
                const mathScript = document.createElement('script');
                mathScript.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
                mathScript.onerror = reject;
                document.head.appendChild(mathScript);
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async render(content, element, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            this.renderStats.total++;
            
            // İçeriği temizle ve hazırla
            const cleanContent = this.prepareContent(content);
            
            // Element'e yerleştir
            element.innerHTML = cleanContent;
            
            // MathJax ile render et
            await this.mathjax.typesetPromise([element]);
            
            this.renderStats.success++;
            element.classList.remove('render-error');
            element.classList.add('render-success');
            
            return { success: true, element, content: cleanContent };
        } catch (error) {
            this.renderStats.failed++;
            element.classList.add('render-error');
            element.innerHTML = `<span class="text-red-500">Render hatası: ${content}</span>`;
            console.error('Render hatası:', error);
            return { success: false, error: error.message };
        }
    }

    prepareContent(content) {
        if (!content) return '';
        
        // LaTeX temizleme
        let cleaned = content
            .replace(/\$\$\$/g, '$$')
            .replace(/\$\s+\$/g, '$$')
            .trim();
        
        // Metin + LaTeX karışık içerik desteği
        return this.processLatexInText(cleaned);
    }

    processLatexInText(content) {
        // Basit LaTeX tespit ve işleme
        return content.replace(/\\\((.*?)\\\)/g, '$$$1$$')
                     .replace(/\\\[(.*?)\\\]/g, '$$$$1$$');
    }

    getStats() {
        return { ...this.renderStats };
    }

    reset() {
        this.renderStats = { total: 0, success: 0, failed: 0 };
    }
}

export const mathRenderer = new MathRenderer();