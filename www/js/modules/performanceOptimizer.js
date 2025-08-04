// performanceOptimizer.js - Yeni dosya
export class RenderPerformanceOptimizer {
    constructor() {
        this.observer = null;
        this.pendingElements = new WeakMap();
        this.renderThrottle = null;
    }
    
    // Lazy loading için Intersection Observer
    setupLazyLoading(container) {
        if (this.observer) {
            this.observer.disconnect();
        }
        
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.renderVisibleElement(entry.target);
                }
            });
        }, {
            rootMargin: '50px',
            threshold: 0.01
        });
        
        // Tüm render edilecek elementleri gözlemle
        const elements = container.querySelectorAll('.smart-content, .latex-content, .option-text');
        elements.forEach(el => {
            if (!el.classList.contains('math-rendered')) {
                this.observer.observe(el);
                el.classList.add('render-pending');
            }
        });
    }
    
    // Görünür elementi render et
    async renderVisibleElement(element) {
        if (this.pendingElements.has(element)) return;
        
        this.pendingElements.set(element, true);
        this.observer.unobserve(element);
        
        const content = element.getAttribute('data-content') || 
                       element.getAttribute('data-latex') || 
                       element.textContent;
        
        if (content) {
            const isDisplay = element.classList.contains('latex-content');
            await globalRenderManager.renderElement(element, content, { displayMode: isDisplay });
        }
        
        element.classList.remove('render-pending');
        this.pendingElements.delete(element);
    }
    
    // Render işlemlerini throttle et
    throttleRender(callback, delay = 100) {
        if (this.renderThrottle) {
            clearTimeout(this.renderThrottle);
        }
        
        this.renderThrottle = setTimeout(() => {
            callback();
            this.renderThrottle = null;
        }, delay);
    }
    
    // Bellek temizleme
    cleanup() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.pendingElements = new WeakMap();
        if (this.renderThrottle) {
            clearTimeout(this.renderThrottle);
            this.renderThrottle = null;
        }
    }
}

// Singleton instance
export const renderOptimizer = new RenderPerformanceOptimizer();