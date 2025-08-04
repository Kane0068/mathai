// renderPerformanceMonitor.js - Gerçek zamanlı performans izleme ve optimizasyon

export class RenderPerformanceMonitor {
    constructor() {
        // Performans eşikleri
        this.thresholds = {
            renderTime: 100,      // ms - Normal render süresi
            slowRender: 500,      // ms - Yavaş render süresi
            criticalRender: 1000, // ms - Kritik render süresi
            memoryLimit: 50,      // MB - Bellek kullanım limiti
            fps: 30,              // Minimum FPS
            queueLimit: 50        // Maksimum kuyruk boyutu
        };
        
        // Performans verileri
        this.metrics = {
            renders: [],
            memoryUsage: [],
            fps: [],
            errors: [],
            slowRenders: [],
            cacheEfficiency: {
                hits: 0,
                misses: 0,
                evictions: 0
            }
        };
        
        // Gerçek zamanlı izleme
        this.monitoring = false;
        this.observers = new Map();
        this.performanceObserver = null;
        
        // Optimizasyon stratejileri
        this.strategies = new Map();
        this.initializeStrategies();
        
        // Uyarı ve bildirim sistemi
        this.alerts = [];
        this.alertCallbacks = new Set();
    }
    
    // ============= İZLEME SİSTEMİ =============
    
    startMonitoring() {
        if (this.monitoring) return;
        
        this.monitoring = true;
        console.log('📊 Performans izleme başlatıldı');
        
        // Performance Observer başlat
        this.setupPerformanceObserver();
        
        // Bellek izleme
        this.startMemoryMonitoring();
        
        // FPS izleme
        this.startFPSMonitoring();
        
        // Render izleme
        this.attachRenderListeners();
    }
    
    stopMonitoring() {
        this.monitoring = false;
        
        // Observer'ları temizle
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
        }
        
        // Interval'ları temizle
        this.clearAllIntervals();
        
        console.log('📊 Performans izleme durduruldu');
    }
    
    setupPerformanceObserver() {
        if (!window.PerformanceObserver) {
            console.warn('PerformanceObserver desteklenmiyor');
            return;
        }
        
        this.performanceObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.name.includes('render')) {
                    this.recordRenderPerformance(entry);
                }
            }
        });
        
        this.performanceObserver.observe({ 
            entryTypes: ['measure', 'navigation', 'resource'] 
        });
    }
    
    startMemoryMonitoring() {
        if (!performance.memory) {
            console.warn('Memory API desteklenmiyor');
            return;
        }
        
        this.memoryInterval = setInterval(() => {
            const memoryInfo = {
                timestamp: Date.now(),
                usedJSHeapSize: performance.memory.usedJSHeapSize / 1048576, // MB
                totalJSHeapSize: performance.memory.totalJSHeapSize / 1048576,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit / 1048576
            };
            
            this.metrics.memoryUsage.push(memoryInfo);
            
            // Bellek limiti kontrolü
            if (memoryInfo.usedJSHeapSize > this.thresholds.memoryLimit) {
                this.triggerAlert('memory', {
                    level: 'warning',
                    message: `Yüksek bellek kullanımı: ${memoryInfo.usedJSHeapSize.toFixed(2)}MB`,
                    data: memoryInfo
                });
            }
            
            // Son 100 kaydı tut
            if (this.metrics.memoryUsage.length > 100) {
                this.metrics.memoryUsage.shift();
            }
        }, 5000); // Her 5 saniyede bir
    }
    
    startFPSMonitoring() {
        let lastTime = performance.now();
        let frames = 0;
        let fps = 0;
        
        const measureFPS = (currentTime) => {
            frames++;
            
            if (currentTime >= lastTime + 1000) {
                fps = Math.round((frames * 1000) / (currentTime - lastTime));
                frames = 0;
                lastTime = currentTime;
                
                this.metrics.fps.push({
                    timestamp: Date.now(),
                    fps: fps
                });
                
                // Düşük FPS uyarısı
                if (fps < this.thresholds.fps) {
                    this.triggerAlert('fps', {
                        level: 'warning',
                        message: `Düşük FPS tespit edildi: ${fps}`,
                        data: { fps }
                    });
                }
                
                // Son 60 kaydı tut
                if (this.metrics.fps.length > 60) {
                    this.metrics.fps.shift();
                }
            }
            
            if (this.monitoring) {
                requestAnimationFrame(measureFPS);
            }
        };
        
        requestAnimationFrame(measureFPS);
    }
    
    attachRenderListeners() {
        // UnifiedRenderController event'lerini dinle
        if (window.unifiedRenderController) {
            window.unifiedRenderController.on('success', (e) => {
                this.recordRenderMetric({
                    type: 'success',
                    duration: e.detail.renderTime,
                    elementId: e.detail.elementId,
                    timestamp: e.detail.timestamp
                });
            });
            
            window.unifiedRenderController.on('error', (e) => {
                this.recordRenderMetric({
                    type: 'error',
                    error: e.detail.error,
                    elementId: e.detail.elementId,
                    timestamp: e.detail.timestamp
                });
            });
        }
    }
    
    // ============= METRİK KAYIT =============
    
    recordRenderMetric(metric) {
        this.metrics.renders.push(metric);
        
        // Performans analizi
        if (metric.type === 'success' && metric.duration) {
            if (metric.duration > this.thresholds.criticalRender) {
                this.handleCriticalRender(metric);
            } else if (metric.duration > this.thresholds.slowRender) {
                this.handleSlowRender(metric);
            }
        } else if (metric.type === 'error') {
            this.handleRenderError(metric);
        }
        
        // Son 1000 kaydı tut
        if (this.metrics.renders.length > 1000) {
            this.metrics.renders.shift();
        }
    }
    
    recordRenderPerformance(entry) {
        const metric = {
            name: entry.name,
            startTime: entry.startTime,
            duration: entry.duration,
            timestamp: Date.now()
        };
        
        this.recordRenderMetric(metric);
    }
    
    // ============= PERFORMANS ANALİZİ =============
    
    handleSlowRender(metric) {
        this.metrics.slowRenders.push(metric);
        
        // Pattern analizi
        const recentSlowRenders = this.getRecentSlowRenders(60000); // Son 1 dakika
        
        if (recentSlowRenders.length > 5) {
            this.triggerAlert('performance', {
                level: 'warning',
                message: `Son 1 dakikada ${recentSlowRenders.length} yavaş render tespit edildi`,
                data: { slowRenders: recentSlowRenders }
            });
            
            // Otomatik optimizasyon öner
            this.suggestOptimizations(recentSlowRenders);
        }
    }
    
    handleCriticalRender(metric) {
        this.triggerAlert('performance', {
            level: 'critical',
            message: `Kritik yavaş render: ${metric.duration}ms (${metric.elementId})`,
            data: metric
        });
        
        // Acil optimizasyon uygula
        this.applyEmergencyOptimization();
    }
    
    handleRenderError(metric) {
        this.metrics.errors.push(metric);
        
        // Hata pattern'i analizi
        const recentErrors = this.getRecentErrors(60000);
        
        if (recentErrors.length > 10) {
            this.triggerAlert('error', {
                level: 'critical',
                message: `Yüksek hata oranı: Son 1 dakikada ${recentErrors.length} hata`,
                data: { errors: recentErrors }
            });
        }
    }
    
    // ============= OPTİMİZASYON STRATEJİLERİ =============
    
    initializeStrategies() {
        // 1. Cache Optimizasyonu
        this.strategies.set('cache', {
            name: 'Agresif Cache Kullanımı',
            apply: () => {
                if (window.unifiedRenderController) {
                    // Cache boyutunu artır
                    console.log('📦 Cache optimizasyonu uygulanıyor');
                    // Implementation
                }
            }
        });
        
        // 2. Batch Rendering
        this.strategies.set('batch', {
            name: 'Batch Rendering Optimizasyonu',
            apply: () => {
                console.log('🎯 Batch rendering optimizasyonu uygulanıyor');
                // Batch boyutunu optimize et
            }
        });
        
        // 3. Lazy Loading
        this.strategies.set('lazy', {
            name: 'Agresif Lazy Loading',
            apply: () => {
                console.log('😴 Lazy loading optimizasyonu uygulanıyor');
                // Viewport dışındaki render'ları ertele
            }
        });
        
        // 4. Quality Degradation
        this.strategies.set('quality', {
            name: 'Kalite Düşürme',
            apply: () => {
                console.log('📉 Render kalitesi düşürülüyor');
                // Karmaşık render'ları basitleştir
            }
        });
    }
    
    suggestOptimizations(slowRenders) {
        const suggestions = [];
        
        // Pattern analizi
        const avgDuration = slowRenders.reduce((sum, r) => sum + r.duration, 0) / slowRenders.length;
        
        if (avgDuration > 800) {
            suggestions.push('quality'); // Çok yavaş - kalite düşür
        }
        
        if (slowRenders.length > 10) {
            suggestions.push('batch'); // Çok fazla render - batch kullan
        }
        
        if (this.metrics.memoryUsage.length > 0) {
            const lastMemory = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
            if (lastMemory.usedJSHeapSize > 40) {
                suggestions.push('cache'); // Yüksek bellek - cache optimize et
            }
        }
        
        // Önerileri uygula
        suggestions.forEach(strategy => {
            const opt = this.strategies.get(strategy);
            if (opt) {
                console.log(`💡 Öneri: ${opt.name}`);
                opt.apply();
            }
        });
    }
    
    applyEmergencyOptimization() {
        console.warn('🚨 ACİL OPTİMİZASYON MODU AKTİF');
        
        // 1. Tüm bekleyen render'ları iptal et
        if (window.unifiedRenderController) {
            window.unifiedRenderController.clearQueue();
        }
        
        // 2. Cache'i temizle
        if (window.unifiedRenderController) {
            window.unifiedRenderController.clearCache();
        }
        
        // 3. Basitleştirilmiş render moduna geç
        this.strategies.get('quality').apply();
        
        // 4. Garbage collection tetikle (mümkünse)
        if (window.gc) {
            window.gc();
        }
    }
    
    // ============= ANALİZ FONKSİYONLARI =============
    
    getRecentSlowRenders(timeWindow = 60000) {
        const cutoff = Date.now() - timeWindow;
        return this.metrics.slowRenders.filter(r => r.timestamp > cutoff);
    }
    
    getRecentErrors(timeWindow = 60000) {
        const cutoff = Date.now() - timeWindow;
        return this.metrics.errors.filter(e => e.timestamp > cutoff);
    }
    
    getPerformanceReport() {
        const totalRenders = this.metrics.renders.length;
        const successfulRenders = this.metrics.renders.filter(r => r.type === 'success').length;
        const failedRenders = this.metrics.renders.filter(r => r.type === 'error').length;
        
        const durations = this.metrics.renders
            .filter(r => r.type === 'success' && r.duration)
            .map(r => r.duration);
        
        const avgDuration = durations.length > 0 ? 
            durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;
        
        const p95Duration = this.calculatePercentile(durations, 95);
        const p99Duration = this.calculatePercentile(durations, 99);
        
        return {
            summary: {
                totalRenders,
                successfulRenders,
                failedRenders,
                successRate: totalRenders > 0 ? (successfulRenders / totalRenders) * 100 : 0,
                avgDuration: avgDuration.toFixed(2),
                p95Duration: p95Duration.toFixed(2),
                p99Duration: p99Duration.toFixed(2)
            },
            memory: {
                current: this.getCurrentMemoryUsage(),
                peak: this.getPeakMemoryUsage(),
                average: this.getAverageMemoryUsage()
            },
            fps: {
                current: this.getCurrentFPS(),
                average: this.getAverageFPS(),
                minimum: this.getMinimumFPS()
            },
            cache: this.metrics.cacheEfficiency,
            alerts: this.alerts.slice(-10) // Son 10 uyarı
        };
    }
    
    calculatePercentile(values, percentile) {
        if (values.length === 0) return 0;
        
        const sorted = values.slice().sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[index] || 0;
    }
    
    getCurrentMemoryUsage() {
        if (this.metrics.memoryUsage.length === 0) return 0;
        return this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1].usedJSHeapSize;
    }
    
    getPeakMemoryUsage() {
        if (this.metrics.memoryUsage.length === 0) return 0;
        return Math.max(...this.metrics.memoryUsage.map(m => m.usedJSHeapSize));
    }
    
    getAverageMemoryUsage() {
        if (this.metrics.memoryUsage.length === 0) return 0;
        const sum = this.metrics.memoryUsage.reduce((acc, m) => acc + m.usedJSHeapSize, 0);
        return sum / this.metrics.memoryUsage.length;
    }
    
    getCurrentFPS() {
        if (this.metrics.fps.length === 0) return 0;
        return this.metrics.fps[this.metrics.fps.length - 1].fps;
    }
    
    getAverageFPS() {
        if (this.metrics.fps.length === 0) return 0;
        const sum = this.metrics.fps.reduce((acc, f) => acc + f.fps, 0);
        return Math.round(sum / this.metrics.fps.length);
    }
    
    getMinimumFPS() {
        if (this.metrics.fps.length === 0) return 0;
        return Math.min(...this.metrics.fps.map(f => f.fps));
    }
    
    // ============= UYARI SİSTEMİ =============
    
    triggerAlert(type, alert) {
        const fullAlert = {
            id: Date.now(),
            type,
            timestamp: new Date().toISOString(),
            ...alert
        };
        
        this.alerts.push(fullAlert);
        
        // Son 100 uyarıyı tut
        if (this.alerts.length > 100) {
            this.alerts.shift();
        }
        
        // Callback'leri çağır
        this.alertCallbacks.forEach(callback => {
            try {
                callback(fullAlert);
            } catch (error) {
                console.error('Alert callback hatası:', error);
            }
        });
        
        // Konsola log
        const logMethod = alert.level === 'critical' ? 'error' : 'warn';
        console[logMethod](`[${type.toUpperCase()}] ${alert.message}`, alert.data);
    }
    
    onAlert(callback) {
        this.alertCallbacks.add(callback);
        return () => this.alertCallbacks.delete(callback);
    }
    
    // ============= VİZÜALİZASYON =============
    
    createDashboard(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = `
            <div class="performance-dashboard" style="
                background: #1a1a1a;
                color: #fff;
                padding: 20px;
                border-radius: 10px;
                font-family: 'SF Mono', Monaco, monospace;
            ">
                <h2 style="margin: 0 0 20px 0; color: #00ff00;">🚀 Render Performance Monitor</h2>
                
                <div class="metrics-grid" style="
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    margin-bottom: 20px;
                ">
                    <div class="metric-card" id="perf-total-renders">
                        <h3>Total Renders</h3>
                        <div class="metric-value">-</div>
                    </div>
                    <div class="metric-card" id="perf-success-rate">
                        <h3>Success Rate</h3>
                        <div class="metric-value">-</div>
                    </div>
                    <div class="metric-card" id="perf-avg-duration">
                        <h3>Avg Duration</h3>
                        <div class="metric-value">-</div>
                    </div>
                    <div class="metric-card" id="perf-memory">
                        <h3>Memory Usage</h3>
                        <div class="metric-value">-</div>
                    </div>
                    <div class="metric-card" id="perf-fps">
                        <h3>Current FPS</h3>
                        <div class="metric-value">-</div>
                    </div>
                    <div class="metric-card" id="perf-cache-hit">
                        <h3>Cache Hit Rate</h3>
                        <div class="metric-value">-</div>
                    </div>
                </div>
                
                <div class="alerts-section" id="perf-alerts" style="
                    max-height: 200px;
                    overflow-y: auto;
                    background: #2a2a2a;
                    padding: 10px;
                    border-radius: 5px;
                ">
                    <h3 style="margin: 0 0 10px 0; color: #ffff00;">⚠️ Alerts</h3>
                    <div class="alerts-list"></div>
                </div>
                
                <style>
                    .metric-card {
                        background: #2a2a2a;
                        padding: 15px;
                        border-radius: 8px;
                        border: 1px solid #3a3a3a;
                    }
                    .metric-card h3 {
                        margin: 0 0 10px 0;
                        font-size: 14px;
                        color: #888;
                        text-transform: uppercase;
                    }
                    .metric-value {
                        font-size: 24px;
                        font-weight: bold;
                        color: #00ff00;
                    }
                    .alert-item {
                        padding: 8px;
                        margin-bottom: 5px;
                        border-radius: 4px;
                        font-size: 12px;
                    }
                    .alert-warning {
                        background: #665500;
                        color: #ffcc00;
                    }
                    .alert-critical {
                        background: #660000;
                        color: #ff3333;
                    }
                </style>
            </div>
        `;
        
        // Dashboard güncellemelerini başlat
        this.startDashboardUpdates(container);
    }
    
    startDashboardUpdates(container) {
        const updateDashboard = () => {
            const report = this.getPerformanceReport();
            
            // Metrikleri güncelle
            this.updateMetricCard(container, 'perf-total-renders', report.summary.totalRenders);
            this.updateMetricCard(container, 'perf-success-rate', `${report.summary.successRate.toFixed(1)}%`);
            this.updateMetricCard(container, 'perf-avg-duration', `${report.summary.avgDuration}ms`);
            this.updateMetricCard(container, 'perf-memory', `${report.memory.current.toFixed(1)}MB`);
            this.updateMetricCard(container, 'perf-fps', report.fps.current);
            
            const cacheHitRate = report.cache.hits + report.cache.misses > 0 ?
                (report.cache.hits / (report.cache.hits + report.cache.misses) * 100).toFixed(1) : 0;
            this.updateMetricCard(container, 'perf-cache-hit', `${cacheHitRate}%`);
            
            // Uyarıları güncelle
            this.updateAlerts(container, report.alerts);
        };
        
        // İlk güncelleme
        updateDashboard();
        
        // Periyodik güncelleme
        this.dashboardInterval = setInterval(updateDashboard, 1000);
    }
    
    updateMetricCard(container, id, value) {
        const card = container.querySelector(`#${id} .metric-value`);
        if (card) {
            card.textContent = value;
        }
    }
    
    updateAlerts(container, alerts) {
        const alertsList = container.querySelector('.alerts-list');
        if (!alertsList) return;
        
        alertsList.innerHTML = alerts.slice(-5).reverse().map(alert => `
            <div class="alert-item alert-${alert.level}">
                <strong>${new Date(alert.timestamp).toLocaleTimeString()}</strong>
                ${alert.message}
            </div>
        `).join('');
    }
    
    // ============= TEMİZLİK =============
    
    clearAllIntervals() {
        if (this.memoryInterval) clearInterval(this.memoryInterval);
        if (this.dashboardInterval) clearInterval(this.dashboardInterval);
    }
    
    reset() {
        this.stopMonitoring();
        
        // Metrikleri sıfırla
        this.metrics = {
            renders: [],
            memoryUsage: [],
            fps: [],
            errors: [],
            slowRenders: [],
            cacheEfficiency: {
                hits: 0,
                misses: 0,
                evictions: 0
            }
        };
        
        // Uyarıları temizle
        this.alerts = [];
        
        console.log('✅ Performance monitor sıfırlandı');
    }
}

// Singleton instance
export const renderPerformanceMonitor = new RenderPerformanceMonitor();

// Global erişim
if (typeof window !== 'undefined') {
    window.renderPerformanceMonitor = renderPerformanceMonitor;
}