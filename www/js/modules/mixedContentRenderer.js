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
    variables: /\b[a-zA-Z]\b/g,
    
    // YENİ: Karmaşık LaTeX yapıları
    complexIntegrals: /\\\[[^\]]+\\\]/g,
    complexFractions: /\\frac\s*\{[^}]*\}\s*\{[^}]*\}/g,
    complexRoots: /\\sqrt(?:\[[^\]]*\])?\{[^}]*\}/g,
    complexSuperscripts: /[a-zA-Z]\^\{[^}]+\}/g,
    complexSubscripts: /[a-zA-Z]_\{[^}]+\}/g,
    turkishLatex: /\\[cCgGiIoOsSuU]/g,
    
    // YENİ: Özel matematiksel yapılar
    brackets: /\\left[\(\)\[\]\{\}][^\\]*\\right[\(\)\[\]\{\}]/g,
    nestedFractions: /\\frac\s*\{[^}]*\\frac[^}]*\}\s*\{[^}]*\}/g,
    nestedRoots: /\\sqrt(?:\[[^\]]*\])?\{[^}]*\\sqrt[^}]*\}/g
};

// YENİ: Token bazlı parser - GELİŞTİRİLDİ
class MixedContentParser {
    constructor(content) {
        this.content = content;
        this.tokens = [];
        this.position = 0;
    }

    /**
     * İçeriği token'lara ayır - GELİŞTİRİLDİ
     */
    tokenize() {
        let remaining = this.content;
        let lastIndex = 0;
        const segments = [];

        // Öncelik sırasına göre pattern'leri kontrol et - GELİŞTİRİLDİ
        const patternPriority = [
            { name: 'displayMath', pattern: LATEX_PATTERNS.displayMath },
            { name: 'inlineMath', pattern: LATEX_PATTERNS.inlineMath },
            { name: 'environments', pattern: LATEX_PATTERNS.environments },
            { name: 'nestedFractions', pattern: LATEX_PATTERNS.nestedFractions },
            { name: 'nestedRoots', pattern: LATEX_PATTERNS.nestedRoots },
            { name: 'brackets', pattern: LATEX_PATTERNS.brackets },
            { name: 'complexIntegrals', pattern: LATEX_PATTERNS.complexIntegrals },
            { name: 'fractions', pattern: LATEX_PATTERNS.fractions },
            { name: 'roots', pattern: LATEX_PATTERNS.roots },
            { name: 'integrals', pattern: LATEX_PATTERNS.integrals },
            { name: 'commands', pattern: LATEX_PATTERNS.commands },
            { name: 'superSubscript', pattern: LATEX_PATTERNS.superSubscript },
            { name: 'greekLetters', pattern: LATEX_PATTERNS.greekLetters },
            { name: 'operators', pattern: LATEX_PATTERNS.operators },
            { name: 'vectors', pattern: LATEX_PATTERNS.vectors },
            { name: 'specialSymbols', pattern: LATEX_PATTERNS.specialSymbols },
            { name: 'turkishLatex', pattern: LATEX_PATTERNS.turkishLatex }
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
                    content: match[0],
                    priority: patternPriority.findIndex(p => p.name === name)
                });
            }
        });

        // Çakışan bölgeleri birleştir - GELİŞTİRİLDİ
        mathRegions.sort((a, b) => {
            if (a.start !== b.start) return a.start - b.start;
            return a.priority - b.priority; // Düşük öncelik numarası = yüksek öncelik
        });
        
        const mergedRegions = [];
        
        mathRegions.forEach(region => {
            if (mergedRegions.length === 0) {
                mergedRegions.push(region);
            } else {
                const last = mergedRegions[mergedRegions.length - 1];
                if (region.start <= last.end) {
                    // Çakışma var, daha yüksek öncelikli olanı seç
                    if (region.priority < last.priority) {
                        // Yeni bölge daha yüksek öncelikli, eskiyi değiştir
                        mergedRegions[mergedRegions.length - 1] = region;
                    } else if (region.start === last.start && region.end > last.end) {
                        // Aynı başlangıç, daha uzun olanı seç
                        mergedRegions[mergedRegions.length - 1] = region;
                    }
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

    /**
     * LaTeX içeriğini optimize et - GELİŞTİRİLDİ
     */
    optimizeLatex(latex) {
        if (!latex || typeof latex !== 'string') return latex;
        
        let optimized = latex;
        
        // 1. Kesir ifadelerini düzelt
        optimized = optimized.replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, '\\frac{$1}{$2}');
        
        // 2. Kök ifadelerini düzelt
        optimized = optimized.replace(/\\sqrt\s*\{([^}]*)\}/g, '\\sqrt{$1}');
        optimized = optimized.replace(/\\sqrt\[([^\]]*)\]\s*\{([^}]*)\}/g, '\\sqrt[$1]{$2}');
        
        // 3. Üst ve alt indisleri düzelt
        optimized = optimized.replace(/([a-zA-Z0-9])\^\{([^}]*)\}/g, '$1^{$2}');
        optimized = optimized.replace(/([a-zA-Z0-9])_\{([^}]*)\}/g, '$1_{$2}');
        
        // 4. İntegral ifadelerini düzelt - GELİŞTİRİLDİ
        optimized = optimized.replace(/\\int_\{([^}]*)\}\^\{([^}]*)\}/g, '\\int_{$1}^{$2}');
        optimized = optimized.replace(/\\int_\{([^}]*)\}/g, '\\int_{$1}');
        optimized = optimized.replace(/\\int\^\{([^}]*)\}/g, '\\int^{$1}');
        
        // 5. Logaritma ifadelerini düzelt - GELİŞTİRİLDİ
        optimized = optimized.replace(/\\log_(\d+)\s*\(([^)]+)\)/g, '\\log_{$1}($2)');
        optimized = optimized.replace(/\\ln\s*\(([^)]+)\)/g, '\\ln($1)');
        optimized = optimized.replace(/\\log\s*\(([^)]+)\)/g, '\\log($1)');
        optimized = optimized.replace(/\\log_\{([^}]+)\}\s*\(([^)]+)\)/g, '\\log_{$1}($2)');
        
        // 6. Türev ifadelerini düzelt - GELİŞTİRİLDİ
        optimized = optimized.replace(/\\frac\s*d\s*\{([^}]*)\}\s*d\s*\{([^}]*)\}/g, '\\frac{d$1}{d$2}');
        optimized = optimized.replace(/\\frac\s*\\partial\s*\{([^}]*)\}\s*\\partial\s*\{([^}]*)\}/g, '\\frac{\\partial $1}{\\partial $2}');
        optimized = optimized.replace(/\\frac\{d([^}]+)\}\{d([^}]+)\}/g, '\\frac{d$1}{d$2}');
        optimized = optimized.replace(/\\frac\{([^}]+)\}\{d([^}]+)\}/g, '\\frac{$1}{d$2}');
        
        // 7. Limit ifadelerini düzelt - GELİŞTİRİLDİ
        optimized = optimized.replace(/\\lim_\{([^}]+)\}\s*([^\\]+)/g, '\\lim_{$1} $2');
        optimized = optimized.replace(/\\lim\s*([^\\]+)/g, '\\lim $1');
        optimized = optimized.replace(/\\lim_\{([^}]+)\}/g, '\\lim_{$1}');
        
        // 8. Toplam ifadelerini düzelt - GELİŞTİRİLDİ
        optimized = optimized.replace(/\\sum_\{([^}]+)\}\^\{([^}]+)\}/g, '\\sum_{$1}^{$2}');
        optimized = optimized.replace(/\\sum_\{([^}]+)\}/g, '\\sum_{$1}');
        optimized = optimized.replace(/\\sum\^\{([^}]+)\}/g, '\\sum^{$1}');
        
        // 9. Trigonometrik fonksiyonları düzelt
        optimized = optimized.replace(/\\sin\s*\(([^)]+)\)/g, '\\sin($1)');
        optimized = optimized.replace(/\\cos\s*\(([^)]+)\)/g, '\\cos($1)');
        optimized = optimized.replace(/\\tan\s*\(([^)]+)\)/g, '\\tan($1)');
        optimized = optimized.replace(/\\cot\s*\(([^)]+)\)/g, '\\cot($1)');
        optimized = optimized.replace(/\\sec\s*\(([^)]+)\)/g, '\\sec($1)');
        optimized = optimized.replace(/\\csc\s*\(([^)]+)\)/g, '\\csc($1)');
        
        // 10. Üstel ve logaritmik fonksiyonları düzelt
        optimized = optimized.replace(/\\exp\s*\(([^)]+)\)/g, '\\exp($1)');
        optimized = optimized.replace(/\\ln\s*\(([^)]+)\)/g, '\\ln($1)');
        
        // 11. Matematiksel operatörleri düzelt
        optimized = optimized.replace(/\\cdot\s*/g, '\\cdot ');
        optimized = optimized.replace(/\\times\s*/g, '\\times ');
        optimized = optimized.replace(/\\div\s*/g, '\\div ');
        optimized = optimized.replace(/\\pm\s*/g, '\\pm ');
        optimized = optimized.replace(/\\mp\s*/g, '\\mp ');
        
        // 12. Karşılaştırma operatörleri
        optimized = optimized.replace(/\\leq\s*/g, '\\leq ');
        optimized = optimized.replace(/\\geq\s*/g, '\\geq ');
        optimized = optimized.replace(/\\neq\s*/g, '\\neq ');
        optimized = optimized.replace(/\\approx\s*/g, '\\approx ');
        optimized = optimized.replace(/\\equiv\s*/g, '\\equiv ');
        
        // 13. Parantez düzeltmeleri
        optimized = optimized.replace(/\\left\(([^)]+)\\right\)/g, '\\left($1\\right)');
        optimized = optimized.replace(/\\left\[([^\]]+)\\right\]/g, '\\left[$1\\right]');
        optimized = optimized.replace(/\\left\{([^}]+)\\right\}/g, '\\left\\{$1\\right\\}');
        
        // 14. Fazla boşlukları temizle
        optimized = optimized.replace(/\s+/g, ' ').trim();
        
        return optimized;
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
     * Matematik segmentini render et - GELİŞTİRİLDİ
     */
    async renderMathSegment(segment, options) {
        const { content, mathType } = segment;
        
        // YENİ: LaTeX optimizasyonu
        let optimizedContent = content;
        const parser = new MixedContentParser(content);
        optimizedContent = parser.optimizeLatex(content);
        
        // Display vs inline matematik
        const isDisplay = mathType === 'displayMath' || content.includes('\\\\');
        const className = isDisplay ? 'math-display' : 'math-inline';
        
        try {
            // KaTeX render denemesi - GELİŞTİRİLDİ
            if (window.katex) {
                const katexOptions = {
                    displayMode: isDisplay,
                    throwOnError: false,
                    strict: false, // Daha esnek parsing
                    trust: true, // Güvenli komutları etkinleştir
                    macros: {
                        // YENİ: Türkçe karakter makroları
                        '\\c': 'ç',
                        '\\g': 'ğ',
                        '\\i': 'ı',
                        '\\o': 'ö',
                        '\\s': 'ş',
                        '\\u': 'ü'
                    },
                    ...options.katexOptions
                };
                
                const rendered = window.katex.renderToString(optimizedContent, katexOptions);
                return `<span class="${className} katex-rendered" data-original="${this.escapeHtml(content)}">${rendered}</span>`;
            }
            
            // MathJax fallback - GELİŞTİRİLDİ
            if (window.MathJax) {
                const wrapper = document.createElement('span');
                wrapper.className = className + ' mathjax-rendered';
                wrapper.setAttribute('data-original', content);
                
                // MathJax formatına çevir
                const mathjaxContent = isDisplay ? `\\[${optimizedContent}\\]` : `\\(${optimizedContent}\\)`;
                wrapper.textContent = mathjaxContent;
                
                // MathJax'in daha sonra render etmesi için işaretle
                wrapper.setAttribute('data-math-content', 'true');
                wrapper.setAttribute('data-math-type', mathType);
                wrapper.setAttribute('data-optimized', 'true');
                
                return wrapper.outerHTML;
            }
            
            // YENİ: Basit HTML fallback
            return this.createSimpleMathFallback(optimizedContent, className, content);
            
        } catch (error) {
            console.warn('Math segment render hatası:', error);
            
            // YENİ: Gelişmiş hata fallback
            return this.createErrorFallback(content, className, error);
        }
    }

    /**
     * YENİ: Basit matematik fallback - GELİŞTİRİLDİ
     */
    createSimpleMathFallback(content, className, originalContent) {
        // Basit LaTeX komutlarını HTML'e çevir
        let html = content;
        
        // Kesirler
        html = html.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '<span class="fraction"><span class="numerator">$1</span><span class="denominator">$2</span></span>');
        
        // Üst ve alt indisler
        html = html.replace(/([a-zA-Z0-9])\^\{([^}]*)\}/g, '<span class="superscript">$1<sup>$2</sup></span>');
        html = html.replace(/([a-zA-Z0-9])_\{([^}]*)\}/g, '<span class="subscript">$1<sub>$2</sub></span>');
        
        // Kökler
        html = html.replace(/\\sqrt\{([^}]*)\}/g, '<span class="sqrt">√<span class="radicand">$1</span></span>');
        html = html.replace(/\\sqrt\[([^\]]*)\]\{([^}]*)\}/g, '<span class="sqrt">√<sup>$1</sup><span class="radicand">$2</span></span>');
        
        // İntegraller - GELİŞTİRİLDİ
        html = html.replace(/\\int/g, '<span class="integral">∫</span>');
        html = html.replace(/\\int_\{([^}]*)\}\^\{([^}]*)\}/g, '<span class="integral">∫<sub>$1</sub><sup>$2</sup></span>');
        html = html.replace(/\\int_\{([^}]*)\}/g, '<span class="integral">∫<sub>$1</sub></span>');
        html = html.replace(/\\int\^\{([^}]*)\}/g, '<span class="integral">∫<sup>$1</sup></span>');
        
        // Logaritmalar - GELİŞTİRİLDİ
        html = html.replace(/\\log_\{([^}]*)\}/g, '<span class="logarithm">log<sub>$1</sub></span>');
        html = html.replace(/\\log\s*\(([^)]*)\)/g, '<span class="logarithm">log($1)</span>');
        html = html.replace(/\\ln/g, '<span class="logarithm">ln</span>');
        html = html.replace(/\\ln\s*\(([^)]*)\)/g, '<span class="logarithm">ln($1)</span>');
        
        // Türevler - GELİŞTİRİLDİ
        html = html.replace(/\\frac\s*d\s*\{([^}]*)\}\s*d\s*\{([^}]*)\}/g, '<span class="derivative">d<span class="numerator">$1</span>/d<span class="denominator">$2</span></span>');
        html = html.replace(/\\frac\{d([^}]*)\}\{d([^}]*)\}/g, '<span class="derivative">d<span class="numerator">$1</span>/d<span class="denominator">$2</span></span>');
        html = html.replace(/\\partial/g, '<span class="partial">∂</span>');
        
        // Limitler - GELİŞTİRİLDİ
        html = html.replace(/\\lim_\{([^}]*)\}/g, '<span class="limit">lim<sub>$1</sub></span>');
        html = html.replace(/\\lim\s*([^\\]*)/g, '<span class="limit">lim $1</span>');
        
        // Toplamlar - GELİŞTİRİLDİ
        html = html.replace(/\\sum_\{([^}]*)\}\^\{([^}]*)\}/g, '<span class="sum">∑<sub>$1</sub><sup>$2</sup></span>');
        html = html.replace(/\\sum_\{([^}]*)\}/g, '<span class="sum">∑<sub>$1</sub></span>');
        html = html.replace(/\\sum\^\{([^}]*)\}/g, '<span class="sum">∑<sup>$1</sup></span>');
        html = html.replace(/\\sum/g, '<span class="sum">∑</span>');
        
        // Trigonometrik fonksiyonlar - YENİ
        html = html.replace(/\\sin\s*\(([^)]*)\)/g, '<span class="trig">sin($1)</span>');
        html = html.replace(/\\cos\s*\(([^)]*)\)/g, '<span class="trig">cos($1)</span>');
        html = html.replace(/\\tan\s*\(([^)]*)\)/g, '<span class="trig">tan($1)</span>');
        html = html.replace(/\\cot\s*\(([^)]*)\)/g, '<span class="trig">cot($1)</span>');
        html = html.replace(/\\sec\s*\(([^)]*)\)/g, '<span class="trig">sec($1)</span>');
        html = html.replace(/\\csc\s*\(([^)]*)\)/g, '<span class="trig">csc($1)</span>');
        
        // Üstel ve logaritmik fonksiyonlar - YENİ
        html = html.replace(/\\exp\s*\(([^)]*)\)/g, '<span class="exponential">exp($1)</span>');
        
        // Matematiksel operatörler - YENİ
        html = html.replace(/\\cdot/g, '<span class="operator">·</span>');
        html = html.replace(/\\times/g, '<span class="operator">×</span>');
        html = html.replace(/\\div/g, '<span class="operator">÷</span>');
        html = html.replace(/\\pm/g, '<span class="operator">±</span>');
        html = html.replace(/\\mp/g, '<span class="operator">∓</span>');
        
        // Karşılaştırma operatörleri - YENİ
        html = html.replace(/\\leq/g, '<span class="comparison">≤</span>');
        html = html.replace(/\\geq/g, '<span class="comparison">≥</span>');
        html = html.replace(/\\neq/g, '<span class="comparison">≠</span>');
        html = html.replace(/\\approx/g, '<span class="comparison">≈</span>');
        html = html.replace(/\\equiv/g, '<span class="comparison">≡</span>');
        
        // Yunan harfleri - GENİŞLETİLDİ
        const greekLetters = {
            '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\epsilon': 'ε',
            '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ', '\\iota': 'ι', '\\kappa': 'κ',
            '\\lambda': 'λ', '\\mu': 'μ', '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π',
            '\\rho': 'ρ', '\\sigma': 'σ', '\\tau': 'τ', '\\upsilon': 'υ', '\\phi': 'φ',
            '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
            '\\Gamma': 'Γ', '\\Delta': 'Δ', '\\Theta': 'Θ', '\\Lambda': 'Λ', '\\Xi': 'Ξ',
            '\\Pi': 'Π', '\\Sigma': 'Σ', '\\Upsilon': 'Υ', '\\Phi': 'Φ', '\\Psi': 'Ψ', '\\Omega': 'Ω'
        };
        
        Object.entries(greekLetters).forEach(([latex, symbol]) => {
            html = html.replace(new RegExp(latex.replace(/\\/g, '\\\\'), 'g'), `<span class="greek">${symbol}</span>`);
        });
        
        // Matematiksel sabitler - YENİ
        html = html.replace(/\\infty/g, '<span class="constant">∞</span>');
        html = html.replace(/\\pi/g, '<span class="constant">π</span>');
        html = html.replace(/\\e/g, '<span class="constant">e</span>');
        
        // Küme notasyonları - YENİ
        html = html.replace(/\\mathbb\{R\}/g, '<span class="set">ℝ</span>');
        html = html.replace(/\\mathbb\{C\}/g, '<span class="set">ℂ</span>');
        html = html.replace(/\\mathbb\{N\}/g, '<span class="set">ℕ</span>');
        html = html.replace(/\\mathbb\{Z\}/g, '<span class="set">ℤ</span>');
        html = html.replace(/\\mathbb\{Q\}/g, '<span class="set">ℚ</span>');
        
        return `<span class="${className} math-fallback" data-original="${this.escapeHtml(originalContent)}">${html}</span>`;
    }

    /**
     * YENİ: Hata fallback
     */
    createErrorFallback(content, className, error) {
        const errorInfo = error.message ? ` (${error.message})` : '';
        return `
            <span class="${className} math-error" title="Render hatası${errorInfo}">
                <span class="error-icon">⚠️</span>
                <span class="error-content">${this.escapeHtml(content)}</span>
                <button class="retry-render" onclick="this.parentElement.retryRender()" title="Tekrar dene">🔄</button>
            </span>
        `;
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