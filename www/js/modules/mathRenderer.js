// =================================================================================
//  MathAi - Matematiksel İfade Render Modülü
//  Tutarlı LaTeX render işlemi için gelişmiş sistem - KARIŞIK İÇERİK SORUNU ÇÖZÜMLENDİ
// =================================================================================

/**
 * Matematiksel ifadeleri tutarlı bir şekilde render eden gelişmiş sistem
 */
export class MathRenderer {
    constructor() {
        this.latexPatterns = {
            // Temel matematiksel operatörler
            basicMath: /[+\-*/=<>≤≥≠≈]/,
            
            // LaTeX komutları
            latexCommands: /\\[a-zA-Z]+/,
            
            // LaTeX sembolleri
            latexSymbols: /[\{\}^_]/,
            
            // Matematiksel semboller
            mathSymbols: /[∑∏∫√π∞±∝∴∵∈∉⊂⊃∪∩∧∨¬∀∃]/,
            
            // Kesir formatları
            fractions: /(\d+)\/(\d+)/,
            
            // Üs formatları
            exponents: /(\w+)\^(\w+)/,
            
            // Kök formatları
            roots: /sqrt\(([^)]+)\)/,
            
            // Trigonometrik fonksiyonlar
            trigFunctions: /(sin|cos|tan|cot|sec|csc)\(([^)]+)\)/,
            
            // Logaritma
            logarithms: /log_(\w+)\(([^)]+)\)/,
            
            // Limit
            limits: /lim_(\w+->\w+)\(([^)]+)\)/,
            
            // İntegral
            integrals: /int_(\w+)\^(\w+)\(([^)]+)\)/,
            
            // Toplam
            sums: /sum_(\w+=\w+)\^(\w+)\(([^)]+)\)/,
            
            // LaTeX blokları ($...$ veya \(...\))
            latexBlocks: /(\$[^$]*\$|\\\([^)]*\\\))/g
        };
        
        this.textPatterns = {
            // Düz metin göstergeleri
            plainText: /^(açıklama|adım|çözüm|sonuç|cevap|bul|hesapla|çıkar|ekle|çarp|böl)/i,
            
            // Türkçe kelimeler
            turkishWords: /(bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on|yüz|bin|milyon|katı|kez|defa|adet|tane|uzunluğu|kenar|alan|hacim|çevre|yükseklik|genişlik|boy|en|cm|mm|m|km|derece|açı|nokta|doğru|çember|daire|üçgen|kare|dikdörtgen|paralelkenar|yamuk|prizma|küp|küre)/i,
            
            // Açıklama cümleleri
            explanation: /(olduğuna|göre|için|bu|şu|o|bunun|şunun|onun|olur|olacak|olmuş|oluyor|olacak|ise|eğer|ancak|sadece|yalnız|hem|de|da|ile|den|dan|e|a|i|ı|u|ü|ö)/i,
            
            // Türkçe karakterler
            turkishChars: /[ğüşıöçĞÜŞİÖÇ]/,
            // YENİ EKLEME: Basit matematik ifadesi
            simpleExpression: /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s\d\+\-=<>.,!?]+$/,
    
            // YENİ EKLEME: Karmaşık matematik göstergeleri (bunlar YOKSA basit metin)
            complexMathIndicators: /[\{\}\^\\_\$\\]|\\[a-zA-Z]+|sqrt|log|sin|cos|tan|int|sum|lim|frac/

        };
    }

    /**
     * Ana render fonksiyonu - tüm matematiksel ifadeleri tutarlı şekilde render eder
     * @param {string} content - Render edilecek içerik
     * @param {HTMLElement} element - Hedef element
     * @param {boolean} displayMode - Display modu
     * @returns {boolean} Render başarılı mı?
     */
    render(content, element, displayMode = false) {
        if (!content || !element) return false;
        
        // İçeriği analiz et ve uygun render stratejisini seç
        const analysis = this.analyzeContent(content);
        
        // Debug log
        console.log('Content Analysis:', {
            content: content,
            analysis: analysis
        });
        
        // KARIŞIK İÇERİK ÖNCELİKLİ KONTROL
        if (analysis.isMixed) {
            return this.renderMixedContent(content, element, displayMode);
        } else if (analysis.isPureLatex) {
            return this.renderLatex(content, element, displayMode);
        } else if (analysis.isMathExpression) {
            return this.renderMathExpression(content, element, displayMode);
        } else {
            return this.renderPlainText(content, element);
        }
    }
        /**
     * Basit metin olup olmadığını kontrol eder
     * @param {string} content - İçerik
     * @returns {boolean} Basit metin mi?
     */
    isSimpleText(content) {
        // Karmaşık matematik göstergeleri varsa basit değil
        if (this.textPatterns.complexMathIndicators.test(content)) {
            return false;
        }
        
        // $ ile sarılmış LaTeX blokları varsa basit değil
        if (/\$[^$]+\$/.test(content)) {
            return false;
        }
        
        // \( \) ile sarılmış LaTeX blokları varsa basit değil
        if (/\\\([^)]+\\\)/.test(content)) {
            return false;
        }
        
        // Sadece basit karakterler, sayılar, temel operatörler ve Türkçe kelimeler içeriyorsa basit
        const isSimplePattern = this.textPatterns.simpleExpression.test(content);
        
        // Türkçe açıklama kelimeleri varsa kesinlikle basit metin
        const hasTurkishExplanation = this.textPatterns.explanation.test(content) || 
                                    this.textPatterns.turkishWords.test(content) ||
                                    this.textPatterns.turkishChars.test(content);
        
        // "Bu durumda x = 3 olur" gibi ifadeleri yakala
        const isSimpleStatement = /^(bu|şu|o|bunun|sonuç|cevap|durumda|halde).*(olur|olacak|oluyor|=|\d+).*$/i.test(content);
        
        return isSimplePattern && (hasTurkishExplanation || isSimpleStatement);
    }

    /**
     * İçeriği analiz eder ve uygun render stratejisini belirler
     * @param {string} content - Analiz edilecek içerik
     * @returns {Object} Analiz sonucu
     */
    analyzeContent(content) {
        const trimmed = content.trim();

            // 0. BASİT METİN KONTROLÜ (YENİ EKLEME)
        if (this.isSimpleText(trimmed)) {
            return {
                isMixed: false,
                isPureLatex: false,
                isMathExpression: false,
                isPlainText: true,
                confidence: 0.9,
                reason: 'simple_text'
            };
        }
        
        // 1. KARIŞIK İÇERİK KONTROLÜ (EN ÖNCELİKLİ)
        const mixedContentResult = this.detectMixedContent(trimmed);
        if (mixedContentResult.isMixed) {
            return {
                isMixed: true,
                isPureLatex: false,
                isMathExpression: false,
                isPlainText: false,
                confidence: 0.95,
                mixedDetails: mixedContentResult
            };
        }
        
        // 2. SADECE LaTeX KONTROLÜ
        const latexAnalysis = this.analyzePureLatex(trimmed);
        if (latexAnalysis.isPureLatex) {
            return {
                isMixed: false,
                isPureLatex: true,
                isMathExpression: false,
                isPlainText: false,
                confidence: latexAnalysis.confidence,
                latexDetails: latexAnalysis
            };
        }
        
        // 3. SADECE MATEMATİKSEL İFADE KONTROLÜ
        const mathAnalysis = this.analyzeMathExpression(trimmed);
        if (mathAnalysis.isMathExpression) {
            return {
                isMixed: false,
                isPureLatex: false,
                isMathExpression: true,
                isPlainText: false,
                confidence: mathAnalysis.confidence,
                mathDetails: mathAnalysis
            };
        }
        
        // 4. SADECE DÜZ METİN
        return {
            isMixed: false,
            isPureLatex: false,
            isMathExpression: false,
            isPlainText: true,
            confidence: 0.8
        };
    }

    /**
     * Karışık içeriği tespit eder (metin + matematiksel ifade)
     * @param {string} content - İçerik
     * @returns {Object} Karışık içerik analizi
     */
    detectMixedContent(content) {
        // LaTeX blokları var mı?
        const latexBlocks = content.match(this.latexPatterns.latexBlocks);
        
        if (!latexBlocks || latexBlocks.length === 0) {
            return { isMixed: false, hasLatexBlocks: false };
        }
        
        // LaTeX bloklarını geçici olarak kaldır
        let contentWithoutLatex = content;
        latexBlocks.forEach((block, idx) => {
            contentWithoutLatex = contentWithoutLatex.replace(block, `__LATEX_BLOCK_${idx}__`);
        });
        
        // Kalan içerikte Türkçe metin var mı?
        const hasTurkishText = this.textPatterns.turkishWords.test(contentWithoutLatex) ||
                              this.textPatterns.explanation.test(contentWithoutLatex) ||
                              this.textPatterns.turkishChars.test(contentWithoutLatex);
        
        // Alfabe karakteri var mı (placeholder'lar hariç)?
        const hasAlphaText = /[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(contentWithoutLatex.replace(/__LATEX_BLOCK_\d+__/g, ''));
        
        // Karışık içerik var mı?
        const isMixed = latexBlocks.length > 0 && (hasTurkishText || hasAlphaText);
        
        return {
            isMixed: isMixed,
            hasLatexBlocks: latexBlocks.length > 0,
            hasTurkishText: hasTurkishText,
            hasAlphaText: hasAlphaText,
            latexBlockCount: latexBlocks.length,
            latexBlocks: latexBlocks
        };
    }

    /**
     * Sadece LaTeX içeriği analiz eder
     * @param {string} content - İçerik
     * @returns {Object} LaTeX analizi
     */
    analyzePureLatex(content) {
        // LaTeX komutları var mı?
        const hasLatexCommands = this.latexPatterns.latexCommands.test(content);
        
        // LaTeX sembolleri var mı?
        const hasLatexSymbols = this.latexPatterns.latexSymbols.test(content);
        
        // Matematiksel semboller var mı?
        const hasMathSymbols = this.latexPatterns.mathSymbols.test(content);
        
        // $ ile sarılmış mı?
        const isDollarWrapped = /^\$.*\$$/.test(content.trim());
        
        // \( \) ile sarılmış mı?
        const isParenWrapped = /^\\\(.*\\\)$/.test(content.trim());
        
        // Türkçe karakterler var mı? (varsa karışık olabilir)
        const hasTurkishChars = this.textPatterns.turkishChars.test(content);
        
        // Sadece LaTeX mi?
        const isPureLatex = (hasLatexCommands || hasLatexSymbols || hasMathSymbols || isDollarWrapped || isParenWrapped) && !hasTurkishChars;
        
        let confidence = 0;
        if (hasLatexCommands) confidence += 0.4;
        if (hasLatexSymbols) confidence += 0.3;
        if (hasMathSymbols) confidence += 0.3;
        if (isDollarWrapped || isParenWrapped) confidence += 0.2;
        if (hasTurkishChars) confidence -= 0.3; // Türkçe karakter varsa karışık olabilir
        
        return {
            isPureLatex: isPureLatex,
            confidence: Math.max(0, Math.min(1, confidence)),
            hasLatexCommands: hasLatexCommands,
            hasLatexSymbols: hasLatexSymbols,
            hasMathSymbols: hasMathSymbols,
            isDollarWrapped: isDollarWrapped,
            isParenWrapped: isParenWrapped,
            hasTurkishChars: hasTurkishChars
        };
    }

    /**
     * Matematiksel ifade analiz eder
     * @param {string} content - İçerik
     * @returns {Object} Matematiksel ifade analizi
     */
    analyzeMathExpression(content) {
        // Temel matematik operatörleri
        const hasBasicMath = this.latexPatterns.basicMath.test(content);
        
        // Kesirler
        const hasFractions = this.latexPatterns.fractions.test(content);
        
        // Üsler
        const hasExponents = this.latexPatterns.exponents.test(content);
        
        // Kökler
        const hasRoots = this.latexPatterns.roots.test(content);
        
        // Trigonometrik fonksiyonlar
        const hasTrigFunctions = this.latexPatterns.trigFunctions.test(content);
        
        // Logaritma
        const hasLogarithms = this.latexPatterns.logarithms.test(content);
        
        // Limit
        const hasLimits = this.latexPatterns.limits.test(content);
        
        // İntegral
        const hasIntegrals = this.latexPatterns.integrals.test(content);
        
        // Toplam
        const hasSums = this.latexPatterns.sums.test(content);
        
        // Matematiksel ifade mi?
        const isMathExpression = hasBasicMath || hasFractions || hasExponents || hasRoots || 
                                hasTrigFunctions || hasLogarithms || hasLimits || hasIntegrals || hasSums;
        
        let confidence = 0;
        if (hasBasicMath) confidence += 0.2;
        if (hasFractions) confidence += 0.3;
        if (hasExponents) confidence += 0.3;
        if (hasRoots) confidence += 0.3;
        if (hasTrigFunctions) confidence += 0.4;
        if (hasLogarithms) confidence += 0.4;
        if (hasLimits) confidence += 0.4;
        if (hasIntegrals) confidence += 0.4;
        if (hasSums) confidence += 0.4;
        
        return {
            isMathExpression: isMathExpression,
            confidence: Math.min(1, confidence),
            hasBasicMath: hasBasicMath,
            hasFractions: hasFractions,
            hasExponents: hasExponents,
            hasRoots: hasRoots,
            hasTrigFunctions: hasTrigFunctions,
            hasLogarithms: hasLogarithms,
            hasLimits: hasLimits,
            hasIntegrals: hasIntegrals,
            hasSums: hasSums
        };
    }

    /**
     * LaTeX içeriğini render eder
     * @param {string} content - LaTeX içeriği
     * @param {HTMLElement} element - Hedef element
     * @param {boolean} displayMode - Display modu
     * @returns {boolean} Başarılı mı?
     */
    renderLatex(content, element, displayMode = false) {
        try {
            if (typeof katex === 'undefined') {
                element.textContent = content;
                return false;
            }
            
            // LaTeX'i temizle ve hazırla
            const cleanedLatex = this.cleanLatex(content);
            
            katex.render(cleanedLatex, element, {
                throwOnError: false,
                displayMode: displayMode,
                output: "html",
                trust: true,
                strict: false,
                macros: {
                    "\\T": "\\text{#1}",
                    "\\text": "\\text{#1}"
                }
            });
            
            this.applyStyles(element, displayMode);
            return true;
            
        } catch (error) {
            console.error('LaTeX render hatası:', error);
            element.textContent = content;
            element.classList.add('katex-error');
            return false;
        }
    }

    /**
     * Matematiksel ifadeyi LaTeX'e çevirir ve render eder
     * @param {string} content - Matematiksel ifade
     * @param {HTMLElement} element - Hedef element
     * @param {boolean} displayMode - Display modu
     * @returns {boolean} Başarılı mı?
     */
    renderMathExpression(content, element, displayMode = false) {
        try {
            // Matematiksel ifadeyi LaTeX'e çevir
            const latex = this.convertToLatex(content);
            return this.renderLatex(latex, element, displayMode);
            
        } catch (error) {
            console.error('Matematiksel ifade render hatası:', error);
            element.textContent = content;
            return false;
        }
    }

    /**
     * Karışık içeriği render eder (LaTeX + metin)
     * @param {string} content - Karışık içerik
     * @param {HTMLElement} element - Hedef element
     * @param {boolean} displayMode - KaTeX render'ında displayMode parametresi
     * @returns {boolean} Başarılı mı?
     */
    renderMixedContent(content, element, displayMode = false) {
        try {
            const parts = this.splitMixedContentSmart(content);
            element.innerHTML = '';
            
            // Her parçayı ayrı ayrı render et
            parts.forEach((part, idx) => {
                if (part.type === 'latex') {
                    // LaTeX parçası için span oluştur
                    const latexElement = document.createElement('span');
                    latexElement.className = 'latex-inline';
                    latexElement.style.display = 'inline-block';
                    latexElement.style.verticalAlign = 'middle';
                    latexElement.style.margin = '0 2px';
                    
                    // LaTeX'i render et
                    this.renderLatex(part.content, latexElement, false);
                    element.appendChild(latexElement);
                } else {
                    // Düz metin parçası için span oluştur
                    const textElement = document.createElement('span');
                    textElement.className = 'text-inline';
                    textElement.style.display = 'inline';
                    textElement.style.verticalAlign = 'baseline';
                    textElement.textContent = part.content;
                    element.appendChild(textElement);
                }
            });
            
            // Genel stil uygula
            this.applyStyles(element, displayMode);
            return true;
            
        } catch (error) {
            console.error('Karışık içerik render hatası:', error);
            element.textContent = content;
            return false;
        }
    }

    /**
     * Karışık içeriği akıllıca parçalara ayırır (LaTeX blokları ve düz metin)
     * @param {string} content
     * @returns {Array<{type: 'latex'|'text', content: string}>}
     */
    splitMixedContentSmart(content) {
        const parts = [];
        let lastIndex = 0;
        
        // LaTeX blokları için gelişmiş regex
        const latexRegex = /(\$[^$]+\$|\\\([^)]+\\\))/g;
        let match;
        
        while ((match = latexRegex.exec(content)) !== null) {
            // Önceki düz metin parçası
            if (match.index > lastIndex) {
                const textContent = content.slice(lastIndex, match.index).trim();
                if (textContent) {
                    parts.push({ type: 'text', content: textContent });
                }
            }
            
            // LaTeX parçası (dış işaretleri temizle)
            let latexContent = match[0];
            if (latexContent.startsWith('$') && latexContent.endsWith('$')) {
                latexContent = latexContent.slice(1, -1);
            } else if (latexContent.startsWith('\\(') && latexContent.endsWith('\\)')) {
                latexContent = latexContent.slice(2, -2);
            }
            
            if (latexContent.trim()) {
                parts.push({ type: 'latex', content: latexContent.trim() });
            }
            
            lastIndex = latexRegex.lastIndex;
        }
        
        // Kalan düz metin
        if (lastIndex < content.length) {
            const remainingText = content.slice(lastIndex).trim();
            if (remainingText) {
                parts.push({ type: 'text', content: remainingText });
            }
        }
        
        // Boş parçaları filtrele
        return parts.filter(part => part.content && part.content.trim());
    }

    /**
     * Düz metni render eder
     * @param {string} content - Düz metin
     * @param {HTMLElement} element - Hedef element
     * @returns {boolean} Başarılı mı?
     */
    renderPlainText(content, element) {
        element.textContent = content;
        element.classList.add('math-text');
        return true;
    }

    /**
     * LaTeX içeriğini temizler
     * @param {string} latex - LaTeX içeriği
     * @returns {string} Temizlenmiş LaTeX
     */
    cleanLatex(latex) {
        return latex
            .replace(/^\\\(|\\\)$/g, '')
            .replace(/^\$\$|\$\$$/g, '')
            .replace(/^\$|\$$/g, '')
            .trim();
    }

    /**
     * Matematiksel ifadeyi LaTeX'e çevirir
     * @param {string} expression - Matematiksel ifade
     * @returns {string} LaTeX formatı
     */
    convertToLatex(expression) {
        let latex = expression;
        
        // Kesirler: a/b -> \frac{a}{b}
        latex = latex.replace(/(\d+)\/(\d+)/g, '\\frac{$1}{$2}');
        
        // Üsler: x^2 -> x^{2}
        latex = latex.replace(/(\w+)\^(\w+)/g, '$1^{$2}');
        
        // Kökler: sqrt(x) -> \sqrt{x}
        latex = latex.replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}');
        
        // Trigonometrik fonksiyonlar
        latex = latex.replace(/(sin|cos|tan|cot|sec|csc)\(([^)]+)\)/g, '\\$1($2)');
        
        // Logaritma: log_a(x) -> \log_a(x)
        latex = latex.replace(/log_(\w+)\(([^)]+)\)/g, '\\log_{$1}($2)');
        
        // Limit: lim_x->a(f(x)) -> \lim_{x \to a} f(x)
        latex = latex.replace(/lim_(\w+->\w+)\(([^)]+)\)/g, '\\lim_{$1} $2');
        
        // İntegral: int_a^b(f(x)) -> \int_a^b f(x) dx
        latex = latex.replace(/int_(\w+)\^(\w+)\(([^)]+)\)/g, '\\int_{$1}^{$2} $3 dx');
        
        // Toplam: sum_i=1^n(a_i) -> \sum_{i=1}^{n} a_i
        latex = latex.replace(/sum_(\w+=\w+)\^(\w+)\(([^)]+)\)/g, '\\sum_{$1}^{$2} $3');
        
        return latex;
    }

    /**
     * HTML karakterlerini escape eder
     * @param {string} text - Metin
     * @returns {string} Escape edilmiş metin
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Element stillerini uygular
     * @param {HTMLElement} element - Element
     * @param {boolean} displayMode - Display modu
     */
    applyStyles(element, displayMode) {
        element.style.textAlign = 'left';
        element.style.lineHeight = '1.8';
        element.style.padding = '2px 0';
        
        const fontSize = displayMode ? '1.2rem' : '1.1rem';
        element.style.fontSize = fontSize;
        
        element.classList.remove('katex-error');
        
        // KaTeX elementlerini düzenle
        const katexElements = element.querySelectorAll('.katex');
        katexElements.forEach(katexEl => {
            katexEl.style.overflowX = 'auto';
            katexEl.style.overflowY = 'hidden';
            katexEl.style.paddingBottom = '4px';
            
            if (displayMode) {
                katexEl.style.display = 'block';
                katexEl.style.textAlign = 'center';
            } else {
                katexEl.style.display = 'inline-block';
                katexEl.style.verticalAlign = 'middle';
            }
        });
    }

    /**
     * Toplu render işlemi - bir container içindeki tüm matematiksel ifadeleri render eder
     * @param {HTMLElement} container - Container element
     * @param {boolean} displayMode - Display modu
     */
    renderContainer(container, displayMode = false) {
        if (!container) return;
        
        // data-latex attribute'u olan elementleri render et
        const latexElements = container.querySelectorAll('[data-latex]');
        latexElements.forEach(element => {
            const latex = element.getAttribute('data-latex');
            if (latex) {
                this.render(latex, element, displayMode);
            }
        });
        
        // .latex-content sınıfı olan elementleri render et
        const latexContentElements = container.querySelectorAll('.latex-content');
        latexContentElements.forEach(element => {
            const content = element.textContent || element.innerHTML;
            if (content) {
                this.render(content, element, displayMode);
            }
        });
        
        // .math-content sınıfı olan elementleri render et
        const mathContentElements = container.querySelectorAll('.math-content');
        mathContentElements.forEach(element => {
            const content = element.textContent || element.innerHTML;
            if (content) {
                this.render(content, element, displayMode);
            }
        });
    }
}

// Singleton instance
export const mathRenderer = new MathRenderer();