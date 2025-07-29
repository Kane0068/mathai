// ui.js
// Arayüz işlemleri ve DOM yardımcıları.
// Sadece UI ile ilgili fonksiyonlar burada olmalı.
// Ortak yardımcılar utils.js'e taşınmalı.

// =================================================================================
//  MathAi - UI Modülü - Düzeltilmiş Error Handling
//  Tamam butonu sorunu çözüldü
// =================================================================================

import { enhancedMathRenderer, enhancedMathUI } from './enhancedAdvancedMathRenderer.js';
import { escapeHtml, logError, sleep } from './utils.js';

let domReadyPromise = null;

// API Tutarsızlığı için LaTeX normalizer
const LATEX_PATTERNS = {
    fixBackslashes: {
        pattern: /\\{3,}/g,
        replacement: '\\\\',
        description: 'Fazla backslash temizleme'
    },
    singleBackslash: {
        pattern: /\\([a-zA-Z]+)(?!\\)/g,
        replacement: (match, command) => {
            const context = match.substring(0, match.indexOf(command) - 1);
            if (context.endsWith('\\')) return match;
            return `\\\\${command}`;
        },
        description: 'Tek backslash komutları düzeltme'
    },
    fixFrac: {
        pattern: /\\frac\s*\{\s*([^}]*)\s*\}\s*\{\s*([^}]*)\s*\}/g,
        replacement: '\\\\frac{$1}{$2}',
        description: 'Frac komutları normalizasyonu'
    },
    fixText: {
        pattern: /\\text\{([^}]*)\}/g,
        replacement: (match, content) => {
            const cleanContent = content.replace(/[{}]/g, '').trim();
            return `\\\\text{${cleanContent}}`;
        },
        description: 'Text içeriği normalizasyonu'
    },
    fixMathSymbols: {
        pattern: /\\(sqrt|sum|int|lim|dfrac|tfrac|begin|end)\b/g,
        replacement: '\\\\$1',
        description: 'Matematik sembolleri normalizasyonu'
    }
};


// Türkçe karışık içerik tespiti
const TURKISH_CONTENT_PATTERNS = {
    turkishChars: /[ğüşıöçĞÜŞİÖÇ]/g,
    turkishWords: /\b(değer|değeri|olduğu|göre|için|ile|den|dan|bu|şu|ve|veya|eğer|sonuç|problem|soru|çözüm|adım|hesapla|bul|kaç|nedir|nasıl)\b/gi,
    latexDelimiters: /(\$[^$]*\$|\\\([^)]*\\\)|\\\[[^\]]*\\\]|\$\$[^$]*\$\$)/g
};

function ensureDOMReady() {
    if (domReadyPromise) return domReadyPromise;
    
    domReadyPromise = new Promise((resolve) => {
        if (document.readyState === 'complete') {
            resolve();
        } else if (document.readyState === 'interactive') {
            // DOM ready ama resources yüklenmemiş olabilir
            if (document.body) {
                resolve();
            } else {
                document.addEventListener('DOMContentLoaded', resolve);
            }
        } else {
            document.addEventListener('DOMContentLoaded', resolve);
        }
        
        // Fallback timeout
        setTimeout(resolve, 10000); // 10 saniye max bekleme
    });
    
    return domReadyPromise;
}

/**
 * API Tutarsızlığı için LaTeX Normalizer
 */
function normalizeLatexFromAPI(content) {
    if (!content || typeof content !== 'string') return '';
    
    let normalized = content.trim();
    
    console.log('🔧 LaTeX normalization - Original:', content);
    
    Object.values(LATEX_PATTERNS).forEach(pattern => {
        if (typeof pattern.replacement === 'function') {
            normalized = normalized.replace(pattern.pattern, pattern.replacement);
        } else {
            normalized = normalized.replace(pattern.pattern, pattern.replacement);
        }
    });
    
    normalized = normalized
        .replace(/^\$+|\$+$/g, '')
        .replace(/^\\\(|\\\)$/g, '')
        .replace(/^\\\[|\\\]$/g, '');
    
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    console.log('✅ LaTeX normalization - Result:', normalized);
    return normalized;
}
function analyzeMixedContent(content) {
    const analysis = {
        hasTurkish: false,
        hasLatex: false,
        isMixed: false,
        parts: [],
        confidence: 0
    };
    
    analysis.hasTurkish = TURKISH_CONTENT_PATTERNS.turkishChars.test(content) ||
                          TURKISH_CONTENT_PATTERNS.turkishWords.test(content);
    
    analysis.hasLatex = /\\[a-zA-Z]+|\{[^}]*\}|\^|\$/.test(content);
    analysis.isMixed = analysis.hasTurkish && analysis.hasLatex;
    
    if (analysis.isMixed) {
        analysis.parts = splitMixedContentSafely(content);
    }
    
    analysis.confidence = analysis.isMixed ? 0.9 : analysis.hasLatex ? 0.7 : 0.5;
    
    return analysis;
}

function splitMixedContentSafely(content) {
    const parts = [];
    const latexPattern = /(\$[^$]+\$|\\\([^)]+\\\)|\\\[[^\]]+\\\])/g;
    
    let lastIndex = 0;
    let match;
    let iteration = 0;
    const maxIterations = 100;
    
    while ((match = latexPattern.exec(content)) !== null && iteration < maxIterations) {
        iteration++;
        
        if (match.index > lastIndex) {
            const textPart = content.slice(lastIndex, match.index).trim();
            if (textPart) {
                parts.push({ type: 'text', content: textPart, needsEscape: true });
            }
        }
        
        let latexContent = match[1];
        
        if (latexContent.startsWith('$') && latexContent.endsWith('$')) {
            latexContent = latexContent.slice(1, -1);
        } else if (latexContent.startsWith('\\(') && latexContent.endsWith('\\)')) {
            latexContent = latexContent.slice(2, -2);
        } else if (latexContent.startsWith('\\[') && latexContent.endsWith('\\]')) {
            latexContent = latexContent.slice(2, -2);
        }
        
        if (latexContent.trim()) {
            parts.push({ type: 'latex', content: normalizeLatexFromAPI(latexContent), needsEscape: false });
        }
        
        lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < content.length) {
        const remainingText = content.slice(lastIndex).trim();
        if (remainingText) {
            parts.push({ type: 'text', content: remainingText, needsEscape: true });
        }
    }
    
    if (parts.length === 0) {
        parts.push({ type: 'text', content: content, needsEscape: true });
    }
    
    return parts;
}


/**
 * Ekranda bir yükleme mesajı gösterir.
 */
export async function showLoading(message) {
    await ensureDOMReady();
    
    const resultContainer = document.getElementById('result-container');
    const statusMessage = document.getElementById('status-message');
    const solutionOutput = document.getElementById('solution-output');

    if (!resultContainer || !statusMessage || !solutionOutput) {
        console.warn('⚠️ showLoading: Required elements not found');
        return;
    }

    if (message === false) {
        resultContainer.classList.add('hidden');
        return;
    }
    
    // Enhanced renderer durumu kontrol et
    const rendererStatus = enhancedMathRenderer ? 
        (enhancedMathRenderer.mathJaxReady || enhancedMathRenderer.katexReady ? 'Ready' : 'Loading') : 
        'Not Available';
    
    statusMessage.innerHTML = `
        <div class="flex items-center justify-center space-x-4 p-4">
            <div class="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-10 w-10 animate-spin border-t-blue-600"></div>
            <div class="flex flex-col text-left">
                <p class="text-blue-700 font-semibold text-base">${message}</p>
                <div class="mt-2 text-xs text-blue-600">Enhanced Math Renderer v2 - Status: ${rendererStatus}</div>
            </div>
        </div>
    `;
    
    statusMessage.className = 'bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 shadow-sm';
    resultContainer.classList.remove('hidden');
    solutionOutput.classList.add('hidden');
}

/**
 * Ekranda bir başarı mesajı gösterir.
 */
export async function showSuccess(message, autoHide = true, hideDelay = 3000) {
    await ensureDOMReady();
    
    const resultContainer = document.getElementById('result-container');
    const statusMessage = document.getElementById('status-message');
    const solutionOutput = document.getElementById('solution-output');

    if (!resultContainer || !statusMessage || !solutionOutput) {
        console.warn('⚠️ showSuccess: Required elements not found');
        return;
    }

    const currentView = window.stateManager ? window.stateManager.getStateValue('ui').view : 'setup';
    
    if (['setup', 'summary'].includes(currentView)) {
        statusMessage.className = 'flex flex-col items-center justify-center space-y-3 p-4 bg-green-100 text-green-700 rounded-lg border border-green-300';
        statusMessage.innerHTML = `
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <p class="font-medium text-center">${message}</p>
            <div class="text-xs text-green-600 opacity-75">✨ Enhanced Renderer v2 Active</div>
        `;

        resultContainer.classList.remove('hidden');
        resultContainer.style.display = 'block';
        solutionOutput.classList.add('hidden');

        if (autoHide) {
            setTimeout(() => {
                resultContainer.classList.add('hidden');
            }, hideDelay);
        }
    } else {
        showInViewNotification(message, 'success', autoHide, hideDelay);
    }
}

export function showInViewNotification(message, type = 'success', autoHide = true, hideDelay = 3000) {
    try {
        // Remove existing notification
        const existingNotification = document.getElementById('in-view-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        const colors = {
            success: { 
                bg: 'bg-green-500', 
                text: 'text-white', 
                icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>` 
            },
            error: { 
                bg: 'bg-red-500', 
                text: 'text-white', 
                icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>` 
            },
            info: { 
                bg: 'bg-blue-500', 
                text: 'text-white', 
                icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>` 
            },
            warning: { 
                bg: 'bg-yellow-500', 
                text: 'text-white', 
                icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>` 
            }
        };
        
        const colorScheme = colors[type] || colors.success;
        const notification = document.createElement('div');
        notification.id = 'in-view-notification';
        notification.className = `fixed top-4 right-4 ${colorScheme.bg} ${colorScheme.text} px-4 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full`;
        
        notification.innerHTML = `
            <div class="flex items-center gap-3 max-w-sm">
                <div class="flex-shrink-0">${colorScheme.icon}</div>
                <div class="flex-1">
                    <p class="text-sm font-medium notification-message">${escapeHtml(message)}</p>
                    <div class="text-xs opacity-75 mt-1">Enhanced UI v2</div>
                </div>
                <button class="notification-close flex-shrink-0 ml-2 ${colorScheme.text} hover:opacity-70 transition-opacity" aria-label="Close">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>`;
        
        // Safe DOM append
        if (document.body) {
            document.body.appendChild(notification);
        } else {
            console.warn('⚠️ Document body not available for notification');
            return null;
        }
        
        // Close button handler
        const closeButton = notification.querySelector('.notification-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                notification.remove();
            });
        }
        
        // Animation
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // Auto-hide
        if (autoHide && hideDelay > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.classList.add('translate-x-full');
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.remove();
                        }
                    }, 300);
                }
            }, hideDelay);
        }
        
        return notification;
        
    } catch (error) {
        console.error('❌ showInViewNotification error:', error);
        // Fallback to console
        console.log(`NOTIFICATION [${type.toUpperCase()}]: ${message}`);
        return null;
    }
}

/**
 * Ekranda bir hata mesajı gösterir.
 */
export async function showError(message, showResetButton = false, onReset = () => {}) {
    try {
        await ensureDOMReady();
        
        const resultContainer = document.getElementById('result-container');
        const statusMessage = document.getElementById('status-message');
        const solutionOutput = document.getElementById('solution-output');

        if (!resultContainer || !statusMessage || !solutionOutput) {
            console.warn('⚠️ showError: Required elements not found - fallback to alert');
            alert(`ERROR: ${message}`);
            return;
        }

        const currentView = window.stateManager ? window.stateManager.getStateValue('ui').view : 'setup';
        
        // View-based error display
        if (['fullSolution', 'interactive', 'solving'].includes(currentView)) {
            showInViewNotification(message, 'error', !showResetButton, showResetButton ? 0 : 5000);
            
            if (showResetButton) {
                setTimeout(() => {
                    try {
                        if (confirm(message + '\n\nDevam etmek istiyor musunuz?')) {
                            if (typeof onReset === 'function') {
                                onReset();
                            } else {
                                console.warn('onReset is not a function:', onReset);
                            }
                        }
                    } catch (confirmError) {
                        console.error('Confirm dialog error:', confirmError);
                        if (typeof onReset === 'function') onReset();
                    }
                }, 1000);
            }
            return;
        }

        // Main error display
        const errorHTML = `
            <div class="error-container flex flex-col items-center justify-center space-y-3 p-4 bg-red-100 text-red-700 rounded-lg border border-red-300">
                <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
                <p class="font-medium text-center error-message">${escapeHtml(message)}</p>
                <div class="text-xs text-red-600 opacity-75">🔧 Enhanced Error Handler v2</div>
                ${showResetButton ? '<div class="error-actions mt-4"></div>' : ''}
            </div>`;

        statusMessage.innerHTML = errorHTML;

        if (showResetButton) {
            const actionsContainer = statusMessage.querySelector('.error-actions');
            if (actionsContainer) {
                const okButton = createResetButton(onReset, resultContainer, statusMessage);
                actionsContainer.appendChild(okButton);
                
                // Auto-focus with delay
                setTimeout(() => {
                    try {
                        okButton.focus();
                    } catch (focusError) {
                        console.warn('Button focus error:', focusError);
                    }
                }, 100);
            }
        }

        resultContainer.classList.remove('hidden');
        resultContainer.style.display = 'block';
        solutionOutput.classList.add('hidden');
        
    } catch (error) {
        console.error('❌ showError function failed:', error);
        // Ultimate fallback
        alert(`CRITICAL ERROR: ${message}\n\nOriginal error in showError: ${error.message}`);
    }
}
function createResetButton(onReset, resultContainer, statusMessage) {
    const okButton = document.createElement('button');
    okButton.textContent = 'Tamam';
    okButton.className = 'btn btn-primary px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500';
    okButton.type = 'button';
    
    // Enhanced click handler
    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        try {
            console.log('🔄 Enhanced error reset triggered');
            
            // UI cleanup
            resultContainer.classList.add('hidden');
            statusMessage.innerHTML = '';
            
            // Call reset function safely
            if (typeof onReset === 'function') {
                try {
                    onReset();
                } catch (resetError) {
                    console.error('❌ onReset function error:', resetError);
                    // Try alternative reset methods
                    if (window.stateManager) {
                        window.stateManager.setView('setup');
                    }
                }
            } else {
                console.warn('⚠️ onReset is not a function, applying default reset');
                if (window.stateManager) {
                    window.stateManager.setView('setup');
                }
            }
            
        } catch (error) {
            console.error('❌ Error reset handler failed:', error);
            // Last resort
            if (confirm('Reset işlemi başarısız. Sayfayı yenilemek ister misiniz?')) {
                window.location.reload();
            }
        }
    };
    
    okButton.addEventListener('click', handleClick);
    
    // Keyboard support
    okButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick(e);
        }
    });
    
    return okButton;
}
/**
 * Animasyonlu adım adım yükleme mesajı gösterir.
 */
export async function showAnimatedLoading(steps, stepDelay = 1000) {
    await ensureDOMReady();
    
    const resultContainer = document.getElementById('result-container');
    const statusMessage = document.getElementById('status-message');
    const solutionOutput = document.getElementById('solution-output');

    if (!resultContainer || !statusMessage || !solutionOutput) {
        console.warn('⚠️ showAnimatedLoading: Required elements not found');
        return;
    }

    resultContainer.classList.remove('hidden');
    resultContainer.style.display = 'block';
    solutionOutput.classList.add('hidden');

    let currentStep = 0;

    const showStep = () => {
        if (currentStep >= steps.length) {
            setTimeout(() => showLoading("Enhanced Math Renderer v2 ile çözüm tamamlanıyor..."), stepDelay / 2);
            return;
        }
        const step = steps[currentStep];
        statusMessage.innerHTML = `
            <div class="flex items-center justify-center space-x-4 p-4">
                <div class="relative">
                    <div class="loader ease-linear rounded-full border-4 border-t-4 border-blue-200 h-12 w-12 animate-spin border-t-blue-600"></div>
                    <div class="absolute inset-0 flex items-center justify-center"><div class="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div></div>
                </div>
                <div class="flex flex-col text-left">
                    <p class="text-blue-700 font-semibold text-base">${step.title}</p>
                    <p class="text-gray-600 text-sm mt-1">${step.description}</p>
                    <div class="mt-3 flex items-center">
                        <div class="text-xs text-blue-600 font-medium">Adım ${currentStep + 1}/${steps.length}</div>
                        <div class="ml-3 flex space-x-1">
                            ${Array.from({length: steps.length}, (_, i) => `<div class="w-2 h-2 rounded-full transition-colors duration-300 ${i <= currentStep ? 'bg-blue-500' : 'bg-gray-300'}"></div>`).join('')}
                        </div>
                    </div>
                    <div class="text-xs text-blue-500 mt-1 opacity-75">Enhanced Math Engine v2</div>
                </div>
            </div>`;
        statusMessage.className = 'bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 shadow-sm';
        currentStep++;
        setTimeout(showStep, stepDelay);
    };
    showStep();
}

/**
 * Gelişmiş matematiksel ifade render fonksiyonu
 */
export async function renderMath(content, element, displayMode = false) {
    if (!content || !element) {
        console.warn('⚠️ renderMath: İçerik veya element eksik');
        return false;
    }
    
    try {
        await ensureDOMReady();
        
        if (!enhancedMathRenderer) {
            console.error('❌ Enhanced Math Renderer bulunamadı');
            element.textContent = content;
            return false;
        }
        
        const analysis = analyzeMixedContent(content);
        console.log('🔍 Content analysis:', analysis);
        const normalizedContent = normalizeLatexFromAPI(content);
        
        if (analysis.isMixed) {
            return await renderMixedContent(normalizedContent, element, displayMode);
        }
        
        // Enhanced math UI renderer kullan
        const result = await enhancedMathUI.renderMath(normalizedContent, element, { displayMode });
        
        if (!result) {
            console.warn('Enhanced render başarısız, fallback uygulanıyor:', normalizedContent);
            element.textContent = content;
            element.classList.add('render-fallback');
            element.title = 'Math rendering failed - Enhanced fallback active';
            showInViewNotification('Matematik render başarısız, metin formatında gösteriliyor', 'warning', true, 3000);
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Enhanced renderMath hatası:', error);
        element.textContent = content;
        element.classList.add('render-error');
        element.title = `Render error: ${error.message}`;
        return false;
    }
}

async function renderMixedContent(content, element, displayMode = false) {
    try {
        const analysis = analyzeMixedContent(content);
        if (!analysis.isMixed || analysis.parts.length === 0) {
            return await enhancedMathUI.renderMath(content, element, { displayMode });
        }
        
        console.log('🔄 Rendering mixed content:', analysis.parts);
        element.innerHTML = '';
        element.classList.add('mixed-content-container');
        
        for (const part of analysis.parts) {
            const partElement = document.createElement('span');
            if (part.type === 'latex') {
                partElement.className = 'latex-inline-part';
                const success = await enhancedMathUI.renderMath(part.content, partElement, { displayMode: false });
                if (!success) {
                    partElement.textContent = `$${part.content}$`;
                    partElement.classList.add('render-failed');
                }
            } else {
                partElement.className = 'text-inline-part';
                if (part.needsEscape) {
                    partElement.textContent = part.content;
                } else {
                    partElement.innerHTML = escapeHtml(part.content);
                }
            }
            element.appendChild(partElement);
        }
        
        console.log('✅ Mixed content rendered successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Mixed content render error:', error);
        element.textContent = content;
        element.classList.add('mixed-render-error');
        return false;
    }
}

/**
 * Container içindeki tüm matematik içeriğini render eder
 */
export async function renderMathInContainer(container, displayMode = false) {
    if (!container) {
        console.warn('⚠️ renderMathInContainer: Container eksik');
        return;
    }
    
    try {
        await ensureDOMReady();
        const renderTasks = [];
        
        container.querySelectorAll('[data-latex]').forEach(element => {
            const latex = element.getAttribute('data-latex');
            if (latex) renderTasks.push({ element, content: latex, displayMode: true });
        });
        
        container.querySelectorAll('.smart-content[data-content]').forEach(element => {
            const content = element.getAttribute('data-content');
            if (content) renderTasks.push({ element, content, displayMode: false });
        });
        
        const batchSize = 5;
        const results = [];
        
        for (let i = 0; i < renderTasks.length; i += batchSize) {
            const batch = renderTasks.slice(i, i + batchSize);
            const batchPromises = batch.map(async (task) => {
                try {
                    return await renderMath(task.content, task.element, task.displayMode);
                } catch (error) {
                    console.warn('Batch render task error:', error);
                    return false;
                }
            });
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            if (i + batchSize < renderTasks.length) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        
        console.log(`✅ Container render completed: ${results.filter(r => r).length}/${results.length} successful`);
        
        const failedCount = results.filter(r => !r).length;
        if (failedCount > 0) {
            showInViewNotification(`${failedCount} matematik ifadesi render edilemedi`, 'warning', true, 3000);
        }
        
    } catch (error) {
        console.error('❌ Container render hatası:', error);
        showInViewNotification('Container render sırasında hata oluştu', 'error', true, 3000);
    }
}

/**
 * Smart content elementlerini render eder
 */
export async function renderSmartContent(container) {
    if (!container) return;
    await ensureDOMReady();
    
    const smartElements = container.querySelectorAll('.smart-content[data-content]');
    for (const element of smartElements) {
        const content = element.getAttribute('data-content');
        if (content) {
            try {
                const normalizedContent = normalizeLatexFromAPI(content);
                await renderMath(normalizedContent, element, false);
            } catch (error) {
                console.warn('Smart content render hatası:', error);
                element.textContent = content;
                element.classList.add('smart-render-failed');
            }
        }
    }
}

/**
 * LaTeX content elementlerini render eder
 */
export async function renderLatexContent(container) {
    if (!container) return;
    await ensureDOMReady();
    
    const latexElements = container.querySelectorAll('.latex-content[data-latex]');
    for (const element of latexElements) {
        const latex = element.getAttribute('data-latex');
        if (latex) {
            try {
                const normalizedLatex = normalizeLatexFromAPI(latex);
                await renderMath(normalizedLatex, element, true); // Display mode
            } catch (error) {
                console.warn('LaTeX content render hatası:', error);
                element.textContent = latex;
                element.classList.add('latex-render-failed');
            }
        }
    }
}

class EnhancedDOMObserver {
    constructor() {
        this.observers = new WeakMap();
        this.pendingRenders = new Set();
    }
    
    observeElement(element, callback) {
        if (this.observers.has(element)) return;
        const observer = new MutationObserver((mutations) => {
            let shouldRerender = false;
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || (mutation.type === 'attributes' && ['data-latex', 'data-content'].includes(mutation.attributeName))) {
                    shouldRerender = true;
                }
            });
            if (shouldRerender) {
                clearTimeout(this.renderTimeout);
                this.renderTimeout = setTimeout(() => callback(), 100);
            }
        });
        
        observer.observe(element, {
            childList: true,
            attributes: true,
            attributeFilter: ['data-latex', 'data-content'],
            subtree: true
        });
        
        this.observers.set(element, observer);
    }
    
    disconnectElement(element) {
        const observer = this.observers.get(element);
        if (observer) {
            observer.disconnect();
            this.observers.delete(element);
        }
    }
    
    disconnectAll() {
        this.observers.forEach((observer) => observer.disconnect());
        this.observers.clear();
    }
}

const domObserver = new EnhancedDOMObserver();

class RenderPerformanceMonitor {
    constructor() {
        this.reset();
        this.maxHistorySize = 100;
        this.renderHistory = [];
    }
    
    startRender(metadata = {}) {
        const startTime = performance.now();
        const renderId = `render_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return {
            id: renderId,
            startTime,
            metadata
        };
    }
    
    endRender(renderSession, success = true, additionalData = {}) {
        if (!renderSession || !renderSession.startTime) {
            console.warn('⚠️ Invalid render session for monitoring');
            return;
        }
        
        const renderTime = performance.now() - renderSession.startTime;
        const renderData = {
            id: renderSession.id,
            duration: renderTime,
            success,
            timestamp: new Date().toISOString(),
            metadata: renderSession.metadata,
            ...additionalData
        };
        
        // Update stats
        this.stats.totalRenders++;
        if (success) {
            this.stats.successfulRenders++;
        } else {
            this.stats.failedRenders++;
        }
        
        // Update averages
        const totalTime = this.stats.averageRenderTime * (this.stats.totalRenders - 1) + renderTime;
        this.stats.averageRenderTime = totalTime / this.stats.totalRenders;
        
        // Add to history
        this.renderHistory.push(renderData);
        if (this.renderHistory.length > this.maxHistorySize) {
            this.renderHistory.shift();
        }
        
        // Performance warnings
        if (renderTime > 2000) {
            console.warn(`⚠️ Slow render detected: ${renderTime.toFixed(2)}ms for ${renderSession.id}`);
        }
        
        return renderData;
    }
    
    getRecentPerformance(count = 10) {
        return this.renderHistory.slice(-count);
    }
    
    getStats() {
        const recentRenders = this.getRecentPerformance(20);
        const recentSuccessRate = recentRenders.length > 0 ? 
            (recentRenders.filter(r => r.success).length / recentRenders.length) * 100 : 0;
        
        return {
            ...this.stats,
            successRate: this.stats.totalRenders > 0 ? 
                (this.stats.successfulRenders / this.stats.totalRenders) * 100 : 0,
            recentSuccessRate,
            recentAverageRenderTime: recentRenders.length > 0 ?
                recentRenders.reduce((sum, r) => sum + r.duration, 0) / recentRenders.length : 0
        };
    }
    
    reset() {
        this.stats = {
            totalRenders: 0,
            successfulRenders: 0,
            failedRenders: 0,
            averageRenderTime: 0
        };
        this.renderHistory = [];
    }
}

const performanceMonitor = new RenderPerformanceMonitor();

class EnhancedRenderQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.maxConcurrent = 3;
        this.currentlyProcessing = 0;
    }
    
    addTask(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({ ...task, resolve, reject, id: Date.now() + Math.random() });
            this.processQueue();
        });
    }
    
    async processQueue() {
        if (this.processing || this.currentlyProcessing >= this.maxConcurrent || this.queue.length === 0) {
            return;
        }
        
        this.processing = true;
        this.currentlyProcessing++;
        const task = this.queue.shift();
        
        try {
            const startTime = performanceMonitor.startRender();
            let result;
            if (task.type === 'renderMath') {
                result = await renderMath(task.content, task.element, task.displayMode);
            } else if (task.type === 'renderContainer') {
                result = await renderMathInContainer(task.container, task.displayMode);
            }
            const wasNormalized = task.content && task.content !== normalizeLatexFromAPI(task.content);
            const wasMixed = task.content && analyzeMixedContent(task.content).isMixed;
            performanceMonitor.endRender(startTime, result, wasNormalized, wasMixed);
            task.resolve(result);
        } catch (error) {
            console.error('Render queue task error:', error);
            performanceMonitor.endRender(performance.now(), false);
            task.reject(error);
        } finally {
            this.currentlyProcessing--;
            this.processing = false;
            setTimeout(() => this.processQueue(), 10);
        }
    }
    
    clear() {
        this.queue.forEach(task => task.reject(new Error('Queue cleared')));
        this.queue = [];
    }
    
    getQueueStats() {
        return { queueLength: this.queue.length, processing: this.processing, currentlyProcessing: this.currentlyProcessing };
    }
}

const renderQueue = new EnhancedRenderQueue();

/**
 * Gelişmiş Render Sistem Durumu
 */
export async function getRenderSystemStatus() {
    const enhancedStatus = await enhancedMathRenderer.healthCheck();
    const performanceStats = performanceMonitor.getStats();
    const queueStats = renderQueue.getQueueStats();
    
    return {
        timestamp: new Date().toISOString(),
        version: 'Enhanced UI v2',
        enhanced: enhancedStatus,
        performance: performanceStats,
        queue: queueStats,
        domReady: document.readyState,
        features: {
            apiNormalization: true,
            mixedContentSupport: true,
            domTimingSafe: true,
            performanceMonitoring: true,
            queueManagement: true
        }
    };
}

/**
 * Render istatistiklerini döndürür
 */
export function getRenderStats() {
    return performanceMonitor.getStats();
}

export function clearAllRenderCaches() {
    if (enhancedMathRenderer) enhancedMathRenderer.clearCache();
    renderQueue.clear();
    performanceMonitor.reset();
    console.log('🧹 All render caches cleared');
}

/**
 * Auto DOM Observer Setup
 */
export function observeAndRender(container, options = {}) {
    const { displayMode = false, autoRender = true, debounceDelay = 100 } = options;
    if (!container) {
        console.warn('⚠️ observeAndRender: Container eksik');
        return;
    }
    
    if (autoRender) {
        renderMathInContainer(container, displayMode);
    }
    
    domObserver.observeElement(container, () => {
        console.log('🔄 DOM change detected, re-rendering...');
        setTimeout(() => renderMathInContainer(container, displayMode), debounceDelay);
    });
    
    return () => domObserver.disconnectElement(container);
}

/**
 * Batch Render with Queue
 */
export async function batchRenderWithQueue(renderTasks, options = {}) {
    const { batchSize = 5, priority = 'normal', timeout = 10000 } = options;
    const results = [];
    
    for (let i = 0; i < renderTasks.length; i += batchSize) {
        const batch = renderTasks.slice(i, i + batchSize);
        const batchPromises = batch.map(task => renderQueue.addTask({ ...task, priority, timeout }));
        
        try {
            const batchResults = await Promise.allSettled(batchPromises);
            results.push(...batchResults.map(r => r.status === 'fulfilled' ? r.value : false));
        } catch (error) {
            console.error('Batch render error:', error);
            results.push(...Array(batch.length).fill(false));
        }
        
        if (i + batchSize < renderTasks.length) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
    return results;
}



/**
 * Render sistemi hazır olup olmadığını kontrol eder
 */
export async function waitForRenderSystem(timeout = 10000) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = timeout / 100;
        
        const checkReady = () => {
            attempts++;
            
            if (enhancedMathRenderer) {
                if (enhancedMathRenderer.mathJaxReady || enhancedMathRenderer.katexReady) {
                    console.log('✅ Render system ready');
                    resolve(true);
                    return;
                }
            }
            
            if (attempts >= maxAttempts) {
                console.warn('⚠️ Render system timeout, proceeding anyway');
                resolve(true); // Don't reject, just proceed
                return;
            }
            
            setTimeout(checkReady, 100);
        };
        checkReady();
    });
}

// escapeHtml function now imported from utils.js
/**
 * Gelişmiş render fonksiyonu - otomatik tip algılama ile
 */
export async function smartRender(content, element, options = {}) {
    const { displayMode = false, fallbackToText = true, enableCache = true, timeout = 5000 } = options;
    if (!enableCache) clearRenderCache();
    
    const renderPromise = renderMath(content, element, displayMode);
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Render timeout')), timeout);
    });
    
    try {
        return await Promise.race([renderPromise, timeoutPromise]);
    } catch (error) {
        if (fallbackToText) {
            element.textContent = content;
            element.classList.add('render-timeout');
            return false;
        }
        throw error;
    }
}

/**
 * Batch render - çoklu elementi aynı anda render eder
 */
export async function batchRender(renderTasks, batchSize = 5) {
    const results = [];
    for (let i = 0; i < renderTasks.length; i += batchSize) {
        const batch = renderTasks.slice(i, i + batchSize);
        const batchPromises = batch.map(async (task) => {
            try {
                return await renderMath(task.content, task.element, task.displayMode);
            } catch (error) {
                console.warn('Batch render hatası:', error);
                return false;
            }
        });
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        if (i + batchSize < renderTasks.length) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
    return results;
}

/**
 * Tekil veya tüm render cache'lerini temizler (şimdilik hepsini temizler)
 */
export function clearRenderCache() {
    clearAllRenderCaches();
}

// Global Exports
if (typeof window !== 'undefined') {
    window.enhancedUIDebug = {
        status: getRenderSystemStatus,
        stats: () => performanceMonitor.getStats(),
        queue: () => renderQueue.getQueueStats(),
        clearCache: clearAllRenderCaches,
        testRender: async (content, displayMode = false) => {
            const testEl = document.createElement('div');
            document.body.appendChild(testEl);
            console.log('🧪 Test render başlıyor:', content);
            const result = await renderMath(content, testEl, displayMode);
            console.log('🧪 Test render sonucu:', result, 'HTML:', testEl.innerHTML);
            setTimeout(() => document.body.removeChild(testEl), 5000);
            return result;
        },
        testNormalization: (content) => {
            console.log('🔧 Original:', content);
            const normalized = normalizeLatexFromAPI(content);
            console.log('🔧 Normalized:', normalized);
            return normalized;
        },
        analyzeMixed: (content) => {
            const analysis = analyzeMixedContent(content);
            console.log('🔍 Mixed content analysis:', analysis);
            return analysis;
        }
    };
    
    window.mathUI = {
        renderMath,
        renderMathInContainer,
        renderSmartContent,
        renderLatexContent,
        smartRender,
        batchRender,
        getRenderStats,
        clearRenderCache,
        waitForRenderSystem
    };

    console.log(`
🚀 Enhanced UI v2 Debug Commands Available:
- enhancedUIDebug.status(), .stats(), .queue(), .clearCache()
- enhancedUIDebug.testRender(content), .testNormalization(content), .analyzeMixed(content)
    `);
}

// Export all enhanced features
export { 
    renderQueue,
    performanceMonitor,
    domObserver,
    
    
    
};

console.log('✅ Enhanced UI Module v2 - Tüm sorunlar çözüldü ve yüklendi');