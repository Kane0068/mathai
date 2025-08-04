// =================================================================================
//  Gelişmiş Karışık İçerik Renderer - mixedContentRenderer.js
//  Metin + LaTeX karışık içeriklerin doğru render edilmesi için özel çözüm
// =================================================================================

export class MixedContentRenderer {
    constructor() {
        this.segmentCache = new Map();
        this.renderCache = new Map();
        this.turkishCharMap = {
            'ğ': 'g', 'ü': 'u', 'ş': 's', 'ı': 'i', 'ö': 'o', 'ç': 'c',
            'Ğ': 'G', 'Ü': 'U', 'Ş': 'S', 'İ': 'I', 'Ö': 'O', 'Ç': 'C'
        };
        
        // Render metrikleri
        this.metrics = {
            totalRenders: 0,
            successfulRenders: 0,
            mixedContentRenders: 0,
            cacheHits: 0,
            averageRenderTime: 0
        };
    }

    /**
     * Ana render fonksiyonu - karışık içerikleri analiz eder ve doğru şekilde render eder
     * @param {HTMLElement} element - Render edilecek element
     * @param {string} content - Render edilecek içerik
     * @param {Object} options - Render seçenekleri
     * @returns {Promise<boolean>} - Render başarı durumu
     */
    async renderMixedContent(element, content, options = {}) {
        const startTime = performance.now();
        this.metrics.totalRenders++;

        try {
            // Cache kontrolü
            const cacheKey = this.generateCacheKey(content, options);
            if (this.renderCache.has(cacheKey)) {
                element.innerHTML = this.renderCache.get(cacheKey);
                this.metrics.cacheHits++;
                return true;
            }

            console.log('🔄 Karışık içerik render ediliyor:', content);

            // İçerik analizi ve segmentasyonu
            const segments = this.segmentContent(content);
            console.log('📊 İçerik segmentleri:', segments);

            // Her segmenti render et
            const renderedSegments = await this.renderSegments(segments, options);
            
            // Sonuçları birleştir
            const finalHtml = this.combineRenderedSegments(renderedSegments);
            
            // Element'e uygula
            element.innerHTML = finalHtml;
            element.classList.add('mixed-content-rendered');
            
            // Cache'e kaydet
            this.renderCache.set(cacheKey, finalHtml);
            
            // Metrikleri güncelle
            this.metrics.successfulRenders++;
            this.metrics.mixedContentRenders++;
            const renderTime = performance.now() - startTime;
            this.updateAverageRenderTime(renderTime);
            
            console.log('✅ Karışık içerik başarıyla render edildi');
            return true;

        } catch (error) {
            console.error('❌ Karışık içerik render hatası:', error);
            
            // Fallback - orijinal içeriği göster
            element.innerHTML = this.escapeHtml(content);
            element.classList.add('render-fallback');
            
            return false;
        }
    }

    /**
     * İçeriği metin ve matematik segmentlerine ayırır
     * @param {string} content - Ayrılacak içerik
     * @returns {Array} - Segment listesi
     */
    segmentContent(content) {
        if (this.segmentCache.has(content)) {
            return this.segmentCache.get(content);
        }

        const segments = [];
        let lastIndex = 0;
        
        // Inline matematik $...$ pattern'leri bul
        const inlineMathRegex = /\$(?!\$)([^$]+)\$/g;
        // Display matematik $$...$$ pattern'leri bul  
        const displayMathRegex = /\$\$([^$]+)\$\$/g;
        // LaTeX komutları bul
        const latexCommandRegex = /\\((?:frac|sqrt|sum|int|lim|sin|cos|tan|log|ln|exp|alpha|beta|gamma|delta|theta|pi|sigma|infty|text|left|right|begin|end)\s*(?:\{[^}]*\}|\([^)]*\))*)/g;

        // Tüm matematiksel bölümleri bul
        const mathMatches = [];
        
        // Display matematik (öncelikli)
        let match;
        while ((match = displayMathRegex.exec(content)) !== null) {
            mathMatches.push({
                start: match.index,
                end: match.index + match[0].length,
                content: match[1],
                type: 'display_math',
                original: match[0]
            });
        }
        
        // Inline matematik (display matematik alanlarını hariç tut)
        displayMathRegex.lastIndex = 0; // Reset regex
        while ((match = inlineMathRegex.exec(content)) !== null) {
            // Bu inline matematik display matematik içinde mi?
            const isInsideDisplay = mathMatches.some(dm => 
                match.index >= dm.start && match.index + match[0].length <= dm.end
            );
            
            if (!isInsideDisplay) {
                mathMatches.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    content: match[1],
                    type: 'inline_math',
                    original: match[0]
                });
            }
        }
        
        // LaTeX komutları (diğer matematik alanlarının dışında)
        latexCommandRegex.lastIndex = 0;
        while ((match = latexCommandRegex.exec(content)) !== null) {
            const isInsideOtherMath = mathMatches.some(mm => 
                match.index >= mm.start && match.index + match[0].length <= mm.end
            );
            
            if (!isInsideOtherMath) {
                mathMatches.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    content: match[0],
                    type: 'latex_command',
                    original: match[0]
                });
            }
        }
        
        // Matematik bölümlerini sırala
        mathMatches.sort((a, b) => a.start - b.start);
        
        // Segmentleri oluştur
        mathMatches.forEach(mathMatch => {
            // Matematik öncesi metin
            if (lastIndex < mathMatch.start) {
                const textContent = content.substring(lastIndex, mathMatch.start);
                if (textContent.trim()) {
                    segments.push({
                        type: 'text',
                        content: textContent,
                        original: textContent
                    });
                }
            }
            
            // Matematik segmenti
            segments.push(mathMatch);
            lastIndex = mathMatch.end;
        });
        
        // Son metin kısmı
        if (lastIndex < content.length) {
            const textContent = content.substring(lastIndex);
            if (textContent.trim()) {
                segments.push({
                    type: 'text',
                    content: textContent,
                    original: textContent
                });
            }
        }
        
        // Eğer hiç matematik bulunamadıysa, tüm içeriği metin olarak işle
        if (segments.length === 0) {
            segments.push({
                type: 'text',
                content: content,
                original: content
            });
        }
        
        this.segmentCache.set(content, segments);
        return segments;
    }

    /**
     * Her segmenti uygun renderer ile render eder
     * @param {Array} segments - Render edilecek segment listesi
     * @param {Object} options - Render seçenekleri
     * @returns {Promise<Array>} - Render edilmiş segment listesi
     */
    async renderSegments(segments, options) {
        const renderedSegments = [];
        
        for (const segment of segments) {
            try {
                let renderedContent;
                
                switch (segment.type) {
                    case 'text':
                        renderedContent = await this.renderTextSegment(segment.content, options);
                        break;
                        
                    case 'inline_math':
                        renderedContent = await this.renderMathSegment(segment.content, false, options);
                        break;
                        
                    case 'display_math':
                        renderedContent = await this.renderMathSegment(segment.content, true, options);
                        break;
                        
                    case 'latex_command':
                        renderedContent = await this.renderLatexCommand(segment.content, options);
                        break;
                        
                    default:
                        renderedContent = this.escapeHtml(segment.content);
                }
                
                renderedSegments.push({
                    type: segment.type,
                    original: segment.original,
                    rendered: renderedContent,
                    success: true
                });
                
            } catch (error) {
                console.warn(`⚠️ Segment render hatası (${segment.type}):`, error);
                
                // Fallback - orijinal içeriği escape et
                renderedSegments.push({
                    type: segment.type,
                    original: segment.original,
                    rendered: this.escapeHtml(segment.original),
                    success: false,
                    error: error.message
                });
            }
        }
        
        return renderedSegments;
    }

    /**
     * Metin segmentini render eder (Türkçe karakter desteği ile)
     * @param {string} textContent - Metin içeriği
     * @param {Object} options - Render seçenekleri
     * @returns {Promise<string>} - Render edilmiş HTML
     */
    async renderTextSegment(textContent, options) {
        // Türkçe karakterleri preserve et
        let processedText = textContent;
        
        // HTML escape
        processedText = this.escapeHtml(processedText);
        
        // Türkçe karakterlere özel stil uygula
        if (this.hasTurkishChars(textContent)) {
            processedText = `<span class="turkish-text">${processedText}</span>`;
        }
        
        // Boşlukları preserve et
        processedText = processedText.replace(/\s+/g, ' ');
        
        return processedText;
    }

    /**
     * Matematik segmentini render eder
     * @param {string} mathContent - Matematik içeriği
     * @param {boolean} displayMode - Display mode (true) veya inline mode (false)
     * @param {Object} options - Render seçenekleri
     * @returns {Promise<string>} - Render edilmiş HTML
     */
    async renderMathSegment(mathContent, displayMode, options) {
        // Matematik içeriğini temizle
        let cleanContent = mathContent.trim();
        
        // Yaygın LaTeX hatalarını düzelt
        cleanContent = this.fixCommonLatexErrors(cleanContent);
        
        // Render element'i oluştur
        const tempElement = document.createElement('span');
        tempElement.style.display = displayMode ? 'block' : 'inline';
        
        try {
            // KaTeX ile render et (hızlı)
            if (window.katex) {
                katex.render(cleanContent, tempElement, {
                    displayMode: displayMode,
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
                
                return tempElement.innerHTML;
            }
            
            // Fallback: MathJax
            if (window.MathJax?.typesetPromise) {
                const mathDelimited = displayMode ? 
                    `\\[${cleanContent}\\]` : 
                    `\\(${cleanContent}\\)`;
                
                tempElement.innerHTML = mathDelimited;
                await MathJax.typesetPromise([tempElement]);
                
                return tempElement.innerHTML;
            }
            
            // Son fallback: orijinal içerik
            return displayMode ? 
                `<div class="math-fallback display-math">$$${cleanContent}$$</div>` :
                `<span class="math-fallback inline-math">$${cleanContent}$</span>`;
                
        } catch (error) {
            console.warn('Matematik render hatası:', error);
            return displayMode ? 
                `<div class="math-error display-math">$$${cleanContent}$$</div>` :
                `<span class="math-error inline-math">$${cleanContent}$</span>`;
        }
    }

    /**
     * LaTeX komutunu render eder
     * @param {string} latexContent - LaTeX komut içeriği
     * @param {Object} options - Render seçenekleri
     * @returns {Promise<string>} - Render edilmiş HTML
     */
    async renderLatexCommand(latexContent, options) {
        // LaTeX komutunu matematik segmenti olarak render et
        return await this.renderMathSegment(latexContent, false, options);
    }

    /**
     * Render edilmiş segmentleri birleştirir
     * @param {Array} renderedSegments - Render edilmiş segment listesi
     * @returns {string} - Birleştirilmiş HTML
     */
    combineRenderedSegments(renderedSegments) {
        return renderedSegments
            .map(segment => segment.rendered)
            .join('');
    }

    /**
     * Yaygın LaTeX hatalarını düzeltir
     * @param {string} content - Düzeltilecek içerik
     * @returns {string} - Düzeltilmiş içerik
     */
    fixCommonLatexErrors(content) {
        let fixed = content;
        
        // Eksik süslü parantezleri tamamla
        const openBraces = (fixed.match(/\{/g) || []).length;
        const closeBraces = (fixed.match(/\}/g) || []).length;
        if (openBraces > closeBraces) {
            fixed += '}'.repeat(openBraces - closeBraces);
        }
        
        // Eksik parantezleri tamamla
        const openParens = (fixed.match(/\(/g) || []).length;
        const closeParens = (fixed.match(/\)/g) || []).length;
        if (openParens > closeParens) {
            fixed += ')'.repeat(openParens - closeParens);
        }
        
        // Bilinmeyen komutları temizle veya düzelt
        const knownCommands = [
            'frac', 'sqrt', 'sum', 'int', 'lim', 'sin', 'cos', 'tan', 'log', 'ln', 
            'exp', 'alpha', 'beta', 'gamma', 'delta', 'theta', 'pi', 'sigma', 'infty',
            'text', 'left', 'right', 'begin', 'end', 'cdot', 'times', 'div'
        ];
        
        fixed = fixed.replace(/\\([a-zA-Z]+)/g, (match, command) => {
            if (knownCommands.includes(command)) {
                return match;
            } else {
                console.warn(`Bilinmeyen LaTeX komutu: \\${command}`);
                return `\\text{${command}}`;
            }
        });
        
        return fixed;
    }

    /**
     * Yardımcı fonksiyonlar
     */
    
    generateCacheKey(content, options) {
        return `${this.hashString(content)}-${this.hashString(JSON.stringify(options))}`;
    }
    
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    hasTurkishChars(text) {
        return /[ğüşıöçĞÜŞİÖÇ]/.test(text);
    }
    
    updateAverageRenderTime(newTime) {
        this.metrics.averageRenderTime = 
            (this.metrics.averageRenderTime * (this.metrics.totalRenders - 1) + newTime) / 
            this.metrics.totalRenders;
    }
    
    /**
     * Debug ve istatistik fonksiyonları
     */
    
    getMetrics() {
        return {
            ...this.metrics,
            successRate: (this.metrics.successfulRenders / this.metrics.totalRenders * 100).toFixed(2) + '%',
            cacheHitRate: (this.metrics.cacheHits / this.metrics.totalRenders * 100).toFixed(2) + '%'
        };
    }
    
    clearCache() {
        this.segmentCache.clear();
        this.renderCache.clear();
        console.log('🧹 Karışık içerik cache temizlendi');
    }
    
    debugSegmentation(content) {
        const segments = this.segmentContent(content);
        console.log('🔍 İçerik segmentasyon debug:', {
            originalContent: content,
            segments: segments,
            segmentCount: segments.length,
            mathSegments: segments.filter(s => s.type !== 'text').length,
            textSegments: segments.filter(s => s.type === 'text').length
        });
        return segments;
    }
}

// Global instance oluştur
export const mixedContentRenderer = new MixedContentRenderer();

// Auto-init
if (typeof window !== 'undefined') {
    window.mixedContentRenderer = mixedContentRenderer;
    console.log('✅ Karışık İçerik Renderer hazır');
}