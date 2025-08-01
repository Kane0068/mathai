// www/js/modules/advancedMathRenderer.js
// Complete Advanced Math Renderer with Comprehensive Fallback System

import { simpleMathRenderer } from '../services/SimpleMathRenderer.js';

export class AdvancedMathRenderer {
    constructor() {
        this.mathJaxReady = false;
        this.katexReady = false;
        this.initialized = false;
        this.fallbackMode = false;
        this.renderMode = 'unknown'; // 'mathjax', 'katex', 'simple'
        this.initializationAttempts = 0;
        this.maxInitAttempts = 3;
        
        // Initialize fallback renderer immediately
        this.fallbackRenderer = simpleMathRenderer;
        
        // Configuration
        this.config = {
            mathJaxTimeout: 15000,
            katexTimeout: 10000,
            enableDebugLogs: true
        };
    }

    /**
     * Initialize the math renderer with comprehensive error handling
     */
    async init() {
        if (this.initialized) return true;

        this.initializationAttempts++;
        this.log('🔧 Initializing AdvancedMathRenderer...', `Attempt ${this.initializationAttempts}/${this.maxInitAttempts}`);

        try {
            // Try KaTeX first (faster and more reliable)
            if (await this.tryInitKaTeX()) {
                this.renderMode = 'katex';
                this.log('✅ KaTeX render mode active');
            }
            // Then try MathJax
            else if (await this.tryInitMathJax()) {
                this.renderMode = 'mathjax';
                this.log('✅ MathJax render mode active');
            }
            // Fall back to simple renderer
            else {
                this.renderMode = 'simple';
                this.fallbackMode = true;
                this.log('⚠️ Using simple math renderer (fallback mode)');
            }

            this.initialized = true;
            return true;

        } catch (error) {
            this.log('❌ AdvancedMathRenderer initialization failed:', error);
            
            if (this.initializationAttempts < this.maxInitAttempts) {
                this.log(`🔄 Retrying initialization... (${this.initializationAttempts}/${this.maxInitAttempts})`);
                await this.delay(1000);
                return await this.init();
            }
            
            // Final fallback
            this.renderMode = 'simple';
            this.fallbackMode = true;
            this.initialized = true;
            this.log('🆘 Using simple renderer as final fallback');
            return true;
        }
    }

    /**
     * Try to initialize KaTeX
     */
    async tryInitKaTeX() {
        try {
            this.log('🔍 Checking KaTeX availability...');
            
            // Check if KaTeX is already available
            if (typeof window.katex !== 'undefined') {
                this.katexReady = true;
                this.log('✅ KaTeX already loaded');
                return true;
            }

            // Try to load KaTeX CSS
            if (!document.querySelector('link[href*="katex"]')) {
                const katexCSS = document.createElement('link');
                katexCSS.rel = 'stylesheet';
                katexCSS.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
                katexCSS.crossOrigin = 'anonymous';
                document.head.appendChild(katexCSS);
                this.log('📄 KaTeX CSS loaded');
            }

            // Try to load KaTeX JS
            if (!document.querySelector('script[src*="katex"]')) {
                await this.loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js');
                this.log('📄 KaTeX JS loaded');
            }

            // Try to load KaTeX auto-render extension
            if (!document.querySelector('script[src*="auto-render"]')) {
                try {
                    await this.loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js');
                    this.log('📄 KaTeX auto-render loaded');
                } catch (e) {
                    this.log('⚠️ KaTeX auto-render failed to load (non-critical)');
                }
            }

            // Verify KaTeX loaded successfully
            await this.delay(500); // Give it time to initialize
            this.katexReady = typeof window.katex !== 'undefined';
            
            if (this.katexReady) {
                this.log('✅ KaTeX initialization successful');
                return true;
            } else {
                this.log('❌ KaTeX failed to initialize');
                return false;
            }

        } catch (error) {
            this.log('⚠️ KaTeX initialization failed:', error);
            return false;
        }
    }

    /**
     * Try to initialize MathJax
     */
    async tryInitMathJax() {
        try {
            this.log('🔍 Checking MathJax availability...');
            
            // Check if MathJax is available and ready
            if (window.MathJax && this.isMathJaxReady()) {
                this.mathJaxReady = true;
                this.log('✅ MathJax already loaded and ready');
                return true;
            }

            // Configure MathJax before loading
            this.configureMathJax();

            // Load MathJax
            await this.loadMathJaxScript();
            
            return this.mathJaxReady;

        } catch (error) {
            this.log('⚠️ MathJax initialization failed:', error);
            return false;
        }
    }

    /**
     * Configure MathJax before loading
     */
    configureMathJax() {
        window.MathJax = {
            tex: {
                inlineMath: [['$', '$'], ['\\(', '\\)']],
                displayMath: [['$$', '$$'], ['\\[', '\\]']],
                processEscapes: true,
                processEnvironments: true,
                tags: 'ams',
                tagSide: 'right',
                tagIndent: '0.8em',
                multlineWidth: '85%',
                labels: {},
                formatError: (jax, err) => {
                    this.log('MathJax format error:', err);
                    return jax.formatError(err);
                }
            },
            options: {
                skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'annotation', 'annotation-xml'],
                includeHtmlTags: ['#comment'],
                ignoreHtmlClass: 'tex2jax_ignore',
                processHtmlClass: 'tex2jax_process',
                renderActions: {
                    addMenu: [0, '', '']
                }
            },
            startup: {
                ready: () => {
                    this.log('🔧 MathJax startup ready');
                    this.mathJaxReady = true;
                    
                    // Call original MathJax ready
                    if (window.MathJax.startup && window.MathJax.startup.defaultReady) {
                        window.MathJax.startup.defaultReady();
                    }
                }
            },
            loader: {
                load: ['[tex]/ams', '[tex]/newcommand', '[tex]/configmacros']
            }
        };
    }

    /**
     * Load MathJax script with timeout and error handling
     */
    async loadMathJaxScript() {
        return new Promise((resolve, reject) => {
            // Check if already loading
            if (document.querySelector('script[src*="mathjax"]')) {
                // Wait for existing script to load
                const checkReady = () => {
                    if (this.isMathJaxReady()) {
                        this.mathJaxReady = true;
                        resolve();
                    } else {
                        setTimeout(checkReady, 100);
                    }
                };
                checkReady();
                return;
            }

            // Load MathJax script
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
            script.async = true;
            script.crossOrigin = 'anonymous';
            
            script.onload = () => {
                this.log('📄 MathJax script loaded');
                // Wait for startup to complete
                const checkReady = () => {
                    if (this.isMathJaxReady()) {
                        this.mathJaxReady = true;
                        this.log('✅ MathJax ready');
                        resolve();
                    } else {
                        setTimeout(checkReady, 100);
                    }
                };
                setTimeout(checkReady, 500);
            };

            script.onerror = () => {
                this.log('❌ MathJax script load failed');
                reject(new Error('MathJax script load failed'));
            };
            
            document.head.appendChild(script);

            // Timeout after configured time
            setTimeout(() => {
                if (!this.mathJaxReady) {
                    this.log('⏰ MathJax load timeout');
                    reject(new Error('MathJax load timeout'));
                }
            }, this.config.mathJaxTimeout);
        });
    }

    /**
     * Check if MathJax is ready for use
     */
    isMathJaxReady() {
        return window.MathJax && 
               window.MathJax.startup && 
               window.MathJax.startup.ready &&
               (typeof window.MathJax.typesetPromise === 'function' || 
                typeof window.MathJax.typeset === 'function');
    }

    /**
     * Load a script dynamically with error handling
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.crossOrigin = 'anonymous';
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.head.appendChild(script);

            // Timeout
            setTimeout(() => {
                reject(new Error(`Script load timeout: ${src}`));
            }, 10000);
        });
    }

    /**
     * Main render function - automatically chooses best available renderer
     */
    async render(content, element, options = {}) {
        if (!element) {
            this.log('❌ No element provided for rendering');
            return false;
        }

        if (!content) {
            this.log('❌ No content provided for rendering');
            return false;
        }

        try {
            await this.init();

            this.log(`🎨 Rendering with mode: ${this.renderMode}`, content);

            switch (this.renderMode) {
                case 'katex':
                    return await this.renderWithKaTeX(content, element, options);
                
                case 'mathjax':
                    return await this.renderWithMathJax(content, element, options);
                
                case 'simple':
                default:
                    return await this.renderWithSimple(content, element, options);
            }

        } catch (error) {
            this.log('❌ Render error, falling back to simple renderer:', error);
            return await this.renderWithSimple(content, element, options);
        }
    }

    /**
     * Render with KaTeX
     */
    async renderWithKaTeX(content, element, options = {}) {
        try {
            if (!this.katexReady || typeof window.katex === 'undefined') {
                throw new Error('KaTeX not available');
            }

            // Set content first
            element.innerHTML = this.preprocessContent(content);

            // Use KaTeX auto-render if available
            if (typeof window.renderMathInElement === 'function') {
                window.renderMathInElement(element, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '$', right: '$', display: false},
                        {left: '\\(', right: '\\)', display: false},
                        {left: '\\[', right: '\\]', display: true}
                    ],
                    throwOnError: false,
                    errorColor: '#cc0000',
                    strict: false,
                    trust: false,
                    macros: {
                        "\\f": "#1f(#2)"
                    }
                });
            } else {
                // Manual KaTeX rendering
                this.manualKaTeXRender(element);
            }

            this.log('✅ KaTeX render successful');
            return true;

        } catch (error) {
            this.log('⚠️ KaTeX render failed:', error);
            throw error;
        }
    }

    /**
     * Manual KaTeX rendering for when auto-render is not available
     */
    manualKaTeXRender(element) {
        const mathRegex = /\$\$([^$]+)\$\$|\$([^$]+)\$/g;
        const html = element.innerHTML;
        
        const processedHtml = html.replace(mathRegex, (match, displayMath, inlineMath) => {
            try {
                const mathText = displayMath || inlineMath;
                const isDisplay = !!displayMath;
                
                return window.katex.renderToString(mathText, {
                    displayMode: isDisplay,
                    throwOnError: false,
                    errorColor: '#cc0000',
                    strict: false,
                    trust: false
                });
            } catch (e) {
                this.log('KaTeX render error for:', match, e);
                return `<span style="color: #cc0000;">[Math Error: ${match}]</span>`;
            }
        });

        element.innerHTML = processedHtml;
    }

    /**
     * Render with MathJax
     */
    async renderWithMathJax(content, element, options = {}) {
        try {
            if (!this.mathJaxReady || !this.isMathJaxReady()) {
                throw new Error('MathJax not available');
            }

            // Set content first
            element.innerHTML = this.preprocessContent(content);
            element.classList.add('tex2jax_process');

            // Use the best available MathJax function
            if (typeof window.MathJax.typesetPromise === 'function') {
                await window.MathJax.typesetPromise([element]);
            } else if (typeof window.MathJax.typeset === 'function') {
                window.MathJax.typeset([element]);
            } else if (window.MathJax.Hub && typeof window.MathJax.Hub.Queue === 'function') {
                // MathJax v2 compatibility
                return new Promise((resolve) => {
                    window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub, element], resolve);
                });
            } else {
                throw new Error('No MathJax render function available');
            }

            this.log('✅ MathJax render successful');
            return true;

        } catch (error) {
            this.log('⚠️ MathJax render failed:', error);
            throw error;
        }
    }

    /**
     * Render with simple fallback renderer
     */
    async renderWithSimple(content, element, options = {}) {
        try {
            // Set the content as data attribute for simple renderer
            element.setAttribute('data-content', content);
            element.classList.add('smart-content');

            // Use the simple renderer
            await this.fallbackRenderer.renderContent(element.parentElement || element, options);

            this.log('✅ Simple render successful');
            return true;

        } catch (error) {
            this.log('❌ Simple render failed:', error);
            // Last resort - just set text content
            element.textContent = content;
            return false;
        }
    }

    /**
     * Preprocess content for better rendering
     */
    preprocessContent(content) {
        if (typeof content !== 'string') return content;

        return content
            // Clean up empty math blocks
            .replace(/\$\$\s*\$\$/g, '')
            .replace(/\$\s*\$/g, '')
            
            // Fix multiple backslashes
            .replace(/\\{2,}/g, '\\')
            
            // Normalize whitespace
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Analyze content to determine rendering strategy
     */
    analyzeContent(content) {
        if (typeof content !== 'string') return { 
            isLatex: false, 
            isMathExpression: false, 
            isPlainText: true, 
            isMixed: false,
            confidence: 0 
        };

        const hasLatexDelimiters = /\$\$.*?\$\$|\$.*?\$|\\[()[\]]/.test(content);
        const hasLatexCommands = /\\[a-zA-Z]+/.test(content);
        const hasMathSymbols = /[+\-*/=<>^_{}()[\]]/.test(content);
        const hasTurkishText = /[ğüşıöçĞÜŞİÖÇ]/.test(content) || 
                              /\b(ve|veya|ile|için|olan|olur|değer|sonuç)\b/.test(content);

        const isLatex = hasLatexDelimiters || hasLatexCommands;
        const isMathExpression = hasMathSymbols && !hasTurkishText;
        const isPlainText = !isLatex && !isMathExpression;
        const isMixed = hasTurkishText && (isLatex || isMathExpression);

        let confidence = 0;
        if (isLatex) confidence += hasLatexDelimiters ? 0.8 : 0.6;
        if (isMathExpression) confidence += 0.4;
        if (isMixed) confidence += 0.3;
        confidence = Math.min(confidence, 1);

        return {
            isLatex,
            isMathExpression,
            isPlainText,
            isMixed,
            confidence,
            hasLatexDelimiters,
            hasLatexCommands,
            hasMathSymbols,
            hasTurkishText
        };
    }

    /**
     * Render problem summary with best available renderer
     */
    async renderProblemSummary(problemOzeti, container) {
        if (!problemOzeti || !container) return false;

        try {
            await this.init();

            if (this.renderMode === 'simple') {
                return await this.fallbackRenderer.renderProblemSummary(problemOzeti, container);
            }

            // Use advanced rendering for MathJax/KaTeX modes
            const { verilenler, istenen } = problemOzeti;
            let summaryHTML = `
                <div class="problem-summary bg-blue-50 p-4 rounded-lg mb-4">
                    <h3 class="font-semibold text-blue-800 mb-2">Problem Özeti:</h3>`;

            if (verilenler && verilenler.length > 0) {
                summaryHTML += `
                    <div class="mb-2">
                        <strong>Verilenler:</strong>
                        <ul class="list-disc list-inside ml-4">
                            ${verilenler.map((veri, index) => `
                                <li class="smart-content" data-content="${this.escapeHtml(veri)}" id="verilen-${index}"></li>
                            `).join('')}
                        </ul>
                    </div>`;
            }

            if (istenen) {
                summaryHTML += `
                    <div>
                        <strong>İstenen:</strong> 
                        <span class="smart-content" data-content="${this.escapeHtml(istenen)}" id="istenen-content"></span>
                    </div>`;
            }

            summaryHTML += '</div>';
            container.innerHTML = summaryHTML;

            // Render smart content elements
            const smartElements = container.querySelectorAll('.smart-content[data-content]');
            for (const element of smartElements) {
                const content = element.getAttribute('data-content');
                if (content) {
                    await this.render(content, element);
                }
            }

            return true;

        } catch (error) {
            this.log('❌ Problem summary render failed:', error);
            return await this.fallbackRenderer.renderProblemSummary(problemOzeti, container);
        }
    }

    /**
     * Render full solution with best available renderer
     */
    async renderFullSolution(solution, container) {
        if (!solution || !container) return false;

        try {
            await this.init();

            if (this.renderMode === 'simple') {
                return await this.fallbackRenderer.renderFullSolution(solution, container);
            }

            // Use advanced rendering for MathJax/KaTeX modes
            let html = `
                <div class="full-solution-container">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold text-gray-800">Tam Çözüm</h3>
                        <button id="back-to-main-menu-btn" class="btn btn-secondary">Ana Menüye Dön</button>
                    </div>`;

            if (solution.adimlar && solution.adimlar.length > 0) {
                solution.adimlar.forEach((step, index) => {
                    html += `
                        <div class="solution-step p-4 mb-3 bg-gray-50 rounded-lg">
                            <div class="step-number font-semibold text-blue-600 mb-2">${index + 1}. Adım</div>
                            ${step.adimAciklamasi ? `<div class="step-explanation mb-2"><strong>Açıklama:</strong> <span class="smart-content" data-content="${this.escapeHtml(step.adimAciklamasi)}"></span></div>` : ''}
                            ${step.cozum_lateks ? `<div class="step-formula mb-2"><strong>Formül:</strong> <span class="smart-content" data-content="${this.escapeHtml(step.cozum_lateks)}"></span></div>` : ''}
                            ${step.ipucu ? `<div class="step-hint"><strong>İpucu:</strong> <span class="smart-content" data-content="${this.escapeHtml(step.ipucu)}"></span></div>` : ''}
                        </div>`;
                });
            }

            if (solution.sonuclar && solution.sonuclar.length > 0) {
                html += `
                    <div class="final-results p-4 bg-green-50 rounded-lg border border-green-200">
                        <h4 class="font-semibold text-green-800 mb-2">Final Sonuçlar:</h4>
                        <ul class="list-disc list-inside">
                            ${solution.sonuclar.map((sonuc, index) => `
                                <li class="smart-content" data-content="${this.escapeHtml(sonuc)}" id="sonuc-${index}"></li>
                            `).join('')}
                        </ul>
                    </div>`;
            }

            html += '</div>';
            container.innerHTML = html;

            // Render smart content elements
            const smartElements = container.querySelectorAll('.smart-content[data-content]');
            for (const element of smartElements) {
                const content = element.getAttribute('data-content');
                if (content) {
                    await this.render(content, element);
                }
            }

            return true;

        } catch (error) {
            this.log('❌ Full solution render failed:', error);
            return await this.fallbackRenderer.renderFullSolution(solution, container);
        }
    }

    /**
     * Render content in container (legacy compatibility)
     */
    async renderContent(container, options = {}) {
        if (!container) return false;

        try {
            await this.init();

            // Find and render smart content elements
            const smartElements = container.querySelectorAll('.smart-content[data-content]');
            
            for (const element of smartElements) {
                const content = element.getAttribute('data-content');
                if (content) {
                    await this.render(content, element, options);
                }
            }

            // Also process any existing math content in the container
            if (this.renderMode === 'mathjax' && this.mathJaxReady) {
                try {
                    if (typeof window.MathJax.typesetPromise === 'function') {
                        await window.MathJax.typesetPromise([container]);
                    } else if (typeof window.MathJax.typeset === 'function') {
                        window.MathJax.typeset([container]);
                    }
                } catch (e) {
                    this.log('MathJax container render warning:', e);
                }
            } else if (this.renderMode === 'katex' && this.katexReady) {
                try {
                    if (typeof window.renderMathInElement === 'function') {
                        window.renderMathInElement(container, {
                            delimiters: [
                                {left: '$$', right: '$$', display: true},
                                {left: '$', right: '$', display: false}
                            ],
                            throwOnError: false
                        });
                    }
                } catch (e) {
                    this.log('KaTeX container render warning:', e);
                }
            }

            return true;

        } catch (error) {
            this.log('❌ Container render failed:', error);
            // Fallback to simple renderer
            return await this.fallbackRenderer.renderContent(container, options);
        }
    }

    /**
     * Utility function to delay execution
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Logging utility with debug control
     */
    log(...args) {
        if (this.config.enableDebugLogs) {
            console.log('[AdvancedMathRenderer]', ...args);
        }
    }

    /**
     * Clear cache and reset state
     */
    clearCache() {
        this.log('🧹 AdvancedMathRenderer cache cleared');
    }

    /**
     * Escape HTML characters
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get renderer statistics and status
     */
    getStats() {
        return {
            initialized: this.initialized,
            renderMode: this.renderMode,
            mathJaxReady: this.mathJaxReady,
            katexReady: this.katexReady,
            fallbackMode: this.fallbackMode,
            initializationAttempts: this.initializationAttempts,
            availableRenderers: {
                mathjax: this.mathJaxReady,
                katex: this.katexReady,
                simple: true
            },
            fallbackRendererStats: this.fallbackRenderer ? this.fallbackRenderer.getStats() : null
        };
    }

    /**
     * Check if renderer is ready
     */
    isReady() {
        return this.initialized;
    }

    /**
     * Get current render mode
     */
    getRenderMode() {
        return this.renderMode;
    }

    /**
     * Check if in fallback mode
     */
    isFallbackMode() {
        return this.fallbackMode;
    }

    /**
     * Force fallback mode
     */
    forceFallbackMode() {
        this.renderMode = 'simple';
        this.fallbackMode = true;
        this.log('🔧 Forced fallback mode activated');
    }

    /**
     * Try to upgrade render mode (attempt to load better renderers)
     */
    async tryUpgradeRenderMode() {
        if (this.renderMode === 'simple') {
            // Try to load KaTeX or MathJax
            if (await this.tryInitKaTeX()) {
                this.renderMode = 'katex';
                this.fallbackMode = false;
                this.log('⬆️ Upgraded to KaTeX render mode');
                return 'katex';
            } else if (await this.tryInitMathJax()) {
                this.renderMode = 'mathjax';
                this.fallbackMode = false;
                this.log('⬆️ Upgraded to MathJax render mode');
                return 'mathjax';
            }
        }
        return this.renderMode;
    }

    /**
     * Test render functionality
     */
    async test() {
        this.log('🧪 Testing AdvancedMathRenderer...');
        
        const testContent = '$x = \\frac{1}{2}$';
        const testElement = document.createElement('div');
        testElement.style.position = 'absolute';
        testElement.style.left = '-9999px';
        document.body.appendChild(testElement);
        
        try {
            const success = await this.render(testContent, testElement);
            this.log(`${success ? '✅' : '❌'} Test render ${success ? 'successful' : 'failed'}`);
            this.log('Rendered content:', testElement.innerHTML);
            
            // Clean up
            document.body.removeChild(testElement);
            
            return success;
        } catch (error) {
            this.log('❌ Test render failed:', error);
            if (testElement.parentNode) {
                document.body.removeChild(testElement);
            }
            return false;
        }
    }

    /**
     * Reset renderer state
     */
    reset() {
        this.mathJaxReady = false;
        this.katexReady = false;
        this.initialized = false;
        this.fallbackMode = false;
        this.renderMode = 'unknown';
        this.initializationAttempts = 0;
        this.log('🔄 AdvancedMathRenderer reset');
    }

    /**
     * Destroy and cleanup
     */
    destroy() {
        this.reset();
        this.log('🗑️ AdvancedMathRenderer destroyed');
    }

    /**
     * Additional utility methods for debugging
     */
    logStatus() {
        console.log('📊 AdvancedMathRenderer Status:', this.getStats());
    }

    /**
     * Check what math libraries are available in the browser
     */
    checkAvailableLibraries() {
        const available = {
            MathJax: typeof window.MathJax !== 'undefined',
            KaTeX: typeof window.katex !== 'undefined',
            MathJaxReady: this.isMathJaxReady(),
            KaTeXAutoRender: typeof window.renderMathInElement !== 'undefined',
            MathJaxVersion: window.MathJax ? (window.MathJax.version || 'unknown') : 'not loaded',
            KaTeXVersion: window.katex ? (window.katex.version || 'unknown') : 'not loaded'
        };
        
        this.log('📚 Available Math Libraries:', available);
        return available;
    }

    /**
     * Enable or disable debug logging
     */
    setDebugMode(enabled) {
        this.config.enableDebugLogs = enabled;
        this.log(`🐛 Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.log('⚙️ Configuration updated:', this.config);
    }

    /**
     * Benchmark render performance
     */
    async benchmark() {
        const testCases = [
            '$x = 1$',
            '$\\frac{a}{b} = \\frac{c}{d}$',
            '$\\sum_{i=1}^{n} x_i$',
            '$\\int_0^1 f(x) dx$',
            '$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$'
        ];

        const results = {};
        
        for (const testCase of testCases) {
            const element = document.createElement('div');
            element.style.position = 'absolute';
            element.style.left = '-9999px';
            document.body.appendChild(element);
            
            const startTime = performance.now();
            
            try {
                await this.render(testCase, element);
                const endTime = performance.now();
                results[testCase] = {
                    success: true,
                    time: endTime - startTime,
                    renderMode: this.renderMode
                };
            } catch (error) {
                const endTime = performance.now();
                results[testCase] = {
                    success: false,
                    time: endTime - startTime,
                    error: error.message,
                    renderMode: this.renderMode
                };
            }
            
            document.body.removeChild(element);
        }

        this.log('🏁 Benchmark results:', results);
        return results;
    }

    /**
     * Health check - comprehensive system status
     */
    async healthCheck() {
        const health = {
            timestamp: new Date().toISOString(),
            initialized: this.initialized,
            renderMode: this.renderMode,
            fallbackMode: this.fallbackMode,
            libraries: this.checkAvailableLibraries(),
            stats: this.getStats(),
            testResults: {}
        };

        // Run basic test
        try {
            health.testResults.basicTest = await this.test();
        } catch (error) {
            health.testResults.basicTest = false;
            health.testResults.basicTestError = error.message;
        }

        // Check each render mode
        const originalMode = this.renderMode;
        
        // Test simple mode
        this.renderMode = 'simple';
        try {
            const element = document.createElement('div');
            element.style.position = 'absolute';
            element.style.left = '-9999px';
            document.body.appendChild(element);
            
            health.testResults.simpleMode = await this.render('$x = 1$', element);
            document.body.removeChild(element);
        } catch (error) {
            health.testResults.simpleMode = false;
            health.testResults.simpleModeError = error.message;
        }

        // Test KaTeX if available
        if (this.katexReady) {
            this.renderMode = 'katex';
            try {
                const element = document.createElement('div');
                element.style.position = 'absolute';
                element.style.left = '-9999px';
                document.body.appendChild(element);
                
                health.testResults.katexMode = await this.render('$x = 1$', element);
                document.body.removeChild(element);
            } catch (error) {
                health.testResults.katexMode = false;
                health.testResults.katexModeError = error.message;
            }
        }

        // Test MathJax if available
        if (this.mathJaxReady) {
            this.renderMode = 'mathjax';
            try {
                const element = document.createElement('div');
                element.style.position = 'absolute';
                element.style.left = '-9999px';
                document.body.appendChild(element);
                
                health.testResults.mathjaxMode = await this.render('$x = 1$', element);
                document.body.removeChild(element);
            } catch (error) {
                health.testResults.mathjaxMode = false;
                health.testResults.mathjaxModeError = error.message;
            }
        }

        // Restore original mode
        this.renderMode = originalMode;

        // Overall health assessment
        health.overall = this.initialized && (
            health.testResults.simpleMode || 
            health.testResults.katexMode || 
            health.testResults.mathjaxMode
        ) ? 'healthy' : 'unhealthy';

        this.log('🏥 Health check results:', health);
        return health;
    }

    /**
     * Performance monitoring
     */
    startPerformanceMonitoring() {
        this.performanceData = {
            renderCount: 0,
            totalRenderTime: 0,
            averageRenderTime: 0,
            errors: 0,
            startTime: Date.now()
        };

        // Override render method to collect metrics
        const originalRender = this.render.bind(this);
        this.render = async (content, element, options = {}) => {
            const startTime = performance.now();
            this.performanceData.renderCount++;
            
            try {
                const result = await originalRender(content, element, options);
                const endTime = performance.now();
                const renderTime = endTime - startTime;
                
                this.performanceData.totalRenderTime += renderTime;
                this.performanceData.averageRenderTime = 
                    this.performanceData.totalRenderTime / this.performanceData.renderCount;
                
                return result;
            } catch (error) {
                this.performanceData.errors++;
                throw error;
            }
        };

        this.log('📊 Performance monitoring started');
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        if (!this.performanceData) {
            return null;
        }

        const uptime = Date.now() - this.performanceData.startTime;
        
        return {
            ...this.performanceData,
            uptime,
            renderRate: this.performanceData.renderCount / (uptime / 1000), // renders per second
            errorRate: this.performanceData.errors / this.performanceData.renderCount
        };
    }

    /**
     * Stop performance monitoring
     */
    stopPerformanceMonitoring() {
        if (this.performanceData) {
            this.log('📊 Performance monitoring stopped. Final metrics:', this.getPerformanceMetrics());
            delete this.performanceData;
        }
    }

    /**
     * Create a minimal test page for debugging
     */
    createTestPage() {
        const testHTML = `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AdvancedMathRenderer Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .test-case { margin: 20px 0; padding: 10px; border: 1px solid #ccc; }
        .test-input { font-family: monospace; background: #f5f5f5; padding: 5px; }
        .test-output { margin-top: 10px; padding: 10px; background: #fff; border: 1px solid #ddd; }
        .error { color: red; }
        .success { color: green; }
    </style>
</head>
<body>
    <h1>AdvancedMathRenderer Test Page</h1>
    <div id="test-results"></div>
    
    <script type="module">
        import { advancedMathRenderer } from './js/modules/advancedMathRenderer.js';
        
        const testCases = [
            '$x = 1$',
            '$\\frac{a}{b} = c$',
            '$\\sqrt{16} = 4$',
            '$\\sum_{i=1}^{n} x_i$',
            'Normal text with $inline$ math',
            'Turkish text: değer = $\\pi$'
        ];
        
        async function runTests() {
            const resultsDiv = document.getElementById('test-results');
            
            for (const testCase of testCases) {
                const testDiv = document.createElement('div');
                testDiv.className = 'test-case';
                
                const inputDiv = document.createElement('div');
                inputDiv.className = 'test-input';
                inputDiv.textContent = 'Input: ' + testCase;
                
                const outputDiv = document.createElement('div');
                outputDiv.className = 'test-output';
                
                try {
                    const success = await advancedMathRenderer.render(testCase, outputDiv);
                    const status = document.createElement('div');
                    status.className = success ? 'success' : 'error';
                    status.textContent = success ? '✅ Success' : '❌ Failed';
                    
                    testDiv.appendChild(inputDiv);
                    testDiv.appendChild(status);
                    testDiv.appendChild(outputDiv);
                } catch (error) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'error';
                    errorDiv.textContent = '❌ Error: ' + error.message;
                    
                    testDiv.appendChild(inputDiv);
                    testDiv.appendChild(errorDiv);
                }
                
                resultsDiv.appendChild(testDiv);
            }
            
            // Show stats
            const statsDiv = document.createElement('div');
            statsDiv.innerHTML = '<h2>Renderer Stats</h2><pre>' + 
                JSON.stringify(advancedMathRenderer.getStats(), null, 2) + '</pre>';
            resultsDiv.appendChild(statsDiv);
        }
        
        runTests();
    </script>
</body>
</html>`;

        return testHTML;
    }
}

// Create and export singleton instance
export const advancedMathRenderer = new AdvancedMathRenderer();

// Legacy compatibility - also export as mathRenderer
export const mathRenderer = advancedMathRenderer;

// Make available globally for debugging
if (typeof window !== 'undefined') {
    window.advancedMathRenderer = advancedMathRenderer;
    window.mathRenderer = mathRenderer; // Legacy global access
    
    // Global debug helpers
    window.mathRendererTest = () => advancedMathRenderer.test();
    window.mathRendererHealth = () => advancedMathRenderer.healthCheck();
    window.mathRendererBenchmark = () => advancedMathRenderer.benchmark();
    window.mathRendererStats = () => advancedMathRenderer.getStats();
}