// globalRenderHelpers.js - Yeni dosya
import { globalRenderManager } from './globalRenderManager.js';
import { renderOptimizer } from './performanceOptimizer.js';
import { safeRenderWrapper } from './safeRenderWrapper.js';

// Yardımcı fonksiyonlar
export const RenderHelpers = {
    // Container'ı güvenli render et
    async renderContainerSafe(container, options = {}) {
        if (!container) return false;
        
        try {
            // Performans optimizasyonu
            if (options.lazyLoad) {
                renderOptimizer.setupLazyLoading(container);
                return true;
            }
            
            // Normal render
            return await globalRenderManager.renderContainer(container, options);
            
        } catch (error) {
            console.error('Container render hatası:', error);
            return false;
        }
    },
    
    // Tek elementi güvenli render et
    async renderElementSafe(element, content, options = {}) {
        return await safeRenderWrapper.safeRender(element, content, {
            ...options,
            onError: (error, el, cont) => {
                console.error('Element render hatası:', error);
                console.log('Element:', el);
                console.log('İçerik:', cont);
            },
            onSuccess: (el, cont) => {
                console.log('✅ Başarılı render:', el.id || el.className);
            }
        });
    },
    
    // Batch render için queue
    createRenderQueue() {
        const queue = [];
        
        return {
            add(element, content, options = {}) {
                queue.push({ element, content, options });
            },
            
            async processAll() {
                console.log(`📦 ${queue.length} render işlemi başlatılıyor`);
                
                const results = [];
                const batchSize = 3;
                
                for (let i = 0; i < queue.length; i += batchSize) {
                    const batch = queue.slice(i, i + batchSize);
                    
                    const batchResults = await Promise.all(
                        batch.map(item => 
                            this.renderElementSafe(item.element, item.content, item.options)
                        )
                    );
                    
                    results.push(...batchResults);
                    
                    // CPU'ya nefes aldır
                    if (i + batchSize < queue.length) {
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                }
                
                return results;
            },
            
            clear() {
                queue.length = 0;
            }
        };
    },
    
    // Debug modu
    enableDebugMode() {
        window.addEventListener('render-start', (e) => {
            console.log('🎯 Render başladı:', e.detail);
        });
        
        window.addEventListener('render-complete', (e) => {
            console.log('✅ Render tamamlandı:', e.detail);
        });
        
        window.addEventListener('render-error', (e) => {
            console.error('❌ Render hatası:', e.detail);
        });
    }
};

// Global erişim
window.RenderHelpers = RenderHelpers;