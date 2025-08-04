// =================================================================================
//  MathAi - UI Modülü - Gelişmiş Render ve Hata Yönetimi
// =================================================================================
import { unifiedRenderController } from './unifiedRenderController.js';


// js/modules/ui.js içindeki showLoading fonksiyonunu bununla değiştirin
export function showLoading(message) {
    const resultContainer = document.getElementById('result-container');
    const statusMessage = document.getElementById('status-message');

    if (!resultContainer || !statusMessage) return;

    if (message === false) {
        // Sadece, eğer içinde başka bir hata/başarı mesajı yoksa result container'ı gizle.
        if (!statusMessage.innerHTML || statusMessage.innerHTML.trim() === '') {
             resultContainer.classList.add('hidden');
        }
        return;
    }

    // Ana konteynerin görünürlüğüne dokunma, sadece status mesajını doldur ve göster.
    resultContainer.classList.remove('hidden');
    statusMessage.innerHTML = `
         <div class="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-8 w-8 animate-spin"></div>
         <p class="text-gray-600 font-medium">${message}</p>
    `;
    statusMessage.className = 'flex items-center justify-center space-x-3 p-4 bg-gray-50 rounded-lg';
    statusMessage.classList.remove('hidden');
}

// js/modules/ui.js içindeki showSuccess fonksiyonunu bununla değiştirin
export function showSuccess(message, autoHide = true, hideDelay = 3000) {
    const resultContainer = document.getElementById('result-container');
    const statusMessage = document.getElementById('status-message');

    if (!resultContainer || !statusMessage) return;

    resultContainer.classList.remove('hidden');
    statusMessage.className = 'flex flex-col items-center justify-center space-y-3 p-4 bg-green-100 text-green-700 rounded-lg';
    statusMessage.innerHTML = `
        <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <p class="font-medium text-center">${message}</p>
    `;
    statusMessage.classList.remove('hidden');

    if (autoHide) {
        setTimeout(() => {
            statusMessage.innerHTML = '';
            statusMessage.classList.add('hidden');
            // Eğer solution-output görünür değilse, result-container'ı gizle
            const solutionOutput = document.getElementById('solution-output');
            if (solutionOutput && solutionOutput.classList.contains('hidden')) {
                resultContainer.classList.add('hidden');
            }
        }, hideDelay);
    }
}

// js/modules/ui.js içindeki showError fonksiyonunu bununla değiştirin
export function showError(message, showResetButton = false, onReset = () => {}) {
    const resultContainer = document.getElementById('result-container');
    const statusMessage = document.getElementById('status-message');

    if (!resultContainer || !statusMessage) return;

    resultContainer.classList.remove('hidden');
    statusMessage.classList.remove('hidden');
    statusMessage.className = ''; // Önceki stilleri temizle

    let errorHTML = `
        <div class="flex flex-col items-center justify-center space-y-3 p-4 bg-red-100 text-red-700 rounded-lg">
            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
            <p class="font-medium text-center">${message}</p>
        </div>
    `;
    statusMessage.innerHTML = errorHTML;

    if (showResetButton) {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'mt-4 text-center';
        const okButton = document.createElement('button');
        okButton.textContent = 'Tamam';
        okButton.className = 'btn btn-primary px-6 py-2';

        okButton.onclick = function() {
            statusMessage.innerHTML = '';
            statusMessage.classList.add('hidden');
            resultContainer.classList.add('hidden');
            if (typeof onReset === 'function') {
                onReset();
            }
        };

        buttonContainer.appendChild(okButton);
        statusMessage.querySelector('.rounded-lg').appendChild(buttonContainer);
    }
}

/**
 * Animasyonlu adım adım yükleme mesajı gösterir.
 * @param {Array} steps - Gösterilecek adımlar dizisi [{title, description}].
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

export async function renderMath(content, element, displayMode = false) {
    return await unifiedRenderController.render(element, content, { displayMode });
}
// renderMathInContainer fonksiyonunu değiştirin
export async function renderMathInContainer(container, displayMode = false) {
    if (!container) return;
    
    try {
        await unifiedRenderController.renderContainer(container, {
            displayMode,
            onProgress: (completed, total) => {
                console.log(`Render ilerleme: ${completed}/${total}`);
            }
        });
    } catch (error) {
        console.error('Container render hatası:', error);
    }
}
// Yeni: Render sistemini başlat
export async function initializeRenderSystem() {
    return true; // UnifiedController otomatik başlar
}

/**
 * Smart content elementlerini render eder.
 * @param {HTMLElement} container - İçerik container'ı.
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
                element.textContent = content;
            }
        }
    }
}

/**
 * LaTeX content elementlerini render eder.
 * @param {HTMLElement} container - İçerik container'ı.
 */
export async function renderLatexContent(container) {
    if (!container) return;
    const latexElements = container.querySelectorAll('.latex-content[data-latex]');
    for (const element of latexElements) {
        const latex = element.getAttribute('data-latex');
        if (latex) {
            try {
                await renderMath(latex, element, true);
            } catch (error) {
                element.textContent = latex;
            }
        }
    }
}

export function getRenderStats() {
    return advancedMathRenderer.getStats();
}

export function clearRenderCache() {
    advancedMathRenderer.clearCache();
}

export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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

export async function batchRender(renderTasks, batchSize = 5) {
    const results = [];
    for (let i = 0; i < renderTasks.length; i += batchSize) {
        const batch = renderTasks.slice(i, i + batchSize);
        const batchPromises = batch.map(async (task) => {
            try {
                return await renderMath(task.content, task.element, task.displayMode);
            } catch (error) {
                return false;
            }
        });
        results.push(...await Promise.all(batchPromises));
        if (i + batchSize < renderTasks.length) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
    return results;
}

// Global export for debugging
if (typeof window !== 'undefined') {
    window.mathUI = {
        renderMath, renderMathInContainer, renderSmartContent, renderLatexContent,
        smartRender, batchRender, getRenderStats, clearRenderCache, waitForRenderSystem
    };
}

// --- YARDIMCI FONKSİYONLAR ---

function waitForDOMReady() {
    return new Promise(resolve => {
        if (document.readyState === 'complete') {
            resolve();
        } else {
            window.addEventListener('load', resolve, { once: true });
        }
    });
}

function isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
}

function collectRenderableElements(container) {
    const elements = [];
    container.querySelectorAll('.smart-content').forEach(el => {
        const content = el.getAttribute('data-content') || el.textContent;
        if (content) elements.push({element: el, content, type: 'smart'});
    });
    container.querySelectorAll('.latex-content').forEach(el => {
        const content = el.getAttribute('data-latex') || el.textContent;
        if (content) elements.push({element: el, content, type: 'latex'});
    });
    return elements;
}

function chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

// Dosyanın sonunda global erişim ekleyin
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
        waitForRenderSystem,
    };
}