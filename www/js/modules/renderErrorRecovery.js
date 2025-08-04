// renderErrorRecovery.js - Akıllı hata yakalama ve otomatik kurtarma sistemi

export class RenderErrorRecovery {
    constructor() {
        // Hata kategorileri ve çözümleri
        this.errorPatterns = new Map();
        this.recoveryStrategies = new Map();
        this.errorHistory = [];
        this.blacklist = new Set(); // Sürekli hata veren elementler
        
        // Kurtarma yapılandırması
        this.config = {
            maxRetries: 3,
            retryDelay: 500,
            blacklistThreshold: 5,
            historyLimit: 100,
            autoRecovery: true
        };
        
        // Hata istatistikleri
        this.stats = {
            totalErrors: 0,
            recoveredErrors: 0,
            fatalErrors: 0,
            errorsByType: new Map()
        };
        
        this.initializeErrorPatterns();
        this.initializeRecoveryStrategies();
        this.setupGlobalErrorHandlers();
    }
    
    // ============= HATA KATEGORİLERİ =============
    
    initializeErrorPatterns() {
        // DOM Hataları
        this.errorPatterns.set('dom_not_found', {
            test: (error) => error.message?.includes('DOM') || error.message?.includes('null'),
            category: 'dom',
            severity: 'medium',
            description: 'Element DOM\'da bulunamadı'
        });
        
        // MathJax Hataları
        this.errorPatterns.set('mathjax_not_ready', {
            test: (error) => error.message?.includes('MathJax') && error.message?.includes('hazır değil'),
            category: 'library',
            severity: 'high',
            description: 'MathJax kütüphanesi hazır değil'
        });
        
        // KaTeX Hataları
        this.errorPatterns.set('katex_parse_error', {
            test: (error) => error.message?.includes('KaTeX') || error.message?.includes('Parse'),
            category: 'syntax',
            severity: 'low',
            description: 'KaTeX parse hatası'
        });
        
        // Bellek Hataları
        this.errorPatterns.set('memory_limit', {
            test: (error) => error.message?.includes('memory') || error.name === 'RangeError',
            category: 'performance',
            severity: 'critical',
            description: 'Bellek limiti aşıldı'
        });
        
        // Timeout Hataları
        this.errorPatterns.set('render_timeout', {
            test: (error) => error.message?.includes('timeout') || error.message?.includes('Timeout'),
            category: 'performance',
            severity: 'medium',
            description: 'Render zaman aşımı'
        });
        
        // Genel JavaScript Hataları
        this.errorPatterns.set('type_error', {
            test: (error) => error.name === 'TypeError',
            category: 'code',
            severity: 'medium',
            description: 'Tip hatası'
        });
        
        // Network Hataları
        this.errorPatterns.set('network_error', {
            test: (error) => error.message?.includes('Failed to fetch') || error.message?.includes('Network'),
            category: 'network',
            severity: 'high',
            description: 'Ağ bağlantı hatası'
        });
    }
    
    // ============= KURTARMA STRATEJİLERİ =============
    
    initializeRecoveryStrategies() {
        // DOM Hataları İçin
        this.recoveryStrategies.set('dom', {
            strategies: [
                {
                    name: 'waitForDOM',
                    apply: async (context) => {
                        console.log('🔄 DOM bekleniyor...');
                        await this.waitForElement(context.element, 3000);
                        return true;
                    }
                },
                {
                    name: 'recreateElement',
                    apply: async (context) => {
                        console.log('🔄 Element yeniden oluşturuluyor...');
                        const newElement = document.createElement(context.element.tagName);
                        newElement.className = context.element.className;
                        newElement.id = context.element.id;
                        
                        if (context.element.parentNode) {
                            context.element.parentNode.replaceChild(newElement, context.element);
                            context.element = newElement;
                            return true;
                        }
                        return false;
                    }
                }
            ]
        });
        
        // Library Hataları İçin
        this.recoveryStrategies.set('library', {
            strategies: [
                {
                    name: 'reloadLibrary',
                    apply: async (context) => {
                        console.log('🔄 Kütüphane yeniden yükleniyor...');
                        
                        if (context.error.message.includes('MathJax')) {
                            // MathJax'ı yeniden yükle
                            delete window.MathJax;
                            await this.loadScript('https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js');
                            return true;
                        } else if (context.error.message.includes('KaTeX')) {
                            // KaTeX'i yeniden yükle
                            delete window.katex;
                            await this.loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js');
                            return true;
                        }
                        
                        return false;
                    }
                },
                {
                    name: 'switchRenderer',
                    apply: async (context) => {
                        console.log('🔄 Alternatif renderer\'a geçiliyor...');
                        
                        // MathJax başarısızsa KaTeX'e geç
                        if (context.renderer === 'mathjax') {
                            context.options.renderer = 'katex';
                        } else {
                            context.options.renderer = 'mathjax';
                        }
                        
                        return true;
                    }
                }
            ]
        });
        
        // Syntax Hataları İçin
        this.recoveryStrategies.set('syntax', {
            strategies: [
                {
                    name: 'cleanLatex',
                    apply: async (context) => {
                        console.log('🔄 LaTeX temizleniyor...');
                        
                        // Yaygın LaTeX hatalarını düzelt
                        let cleaned = context.content;
                        
                        // Eksik parantezleri tamamla
                        const openBraces = (cleaned.match(/\{/g) || []).length;
                        const closeBraces = (cleaned.match(/\}/g) || []).length;
                        if (openBraces > closeBraces) {
                            cleaned += '}'.repeat(openBraces - closeBraces);
                        }
                        
                        // Eksik dolar işaretlerini tamamla
                        if ((cleaned.match(/\$/g) || []).length % 2 !== 0) {
                           cleaned += '$';
                        }
                        
                        // Bilinmeyen komutları temizle
                        cleaned = cleaned.replace(/\\[a-zA-Z]+(?![a-zA-Z])/g, (match) => {
                            const knownCommands = ['frac', 'sqrt', 'sum', 'int', 'sin', 'cos', 'tan', 'log', 'ln', 'exp'];
                            const command = match.slice(1);
                            return knownCommands.includes(command) ? match : '';
                        });
                        
                        context.content = cleaned;
                        return true;
                    }
                },
                {
                    name: 'simplifyExpression',
                    apply: async (context) => {
                        console.log('🔄 İfade basitleştiriliyor...');
                        
                        // Karmaşık LaTeX'i basitleştir
                        context.content = context.content
                            .replace(/\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g, '...')
                            .replace(/\\[a-zA-Z]+\{[^}]*\}/g, (match) => {
                                // Temel komutları koru
                                if (match.startsWith('\\frac') || match.startsWith('\\sqrt')) {
                                    return match;
                                }
                                return '...';
                            });
                        
                        return true;
                    }
                }
            ]
        });
        
        // Performance Hataları İçin
        this.recoveryStrategies.set('performance', {
            strategies: [
                {
                    name: 'increaseTimeout',
                    apply: async (context) => {
                        console.log('🔄 Timeout süresi artırılıyor...');
                        context.options.timeout = (context.options.timeout || 5000) * 2;
                        return true;
                    }
                },
                {
                    name: 'reduceComplexity',
                    apply: async (context) => {
                        console.log('🔄 Karmaşıklık azaltılıyor...');
                        
                        // Batch boyutunu küçült
                        if (context.options.batchSize) {
                            context.options.batchSize = Math.max(1, Math.floor(context.options.batchSize / 2));
                        }
                        
                        // Kaliteyi düşür
                        context.options.quality = 'low';
                        
                        // Cache'i devre dışı bırak
                        context.options.useCache = false;
                        
                        return true;
                    }
                },
                {
                    name: 'clearMemory',
                    apply: async (context) => {
                        console.log('🔄 Bellek temizleniyor...');
                        
                        // Cache temizle
                        if (window.unifiedRenderController) {
                            window.unifiedRenderController.clearCache();
                        }
                        
                        // Gereksiz DOM elementlerini temizle
                        document.querySelectorAll('.render-temp').forEach(el => el.remove());
                        
                        // Garbage collection tetikle
                        if (window.gc) {
                            window.gc();
                        }
                        
                        return true;
                    }
                }
            ]
        });
        
        // Network Hataları İçin
        this.recoveryStrategies.set('network', {
            strategies: [
                {
                    name: 'retryWithBackoff',
                    apply: async (context) => {
                        console.log('🔄 Exponential backoff ile yeniden deneniyor...');
                        
                        const delay = Math.min(1000 * Math.pow(2, context.retryCount || 0), 30000);
                        await this.sleep(delay);
                        
                        return true;
                    }
                },
                {
                    name: 'useOfflineMode',
                    apply: async (context) => {
                        console.log('🔄 Offline moda geçiliyor...');
                        
                        // CDN'den yükleme yerine local fallback kullan
                        context.options.offline = true;
                        
                        return true;
                    }
                }
            ]
        });
        
        // Genel Hatalar İçin
        this.recoveryStrategies.set('code', {
            strategies: [
                {
                    name: 'sanitizeInput',
                    apply: async (context) => {
                        console.log('🔄 Girdi temizleniyor...');
                        
                        // Güvenli değerler sağla
                        if (!context.element) {
                            context.element = document.createElement('div');
                        }
                        
                        if (typeof context.content !== 'string') {
                            context.content = String(context.content || '');
                        }
                        
                        if (!context.options) {
                            context.options = {};
                        }
                        
                        return true;
                    }
                }
            ]
        });
    }
    
    // ============= HATA YAKALAMA =============
    
    async handleError(error, context = {}) {
        this.stats.totalErrors++;
        
        // Hata geçmişine ekle
        const errorRecord = {
            timestamp: Date.now(),
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            context,
            recovered: false
        };
        
        this.errorHistory.push(errorRecord);
        if (this.errorHistory.length > this.config.historyLimit) {
            this.errorHistory.shift();
        }
        
        // Hata tipini belirle
        const errorType = this.identifyError(error);
        console.log(`🔍 Hata tipi belirlendi: ${errorType.category} - ${errorType.description}`);
        
        // İstatistikleri güncelle
        const count = this.stats.errorsByType.get(errorType.category) || 0;
        this.stats.errorsByType.set(errorType.category, count + 1);
        
        // Element blacklist kontrolü
        if (context.element && this.isBlacklisted(context.element)) {
            console.warn('⚫ Element blacklist\'te, kurtarma atlanıyor');
            this.stats.fatalErrors++;
            return false;
        }
        
        // Otomatik kurtarma
        if (this.config.autoRecovery) {
            const recovered = await this.attemptRecovery(error, errorType, context);
            
            if (recovered) {
                errorRecord.recovered = true;
                this.stats.recoveredErrors++;
                console.log('✅ Hata başarıyla kurtarıldı');
                return true;
            }
        }
        
        // Kurtarılamayan hata
        this.stats.fatalErrors++;
        this.handleFatalError(error, errorType, context);
        
        return false;
    }
    
    identifyError(error) {
        for (const [key, pattern] of this.errorPatterns) {
            if (pattern.test(error)) {
                return {
                    key,
                    ...pattern
                };
            }
        }
        
        // Bilinmeyen hata
        return {
            key: 'unknown',
            category: 'unknown',
            severity: 'medium',
            description: 'Bilinmeyen hata'
        };
    }
    
    // ============= KURTARMA SİSTEMİ =============
    
    async attemptRecovery(error, errorType, context) {
        const strategies = this.recoveryStrategies.get(errorType.category);
        
        if (!strategies) {
            console.warn(`⚠️ ${errorType.category} kategorisi için kurtarma stratejisi bulunamadı`);
            return false;
        }
        
        context.retryCount = context.retryCount || 0;
        
        // Maksimum deneme kontrolü
        if (context.retryCount >= this.config.maxRetries) {
            console.error('❌ Maksimum deneme sayısına ulaşıldı');
            this.addToBlacklist(context.element);
            return false;
        }
        
        // Stratejileri sırayla dene
        for (const strategy of strategies.strategies) {
            console.log(`🔧 Strateji deneniyor: ${strategy.name}`);
            
            try {
                const success = await strategy.apply(context);
                
                if (success) {
                    // Strateji başarılı, render'ı yeniden dene
                    if (window.unifiedRenderController && context.element && context.content) {
                        context.retryCount++;
                        
                        await this.sleep(this.config.retryDelay);
                        
                        const renderResult = await window.unifiedRenderController.render(
                            context.element,
                            context.content,
                            context.options
                        );
                        
                        if (renderResult) {
                            console.log(`✅ ${strategy.name} stratejisi başarılı`);
                            return true;
                        }
                    }
                }
            } catch (strategyError) {
                console.error(`❌ Strateji hatası (${strategy.name}):`, strategyError);
            }
        }
        
        return false;
    }
    
    // ============= FATAL HATA YÖNETİMİ =============
    
    handleFatalError(error, errorType, context) {
        console.error('💀 FATAL HATA - Kurtarılamadı:', {
            error: error.message,
            type: errorType,
            context
        });
        
        // Kullanıcıya bildirim göster
        this.showErrorNotification(error, errorType, context);
        
        // Fallback render
        if (context.element && context.content) {
            this.renderFallback(context.element, context.content, error);
        }
        
        // Hata raporu oluştur
        const report = this.generateErrorReport(error, errorType, context);
        
        // Event yayınla
        window.dispatchEvent(new CustomEvent('render-fatal-error', {
            detail: report
        }));
    }
    
    showErrorNotification(error, errorType, context) {
        // Mevcut bildirimi kaldır
        const existingNotification = document.getElementById('render-error-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Yeni bildirim oluştur
        const notification = document.createElement('div');
        notification.id = 'render-error-notification';
        notification.className = 'render-error-notification';
        notification.innerHTML = `
            <div style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: linear-gradient(135deg, #ff6b6b 0%, #ff4444 100%);
                color: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(255, 68, 68, 0.3);
                max-width: 400px;
                z-index: 10000;
                animation: slideIn 0.3s ease-out;
            ">
                <div style="display: flex; align-items: start; gap: 15px;">
                    <div style="font-size: 24px;">⚠️</div>
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 10px 0; font-size: 16px;">
                            Render Hatası
                        </h4>
                        <p style="margin: 0 0 10px 0; font-size: 14px; opacity: 0.9;">
                            ${errorType.description}
                        </p>
                        <p style="margin: 0; font-size: 12px; opacity: 0.7;">
                            ${error.message}
                        </p>
                    </div>
                    <button onclick="this.parentElement.parentElement.remove()" style="
                        background: none;
                        border: none;
                        color: white;
                        font-size: 20px;
                        cursor: pointer;
                        padding: 0;
                        opacity: 0.7;
                        transition: opacity 0.2s;
                    " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">
                        ×
                    </button>
                </div>
                ${errorType.severity === 'critical' ? `
                    <div style="
                        margin-top: 15px;
                        padding-top: 15px;
                        border-top: 1px solid rgba(255,255,255,0.2);
                    ">
                        <button onclick="location.reload()" style="
                            background: white;
                            color: #ff4444;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 5px;
                            font-weight: bold;
                            cursor: pointer;
                            font-size: 14px;
                        ">
                            Sayfayı Yenile
                        </button>
                    </div>
                ` : ''}
            </div>
            <style>
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            </style>
        `;
        
        document.body.appendChild(notification);
        
        // 10 saniye sonra otomatik kaldır
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => notification.remove(), 300);
            }
        }, 10000);
    }
    
    renderFallback(element, content, error) {
        const fallbackHTML = `
            <div class="render-error-fallback" style="
                padding: 15px;
                background: linear-gradient(135deg, #ff6b6b 0%, #ff4444 100%);
                color: white;
                border-radius: 8px;
                font-family: 'SF Mono', Monaco, monospace;
                font-size: 14px;
                position: relative;
                overflow: hidden;
            ">
                <div style="position: relative; z-index: 1;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <span style="font-size: 20px;">⚠️</span>
                        <strong>Render Hatası</strong>
                    </div>
                    <div style="
                        background: rgba(255,255,255,0.2);
                        padding: 10px;
                        border-radius: 5px;
                        margin-bottom: 10px;
                        font-family: monospace;
                        font-size: 12px;
                    ">
                        ${this.escapeHtml(content)}
                    </div>
                    <div style="font-size: 12px; opacity: 0.8;">
                        Hata: ${error.message}
                    </div>
                </div>
                <div style="
                    position: absolute;
                    top: -50%;
                    right: -50%;
                    width: 200%;
                    height: 200%;
                    background: repeating-linear-gradient(
                        45deg,
                        transparent,
                        transparent 10px,
                        rgba(255,255,255,0.1) 10px,
                        rgba(255,255,255,0.1) 20px
                    );
                    animation: moveStripes 20s linear infinite;
                "></div>
            </div>
            <style>
                @keyframes moveStripes {
                    0% { transform: translate(0, 0); }
                    100% { transform: translate(50px, 50px); }
                }
            </style>
        `;
        
        element.innerHTML = fallbackHTML;
        element.classList.add('render-error');
        element.setAttribute('data-render-error', error.message);
    }
    
    // ============= BLACKLIST YÖNETİMİ =============
    
    isBlacklisted(element) {
        const id = element.id || this.getElementIdentifier(element);
        return this.blacklist.has(id);
    }
    
    addToBlacklist(element) {
        if (!element) return;
        
        const id = element.id || this.getElementIdentifier(element);
        this.blacklist.add(id);
        
        console.warn(`⚫ Element blacklist'e eklendi: ${id}`);
    }
    
    removeFromBlacklist(element) {
        const id = element.id || this.getElementIdentifier(element);
        this.blacklist.delete(id);
    }
    
    clearBlacklist() {
        this.blacklist.clear();
        console.log('✅ Blacklist temizlendi');
    }
    
    getElementIdentifier(element) {
        // Element için benzersiz tanımlayıcı oluştur
        const tag = element.tagName.toLowerCase();
        const classes = Array.from(element.classList).join('.');
        const content = element.textContent?.substring(0, 20) || '';
        
        return `${tag}.${classes}:${content}`;
    }
    
    // ============= RAPORLAMA =============
    
    generateErrorReport(error, errorType, context) {
        return {
            timestamp: new Date().toISOString(),
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name,
                type: errorType
            },
            context: {
                element: context.element ? this.getElementInfo(context.element) : null,
                content: context.content ? context.content.substring(0, 100) + '...' : null,
                options: context.options,
                retryCount: context.retryCount
            },
            stats: this.getStats(),
            browser: {
                userAgent: navigator.userAgent,
                memory: performance.memory ? {
                    used: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + 'MB',
                    total: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + 'MB'
                } : null
            }
        };
    }
    
    getElementInfo(element) {
        return {
            id: element.id,
            className: element.className,
            tagName: element.tagName,
            isInDOM: document.body.contains(element),
            dimensions: {
                width: element.offsetWidth,
                height: element.offsetHeight
            }
        };
    }
    
    getStats() {
        return {
            ...this.stats,
            recoveryRate: this.stats.totalErrors > 0 ? 
                (this.stats.recoveredErrors / this.stats.totalErrors * 100).toFixed(2) + '%' : '0%',
            fatalRate: this.stats.totalErrors > 0 ? 
                (this.stats.fatalErrors / this.stats.totalErrors * 100).toFixed(2) + '%' : '0%',
            blacklistSize: this.blacklist.size,
            recentErrors: this.errorHistory.slice(-10).map(e => ({
                time: new Date(e.timestamp).toLocaleTimeString(),
                message: e.error.message,
                recovered: e.recovered
            }))
        };
    }
    
    // ============= GLOBAL ERROR HANDLERS =============
    
    setupGlobalErrorHandlers() {
        // Window error handler
        window.addEventListener('error', (event) => {
            if (event.error && event.error.message?.includes('render')) {
                event.preventDefault();
                this.handleError(event.error, {
                    global: true,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                });
            }
        });
        
        // Unhandled promise rejection
        window.addEventListener('unhandledrejection', (event) => {
            if (event.reason && event.reason.message?.includes('render')) {
                event.preventDefault();
                this.handleError(event.reason, {
                    global: true,
                    promise: true
                });
            }
        });
    }
    
    // ============= YARDIMCI FONKSİYONLAR =============
    
    async loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    async waitForElement(element, timeout = 3000) {
        const startTime = Date.now();
        
        while (!document.body.contains(element)) {
            if (Date.now() - startTime > timeout) {
                throw new Error('Element wait timeout');
            }
            await this.sleep(50);
        }
        
        return true;
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // ============= TEMİZLİK =============
    
    reset() {
        this.errorHistory = [];
        this.blacklist.clear();
        this.stats = {
            totalErrors: 0,
            recoveredErrors: 0,
            fatalErrors: 0,
            errorsByType: new Map()
        };
        
        console.log('✅ Error recovery sistemi sıfırlandı');
    }
}

// Singleton instance
export const renderErrorRecovery = new RenderErrorRecovery();

// Global erişim
if (typeof window !== 'undefined') {
    window.renderErrorRecovery = renderErrorRecovery;
}