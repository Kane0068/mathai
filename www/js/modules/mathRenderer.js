// =================================================================================
//  MathAi - Matematiksel İfade Render Modülü (DÜZELTME)
//  Karışık İçerik Sorunu Çözülmüş Versiyon
// =================================================================================

export class MathRenderer {
    constructor() {
        this.latexPatterns = {
            // Temel matematiksel operatörler
            basicMath: /[+\-*/=<>≤≥≠≈]/,
            
            // LaTeX komutları - DÜZELTME: Daha kapsamlı pattern
            latexCommands: /\\[a-zA-Z]+(\{[^}]*\})?/,
            
            // LaTeX sembolleri
            latexSymbols: /[\{\}^_]/,
            
            // Matematiksel semboller
            mathSymbols: /[∑∏∫√π∞±∝∴∵∈∉⊂⊃∪∩∧∨¬∀∃]/,
            
            // DÜZELTME: Daha doğru LaTeX blok tespiti
            latexBlocks: /(\$[^$]+\$|\\\([^\\)]+\\\)|\\begin\{[^}]+\}.*?\\end\{[^}]+\})/gs,
            
            // DÜZELTME: Çift escape'li LaTeX komutları
            doubleEscapedLatex: /\\\\([a-zA-Z]+)/g,
            
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
            sums: /sum_(\w+=\w+)\^(\w+)\(([^)]+)\)/
        };
        
        this.textPatterns = {
            // Düz metin göstergeleri
            plainText: /^(açıklama|adım|çözüm|sonuç|cevap|bul|hesapla|çıkar|ekle|çarp|böl)/i,
            
            // Türkçe kelimeler - DÜZELTME: Daha kapsamlı
            turkishWords: /(bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on|yüz|bin|milyon|katı|kez|defa|adet|tane|uzunluğu|kenar|alan|hacim|çevre|yükseklik|genişlik|boy|en|cm|mm|m|km|derece|açı|nokta|doğru|çember|daire|üçgen|kare|dikdörtgen|paralelkenar|yamuk|prizma|küp|küre|değer|sonuç|durumda|olur|olduğu|göre|için|çünkü|bu|şu|o)/i,
            
            // Açıklama cümleleri
            explanation: /(olduğuna|göre|için|bu|şu|o|bunun|şunun|onun|olur|olacak|olmuş|oluyor|olacak|ise|eğer|ancak|sadece|yalnız|hem|de|da|ile|den|dan|e|a|i|ı|u|ü|ö)/i,
            
            // Türkçe karakterler
            turkishChars: /[ğüşıöçĞÜŞİÖÇ]/,
            
            // DÜZELTME: Daha akıllı basit ifade tespiti
            simpleExpression: /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s\d\+\-=<>.,!?:()]+$/,
    
            // Karmaşık matematik göstergeleri
            complexMathIndicators: /[\{\}\^\\_]|\\[a-zA-Z]+|sqrt|log|sin|cos|tan|int|sum|lim|frac|\$.*\$/
        };
    }

    /**
     * DÜZELTME: Ana render fonksiyonu - iyileştirilmiş logic
     */
    render(content, element, displayMode = false) {
        if (!content || !element) return false;
        
        // DÜZELTME: Önce çift escape'li LaTeX'leri temizle
        const cleanedContent = this.cleanDoubleEscapedLatex(content);
        
        // İçeriği analiz et
        const analysis = this.analyzeContent(cleanedContent);
        
        console.log('Content Analysis (Fixed):', {
            originalContent: content,
            cleanedContent: cleanedContent,
            analysis: analysis
        });
        
        // DÜZELTME: Öncelik sırası değiştirildi
        if (analysis.isMixed) {
            return this.renderMixedContent(cleanedContent, element, displayMode);
        } else if (analysis.isPureLatex) {
            return this.renderLatex(cleanedContent, element, displayMode);
        } else if (analysis.isMathExpression) {
            return this.renderMathExpression(cleanedContent, element, displayMode);
        } else {
            return this.renderPlainText(cleanedContent, element);
        }
    }

    /**
     * DÜZELTME: Çift escape'li LaTeX komutlarını temizle
     */
    cleanDoubleEscapedLatex(content) {
        // \\\\frac -> \\frac
        return content.replace(this.latexPatterns.doubleEscapedLatex, '\\$1');
    }

    /**
     * DÜZELTME: Geliştirilmiş basit metin tespiti
     */
    isSimpleText(content) {
        // Eğer $ işaretleri varsa karışık içerik olabilir
        if (/\$[^$]*\$/.test(content)) {
            return false;
        }
        
        // LaTeX komutları varsa basit değil
        if (this.latexPatterns.latexCommands.test(content)) {
            return false;
        }
        
        // Karmaşık matematik göstergeleri varsa basit değil
        if (this.textPatterns.complexMathIndicators.test(content)) {
            return false;
        }
        
        // Türkçe kelime + basit matematiksel ifade kombinasyonu
        const hasTurkishWords = this.textPatterns.turkishWords.test(content);
        const isSimplePattern = this.textPatterns.simpleExpression.test(content);
        
        // "Bu durumda x = 3 olur" gibi ifadeleri yakala
        const isSimpleStatement = /^(bu|şu|o|bunun|sonuç|cevap|durumda|halde|değer).*(olur|olacak|oluyor|=|\d+).*$/i.test(content);
        
        return isSimplePattern && (hasTurkishWords || isSimpleStatement);
    }

    /**
     * DÜZELTME: Geliştirilmiş karışık içerik tespiti
     */
    detectMixedContent(content) {
        // DÜZELTME: Daha doğru LaTeX blok tespiti
        const latexBlocks = this.findLatexBlocks(content);
        
        if (!latexBlocks || latexBlocks.length === 0) {
            return { isMixed: false, hasLatexBlocks: false };
        }
        
        // LaTeX bloklarını geçici olarak kaldır
        let contentWithoutLatex = content;
        latexBlocks.forEach((block, idx) => {
            contentWithoutLatex = contentWithoutLatex.replace(block.content, `__LATEX_BLOCK_${idx}__`);
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
     * DÜZELTME: Geliştirilmiş LaTeX blok finder
     */
    findLatexBlocks(content) {
        const blocks = [];
        
        // $...$ formatını ara
        const dollarMatches = content.matchAll(/\$([^$]+)\$/g);
        for (const match of dollarMatches) {
            blocks.push({
                content: match[0],
                inner: match[1],
                type: 'dollar',
                start: match.index,
                end: match.index + match[0].length
            });
        }
        
        // \(...\) formatını ara
        const parenMatches = content.matchAll(/\\\(([^)]+)\\\)/g);
        for (const match of parenMatches) {
            blocks.push({
                content: match[0],
                inner: match[1],
                type: 'paren',
                start: match.index,
                end: match.index + match[0].length
            });
        }
        
        // $$...$$ formatını ara (display mode)
        const displayMatches = content.matchAll(/\$\$([^$]+)\$\$/g);
        for (const match of displayMatches) {
            blocks.push({
                content: match[0],
                inner: match[1],
                type: 'display',
                start: match.index,
                end: match.index + match[0].length
            });
        }
        
        // Pozisyona göre sırala
        return blocks.sort((a, b) => a.start - b.start);
    }

    /**
     * DÜZELTME: Geliştirilmiş karışık içerik render
     */
    renderMixedContent(content, element, displayMode = false) {
        try {
            const parts = this.splitMixedContentSmart(content);
            element.innerHTML = '';
            
            console.log('Mixed content parts:', parts);
            
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
     * DÜZELTME: Geliştirilmiş karışık içerik ayırma
     */
    splitMixedContentSmart(content) {
        const parts = [];
        const latexBlocks = this.findLatexBlocks(content);
        
        if (latexBlocks.length === 0) {
            // LaTeX blok yok, düz metin
            if (content.trim()) {
                parts.push({ type: 'text', content: content.trim() });
            }
            return parts;
        }
        
        let lastIndex = 0;
        
        for (const block of latexBlocks) {
            // Önceki düz metin parçası
            if (block.start > lastIndex) {
                const textContent = content.slice(lastIndex, block.start).trim();
                if (textContent) {
                    parts.push({ type: 'text', content: textContent });
                }
            }
            
            // LaTeX parçası (temizlenmiş)
            const latexContent = block.inner.trim();
            if (latexContent) {
                parts.push({ type: 'latex', content: latexContent });
            }
            
            lastIndex = block.end;
        }
        
        // Kalan düz metin
        if (lastIndex < content.length) {
            const remainingText = content.slice(lastIndex).trim();
            if (remainingText) {
                parts.push({ type: 'text', content: remainingText });
            }
        }
        
        return parts.filter(part => part.content && part.content.trim());
    }

    /**
     * DÜZELTME: İyileştirilmiş LaTeX render
     */
    renderLatex(content, element, displayMode = false) {
        try {
            if (typeof katex === 'undefined') {
                element.textContent = content;
                return false;
            }
            
            // LaTeX'i temizle
            const cleanedLatex = this.cleanLatex(content);
            
            console.log('Rendering LaTeX:', {
                original: content,
                cleaned: cleanedLatex,
                displayMode: displayMode
            });
            
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
     * Geri kalan fonksiyonlar aynı kalabilir...
     */
    analyzeContent(content) {
        const trimmed = content.trim();

        // 0. BASİT METİN KONTROLÜ
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
        if (hasTurkishChars) confidence -= 0.3;
        
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

    renderMathExpression(content, element, displayMode = false) {
        try {
            const latex = this.convertToLatex(content);
            return this.renderLatex(latex, element, displayMode);
        } catch (error) {
            console.error('Matematiksel ifade render hatası:', error);
            element.textContent = content;
            return false;
        }
    }

    renderPlainText(content, element) {
        element.textContent = content;
        element.classList.add('math-text');
        return true;
    }

    cleanLatex(latex) {
        return latex
            .replace(/^\\\(|\\\)$/g, '')
            .replace(/^\$\$|\$\$$/g, '')
            .replace(/^\$|\$$/g, '')
            .trim();
    }

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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

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
        
        // .smart-content sınıfı olan elementleri render et
        const smartContentElements = container.querySelectorAll('.smart-content');
        smartContentElements.forEach(element => {
            const content = element.getAttribute('data-content') || element.textContent || element.innerHTML;
            if (content) {
                this.render(content, element, displayMode);
            }
        });
    }
}

// Singleton instance
export const mathRenderer = new MathRenderer();