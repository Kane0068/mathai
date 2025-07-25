// =================================================================================
//  Math Solver - index.js (Akıllı Rehber Sistemi ile Güncellenmiş)
//  Version: 4.0.0 (Akıllı Rehber Entegrasyonu)
// =================================================================================

// --- Gerekli Modülleri Import Et ---
import { AuthManager } from '../modules/auth.js';
import { FirestoreManager } from '../modules/firestore.js';
import { showLoading, showError, showSuccess, renderMath, showAnimatedLoading } from '../modules/ui.js';
import { OptimizedCanvasManager } from '../modules/canvasManager.js';
import { AdvancedErrorHandler } from '../modules/errorHandler.js';
import { StateManager } from '../modules/stateManager.js';
import { smartGuide } from '../modules/smartGuide.js';
import { mathRenderer } from '../modules/mathRenderer.js';

// --- Yardımcı Fonksiyonlar ---
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Global instances - Singleton pattern
const canvasManager = new OptimizedCanvasManager();
const errorHandler = new AdvancedErrorHandler();
const stateManager = new StateManager();

// --- Sabitler ---
const GEMINI_API_KEY = "AIzaSyDbjH9TXIFLxWH2HuYJlqIFO7Alhk1iQQs";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
const masterSolutionPrompt = `Solve the math problem and respond in the following JSON format.

CRITICAL: ALL RESPONSES MUST BE IN TURKISH LANGUAGE. Mathematical expressions must follow the exact LaTeX format compatible with KaTeX renderer.

MATHRENDERER.JS COMPATIBILITY RULES:
1. Mixed content (text + math): Use $LaTeX$ for inline math within Turkish text
2. Pure LaTeX blocks: Use $$LaTeX$$ for standalone mathematical expressions
3. Simple text: Plain Turkish text without any math symbols
4. NO escaped LaTeX: Avoid \\\\frac, use \\frac instead
5. NO HTML entities: Use LaTeX symbols, not HTML codes

CONTENT TYPE DETECTION (Based on MathRenderer.js):
- Simple Text: "Bu durumda sonuç 5 olur" (Turkish explanation without complex math)
- Mixed Content: "Değer $x = 5$ olduğu için sonuç $\\frac{10}{2}$ olur" (Turkish + inline LaTeX)
- Pure LaTeX: "$$\\frac{x^2 + 3x - 4}{2x + 1} = 0$$" (Only mathematical expression)

JSON SCHEMA:
{
  "problemOzeti": {
    "verilenler": [
      "Turkish explanation text with math: $LaTeX_inline$",
      "Another data in Turkish: $\\\\frac{a}{b} = 5$"
    ],
    "istenen": "What is requested in Turkish: $\\\\sqrt{x^2 + y^2}$"
  },
  "adimlar": [
    {
      "adimAciklamasi": "Turkish step explanation with math: $LaTeX_inline$",
      "cozum_lateks": "$$pure_latex_expression$$",
      "ipucu": "Turkish helpful hint with math: $LaTeX_inline$",
      "yanlisSecenekler": [
        {
          "metin": "$$wrong_latex_expression$$",
          "yanlisGeriBildirimi": "Turkish explanation why it's wrong with math: $LaTeX_inline$"
        },
        {
          "metin": "$$another_wrong_latex$$",
          "yanlisGeriBildirimi": "Turkish wrong explanation with math: $LaTeX_inline$"
        }
      ]
    }
  ],
  "tamCozumLateks": [
    "$$step_1_pure_latex$$",
    "$$step_2_pure_latex$$",
    "$$final_answer_pure_latex$$"
  ]
}

KATEX COMPATIBLE LATEX REFERENCE:
- Fractions: $\\\\frac{a}{b}$, $\\\\frac{x^2+1}{2x-3}$
- Exponents: $x^2$, $(a+b)^{3}$, $e^{-x}$
- Roots: $\\\\sqrt{x}$, $\\\\sqrt[3]{8}$, $\\\\sqrt{x^2+y^2}$
- Trigonometric: $\\\\sin(x)$, $\\\\cos(2\\\\theta)$, $\\\\tan^{-1}(x)$
- Logarithms: $\\\\log_{10}(x)$, $\\\\ln(e^x)$, $\\\\log(x)$
- Derivatives: $\\\\frac{d}{dx}(x^2) = 2x$, $f'(x)$
- Integrals: $\\\\int x^2 dx = \\\\frac{x^3}{3} + C$
- Limits: $\\\\lim_{x \\\\to 0} \\\\frac{\\\\sin(x)}{x} = 1$
- Summations: $\\\\sum_{n=1}^{\\\\infty} \\\\frac{1}{n^2}$
- Matrices: $\\\\begin{pmatrix} a & b \\\\\\\\ c & d \\\\end{pmatrix}$
- Systems: $\\\\begin{cases} x + y = 5 \\\\\\\\ 2x - y = 1 \\\\end{cases}$
- Inequalities: $x > 0$, $a \\\\leq b$, $-\\\\infty < x < \\\\infty$

MATHRENDERER.JS PATTERN MATCHING:
- Turkish words will be detected as plain text
- Mathematical symbols (+, -, *, /, =, <, >) will trigger math expression detection
- LaTeX commands (\\\\frac, \\\\sqrt, etc.) will trigger LaTeX detection
- Mixed content will be properly split and rendered separately

CONTENT FORMATTING RULES:
✅ CORRECT EXAMPLES:
- Simple text: "Bu durumda cevap 5 olur"
- Mixed content: "Değer $x = 5$ olduğu için $\\\\frac{10}{2} = 5$ bulunur"
- Pure LaTeX: "$$\\\\frac{x^2 + 3x - 4}{2x + 1} = 0$$"

❌ PROHIBITED FORMATS:
- Plain text math: "x^2 + 3x - 4 = 0"
- HTML entities: "&lt;", "&gt;", "&amp;"
- Escaped LaTeX: "\\\\\\\\frac{a}{b}"
- Mixed symbols: "x=5 değeri sqrt(8) = 2sqrt(2)"

RESPONSE STRUCTURE FOR INTERACTIVE FEATURES:
1. Step explanations (adimAciklamasi): Turkish text with inline math $LaTeX$
2. Solution LaTeX (cozum_lateks): Pure LaTeX block $$LaTeX$$
3. Hints (ipucu): Turkish text with inline math $LaTeX$
4. Wrong options (yanlisSecenekler): Pure LaTeX blocks $$LaTeX$$
5. Feedback (yanlisGeriBildirimi): Turkish text with inline math $LaTeX$

CANVAS WRITING COMPATIBILITY:
- Ensure all mathematical expressions can be written step by step
- Use standard mathematical notation in LaTeX
- Avoid complex nested structures for user input validation

QUALITY ASSURANCE:
- All text in Turkish except mathematical LaTeX expressions
- JSON syntax must be error-free
- All LaTeX expressions must be KaTeX compatible
- Mixed content must be properly formatted for splitMixedContentSmart() function
- Simple text detection must work with isSimpleText() function

RESPONSE LANGUAGE: ALL TEXT MUST BE IN TURKISH except LaTeX mathematical expressions.

Problem: {PROBLEM_CONTEXT}

RESPOND ONLY IN JSON FORMAT, NO OTHER TEXT.`;

// --- Global DOM Önbelleği ---
const elements = {};

// --- UYGULAMA BAŞLANGIÇ NOKTASI ---
window.addEventListener('load', () => {
    AuthManager.initProtectedPage(initializeApp);
});

function initializeApp(userData) {
    if (userData) {
        cacheDOMElements();
        setupEventListeners();
        stateManager.subscribe(renderApp);
        stateManager.setUser(userData);
        
        // Akıllı Rehber sistemini başlat
        smartGuide.setCanvasManager(canvasManager);
    } else {
        document.body.innerHTML = '<p>Uygulama başlatılamadı.</p>';
    }
}

// --- KURULUM FONKSİYONLARI ---
function cacheDOMElements() {
    const ids = [
        'header-subtitle', 'query-count', 'question-setup-area', 'photo-mode-btn',
        'handwriting-mode-btn', 'photo-mode-container', 'handwriting-mode-container',
        'imageUploader', 'cameraUploader', 'imagePreview', 'startFromPhotoBtn',
        'upload-selection', 'preview-container', 'selectFileBtn', 'takePhotoBtn',
        'changePhotoBtn', 'handwriting-canvas-container', 'keyboard-input-container',
        'handwritingCanvas', 'recognizeHandwritingBtn', 'hw-pen-btn', 'hw-eraser-btn',
        'hw-undo-btn', 'hw-clear-btn', 'keyboard-input', 'startFromTextBtn',
        'switchToCanvasBtn', 'switchToKeyboardBtn', 'question', 'top-action-buttons',
        'start-solving-workspace-btn', 'solve-all-btn', 'new-question-btn',
        'goBackBtn', 'logout-btn', 'solving-workspace', 'result-container', 'status-message',
        'solution-output', 'question-summary-container', 'show-full-solution-btn',
        'step-by-step-container'
        // Akıllı Rehber elementleri dinamik olarak oluşturulduğu için burada cache'lenmiyor
    ];
    ids.forEach(id => { elements[id] = document.getElementById(id); });
    
    // Ana soru sorma canvas'ını başlat
    canvasManager.initCanvas('handwritingCanvas');
}

function setupEventListeners() {
    window.addEventListener('show-error-message', (event) => {
        stateManager.setError(event.detail.message);
    });
    
    // ErrorHandler'dan gelen hata mesajlarını dinle
    window.addEventListener('show-error-message', (event) => {
        const { message, isCritical } = event.detail;
        if (isCritical) {
            showError(message, true, () => stateManager.clearError());
        } else {
            stateManager.setError(message);
        }
    });

    const add = (id, event, handler) => { 
        if (elements[id]) {
            elements[id].addEventListener(event, handler);
        } else {
            console.warn(`Element bulunamadı: ${id}`);
        }
    };

    add('logout-btn', 'click', AuthManager.logout);
    add('new-question-btn', 'click', () => {
        stateManager.reset();
        smartGuide.reset();
        setTimeout(() => stateManager.setView('setup'), 100);
    });
    add('photo-mode-btn', 'click', () => stateManager.setInputMode('photo'));
    add('handwriting-mode-btn', 'click', () => stateManager.setInputMode('handwriting'));
    add('switchToCanvasBtn', 'click', () => stateManager.setHandwritingInputType('canvas'));
    add('switchToKeyboardBtn', 'click', () => stateManager.setHandwritingInputType('keyboard'));
    add('startFromPhotoBtn', 'click', () => handleNewProblem('image'));
    add('recognizeHandwritingBtn', 'click', () => handleNewProblem('canvas'));
    add('startFromTextBtn', 'click', () => handleNewProblem('text'));
    
    // Ana çözüm seçenekleri - BU KRİTİK SATIRDI
    add('start-solving-workspace-btn', 'click', () => {
        if (stateManager.getStateValue('problem').solution) {
            initializeSmartGuide();
        } else {
            showError("Henüz bir çözüm bulunamadı. Lütfen önce bir soru yükleyin.", false);
        }
    });
    
    add('show-full-solution-btn', 'click', () => {
        if (stateManager.getStateValue('problem').solution) {
            stateManager.setView('fullSolution');
        } else {
            showError("Henüz bir çözüm bulunamadı. Lütfen önce bir soru yükleyin.", false);
        }
    });
    
    add('solve-all-btn', 'click', async () => { 
    if (stateManager.getStateValue('problem').solution) { 
        // Önce akıllı rehberi başlat, sonra interaktif moda geç. 
        // Bu, 'interactive' view render edildiğinde smartGuide'ın hazır olmasını sağlar. 
        await initializeSmartGuide(); 
        stateManager.setView('interactive'); 
    } else { 
        showError("Henüz bir çözüm bulunamadı. Lütfen önce bir soru yükleyin.", false); 
    } 
});
    
    add('goBackBtn', 'click', () => stateManager.setView('summary'));
    
    // ANA SORU SORMA CANVAS ARAÇLARI (handwritingCanvas)
    add('hw-pen-btn', 'click', () => setQuestionCanvasTool('pen', ['hw-pen-btn', 'hw-eraser-btn']));
    add('hw-eraser-btn', 'click', () => setQuestionCanvasTool('eraser', ['hw-pen-btn', 'hw-eraser-btn']));
    add('hw-clear-btn', 'click', () => canvasManager.clear('handwritingCanvas'));
    add('hw-undo-btn', 'click', () => canvasManager.undo('handwritingCanvas'));

    
    // Akıllı Rehber elementleri dinamik olarak oluşturulduğu için
    // event listener'ları renderSmartGuideStep() fonksiyonunda ekleniyor
    
    // Fotoğraf yükleme
    add('selectFileBtn', 'click', () => elements['imageUploader'].click());
    add('takePhotoBtn', 'click', () => elements['cameraUploader'].click());
    add('imageUploader', 'change', (e) => handleFileSelect(e.target.files[0]));
    add('cameraUploader', 'change', (e) => handleFileSelect(e.target.files[0]));
    add('changePhotoBtn', 'click', () => {
        elements['preview-container'].classList.add('hidden');
        elements['upload-selection'].classList.remove('hidden');
        elements['startFromPhotoBtn'].disabled = true;
    });
    
    // Interactive solution için event delegation
    add('solution-output', 'click', handleInteractiveSolutionClick);
    
    // Ana menüye dönme butonları için event delegation
    document.addEventListener('click', (event) => {
        if (event.target && event.target.id === 'back-to-main-menu-btn') {
            stateManager.setView('summary');
        }
    });
}

// --- AKILLI REHBER FONKSİYONLARI ---
async function initializeSmartGuide() {
    try {
        const solutionData = stateManager.getStateValue('problem').solution;
        
        if (!solutionData) {
            throw new Error('Çözüm verisi bulunamadı');
        }

        // İnteraktif çözüm başlatma mesajı
        showLoading("İnteraktif çözüm başlatılıyor...");
        
        // Akıllı rehber sistemini başlat
        await smartGuide.initializeGuidance(solutionData);
        
        // Solving view'a geç
        stateManager.setView('solving');
        
        showSuccess("İnteraktif çözüm hazır! Adım adım çözüme başlayabilirsiniz.");
        
    } catch (error) {
        errorHandler.handleError(error, { 
            operation: 'initializeSmartGuide',
            fallbackMessage: 'İnteraktif çözüm başlatılamadı'
        });
        showError("İnteraktif çözüm başlatılırken bir hata oluştu. Lütfen tekrar deneyin.", false);
    } finally {
        // Yükleme mesajını temizle
        showLoading(false);
    }
}

async function handleGuideSubmission() {
    const textInput = document.getElementById('guide-text-input');
    const submitBtn = document.getElementById('guide-submit-btn');
    const canvasContainer = document.getElementById('guide-canvas-container');
    
    if (!submitBtn) {
        showError("Gerekli form elemanları bulunamadı.", false);
        return;
    }
    
    let studentInput = '';
    let inputType = 'text';
    
    // Hangi mod aktif olduğunu kontrol et
    if (canvasContainer && !canvasContainer.classList.contains('hidden')) {
        // El yazısı modu aktif
        inputType = 'canvas';
        try {
            // Canvas'tan base64 veri al
            const canvasData = canvasManager.toDataURL('guide-handwriting-canvas');
            studentInput = canvasData;
            
            // Canvas'ın boş olup olmadığını kontrol et
            if (!studentInput || studentInput === 'data:,' || isCanvasEmpty('guide-handwriting-canvas')) {
                showError("Lütfen el yazısı ile bir cevap yazın.", false);
                return;
            }
        } catch (error) {
            showError("El yazısı verisi alınırken hata oluştu.", false);
            return;
        }
    } else {
        // Klavye modu aktif
        if (!textInput) {
            showError("Gerekli form elemanları bulunamadı.", false);
            return;
        }
        
        studentInput = textInput.value.trim();
        
        if (!studentInput) {
            showError("Lütfen bir cevap yazın.", false);
            return;
        }
    }
    
    try {
        // Buton durumunu değiştir
        submitBtn.disabled = true;
        submitBtn.textContent = 'Değerlendiriliyor...';
        
        // Öğrenci girişini değerlendir
        const evaluation = await smartGuide.evaluateStudentStep(studentInput, inputType);
        
        // Geri bildirimi göster
        displayGuideFeedback(evaluation);
        
        // Eğer doğru cevap ise bir sonraki adıma geç
        if (evaluation.isCorrect && evaluation.shouldProceed) {
            const hasNextStep = smartGuide.proceedToNextStep();
            
            if (hasNextStep) {
                // Yeni adım bilgilerini render et
                setTimeout(() => {
                    renderSmartGuideStep();
                    textInput.value = '';
                }, 2000);
            } else {
                // Tüm adımlar tamamlandı
                setTimeout(() => {
                    displayGuideCompletion();
                }, 2000);
            }
        }
        
    } catch (error) {
        errorHandler.handleError(error, { 
            operation: 'handleGuideSubmission',
            fallbackMessage: 'Cevap değerlendirilemedi'
        });
        showError("Cevabınız değerlendirilirken bir hata oluştu. Lütfen tekrar deneyin.", false);
    } finally {
        // Buton durumunu geri al
        submitBtn.disabled = false;
        submitBtn.textContent = 'Cevabı Gönder';
    }
}

function displayGuideFeedback(evaluation) {
    const feedbackContainer = document.getElementById('guide-feedback-container');
    
    if (!feedbackContainer) return;
    
    const isCorrect = evaluation.isCorrect;
    const message = evaluation.message || 'Değerlendirme tamamlandı';
    
    feedbackContainer.innerHTML = `
        <div class="feedback-message ${isCorrect ? 'success' : 'error'} p-4 rounded-lg mb-4">
            <div class="flex items-center">
                <div class="feedback-icon mr-3">
                    ${isCorrect ? '✅' : '❌'}
                </div>
                <div class="feedback-content">
                    <p class="font-semibold">${message}</p>
                    ${evaluation.hint ? `<p class="text-sm mt-1 opacity-80">${evaluation.hint}</p>` : ''}
                </div>
            </div>
            ${evaluation.accuracy !== undefined ? `
                <div class="mt-2 text-sm opacity-70">
                    Doğruluk: ${Math.round(evaluation.accuracy * 100)}%
                </div>
            ` : ''}
        </div>
    `;
    
    // Otomatik temizleme
    setTimeout(() => {
        if (feedbackContainer.innerHTML.includes('feedback-message')) {
            feedbackContainer.innerHTML = '';
        }
    }, 5000);
}

function handleGuideHintRequest() {
    const stepInfo = smartGuide.getCurrentStepInfo();
    
    if (!stepInfo) {
        showError("Mevcut adım bilgisi bulunamadı.", false);
        return;
    }
    
    // Hint container'ı göster
    const hintContainer = document.getElementById('guide-hint-container');
    if (hintContainer) {
        // Basit hint sistemi - gerçek hint'i smartGuide'dan al
        const hint = "Bu adımda dikkatli olun ve önceki adımların sonuçlarını kullanın.";
        
        hintContainer.innerHTML = `
            <div class="hint-message p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div class="flex items-start">
                    <div class="hint-icon mr-2">💡</div>
                    <div class="hint-content">
                        <p class="text-sm text-blue-800">${hint}</p>
                    </div>
                </div>
            </div>
        `;
        
        // Hint'i bir süre sonra gizle
        setTimeout(() => {
            hintContainer.innerHTML = '';
        }, 10000);
    }
}

function handleGuideNextStep() {
    const hasNextStep = smartGuide.proceedToNextStep();
    
    if (hasNextStep) {
        renderSmartGuideStep();
        // Input'u temizle
        const textInput = document.getElementById('guide-text-input');
        if (textInput) {
            textInput.value = '';
        }
    } else {
        displayGuideCompletion();
    }
}

function handleGuidePreviousStep() {
    // Önceki adıma dönme özelliği
    const currentStep = smartGuide.getCurrentStepInfo();
    if (currentStep && currentStep.stepNumber > 1) {
        // Bu özellik smartGuide'a eklenebilir
        showError("Önceki adıma dönme özelliği yakında eklenecektir.", false);
    } else {
        showError("Bu ilk adım, önceki adım bulunmuyor.", false);
    }
}

function displayGuideCompletion() {
    const container = document.getElementById('smart-guide-container') || elements['step-by-step-container'];
    
    if (!container) return;
    
    const progress = smartGuide.getProgress();
    
    container.innerHTML = `
        <div class="completion-message text-center p-8 bg-green-50 rounded-lg">
            <div class="completion-icon text-6xl mb-4">🎉</div>
            <h3 class="text-2xl font-bold text-green-800 mb-2">Tebrikler!</h3>
            <p class="text-green-700 mb-4">Matematik problemini başarıyla çözdünüz!</p>
            <div class="stats-grid grid grid-cols-2 gap-4 mb-6">
                <div class="stat-item p-3 bg-white rounded-lg">
                    <div class="stat-number text-xl font-bold text-green-600">${progress.totalSteps}</div>
                    <div class="stat-label text-sm text-gray-600">Toplam Adım</div>
                </div>
                <div class="stat-item p-3 bg-white rounded-lg">
                    <div class="stat-number text-xl font-bold text-green-600">${progress.attempts}</div>
                    <div class="stat-label text-sm text-gray-600">Deneme Sayısı</div>
                </div>
            </div>
            <div class="action-buttons space-y-3">
                <button id="guide-new-problem-btn" class="btn btn-primary w-full">
                    Yeni Problem Çöz
                </button>
                <button id="guide-review-solution-btn" class="btn btn-secondary w-full">
                    Çözümü Gözden Geçir
                </button>
                <button id="back-to-main-menu-btn" class="btn btn-tertiary w-full">
                    Ana Menüye Dön
                </button>
            </div>
        </div>
    `;
    
    // Butonlara event listener ekle
    const newProblemBtn = container.querySelector('#guide-new-problem-btn');
    const reviewSolutionBtn = container.querySelector('#guide-review-solution-btn');
    
    if (newProblemBtn) {
        newProblemBtn.addEventListener('click', () => {
            stateManager.reset();
            smartGuide.reset();
            stateManager.setView('setup');
        });
    }
    
    if (reviewSolutionBtn) {
        reviewSolutionBtn.addEventListener('click', () => {
            stateManager.setView('fullSolution');
        });
    }
    
    const backToMainMenuBtn = container.querySelector('#back-to-main-menu-btn');
    if (backToMainMenuBtn) {
        backToMainMenuBtn.addEventListener('click', () => {
            stateManager.setView('summary');
        });
    }
}

// --- STATE'E BAĞLI UI GÜNCELLEME FONKSİYONLARI ---
function renderApp(state) {
    const { user, ui, problem } = state;
    
    console.log('renderApp çalıştı, mevcut view:', ui.view);

    // 1. Kullanıcı Bilgilerini Güncelle
    if (user) {
        elements['header-subtitle'].textContent = `Hoş geldin, ${user.displayName}!`;
        const limit = user.membershipType === 'premium' ? 200 : 5;
        elements['query-count'].textContent = limit - (user.dailyQueryCount || 0);
    }
    
    // 2. Loading ve Error Durumları
    showLoading(ui.isLoading ? ui.loadingMessage : false);
    elements['question-setup-area'].classList.toggle('disabled-area', ui.isLoading);
    
    if (ui.error) {
        showError(ui.error, true, () => stateManager.clearError());
    }

    // 3. Ana Görünüm (View) Yönetimi
    const { view, inputMode, handwritingInputType } = ui;
    const isVisible = (v) => v === view;

    // Görünüm kontrollerini iyileştir
    // Soru alanını her zaman göster, sadece inaktif hale getir
    elements['question-setup-area'].classList.remove('hidden');
    elements['question-setup-area'].classList.toggle('disabled-area', !isVisible('setup'));
    
    // Soru durumu göstergesini güncelle
    const questionStatus = document.getElementById('question-status');
    if (questionStatus) {
        if (isVisible('setup')) {
            questionStatus.textContent = 'Aktif';
            questionStatus.className = 'text-sm text-green-600 font-medium';
        } else {
            questionStatus.textContent = 'Tamamlandı';
            questionStatus.className = 'text-sm text-gray-500';
        }
    }
    
    elements['question-summary-container'].classList.toggle('hidden', view === 'setup' || !problem.solution);
    elements['top-action-buttons'].classList.toggle('hidden', !isVisible('summary'));
    elements['solving-workspace'].classList.toggle('hidden', !isVisible('solving'));
    
    // Result container'ı tüm çözüm view'larında göster
    elements['result-container'].classList.toggle('hidden', !['fullSolution', 'interactive'].includes(view));
    
    // Solution output'u çözüm view'larında göster
    if (elements['solution-output']) {
        elements['solution-output'].classList.toggle('hidden', !['fullSolution', 'interactive'].includes(view));
    }
    
    // Geri butonunu çözüm view'larında göster
    if (elements['goBackBtn']) {
        elements['goBackBtn'].classList.toggle('hidden', !['fullSolution', 'interactive', 'solving'].includes(view));
    }
    
    // "Çözüme Başla" butonlarını her zaman göster, sadece inaktif hale getir
    const startButtons = ['startFromPhotoBtn', 'recognizeHandwritingBtn', 'startFromTextBtn'];
    startButtons.forEach(btnId => {
        if (elements[btnId]) {
            elements[btnId].classList.remove('hidden');
            elements[btnId].disabled = !isVisible('setup');
            if (!isVisible('setup')) {
                elements[btnId].classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                elements[btnId].classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }
    });
    
    // 4. Görünüme Özel İçerik Render'ları
    if (isVisible('setup')) {
        const isPhoto = inputMode === 'photo';
        elements['photo-mode-container'].classList.toggle('hidden', !isPhoto);
        elements['handwriting-mode-container'].classList.toggle('hidden', isPhoto);
        elements['photo-mode-btn'].classList.toggle('mode-btn-active', isPhoto);
        elements['handwriting-mode-btn'].classList.toggle('mode-btn-active', !isPhoto);

        if (!isPhoto) {
            const showCanvas = handwritingInputType === 'canvas';
            elements['handwriting-canvas-container'].classList.toggle('hidden', !showCanvas);
            elements['keyboard-input-container'].classList.toggle('hidden', showCanvas);
            if (showCanvas) {
                setTimeout(() => {
                    canvasManager.resizeCanvas('handwritingCanvas');
                    // Canvas'ı temizle ve beyaz arka plan ekle
                    const data = canvasManager.canvasPool.get('handwritingCanvas');
                    if (data) {
                        data.ctx.clearRect(0, 0, data.canvas.width, data.canvas.height);
                        data.ctx.fillStyle = '#FFFFFF';
                        data.ctx.fillRect(0, 0, data.canvas.width, data.canvas.height);
                        canvasManager.applyDrawingSettings('handwritingCanvas');
                    }
                }, 100);
            }
        }
    } else if (isVisible('fullSolution')) {
        console.log('Rendering full solution view');
        renderFullSolution(problem.solution);
    } else if (isVisible('interactive')) {
        console.log('Rendering interactive view, step:', ui.interactiveStep);
        renderInteractiveSolution(problem.solution, ui.interactiveStep || 0);
    } else if (isVisible('solving')) {
        console.log('Rendering solving view');
        renderSmartGuideWorkspace();
    }
    
    // Debug: Hangi view'ın aktif olduğunu logla
    console.log('Current view:', view, 'Solution exists:', !!problem.solution);

    // 5. Problem Özetini Render Et
    if (problem.solution) {
        displayQuestionSummary(problem.solution.problemOzeti);
    } else if (view === 'setup') {
        elements['question'].innerHTML = '';
    }
}

function renderSmartGuideWorkspace() {
    const container = elements['step-by-step-container'];
    if (!container) return;
    
    // Akıllı rehber mevcut mu kontrol et
    const stepInfo = smartGuide.getCurrentStepInfo();
    
    if (!stepInfo) {
        container.innerHTML = `
            <div class="p-6 bg-white rounded-lg shadow-md">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-800">Akıllı Rehber Sistemi</h3>
                    <button id="back-to-main-menu-btn" class="btn btn-secondary">Ana Menüye Dön</button>
                </div>
                <p class="text-gray-600 mb-4">Rehber sistemi başlatılıyor...</p>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <p class="text-center text-gray-500">Lütfen bekleyin...</p>
                </div>
            </div>
        `;
        
        // Ana menüye dönme butonu için event listener
        const backToMainMenuBtn = container.querySelector('#back-to-main-menu-btn');
        if (backToMainMenuBtn) {
            backToMainMenuBtn.addEventListener('click', () => {
                stateManager.setView('summary');
            });
        }
        return;
    }
    
    renderSmartGuideStep();
}

function renderSmartGuideStep() {
    const container = elements['step-by-step-container'];
    const stepInfo = smartGuide.getCurrentStepInfo();
    const progress = smartGuide.getProgress();
    
    if (!container || !stepInfo) return;
    
    container.innerHTML = `
        <div class="smart-guide-workspace p-6 bg-white rounded-lg shadow-md">
            <!-- Başlık ve Ana Menü Butonu -->
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold text-gray-800">Akıllı Rehber</h3>
                <button id="back-to-main-menu-btn" class="btn btn-secondary">Ana Menüye Dön</button>
            </div>
            
            <!-- İlerleme Göstergesi -->
            <div class="progress-section mb-6">
                <div class="flex justify-between items-center mb-2">
                    <h3 class="text-lg font-semibold text-gray-800">Adım ${stepInfo.stepNumber} / ${stepInfo.totalSteps}</h3>
                    <span class="text-sm text-gray-500">${Math.round(stepInfo.progress)}% tamamlandı</span>
                </div>
                <div class="progress-bar bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div class="progress-fill bg-blue-500 h-full transition-all duration-500" 
                         style="width: ${stepInfo.progress}%"></div>
                </div>
            </div>
            
            <!-- Adım Açıklaması -->
            <div class="step-description mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 class="font-semibold text-blue-800 mb-2">Bu Adımda Yapılacak:</h4>
                <div class="text-blue-700 smart-content" data-content="${escapeHtml(stepInfo.description)}"></div>
            </div>
                ${stepInfo.difficulty > 3 ? `
                    <div class="mt-2 text-sm text-orange-600">
                        ⚠️ Bu adım biraz zor olabilir, dikkatli olun!
                    </div>
                ` : ''}
            </div>
            
            <!-- Girdi Alanı -->
            <div class="input-section mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    Çözümünüzü yazın:
                </label>
                
                <!-- Giriş Modu Seçimi -->
                <div class="input-mode-selector mb-3">
                    <div class="flex space-x-2">
                        <button id="guide-text-mode-btn" class="px-3 py-1 text-sm rounded-md bg-blue-100 text-blue-700 font-medium">
                            Klavye
                        </button>
                        <button id="guide-handwriting-mode-btn" class="px-3 py-1 text-sm rounded-md bg-gray-100 text-gray-600">
                            El Yazısı
                        </button>
                    </div>
                </div>
                
                <!-- Klavye Girişi -->
                <div id="guide-text-input-container">
                    <textarea 
                        id="guide-text-input" 
                        class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows="3"
                        placeholder="Matematik çözümünüzü buraya yazın..."
                    ></textarea>
                </div>
                
                <!-- El Yazısı Canvas -->
                <div id="guide-canvas-container" class="hidden">
                    <div class="canvas-container w-full h-48 rounded-lg overflow-hidden bg-white shadow-inner border">
                        <canvas id="guide-handwriting-canvas"></canvas>
                    </div>
                    <div class="flex justify-center items-center gap-2 p-2 mt-2 bg-gray-100 rounded-lg border">
                        <button id="guide-pen-btn" class="tool-btn p-2 rounded-md canvas-tool-active" title="Kalem">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                            </svg>
                        </button>
                        <button id="guide-eraser-btn" class="tool-btn p-2 rounded-md" title="Silgi">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21H7Z"/>
                                <path d="M5 12.5 12 19.5"/>
                            </svg>
                        </button>
                        <button id="guide-clear-btn" class="tool-btn p-2 rounded-md" title="Hepsini Sil">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 6h18"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Butonlar -->
            <div class="action-buttons flex flex-wrap gap-3 mb-4">
                <button id="guide-submit-btn" class="btn btn-primary flex-1">
                    Cevabı Gönder
                </button>
                <button id="guide-hint-btn" class="btn btn-secondary">
                    💡 İpucu
                </button>
            </div>
            
            <!-- Geri Bildirim Alanı -->
            <div id="guide-feedback-container" class="feedback-section"></div>
            
            <!-- İpucu Alanı -->
            <div id="guide-hint-container" class="hint-section"></div>
            
            <!-- Navigasyon -->
            <div class="navigation-section flex justify-between mt-6 pt-4 border-t">
                <button id="guide-previous-step-btn" class="btn btn-secondary" 
                        ${stepInfo.stepNumber <= 1 ? 'disabled' : ''}>
                    ← Önceki Adım
                </button>
                <button id="guide-next-step-btn" class="btn btn-tertiary">
                    Sonraki Adım →
                </button>
            </div>
        </div>
    `;
    
    // YENİ VE KRİTİK ADIM: Render motorunu tetikle
    setTimeout(() => {
        const smartElements = container.querySelectorAll('.smart-content');
        smartElements.forEach(element => {
            const content = element.getAttribute('data-content');
            if (content) {
                // mathRenderer.render fonksiyonunu her bir element için çağır
                mathRenderer.render(content, element, false);
            }
        });
    }, 50); // 50ms gecikme, HTML'in DOM'a yerleşmesini garantiler
    
    // Event listener'ları yeniden bağla
    setupGuideEventListeners();
}

function setupGuideEventListeners() {
    const submitBtn = document.getElementById('guide-submit-btn');
    const hintBtn = document.getElementById('guide-hint-btn');
    const nextBtn = document.getElementById('guide-next-step-btn');
    const prevBtn = document.getElementById('guide-previous-step-btn');
    const textInput = document.getElementById('guide-text-input');
    
    // Giriş modu butonları
    const textModeBtn = document.getElementById('guide-text-mode-btn');
    const handwritingModeBtn = document.getElementById('guide-handwriting-mode-btn');
    
    // Canvas araçları
    const penBtn = document.getElementById('guide-pen-btn');
    const eraserBtn = document.getElementById('guide-eraser-btn');
    const clearBtn = document.getElementById('guide-clear-btn');
    
    if (submitBtn) {
        submitBtn.addEventListener('click', handleGuideSubmission);
    }
    
    if (hintBtn) {
        hintBtn.addEventListener('click', handleGuideHintRequest);
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', handleGuideNextStep);
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', handleGuidePreviousStep);
    }
    
    if (textInput) {
        textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGuideSubmission();
            }
        });
    }
    
    // Giriş modu değiştirme
    if (textModeBtn) {
        textModeBtn.addEventListener('click', () => switchGuideInputMode('text'));
    }
    
    if (handwritingModeBtn) {
        handwritingModeBtn.addEventListener('click', () => switchGuideInputMode('handwriting'));
    }
    
    // İNTERAKTİF ÇÖZÜM CANVAS ARAÇLARI (guide-handwriting-canvas)
    if (penBtn) {
        penBtn.addEventListener('click', () => setGuideCanvasTool('pen'));
    }
    
    if (eraserBtn) {
        eraserBtn.addEventListener('click', () => setGuideCanvasTool('eraser'));
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            canvasManager.clear('guide-handwriting-canvas');
        });
    }
    
    // İnteraktif çözüm canvas'ını başlat
    setTimeout(() => {
        try {
            const canvasData = canvasManager.initCanvas('guide-handwriting-canvas');
            if (canvasData) {
                // Smart guide'a canvas ID'sini bildir
                smartGuide.setActiveCanvasId('guide-handwriting-canvas');
                console.log('İnteraktif çözüm canvas\'ı başarıyla başlatıldı');
            } else {
                console.error('İnteraktif çözüm canvas\'ı başlatılamadı');
            }
        } catch (error) {
            console.error('Canvas başlatma hatası:', error);
        }
    }, 100);
    
    // Ana menüye dönme butonu
    const backToMainMenuBtn = document.getElementById('back-to-main-menu-btn');
    if (backToMainMenuBtn) {
        backToMainMenuBtn.addEventListener('click', () => {
            stateManager.setView('summary');
        });
    }
}

// --- YARDIMCI FONKSİYONLAR ---
// İnteraktif çözüm için giriş modu değiştirme
function switchGuideInputMode(mode) {
    const textContainer = document.getElementById('guide-text-input-container');
    const canvasContainer = document.getElementById('guide-canvas-container');
    const textModeBtn = document.getElementById('guide-text-mode-btn');
    const handwritingModeBtn = document.getElementById('guide-handwriting-mode-btn');
    
    if (mode === 'text') {
        textContainer.classList.remove('hidden');
        canvasContainer.classList.add('hidden');
        textModeBtn.classList.add('bg-blue-100', 'text-blue-700');
        textModeBtn.classList.remove('bg-gray-100', 'text-gray-600');
        handwritingModeBtn.classList.add('bg-gray-100', 'text-gray-600');
        handwritingModeBtn.classList.remove('bg-blue-100', 'text-blue-700');
    } else {
        textContainer.classList.add('hidden');
        canvasContainer.classList.remove('hidden');
        handwritingModeBtn.classList.add('bg-blue-100', 'text-blue-700');
        handwritingModeBtn.classList.remove('bg-gray-100', 'text-gray-600');
        textModeBtn.classList.add('bg-gray-100', 'text-gray-600');
        textModeBtn.classList.remove('bg-blue-100', 'text-blue-700');
        
        // İnteraktif çözüm canvas'ını yeniden boyutlandır
        setTimeout(() => {
            canvasManager.resizeCanvas('guide-handwriting-canvas');
        }, 50);
    }
}

function setGuideCanvasTool(tool) {
    if (!canvasManager) {
        console.error('Canvas manager bulunamadı');
        return;
    }
    
    try {
        canvasManager.setTool('guide-handwriting-canvas', tool);
        console.log(`Guide canvas tool set to: ${tool}`);
    } catch (error) {
        console.error('Canvas tool set error:', error);
    }
}

// Canvas'ın boş olup olmadığını kontrol et
function isCanvasEmpty(canvasId) {
    const data = canvasManager.canvasPool.get(canvasId);
    if (!data) return true;
    
    const { canvas, ctx } = data;
    
    try {
        // Canvas'ın image data'sını al
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Beyaz arka plan hariç herhangi bir piksel var mı kontrol et
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            // Beyaz olmayan veya şeffaf olmayan piksel varsa canvas boş değil
            if (r !== 255 || g !== 255 || b !== 255 || a !== 255) {
                return false;
            }
        }
        
        return true; // Tüm pikseller beyaz, canvas boş
    } catch (error) {
        console.error('Canvas boşluk kontrolü hatası:', error);
        return true; // Hata durumunda boş kabul et
    }
}

// --- ANA MANTIK VE VERİ AKIŞI ---
async function handleNewProblem(sourceType) {
    let sourceData;
    let problemContextForPrompt = "Görseldeki matematik problemini çöz.";

    try {
        if (sourceType === 'image') {
            const file = document.getElementById('imageUploader').files[0];
            if (!file) return showError("Lütfen bir resim dosyası seçin.", false);
            sourceData = await toBase64(file);
        } else if (sourceType === 'canvas') {
            sourceData = canvasManager.toDataURL('handwritingCanvas').split(',')[1];
        } else if (sourceType === 'text') {
            sourceData = elements['keyboard-input'].value.trim();
            if (!sourceData) return showError("Lütfen bir soru yazın.", false);
            problemContextForPrompt = sourceData;
        }

        if (!await handleQueryDecrement()) return;

        // Animasyonlu yükleme mesajları
        const analysisSteps = [
            { title: "Soru içerik kontrolü yapılıyor", description: "Yapay zeka soruyu analiz ediyor..." },
            { title: "Matematiksel ifadeler tespit ediliyor", description: "Formüller ve denklemler çözümleniyor..." },
            { title: "Problem özeti oluşturuluyor", description: "Verilenler ve istenenler belirleniyor..." },
            { title: "Çözüm adımları hazırlanıyor", description: "Adım adım çözüm planı oluşturuluyor..." }
        ];
        
        showAnimatedLoading(analysisSteps, 2000);

        const promptText = masterSolutionPrompt.replace('{PROBLEM_CONTEXT}', problemContextForPrompt);
        const payloadParts = [{ text: promptText }];
        if (sourceType !== 'text') {
            payloadParts.push({ inlineData: { mimeType: 'image/png', data: sourceData } });
        }
        
        const solution = await makeApiCall({ contents: [{ role: "user", parts: payloadParts }] });
                
        if (solution) {
            stateManager.setSolution(solution);
            stateManager.setView('summary');
            showSuccess("Problem başarıyla çözüldü!", false); // autoHide = false
            
            // Kullanıcının sorgu sayısını artır
            await FirestoreManager.incrementQueryCount();
        } else {
            showError("Problem çözülürken bir hata oluştu. Lütfen tekrar deneyin.", false);
        }
    } catch (error) {
        errorHandler.handleError(error, { 
            operation: 'handleNewProblem',
            context: { sourceType }
        });
        showError("Problem analizi sırasında bir hata oluştu. Lütfen tekrar deneyin.", false);
    } finally {
        // Yükleme mesajlarını temizle
        showLoading(false);
    }
}

// --- API ÇAĞRISI ---
export async function makeApiCall(payload) {
    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const content = data.candidates[0].content.parts[0].text;
            
            try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            } catch (parseError) {
                console.warn('JSON parse hatası:', parseError);
            }
        }
        
        throw new Error('Geçersiz API yanıtı');
    } catch (error) {
        console.error('API çağrısı hatası:', error);
        throw error;
    }
}

// --- YARDIMCI FONKSİYONLAR ---
async function handleQueryDecrement() {
    const userData = stateManager.getStateValue('user');
    const limit = userData.membershipType === 'premium' ? 200 : 5;
    
    if (userData.dailyQueryCount >= limit) {
        showError(`Günlük sorgu limitiniz (${limit}) doldu. Yarın tekrar deneyin.`, false);
        return false;
    }
    return true;
}

async function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
    });
}

async function handleFileSelect(file) {
    if (!file) return;
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        showError("Dosya boyutu 5MB'dan büyük olamaz.", false);
        return;
    }
    
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        showError("Sadece JPEG, PNG, GIF ve WebP dosyaları desteklenir.", false);
        return;
    }
    
    try {
        const base64 = await toBase64(file);
        elements['imagePreview'].src = `data:${file.type};base64,${base64}`;
        elements['preview-container'].classList.remove('hidden');
        elements['upload-selection'].classList.add('hidden');
        elements['startFromPhotoBtn'].disabled = false;
    } catch (error) {
        showError("Dosya yüklenirken bir hata oluştu.", false);
    }
}

// --- CANVAS ARAÇLARI ---
// Ana soru sorma canvas'ı için araç ayarlama
function setQuestionCanvasTool(tool, buttonIds) {
    canvasManager.setTool('handwritingCanvas', tool);
    buttonIds.forEach(id => {
        elements[id].classList.remove('canvas-tool-active');
    });
    elements[`hw-${tool}-btn`].classList.add('canvas-tool-active');
}







// --- PROBLEM ÖZETİ ---
function displayQuestionSummary(problemOzeti) {
    if (!problemOzeti) return;
    
    const { verilenler, istenen } = problemOzeti;
    
    let summaryHTML = '<div class="problem-summary bg-blue-50 p-4 rounded-lg mb-4">';
    summaryHTML += '<h3 class="font-semibold text-blue-800 mb-2">Problem Özeti:</h3>';
    
    if (verilenler && verilenler.length > 0) {
        summaryHTML += '<div class="mb-2"><strong>Verilenler:</strong><ul class="list-disc list-inside ml-4">';
        verilenler.forEach(veri => {
            // Her veri için akıllı render
            summaryHTML += `<li class="smart-content" data-content="${escapeHtml(veri)}"></li>`;
        });
        summaryHTML += '</ul></div>';
    }
    
    if (istenen) {
        summaryHTML += `<div><strong>İstenen:</strong> <span class="smart-content" data-content="${escapeHtml(istenen)}"></span></div>`;
    }
    
    summaryHTML += '</div>';
    elements['question'].innerHTML = summaryHTML;
    
    // Akıllı içerik render işlemi
    setTimeout(() => {
        const smartElements = elements['question'].querySelectorAll('.smart-content');
        smartElements.forEach(element => {
            const content = element.getAttribute('data-content');
            if (content) {
                mathRenderer.render(content, element, false);
            }
        });
    }, 50);
}

function renderFullSolution(solution) {
    console.log('renderFullSolution called with:', solution);
    if (!solution) {
        console.log('No solution provided to renderFullSolution');
        return;
    }
    
    let html = '<div class="full-solution-container">';
    html += '<div class="flex justify-between items-center mb-4">';
    html += '<h3 class="text-xl font-bold text-gray-800">Tam Çözüm</h3>';
    html += '<button id="back-to-main-menu-btn" class="btn btn-secondary">Ana Menüye Dön</button>';
    html += '</div>';
    
    console.log('Full solution data:', solution);
    
    if (solution.adimlar && solution.adimlar.length > 0) {
        // Adımlar varsa onları göster
        solution.adimlar.forEach((step, index) => {
            html += `<div class="solution-step p-4 mb-3 bg-gray-50 rounded-lg">`;
            html += `<div class="step-number font-semibold text-blue-600 mb-2">${index + 1}. Adım</div>`;
            html += `<div class="step-description mb-2 text-gray-700 smart-content" data-content="${escapeHtml(step.adimAciklamasi || 'Adım açıklaması')}"></div>`;
            if (step.cozum_lateks) {
                html += `<div class="latex-content" data-latex="${step.cozum_lateks}"></div>`;
            }
            html += '</div>';
        });
    } else if (solution.tamCozumLateks && solution.tamCozumLateks.length > 0) {
        // Eski format için
        solution.tamCozumLateks.forEach((latex, index) => {
            html += `<div class="solution-step p-4 mb-3 bg-gray-50 rounded-lg">`;
            html += `<div class="step-number font-semibold text-blue-600 mb-2">${index + 1}. Adım</div>`;
            html += `<div class="latex-content" data-latex="${latex}"></div>`;
            html += '</div>';
        });
    } else {
        html += '<div class="p-4 bg-red-50 text-red-700 rounded-lg">';
        html += '<p>Çözüm verisi bulunamadı. Lütfen tekrar deneyin.</p>';
        html += '</div>';
    }
    
    html += '</div>';
    console.log('Setting solution-output HTML:', html.substring(0, 200) + '...');
    elements['solution-output'].innerHTML = html;
    
    // Geliştirilmiş LaTeX render işlemi
    setTimeout(() => {
        // MathRenderer'ın container render özelliğini kullan
        mathRenderer.renderContainer(elements['solution-output'], true);
        
        // Akıllı içerik elementlerini render et
        const smartElements = elements['solution-output'].querySelectorAll('.smart-content');
        smartElements.forEach((element, index) => {
            const content = element.getAttribute('data-content');
            console.log(`Rendering smart content ${index + 1}:`, content);
            
            if (content && content.trim()) {
                mathRenderer.render(content, element, false);
            }
        });
        
        // Eksik kalan elementleri kontrol et
        const unrenderedElements = elements['solution-output'].querySelectorAll('.latex-content:not(.katex)');
        unrenderedElements.forEach((element, index) => {
            const content = element.getAttribute('data-latex') || element.textContent || element.innerHTML;
            console.log(`Rendering unrendered element ${index + 1}:`, content);
            
            if (content && content.trim()) {
                mathRenderer.render(content, element, true);
            }
        });
    }, 100);
    
    console.log('renderFullSolution completed');
}

function renderInteractiveSolution(solution, currentStep = 0) {
    if (!solution || !solution.adimlar || !solution.adimlar.length) {
        elements['solution-output'].innerHTML = `
            <div class="p-4 bg-red-50 text-red-700 rounded-lg">
                <p>İnteraktif çözüm için adımlar bulunamadı.</p>
                 <button id="back-to-main-menu-btn" class="btn btn-secondary mt-2">Ana Menüye Dön</button>
            </div>`;
        return;
    }

    const currentStepData = solution.adimlar[currentStep];
    if (!currentStepData) {
        elements['solution-output'].innerHTML = `
            <div class="p-4 bg-red-50 text-red-700 rounded-lg">
                <p>Adım verisi bulunamadı.</p>
                <button id="back-to-main-menu-btn" class="btn btn-secondary mt-2">Ana Menüye Dön</button>
            </div>`;
        return;
    }

    // Çoktan seçmeli seçenekleri oluştur
    const options = generateMultipleChoiceOptions(currentStepData, currentStep, solution.adimlar);
    
    // İlerleme bilgisi
    const progress = ((currentStep + 1) / solution.adimlar.length) * 100;
    
    // Arayüzü render et
    elements['solution-output'].innerHTML = `
        <div class="interactive-solution-workspace p-6 bg-white rounded-lg shadow-md">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold text-gray-800">İnteraktif Çözüm</h3>
                <button id="back-to-main-menu-btn" class="btn btn-secondary">Ana Menüye Dön</button>
            </div>
            
            <div class="progress-section mb-6">
                <div class="flex justify-between items-center mb-2">
                    <h3 class="text-lg font-semibold text-gray-800">Adım ${currentStep + 1} / ${solution.adimlar.length}</h3>
                    <span class="text-sm text-gray-500">${Math.round(progress)}% tamamlandı</span>
                </div>
                <div class="progress-bar bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div class="progress-fill bg-blue-500 h-full transition-all duration-500" 
                         style="width: ${progress}%"></div>
                </div>
            </div>
            
            <div class="step-description mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 class="font-semibold text-blue-800 mb-2">Bu Adımda Yapılacak:</h4>
                <p class="text-blue-700 smart-content" data-content="${escapeHtml(currentStepData.adimAciklamasi || `Adım ${currentStep + 1}`)}"></p>
            </div>
            
            <div class="options-section mb-6">
                <h4 class="font-semibold text-gray-800 mb-4">Doğru çözüm adımını seçin:</h4>
                <div class="options-grid space-y-3">
                    ${options.map((option, index) => `
                        <label class="option-label flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-all duration-200">
                            <input type="radio" name="step-${currentStep}" value="${index}" class="sr-only">
                            <div class="option-letter w-8 h-8 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center font-bold text-sm mr-3 mt-0.5">
                                ${String.fromCharCode(65 + index)}
                            </div>
                            <div class="option-content flex-1">
                                <p class="text-gray-800 font-medium smart-content" data-content="${escapeHtml(option.text)}"></p>
                                ${option.latex ? `<div class="text-sm text-gray-600 mt-1 smart-content" data-content="${escapeHtml(option.latex)}"></div>` : ''}
                            </div>
                        </label>
                    `).join('')}
                </div>
            </div>
            
            <div class="action-buttons flex flex-wrap gap-3 mb-4">
                <button id="check-answer-btn" class="btn btn-primary flex-1" disabled>Cevaabı Kontrol Et</button>
                <button id="hint-btn" class="btn btn-secondary">💡 İpucu</button>
            </div>
            
            <div id="answer-result" class="result-section hidden"></div>
            
            <div class="navigation-section flex justify-between mt-6 pt-4 border-t">
                <button id="previous-step-btn" class="btn btn-secondary" 
                        ${currentStep === 0 ? 'disabled' : ''}>
                    ← Önceki Adım
                </button>
                <button id="next-step-btn" class="btn btn-primary" 
                        ${currentStep === solution.adimlar.length - 1 ? 'disabled' : ''}>
                    Sonraki Adım →
                </button>
            </div>
        </div>
    `;

    // Event listener'ları bağla
    setupInteractiveSolutionListeners(currentStep, options);
    
    // Akıllı içerik render işlemi
    setTimeout(() => {
        const smartElements = elements['solution-output'].querySelectorAll('.smart-content');
        smartElements.forEach((element, index) => {
            const content = element.getAttribute('data-content');
            if (content) {
                mathRenderer.render(content, element, false);
            }
        });
    }, 50);
    
    // Navigasyon butonları
    const prevBtn = document.getElementById('previous-step-btn');
    const nextBtn = document.getElementById('next-step-btn');
    const backBtn = document.getElementById('back-to-main-menu-btn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentStep > 0) {
                stateManager.setInteractiveStep(currentStep - 1);
                renderInteractiveSolution(solution, currentStep - 1);
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentStep < solution.adimlar.length - 1) {
                stateManager.setInteractiveStep(currentStep + 1);
                renderInteractiveSolution(solution, currentStep + 1);
            }
        });
    }
    
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            stateManager.setView('summary');
        });
    }
}

// --- İNTERAKTİF ÇÖZÜM YARDIMCI FONKSİYONLARI ---
function generateMultipleChoiceOptions(step, currentStepIndex, allSteps) {
    const options = [];
    
    // Doğru cevap
    const correctAnswer = {
        text: step.adimAciklamasi,
        latex: step.cozum_lateks,
        isCorrect: true
    };
    
    // Çeldiricileri oluştur
    const distractors = generateRealisticDistractors(step, currentStepIndex, allSteps);
    
    // Tüm seçenekleri birleştir ve karıştır
    options.push(correctAnswer, ...distractors);
    return shuffleArray(options);
}

function generateRealisticDistractors(step, currentStepIndex, allSteps) {
    const distractors = [];
    const correctText = step.adimAciklamasi || '';
    const correctLatex = step.cozum_lateks || '';
    
    // Diğer adımları çeldirici olarak kullan
    const otherSteps = allSteps.filter((_, index) => index !== currentStepIndex);
    
    if (otherSteps.length >= 2) {
        // Strateji 1: Diğer adımları çeldirici olarak kullan
        const stepDistractors = otherSteps.slice(0, 2).map((otherStep, index) => ({
            text: otherStep.adimAciklamasi || `Adım ${index + 1}`,
            latex: otherStep.cozum_lateks || '',
            isCorrect: false,
            feedback: `Bu ${index + 1}. adımın işlemi, bu adımda yapılmamalı.`
        }));
        
        // Strateji 2: Benzer ama yanlış işlemler
        const similarWrongOperations = [
            {
                text: correctText.replace(/toplama|çıkarma|çarpma|bölme/g, (match) => {
                    const operations = { 'toplama': 'çıkarma', 'çıkarma': 'toplama', 'çarpma': 'bölme', 'bölme': 'çarpma' };
                    return operations[match] || match;
                }),
                latex: correctLatex,
                isCorrect: false,
                feedback: 'İşlem türü yanlış seçildi.'
            },
            {
                text: correctText.replace(/\d+/g, (match) => {
                    const num = parseInt(match);
                    return (num + 1).toString();
                }),
                latex: correctLatex,
                isCorrect: false,
                feedback: 'Sayısal değer yanlış.'
            }
        ];
        
        // En güçlü 2 çeldiriciyi seç
        const allDistractors = [...stepDistractors, ...similarWrongOperations];
        const selectedDistractors = shuffleArray(allDistractors).slice(0, 2);
        
        distractors.push(...selectedDistractors);
        
    } else {
        // Eğer yeterli adım yoksa, güçlü fallback çeldiricileri kullan
        const fallbackDistractors = [
            {
                text: correctText.replace(/toplama|çıkarma|çarpma|bölme/g, (match) => {
                    const operations = { 'toplama': 'çıkarma', 'çıkarma': 'toplama', 'çarpma': 'bölme', 'bölme': 'çarpma' };
                    return operations[match] || match;
                }),
                latex: correctLatex,
                isCorrect: false,
                feedback: 'İşlem türü yanlış seçildi.'
            },
            {
                text: 'Bu adımda farklı bir yaklaşım kullanılmalı',
                latex: '',
                isCorrect: false,
                feedback: 'Bu yaklaşım bu adım için uygun değil.'
            }
        ];
        
        distractors.push(...fallbackDistractors);
    }
    
    return distractors;
}





function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function setupInteractiveSolutionListeners(currentStep, options) {
    const checkBtn = document.getElementById('check-answer-btn');
    const resultArea = document.getElementById('answer-result');
    const hintBtn = document.getElementById('hint-btn');
    
    // Radio button listener'ları
    const radioButtons = document.querySelectorAll(`input[name="step-${currentStep}"]`);
    radioButtons.forEach(radio => {
        radio.addEventListener('change', () => {
            checkBtn.disabled = false;
            checkBtn.textContent = 'Cevaabı Kontrol Et';
            
            // Seçilen seçeneği vurgula
            const optionLabels = document.querySelectorAll('.option-label');
            optionLabels.forEach(label => {
                label.classList.remove('border-blue-500', 'bg-blue-50');
            });
            
            const selectedLabel = radio.closest('.option-label');
            if (selectedLabel) {
                selectedLabel.classList.add('border-blue-500', 'bg-blue-50');
            }
        });
    });
    
    // Kontrol butonu listener'ı
    if (checkBtn) {
        checkBtn.addEventListener('click', () => {
            const selectedOption = document.querySelector(`input[name="step-${currentStep}"]:checked`);
            
            if (!selectedOption) {
                showError("Lütfen bir seçenek seçin.", false);
                return;
            }
            
            const selectedIndex = parseInt(selectedOption.value);
            const selectedOptionData = options[selectedIndex];
            
            // Sonucu göster
            showAnswerResult(selectedOptionData, resultArea, checkBtn);
        });
    }
    
    // İpucu butonu listener'ı
    if (hintBtn) {
        hintBtn.addEventListener('click', () => {
            showHint(currentStep);
        });
    }
}

function showAnswerResult(selectedOption, resultArea, checkBtn) {
    if (!resultArea || !checkBtn) return;
    
    const isCorrect = selectedOption.isCorrect;
    
    resultArea.innerHTML = `
        <div class="result-message p-4 rounded-lg ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
            <div class="flex items-center">
                <div class="result-icon mr-3 text-2xl">
                    ${isCorrect ? '✅' : '❌'}
                </div>
                <div class="result-content">
                    <h4 class="font-semibold">${isCorrect ? 'Doğru!' : 'Yanlış!'}</h4>
                    <p class="mt-1">${isCorrect ? 'Bu adımı doğru çözdünüz!' : (selectedOption.feedback || 'Bu seçenek yanlış.')}</p>
                </div>
            </div>
        </div>
    `;
    
    resultArea.classList.remove('hidden');
    checkBtn.textContent = isCorrect ? 'Doğru Cevap!' : 'Tekrar Dene';
    checkBtn.disabled = true;
    
    // Seçenek etiketlerini güncelle
    const optionLabels = document.querySelectorAll('.option-label');
    optionLabels.forEach((label) => {
        const radioInput = label.querySelector('input[type="radio"]');
        if (radioInput && radioInput.checked) {
            if (isCorrect) {
                label.classList.add('border-green-500', 'bg-green-50');
                label.classList.remove('border-red-500', 'bg-red-50', 'border-blue-500', 'bg-blue-50');
            } else {
                label.classList.add('border-red-500', 'bg-red-50');
                label.classList.remove('border-green-500', 'bg-green-50', 'border-blue-500', 'bg-blue-50');
            }
        }
        label.style.pointerEvents = 'none';
    });
    
    // Eğer doğru cevap ise, bir sonraki adıma geçme butonunu aktif et
    if (isCorrect) {
        const nextBtn = document.getElementById('next-step-btn');
        if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
}

// İpucu gösterme fonksiyonu
function showHint(currentStep) {
    const solution = stateManager.getStateValue('problem').solution;
    if (!solution || !solution.adimlar || !solution.adimlar[currentStep]) {
        return;
    }
    
    const stepData = solution.adimlar[currentStep];
    const hints = [
        stepData.ipucu || 'Bu adımda dikkatli olun.',
        'Doğru işlemi seçmek için adım açıklamasını tekrar okuyun.',
        'Matematiksel işlemlerin sırasına dikkat edin.'
    ];
    
    const hintIndex = Math.floor(Math.random() * hints.length);
    const hint = hints[hintIndex];
    
    // İpucu mesajını göster
    const resultArea = document.getElementById('answer-result');
    if (resultArea) {
        resultArea.innerHTML = `
            <div class="result-message p-4 rounded-lg bg-yellow-100 text-yellow-800">
                <div class="flex items-center">
                    <div class="result-icon mr-3 text-2xl">💡</div>
                    <div class="result-content">
                        <h4 class="font-semibold">İpucu</h4>
                        <p class="mt-1">${hint}</p>
                    </div>
                </div>
            </div>
        `;
        resultArea.classList.remove('hidden');
    }
}

// --- INTERACTIVE SOLUTION NAVİGASYON ---
function navigateStep(stepIndex) {
    const solution = stateManager.getStateValue('problem').solution;
    if (!solution || !solution.adimlar) {
        console.log('No solution or steps found for navigation');
        return;
    }
    
    const maxStep = solution.adimlar.length - 1;
    if (stepIndex < 0 || stepIndex > maxStep) {
        console.log('Step index out of range:', stepIndex, 'max:', maxStep);
        return;
    }
    
    console.log('Navigating to step:', stepIndex);
    stateManager.setInteractiveStep(stepIndex);
}

function handleInteractiveSolutionClick(event) {
    const target = event.target;
    if (target.onclick) {
        target.onclick();
    }
}

// Global fonksiyonlar
window.navigateStep = navigateStep;
window.makeApiCall = makeApiCall;
window.showError = showError;
window.showSuccess = showSuccess;
window.showLoading = showLoading;
window.stateManager = stateManager;

// --- EXPORTS ---
export { canvasManager, errorHandler, stateManager, smartGuide };