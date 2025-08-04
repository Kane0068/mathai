// =================================================================================
//  Karışık İçerik Renderer - mixedContentRenderer.js
//  Metin ve LaTeX karışımı içerikleri akıllıca parse eder ve render eder
// =================================================================================

// YENİ: Geliştirilmiş LaTeX pattern tanımlama
const LATEX_PATTERNS = {
    // Inline matematik: $...$
    inlineMath: /\$([^\$]+)\$/g,
    
    // Display matematik: $$...$$ veya \[...\]
    displayMath: /\$\$([^\$]+)\$\$|\\\[([^\]]+)\\\]/g,
    
    // LaTeX komutları - GENİŞLETİLDİ
    commands: /\\(?:log|ln|sin|cos|tan|cot|sec|csc|arcsin|arccos|arctan|sinh|cosh|tanh|sqrt|frac|int|sum|prod|lim|min|max|gcd|lcm|det|dim|ker|deg|exp|lg|arg|hom|inf|sup|lim|liminf|limsup|Pr)(?:_\{[^}]*\})?(?:\^\{[^}]*\})?(?:\s*\{[^}]*\})?(?:\s*\([^)]*\))?/g,
    
    // Üst ve alt indis - GELİŞTİRİLDİ
    superSubscript: /(?:[a-zA-Z0-9]+)?(?:_\{[^}]+\}|\^\{[^}]+\}|_[a-zA-Z0-9]|\^[a-zA-Z0-9])+/g,
    
    // Yunan harfleri
    greekLetters: /\\(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega)/g,
    
    // Matematiksel operatörler
    operators: /\\(?:times|div|pm|mp|cdot|ast|star|circ|bullet|oplus|ominus|otimes|oslash|odot|leq|geq|neq|approx|equiv|sim|simeq|propto|parallel|perp|subset|supset|subseteq|supseteq|in|ni|cup|cap|wedge|vee)/g,
    
    // Parantezler ve sınırlayıcılar
    delimiters: /\\(?:left|right|big|Big|bigg|Bigg)?\s*[\(\)\[\]\{\}|]/g,
    
    // Matrisler ve diziler
    environments: /\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g,
    
    // Kesirler - GELİŞTİRİLDİ
    fractions: /\\frac\s*\{[^}]*\}\s*\{[^}]*\}/g,
    
    // İntegraller ve toplamlar
    integrals: /\\(?:int|iint|iiint|oint|sum|prod)(?:_\{[^}]*\})?(?:\^\{[^}]*\})?/g,
    
    // Köklü ifadeler
    roots: /\\sqrt(?:\[[^\]]*\])?\{[^}]*\}/g,
    
    // Vektörler ve birimler
    vectors: /\\(?:vec|hat|tilde|bar|dot|ddot|overline|underline)\{[^}]*\}/g,
    
    // Özel semboller
    specialSymbols: /\\(?:infty|partial|nabla|forall|exists|emptyset|varnothing|neg|prime|backslash|ell|Re|Im|wp|aleph|hbar|imath|jmath|eth|%)/g,
    
    // Sayılar (ondalık dahil)
    numbers: /\b\d+(?:\.\d+)?\b/g,
    
    // Değişkenler (tek harfli)
    variables: /\b[a-zA-Z]\b/g
};

// YENİ: Token bazlı parser
class MixedContentParser {
    constructor(content) {
        this.content = content;
        this.tokens = [];
        this.position = 0;
    }

    /**
     * İçeriği token'lara ayır
     */
    tokenize() {
        let remaining = this.content;
        let lastIndex = 0;
        const segments = [];

        // Öncelik sırasına göre pattern'leri kontrol et
        const patternPriority = [
            { name: 'displayMath', pattern: LATEX_PATTERNS.displayMath },
            { name: 'inlineMath', pattern: LATEX_PATTERNS.inlineMath },
            { name: 'environments', pattern: LATEX_PATTERNS.environments },
            { name: 'fractions', pattern: LATEX_PATTERNS.fractions },
            { name: 'roots', pattern: LATEX_PATTERNS.roots },
            { name: 'integrals', pattern: LATEX_PATTERNS.integrals },
            { name: 'commands', pattern: LATEX_PATTERNS.commands },
            { name: 'superSubscript', pattern: LATEX_PATTERNS.superSubscript },
            { name: 'greekLetters', pattern: LATEX_PATTERNS.greekLetters },
            { name: 'operators', pattern: LATEX_PATTERNS.operators },
            { name: 'vectors', pattern: LATEX_PATTERNS.vectors },
            { name: 'specialSymbols', pattern: LATEX_PATTERNS.specialSymbols }
        ];

        // Tüm matematik bölgelerini bul
        const mathRegions = [];
        
        patternPriority.forEach(({ name, pattern }) => {
            const regex = new RegExp(pattern.source, pattern.flags);
            let match;
            
            while ((match = regex.exec(this.content)) !== null) {
                mathRegions.push({
                    type: name,
                    start: match.index,
                    end: match.index + match[0].length,
                    content: match[0]
                });
            }
        });

        // Çakışan bölgeleri birleştir
        mathRegions.sort((a, b) => a.start - b.start);
        const mergedRegions = [];
        
        mathRegions.forEach(region => {
            if (mergedRegions.length === 0) {
                mergedRegions.push(region);
            } else {
                const last = mergedRegions[mergedRegions.length - 1];
                if (region.start <= last.end) {
                    // Çakışma var, birleştir
                    last.end = Math.max(last.end, region.end);
                    last.content = this.content.substring(last.start, last.end);
                } else {
                    mergedRegions.push(region);
                }
            }
        });

        // Segmentleri oluştur
        let currentPos = 0;
        
        mergedRegions.forEach(region => {
            // Önceki metin
            if (currentPos < region.start) {
                const textContent = this.content.substring(currentPos, region.start);
                if (textContent.trim()) {
                    segments.push({
                        type: 'text',
                        content: textContent
                    });
                }
            }
            
            // Matematik içerik
            segments.push({
                type: 'math',
                content: region.content,
                mathType: region.type
            });
            
            currentPos = region.end;
        });
        
        // Son metin parçası
        if (currentPos < this.content.length) {
            const textContent = this.content.substring(currentPos);
            if (textContent.trim()) {
                segments.push({
                    type: 'text',
                    content: textContent
                });
            }
        }

        return segments;
    }
}

class MixedContentRenderer {
    constructor() {
        this.renderCache = new Map();
        
        // Performans metrikleri
        this.metrics = {
            totalRenders: 0,
            successfulRenders: 0,
            cacheHits: 0,
            averageSegmentCount: 0,
            parseErrors: 0
        };
    }

    /**
     * Karışık içeriği render et
     */
    async renderMixedContent(element, content, options = {}) {
        if (!element || !content) {
            console.warn('❌ Geçersiz mixed content parametreleri');
            return false;
        }

        this.metrics.totalRenders++;
        console.log('🔄 Karışık içerik render ediliyor:', content.substring(0, 100) + '...');

        try {
            // Cache kontrolü
            const cacheKey = this.generateCacheKey(content, options);
            if (this.renderCache.has(cacheKey)) {
                element.innerHTML = this.renderCache.get(cacheKey);
                this.metrics.cacheHits++;
                console.log('✨ Mixed content cache hit');
                return true;
            }

            // İçeriği parse et
            const parser = new MixedContentParser(content);
            const segments = parser.tokenize();
            
            console.log('📊 İçerik segmentleri:', segments.length, segments);

            // Segmentleri render et
            const renderedHTML = await this.renderSegments(segments, options);

            // Sonucu element'e yaz ve cache'le
            element.innerHTML = renderedHTML;
            this.renderCache.set(cacheKey, renderedHTML);

            // Metrikleri güncelle
            this.metrics.successfulRenders++;
            this.updateAverageSegmentCount(segments.length);

            console.log('✅ Karışık içerik başarıyla render edildi');
            return true;

        } catch (error) {
            console.error('❌ Mixed content render hatası:', error);
            this.metrics.parseErrors++;
            
            // Fallback: düz metin olarak göster
            element.textContent = content;
            return false;
        }
    }

    /**
     * Segmentleri HTML'e dönüştür
     */
    async renderSegments(segments, options) {
        const parts = [];

        for (const segment of segments) {
            if (segment.type === 'text') {
                // Metin içeriği - HTML escape et
                const escapedText = this.escapeHtml(segment.content);
                parts.push(`<span class="text-segment">${escapedText}</span>`);
            } else if (segment.type === 'math') {
                // Matematik içeriği
                const mathHTML = await this.renderMathSegment(segment, options);
                parts.push(mathHTML);
            }
        }

        return parts.join('');
    }

    /**
     * Matematik segmentini render et
     */
    async renderMathSegment(segment, options) {
        const { content, mathType } = segment;
        
        // Display vs inline matematik
        const isDisplay = mathType === 'displayMath' || content.includes('\\\\');
        const className = isDisplay ? 'math-display' : 'math-inline';
        
        try {
            // KaTeX render denemesi
            if (window.katex) {
                const rendered = window.katex.renderToString(content, {
                    displayMode: isDisplay,
                    throwOnError: false,
                    ...options.katexOptions
                });
                return `<span class="${className} katex-rendered">${rendered}</span>`;
            }
            
            // MathJax fallback
            if (window.MathJax) {
                const wrapper = document.createElement('span');
                wrapper.className = className + ' mathjax-rendered';
                wrapper.textContent = isDisplay ? `\\[${content}\\]` : `\\(${content}\\)`;
                
                // MathJax'in daha sonra render etmesi için işaretle
                wrapper.setAttribute('data-math-content', 'true');
                wrapper.setAttribute('data-math-type', mathType);
                
                return wrapper.outerHTML;
            }
            
            // Fallback: escape edilmiş metin
            return `<span class="${className} math-fallback">${this.escapeHtml(content)}</span>`;
            
        } catch (error) {
            console.warn('Math segment render hatası:', error);
            return `<span class="${className} math-error">${this.escapeHtml(content)}</span>`;
        }
    }

    /**
     * HTML escape
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Cache key oluştur
     */
    generateCacheKey(content, options) {
        return `mixed_${content.length}_${JSON.stringify(options)}`.substring(0, 50);
    }

    /**
     * Ortalama segment sayısını güncelle
     */
    updateAverageSegmentCount(newCount) {
        const currentAvg = this.metrics.averageSegmentCount;
        const totalRenders = this.metrics.successfulRenders;
        
        this.metrics.averageSegmentCount = 
            (currentAvg * (totalRenders - 1) + newCount) / totalRenders;
    }

    /**
     * Metrikleri getir
     */
    getMetrics() {
        const successRate = this.metrics.totalRenders > 0
            ? ((this.metrics.successfulRenders / this.metrics.totalRenders) * 100).toFixed(2)
            : '0.00';
            
        const cacheHitRate = this.metrics.totalRenders > 0
            ? ((this.metrics.cacheHits / this.metrics.totalRenders) * 100).toFixed(2)
            : '0.00';

        return {
            totalRenders: this.metrics.totalRenders,
            successfulRenders: this.metrics.successfulRenders,
            successRate: successRate + '%',
            cacheHitRate: cacheHitRate + '%',
            averageSegmentCount: this.metrics.averageSegmentCount.toFixed(2),
            parseErrors: this.metrics.parseErrors
        };
    }

    /**
     * Cache'i temizle
     */
    clearCache() {
        this.renderCache.clear();
        console.log('🧹 Mixed content cache temizlendi');
    }
}

// Singleton instance
export const mixedContentRenderer = new MixedContentRenderer();

// Debug için global erişim
if (typeof window !== 'undefined') {
    window._mixedContentRenderer = mixedContentRenderer;
}