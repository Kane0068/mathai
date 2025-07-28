// --- Gerekli Modülleri Import Et ---
import { AuthManager } from '../modules/auth.js';
import { FirestoreManager } from '../modules/firestore.js';
import { 
    showLoading, 
    showError, 
    showSuccess, 
    renderMathInContainer, 
    renderSmartContent,
    waitForRenderSystem,
    showAnimatedLoading 
} from '../modules/ui.js';
import { OptimizedCanvasManager } from '../modules/canvasManager.js';
import { AdvancedErrorHandler } from '../modules/errorHandler.js';
import { StateManager } from '../modules/stateManager.js';
import { smartGuide } from '../modules/smartGuide.js';
import { mathSymbolPanel } from '../modules/mathSymbolPanel.js';
import { EnhancedApiManager, AdvancedFallbackGenerator } from '../modules/enhancedApiManager.js';

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
const enhancedApiManager = new EnhancedApiManager();
const advancedFallbackGenerator = new AdvancedFallbackGenerator();

// --- Sabitler ---
const GEMINI_API_KEY = "AIzaSyDbjH9TXIFLxWH2HuYJlqIFO7Alhk1iQQs";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

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
        console.log('🚀 Initializing app with user data:', userData);
        
        showLoading("Matematik render sistemi başlatılıyor...");
        
        waitForRenderSystem().then(() => {
            console.log('✅ Render system ready');
            
            cacheDOMElements();
            setupEventListeners();
            
            stateManager.subscribe((newState) => {
                console.log('🔄 State changed, triggering renderApp:', newState);
                renderApp(newState).catch(error => {
                    console.error('RenderApp error:', error);
                    showError('Sayfa render hatası: ' + error.message, false);
                });
            });
            
            stateManager.setUser(userData);
            smartGuide.setCanvasManager(canvasManager);
            
            showLoading(false);
            console.log('✅ App initialized successfully');
            
        }).catch(error => {
            console.error('❌ Render system initialization failed:', error);
            showError('Render sistemi başlatılamadı: ' + error.message, false);
        });
        
    } else {
        console.error('❌ App initialization failed: No user data');
        document.body.innerHTML = '<p>Uygulama başlatılamadı - kullanıcı verisi bulunamadı.</p>';
    }
}

// --- KURULUM FONKSİYONLARI ---
function cacheDOMElements() {
    console.log('🏗️ Caching DOM elements...');
    
    const ids = [
        'header-subtitle', 'query-count', 'question-setup-area', 'photo-mode-btn',
        'handwriting-mode-btn', 'photo-mode-container', 'handwriting-mode-container',
        'imageUploader', 'cameraUploader', 'imagePreview', 'startFromPhotoBtn',
        'upload-selection', 'preview-container', 'selectFileBtn', 'takePhotoBtn',
        'changePhotoBtn', 'handwriting-canvas-container', 'keyboard-input-container',
        'handwritingCanvas', 'recognizeHandwritingBtn', 'hw-pen-btn', 'hw-eraser-btn',
        'hw-undo-btn', 'hw-clear-btn', 'keyboard-input', 'startFromTextBtn',
        'switchToCanvasBtn', 'switchToKeyboardBtn', 'question', 'top-action-buttons',
        'start-solving-workspace-btn', 'solve-all-btn', 'show-full-solution-btn', 'new-question-btn',
        'goBackBtn', 'logout-btn', 'solving-workspace', 'result-container', 'status-message',
        'solution-output', 'question-summary-container', 'step-by-step-container'
    ];
    
    const missingElements = [];
    
    ids.forEach(id => { 
        const element = document.getElementById(id);
        elements[id] = element;
        
        if (!element) {
            missingElements.push(id);
        }
    });
    
    if (missingElements.length > 0) {
        console.warn('⚠️ Missing DOM elements:', missingElements);
    }
    
    console.log(`✅ Cached ${ids.length - missingElements.length}/${ids.length} elements`);
    
    // Ana soru sorma canvas'ını başlat
    try {
        const canvasData = canvasManager.initCanvas('handwritingCanvas');
        if (canvasData) {
            console.log('✅ Main question canvas initialized');
        } else {
            console.warn('⚠️ Main question canvas initialization failed');
        }
    } catch (error) {
        console.error('❌ Canvas initialization error:', error);
    }
}

function setupEventListeners() {
    console.log('🔗 Event listener kurulumu...');
    
    const add = (id, event, handler) => { 
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(event, (e) => {
                console.log(`🔘 Button clicked: ${id}`);
                handler(e);
            });
            console.log(`✅ Event listener added: ${id}`);
        } else {
            console.error(`❌ Element bulunamadı: ${id}`);
        }
    };

    // Temel butonlar
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
        console.log('🧠 Start solving workspace clicked');
        const solution = stateManager.getStateValue('problem').solution;
        if (solution) {
            console.log('Solution exists, initializing smart guide');
            initializeSmartGuide();
        } else {
            console.error('Solution not found for smart guide');
            showError("Henüz bir çözüm bulunamadı. Lütfen önce bir soru yükleyin.", false);
        }
    });
    
    add('show-full-solution-btn', 'click', () => {
        console.log('📖 Show full solution clicked');
        const solution = stateManager.getStateValue('problem').solution;
        if (solution) {
            console.log('Solution exists, switching to fullSolution view');
            stateManager.setView('fullSolution');
        } else {
            console.error('Solution not found for full solution');
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

    console.log('✅ All event listeners set up');
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

async function renderApp(state) {
    const { user, ui, problem } = state;
    
    console.log(`📱 Rendering view: ${ui.view}`);

    // 1. Kullanıcı Bilgilerini Güncelle
    if (user && elements['header-subtitle'] && elements['query-count']) {
        elements['header-subtitle'].textContent = `Hoş geldin, ${user.displayName}!`;
        const limit = user.membershipType === 'premium' ? 200 : 5;
        elements['query-count'].textContent = limit - (user.dailyQueryCount || 0);
    }
    
    // 2. Loading ve Error Durumları
    if (ui.isLoading) {
        showLoading(ui.loadingMessage || 'Yükleniyor...');
    } else {
        showLoading(false);
    }
    
    if (elements['question-setup-area']) {
        elements['question-setup-area'].classList.toggle('disabled-area', ui.isLoading);
    }
    
    if (ui.error) {
        showError(ui.error, true, () => stateManager.clearError());
        return;
    }

    // 3. Ana Görünüm (View) Yönetimi
    const { view, inputMode, handwritingInputType } = ui;
    const isVisible = (v) => v === view;

    const safeToggle = (elementId, condition) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.toggle('hidden', !condition);
        } else {
            console.warn(`Element bulunamadı: ${elementId}`);
        }
    };

    // Tüm view elementlerini kontrol et ve ayarla
    safeToggle('question-setup-area', isVisible('setup'));
    safeToggle('solving-workspace', isVisible('solving'));
    safeToggle('result-container', ['fullSolution', 'interactive'].includes(view));
    safeToggle('solution-output', ['fullSolution', 'interactive'].includes(view));
    safeToggle('goBackBtn', ['fullSolution', 'interactive', 'solving'].includes(view));

    // Summary container ve action buttons
    if (elements['question-summary-container']) {
        if (isVisible('setup')) {
            elements['question-summary-container'].classList.add('hidden');
        } else {
            elements['question-summary-container'].classList.toggle('hidden', !problem.solution);
        }
    }

    if (elements['top-action-buttons']) {
        if (isVisible('setup')) {
            elements['top-action-buttons'].classList.add('hidden');
        } else {
            elements['top-action-buttons'].classList.toggle('hidden', !isVisible('summary'));
        }
    }

    // 4. View'a Özel Rendering
    try {
        if (isVisible('setup')) {
            console.log('🏗️ Rendering setup view');
            await renderSetupView(inputMode, handwritingInputType);
            
        } else if (isVisible('fullSolution')) {
            console.log('📖 Rendering full solution view');
            if (problem.solution) {
                await renderFullSolution(problem.solution);
            } else {
                console.error('Full solution: Problem solution eksik');
                showError('Çözüm verisi bulunamadı. Lütfen önce bir soru yükleyin.', false);
            }
            
        } else if (isVisible('solving')) {
            console.log('🧠 Rendering smart guide workspace');
            if (problem.solution) {
                await renderSmartGuideWorkspace();
            } else {
                console.error('Smart guide: Problem solution eksik');
                showError('Akıllı rehber için veri bulunamadı. Lütfen önce bir soru yükleyin.', false);
            }
            
        } else if (isVisible('summary')) {
            console.log('📋 Rendering summary view');
        }
        
    } catch (error) {
        console.error(`View rendering hatası (${view}):`, error);
        showError(`${view} görünümü yüklenirken hata oluştu: ${error.message}`, true, () => {
            stateManager.setView('setup');
        });
    }

    // 5. Problem Özetini Render Et (setup view hariç)
    if (problem.solution && !isVisible('setup')) {
        console.log('📄 Rendering problem summary');
        try {
            await displayQuestionSummary(problem.solution.problemOzeti);
        } catch (error) {
            console.error('Problem özeti render hatası:', error);
        }
    } else if (isVisible('setup')) {
        if (elements['question']) {
            elements['question'].innerHTML = '';
        }
    }

    console.log(`✅ RenderApp completed for view: ${view}`);
}

async function renderSetupView(inputMode, handwritingInputType) {
    console.log('Setting up input mode:', inputMode, handwritingInputType);
    
    const isPhoto = inputMode === 'photo';
    
    // Photo/Handwriting mode toggle
    safeToggle('photo-mode-container', isPhoto);
    safeToggle('handwriting-mode-container', !isPhoto);
    
    // Mode button aktif durumu
    if (elements['photo-mode-btn'] && elements['handwriting-mode-btn']) {
        elements['photo-mode-btn'].classList.toggle('mode-btn-active', isPhoto);
        elements['handwriting-mode-btn'].classList.toggle('mode-btn-active', !isPhoto);
    }

    if (!isPhoto) {
        // Handwriting mode - canvas vs keyboard
        const showCanvas = handwritingInputType === 'canvas';
        safeToggle('handwriting-canvas-container', showCanvas);
        safeToggle('keyboard-input-container', !showCanvas);
        
        if (showCanvas) {
            // Canvas'ı yeniden boyutlandır
            setTimeout(() => {
                try {
                    canvasManager.resizeCanvas('handwritingCanvas');
                    const data = canvasManager.canvasPool.get('handwritingCanvas');
                    if (data) {
                        data.ctx.clearRect(0, 0, data.canvas.width, data.canvas.height);
                        data.ctx.fillStyle = '#FFFFFF';
                        data.ctx.fillRect(0, 0, data.canvas.width, data.canvas.height);
                        canvasManager.applyDrawingSettings('handwritingCanvas');
                    }
                } catch (error) {
                    console.error('Canvas setup hatası:', error);
                }
            }, 100);
        }
    }
    
    clearInputAreas();
}

function safeToggle(elementId, condition) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.toggle('hidden', !condition);
        return true;
    } else {
        console.warn(`Element bulunamadı: ${elementId}`);
        return false;
    }
}

function clearInputAreas() {
    const keyboardInput = document.getElementById('keyboard-input');
    if (keyboardInput) {
        keyboardInput.value = '';
    }
    
    const guideInput = document.getElementById('guide-text-input');
    if (guideInput) {
        guideInput.value = '';
    }
    
    const imagePreview = document.getElementById('imagePreview');
    const previewContainer = document.getElementById('preview-container');
    const uploadSelection = document.getElementById('upload-selection');
    const startFromPhotoBtn = document.getElementById('startFromPhotoBtn');
    
    if (imagePreview) imagePreview.src = '';
    if (previewContainer) previewContainer.classList.add('hidden');
    if (uploadSelection) uploadSelection.classList.remove('hidden');
    if (startFromPhotoBtn) startFromPhotoBtn.disabled = true;
    
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
    
    container.innerHTML = createSmartGuideHTML(stepInfo, progress, hintStats, attemptInfo);
    
    // Advanced Math Renderer ile içeriği render et
    setTimeout(async () => {
        await renderSmartContent(container);
        await loadRoadmapContent();
        initializeMathSymbolPanel();
    }, 50);
    
    setupGuideEventListeners();
}

function createSmartGuideHTML(stepInfo, progress, hintStats, attemptInfo) {
    return `
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
                </div>
            </div>
            
            <!-- ROADMAP BÖLÜMÜ -->
            <div class="roadmap-section mb-6">
                <button id="toggle-roadmap-btn" class="btn btn-primary w-full flex items-center justify-center gap-2">
                    <span id="roadmap-btn-text">Çözüm Yol Haritasını Göster</span>
                </button>
                
                <div id="roadmap-content" class="roadmap-content hidden mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <h4 class="font-semibold text-blue-800 mb-3 flex items-center gap-2">
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
                    
                    <textarea 
                        id="guide-text-input" 
                        class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        rows="4"
                        placeholder="Matematik çözümünüzü buraya yazın... (Aşağıdaki sembol panelini kullanabilirsiniz)"
                    ></textarea>
                </div>
                
                <div id="guide-canvas-container" class="hidden">
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
                            ✏️
                        </button>
                        <button id="guide-eraser-btn" class="tool-btn p-2 rounded-md" title="Silgi">
                            🧽
                        </button>
                        <button id="guide-clear-btn" class="tool-btn p-2 rounded-md" title="Hepsini Sil">
                            🗑️
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
}

function initializeMathSymbolPanel() {
    try {
        mathSymbolPanel.destroy();
        
        const textarea = document.getElementById('guide-text-input');
        if (textarea) {
            const panel = mathSymbolPanel.createPanel('guide-text-input');
            
            if (panel) {
                console.log('Matematik Sembol Paneli başarıyla başlatıldı');
                textarea.addEventListener('focus', () => {
                    panel.style.display = 'block';
                });
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

async function loadRoadmapContent() {
    const solutionData = stateManager.getStateValue('problem').solution;
    if (!solutionData || !solutionData.adimlar) return;
    
    const roadmapSteps = document.getElementById('roadmap-steps');
    if (!roadmapSteps) return;
    
    let roadmapHTML = '';
    
    solutionData.adimlar.forEach((step, index) => {
        const stepNumber = index + 1;
        const isCurrentStep = stepNumber === smartGuide.getCurrentStepInfo()?.stepNumber;
        
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
    console.log('Roadmap sadece sözel açıklamalar ile yüklendi');
}

function setupGuideEventListeners() {
    const submitBtn = document.getElementById('guide-submit-btn');
    const nextBtn = document.getElementById('guide-next-step-btn');
    const prevBtn = document.getElementById('guide-previous-step-btn');
    const resetBtn = document.getElementById('guide-reset-btn');
    const textInput = document.getElementById('guide-text-input');
    
    const roadmapToggleBtn = document.getElementById('toggle-roadmap-btn');
    const hintToggleBtn = document.getElementById('toggle-hint-btn');
    
    const textModeBtn = document.getElementById('guide-text-mode-btn');
    const handwritingModeBtn = document.getElementById('guide-handwriting-mode-btn');
    
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
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Tüm ilerlemeniz silinecek ve ana menüye döneceksiniz. Emin misiniz?')) {
                handleGuideReset();
            }
        });
    }
    
    if (roadmapToggleBtn) {
        roadmapToggleBtn.addEventListener('click', toggleRoadmap);
    }
    
    if (hintToggleBtn) {
        hintToggleBtn.addEventListener('click', toggleHint);
    }
    
    if (textInput) {
        textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const attemptInfo = smartGuide.getCurrentStepAttemptInfo();
                if (attemptInfo.canAttempt) {
                    handleGuideSubmission();
                }
            }
        });
    }
    
    if (textModeBtn) {
        textModeBtn.addEventListener('click', () => switchGuideInputMode('text'));
    }
    
    if (handwritingModeBtn) {
        handwritingModeBtn.addEventListener('click', () => switchGuideInputMode('handwriting'));
    }
    
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
    
    const backToMainMenuBtn = document.getElementById('back-to-main-menu-btn');
    if (backToMainMenuBtn) {
        backToMainMenuBtn.addEventListener('click', () => {
            stateManager.setView('summary');
        });
    }
}

// --- YARDIMCI FONKSİYONLAR ---
function switchGuideInputMode(mode) {
    const textContainer = document.getElementById('guide-text-input-container');
    const canvasContainer = document.getElementById('guide-canvas-container');
    const textModeBtn = document.getElementById('guide-text-mode-btn');
    const handwritingModeBtn = document.getElementById('guide-handwriting-mode-btn');
    
    if (mode === 'text') {
        textContainer.classList.remove('hidden');
        canvasContainer.classList.add('hidden');
        
        textModeBtn.classList.add('bg-blue-100', 'text-blue-700', 'font-medium');
        textModeBtn.classList.remove('bg-gray-100', 'text-gray-600');
        
        handwritingModeBtn.classList.add('bg-gray-100', 'text-gray-600');
        handwritingModeBtn.classList.remove('bg-blue-100', 'text-blue-700', 'font-medium');
        
        setTimeout(() => {
            initializeMathSymbolPanel();
            const textInput = document.getElementById('guide-text-input');
            if (textInput) {
                textInput.focus();
            }
        }, 100);
        
    } else if (mode === 'handwriting') {
        textContainer.classList.add('hidden');
        canvasContainer.classList.remove('hidden');
        
        handwritingModeBtn.classList.add('bg-blue-100', 'text-blue-700', 'font-medium');
        handwritingModeBtn.classList.remove('bg-gray-100', 'text-gray-600');
        
        textModeBtn.classList.add('bg-gray-100', 'text-gray-600');
        textModeBtn.classList.remove('bg-blue-100', 'text-blue-700', 'font-medium');
        
        mathSymbolPanel.destroy();
        
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

function toggleHint() {
    const hintResult = smartGuide.toggleHint();
    const toggleBtn = document.getElementById('toggle-hint-btn');
    const btnText = document.getElementById('hint-btn-text');
    const statusMessage = document.getElementById('hint-status-message');
    
    if (!toggleBtn || !btnText) return;
    
    if (hintResult.isVisible) {
        const canvasContainer = document.getElementById('guide-canvas-container');
        const textContainer = document.getElementById('guide-text-input-container');
        
        const isCanvasMode = canvasContainer && !canvasContainer.classList.contains('hidden');
        const isTextMode = textContainer && !textContainer.classList.contains('hidden');
        
        if (isCanvasMode) {
            showCanvasHintPreview(hintResult.stepHint);
            updateHintUI(true, hintResult, 'canvas');
        } else if (isTextMode) {
            showTextHintPreview(hintResult.stepHint);
            updateHintUI(true, hintResult, 'text');
        } else {
            showError('Aktif giriş modu bulunamadı.', false);
        }
    } else {
        clearAllHints();
        updateHintUI(false, hintResult, 'none');
    }
}

function showTextHintPreview(stepHint) {
    const hintPreview = document.getElementById('text-hint-preview');
    const hintContent = document.getElementById('text-hint-content');
    
    if (!hintPreview || !hintContent || !stepHint) return;
    
    const hintText = stepHint.hint || stepHint.ipucu || 'İpucu mevcut değil';
    
    hintContent.textContent = hintText;
    hintContent.removeAttribute('data-content');
    
    hintPreview.classList.remove('hidden');
    hintPreview.classList.add('animate-fadeIn');
    
    console.log('Text hint preview gösterildi (sadece sözel):', hintText);
}

function showCanvasHintPreview(stepHint) {
    const hintPreview = document.getElementById('canvas-hint-preview');
    const hintContent = document.getElementById('canvas-hint-content');
    
    if (!hintPreview || !hintContent || !stepHint) return;
    
    const hintText = stepHint.hint || stepHint.ipucu || 'İpucu mevcut değil';
    
    hintContent.textContent = hintText;
    hintContent.removeAttribute('data-content');
    
    hintPreview.classList.remove('hidden');
    hintPreview.classList.add('animate-fadeIn');
    
    console.log('Canvas hint preview gösterildi (sadece sözel):', hintText);
}

function clearAllHints() {
    const textPreview = document.getElementById('text-hint-preview');
    const canvasPreview = document.getElementById('canvas-hint-preview');
    
    if (textPreview) {
        textPreview.classList.add('hidden');
        textPreview.classList.remove('animate-fadeIn');
    }
    
    if (canvasPreview) {
        canvasPreview.classList.add('hidden');
        canvasPreview.classList.remove('animate-fadeIn');
    }
}

function updateHintUI(isVisible, hintResult, mode) {
    const toggleBtn = document.getElementById('toggle-hint-btn');
    const btnText = document.getElementById('hint-btn-text');
    const statusMessage = document.getElementById('hint-status-message');
    
    if (isVisible) {
        btnText.textContent = '🚫 İpucuyu Temizle';
        toggleBtn.classList.remove('btn-tertiary');
        toggleBtn.classList.add('btn-secondary');
        
        if (statusMessage) {
            const modeText = mode === 'canvas' ? 'canvas\'ta görüntüleniyor' : 'yazı alanında görüntüleniyor';
            statusMessage.querySelector('p').textContent = `💡 İpucu ${modeText}. Üzerine yazabilirsiniz!`;
            statusMessage.style.display = 'block';
        }
        
        if (hintResult.hintCount === 1) {
            showSuccess(`İlk ipucunuz görüntülendi! Toplam: ${hintResult.hintCount} ipucu`, true, 3000);
        } else {
            showSuccess(`${hintResult.hintCount}. ipucunuz görüntülendi!`, true, 3000);
        }
        
    } else {
        btnText.textContent = '💡 İpucu Al';
        toggleBtn.classList.remove('btn-secondary');
        toggleBtn.classList.add('btn-tertiary');
        
        if (statusMessage) {
            statusMessage.style.display = 'none';
        }
        
        showSuccess('İpucu temizlendi.', true, 2000);
    }
}

function toggleRoadmap() {
    const roadmapContent = document.getElementById('roadmap-content');
    const toggleBtn = document.getElementById('toggle-roadmap-btn');
    const btnText = document.getElementById('roadmap-btn-text');
    
    if (!roadmapContent || !toggleBtn || !btnText) return;
    
    const isHidden = roadmapContent.classList.contains('hidden');
    
    if (isHidden) {
        roadmapContent.classList.remove('hidden');
        roadmapContent.classList.add('animate-fadeIn');
        btnText.textContent = 'Yol Haritasını Gizle';
        toggleBtn.classList.remove('btn-primary');
        toggleBtn.classList.add('btn-secondary');
    } else {
        roadmapContent.classList.add('hidden');
        roadmapContent.classList.remove('animate-fadeIn');
        btnText.textContent = 'Çözüm Yol Haritasını Göster';
        toggleBtn.classList.remove('btn-secondary');
        toggleBtn.classList.add('btn-primary');
    }
}

async function handleGuideSubmission() {
    const submitBtn = document.getElementById('guide-submit-btn');
    const canvasContainer = document.getElementById('guide-canvas-container');
    
    if (!submitBtn) {
        showError("Gerekli form elemanları bulunamadı.", false);
        return;
    }
    
    const attemptInfo = smartGuide.getCurrentStepAttemptInfo();
    if (!attemptInfo.canAttempt) {
        showError("Bu adım için deneme hakkınız kalmadı.", false);
        return;
    }
    
    let studentInput = '';
    let inputType = 'text';
    
    if (canvasContainer && !canvasContainer.classList.contains('hidden')) {
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
        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Kontrol ediliyor...
        `;
        
        const evaluation = await smartGuide.evaluateStudentStep(studentInput, inputType);
       
        displayDetailedGuideFeedback(evaluation);
       
        if (evaluation.isCorrect && evaluation.shouldProceed) {
            if (evaluation.shouldComplete || evaluation.finalAnswerGiven) {
                smartGuide.completeProblem();
                
                setTimeout(() => {
                    displayGuideCompletion();
                }, 3000);
                
            } else {
                setTimeout(() => {
                    const hasNextStep = smartGuide.proceedToNextStep();
                    
                    if (hasNextStep) {
                        renderSmartGuideStep();
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
            setTimeout(() => {
                handleGuideReset();
            }, 8000);
            
        } else {
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
        
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function handleGuideNextStep() {
    const hasNextStep = smartGuide.proceedToNextStep();
    
    if (hasNextStep) {
        renderSmartGuideStep();
        const textInput = document.getElementById('guide-text-input');
        if (textInput) {
            textInput.value = '';
        }
        
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
        const textInput = document.getElementById('guide-text-input');
        if (textInput) {
            textInput.value = '';
        }
        
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

function handleGuideReset() {
    smartGuide.resetAllAttempts();
    
    showError(
        "3 deneme hakkınız da bitti. API suistimalini önlemek için soruyu tekrar yüklemeniz gerekiyor. Soru yükleme alanına yönlendiriliyorsunuz.", 
        true, 
        () => {
            stateManager.setView('setup');
            clearInputAreas();
            
            setTimeout(() => {
                showSuccess(
                    "Soruyu tekrar yükleyerek yeni bir çözüm denemesi başlatabilirsiniz. Her adım için yine 3 deneme hakkınız olacak.", 
                    false
                );
            }, 1000);
        }
    );
}

function displayDetailedGuideFeedback(evaluation) {
    const feedbackContainer = document.getElementById('guide-feedback-container');
    
    if (!feedbackContainer) return;
    
    const isCorrect = evaluation.isCorrect;
    const attempts = evaluation.attempts || 0;
    const remaining = evaluation.remaining || 0;
    
    let feedbackHTML = '';
    
    if (isCorrect) {
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
        const isLastAttempt = evaluation.shouldReset || evaluation.finalAttempt;
        const isBlocked = evaluation.stepSkippingBlocked;
        
        let feedbackClass, bgClass, textClass, iconClass, closeButtonClass;
        
        if (isBlocked) {
            feedbackClass = 'blocked';
            bgClass = 'bg-purple-100 border-purple-300';
            textClass = 'text-purple-800';
            iconClass = 'text-purple-600';
            closeButtonClass = 'bg-purple-200 hover:bg-purple-300 text-purple-700';
        } else if (isLastAttempt) {
            feedbackClass = 'error';
            bgClass = 'bg-red-100 border-red-300';
            textClass = 'text-red-800';
            iconClass = 'text-red-600';
            closeButtonClass = 'bg-red-200 hover:bg-red-300 text-red-700';
        } else {
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
    feedbackContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
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
    
    if (evaluation.shouldReset) {
        setTimeout(() => {
            const feedbackElement = feedbackContainer.querySelector('.feedback-message');
            if (feedbackElement) {
                feedbackElement.remove();
            }
        }, 10000);
    }
}

function displayGuideCompletion() {
    const container = document.getElementById('smart-guide-container') || elements['step-by-step-container'];
    
    if (!container) return;
    
    const progress = smartGuide.getProgress();
    const hintStats = smartGuide.getHintStats();
    const attemptStats = smartGuide.getAttemptStats();
    const learningReport = smartGuide.getLearningReport();
    
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
    
    let attemptMessage = '';
    const avgAttempts = parseFloat(attemptStats.averageAttemptsPerStep);
    if (avgAttempts <= 1.2) {
        attemptMessage = '🚀 Çoğu adımı ilk denemede çözdünüz! Harika performans!';
    } else if (avgAttempts <= 2) {
        attemptMessage = '👏 İyi bir performans gösterdiniz!';
    } else {
        attemptMessage = '💪 Pratik yaparak daha az denemede çözebilirsiniz!';
    }
    
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
            
            <div class="performance-info mb-6 space-y-4">
                <div class="learning-performance-info p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                    <div class="flex items-center justify-center gap-2 mb-2">
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
                
                <div class="hint-completion-info p-4 bg-white rounded-lg border border-green-200">
                    <h4 class="font-semibold text-gray-800 mb-2">İpucu Performansınız</h4>
                    <p class="text-gray-700 font-medium ${hintStats.totalHints === 0 ? 'text-green-600' : ''}">${hintMessage}</p>
                    ${hintStats.totalHints > 0 ? `
                        <div class="mt-2 text-sm text-gray-600">
                            İpucu kullanılan adımlar: ${hintStats.usedSteps.map(step => `Adım ${step + 1}`).join(', ')}
                        </div>
                    ` : ''}
                </div>
                
                <div class="attempt-completion-info p-4 bg-white rounded-lg border border-green-200">
                    <h4 class="font-semibold text-gray-800 mb-2">Deneme Performansınız</h4>
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

function isCanvasEmpty(canvasId) {
    const data = canvasManager.canvasPool.get(canvasId);
    if (!data) return true;
    
    const { canvas, ctx } = data;
    
    try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            if (r !== 255 || g !== 255 || b !== 255 || a !== 255) {
                return false;
            }
        }
        
        return true;
    } catch (error) {
        console.error('Canvas boşluk kontrolü hatası:', error);
        return true;
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
            smartGuide.reset();
            
            stateManager.setSolution(solution);
            stateManager.setView('summary');
            showSuccess("Problem başarıyla çözüldü! Advanced Math Renderer ile optimize edildi.", false);
            
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
        showLoading(false);
    }
}

export async function makeApiCall(payload) {
    console.log('🚀 Enhanced API call başlatılıyor...');
    
    try {
        const result = await enhancedApiManager.makeApiCall(payload, 'normal');
        console.log('✅ Enhanced API call başarılı');
        return result;
        
    } catch (error) {
        console.error('❌ Enhanced API call hatası:', error.message);
        
        if (error.message.includes('503') || error.message.includes('overloaded')) {
            console.log('🔥 503 Overload detected - user-friendly message');
            throw new Error('AI sistem şu anda yoğun. Lütfen 1-2 dakika sonra tekrar deneyin.');
        }
        
        if (error.message.includes('timeout')) {
            throw new Error('İstek zaman aşımına uğradı. İnternet bağlantınızı kontrol edin.');
        }
        
        if (error.message.includes('429')) {
            throw new Error('Çok sık istek gönderiliyor. Lütfen biraz bekleyin.');
        }
        
        if (window.errorHandler) {
            const fallbackResult = await window.errorHandler.handleError(error, {
                operation: 'makeApiCall',
                payload: payload
            });
            
            if (fallbackResult) {
                console.log('✅ Error handler fallback data sağladı');
                return fallbackResult;
            }
        }
        
        throw new Error('AI sistemi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.');
    }
}

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
    
    setTimeout(async () => {
        await renderMathInContainer(elements['solution-output'], false);
    }, 100);
    
    console.log('renderFullSolution completed with Advanced Math Renderer');
}

// Global fonksiyonlar
window.makeApiCall = makeApiCall;
window.showError = showError;
window.showSuccess = showSuccess;
window.showLoading = showLoading;
window.stateManager = stateManager;
window.enhancedApiManager = enhancedApiManager;
window.advancedFallbackGenerator = advancedFallbackGenerator;

// API manager stats için global erişim
window.getApiStats = () => enhancedApiManager.getStats();

console.log('✅ Temizlenmiş index.js yüklendi!');

// --- EXPORTS ---
export { canvasManager, errorHandler, stateManager, smartGuide }