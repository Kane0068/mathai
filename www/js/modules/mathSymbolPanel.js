// mathSymbolPanel.js
// Matematik sembol paneli.
// Sadece sembol paneli ile ilgili fonksiyonlar burada olmalı.
// Ortak yardımcılar utils.js'e taşınmalı.

class EnhancedMathSymbolPanel {
    constructor() {
        this.panels = new Map();
        this.symbols = this.initializeSymbols();
        this.isInitialized = false;
    }
    
    initializeSymbols() {
        return {
            basic: [
                { symbol: '+', latex: '+', label: 'Toplama' },
                { symbol: '−', latex: '-', label: 'Çıkarma' },
                { symbol: '×', latex: '\\times', label: 'Çarpma' },
                { symbol: '÷', latex: '\\div', label: 'Bölme' },
                { symbol: '=', latex: '=', label: 'Eşittir' },
                { symbol: '≠', latex: '\\neq', label: 'Eşit değil' },
                { symbol: '≈', latex: '\\approx', label: 'Yaklaşık eşit' },
                { symbol: '<', latex: '<', label: 'Küçüktür' },
                { symbol: '>', latex: '>', label: 'Büyüktür' },
                { symbol: '≤', latex: '\\leq', label: 'Küçük eşit' },
                { symbol: '≥', latex: '\\geq', label: 'Büyük eşit' }
            ],
            fractions: [
                { symbol: '½', latex: '\\frac{1}{2}', label: 'Bir bölü iki' },
                { symbol: '⅓', latex: '\\frac{1}{3}', label: 'Bir bölü üç' },
                { symbol: '¼', latex: '\\frac{1}{4}', label: 'Bir bölü dört' },
                { symbol: 'a/b', latex: '\\frac{a}{b}', label: 'Kesir' },
                { symbol: 'a/bc', latex: '\\frac{a}{bc}', label: 'Karışık kesir' }
            ],
            powers: [
                { symbol: 'x²', latex: 'x^2', label: 'Kare' },
                { symbol: 'x³', latex: 'x^3', label: 'Küp' },
                { symbol: 'xⁿ', latex: 'x^n', label: 'Üs' },
                { symbol: '√', latex: '\\sqrt{x}', label: 'Karekök' },
                { symbol: '∛', latex: '\\sqrt[3]{x}', label: 'Küpkök' },
                { symbol: 'ⁿ√', latex: '\\sqrt[n]{x}', label: 'n. kök' }
            ],
            greek: [
                { symbol: 'α', latex: '\\alpha', label: 'Alfa' },
                { symbol: 'β', latex: '\\beta', label: 'Beta' },
                { symbol: 'γ', latex: '\\gamma', label: 'Gama' },
                { symbol: 'δ', latex: '\\delta', label: 'Delta' },
                { symbol: 'θ', latex: '\\theta', label: 'Teta' },
                { symbol: 'λ', latex: '\\lambda', label: 'Lambda' },
                { symbol: 'μ', latex: '\\mu', label: 'Mü' },
                { symbol: 'π', latex: '\\pi', label: 'Pi' },
                { symbol: 'σ', latex: '\\sigma', label: 'Sigma' },
                { symbol: 'φ', latex: '\\phi', label: 'Fi' },
                { symbol: 'ω', latex: '\\omega', label: 'Omega' }
            ],
            functions: [
                { symbol: 'sin', latex: '\\sin', label: 'Sinüs' },
                { symbol: 'cos', latex: '\\cos', label: 'Kosinüs' },
                { symbol: 'tan', latex: '\\tan', label: 'Tanjant' },
                { symbol: 'log', latex: '\\log', label: 'Logaritma' },
                { symbol: 'ln', latex: '\\ln', label: 'Doğal log' },
                { symbol: 'lim', latex: '\\lim', label: 'Limit' },
                { symbol: '∫', latex: '\\int', label: 'İntegral' },
                { symbol: '∑', latex: '\\sum', label: 'Toplam' },
                { symbol: '∏', latex: '\\prod', label: 'Çarpım' }
            ],
            sets: [
                { symbol: '∈', latex: '\\in', label: 'Elemanı' },
                { symbol: '∉', latex: '\\notin', label: 'Elemanı değil' },
                { symbol: '⊂', latex: '\\subset', label: 'Alt küme' },
                { symbol: '⊆', latex: '\\subseteq', label: 'Alt küme eşit' },
                { symbol: '∪', latex: '\\cup', label: 'Birleşim' },
                { symbol: '∩', latex: '\\cap', label: 'Kesişim' },
                { symbol: '∅', latex: '\\emptyset', label: 'Boş küme' },
                { symbol: 'ℕ', latex: '\\mathbb{N}', label: 'Doğal sayılar' },
                { symbol: 'ℤ', latex: '\\mathbb{Z}', label: 'Tam sayılar' },
                { symbol: 'ℚ', latex: '\\mathbb{Q}', label: 'Rasyonel sayılar' },
                { symbol: 'ℝ', latex: '\\mathbb{R}', label: 'Gerçel sayılar' }
            ]
        };
    }
    
    createPanel(textareaId) {
        try {
            const textarea = document.getElementById(textareaId);
            if (!textarea) {
                console.error(`❌ Textarea not found: ${textareaId}`);
                return null;
            }
            
            // Remove existing panel
            this.destroyPanel(textareaId);
            
            const panelContainer = document.createElement('div');
            panelContainer.className = 'math-symbol-panel mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg';
            panelContainer.id = `math-panel-${textareaId}`;
            
            // Panel header
            const header = document.createElement('div');
            header.className = 'flex items-center justify-between mb-3';
            header.innerHTML = `
                <h4 class="text-sm font-semibold text-gray-700">Matematik Sembolleri</h4>
                <button class="panel-toggle text-xs text-blue-600 hover:text-blue-800" data-panel="${textareaId}">
                    Gizle
                </button>
            `;
            panelContainer.appendChild(header);
            
            // Create tabs
            const tabsContainer = document.createElement('div');
            tabsContainer.className = 'tabs-container mb-3';
            
            const tabsList = document.createElement('div');
            tabsList.className = 'flex flex-wrap gap-1 mb-2 border-b border-gray-200';
            
            const tabsContent = document.createElement('div');
            tabsContent.className = 'tabs-content';
            
            // Create tabs for each symbol category
            Object.keys(this.symbols).forEach((category, index) => {
                // Tab button
                const tabButton = document.createElement('button');
                tabButton.className = `tab-button px-3 py-1 text-xs rounded-t-lg transition-colors ${
                    index === 0 ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`;
                tabButton.textContent = this.getCategoryLabel(category);
                tabButton.dataset.category = category;
                tabButton.dataset.panel = textareaId;
                tabsList.appendChild(tabButton);
                
                // Tab content
                const tabContent = document.createElement('div');
                tabContent.className = `tab-content ${index === 0 ? '' : 'hidden'}`;
                tabContent.dataset.category = category;
                
                const symbolsGrid = document.createElement('div');
                symbolsGrid.className = 'symbols-grid grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1';
                
                this.symbols[category].forEach(symbolData => {
                    const symbolButton = document.createElement('button');
                    symbolButton.className = 'symbol-button p-2 text-sm bg-white border border-gray-300 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500';
                    symbolButton.innerHTML = symbolData.symbol;
                    symbolButton.title = `${symbolData.label} (${symbolData.latex})`;
                    symbolButton.dataset.latex = symbolData.latex;
                    symbolButton.dataset.symbol = symbolData.symbol;
                    symbolButton.dataset.textarea = textareaId;
                    
                    symbolsGrid.appendChild(symbolButton);
                });
                
                tabContent.appendChild(symbolsGrid);
                tabsContent.appendChild(tabContent);
            });
            
            tabsContainer.appendChild(tabsList);
            tabsContainer.appendChild(tabsContent);
            panelContainer.appendChild(tabsContainer);
            
            // Insert panel after textarea
            textarea.parentNode.insertBefore(panelContainer, textarea.nextSibling);
            
            // Setup event listeners
            this.setupPanelEventListeners(panelContainer, textareaId);
            
            // Store panel reference
            this.panels.set(textareaId, {
                container: panelContainer,
                textarea: textarea,
                isVisible: true
            });
            
            console.log(`✅ Math symbol panel created for: ${textareaId}`);
            return panelContainer;
            
        } catch (error) {
            console.error(`❌ Error creating math panel for ${textareaId}:`, error);
            return null;
        }
    }
    
    setupPanelEventListeners(panelContainer, textareaId) {
        // Tab switching
        panelContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-button')) {
                e.preventDefault();
                this.switchTab(e.target.dataset.category, textareaId);
            }
        });
        
        // Symbol insertion
        panelContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('symbol-button')) {
                e.preventDefault();
                this.insertSymbol(e.target.dataset.latex, textareaId);
            }
        });
        
        // Panel toggle
        panelContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('panel-toggle')) {
                e.preventDefault();
                this.togglePanel(textareaId);
            }
        });
        
        // Keyboard shortcuts
        const textarea = document.getElementById(textareaId);
        if (textarea) {
            textarea.addEventListener('keydown', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    switch (e.key) {
                        case 'm':
                            e.preventDefault();
                            this.togglePanel(textareaId);
                            break;
                        case 'f':
                            if (e.shiftKey) {
                                e.preventDefault();
                                this.insertSymbol('\\frac{}{}_cursor_', textareaId);
                            }
                            break;
                        case 'r':
                            if (e.shiftKey) {
                                e.preventDefault();
                                this.insertSymbol('\\sqrt{}_cursor_', textareaId);
                            }
                            break;
                    }
                }
            });
        }
    }
    
    switchTab(category, textareaId) {
        const panelContainer = this.panels.get(textareaId)?.container;
        if (!panelContainer) return;
        
        // Update tab buttons
        const tabButtons = panelContainer.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            if (button.dataset.category === category) {
                button.className = 'tab-button px-3 py-1 text-xs rounded-t-lg transition-colors bg-blue-100 text-blue-700 border-b-2 border-blue-500';
            } else {
                button.className = 'tab-button px-3 py-1 text-xs rounded-t-lg transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200';
            }
        });
        
        // Update tab content
        const tabContents = panelContainer.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            if (content.dataset.category === category) {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        });
    }
    
    insertSymbol(latex, textareaId) {
        const textarea = document.getElementById(textareaId);
        if (!textarea) return;
        
        try {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            
            // Handle special cursor positioning
            let insertText = latex;
            let cursorOffset = latex.length;
            
            if (latex.includes('_cursor_')) {
                const parts = latex.split('_cursor_');
                insertText = parts.join('');
                cursorOffset = parts[0].length;
            }
            
            // Insert text
            const newText = text.substring(0, start) + insertText + text.substring(end);
            textarea.value = newText;
            
            // Set cursor position
            const newCursorPos = start + cursorOffset;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
            
            // Focus and trigger events
            textarea.focus();
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            
            console.log(`✅ Symbol inserted: ${latex} at position ${start}`);
            
        } catch (error) {
            console.error(`❌ Error inserting symbol: ${latex}`, error);
        }
    }
    
    togglePanel(textareaId) {
        const panelData = this.panels.get(textareaId);
        if (!panelData) return;
        
        const { container } = panelData;
        const toggleButton = container.querySelector('.panel-toggle');
        
        if (panelData.isVisible) {
            container.style.display = 'none';
            toggleButton.textContent = 'Göster';
            panelData.isVisible = false;
        } else {
            container.style.display = 'block';
            toggleButton.textContent = 'Gizle';
            panelData.isVisible = true;
        }
        
        console.log(`🔄 Panel toggled for ${textareaId}: ${panelData.isVisible ? 'shown' : 'hidden'}`);
    }
    
    destroyPanel(textareaId) {
        const panelData = this.panels.get(textareaId);
        if (!panelData) return;
        
        try {
            // Remove DOM element
            if (panelData.container && panelData.container.parentNode) {
                panelData.container.parentNode.removeChild(panelData.container);
            }
            
            // Remove from map
            this.panels.delete(textareaId);
            
            console.log(`🧹 Math panel destroyed for: ${textareaId}`);
            
        } catch (error) {
            console.error(`❌ Error destroying panel for ${textareaId}:`, error);
        }
    }
    
    destroy() {
        // Destroy all panels
        for (const textareaId of this.panels.keys()) {
            this.destroyPanel(textareaId);
        }
        
        console.log('🧹 All math symbol panels destroyed');
    }
    
    getCategoryLabel(category) {
        const labels = {
            basic: 'Temel',
            fractions: 'Kesir',
            powers: 'Üs/Kök',
            greek: 'Yunan',
            functions: 'Fonks.',
            sets: 'Küme'
        };
        return labels[category] || category;
    }
    
    getPanelStats() {
        return {
            totalPanels: this.panels.size,
            activePanels: Array.from(this.panels.values()).filter(p => p.isVisible).length,
            panels: Array.from(this.panels.keys())
        };
    }
}

// Export: Hem default hem adlandırılmış şekilde
const mathSymbolPanel = new EnhancedMathSymbolPanel();
export { mathSymbolPanel };
export default mathSymbolPanel;