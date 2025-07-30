// =================================================================================
//  MathAi - Enhanced Math Renderer - Error-Free System
//  Advanced Turkish + LaTeX Mixed Content Rendering System
// =================================================================================

/**
 * Enhanced Math Renderer - Next Generation System
 * Designed specifically for Turkish math problem-solving applications
 * Handles mixed content (Turkish text + LaTeX) with advanced error recovery
 */
export class EnhancedMathRenderer {
    constructor() {
        // Rendering engines status
        this.engines = {
            mathJax: { ready: false, loading: false },
            katex: { ready: false, loading: false }
        };
        
        // Enhanced caching system
        this.cache = new Map();
        this.cacheStats = { hits: 0, misses: 0 };
        
        // Render queue and processing
        this.renderQueue = [];
        this.processingQueue = false;
        this.maxConcurrentRenders = 3;
        
        // Error tracking and recovery
        this.errorCount = 0;
        this.maxErrors = 10;
        this.errorHistory = [];
        
        // Turkish language patterns - Enhanced
        this.turkishPatterns = {
            // Common Turkish mathematical terms
            mathTerms: /\b(değer|sonuç|cevap|çözüm|hesap|toplam|fark|çarpım|bölüm|kök|üs|derece|açı|uzunluk|yükseklik|alan|hacim|çevre|çap|yarıçap|taban|yüzey)\b/gi,
            
            // Turkish verbs in math contexts
            mathVerbs: /\b(hesapla|bul|çöz|belirle|göster|ispat|kanıtla|olsun|olur|verir|eder|yapar|alır|çıkar|koyar|yerleştir)\b/gi,
            
            // Question words and connectors
            questionWords: /\b(kaç|kaçtır|nedir|neye|nasıl|hangi|hangisi|nerede|ne|niçin|neden|kim|kime|kimin)\b/gi,
            
            // Turkish characters
            turkishChars: /[ğüşıöçĞÜŞİÖÇ]/g,
            
            // Mathematical expressions in Turkish
            expressions: /\b(eşittir|eşitse|büyük|küçük|maksimum|minimum|pozitif|negatif|sıfır|sonsuz|yaklaşık|tam|kesir|ondalık)\b/gi
        };
        
        // LaTeX patterns - Enhanced detection
        this.latexPatterns = {
            // Explicit delimiters
            delimiters: /(\$\$[^$]*\$\$|\$[^$]*\$|\\\[[^\]]*\\\]|\\\([^)]*\\\))/g,
            
            // LaTeX commands
            commands: /\\(frac|sqrt|sum|int|lim|log|sin|cos|tan|sec|csc|cot|arcsin|arccos|arctan|alpha|beta|gamma|delta|theta|pi|sigma|infty|cdot|times|div|pm|neq|leq|geq|approx|equiv|subset|superset|cup|cap|emptyset|in|notin|forall|exists|nabla|partial|vec|hat|bar|tilde|dot|ddot|prime|mathbb|mathcal|mathfrak|mathrm|text|left|right|big|Big|bigg|Bigg)\b/g,
            
            // Superscripts and subscripts
            scripts: /[_^]\{[^}]*\}|[_^][a-zA-Z0-9]/g,
            
            // Mathematical operators and symbols
            operators: /[+\-*/=<>≤≥≠≈∞∑∫√∂∇±×÷]/g,
            
            // Brackets and parentheses patterns
            brackets: /[\[\]{}()]/g,
            
            // Complex structures
            complex: /\\(begin|end)\{[^}]*\}|\\(array|matrix|pmatrix|bmatrix|vmatrix)\{[^}]*\}/g
        };
        
        // Content analysis scoring
        this.scoringWeights = {
            turkishTerms: 3,
            turkishChars: 2,
            mathTerms: 4,
            latexCommands: 5,
            delimiters: 6,
            complexity: 3
        };
        
        this.initializeSystem();
    }
    
    /**
     * Initialize the rendering system
     */
    async initializeSystem() {
        console.log('🚀 Enhanced Math Renderer başlatılıyor...');
        
        try {
            // Initialize both rendering engines in parallel
            await Promise.all([
                this.initializeMathJax(),
                this.initializeKaTeX()
            ]);
            
            // Start processing any queued renders
            this.startQueueProcessor();
            
            console.log('✅ Enhanced Math Renderer hazır', {
                mathJax: this.engines.mathJax.ready,
                katex: this.engines.katex.ready
            });
            
        } catch (error) {
            console.error('❌ Enhanced Math Renderer başlatma hatası:', error);
            this.handleSystemError(error);
        }
    }
    
    /**
     * Initialize MathJax v3 with enhanced configuration
     */
    async initializeMathJax() {
        if (window.MathJax && this.engines.mathJax.ready) {
            return true;
        }
        
        if (this.engines.mathJax.loading) {
            return this.waitForMathJax();
        }
        
        this.engines.mathJax.loading = true;
        
        try {
            // Advanced MathJax configuration
            window.MathJax = {
                tex: {
                    inlineMath: [['$', '$'], ['\\(', '\\)']],
                    displayMath: [['$$', '$$'], ['\\[', '\\]']],
                    processEscapes: true,
                    processEnvironments: true,
                    processRefs: true,
                    tags: 'ams',
                    macros: {
                        // Turkish specific macros
                        '\\R': '\\mathbb{R}',
                        '\\C': '\\mathbb{C}',
                        '\\N': '\\mathbb{N}',
                        '\\Z': '\\mathbb{Z}',
                        '\\Q': '\\mathbb{Q}',
                        '\\tr': '\\text{#1}',
                        '\\turkce': '\\text{#1}',
                        // Common Turkish math expressions
                        '\\esittir': '=',
                        '\\yaklaşık': '\\approx',
                        '\\sonsuz': '\\infty'
                    },
                    packages: ['base', 'ams', 'newcommand', 'configmacros', 'action', 'unicode']
                },
                svg: {
                    fontCache: 'global',
                    displayAlign: 'left',
                    displayIndent: '0',
                    scale: 1.1,
                    minScale: 0.8,
                    mtextInheritFont: true
                },
                chtml: {
                    scale: 1.1,
                    minScale: 0.8,
                    mtextInheritFont: true
                },
                options: {
                    ignoreHtmlClass: 'tex2jax_ignore|no-math',
                    processHtmlClass: 'math-content|smart-content|latex-content',
                    enableMenu: true,
                    menuOptions: {
                        settings: {
                            assistiveMml: true,
                            collapsible: false,
                            explorer: true
                        }
                    },
                    // Enhanced error handling
                    renderActions: {
                        find: [10, (doc) => {
                            for (const math of doc.math) {
                                try {
                                    if (math.inputText && this.isProblematicExpression(math.inputText)) {
                                        math.inputText = this.sanitizeMathExpression(math.inputText);
                                    }
                                } catch (err) {
                                    console.warn('MathJax preprocessing error:', err);
                                }
                            }
                        }]
                    }
                },
                startup: {
                    ready: () => {
                        console.log('🎯 MathJax v3 yüklendi ve hazır');
                        this.engines.mathJax.ready = true;
                        this.engines.mathJax.loading = false;
                        MathJax.startup.defaultReady();
                        this.processQueuedRenders();
                    },
                    pageReady: () => {
                        // Wait for MathJax to be fully available
                        if (!window.MathJax || !window.MathJax.STATE) {
                            // Return a promise that resolves when MathJax is ready
                            return new Promise((resolve) => {
                                const checkMathJax = () => {
                                    if (window.MathJax && window.MathJax.STATE && window.MathJax.startup && window.MathJax.startup.document) {
                                        const state = window.MathJax.startup.document.state();
                                        if (state < window.MathJax.STATE.READY) {
                                            window.MathJax.startup.document.ready().then(resolve);
                                        } else {
                                            resolve();
                                        }
                                    } else {
                                        setTimeout(checkMathJax, 10);
                                    }
                                };
                                checkMathJax();
                            });
                        }
                        return MathJax.startup.document.state() < MathJax.STATE.READY ? 
                               MathJax.startup.document.ready() : Promise.resolve();
                    }
                },
                loader: {
                    load: ['[tex]/ams', '[tex]/newcommand', '[tex]/configmacros', '[tex]/unicode']
                }
            };
            
            // Load MathJax script
            if (!document.querySelector('script[src*="mathjax"]')) {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
                script.async = true;
                script.onerror = () => {
                    console.error('MathJax yükleme hatası');
                    this.engines.mathJax.loading = false;
                };
                document.head.appendChild(script);
            }
            
            return this.waitForMathJax();
            
        } catch (error) {
            console.error('MathJax başlatma hatası:', error);
            this.engines.mathJax.loading = false;
            return false;
        }
    }
    
    /**
     * Wait for MathJax to be ready
     */
    async waitForMathJax(timeout = 10000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (this.engines.mathJax.ready) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.warn('MathJax timeout - continuing without it');
        return false;
    }
    
    /**
     * Initialize KaTeX with error handling
     */
    async initializeKaTeX() {
        try {
            if (window.katex) {
                this.engines.katex.ready = true;
                console.log('✅ KaTeX zaten yüklü ve hazır');
                return true;
            }
            
            // Try to load KaTeX if not already loaded
            if (!document.querySelector('script[src*="katex"]')) {
                const cssLink = document.createElement('link');
                cssLink.rel = 'stylesheet';
                cssLink.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
                document.head.appendChild(cssLink);
                
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js';
                script.onload = () => {
                    this.engines.katex.ready = true;
                    console.log('✅ KaTeX yüklendi ve hazır');
                };
                script.onerror = () => {
                    console.warn('KaTeX yüklenemedi - sadece MathJax kullanılacak');
                };
                document.head.appendChild(script);
                
                // Wait a bit for KaTeX to load
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
        } catch (error) {
            console.warn('KaTeX başlatma hatası:', error);
        }
        
        return this.engines.katex.ready;
    }
    
    /**
     * Main render function with enhanced error handling
     */
    async render(content, element, options = {}) {
        const renderOptions = {
            displayMode: false,
            priority: 'normal',
            maxRetries: 3,
            timeout: 30000,
            fallbackToText: true,
            ...options
        };
        
        // Validate inputs
        if (!this.validateRenderInputs(content, element)) {
            return false;
        }
        
        // Generate cache key
        const cacheKey = this.generateCacheKey(content, renderOptions);
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            this.cacheStats.hits++;
            element.innerHTML = this.cache.get(cacheKey);
            this.applyEnhancedStyles(element, renderOptions);
            return true;
        }
        
        this.cacheStats.misses++;
        
        try {
            // Analyze content for optimal rendering strategy
            const analysis = this.analyzeContentAdvanced(content);
            console.log('📊 Content Analysis:', analysis);
            
            // Choose rendering strategy based on analysis
            let renderResult = false;
            
            switch (analysis.strategy) {
                case 'pure_text':
                    renderResult = this.renderPureText(content, element, renderOptions);
                    break;
                    
                case 'simple_math':
                    renderResult = await this.renderSimpleMath(content, element, renderOptions);
                    break;
                    
                case 'complex_math':
                    renderResult = await this.renderComplexMath(content, element, renderOptions);
                    break;
                    
                case 'mixed_content':
                    renderResult = await this.renderMixedContent(content, element, renderOptions);
                    break;
                    
                default:
                    renderResult = await this.renderAuto(content, element, renderOptions);
            }
            
            // Cache successful renders
            if (renderResult && element.innerHTML) {
                this.cache.set(cacheKey, element.innerHTML);
                this.maintainCacheSize();
            }
            
            // Apply enhanced styling
            if (renderResult) {
                this.applyEnhancedStyles(element, renderOptions);
            }
            
            return renderResult;
            
        } catch (error) {
            console.error('🚨 Render Error:', error);
            this.trackError(error, content);
            
            if (renderOptions.fallbackToText) {
                return this.renderFallback(content, element, error);
            }
            
            return false;
        }
    }
    
    /**
     * Advanced content analysis with Turkish optimization
     */
    analyzeContentAdvanced(content) {
        if (!content || typeof content !== 'string') {
            return { strategy: 'pure_text', confidence: 0, details: { reason: 'invalid_input' } };
        }
        
        const trimmed = content.trim();
        const analysis = {
            length: trimmed.length,
            turkish: this.analyzeTurkishContent(trimmed),
            latex: this.analyzeLatexContent(trimmed),
            mixed: false,
            complexity: 0,
            strategy: 'pure_text',
            confidence: 0,
            details: {}
        };
        
        // Calculate complexity score
        analysis.complexity = this.calculateComplexityScore(analysis.turkish, analysis.latex);
        
        // Determine if content is mixed
        analysis.mixed = analysis.turkish.score > 0 && analysis.latex.score > 0;
        
        // Determine optimal rendering strategy
        if (analysis.mixed) {
            analysis.strategy = 'mixed_content';
            analysis.confidence = 0.9;
            analysis.details.reason = 'turkish_latex_mixed';
        } else if (analysis.latex.score > 10) {
            analysis.strategy = analysis.latex.complexity > 5 ? 'complex_math' : 'simple_math';
            analysis.confidence = 0.85;
            analysis.details.reason = 'latex_dominant';
        } else if (analysis.turkish.score > 5) {
            analysis.strategy = 'pure_text';
            analysis.confidence = 0.8;
            analysis.details.reason = 'turkish_dominant';
        } else {
            analysis.strategy = 'simple_math';
            analysis.confidence = 0.6;
            analysis.details.reason = 'auto_detect';
        }
        
        return analysis;
    }
    
    /**
     * Analyze Turkish content patterns
     */
    analyzeTurkishContent(content) {
        const matches = {
            mathTerms: (content.match(this.turkishPatterns.mathTerms) || []).length,
            mathVerbs: (content.match(this.turkishPatterns.mathVerbs) || []).length,
            questionWords: (content.match(this.turkishPatterns.questionWords) || []).length,
            turkishChars: (content.match(this.turkishPatterns.turkishChars) || []).length,
            expressions: (content.match(this.turkishPatterns.expressions) || []).length
        };
        
        const score = matches.mathTerms * this.scoringWeights.mathTerms +
                     matches.mathVerbs * 2 +
                     matches.questionWords * 2 +
                     matches.turkishChars * this.scoringWeights.turkishChars +
                     matches.expressions * 3;
        
        return {
            score,
            matches,
            hasTurkish: score > 0,
            density: content.length > 0 ? score / content.length : 0
        };
    }
    
    /**
     * Analyze LaTeX content patterns
     */
    analyzeLatexContent(content) {
        const matches = {
            delimiters: (content.match(this.latexPatterns.delimiters) || []).length,
            commands: (content.match(this.latexPatterns.commands) || []).length,
            scripts: (content.match(this.latexPatterns.scripts) || []).length,
            operators: (content.match(this.latexPatterns.operators) || []).length,
            brackets: (content.match(this.latexPatterns.brackets) || []).length,
            complex: (content.match(this.latexPatterns.complex) || []).length
        };
        
        const score = matches.delimiters * this.scoringWeights.delimiters +
                     matches.commands * this.scoringWeights.latexCommands +
                     matches.scripts * 2 +
                     matches.operators * 1 +
                     matches.brackets * 1 +
                     matches.complex * 4;
        
        const complexity = matches.complex * 3 + matches.commands + matches.scripts;
        
        return {
            score,
            matches,
            complexity,
            hasLatex: score > 0,
            density: content.length > 0 ? score / content.length : 0
        };
    }
    
    /**
     * Calculate overall complexity score
     */
    calculateComplexityScore(turkishAnalysis, latexAnalysis) {
        return turkishAnalysis.score * 0.3 + latexAnalysis.score * 0.7 + latexAnalysis.complexity;
    }
    
    /**
     * Render mixed Turkish + LaTeX content
     */
    async renderMixedContent(content, element, options) {
        try {
            console.log('🔄 Mixed content rendering başlıyor:', content);
            
            // Split content into parts
            const parts = this.splitMixedContentEnhanced(content);
            console.log('📝 Content parts:', parts);
            
            // Clear element and prepare
            element.innerHTML = '';
            element.className = 'mixed-content-container';
            
            // Render each part
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const partElement = document.createElement('span');
                
                if (part.type === 'latex') {
                    partElement.className = 'latex-part';
                    const success = await this.renderLatexPart(part.content, partElement, options);
                    if (!success) {
                        partElement.textContent = `$${part.content}$`;
                        partElement.className += ' render-failed';
                    }
                } else {
                    partElement.className = 'text-part';
                    partElement.textContent = part.content;
                }
                
                element.appendChild(partElement);
                
                // Add spacing between parts if needed
                if (i < parts.length - 1 && this.needsSpacing(parts[i], parts[i + 1])) {
                    element.appendChild(document.createTextNode(' '));
                }
            }
            
            console.log('✅ Mixed content rendering tamamlandı');
            return true;
            
        } catch (error) {
            console.error('❌ Mixed content rendering hatası:', error);
            return false;
        }
    }
    
    /**
     * Enhanced mixed content splitting with better error handling
     */
    splitMixedContentEnhanced(content) {
        const parts = [];
        let position = 0;
        
        // Enhanced regex for LaTeX detection
        const latexRegex = /(\$\$[^$]*\$\$|\$[^$]*\$|\\\[[^\]]*\\\]|\\\([^)]*\\\))/g;
        let match;
        let iterations = 0;
        const maxIterations = 1000; // Prevent infinite loops
        
        while ((match = latexRegex.exec(content)) !== null && iterations < maxIterations) {
            iterations++;
            
            // Add text before LaTeX
            if (match.index > position) {
                const textContent = content.slice(position, match.index);
                if (textContent.trim()) {
                    parts.push({
                        type: 'text',
                        content: textContent,
                        start: position,
                        end: match.index
                    });
                }
            }
            
            // Add LaTeX part
            const latexContent = this.cleanLatexDelimiters(match[0]);
            if (latexContent.trim()) {
                parts.push({
                    type: 'latex',
                    content: latexContent,
                    original: match[0],
                    start: match.index,
                    end: match.index + match[0].length
                });
            }
            
            position = match.index + match[0].length;
        }
        
        // Add remaining text
        if (position < content.length) {
            const remainingText = content.slice(position);
            if (remainingText.trim()) {
                parts.push({
                    type: 'text',
                    content: remainingText,
                    start: position,
                    end: content.length
                });
            }
        }
        
        // If no LaTeX found, treat as pure text
        if (parts.length === 0) {
            parts.push({ type: 'text', content: content });
        }
        
        return parts;
    }
    
    /**
     * Clean LaTeX delimiters safely
     */
    cleanLatexDelimiters(latex) {
        if (!latex || typeof latex !== 'string') return '';
        
        let cleaned = latex.trim();
        
        // Remove outer delimiters
        if (cleaned.startsWith('$$') && cleaned.endsWith('$$')) {
            cleaned = cleaned.slice(2, -2);
        } else if (cleaned.startsWith('$') && cleaned.endsWith('$')) {
            cleaned = cleaned.slice(1, -1);
        } else if (cleaned.startsWith('\\[') && cleaned.endsWith('\\]')) {
            cleaned = cleaned.slice(2, -2);
        } else if (cleaned.startsWith('\\(') && cleaned.endsWith('\\)')) {
            cleaned = cleaned.slice(2, -2);
        }
        
        return cleaned.trim();
    }
    
    /**
     * Render LaTeX part with fallback
     */
    async renderLatexPart(content, element, options) {
        // Try KaTeX first for simple expressions (faster)
        if (this.engines.katex.ready && this.isSimpleLatex(content)) {
            try {
                window.katex.render(content, element, {
                    displayMode: false,
                    throwOnError: false,
                    strict: false,
                    output: "html",
                    macros: {
                        "\\R": "\\mathbb{R}",
                        "\\C": "\\mathbb{C}",
                        "\\N": "\\mathbb{N}",
                        "\\tr": "\\text{#1}"
                    }
                });
                return true;
            } catch (error) {
                console.warn('KaTeX render failed, trying MathJax:', error);
            }
        }
        
        // Fallback to MathJax
        if (this.engines.mathJax.ready) {
            try {
                const mathContent = `\\(${content}\\)`;
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = mathContent;
                tempDiv.style.display = 'inline';
                
                document.body.appendChild(tempDiv);
                await window.MathJax.typesetPromise([tempDiv]);
                
                element.innerHTML = tempDiv.innerHTML;
                document.body.removeChild(tempDiv);
                
                return true;
            } catch (error) {
                console.warn('MathJax render failed:', error);
            }
        }
        
        return false;
    }
    
    /**
     * Check if LaTeX expression is simple enough for KaTeX
     */
    isSimpleLatex(content) {
        const complexPatterns = [
            /\\begin|\\end/,
            /\\array|\\matrix/,
            /\\newcommand|\\def/,
            /\\text\{[^}]*\\[^}]*\}/  // Text with nested LaTeX
        ];
        
        return !complexPatterns.some(pattern => pattern.test(content));
    }
    
    /**
     * Determine if spacing is needed between parts
     */
    needsSpacing(currentPart, nextPart) {
        // Add space after LaTeX parts, before text
        if (currentPart.type === 'latex' && nextPart.type === 'text') {
            return !nextPart.content.startsWith(' ');
        }
        
        // Add space after text, before LaTeX
        if (currentPart.type === 'text' && nextPart.type === 'latex') {
            return !currentPart.content.endsWith(' ');
        }
        
        return false;
    }
    
    /**
     * Render pure text content
     */
    renderPureText(content, element, options) {
        element.textContent = content;
        element.className = 'pure-text-content';
        return true;
    }
    
    /**
     * Render simple math expressions
     */
    async renderSimpleMath(content, element, options) {
        // Try KaTeX first (faster for simple expressions)
        if (this.engines.katex.ready) {
            try {
                const cleanContent = this.cleanLatexDelimiters(content);
                window.katex.render(cleanContent, element, {
                    displayMode: options.displayMode || false,
                    throwOnError: false,
                    strict: false,
                    output: "html"
                });
                return true;
            } catch (error) {
                console.warn('KaTeX simple render failed:', error);
            }
        }
        
        // Fallback to MathJax
        return await this.renderComplexMath(content, element, options);
    }
    
    /**
     * Render complex math expressions
     */
    async renderComplexMath(content, element, options) {
        if (!this.engines.mathJax.ready) {
            console.warn('MathJax not ready for complex math');
            return false;
        }
        
        try {
            const cleanContent = this.cleanLatexDelimiters(content);
            const mathContent = options.displayMode ? 
                               `\\[${cleanContent}\\]` : 
                               `\\(${cleanContent}\\)`;
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = mathContent;
            
            document.body.appendChild(tempDiv);
            await window.MathJax.typesetPromise([tempDiv]);
            
            element.innerHTML = tempDiv.innerHTML;
            document.body.removeChild(tempDiv);
            
            return true;
            
        } catch (error) {
            console.error('Complex math render failed:', error);
            return false;
        }
    }
    
    /**
     * Auto-detect and render content
     */
    async renderAuto(content, element, options) {
        // Try different strategies in order
        const strategies = ['renderSimpleMath', 'renderComplexMath', 'renderMixedContent'];
        
        for (const strategy of strategies) {
            try {
                const result = await this[strategy](content, element, options);
                if (result) return true;
            } catch (error) {
                console.warn(`Auto render strategy ${strategy} failed:`, error);
            }
        }
        
        // Final fallback to text
        return this.renderPureText(content, element, options);
    }
    
    /**
     * Enhanced styling application
     */
    applyEnhancedStyles(element, options) {
        element.classList.add('enhanced-math-content');
        
        if (options.displayMode) {
            element.classList.add('display-mode');
            element.style.display = 'block';
            element.style.textAlign = 'center';
            element.style.margin = '1rem auto';
        } else {
            element.classList.add('inline-mode');
            element.style.display = 'inline-block';
            element.style.verticalAlign = 'middle';
        }
        
        // Turkish text optimization
        element.style.lineHeight = '1.6';
        element.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, sans-serif';
    }
    
    /**
     * Enhanced error tracking
     */
    trackError(error, content) {
        this.errorCount++;
        this.errorHistory.push({
            error: error.message,
            content: content.substring(0, 100),
            timestamp: Date.now(),
            stack: error.stack
        });
        
        // Keep only recent errors
        if (this.errorHistory.length > 50) {
            this.errorHistory = this.errorHistory.slice(-50);
        }
        
        // System health check
        if (this.errorCount > this.maxErrors) {
            console.warn('🚨 Too many render errors, system may need reset');
        }
    }
    
    /**
     * Input validation
     */
    validateRenderInputs(content, element) {
        if (!content || typeof content !== 'string') {
            console.warn('Invalid content provided to render');
            return false;
        }
        
        if (!element || !element.nodeType) {
            console.warn('Invalid element provided to render');
            return false;
        }
        
        return true;
    }
    
    /**
     * Generate cache key
     */
    generateCacheKey(content, options) {
        const optionsString = JSON.stringify(options);
        return `${content.length}_${optionsString}_${content.substring(0, 50)}`;
    }
    
    /**
     * Maintain cache size
     */
    maintainCacheSize() {
        const maxCacheSize = 200;
        if (this.cache.size > maxCacheSize) {
            // Remove oldest entries
            const keysToDelete = Array.from(this.cache.keys()).slice(0, 50);
            keysToDelete.forEach(key => this.cache.delete(key));
        }
    }
    
    /**
     * Render fallback with error info
     */
    renderFallback(content, element, error) {
        element.innerHTML = `
            <div class="render-fallback">
                <span class="fallback-content">${this.escapeHtml(content)}</span>
                <small class="error-info" title="${error.message}">⚠️</small>
            </div>
        `;
        element.classList.add('render-error');
        return true;
    }
    
    /**
     * Container-wide rendering
     */
    async renderContainer(container, options = {}) {
        if (!container) return false;
        
        const elements = container.querySelectorAll('[data-latex], .smart-content, .math-content');
        const renderPromises = [];
        
        for (const element of elements) {
            const content = element.getAttribute('data-latex') || 
                           element.getAttribute('data-content') ||
                           element.textContent;
                           
            if (content) {
                renderPromises.push(this.render(content, element, options));
            }
        }
        
        const results = await Promise.allSettled(renderPromises);
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
        
        console.log(`Container render completed: ${successCount}/${results.length} successful`);
        return successCount > 0;
    }
    
    /**
     * Queue management
     */
    startQueueProcessor() {
        if (this.processingQueue) return;
        
        this.processingQueue = true;
        this.processQueueInterval = setInterval(() => {
            this.processRenderQueue();
        }, 100);
    }
    
    async processRenderQueue() {
        if (this.renderQueue.length === 0) return;
        
        const batch = this.renderQueue.splice(0, this.maxConcurrentRenders);
        const promises = batch.map(item => 
            this.render(item.content, item.element, item.options)
        );
        
        await Promise.allSettled(promises);
    }
    
    processQueuedRenders() {
        if (this.renderQueue.length > 0) {
            console.log(`Processing ${this.renderQueue.length} queued renders`);
            this.processRenderQueue();
        }
    }
    
    /**
     * Utility functions
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    isProblematicExpression(content) {
        const problematicPatterns = [
            /\\undefined/g,
            /\\error/g,
            /\{\}/g,  // Empty braces
            /\$\$/g   // Empty delimiters
        ];
        
        return problematicPatterns.some(pattern => pattern.test(content));
    }
    
    sanitizeMathExpression(content) {
        return content
            .replace(/\\undefined/g, '')
            .replace(/\\error/g, '')
            .replace(/\{\s*\}/g, '')
            .replace(/\$\s*\$/g, '');
    }
    
    /**
     * System diagnostics
     */
    getSystemStats() {
        return {
            engines: this.engines,
            cache: {
                size: this.cache.size,
                hits: this.cacheStats.hits,
                misses: this.cacheStats.misses,
                hitRate: this.cacheStats.hits + this.cacheStats.misses > 0 ?
                        (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(2) + '%' : '0%'
            },
            errors: {
                count: this.errorCount,
                recent: this.errorHistory.slice(-5)
            },
            queue: {
                length: this.renderQueue.length,
                processing: this.processingQueue
            }
        };
    }
    
    /**
     * Reset system
     */
    reset() {
        this.cache.clear();
        this.cacheStats = { hits: 0, misses: 0 };
        this.renderQueue = [];
        this.errorCount = 0;
        this.errorHistory = [];
        
        console.log('🔄 Enhanced Math Renderer reset completed');
    }
}

// Create singleton instance
export const enhancedMathRenderer = new EnhancedMathRenderer();

// Global access for debugging
window.enhancedMathRenderer = enhancedMathRenderer;

// Backward compatibility
export const mathRenderer = {
    render: (content, element, displayMode) => 
        enhancedMathRenderer.render(content, element, { displayMode }),
    renderContainer: (container, displayMode) => 
        enhancedMathRenderer.renderContainer(container, { displayMode }),
    getStats: () => enhancedMathRenderer.getSystemStats()
};