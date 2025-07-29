// =================================================================================
//  MathAi - UI Modülü - Düzeltilmiş Error Handling
//  Tamam butonu sorunu çözüldü
// =================================================================================

import { advancedMathRenderer } from './advancedMathRenderer.js';

/**
 * Ekranda bir yükleme mesajı gösterir.
 * @param {string|false} message - Gösterilecek mesaj. false ise gizler.
 */
export function showLoading(message) {
    const resultContainer = document.getElementById('result-container');
    const statusMessage = document.getElementById('status-message');
    const solutionOutput = document.getElementById('solution-output');

    if (!resultContainer || !statusMessage || !solutionOutput) return;

    // EĞER message 'false' ise, yükleme ekranını gizle ve fonksiyondan çık.
    if (message === false) {
        resultContainer.classList.add('hidden');
        return;
    }
    
    // Önceki hata mesajını ve butonları temizle
    statusMessage.innerHTML = `
         <div class="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-8 w-8 animate-spin"></div>
         <p class="text-gray-600 font-medium">${message}</p>
    `;
    statusMessage.className = 'flex items-center justify-center space-x-3 p-4 bg-gray-50 rounded-lg';
    resultContainer.classList.remove('hidden');
    solutionOutput.classList.add('hidden');
}

/**
 * Ekranda bir başarı mesajı gösterir.
 * @param {string} message - Gösterilecek başarı mesajı.
 * @param {boolean} autoHide - Mesajın otomatik olarak gizlenip gizlenmeyeceği.
 * @param {number} hideDelay - Otomatik gizleme için beklenecek süre (ms).
 */
export function showSuccess(message, autoHide = true, hideDelay = 3000) {
    const resultContainer = document.getElementById('result-container');
    const statusMessage = document.getElementById('status-message');
    const solutionOutput = document.getElementById('solution-output');

    if (!resultContainer || !statusMessage || !solutionOutput) return;

    // ✅ DÜZELTME: View kontrolünü daha akıllı yap
    const currentView = window.stateManager ? window.stateManager.getStateValue('ui').view : 'setup';
    
    // Setup ve summary view'larında normal gösterim
    if (['setup', 'summary'].includes(currentView)) {
        statusMessage.className = 'flex flex-col items-center justify-center space-y-3 p-4 bg-green-100 text-green-700 rounded-lg';
        statusMessage.innerHTML = `
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <p class="font-medium text-center">${message}</p>
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
        // Çözüm view'larında in-view notification
        showInViewNotification(message, 'success', autoHide, hideDelay);
    }
}

function showInViewNotification(message, type = 'success', autoHide = true, hideDelay = 3000) {
    // Mevcut bildirimi kaldır
    const existingNotification = document.getElementById('in-view-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Renk ayarları
    const colors = {
        success: {
            bg: 'bg-green-500',
            text: 'text-white',
            icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                   </svg>`
        },
        error: {
            bg: 'bg-red-500',
            text: 'text-white',
            icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                   </svg>`
        },
        info: {
            bg: 'bg-blue-500',
            text: 'text-white',
            icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                   </svg>`
        }
    };
    
    const colorScheme = colors[type] || colors.success;
    
    // Bildirim elementi oluştur
    const notification = document.createElement('div');
    notification.id = 'in-view-notification';
    notification.className = `fixed top-4 right-4 ${colorScheme.bg} ${colorScheme.text} px-4 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full`;
    
    notification.innerHTML = `
        <div class="flex items-center gap-3 max-w-sm">
            <div class="flex-shrink-0">
                ${colorScheme.icon}
            </div>
            <div class="flex-1">
                <p class="text-sm font-medium">${message}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="flex-shrink-0 ml-2 ${colorScheme.text} hover:opacity-70 transition-opacity">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    `;
    
    // Sayfaya ekle
    document.body.appendChild(notification);
    
    // Animasyonla göster
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Otomatik gizle
    if (autoHide) {
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
}
/**
 * Ekranda bir hata mesajı gösterir - DÜZELTME: Tamam butonu çalışır
 * @param {string} message - Gösterilecek hata mesajı.
 * @param {boolean} showResetButton - Kullanıcının arayüzü sıfırlayabileceği bir "Tamam" butonu gösterilsin mi?
 * @param {function} onReset - "Tamam" butonuna basıldığında çalışacak fonksiyon.
 */
export function showError(message, showResetButton = false, onReset = () => {}) {
    const resultContainer = document.getElementById('result-container');
    const statusMessage = document.getElementById('status-message');
    const solutionOutput = document.getElementById('solution-output');

    if (!resultContainer || !statusMessage || !solutionOutput) return;

    // ✅ YENİ: View kontrolü ekle
    const currentView = window.stateManager ? window.stateManager.getStateValue('ui').view : 'setup';
    
    if (['fullSolution', 'interactive', 'solving'].includes(currentView)) {
        // Çözüm view'larında in-view notification kullan
        showInViewNotification(message, 'error', !showResetButton, showResetButton ? 0 : 5000);
        
        // Reset button gerekiyorsa ayrı göster
        if (showResetButton) {
            setTimeout(() => {
                if (confirm(message + '\n\nDevam etmek istiyor musunuz?')) {
                    onReset();
                }
            }, 1000);
        }
        return;
    }

    // Normal view'larda standart error gösterim
    let errorHTML = `
        <div class="flex flex-col items-center justify-center space-y-3 p-4 bg-red-100 text-red-700 rounded-lg">
            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
            <p class="font-medium text-center">${message}</p>
        </div>
    `;

    statusMessage.className = '';
    statusMessage.innerHTML = errorHTML;

    if (showResetButton) {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'mt-4 text-center';
        
        const okButton = document.createElement('button');
        okButton.textContent = 'Tamam';
        okButton.className = 'btn btn-primary px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500';
        
        okButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            try {
                console.log('Tamam butonu tıklandı, onReset fonksiyonu çalıştırılıyor...');
                
                resultContainer.classList.add('hidden');
                statusMessage.innerHTML = '';
                
                if (typeof onReset === 'function') {
                    onReset();
                } else {
                    console.warn('onReset fonksiyonu geçerli değil:', onReset);
                }
            } catch (error) {
                console.error('Tamam butonu click handler hatası:', error);
            }
        });
        
        buttonContainer.appendChild(okButton);
        statusMessage.appendChild(buttonContainer);
        
        setTimeout(() => {
            okButton.focus();
        }, 100);
    }

    resultContainer.classList.remove('hidden');
    solutionOutput.classList.add('hidden');
    
    console.log('showError çağrıldı:', { message, showResetButton, onResetType: typeof onReset });
}

/**
 * Animasyonlu adım adım yükleme mesajı gösterir.
 * @param {Array} steps - Gösterilecek adımlar dizisi.
 * @param {number} stepDelay - Her adım arasındaki gecikme (ms).
 */
export function showAnimatedLoading(steps, stepDelay = 1000) {
    const resultContainer = document.getElementById('result-container');
    const statusMessage = document.getElementById('status-message');
    const solutionOutput = document.getElementById('solution-output');

    if (!resultContainer || !statusMessage || !solutionOutput) return;

    // ✅ DÜZELTME: Container'ları önce göster
    resultContainer.classList.remove('hidden');
    resultContainer.style.display = 'block';
    solutionOutput.classList.add('hidden');

    let currentStep = 0;

    const showStep = () => {
        // ✅ DÜZELTME: Adım tamamlandığında durma koşulu
        if (currentStep >= steps.length) {
            // Son adımı biraz daha uzun göster, sonra normal loading'e geç
            setTimeout(() => {
                showLoading("Çözüm tamamlanıyor...");
            }, stepDelay / 2);
            return;
        }

        const step = steps[currentStep];
        
        // ✅ DÜZELTME: Daha görünür ve renkli tasarım
        statusMessage.innerHTML = `
            <div class="flex items-center justify-center space-x-4 p-4">
                <div class="loader ease-linear rounded-full border-4 border-t-4 border-blue-200 h-10 w-10 animate-spin border-t-blue-600"></div>
                <div class="flex flex-col text-left">
                    <p class="text-blue-700 font-semibold text-base">${step.title}</p>
                    <p class="text-gray-600 text-sm mt-1">${step.description}</p>
                    <div class="mt-2 flex items-center">
                        <div class="text-xs text-blue-600 font-medium">Adım ${currentStep + 1}/${steps.length}</div>
                        <div class="ml-3 flex space-x-1">
                            ${Array.from({length: steps.length}, (_, i) => 
                                `<div class="w-2 h-2 rounded-full ${i <= currentStep ? 'bg-blue-500' : 'bg-gray-300'}"></div>`
                            ).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        statusMessage.className = 'bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 shadow-sm';

        currentStep++;
        setTimeout(showStep, stepDelay);
    };

    // ✅ DÜZELTME: Hemen başlat
    showStep();
}

/**
 * Gelişmiş matematiksel ifade render fonksiyonu
 * Advanced Math Renderer kullanır - MathJax v3 + KaTeX Hybrid
 * @param {string} content - Render edilecek içerik.
 * @param {HTMLElement} element - Hedef HTML elementi.
 * @param {boolean} displayMode - Display modu (blok/inline).
 */
export async function renderMath(content, element, displayMode = false) {
    if (!content || !element) {
        console.warn('renderMath: İçerik veya element eksik');
        return false;
    }
    
    try {
        // Gelişmiş render sistemini kullan
        const result = await advancedMathRenderer.render(content, element, displayMode);
        
        if (!result) {
            console.warn('Render başarısız, fallback uygulanıyor:', content);
            // Fallback: plain text
            element.textContent = content;
            element.classList.add('render-fallback');
        }
        
        return result;
        
    } catch (error) {
        console.error('renderMath hatası:', error);
        element.textContent = content;
        element.classList.add('render-error');
        return false;
    }
}

/**
 * Container içindeki tüm matematik içeriğini render eder
 * @param {HTMLElement} container - Render edilecek container
 * @param {boolean} displayMode - Display modu
 */
export async function renderMathInContainer(container, displayMode = false) {
    if (!container) {
        console.warn('renderMathInContainer: Container eksik');
        return;
    }
    
    try {
        await advancedMathRenderer.renderContainer(container, displayMode);
        console.log('Container render tamamlandı');
    } catch (error) {
        console.error('Container render hatası:', error);
    }
}

/**
 * Smart content elementlerini render eder (özel attribute ile)
 * @param {HTMLElement} container - İçerik container'ı
 */
export async function renderSmartContent(container) {
    if (!container) return;
    
    const smartElements = container.querySelectorAll('.smart-content[data-content]');
    
    for (const element of smartElements) {
        const content = element.getAttribute('data-content');
        if (content) {
            try {
                await renderMath(content, element, false);
            } catch (error) {
                console.warn('Smart content render hatası:', error);
                element.textContent = content;
            }
        }
    }
}

/**
 * LaTeX content elementlerini render eder
 * @param {HTMLElement} container - İçerik container'ı
 */
export async function renderLatexContent(container) {
    if (!container) return;
    
    const latexElements = container.querySelectorAll('.latex-content[data-latex]');
    
    for (const element of latexElements) {
        const latex = element.getAttribute('data-latex');
        if (latex) {
            try {
                await renderMath(latex, element, true); // Display mode için true
            } catch (error) {
                console.warn('LaTeX content render hatası:', error);
                element.textContent = latex;
            }
        }
    }
}

/**
 * Render performans monitörü
 */
export function getRenderStats() {
    return advancedMathRenderer.getStats();
}

/**
 * Render cache temizleme
 */
export function clearRenderCache() {
    advancedMathRenderer.clearCache();
}

/**
 * HTML karakterlerini escape eder
 * @param {string} text - Escape edilecek metin
 * @returns {string} Escape edilmiş metin
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Render sistemi hazır olup olmadığını kontrol eder
 * @returns {Promise<boolean>} Sistem hazır mı?
 */
export async function waitForRenderSystem() {
    return new Promise((resolve) => {
        const checkReady = () => {
            const stats = getRenderStats();
            if (stats.mathJaxReady || stats.katexReady) {
                resolve(true);
            } else {
                setTimeout(checkReady, 100);
            }
        };
        checkReady();
    });
}

/**
 * Gelişmiş render fonksiyonu - otomatik tip algılama ile
 * @param {string} content - İçerik
 * @param {HTMLElement} element - Hedef element
 * @param {Object} options - Render seçenekleri
 */
export async function smartRender(content, element, options = {}) {
    const {
        displayMode = false,
        fallbackToText = true,
        enableCache = true,
        timeout = 5000
    } = options;
    
    if (!enableCache) {
        clearRenderCache();
    }
    
    // Timeout ile render
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
 * @param {Array} renderTasks - Render görevleri [{content, element, displayMode}]
 * @param {number} batchSize - Aynı anda işlenecek görev sayısı
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
        
        // Batch'ler arası kısa bekleme
        if (i + batchSize < renderTasks.length) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
    
    return results;
}

// Debug amaçlı global export
if (typeof window !== 'undefined') {
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
}

export { showInViewNotification };
