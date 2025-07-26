// =================================================================================
//  MathAi - UI Modülü (Güncellenmiş - Advanced Math Renderer ile)
//  Gelişmiş render sistemi entegrasyonu
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
 * Animasyonlu adım adım yükleme mesajı gösterir.
 * @param {Array} steps - Gösterilecek adımlar dizisi.
 * @param {number} stepDelay - Her adım arasındaki gecikme (ms).
 */
export function showAnimatedLoading(steps, stepDelay = 1500) {
    const resultContainer = document.getElementById('result-container');
    const statusMessage = document.getElementById('status-message');
    const solutionOutput = document.getElementById('solution-output');

    if (!resultContainer || !statusMessage || !solutionOutput) return;

    resultContainer.classList.remove('hidden');
    solutionOutput.classList.add('hidden');

    let currentStep = 0;

    const showStep = () => {
        if (currentStep >= steps.length) {
            resultContainer.classList.add('hidden');
            return;
        }

        const step = steps[currentStep];
        statusMessage.innerHTML = `
            <div class="flex items-center justify-center space-x-3">
                <div class="loader ease-linear rounded-full border-4 border-t-4 border-blue-200 h-8 w-8 animate-spin"></div>
                <div class="flex flex-col">
                    <p class="text-blue-600 font-medium">${step.title}</p>
                    <p class="text-gray-500 text-sm">${step.description}</p>
                </div>
            </div>
        `;
        statusMessage.className = 'flex items-center justify-center p-4 bg-blue-50 rounded-lg border border-blue-200';

        currentStep++;
        setTimeout(showStep, stepDelay);
    };

    showStep();
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

    // Eğer çözüm view'larındaysa (fullSolution, interactive, solving) başarı mesajını gösterme
    const currentView = window.stateManager ? window.stateManager.getStateValue('ui').view : 'setup';
    if (['fullSolution', 'interactive', 'solving'].includes(currentView)) {
        return; // Başarı mesajını gösterme
    }

    statusMessage.className = 'flex flex-col items-center justify-center space-y-3 p-4 bg-green-100 text-green-700 rounded-lg';
    statusMessage.innerHTML = `
        <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <p class="font-medium text-center">${message}</p>
    `;

    resultContainer.classList.remove('hidden');
    solutionOutput.classList.add('hidden');

    if (autoHide) {
        setTimeout(() => {
            resultContainer.classList.add('hidden');
        }, hideDelay);
    }
}

/**
 * Ekranda bir hata mesajı gösterir.
 * @param {string} message - Gösterilecek hata mesajı.
 * @param {boolean} showResetButton - Kullanıcının arayüzü sıfırlayabileceği bir "Tamam" butonu gösterilsin mi?
 * @param {function} onReset - "Tamam" butonuna basıldığında çalışacak fonksiyon.
 */
export function showError(message, showResetButton = false, onReset = () => {}) {
    const resultContainer = document.getElementById('result-container');
    const statusMessage = document.getElementById('status-message');
    const solutionOutput = document.getElementById('solution-output');

    if (!resultContainer || !statusMessage || !solutionOutput) return;

    statusMessage.className = 'flex flex-col items-center justify-center space-y-3 p-4 bg-red-100 text-red-700 rounded-lg';
    statusMessage.innerHTML = `<p class="font-medium text-center">${message}</p>`;

    if (showResetButton) {
        const okButton = document.createElement('button');
        okButton.textContent = 'Tamam';
        okButton.className = 'btn btn-primary mt-3 w-full max-w-xs';
        okButton.onclick = onReset;
        statusMessage.appendChild(okButton);
    }

    resultContainer.classList.remove('hidden');
    solutionOutput.classList.add('hidden');
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