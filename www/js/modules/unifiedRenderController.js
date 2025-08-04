// unifiedRenderController.js - Tüm render işlemlerini merkezi olarak yöneten sistem

export class UnifiedRenderController {
    constructor() {
        // Render durumu takibi
        this.renderRegistry = new Map(); // elementId -> RenderState
        this.renderQueue = [];
        this.isProcessing = false;
        this.renderLocks = new Map(); // elementId -> Promise
        
        // Performans metrikleri
        this.metrics = {
            totalRenders: 0,
            successfulRenders: 0,
            failedRenders: 0,
            averageRenderTime: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        
        // Render cache - WeakMap kullanarak memory leak önlenir
        this.renderCache = new WeakMap();
        this.contentHashCache = new Map();
        
        // Renderer'lar
        this.renderers = new Map();
        this.initializeRenderers();
        
        // Global event bus
        this.eventBus = new EventTarget();
        
        // Debounce/Throttle yönetimi
        this.pendingRenders = new Map();
        this.renderDebounceTime = 100; // ms
    }
    
    // ============= RENDERER YÖNETİMİ =============
    
    async initializeRenderers() {
        // Lazy loading ile renderer'ları yükle
        this.registerRenderer('mathjax', async () => {
            await this.ensureMathJaxReady();
            return this.mathJaxRenderer.bind(this);
        });
        
        this.registerRenderer('katex', async () => {
            await this.ensureKaTeXReady();
            return this.katexRenderer.bind(this);
        });
        
        this.registerRenderer('smart', async () => {
            // Akıllı renderer - içeriğe göre otomatik seçim yapar
            return this.smartRenderer.bind(this);
        });
    }
    
    registerRenderer(name, loaderFn) {
        this.renderers.set(name, {
            loader: loaderFn,
            instance: null,
            ready: false
        });
    }
    
    // ============= ANA RENDER FONKSİYONU =============
    
    async render(element, content, options = {}) {
        // Parametre validasyonu
        if (!element || !content) {
            console.warn('Render: Geçersiz parametreler', { element, content });
            return false;
        }
        
        // Element ID oluştur veya al
        const elementId = this.getOrCreateElementId(element);
        
        // Render kilidi kontrolü - Aynı element zaten render ediliyorsa bekle
        if (this.renderLocks.has(elementId)) {
            console.log(`🔒 Element zaten render ediliyor, bekleniyor: ${elementId}`);
            return await this.renderLocks.get(elementId);
        }
        
        // Cache kontrolü
        const cacheKey = this.generateCacheKey(content, options);
        if (this.shouldUseCache(element, cacheKey)) {
            const cached = this.getFromCache(element, cacheKey);
            if (cached) {
                console.log(`✨ Cache hit: ${elementId}`);
                this.metrics.cacheHits++;
                this.applyRenderedContent(element, cached);
                return true;
            }
        }
        
        // Render promise oluştur ve kilitle
        const renderPromise = this.performRender(element, content, options, elementId, cacheKey);
        this.renderLocks.set(elementId, renderPromise);
        
        try {
            const result = await renderPromise;
            return result;
        } finally {
            // Kilit kaldır
            this.renderLocks.delete(elementId);
        }
    }
    
    async performRender(element, content, options, elementId, cacheKey) {
        const startTime = performance.now();
        
        try {
            // Render durumunu kaydet
            this.updateRenderState(elementId, 'rendering');
            
            // İçerik analizi
            const contentType = this.analyzeContent(content);
            
            // Uygun renderer'ı seç
            const renderer = await this.selectRenderer(contentType, options);
            
            // Element'in DOM'da olduğundan emin ol
            if (!document.body.contains(element)) {
                await this.waitForElementInDOM(element, 3000);
            }
            
            // Render işlemi
            const rendered = await renderer(element, content, options);
            
            if (rendered) {
                // Başarılı render
                this.updateRenderState(elementId, 'completed');
                this.saveToCache(element, cacheKey, element.innerHTML);
                
                // Metrikleri güncelle
                const renderTime = performance.now() - startTime;
                this.updateMetrics('success', renderTime);
                
                // Event yayınla
                this.emitRenderEvent(elementId, 'success', { content, options, renderTime });
                
                return true;
            } else {
                throw new Error('Renderer false döndürdü');
            }
            
        } catch (error) {
            console.error(`❌ Render hatası (${elementId}):`, error);
            
            // Hata durumunu kaydet
            this.updateRenderState(elementId, 'failed', error);
            
            // Fallback render
            const fallbackResult = await this.fallbackRender(element, content, options);
            
            // Metrikleri güncelle
            this.updateMetrics('failure', performance.now() - startTime);
            
            // Event yayınla
            this.emitRenderEvent(elementId, 'error', { error, fallbackUsed: fallbackResult });
            
            return fallbackResult;
        }
    }
    
    // ============= AKILLI RENDER SELECTOR =============
    
    async selectRenderer(contentType, options) {
        // Öncelik sırası: 
        // 1. Options'da belirtilen renderer
        // 2. İçerik tipine göre otomatik seçim
        // 3. Default renderer
        
        if (options.renderer) {
            return await this.getRenderer(options.renderer);
        }
        
        switch (contentType) {
            case 'simple_math':
                // Basit matematik için KaTeX (hızlı)
                return await this.getRenderer('katex');
                
            case 'complex_math':
                // Karmaşık matematik için MathJax (güçlü)
                return await this.getRenderer('mathjax');
                
            case 'mixed':
                // Karışık içerik için akıllı renderer
                return await this.getRenderer('smart');
                
            default:
                // Default olarak smart renderer
                return await this.getRenderer('smart');
        }
    }
    
    async getRenderer(name) {
        const renderer = this.renderers.get(name);
        if (!renderer) {
            throw new Error(`Renderer bulunamadı: ${name}`);
        }
        
        if (!renderer.instance) {
            renderer.instance = await renderer.loader();
            renderer.ready = true;
        }
        
        return renderer.instance;
    }
    
    // ============= RENDERER İMPLEMENTASYONLARI =============
    
    async mathJaxRenderer(element, content, options) {
        if (!window.MathJax?.typesetPromise) {
            throw new Error('MathJax hazır değil');
        }
        
        // İçeriği hazırla
        const mathContent = options.displayMode ? 
            `\\[${content}\\]` : `\\(${content}\\)`;
        
        // Geçici container oluştur
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = mathContent;
        tempDiv.style.visibility = 'hidden';
        tempDiv.style.position = 'absolute';
        document.body.appendChild(tempDiv);
        
        try {
            // MathJax render
            await MathJax.typesetPromise([tempDiv]);
            
            // Sonucu ana elemente kopyala
            element.innerHTML = tempDiv.innerHTML;
            
            // Stilleri uygula
            this.applyRenderStyles(element, 'mathjax', options.displayMode);
            
            return true;
            
        } finally {
            // Temizlik
            document.body.removeChild(tempDiv);
        }
    }
    
    async katexRenderer(element, content, options) {
        if (!window.katex) {
            throw new Error('KaTeX hazır değil');
        }
        
        try {
            katex.render(content, element, {
                displayMode: options.displayMode || false,
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
            
            this.applyRenderStyles(element, 'katex', options.displayMode);
            return true;
            
        } catch (error) {
            console.warn('KaTeX render hatası:', error);
            return false;
        }
    }
    
    async smartRenderer(element, content, options) {
        // Önce KaTeX dene (hızlı)
        try {
            const result = await this.katexRenderer(element, content, options);
            if (result) return true;
        } catch (e) {
            // KaTeX başarısız
        }
        
        // MathJax'e fallback
        try {
            return await this.mathJaxRenderer(element, content, options);
        } catch (e) {
            // Her ikisi de başarısız
            return false;
        }
    }
    
    // ============= FALLBACK SİSTEMİ =============
    
    async fallbackRender(element, content, options) {
        console.warn(`⚠️ Fallback render: ${element.id || 'unnamed'}`);
        
        // LaTeX delimiterleri temizle
        let cleanContent = content;
        if (typeof content === 'string') {
            cleanContent = content
                .replace(/\$\$/g, '')
                .replace(/\$/g, '')
                .replace(/\\\[/g, '')
                .replace(/\\\]/g, '')
                .replace(/\\\(/g, '')
                .replace(/\\\)/g, '')
                .replace(/\\([a-zA-Z]+)/g, '') // LaTeX komutları
                .replace(/[{}]/g, '') // Süslü parantezler
                .trim();
        }
        
        // Fallback içeriği göster
        element.innerHTML = `
            <div class="render-fallback" style="
                padding: 8px 12px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 8px;
                font-family: 'SF Mono', Monaco, monospace;
                font-size: 14px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                position: relative;
                overflow: hidden;
            ">
                <div style="position: relative; z-index: 1;">
                    ${this.escapeHtml(cleanContent)}
                </div>
                <div style="
                    position: absolute;
                    top: -50%;
                    right: -50%;
                    width: 200%;
                    height: 200%;
                    background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%);
                    animation: shimmer 2s infinite;
                "></div>
            </div>
            <style>
                @keyframes shimmer {
                    0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
                    100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
                }
            </style>
        `;
        
        element.classList.add('fallback-rendered');
        element.setAttribute('data-render-fallback', 'true');
        
        return true;
    }
    
    // ============= CONTAINER RENDER =============
    
    async renderContainer(container, options = {}) {
        if (!container) return false;
        
        const containerId = this.getOrCreateElementId(container);
        console.log(`📦 Container render başlatılıyor: ${containerId}`);
        
        // Render edilecek elementleri topla
        const elements = this.collectRenderableElements(container);
        
        if (elements.length === 0) {
            console.log('Render edilecek element bulunamadı');
            return true;
        }
        
        // Progress callback hazırla
        const onProgress = options.onProgress || (() => {});
        
        // Batch rendering stratejisi
        const batchSize = options.batchSize || 5;
        const results = [];
        
        for (let i = 0; i < elements.length; i += batchSize) {
            const batch = elements.slice(i, i + batchSize);
            
            // Batch'i paralel render et
            const batchPromises = batch.map(({ element, content, displayMode }) => 
                this.render(element, content, { ...options, displayMode })
                    .catch(error => {
                        console.error('Batch render error:', error);
                        return false;
                    })
            );
            
            const batchResults = await Promise.allSettled(batchPromises);
            results.push(...batchResults);
            
            // Progress bildirimi
            onProgress(Math.min(i + batchSize, elements.length), elements.length);
            
            // CPU'ya nefes aldır
            if (i + batchSize < elements.length) {
                await this.sleep(50);
            }
        }
        
        // Sonuçları değerlendir
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
        console.log(`✅ Container render tamamlandı: ${successCount}/${elements.length} başarılı`);
        
        return successCount > 0;
    }
    
    collectRenderableElements(container) {
        const elements = [];

        if (!document.body.contains(container)) {
            console.warn('Container DOM\'da değil');
            return elements;
        }
        
        // Smart content elementleri
        container.querySelectorAll('.smart-content[data-content]').forEach(el => {
            if (!this.isAlreadyRendered(el)) {
                elements.push({
                    element: el,
                    content: el.getAttribute('data-content'),
                    displayMode: false
                });
            }
        });
        
        // LaTeX content elementleri
        container.querySelectorAll('.latex-content[data-latex]').forEach(el => {
            if (!this.isAlreadyRendered(el)) {
                elements.push({
                    element: el,
                    content: el.getAttribute('data-latex'),
                    displayMode: true
                });
            }
        });
        
        // Option text elementleri
        container.querySelectorAll('.option-text').forEach(el => {
            if (!this.isAlreadyRendered(el) && el.textContent) {
                elements.push({
                    element: el,
                    content: el.textContent,
                    displayMode: false
                });
            }
        });
        
        return elements;
    }
    
    // ============= YARDIMCI FONKSİYONLAR =============
    
    getOrCreateElementId(element) {
        if (!element.id) {
            element.id = `render-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        return element.id;
    }
    
    generateCacheKey(content, options) {
        const contentHash = this.hashContent(content);
        const optionsHash = this.hashContent(JSON.stringify(options));
        return `${contentHash}-${optionsHash}`;
    }
    
    hashContent(content) {
        if (this.contentHashCache.has(content)) {
            return this.contentHashCache.get(content);
        }
        
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        const hashStr = Math.abs(hash).toString(36);
        this.contentHashCache.set(content, hashStr);
        return hashStr;
    }
    
    shouldUseCache(element, cacheKey) {
        // Cache kullanım kriterleri
        return !element.hasAttribute('data-no-cache') && 
               !element.classList.contains('no-cache') &&
               this.renderCache.has(element);
    }
    
    getFromCache(element, cacheKey) {
        const elementCache = this.renderCache.get(element);
        if (elementCache && elementCache.key === cacheKey) {
            return elementCache.content;
        }
        return null;
    }
    
    saveToCache(element, cacheKey, content) {
        this.renderCache.set(element, {
            key: cacheKey,
            content: content,
            timestamp: Date.now()
        });
    }
    
    applyRenderedContent(element, content) {
        element.innerHTML = content;
        element.setAttribute('data-rendered', 'true');
        element.setAttribute('data-render-time', new Date().toISOString());
    }
    
    isAlreadyRendered(element) {
        return element.hasAttribute('data-rendered') && 
               element.getAttribute('data-rendered') === 'true';
    }
    
    updateRenderState(elementId, state, error = null) {
        this.renderRegistry.set(elementId, {
            state,
            timestamp: Date.now(),
            error
        });
    }
    
    analyzeContent(content) {
        if (!content || typeof content !== 'string') return 'text';
        
        const trimmed = content.trim();
        
        // LaTeX pattern'leri
        const hasInlineMath = /\$(?!\$)([^$]+)\$/g.test(trimmed);
        const hasDisplayMath = /\$\$([^$]+)\$\$/g.test(trimmed);
        const hasLatexCommands = /\\(?:frac|sqrt|sum|int|lim|sin|cos|tan|log|ln|exp|alpha|beta|gamma|delta|theta|pi|sigma|infty)\b/g.test(trimmed);
        
        // Türkçe karakter kontrolü
        const hasTurkish = /[ğüşıöçĞÜŞİÖÇ]/g.test(trimmed);
        
        // Karmaşıklık analizi
        const complexity = this.calculateComplexity(trimmed);
        
        if (hasLatexCommands || hasDisplayMath) {
            return complexity > 5 ? 'complex_math' : 'simple_math';
        } else if (hasInlineMath && hasTurkish) {
            return 'mixed';
        } else if (hasInlineMath) {
            return 'simple_math';
        } else {
            return 'text';
        }
    }
    
    calculateComplexity(content) {
        let complexity = 0;
        
        // Faktörler
        if (/\\begin\{/.test(content)) complexity += 3;
        if (/\\matrix/.test(content)) complexity += 2;
        if (/\\int/.test(content)) complexity += 2;
        if (/\\sum/.test(content)) complexity += 2;
        if (/\\prod/.test(content)) complexity += 2;
        if (/\\lim/.test(content)) complexity += 1;
        if (/\\frac/.test(content)) complexity += 1;
        
        // İç içe parantez sayısı
        const nestedParens = (content.match(/\{[^{}]*\{/g) || []).length;
        complexity += nestedParens;
        
        return complexity;
    }
    
    applyRenderStyles(element, renderer, displayMode) {
        // Renderer'a özel sınıflar
        element.classList.add('math-rendered', `rendered-by-${renderer}`);
        
        // Display mode stilleri
        if (displayMode) {
            element.classList.add('math-display');
            element.style.display = 'block';
            element.style.textAlign = 'center';
            element.style.margin = '1rem auto';
        } else {
            element.classList.add('math-inline');
            element.style.display = 'inline-block';
            element.style.verticalAlign = 'middle';
        }
        
        // Render zamanını kaydet
        element.setAttribute('data-rendered', 'true');
        element.setAttribute('data-renderer', renderer);
    }
    
    async waitForElementInDOM(element, timeout = 3000) {
        const startTime = Date.now();
        
        // Element zaten DOM'da mı?
        if (document.body.contains(element)) {
            return true;
        }
        
        // Element ID'si varsa, ID ile tekrar ara
        if (element.id) {
            const foundElement = document.getElementById(element.id);
            if (foundElement) {
                return true;
            }
        }
        
        // Polling ile bekle
        while (!document.body.contains(element)) {
            if (Date.now() - startTime > timeout) {
                // Timeout durumunda bile bir kez daha kontrol et
                if (document.body.contains(element)) {
                    return true;
                }
                
                // Element ID ile son bir deneme
                if (element.id) {
                    const lastCheck = document.getElementById(element.id);
                    if (lastCheck && document.body.contains(lastCheck)) {
                        return true;
                    }
                }
                
                throw new Error('Element DOM\'a eklenmedi (timeout)');
            }
            await this.sleep(50);
        }
        
        return true;
    }
    
    async ensureMathJaxReady() {
        if (window.MathJax?.typesetPromise) return true;
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('MathJax yükleme timeout'));
            }, 10000);
            
            // MathJax config
            window.MathJax = {
                tex: {
                    inlineMath: [['$', '$'], ['\\(', '\\)']],
                    displayMath: [['$$', '$$'], ['\\[', '\\]']],
                    processEscapes: true,
                    processEnvironments: true
                },
                options: {
                    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
                },
                startup: {
                    pageReady: () => {
                        clearTimeout(timeout);
                        resolve(true);
                    }
                }
            };
            
            // Script yükle
            if (!document.querySelector('script[src*="mathjax"]')) {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
                script.async = true;
                document.head.appendChild(script);
            }
        });
    }
    
    async ensureKaTeXReady() {
        if (window.katex) return true;
        
        return new Promise((resolve, reject) => {
            // KaTeX CSS
            if (!document.querySelector('link[href*="katex"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
                document.head.appendChild(link);
            }
            
            // KaTeX JS
            if (!document.querySelector('script[src*="katex"]')) {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
                script.async = true;
                script.onload = () => resolve(true);
                script.onerror = () => reject(new Error('KaTeX yüklenemedi'));
                document.head.appendChild(script);
            } else {
                resolve(true);
            }
        });
    }
    
    // ============= EVENT SİSTEMİ =============
    
    emitRenderEvent(elementId, type, detail) {
        const event = new CustomEvent(`render:${type}`, {
            detail: {
                elementId,
                timestamp: Date.now(),
                ...detail
            }
        });
        
        this.eventBus.dispatchEvent(event);
        
        // Global event bus'a da yayınla
        if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent(`unified-render:${type}`, {
                detail: event.detail
            }));
        }
    }
    
    on(eventType, handler) {
        this.eventBus.addEventListener(`render:${eventType}`, handler);
    }
    
    off(eventType, handler) {
        this.eventBus.removeEventListener(`render:${eventType}`, handler);
    }
    
    // ============= METRİK SİSTEMİ =============
    
    updateMetrics(type, renderTime) {
        this.metrics.totalRenders++;
        
        if (type === 'success') {
            this.metrics.successfulRenders++;
        } else {
            this.metrics.failedRenders++;
        }
        
        // Ortalama render süresini güncelle
        const currentAvg = this.metrics.averageRenderTime;
        const totalCount = this.metrics.totalRenders;
        this.metrics.averageRenderTime = ((currentAvg * (totalCount - 1)) + renderTime) / totalCount;
    }
    
    getMetrics() {
        return {
            ...this.metrics,
            successRate: this.metrics.totalRenders > 0 ? 
                (this.metrics.successfulRenders / this.metrics.totalRenders) * 100 : 0,
            cacheHitRate: (this.metrics.cacheHits + this.metrics.cacheMisses) > 0 ?
                (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100 : 0,
            activeRenders: this.renderLocks.size,
            queueLength: this.renderQueue.length
        };
    }
    
    // ============= TEMİZLİK VE RESET =============
    
    reset() {
        // Tüm aktif render'ları iptal et
        this.renderLocks.clear();
        
        // Queue'yu temizle
        this.renderQueue = [];
        
        // Registry'yi temizle
        this.renderRegistry.clear();
        
        // Metrikleri sıfırla
        this.metrics = {
            totalRenders: 0,
            successfulRenders: 0,
            failedRenders: 0,
            averageRenderTime: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        
        console.log('✅ Unified Render Controller sıfırlandı');
    }
    
    clearCache() {
        this.renderCache = new WeakMap();
        this.contentHashCache.clear();
        console.log('✅ Render cache temizlendi');
    }
    
    // ============= YARDIMCI FONKSİYONLAR =============
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // ============= DEBUG VE İZLEME =============
    
    debugInfo() {
        return {
            metrics: this.getMetrics(),
            activeRenders: Array.from(this.renderLocks.keys()),
            registrySize: this.renderRegistry.size,
            cacheSize: this.contentHashCache.size,
            renderers: Array.from(this.renderers.keys()).map(name => ({
                name,
                ready: this.renderers.get(name).ready
            }))
        };
    }
    
    enableDebugMode() {
        // Debug event listener'ları ekle
        this.on('success', (e) => console.log('✅ Render success:', e.detail));
        this.on('error', (e) => console.error('❌ Render error:', e.detail));
        
        // Performans logları
        this.on('success', (e) => {
            if (e.detail.renderTime > 1000) {
                console.warn(`⚠️ Yavaş render tespit edildi: ${e.detail.renderTime}ms`, e.detail);
            }
        });
        
        console.log('🐛 Debug mode aktif');
    }
}

// Singleton instance
export const unifiedRenderController = new UnifiedRenderController();

// Global erişim
if (typeof window !== 'undefined') {
    window.unifiedRenderController = unifiedRenderController;
    
    // Auto-initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('✅ Unified Render Controller hazır');
        });
    }
}