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
    showAnimatedLoading 
} from '../modules/ui.js';
import { OptimizedCanvasManager } from '../modules/canvasManager.js';
import { AdvancedErrorHandler } from '../modules/errorHandler.js';
import { StateManager } from '../modules/stateManager.js';
import { smartGuide } from '../modules/smartGuide.js';
import { advancedMathRenderer } from '../modules/advancedMathRenderer.js';
import { mathSymbolPanel } from '../modules/mathSymbolPanel.js';
import { interactiveSolutionManager } from '../modules/interactiveSolutionManager.js';




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

const masterSolutionPrompt = `MATEMATIK PROBLEM ÇÖZÜCÜ - KATKI KURALLARI

🚨 KRİTİK TALİMATLAR - MUTLAKA TAKİP ET:

1. YANIT FORMATI GEREKSİNİMLERİ:
   - Yanıt SADECE geçerli JSON olmalı
   - JSON'dan önce veya sonra ASLA ekstra metin yazma
   - Tüm string'ler için çift tırnak kullan
   - Sondaki virgülleri kaldır
   - Karakter kaçışlarını doğru yap (\\n, \\", \\\\)

2. ALAN ÖZEL KURALLARI - MUTLAKA UYULACAK:
   
   adimAciklamasi alanı için:
   ✅ SADECE Türkçe metin: "Verilen değerleri yerine koy"
   ❌ YASAK: √, ∫, ∑, π, α, β, θ, ≤, ≥, ≠, ±, $, $$, \\(, \\), \\[, \\]
   ❌ YASAK: \\frac, \\sqrt, \\sum, \\int, herhangi bir LaTeX komut
   
   ipucu alanı için:
   ✅ SADECE Türkçe metin: "Bu adımda işlem sırasına dikkat et"
   ❌ YASAK: Tüm matematik sembolleri ve LaTeX komutları
   
   cozum_lateks alanı için:
   ✅ SADECE LaTeX: "$$x = \\frac{a + b}{c}$$"
   ✅ MUTLAKA $$ ile başla ve bitir
   ❌ YASAK: Türkçe kelimeler bu alanda

3. ZORUNLU DOĞRULAMA KELİMELERİ:
   - Türkçe alanlarda kullan: "hesapla", "bul", "belirle", "çöz", "yerine koy"
   - Matematik sembolleri yerine kelime kullan: "karekök" (√ değil), "pi sayısı" (π değil)

4. ÖRNEK DOĞRU FORMAT:
   ✅ "adimAciklamasi": "Denklemin sol tarafındaki değerleri topla"
   ❌ "adimAciklamasi": "x + y = 5 denklemini çöz"
   
   ✅ "cozum_lateks": "$$x + y = 5$$"
   ❌ "cozum_lateks": "x + y = 5"

5. JSON ŞEMA GEREKSİNİMLERİ:
   - problemOzeti, adimlar ve tamCozumLateks alanları MUTLAKA olmalı
   - adimlar array'i boş olmamalı
   - Her adımda adimAciklamasi ve cozum_lateks MUTLAKA olmalı

INTELLIGENT STEP CREATION RULES:
- Analyze the problem complexity and create appropriate number of steps
- Simple concept questions (like "which is irrational?"): 1-2 steps maximum
- Multiple choice questions: Focus on the logical reasoning, not checking each option separately
- Calculation problems: Break into natural mathematical steps
- Complex proofs: More detailed steps are acceptable

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


// --- Global DOM Önbelleği ---
const elements = {};

// --- UYGULAMA BAŞLANGIÇ NOKTASI ---
window.addEventListener('load', () => {
    AuthManager.initProtectedPage(initializeApp);
});

async function initializeApp(userData) {
    if (userData) {
        // Render sisteminin hazır olmasını bekle
        showLoading("Matematik render sistemi başlatılıyor...");
        await waitForRenderSystem();
        
        cacheDOMElements();
        setupEventListeners();
        stateManager.subscribe(renderApp);
        stateManager.setUser(userData);
        
        // Akıllı Rehber sistemini başlat
        smartGuide.setCanvasManager(canvasManager);
        
        showLoading(false);
        console.log('Uygulama başarıyla başlatıldı - Advanced Math Renderer hazır');
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

        showLoading("İnteraktif çözüm başlatılıyor...");
        
        await smartGuide.initializeGuidance(solutionData);
        stateManager.setView('solving');
        
        showSuccess("İnteraktif çözüm hazır! Adım adım çözüme başlayabilirsiniz.");
        
    } catch (error) {
        errorHandler.handleError(error, { 
            operation: 'initializeSmartGuide',
            fallbackMessage: 'İnteraktif çözüm başlatılamadı'
        });
        showError("İnteraktif çözüm başlatılırken bir hata oluştu. Lütfen tekrar deneyin.", false);
    } finally {
        showLoading(false);
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
                                ${Array.from({length: 3}, (_, i) => `
                                    <div class="w-2 h-2 rounded-full ${
                                        i < attempts ? 
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
    
    switch(learningReport.performance) {
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

    // DÜZELTME 1: Tüm view containerlarını doğru şekilde kontrol et
    elements['question-setup-area'].classList.toggle('hidden', !isVisible('setup'));
    elements['question-setup-area'].classList.toggle('disabled-area', !isVisible('setup'));
    
    // DÜZELTME 2: result-container'ı sadece gerekli view'larda göster
    const resultContainer = elements['result-container'];
    const solutionOutput = elements['solution-output'];
    
    if (isVisible('interactive')) {
        // İnteraktif view için özel ayarlar
        resultContainer.classList.remove('hidden');
        solutionOutput.classList.remove('hidden');
        
        // Diğer containerları gizle
        elements['solving-workspace'].classList.add('hidden');
        
    } else if (isVisible('fullSolution')) {
        // Tam çözüm view için
        resultContainer.classList.remove('hidden');
        solutionOutput.classList.remove('hidden');
        elements['solving-workspace'].classList.add('hidden');
        
    } else if (isVisible('solving')) {
        // Smart guide view için
        resultContainer.classList.add('hidden');
        solutionOutput.classList.add('hidden');
        elements['solving-workspace'].classList.remove('hidden');
        
    } else {
        // Diğer view'lar için gizle
        resultContainer.classList.add('hidden');
        solutionOutput.classList.add('hidden');
        elements['solving-workspace'].classList.add('hidden');
    }
    
    // Question summary ve action buttons kontrolü
    if (isVisible('setup')) {
        elements['question-summary-container'].classList.add('hidden');
        elements['top-action-buttons'].classList.add('hidden');
    } else {
        elements['question-summary-container'].classList.toggle('hidden', !problem.solution);
        elements['top-action-buttons'].classList.toggle('hidden', !isVisible('summary'));
    }
    
    // Go back button kontrolü
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
        console.log('Rendering full solution view with Advanced Math Renderer');
        await renderFullSolution(problem.solution);
        
    } else if (isVisible('interactive')) {
        console.log('Rendering interactive view - DÜZELTME başlıyor');
        
        // DÜZELTME 3: İnteraktif view'ı daha güvenli şekilde render et
        try {
            // Önce container'ın doğru şekilde görünür olduğunu garanti et
            resultContainer.classList.remove('hidden');
            solutionOutput.classList.remove('hidden');
            
            // Loading göster
            showLoading("İnteraktif çözüm hazırlanıyor...");
            
            // DOM'un hazır olmasını bekle
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // İnteraktif çözümü render et
            await renderInteractiveSolution(problem.solution);
            
            // Loading'i gizle
            showLoading(false);
            
        } catch (error) {
            console.error('İnteraktif view render hatası:', error);
            showLoading(false);
            showError('İnteraktif çözüm yüklenirken bir hata oluştu. Lütfen tekrar deneyin.', false);
        }
        
    } else if (isVisible('solving')) {
        console.log('Rendering solving view with Smart Guide');
        await renderSmartGuideWorkspace();
    }

    // 5. Problem Özetini Render Et (sadece setup view değilse)
    if (problem.solution && !isVisible('setup')) {
        await displayQuestionSummary(problem.solution.problemOzeti);
    } else if (isVisible('setup')) {
        elements['question'].innerHTML = '';
    }
}

// Input alanlarını temizleme fonksiyonu (gerekirse ekleyin)
function clearInputAreas() {
    // Klavye input'unu temizle
    const keyboardInput = document.getElementById('keyboard-input');
    if (keyboardInput) {
        keyboardInput.value = '';
    }
    
    // Guide input'unu temizle
    const guideInput = document.getElementById('guide-text-input');
    if (guideInput) {
        guideInput.value = '';
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
                        ${Array.from({length: 3}, (_, i) => `
                            <div class="w-3 h-3 rounded-full ${
                                i < attemptInfo.attempts ? 
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

        // Animasyonlu yükleme mesajları
        const analysisSteps = [
            { title: "Soru içerik kontrolü yapılıyor", description: "Yapay zeka soruyu analiz ediyor..." },
            { title: "Matematiksel ifadeler tespit ediliyor", description: "Formüller ve denklemler çözümleniyor..." },
            { title: "Problem özeti oluşturuluyor", description: "Verilenler ve istenenler belirleniyor..." },
            { title: "Çözüm adımları hazırlanıyor", description: "Adım adım çözüm planı oluşturuluyor..." },
            { title: "Render sistemi hazırlanıyor", description: "Advanced Math Renderer ile optimize ediliyor..." }
        ];
        
        showAnimatedLoading(analysisSteps, 1500);

        const promptText = masterSolutionPrompt.replace('{PROBLEM_CONTEXT}', problemContextForPrompt);
        const payloadParts = [{ text: promptText }];
        if (sourceType !== 'text') {
            payloadParts.push({ inlineData: { mimeType: 'image/png', data: sourceData } });
        }
        
        const solution = await makeApiCall({ contents: [{ role: "user", parts: payloadParts }] });
        
        if (solution) {
            // YENİ EKLEME: Final validation before using solution
            const finalValidation = validateApiResponse(solution);
            
            if (finalValidation.valid || finalValidation.correctedResponse) {
                const finalSolution = finalValidation.correctedResponse || solution;
                
                // SmartGuide'ı sıfırla
                smartGuide.reset();
                
                stateManager.setSolution(finalSolution);
                stateManager.setView('summary');
                
                // YENİ EKLEME: Başarı mesajına validation bilgisi ekle
                const successMessage = finalValidation.warnings.length > 0 ? 
                    "Problem çözüldü! (Bazı düzeltmeler uygulandı)" : 
                    "Problem başarıyla çözüldü! Advanced Math Renderer ile optimize edildi.";
                
                showSuccess(successMessage, false);
                
                await FirestoreManager.incrementQueryCount();
            } else {
                console.error('Final validation failed:', finalValidation.errors);
                showError("API yanıtı geçersiz format içeriyor. Lütfen tekrar deneyin.", false);
            }
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
        showLoading(false);
    }
}
/**
 * YENİ EKLEME: API yanıt doğrulama şeması
 */
const responseValidationSchema = {
    required: ["problemOzeti", "adimlar", "tamCozumLateks"],
    properties: {
        problemOzeti: {
            required: ["verilenler", "istenen"],
            verilenler: { type: "array", minItems: 1 },
            istenen: { type: "string", minLength: 1 }
        },
        adimlar: {
            type: "array",
            minItems: 1,
            itemSchema: {
                required: ["adimAciklamasi", "cozum_lateks"],
                adimAciklamasi: { 
                    type: "string",
                    forbiddenChars: /[\$\\√∫∑π±≤≥≠αβθγδ]/g,
                    minLength: 5
                },
                cozum_lateks: { 
                    type: "string",
                    requiredPattern: /^\$\$.*\$\$$/,
                    minLength: 4
                },
                ipucu: { 
                    type: "string",
                    forbiddenChars: /[\$\\√∫∑π±≤≥≠αβθγδ]/g,
                    optional: true
                }
            }
        },
        tamCozumLateks: {
            type: "array",
            minItems: 1
        }
    }
};

/**
 * YENİ EKLEME: API yanıtını doğrulama fonksiyonu
 */
function validateApiResponse(response) {
    const errors = [];
    const warnings = [];
    
    try {
        // 1. Temel yapı kontrolü
        if (!response || typeof response !== 'object') {
            errors.push('Geçersiz JSON yapısı');
            return { valid: false, errors, warnings, correctedResponse: null };
        }
        
        // 2. Zorunlu alan kontrolü
        responseValidationSchema.required.forEach(field => {
            if (!response[field]) {
                errors.push(`Zorunlu alan eksik: ${field}`);
            }
        });
        
        // 3. problemOzeti kontrolü
        if (response.problemOzeti) {
            if (!response.problemOzeti.verilenler || !Array.isArray(response.problemOzeti.verilenler)) {
                errors.push('problemOzeti.verilenler array olmalı');
            }
            if (!response.problemOzeti.istenen || typeof response.problemOzeti.istenen !== 'string') {
                errors.push('problemOzeti.istenen string olmalı');
            }
        }
        
        // 4. adimlar array kontrolü
        if (response.adimlar) {
            if (!Array.isArray(response.adimlar) || response.adimlar.length === 0) {
                errors.push('adimlar boş olmayan array olmalı');
            } else {
                response.adimlar.forEach((step, index) => {
                    // adimAciklamasi kontrolü
                    if (!step.adimAciklamasi) {
                        errors.push(`Adım ${index + 1}: adimAciklamasi eksik`);
                    } else {
                        const forbiddenMatches = step.adimAciklamasi.match(/[\$\\√∫∑π±≤≥≠αβθγδ]/g);
                        if (forbiddenMatches) {
                            errors.push(`Adım ${index + 1}: adimAciklamasi'da yasak karakterler: ${forbiddenMatches.join(', ')}`);
                        }
                        if (step.adimAciklamasi.length < 5) {
                            warnings.push(`Adım ${index + 1}: adimAciklamasi çok kısa`);
                        }
                    }
                    
                    // cozum_lateks kontrolü
                    if (!step.cozum_lateks) {
                        errors.push(`Adım ${index + 1}: cozum_lateks eksik`);
                    } else {
                        if (!step.cozum_lateks.startsWith('$$') || !step.cozum_lateks.endsWith('$$')) {
                            errors.push(`Adım ${index + 1}: cozum_lateks $$ ile başlayıp bitmeli`);
                        }
                        if (step.cozum_lateks.length < 4) {
                            errors.push(`Adım ${index + 1}: cozum_lateks çok kısa`);
                        }
                    }
                    
                    // ipucu kontrolü (opsiyonel)
                    if (step.ipucu) {
                        const forbiddenMatches = step.ipucu.match(/[\$\\√∫∑π±≤≥≠αβθγδ]/g);
                        if (forbiddenMatches) {
                            errors.push(`Adım ${index + 1}: ipucu'da yasak karakterler: ${forbiddenMatches.join(', ')}`);
                        }
                    }
                });
            }
        }
        
        // 5. tamCozumLateks kontrolü
        if (response.tamCozumLateks) {
            if (!Array.isArray(response.tamCozumLateks) || response.tamCozumLateks.length === 0) {
                errors.push('tamCozumLateks boş olmayan array olmalı');
            }
        }
        
        return { 
            valid: errors.length === 0, 
            errors, 
            warnings,
            correctedResponse: errors.length > 0 ? autoCorrectResponse(response, errors) : response
        };
        
    } catch (validationError) {
        errors.push(`Doğrulama hatası: ${validationError.message}`);
        return { valid: false, errors, warnings, correctedResponse: null };
    }
}

/**
 * YENİ EKLEME: Otomatik düzeltme fonksiyonu
 */
function autoCorrectResponse(response, errors) {
    let corrected = JSON.parse(JSON.stringify(response));
    
    try {
        // adimlar düzeltmeleri
        if (corrected.adimlar && Array.isArray(corrected.adimlar)) {
            corrected.adimlar.forEach((step, index) => {
                // adimAciklamasi düzeltme
                if (step.adimAciklamasi) {
                    step.adimAciklamasi = cleanTextFromMathSymbols(step.adimAciklamasi);
                }
                
                // ipucu düzeltme
                if (step.ipucu) {
                    step.ipucu = cleanTextFromMathSymbols(step.ipucu);
                }
                
                // cozum_lateks format düzeltme
                if (step.cozum_lateks) {
                    if (!step.cozum_lateks.startsWith('$$')) {
                        step.cozum_lateks = `$$${step.cozum_lateks.replace(/^\$+|\$+$/g, '')}$$`;
                    }
                    if (!step.cozum_lateks.endsWith('$$') && step.cozum_lateks.startsWith('$$')) {
                        step.cozum_lateks = step.cozum_lateks + '$$';
                    }
                }
            });
        }
        
        // Eksik alanları varsayılan değerlerle doldur
        if (!corrected.problemOzeti) {
            corrected.problemOzeti = {
                verilenler: ["Problem verisi analiz edildi"],
                istenen: "Problemin çözümü"
            };
        }
        
        if (!corrected.tamCozumLateks || !Array.isArray(corrected.tamCozumLateks)) {
            corrected.tamCozumLateks = ["$$\\text{Çözüm adımları üretildi}$$"];
        }
        
        return corrected;
        
    } catch (correctionError) {
        console.error('Otomatik düzeltme hatası:', correctionError);
        return response; // Orijinali döndür
    }
}

/**
 * YENİ EKLEME: Metinden matematik sembollerini temizleme
 */
function cleanTextFromMathSymbols(text) {
    if (!text || typeof text !== 'string') return text;
    
    return text
        // LaTeX komutlarını kaldır
        .replace(/\\[a-zA-Z]+\{[^}]*\}/g, '')
        .replace(/\\[a-zA-Z]+/g, '')
        // Matematik sembollerini kaldır
        .replace(/[\$\\√∫∑π±≤≥≠αβθγδ]/g, '')
        // Delimiterleri kaldır
        .replace(/\$+/g, '')
        .replace(/\\\(/g, '').replace(/\\\)/g, '')
        .replace(/\\\[/g, '').replace(/\\\]/g, '')
        // Fazla boşlukları temizle
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * YENİ EKLEME: JSON parse'ı güvenli hale getirme
 */
function safeJsonParse(text) {
    try {
        // Önce temel temizlik
        let cleaned = text.trim();
        
        // JSON dışındaki metinleri kaldır
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleaned = jsonMatch[0];
        } else {
            throw new Error('JSON yapısı bulunamadı');
        }
        
        // Yaygın JSON hatalarını düzelt
        cleaned = cleaned
            .replace(/,(\s*[}\]])/g, '$1') // Sondaki virgülleri kaldır
            .replace(/\\n/g, '\\\\n') // Newline escape düzelt
            .replace(/\\"/g, '\\\\"') // Quote escape düzelt
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Control karakterleri kaldır
        
        return JSON.parse(cleaned);
        
    } catch (parseError) {
        console.error('JSON parse hatası:', parseError.message);
        throw new Error(`JSON parse başarısız: ${parseError.message}`);
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
                // GÜNCELLENEN: Güvenli JSON parse kullan
                const parsedContent = safeJsonParse(content);
                
                // YENİ EKLEME: Yanıtı doğrula
                const validation = validateApiResponse(parsedContent);
                
                if (!validation.valid) {
                    console.warn('API yanıt doğrulama hataları:', validation.errors);
                    console.warn('API yanıt uyarıları:', validation.warnings);
                    
                    // Düzeltilmiş yanıt varsa onu kullan
                    if (validation.correctedResponse) {
                        console.log('Otomatik düzeltilmiş yanıt kullanılıyor');
                        return validation.correctedResponse;
                    } else {
                        throw new Error(`Yanıt doğrulama başarısız: ${validation.errors.join(', ')}`);
                    }
                }
                
                // Uyarıları logla
                if (validation.warnings.length > 0) {
                    console.warn('API yanıt uyarıları:', validation.warnings);
                }
                
                return parsedContent;
                
            } catch (parseError) {
                console.error('JSON parse hatası:', parseError);
                throw new Error(`Yanıt işleme hatası: ${parseError.message}`);
            }
        }
        
        throw new Error('Geçersiz API yanıtı - content bulunamadı');
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
    console.log('renderInteractiveSolution çağrıldı - DÜZELTME versiyonu');
    
    if (!solution || !solution.adimlar || !solution.adimlar.length) {
        elements['solution-output'].innerHTML = `
            <div class="p-4 bg-red-50 text-red-700 rounded-lg">
                <p>İnteraktif çözüm için adımlar bulunamadı.</p>
                <button id="back-to-main-menu-btn" class="btn btn-secondary mt-2">Ana Menüye Dön</button>
            </div>`;
        return;
    }

    try {
        console.log('İnteraktif çözüm sistemi başlatılıyor...');
        
        // DÜZELTME: Sistemi tamamen sıfırla
        interactiveSolutionManager.reset();
        
        // DOM elementinin varlığını kontrol et
        const solutionOutput = elements['solution-output'];
        if (!solutionOutput) {
            throw new Error('solution-output elementi bulunamadı');
        }
        
        // Container'ın görünür olduğunu garanti et
        solutionOutput.classList.remove('hidden');
        const resultContainer = elements['result-container'];
        if (resultContainer) {
            resultContainer.classList.remove('hidden');
        }
        
        // Kısa bekleme
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // İnteraktif çözüm sistemini başlat
        const initResult = interactiveSolutionManager.initializeInteractiveSolution(solution);
        console.log('İnteraktif sistem başlatıldı:', initResult);
        
        // Kısa bekleme
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // İlk adım seçeneklerini oluştur
        const firstStepData = interactiveSolutionManager.generateStepOptions(0);
        console.log('İlk adım verileri oluşturuldu:', firstStepData);
        
        if (!firstStepData) {
            throw new Error('İlk adım verileri oluşturulamadı');
        }
        
        // DÜZELTME: Ana container'ı güvenli şekilde render et
        console.log('İnteraktif adım render ediliyor...');
        await renderInteractiveStep(firstStepData);
        
        // Final kontrol - container'ın görünür olduğunu garanti et
        setTimeout(() => {
            const containers = [
                elements['result-container'],
                elements['solution-output']
            ];
            
            containers.forEach(container => {
                if (container) {
                    container.classList.remove('hidden');
                }
            });
            
            const optionsContainer = document.getElementById('interactive-options-container');
            const options = optionsContainer ? optionsContainer.children : [];
            console.log('Final kontrol - seçenek sayısı:', options.length);
            
            if (options.length === 0) {
                console.warn('Seçenekler kayboldu, yeniden render edilecek');
                renderInteractiveStep(firstStepData);
            }
        }, 300);
        
    } catch (error) {
        console.error('İnteraktif çözüm başlatma hatası:', error);
        elements['solution-output'].innerHTML = `
            <div class="p-4 bg-red-50 text-red-700 rounded-lg">
                <p>İnteraktif çözüm başlatılamadı: ${error.message}</p>
                <button id="back-to-main-menu-btn" class="btn btn-secondary mt-2">Ana Menüye Dön</button>
            </div>`;
    }
}

function debugViewState() {
    const currentView = stateManager.getStateValue('ui').view;
    const containers = {
        'result-container': elements['result-container'],
        'solution-output': elements['solution-output'],
        'solving-workspace': elements['solving-workspace'],
        'question-setup-area': elements['question-setup-area']
    };
    
    console.log('=== VIEW DEBUG ===');
    console.log('Current view:', currentView);
    
    Object.entries(containers).forEach(([name, element]) => {
        if (element) {
            console.log(`${name}:`, {
                hidden: element.classList.contains('hidden'),
                classes: element.className,
                innerHTML: element.innerHTML.substring(0, 100) + '...'
            });
        } else {
            console.log(`${name}: ELEMENT NOT FOUND`);
        }
    });
    console.log('=== END DEBUG ===');
}

// Adım render fonksiyonu
async function renderInteractiveStep(stepData) {
    console.log('renderInteractiveStep başlıyor - DÜZELTME versiyonu:', stepData);
    
    if (!stepData || !stepData.options) {
        console.error('Step data eksik:', stepData);
        return;
    }
    
    const progress = (stepData.stepNumber / stepData.totalSteps) * 100;
    
    // DÜZELTME: innerHTML'i güvenli şekilde ayarla
    const solutionOutput = elements['solution-output'];
    
    if (!solutionOutput) {
        console.error('solution-output elementi bulunamadı');
        return;
    }
    
    // Önce container'ı temizle
    solutionOutput.innerHTML = '';
    
    // DÜZELTME: HTML'i parça parça oluştur
    const htmlContent = generateInteractiveStepHTML(stepData, progress);
    
    // HTML'i ayarla
    solutionOutput.innerHTML = htmlContent;
    
    // DÜZELTME: DOM'un hazır olmasını bekle
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Event listener'ları kur
    console.log('Event listener\'ları kuruluyor...');
    setupInteractiveSolutionListeners(stepData);
    
    // DÜZELTME: Math render'ı ayrı bir task olarak çalıştır
    setTimeout(async () => {
        try {
            console.log('Math rendering başlıyor...');
            await renderMathInContainer(solutionOutput, false);
            console.log('Math rendering tamamlandı');
            
            // Final doğrulama
            const optionsContainer = document.getElementById('interactive-options-container');
            if (optionsContainer) {
                console.log('Final doğrulama - seçenek sayısı:', optionsContainer.children.length);
            }
        } catch (renderError) {
            console.error('Math render hatası:', renderError);
        }
    }, 150);
}
function generateInteractiveStepHTML(stepData, progress) {
    return `
        <div class="interactive-solution-workspace p-6 bg-white rounded-lg shadow-md">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold text-gray-800">İnteraktif Çözüm</h3>
                <button id="back-to-main-menu-btn" class="btn btn-secondary">Ana Menüye Dön</button>
            </div>
            
            <!-- İlerleme ve Deneme Bilgisi -->
            <div class="progress-section mb-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <!-- İlerleme -->
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
                    
                    <!-- Deneme Bilgisi -->
                    <div class="attempt-info">
                        <div class="flex justify-between items-center mb-2">
                            <h4 class="text-lg font-semibold text-gray-800">Deneme Hakkı</h4>
                            <span class="text-sm ${stepData.remainingAttempts <= 1 ? 'text-red-500' : stepData.remainingAttempts <= 2 ? 'text-orange-500' : 'text-green-500'}">
                                ${stepData.remainingAttempts} / ${stepData.maxAttempts} kaldı
                            </span>
                        </div>
                        <div class="attempt-dots flex gap-1">
                            ${Array.from({length: stepData.maxAttempts}, (_, i) => `
                                <div class="w-3 h-3 rounded-full ${
                                    i < stepData.attempts ? 'bg-red-400' : 'bg-gray-200'
                                }"></div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Adım Açıklaması -->
            <div class="step-description mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 class="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <span class="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        ${stepData.stepNumber}
                    </span>
                    Bu Adımda Yapılacak:
                </h4>
                <div class="text-blue-700 smart-content" data-content="${escapeHtml(stepData.stepDescription)}" id="interactive-step-desc"></div>
            </div>
            
            <!-- Uyarı Mesajları -->
            <div id="interactive-warning-container" class="mb-4">
                <!-- Uyarı mesajları buraya gelecek -->
            </div>
            
            <!-- Seçenekler - DÜZELTME: Daha güvenli HTML -->
            <div class="options-section mb-6">
                <h4 class="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 12l2 2 4-4"/>
                        <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
                    </svg>
                    Doğru çözüm adımını seçin:
                </h4>
                <div class="options-grid space-y-3" id="interactive-options-container">
                    ${generateOptionsHTML(stepData)}
                </div>
            </div>
            
            <!-- Aksiyon Butonları -->
            <div class="action-buttons flex flex-wrap gap-3 mb-4">
                <button id="interactive-submit-btn" class="btn btn-primary flex-1" disabled>
                    Seçimi Onayla
                </button>
                <button id="interactive-hint-btn" class="btn btn-secondary">
                    💡 İpucu
                </button>
            </div>
            
            <!-- Sonuç Alanı -->
            <div id="interactive-result-container" class="result-section hidden mb-4">
                <!-- Sonuç mesajları buraya gelecek -->
            </div>
            
            <!-- Navigasyon -->
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

function generateOptionsHTML(stepData) {
    if (!stepData.options || !Array.isArray(stepData.options)) {
        console.error('Options verisi eksik:', stepData);
        return '<p class="text-red-600">Seçenekler yüklenemedi</p>';
    }
    
    return stepData.options.map((option, index) => {
        const optionLetter = String.fromCharCode(65 + index);
        const optionId = option.displayId !== undefined ? option.displayId : index;
        
        return `
            <label class="option-label flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-all duration-200" data-option-id="${optionId}">
                <input type="radio" name="interactive-step-${stepData.stepNumber}" value="${optionId}" class="sr-only">
                <div class="option-letter w-8 h-8 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center font-bold text-sm mr-3 mt-0.5">
                    ${optionLetter}
                </div>
                <div class="option-content flex-1">
                    <div class="text-gray-800 font-medium smart-content" data-content="${escapeHtml(option.text)}" id="option-text-${optionId}"></div>
                    ${option.latex ? `<div class="text-sm text-gray-600 mt-1 latex-content" data-latex="${escapeHtml(option.latex)}" id="option-latex-${optionId}"></div>` : ''}
                </div>
            </label>
        `;
    }).join('');
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Event listener kurulumu
function setupInteractiveSolutionListeners(stepData) {
    const submitBtn = document.getElementById('interactive-submit-btn');
    const hintBtn = document.getElementById('interactive-hint-btn');
    const resetBtn = document.getElementById('interactive-reset-btn');
    const backBtn = document.getElementById('back-to-main-menu-btn');
    
    // Radio button seçimi
    const radioButtons = document.querySelectorAll(`input[name="interactive-step-${stepData.stepNumber}"]`);
    radioButtons.forEach(radio => {
        radio.addEventListener('change', () => {
            submitBtn.disabled = false;
            
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
    
    // Seçimi onayla
    if (submitBtn) {
        submitBtn.addEventListener('click', handleInteractiveSubmission);
    }
    
    // İpucu göster
    if (hintBtn) {
        hintBtn.addEventListener('click', () => {
            const hint = interactiveSolutionManager.getHint();
            if (hint) {
                showInteractiveHint(hint);
            }
        });
    }
    
    // Baştan başla
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Baştan başlamak istediğinizden emin misiniz? Tüm ilerlemeniz sıfırlanacak.')) {
                interactiveSolutionManager.reset();
                stateManager.setView('summary');
            }
        });
    }
    
    // Ana menüye dön
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            interactiveSolutionManager.reset();
            stateManager.setView('summary');
        });
    }
}
// İnteraktif çözüm için düzeltilmiş submission handler
async function handleInteractiveSubmission() {
    const currentState = interactiveSolutionManager.getCurrentState();
    const stepNumber = currentState.currentStep;
    const selectedRadio = document.querySelector(`input[name="interactive-step-${stepNumber}"]:checked`);
    
    if (!selectedRadio) {
        showError("Lütfen bir seçenek seçin.", false);
        return;
    }
    
    const selectedOptionId = parseInt(selectedRadio.value);
    
    // UI elementlerini al
    const submitBtn = document.getElementById('interactive-submit-btn');
    const optionLabels = document.querySelectorAll('.option-label');
    
    // Orijinal buton metni
    const originalButtonText = submitBtn.textContent;
    
    try {
        // Butonları devre dışı bırak
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Kontrol ediliyor...
        `;
        
        // Seçenekleri geçici olarak devre dışı bırak
        optionLabels.forEach(label => {
            label.style.pointerEvents = 'none';
            label.style.opacity = '0.7';
        });
        
        // Sonucu değerlendir
        const result = interactiveSolutionManager.evaluateSelection(selectedOptionId);
        
        // HATA KONTROLÜ
        if (result.error) {
            console.error('İnteraktif çözüm hatası:', result.error);
            
            // UI'yi geri yükle
            restoreUIState(submitBtn, optionLabels, originalButtonText);
            
            // DÜZELTME: showResetToSetup durumunda özel işlem
            if (result.shouldResetToSetup) {
                // Tamam butonu ile birlikte hata göster
                showError(result.error, true, () => {
                    console.log('Tamam butonuna tıklandı - Setup view\'a geçiliyor');
                    
                    try {
                        // İnteraktif çözüm sistemini sıfırla
                        interactiveSolutionManager.reset();
                        
                        // State manager ile setup view'a geç
                        if (window.stateManager) {
                            window.stateManager.setView('setup');
                        } else if (window.stateManager) {
                            stateManager.setView('setup');
                        }
                        
                        // Input alanlarını temizle
                        clearInputAreas();
                        
                        // Başarı mesajı göster
                        setTimeout(() => {
                            showSuccess("Yeni soru yükleyerek tekrar deneyebilirsiniz. Her soru için yeniden 3 deneme hakkınız olacak.", false);
                        }, 500);
                        
                    } catch (resetError) {
                        console.error('Reset işlemi hatası:', resetError);
                        // Son çare olarak sayfa yenileme
                        window.location.reload();
                    }
                });
            } else {
                showError(result.error, false);
            }
            return;
        }
        
        // Sonucu göster
        await displayInteractiveResult(result);
        
        // DOĞRU CEVAP DURUMU
        if (result.isCorrect) {
            console.log('Doğru cevap verildi, sonraki adıma geçiliyor...');
            
            setTimeout(async () => {
                if (result.isCompleted) {
                    // Tamamlama ekranı göster
                    await displayInteractiveCompletion(result.completionStats);
                } else if (result.nextStep) {
                    // Sonraki adıma geç
                    await renderInteractiveStep(result.nextStep);
                }
            }, 2000);
            
        } else {
            // YANLIŞ CEVAP DURUMU
            console.log('Yanlış cevap verildi, işlem yapılıyor...', result);
            
            setTimeout(async () => {
                if (result.shouldResetToSetup) {
                    // DÜZELTME: Tamam butonu ile setup'a yönlendirme
                    showError("Tüm deneme haklarınız bitti. Soru yükleme ekranına yönlendiriliyorsunuz.", true, () => {
                        console.log('Tamam butonuna tıklandı - Sistem sıfırlanıyor');
                        
                        try {
                            // Sistemi sıfırla
                            interactiveSolutionManager.reset();
                            
                            // Setup view'a geç
                            if (window.stateManager) {
                                window.stateManager.setView('setup');
                            } else if (stateManager) {
                                stateManager.setView('setup');
                            }
                            
                            // Input alanlarını temizle
                            clearInputAreas();
                            
                            // Bilgilendirme mesajı
                            setTimeout(() => {
                                showSuccess("Yeni soru yükleyerek tekrar deneyebilirsiniz.", false);
                            }, 500);
                            
                        } catch (resetError) {
                            console.error('Reset işlemi hatası:', resetError);
                            window.location.reload();
                        }
                    });
                    
                } else if (result.nextStep) {
                    // Baştan başla veya mevcut adımı tekrarla
                    console.log('Yeni adım render ediliyor:', result.nextStep);
                    await renderInteractiveStep(result.nextStep);
                } else {
                    // Fallback: Manuel olarak yeniden render et
                    console.log('Fallback: Mevcut adım yeniden render ediliyor');
                    const newStepData = interactiveSolutionManager.generateStepOptions(
                        interactiveSolutionManager.currentStep
                    );
                    if (newStepData) {
                        await renderInteractiveStep(newStepData);
                    } else {
                        // Son çare: UI'yi geri yükle
                        restoreUIState(submitBtn, optionLabels, originalButtonText);
                        showError("Bir hata oluştu. Lütfen sayfayı yenileyin.", false);
                    }
                }
            }, 3000);
        }
        
    } catch (error) {
        console.error('İnteraktif seçim işleme hatası:', error);
        
        // UI'yi geri yükle
        restoreUIState(submitBtn, optionLabels, originalButtonText);
        
        showError("Seçim işlenirken bir hata oluştu. Lütfen tekrar deneyin.", false);
    }
}
// UI durumunu geri yükleme yardımcı fonksiyonu (değişiklik yok)
function restoreUIState(submitBtn, optionLabels, originalButtonText) {
    // Buton durumunu geri al
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalButtonText;
    }
    
    // Seçenekleri tekrar aktif et
    if (optionLabels) {
        optionLabels.forEach(label => {
            label.style.pointerEvents = 'auto';
            label.style.opacity = '1';
        });
    }
}

async function displayInteractiveResult(result) {
    const resultContainer = document.getElementById('interactive-result-container');
    const warningContainer = document.getElementById('interactive-warning-container');
    
    if (!resultContainer) {
        console.error('Result container bulunamadı');
        return;
    }
    
    console.log('DisplayInteractiveResult çağrıldı:', result);
    
    // Seçenekleri renklendir
    highlightInteractiveOptions(result);
    
    let resultHTML = '';
    let warningHTML = '';
    
    if (result.isCorrect) {
        // DOĞRU CEVAP
        resultHTML = `
            <div class="result-message success p-4 rounded-lg bg-green-100 border border-green-300">
                <div class="flex items-center gap-3">
                    <div class="text-3xl">✅</div>
                    <div class="flex-1">
                        <h4 class="font-semibold text-green-800 mb-1">Doğru!</h4>
                        <p class="text-green-700 text-sm">${result.explanation}</p>
                        
                        ${result.isCompleted ? `
                            <div class="mt-3 p-3 bg-green-50 rounded border border-green-200">
                                <h5 class="font-semibold text-green-800 mb-2">🎉 Tebrikler! Tüm adımları tamamladınız!</h5>
                                <div class="text-sm text-green-700">
                                    <p><strong>Toplam Deneme:</strong> ${result.attempts}</p>
                                    <p><strong>Kalan Hak:</strong> ${result.remainingAttempts}</p>
                                </div>
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
        // YANLIŞ CEVAP
        const isLastAttempt = result.shouldResetToSetup || result.remainingAttempts <= 0;
        const messageClass = isLastAttempt ? 'error' : 'warning';
        const bgClass = isLastAttempt ? 'bg-red-100 border-red-300' : 'bg-orange-100 border-orange-300';
        const textClass = isLastAttempt ? 'text-red-800' : 'text-orange-800';
        const iconClass = isLastAttempt ? 'text-red-600' : 'text-orange-600';
        
        resultHTML = `
            <div class="result-message ${messageClass} p-4 rounded-lg ${bgClass} border">
                <div class="flex items-center gap-3">
                    <div class="text-3xl">${isLastAttempt ? '❌' : '⚠️'}</div>
                    <div class="flex-1">
                        <h4 class="font-semibold ${textClass} mb-1">
                            ${isLastAttempt ? 'Deneme Hakkınız Bitti!' : 'Yanlış Seçim'}
                        </h4>
                        <p class="${textClass} text-sm mb-2">${result.explanation}</p>
                        
                        <div class="mt-2">
                            <p class="text-sm ${iconClass}">
                                <strong>Toplam Deneme:</strong> ${result.attempts}
                            </p>
                            <p class="text-sm ${iconClass}">
                                <strong>Kalan Hak:</strong> ${result.remainingAttempts}
                            </p>
                            
                            ${result.message ? `
                                <p class="text-sm ${iconClass} mt-1 font-medium">${result.message}</p>
                            ` : ''}
                        </div>
                        
                        ${isLastAttempt ? `
                            <div class="mt-3 p-3 bg-red-50 rounded border border-red-200">
                                <p class="text-red-700 text-sm font-medium">
                                    Tüm deneme haklarınız bitti. Soru yükleme ekranına yönlendiriliyorsunuz...
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
        
        // UYARI MESAJI
        if (result.restartCurrentStep || result.restartFromBeginning) {
            const restartMessage = result.restartCurrentStep ? 
                '⚠️ Bu adımı tekrar çözeceksiniz.' : 
                '⚠️ Baştan başlayacaksınız.';
                
            warningHTML = `
                <div class="warning-message p-3 rounded-lg bg-yellow-100 border border-yellow-300">
                    <div class="flex items-center gap-2">
                        <span class="text-yellow-600 text-xl">⚠️</span>
                        <p class="text-yellow-800 text-sm font-medium">${restartMessage}</p>
                    </div>
                </div>
            `;
        }
    }
    
    // Sonucu göster
    resultContainer.innerHTML = resultHTML;
    resultContainer.classList.remove('hidden');
    
    if (warningHTML && warningContainer) {
        warningContainer.innerHTML = warningHTML;
    }
    
    console.log('Result display tamamlandı, UI güncellendi');
}

function highlightInteractiveOptions(result) {
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
                
                // Doğru cevap etiketini ekle
                const correctLabel = document.createElement('div');
                correctLabel.className = 'absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold';
                correctLabel.textContent = 'DOĞRU';
                label.style.position = 'relative';
                label.appendChild(correctLabel);
            }
        }
    });
}

async function displayInteractiveCompletion(completionStats) {
    const container = elements['solution-output'];
    
    if (!container) return;
    
    // Performans mesajı
    let performanceMessage = '';
    let performanceColor = 'text-green-600';
    
    switch(completionStats.performance) {
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


function showInteractiveHint(hint) {
    const resultContainer = document.getElementById('interactive-result-container');
    if (!resultContainer) return;
    
    resultContainer.innerHTML = `
        <div class="hint-message p-4 rounded-lg bg-yellow-100 border border-yellow-300">
            <div class="flex items-center gap-3">
                <div class="text-2xl">💡</div>
                <div class="flex-1">
                    <h4 class="font-semibold text-yellow-800 mb-1">İpucu</h4>
                    <p class="text-yellow-700 text-sm">${hint.hint}</p>
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




// Global fonksiyonlar
window.makeApiCall = makeApiCall;
window.showError = showError;
window.showSuccess = showSuccess;
window.showLoading = showLoading;
window.stateManager = stateManager;
window.renderMath = renderMath;
window.debugViewState = debugViewState;

// --- EXPORTS ---
export { canvasManager, errorHandler, stateManager, smartGuide, advancedMathRenderer };