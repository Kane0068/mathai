/**
 * MathRendererManager - Centralized mathematical content rendering and LaTeX processing
 * Extracts from index.js: Math rendering utilities, LaTeX normalization, smart content rendering
 */

import { renderMath, renderMathInContainer, renderSmartContent, waitForRenderSystem } from './ui.js';

export class MathRendererManager {
    constructor() {
        this.isInitialized = false;
        this.renderQueue = [];
        this.isProcessing = false;
    }

    /**
     * Initialize the math rendering system
     */
    async initialize() {
        if (this.isInitialized) return true;

        try {
            console.log('🔄 Math Renderer Manager initializing...');
            await waitForRenderSystem();
            this.isInitialized = true;
            console.log('✅ Math Renderer Manager initialized');
            return true;
        } catch (error) {
            console.error('❌ Math Renderer Manager initialization failed:', error);
            return false;
        }
    }

    /**
     * Render mathematical content in a container
     */
    async renderInContainer(container, force = false) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            await renderMathInContainer(container, force);
            console.log('✅ Container math rendered');
        } catch (error) {
            console.error('❌ Container math render error:', error);
            throw error;
        }
    }

    /**
     * Render smart content with LaTeX processing
     */
    async renderSmartContentInContainer(container) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            await renderSmartContent(container);
            console.log('✅ Smart content rendered');
        } catch (error) {
            console.error('❌ Smart content render error:', error);
            throw error;
        }
    }

    /**
     * Queue-based rendering for performance
     */
    async queueRender(container, type = 'math') {
        this.renderQueue.push({ container, type, timestamp: Date.now() });
        
        if (!this.isProcessing) {
            this.processRenderQueue();
        }
    }

    /**
     * Process the render queue
     */
    async processRenderQueue() {
        if (this.renderQueue.length === 0) return;

        this.isProcessing = true;
        console.log(`🔄 Processing ${this.renderQueue.length} render tasks...`);

        while (this.renderQueue.length > 0) {
            const task = this.renderQueue.shift();
            
            try {
                switch (task.type) {
                    case 'math':
                        await this.renderInContainer(task.container);
                        break;
                    case 'smart':
                        await this.renderSmartContentInContainer(task.container);
                        break;
                    default:
                        console.warn(`Unknown render type: ${task.type}`);
                }
            } catch (error) {
                console.error('❌ Queue render task failed:', error);
            }

            // Small delay to prevent blocking
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        this.isProcessing = false;
        console.log('✅ Render queue processed');
    }

    /**
     * Normalize LaTeX content for rendering
     */
    normalizeLatex(latex) {
        if (!latex || typeof latex !== 'string') return latex;

        return latex
            // Backslash normalization
            .replace(/\\{4,}/g, '\\\\')  // 4+ backslashes -> 2
            .replace(/\\{3}/g, '\\\\')   // 3 backslashes -> 2
            
            // Common LaTeX patterns
            .replace(/\\text\s*\{/g, '\\text{')
            .replace(/\\frac\s*\{/g, '\\frac{')
            .replace(/\\sqrt\s*\{/g, '\\sqrt{')
            .replace(/\\left\s*\(/g, '\\left(')
            .replace(/\\right\s*\)/g, '\\right)')
            
            // Remove problematic characters
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
            
            // Normalize whitespace
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Clean LaTeX content from API responses
     */
    cleanLatexContent(latex) {
        if (!latex || typeof latex !== 'string') return latex;

        return latex
            // Remove markdown code blocks
            .replace(/```latex\n?/g, '')
            .replace(/```\n?/g, '')
            .replace(/`/g, '')
            
            // Fix common LaTeX issues
            .replace(/\$\$([^$]+)\$\$/g, '$1') // Remove double dollar signs if nested
            .replace(/\$([^$]+)\$/g, '$1')     // Remove single dollar signs if nested
            
            // Normalize and clean
            .replace(/\\{2,}/g, '\\')          // Multiple backslashes
            .replace(/\s*\\\s*/g, '\\')        // Spaces around backslashes
            .trim();
    }

    /**
     * Prepare content for math rendering
     */
    prepareContentForRender(content) {
        if (!content) return content;

        // If it's an object with LaTeX properties
        if (typeof content === 'object') {
            const prepared = { ...content };
            
            if (prepared.cozum_lateks) {
                prepared.cozum_lateks = this.normalizeLatex(prepared.cozum_lateks);
            }
            
            if (prepared.tamCozumLateks && Array.isArray(prepared.tamCozumLateks)) {
                prepared.tamCozumLateks = prepared.tamCozumLateks.map(latex => 
                    this.normalizeLatex(latex)
                );
            }

            if (prepared.problemOzeti) {
                if (prepared.problemOzeti.verilenler) {
                    prepared.problemOzeti.verilenler = prepared.problemOzeti.verilenler.map(item =>
                        this.normalizeLatex(item)
                    );
                }
                if (prepared.problemOzeti.istenen) {
                    prepared.problemOzeti.istenen = this.normalizeLatex(prepared.problemOzeti.istenen);
                }
            }

            if (prepared.adimlar && Array.isArray(prepared.adimlar)) {
                prepared.adimlar = prepared.adimlar.map(step => ({
                    ...step,
                    cozum_lateks: step.cozum_lateks ? this.normalizeLatex(step.cozum_lateks) : step.cozum_lateks
                }));
            }

            return prepared;
        }

        // If it's a string
        if (typeof content === 'string') {
            return this.normalizeLatex(content);
        }

        return content;
    }

    /**
     * Generate HTML with proper LaTeX attributes
     */
    generateLatexHTML(latex, id = '') {
        const normalizedLatex = this.normalizeLatex(latex);
        const escapedLatex = this.escapeHtml(normalizedLatex);
        
        return `<div class="latex-content" data-latex="${escapedLatex}" ${id ? `id="${id}"` : ''}></div>`;
    }

    /**
     * Generate smart content HTML
     */
    generateSmartContentHTML(content, id = '') {
        const escapedContent = this.escapeHtml(content);
        
        return `<span class="smart-content" data-content="${escapedContent}" ${id ? `id="${id}"` : ''}></span>`;
    }

    /**
     * Escape HTML for safe insertion
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Validate LaTeX syntax
     */
    validateLatexSyntax(latex) {
        if (!latex || typeof latex !== 'string') return false;

        try {
            // Basic syntax checks
            const openBraces = (latex.match(/\{/g) || []).length;
            const closeBraces = (latex.match(/\}/g) || []).length;
            
            if (openBraces !== closeBraces) {
                console.warn('LaTeX validation: Mismatched braces');
                return false;
            }

            // Check for common problematic patterns
            if (latex.includes('\\\\\\')) {
                console.warn('LaTeX validation: Triple backslashes detected');
                return false;
            }

            return true;
        } catch (error) {
            console.error('LaTeX validation error:', error);
            return false;
        }
    }

    /**
     * Batch render multiple containers
     */
    async batchRender(containers, type = 'math') {
        if (!Array.isArray(containers)) {
            containers = [containers];
        }

        console.log(`🔄 Batch rendering ${containers.length} containers...`);
        
        const promises = containers.map(container => {
            switch (type) {
                case 'math':
                    return this.renderInContainer(container);
                case 'smart':
                    return this.renderSmartContentInContainer(container);
                default:
                    return Promise.resolve();
            }
        });

        try {
            await Promise.all(promises);
            console.log('✅ Batch render completed');
        } catch (error) {
            console.error('❌ Batch render failed:', error);
            throw error;
        }
    }

    /**
     * Get render statistics
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            queueLength: this.renderQueue.length,
            isProcessing: this.isProcessing
        };
    }

    /**
     * Clear render queue
     */
    clearQueue() {
        this.renderQueue = [];
        this.isProcessing = false;
        console.log('🧹 Render queue cleared');
    }

    /**
     * Wait for all pending renders to complete
     */
    async waitForCompletion(timeout = 10000) {
        const startTime = Date.now();
        
        while (this.isProcessing || this.renderQueue.length > 0) {
            if (Date.now() - startTime > timeout) {
                console.warn('⚠️ Render completion timeout');
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('✅ All renders completed');
    }
}

// Export singleton instance
export const mathRendererManager = new MathRendererManager();