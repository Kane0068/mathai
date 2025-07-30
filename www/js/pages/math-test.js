// =================================================================================
//  MathAi Test Sistemi - math-test.js
//  Matematiksel İfadelerin Doğru Gösterilmesi Test Merkezi
// =================================================================================

import { renderMath } from '../modules/ui.js';
import { advancedMathRenderer } from '../modules/advancedMathRenderer.js';

// Test verileri
const TEST_CATEGORIES = {
    basic: {
        name: "Temel Matematiksel İfadeler",
        description: "Basit matematiksel işlemler ve formüller",
        tests: [
            { name: "Toplama", latex: "2 + 3 = 5", expected: "2 + 3 = 5" },
            { name: "Çıkarma", latex: "10 - 4 = 6", expected: "10 - 4 = 6" },
            { name: "Çarpma", latex: "5 \\times 6 = 30", expected: "5 \\times 6 = 30" },
            { name: "Bölme", latex: "\\frac{20}{4} = 5", expected: "\\frac{20}{4} = 5" },
            { name: "Üs Alma", latex: "2^3 = 8", expected: "2^3 = 8" },
            { name: "Kök Alma", latex: "\\sqrt{16} = 4", expected: "\\sqrt{16} = 4" },
            { name: "Kesir", latex: "\\frac{3}{4}", expected: "\\frac{3}{4}" },
            { name: "Karma İşlem", latex: "2 + 3 \\times 4 = 14", expected: "2 + 3 \\times 4 = 14" }
        ]
    },
    algebra: {
        name: "Cebirsel İfadeler",
        description: "Değişkenler ve cebirsel işlemler",
        tests: [
            { name: "Değişken", latex: "x + y = 10", expected: "x + y = 10" },
            { name: "Karesi", latex: "x^2 + 2x + 1", expected: "x^2 + 2x + 1" },
            { name: "Kök", latex: "\\sqrt{x^2 + y^2}", expected: "\\sqrt{x^2 + y^2}" },
            { name: "Kesirli İfade", latex: "\\frac{x + 1}{x - 1}", expected: "\\frac{x + 1}{x - 1}" },
            { name: "Mutlak Değer", latex: "|x - 3|", expected: "|x - 3|" },
            { name: "Logaritma", latex: "\\log(x)", expected: "\\log(x)" },
            { name: "Doğal Logaritma", latex: "\\ln(x)", expected: "\\ln(x)" },
            { name: "Üstel", latex: "e^x", expected: "e^x" }
        ]
    },
    calculus: {
        name: "Kalkülüs",
        description: "Türev, integral ve limit ifadeleri",
        tests: [
            { name: "Türev", latex: "\\frac{d}{dx}(x^2) = 2x", expected: "\\frac{d}{dx}(x^2) = 2x" },
            { name: "İkinci Türev", latex: "\\frac{d^2}{dx^2}(x^3) = 6x", expected: "\\frac{d^2}{dx^2}(x^3) = 6x" },
            { name: "İntegral", latex: "\\int x^2 dx = \\frac{x^3}{3} + C", expected: "\\int x^2 dx = \\frac{x^3}{3} + C" },
            { name: "Belirli İntegral", latex: "\\int_0^1 x^2 dx = \\frac{1}{3}", expected: "\\int_0^1 x^2 dx = \\frac{1}{3}" },
            { name: "Limit", latex: "\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1", expected: "\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1" },
            { name: "Sonsuz Limit", latex: "\\lim_{x \\to \\infty} \\frac{1}{x} = 0", expected: "\\lim_{x \\to \\infty} \\frac{1}{x} = 0" },
            { name: "Toplam", latex: "\\sum_{n=1}^{\\infty} \\frac{1}{n^2}", expected: "\\sum_{n=1}^{\\infty} \\frac{1}{n^2}" },
            { name: "Çarpım", latex: "\\prod_{n=1}^{10} n", expected: "\\prod_{n=1}^{10} n" }
        ]
    },
    geometry: {
        name: "Geometri",
        description: "Geometrik formüller ve şekiller",
        tests: [
            { name: "Alan", latex: "A = \\pi r^2", expected: "A = \\pi r^2" },
            { name: "Çevre", latex: "C = 2\\pi r", expected: "C = 2\\pi r" },
            { name: "Pisagor", latex: "a^2 + b^2 = c^2", expected: "a^2 + b^2 = c^2" },
            { name: "Kosinüs", latex: "c^2 = a^2 + b^2 - 2ab\\cos(C)", expected: "c^2 = a^2 + b^2 - 2ab\\cos(C)" },
            { name: "Sinüs", latex: "\\frac{a}{\\sin(A)} = \\frac{b}{\\sin(B)}", expected: "\\frac{a}{\\sin(A)} = \\frac{b}{\\sin(B)}" },
            { name: "Hacim", latex: "V = \\frac{4}{3}\\pi r^3", expected: "V = \\frac{4}{3}\\pi r^3" },
            { name: "Yüzey Alanı", latex: "S = 4\\pi r^2", expected: "S = 4\\pi r^2" },
            { name: "Eğim", latex: "m = \\frac{y_2 - y_1}{x_2 - x_1}", expected: "m = \\frac{y_2 - y_1}{x_2 - x_1}" }
        ]
    },
    trigonometry: {
        name: "Trigonometri",
        description: "Trigonometrik fonksiyonlar ve kimlikler",
        tests: [
            { name: "Sinüs", latex: "\\sin(\\theta)", expected: "\\sin(\\theta)" },
            { name: "Kosinüs", latex: "\\cos(\\theta)", expected: "\\cos(\\theta)" },
            { name: "Tanjant", latex: "\\tan(\\theta) = \\frac{\\sin(\\theta)}{\\cos(\\theta)}", expected: "\\tan(\\theta) = \\frac{\\sin(\\theta)}{\\cos(\\theta)}" },
            { name: "Kotanjant", latex: "\\cot(\\theta) = \\frac{1}{\\tan(\\theta)}", expected: "\\cot(\\theta) = \\frac{1}{\\tan(\\theta)}" },
            { name: "Sekant", latex: "\\sec(\\theta) = \\frac{1}{\\cos(\\theta)}", expected: "\\sec(\\theta) = \\frac{1}{\\cos(\\theta)}" },
            { name: "Kosekant", latex: "\\csc(\\theta) = \\frac{1}{\\sin(\\theta)}", expected: "\\csc(\\theta) = \\frac{1}{\\sin(\\theta)}" },
            { name: "Pisagor Kimliği", latex: "\\sin^2(\\theta) + \\cos^2(\\theta) = 1", expected: "\\sin^2(\\theta) + \\cos^2(\\theta) = 1" },
            { name: "Toplam Formülü", latex: "\\sin(A + B) = \\sin(A)\\cos(B) + \\cos(A)\\sin(B)", expected: "\\sin(A + B) = \\sin(A)\\cos(B) + \\cos(A)\\sin(B)" }
        ]
    },
    statistics: {
        name: "İstatistik",
        description: "İstatistiksel formüller ve notasyonlar",
        tests: [
            { name: "Ortalama", latex: "\\bar{x} = \\frac{\\sum_{i=1}^{n} x_i}{n}", expected: "\\bar{x} = \\frac{\\sum_{i=1}^{n} x_i}{n}" },
            { name: "Varyans", latex: "s^2 = \\frac{\\sum_{i=1}^{n} (x_i - \\bar{x})^2}{n-1}", expected: "s^2 = \\frac{\\sum_{i=1}^{n} (x_i - \\bar{x})^2}{n-1}" },
            { name: "Standart Sapma", latex: "s = \\sqrt{s^2}", expected: "s = \\sqrt{s^2}" },
            { name: "Korelasyon", latex: "r = \\frac{\\sum(x-\\bar{x})(y-\\bar{y})}{\\sqrt{\\sum(x-\\bar{x})^2\\sum(y-\\bar{y})^2}}", expected: "r = \\frac{\\sum(x-\\bar{x})(y-\\bar{y})}{\\sqrt{\\sum(x-\\bar{x})^2\\sum(y-\\bar{y})^2}}" },
            { name: "Binom Dağılımı", latex: "P(X = k) = \\binom{n}{k} p^k (1-p)^{n-k}", expected: "P(X = k) = \\binom{n}{k} p^k (1-p)^{n-k}" },
            { name: "Normal Dağılım", latex: "f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}", expected: "f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}" },
            { name: "Z-Skoru", latex: "z = \\frac{x - \\mu}{\\sigma}", expected: "z = \\frac{x - \\mu}{\\sigma}" },
            { name: "Güven Aralığı", latex: "\\bar{x} \\pm z_{\\alpha/2} \\frac{s}{\\sqrt{n}}", expected: "\\bar{x} \\pm z_{\\alpha/2} \\frac{s}{\\sqrt{n}}" }
        ]
    },
    complex: {
        name: "Karmaşık İfadeler",
        description: "Karmaşık matematiksel ifadeler ve denklemler",
        tests: [
            { name: "Karmaşık Sayı", latex: "z = a + bi", expected: "z = a + bi" },
            { name: "Karmaşık Modül", latex: "|z| = \\sqrt{a^2 + b^2}", expected: "|z| = \\sqrt{a^2 + b^2}" },
            { name: "Matris", latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}", expected: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}" },
            { name: "Determinant", latex: "\\det(A) = ad - bc", expected: "\\det(A) = ad - bc" },
            { name: "Vektör", latex: "\\vec{v} = \\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix}", expected: "\\vec{v} = \\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix}" },
            { name: "Vektör Normu", latex: "\\|\\vec{v}\\| = \\sqrt{x^2 + y^2 + z^2}", expected: "\\|\\vec{v}\\| = \\sqrt{x^2 + y^2 + z^2}" },
            { name: "Skaler Çarpım", latex: "\\vec{a} \\cdot \\vec{b} = a_1b_1 + a_2b_2 + a_3b_3", expected: "\\vec{a} \\cdot \\vec{b} = a_1b_1 + a_2b_2 + a_3b_3" },
            { name: "Vektörel Çarpım", latex: "\\vec{a} \\times \\vec{b} = \\begin{vmatrix} \\mathbf{i} & \\mathbf{j} & \\mathbf{k} \\\\ a_1 & a_2 & a_3 \\\\ b_1 & b_2 & b_3 \\end{vmatrix}", expected: "\\vec{a} \\times \\vec{b} = \\begin{vmatrix} \\mathbf{i} & \\mathbf{j} & \\mathbf{k} \\\\ a_1 & a_2 & a_3 \\\\ b_1 & b_2 & b_3 \\end{vmatrix}" }
        ]
    },
    mixed: {
        name: "Karışık İçerik",
        description: "Metin ve matematiksel ifadelerin karışımı",
        tests: [
            { name: "Problem Özeti", latex: "Bir kenar uzunluğu: $\\sqrt{8}$ cm", expected: "Bir kenar uzunluğu: $\\sqrt{8}$ cm" },
            { name: "Adım Açıklaması", latex: "$\\sqrt{8}$'i sadeleştir", expected: "$\\sqrt{8}$'i sadeleştir" },
            { name: "Açıklama + Formül", latex: "Pisagor teoremi: $a^2 + b^2 = c^2$", expected: "Pisagor teoremi: $a^2 + b^2 = c^2$" },
            { name: "Türkçe + Matematik", latex: "x değeri \\frac{1}{2} olduğuna göre", expected: "x değeri \\frac{1}{2} olduğuna göre" },
            { name: "Birim + Sayı", latex: "Sonuç: 5 cm", expected: "Sonuç: 5 cm" },
            { name: "Açıklama + Eşitlik", latex: "Bu durumda x = 3 olur", expected: "Bu durumda x = 3 olur" },
            { name: "Soru + Formül", latex: "\\sqrt{16} kaçtır?", expected: "\\sqrt{16} kaçtır?" },
            { name: "Tanım + İfade", latex: "Çevre = 2πr formülü ile hesaplanır", expected: "Çevre = 2πr formülü ile hesaplanır" }
        ]
    }
};

// Test durumu
let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    categories: {}
};

// DOM elementleri
const elements = {};

// Uygulama başlangıcı
window.addEventListener('load', () => {
    initializeTestSystem();
});

function initializeTestSystem() {
    cacheDOMElements();
    setupEventListeners();
    updateStatistics();
}

function cacheDOMElements() {
    const ids = [
        'run-all-tests', 'run-basic-tests', 'run-advanced-tests',
        'total-tests', 'passed-tests', 'failed-tests', 'success-rate',
        'test-status', 'test-results', 'custom-latex', 'custom-result',
        'test-custom', 'clear-custom'
    ];
    
    ids.forEach(id => {
        elements[id] = document.getElementById(id);
    });
}

function setupEventListeners() {
    elements['run-all-tests'].addEventListener('click', () => runAllTests());
    elements['run-basic-tests'].addEventListener('click', () => runBasicTests());
    elements['run-advanced-tests'].addEventListener('click', () => runAdvancedTests());
    elements['test-custom'].addEventListener('click', () => testCustomExpression());
    elements['clear-custom'].addEventListener('click', () => clearCustomTest());
}

// Test çalıştırma fonksiyonları
async function runAllTests() {
    updateTestStatus('Tüm testler çalıştırılıyor...');
    resetTestResults();
    
    for (const [categoryKey, category] of Object.entries(TEST_CATEGORIES)) {
        await runCategoryTests(categoryKey, category);
    }
    
    updateTestStatus('Tüm testler tamamlandı!');
    updateStatistics();
}

async function runBasicTests() {
    updateTestStatus('Temel testler çalıştırılıyor...');
    resetTestResults();
    
    const basicCategories = ['basic', 'algebra'];
    for (const categoryKey of basicCategories) {
        const category = TEST_CATEGORIES[categoryKey];
        await runCategoryTests(categoryKey, category);
    }
    
    updateTestStatus('Temel testler tamamlandı!');
    updateStatistics();
}

async function runAdvancedTests() {
    updateTestStatus('Gelişmiş testler çalıştırılıyor...');
    resetTestResults();
    
    const advancedCategories = ['calculus', 'geometry', 'trigonometry', 'statistics', 'complex', 'mixed'];
    for (const categoryKey of advancedCategories) {
        const category = TEST_CATEGORIES[categoryKey];
        await runCategoryTests(categoryKey, category);
    }
    
    updateTestStatus('Gelişmiş testler tamamlandı!');
    updateStatistics();
}

async function runCategoryTests(categoryKey, category) {
    // Kategori container'ını oluştur
    const categoryContainer = createCategoryContainer(categoryKey, category);
    categoryContainer.dataset.categoryKey = categoryKey;
    elements['test-results'].appendChild(categoryContainer);
    
    const testContainer = categoryContainer.querySelector('.test-items');
    let categoryPassed = 0;
    let categoryFailed = 0;
    
    for (const test of category.tests) {
        const testResult = await runSingleTest(test);
        const testElement = createTestElement(test, testResult);
        testContainer.appendChild(testElement);
        
        if (testResult.success) {
            categoryPassed++;
            testResults.passed++;
        } else {
            categoryFailed++;
            testResults.failed++;
        }
        testResults.total++;
        
        // Kısa bir gecikme ekle (görsel efekt için)
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Kategori özetini güncelle
    updateCategorySummary(categoryContainer, categoryPassed, categoryFailed);
    testResults.categories[categoryKey] = { passed: categoryPassed, failed: categoryFailed };
}

async function runSingleTest(test) {
    try {
        // Test elementini oluştur
        const testElement = document.createElement('div');
        testElement.style.position = 'absolute';
        testElement.style.left = '-9999px';
        testElement.style.visibility = 'hidden';
        document.body.appendChild(testElement);
        
        // Yeni MathRenderer ile render et
        const success = advancedMathRenderer.render(test.latex, testElement, false);
        
        // Render edilen içeriği al
        const renderedContent = testElement.innerHTML;
        
        // Test elementini temizle
        document.body.removeChild(testElement);
        
        // Başarı kontrolü
        const isSuccessful = success && renderedContent && renderedContent.trim() !== '' && 
                            !renderedContent.includes('ParseError') &&
                            !renderedContent.includes('KaTeX error');
        
        return {
            success: isSuccessful,
            rendered: renderedContent,
            error: isSuccessful ? null : 'Render hatası'
        };
        
    } catch (error) {
        return {
            success: false,
            rendered: null,
            error: error.message
        };
    }
}

// UI oluşturma fonksiyonları
function createCategoryContainer(categoryKey, category) {
    const container = document.createElement('div');
    container.className = 'bg-white rounded-xl p-6 border border-gray-200 shadow-sm';
    container.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <div>
                <h3 class="text-xl font-bold text-gray-800">${category.name}</h3>
                <p class="text-gray-600 text-sm">${category.description}</p>
            </div>
            <div class="text-right">
                <div class="text-2xl font-bold text-gray-800" id="category-${categoryKey}-total">0</div>
                <div class="text-sm text-gray-500">Test</div>
            </div>
        </div>
        <div class="mb-4 flex items-center space-x-4">
            <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                <span class="text-sm text-gray-600">Başarılı: <span id="category-${categoryKey}-passed" class="font-semibold text-green-600">0</span></span>
            </div>
            <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                <span class="text-sm text-gray-600">Başarısız: <span id="category-${categoryKey}-failed" class="font-semibold text-red-600">0</span></span>
            </div>
        </div>
        <div class="test-items space-y-3"></div>
    `;
    return container;
}

function createTestElement(test, result) {
    const element = document.createElement('div');
    element.className = `p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`;
    
    element.innerHTML = `
        <div class="flex items-start justify-between">
            <div class="flex-1">
                <h4 class="font-semibold text-gray-800 mb-2">${test.name}</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">LaTeX Girişi:</label>
                        <div class="bg-gray-100 p-2 rounded text-sm font-mono">${escapeHtml(test.latex)}</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Render Sonucu:</label>
                        <div class="bg-white p-2 rounded border text-sm min-h-[2rem] ${result.success ? 'border-green-300' : 'border-red-300'}">
                            ${result.success ? result.rendered : `<span class="text-red-600">${escapeHtml(result.error)}</span>`}
                        </div>
                    </div>
                </div>
            </div>
            <div class="ml-4">
                ${result.success ? 
                    '<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>' :
                    '<svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
                }
            </div>
        </div>
    `;
    
    return element;
}

function updateCategorySummary(container, passed, failed) {
    const categoryKey = container.dataset.categoryKey;
    const total = passed + failed;
    
    const totalElement = container.querySelector(`#category-${categoryKey}-total`);
    const passedElement = container.querySelector(`#category-${categoryKey}-passed`);
    const failedElement = container.querySelector(`#category-${categoryKey}-failed`);
    
    if (totalElement) totalElement.textContent = total;
    if (passedElement) passedElement.textContent = passed;
    if (failedElement) failedElement.textContent = failed;
}

// Özel test fonksiyonları
function testCustomExpression() {
    const latex = elements['custom-latex'].value.trim();
    if (!latex) {
        elements['custom-result'].innerHTML = '<p class="text-red-600 text-sm">Lütfen bir LaTeX ifadesi girin.</p>';
        return;
    }
    
    const testElement = document.createElement('div');
    testElement.style.position = 'absolute';
    testElement.style.left = '-9999px';
    testElement.style.visibility = 'hidden';
    document.body.appendChild(testElement);
    
    try {
        const success = advancedMathRenderer.render(latex, testElement, false);
        const renderedContent = testElement.innerHTML;
        
        if (success && renderedContent && !renderedContent.includes('ParseError') && !renderedContent.includes('KaTeX error')) {
            elements['custom-result'].innerHTML = `
                <div class="text-green-600 text-sm mb-2">✓ Başarılı!</div>
                <div class="border border-green-300 bg-green-50 p-2 rounded">${renderedContent}</div>
            `;
        } else {
            elements['custom-result'].innerHTML = `
                <div class="text-red-600 text-sm mb-2">✗ Hata!</div>
                <div class="border border-red-300 bg-red-50 p-2 rounded text-red-600">Render hatası</div>
            `;
        }
    } catch (error) {
        elements['custom-result'].innerHTML = `
            <div class="text-red-600 text-sm mb-2">✗ Hata!</div>
            <div class="border border-red-300 bg-red-50 p-2 rounded text-red-600">${escapeHtml(error.message)}</div>
        `;
    }
    
    document.body.removeChild(testElement);
}

function clearCustomTest() {
    elements['custom-latex'].value = '';
    elements['custom-result'].innerHTML = '<p class="text-gray-500 text-sm">Sonuç burada görünecek...</p>';
}

// Yardımcı fonksiyonlar
function resetTestResults() {
    testResults = {
        total: 0,
        passed: 0,
        failed: 0,
        categories: {}
    };
    elements['test-results'].innerHTML = '';
}

function updateStatistics() {
    elements['total-tests'].textContent = testResults.total;
    elements['passed-tests'].textContent = testResults.passed;
    elements['failed-tests'].textContent = testResults.failed;
    
    const successRate = testResults.total > 0 ? Math.round((testResults.passed / testResults.total) * 100) : 0;
    elements['success-rate'].textContent = `${successRate}%`;
}

function updateTestStatus(message) {
    elements['test-status'].textContent = message;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
} 