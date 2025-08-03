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
    initializeRenderSystem,
} from '../modules/ui.js';
import { OptimizedCanvasManager } from '../modules/canvasManager.js';
import { AdvancedErrorHandler } from '../modules/errorHandler.js';
import { StateManager } from '../modules/stateManager.js';
import { smartGuide } from '../modules/smartGuide.js';
import { advancedMathRenderer } from '../modules/advancedMathRenderer.js';
import { mathSymbolPanel } from '../modules/mathSymbolPanel.js';
import { interactiveSolutionManager } from '../modules/interactiveSolutionManager.js';
import { renderStateManager } from '../modules/renderStateManager.js';
import { globalRenderManager } from '../modules/globalRenderManager.js';

import { getUnifiedSolution, validateMathProblem } from '../services/apiService.js';

// Global instances - Singleton pattern
const canvasManager = new OptimizedCanvasManager();
const errorHandler = new AdvancedErrorHandler();
const stateManager = new StateManager();

// --- Global DOM Önbelleği ---
const elements = {};

// --- UYGULAMA BAŞLANGIÇ NOKTASI ---
window.addEventListener('load', () => {
    AuthManager.initProtectedPage(initializeApp);
});

async function initializeApp(userData) {
    if (userData) {
        showLoading("Matematik render sistemi başlatılıyor...");
        const renderReady = await initializeRenderSystem();
        
        if (!renderReady) {
            showError("Render sistemi başlatılamadı. Sayfayı yenileyin.", true, () => location.reload());
            return;
        }
        
        cacheDOMElements();
        setupEventListeners();
        stateManager.subscribe(renderApp);
        stateManager.setUser(userData);
        
        smartGuide.setCanvasManager(canvasManager);
        
        showLoading(false);
        console.log('✅ Uygulama başarıyla başlatıldı');
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
    canvasManager.initCanvas('handwritingCanvas');
}

function resetUI() {
    console.log('🧹 Arayüz temizleniyor...');
    const containers = ['result-container', 'status-message', 'solution-output', 'step-by-step-container'];
    containers.forEach(id => {
        if (elements[id]) {
            elements[id].innerHTML = '';
            elements[id].classList.add('hidden');
        }
    });
    showLoading(false);
    console.log('✅ Arayüz başarıyla temizlendi.');
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
        if (elements[id]) elements[id].addEventListener(event, handler);
        else console.warn(`Element bulunamadı: ${id}`);
    };

    add('logout-btn', 'click', AuthManager.logout);
    add('new-question-btn', 'click', () => {
        resetUI();
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

    add('start-solving-workspace-btn', 'click', () => {
        const solution = stateManager.getStateValue('problem').solution;
        if (solution && solution.adimlar) {
            smartGuide.initializeGuidance(solution);
            stateManager.setView('solving'); // Mentor ile sohbet görünümüne geç
        } else {
            showError("Çözüm verisi bulunamadı. Lütfen tekrar bir soru yükleyin.", false);
        }
    });

    add('show-full-solution-btn', 'click', () => {
        const solution = stateManager.getStateValue('problem').solution;
        if (solution && solution.adimlar) {
            stateManager.setView('fullSolution'); // Tam çözüm görünümüne geç
        } else {
            showError("Çözüm verisi bulunamadı. Lütfen tekrar bir soru yükleyin.", false);
        }
    });

    add('solve-all-btn', 'click', () => {
        const solution = stateManager.getStateValue('problem').solution;
        if (solution && solution.adimlar) {
            stateManager.setView('interactive'); // İnteraktif çözüm görünümüne geç
        } else {
            showError("Çözüm verisi bulunamadı. Lütfen tekrar bir soru yükleyin.", false);
        }
    });

    add('goBackBtn', 'click', () => {
        resetUI();
        stateManager.setView('summary');
    });

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
        // Dinamik buton olayını bulun ve güncelleyin
    document.addEventListener('click', (event) => {
        const target = event.target;

        // Ana Menüye Dön butonu (farklı yerlerde olabilir)
        if (target && (target.id === 'back-to-main-menu-btn' || target.closest('#back-to-main-menu-btn'))) {
            resetUI(); // TEMİZLİK FONKSİYONUNU ÇAĞIR
            interactiveSolutionManager.reset(); // (Güvenlik için) Manager'ları da sıfırla
            smartGuide.reset();
            stateManager.setView('summary');
        }
        
        // İnteraktif çözüm tamamlandığında çıkan butonlar
        if (target.id === 'interactive-new-problem-btn' || target.id === 'guide-new-problem-btn') {
            resetUI();
            // Bu butonlar zaten stateManager.reset() çağırıyor, o yüzden ekstra bir şey gerekmez.
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

    // Önceki render'ları iptal et
    if (window.renderStateManager) {
        renderStateManager.cancelAllRenders();
    }

    // 1. Kullanıcı Bilgilerini Güncelle
    if (user && elements['header-subtitle'] && elements['query-count']) {
        elements['header-subtitle'].textContent = `Hoş geldin, ${user.displayName}!`;
        const limit = user.membershipType === 'premium' ? 200 : 5;
        elements['query-count'].textContent = limit - (user.dailyQueryCount || 0);
    }
    
    // 2. Loading ve Error Durumları
    if (ui.isLoading) {
        showLoading(ui.loadingMessage || "Yükleniyor...");
    } else {
        showLoading(false);
    }
    
    if (elements['question-setup-area']) {
        elements['question-setup-area'].classList.toggle('disabled-area', ui.isLoading);
    }
    
    if (ui.error) {
        showError(ui.error, true, () => stateManager.clearError());
    }

    // 3. Ana Görünüm (View) Yönetimi
    const { view, inputMode, handwritingInputType } = state.ui;

    toggleContainerVisibility(view, state.problem); // Görünürlükleri ayarla
    
    try {
        switch(view) {
            case 'setup':
                await renderSetupView(inputMode, handwritingInputType);
                break;
            case 'summary':
                if (state.problem.solution) {
                    await displayQuestionSummary(state.problem.solution.problemOzeti);
                }
                break;
            case 'fullSolution':
                showSolutionContainers();
                await renderFullSolution(state.problem.solution);
                if (state.problem.solution) {
                    await displayQuestionSummary(state.problem.solution.problemOzeti);
                }
                break;
            case 'interactive':
                console.log('Rendering interactive view - starting');
                showSolutionContainers();
                await renderInteractiveSolution(state.problem.solution);
                if (state.problem.solution) {
                    await displayQuestionSummary(state.problem.solution.problemOzeti);
                }
                break;
            case 'solving':
                // Sadece solving-workspace'in görünür olduğundan emin ol
                if(elements['solving-workspace']) elements['solving-workspace'].classList.remove('hidden');
                await renderSmartGuideWorkspace();
                break;
                        default:
                console.warn('Bilinmeyen view:', view);
        }
    } catch (error) {
        console.error('View render hatası:', error);
        showError('İçerik yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.', true, () => location.reload());
    }
}

// Yardımcı fonksiyonlar

function toggleContainerVisibility(view, problem) {
    // Setup area
    if (elements['question-setup-area']) {
        // Setup view'da setup area'yı göster, diğerlerinde disabled yap
        elements['question-setup-area'].classList.toggle('disabled-area', view !== 'setup');
    }
    
    // Question summary container
    if (elements['question-summary-container']) {
        elements['question-summary-container'].classList.toggle('hidden', 
            view === 'setup' || !problem.solution
        );
    }
    
    // Top action buttons (Çözüme Başla, Tüm Çözümü Göster, vb.)
    if (elements['top-action-buttons']) {
        elements['top-action-buttons'].classList.toggle('hidden', view !== 'summary');
    }
    
    // Solving workspace
    if (elements['solving-workspace']) {
        elements['solving-workspace'].classList.toggle('hidden', view !== 'solving');
    }
    
    // Result container ve solution output
    if (view === 'fullSolution' || view === 'interactive') {
        showSolutionContainers();
    } else {
        hideSolutionContainers();
    }
    
    // Go back button
    if (elements['goBackBtn']) {
        const showBackButton = ['fullSolution', 'interactive', 'solving'].includes(view);
        elements['goBackBtn'].classList.toggle('hidden', !showBackButton);
    }
}

function showSolutionContainers() {
    if (elements['result-container']) {
        elements['result-container'].classList.remove('hidden');
        elements['result-container'].style.display = 'block';
    }
    
    if (elements['solution-output']) {
        elements['solution-output'].classList.remove('hidden');
        elements['solution-output'].style.display = 'block';
    }
}

function hideSolutionContainers() {
    if (elements['result-container']) {
        elements['result-container'].classList.add('hidden');
    }
    
    if (elements['solution-output']) {
        elements['solution-output'].classList.add('hidden');
    }
}

async function renderSetupView(inputMode, handwritingInputType) {
    const isPhoto = inputMode === 'photo';
    
    // Photo/Handwriting mode toggle
    if (elements['photo-mode-container']) {
        elements['photo-mode-container'].classList.toggle('hidden', !isPhoto);
    }
    if (elements['handwriting-mode-container']) {
        elements['handwriting-mode-container'].classList.toggle('hidden', isPhoto);
    }
    if (elements['photo-mode-btn']) {
        elements['photo-mode-btn'].classList.toggle('mode-btn-active', isPhoto);
    }
    if (elements['handwriting-mode-btn']) {
        elements['handwriting-mode-btn'].classList.toggle('mode-btn-active', !isPhoto);
    }

    // Handwriting sub-modes (canvas vs keyboard)
    if (!isPhoto) {
        const showCanvas = handwritingInputType === 'canvas';
        
        if (elements['handwriting-canvas-container']) {
            elements['handwriting-canvas-container'].classList.toggle('hidden', !showCanvas);
        }
        if (elements['keyboard-input-container']) {
            elements['keyboard-input-container'].classList.toggle('hidden', showCanvas);
        }
        
        // Canvas setup
        if (showCanvas && canvasManager) {
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
    
    // Input alanlarını temizle
    clearInputAreas();
    
    // Question alanını temizle
    if (elements['question']) {
        elements['question'].innerHTML = '';
    }
}

// RenderStateManager yoksa basit bir fallback
if (!window.renderStateManager) {
    window.renderStateManager = {
        trackRender: async (id, fn) => {
            console.log(`Rendering: ${id}`);
            try {
                return await fn();
            } catch (error) {
                console.error(`Render error in ${id}:`, error);
                throw error;
            }
        },
        cancelAllRenders: () => {
            console.log('Cancel all renders called');
        },
        getStats: () => ({
            activeCount: 0,
            totalRenders: 0,
            errorCount: 0,
            successRate: 100
        })
    };
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



// YENİ handleNewProblem fonksiyonu
async function handleNewProblem(sourceType) {
    let problemContextForPrompt = "Görseldeki matematik problemini çöz.";
    let imageBase64 = null;

    try {
        // 1. Kullanıcı girdisini al (resim, canvas veya metin)
        if (sourceType === 'image') {
            const file = elements['imageUploader'].files[0];
            if (!file) { showError("Lütfen bir resim dosyası seçin.", false); return; }
            imageBase64 = await toBase64(file);
        } else if (sourceType === 'canvas') {
            const dataUrl = canvasManager.toDataURL('handwritingCanvas');
            if (!dataUrl || isCanvasEmpty('handwritingCanvas')) { showError("Lütfen bir çizim yapın veya yazı yazın.", false); return; }
            imageBase64 = dataUrl.split(',')[1];
            problemContextForPrompt = "El yazısı ile yazılmış matematik problemini çöz.";
        } else if (sourceType === 'text') {
            const textInput = elements['keyboard-input'].value.trim();
            if (!textInput) { showError("Lütfen bir soru yazın.", false); return; }
            problemContextForPrompt = textInput;
        }

        // 2. Matematik sorusu olup olmadığını doğrula
        stateManager.setLoading(true, "İçerik analiz ediliyor...");
        const validationResult = await validateMathProblem(problemContextForPrompt, imageBase64, (msg) => stateManager.setLoading(true, msg));

        if (!validationResult || !validationResult.isMathProblem) {
            stateManager.setLoading(false);
            showError(
                `Bu bir matematik sorusu olarak algılanmadı.\n\nSebep: ${validationResult?.reason || 'Analiz başarısız.'}\n\nÖneri: ${validationResult?.educationalMessage || 'Lütfen tekrar deneyin.'}`,
                true,
                () => {
                    stateManager.clearError();
                    stateManager.reset();
                }
            );
            return;
        }

        // 3. Sorgu hakkını kontrol et ve düşür (Bu fonksiyonu daha sonra ekleyeceğiz)
        // if (!await handleQueryDecrement()) return;

        // 4. TEK API ÇAĞRISI: Tüm çözüm verisini al
        stateManager.setLoading(true, "Yapay zeka çözümü hazırlıyor...");
        const unifiedSolution = await getUnifiedSolution(problemContextForPrompt, imageBase64, (msg) => stateManager.setLoading(true, msg));
        
        if (unifiedSolution && unifiedSolution.problemOzeti && unifiedSolution.adimlar) {
            // Başarılı: Tüm veriyi state'e kaydet ve özete geç
            unifiedSolution._source = { context: problemContextForPrompt, image: imageBase64 }; // Orijinal soruyu sakla
            stateManager.setSolution(unifiedSolution);
            stateManager.setView('summary');
            stateManager.setLoading(false);
            showSuccess(`✅ ${unifiedSolution.problemOzeti.konu || 'Matematik'} sorusu başarıyla yüklendi!`, true, 4000);
        } else {
            // API'den beklenen formatta veri gelmedi
            throw new Error("API'den gelen çözüm verisi geçersiz veya eksik.");
        }

    } catch (error) {
        stateManager.setLoading(false);
        errorHandler.handleError(error, {
            operation: 'handleNewProblem',
            fallbackMessage: 'Problem işlenirken bir hata oluştu. Lütfen tekrar deneyin.'
        });
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


async function displayQuestionSummary(problemOzeti) {
    if (!problemOzeti) return;

    const { verilenler, istenen } = problemOzeti;

    let summaryHTML = '<div class="problem-summary bg-blue-50 p-4 rounded-lg mb-4">';
    summaryHTML += '<h3 class="font-semibold text-blue-800 mb-2">Problem Özeti:</h3>';

    if (verilenler && verilenler.length > 0) {
        summaryHTML += '<div class="mb-2"><strong>Verilenler:</strong><ul class="list-disc list-inside ml-4">';
        verilenler.forEach((veri) => {
            summaryHTML += `<li class="smart-content" data-content="${escapeHtml(veri)}">${escapeHtml(veri)}</li>`;
        });
        summaryHTML += '</ul></div>';
    }

    if (istenen) {
        summaryHTML += `<div><strong>İstenen:</strong> <span class="smart-content" data-content="${escapeHtml(istenen)}">${escapeHtml(istenen)}</span></div>`;
    }

    summaryHTML += '</div>';
    elements['question'].innerHTML = summaryHTML;

    // Global render manager kullan
    await globalRenderManager.renderContainer(elements['question']);
}


// HTML oluşturma fonksiyonu - Full Solution için
function generateSolutionHTML(solution) {
    if (!solution) {
        return '<div class="p-4 bg-red-50 text-red-700 rounded-lg">Çözüm verisi bulunamadı.</div>';
    }

    let html = '<div class="full-solution-container">';
    html += '<div class="flex justify-between items-center mb-4">';
    html += '<h3 class="text-xl font-bold text-gray-800">Tam Çözüm</h3>';
    html += '<button id="back-to-main-menu-btn" class="btn btn-secondary">Ana Menüye Dön</button>';
    html += '</div>';

    if (solution.adimlar && solution.adimlar.length > 0) {
        solution.adimlar.forEach((step, index) => {
            html += `
                <div class="solution-step p-4 mb-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                    <div class="step-header flex items-center gap-3 mb-3">
                        <div class="step-number w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                            ${index + 1}
                        </div>
                        <h4 class="font-semibold text-gray-800">Adım ${index + 1}</h4>
                    </div>
                    
                    <div class="step-content space-y-3">
                        <!-- Adım açıklaması -->
                        <div class="step-description text-gray-700 smart-content" 
                             data-content="${escapeHtml(step.adimAciklamasi || `${index + 1}. adım açıklaması`)}" 
                             id="step-desc-${index}">
                            ${escapeHtml(step.adimAciklamasi || 'Yükleniyor...')}
                        </div>
                        
                        <!-- LaTeX çözüm -->
                        ${step.cozum_lateks ? `
                            <div class="latex-content p-3 bg-white rounded border border-gray-200" 
                                 data-latex="${escapeHtml(step.cozum_lateks)}" 
                                 id="step-latex-${index}">
                                <div class="text-center text-gray-400">
                                    <span class="loader inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></span>
                                    Matematik ifadesi yükleniyor...
                                </div>
                            </div>
                        ` : ''}
                        
                        <!-- İpucu -->
                        ${step.ipucu ? `
                            <div class="step-hint p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                <div class="flex items-start gap-2">
                                    <span class="text-yellow-600">💡</span>
                                    <div class="step-hint-content smart-content flex-1 text-sm text-yellow-800" 
                                         data-content="${escapeHtml(step.ipucu)}" 
                                         id="step-hint-${index}">
                                        ${escapeHtml(step.ipucu)}
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });
    } else if (solution.tamCozumLateks && solution.tamCozumLateks.length > 0) {
        // Eski format desteği
        solution.tamCozumLateks.forEach((latex, index) => {
            html += `
                <div class="solution-step p-4 mb-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div class="step-number font-semibold text-blue-600 mb-2">Adım ${index + 1}</div>
                    <div class="latex-content p-3 bg-white rounded" 
                         data-latex="${escapeHtml(latex)}" 
                         id="legacy-step-${index}">
                        <div class="text-center text-gray-400">Yükleniyor...</div>
                    </div>
                </div>
            `;
        });
    } else {
        html += `
            <div class="p-6 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-300">
                <p class="font-semibold mb-2">⚠️ Çözüm Adımları Bulunamadı</p>
                <p class="text-sm">Lütfen "Çözüme Başla" butonuna tıklayarak çözüm adımlarını yükleyin.</p>
            </div>
        `;
    }

    html += '</div>';
    return html;
}

// Güncellenmiş renderFullSolution fonksiyonu
async function renderFullSolution(solution) {
    console.log('renderFullSolution called with solution:', solution);
    
    const container = elements['solution-output'];
    if (!container) {
        console.error('solution-output container bulunamadı');
        return;
    }

    if (!solution) {
        container.innerHTML = `
            <div class="p-4 bg-red-50 text-red-700 rounded-lg">
                <p>Çözüm verisi bulunamadı. Lütfen önce bir soru yükleyin.</p>
            </div>
        `;
        return;
    }

    try {
        // 1. Loading state göster
        container.innerHTML = `
            <div class="text-center p-8">
                <div class="inline-block">
                    <div class="loader w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                    <p class="text-gray-600">Çözüm hazırlanıyor...</p>
                </div>
            </div>
        `;

        // 2. HTML'i oluştur
        const html = generateSolutionHTML(solution);
        
        // 3. Container'a HTML'i yerleştir
        container.innerHTML = html;

        // 4. Event listener'ları ekle
        setupFullSolutionEventListeners();

        // 5. Progressive render başlat
        await renderSolutionProgressive(container, solution);

        console.log('renderFullSolution completed successfully');

    } catch (error) {
        console.error('renderFullSolution error:', error);
        container.innerHTML = `
            <div class="p-4 bg-red-50 text-red-700 rounded-lg">
                <p class="font-semibold mb-2">Çözüm Yükleme Hatası</p>
                <p class="text-sm">${error.message}</p>
                <button onclick="location.reload()" class="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                    Sayfayı Yenile
                </button>
            </div>
        `;
    }
}

// Progressive render fonksiyonu
async function renderSolutionProgressive(container, solution) {
    if (!container) return;

    // İlk 3 adımı hemen render et
    const visibleSteps = container.querySelectorAll('.solution-step:nth-child(-n+3)');
    
    for (const stepElement of visibleSteps) {
        await renderStepContent(stepElement);
        // Her adım arası kısa bekleme
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Geri kalan adımları lazy load et
    const remainingSteps = container.querySelectorAll('.solution-step:nth-child(n+4)');
    
    if (remainingSteps.length > 0) {
        // Intersection Observer ile görünür olduklarında render et
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    renderStepContent(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { 
            rootMargin: '100px',
            threshold: 0.1 
        });

        remainingSteps.forEach(step => observer.observe(step));
    }
}

// Tek bir adımın içeriğini render et
async function renderStepContent(stepElement) {
    if (!stepElement || stepElement.dataset.rendered === 'true') return;

    try {
        // Açıklama render
        const descElement = stepElement.querySelector('.step-description');
        if (descElement && descElement.dataset.content) {
            await renderMath(descElement.dataset.content, descElement, false);
        }

        // LaTeX render
        const latexElement = stepElement.querySelector('.latex-content');
        if (latexElement && latexElement.dataset.latex) {
            await renderMath(latexElement.dataset.latex, latexElement, true);
        }

        // İpucu render
        const hintElement = stepElement.querySelector('.step-hint-content');
        if (hintElement && hintElement.dataset.content) {
            await renderMath(hintElement.dataset.content, hintElement, false);
        }

        // Rendered olarak işaretle
        stepElement.dataset.rendered = 'true';
        
        // Başarılı render animasyonu
        stepElement.classList.add('opacity-0');
        setTimeout(() => {
            stepElement.classList.remove('opacity-0');
            stepElement.classList.add('opacity-100', 'transition-opacity', 'duration-300');
        }, 50);

    } catch (error) {
        console.error('Step render error:', error);
        stepElement.classList.add('render-error', 'border-red-300', 'bg-red-50');
    }
}

// Event listener'ları kur
function setupFullSolutionEventListeners() {
    // Ana menüye dön butonu
    const backToMainBtn = document.getElementById('back-to-main-menu-btn');
    if (backToMainBtn) {
        backToMainBtn.addEventListener('click', () => {
            if (window.interactiveSolutionManager) {
                interactiveSolutionManager.reset();
            }
            if (window.smartGuide) {
                smartGuide.reset();
            }
            if (window.stateManager) {
                stateManager.setView('summary');
            }
        });
    }
}



// CSS animasyonları için stil ekle (eğer yoksa)
if (!document.getElementById('solution-animations')) {
    const style = document.createElement('style');
    style.id = 'solution-animations';
    style.textContent = `
        .loader {
            border-top-color: #3B82F6;
        }
        
        .solution-step {
            transition: all 0.3s ease;
        }
        
        .solution-step:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        
        .opacity-0 {
            opacity: 0;
        }
        
        .opacity-100 {
            opacity: 1;
        }
        
        .transition-opacity {
            transition-property: opacity;
        }
        
        .duration-300 {
            transition-duration: 300ms;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .animate-spin {
            animation: spin 1s linear infinite;
        }
    `;
    document.head.appendChild(style);
}



async function renderInteractiveSolution(solution) {
    console.log('🔄 İnteraktif Çözüm Başlatılıyor');
    showLoading("İnteraktif çözüm hazırlanıyor...");

    try {
        if (!solution || !solution.adimlar || solution.adimlar.length === 0) {
            displayInteractiveError("İnteraktif çözüm için adımlar bulunamadı.");
            return;
        }
        
        // 1. InteractiveSolutionManager'ı çözüm verisiyle başlat (Bu senkron bir işlem)
        interactiveSolutionManager.initializeInteractiveSolution(solution);
        
        // 2. İlk adım için seçenekleri SENKRON olarak oluştur
        const stepOptionsToRender = interactiveSolutionManager.generateStepOptions(0);

        // 3. Gelen sonucun geçerli olduğunu kontrol et (Artık .success kontrolü yok)
        if (!stepOptionsToRender || !stepOptionsToRender.options) {
            throw new Error("İlk adım seçenekleri oluşturulamadı. Veri yapısı bozuk olabilir.");
        }

        // 4. Adımı ekrana render et (Bu asenkron kalabilir, çünkü içinde render işlemleri var)
        await renderInteractiveStepSafe(stepOptionsToRender);

    } catch (error) {
        console.error('❌ İnteraktif çözüm başlatma hatası:', error);
        displayInteractiveError(`İnteraktif çözüm başlatılamadı: ${error.message}`);
    } finally {
        showLoading(false);
    }
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
    console.log('🔄 İnteraktif adım render başlıyor:', stepData);
    try {
        const solutionOutput = document.getElementById('solution-output');
        if (!solutionOutput) throw new Error('solution-output container bulunamadı');

        solutionOutput.innerHTML = generateInteractiveHTML(stepData);
        setupInteractiveEventListeners(stepData);
        await globalRenderManager.renderContainer(solutionOutput);

        console.log('✅ İnteraktif adım render tamamlandı');
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
        const displayId = option.displayId !== undefined ? option.displayId : index;
        const optionLetter = String.fromCharCode(65 + index); // A, B, C...

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
                    
                    <div class="text-gray-800 font-medium option-text smart-content" id="option-text-${displayId}">
                        ${option.text || 'Seçenek metni eksik'}
                    </div>

                    ${option.latex && option.latex !== option.text ? `
                        <div class="text-sm text-gray-600 mt-1 option-latex smart-content" id="option-latex-${displayId}">
                            ${option.latex}
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

    // Back to main menu
    const backBtn = document.getElementById('back-to-main-menu-btn');
    if (backBtn) {
        backBtn.replaceWith(backBtn.cloneNode(true));
        const newBackBtn = document.getElementById('back-to-main-menu-btn');
        newBackBtn.addEventListener('click', () => {
            interactiveSolutionManager.reset();
            if (window.stateManager) {
                window.stateManager.setView('summary');
            }
        });
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
    try {
        const selectedRadio = document.querySelector('input[name="interactive-step-options"]:checked');
        if (!selectedRadio) {
            showError("Lütfen bir seçenek seçin.", false);
            return;
        }
        
        const selectedOptionId = parseInt(selectedRadio.value);
        disableInteractiveUI();
        
        const result = interactiveSolutionManager.evaluateSelection(selectedOptionId);
        
        if (!result || result.error) {
            if (result && result.forceReset) {
                await handleInteractiveForceReset(result.error || "Tüm deneme haklarınız bitti.");
            } else {
                showError(result?.error || "Değerlendirme sırasında hata oluştu", false);
                enableInteractiveUI();
            }
            return;
        }
        
        await displayInteractiveResultSafe(result);
        
        // Sonucu aldıktan sonraki eylemleri yönet
        setTimeout(async () => {
            if (result.isCorrect) {
                if (result.isCompleted) {
                    await displayInteractiveCompletion(result.completionStats);
                } else if (result.nextStepData) {
                    // *** DÜZELTME BURADA: Artık 'nextStepPromise' yerine 'nextStepData' kullanıyoruz.
                    await renderInteractiveStepSafe(result.nextStepData);
                }
            } else {
                if (result.forceReset) {
                    await handleInteractiveForceReset(result.message);
                } else if (result.restartFromBeginning) {
                    // Başa dönmek için ilk adımı tekrar render et
                    const firstStepData = interactiveSolutionManager.generateStepOptions(0);
                    await renderInteractiveStepSafe(firstStepData);
                }
            }
        }, 2000); // Kullanıcının sonucu görmesi için 2 saniye bekle
        
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
    // Solution output'u temizle
    const solutionOutput = document.getElementById('solution-output');
    if (solutionOutput) {
        solutionOutput.innerHTML = '';
    }
    
    // Result container'ı temizle
    const resultContainer = document.getElementById('result-container');
    if (resultContainer) {
        resultContainer.classList.add('hidden');
    }
    
    // Status message'ı temizle
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
        statusMessage.innerHTML = '';
    }
}

function hideInteractiveContainers() {
    const containerIds = [
        'result-container',
        'solution-output',
        'interactive-result-container'
    ];
    
    containerIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add('hidden');
            element.style.display = 'none'; // Force gizle
        }
    });
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
// www/js/index.js

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

    // EKLENECEK KISIM:
    // Sonuç mesajı konteynerinin içini de render et.
    setTimeout(() => {
        renderMathInContainer(resultContainer);
    }, 100);

    console.log('✅ Sonuç güvenli şekilde gösterildi ve render edildi');
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


// =================================================================================
// --- AKILLI MENTÖR ARAYÜZ YÖNETİMİ (YENİ EKLENECEK BÖLÜM) ---
// =================================================================================

/**
 * 'solving' (mentor) görünümü için ana arayüzü oluşturur ve ilk adımı gösterir.
 */
async function renderSmartGuideWorkspace() {
    const container = elements['solving-workspace']; // Ana container
    if (!container) return;

    // Mentor arayüzünün HTML iskeletini oluştur
    container.innerHTML = `
        <div id="chat-window" class="bg-white rounded-2xl shadow-2xl shadow-blue-100 flex flex-col h-[80vh] max-h-[800px]">
            <div class="p-4 border-b flex-shrink-0">
                <div class="flex justify-between items-center">
                     <h2 id="mentor-header-title" class="font-bold text-gray-900 text-center">Problem Çözümü</h2>
                     <button id="mentor-back-btn" class="btn btn-secondary !py-1 !px-2 text-xs">Özete Dön</button>
                </div>
                <div class="progress-bar bg-gray-200 h-1.5 rounded-full overflow-hidden mt-2">
                    <div id="mentor-progress-fill" class="bg-blue-500 h-full transition-all duration-500" style="width: 0%;"></div>
                </div>
            </div>

            <div id="chat-feed" class="flex-grow p-6 space-y-6 overflow-y-auto">
                </div>

            <div id="mentor-input-container" class="p-4 bg-gray-50 border-t flex-shrink-0">
                <div id="mentor-feedback-container" class="mb-2"></div>
                <div id="mentor-mc-wrapper" class="hidden space-y-2 mb-3">
                    </div>
                <div id="mentor-textarea-wrapper">
                    <textarea id="mentor-student-input" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-base" rows="3" placeholder="Cevabını buraya yaz..."></textarea>
                </div>
                <button id="mentor-submit-btn" class="btn w-full mt-3 bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg shadow-blue-500/20 hover:bg-blue-700">
                    Gönder
                </button>
            </div>
        </div>
    `;

    setupMentorEventListeners();
    startMentorConversation();
}

/**
 * Mentor arayüzündeki butonlar ve girişler için olay dinleyicilerini kurar.
 */
function setupMentorEventListeners() {
    const submitBtn = document.getElementById('mentor-submit-btn');
    const backBtn = document.getElementById('mentor-back-btn');
    const input = document.getElementById('mentor-student-input');

    if (submitBtn) {
        submitBtn.addEventListener('click', handleMentorSubmission);
    }
    
    if (backBtn) {
        backBtn.addEventListener('click', () => stateManager.setView('summary'));
    }

    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleMentorSubmission();
            }
        });
    }

    // Çoktan seçmeli için event delegation
    const mcWrapper = document.getElementById('mentor-mc-wrapper');
    if(mcWrapper){
        mcWrapper.addEventListener('change', () => {
             document.getElementById('mentor-submit-btn').disabled = false;
        });
    }
}

/**
 * Mentor ile olan konuşmayı başlatır, ilk adımı AI mesajı olarak ekler.
 */
function startMentorConversation() {
    const stepInfo = smartGuide.getCurrentStepInfo();
    if (!stepInfo) {
        addMentorMessage('Merhaba! Görünüşe göre bir sorun var, çözüm adımlarını yükleyemedim.', 'ai', 'error');
        return;
    }
    updateMentorProgress();
    addMentorMessage(stepInfo.description, 'ai');
}

/**
 * Kullanıcının cevabını alır, smartGuide ile değerlendirir ve sonucu arayüze yansıtır.
 */
async function handleMentorSubmission() {
    const mcWrapper = document.getElementById('mentor-mc-wrapper');
    const inputWrapper = document.getElementById('mentor-textarea-wrapper');
    const submitBtn = document.getElementById('mentor-submit-btn');
    
    let studentInput = '';
    let isMcSelection = !mcWrapper.classList.contains('hidden');

    if(isMcSelection) {
        const selectedRadio = mcWrapper.querySelector('input[name="solution-option"]:checked');
        if (!selectedRadio) {
            showError("Lütfen bir seçenek belirleyin.", false, 3000);
            return;
        }
        studentInput = selectedRadio.dataset.latex;
    } else {
        const textInput = document.getElementById('mentor-student-input');
        studentInput = textInput.value.trim();
        if(!studentInput) {
            showError("Lütfen bir cevap yazın.", false, 3000);
            return;
        }
        addMentorMessage(studentInput, 'user');
        textInput.value = '';
    }

    // UI'ı kilitle
    submitBtn.disabled = true;
    submitBtn.textContent = 'Değerlendiriliyor...';
    showTypingIndicator(true);

    const evaluation = await smartGuide.evaluateStudentStep(studentInput);
    
    showTypingIndicator(false);
    
    if (evaluation.isCorrect) {
        addMentorMessage(evaluation.message, 'ai', 'success');
        
        // Gecikmeli olarak bir sonraki adıma geç
        setTimeout(() => {
            if(evaluation.shouldComplete){
                addMentorMessage("Tüm adımları başarıyla tamamladın. Harika iş!", 'ai', 'final');
                document.getElementById('mentor-input-container').classList.add('hidden');
            } else {
                const nextStepInfo = smartGuide.proceedToNextStep() ? smartGuide.getCurrentStepInfo() : null;
                if(nextStepInfo){
                    updateMentorProgress();
                    switchToTextInput(); // Bir sonraki adım için metin girişine dön
                    addMentorMessage(nextStepInfo.description, 'ai');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Gönder';
                } else {
                     addMentorMessage("Tüm adımları başarıyla tamamladın. Harika iş!", 'ai', 'final');
                     document.getElementById('mentor-input-container').classList.add('hidden');
                }
            }
        }, 1500);

    } else { // Yanlış cevap
        addMentorMessage(evaluation.message, 'ai', 'error');
        
        setTimeout(() => {
            const attemptInfo = smartGuide.getCurrentStepAttemptInfo();
            if (attemptInfo.attempts === 2) { // İkinci hatada seçenekleri göster
                const currentStepData = smartGuide.guidanceData.steps[smartGuide.currentStep];
                addMentorMessage("Bu adım biraz zorlayıcı görünüyor. Merak etme, bu çok normal! Senin için bazı seçenekler hazırladım. Doğru olanı seçebilir misin?", 'ai', 'info');
                switchToMcInput(currentStepData);
            } else if (attemptInfo.shouldReset || attemptInfo.finalAttempt) {
                 addMentorMessage("Tüm deneme hakların bitti. İstersen özete dönüp çözümü inceleyebilir veya yeni bir soruya geçebilirsin.", 'ai', 'final');
                 document.getElementById('mentor-input-container').classList.add('hidden');
            } else {
                addMentorMessage(evaluation.hint, 'ai', 'info');
            }
            submitBtn.disabled = false;
            submitBtn.textContent = 'Gönder';
        }, 1500);
    }
}

/**
 * Sohbet akışına yeni bir mesaj balonu (AI veya kullanıcı) ekler.
 * @param {string} content Mesaj içeriği
 * @param {'ai' | 'user'} sender Gönderen
 * @param {'info'|'success'|'error'|'final'} type AI mesaj tipi
 */
function addMentorMessage(content, sender = 'ai', type = 'info') {
    const chatFeed = document.getElementById('chat-feed');
    if (!chatFeed) return;

    let bubbleHTML = '';
    if (sender === 'ai') {
        let bgColor, titleColor, avatarText, title;
        switch (type) {
            case 'success':
                bgColor = 'bg-green-100'; titleColor = 'text-green-800'; avatarText = '✅'; title = 'Harika!';
                break;
            case 'error':
                bgColor = 'bg-red-100'; titleColor = 'text-red-800'; avatarText = '🤔'; title = 'Tekrar Deneyelim';
                break;
            case 'final':
                 bgColor = 'bg-indigo-100'; titleColor = 'text-indigo-800'; avatarText = '🏆'; title = 'Sonuç';
                 break;
            default: // info
                bgColor = 'bg-gray-100'; titleColor = 'text-purple-700'; avatarText = 'AI'; title = 'Sıradaki Adım';
        }
        bubbleHTML = `
            <div class="chat-bubble animate-fade-in">
                <div class="flex items-start gap-3 justify-start">
                    <div class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-purple-200 text-purple-700 font-bold">${avatarText}</div>
                    <div class="${bgColor} p-4 rounded-lg rounded-bl-none shadow-sm max-w-md">
                        <p class="font-semibold ${titleColor} mb-1">${title}</p>
                        <div class="text-gray-700 smart-content">${content}</div>
                    </div>
                </div>
            </div>`;
    } else { // sender === 'user'
        bubbleHTML = `
            <div class="chat-bubble animate-fade-in">
                <div class="flex items-start gap-3 justify-end">
                    <div class="bg-blue-500 text-white p-4 rounded-lg rounded-br-none shadow-sm max-w-md">
                        <p class="smart-content">${content}</p>
                    </div>
                    <div class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-blue-200 text-blue-700 font-bold">ME</div>
                </div>
            </div>`;
    }

    chatFeed.insertAdjacentHTML('beforeend', bubbleHTML);
    const newBubble = chatFeed.lastElementChild;
    renderMathInContainer(newBubble); // Sadece yeni eklenen balonu render et
    chatFeed.scrollTop = chatFeed.scrollHeight;
}

/**
 * "Yapay zeka yazıyor..." göstergesini açıp kapatır.
 * @param {boolean} show Gösterilsin mi?
 */
function showTypingIndicator(show) {
    const chatFeed = document.getElementById('chat-feed');
    let typingBubble = document.getElementById('typing-bubble');

    if (show && !typingBubble) {
        const typingHTML = `
            <div id="typing-bubble" class="chat-bubble">
                <div class="flex items-start gap-3 justify-start">
                    <div class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-purple-200 text-purple-700 font-bold">AI</div>
                    <div class="bg-gray-100 p-4 rounded-lg rounded-bl-none shadow-sm">
                        <div class="typing-indicator flex items-center space-x-1.5">
                            <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                            <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: -0.16s;"></span>
                            <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: -0.32s;"></span>
                        </div>
                    </div>
                </div>
            </div>`;
        chatFeed.insertAdjacentHTML('beforeend', typingHTML);
        chatFeed.scrollTop = chatFeed.scrollHeight;
    } else if (!show && typingBubble) {
        typingBubble.remove();
    }
}


function switchToMcInput(stepData) {
    const mcWrapper = document.getElementById('mentor-mc-wrapper');
    const inputWrapper = document.getElementById('mentor-textarea-wrapper');
    const submitBtn = document.getElementById('mentor-submit-btn');

    // 1. Doğru seçeneği oluştur
    const correctOption = { latex: stepData.cozum_lateks, isCorrect: true };

    // 2. Yanlış seçenekleri GÜVENLİ bir şekilde işle
    const incorrectOptions = (stepData.yanlisSecenekler || [])
        .map(opt => ({
            // API'nin 'metin_lateks' veya 'metin' gönderme ihtimaline karşı ikisini de kontrol et
            latex: opt.metin_lateks || opt.metin,
            isCorrect: false
        }))
        // 'latex' anahtarı undefined olan hatalı verileri filtrele
        .filter(opt => opt.latex);

    // 3. Tüm seçenekleri birleştir
    const options = [correctOption, ...incorrectOptions.slice(0, 2)]; // En fazla 2 yanlış seçenek al

    // Fisher-Yates shuffle ile seçenekleri karıştır
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }
    
    mcWrapper.innerHTML = options.map(opt => `
        <label class="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
            <input type="radio" name="solution-option" class="sr-only" data-latex="${escapeHtml(opt.latex)}">
            <span class="font-medium smart-content">${opt.latex}</span>
        </label>
    `).join('');

    renderMathInContainer(mcWrapper);

    inputWrapper.classList.add('hidden');
    mcWrapper.classList.remove('hidden');
    submitBtn.disabled = true; // Seçim yapılana kadar devre dışı
}

/**
 * Mentor arayüzünü metin girişi moduna geri döndürür.
 */
function switchToTextInput() {
    const mcWrapper = document.getElementById('mentor-mc-wrapper');
    const inputWrapper = document.getElementById('mentor-textarea-wrapper');
    mcWrapper.classList.add('hidden');
    inputWrapper.classList.remove('hidden');
    mcWrapper.innerHTML = '';
}

/**
 * Üstteki ilerleme çubuğunu günceller.
 */
function updateMentorProgress() {
    const progressFill = document.getElementById('mentor-progress-fill');
    const headerTitle = document.getElementById('mentor-header-title');
    const stepInfo = smartGuide.getCurrentStepInfo();
    if(progressFill && stepInfo) {
        const progress = (stepInfo.stepNumber -1) / stepInfo.totalSteps * 100;
        progressFill.style.width = `${progress}%`;
        headerTitle.textContent = `Problem Çözümü (Adım ${stepInfo.stepNumber}/${stepInfo.totalSteps})`;
    }
}




// Global fonksiyonlar
window.showError = showError;
window.showSuccess = showSuccess;
window.showLoading = showLoading;
window.stateManager = stateManager;
window.renderMath = renderMath;
window.renderInteractiveSolution = renderInteractiveSolution;
window.handleInteractiveSubmissionSafe = handleInteractiveSubmissionSafe;
window.setupInteractiveEventListeners = setupInteractiveEventListeners;
window.forceShowContainers = forceShowContainers;
window.handleInteractiveResetToSetup = handleInteractiveResetToSetup;
window.clearInputAreas = clearInputAreas;
window.globalRenderManager = globalRenderManager;


// --- EXPORTS ---
export { canvasManager, errorHandler, stateManager, smartGuide, advancedMathRenderer };

