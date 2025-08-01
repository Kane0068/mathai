// =================================================================================
//  MathAi - Gelişmiş Matematiksel İfade Render Modülü
//  MathJax v3 + KaTeX Hybrid Sistem - Türkçe Optimized
// =================================================================================

/**
 * Gelişmiş Hybrid Math Renderer - MathJax v3 & KaTeX
 * Türkçe metin + LaTeX karışık içerik için optimize edilmiş
 */
export class AdvancedMathRenderer {
    constructor() {
        this.mathJaxReady = false;
        this.katexReady = false;
        this.renderQueue = [];
        this.cache = new Map();
        
        // Türkçe metin tanıma patterns
        this.turkishPatterns = {
            words: /\b(değer|değeri|olduğu|olduğuna|göre|için|ile|den|dan|da|de|bu|şu|o|ve|veya|eğer|ise|durumda|durumunda|sonuç|sonucu|cevap|cevabı|problem|problemi|soru|sorusu|çözüm|çözümü|adım|adımı|hesapla|hesaplama|bul|bulma|kaç|kaçtır|nedir|neye|nasıl|kimse|kimde|nerede|ne|neler|hangi|hangisi)\b/gi,
            chars: /[ğüşıöçĞÜŞİÖÇ]/g,
            verbs: /\b(olur|olacak|oluyor|olmuş|gelir|gider|yapar|yapıyor|eder|ediyor|alır|alıyor|verir|veriyor)\b/gi,
            numbers: /\b(bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on|yüz|bin|milyon|birinci|ikinci|üçüncü)\b/gi
        };
        
        // LaTeX complexity patterns
        this.latexComplexity = {
            simple: /^[\s\d\w+\-*/=<>()[\]{}^_.,!?]*$/,
            basicMath: /\\(frac|sqrt|sum|int|lim|log|sin|cos|tan|sec|csc|cot|arcsin|arccos|arctan)\{[^}]*\}/g,
            advanced: /\\(begin|end|usepackage|newcommand|def|DeclareMathOperator|text|mathrm|mathbb|mathcal|mathfrak)/g,
            // GÜNCELLENEN: Daha robust delimiter patterns
            delimiters: /(\$\$[^$]*?\$\$|\$[^$\n]*?\$|\\\([^\\]*?\\\)|\\\[[^\\]*?\\\])/g,
            // YENİ EKLEME: Balanced delimiter check
            dollarSingle: /\$([^$\n]+?)\$/g,
            dollarDouble: /\$\$([^$]+?)\$\$/g,
            parentheses: /\\\(([^\\]+?)\\\)/g,
            brackets: /\\\[([^\\]+?)\\\]/g,
            // YENİ EKLEME: Nested structure detection
            nestedBraces: /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g
        };
        
        this.initializeRenderers();
    }
    
    /**
     * Render sistemlerini başlat
     */
    async initializeRenderers() {
        await this.initializeMathJax();
        this.initializeKaTeX();
        this.processQueue();
    }
    
    /**
     * MathJax v3 başlatma
     */
    async initializeMathJax() {
        if (typeof MathJax !== 'undefined') {
            this.mathJaxReady = true;
            return;
        }
        
        // MathJax v3 konfigürasyonu
        window.MathJax = {
            tex: {
                inlineMath: [['$', '$'], ['\\(', '\\)']],
                displayMath: [['$$', '$$'], ['\\[', '\\]']],
                processEscapes: true,
                processEnvironments: true,
                processRefs: true,
                tags: 'ams',
                macros: {
                    '\\R': '\\mathbb{R}',
                    '\\C': '\\mathbb{C}',
                    '\\N': '\\mathbb{N}',
                    '\\Z': '\\mathbb{Z}',
                    '\\Q': '\\mathbb{Q}',
                    '\\T': '\\text{#1}',
                    '\\tr': '\\text{#1}'
                },
                packages: {
                    '[+]': ['ams', 'newcommand', 'configmacros', 'action', 'unicode']
                }
            },
            svg: {
                fontCache: 'global',
                displayAlign: 'left',
                displayIndent: '0'
            },
            options: {
                ignoreHtmlClass: 'tex2jax_ignore|mathjax_ignore',
                processHtmlClass: 'tex2jax_process|mathjax_process|smart-content',
                enableMenu: true,
                menuOptions: {
                    settings: {
                        assistiveMml: true,
                        collapsible: false,
                        explorer: true
                    }
                }
            },
            startup: {
                ready: () => {
                    console.log('MathJax v3 hazır');
                    this.mathJaxReady = true;
                    MathJax.startup.defaultReady();
                    this.processQueue();
                },
                pageReady: () => {
                    return MathJax.startup.document.state() < MathJax.STATE.READY ? 
                           MathJax.startup.document.ready() : Promise.resolve();
                }
            },
            loader: {
                load: ['[tex]/ams', '[tex]/newcommand', '[tex]/configmacros']
            }
        };
        
        // MathJax v3 script yükle
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
        script.async = true;
        document.head.appendChild(script);
        
        // Promise ile yüklenmesini bekle
        return new Promise((resolve) => {
            script.onload = () => {
                setTimeout(() => {
                    if (this.mathJaxReady) resolve();
                }, 100);
            };
        });
    }
    
    /**
     * KaTeX başlatma kontrolü
     */
    initializeKaTeX() {
        this.katexReady = typeof katex !== 'undefined';
        if (this.katexReady) {
            console.log('KaTeX hazır');
        }
    }
    
    /**
     * Ana render fonksiyonu - Hybrid sistem
     */
    async render(content, element, displayMode = false) {
        if (!content || !element) {
            console.warn('Render: İçerik veya element eksik');
            return false;
        }
        
        // Cache kontrolü
        const cacheKey = `${content}-${displayMode}`;
        if (this.cache.has(cacheKey)) {
            element.innerHTML = this.cache.get(cacheKey);
            return true;
        }
        
        try {
            // İçerik analizi
            const analysis = this.analyzeContentAdvanced(content);
            console.log('Content Analysis:', { content, analysis });
            
            let result = false;
            
            switch (analysis.type) {
                case 'text':
                    result = this.renderPlainText(content, element);
                    break;
                    
                case 'simple_math':
                    // Basit matematik için KaTeX (hızlı)
                    result = await this.renderWithKaTeX(content, element, displayMode);
                    if (!result && this.mathJaxReady) {
                        // KaTeX başarısız olursa MathJax'e fallback
                        result = await this.renderWithMathJax(content, element, displayMode);
                    }
                    break;
                    
                case 'complex_math':
                    // Karmaşık matematik için MathJax (güvenilir)
                    result = await this.renderWithMathJax(content, element, displayMode);
                    break;
                    
                case 'mixed':
                    result = await this.renderMixedContent(content, element, displayMode);
                    break;
                    
                default:
                    // Auto-detection
                    result = await this.renderAuto(content, element, displayMode);
            }
            
            // Başarılı render'ı cache'le
            if (result && element.innerHTML) {
                this.cache.set(cacheKey, element.innerHTML);
            }
            
            return result;
            
        } catch (error) {
            console.error('Render hatası:', error);
            this.renderFallback(content, element, error);
            return false;
        }
    }
    
    /**
     * Gelişmiş içerik analizi - Türkçe optimized
     */
    analyzeContentAdvanced(content) {
        const trimmed = content.trim();
    
        // 1. Boş içerik kontrolü
        if (!trimmed) {
            return { type: 'text', confidence: 0, reason: 'empty' };
        }
        
        // 2. GÜNCELLENEN: Gelişmiş LaTeX delimiter kontrolü
        const latexMatches = trimmed.match(this.latexComplexity.delimiters) || [];
        const hasExplicitLatex = latexMatches.length > 0;
        
        // YENİ EKLEME: Delimiter balance check
        const dollarCount = (trimmed.match(/\$/g) || []).length;
        const parenOpenCount = (trimmed.match(/\\\(/g) || []).length;
        const parenCloseCount = (trimmed.match(/\\\)/g) || []).length;
        const bracketOpenCount = (trimmed.match(/\\\[/g) || []).length;
        const bracketCloseCount = (trimmed.match(/\\\]/g) || []).length;
        
        // YENİ EKLEME: Unbalanced delimiter detection
        const hasUnbalancedDelimiters = (dollarCount % 2 !== 0) || 
                                    (parenOpenCount !== parenCloseCount) || 
                                    (bracketOpenCount !== bracketCloseCount);
        
        // 3. Türkçe metin analizi
        const turkishScores = {
            words: (trimmed.match(this.turkishPatterns.words) || []).length,
            chars: (trimmed.match(this.turkishPatterns.chars) || []).length,
            verbs: (trimmed.match(this.turkishPatterns.verbs) || []).length,
            numbers: (trimmed.match(this.turkishPatterns.numbers) || []).length
        };
        
        const turkishScore = turkishScores.words * 3 + 
                            turkishScores.chars * 2 + 
                            turkishScores.verbs * 2 + 
                            turkishScores.numbers * 1;
        
        const hasTurkishText = turkishScore > 0;
        
        // 4. LaTeX komplekslik analizi
        const hasAdvancedLatex = this.latexComplexity.advanced.test(trimmed);
        const hasBasicMath = this.latexComplexity.basicMath.test(trimmed);
        const isSimpleText = this.latexComplexity.simple.test(trimmed);
        
        // 5. Karar algoritması
        if (hasExplicitLatex && hasTurkishText) {
            return {
                type: 'mixed',
                confidence: 0.95,
                reason: 'explicit_latex_with_turkish',
                details: { latexMatches: latexMatches.length, turkishScore }
            };
        }
        
        if (hasExplicitLatex || hasAdvancedLatex) {
            const complexity = hasAdvancedLatex ? 'complex_math' : 
                              hasBasicMath ? 'simple_math' : 'simple_math';
            return {
                type: complexity,
                confidence: 0.9,
                reason: 'explicit_math',
                details: { hasAdvanced: hasAdvancedLatex, hasBasic: hasBasicMath }
            };
        }
        
        if (hasTurkishText && isSimpleText) {
            return {
                type: 'text',
                confidence: 0.85,
                reason: 'turkish_text',
                details: { turkishScore }
            };
        }
        
        // 6. Basit matematik ifadesi kontrolü
        const mathIndicators = ['+', '-', '*', '/', '=', '<', '>', '^', '_'];
        const hasMathSymbols = mathIndicators.some(symbol => trimmed.includes(symbol));
        
        if (hasMathSymbols && !hasTurkishText) {
            return {
                type: 'simple_math',
                confidence: 0.7,
                reason: 'math_symbols',
                details: { symbols: mathIndicators.filter(s => trimmed.includes(s)) }
            };
        }
        
        // 7. Default: plain text
        return {
            type: 'text',
            confidence: 0.5,
            reason: 'default_text',
            details: { length: trimmed.length }
        };
    }
        /**
     * YENİ EKLEME: Gelişmiş content analysis with context
     */
    analyzeContentWithContext(content) {
        const cleaned = content.trim().replace(/\s+/g, ' ');
        
        // Türkçe metin analizi
        const turkishWords = (cleaned.match(/[a-zA-ZçğıöşüÇĞIİÖŞÜ]+/g) || []).length;
        const totalWords = cleaned.split(/\s+/).filter(word => word.length > 0).length;
        const turkishRatio = totalWords > 0 ? turkishWords / totalWords : 0;
        
        // LaTeX içerik analizi
        const latexMatches = cleaned.match(this.latexComplexity.delimiters) || [];
        const mathSymbolCount = (cleaned.match(/[+\-*/=<>^_{}\\]/g) || []).length;
        
        // Karışık içerik tespiti
        const isMixedContent = turkishRatio > 0.3 && latexMatches.length > 0;
        const isPureTurkish = turkishRatio > 0.8 && latexMatches.length === 0;
        const isPureLatex = turkishRatio < 0.2 && (latexMatches.length > 0 || mathSymbolCount > 2);
        
        return {
            turkishRatio,
            latexCount: latexMatches.length,
            mathSymbolCount,
            isMixedContent,
            isPureTurkish,
            isPureLatex,
            totalWords,
            confidence: this.calculateContextConfidence(turkishRatio, latexMatches.length, mathSymbolCount)
        };
    }

    /**
     * YENİ EKLEME: Context-aware confidence calculation
     */
    calculateContextConfidence(turkishRatio, latexCount, mathSymbolCount) {
        let confidence = 0.5; // Base confidence
        
        // Türkçe içerik güveni
        if (turkishRatio > 0.8) confidence += 0.3;
        else if (turkishRatio > 0.5) confidence += 0.1;
        
        // LaTeX içerik güveni
        if (latexCount > 0) confidence += 0.2;
        if (mathSymbolCount > 2) confidence += 0.1;
        
        // Karışık içerik cezası
        if (turkishRatio > 0.3 && latexCount > 0) confidence -= 0.1;
        
        return Math.min(Math.max(confidence, 0), 1);
    }
    
    /**
     * KaTeX ile render
     */
    async renderWithKaTeX(content, element, displayMode = false) {
        if (!this.katexReady) {
            console.warn('KaTeX hazır değil');
            return false;
        }
        
        try {
            // İçeriği temizle
            const cleanedContent = this.cleanLatexContent(content);
            
            const options = {
                displayMode: displayMode,
                throwOnError: false,
                output: 'html',
                trust: true,
                strict: false,
                macros: {
                    '\\R': '\\mathbb{R}',
                    '\\C': '\\mathbb{C}',
                    '\\N': '\\mathbb{N}',
                    '\\tr': '\\text{#1}'
                }
            };
            
            katex.render(cleanedContent, element, options);
            this.applyStyles(element, displayMode, 'katex');
            
            console.log('KaTeX render başarılı:', cleanedContent);
            return true;
            
        } catch (error) {
            console.warn('KaTeX render hatası:', error.message);
            element.classList.add('katex-error');
            return false;
        }
    }
    
    /**
     * MathJax v3 ile render
     */
    async renderWithMathJax(content, element, displayMode = false) {
        if (!this.mathJaxReady) {
            console.warn('MathJax hazır değil, kuyruğa ekleniyor');
            this.addToQueue(content, element, displayMode);
            return false;
        }
        
        try {
            // İçeriği temizle ve hazırla
            const cleanedContent = this.cleanLatexContent(content);
            const mathContent = displayMode ? `\\[${cleanedContent}\\]` : `\\(${cleanedContent}\\)`;
            
            // Geçici element oluştur
            const tempElement = document.createElement('div');
            tempElement.innerHTML = mathContent;
            tempElement.classList.add('mathjax_process');
            
            // Sayfaya ekle (MathJax'in görmesi için)
            document.body.appendChild(tempElement);
            
            // MathJax ile render et
            await MathJax.typesetPromise([tempElement]);
            
            // Sonucu ana element'e kopyala
            element.innerHTML = tempElement.innerHTML;
            
            // Geçici element'i kaldır
            document.body.removeChild(tempElement);
            
            this.applyStyles(element, displayMode, 'mathjax');
            
            console.log('MathJax render başarılı:', cleanedContent);
            return true;
            
        } catch (error) {
            console.error('MathJax render hatası:', error);
            return false;
        }
    }
    
    /**
     * Karışık içerik render (Türkçe + LaTeX)
     */
    async renderMixedContent(content, element, displayMode = false) {
        try {
            const parts = this.splitContentWithStateMachine(content) || this.splitMixedContentSafe(content);

            element.innerHTML = '';
            element.classList.add('mixed-content-container');
            
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const partElement = document.createElement('span');
                
                if (part.type === 'latex') {
                    partElement.className = 'latex-inline-part';
                    
                    // Basit LaTeX için KaTeX, karmaşık için MathJax
                    const isSimple = !this.latexComplexity.advanced.test(part.content);
                    
                    let rendered = false;
                    if (isSimple && this.katexReady) {
                        rendered = await this.renderWithKaTeX(part.content, partElement, false);
                    }
                    
                    if (!rendered && this.mathJaxReady) {
                        rendered = await this.renderWithMathJax(part.content, partElement, false);
                    }
                    
                    if (!rendered) {
                        partElement.textContent = `$${part.content}$`;
                        partElement.classList.add('render-failed');
                    }
                    
                } else {
                    partElement.className = 'text-inline-part';
                    partElement.textContent = part.content;
                }
                
                element.appendChild(partElement);
                
                // Boşluk ekle (son part değilse)
                if (i < parts.length - 1 && part.type === 'latex') {
                    const space = document.createTextNode(' ');
                    element.appendChild(space);
                }
            }
            
            this.applyStyles(element, displayMode, 'mixed');
            console.log('Mixed content render başarılı:', parts.length, 'parça');
            return true;
            
        } catch (error) {
            console.error('Mixed content render hatası:', error);
            return false;
        }
    }
    
    /**
     * Güvenli karışık içerik ayırma
     */
    splitMixedContentSafe(content) {
        const parts = [];
    
        // GÜNCELLENEN: Daha robust ve güvenli regex pattern
        const latexPattern = /(\$\$[^$]*?\$\$|\$[^$\n]*?\$|\\\([^\\]*?\\\)|\\\[[^\\]*?\\\])/g;
        
        let lastIndex = 0;
        let match;
        let iteration = 0;
        const maxIterations = 200; // Artırıldı daha karmaşık içerik için
        
        // YENİ EKLEME: Pre-validation
        const contextAnalysis = this.analyzeContentWithContext(content);
        if (!contextAnalysis.isMixedContent) {
            // Karışık içerik değilse basit işlem
            return [{ type: 'text', content: content }];
        }
        
        while ((match = latexPattern.exec(content)) !== null && iteration < maxIterations) {
            iteration++;
            
            // Önceki metin kısmı
            if (match.index > lastIndex) {
                const textPart = content.slice(lastIndex, match.index);
                if (textPart.trim()) {
                    parts.push({ 
                        type: 'text', 
                        content: textPart,
                        start: lastIndex,
                        end: match.index
                    });
                }
            }
            
            // LaTeX kısmı
            let latexContent = match[1];
            
            // Delimiterleri temizle
            if (latexContent.startsWith('$') && latexContent.endsWith('$')) {
                latexContent = latexContent.slice(1, -1);
            } else if (latexContent.startsWith('\\(') && latexContent.endsWith('\\)')) {
                latexContent = latexContent.slice(2, -2);
            } else if (latexContent.startsWith('\\[') && latexContent.endsWith('\\]')) {
                latexContent = latexContent.slice(2, -2);
            }
            
            if (latexContent.trim()) {
                parts.push({ 
                    type: 'latex', 
                    content: latexContent.trim(),
                    start: match.index,
                    end: match.index + match[0].length
                });
            }
            
            lastIndex = match.index + match[0].length;
        }
        
        // Kalan metin
        if (lastIndex < content.length) {
            const remainingText = content.slice(lastIndex);
            if (remainingText.trim()) {
                parts.push({ 
                    type: 'text', 
                    content: remainingText,
                    start: lastIndex,
                    end: content.length
                });
            }
        }
        
        // Eğer hiç LaTeX bulunmadıysa, tüm içeriği text olarak döndür
        if (parts.length === 0) {
            parts.push({ type: 'text', content: content });
        }
        
        console.log('Split result:', parts);
        return parts;
    }

        /**
     * YENİ EKLEME: State machine based safer content splitting
     */
    splitContentWithStateMachine(content) {
        const parts = [];
        let currentText = '';
        let state = 'TEXT'; // States: TEXT, DOLLAR_SINGLE, DOLLAR_DOUBLE, PAREN, BRACKET
        let latexStart = 0;
        let nestLevel = 0;
        
        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            const nextChar = content[i + 1] || '';
            const prevChar = content[i - 1] || '';
            
            switch (state) {
                case 'TEXT':
                    if (char === '$' && nextChar === '$') {
                        // Double dollar başlangıcı
                        if (currentText.trim()) {
                            parts.push({ type: 'text', content: currentText });
                            currentText = '';
                        }
                        latexStart = i;
                        state = 'DOLLAR_DOUBLE';
                        i++; // Skip next $
                    } else if (char === '$' && prevChar !== '\\') {
                        // Single dollar başlangıcı
                        if (currentText.trim()) {
                            parts.push({ type: 'text', content: currentText });
                            currentText = '';
                        }
                        latexStart = i;
                        state = 'DOLLAR_SINGLE';
                    } else if (char === '\\' && nextChar === '(') {
                        // Parentheses başlangıcı
                        if (currentText.trim()) {
                            parts.push({ type: 'text', content: currentText });
                            currentText = '';
                        }
                        latexStart = i;
                        state = 'PAREN';
                        i++; // Skip (
                    } else if (char === '\\' && nextChar === '[') {
                        // Bracket başlangıcı
                        if (currentText.trim()) {
                            parts.push({ type: 'text', content: currentText });
                            currentText = '';
                        }
                        latexStart = i;
                        state = 'BRACKET';
                        i++; // Skip [
                    } else {
                        currentText += char;
                    }
                    break;
                    
                case 'DOLLAR_SINGLE':
                    if (char === '$' && prevChar !== '\\') {
                        // Single dollar bitişi
                        const latexContent = content.slice(latexStart + 1, i);
                        if (latexContent.trim()) {
                            parts.push({ type: 'latex', content: latexContent });
                        }
                        state = 'TEXT';
                    }
                    break;
                    
                case 'DOLLAR_DOUBLE':
                    if (char === '$' && nextChar === '$' && prevChar !== '\\') {
                        // Double dollar bitişi
                        const latexContent = content.slice(latexStart + 2, i);
                        if (latexContent.trim()) {
                            parts.push({ type: 'latex', content: latexContent });
                        }
                        state = 'TEXT';
                        i++; // Skip next $
                    }
                    break;
                    
                case 'PAREN':
                    if (char === '\\' && nextChar === ')') {
                        // Parentheses bitişi
                        const latexContent = content.slice(latexStart + 2, i);
                        if (latexContent.trim()) {
                            parts.push({ type: 'latex', content: latexContent });
                        }
                        state = 'TEXT';
                        i++; // Skip )
                    }
                    break;
                    
                case 'BRACKET':
                    if (char === '\\' && nextChar === ']') {
                        // Bracket bitişi
                        const latexContent = content.slice(latexStart + 2, i);
                        if (latexContent.trim()) {
                            parts.push({ type: 'latex', content: latexContent });
                        }
                        state = 'TEXT';
                        i++; // Skip ]
                    }
                    break;
            }
        }
        
        // Kalan metin
        if (currentText.trim()) {
            parts.push({ type: 'text', content: currentText });
        }
        
        // Validation
        if (state !== 'TEXT') {
            console.warn('Unfinished LaTeX detected, falling back to original content');
            return [{ type: 'text', content: content }];
        }
        
        return parts.length > 0 ? parts : [{ type: 'text', content: content }];
    }
    
    /**
     * LaTeX içeriğini temizle
     */
    cleanLatexContent(content) {
        if (!content || typeof content !== 'string') return '';
        
        let cleaned = content
            // Dış delimiterleri kaldır
            .replace(/^\$+|\$+$/g, '')
            .replace(/^\\\(|\\\)$/g, '')
            .replace(/^\\\[|\\\]$/g, '')
            .trim();
        
        // Çoklu boşlukları temizle
        cleaned = cleaned.replace(/\s+/g, ' ');
        
        // Türkçe karakterleri koruma
        cleaned = cleaned.replace(/\\text\{([^}]*)\}/g, (match, text) => {
            return `\\text{${text}}`;
        });
        
        return cleaned;
    }
    
    /**
     * Düz metin render
     */
    renderPlainText(content, element) {
        element.textContent = content;
        element.classList.add('math-text', 'plain-text');
        return true;
    }
    
    /**
     * Auto render - akıllı algılama
     */
    async renderAuto(content, element, displayMode = false) {
        // Önce KaTeX ile dene
        if (this.katexReady) {
            const katexResult = await this.renderWithKaTeX(content, element, displayMode);
            if (katexResult) return true;
        }
        
        // KaTeX başarısız olursa MathJax ile dene
        if (this.mathJaxReady) {
            const mathJaxResult = await this.renderWithMathJax(content, element, displayMode);
            if (mathJaxResult) return true;
        }
        
        // Her ikisi de başarısız olursa plain text
        return this.renderPlainText(content, element);
    }
    
    /**
     * Fallback render
     */
    renderFallback(content, element, error) {
        element.innerHTML = `
            <div class="render-error">
                <span class="error-content">${this.escapeHtml(content)}</span>
                <small class="error-message">Render hatası: ${error.message}</small>
            </div>
        `;
        element.classList.add('math-render-error');
    }
    
    /**
     * Stilleri uygula
     */
    applyStyles(element, displayMode, renderer) {
        element.classList.add(`math-rendered`, `rendered-by-${renderer}`);
        
        if (displayMode) {
            element.classList.add('math-display');
            element.style.display = 'block';
            element.style.textAlign = 'center';
            element.style.margin = '1rem auto';
        } else {
            element.classList.add('math-inline');
            element.style.display = 'inline-block';
            element.style.verticalAlign = 'middle';
            element.style.margin = '0 2px';
        }
        
        // Renderer-specific styles
        if (renderer === 'katex') {
            element.style.lineHeight = '1.6';
        } else if (renderer === 'mathjax') {
            element.style.lineHeight = '1.8';
        }
    }
    
    /**
     * Render kuyruğu yönetimi
     */
    addToQueue(content, element, displayMode) {
        this.renderQueue.push({ content, element, displayMode });
    }
    
    async processQueue() {
        if (!this.mathJaxReady || this.renderQueue.length === 0) return;
        
        console.log(`İşleniyor: ${this.renderQueue.length} render görev(ler)i`);
        
        const queue = [...this.renderQueue];
        this.renderQueue = [];
        
        for (const item of queue) {
            await this.render(item.content, item.element, item.displayMode);
        }
    }
    
    /**
     * Container render - toplu işlem
     */
    async renderContainer(container, displayMode = false) {
        if (!container) return;
        
        // data-latex attribute'u olan elementler
        const latexElements = container.querySelectorAll('[data-latex]');
        for (const element of latexElements) {
            const latex = element.getAttribute('data-latex');
            if (latex) {
                await this.render(latex, element, displayMode);
            }
        }
        
        // .smart-content sınıfı olan elementler
        const smartElements = container.querySelectorAll('.smart-content');
        for (const element of smartElements) {
            const content = element.getAttribute('data-content') || 
                           element.textContent || 
                           element.innerHTML;
            if (content) {
                await this.render(content, element, false);
            }
        }
        
        // .latex-content sınıfı olan elementler
        const latexContentElements = container.querySelectorAll('.latex-content');
        for (const element of latexContentElements) {
            const content = element.getAttribute('data-latex') || 
                           element.textContent || 
                           element.innerHTML;
            if (content) {
                await this.render(content, element, displayMode);
            }
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
     * Cache temizleme
     */
    clearCache() {
        this.cache.clear();
        console.log('Render cache temizlendi');
    }
    
    /**
     * Debug bilgileri
     */
    getStats() {
        return {
            mathJaxReady: this.mathJaxReady,
            katexReady: this.katexReady,
            queueLength: this.renderQueue.length,
            cacheSize: this.cache.size
        };
    }
}

// Singleton instance oluştur
export const advancedMathRenderer = new AdvancedMathRenderer();

// Backward compatibility için eski interface
export const mathRenderer = {
    render: (content, element, displayMode) => advancedMathRenderer.render(content, element, displayMode),
    renderContainer: (container, displayMode) => advancedMathRenderer.renderContainer(container, displayMode),
    isSimpleText: (content) => {
        const analysis = advancedMathRenderer.analyzeContentAdvanced(content);
        return analysis.type === 'text';
    }
};

// Global erişim için
window.advancedMathRenderer = advancedMathRenderer;