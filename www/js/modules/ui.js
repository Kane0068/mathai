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
    
    console.log('🔧 Enhanced LaTeX normalization - Original:', content);
    
    // CRITICAL FIX: Handle API backslash inconsistency
    // APIs return 1, 2, or 4 backslashes inconsistently
    
    // Step 1: Clean content
    normalized = normalized
        // Remove Unicode issues
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u2013\u2014]/g, "-")
        // Remove control characters
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim();
    
    // Step 2: CRITICAL - Fix backslash inconsistency
    normalized = fixBackslashInconsistency(normalized);
    
    // Step 3: Fix common LaTeX patterns
    normalized = fixLatexPatterns(normalized);
    
    // Step 4: Remove outer delimiters
    normalized = normalized
        .replace(/^\$+|\$+$/g, '')
        .replace(/^\\\(|\\\)$/g, '')
        .replace(/^\\\[|\\\]$/g, '');
    
    // Step 5: Final cleanup
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    console.log('✅ Enhanced LaTeX normalization - Result:', normalized);
    return normalized;
}
function fixBackslashInconsistency(content) {
    let result = content;
    
    // Common LaTeX commands that need single backslash
    const commands = [
        'frac', 'sqrt', 'sum', 'int', 'lim', 'sin', 'cos', 'tan', 'log', 'ln',
        'alpha', 'beta', 'gamma', 'delta', 'theta', 'lambda', 'mu', 'pi', 'sigma', 'omega',
        'text', 'mathbb', 'mathbf', 'mathrm', 'left', 'right', 'begin', 'end',
        'times', 'div', 'pm', 'mp', 'leq', 'geq', 'neq', 'approx', 'infty',
        'partial', 'nabla', 'cdot', 'ldots', 'rightarrow', 'leftarrow'
    ];
    
    // Fix quadruple backslashes (\\\\) -> single (\)
    result = result.replace(/\\{4,}/g, '\\');
    
    // Fix triple backslashes (\\\) -> single (\) 
    result = result.replace(/\\{3}/g, '\\');
    
    // Fix double backslashes before commands (\\command) -> single (\command)
    commands.forEach(cmd => {
        const pattern = new RegExp(`\\\\\\\\${cmd}\\b`, 'g');
        result = result.replace(pattern, `\\${cmd}`);
    });
    
    // Fix double backslashes in common patterns
    result = result
        .replace(/\\\\([{}])/g, '\\$1')           // \\{ -> \{
        .replace(/\\\\([()])/g, '\\$1')           // \\( -> \(
        .replace(/\\\\([\[\]])/g, '\\$1')         // \\[ -> \[
        .replace(/\\\\([_^&%$#])/g, '\\$1');      // \\_ -> \_
    
    return result;
}
function fixLatexPatterns(content) {
    return content
        // Fix fraction spacing
        .replace(/\\frac\s*\{\s*([^}]*)\s*\}\s*\{\s*([^}]*)\s*\}/g, '\\frac{$1}{$2}')
        
        // Fix sqrt spacing
        .replace(/\\sqrt\s*\{\s*([^}]*)\s*\}/g, '\\sqrt{$1}')
        
        // Fix text command spacing
        .replace(/\\text\s*\{\s*([^}]*)\s*\}/g, '\\text{$1}')
        
        // Fix superscript/subscript spacing
        .replace(/([a-zA-Z0-9}])\s*([_^])\s*\{\s*([^}]*)\s*\}/g, '$1$2{$3}')
        
        // Fix sum/int/lim patterns
        .replace(/\\(sum|int|lim|prod)\s*_\s*\{\s*([^}]*)\s*\}\s*\^\s*\{\s*([^}]*)\s*\}/g, '\\$1_{$2}^{$3}');
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
export function diagnoseLaTeXIssues(testContent = null) {
    console.group('🔍 LaTeX Diagnostic Report');
    
    const testCases = testContent ? [testContent] : [
        // Common API response patterns
        '\\\\frac{1}{2}',
        '\\\\\\\\sum_{i=1}^{n}',
        '\\frac{a}{b}',
        '\\\\sqrt{x^2+y^2}',
        '$\\\\int_0^1 f(x)dx',
        '\\\\text{Sonuç: } x = \\\\frac{-b}{2a}'
    ];

    console.log('📊 System Status:');
    console.log('- Enhanced Math Renderer:', !!window.enhancedMathRenderer);
    console.log('- MathJax Ready:', window.enhancedMathRenderer?.mathJaxReady);
    console.log('- KaTeX Ready:', window.enhancedMathRenderer?.katexReady);
    
    console.log('\n📝 LaTeX Normalization Tests:');
    testCases.forEach((test, index) => {
        const normalized = normalizeLatexFromAPI(test);
        const changed = test !== normalized;
        
        console.log(`Test ${index + 1}:`, {
            input: test,
            output: normalized,
            changed: changed,
            status: changed ? '✅ Normalized' : '➡️ No change needed'
        });
    });
    
    console.log('\n🏥 Health Check:');
    if (window.enhancedMathRenderer) {
        const health = window.enhancedMathRenderer.getStatus ? 
            window.enhancedMathRenderer.getStatus() : 
            { status: 'Unknown - no getStatus method' };
        console.log('Renderer Health:', health);
    }
    
    console.groupEnd();
}

export function quickFixMathRender() {
    console.log('🔧 Applying quick math render fixes...');
    
    // Find all math elements that might have rendering issues
    const mathElements = document.querySelectorAll('.math-rendered, [data-latex], .smart-content[data-content]');
    
    console.log(`📍 Found ${mathElements.length} math elements to check`);
    
    let fixedCount = 0;
    
    mathElements.forEach(async (element, index) => {
        try {
            const content = element.getAttribute('data-latex') || 
                          element.getAttribute('data-content') || 
                          element.textContent;
            
            if (content && content.includes('\\\\')) {
                console.log(`🔧 Fixing element ${index + 1}: ${content.substring(0, 30)}...`);
                
                const normalized = normalizeLatexFromAPI(content);
                const success = await renderMath(normalized, element, false);
                
                if (success) {
                    fixedCount++;
                    console.log(`✅ Fixed element ${index + 1}`);
                } else {
                    console.log(`❌ Failed to fix element ${index + 1}`);
                }
            }
        } catch (error) {
            console.error(`❌ Error fixing element ${index + 1}:`, error);
        }
    });
    
    setTimeout(() => {
        console.log(`🎉 Quick fix completed: ${fixedCount} elements fixed`);
    }, 1000);
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
        
        // CRITICAL: Always normalize content first
        const normalizedContent = normalizeLatexFromAPI(content);
        
        if (!normalizedContent) {
            console.warn('⚠️ Normalization failed, using original content');
            element.textContent = content;
            element.classList.add('normalization-failed');
            return false;
        }
        
        // Check for mixed content (Turkish + LaTeX)
        const analysis = analyzeMixedContent(normalizedContent);
        console.log('🔍 Content analysis:', analysis);
        
        if (analysis.isMixed) {
            return await renderMixedContent(normalizedContent, element, displayMode);
        }
        
        // Enhanced math UI renderer with retry logic
        const result = await renderWithRetry(normalizedContent, element, { displayMode });
        
        if (!result) {
            console.warn('❌ Enhanced render failed, applying fallback');
            applyRenderFallback(element, content, normalizedContent);
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Enhanced renderMath error:', error);
        applyRenderFallback(element, content, null, error);
        return false;
    }
}
async function renderWithRetry(content, element, options, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 Render attempt ${attempt}/${maxRetries} for content: ${content.substring(0, 50)}...`);
            
            const result = await enhancedMathUI.renderMath(content, element, options);
            
            if (result) {
                console.log(`✅ Render successful on attempt ${attempt}`);
                return true;
            }
            
            if (attempt < maxRetries) {
                console.warn(`⚠️ Render attempt ${attempt} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, attempt * 100));
            }
            
        } catch (error) {
            console.error(`❌ Render attempt ${attempt} error:`, error);
            
            if (attempt === maxRetries) {
                throw error;
            }
            
            await new Promise(resolve => setTimeout(resolve, attempt * 200));
        }
    }
    
    return false;
}
/**
 * MathML render hatası durumunda kullanıcı deneyimini iyileştiren
 * gelişmiş bir geri dönüş (fallback) arayüzü uygular.
 * @param {HTMLElement | null} element - İçeriğin render edileceği hedef DOM öğesi.
 * @param {string | null} originalContent - İşlenmemiş, orijinal matematik içeriği.
 * @param {string | null} normalizedContent - Render için hazırlanmış, temizlenmiş içerik.
 * @param {Error | null} [error=null] - Render sırasında oluşan hata nesnesi (varsa).
 */
function applyRenderFallback(element, originalContent, normalizedContent, error = null) {
    if (!element) {
        console.error('❌ applyRenderFallback: Hedef element bulunamadı (null).');
        return;
    }

    // --- Merkezi Yapılandırma Nesnesi ---
    // Metinleri ve sınıfları tek bir yerden yönetin.
    const config = {
        css: {
            containerBase: 'fallback-math-container rounded-lg p-3 my-2',
            iconBase: 'fallback-icon flex-shrink-0 mt-1',
            body: 'fallback-body flex-1',
            title: 'fallback-title font-medium text-gray-800 mb-1',
            content: 'fallback-text font-mono text-sm bg-white border rounded px-2 py-1 mb-2 break-all',
            info: 'fallback-info text-xs text-gray-600',
            actions: 'fallback-actions mt-3 flex gap-2 flex-wrap',
            debugDetails: 'fallback-debug mt-3 text-xs',
            debugSummary: 'cursor-pointer text-blue-600 hover:text-blue-800 font-medium',
        },
        buttons: {
            retry: {
                base: 'px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors',
                text: '🔄 Tekrar Dene',
                loadingText: '⏳ Deneniyor...',
            },
            copy: {
                base: 'px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors',
                text: '📋 İçeriği Kopyala',
                successText: '✅ Kopyalandı',
                errorText: '❌ Kopyalama Başarısız',
            },
            debug: {
                base: 'px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors',
                text: '🔍 Element Debug',
            },
        },
        states: {
            error: {
                icon: '❌',
                title: 'Matematik Render Hatası',
                info: '🔧 Sistem hatası nedeniyle matematik ifadesi düz metin olarak gösteriliyor.',
                containerClass: 'border-red-300 bg-red-50',
                iconClass: 'text-red-500',
                notification: 'Matematik render hatası - teknik destek gerekebilir.',
            },
            warning: {
                icon: '⚠️',
                title: 'Matematik Render Uyarısı',
                info: '📝 Matematik render başarısız, düz metin modunda gösteriliyor.',
                containerClass: 'border-yellow-300 bg-yellow-50',
                iconClass: 'text-yellow-500',
                notification: 'Matematik ifadesi düz metin olarak gösteriliyor.',
            },
        },
    };

    // Geliştirme ortamı kontrolü
    const isDevelopment = window.location.hostname === 'localhost' ||
                          window.location.hostname === '127.0.0.1' ||
                          window.location.search.includes('debug=true');

    // Elementi güvenli bir şekilde temizle
    try {
        element.innerHTML = '';
        element.className = 'math-render-fallback';
    } catch (clearError) {
        console.error('❌ Element temizlenirken hata oluştu:', clearError);
        return;
    }

    const displayContent = (normalizedContent && normalizedContent.trim()) ?
                           normalizedContent :
                           (originalContent || 'İçerik bulunamadı');

    const state = error ? config.states.error : config.states.warning;

    // Ana fallback konteynerini oluştur
    const fallbackContainer = document.createElement('div');
    fallbackContainer.className = `${config.css.containerBase} ${state.containerClass}`;

    // Ana içerik HTML'ini oluştur
    fallbackContainer.innerHTML = `
        <div class="fallback-content flex items-start gap-3">
            <div class="${config.css.iconBase} ${state.iconClass}">${state.icon}</div>
            <div class="${config.css.body}">
                <div class="${config.css.title}">${state.title}</div>
                <div class="${config.css.content}">${escapeHtml(displayContent)}</div>
                <div class="${config.css.info}">${state.info}</div>
            </div>
        </div>
    `;

    // Geliştirme ortamı için debug bilgilerini ekle
    if (isDevelopment) {
        const debugInfo = document.createElement('details');
        debugInfo.className = config.css.debugDetails;
        debugInfo.innerHTML = `
            <summary class="${config.css.debugSummary}">🔍 Debug Bilgileri (Geliştirici)</summary>
            <div class="mt-2 p-2 bg-gray-100 rounded border font-mono text-xs overflow-auto">
                <div class="grid grid-cols-1 gap-2">
                    <div><strong>Orijinal İçerik:</strong><pre class="mt-1 text-gray-700 whitespace-pre-wrap break-all">${escapeHtml(originalContent || 'null')}</pre></div>
                    <div><strong>Normalize Edilmiş:</strong><pre class="mt-1 text-gray-700 whitespace-pre-wrap break-all">${escapeHtml(normalizedContent || 'null')}</pre></div>
                    <div><strong>Hata Mesajı:</strong><pre class="mt-1 text-red-600 whitespace-pre-wrap">${error ? escapeHtml(error.message) : 'Hata yok'}</pre></div>
                    <div><strong>Hata Stack:</strong><pre class="mt-1 text-red-500 text-xs whitespace-pre-wrap">${error?.stack ? escapeHtml(error.stack.substring(0, 500)) : 'Stack yok'}</pre></div>
                    <div><strong>Element Info:</strong><pre class="mt-1 text-blue-600 whitespace-pre-wrap">ID: ${element.id || 'yok'}\nClass: ${element.className || 'yok'}\nParent: ${element.parentElement?.tagName || 'yok'}</pre></div>
                </div>
            </div>
        `;
        fallbackContainer.appendChild(debugInfo);
    }

    // Eylem düğmelerini ekle
    const actionButtons = document.createElement('div');
    actionButtons.className = config.css.actions;
    actionButtons.innerHTML = `
        <button class="retry-render-btn ${config.buttons.retry.base}">${config.buttons.retry.text}</button>
        <button class="copy-content-btn ${config.buttons.copy.base}">${config.buttons.copy.text}</button>
        ${isDevelopment ? `<button class="debug-element-btn ${config.buttons.debug.base}">${config.buttons.debug.text}</button>` : ''}
    `;
    fallbackContainer.appendChild(actionButtons);

    // Düğme olay dinleyicilerini ayarla
    setupFallbackActions(actionButtons, element, originalContent, normalizedContent, error, config);

    // Oluşturulan arayüzü elemente ekle
    try {
        element.appendChild(fallbackContainer);
    } catch (appendError) {
        console.error('❌ Fallback konteyneri eklenirken hata:', appendError);
        // Nihai geri dönüş: Sadece metin içeriğini ayarla
        element.textContent = displayContent;
        return;
    }

    // Kullanıcıya bildirim göster
    if (window.showInViewNotification) {
        window.showInViewNotification(
            state.notification,
            error ? 'error' : 'warning',
            true,
            error ? 8000 : 5000
        );
    }

    // İzleme için konsola log bırak
    console.warn('🔧 Math render fallback uygulandı:', {
        hasError: !!error,
        errorMessage: error?.message,
        originalLength: originalContent?.length || 0,
        normalizedLength: normalizedContent?.length || 0,
        elementId: element.id,
        timestamp: new Date().toISOString(),
    });
}

/**
 * Fallback arayüzündeki eylem düğmeleri için olay dinleyicilerini ayarlar.
 * @param {HTMLElement} actionsContainer - Düğmeleri içeren konteyner.
 * @param {HTMLElement} element - Ana render elementi.
 * @param {string | null} originalContent - Orijinal içerik.
 * @param {string | null} normalizedContent - Normalize edilmiş içerik.
 * @param {Error | null} error - Orijinal hata.
 * @param {object} config - Metin ve sınıfları içeren yapılandırma nesnesi.
 */
function setupFallbackActions(actionsContainer, element, originalContent, normalizedContent, error, config) {
    const retryBtn = actionsContainer.querySelector('.retry-render-btn');
    const copyBtn = actionsContainer.querySelector('.copy-content-btn');
    const debugBtn = actionsContainer.querySelector('.debug-element-btn');

    // Tekrar Dene Düğmesi
    if (retryBtn) {
        retryBtn.addEventListener('click', async () => {
            console.log('🔄 Kullanıcı render işlemini tekrar denedi.');
            retryBtn.disabled = true;
            retryBtn.textContent = config.buttons.retry.loadingText;

            try {
                element.innerHTML = '';
                element.className = '';
                const contentToRender = normalizedContent || originalContent;

                if (contentToRender && window.renderMath) {
                    const success = await window.renderMath(contentToRender, element, false);
                    if (!success) throw new Error('Render tekrar denemesi başarısız oldu.');
                    
                    if (window.showInViewNotification) {
                        window.showInViewNotification('Matematik render başarılı! ✅', 'success', true, 2000);
                    }
                } else {
                    throw new Error('Render fonksiyonu (window.renderMath) veya içerik bulunamadı.');
                }
            } catch (retryError) {
                console.error('❌ Tekrar deneme başarısız:', retryError);
                applyRenderFallback(element, originalContent, normalizedContent, retryError);
                if (window.showInViewNotification) {
                    window.showInViewNotification('Tekrar deneme başarısız oldu.', 'error', true, 3000);
                }
            }
        });
    }

    // İçeriği Kopyala Düğmesi
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const contentToCopy = normalizedContent || originalContent || 'İçerik yok';
            try {
                await navigator.clipboard.writeText(contentToCopy);
                copyBtn.textContent = config.buttons.copy.successText;
                if (window.showInViewNotification) {
                    window.showInViewNotification('İçerik panoya kopyalandı.', 'success', true, 2000);
                }
            } catch (copyError) {
                console.error('❌ Kopyalama başarısız:', copyError);
                copyBtn.textContent = config.buttons.copy.errorText;
            } finally {
                setTimeout(() => {
                    copyBtn.textContent = config.buttons.copy.text;
                }, 2000);
            }
        });
    }

    // Element Debug Düğmesi (sadece geliştirme ortamında)
    if (debugBtn) {
        debugBtn.addEventListener('click', () => {
            console.group('🔍 Element Debug Bilgileri');
            console.log('Element:', element);
            console.log('Original Content:', originalContent);
            console.log('Normalized Content:', normalizedContent);
            console.log('Error:', error);
            console.log('Parent Element:', element.parentElement);
            console.log('Computed Style:', window.getComputedStyle(element));
            console.groupEnd();
            
            window.debugElement = element;
            console.log('💡 Element, konsolda "window.debugElement" olarak erişilebilir.');
        });
    }
}

/**
 * Potansiyel XSS saldırılarını önlemek için metin içeriğini güvenli hale getirir.
 * Null veya undefined değerleri boş bir string olarak döndürür.
 * @param {any} text - Güvenli hale getirilecek metin.
 * @returns {string} HTML-escaped string.
 */
function escapeHtml(text) {
    if (text === null || typeof text === 'undefined') return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

// Modül olarak dışa aktarma
export { applyRenderFallback, setupFallbackActions };

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