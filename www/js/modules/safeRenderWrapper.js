// safeRenderWrapper.js - Yeni dosya
export class SafeRenderWrapper {
    constructor() {
        this.fallbackStrategies = {
            'simple': this.simpleFallback.bind(this),
            'html': this.htmlFallback.bind(this),
            'image': this.imageFallback.bind(this)
        };
    }
    
    // Güvenli render wrapper
    async safeRender(element, content, options = {}) {
        const { 
            fallbackStrategy = 'simple',
            maxAttempts = 2,
            onError = null,
            onSuccess = null
        } = options;
        
        let lastError = null;
        
        // Render denemelerini yap
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const result = await globalRenderManager.renderElement(element, content, options);
                
                if (result) {
                    if (onSuccess) onSuccess(element, content);
                    return true;
                }
            } catch (error) {
                lastError = error;
                console.warn(`Render denemesi ${attempt} başarısız:`, error);
            }
            
            // Kısa bekleme
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 200 * attempt));
            }
        }
        
        // Fallback stratejisi uygula
        console.error('Tüm render denemeleri başarısız, fallback uygulanıyor');
        
        if (onError) onError(lastError, element, content);
        
        return this.applyFallback(element, content, fallbackStrategy);
    }
    
    // Fallback uygula
    applyFallback(element, content, strategy) {
        const fallbackFn = this.fallbackStrategies[strategy] || this.simpleFallback;
        return fallbackFn(element, content);
    }
    
    // Basit metin fallback
    simpleFallback(element, content) {
        element.textContent = content;
        element.classList.add('render-fallback', 'text-fallback');
        element.title = 'Matematik ifadesi görüntülenemiyor';
        return false;
    }
    
    // HTML fallback
    htmlFallback(element, content) {
        // LaTeX'i basit HTML'e dönüştür
        let html = content;
        
        // Basit dönüşümler
        html = html.replace(/\^(\d+)/g, '<sup>$1</sup>');
        html = html.replace(/_(\d+)/g, '<sub>$1</sub>');
        html = html.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '<span class="frac">$1/$2</span>');
        html = html.replace(/\\sqrt\{([^}]+)\}/g, '√<span class="sqrt">$1</span>');
        
        element.innerHTML = html;
        element.classList.add('render-fallback', 'html-fallback');
        return false;
    }
    
    // Resim fallback (gelecekte eklenebilir)
    imageFallback(element, content) {
        // LaTeX'i sunucu tarafında render edip resim olarak göster
        element.innerHTML = '<span class="loading-math">📐 Yükleniyor...</span>';
        element.classList.add('render-fallback', 'image-fallback');
        
        // TODO: Sunucu tarafı render servisi eklenebilir
        
        return false;
    }
}

// Singleton instance
export const safeRenderWrapper = new SafeRenderWrapper();