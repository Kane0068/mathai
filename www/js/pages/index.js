// --- Gerekli Modülleri Import Et ---
import { AuthManager } from '../modules/auth.js';
import { FirestoreManager } from '../modules/firestore.js';
import {
    showLoading,
    showError,
    showSuccess,
    renderMath,
    renderMathInContainer,
    renderSmartContent,
    waitForRenderSystem,
    showAnimatedLoading,
    showInViewNotification
} from '../modules/ui.js';
import { CanvasManager } from '../modules/canvasManager.js';
import { EnhancedErrorHandler } from '../modules/errorHandler.js';
import { EnhancedStateManager } from '../modules/stateManager.js';
import { smartGuide } from '../modules/smartGuide.js';
import { mathSymbolPanel } from '../modules/mathSymbolPanel.js';
import { interactiveSolutionManager } from '../modules/interactiveSolutionManager.js';
import { enhancedMathRenderer } from '../modules/enhancedAdvancedMathRenderer.js';
import { GEMINI_API_URL, logError, getElements, retry } from '../modules/utils.js';

// Global instances
const canvasManager = new CanvasManager();
const errorHandler = new EnhancedErrorHandler();
const stateManager = new EnhancedStateManager();


// API URL is now imported from utils.js

const masterSolutionPrompt = `Solve the math problem and respond in the following JSON format.

CRITICAL: ALL RESPONSES MUST BE IN TURKISH LANGUAGE. Mathematical expressions must follow the exact LaTeX format compatible with MathJax v3 and KaTeX renderer.

INTELLIGENT STEP CREATION RULES:
- Analyze the problem complexity and create appropriate number of steps
- Simple concept questions (like "which is irrational?"): 1-2 steps maximum
- Multiple choice questions: Focus on the logical reasoning, not checking each option separately
- Calculation problems: Break into natural mathematical steps
- Complex proofs: More detailed steps are acceptable

ROADMAP CONTENT RULES FOR adimAciklamasi AND ipucu:
- ABSOLUTELY NO LaTeX expressions in adimAciklamasi and ipucu fields
- Use ONLY verbal explanations in Turkish
- Be brief and direct about what to think or do
- Focus on the thinking process, not showing calculations
- Example GOOD: "Hangi sayının rasyonel olmadığını belirlemek için kök altındaki sayıları incele"
- Example BAD: "√2 ifadesini kontrol et" (no LaTeX symbols)

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
      "adimAciklamasi": "PURE VERBAL Turkish explanation - NO MATH SYMBOLS OR LaTeX",
      "cozum_lateks": "$$pure_latex_expression$$",
      "ipucu": "PURE VERBAL Turkish helpful hint - NO MATH SYMBOLS OR LaTeX", 
      "yanlisSecenekler": [
        {
          "metin": "$$wrong_latex_expression$$",
          "yanlisGeriBildirimi": "Turkish explanation why it's wrong with math: $LaTeX_inline$"
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

STEP EXAMPLES BY PROBLEM TYPE:

For "Which number is irrational?" type questions:
- Step 1: "Rasyonel ve irrasyonel sayıları ayırt etme kurallarını hatırla"
- Step 2: "Verilen seçenekleri tek tek incele ve hangisinin kesir şeklinde yazılamayacağını belirle"

For calculation problems:
- Step 1: "Verilen değerleri formülde yerine koy"
- Step 2: "İşlem sırasını takip ederek hesapla"
- Step 3: "Sonucu kontrol et"

For geometry problems:
- Step 1: "Şeklin özelliklerini belirle"
- Step 2: "Uygun formülü seç"
- Step 3: "Hesaplamaları yap"

IMPORTANT: Keep adimAciklamasi and ipucu fields completely free of mathematical symbols, fractions, square roots, or any LaTeX. Use only descriptive Turkish words.

Problem: {PROBLEM_CONTEXT}

RESPOND ONLY IN JSON FORMAT, NO OTHER TEXT.`;

// Global DOM önbelleği
const elements = {};

// --- UYGULAMA BAŞLANGIÇ NOKTASI ---
window.addEventListener('load', async () => {
    try {
        console.log('🔄 Uygulama başlatılıyor...');
        
        // Auth manager'ı başlat
        AuthManager.initProtectedPage(initializeApp);
    } catch (error) {
        console.error('❌ App başlatma hatası:', error);
        document.body.innerHTML = '<div class="p-4 bg-red-100 text-red-800">Uygulama başlatılamadı. Lütfen sayfayı yenileyin.</div>';
    }
});
async function initializeApp(userData) {
    if (userData) {
        try {
            showLoading("Matematik render sistemi başlatılıyor...");
            
            // Explicitly initialize the math renderer with timeout
            try {
                await Promise.race([
                    enhancedMathRenderer.initializeSystem(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Renderer timeout')), 8000))
                ]);
            } catch (initError) {
                console.warn('⚠️ Math renderer initialization failed, continuing with fallback:', initError.message);
            }
            
            // Render sisteminin tamamen hazır olmasını bekle
            await waitForRenderSystem();
            
            cacheDOMElements();
            setupEventListeners();
            stateManager.subscribe(renderApp);
            stateManager.setUser(userData);

            // Akıllı Rehber sistemini başlat
            smartGuide.setCanvasManager(canvasManager);

            showLoading(false);
            console.log('✅ Uygulama başarıyla başlatıldı - Enhanced Math Renderer hazır');
            
            // Başarı mesajı göster
            setTimeout(() => {
                showSuccess("Matematik çözüm sistemi hazır! Enhanced Math Renderer v2 aktif.", true, 3000);
            }, 500);
            
        } catch (error) {
            console.error('❌ App initialization error:', error);
            showLoading(false);
            showError("Uygulama başlatılırken bir sorun oluştu. Lütfen sayfayı yenileyin.", true, () => {
                window.location.reload();
            });
        }
    } else {
        document.body.innerHTML = '<div class="flex items-center justify-center min-h-screen"><p class="text-red-600">Uygulama başlatılamadı. Lütfen yeniden giriş yapın.</p></div>';
    }
}

// --- KURULUM FONKSİYONLARI ---
function cacheDOMElements() {
    const requiredElements = [
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
    ];
    
    const missingElements = [];
    
    requiredElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            elements[id] = element;
        } else {
            missingElements.push(id);
            console.warn(`⚠️ Element bulunamadı: ${id}`);
        }
    });
    
    if (missingElements.length > 0) {
        console.error('❌ Critical elements missing:', missingElements);
        // Show user-friendly error
        showError(`Bazı UI elementleri bulunamadı: ${missingElements.slice(0, 3).join(', ')}${missingElements.length > 3 ? '...' : ''}`, true, () => {
            window.location.reload();
        });
    }

    // Canvas initialization with error handling
    try {
        if (elements['handwritingCanvas']) {
            canvasManager.initCanvas('handwritingCanvas');
            console.log('✅ Ana canvas başarıyla başlatıldı');
        } else {
            console.error('❌ Handwriting canvas element bulunamadı');
        }
    } catch (canvasError) {
        console.error('❌ Canvas initialization error:', canvasError);
        showError('Canvas sistemi başlatılamadı. Lütfen sayfayı yenileyin.', true, () => {
            window.location.reload();
        });
    }
}


function setupEventListeners() {
    window.addEventListener('show-error-message', (event) => {
        stateManager.setError(event.detail.message);
    });
    setupEnhancedBackButtonHandler();
    // ErrorHandler'dan gelen hata mesajlarını dinle
    window.addEventListener('show-error-message', (event) => {
        const { message, isCritical } = event.detail;
        if (isCritical) {
            showError(message, true, () => stateManager.clearError());
        } else {
            stateManager.setError(message);
        }
    });
    window.addEventListener('unhandledrejection', (event) => {
        console.error('❌ Unhandled promise rejection:', event.reason);
        
        // Only show user-facing error for critical failures
        if (event.reason && event.reason.message && 
            (event.reason.message.includes('render') || 
             event.reason.message.includes('interactive') ||
             event.reason.message.includes('canvas'))) {
            
            showInViewNotification(
                'Sistem hatası tespit edildi. Lütfen sayfayı yenileyin.', 
                'error', 
                false
            );
        }
    });

    window.addEventListener('error', (event) => {
        console.error('❌ Global error:', event.error);
        
        // Critical error detection
        if (event.error && (
            event.error.message.includes('stateManager') ||
            event.error.message.includes('enhancedMathRenderer') ||
            event.error.message.includes('interactiveSolutionManager')
        )) {
            showError(
                'Kritik sistem hatası. Sayfa yenilenecek.',
                true,
                () => window.location.reload()
            );
        }
    });
    
    console.log('✅ Enhanced event listeners kuruldu');
    
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

    // Ana çözüm seçenekleri
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
            // YENİ: İnteraktif çözüm için doğrudan view değiştir
            stateManager.setView('interactive');
        } else {
            showError("Henüz bir çözüm bulunamadı. Lütfen önce bir soru yükleyin.", false);
        }
    });

    add('goBackBtn', 'click', () => stateManager.setView('summary'));

    // Canvas araçları
    add('hw-pen-btn', 'click', () => setQuestionCanvasTool('pen', ['hw-pen-btn', 'hw-eraser-btn']));
    add('hw-eraser-btn', 'click', () => setQuestionCanvasTool('eraser', ['hw-pen-btn', 'hw-eraser-btn']));
    add('hw-clear-btn', 'click', () => canvasManager.clear('handwritingCanvas'));
    add('hw-undo-btn', 'click', () => canvasManager.undo('handwritingCanvas'));

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


    // Ana menüye dönme butonları için event delegation
    document.addEventListener('click', (event) => {
        if (event.target && event.target.id === 'back-to-main-menu-btn') {
            event.preventDefault();
            event.stopPropagation();
            
            console.log('🔄 Global back-to-main-menu button clicked');
            
            try {
                // Hangi view'dayız kontrol et
                const currentView = stateManager ? stateManager.getStateValue('ui').view : 'unknown';
                console.log(`📍 Current view: ${currentView}`);
                
                // View'a göre temizlik yap
                if (currentView === 'interactive') {
                    console.log('🧹 Interactive view cleanup başlıyor...');
                    
                    // Interactive manager'ı sıfırla
                    if (window.interactiveSolutionManager) {
                        window.interactiveSolutionManager.reset();
                        console.log('✅ Interactive solution manager reset');
                    }
                    
                    // Interactive DOM'u temizle
                    clearInteractiveDOM();
                    
                } else if (currentView === 'solving') {
                    console.log('🧹 Solving view cleanup başlıyor...');
                    
                    // Smart guide'ı sıfırla
                    if (window.smartGuide) {
                        window.smartGuide.reset();
                        console.log('✅ Smart guide reset');
                    }
                    
                } else if (currentView === 'fullSolution') {
                    console.log('🧹 Full solution view cleanup başlıyor...');
                    
                    // Solution output'u temizle
                    const solutionOutput = document.getElementById('solution-output');
                    if (solutionOutput) {
                        solutionOutput.innerHTML = '';
                    }
                }
                
                // State'i summary'ye çevir
                if (stateManager) {
                    stateManager.setView('summary');
                    console.log('✅ State set to summary');
                    
                    // Success mesajı
                    setTimeout(() => {
                        if (window.showSuccess) {
                            window.showSuccess("Ana menüye başarıyla döndünüz.", true, 2000);
                        }
                    }, 300);
                } else {
                    console.error('❌ stateManager bulunamadı!');
                }
                
            } catch (error) {
                console.error('❌ Global back button error:', error);
                
                // Fallback
                if (confirm('Bir hata oluştu. Sayfayı yenilemek ister misiniz?')) {
                    window.location.reload();
                }
            }
        }
    });

    document.addEventListener('click', (event) => {
        const target = event.target;
        
        if (target.id === 'interactive-new-problem-btn') {
            event.preventDefault();
            console.log('🎯 Yeni problem button clicked');
            
            if (window.interactiveSolutionManager) {
                window.interactiveSolutionManager.reset();
            }
            if (stateManager) {
                stateManager.reset();
                stateManager.setView('setup');
            }
        }
        
        if (target.id === 'interactive-review-solution-btn') {
            event.preventDefault();
            console.log('📋 Review solution button clicked');
            
            if (window.interactiveSolutionManager) {
                window.interactiveSolutionManager.reset();
            }
            if (stateManager) {
                stateManager.setView('fullSolution');
            }
        }
        
        if (target.id === 'interactive-try-step-by-step-btn') {
            event.preventDefault();
            console.log('📝 Try step by step button clicked');
            
            if (window.interactiveSolutionManager) {
                window.interactiveSolutionManager.reset();
            }
            if (stateManager) {
                stateManager.setView('solving');
            }
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

        showLoading("İnteraktif çözüm başlatılıyor...");

        await smartGuide.initializeGuidance(solutionData);
        
        // ✅ DÜZELTME: View değişikliğini önce yap
        stateManager.setView('solving');
        
        // ✅ DÜZELTME: showLoading'i önce kapat, sonra success göster
        showLoading(false);
        
        // ✅ YENİ: Kısa gecikme ile success mesajı
        setTimeout(() => {
            showSuccess("İnteraktif çözüm hazır! Adım adım çözüme başlayabilirsiniz.", true, 4000);
        }, 500);

    } catch (error) {
        showLoading(false); // Loading'i kapat
        
        errorHandler.handleError(error, {
            operation: 'initializeSmartGuide',
            fallbackMessage: 'İnteraktif çözüm başlatılamadı'
        });
        
        showError("İnteraktif çözüm başlatılırken bir hata oluştu. Lütfen tekrar deneyin.", false);
    }
}


// Sistem sıfırlama fonksiyonu - Son hali
function handleGuideReset() {
    // SmartGuide sistemini sıfırla
    smartGuide.resetAllAttempts();

    // Kullanıcıya açıklayıcı mesaj ver
    showError(
        "3 deneme hakkınız da bitti. API suistimalini önlemek için soruyu tekrar yüklemeniz gerekiyor. Soru yükleme alanına yönlendiriliyorsunuz.",
        true,
        () => {
            // Setup view'a geç
            stateManager.setView('setup');

            // Tüm input alanlarını temizle
            clearInputAreas();

            // Bilgilendirme mesajı
            setTimeout(() => {
                showSuccess(
                    "Soruyu tekrar yükleyerek yeni bir çözüm denemesi başlatabilirsiniz. Her adım için yine 3 deneme hakkınız olacak.",
                    false
                );
            }, 1000);
        }
    );
}
// index.js'de güncellenmiş displayDetailedGuideFeedback fonksiyonu

function displayDetailedGuideFeedback(evaluation) {
    const feedbackContainer = document.getElementById('guide-feedback-container');

    if (!feedbackContainer) return;

    const isCorrect = evaluation.isCorrect;
    const attempts = evaluation.attempts || 0;
    const remaining = evaluation.remaining || 0;

    // Feedback mesajı oluştur
    let feedbackHTML = '';

    if (isCorrect) {
        // Başarılı feedback
        feedbackHTML = `
            <div class="feedback-message success p-4 rounded-lg mb-4 bg-green-100 border border-green-300 relative">
                <button class="feedback-close absolute top-2 right-2 w-6 h-6 bg-green-200 hover:bg-green-300 rounded-full flex items-center justify-center text-green-700 font-bold text-sm transition-colors" onclick="this.parentElement.remove()">
                    ×
                </button>
                <div class="flex items-start gap-3 pr-8">
                    <div class="feedback-icon text-2xl">✅</div>
                    <div class="feedback-content flex-1">
                        <h4 class="font-semibold text-green-800 mb-1">
                            ${evaluation.finalAnswerGiven ? 'Final Cevap Doğru!' : 'Doğru cevap!'}
                        </h4>
                        <p class="text-green-700 text-sm">${evaluation.message}</p>
                        
                        ${evaluation.finalAnswerGiven ? `
                            <p class="text-xs text-green-600 mt-1 font-medium">
                                🎯 Problemin final cevabını doğru verdiniz! Tüm çözüm tamamlandı.
                            </p>
                        ` : attempts > 1 ? `
                            <p class="text-xs text-green-600 mt-1">
                                ${attempts} denemede çözdünüz.
                            </p>
                        ` : `
                            <p class="text-xs text-green-600 mt-1">
                                İlk denemede doğru! 🌟
                            </p>
                        `}
                        
                        ${evaluation.encouragement ? `
                            <p class="text-xs text-green-600 italic mt-1">${evaluation.encouragement}</p>
                        ` : ''}
                        
                        <!-- YENİ: Uyarı mesajları -->
                        ${evaluation.warningMessage ? `
                            <div class="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                                <div class="flex items-start gap-2">
                                    <span class="text-yellow-600 text-lg">⚠️</span>
                                    <div>
                                        <p class="text-yellow-800 text-sm font-medium">${evaluation.warningMessage}</p>
                                        ${evaluation.educationalNote ? `
                                            <p class="text-yellow-700 text-xs mt-1">${evaluation.educationalNote}</p>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

    } else {
        // Yanlış feedback
        const isLastAttempt = evaluation.shouldReset || evaluation.finalAttempt;
        const isBlocked = evaluation.stepSkippingBlocked;

        let feedbackClass, bgClass, textClass, iconClass, closeButtonClass;

        if (isBlocked) {
            // Adım atlama engellendi
            feedbackClass = 'blocked';
            bgClass = 'bg-purple-100 border-purple-300';
            textClass = 'text-purple-800';
            iconClass = 'text-purple-600';
            closeButtonClass = 'bg-purple-200 hover:bg-purple-300 text-purple-700';
        } else if (isLastAttempt) {
            // Son deneme
            feedbackClass = 'error';
            bgClass = 'bg-red-100 border-red-300';
            textClass = 'text-red-800';
            iconClass = 'text-red-600';
            closeButtonClass = 'bg-red-200 hover:bg-red-300 text-red-700';
        } else {
            // Normal yanlış
            feedbackClass = 'warning';
            bgClass = 'bg-orange-100 border-orange-300';
            textClass = 'text-orange-800';
            iconClass = 'text-orange-600';
            closeButtonClass = 'bg-orange-200 hover:bg-orange-300 text-orange-700';
        }

        feedbackHTML = `
            <div class="feedback-message ${feedbackClass} p-4 rounded-lg mb-4 ${bgClass} border relative">
                <button class="feedback-close absolute top-2 right-2 w-6 h-6 ${closeButtonClass} rounded-full flex items-center justify-center font-bold text-sm transition-colors" onclick="this.parentElement.remove()">
                    ×
                </button>
                <div class="flex items-start gap-3 pr-8">
                    <div class="feedback-icon text-2xl ${iconClass}">
                        ${isBlocked ? '🚫' : isLastAttempt ? '❌' : '⚠️'}
                    </div>
                    <div class="feedback-content flex-1">
                        <h4 class="font-semibold ${textClass} mb-1">
                            ${isBlocked ? 'Adım Atlanamaz!' :
                isLastAttempt ? 'Son deneme yanlış!' :
                    `Yanlış - ${remaining} hak kaldı`}
                        </h4>
                        <p class="${textClass} text-sm mb-2">${evaluation.message}</p>
                        
                        ${evaluation.hint ? `
                            <div class="mt-2 p-2 bg-white/60 rounded text-xs">
                                <span class="font-medium ${textClass}">Öneri:</span>
                                <span class="${iconClass}">${evaluation.hint}</span>
                            </div>
                        ` : ''}
                        
                        ${evaluation.encouragement ? `
                            <p class="text-xs ${iconClass} italic mt-2">${evaluation.encouragement}</p>
                        ` : ''}
                        
                        <div class="mt-2 flex items-center gap-2">
                            <span class="text-xs ${textClass} font-medium">Deneme:</span>
                            <div class="flex gap-1">
                                ${Array.from({ length: 3 }, (_, i) => `
                                    <div class="w-2 h-2 rounded-full ${i < attempts ?
                            (isLastAttempt ? 'bg-red-400' : 'bg-orange-400') :
                            'bg-gray-200'
                        }"></div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- YENİ: Eğitim bilgisi -->
                        ${isBlocked ? `
                            <div class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <h5 class="text-blue-800 font-medium text-sm mb-1">📚 Öğrenme İpucu</h5>
                                <p class="text-blue-700 text-xs">Matematik öğrenmek için her adımı anlamanız çok önemlidir. ${evaluation.requiredStepsRemaining} adım daha tamamlamanız gerekiyor.</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                ${isLastAttempt && !isBlocked ? `
                    <div class="mt-3 text-center p-2 bg-red-50 rounded border border-red-200">
                        <p class="text-xs text-red-700 font-medium">Tüm denemeler bitti. Sistem sıfırlanacak...</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    feedbackContainer.innerHTML = feedbackHTML;

    // Feedback'i görünür yap ve scroll et
    feedbackContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // BUTON DURUMUNU DÜZELT (eğer reset olmayacaksa ve engellenmemişse)
    if (!evaluation.shouldReset && !evaluation.isCorrect && !evaluation.stepSkippingBlocked) {
        setTimeout(() => {
            const submitBtn = document.getElementById('guide-submit-btn');
            if (submitBtn) {
                submitBtn.disabled = false;
                const attemptInfo = smartGuide.getCurrentStepAttemptInfo();
                submitBtn.innerHTML = `🎯 Kontrol Et (${attemptInfo.remaining} hak)`;
            }
        }, 1500);
    }

    // Otomatik temizleme sadece reset durumunda (10 saniye sonra)
    if (evaluation.shouldReset) {
        setTimeout(() => {
            const feedbackElement = feedbackContainer.querySelector('.feedback-message');
            if (feedbackElement) {
                feedbackElement.remove();
            }
        }, 10000);
    }
}

function handleGuideNextStep() {
    const hasNextStep = smartGuide.proceedToNextStep();

    if (hasNextStep) {
        renderSmartGuideStep();
        // Input'ları temizle
        const textInput = document.getElementById('guide-text-input');
        if (textInput) {
            textInput.value = '';
        }

        // Roadmap açıksa yeniden yükle
        const roadmapContent = document.getElementById('roadmap-content');
        if (roadmapContent && !roadmapContent.classList.contains('hidden')) {
            setTimeout(() => {
                loadRoadmapContent();
            }, 100);
        }
    } else {
        displayGuideCompletion();
    }
}

function handleGuidePreviousStep() {
    const canGoPrevious = smartGuide.goToPreviousStep();

    if (canGoPrevious) {
        renderSmartGuideStep();
        // Input'u temizle
        const textInput = document.getElementById('guide-text-input');
        if (textInput) {
            textInput.value = '';
        }

        // Roadmap açıksa yeniden yükle
        const roadmapContent = document.getElementById('roadmap-content');
        if (roadmapContent && !roadmapContent.classList.contains('hidden')) {
            setTimeout(() => {
                loadRoadmapContent();
            }, 100);
        }
    } else {
        showError("Bu ilk adım, önceki adım bulunmuyor.", false);
    }
}

// index.js'de güncellenmiş displayGuideCompletion fonksiyonu

function displayGuideCompletion() {
    const container = document.getElementById('smart-guide-container') || elements['step-by-step-container'];

    if (!container) return;

    const progress = smartGuide.getProgress();
    const hintStats = smartGuide.getHintStats();
    const attemptStats = smartGuide.getAttemptStats();

    // YENİ: Öğrenme raporu al
    const learningReport = smartGuide.getLearningReport();

    // İpucu kullanım mesajını oluştur
    let hintMessage = '';
    if (hintStats.totalHints === 0) {
        hintMessage = '🌟 Hiç ipucu kullanmadan çözdünüz! Mükemmel performans!';
    } else if (hintStats.totalHints === 1) {
        hintMessage = '👍 1 ipucu alarak çözdünüz. İyi iş!';
    } else if (hintStats.totalHints <= 3) {
        hintMessage = `💡 ${hintStats.totalHints} ipucu alarak çözdünüz. Güzel çalışma!`;
    } else {
        hintMessage = `💡 ${hintStats.totalHints} ipucu alarak çözdünüz. Pratik yaparak daha az ipucu ile çözebilirsiniz!`;
    }

    // Deneme performans mesajını oluştur
    let attemptMessage = '';
    const avgAttempts = parseFloat(attemptStats.averageAttemptsPerStep);
    if (avgAttempts <= 1.2) {
        attemptMessage = '🚀 Çoğu adımı ilk denemede çözdünüz! Harika performans!';
    } else if (avgAttempts <= 2) {
        attemptMessage = '👏 İyi bir performans gösterdiniz!';
    } else {
        attemptMessage = '💪 Pratik yaparak daha az denemede çözebilirsiniz!';
    }

    // YENİ: Öğrenme performans mesajı
    let learningMessage = '';
    let learningColor = 'text-green-600';

    switch (learningReport.performance) {
        case 'excellent':
            learningMessage = '🏆 Mükemmel öğrenme yaklaşımı!';
            learningColor = 'text-green-600';
            break;
        case 'good':
            learningMessage = '👍 İyi öğrenme yaklaşımı!';
            learningColor = 'text-blue-600';
            break;
        case 'needs_improvement':
            learningMessage = '📚 Öğrenme yaklaşımınızı geliştirebilirsiniz';
            learningColor = 'text-orange-600';
            break;
    }

    container.innerHTML = `
        <div class="completion-message text-center p-8 bg-green-50 rounded-lg">
            <div class="completion-icon text-6xl mb-4">🎉</div>
            <h3 class="text-2xl font-bold text-green-800 mb-2">Tebrikler!</h3>
            <p class="text-green-700 mb-4">Matematik problemini başarıyla çözdünüz!</p>
            
            <!-- PERFORMANS BİLGİLERİ -->
            <div class="performance-info mb-6 space-y-4">
                
                <!-- YENİ: ÖĞRENME PERFORMANSI -->
                <div class="learning-performance-info p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                    <div class="flex items-center justify-center gap-2 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                        </svg>
                        <h4 class="font-semibold text-indigo-800">Öğrenme Yaklaşımınız</h4>
                    </div>
                    <p class="font-medium ${learningColor} mb-2">${learningMessage}</p>
                    <div class="text-sm text-indigo-700 space-y-1">
                        <p><strong>Öğrenme Puanı:</strong> ${learningReport.learningScore}/100</p>
                        ${learningReport.earlyAnswerRate > 0 ? `
                            <p><strong>Erken Final Cevap Oranı:</strong> %${learningReport.earlyAnswerRate}</p>
                        ` : ''}
                        <p><strong>Ortalama Tamamlanan Adım:</strong> ${learningReport.averageStepsCompleted}</p>
                    </div>
                    <div class="mt-3 p-3 bg-white/60 rounded border border-indigo-200">
                        <p class="text-xs text-indigo-600 italic">${learningReport.recommendation}</p>
                    </div>
                </div>
                
                <!-- İPUCU BİLGİSİ -->
                <div class="hint-completion-info p-4 bg-white rounded-lg border border-green-200">
                    <div class="flex items-center justify-center gap-2 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                            <circle cx="12" cy="17" r="1"/>
                        </svg>
                        <h4 class="font-semibold text-gray-800">İpucu Performansınız</h4>
                    </div>
                    <p class="text-gray-700 font-medium ${hintStats.totalHints === 0 ? 'text-green-600' : ''}">${hintMessage}</p>
                    ${hintStats.totalHints > 0 ? `
                        <div class="mt-2 text-sm text-gray-600">
                            İpucu kullanılan adımlar: ${hintStats.usedSteps.map(step => `Adım ${step + 1}`).join(', ')}
                        </div>
                    ` : ''}
                </div>
                
                <!-- DENEME BİLGİSİ -->
                <div class="attempt-completion-info p-4 bg-white rounded-lg border border-green-200">
                    <div class="flex items-center justify-center gap-2 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9 12l2 2 4-4"/>
                            <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
                        </svg>
                        <h4 class="font-semibold text-gray-800">Deneme Performansınız</h4>
                    </div>
                    <p class="text-gray-700 font-medium ${avgAttempts <= 1.2 ? 'text-green-600' : ''}">${attemptMessage}</p>
                    <div class="mt-2 text-sm text-gray-600">
                        <p>Toplam deneme: ${attemptStats.totalAttempts} | Ortalama: ${attemptStats.averageAttemptsPerStep} deneme/adım</p>
                    </div>
                </div>
            </div>
            
            <div class="stats-grid grid grid-cols-4 gap-4 mb-6">
                <div class="stat-item p-3 bg-white rounded-lg">
                    <div class="stat-number text-xl font-bold text-green-600">${attemptStats.totalSteps}</div>
                    <div class="stat-label text-sm text-gray-600">Toplam Adım</div>
                </div>
                <div class="stat-item p-3 bg-white rounded-lg">
                    <div class="stat-number text-xl font-bold text-blue-600">${attemptStats.totalAttempts}</div>
                    <div class="stat-label text-sm text-gray-600">Toplam Deneme</div>
                </div>
                <div class="stat-item p-3 bg-white rounded-lg">
                    <div class="stat-number text-xl font-bold ${hintStats.totalHints === 0 ? 'text-green-600' : hintStats.totalHints <= 3 ? 'text-yellow-600' : 'text-orange-600'}">${hintStats.totalHints}</div>
                    <div class="stat-label text-sm text-gray-600">İpucu Sayısı</div>
                </div>
                <div class="stat-item p-3 bg-white rounded-lg">
                    <div class="stat-number text-xl font-bold ${learningReport.learningScore >= 80 ? 'text-green-600' : learningReport.learningScore >= 60 ? 'text-yellow-600' : 'text-orange-600'}">${learningReport.learningScore}</div>
                    <div class="stat-label text-sm text-gray-600">Öğrenme Puanı</div>
                </div>
            </div>
            
            <!-- YENİ: GELİŞİM ÖNERİLERİ -->
            ${learningReport.performance !== 'excellent' ? `
                <div class="improvement-suggestions mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 class="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                        💡 Gelişim Önerileri
                    </h4>
                    <div class="text-sm text-blue-700 space-y-2">
                        ${learningReport.earlyAnswerRate > 30 ? `
                            <p>• Her adımı dikkatle çözmeye odaklanın, final cevabı erken vermeye çalışmayın</p>
                        ` : ''}
                        ${avgAttempts > 2 ? `
                            <p>• İlk denemede doğru cevap verebilmek için soruları daha dikkatli okuyun</p>
                        ` : ''}
                        ${hintStats.totalHints > 3 ? `
                            <p>• İpucu almadan önce biraz daha düşünmeye çalışın</p>
                        ` : ''}
                        <p>• Matematik öğrenmek süreç odaklıdır, sonuç odaklı değil</p>
                    </div>
                </div>
            ` : ''}
            
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

async function renderApp(state) {
    const { user, ui, problem } = state;
    
    console.log('renderApp executed, current view:', ui.view);

    // 1. Kullanıcı Bilgilerini Güncelle
    if (user) {
        elements['header-subtitle'].textContent = `Hoş geldin, ${user.displayName}!`;
        const limit = user.membershipType === 'premium' ? 200 : 5;
        elements['query-count'].textContent = limit - (user.dailyQueryCount || 0);
    }
    
    // 2. Loading ve Error Durumları - View kontrolü ile
    const { view } = ui;
    
    // Loading durumu
    if (ui.isLoading) {
        showLoading(ui.loadingMessage);
        elements['question-setup-area'].classList.add('disabled-area');
    } else {
        showLoading(false);
        elements['question-setup-area'].classList.remove('disabled-area');
    }
    
    // Error durumu - sadece setup ve summary view'larında normal error göster
    if (ui.error) {
        if (['setup', 'summary'].includes(view)) {
            showError(ui.error, true, () => stateManager.clearError());
        } else {
            // Çözüm view'larında in-view notification kullan
            showInViewNotification(ui.error, 'error', true, 5000);
            stateManager.clearError();
        }
    }

    // 3. Ana Görünüm (View) Yönetimi
    const { inputMode, handwritingInputType } = ui;
    const isVisible = (v) => v === view;

    // Setup area görünürlüğü
    elements['question-setup-area'].classList.remove('hidden');
    elements['question-setup-area'].classList.toggle('disabled-area', !isVisible('setup'));
    
    // Question summary container
    if (isVisible('setup')) {
        elements['question-summary-container'].classList.add('hidden');
        elements['top-action-buttons'].classList.add('hidden');
    } else {
        elements['question-summary-container'].classList.toggle('hidden', !problem.solution);
        elements['top-action-buttons'].classList.toggle('hidden', !isVisible('summary'));
    }
    
    // Solving workspace
    elements['solving-workspace'].classList.toggle('hidden', !isVisible('solving'));
    
    // ✅ KRITIK DÜZELTME: Result container kontrolü - render sistemi hazır mı kontrol et
    if (isVisible('fullSolution') || isVisible('interactive')) {
        // Bu view'larda result-container'ı kesinlikle göster
        elements['result-container'].classList.remove('hidden');
        elements['result-container'].style.display = 'block';
        
        if (elements['solution-output']) {
            elements['solution-output'].classList.remove('hidden');
            elements['solution-output'].style.display = 'block';
        }
    } else {
        // Diğer view'larda gizle ve temizle
        elements['result-container'].classList.add('hidden');
        elements['result-container'].style.display = 'none';
        
        if (elements['solution-output']) {
            elements['solution-output'].classList.add('hidden');
            elements['solution-output'].style.display = 'none';
            
            // İnteraktif view'dan çıkıyorsak içeriği temizle
            if (view === 'summary' || view === 'setup') {
                elements['solution-output'].innerHTML = '';
                console.log('🧹 Solution output içeriği temizlendi - view:', view);
            }
        }
    }
    
    // Go back button
    if (elements['goBackBtn']) {
        elements['goBackBtn'].classList.toggle('hidden', !['fullSolution', 'interactive', 'solving'].includes(view));
    }
    
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
        
        clearInputAreas();
        
    } else if (isVisible('fullSolution')) {
        console.log('Rendering full solution view with Enhanced Math Renderer');
        try {
            await renderFullSolution(problem.solution);
        } catch (error) {
            console.error('Full solution render error:', error);
            showError('Tam çözüm yüklenirken bir hata oluştu.', false);
        }
        
    } else if (isVisible('interactive')) {
        console.log('Rendering interactive view - Enhanced version');
        
        try {
            showLoading("İnteraktif çözüm hazırlanıyor...");
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Containers'ı açık tut
            if (elements['result-container']) {
                elements['result-container'].classList.remove('hidden');
                elements['result-container'].style.display = 'block';
            }
            if (elements['solution-output']) {
                elements['solution-output'].classList.remove('hidden');
                elements['solution-output'].style.display = 'block';
            }
            
            await renderInteractiveSolution(problem.solution);
            showLoading(false);
            
        } catch (error) {
            console.error('İnteraktif view render hatası:', error);
            showLoading(false);
            showError('İnteraktif çözüm yüklenirken bir hata oluştu. Lütfen tekrar deneyin.', false);
        }
        
    } else if (isVisible('solving')) {
        console.log('Rendering solving view with Smart Guide');
        try {
            await renderSmartGuideWorkspace();
        } catch (error) {
            console.error('Smart guide render error:', error);
            showError('Adım adım çözüm yüklenirken bir hata oluştu.', false);
        }
    }

    // 5. Problem Özetini Render Et (sadece setup view değilse)
    if (problem.solution && !isVisible('setup')) {
        try {
            await displayQuestionSummary(problem.solution.problemOzeti);
        } catch (error) {
            console.error('Problem özeti render error:', error);
        }
    } else if (isVisible('setup')) {
        elements['question'].innerHTML = '';
    }
    
    console.log(`✅ View render tamamlandı: ${view}`);
}

// Input alanlarını temizleme fonksiyonu (gerekirse ekleyin)
function clearInputAreas() {
    console.log('🧹 Clearing input areas...');
    
    // Klavye input'unu temizle
    const keyboardInput = document.getElementById('keyboard-input');
    if (keyboardInput) {
        keyboardInput.value = '';
    }
    
    // Fotoğraf preview'ını temizle
    const imagePreview = document.getElementById('imagePreview');
    const previewContainer = document.getElementById('preview-container');
    const uploadSelection = document.getElementById('upload-selection');
    const startFromPhotoBtn = document.getElementById('startFromPhotoBtn');
    
    if (imagePreview) imagePreview.src = '';
    if (previewContainer) previewContainer.classList.add('hidden');
    if (uploadSelection) uploadSelection.classList.remove('hidden');
    if (startFromPhotoBtn) startFromPhotoBtn.disabled = true;
    
    // File input'ları temizle
    const imageUploader = document.getElementById('imageUploader');
    const cameraUploader = document.getElementById('cameraUploader');
    if (imageUploader) imageUploader.value = '';
    if (cameraUploader) cameraUploader.value = '';
    
    console.log('✅ All input areas cleared');
}

async function renderSmartGuideWorkspace() {
    const container = elements['step-by-step-container'];
    if (!container) return;

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
        return;
    }

    await renderSmartGuideStep();
}



async function renderSmartGuideStep() {
    const container = elements['step-by-step-container'];
    const stepInfo = smartGuide.getCurrentStepInfo();
    const progress = smartGuide.getProgress();
    const hintStats = smartGuide.getHintStats();
    const attemptInfo = smartGuide.getCurrentStepAttemptInfo();

    if (!container || !stepInfo) return;

    container.innerHTML = `
        <div class="smart-guide-workspace p-6 bg-white rounded-lg shadow-md">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold text-gray-800">Akıllı Rehber</h3>
                <div class="flex items-center gap-2">
                    ${hintStats.totalHints > 0 ? `
                        <span class="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                            💡 ${hintStats.totalHints} ipucu kullanıldı
                        </span>
                    ` : ''}
                    <button id="back-to-main-menu-btn" class="btn btn-secondary">Ana Menüye Dön</button>
                </div>
            </div>
            
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
            
            <!-- DENEME BİLGİSİ -->
            <div class="attempt-info-section mb-6 p-4 rounded-lg ${attemptInfo.isFailed ? 'bg-red-50 border border-red-200' : attemptInfo.attempts > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50 border border-blue-200'}">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="attempt-indicator ${attemptInfo.isFailed ? 'bg-red-500' : attemptInfo.attempts > 0 ? 'bg-orange-500' : 'bg-blue-500'} text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                            ${attemptInfo.attempts}
                        </div>
                        <div>
                            <h4 class="font-semibold ${attemptInfo.isFailed ? 'text-red-800' : attemptInfo.attempts > 0 ? 'text-orange-800' : 'text-blue-800'}">
                                ${attemptInfo.isFailed ? 'Adım Başarısız!' : `Deneme ${attemptInfo.attempts}/${attemptInfo.maxAttempts}`}
                            </h4>
                            <p class="text-sm ${attemptInfo.isFailed ? 'text-red-600' : attemptInfo.attempts > 0 ? 'text-orange-600' : 'text-blue-600'}">
                                ${attemptInfo.isFailed ?
            'Bu adım için tüm denemelerinizi kullandınız. Sistem sıfırlanacak.' :
            attemptInfo.attempts === 0 ?
                'Bu adım için 3 deneme hakkınız var' :
                `${attemptInfo.remaining} deneme hakkınız kaldı`
        }
                            </p>
                        </div>
                    </div>
                    <div class="attempt-dots flex gap-1">
                        ${Array.from({ length: 3 }, (_, i) => `
                            <div class="w-3 h-3 rounded-full ${i < attemptInfo.attempts ?
                (attemptInfo.isFailed ? 'bg-red-400' : 'bg-orange-400') :
                'bg-gray-200'
            }"></div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <!-- ROADMAP BÖLÜMÜ -->
            <div class="roadmap-section mb-6">
                <button id="toggle-roadmap-btn" class="btn btn-primary w-full flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 11H1v6h8v-6zM23 11h-8v6h8v-6zM16 3H8v6h8V3z"/>
                    </svg>
                    <span id="roadmap-btn-text">Çözüm Yol Haritasını Göster</span>
                </button>
                
                <div id="roadmap-content" class="roadmap-content hidden mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <h4 class="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                        Çözüm Yol Haritası
                    </h4>
                    <div id="roadmap-steps" class="space-y-3">
                        <!-- Roadmap içeriği buraya gelecek -->
                    </div>
                </div>
            </div>
            
            <!-- İPUCU BÖLÜMÜ -->
            <div id="hint-section" class="hint-section mb-6">
                <button id="toggle-hint-btn" class="btn ${hintStats.currentStepUsedHint ? 'btn-secondary' : 'btn-tertiary'} w-full flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                        <circle cx="12" cy="17" r="1"/>
                    </svg>
                    <span id="hint-btn-text">💡 İpucu Al</span>
                    ${hintStats.currentStepUsedHint ? '<span class="text-xs">(Kullanıldı)</span>' : ''}
                </button>
                
                <div id="hint-status-message" class="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-center" style="display: none;">
                    <p class="text-xs text-yellow-700 font-medium">
                        💡 İpucu görüntüleniyor. Referans alabilirsiniz!
                    </p>
                </div>
            </div>
            
            <div class="input-section mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    Çözümünüzü yazın:
                </label>
                
                <div class="input-mode-selector mb-3">
                    <div class="flex space-x-2">
                        <button id="guide-text-mode-btn" class="px-3 py-1 text-sm rounded-md bg-blue-100 text-blue-700 font-medium">
                            🧠 Akıllı Klavye
                        </button>
                        <button id="guide-handwriting-mode-btn" class="px-3 py-1 text-sm rounded-md bg-gray-100 text-gray-600">
                            ✏️ El Yazısı
                        </button>
                    </div>
                </div>
                
                <div id="guide-text-input-container">
                    <!-- HİNT PREVIEW ALANI - KLAVYE MODU -->
                    <div id="text-hint-preview" class="hint-preview-area hidden mb-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-2 border-dashed border-yellow-300">
                        <div class="flex items-center gap-2 mb-2">
                            <div class="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs font-bold">💡</div>
                            <span class="text-yellow-700 font-semibold text-sm">İpucu</span>
                        </div>
                        <div id="text-hint-content" class="text-gray-700 font-mono text-sm bg-white/60 p-2 rounded border smart-content" data-content="">
                            <!-- Hint içeriği buraya gelecek -->
                        </div>
                        <p class="text-xs text-yellow-600 mt-2 italic">Bu ipucunu referans alarak aşağı yazabilirsiniz</p>
                    </div>
                    
                    <!-- AKİLLI TEXTAREA + MATEMATİK SEMBOL PANELİ -->
                    <textarea 
                        id="guide-text-input" 
                        class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        rows="4"
                        placeholder="Matematik çözümünüzü buraya yazın... (Aşağıdaki sembol panelini kullanabilirsiniz)"
                    ></textarea>
                    <!-- Matematik sembol paneli buraya otomatik eklenecek -->
                </div>
                
                <div id="guide-canvas-container" class="hidden">
                    <!-- HİNT PREVIEW ALANI - CANVAS MODU -->
                    <div id="canvas-hint-preview" class="hint-preview-area hidden mb-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-2 border-dashed border-yellow-300">
                        <div class="flex items-center gap-2 mb-2">
                            <div class="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs font-bold">💡</div>
                            <span class="text-yellow-700 font-semibold text-sm">İpucu</span>
                        </div>
                        <div id="canvas-hint-content" class="text-gray-700 font-mono text-sm bg-white/60 p-2 rounded border smart-content" data-content="">
                            <!-- Hint içeriği buraya gelecek -->
                        </div>
                        <p class="text-xs text-yellow-600 mt-2 italic">Bu ipucunu referans alarak canvas'a yazabilirsiniz</p>
                    </div>
                    
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
            
            <div class="action-buttons flex flex-wrap gap-3 mb-4">
                <button id="guide-submit-btn" class="btn ${attemptInfo.isFailed ? 'btn-secondary' : 'btn-primary'} flex-1 ${attemptInfo.isFailed ? 'opacity-50 cursor-not-allowed' : ''}" ${attemptInfo.isFailed ? 'disabled' : ''}>
                    ${attemptInfo.isFailed ?
            '❌ Adım Başarısız' :
            `🎯 Kontrol Et (${attemptInfo.remaining} hak)`
        }
                </button>
                
                ${attemptInfo.isFailed ? `
                    <button id="guide-reset-btn" class="btn btn-tertiary">
                        🔄 Baştan Başla
                    </button>
                ` : ''}
            </div>
            
            <div id="guide-feedback-container" class="feedback-section"></div>
            
            <div class="navigation-section flex justify-between mt-6 pt-4 border-t">
                <button id="guide-previous-step-btn" class="btn btn-secondary" 
                        ${stepInfo.stepNumber <= 1 ? 'disabled' : ''}>
                    ← Önceki Adım
                </button>
                <button id="guide-next-step-btn" class="btn btn-tertiary" disabled>
                    Sonraki Adım →
                </button>
            </div>
        </div>
    `;

    // Advanced Math Renderer ile içeriği render et
    setTimeout(async () => {
        await renderSmartContent(container);
        // Roadmap içeriğini yükle
        await loadRoadmapContent();

        // YENİ: Matematik Sembol Paneli'ni başlat
        initializeMathSymbolPanel();
    }, 50);

    // Event listener'ları yeniden bağla
    setupGuideEventListeners();
}

// Matematik Sembol Paneli'ni başlatan fonksiyon
function initializeMathSymbolPanel() {
    try {
        // Önceki panelleri temizle
        mathSymbolPanel.destroy();

        // Textarea'nın var olup olmadığını kontrol et
        const textarea = document.getElementById('guide-text-input');
        if (textarea) {
            // Paneli oluştur
            const panel = mathSymbolPanel.createPanel('guide-text-input');

            if (panel) {
                console.log('Matematik Sembol Paneli başarıyla başlatıldı');

                // Textarea'ya focus olduğunda panel'i göster
                textarea.addEventListener('focus', () => {
                    panel.style.display = 'block';
                });

                // Başlangıçta panel'i göster
                panel.style.display = 'block';
            } else {
                console.warn('Matematik Sembol Paneli oluşturulamadı');
            }
        } else {
            console.warn('guide-text-input textarea bulunamadı');
        }
    } catch (error) {
        console.error('Matematik Sembol Paneli başlatma hatası:', error);
    }
}



async function handleGuideSubmission() {
    const submitBtn = document.getElementById('guide-submit-btn');
    const canvasContainer = document.getElementById('guide-canvas-container');

    if (!submitBtn) {
        showError("Gerekli form elemanları bulunamadı.", false);
        return;
    }

    // Deneme kontrolü
    const attemptInfo = smartGuide.getCurrentStepAttemptInfo();
    if (!attemptInfo.canAttempt) {
        showError("Bu adım için deneme hakkınız kalmadı.", false);
        return;
    }

    let studentInput = '';
    let inputType = 'text';

    // Hangi mod aktif olduğunu kontrol et
    if (canvasContainer && !canvasContainer.classList.contains('hidden')) {
        // El yazısı modu aktif
        inputType = 'canvas';
        try {
            const canvasData = canvasManager.toDataURL('guide-handwriting-canvas');
            studentInput = canvasData;

            if (!studentInput || studentInput === 'data:,' || isCanvasEmpty('guide-handwriting-canvas')) {
                showError("Lütfen el yazısı ile bir cevap yazın.", false);
                return;
            }
        } catch (error) {
            showError("El yazısı verisi alınırken hata oluştu.", false);
            return;
        }
    } else {
        // Klavye modu aktif - Normal textarea'dan değeri al
        const textInput = document.getElementById('guide-text-input');
        if (textInput) {
            studentInput = textInput.value.trim();
        }

        if (!studentInput) {
            showError("Lütfen bir cevap yazın.", false);
            return;
        }
    }

    try {
        // Buton durumunu değiştir
        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Kontrol ediliyor...
        `;

        // Öğrenci girişini değerlendir
        const evaluation = await smartGuide.evaluateStudentStep(studentInput, inputType);

        // Geri bildirimi göster
        displayDetailedGuideFeedback(evaluation);

        // Sonuç işlemleri
        if (evaluation.isCorrect && evaluation.shouldProceed) {

            // Final cevap mı yoksa normal adım mı kontrol et
            if (evaluation.shouldComplete || evaluation.finalAnswerGiven) {
                // Final cevap verildi - tüm problemi tamamla
                smartGuide.completeProblem();

                setTimeout(() => {
                    displayGuideCompletion();
                }, 3000);

            } else {
                // Normal adım tamamlandı - sonraki adıma geç
                setTimeout(() => {
                    const hasNextStep = smartGuide.proceedToNextStep();

                    if (hasNextStep) {
                        renderSmartGuideStep();
                        // Normal textarea'yı temizle
                        const textInput = document.getElementById('guide-text-input');
                        if (textInput) {
                            textInput.value = '';
                        }
                    } else {
                        displayGuideCompletion();
                    }
                }, 2000);
            }

        } else if (evaluation.shouldReset) {
            // 3 deneme bitti - sistemi sıfırla
            setTimeout(() => {
                handleGuideReset();
            }, 8000);

        } else {
            // Yanlış ama deneme hakkı var - buton durumunu geri al ve sayfayı yenile
            setTimeout(() => {
                renderSmartGuideStep();
            }, 1000);
        }

    } catch (error) {
        errorHandler.handleError(error, {
            operation: 'handleGuideSubmission',
            fallbackMessage: 'Cevap değerlendirilemedi'
        });
        showError("Cevabınız değerlendirilirken bir hata oluştu. Lütfen tekrar deneyin.", false);

        // HATA DURUMUNDA BUTON DURUMUNU GERİ AL
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}


function toggleHint() {
    const hintResult = smartGuide.toggleHint();
    const toggleBtn = document.getElementById('toggle-hint-btn');
    const btnText = document.getElementById('hint-btn-text');
    const statusMessage = document.getElementById('hint-status-message');

    if (!toggleBtn || !btnText) return;

    if (hintResult.isVisible) {
        // Hangi mod aktif olduğunu kontrol et
        const canvasContainer = document.getElementById('guide-canvas-container');
        const textContainer = document.getElementById('guide-text-input-container');

        const isCanvasMode = canvasContainer && !canvasContainer.classList.contains('hidden');
        const isTextMode = textContainer && !textContainer.classList.contains('hidden');

        if (isCanvasMode) {
            // Canvas modunda - hint preview göster
            showCanvasHintPreview(hintResult.stepHint);
            updateHintUI(true, hintResult, 'canvas');

        } else if (isTextMode) {
            // Klavye modunda - hint preview göster
            showTextHintPreview(hintResult.stepHint);
            updateHintUI(true, hintResult, 'text');
        } else {
            showError('Aktif giriş modu bulunamadı.', false);
        }

    } else {
        // İpucuyu temizle
        clearAllHints();
        updateHintUI(false, hintResult, 'none');
    }
}



function hideCanvasHintPreview() {
    const hintPreview = document.getElementById('canvas-hint-preview');
    if (hintPreview) {
        hintPreview.classList.add('hidden');
        hintPreview.classList.remove('animate-fadeIn');
    }
}

// Text mode hint preview fonksiyonları (zaten var)
// Text mode hint preview fonksiyonları - Sadece sözel
function showTextHintPreview(stepHint) {
    const hintPreview = document.getElementById('text-hint-preview');
    const hintContent = document.getElementById('text-hint-content');

    if (!hintPreview || !hintContent || !stepHint) return;

    // Hint içeriğini hazırla - sadece ipucu kısmını al (adımAciklamasi değil)
    const hintText = stepHint.hint || stepHint.ipucu || 'İpucu mevcut değil';

    // İçeriği ayarla - LaTeX render etme, sadece düz metin
    hintContent.textContent = hintText;
    hintContent.removeAttribute('data-content'); // Smart content render etmeyi engelle

    // Preview'ı göster
    hintPreview.classList.remove('hidden');
    hintPreview.classList.add('animate-fadeIn');

    console.log('Text hint preview gösterildi (sadece sözel):', hintText);
}

// Canvas mode hint preview fonksiyonları - Sadece sözel
function showCanvasHintPreview(stepHint) {
    const hintPreview = document.getElementById('canvas-hint-preview');
    const hintContent = document.getElementById('canvas-hint-content');

    if (!hintPreview || !hintContent || !stepHint) return;

    // Hint içeriğini hazırla - sadece ipucu kısmını al
    const hintText = stepHint.hint || stepHint.ipucu || 'İpucu mevcut değil';

    // İçeriği ayarla - LaTeX render etme, sadece düz metin
    hintContent.textContent = hintText;
    hintContent.removeAttribute('data-content'); // Smart content render etmeyi engelle

    // Preview'ı göster
    hintPreview.classList.remove('hidden');
    hintPreview.classList.add('animate-fadeIn');

    console.log('Canvas hint preview gösterildi (sadece sözel):', hintText);
}

function hideTextHintPreview() {
    const hintPreview = document.getElementById('text-hint-preview');
    if (hintPreview) {
        hintPreview.classList.add('hidden');
        hintPreview.classList.remove('animate-fadeIn');
    }
}

// Tüm hint'leri temizleyen fonksiyon - Güncellenmiş
function clearAllHints() {
    // Tüm hint preview'ları gizle
    hideTextHintPreview();
    hideCanvasHintPreview();
}



// UI güncellemelerini ayıran fonksiyon
function updateHintUI(isVisible, hintResult, mode) {
    const toggleBtn = document.getElementById('toggle-hint-btn');
    const btnText = document.getElementById('hint-btn-text');
    const statusMessage = document.getElementById('hint-status-message');

    if (isVisible) {
        // Buton durumunu güncelle
        btnText.textContent = '🚫 İpucuyu Temizle';
        toggleBtn.classList.remove('btn-tertiary');
        toggleBtn.classList.add('btn-secondary');

        // Status mesajını göster
        if (statusMessage) {
            const modeText = mode === 'canvas' ? 'canvas\'ta görüntüleniyor' : 'yazı alanında görüntüleniyor';
            statusMessage.querySelector('p').textContent = `💡 İpucu ${modeText}. Üzerine yazabilirsiniz!`;
            statusMessage.style.display = 'block';
        }

        // Başarı mesajı göster
        if (hintResult.hintCount === 1) {
            showSuccess(`İlk ipucunuz görüntülendi! Toplam: ${hintResult.hintCount} ipucu`, true, 3000);
        } else {
            showSuccess(`${hintResult.hintCount}. ipucunuz görüntülendi!`, true, 3000);
        }

    } else {
        // Buton durumunu güncelle
        btnText.textContent = '💡 İpucu Al';
        toggleBtn.classList.remove('btn-secondary');
        toggleBtn.classList.add('btn-tertiary');

        // Status mesajını gizle
        if (statusMessage) {
            statusMessage.style.display = 'none';
        }

        showSuccess('İpucu temizlendi.', true, 2000);
    }
}



// Roadmap içeriğini yükleyen fonksiyon - Sadece sözel açıklama
async function loadRoadmapContent() {
    const solutionData = stateManager.getStateValue('problem').solution;
    if (!solutionData || !solutionData.adimlar) return;

    const roadmapSteps = document.getElementById('roadmap-steps');
    if (!roadmapSteps) return;

    // Tüm adımları roadmap olarak göster
    let roadmapHTML = '';

    solutionData.adimlar.forEach((step, index) => {
        const stepNumber = index + 1;
        const isCurrentStep = stepNumber === smartGuide.getCurrentStepInfo()?.stepNumber;

        // Sadece sözel açıklama kullan - LaTeX render etme
        const description = step.adimAciklamasi || `Adım ${stepNumber} açıklaması`;
        const hint = step.ipucu || '';

        roadmapHTML += `
            <div class="roadmap-step-item ${isCurrentStep ? 'current-step' : ''} p-3 rounded-lg border transition-all duration-200">
                <div class="flex items-start gap-3">
                    <div class="step-indicator ${isCurrentStep ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'} w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                        ${stepNumber}
                    </div>
                    <div class="flex-1">
                        <h5 class="font-semibold text-gray-800 mb-1">Adım ${stepNumber}</h5>
                        <p class="text-gray-600 text-sm">${escapeHtml(description)}</p>
                        ${hint ? `
                            <div class="mt-2 p-2 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-xs">
                                <strong>💡 İpucu:</strong> <span>${escapeHtml(hint)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });

    roadmapSteps.innerHTML = roadmapHTML;

    // Smart content render etmeye gerek yok çünkü sadece düz metin var
    console.log('Roadmap sadece sözel açıklamalar ile yüklendi');
}
// Roadmap toggle fonksiyonu
function toggleRoadmap() {
    const roadmapContent = document.getElementById('roadmap-content');
    const toggleBtn = document.getElementById('toggle-roadmap-btn');
    const btnText = document.getElementById('roadmap-btn-text');

    if (!roadmapContent || !toggleBtn || !btnText) return;

    const isHidden = roadmapContent.classList.contains('hidden');

    if (isHidden) {
        // Roadmap'i göster
        roadmapContent.classList.remove('hidden');
        roadmapContent.classList.add('animate-fadeIn');
        btnText.textContent = 'Yol Haritasını Gizle';
        toggleBtn.classList.remove('btn-primary');
        toggleBtn.classList.add('btn-secondary');
    } else {
        // Roadmap'i gizle
        roadmapContent.classList.add('hidden');
        roadmapContent.classList.remove('animate-fadeIn');
        btnText.textContent = 'Çözüm Yol Haritasını Göster';
        toggleBtn.classList.remove('btn-secondary');
        toggleBtn.classList.add('btn-primary');
    }
}

// Event listener'lara reset butonunu ekleyelim
function setupGuideEventListeners() {
    const submitBtn = document.getElementById('guide-submit-btn');
    const nextBtn = document.getElementById('guide-next-step-btn');
    const prevBtn = document.getElementById('guide-previous-step-btn');
    const resetBtn = document.getElementById('guide-reset-btn'); // YENİ EKLEME
    const textInput = document.getElementById('guide-text-input');

    // Roadmap ve İpucu toggle butonları
    const roadmapToggleBtn = document.getElementById('toggle-roadmap-btn');
    const hintToggleBtn = document.getElementById('toggle-hint-btn');

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

    if (nextBtn) {
        nextBtn.addEventListener('click', handleGuideNextStep);
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', handleGuidePreviousStep);
    }

    // YENİ EKLEME: Reset butonu
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Tüm ilerlemeniz silinecek ve ana menüye döneceksiniz. Emin misiniz?')) {
                handleGuideReset();
            }
        });
    }

    // Roadmap toggle event listener
    if (roadmapToggleBtn) {
        roadmapToggleBtn.addEventListener('click', toggleRoadmap);
    }

    // İpucu toggle event listener
    if (hintToggleBtn) {
        hintToggleBtn.addEventListener('click', toggleHint);
    }

    if (textInput) {
        textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                // Deneme hakkı kontrolü
                const attemptInfo = smartGuide.getCurrentStepAttemptInfo();
                if (attemptInfo.canAttempt) {
                    handleGuideSubmission();
                }
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

    // Canvas araçları
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
/// İnteraktif çözüm için giriş modu değiştirme - Her iki mod için hint preview
// İnteraktif çözüm için giriş modu değiştirme - Matematik sembol paneli ile
function switchGuideInputMode(mode) {
    const textContainer = document.getElementById('guide-text-input-container');
    const canvasContainer = document.getElementById('guide-canvas-container');
    const textModeBtn = document.getElementById('guide-text-mode-btn');
    const handwritingModeBtn = document.getElementById('guide-handwriting-mode-btn');

    if (mode === 'text') {
        // Akıllı klavye moduna geç
        textContainer.classList.remove('hidden');
        canvasContainer.classList.add('hidden');

        textModeBtn.classList.add('bg-blue-100', 'text-blue-700', 'font-medium');
        textModeBtn.classList.remove('bg-gray-100', 'text-gray-600');

        handwritingModeBtn.classList.add('bg-gray-100', 'text-gray-600');
        handwritingModeBtn.classList.remove('bg-blue-100', 'text-blue-700', 'font-medium');

        // Matematik sembol paneli'ni başlat/göster
        setTimeout(() => {
            initializeMathSymbolPanel();
            const textInput = document.getElementById('guide-text-input');
            if (textInput) {
                textInput.focus();
            }
        }, 100);

    } else if (mode === 'handwriting') {
        // El yazısı moduna geç
        textContainer.classList.add('hidden');
        canvasContainer.classList.remove('hidden');

        handwritingModeBtn.classList.add('bg-blue-100', 'text-blue-700', 'font-medium');
        handwritingModeBtn.classList.remove('bg-gray-100', 'text-gray-600');

        textModeBtn.classList.add('bg-gray-100', 'text-gray-600');
        textModeBtn.classList.remove('bg-blue-100', 'text-blue-700', 'font-medium');

        // Matematik sembol paneli'ni gizle
        mathSymbolPanel.destroy();

        // Canvas'ı yeniden boyutlandır
        setTimeout(() => {
            canvasManager.resizeCanvas('guide-handwriting-canvas');
        }, 100);
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

        // Enhanced animasyonlu yükleme mesajları
        const analysisSteps = [
            { title: "API bağlantısı kuruluyor", description: "Yapay zeka servisine bağlanılıyor..." },
            { title: "Soru içerik kontrolü yapılıyor", description: "Problem analiz ediliyor..." },
            { title: "Matematiksel ifadeler tespit ediliyor", description: "Formüller ve denklemler çözümleniyor..." },
            { title: "Çözüm adımları hazırlanıyor", description: "Adım adım çözüm planı oluşturuluyor..." },
            { title: "Enhanced Math Renderer hazırlanıyor", description: "Gelişmiş matematik render sistemi ile optimize ediliyor..." }
        ];

        showAnimatedLoading(analysisSteps, 800);

        // ✅ DÜZELTME: Enhanced API call with retry logic
        const solution = await makeApiCallWithRetry(sourceType, sourceData, problemContextForPrompt);

        if (solution) {
            showLoading(false);
            
            // SmartGuide'ı da sıfırla (yeni problem için)
            smartGuide.reset();

            stateManager.setSolution(solution);
            stateManager.setView('summary');
            
            // Success mesajı
            setTimeout(() => {
                showSuccess("Problem başarıyla çözüldü! Enhanced Math Renderer v2 ile optimize edildi.", true, 4000);
            }, 300);

            await FirestoreManager.incrementQueryCount();
        } else {
            showLoading(false);
            showError("Problem çözülürken bir hata oluştu. Lütfen tekrar deneyin.", false);
        }
    } catch (error) {
        showLoading(false);
        
        errorHandler.handleError(error, {
            operation: 'handleNewProblem',
            context: { sourceType }
        });
        showError("Problem analizi sırasında bir hata oluştu. Lütfen tekrar deneyin.", false);
    }
}
async function makeApiCallWithRetry(sourceType, sourceData, problemContextForPrompt, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 API çağrısı deneme ${attempt}/${maxRetries}`);
            
            const promptText = masterSolutionPrompt.replace('{PROBLEM_CONTEXT}', problemContextForPrompt);
            const payloadParts = [{ text: promptText }];
            
            if (sourceType !== 'text') {
                payloadParts.push({ inlineData: { mimeType: 'image/png', data: sourceData } });
            }
            
            // Son çağrıyı kaydet (retry için)
            window.lastApiCall = () => makeApiCall({ contents: [{ role: "user", parts: payloadParts }] });
            
            const solution = await makeApiCall({ contents: [{ role: "user", parts: payloadParts }] });
            
            if (solution && solution.problemOzeti) {
                console.log(`✅ API çağrısı başarılı - deneme ${attempt}`);
                return solution;
            } else {
                throw new Error('API yanıtı geçersiz format');
            }
            
        } catch (error) {
            lastError = error;
            console.error(`❌ API çağrısı deneme ${attempt} başarısız:`, error.message);
            
            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                console.log(`⏳ ${delay}ms bekleniyor, sonra tekrar denenecek...`);
                
                // Loading mesajını güncelle
                showLoading(`API hatası - ${maxRetries - attempt} deneme kaldı. ${delay/1000}s bekleniyor...`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    // Tüm denemeler başarısız
    console.error('❌ Tüm API denemeleri başarısız');
    throw lastError || new Error('API çağrısı maksimum deneme sayısına ulaştı');
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

            // ✅ ENHANCED JSON PARSING
            return parseApiResponse(content);
        }

        throw new Error('Geçersiz API yanıt yapısı');
    } catch (error) {
        console.error('API çağrısı hatası:', error);
        throw error;
    }
}

function parseApiResponse(content) {
    console.log('🔄 API response parsing başlıyor...');
    
    // Stratej 1: Direkt JSON parse
    try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            console.log('✅ Direkt JSON parse başarılı');
            return validateAndFixApiResponse(result);
        }
    } catch (directParseError) {
        console.log('⚠️ Direkt parse başarısız, temizleme deneniyor...');
    }
    
    // Stratej 2: Content temizleyerek parse
    try {
        let cleanedContent = cleanApiContent(content);
        const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            console.log('✅ Temizleme sonrası parse başarılı');
            return validateAndFixApiResponse(result);
        }
    } catch (cleanParseError) {
        console.log('⚠️ Temizleme sonrası parse başarısız, regex deneniyor...');
    }
    
    // Stratej 3: Regex ile veri çıkarma
    try {
        const result = extractDataWithRegex(content);
        console.log('✅ Regex extraction başarılı');
        return validateAndFixApiResponse(result);
    } catch (regexError) {
        console.log('⚠️ Regex extraction başarısız, fallback uygulanıyor...');
    }
    
    // Stratej 4: Son çare fallback
    console.log('🆘 Tüm parsing stratejileri başarısız, fallback uygulanıyor...');
    return createFallbackResponse();
}

function cleanApiContent(content) {
    return content
        // Unicode karakterleri normalleştir
        .replace(/[\u201C\u201D]/g, '"') // Smart quotes
        .replace(/[\u2018\u2019]/g, "'") // Smart apostrophes
        .replace(/[\u2013\u2014]/g, "-") // En/em dashes
        
        // Problematik escape karakterlerini düzelt
        .replace(/\\\\/g, '\\') // Çift backslash'leri tek yap
        .replace(/\\"/g, '"')   // Escaped quotes
        .replace(/\\n/g, '\n')  // Newline
        .replace(/\\t/g, '\t')  // Tab
        
        // Control karakterleri temizle
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        
        // Trailing commas
        .replace(/,(\s*[}\]])/g, '$1')
        
        // Extra whitespace
        .replace(/\s+/g, ' ')
        .trim();
}

function validateAndFixApiResponse(data) {
    console.log('🔍 API response validation başlıyor...');
    
    // Temel yapı kontrolü
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid data structure');
    }
    
    // problemOzeti düzeltmesi
    if (!data.problemOzeti) {
        data.problemOzeti = {
            verilenler: ["Problem özeti eksik"],
            istenen: "Çözüm isteniyor"
        };
    }
    
    if (!data.problemOzeti.verilenler || !Array.isArray(data.problemOzeti.verilenler)) {
        data.problemOzeti.verilenler = ["Verilen bilgiler eksik"];
    }
    
    if (!data.problemOzeti.istenen) {
        data.problemOzeti.istenen = "Problem çözümü isteniyor";
    }
    
    // adimlar düzeltmesi
    if (!data.adimlar || !Array.isArray(data.adimlar) || data.adimlar.length === 0) {
        data.adimlar = [
            {
                adimAciklamasi: "API'dan adım bilgisi alınamadı",
                cozum_lateks: "\\text{Çözüm gösterilemiyor}",
                ipucu: "Lütfen tekrar deneyin"
            }
        ];
    }
    
    // Her adımı kontrol et ve düzelt
    data.adimlar.forEach((step, index) => {
        if (!step.adimAciklamasi) {
            step.adimAciklamasi = `Adım ${index + 1} açıklaması eksik`;
        }
        
        if (!step.cozum_lateks) {
            step.cozum_lateks = "\\text{LaTeX çözümü eksik}";
        }
        
        if (!step.ipucu) {
            step.ipucu = "İpucu mevcut değil";
        }
        
        // LaTeX'i temizle
        step.cozum_lateks = cleanLatexContent(step.cozum_lateks);
    });
    
    // tamCozumLateks düzeltmesi
    if (!data.tamCozumLateks || !Array.isArray(data.tamCozumLateks) || data.tamCozumLateks.length === 0) {
        data.tamCozumLateks = data.adimlar.map(step => step.cozum_lateks);
    }
    
    // Her LaTeX içeriğini temizle
    data.tamCozumLateks = data.tamCozumLateks.map(latex => cleanLatexContent(latex));
    
    console.log('✅ API response validation başarılı');
    return data;
}

function cleanLatexContent(latex) {
    if (!latex || typeof latex !== 'string') {
        return "\\text{LaTeX içeriği eksik}";
    }
    
    return latex
        .replace(/\\\\\\\\/g, '\\\\') // Fazla backslash'leri düzelt
        .replace(/\\{3,}/g, '\\\\')    // 3+ backslash'leri çift yap
        .replace(/^\$+|\$+$/g, '')     // Dış delimiterleri kaldır
        .replace(/^\\\(|\\\)$/g, '')   // Parantez delimiterleri kaldır
        .replace(/^\\\[|\\\]$/g, '')   // Köşeli parantez delimiterleri kaldır
        .trim();
}
function extractDataWithRegex(content) {
    console.log('🔄 Regex data extraction başlıyor...');
    
    const result = {
        problemOzeti: {
            verilenler: [],
            istenen: "Problem analiz edilirken hata oluştu"
        },
        adimlar: [],
        tamCozumLateks: []
    };
    
    try {
        // Verilenler çıkarma (çoklu pattern)
        const verilenlerPatterns = [
            /verilenler["\s]*:\s*\[(.*?)\]/s,
            /"verilenler"\s*:\s*\[(.*?)\]/s,
            /Verilenler[:\s]*\[(.*?)\]/s
        ];
        
        for (const pattern of verilenlerPatterns) {
            const match = content.match(pattern);
            if (match) {
                const verilenlerStr = match[1];
                const verilenler = extractArrayItems(verilenlerStr);
                if (verilenler.length > 0) {
                    result.problemOzeti.verilenler = verilenler;
                    break;
                }
            }
        }
        
        // İstenen çıkarma
        const istenenPatterns = [
            /istenen["\s]*:\s*["']([^"']{10,}?)["']/s,
            /"istenen"\s*:\s*["']([^"']{10,}?)["']/s,
            /İstenen[:\s]*["']([^"']{10,}?)["']/s
        ];
        
        for (const pattern of istenenPatterns) {
            const match = content.match(pattern);
            if (match && match[1].length > 5) {
                result.problemOzeti.istenen = match[1].trim();
                break;
            }
        }
        
        // Adımlar çıkarma
        const adimPatterns = [
            /adimAciklamasi["\s]*:\s*["']([^"']{5,}?)["']/g,
            /"adimAciklamasi"\s*:\s*["']([^"']{5,}?)["']/g
        ];
        
        const cozumPatterns = [
            /cozum_lateks["\s]*:\s*["']([^"']{3,}?)["']/g,
            /"cozum_lateks"\s*:\s*["']([^"']{3,}?)["']/g
        ];
        
        const ipucuPatterns = [
            /ipucu["\s]*:\s*["']([^"']{3,}?)["']/g,
            /"ipucu"\s*:\s*["']([^"']{3,}?)["']/g
        ];
        
        // Adım açıklamalarını topla
        const aciklamalar = [];
        for (const pattern of adimPatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                aciklamalar.push(match[1].trim());
            }
            if (aciklamalar.length > 0) break;
        }
        
        // Çözümleri topla
        const cozumler = [];
        for (const pattern of cozumPatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                cozumler.push(cleanLatexContent(match[1]));
            }
            if (cozumler.length > 0) break;
        }
        
        // İpuçlarını topla
        const ipuclari = [];
        for (const pattern of ipucuPatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                ipuclari.push(match[1].trim());
            }
            if (ipuclari.length > 0) break;
        }
        
        // Adımları oluştur
        const maxSteps = Math.max(aciklamalar.length, cozumler.length, 1);
        for (let i = 0; i < maxSteps; i++) {
            result.adimlar.push({
                adimAciklamasi: aciklamalar[i] || `Adım ${i + 1} açıklaması`,
                cozum_lateks: cozumler[i] || "\\text{Çözüm eksik}",
                ipucu: ipuclari[i] || "İpucu mevcut değil"
            });
        }
        
        // Tam çözümü oluştur
        result.tamCozumLateks = result.adimlar.map(step => step.cozum_lateks);
        
        console.log('✅ Regex extraction başarılı:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Regex extraction hatası:', error);
        throw error;
    }
}

function extractArrayItems(arrayStr) {
    try {
        // JSON array olarak parse etmeyi dene
        const jsonStr = `[${arrayStr}]`;
        const parsed = JSON.parse(jsonStr);
        return parsed.filter(item => typeof item === 'string' && item.trim().length > 0);
    } catch (jsonError) {
        // Manuel parsing
        return arrayStr
            .split(/,|;|\n/)
            .map(item => item.replace(/["']/g, '').trim())
            .filter(item => item.length > 0)
            .slice(0, 5); // Max 5 item
    }
}
function createFallbackResponse() {
    console.log('🆘 Creating fallback response...');
    
    return {
        problemOzeti: {
            verilenler: ["API yanıtı işlenemedi - manuel kontrol gerekli"],
            istenen: "Çözüm gösterilemiyor"
        },
        adimlar: [
            {
                adimAciklamasi: "API yanıtı parse edilemedi",
                cozum_lateks: "\\text{Sistem hatası - lütfen tekrar deneyin}",
                ipucu: "API ile iletişim sorunu yaşandı"
            }
        ],
        tamCozumLateks: ["\\text{Sistem hatası - API yanıtı işlenemedi}"],
        _fallback: true,
        _error: "API response parsing failed"
    };
}
export async function checkApiHealth() {
    try {
        const testPayload = {
            contents: [{
                role: "user",
                parts: [{ text: "Test: 2+2=?" }]
            }]
        };
        
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testPayload)
        });
        
        return {
            healthy: response.ok,
            status: response.status,
            statusText: response.statusText
        };
    } catch (error) {
        return {
            healthy: false,
            error: error.message
        };
    }
}
function sanitizeJsonString(jsonStr) {
    return jsonStr
        // Unicode karakterleri normalleştir
        .replace(/[\u201C\u201D]/g, '"') // Smart quotes
        .replace(/[\u2018\u2019]/g, "'") // Smart apostrophes
        .replace(/[\u2013\u2014]/g, "-") // En/em dashes
        
        // LaTeX karakterlerini escape et
        .replace(/\\\\/g, '\\\\\\\\') // LaTeX backslashes
        
        // Invalid JSON karakterleri temizle
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Control characters
        .replace(/\t/g, '\\t')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        
        // Trailing commas
        .replace(/,(\s*[}\]])/g, '$1')
        
        // Extra spaces around colons and commas
        .replace(/\s*:\s*/g, ':')
        .replace(/\s*,\s*/g, ',');
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







// --- PROBLEM ÖZETİ VE RENDER FONKSİYONLARI ---
async function displayQuestionSummary(problemOzeti) {
    if (!problemOzeti) return;

    const { verilenler, istenen } = problemOzeti;

    let summaryHTML = '<div class="problem-summary bg-blue-50 p-4 rounded-lg mb-4">';
    summaryHTML += '<h3 class="font-semibold text-blue-800 mb-2">Problem Özeti:</h3>';

    if (verilenler && verilenler.length > 0) {
        summaryHTML += '<div class="mb-2"><strong>Verilenler:</strong><ul class="list-disc list-inside ml-4">';
        verilenler.forEach((veri, index) => {
            summaryHTML += `<li class="smart-content" data-content="${escapeHtml(veri)}" id="verilen-${index}"></li>`;
        });
        summaryHTML += '</ul></div>';
    }

    if (istenen) {
        summaryHTML += `<div><strong>İstenen:</strong> <span class="smart-content" data-content="${escapeHtml(istenen)}" id="istenen-content"></span></div>`;
    }

    summaryHTML += '</div>';
    elements['question'].innerHTML = summaryHTML;

    // Advanced Math Renderer ile render et
    setTimeout(async () => {
        await renderSmartContent(elements['question']);
    }, 50);
}


async function renderFullSolution(solution) {
    console.log('renderFullSolution called with Advanced Math Renderer:', solution);
    if (!solution) {
        console.log('No solution provided to renderFullSolution');
        return;
    }

    let html = '<div class="full-solution-container">';
    html += '<div class="flex justify-between items-center mb-4">';
    html += '<h3 class="text-xl font-bold text-gray-800">Tam Çözüm</h3>';
    html += '<button id="back-to-main-menu-btn" class="btn btn-secondary">Ana Menüye Dön</button>';
    html += '</div>';

    if (solution.adimlar && solution.adimlar.length > 0) {
        solution.adimlar.forEach((step, index) => {
            html += `<div class="solution-step p-4 mb-3 bg-gray-50 rounded-lg">`;
            html += `<div class="step-number font-semibold text-blue-600 mb-2">${index + 1}. Adım</div>`;
            html += `<div class="step-description mb-2 text-gray-700 smart-content" data-content="${escapeHtml(step.adimAciklamasi || 'Adım açıklaması')}" id="step-desc-${index}"></div>`;
            if (step.cozum_lateks) {
                html += `<div class="latex-content mb-2" data-latex="${escapeHtml(step.cozum_lateks)}" id="step-latex-${index}"></div>`;
            }
            if (step.ipucu) {
                html += `<div class="step-hint p-2 bg-yellow-50 rounded text-sm smart-content" data-content="${escapeHtml(step.ipucu)}" id="step-hint-${index}"></div>`;
            }
            html += '</div>';
        });
    } else if (solution.tamCozumLateks && solution.tamCozumLateks.length > 0) {
        solution.tamCozumLateks.forEach((latex, index) => {
            html += `<div class="solution-step p-4 mb-3 bg-gray-50 rounded-lg">`;
            html += `<div class="step-number font-semibold text-blue-600 mb-2">${index + 1}. Adım</div>`;
            html += `<div class="latex-content" data-latex="${escapeHtml(latex)}" id="legacy-step-${index}"></div>`;
            html += '</div>';
        });
    } else {
        html += '<div class="p-4 bg-red-50 text-red-700 rounded-lg">';
        html += '<p>Çözüm verisi bulunamadı. Lütfen tekrar deneyin.</p>';
        html += '</div>';
    }

    html += '</div>';
    elements['solution-output'].innerHTML = html;

    // Advanced Math Renderer ile render et
    setTimeout(async () => {
        await renderMathInContainer(elements['solution-output'], false);
    }, 100);

    console.log('renderFullSolution completed with Advanced Math Renderer');
}

async function renderInteractiveSolution(solution) {
    console.log('🔄 renderInteractiveSolution starting - ENHANCED version');
    
    if (!solution || !solution.adimlar || !solution.adimlar.length) {
        console.error('❌ Interactive solution data missing or invalid');
        displayInteractiveError("İnteraktif çözüm için geçerli adım verisi bulunamadı.");
        return;
    }

    try {
        console.log('✅ Solution data validated, initializing enhanced system...');
        
        // 1. Container'ları kesinlikle açık tut
        await forceShowContainersWithRetry();
        
        // 2. İnteraktif sistemi tamamen sıfırla ve yeniden başlat
        if (window.interactiveSolutionManager) {
            window.interactiveSolutionManager.reset();
            console.log('✅ Interactive solution manager reset');
        } else {
            console.error('❌ interactiveSolutionManager bulunamadı!');
            throw new Error('İnteraktif çözüm yöneticisi bulunamadı');
        }
        
        // 3. DOM hazırlığını bekle - gelişmiş versiyon
        await waitForDOMStability();
        
        // 4. İnteraktif sistem başlatma - error handling ile
        let initResult;
        try {
            console.log('🔄 Interactive system initializing...');
            initResult = await interactiveSolutionManager.initializeInteractiveSolution(solution);
            
            if (!initResult || !initResult.success) {
                throw new Error(initResult?.message || 'Interactive system initialization failed');
            }
            
            console.log('✅ Interactive system initialized successfully:', initResult);
        } catch (initError) {
            console.error('❌ Interactive system init error:', initError);
            throw new Error(`İnteraktif sistem başlatılamadı: ${initError.message}`);
        }
        
        // 5. İlk adım seçeneklerini oluştur - gelişmiş error handling
        let firstStepData;
        try {
            console.log('🔄 Generating first step options...');
            firstStepData = await interactiveSolutionManager.generateStepOptions(0);
            
            if (!firstStepData || !firstStepData.success) {
                throw new Error(firstStepData?.message || 'First step options generation failed');
            }
            
            console.log('✅ First step options generated:', firstStepData);
        } catch (stepError) {
            console.error('❌ First step generation error:', stepError);
            throw new Error(`İlk adım seçenekleri oluşturulamadı: ${stepError.message}`);
        }
        
        // 6. DOM render - gelişmiş error handling ve retry logic
        try {
            await renderInteractiveStepWithRetry(firstStepData);
            console.log('✅ Interactive solution rendered successfully');
        } catch (renderError) {
            console.error('❌ Interactive render error:', renderError);
            throw new Error(`İnteraktif adım render edilemedi: ${renderError.message}`);
        }
        
        // 7. Final validation
        if (!validateInteractiveSystemHealth()) {
            throw new Error('İnteraktif sistem doğrulaması başarısız');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ renderInteractiveSolution comprehensive error:', error);
        displayInteractiveError(`İnteraktif çözüm başlatılamadı: ${error.message}`);
        return false;
    }
}

async function waitForDOMStability(timeout = 5000) {
    return new Promise((resolve, reject) => {
        let stabilityTimer;
        let timeoutTimer;
        let lastChange = Date.now();
        
        const checkStability = () => {
            const now = Date.now();
            if (now - lastChange >= 300) { // 300ms stability
                clearTimeout(stabilityTimer);
                clearTimeout(timeoutTimer);
                resolve();
            } else {
                stabilityTimer = setTimeout(checkStability, 100);
            }
        };
        
        const observer = new MutationObserver(() => {
            lastChange = Date.now();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
        });
        
        // Timeout protection
        timeoutTimer = setTimeout(() => {
            observer.disconnect();
            clearTimeout(stabilityTimer);
            console.warn('⚠️ DOM stability timeout - proceeding anyway');
            resolve(); // Don't reject, just proceed
        }, timeout);
        
        // Start stability check
        checkStability();
        
        // Cleanup when done
        setTimeout(() => observer.disconnect(), timeout + 1000);
    });
}

async function forceShowContainersWithRetry(maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 Container show attempt ${attempt}/${maxRetries}`);
            
            const containers = [
                { id: 'result-container', required: true },
                { id: 'solution-output', required: true }
            ];
            
            let allSuccessful = true;
            
            containers.forEach(({ id, required }) => {
                const element = document.getElementById(id);
                if (element) {
                    element.classList.remove('hidden');
                    element.style.display = 'block';
                    element.style.visibility = 'visible';
                    element.style.opacity = '1';
                    console.log(`✅ Container shown: ${id}`);
                } else if (required) {
                    console.error(`❌ Required container missing: ${id}`);
                    allSuccessful = false;
                }
            });
            
            if (allSuccessful) {
                // Doğrulama beklemesi
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Final validation
                const resultContainer = document.getElementById('result-container');
                const solutionOutput = document.getElementById('solution-output');
                
                if (resultContainer && !resultContainer.classList.contains('hidden') &&
                    solutionOutput && !solutionOutput.classList.contains('hidden')) {
                    console.log('✅ Containers successfully shown and validated');
                    return true;
                }
            }
            
            if (attempt < maxRetries) {
                console.warn(`⚠️ Container show attempt ${attempt} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 200 * attempt));
            }
            
        } catch (error) {
            console.error(`❌ Container show attempt ${attempt} error:`, error);
            if (attempt === maxRetries) throw error;
        }
    }
    
    throw new Error('Container gösterme işlemi başarısız');
}
async function renderInteractiveStepWithRetry(stepData, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 Interactive step render attempt ${attempt}/${maxRetries}`);
            
            await renderInteractiveStepSafe(stepData);
            
            // Render validation
            await new Promise(resolve => setTimeout(resolve, 200));
            
            if (validateInteractiveRender()) {
                console.log('✅ Interactive step render successful');
                return true;
            } else {
                throw new Error('Render validation failed');
            }
            
        } catch (error) {
            console.error(`❌ Render attempt ${attempt} failed:`, error);
            
            if (attempt < maxRetries) {
                // Cleanup before retry
                const solutionOutput = document.getElementById('solution-output');
                if (solutionOutput) {
                    solutionOutput.innerHTML = '';
                }
                
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
            } else {
                throw error;
            }
        }
    }
}
function validateInteractiveSystemHealth() {
    const checks = [
        {
            name: 'interactiveSolutionManager',
            test: () => window.interactiveSolutionManager && typeof window.interactiveSolutionManager.getCurrentState === 'function'
        },
        {
            name: 'result-container',
            test: () => {
                const el = document.getElementById('result-container');
                return el && !el.classList.contains('hidden');
            }
        },
        {
            name: 'solution-output',
            test: () => {
                const el = document.getElementById('solution-output');
                return el && !el.classList.contains('hidden');
            }
        },
        {
            name: 'interactive-options-container',
            test: () => {
                const el = document.getElementById('interactive-options-container');
                return el && el.children.length > 0;
            }
        }
    ];
    
    const failedChecks = checks.filter(check => {
        try {
            return !check.test();
        } catch (error) {
            console.error(`Health check error for ${check.name}:`, error);
            return true;
        }
    });
    
    if (failedChecks.length > 0) {
        console.error('❌ System health check failed:', failedChecks.map(c => c.name));
        return false;
    }
    
    console.log('✅ Interactive system health check passed');
    return true;
}

function validateInteractiveRender() {
    try {
        const requiredElements = [
            'interactive-options-container',
            'interactive-submit-btn'
        ];
        
        for (const elementId of requiredElements) {
            const element = document.getElementById(elementId);
            if (!element) {
                console.error(`❌ Render validation failed: ${elementId} missing`);
                return false;
            }
        }
        
        // Option count validation
        const optionsContainer = document.getElementById('interactive-options-container');
        const options = optionsContainer.querySelectorAll('.option-label');
        
        if (options.length === 0) {
            console.error('❌ Render validation failed: No options found');
            return false;
        }
        
        console.log(`✅ Render validation passed: ${options.length} options found`);
        return true;
        
    } catch (error) {
        console.error('❌ Render validation error:', error);
        return false;
    }
}
function setupEnhancedBackButtonHandler() {
    document.addEventListener('click', (event) => {
        if (event.target && event.target.id === 'back-to-main-menu-btn') {
            event.preventDefault();
            event.stopPropagation();
            
            console.log('🔄 Enhanced back-to-main-menu handler triggered');
            
            try {
                handleBackToMainMenu();
            } catch (error) {
                console.error('❌ Back button handler error:', error);
                handleBackButtonFallback();
            }
        }
    });
}

async function handleBackToMainMenu() {
    const currentView = stateManager ? stateManager.getStateValue('ui').view : 'unknown';
    console.log(`📍 Current view: ${currentView}`);
    
    // Show loading during transition
    showLoading("Ana menüye dönülüyor...");
    
    try {
        // View-specific cleanup
        switch (currentView) {
            case 'interactive':
                await cleanupInteractiveView();
                break;
            case 'solving':
                await cleanupSolvingView();
                break;
            case 'fullSolution':
                await cleanupFullSolutionView();
                break;
        }
        
        // State transition
        if (stateManager) {
            stateManager.setView('summary');
            console.log('✅ State transitioned to summary');
        }
        
        // Hide loading and show success
        showLoading(false);
        setTimeout(() => {
            showSuccess("Ana menüye başarıyla döndünüz.", true, 2000);
        }, 200);
        
    } catch (error) {
        console.error('❌ Back to main menu error:', error);
        showLoading(false);
        handleBackButtonFallback();
    }
}
async function cleanupSolvingView() {
    console.log('🧹 Solving view cleanup...');
    
    if (window.smartGuide) {
        window.smartGuide.reset();
        console.log('✅ Smart guide reset');
    }
    
    // Clear solving workspace
    const solvingWorkspace = document.getElementById('solving-workspace');
    if (solvingWorkspace) {
        const stepContainer = document.getElementById('step-by-step-container');
        if (stepContainer) {
            stepContainer.innerHTML = '';
        }
    }
}
async function cleanupInteractiveView() {
    console.log('🧹 Interactive view cleanup...');
    
    if (window.interactiveSolutionManager) {
        window.interactiveSolutionManager.reset();
        console.log('✅ Interactive solution manager reset');
    }
    
    clearInteractiveDOM();
    console.log('✅ Interactive DOM cleared');
}

function forceShowContainers() {
    const containers = [
        'result-container',
        'solution-output'
    ];
    
    containers.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.remove('hidden');
            element.style.display = 'block';
            element.style.visibility = 'visible';
            element.style.opacity = '1';
            console.log(`✅ Force shown: ${id}`);
        }
    });
}

async function cleanupFullSolutionView() {
    console.log('🧹 Full solution view cleanup...');
    
    const solutionOutput = document.getElementById('solution-output');
    if (solutionOutput) {
        solutionOutput.innerHTML = '';
        console.log('✅ Solution output cleared');
    }
}

function handleBackButtonFallback() {
    console.log('🔄 Back button fallback triggered');
    
    if (confirm('Bir hata oluştu. Ana menüye dönmek için sayfayı yenilemek ister misiniz?')) {
        window.location.reload();
    } else {
        // Try basic state reset
        try {
            if (window.stateManager) {
                window.stateManager.setView('setup');
            }
        } catch (fallbackError) {
            console.error('❌ Fallback also failed:', fallbackError);
        }
    }
}
// Güvenli DOM hazırlık bekleme
function waitForDOMReady() {
    return new Promise(resolve => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', resolve);
        } else {
            setTimeout(resolve, 50); // Kısa gecikme
        }
    });
}
async function renderInteractiveStepSafe(stepData) {
    console.log('🔄 Güvenli adım render başlıyor:', stepData);

    try {
        // Container kontrolü
        const solutionOutput = document.getElementById('solution-output');
        if (!solutionOutput) {
            throw new Error('solution-output container bulunamadı');
        }

        // 1. Container'ı temizle
        solutionOutput.innerHTML = '';
        await new Promise(resolve => setTimeout(resolve, 50));

        // 2. HTML oluştur
        const htmlContent = generateInteractiveHTML(stepData);

        // 3. HTML'i güvenli şekilde ekle
        solutionOutput.innerHTML = htmlContent;
        await new Promise(resolve => setTimeout(resolve, 100));

        // 4. DOM doğrulaması
        if (!validateInteractiveDOM()) {
            throw new Error('DOM doğrulaması başarısız');
        }

        // 5. Event listener'ları kur
        setupInteractiveEventListeners(stepData);

        // 6. Math render (en son)
        setTimeout(async () => {
            try {
                await renderMathInContainer(solutionOutput, false);
                console.log('✅ Math rendering tamamlandı');

                // Final doğrulama
                validateOptionsRender();
            } catch (mathError) {
                console.warn('⚠️ Math render hatası (devam edilebilir):', mathError);
            }
        }, 200);

        console.log('✅ Adım render başarıyla tamamlandı');

    } catch (error) {
        console.error('❌ Adım render hatası:', error);
        displayInteractiveError(`Render hatası: ${error.message}`);
    }
}
function generateInteractiveHTML(stepData) {
    if (!stepData || !stepData.options) {
        console.error('❌ generateInteractiveHTML: stepData eksik');
        return '<div class="p-4 text-red-600">Adım verisi eksik</div>';
    }

    const progress = (stepData.stepNumber / stepData.totalSteps) * 100;

    return `
        <div class="interactive-solution-workspace p-6 bg-white rounded-lg shadow-md">
            <!-- Header -->
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold text-gray-800">İnteraktif Çözüm</h3>
                <button id="back-to-main-menu-btn" class="btn btn-secondary">Ana Menüye Dön</button>
            </div>
            
            <!-- Progress -->
            <div class="progress-section mb-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div class="progress-info">
                        <div class="flex justify-between items-center mb-2">
                            <h4 class="text-lg font-semibold text-gray-800">Adım ${stepData.stepNumber} / ${stepData.totalSteps}</h4>
                            <span class="text-sm text-gray-500">${Math.round(progress)}% tamamlandı</span>
                        </div>
                        <div class="progress-bar bg-gray-200 h-2 rounded-full overflow-hidden">
                            <div class="progress-fill bg-blue-500 h-full transition-all duration-500" 
                                 style="width: ${progress}%"></div>
                        </div>
                    </div>
                    
                    <div class="attempt-info">
                        <div class="flex justify-between items-center mb-2">
                            <h4 class="text-lg font-semibold text-gray-800">Deneme Hakkı</h4>
                            <span class="text-sm ${stepData.remainingAttempts <= 1 ? 'text-red-500' : stepData.remainingAttempts <= 2 ? 'text-orange-500' : 'text-green-500'}">
                                ${stepData.remainingAttempts} / ${stepData.maxAttempts} kaldı
                            </span>
                        </div>
                        <div class="attempt-dots flex gap-1">
                            ${generateAttemptDots(stepData.attempts, stepData.maxAttempts)}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Step Description -->
            <div class="step-description mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 class="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <span class="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        ${stepData.stepNumber}
                    </span>
                    Bu Adımda Yapılacak:
                </h4>
                <div class="text-blue-700" id="interactive-step-desc">${escapeHtml(stepData.stepDescription)}</div>
            </div>
            
            <!-- Warning Container -->
            <div id="interactive-warning-container" class="mb-4"></div>
            
            <!-- Options -->
            <div class="options-section mb-6">
                <h4 class="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 12l2 2 4-4"/>
                        <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
                    </svg>
                    Doğru çözüm adımını seçin:
                </h4>
                <div class="options-grid space-y-3" id="interactive-options-container">
                    ${generateInteractiveOptions(stepData.options)}
                </div>
            </div>
            
            <!-- Action Buttons -->
            <div class="action-buttons flex flex-wrap gap-3 mb-4">
                <button id="interactive-submit-btn" class="btn btn-primary flex-1" disabled>
                    Seçimi Onayla
                </button>
                <button id="interactive-hint-btn" class="btn btn-secondary">
                    💡 İpucu
                </button>
            </div>
            
            <!-- Result Container -->
            <div id="interactive-result-container" class="result-section hidden mb-4"></div>
            
            <!-- Navigation -->
            <div class="navigation-section flex justify-between mt-6 pt-4 border-t">
                <div class="text-sm text-gray-500">
                    <p><strong>Kurallar:</strong></p>
                    <ul class="text-xs mt-1 space-y-1">
                        <li>• İlk adımda yanlış: Adımı tekrarlarsınız</li>
                        <li>• Diğer adımlarda yanlış: Baştan başlarsınız</li>
                        <li>• Toplam ${stepData.maxAttempts} deneme hakkınız var</li>
                    </ul>
                </div>
                <div class="flex gap-2">
                    <button id="interactive-reset-btn" class="btn btn-tertiary text-sm">
                        🔄 Baştan Başla
                    </button>
                </div>
            </div>
        </div>
    `;
}

function generateAttemptDots(attempts, maxAttempts) {
    return Array.from({ length: maxAttempts }, (_, i) => `
        <div class="w-3 h-3 rounded-full ${i < attempts ? 'bg-red-400' : 'bg-gray-200'
        }"></div>
    `).join('');
}

function generateInteractiveOptions(options) {
    if (!Array.isArray(options) || options.length === 0) {
        console.error('❌ generateInteractiveOptions: Geçersiz options');
        return '<div class="text-red-600 p-4">Seçenekler yüklenemedi</div>';
    }

    console.log('🔄 Seçenekler oluşturuluyor:', options);

    return options.map((option, index) => {
        // displayId doğrulama
        const displayId = option.displayId !== undefined ? option.displayId : index;
        const optionLetter = String.fromCharCode(65 + index); // A, B, C...

        console.log(`📝 Seçenek ${index}: displayId=${displayId}, letter=${optionLetter}`);

        return `
            <label class="option-label flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-all duration-200" 
                   data-option-id="${displayId}">
                <input type="radio" 
                       name="interactive-step-options" 
                       value="${displayId}" 
                       class="sr-only option-radio">
                <div class="option-letter w-8 h-8 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center font-bold text-sm mr-3 mt-0.5">
                    ${optionLetter}
                </div>
                <div class="option-content flex-1">
                    <div class="text-gray-800 font-medium option-text" id="option-text-${displayId}">
                        ${escapeHtml(option.text || 'Seçenek metni eksik')}
                    </div>
                    ${option.latex ? `
                        <div class="text-sm text-gray-600 mt-1 option-latex" id="option-latex-${displayId}">
                            ${escapeHtml(option.latex)}
                        </div>
                    ` : ''}
                </div>
            </label>
        `;
    }).join('');
}

function validateInteractiveDOM() {
    const requiredElements = [
        'interactive-options-container',
        'interactive-submit-btn',
        'interactive-result-container'
    ];

    for (const elementId of requiredElements) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`❌ DOM doğrulaması başarısız: ${elementId} bulunamadı`);
            return false;
        }
    }

    // Seçenek sayısını kontrol et
    const optionsContainer = document.getElementById('interactive-options-container');
    const optionLabels = optionsContainer.querySelectorAll('.option-label');

    if (optionLabels.length === 0) {
        console.error('❌ DOM doğrulaması başarısız: Hiç seçenek bulunamadı');
        return false;
    }

    console.log(`✅ DOM doğrulaması başarılı: ${optionLabels.length} seçenek bulundu`);
    return true;
}

function validateOptionsRender() {
    const optionsContainer = document.getElementById('interactive-options-container');
    if (!optionsContainer) {
        console.error('❌ Options container bulunamadı');
        return false;
    }

    const optionLabels = optionsContainer.querySelectorAll('.option-label');
    console.log(`🔍 Render doğrulaması: ${optionLabels.length} seçenek render edildi`);

    // Her seçeneği kontrol et
    optionLabels.forEach((label, index) => {
        const optionId = label.dataset.optionId;
        const radio = label.querySelector('input[type="radio"]');
        const text = label.querySelector('.option-text');

        console.log(`🔍 Seçenek ${index}: ID=${optionId}, Radio=${!!radio}, Text=${!!text}`);
    });

    return optionLabels.length > 0;
}
function setupInteractiveEventListeners(stepData) {
    console.log('🔄 Event listener\'lar kuruluyor...');

    try {
        // Submit butonu
        const submitBtn = document.getElementById('interactive-submit-btn');
        if (submitBtn) {
            // Eski listener'ları temizle
            submitBtn.replaceWith(submitBtn.cloneNode(true));
            const newSubmitBtn = document.getElementById('interactive-submit-btn');

            newSubmitBtn.addEventListener('click', handleInteractiveSubmissionSafe);
            console.log('✅ Submit button listener kuruldu');
        }

        // Radio button'lar - DELEGATION İLE
        const optionsContainer = document.getElementById('interactive-options-container');
        if (optionsContainer) {
            // Eski listener'ları temizle
            optionsContainer.replaceWith(optionsContainer.cloneNode(true));
            const newOptionsContainer = document.getElementById('interactive-options-container');

            newOptionsContainer.addEventListener('change', function (event) {
                if (event.target.type === 'radio') {
                    handleOptionSelection(event);
                }
            });
            console.log('✅ Radio button listeners kuruldu (delegation)');
        }

        // Diğer butonlar
        setupOtherInteractiveButtons();

        console.log('✅ Tüm event listener\'lar başarıyla kuruldu');

    } catch (error) {
        console.error('❌ Event listener kurulum hatası:', error);
    }
}

function handleOptionSelection(event) {
    const selectedValue = event.target.value;
    const submitBtn = document.getElementById('interactive-submit-btn');

    console.log(`📝 Seçenek seçildi: ${selectedValue}`);

    // Submit butonunu aktif et
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Seçimi Onayla';
    }

    // Görsel feedback
    const optionLabels = document.querySelectorAll('.option-label');
    optionLabels.forEach(label => {
        label.classList.remove('border-blue-500', 'bg-blue-50');
    });

    const selectedLabel = event.target.closest('.option-label');
    if (selectedLabel) {
        selectedLabel.classList.add('border-blue-500', 'bg-blue-50');
    }
}

function setupOtherInteractiveButtons() {
    // Hint button
    const hintBtn = document.getElementById('interactive-hint-btn');
    if (hintBtn) {
        hintBtn.replaceWith(hintBtn.cloneNode(true));
        const newHintBtn = document.getElementById('interactive-hint-btn');
        newHintBtn.addEventListener('click', () => {
            const hint = interactiveSolutionManager.getHint();
            if (hint) {
                showInteractiveHint(hint);
            }
        });
    }

    // Reset button
    const resetBtn = document.getElementById('interactive-reset-btn');
    if (resetBtn) {
        resetBtn.replaceWith(resetBtn.cloneNode(true));
        const newResetBtn = document.getElementById('interactive-reset-btn');
        newResetBtn.addEventListener('click', () => {
            if (confirm('Baştan başlamak istediğinizden emin misiniz?')) {
                handleInteractiveReset();
            }
        });
    }

    // ✅ DÜZELTME: Back to main menu button - Daha güvenli event binding
    const backBtn = document.getElementById('back-to-main-menu-btn');
    if (backBtn) {
        // Eski listener'ları temizle
        backBtn.replaceWith(backBtn.cloneNode(true));
        const newBackBtn = document.getElementById('back-to-main-menu-btn');
        
        newBackBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🔄 Ana menüye dön butonuna basıldı - interaktif çözümden');
            
            try {
                // 1. İnteraktif sistemi tamamen sıfırla
                interactiveSolutionManager.reset();
                console.log('✅ Interactive solution manager reset');
                
                // 2. Containers'ı temizle ve gizle
                clearInteractiveDOM();
                console.log('✅ Interactive DOM cleared');
                
                // 3. State'i summary'ye çevir (güvenli şekilde)
                if (window.stateManager) {
                    window.stateManager.setView('summary');
                    console.log('✅ State set to summary');
                } else {
                    console.error('❌ stateManager bulunamadı!');
                }
                
                // 4. Success mesajı göster
                setTimeout(() => {
                    if (window.showSuccess) {
                        window.showSuccess("Ana menüye başarıyla döndünüz.", true, 2000);
                    }
                }, 300);
                
            } catch (error) {
                console.error('❌ Ana menüye dönüş hatası:', error);
                
                // Fallback: Sayfa yenile
                if (confirm('Bir hata oluştu. Sayfayı yenilemek ister misiniz?')) {
                    window.location.reload();
                }
            }
        });
        
        console.log('✅ Back to main menu button listener kuruldu');
    } else {
        console.warn('⚠️ back-to-main-menu-btn bulunamadı');
    }
}

function handleInteractiveReset() {
    console.log('🔄 İnteraktif sistem sıfırlanıyor...');

    interactiveSolutionManager.reset();

    if (window.stateManager) {
        window.stateManager.setView('setup');
    }

    // Success mesajı
    setTimeout(() => {
        if (window.showSuccess) {
            window.showSuccess("Yeni soru yükleyerek tekrar deneyebilirsiniz.", false);
        }
    }, 500);
}

// Hata gösterimi
function displayInteractiveError(message) {
    const solutionOutput = document.getElementById('solution-output');
    if (!solutionOutput) return;

    solutionOutput.innerHTML = `
        <div class="p-4 bg-red-50 text-red-700 rounded-lg">
            <h4 class="font-bold mb-2">İnteraktif Çözüm Hatası</h4>
            <p>${escapeHtml(message)}</p>
            <button id="back-to-main-menu-btn" class="btn btn-secondary mt-4">Ana Menüye Dön</button>
        </div>
    `;

    // Back button için listener
    const backBtn = document.getElementById('back-to-main-menu-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (window.stateManager) {
                window.stateManager.setView('summary');
            }
        });
    }
}

// Güvenli hint gösterimi
function showInteractiveHint(hint) {
    const resultContainer = document.getElementById('interactive-result-container');
    if (!resultContainer) return;

    resultContainer.innerHTML = `
        <div class="hint-message p-4 rounded-lg bg-yellow-100 border border-yellow-300">
            <div class="flex items-center gap-3">
                <div class="text-2xl">💡</div>
                <div class="flex-1">
                    <h4 class="font-semibold text-yellow-800 mb-1">İpucu</h4>
                    <p class="text-yellow-700 text-sm">${escapeHtml(hint.hint)}</p>
                </div>
            </div>
        </div>
    `;

    resultContainer.classList.remove('hidden');

    // 5 saniye sonra gizle
    setTimeout(() => {
        resultContainer.classList.add('hidden');
        resultContainer.innerHTML = '';
    }, 5000);
}

// HTML escape helper
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


async function handleInteractiveSubmissionSafe() {
    console.log('🔄 Güvenli submission başlıyor...');
    
    try {
        // Seçilen option'ı bul
        const selectedRadio = document.querySelector('input[name="interactive-step-options"]:checked');
        if (!selectedRadio) {
            showError("Lütfen bir seçenek seçin.", false);
            return;
        }
        
        const selectedOptionId = parseInt(selectedRadio.value);
        console.log(`📝 Seçilen option ID: ${selectedOptionId}`);
        
        // UI'yi devre dışı bırak
        disableInteractiveUI();
        
        // Değerlendirme yap
        const result = interactiveSolutionManager.evaluateSelection(selectedOptionId);
        
        console.log('🎯 Evaluation result:', result);
        
        if (!result || result.error) {
            console.error('❌ Değerlendirme hatası:', result);
            
            // ✅ KRITIK FIX: Reset koşullarını netleştir
            if (result && (result.forceReset || result.shouldResetToSetup || result.totalAttemptsExceeded)) {
                console.log('🔄 ZORUNLU RESET BAŞLATILIYOR...');
                
                // Güvenli ve garantili reset işlemi
                await handleInteractiveForceReset(result.error || result.message);
                return;
            } else {
                showError(result?.error || "Değerlendirme sırasında hata oluştu", false);
                enableInteractiveUI();
            }
            return;
        }
        
        // Sonucu göster
        await displayInteractiveResultSafe(result);
        
        // Sonraki adıma geçiş
        setTimeout(async () => {
            if (result.isCorrect) {
                if (result.isCompleted) {
                    await displayInteractiveCompletion(result.completionStats);
                } else if (result.nextStep) {
                    await renderInteractiveStepSafe(result.nextStep);
                }
            } else {
                // ✅ KRITIK FIX: Yanlış cevap sonrası kontrol
                if (result.forceReset || result.shouldResetToSetup || result.totalAttemptsExceeded) {
                    console.log('🔄 YANLIŞ CEVAP + ZORUNLU RESET BAŞLATILIYOR...');
                    await handleInteractiveForceReset(result.message);
                } else if (result.nextStep) {
                    await renderInteractiveStepSafe(result.nextStep);
                }
            }
        }, 3000);
        
    } catch (error) {
        console.error('❌ Submission handler hatası:', error);
        showError("İşlem sırasında beklenmeyen bir hata oluştu", false);
        enableInteractiveUI();
    }
}
async function handleInteractiveForceReset(message) {
    console.log('🔄 ZORUNLU RESET BAŞLATILIYOR...', message);
    
    try {
        // 1. Kullanıcıya bilgi mesajı göster (engellemeyen)
        showResetNotification(message);
        
        // 2. Kısa bekleme (kullanıcının görmesi için)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 3. İnteraktif sistemi tamamen sıfırla
        interactiveSolutionManager.reset();
        console.log('✅ InteractiveSolutionManager reset');
        
        // 4. DOM'u temizle
        clearInteractiveDOM();
        console.log('✅ DOM cleared');
        
        // 5. State'i güvenli şekilde setup'a çevir
        if (window.stateManager) {
            // Sadece view değiştir, problem verilerini koru
            window.stateManager.setView('setup');
            console.log('✅ State set to setup');
        }
        
        // 6. Input alanlarını temizle
        setTimeout(() => {
            clearInputAreas();
            console.log('✅ Input areas cleared');
        }, 200);
        
        // 7. Container'ları gizle
        setTimeout(() => {
            hideInteractiveContainers();
            console.log('✅ Containers hidden');
        }, 300);
        
        // 8. Son kullanıcı bildirimi
        setTimeout(() => {
            if (window.showSuccess) {
                window.showSuccess(
                    "Yeni soru yükleyerek tekrar deneyebilirsiniz.", 
                    false
                );
            }
            console.log('✅ Final user notification shown');
        }, 1000);
        
        console.log('✅ ZORUNLU RESET BAŞARIYLA TAMAMLANDI');
        
    } catch (error) {
        console.error('❌ Force reset error:', error);
        
        // Fallback: Sayfa yenileme (son çare)
        if (confirm('Sistem sıfırlanırken bir hata oluştu. Sayfayı yenilemek ister misiniz?')) {
            window.location.reload();
        }
    }
}
function clearInteractiveDOM() {
    console.log('🧹 Interaktif DOM temizleniyor...');
    
    // Solution output'u tamamen temizle
    const solutionOutput = document.getElementById('solution-output');
    if (solutionOutput) {
        solutionOutput.innerHTML = '';
        solutionOutput.classList.add('hidden');
        console.log('✅ Solution output cleared');
    }
    
    // Result container'ı gizle
    const resultContainer = document.getElementById('result-container');
    if (resultContainer) {
        resultContainer.classList.add('hidden');
        resultContainer.style.display = 'none';
        console.log('✅ Result container hidden');
    }
    
    // Status message'ı temizle
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
        statusMessage.innerHTML = '';
        console.log('✅ Status message cleared');
    }
    
    // Interactive specific containers
    const interactiveContainers = [
        'interactive-options-container',
        'interactive-result-container',
        'interactive-warning-container'
    ];
    
    interactiveContainers.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = '';
            element.classList.add('hidden');
        }
    });
    
    console.log('✅ Tüm interaktif DOM elementleri temizlendi');
}
function showResetNotification(message) {
    const notification = document.createElement('div');
    notification.id = 'reset-notification';
    notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
    notification.innerHTML = `
        <div class="flex items-center gap-3">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
            <div>
                <div class="font-semibold">Deneme Hakları Bitti</div>
                <div class="text-sm opacity-90">${message || 'Soru yükleme ekranına yönlendiriliyorsunuz...'}</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // 5 saniye sonra kaldır
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

function handleInteractiveResetToSetup(message) {
    console.log('🔄 Setup\'a reset başlıyor...', message);
    
    // 1. İnteraktif sistemi sıfırla
    interactiveSolutionManager.reset();
    
    // 2. State'i sıfırla (problem'i koru, sadece view değiştir)
    if (window.stateManager) {
        // Problem verilerini koruyarak sadece view değiştir
        window.stateManager.setView('setup');
        console.log('✅ State manager - view set to setup');
    } else {
        console.error('❌ stateManager bulunamadı!');
    }
    
    // 3. Input alanlarını temizle
    setTimeout(() => {
        clearInputAreas();
        console.log('✅ Input areas cleared');
    }, 100);
    
    // 4. Kullanıcıya bilgi ver
    setTimeout(() => {
        if (window.showSuccess) {
            window.showSuccess(
                message || "Deneme haklarınız bitti. Yeni soru yükleyerek tekrar deneyebilirsiniz.", 
                false
            );
        }
        console.log('✅ User notification shown');
    }, 500);
    
    console.log('✅ Setup reset tamamlandı');
}


function disableInteractiveUI() {
    const submitBtn = document.getElementById('interactive-submit-btn');
    const optionLabels = document.querySelectorAll('.option-label');

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Kontrol ediliyor...
        `;
    }

    optionLabels.forEach(label => {
        label.style.pointerEvents = 'none';
        label.style.opacity = '0.7';
    });
}

// UI'yi tekrar aktif et
function enableInteractiveUI() {
    const submitBtn = document.getElementById('interactive-submit-btn');
    const optionLabels = document.querySelectorAll('.option-label');

    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Seçimi Onayla';
    }

    optionLabels.forEach(label => {
        label.style.pointerEvents = 'auto';
        label.style.opacity = '1';
    });
}
async function displayInteractiveResultSafe(result) {
    const resultContainer = document.getElementById('interactive-result-container');
    if (!resultContainer) {
        console.error('❌ Result container bulunamadı');
        return;
    }

    // Seçenekleri renklendir
    highlightInteractiveOptionsSafe(result);

    // Sonuç mesajı oluştur
    const resultHTML = generateResultHTML(result);

    resultContainer.innerHTML = resultHTML;
    resultContainer.classList.remove('hidden');

    console.log('✅ Sonuç güvenli şekilde gösterildi');
}

function highlightInteractiveOptionsSafe(result) {
    const optionLabels = document.querySelectorAll('.option-label');

    optionLabels.forEach(label => {
        const optionId = parseInt(label.dataset.optionId);

        // Tüm vurguları temizle
        label.classList.remove('border-green-500', 'bg-green-50', 'border-red-500', 'bg-red-50');

        if (optionId === result.selectedOption.displayId) {
            // Seçilen seçenek
            if (result.isCorrect) {
                label.classList.add('border-green-500', 'bg-green-50');
            } else {
                label.classList.add('border-red-500', 'bg-red-50');
            }
        } else if (result.correctOption && optionId === result.correctOption.displayId) {
            // Doğru seçenek (yanlış seçim yapıldıysa göster)
            if (!result.isCorrect) {
                label.classList.add('border-green-500', 'bg-green-50');

                // Doğru cevap etiketi ekle
                if (!label.querySelector('.correct-label')) {
                    const correctLabel = document.createElement('div');
                    correctLabel.className = 'correct-label absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold';
                    correctLabel.textContent = 'DOĞRU';
                    label.style.position = 'relative';
                    label.appendChild(correctLabel);
                }
            }
        }
    });
}

function generateResultHTML(result) {
    if (result.isCorrect) {
        return `
            <div class="result-message success p-4 rounded-lg bg-green-100 border border-green-300">
                <div class="flex items-center gap-3">
                    <div class="text-3xl">✅</div>
                    <div class="flex-1">
                        <h4 class="font-semibold text-green-800 mb-1">Doğru!</h4>
                        <p class="text-green-700 text-sm">${escapeHtml(result.explanation)}</p>
                        
                        ${result.isCompleted ? `
                            <div class="mt-3 p-3 bg-green-50 rounded border border-green-200">
                                <h5 class="font-semibold text-green-800 mb-2">🎉 Tebrikler! Tüm adımları tamamladınız!</h5>
                            </div>
                        ` : `
                            <p class="text-green-600 text-sm mt-2">
                                <strong>Sonraki adıma geçiliyor...</strong> (${result.currentStep}/${result.totalSteps})
                            </p>
                        `}
                    </div>
                </div>
            </div>
        `;
    } else {
        const isLastAttempt = result.shouldResetToSetup || result.remainingAttempts <= 0;
        const bgClass = isLastAttempt ? 'bg-red-100 border-red-300' : 'bg-orange-100 border-orange-300';
        const textClass = isLastAttempt ? 'text-red-800' : 'text-orange-800';

        return `
            <div class="result-message error p-4 rounded-lg ${bgClass} border">
                <div class="flex items-center gap-3">
                    <div class="text-3xl">${isLastAttempt ? '❌' : '⚠️'}</div>
                    <div class="flex-1">
                        <h4 class="font-semibold ${textClass} mb-1">
                            ${isLastAttempt ? 'Deneme Hakkınız Bitti!' : 'Yanlış Seçim'}
                        </h4>
                        <p class="${textClass} text-sm mb-2">${escapeHtml(result.explanation)}</p>
                        
                        <div class="mt-2">
                            <p class="text-sm ${textClass}">
                                <strong>Kalan Hak:</strong> ${result.remainingAttempts}
                            </p>
                        </div>
                        
                        ${isLastAttempt ? `
                            <div class="mt-3 p-3 bg-red-50 rounded border border-red-200">
                                <p class="text-red-700 text-sm font-medium">
                                    Tüm deneme haklarınız bitti. Ana menüye yönlendiriliyorsunuz...
                                </p>
                            </div>
                        ` : `
                            <div class="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                                <p class="text-blue-700 text-sm">
                                    ${result.restartCurrentStep ?
                '🔄 Bu adımı tekrar çözeceksiniz.' :
                '🔄 Baştan başlayacaksınız.'
            }
                                </p>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }
}







async function displayInteractiveCompletion(completionStats) {
    const container = elements['solution-output'];

    if (!container) return;

    // Performans mesajı
    let performanceMessage = '';
    let performanceColor = 'text-green-600';

    switch (completionStats.performance) {
        case 'excellent':
            performanceMessage = '🏆 Mükemmel performans! Çok az hatayla tamamladınız.';
            performanceColor = 'text-green-600';
            break;
        case 'good':
            performanceMessage = '👍 İyi performans! Başarıyla tamamladınız.';
            performanceColor = 'text-blue-600';
            break;
        case 'average':
            performanceMessage = '📚 Ortalama performans. Pratik yaparak gelişebilirsiniz.';
            performanceColor = 'text-yellow-600';
            break;
        case 'needs_improvement':
            performanceMessage = '💪 Daha fazla pratik yaparak gelişebilirsiniz.';
            performanceColor = 'text-orange-600';
            break;
    }

    container.innerHTML = `
        <div class="interactive-completion text-center p-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
            <div class="completion-icon text-6xl mb-4">🎉</div>
            <h3 class="text-2xl font-bold text-green-800 mb-2">İnteraktif Çözüm Tamamlandı!</h3>
            <p class="text-gray-700 mb-6">Tüm adımları başarıyla çözdünüz!</p>
            
            <!-- PERFORMANS BİLGİLERİ -->
            <div class="performance-stats mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="stat-card p-4 bg-white rounded-lg border border-gray-200">
                    <div class="stat-number text-2xl font-bold text-blue-600">${completionStats.totalSteps}</div>
                    <div class="stat-label text-sm text-gray-600">Toplam Adım</div>
                </div>
                <div class="stat-card p-4 bg-white rounded-lg border border-gray-200">
                    <div class="stat-number text-2xl font-bold ${completionStats.totalAttempts <= completionStats.totalSteps + 2 ? 'text-green-600' : 'text-orange-600'}">${completionStats.totalAttempts}</div>
                    <div class="stat-label text-sm text-gray-600">Toplam Deneme</div>
                </div>
                <div class="stat-card p-4 bg-white rounded-lg border border-gray-200">
                    <div class="stat-number text-2xl font-bold ${completionStats.successRate >= 80 ? 'text-green-600' : 'text-yellow-600'}">%${Math.round(completionStats.successRate)}</div>
                    <div class="stat-label text-sm text-gray-600">Başarı Oranı</div>
                </div>
                <div class="stat-card p-4 bg-white rounded-lg border border-gray-200">
                    <div class="stat-number text-2xl font-bold text-purple-600">${completionStats.totalTimeFormatted}</div>
                    <div class="stat-label text-sm text-gray-600">Toplam Süre</div>
                </div>
            </div>
            
            <!-- PERFORMANS DEĞERLENDİRMESİ -->
            <div class="performance-evaluation mb-6 p-4 bg-white rounded-lg border border-gray-200">
                <h4 class="font-semibold text-gray-800 mb-2">Performans Değerlendirmesi</h4>
                <p class="font-medium ${performanceColor}">${performanceMessage}</p>
                
                ${completionStats.performance !== 'excellent' ? `
                    <div class="improvement-tips mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                        <h5 class="font-medium text-blue-800 mb-2">📈 Gelişim Önerileri:</h5>
                        <ul class="text-sm text-blue-700 space-y-1">
                            ${completionStats.successRate < 80 ? '<li>• Seçenekleri daha dikkatli okuyun</li>' : ''}
                            ${completionStats.totalAttempts > completionStats.totalSteps + 3 ? '<li>• İlk denemede doğru cevap vermeye odaklanın</li>' : ''}
                            <li>• Matematik adımlarını mantıklı sırayla düşünün</li>
                            <li>• Pratik yaparak hızınızı artırın</li>
                        </ul>
                    </div>
                ` : `
                    <div class="excellence-message mt-3 p-3 bg-green-50 rounded border border-green-200">
                        <p class="text-green-700 text-sm">
                            🌟 Mükemmel çalışma! Matematik problemlerini çözmede çok iyisiniz.
                        </p>
                    </div>
                `}
            </div>
            
            <!-- AKSİYON BUTONLARI -->
            <div class="action-buttons space-y-3">
                <button id="interactive-new-problem-btn" class="btn btn-primary w-full">
                    🎯 Yeni Problem Çöz
                </button>
                <button id="interactive-review-solution-btn" class="btn btn-secondary w-full">
                    📋 Tam Çözümü Gözden Geçir
                </button>
                <button id="interactive-try-step-by-step-btn" class="btn btn-tertiary w-full">
                    📝 Adım Adım Çözümü Dene
                </button>
                <button id="back-to-main-menu-btn" class="btn btn-quaternary w-full">
                    🏠 Ana Menüye Dön
                </button>
            </div>
        </div>
    `;

    // Event listener'ları ekle
    setupInteractiveCompletionListeners();

    // Math render
    setTimeout(async () => {
        await renderMathInContainer(container, false);
    }, 50);
}

function setupInteractiveCompletionListeners() {
    const newProblemBtn = document.getElementById('interactive-new-problem-btn');
    const reviewSolutionBtn = document.getElementById('interactive-review-solution-btn');
    const stepByStepBtn = document.getElementById('interactive-try-step-by-step-btn');
    const backBtn = document.getElementById('back-to-main-menu-btn');

    if (newProblemBtn) {
        newProblemBtn.addEventListener('click', () => {
            interactiveSolutionManager.reset();
            stateManager.reset();
            stateManager.setView('setup');
        });
    }

    if (reviewSolutionBtn) {
        reviewSolutionBtn.addEventListener('click', () => {
            interactiveSolutionManager.reset();
            stateManager.setView('fullSolution');
        });
    }

    if (stepByStepBtn) {
        stepByStepBtn.addEventListener('click', () => {
            interactiveSolutionManager.reset();
            stateManager.setView('solving');
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            interactiveSolutionManager.reset();
            stateManager.setView('summary');
        });
    }
}







// Global fonksiyonlar
window.makeApiCall = makeApiCall;
window.showError = showError;
window.showSuccess = showSuccess;
window.showLoading = showLoading;
window.stateManager = stateManager;
window.renderMath = renderMath;
window.enhancedMathRenderer = enhancedMathRenderer; // ✅ Enhanced renderer export
window.smartGuide = smartGuide;
window.interactiveSolutionManager = interactiveSolutionManager;

window.renderInteractiveSolution = renderInteractiveSolution;
window.handleInteractiveSubmissionSafe = handleInteractiveSubmissionSafe;
window.setupInteractiveEventListeners = setupInteractiveEventListeners;
window.forceShowContainers = forceShowContainers;
window.handleInteractiveResetToSetup = handleInteractiveResetToSetup;
window.clearInputAreas = clearInputAreas;
window.showInViewNotification = showInViewNotification;
// index.js dosyasının sonuna bu debug fonksiyonlarını ekleyin

// ✅ DEBUG FONKSİYONLARI
window.debugInteractive = function() {
    console.group('🔍 Interactive Debug Info');
    
    // State kontrolü
    console.log('📊 Current State:');
    if (window.stateManager) {
        const state = window.stateManager.getStateValue('ui');
        console.log('  - View:', state.view);
        console.log('  - Loading:', state.isLoading);
        console.log('  - Error:', state.error);
    } else {
        console.log('  ❌ stateManager not found');
    }
    
    // DOM elementleri kontrolü
    console.log('🏗️ DOM Elements:');
    const elements = [
        'result-container',
        'solution-output',
        'back-to-main-menu-btn',
        'interactive-options-container'
    ];
    
    elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            console.log(`  - ${id}:`, {
                exists: true,
                hidden: el.classList.contains('hidden'),
                display: el.style.display,
                innerHTML: el.innerHTML.length + ' chars'
            });
        } else {
            console.log(`  - ${id}: ❌ Not found`);
        }
    });
    
    // Interactive manager durumu
    console.log('🎯 Interactive Manager:');
    if (window.interactiveSolutionManager) {
        console.log('  - Exists: ✅');
        console.log('  - State:', window.interactiveSolutionManager.getCurrentState?.());
    } else {
        console.log('  - Exists: ❌');
    }
    
    console.groupEnd();
};

// ✅ FORCE RESET FONKSİYONU
window.forceResetToSummary = function() {
    console.log('🔄 Force reset to summary başlıyor...');
    
    try {
        // 1. Tüm manager'ları sıfırla
        if (window.interactiveSolutionManager) {
            window.interactiveSolutionManager.reset();
            console.log('✅ Interactive manager reset');
        }
        
        if (window.smartGuide) {
            window.smartGuide.reset();
            console.log('✅ Smart guide reset');
        }
        
        // 2. DOM'u temizle
        clearInteractiveDOM();
        console.log('✅ DOM cleared');
        
        // 3. State'i zorla değiştir
        if (window.stateManager) {
            window.stateManager.setView('summary');
            console.log('✅ State forced to summary');
        }
        
        // 4. Success mesajı
        setTimeout(() => {
            if (window.showSuccess) {
                window.showSuccess("Zorla ana menüye döndürüldü.", true, 3000);
            }
        }, 500);
        
        console.log('✅ Force reset completed');
        
    } catch (error) {
        console.error('❌ Force reset error:', error);
    }
};

// ✅ Konsol komutları bilgisi
console.log(`
🔧 Debug Komutları:
- debugInteractive() : Mevcut durumu kontrol et
- forceResetToSummary() : Zorla ana menüye dön
- clearInteractiveDOM() : DOM'u temizle
`);
// --- EXPORTS ---
export { canvasManager, errorHandler, stateManager, smartGuide, enhancedMathRenderer };