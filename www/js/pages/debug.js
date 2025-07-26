// =================================================================================
//  MathAi Debug Sistemi - debug.js
//  API Yanıtları ve Render İşlemleri Debug Merkezi
// =================================================================================

import { advancedMathRenderer } from '../modules/advancedMathRenderer.js';

// DOM elementleri
const elements = {};

// Uygulama başlangıcı
window.addEventListener('load', () => {
    initializeDebugSystem();
});

function initializeDebugSystem() {
    cacheDOMElements();
    setupEventListeners();
    runInitialTests();
}

function cacheDOMElements() {
    const ids = [
        'debug-input', 'debug-result', 'debug-test', 'debug-analyze', 'debug-clear',
        'debug-analysis', 'analysis-content', 'test-simple', 'test-fraction', 'test-latex', 'test-mixed'
    ];
    
    ids.forEach(id => {
        elements[id] = document.getElementById(id);
    });
}

function setupEventListeners() {
    elements['debug-test'].addEventListener('click', () => testExpression());
    elements['debug-analyze'].addEventListener('click', () => analyzeExpression());
    elements['debug-clear'].addEventListener('click', () => clearDebug());
}

function testExpression() {
    const input = elements['debug-input'].value.trim();
    if (!input) {
        elements['debug-result'].innerHTML = '<p class="text-red-600 text-sm">Lütfen bir ifade girin.</p>';
        return;
    }
    
    const testElement = document.createElement('div');
    testElement.style.position = 'absolute';
    testElement.style.left = '-9999px';
    testElement.style.visibility = 'hidden';
    document.body.appendChild(testElement);
    
    try {
        // Önce analiz yap
        const analysis = advancedMathRenderer.analyzeContent(input);
        
        // Render işlemi
        const success = advancedMathRenderer.render(input, testElement, false);
        const renderedContent = testElement.innerHTML;
        
        if (success && renderedContent && !renderedContent.includes('ParseError') && !renderedContent.includes('KaTeX error')) {
            elements['debug-result'].innerHTML = `
                <div class="text-green-600 text-sm mb-2">✓ Başarılı Render!</div>
                <div class="border border-green-300 bg-green-50 p-2 rounded mb-2">${renderedContent}</div>
                <div class="text-xs text-gray-500 mb-2">
                    <strong>Render Stratejisi:</strong> ${getStrategyName(analysis)}<br>
                    <strong>Güven Skoru:</strong> ${Math.round(analysis.confidence * 100)}%
                </div>
                <div class="text-xs text-gray-500">Orijinal: ${escapeHtml(input)}</div>
            `;
        } else {
            elements['debug-result'].innerHTML = `
                <div class="text-red-600 text-sm mb-2">✗ Render Hatası!</div>
                <div class="border border-red-300 bg-red-50 p-2 rounded text-red-600 mb-2">Render başarısız</div>
                <div class="text-xs text-gray-500 mb-2">
                    <strong>Denenen Strateji:</strong> ${getStrategyName(analysis)}<br>
                    <strong>Güven Skoru:</strong> ${Math.round(analysis.confidence * 100)}%
                </div>
                <div class="text-xs text-gray-500">Orijinal: ${escapeHtml(input)}</div>
            `;
        }
    } catch (error) {
        elements['debug-result'].innerHTML = `
            <div class="text-red-600 text-sm mb-2">✗ Hata!</div>
            <div class="border border-red-300 bg-red-50 p-2 rounded text-red-600">${escapeHtml(error.message)}</div>
            <div class="text-xs text-gray-500 mt-2">Orijinal: ${escapeHtml(input)}</div>
        `;
    }
    
    document.body.removeChild(testElement);
}

function getStrategyName(analysis) {
    if (analysis.isMixed) return 'Karışık İçerik Render';
    if (analysis.isLatex && !analysis.isPlainText) return 'LaTeX Render';
    if (analysis.isMathExpression && !analysis.isPlainText) return 'Matematiksel İfade Render';
    if (analysis.isPlainText && !analysis.isLatex && !analysis.isMathExpression) return 'Düz Metin Render';
    return 'Belirsiz - Karışık İçerik Render';
}

function analyzeExpression() {
    const input = elements['debug-input'].value.trim();
    if (!input) {
        elements['debug-analysis'].classList.add('hidden');
        return;
    }
    
    const analysis = advancedMathRenderer.analyzeContent(input);
    
    let html = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-gray-50 p-3 rounded">
                <h4 class="font-semibold text-gray-800 mb-2">İçerik Analizi:</h4>
                <ul class="space-y-1 text-sm">
                    <li><span class="font-medium">LaTeX:</span> <span class="${analysis.isLatex ? 'text-green-600' : 'text-red-600'}">${analysis.isLatex ? 'Evet' : 'Hayır'}</span></li>
                    <li><span class="font-medium">Matematiksel İfade:</span> <span class="${analysis.isMathExpression ? 'text-green-600' : 'text-red-600'}">${analysis.isMathExpression ? 'Evet' : 'Hayır'}</span></li>
                    <li><span class="font-medium">Düz Metin:</span> <span class="${analysis.isPlainText ? 'text-green-600' : 'text-red-600'}">${analysis.isPlainText ? 'Evet' : 'Hayır'}</span></li>
                    <li><span class="font-medium">Karışık İçerik:</span> <span class="${analysis.isMixed ? 'text-green-600' : 'text-red-600'}">${analysis.isMixed ? 'Evet' : 'Hayır'}</span></li>
                    <li><span class="font-medium">Güven Skoru:</span> <span class="text-blue-600">${Math.round(analysis.confidence * 100)}%</span></li>
                </ul>
            </div>
            <div class="bg-gray-50 p-3 rounded">
                <h4 class="font-semibold text-gray-800 mb-2">Önerilen Render Stratejisi:</h4>
                <div class="text-sm">
                    ${getRecommendedStrategy(analysis)}
                </div>
            </div>
        </div>
        
        <div class="mt-4 bg-blue-50 p-3 rounded">
            <h4 class="font-semibold text-gray-800 mb-2">Detaylı Analiz:</h4>
            <div class="text-sm space-y-1">
                <div><span class="font-medium">Orijinal İçerik:</span> <code class="bg-white px-1 rounded">${escapeHtml(input)}</code></div>
                <div><span class="font-medium">Uzunluk:</span> ${input.length} karakter</div>
                <div><span class="font-medium">Boşluk Sayısı:</span> ${(input.match(/\s/g) || []).length}</div>
                <div><span class="font-medium">Özel Karakterler:</span> ${getSpecialCharacters(input)}</div>
            </div>
        </div>
    `;
    
    elements['analysis-content'].innerHTML = html;
    elements['debug-analysis'].classList.remove('hidden');
}

function getRecommendedStrategy(analysis) {
    if (analysis.isMixed) {
        return '<span class="text-orange-600 font-medium">Karışık İçerik Render</span> - Parçalara ayrılıp ayrı ayrı render edilecek';
    } else if (analysis.isLatex && !analysis.isPlainText && analysis.confidence > 0.8) {
        return '<span class="text-green-600 font-medium">LaTeX Render</span> - Doğrudan KaTeX ile render edilecek';
    } else if (analysis.isMathExpression && !analysis.isPlainText && analysis.confidence > 0.6) {
        return '<span class="text-blue-600 font-medium">Matematiksel İfade Render</span> - LaTeX\'e çevrilip render edilecek';
    } else if (analysis.isPlainText && !analysis.isLatex && !analysis.isMathExpression) {
        return '<span class="text-gray-600 font-medium">Düz Metin Render</span> - \\text{} içine alınıp render edilecek';
    } else {
        return '<span class="text-orange-600 font-medium">Karışık İçerik Render</span> - Belirsiz durum, güvenli render stratejisi';
    }
}

function getSpecialCharacters(text) {
    const specialChars = text.match(/[^\w\s]/g);
    if (!specialChars) return 'Yok';
    return specialChars.slice(0, 10).join(', ') + (specialChars.length > 10 ? '...' : '');
}

function runInitialTests() {
    // Test örneklerini render et
    const tests = [
        { id: 'test-simple', content: '2 + 3 = 5' },
        { id: 'test-fraction', content: '1/2' },
        { id: 'test-latex', content: '\\frac{1}{2}' },
        { id: 'test-mixed', content: 'Bir kenar uzunluğu: $\\sqrt{8}$ cm' }
    ];
    
    tests.forEach(test => {
        const element = elements[test.id];
        if (element) {
            advancedMathRenderer.render(test.content, element, false);
        }
    });
}

function clearDebug() {
    elements['debug-input'].value = '';
    elements['debug-result'].innerHTML = '<p class="text-gray-500 text-sm">Sonuç burada görünecek...</p>';
    elements['debug-analysis'].classList.add('hidden');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
} 