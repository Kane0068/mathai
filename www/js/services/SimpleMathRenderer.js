// www/js/services/SimpleMathRenderer.js
// A simple math renderer that doesn't depend on external libraries

export class SimpleMathRenderer {
    constructor() {
        this.initialized = true; // Always ready
    }

    /**
     * Simple render function that converts basic LaTeX to readable text
     */
    async renderContent(element, options = {}) {
        if (!element) {
            console.warn('Render edilecek element bulunamadı.');
            return;
        }

        try {
            // Process smart content elements
            const smartElements = element.querySelectorAll('.smart-content[data-content]');
            
            for (const smartElement of smartElements) {
                const content = smartElement.getAttribute('data-content');
                if (content) {
                    this.renderSmartContent(smartElement, content);
                }
            }

            // Process any existing math content
            this.processExistingMath(element);
            
        } catch (error) {
            console.error('Simple math render error:', error);
        }
    }

    /**
     * Render smart content with basic LaTeX conversion
     */
    renderSmartContent(element, content) {
        const processedContent = this.convertLatexToText(content);
        element.innerHTML = this.formatMathText(processedContent);
    }

    /**
     * Process existing math elements in the container
     */
    processExistingMath(container) {
        // Find and process any LaTeX-like content
        const mathRegex = /\$\$([^$]+)\$\$|\$([^$]+)\$/g;
        
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        
        while (node = walker.nextNode()) {
            if (mathRegex.test(node.textContent)) {
                textNodes.push(node);
            }
        }

        textNodes.forEach(textNode => {
            const processedText = this.convertLatexToText(textNode.textContent);
            const span = document.createElement('span');
            span.innerHTML = this.formatMathText(processedText);
            textNode.parentNode.replaceChild(span, textNode);
        });
    }

    /**
     * Convert basic LaTeX commands to readable text
     */
    convertLatexToText(text) {
        if (typeof text !== 'string') return text;

        return text
            // Remove double dollar signs (display math)
            .replace(/\$\$([^$]+)\$\$/g, '<div class="math-display">$1</div>')
            
            // Remove single dollar signs (inline math)
            .replace(/\$([^$]+)\$/g, '<span class="math-inline">$1</span>')
            
            // Convert fractions
            .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
            
            // Convert square roots
            .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
            .replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '$2^(1/$1)')
            
            // Convert powers and subscripts
            .replace(/\^(\w+|\{[^}]+\})/g, (match, p1) => {
                const power = p1.replace(/[{}]/g, '');
                return `<sup>${power}</sup>`;
            })
            .replace(/_(\w+|\{[^}]+\})/g, (match, p1) => {
                const subscript = p1.replace(/[{}]/g, '');
                return `<sub>${subscript}</sub>`;
            })
            
            // Greek letters
            .replace(/\\alpha/g, 'α')
            .replace(/\\beta/g, 'β')
            .replace(/\\gamma/g, 'γ')
            .replace(/\\delta/g, 'δ')
            .replace(/\\epsilon/g, 'ε')
            .replace(/\\zeta/g, 'ζ')
            .replace(/\\eta/g, 'η')
            .replace(/\\theta/g, 'θ')
            .replace(/\\iota/g, 'ι')
            .replace(/\\kappa/g, 'κ')
            .replace(/\\lambda/g, 'λ')
            .replace(/\\mu/g, 'μ')
            .replace(/\\nu/g, 'ν')
            .replace(/\\xi/g, 'ξ')
            .replace(/\\pi/g, 'π')
            .replace(/\\rho/g, 'ρ')
            .replace(/\\sigma/g, 'σ')
            .replace(/\\tau/g, 'τ')
            .replace(/\\upsilon/g, 'υ')
            .replace(/\\phi/g, 'φ')
            .replace(/\\chi/g, 'χ')
            .replace(/\\psi/g, 'ψ')
            .replace(/\\omega/g, 'ω')
            
            // Capital Greek letters
            .replace(/\\Gamma/g, 'Γ')
            .replace(/\\Delta/g, 'Δ')
            .replace(/\\Theta/g, 'Θ')
            .replace(/\\Lambda/g, 'Λ')
            .replace(/\\Xi/g, 'Ξ')
            .replace(/\\Pi/g, 'Π')
            .replace(/\\Sigma/g, 'Σ')
            .replace(/\\Phi/g, 'Φ')
            .replace(/\\Psi/g, 'Ψ')
            .replace(/\\Omega/g, 'Ω')
            
            // Mathematical operators
            .replace(/\\sum/g, '∑')
            .replace(/\\prod/g, '∏')
            .replace(/\\int/g, '∫')
            .replace(/\\oint/g, '∮')
            .replace(/\\partial/g, '∂')
            .replace(/\\nabla/g, '∇')
            .replace(/\\infty/g, '∞')
            
            // Relations
            .replace(/\\le/g, '≤')
            .replace(/\\ge/g, '≥')
            .replace(/\\leq/g, '≤')
            .replace(/\\geq/g, '≥')
            .replace(/\\ne/g, '≠')
            .replace(/\\neq/g, '≠')
            .replace(/\\approx/g, '≈')
            .replace(/\\equiv/g, '≡')
            .replace(/\\sim/g, '∼')
            .replace(/\\propto/g, '∝')
            
            // Arrows
            .replace(/\\rightarrow/g, '→')
            .replace(/\\leftarrow/g, '←')
            .replace(/\\leftrightarrow/g, '↔')
            .replace(/\\Rightarrow/g, '⇒')
            .replace(/\\Leftarrow/g, '⇐')
            .replace(/\\Leftrightarrow/g, '⇔')
            
            // Operations
            .replace(/\\pm/g, '±')
            .replace(/\\mp/g, '∓')
            .replace(/\\times/g, '×')
            .replace(/\\div/g, '÷')
            .replace(/\\cdot/g, '·')
            .replace(/\\ast/g, '∗')
            .replace(/\\star/g, '⋆')
            .replace(/\\circ/g, '∘')
            .replace(/\\bullet/g, '•')
            
            // Sets
            .replace(/\\in/g, '∈')
            .replace(/\\notin/g, '∉')
            .replace(/\\subset/g, '⊂')
            .replace(/\\supset/g, '⊃')
            .replace(/\\subseteq/g, '⊆')
            .replace(/\\supseteq/g, '⊇')
            .replace(/\\cup/g, '∪')
            .replace(/\\cap/g, '∩')
            .replace(/\\emptyset/g, '∅')
            
            // Logic
            .replace(/\\land/g, '∧')
            .replace(/\\lor/g, '∨')
            .replace(/\\neg/g, '¬')
            .replace(/\\forall/g, '∀')
            .replace(/\\exists/g, '∃')
            
            // Miscellaneous
            .replace(/\\degree/g, '°')
            .replace(/\\celsius/g, '℃')
            .replace(/\\angle/g, '∠')
            .replace(/\\triangle/g, '△')
            .replace(/\\square/g, '□')
            .replace(/\\diamond/g, '◊')
            
            // Trigonometric functions
            .replace(/\\sin/g, 'sin')
            .replace(/\\cos/g, 'cos')
            .replace(/\\tan/g, 'tan')
            .replace(/\\cot/g, 'cot')
            .replace(/\\sec/g, 'sec')
            .replace(/\\csc/g, 'csc')
            .replace(/\\arcsin/g, 'arcsin')
            .replace(/\\arccos/g, 'arccos')
            .replace(/\\arctan/g, 'arctan')
            
            // Logarithms
            .replace(/\\log/g, 'log')
            .replace(/\\ln/g, 'ln')
            .replace(/\\lg/g, 'lg')
            
            // Limits
            .replace(/\\lim/g, 'lim')
            .replace(/\\max/g, 'max')
            .replace(/\\min/g, 'min')
            .replace(/\\sup/g, 'sup')
            .replace(/\\inf/g, 'inf')
            
            // Remove remaining LaTeX commands
            .replace(/\\text\{([^}]+)\}/g, '$1')
            .replace(/\\mathrm\{([^}]+)\}/g, '$1')
            .replace(/\\mathbf\{([^}]+)\}/g, '<strong>$1</strong>')
            .replace(/\\mathit\{([^}]+)\}/g, '<em>$1</em>')
            
            // Clean up remaining backslashes and braces
            .replace(/\\([a-zA-Z]+)/g, '$1')
            .replace(/\{([^}]+)\}/g, '$1')
            
            // Clean up extra spaces
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Format mathematical text with proper styling
     */
    formatMathText(text) {
        return text
            .replace(/<div class="math-display">([^<]+)<\/div>/g, 
                '<div class="math-display bg-blue-50 p-3 my-2 rounded border text-center font-mono">$1</div>')
            .replace(/<span class="math-inline">([^<]+)<\/span>/g, 
                '<span class="math-inline bg-blue-100 px-2 py-1 rounded font-mono">$1</span>');
    }

    /**
     * Render problem summary (simple version)
     */
    async renderProblemSummary(problemOzeti, container) {
        if (!problemOzeti || !container) return;

        const { verilenler, istenen } = problemOzeti;
        let summaryHTML = `
            <div class="problem-summary bg-blue-50 p-4 rounded-lg mb-4">
                <h3 class="font-semibold text-blue-800 mb-2">Problem Özeti:</h3>`;

        if (verilenler && verilenler.length > 0) {
            summaryHTML += `
                <div class="mb-2">
                    <strong>Verilenler:</strong>
                    <ul class="list-disc list-inside ml-4">`;
            
            verilenler.forEach((veri, index) => {
                const processedVeri = this.convertLatexToText(veri);
                summaryHTML += `<li>${this.formatMathText(processedVeri)}</li>`;
            });
            
            summaryHTML += `</ul></div>`;
        }

        if (istenen) {
            const processedIstenen = this.convertLatexToText(istenen);
            summaryHTML += `
                <div>
                    <strong>İstenen:</strong> ${this.formatMathText(processedIstenen)}
                </div>`;
        }

        summaryHTML += '</div>';
        container.innerHTML = summaryHTML;
    }

    /**
     * Render full solution (simple version)
     */
    async renderFullSolution(solution, container) {
        if (!solution || !container) return;

        let html = `
            <div class="full-solution-container">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-800">Tam Çözüm</h3>
                    <button id="back-to-main-menu-btn" class="btn btn-secondary">Ana Menüye Dön</button>
                </div>`;

        if (solution.adimlar && solution.adimlar.length > 0) {
            solution.adimlar.forEach((step, index) => {
                html += `<div class="solution-step p-4 mb-3 bg-gray-50 rounded-lg">`;
                html += `<div class="step-number font-semibold text-blue-600 mb-2">${index + 1}. Adım</div>`;
                
                if (step.adimAciklamasi) {
                    const processedAciklama = this.convertLatexToText(step.adimAciklamasi);
                    html += `<div class="step-explanation mb-2"><strong>Açıklama:</strong> ${this.formatMathText(processedAciklama)}</div>`;
                }
                
                if (step.cozum_lateks) {
                    const processedLatex = this.convertLatexToText(step.cozum_lateks);
                    html += `<div class="step-formula mb-2"><strong>Formül:</strong> ${this.formatMathText(processedLatex)}</div>`;
                }
                
                if (step.ipucu) {
                    const processedIpucu = this.convertLatexToText(step.ipucu);
                    html += `<div class="step-hint"><strong>İpucu:</strong> ${this.formatMathText(processedIpucu)}</div>`;
                }
                
                html += `</div>`;
            });
        }

        if (solution.sonuclar && solution.sonuclar.length > 0) {
            html += `
                <div class="final-results p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 class="font-semibold text-green-800 mb-2">Final Sonuçlar:</h4>
                    <ul class="list-disc list-inside">`;
            
            solution.sonuclar.forEach((sonuc, index) => {
                const processedSonuc = this.convertLatexToText(sonuc);
                html += `<li>${this.formatMathText(processedSonuc)}</li>`;
            });
            
            html += `</ul></div>`;
        }

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Get renderer statistics
     */
    getStats() {
        return {
            type: 'SimpleMathRenderer',
            initialized: this.initialized,
            fallbackMode: true,
            features: ['LaTeX-to-text conversion', 'Unicode symbols', 'Basic formatting']
        };
    }

    /**
     * Always returns true since this renderer doesn't depend on external libraries
     */
    isReady() {
        return true;
    }
}

// Create and export singleton instance
export const simpleMathRenderer = new SimpleMathRenderer();