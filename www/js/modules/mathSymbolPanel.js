// =================================================================================
//  Matematik Sembol Paneli - mathSymbolPanel.js
//  Basit ve kullanıcı dostu matematik sembol girişi
// =================================================================================

export class MathSymbolPanel {
    constructor() {
        this.symbols = this.initializeSymbols();
        this.activeTextarea = null;
    }
    
    // Matematik sembollerini kategorilere ayır
    initializeSymbols() {
        return {
            // Temel matematik sembolleri
            basic: [
                { symbol: '+', name: 'Toplama', shortcut: 'plus' },
                { symbol: '-', name: 'Çıkarma', shortcut: 'minus' },
                { symbol: '×', name: 'Çarpma', shortcut: 'times' },
                { symbol: '÷', name: 'Bölme', shortcut: 'divide' },
                { symbol: '=', name: 'Eşittir', shortcut: 'equals' },
                { symbol: '≠', name: 'Eşit değil', shortcut: 'neq' },
                { symbol: '≈', name: 'Yaklaşık', shortcut: 'approx' },
                { symbol: '±', name: 'Artı-eksi', shortcut: 'pm' }
            ],
            
            // Üs ve kök sembolleri
            powers: [
                { symbol: '²', name: 'Kare', shortcut: '^2' },
                { symbol: '³', name: 'Küp', shortcut: '^3' },
                { symbol: '⁴', name: 'Dördüncü kuvvet', shortcut: '^4' },
                { symbol: '⁵', name: 'Beşinci kuvvet', shortcut: '^5' },
                { symbol: '√', name: 'Karekök', shortcut: 'sqrt', template: '√()' },
                { symbol: '∛', name: 'Küpkök', shortcut: 'cbrt', template: '∛()' },
                { symbol: '^', name: 'Üs', shortcut: 'pow', template: '^()' }
            ],
            
            // Kesirler ve ondalık
            fractions: [
                { symbol: '½', name: 'Yarım', shortcut: '1/2' },
                { symbol: '⅓', name: 'Üçte bir', shortcut: '1/3' },
                { symbol: '⅔', name: 'Üçte iki', shortcut: '2/3' },
                { symbol: '¼', name: 'Çeyrek', shortcut: '1/4' },
                { symbol: '¾', name: 'Dörtte üç', shortcut: '3/4' },
                { symbol: '/', name: 'Kesir çizgisi', shortcut: 'frac', template: '()/()', cursorOffset: 1 }
            ],
            
            // Karşılaştırma sembolleri
            comparison: [
                { symbol: '<', name: 'Küçüktür', shortcut: 'lt' },
                { symbol: '>', name: 'Büyüktür', shortcut: 'gt' },
                { symbol: '≤', name: 'Küçük eşit', shortcut: 'leq' },
                { symbol: '≥', name: 'Büyük eşit', shortcut: 'geq' },
                { symbol: '∞', name: 'Sonsuz', shortcut: 'inf' },
                { symbol: '°', name: 'Derece', shortcut: 'deg' }
            ],
            
            // Trigonometri
            trigonometry: [
                { symbol: 'sin', name: 'Sinüs', shortcut: 'sin', template: 'sin()' },
                { symbol: 'cos', name: 'Kosinüs', shortcut: 'cos', template: 'cos()' },
                { symbol: 'tan', name: 'Tanjant', shortcut: 'tan', template: 'tan()' },
                { symbol: 'π', name: 'Pi', shortcut: 'pi' },
                { symbol: 'θ', name: 'Teta', shortcut: 'theta' },
                { symbol: 'α', name: 'Alfa', shortcut: 'alpha' }
            ],
            
            // Parantez ve işlemler
            brackets: [
                { symbol: '(', name: 'Sol parantez', shortcut: '(' },
                { symbol: ')', name: 'Sağ parantez', shortcut: ')' },
                { symbol: '[', name: 'Sol köşeli parantez', shortcut: '[' },
                { symbol: ']', name: 'Sağ köşeli parantez', shortcut: ']' },
                { symbol: '{', name: 'Sol süslü parantez', shortcut: '{' },
                { symbol: '}', name: 'Sağ süslü parantez', shortcut: '}' },
                { symbol: '|', name: 'Mutlak değer', shortcut: 'abs', template: '|{}|', cursorOffset: 1 }
            ]
        };
    }
    
    // Paneli oluştur ve textarea'ya bağla
    createPanel(textareaId) {
        const textarea = document.getElementById(textareaId);
        if (!textarea) {
            console.error('Textarea bulunamadı:', textareaId);
            return null;
        }
        
        this.activeTextarea = textarea;
        
        const panelHTML = this.generatePanelHTML();
        
        // Panel container'ını textarea'nın altına ekle
        const panelContainer = document.createElement('div');
        panelContainer.className = 'math-symbol-panel-container mt-3';
        panelContainer.innerHTML = panelHTML;
        
        // Textarea'nın parent'ına ekle
        textarea.parentNode.insertBefore(panelContainer, textarea.nextSibling);
        
        // Event listener'ları bağla
        this.attachEventListeners(panelContainer);
        
        return panelContainer;
    }
    
    // Panel HTML'ini oluştur
    generatePanelHTML() {
        return `
            <div class="math-symbol-panel bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4">
                <!-- Panel Başlığı -->
                <div class="flex items-center justify-between mb-3">
                    <h4 class="text-sm font-semibold text-blue-800 flex items-center gap-2">
                        🔢 Matematik Sembolleri
                    </h4>
                    <button class="panel-toggle-btn text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded transition-colors">
                        Gizle/Göster
                    </button>
                </div>
                
                <!-- Kategori Seçici -->
                <div class="category-selector flex flex-wrap gap-2 mb-3">
                    <button class="category-btn active" data-category="basic">Temel</button>
                    <button class="category-btn" data-category="powers">Üs/Kök</button>
                    <button class="category-btn" data-category="fractions">Kesir</button>
                    <button class="category-btn" data-category="comparison">Karşılaştırma</button>
                    <button class="category-btn" data-category="trigonometry">Trigonometri</button>
                    <button class="category-btn" data-category="brackets">Parantez</button>
                </div>
                
                <!-- Sembol Grid'leri -->
                <div class="symbol-grids">
                    ${Object.entries(this.symbols).map(([category, symbols]) => 
                        this.generateCategoryGrid(category, symbols)
                    ).join('')}
                </div>
                
                <!-- Hızlı Erişim -->
                <div class="quick-access mt-3 pt-3 border-t border-blue-200">
                    <div class="text-xs text-blue-700 mb-2">Hızlı Erişim:</div>
                    <div class="flex flex-wrap gap-1">
                        ${['=', '+', '-', '×', '÷', '²', '√', '(', ')', 'π'].map(symbol => 
                            `<button class="quick-symbol-btn" data-symbol="${symbol}">${symbol}</button>`
                        ).join('')}
                    </div>
                </div>
                
                <!-- Temizle ve İpuçları -->
                <div class="panel-actions mt-3 pt-3 border-t border-blue-200 flex items-center justify-between">
                    <div class="text-xs text-gray-600 flex gap-4">
                        <span>💡 Sembollere tıklayarak ekleyin</span>
                        <span>⌨️ Klavye kısayolları: ^2, sqrt, pi</span>
                    </div>
                    <button class="clear-input-btn text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors">
                        Temizle
                    </button>
                </div>
            </div>
        `;
    }
    
    // Kategori grid'ini oluştur
    generateCategoryGrid(category, symbols) {
        const isActive = category === 'basic' ? 'active' : 'hidden';
        
        return `
            <div class="symbol-grid ${isActive}" data-category="${category}">
                <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    ${symbols.map(symbolData => 
                        `<button class="symbol-btn" 
                                data-symbol="${symbolData.symbol}"
                                data-template="${symbolData.template || ''}"
                                data-cursor-offset="${symbolData.cursorOffset || 0}"
                                title="${symbolData.name} (${symbolData.shortcut})"
                                >
                            ${symbolData.symbol}
                        </button>`
                    ).join('')}
                </div>
            </div>
        `;
    }
    
    // Event listener'ları bağla
    attachEventListeners(panelContainer) {
        // Kategori değiştirme
        panelContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-btn')) {
                this.switchCategory(panelContainer, e.target.dataset.category);
            }
            
            // Sembol ekleme
            if (e.target.classList.contains('symbol-btn') || e.target.classList.contains('quick-symbol-btn')) {
                this.insertSymbol(e.target);
            }
            
            // Panel toggle
            if (e.target.classList.contains('panel-toggle-btn')) {
                this.togglePanel(panelContainer);
            }
            
            // Input temizleme
            if (e.target.classList.contains('clear-input-btn')) {
                this.clearInput();
            }
        });
        
        // Klavye kısayolları
        if (this.activeTextarea) {
            this.activeTextarea.addEventListener('input', (e) => {
                this.handleKeyboardShortcuts(e);
            });
        }
    }
    
    // Kategori değiştir
    switchCategory(panelContainer, category) {
        // Butonları güncelle
        const categoryBtns = panelContainer.querySelectorAll('.category-btn');
        categoryBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.category === category) {
                btn.classList.add('active');
            }
        });
        
        // Grid'leri güncelle
        const symbolGrids = panelContainer.querySelectorAll('.symbol-grid');
        symbolGrids.forEach(grid => {
            grid.classList.add('hidden');
            grid.classList.remove('active');
            if (grid.dataset.category === category) {
                grid.classList.remove('hidden');
                grid.classList.add('active');
            }
        });
    }
    
    // Sembol ekle
    insertSymbol(button) {
        if (!this.activeTextarea) return;
        
        const symbol = button.dataset.symbol;
        const template = button.dataset.template;
        const cursorOffset = parseInt(button.dataset.cursorOffset || 0);
        
        const cursorPos = this.activeTextarea.selectionStart;
        const textBefore = this.activeTextarea.value.substring(0, cursorPos);
        const textAfter = this.activeTextarea.value.substring(cursorPos);
        
        let insertText = template || symbol;
        let newCursorPos = cursorPos + insertText.length - cursorOffset;
        
        // Özel şablonlar için cursor pozisyonunu ayarla
        if (template) {
            if (template.includes('()')) {
                newCursorPos = cursorPos + template.indexOf('()') + 1;
            } else if (template.includes('{}')) {
                newCursorPos = cursorPos + template.indexOf('{}') + 1;
                insertText = template.replace('{}', '');
            }
        }
        
        // Metni güncelle
        this.activeTextarea.value = textBefore + insertText + textAfter;
        
        // Cursor'u doğru pozisyona getir
        this.activeTextarea.setSelectionRange(newCursorPos, newCursorPos);
        this.activeTextarea.focus();
        
        // Görsel feedback
        this.showInsertFeedback(button, symbol);
    }
    
    // Klavye kısayollarını işle
    handleKeyboardShortcuts(e) {
        const value = this.activeTextarea.value;
        const cursorPos = this.activeTextarea.selectionStart;
        
        // Basit kısayollar
        const shortcuts = {
            '^2': '²',
            '^3': '³',
            'sqrt': '√',
            'pi': 'π',
            'theta': 'θ',
            'alpha': 'α',
            'inf': '∞',
            'deg': '°',
            'neq': '≠',
            'leq': '≤',
            'geq': '≥',
            'pm': '±'
        };
        
        // Son yazılan kelimeyi kontrol et
        const wordMatch = value.substring(0, cursorPos).match(/(\w+)$/);
        if (wordMatch) {
            const word = wordMatch[1];
            if (shortcuts[word]) {
                const replacement = shortcuts[word];
                const newValue = value.substring(0, cursorPos - word.length) + replacement + value.substring(cursorPos);
                this.activeTextarea.value = newValue;
                this.activeTextarea.setSelectionRange(cursorPos - word.length + replacement.length, cursorPos - word.length + replacement.length);
            }
        }
    }
    
    // Panel'i gizle/göster
    togglePanel(panelContainer) {
        const symbolGrids = panelContainer.querySelector('.symbol-grids');
        const quickAccess = panelContainer.querySelector('.quick-access');
        const panelActions = panelContainer.querySelector('.panel-actions');
        
        if (symbolGrids.style.display === 'none') {
            symbolGrids.style.display = 'block';
            quickAccess.style.display = 'block';
            panelActions.style.display = 'flex';
        } else {
            symbolGrids.style.display = 'none';
            quickAccess.style.display = 'none';
            panelActions.style.display = 'none';
        }
    }
    
    // Input'u temizle
    clearInput() {
        if (this.activeTextarea) {
            this.activeTextarea.value = '';
            this.activeTextarea.focus();
        }
    }
    
    // Görsel feedback göster
    showInsertFeedback(button, symbol) {
        button.style.transform = 'scale(1.2)';
        button.style.backgroundColor = '#3B82F6';
        button.style.color = 'white';
        
        setTimeout(() => {
            button.style.transform = 'scale(1)';
            button.style.backgroundColor = '';
            button.style.color = '';
        }, 200);
    }
    
    // Panel'i kaldır
    destroy() {
        const panels = document.querySelectorAll('.math-symbol-panel-container');
        panels.forEach(panel => panel.remove());
        this.activeTextarea = null;
    }
}

// Singleton instance
export const mathSymbolPanel = new MathSymbolPanel();