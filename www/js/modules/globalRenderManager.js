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
        if (!element || !content) return false;

        // Render işlemine başlamadan önce MathJax'in hazır olduğundan emin ol.
        if (!this.mathJaxStatus.ready) {
            await this.initializeMathJax();
        }

        const normalizedContent = this.normalizeContent(content);
        if (!normalizedContent) {
            element.textContent = content; // Eğer içerik boşsa, olduğu gibi bırak.
            return true;
        }
        
        const renderID = this.generateRenderID(element, normalizedContent);
        if (this.pendingRenders.has(renderID)) {
             return this.waitForRender(renderID); // Zaten devam eden bir render varsa bekle.
        }

        this.pendingRenders.add(renderID);
        this.stats.pending++;
        
        // --- KADEMELİ FALLBACK MANTIĞI ---
        try {
            // 1. Strateji: Karışık içerik mi? Önce onu handle et.
            if (this.detectMixedContent(normalizedContent)) {
                await this.renderMixedContent(element, normalizedContent, options);
            } else {
            // 2. Strateji: Saf matematik içeriği. En iyi motor olan MathJax ile render etmeyi dene.
                await this.performRenderWithMathJax(element, normalizedContent, options);
            }
            
            this.stats.successful++;
            this.pendingRenders.delete(renderID);
            this.stats.pending--;
            return true;

        } catch (error) {
            // 3. Strateji: MathJax başarısız oldu!
            console.warn(`MathJax render hatası (${renderID}), fallback uygulanıyor.`, error);
            
            // Son çare olarak, içeriği fallback ile düz metin olarak göster.
            this.renderFallback(element, normalizedContent, error);

            this.stats.failed++;
            this.pendingRenders.delete(renderID);
            this.stats.pending--;
            // Hata oluştuğu için false dönüyoruz ama kullanıcıya yine de bir şey gösterdik.
            return false; 
        }
    }

    async performRenderWithMathJax(element, content, options) {
        const { displayMode = false } = options;
        const mathContent = displayMode ? `\\[${content}\\]` : `\\(${content}\\)`;
    
        // 1. Geçici bir container oluştur. Bu container'ı sayfanın kendisine ekleyeceğiz.
        const tempDiv = document.createElement('div');
    
        // 2. Kullanıcının görmemesi için onu ekranın dışına taşıyalım.
        tempDiv.style.visibility = 'hidden';
        tempDiv.style.position = 'absolute';
        tempDiv.style.top = '-9999px';
        tempDiv.style.left = '-9999px';
    
        tempDiv.textContent = mathContent;
        document.body.appendChild(tempDiv); // ÖLÇÜM İÇİN SAYFAYA EKLE
    
        try {
            // 3. MathJax'e bu geçici elementi işlemesini söyle. Artık doğru ölçüm yapabilir.
            await MathJax.typesetPromise([tempDiv]);
    
            // 4. Başarılı render sonucunu asıl hedef elementimizin içine kopyala.
            element.innerHTML = tempDiv.innerHTML;
            element.classList.add('math-rendered', 'mathjax-rendered');
            
        } finally {
            // 5. İşlem bittikten sonra geçici elementi sayfadan mutlaka kaldır.
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

   
    
    detectMixedContent(content) {
        // Bu yeni, daha akıllı versiyon, bir ifadenin "karışık" sayılması için daha katı kurallar uygular.
        
        // Kural 1: İçerikte Türkçe karakter var mı? (ğ, ü, ş, ı, ö, ç)
        const hasTurkish = /[ğüşıöçĞÜŞİÖÇ]/.test(content);
        
        // Kural 2: İçerikte GERÇEK LaTeX komutları veya yapıları var mı?
        // Sadece $...$ olması yeterli değil, içinde \frac, ^, _, \sqrt gibi komutlar olmalı.
        const hasLatexCommands = /(\\[a-zA-Z]+|\^|_|\{|\})/.test(content);
        
        // Kural 3: İçerikte matematiksel sınırlayıcılar var mı? ($, \\(, \\[, $$)
        const hasLatexDelimiters = /\$.*?\$|\\\(.*?\\\)|\\\[.*?\\\]|\$\$.*?\$\$/.test(content);
        
        // Kural 4: Kelime sayısı.
        const wordCount = content.split(/\s+/).length;

        // Karar Anı: Bir içeriğin "karışık" olması için, hem Türkçe metin içermesi
        // hem de içinde gerçek LaTeX komutları barındıran matematiksel bir bölümü olması gerekir.
        // VEYA, 5'ten fazla kelime içerip matematiksel sınırlayıcılara sahipse de karışık kabul edilir.
        // Bu, "Fiyatı $5" gibi ifadelerin yanlışlıkla LaTeX olarak algılanmasını önler.
        if (hasTurkish && hasLatexCommands && hasLatexDelimiters) {
            return true;
        }
        if (wordCount > 5 && hasLatexDelimiters) {
            return true;
        }

        return false;
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
    
    splitMixedContent(content) {
        const parts = [];
        // Regex'i güncelledik: İç içe geçmiş durumları daha iyi handle eder ve daha spesifiktir.
        const regex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;
        
        let lastIndex = 0;
        let match;
        
        while ((match = regex.exec(content)) !== null) {
            // LaTeX bloğundan önceki metin parçasını al.
            if (match.index > lastIndex) {
                const text = content.slice(lastIndex, match.index);
                if (text.trim()) { // Sadece boşluklardan oluşmuyorsa ekle.
                    parts.push({ type: 'text', content: text });
                }
            }
            
            // Eşleşen LaTeX parçasını al.
            let latex = match[1];
            
            // LaTeX sınırlayıcılarını (delimiters) temizle.
            latex = latex
                .replace(/^\$\$|\$\$$/g, '')
                .replace(/^\$|\$$/g, '')
                .replace(/^\\\(|\\\)$/g, '')
                .replace(/^\\\[|\\\]$/g, '');
            
            // YENİ GÜVENLİK KONTROLÜ:
            // Eğer temizlenmiş LaTeX parçası boş değilse VEYA matematiksel bir komut içeriyorsa ekle.
            // Bu, "$ $" gibi boş veya anlamsız LaTeX bloklarının render kuyruğuna girmesini engeller.
            if (latex.trim() || /(\\[a-zA-Z]+|\^|_)/.test(latex)) {
                 parts.push({ type: 'latex', content: latex.trim() });
            } else {
                // Eğer parça render edilmeye değmezse (örn: "$ $"), onu metin olarak ekleyebiliriz.
                parts.push({ type: 'text', content: match[1] });
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
        
        container.querySelectorAll('.option-text').forEach(el => {
            const content = el.textContent;
            if (content && content.trim()) {
                elements.push({
                    element: el,
                    content: content,
                    isDisplay: false
                });
            }
        });
        
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