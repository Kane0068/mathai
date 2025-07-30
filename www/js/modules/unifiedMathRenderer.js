// =================================================================================
//  MathAi - Math-Specific Error Handler
//  Advanced Error Recovery for Math Rendering and Turkish Content
// =================================================================================

/**
 * Math Error Handler - Specialized error handling for mathematical content
 * Provides advanced recovery strategies for Turkish + LaTeX rendering failures
 */
export class MathErrorHandler {
    constructor() {
        this.errorTypes = {
            LATEX_SYNTAX: 'latex_syntax_error',
            TURKISH_ENCODING: 'turkish_encoding_error',
            MIXED_CONTENT: 'mixed_content_error',
            RENDER_TIMEOUT: 'render_timeout_error',
            ENGINE_FAILURE: 'engine_failure_error',
            MEMORY_LIMIT: 'memory_limit_error',
            NETWORK_ERROR: 'network_error'
        };
        
        this.errorCounts = {};
        this.errorHistory = [];
        this.recoveryStrategies = new Map();
        this.maxHistorySize = 100;
        
        // Initialize recovery strategies
        this.initializeRecoveryStrategies();
        
        // Turkish character mapping for fallbacks
        this.turkishCharMap = {
            'ğ': 'g', 'ü': 'u', 'ş': 's', 'ı': 'i', 'ö': 'o', 'ç': 'c',
            'Ğ': 'G', 'Ü': 'U', 'Ş': 'S', 'İ': 'I', 'Ö': 'O', 'Ç': 'C'
        };
        
        // Common LaTeX error patterns and fixes
        this.latexErrorPatterns = new Map([
            [/\\undefined/g, ''],
            [/\$\s*\$/g, ''],
            [/\{\s*\}/g, ''],
            [/\\begin\{[^}]*\}\s*\\end\{[^}]*\}/g, ''],
            [/\\text\{\s*\}/g, ''],
            [/\\\(/g, '\\('],
            [/\\\)/g, '\\)'],
            [/\\\[/g, '\\['],
            [/\\\]/g, '\\]'],
            [/\$\$/g, '$$']
        ]);
        
        // Turkish math term translations for fallback
        this.turkishMathTerms = {
            'toplam': 'sum',
            'çarpım': 'product',
            'bölüm': 'division',
            'fark': 'difference',
            'kök': 'root',
            'üs': 'power',
            'logaritma': 'logarithm',
            'sinüs': 'sine',
            'kosinüs': 'cosine',
            'tanjant': 'tangent'
        };
    }
    
    /**
     * Initialize recovery strategies for different error types
     */
    initializeRecoveryStrategies() {
        // LaTeX syntax error recovery
        this.recoveryStrategies.set(this.errorTypes.LATEX_SYNTAX, [
            this.cleanLatexSyntax.bind(this),
            this.simplifyLatexExpression.bind(this),
            this.convertToPlainText.bind(this)
        ]);
        
        // Turkish encoding error recovery
        this.recoveryStrategies.set(this.errorTypes.TURKISH_ENCODING, [
            this.fixTurkishEncoding.bind(this),
            this.transliterateTurkish.bind(this),
            this.convertToAscii.bind(this)
        ]);
        
        // Mixed content error recovery
        this.recoveryStrategies.set(this.errorTypes.MIXED_CONTENT, [
            this.separateMixedContent.bind(this),
            this.renderTextOnly.bind(this),
            this.renderMathOnly.bind(this)
        ]);
        
        // Render timeout recovery
        this.recoveryStrategies.set(this.errorTypes.RENDER_TIMEOUT, [
            this.simplifyForSpeed.bind(this),
            this.renderProgressively.bind(this),
            this.renderAsText.bind(this)
        ]);
        
        // Engine failure recovery
        this.recoveryStrategies.set(this.errorTypes.ENGINE_FAILURE, [
            this.switchRenderEngine.bind(this),
            this.renderWithFallback.bind(this),
            this.renderAsPlainText.bind(this)
        ]);
    }
    
    /**
     * Main error handling entry point
     */
    async handleRenderError(error, content, element, options = {}) {
        const errorType = this.classifyError(error, content);
        const errorInfo = {
            type: errorType,
            message: error.message,
            content: content.substring(0, 200),
            timestamp: Date.now(),
            stack: error.stack,
            options: options
        };
        
        // Track error
        this.trackError(errorInfo);
        
        console.warn(`🚨 Math Render Error [${errorType}]:`, errorInfo);
        
        // Attempt recovery
        const recoveryResult = await this.attemptRecovery(errorType, content, element, options, error);
        
        if (recoveryResult.success) {
            console.log(`✅ Error recovery successful using strategy: ${recoveryResult.strategy}`);
            return recoveryResult;
        }
        
        // Final fallback
        console.warn('⚠️  All recovery strategies failed, using final fallback');
        return this.finalFallback(content, element, errorInfo);
    }
    
    /**
     * Classify error type based on error message and content
     */
    classifyError(error, content) {
        const errorMessage = error.message.toLowerCase();
        
        // LaTeX syntax errors
        if (errorMessage.includes('latex') || 
            errorMessage.includes('syntax') ||
            errorMessage.includes('undefined command') ||
            errorMessage.includes('missing') ||
            errorMessage.includes('extra')) {
            return this.errorTypes.LATEX_SYNTAX;
        }
        
        // Turkish encoding errors
        if (errorMessage.includes('encoding') ||
            errorMessage.includes('utf') ||
            this.hasTurkishChars(content)) {
            return this.errorTypes.TURKISH_ENCODING;
        }
        
        // Mixed content errors
        if (this.isMixedContent(content)) {
            return this.errorTypes.MIXED_CONTENT;
        }
        
        // Timeout errors
        if (errorMessage.includes('timeout') ||
            errorMessage.includes('time')) {
            return this.errorTypes.RENDER_TIMEOUT;
        }
        
        // Engine-specific errors
        if (errorMessage.includes('katex') ||
            errorMessage.includes('mathjax') ||
            errorMessage.includes('render')) {
            return this.errorTypes.ENGINE_FAILURE;
        }
        
        // Memory errors
        if (errorMessage.includes('memory') ||
            errorMessage.includes('limit') ||
            errorMessage.includes('maximum')) {
            return this.errorTypes.MEMORY_LIMIT;
        }
        
        // Network errors
        if (errorMessage.includes('network') ||
            errorMessage.includes('fetch') ||
            errorMessage.includes('load')) {
            return this.errorTypes.NETWORK_ERROR;
        }
        
        // Default to syntax error
        return this.errorTypes.LATEX_SYNTAX;
    }
    
    /**
     * Attempt error recovery using appropriate strategies
     */
    async attemptRecovery(errorType, content, element, options, originalError) {
        const strategies = this.recoveryStrategies.get(errorType) || [];
        
        for (let i = 0; i < strategies.length; i++) {
            const strategy = strategies[i];
            const strategyName = strategy.name || `strategy_${i}`;
            
            try {
                console.log(`🔄 Attempting recovery strategy: ${strategyName}`);
                
                const result = await strategy(content, element, options, originalError);
                
                if (result.success) {
                    return {
                        success: true,
                        strategy: strategyName,
                        result: result
                    };
                }
                
            } catch (recoveryError) {
                console.warn(`Recovery strategy ${strategyName} failed:`, recoveryError);
            }
        }
        
        return { success: false };
    }
    
    /**
     * Recovery Strategy: Clean LaTeX syntax
     */
    async cleanLatexSyntax(content, element, options) {
        try {
            let cleaned = content;
            
            // Apply common LaTeX fixes
            for (const [pattern, replacement] of this.latexErrorPatterns) {
                cleaned = cleaned.replace(pattern, replacement);
            }
            
            // Remove problematic constructs
            cleaned = cleaned
                .replace(/\\[a-zA-Z]*\{[^}]*\}\{[^}]*\}/g, '') // Double-argument commands
                .replace(/\\[a-zA-Z]*\[[^\]]*\]/g, '') // Commands with optional args
                .replace(/\{([^{}]*)\}/g, '$1') // Remove simple braces
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();
            
            if (cleaned && cleaned !== content) {
                element.textContent = cleaned;
                element.classList.add('syntax-cleaned');
                return { success: true, cleanedContent: cleaned };
            }
            
        } catch (error) {
            console.warn('LaTeX cleaning failed:', error);
        }
        
        return { success: false };
    }
    
    /**
     * Recovery Strategy: Simplify LaTeX expression
     */
    async simplifyLatexExpression(content, element, options) {
        try {
            // Extract basic mathematical content
            let simplified = content
                .replace(/\\text\{([^}]*)\}/g, '$1') // Remove \\text wrappers
                .replace(/\\[a-zA-Z]+/g, '') // Remove LaTeX commands
                .replace(/[{}]/g, '') // Remove braces
                .replace(/[_^]/g, '') // Remove super/subscripts
                .replace(/\$/g, '') // Remove dollar signs
                .trim();
            
            if (simplified) {
                element.textContent = simplified;
                element.classList.add('expression-simplified');
                return { success: true, simplifiedContent: simplified };
            }
            
        } catch (error) {
            console.warn('LaTeX simplification failed:', error);
        }
        
        return { success: false };
    }
    
    /**
     * Recovery Strategy: Convert to plain text
     */
    async convertToPlainText(content, element, options) {
        try {
            const plainText = content
                .replace(/\$+/g, '') // Remove dollars
                .replace(/\\[a-zA-Z]+/g, '') // Remove commands
                .replace(/[{}[\]]/g, '') // Remove brackets
                .replace(/[_^]/g, '') // Remove scripts
                .replace(/\s+/g, ' ') // Normalize spaces
                .trim();
            
            element.textContent = plainText;
            element.classList.add('converted-to-text');
            return { success: true, plainText: plainText };
            
        } catch (error) {
            console.warn('Plain text conversion failed:', error);
        }
        
        return { success: false };
    }
    
    /**
     * Recovery Strategy: Fix Turkish encoding
     */
    async fixTurkishEncoding(content, element, options) {
        try {
            // Try to fix common Turkish encoding issues
            let fixed = content
                .replace(/Ä±/g, 'ı')
                .replace(/Ä°/g, 'İ')
                .replace(/Å\u009f/g, 'ş')
                .replace(/Å\u009e/g, 'Ş')
                .replace(/Ã¼/g, 'ü')
                .replace(/Ã\u009c/g, 'Ü')
                .replace(/Ã¶/g, 'ö')
                .replace(/Ã\u0096/g, 'Ö')
                .replace(/Ã§/g, 'ç')
                .replace(/Ã\u0087/g, 'Ç')
                .replace(/Ä\u009f/g, 'ğ')
                .replace(/Ä\u009e/g, 'Ğ');
            
            if (fixed !== content) {
                element.textContent = fixed;
                element.classList.add('encoding-fixed');
                return { success: true, fixedContent: fixed };
            }
            
        } catch (error) {
            console.warn('Turkish encoding fix failed:', error);
        }
        
        return { success: false };
    }
    
    /**
     * Recovery Strategy: Transliterate Turkish characters
     */
    async transliterateTurkish(content, element, options) {
        try {
            let transliterated = content;
            
            for (const [turkish, latin] of Object.entries(this.turkishCharMap)) {
                transliterated = transliterated.replace(new RegExp(turkish, 'g'), latin);
            }
            
            if (transliterated !== content) {
                element.textContent = transliterated;
                element.classList.add('turkish-transliterated');
                return { success: true, transliteratedContent: transliterated };
            }
            
        } catch (error) {
            console.warn('Turkish transliteration failed:', error);
        }
        
        return { success: false };
    }
    
    /**
     * Recovery Strategy: Convert to ASCII
     */
    async convertToAscii(content, element, options) {
        try {
            const ascii = content
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
                .replace(/[^\x00-\x7F]/g, ''); // Remove non-ASCII
            
            element.textContent = ascii;
            element.classList.add('ascii-converted');
            return { success: true, asciiContent: ascii };
            
        } catch (error) {
            console.warn('ASCII conversion failed:', error);
        }
        
        return { success: false };
    }
    
    /**
     * Recovery Strategy: Separate mixed content
     */
    async separateMixedContent(content, element, options) {
        try {
            const parts = this.splitContent(content);
            element.innerHTML = '';
            
            for (const part of parts) {
                const span = document.createElement('span');
                span.textContent = part.content;
                span.className = part.type === 'text' ? 'text-part' : 'math-part';
                element.appendChild(span);
            }
            
            element.classList.add('mixed-separated');
            return { success: true, parts: parts };
            
        } catch (error) {
            console.warn('Mixed content separation failed:', error);
        }
        
        return { success: false };
    }
    
    /**
     * Recovery Strategy: Render text only
     */
    async renderTextOnly(content, element, options) {
        try {
            // Extract only text parts, ignore LaTeX
            const textOnly = content
                .replace(/\$[^$]*\$/g, '') // Remove inline math
                .replace(/\$\$[^$]*\$\$/g, '') // Remove display math
                .replace(/\\\([^)]*\\\)/g, '') // Remove LaTeX inline
                .replace(/\\\[[^\]]*\\\]/g, '') // Remove LaTeX display
                .replace(/\s+/g, ' ')
                .trim();
            
            if (textOnly) {
                element.textContent = textOnly;
                element.classList.add('text-only');
                return { success: true, textContent: textOnly };
            }
            
        } catch (error) {
            console.warn('Text-only rendering failed:', error);
        }
        
        return { success: false };
    }
    
    /**
     * Recovery Strategy: Render math only
     */
    async renderMathOnly(content, element, options) {
        try {
            // Extract only math parts
            const mathMatches = content.match(/\$[^$]*\$|\$\$[^$]*\$\$|\\\([^)]*\\\)|\\\[[^\]]*\\\]/g);
            
            if (mathMatches && mathMatches.length > 0) {
                const mathContent = mathMatches.join(' ');
                element.textContent = mathContent;
                element.classList.add('math-only');
                return { success: true, mathContent: mathContent };
            }
            
        } catch (error) {
            console.warn('Math-only rendering failed:', error);
        }
        
        return { success: false };
    }
    
    /**
     * Recovery Strategy: Simplify for speed
     */
    async simplifyForSpeed(content, element, options) {
        try {
            // Remove complex constructs that might cause timeouts
            const simplified = content
                .replace(/\\begin\{[^}]*\}[\s\S]*?\\end\{[^}]*\}/g, '[complex_math]')
                .replace(/\\array\{[^}]*\}/g, '[array]')
                .replace(/\\matrix\{[^}]*\}/g, '[matrix]')
                .replace(/\\frac\{[^}]*\}\{[^}]*\}/g, '[fraction]')
                .replace(/\\sqrt\{[^}]*\}/g, '[root]')
                .substring(0, 100); // Limit length
            
            element.textContent = simplified;
            element.classList.add('speed-simplified');
            return { success: true, simplifiedContent: simplified };
            
        } catch (error) {
            console.warn('Speed simplification failed:', error);
        }
        
        return { success: false };
    }
    
    /**
     * Recovery Strategy: Progressive rendering
     */
    async renderProgressively(content, element, options) {
        try {
            const chunks = this.chunkContent(content, 50); // 50 char chunks
            element.innerHTML = '';
            
            for (const chunk of chunks) {
                const span = document.createElement('span');
                span.textContent = chunk;
                element.appendChild(span);
            }
            
            element.classList.add('progressive-render');
            return { success: true, chunks: chunks.length };
            
        } catch (error) {
            console.warn('Progressive rendering failed:', error);
        }
        
        return { success: false };
    }
    
    /**
     * Recovery Strategy: Render as text
     */
    async renderAsText(content, element, options) {
        element.textContent = content;
        element.classList.add('render-as-text');
        return { success: true, textContent: content };
    }
    
    /**
     * Recovery Strategy: Switch render engine
     */
    async switchRenderEngine(content, element, options, originalError) {
        // This would need to be implemented with access to the rendering engines
        // For now, just return failure to move to next strategy
        return { success: false, reason: 'engine_switch_not_implemented' };
    }
    
    /**
     * Recovery Strategy: Render with fallback
     */
    async renderWithFallback(content, element, options) {
        try {
            element.innerHTML = `
                <div class="render-fallback">
                    <span class="fallback-content">${this.escapeHtml(content)}</span>
                    <small class="fallback-indicator">⚠️</small>
                </div>
            `;
            element.classList.add('fallback-rendered');
            return { success: true, fallback: true };
            
        } catch (error) {
            console.warn('Fallback rendering failed:', error);
        }
        
        return { success: false };
    }
    
    /**
     * Recovery Strategy: Render as plain text
     */
    async renderAsPlainText(content, element, options) {
        element.textContent = content;
        element.classList.add('plain-text-fallback');
        return { success: true, plainText: true };
    }
    
    /**
     * Final fallback when all recovery fails
     */
    finalFallback(content, element, errorInfo) {
        element.innerHTML = `
            <div class="final-fallback">
                <span class="error-content">${this.escapeHtml(content.substring(0, 100))}</span>
                <small class="error-indicator" title="Render Error: ${errorInfo.message}">❌</small>
            </div>
        `;
        element.classList.add('final-fallback', 'render-failed');
        
        return {
            success: true, // We consider this success since we displayed something
            fallback: true,
            strategy: 'final_fallback'
        };
    }
    
    /**
     * Track error statistics
     */
    trackError(errorInfo) {
        // Update error counts
        this.errorCounts[errorInfo.type] = (this.errorCounts[errorInfo.type] || 0) + 1;
        
        // Add to history
        this.errorHistory.push(errorInfo);
        
        // Maintain history size
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
        }
    }
    
    /**
     * Utility functions
     */
    hasTurkishChars(content) {
        return /[ğüşıöçĞÜŞİÖÇ]/.test(content);
    }
    
    isMixedContent(content) {
        const hasLatex = /\$|\\\(|\\\[|\\[a-zA-Z]/.test(content);
        const hasTurkish = this.hasTurkishChars(content);
        return hasLatex && hasTurkish;
    }
    
    splitContent(content) {
        const parts = [];
        const latexRegex = /(\$[^$]*\$|\\\([^)]*\\\)|\\\[[^\]]*\\\])/g;
        
        let lastIndex = 0;
        let match;
        
        while ((match = latexRegex.exec(content)) !== null) {
            // Add text before LaTeX
            if (match.index > lastIndex) {
                parts.push({
                    type: 'text',
                    content: content.slice(lastIndex, match.index)
                });
            }
            
            // Add LaTeX part
            parts.push({
                type: 'latex',
                content: match[0]
            });
            
            lastIndex = match.index + match[0].length;
        }
        
        // Add remaining text
        if (lastIndex < content.length) {
            parts.push({
                type: 'text',
                content: content.slice(lastIndex)
            });
        }
        
        return parts.filter(part => part.content.trim());
    }
    
    chunkContent(content, chunkSize) {
        const chunks = [];
        for (let i = 0; i < content.length; i += chunkSize) {
            chunks.push(content.slice(i, i + chunkSize));
        }
        return chunks;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Get error statistics
     */
    getErrorStats() {
        const total = Object.values(this.errorCounts).reduce((sum, count) => sum + count, 0);
        
        return {
            totalErrors: total,
            errorsByType: { ...this.errorCounts },
            recentErrors: this.errorHistory.slice(-10),
            errorHistory: this.errorHistory.length,
            topErrorType: total > 0 ? 
                Object.entries(this.errorCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0] : 
                'none'
        };
    }
    
    /**
     * Reset error tracking
     */
    reset() {
        this.errorCounts = {};
        this.errorHistory = [];
        console.log('🔄 Math Error Handler reset');
    }
}

// Create singleton instance
export const mathErrorHandler = new MathErrorHandler();

// Global access for debugging
window.mathErrorHandler = mathErrorHandler;