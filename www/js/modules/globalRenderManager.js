// www/js/modules/globalRenderManager.js
export class GlobalRenderManager {
    constructor() {
        this.renderQueue = new Map();
        this.pendingRenders = new Set();
        this.renderAttempts = new Map();
        this.maxRetries = 3;
        
        this.mathJaxStatus = {
            ready: false,
            initializing: false,
            error: null
        };
        
        this.stats = {
            successful: 0,
            failed: 0,
            retried: 0,
            pending: 0
        };
    }
    
    async initializeMathJax() {
        if (this.mathJaxStatus.ready) return true;
        if (this.mathJaxStatus.initializing) {
            return this.waitForMathJax();
        }
        
        this.mathJaxStatus.initializing = true;
        
        try {
            window.MathJax = {
                tex: {
                    inlineMath: [['$', '$'], ['\\(', '\\)']],
                    displayMath: [['$$', '$$'], ['\\[', '\\]']],
                    processEscapes: true,
                    processEnvironments: true,
                    packages: {'[+]': ['ams', 'newcommand', 'unicode']}
                },
                svg: {
                    fontCache: 'global',
                    displayAlign: 'center',
                    displayIndent: '0'
                },
                startup: {
                    ready: () => {
                        console.log('✅ MathJax v3 başarıyla yüklendi');
                        this.mathJaxStatus.ready = true;
                        this.mathJaxStatus.initializing = false;
                        MathJax.startup.defaultReady();
                        this.processQueuedRenders();
                    }
                },
                options: {
                    enableMenu: false,
                    renderActions: {
                        addMenu: []
                    }
                }
            };
            
            if (!document.getElementById('mathjax-script')) {
                const script = document.createElement('script');
                script.id = 'mathjax-script';
                script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
                script.async = true;
                document.head.appendChild(script);
            }
            
            return this.waitForMathJax();
            
        } catch (error) {
            this.mathJaxStatus.error = error;
            this.mathJaxStatus.initializing = false;
            console.error('❌ MathJax başlatma hatası:', error);
            return false;
        }
    }
    
    async waitForMathJax(timeout = 10000) {
        const startTime = Date.now();
        
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (this.mathJaxStatus.ready) {
                    clearInterval(checkInterval);
                    resolve(true);
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(checkInterval);
                    console.error('❌ MathJax yükleme zaman aşımı');
                    resolve(false);
                }
            }, 100);
        });
    }
    
    normalizeContent(content) {
        if (!content || typeof content !== 'string') return '';
        
        let normalized = content.trim();
        
        normalized = normalized
            .replace(/\$\$\$/g, '$$')
            .replace(/\$\s+\$/g, '$$')
            .replace(/\\\[\s*\\\[/g, '\\[')
            .replace(/\\\]\s*\\\]/g, '\\]');
        
        normalized = normalized.replace(/\*\*(.*?)\*\*/g, '$1');
        
        normalized = normalized.replace(/\$\s*\$/g, '');
        normalized = normalized.replace(/\$\$\s*\$\$/g, '');
        
        return normalized;
    }
    
    generateRenderID(element, content) {
        const elementId = element.id || `el-${Math.random().toString(36).substr(2, 9)}`;
        const contentHash = this.hashCode(content);
        return `${elementId}-${contentHash}`;
    }
    
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    
    

    async renderElement(element, content, options = {}) {
        if (!element) return false;

        if (content === null || typeof content === 'undefined') {
            element.innerHTML = '';
            return true;
        }

        const normalizedContent = this.normalizeContent(String(content));
        if (!normalizedContent) {
            element.innerHTML = '';
            return true;
        }

        if (!this.mathJaxStatus.ready) {
            await this.initializeMathJax();
        }

        try {
            // --- YENİ VE DAHA AKILLI RENDER MANTIĞI ---

            // Kontrol 1: İçerikte LaTeX sınırlayıcıları var mı?
            const hasDelimiters = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/.test(normalizedContent);
            
            // Kontrol 2: İçerik, sınırlayıcı olmasa bile LaTeX gibi görünüyor mu? (örn: \frac, ^, _)
            const looksLikeLatex = /(\\[a-zA-Z]+|\^|_|\{|\})/.test(normalizedContent);

            // ÖNCELİK 1: .latex-content gibi blok modunda render zorlandı mı?
            if (options.displayMode) {
                await this.performRenderWithMathJax(element, normalizedContent, { displayMode: true });
            }
            // ÖNCELİK 2: İçinde $...$ gibi sınırlayıcılar olan karışık metin mi?
            else if (hasDelimiters) {
                await this.renderMixedContent(element, normalizedContent, options);
            }
            // ÖNCELİK 3 (YENİ VE KRİTİK): Sınırlayıcı yok ama LaTeX komutları var mı? (İNTERAKTİF SEÇENEKLER BU DURUMA GİRECEK)
            else if (looksLikeLatex) {
                await this.performRenderWithMathJax(element, normalizedContent, { displayMode: false });
            }
            // SON ÇARE: Hiçbiri değilse, bu kesinlikle düz metindir.
            else {
                element.textContent = normalizedContent;
            }

            this.stats.successful++;
            return true;

        } catch (error) {
            console.warn(`Render hatası, fallback uygulanıyor.`, error);
            this.renderFallback(element, normalizedContent, error);
            this.stats.failed++;
            return false;
        }
    }

    async performRenderWithMathJax(element, content, options) {
        const { displayMode = false } = options;

        // --- YENİ EKLENEN TEMİZLEME ADIMI ---
        // Gelen içeriğin başındaki ve sonundaki olası '$' sınırlayıcılarını temizle.
        // Bu, çift sarmalama sorununu kökünden çözer.
        let cleanContent = content.trim();
        if (cleanContent.startsWith('$') && cleanContent.endsWith('$')) {
            cleanContent = cleanContent.substring(1, cleanContent.length - 1).trim();
        }
        // --- TEMİZLEME ADIMI SONU ---

        // MathJax'in beklediği formata temizlenmiş içeriği yerleştir.
        const mathContent = displayMode ? `\\[${cleanContent}\\]` : `\\(${cleanContent}\\)`;

        const tempDiv = document.createElement('div');
        tempDiv.style.visibility = 'hidden';
        tempDiv.style.position = 'absolute';
        tempDiv.textContent = mathContent;
        document.body.appendChild(tempDiv);

        try {
            await MathJax.typesetPromise([tempDiv]);
            element.innerHTML = tempDiv.innerHTML;
            element.classList.add('math-rendered', 'mathjax-rendered');
        } finally {
            document.body.removeChild(tempDiv);
        }
        
        return true;
    }

    renderFallback(element, content, error) {
        console.error("Render Fallback:", { content, error: error.message });
        // Hata durumunda kullanıcıya en azından metni gösterelim.
        element.textContent = content;
        element.classList.add('render-error');
        element.title = `Render Hatası: ${error.message}`;
    }

   
    
        // www/js/modules/globalRenderManager.js dosyasında bu fonksiyonu güncelleyin
    detectMixedContent(content) {
        // Kural 1: İçerikte Türkçe metin karakterleri var mı?
        const hasText = /[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(content);

        // Kural 2: İçerikte matematiksel sınırlayıcılar var mı? ($, \\(, \\[, $$)
        const hasLatexDelimiters = /\$.*?\$|\\\(.*?\\\)|\\\[.*?\\\]|\$\$.*?\$\$/.test(content);

        // Kural 3: Sınırlayıcıların içinde gerçek LaTeX komutları var mı?
        const hasLatexCommands = /(\\[a-zA-Z]+|\^|_|\{|\})/.test(content);

        // KARAR: Bir içeriğin "karışık" olması için, hem metin hem de LaTeX sınırlayıcıları içermesi gerekir.
        // Bu, "Fiyat: $5" gibi ifadelerin yanlışlıkla render edilmesini önler.
        return hasText && hasLatexDelimiters && hasLatexCommands;
    }
    
    async renderPureLatex(element, content, displayMode) {
        try {
            element.textContent = '';
            
            const tempDiv = document.createElement('div');
            tempDiv.style.visibility = 'hidden';
            tempDiv.style.position = 'absolute';
            
            if (displayMode) {
                tempDiv.innerHTML = `\\[${content}\\]`;
            } else {
                tempDiv.innerHTML = `\\(${content}\\)`;
            }
            
            document.body.appendChild(tempDiv);
            
            await MathJax.typesetPromise([tempDiv]);
            
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
            
            while (tempDiv.firstChild) {
                element.appendChild(tempDiv.firstChild);
            }
            
            document.body.removeChild(tempDiv);
            
            element.classList.add('math-rendered', 'mathjax-rendered');
            if (displayMode) {
                element.style.display = 'block';
                element.style.textAlign = 'center';
                element.style.margin = '1rem auto';
            }
            
            return true;
            
        } catch (error) {
            console.error('Pure LaTeX render hatası:', error);
            element.textContent = content;
            element.classList.add('render-error');
            return false;
        }
    }
    
    async renderMixedContent(element, content, options) {
        try {
            const parts = this.splitMixedContent(content);
            
            element.innerHTML = '';
            element.classList.add('mixed-content-container');
            
            for (const part of parts) {
                const span = document.createElement('span');
                
                if (part.type === 'latex') {
                    span.className = 'latex-part';
                    // Hata buradaydı, artık doğru render fonksiyonunu çağırıyoruz.
                    await this.performRenderWithMathJax(span, part.content, { displayMode: false });
                } else {
                    span.className = 'text-part';
                    span.textContent = part.content;
                }
                
                element.appendChild(span);
            }
            
            return true;
            
        } catch (error) {
            console.error('Mixed content render hatası:', error);
            element.textContent = content;
            return false;
        }
    }
    // www/js/modules/globalRenderManager.js dosyasındaki bu fonksiyonu güncelleyin.

    splitMixedContent(content) {
        const parts = [];
        // Bu regex, $...$, $$...$$, \(...\) ve \[...\] bloklarını yakalar.
        const regex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;
        
        let lastIndex = 0;
        let match;
        
        while ((match = regex.exec(content)) !== null) {
            // LaTeX bloğundan önceki metin parçasını al.
            if (match.index > lastIndex) {
                const text = content.slice(lastIndex, match.index);
                if (text.trim()) {
                    parts.push({ type: 'text', content: text });
                }
            }
            
            // Eşleşen LaTeX parçasını al ve sınırlayıcılarını temizle.
            let latex = match[1];
            
            // --- GÜNCELLENMİŞ TEMİZLEME MANTIĞI ---
            // Her tür sınırlayıcıyı ($, $$, \[, \(), \], \)) kaldır.
            latex = latex
                .replace(/^\$\$|^\$|^\\\[|^\\\(/, '')
                .replace(/\$\$?$|\\\]$|\\\)$/, '')
                .trim();
            
            if (latex) {
                parts.push({ type: 'latex', content: latex });
            }
        
            lastIndex = match.index + match[0].length;
        }
        
        // Sondaki metin parçasını al.
        if (lastIndex < content.length) {
            const remaining = content.slice(lastIndex);
            if (remaining.trim()) {
                parts.push({ type: 'text', content: remaining });
            }
        }
        
        return parts;
    }
    
    async renderContainer(container, options = {}) {
        if (!container) return;
        
        await this.initializeMathJax();
        
        const elements = this.collectRenderableElements(container);
        console.log(`📊 ${elements.length} element render edilecek`);
        
        const batchSize = 5;
        for (let i = 0; i < elements.length; i += batchSize) {
            const batch = elements.slice(i, i + batchSize);
            
            await Promise.all(batch.map(({ element, content, isDisplay }) =>
                this.renderElement(element, content, { displayMode: isDisplay })
            ));
            
            if (options.onProgress) {
                options.onProgress(Math.min(i + batchSize, elements.length), elements.length);
            }
            
            if (i + batchSize < elements.length) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        
        console.log('✅ Container render tamamlandı:', this.stats);
    }
    
    collectRenderableElements(container) {
        const elements = [];
        
        container.querySelectorAll('.smart-content').forEach(el => {
            const content = el.getAttribute('data-content') || el.textContent;
            if (content && content.trim()) {
                elements.push({
                    element: el,
                    content: content,
                    isDisplay: false
                });
            }
        });
        
        container.querySelectorAll('.latex-content').forEach(el => {
            const content = el.getAttribute('data-latex') || el.textContent;
            if (content && content.trim()) {
                elements.push({
                    element: el,
                    content: content,
                    isDisplay: true
                });
            }
        });
        
        //container.querySelectorAll('.option-text').forEach(el => {
            //const content = el.textContent;
            //if (content && content.trim()) {
               // elements.push({
                   // element: el,
                  // content: content,
                  //  isDisplay: false
               // });
           // }
       // });
        
        return elements;
    }
    
    async processQueuedRenders() {
        if (this.renderQueue.size === 0) return;
        
        console.log(`📋 ${this.renderQueue.size} bekleyen render işleniyor`);
        
        for (const [id, task] of this.renderQueue) {
            await this.renderElement(task.element, task.content, task.options);
            this.renderQueue.delete(id);
        }
    }
    
    async waitForRender(renderID, timeout = 5000) {
        const startTime = Date.now();
        
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (!this.pendingRenders.has(renderID)) {
                    clearInterval(checkInterval);
                    resolve(true);
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(checkInterval);
                    console.warn(`⏱️ Render timeout: ${renderID}`);
                    resolve(false);
                }
            }, 100);
        });
    }
    
    getStats() {
        return {
            ...this.stats,
            mathJaxReady: this.mathJaxStatus.ready,
            queueSize: this.renderQueue.size,
            pendingCount: this.pendingRenders.size
        };
    }
    
    reset() {
        this.renderQueue.clear();
        this.pendingRenders.clear();
        this.renderAttempts.clear();
        this.stats = {
            successful: 0,
            failed: 0,
            retried: 0,
            pending: 0
        };
    }
}

// Singleton instance
export const globalRenderManager = new GlobalRenderManager();

// Global erişim için window objesine ekle
if (typeof window !== 'undefined') {
    window.globalRenderManager = globalRenderManager;
    console.log('✅ globalRenderManager window objesine eklendi');
}