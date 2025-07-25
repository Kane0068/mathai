// www/js/modules/ui.js

/**
 * Ekranda bir yükleme mesajı gösterir.
 * @param {string} message - Gösterilecek mesaj.
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

function isMathExpression(str) {
    // Sadece matematiksel LaTeX ifadelerini tespit eden bir kontrol
    return /\\(frac|sqrt|sum|int|leq|geq|cdot|times|div|pm|neq|infty|lim|log|sin|cos|tan|text)/.test(str) || /\$.*\$/.test(str) || /[=+\-*/^_]/.test(str);
}

function autoWrapTextForKaTeX(str) {
    // LaTeX bloklarını tespit et ve düz metin kısımlarını T{...} ile sarmala
    // Bu regex, LaTeX komutları ve matematiksel operatörler dışındaki düz metinleri bulur
    // ve onları T{...} ile sarar
    return str.replace(/([^\\$=+\-*/^_]*)(?=(\\frac|\\sqrt|\\sum|\\int|\\leq|\\geq|\\cdot|\\times|\\div|\\pm|\\neq|\\infty|\\lim|\\log|\\sin|\\cos|\\tan|\$|=|\+|-|\*|\/|\^|_))/g, (match, p1) => {
        if (p1.trim() === '') return '';
        return `T{${p1}}`;
    });
}

function isLatex(str) {
    // LaTeX olup olmadığını anlamak için temel bir kontrol
    return /\\\\|\\frac|\\sqrt|\\sum|\\int|\\leq|\\geq|\\cdot|\\times|\\div|\\pm|\\neq|\\infty|\\lim|\\log|\\sin|\\cos|\\tan|\\^|\\{|\\}|\\$|_/g.test(str);
}

function convertTtoText(str) {
    // T{...} formatını \text{...} ile değiştir
    return str.replace(/T\{([^}]*)\}/g, '\\\\text{$1}');
}

function convertSimpleExponent(str) {
    // 12^4, x^2, (a+b)^3 gibi ifadeleri LaTeX formatına çevirir
    return str.replace(/(\\w+|\\([^\\)]+\\))\\^(\\w+|\\d+|\\([^\\)]+\\))/g, '$1^{ $2 }');
}



// www/js/modules/ui.js dosyasındaki renderMath fonksiyonunu bununla değiştirin.

import { mathRenderer } from './mathRenderer.js';

/**
 * Geliştirilmiş matematiksel ifade render fonksiyonu
 * @param {string} stringToRender - Render edilecek metin.
 * @param {HTMLElement} element - Metnin render edileceği HTML elementi.
 * @param {boolean} displayMode - KaTeX render'ında displayMode parametresi.
 */
export function renderMath(stringToRender, element, displayMode = false) {
    // Yeni MathRenderer kullan
    return mathRenderer.render(stringToRender, element, displayMode);
}

/**
 * Özel karakterleri escape et
 */
function escapeSpecialCharacters(str) {
    // Eğer string zaten \text{} içindeyse, içindeki özel karakterleri escape et
    return str.replace(/\\text\{([^}]*)\}/g, (match, content) => {
        const escapedContent = content
            .replace(/&/g, '\\&')
            .replace(/%/g, '\\%')
            .replace(/\$/g, '\\$')
            .replace(/#/g, '\\#');
        return `\\text{${escapedContent}}`;
    });
}

/**
 * Alternatif render denemesi
 */
function tryAlternativeRender(originalString, element, displayMode) {
    try {
        // Basit metin olarak render et
        katex.render(`\\text{${originalString.replace(/[{}\\]/g, '')}}`, element, {
            throwOnError: false,
            displayMode: displayMode,
            output: "html",
            trust: true,
            strict: false
        });
    } catch (e2) {
        // Son çare olarak düz metin göster
        element.textContent = originalString;
        element.classList.add('katex-error');
    }
}

/**
 * Element stillerini ayarla
 */
function setupElementStyles(element, displayMode) {
    element.style.textAlign = 'left';
    element.style.lineHeight = '1.8';
    element.style.padding = '2px 0';
    
    const fontSize = displayMode ? '1.2rem' : '1.1rem';
    element.style.fontSize = fontSize;
    
    element.classList.remove('katex-error');
}

/**
 * Render sonrası düzeltmeler
 */
function postRenderAdjustments(element, displayMode) {
    const katexElements = element.querySelectorAll('.katex');
    
    katexElements.forEach(katexEl => {
        katexEl.style.overflowX = 'auto';
        katexEl.style.overflowY = 'hidden';
        katexEl.style.paddingBottom = '4px';
        
        if (displayMode) {
            katexEl.style.display = 'block';
            katexEl.style.textAlign = 'center';
        } else {
            katexEl.style.display = 'inline-block';
            katexEl.style.verticalAlign = 'middle';
        }
    });
}
