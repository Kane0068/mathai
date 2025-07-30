/**
 * FIXED INDEX.JS - Main Application Entry Point
 * 
 * Fixed Issues:
 * 1. Module import/export consistency
 * 2. Proper error handling
 * 3. State management fixes
 * 4. Event handler cleanup
 * 5. API integration improvements
 */

// --- CORE MODULES (Fixed imports) ---
import { applicationLifecycle } from '../modules/applicationLifecycle.js';
import { problemInputManager } from '../modules/problemInputManager.js';
import { apiManager } from '../modules/apiManager.js';
import { mathRendererManager } from '../modules/mathRendererManager.js';
import { solutionDisplayManager } from '../modules/solutionDisplayManager.js';
import { interactiveUIManager } from '../modules/interactiveUIManager.js';

// --- EXISTING MODULES (Fixed imports) ---
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
import { canvasManager } from '../modules/canvasManager.js';
import { errorHandler } from '../modules/errorHandler.js';
import { stateManager } from '../modules/stateManager.js';
import { smartGuide } from '../modules/smartGuide.js';
import { mathSymbolPanel } from '../modules/mathSymbolPanel.js';
import { interactiveSolutionManager } from '../modules/interactiveSolutionManager.js';
import { enhancedMathRenderer } from '../modules/enhancedAdvancedMathRenderer.js';
import { GEMINI_API_URL, logError, getElements, retry } from '../modules/utils.js';

// --- GLOBAL MANAGERS ---
let managers = {
    canvas: null,
    error: null,
    state: null,
    elements: {}
};

let isInitialized = false;
let eventHandlersAttached = false;

// --- APPLICATION STARTUP ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🔄 Fixed application starting...');
        
        if (isInitialized) {
            console.warn('⚠️ Application already initialized');
            return;
        }
        
        await initializeApplication();
        
    } catch (error) {
        console.error('❌ Application startup failed:', error);
        handleCriticalError(error);
    }
});

// --- INITIALIZATION ---
async function initializeApplication() {
    try {
        // Step 1: Initialize core systems
        await initializeCore();
        
        // Step 2: Setup authentication
        await initializeAuth();
        
        // Step 3: Setup DOM and events
        await setupDOMAndEvents();
        
        // Step 4: Initialize modules
        await initializeModules();
        
        isInitialized = true;
        console.log('✅ Application initialized successfully');
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        throw error;
    }
}

async function initializeCore() {
    try {
        // Initialize managers
        managers.canvas = canvasManager;
        managers.error = errorHandler;
        managers.state = stateManager;
        
        // Wait for DOM and render system
        await waitForRenderSystem();
        
        console.log('✅ Core systems initialized');
        
    } catch (error) {
        console.error('❌ Core initialization failed:', error);
        throw error;
    }
}

async function initializeAuth() {
    return new Promise((resolve, reject) => {
        AuthManager.initProtectedPage(async (userData) => {
            try {
                if (!userData) {
                    throw new Error('User data not available');
                }
                
                managers.state.setUser(userData);
                console.log('✅ User authenticated:', userData.email);
                resolve();
                
            } catch (error) {
                console.error('❌ Auth callback error:', error);
                reject(error);
            }
        });
    });
}

async function setupDOMAndEvents() {
    try {
        // Cache DOM elements safely
        await cacheDOMElements();
        
        // Setup event handlers once
        if (!eventHandlersAttached) {
            setupMainEventHandlers();
            eventHandlersAttached = true;
        }
        
        // Setup state management
        setupStateManagement();
        
        console.log('✅ DOM and events setup completed');
        
    } catch (error) {
        console.error('❌ DOM setup failed:', error);
        throw error;
    }
}

async function cacheDOMElements() {
    const elementIds = [
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
    
    const elements = {};
    const missingElements = [];
    
    elementIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            elements[id] = element;
        } else {
            missingElements.push(id);
        }
    });
    
    if (missingElements.length > 0) {
        console.warn('⚠️ Missing DOM elements:', missingElements);
    }
    
    managers.elements = elements;
    
    // Initialize canvas if available
    if (elements.handwritingCanvas) {
        try {
            managers.canvas.initCanvas('handwritingCanvas');
            console.log('✅ Canvas initialized');
        } catch (canvasError) {
            console.error('❌ Canvas initialization failed:', canvasError);
        }
    }
}

async function initializeModules() {
    try {
        // Initialize problem input manager
        problemInputManager.canvasManager = managers.canvas;
        
        // Initialize smart guide
        smartGuide.setCanvasManager(managers.canvas);
        
        // Initialize math symbol panel for keyboard input
        if (managers.elements['keyboard-input']) {
            mathSymbolPanel.createPanel('keyboard-input');
        }
        
        console.log('✅ Modules initialized');
        
    } catch (error) {
        console.error('❌ Module initialization failed:', error);
        throw error;
    }
}

// --- EVENT HANDLERS (Fixed) ---
function setupMainEventHandlers() {
    try {
        console.log('🔄 Setting up event handlers...');
        
        // Basic navigation
        addSafeEventHandler('logout-btn', 'click', handleLogout);
        addSafeEventHandler('new-question-btn', 'click', handleNewQuestion);
        
        // Input mode handlers
        addSafeEventHandler('photo-mode-btn', 'click', () => {
            managers.state.setInputMode('photo');
            updateInputModeDisplay();
        });
        
        addSafeEventHandler('handwriting-mode-btn', 'click', () => {
            managers.state.setInputMode('handwriting');
            updateInputModeDisplay();
        });
        
        addSafeEventHandler('switchToCanvasBtn', 'click', () => {
            managers.state.setHandwritingInputType('canvas');
            updateInputModeDisplay();
        });
        
        addSafeEventHandler('switchToKeyboardBtn', 'click', () => {
            managers.state.setHandwritingInputType('keyboard');
            updateInputModeDisplay();
        });
        
        // Problem input handlers
        addSafeEventHandler('startFromPhotoBtn', 'click', () => handleNewProblem('image'));
        addSafeEventHandler('recognizeHandwritingBtn', 'click', () => handleNewProblem('canvas'));
        addSafeEventHandler('startFromTextBtn', 'click', () => handleNewProblem('text'));
        
        // Solution option handlers
        addSafeEventHandler('start-solving-workspace-btn', 'click', handleStartInteractiveSolution);
        addSafeEventHandler('show-full-solution-btn', 'click', handleShowFullSolution);
        addSafeEventHandler('solve-all-btn', 'click', handleShowStepByStepSolution);
        
        // Canvas tool handlers
        setupCanvasToolHandlers();
        
        // File upload handlers
        setupFileUploadHandlers();
        
        // Global keyboard shortcuts
        setupGlobalKeyboardShortcuts();
        
        console.log('✅ Event handlers setup completed');
        
    } catch (error) {
        console.error('❌ Event handler setup failed:', error);
    }
}

function addSafeEventHandler(elementId, event, handler) {
    const element = managers.elements[elementId];
    if (element) {
        // Remove existing listeners to prevent duplicates
        element.removeEventListener(event, handler);
        element.addEventListener(event, handler);
    } else {
        console.warn(`⚠️ Element not found for event handler: ${elementId}`);
    }
}

function setupCanvasToolHandlers() {
    const tools = [
        { id: 'hw-pen-btn', tool: 'pen' },
        { id: 'hw-eraser-btn', tool: 'eraser' }
    ];
    
    tools.forEach(({ id, tool }) => {
        addSafeEventHandler(id, 'click', () => {
            setCanvasTool(tool);
            updateCanvasToolButtons(tool);
        });
    });
    
    addSafeEventHandler('hw-undo-btn', 'click', () => {
        managers.canvas.undo('handwritingCanvas');
    });
    
    addSafeEventHandler('hw-clear-btn', 'click', () => {
        managers.canvas.clear('handwritingCanvas');
    });
}

function setupFileUploadHandlers() {
    addSafeEventHandler('imageUploader', 'change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    });
    
    // Setup drag and drop
    const photoContainer = managers.elements['photo-mode-container'];
    if (photoContainer) {
        photoContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            photoContainer.classList.add('drag-over');
        });
        
        photoContainer.addEventListener('dragleave', () => {
            photoContainer.classList.remove('drag-over');
        });
        
        photoContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            photoContainer.classList.remove('drag-over');
            
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileSelect(e.dataTransfer.files[0]);
            }
        });
    }
}

function setupGlobalKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+N: New question
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            handleNewQuestion();
        }
        
        // Escape: Cancel current operation
        if (e.key === 'Escape') {
            const currentView = managers.state.getStateValue('ui').view;
            if (currentView !== 'setup') {
                handleNewQuestion();
            }
        }
    });
}

function setupStateManagement() {
    // Subscribe to state changes
    managers.state.subscribe(renderApp);
    
    // Initialize default view
    managers.state.setView('setup');
    managers.state.setInputMode('photo');
    managers.state.setHandwritingInputType('canvas');
}

// --- CORE HANDLERS (Fixed) ---

async function handleLogout() {
    try {
        showLoading('Çıkış yapılıyor...');
        await AuthManager.logout();
    } catch (error) {
        console.error('❌ Logout error:', error);
        showError('Çıkış yapılırken hata oluştu.', false);
    }
}

async function handleNewQuestion() {
    try {
        console.log('🔄 Starting new question...');
        
        // Reset all systems
        managers.state.reset();
        smartGuide.reset();
        interactiveSolutionManager.reset();
        
        // Clear UI elements
        clearAllUIElements();
        
        // Reset to setup view
        setTimeout(() => {
            managers.state.setView('setup');
            updateInputModeDisplay();
        }, 100);
        
        console.log('✅ New question setup completed');
        
    } catch (error) {
        console.error('❌ New question error:', error);
        showError('Yeni soru yüklenirken hata oluştu.', false);
    }
}

async function handleNewProblem(sourceType) {
    try {
        console.log(`🔄 Processing new problem: ${sourceType}`);
        
        // Validate user query limit
        if (!(await validateQueryLimit())) {
            return;
        }
        
        // Show analysis steps
        showAnalysisSteps();
        
        // Process input
        const inputResult = await processInput(sourceType);
        if (!inputResult) {
            showLoading(false);
            return;
        }
        
        // Make API call
        const solution = await makeAPICall(sourceType, inputResult);
        if (!solution) {
            showLoading(false);
            showError("Problem çözülürken bir hata oluştu. Lütfen tekrar deneyin.", false);
            return;
        }
        
        // Success handling
        await handleProblemSuccess(solution);
        
    } catch (error) {
        showLoading(false);
        console.error('❌ Problem processing error:', error);
        
        const errorMessage = getErrorMessage(error);
        showError(errorMessage, false);
    }
}

async function processInput(sourceType) {
    try {
        const inputResult = await problemInputManager.processProblemInput(sourceType, managers.elements);
        console.log('✅ Input processed successfully');
        return inputResult;
    } catch (error) {
        console.error('❌ Input processing failed:', error);
        showError(error.message || 'Girdi işlenirken hata oluştu.', false);
        return null;
    }
}

async function makeAPICall(sourceType, inputResult) {
    try {
        const solution = await apiManager.makeApiCallWithRetry(
            sourceType,
            inputResult.sourceData,
            inputResult.problemContextForPrompt,
            3 // max retries
        );
        
        if (solution && solution.problemOzeti) {
            console.log('✅ API call successful');
            return solution;
        } else {
            throw new Error('Invalid solution format received');
        }
        
    } catch (error) {
        console.error('❌ API call failed:', error);
        return null;
    }
}

async function handleProblemSuccess(solution) {
    try {
        showLoading(false);
        
        // Reset guides for new problem
        smartGuide.reset();
        interactiveSolutionManager.reset();
        
        // Store solution and update view
        managers.state.setSolution(solution);
        managers.state.setView('summary');
        
        // Increment query count
        await FirestoreManager.incrementQueryCount();
        
        // Show success message
        setTimeout(() => {
            showSuccess("Problem başarıyla çözüldü! Enhanced Math Renderer v2 ile optimize edildi.", true, 4000);
        }, 300);
        
        console.log('✅ Problem success handling completed');
        
    } catch (error) {
        console.error('❌ Problem success handling failed:', error);
        showError('Çözüm kaydedilirken hata oluştu.', false);
    }
}

async function handleStartInteractiveSolution() {
    try {
        const solution = managers.state.getStateValue('problem').solution;
        if (!solution) {
            showError("Henüz bir çözüm bulunamadı. Lütfen önce bir soru yükleyin.", false);
            return;
        }
        
        console.log('🔄 Starting interactive solution...');
        
        // Initialize interactive solution manager
        const initResult = interactiveSolutionManager.initializeInteractiveSolution(solution);
        
        if (initResult.success) {
            // Initialize smart guide
            await smartGuide.initializeGuidance(solution);
            
            // Switch to interactive view
            managers.state.setView('interactive');
            
            console.log('✅ Interactive solution started');
        } else {
            throw new Error(initResult.error || 'Interactive solution initialization failed');
        }
        
    } catch (error) {
        console.error('❌ Interactive solution start error:', error);
        showError('İnteraktif çözüm başlatılamadı: ' + error.message, false);
    }
}

async function handleShowFullSolution() {
    try {
        const solution = managers.state.getStateValue('problem').solution;
        if (!solution) {
            showError("Henüz bir çözüm bulunamadı. Lütfen önce bir soru yükleyin.", false);
            return;
        }
        
        managers.state.setView('fullSolution');
        console.log('✅ Switching to full solution view');
        
    } catch (error) {
        console.error('❌ Full solution display error:', error);
        showError("Tam çözüm gösterilemedi.", false);
    }
}

async function handleShowStepByStepSolution() {
    try {
        const solution = managers.state.getStateValue('problem').solution;
        if (!solution) {
            showError("Henüz bir çözüm bulunamadı. Lütfen önce bir soru yükleyin.", false);
            return;
        }
        
        managers.state.setView('solving');
        console.log('✅ Switching to step-by-step solution view');
        
    } catch (error) {
        console.error('❌ Step-by-step solution display error:', error);
        showError("Adım adım çözüm gösterilemedi.", false);
    }
}

// --- APP RENDERING (Fixed) ---
async function renderApp(state) {
    try {
        console.log('🔄 Rendering app with state:', state.ui.view);
        
        // Prevent concurrent renders
        if (managers.isRendering) {
            console.log('⚠️ Render already in progress, skipping...');
            return;
        }
        
        managers.isRendering = true;
        
        try {
            // Hide all containers first
            hideAllContainers();
            
            // Render based on current view
            switch (state.ui.view) {
                case 'setup':
                    await renderSetupView(state);
                    break;
                    
                case 'summary':
                    await renderSummaryView(state);
                    break;
                    
                case 'fullSolution':
                    await renderFullSolutionView(state);
                    break;
                    
                case 'solving':
                    await renderSolvingView(state);
                    break;
                    
                case 'interactive':
                    await renderInteractiveView(state);
                    break;
                    
                default:
                    console.warn('⚠️ Unknown view:', state.ui.view);
                    await renderSetupView(state);
            }
            
            // Update UI elements
            updateQueryCountDisplay(state);
            updateInputModeDisplay();
            
        } finally {
            managers.isRendering = false;
        }
        
    } catch (error) {
        managers.isRendering = false;
        console.error('❌ App render error:', error);
        showError('Sayfa yüklenirken hata oluştu.', false);
    }
}

async function renderSetupView(state) {
    showContainer('question-setup-area');
    console.log('✅ Setup view rendered');
}

async function renderSummaryView(state) {
    const solution = state.problem.solution;
    if (!solution) {
        console.error('❌ No solution data for summary view');
        return;
    }
    
    showContainer('question-setup-area');
    showContainer('result-container');
    
    try {
        await solutionDisplayManager.displaySolutionSummary(solution, managers.elements);
        console.log('✅ Summary view rendered');
    } catch (error) {
        console.error('❌ Summary view render error:', error);
        showError('Özet görünümü yüklenemedi.', false);
    }
}

async function renderFullSolutionView(state) {
    const solution = state.problem.solution;
    if (!solution) {
        console.error('❌ No solution data for full solution view');
        return;
    }
    
    showContainer('result-container');
    
    try {
        await solutionDisplayManager.renderFullSolution(solution, managers.elements);
        console.log('✅ Full solution view rendered');
    } catch (error) {
        console.error('❌ Full solution view render error:', error);
        showError('Tam çözüm görünümü yüklenemedi.', false);
    }
}

async function renderSolvingView(state) {
    const solution = state.problem.solution;
    if (!solution) {
        console.error('❌ No solution data for solving view');
        return;
    }
    
    showContainer('result-container');
    
    try {
        await solutionDisplayManager.renderStepByStepSolution(solution, managers.elements);
        console.log('✅ Solving view rendered');
    } catch (error) {
        console.error('❌ Solving view render error:', error);
        showError('Adım adım çözüm görünümü yüklenemedi.', false);
    }
}

async function renderInteractiveView(state) {
    showContainer('result-container');
    
    try {
        // The interactive solution manager handles the detailed rendering
        // This is mainly triggered by the smart guide initialization
        console.log('✅ Interactive view rendered');
    } catch (error) {
        console.error('❌ Interactive view render error:', error);
        showError('İnteraktif çözüm görünümü yüklenemedi.', false);
    }
}

// --- UTILITY FUNCTIONS (Fixed) ---

async function validateQueryLimit() {
    try {
        const userData = managers.state.getStateValue('user');
        if (!userData) {
            showError('Kullanıcı bilgileri bulunamadı. Lütfen yeniden giriş yapın.', false);
            return false;
        }
        
        const limit = userData.membershipType === 'premium' ? 200 : 5;
        
        if (userData.dailyQueryCount >= limit) {
            showError(`Günlük sorgu limitiniz (${limit}) doldu. Yarın tekrar deneyin.`, false);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('❌ Query limit validation error:', error);
        return false;
    }
}

function showAnalysisSteps() {
    const analysisSteps = [
        { title: "API bağlantısı kuruluyor", description: "Yapay zeka servisine bağlanılıyor..." },
        { title: "Soru içerik kontrolü yapılıyor", description: "Problem analiz ediliyor..." },
        { title: "Matematiksel ifadeler tespit ediliyor", description: "Formüller ve denklemler çözümleniyor..." },
        { title: "Çözüm adımları hazırlanıyor", description: "Adım adım çözüm planı oluşturuluyor..." },
        { title: "Enhanced Math Renderer hazırlanıyor", description: "Gelişmiş matematik render sistemi ile optimize ediliyor..." }
    ];
    
    showAnimatedLoading(analysisSteps, 800);
}

async function handleFileSelect(file) {
    try {
        await problemInputManager.handleFileSelect(file, managers.elements);
    } catch (error) {
        console.error('❌ File select error:', error);
        showError('Dosya yüklenirken hata oluştu: ' + error.message, false);
    }
}

function setCanvasTool(tool) {
    try {
        managers.canvas.setTool('handwritingCanvas', tool);
        console.log(`✅ Canvas tool set to: ${tool}`);
    } catch (error) {
        console.error('❌ Canvas tool setting error:', error);
    }
}

function updateCanvasToolButtons(activeTool) {
    const tools = ['pen', 'eraser'];
    tools.forEach(tool => {
        const button = managers.elements[`hw-${tool}-btn`];
        if (button) {
            button.classList.toggle('canvas-tool-active', tool === activeTool);
        }
    });
}

function hideAllContainers() {
    const containers = [
        'question-setup-area',
        'result-container',
        'solving-workspace'
    ];
    
    containers.forEach(id => {
        const element = managers.elements[id];
        if (element) {
            element.classList.add('hidden');
        }
    });
}

function showContainer(containerId) {
    const element = managers.elements[containerId];
    if (element) {
        element.classList.remove('hidden');
    } else {
        console.warn(`⚠️ Container not found: ${containerId}`);
    }
}

function updateInputModeDisplay() {
    try {
        const state = managers.state.getStateValue('ui');
        
        // Update input mode containers
        const photoContainer = managers.elements['photo-mode-container'];
        const handwritingContainer = managers.elements['handwriting-mode-container'];
        
        if (photoContainer) {
            photoContainer.classList.toggle('hidden', state.inputMode !== 'photo');
        }
        if (handwritingContainer) {
            handwritingContainer.classList.toggle('hidden', state.inputMode !== 'handwriting');
        }
        
        // Update handwriting input type
        const canvasContainer = managers.elements['handwriting-canvas-container'];
        const keyboardContainer = managers.elements['keyboard-input-container'];
        
        if (canvasContainer) {
            canvasContainer.classList.toggle('hidden', state.handwritingInputType !== 'canvas');
        }
        if (keyboardContainer) {
            keyboardContainer.classList.toggle('hidden', state.handwritingInputType !== 'keyboard');
        }
        
        // Update button states
        updateModeButtons(state);
        
    } catch (error) {
        console.error('❌ Input mode display update error:', error);
    }
}

function updateModeButtons(state) {
    const photoBtn = managers.elements['photo-mode-btn'];
    const handwritingBtn = managers.elements['handwriting-mode-btn'];
    const canvasBtn = managers.elements['switchToCanvasBtn'];
    const keyboardBtn = managers.elements['switchToKeyboardBtn'];
    
    if (photoBtn && handwritingBtn) {
        photoBtn.classList.toggle('btn-active', state.inputMode === 'photo');
        handwritingBtn.classList.toggle('btn-active', state.inputMode === 'handwriting');
    }
    
    if (canvasBtn && keyboardBtn) {
        canvasBtn.classList.toggle('btn-active', state.handwritingInputType === 'canvas');
        keyboardBtn.classList.toggle('btn-active', state.handwritingInputType === 'keyboard');
    }
}

function updateQueryCountDisplay(state) {
    const queryCountElement = managers.elements['query-count'];
    if (queryCountElement && state.user) {
        const limit = state.user.membershipType === 'premium' ? 200 : 5;
        queryCountElement.textContent = `${state.user.dailyQueryCount}/${limit}`;
    }
}

function clearAllUIElements() {
    try {
        // Clear canvas
        if (managers.canvas) {
            managers.canvas.clear('handwritingCanvas');
        }
        
        // Clear text input
        const textInput = managers.elements['keyboard-input'];
        if (textInput) {
            textInput.value = '';
        }
        
        // Clear file input
        const fileInput = managers.elements['imageUploader'];
        if (fileInput) {
            fileInput.value = '';
        }
        
        // Reset image preview
        const imagePreview = managers.elements['imagePreview'];
        const previewContainer = managers.elements['preview-container'];
        const uploadSelection = managers.elements['upload-selection'];
        const startPhotoBtn = managers.elements['startFromPhotoBtn'];
        
        if (imagePreview) imagePreview.src = '';
        if (previewContainer) previewContainer.classList.add('hidden');
        if (uploadSelection) uploadSelection.classList.remove('hidden');
        if (startPhotoBtn) startPhotoBtn.disabled = true;
        
        // Clear solution displays
        const solutionOutput = managers.elements['solution-output'];
        const statusMessage = managers.elements['status-message'];
        
        if (solutionOutput) solutionOutput.innerHTML = '';
        if (statusMessage) statusMessage.innerHTML = '';
        
        console.log('✅ UI elements cleared');
        
    } catch (error) {
        console.error('❌ UI clearing error:', error);
    }
}

function getErrorMessage(error) {
    if (error.message) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
            return 'İnternet bağlantısı hatası. Lütfen bağlantınızı kontrol edin.';
        } else if (error.message.includes('limit') || error.message.includes('rate')) {
            return 'Çok fazla istek gönderildi. Lütfen bekleyin ve tekrar deneyin.';
        } else if (error.message.includes('auth')) {
            return 'Yetkilendirme hatası. Lütfen yeniden giriş yapın.';
        }
    }
    return 'Beklenmedik bir hata oluştu. Lütfen tekrar deneyin.';
}

function handleCriticalError(error) {
    console.error('🚨 Critical application error:', error);
    
    document.body.innerHTML = `
        <div class="min-h-screen flex items-center justify-center bg-gray-100">
            <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
                <div class="text-red-500 text-6xl mb-4">⚠️</div>
                <h1 class="text-2xl font-bold text-gray-800 mb-2">Uygulama Hatası</h1>
                <p class="text-gray-600 mb-4">Uygulama başlatılırken kritik bir hata oluştu.</p>
                <p class="text-sm text-gray-500 mb-6">${error.message || 'Bilinmeyen hata'}</p>
                <button onclick="window.location.reload()" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                    Sayfayı Yenile
                </button>
            </div>
        </div>
    `;
}

// --- INTERACTIVE SOLUTION HANDLERS (Fixed) ---

// Setup interactive solution event handlers
function setupInteractiveHandlers() {
    // This will be called when switching to interactive view
    document.addEventListener('click', handleInteractiveClick);
    document.addEventListener('keydown', handleInteractiveKeydown);
}

function handleInteractiveClick(e) {
    try {
        // Handle option selection
        if (e.target.classList.contains('option-radio') || e.target.closest('.option-label')) {
            const optionLabel = e.target.closest('.option-label');
            if (optionLabel) {
                const optionId = optionLabel.dataset.optionId;
                selectInteractiveOption(optionId);
            }
        }
        
        // Handle submit button
        if (e.target.id === 'interactive-submit-btn') {
            e.preventDefault();
            submitInteractiveAnswer();
        }
        
        // Handle hint button
        if (e.target.id === 'interactive-hint-btn') {
            e.preventDefault();
            showInteractiveHint();
        }
        
        // Handle reset button
        if (e.target.id === 'interactive-reset-btn') {
            e.preventDefault();
            resetInteractiveSolution();
        }
        
        // Handle completion buttons
        if (e.target.id === 'interactive-new-problem-btn') {
            e.preventDefault();
            handleNewQuestion();
        }
        
        if (e.target.id === 'interactive-review-solution-btn') {
            e.preventDefault();
            handleShowFullSolution();
        }
        
        if (e.target.id === 'interactive-try-step-by-step-btn') {
            e.preventDefault();
            handleShowStepByStepSolution();
        }
        
    } catch (error) {
        console.error('❌ Interactive click handler error:', error);
    }
}

function handleInteractiveKeydown(e) {
    try {
        // Only handle if in interactive view
        const currentView = managers.state.getStateValue('ui').view;
        if (currentView !== 'interactive') return;
        
        // Handle number keys for option selection
        if (e.key >= '1' && e.key <= '3') {
            e.preventDefault();
            const optionIndex = parseInt(e.key) - 1;
            selectInteractiveOption(optionIndex);
        }
        
        // Handle Enter key for submit
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitInteractiveAnswer();
        }
        
        // Handle H key for hint
        if (e.key.toLowerCase() === 'h' && e.ctrlKey) {
            e.preventDefault();
            showInteractiveHint();
        }
        
    } catch (error) {
        console.error('❌ Interactive keydown handler error:', error);
    }
}

let selectedInteractiveOption = null;

function selectInteractiveOption(optionId) {
    try {
        // Clear previous selections
        document.querySelectorAll('.option-label').forEach(label => {
            label.classList.remove('option-selected');
        });
        
        // Select new option
        const optionLabel = document.querySelector(`[data-option-id="${optionId}"]`);
        if (optionLabel) {
            optionLabel.classList.add('option-selected');
            selectedInteractiveOption = optionId;
            
            // Enable submit button
            const submitBtn = document.getElementById('interactive-submit-btn');
            if (submitBtn) {
                submitBtn.disabled = false;
            }
        }
        
    } catch (error) {
        console.error('❌ Option selection error:', error);
    }
}

async function submitInteractiveAnswer() {
    try {
        if (selectedInteractiveOption === null) {
            showInViewNotification('Lütfen bir seçenek seçin.', 'warning', true, 3000);
            return;
        }
        
        console.log(`🔄 Submitting interactive answer: ${selectedInteractiveOption}`);
        
        // Disable UI during processing
        disableInteractiveUI();
        
        // Evaluate the selected option
        const result = await interactiveSolutionManager.evaluateSelection(selectedInteractiveOption);
        
        if (result.success) {
            await handleInteractiveResult(result);
        } else {
            enableInteractiveUI();
            showError(result.error || 'Değerlendirme sırasında hata oluştu.', false);
        }
        
    } catch (error) {
        enableInteractiveUI();
        console.error('❌ Interactive answer submission error:', error);
        showError('Cevap gönderilirken hata oluştu.', false);
    }
}

async function handleInteractiveResult(result) {
    try {
        // Show result in UI
        const resultContainer = document.getElementById('interactive-result-container');
        if (resultContainer) {
            resultContainer.innerHTML = interactiveUIManager.generateResultHTML(result);
            resultContainer.classList.remove('hidden');
        }
        
        // Highlight options
        interactiveUIManager.highlightOptions(result);
        
        if (result.isCorrect) {
            if (result.isCompleted) {
                // Show completion screen
                await showInteractiveCompletion(result.completionStats);
            } else {
                // Proceed to next step
                setTimeout(async () => {
                    await proceedToNextInteractiveStep();
                }, 2000);
            }
        } else {
            if (result.shouldResetToSetup) {
                // All attempts exhausted - reset to setup
                setTimeout(() => {
                    interactiveUIManager.showResetNotification(result.message);
                    setTimeout(() => {
                        handleNewQuestion();
                    }, 3000);
                }, 2000);
            } else {
                // Enable UI for retry
                setTimeout(() => {
                    enableInteractiveUI();
                    resetInteractiveSelection();
                }, 2000);
            }
        }
        
    } catch (error) {
        console.error('❌ Interactive result handling error:', error);
        enableInteractiveUI();
    }
}

async function proceedToNextInteractiveStep() {
    try {
        const nextStep = interactiveSolutionManager.generateStepOptions(
            interactiveSolutionManager.currentStep
        );
        
        if (nextStep && nextStep.success) {
            await renderInteractiveStep(nextStep);
        } else {
            console.error('❌ Failed to generate next step');
            showError('Sonraki adıma geçilirken hata oluştu.', false);
        }
        
    } catch (error) {
        console.error('❌ Next step error:', error);
        showError('Sonraki adıma geçilirken hata oluştu.', false);
    }
}

async function renderInteractiveStep(stepData) {
    try {
        const solutionOutput = managers.elements['solution-output'];
        if (!solutionOutput) {
            throw new Error('Solution output container not found');
        }
        
        // Generate step HTML
        const stepHTML = interactiveUIManager.generateInteractiveHTML(stepData);
        solutionOutput.innerHTML = stepHTML;
        
        // Reset UI state
        selectedInteractiveOption = null;
        enableInteractiveUI();
        
        // Render math content
        await renderMathInContainer(solutionOutput);
        
        console.log(`✅ Interactive step ${stepData.stepNumber} rendered`);
        
    } catch (error) {
        console.error('❌ Interactive step render error:', error);
        showError('Adım gösterilirken hata oluştu.', false);
    }
}

async function showInteractiveCompletion(completionStats) {
    try {
        const solutionOutput = managers.elements['solution-output'];
        if (!solutionOutput) return;
        
        const completionHTML = interactiveUIManager.generateCompletionHTML(completionStats);
        solutionOutput.innerHTML = completionHTML;
        
        await renderMathInContainer(solutionOutput);
        
        console.log('✅ Interactive completion shown');
        
    } catch (error) {
        console.error('❌ Interactive completion error:', error);
    }
}

function showInteractiveHint() {
    try {
        const hint = smartGuide.getCurrentStepHint();
        if (hint) {
            interactiveUIManager.showHint(hint);
        } else {
            showInViewNotification('Bu adım için ipucu mevcut değil.', 'info', true, 3000);
        }
    } catch (error) {
        console.error('❌ Interactive hint error:', error);
    }
}

function resetInteractiveSolution() {
    try {
        if (confirm('İnteraktif çözümü sıfırlamak istediğinizden emin misiniz?')) {
            interactiveSolutionManager.reset();
            smartGuide.reset();
            handleStartInteractiveSolution();
        }
    } catch (error) {
        console.error('❌ Interactive reset error:', error);
    }
}

function disableInteractiveUI() {
    interactiveUIManager.disableUI();
}

function enableInteractiveUI() {
    interactiveUIManager.enableUI();
}

function resetInteractiveSelection() {
    selectedInteractiveOption = null;
    document.querySelectorAll('.option-label').forEach(label => {
        label.classList.remove('option-selected');
    });
    
    const submitBtn = document.getElementById('interactive-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
    }
}

// --- GLOBAL EXPORTS (for backward compatibility) ---
window.makeApiCall = apiManager.makeApiCall.bind(apiManager);
window.checkApiHealth = apiManager.checkApiHealth.bind(apiManager);
window.showError = showError;
window.showSuccess = showSuccess;
window.showLoading = showLoading;
window.stateManager = managers.state;
window.renderMath = renderMath;
window.enhancedMathRenderer = enhancedMathRenderer;
window.smartGuide = smartGuide;
window.interactiveSolutionManager = interactiveSolutionManager;
window.showInViewNotification = showInViewNotification;
window.managers = managers;

// --- DEBUG FUNCTIONS (Enhanced) ---
window.debugApp = function() {
    console.group('🔍 Application Debug Info (Fixed)');
    
    console.log('📊 Application Status:');
    console.log('  - Initialized:', isInitialized);
    console.log('  - Event Handlers Attached:', eventHandlersAttached);
    console.log('  - Is Rendering:', managers.isRendering);
    
    if (managers.state) {
        const state = managers.state.getStateValue('ui');
        console.log('📱 Current State:');
        console.log('  - View:', state.view);
        console.log('  - Input Mode:', state.inputMode);
        console.log('  - Handwriting Type:', state.handwritingInputType);
        console.log('  - Loading:', state.isLoading);
        console.log('  - Error:', state.error);
    }
    
    console.log('🏗️ Managers Status:');
    console.log('  - Canvas Manager:', !!managers.canvas);
    console.log('  - Error Handler:', !!managers.error);
    console.log('  - State Manager:', !!managers.state);
    console.log('  - Elements Cached:', Object.keys(managers.elements).length);
    
    console.log('🧮 Math Renderer Status:');
    if (enhancedMathRenderer) {
        console.log('  - MathJax Ready:', enhancedMathRenderer.mathJaxReady);
        console.log('  - KaTeX Ready:', enhancedMathRenderer.katexReady);
    }
    
    console.log('🎯 Interactive Solution Status:');
    if (interactiveSolutionManager) {
        console.log('  - Current Step:', interactiveSolutionManager.currentStep + 1);
        console.log('  - Total Steps:', interactiveSolutionManager.totalSteps);
        console.log('  - Total Attempts:', interactiveSolutionManager.totalAttempts);
        console.log('  - Max Attempts:', interactiveSolutionManager.maxAttempts);
        console.log('  - Is Completed:', interactiveSolutionManager.isCompleted);
    }
    
    console.groupEnd();
};

window.forceResetToSummary = function() {
    console.log('🔄 Force reset to summary (fixed)...');
    
    try {
        // Reset all systems
        if (interactiveSolutionManager) {
            interactiveSolutionManager.reset();
        }
        
        if (smartGuide) {
            smartGuide.reset();
        }
        
        // Clear UI
        interactiveUIManager.clearDOM();
        clearAllUIElements();
        
        // Reset state
        if (managers.state) {
            managers.state.setView('summary');
        }
        
        // Reset selection
        selectedInteractiveOption = null;
        
        setTimeout(() => {
            showSuccess("Zorla ana menüye döndürüldü.", true, 3000);
        }, 500);
        
        console.log('✅ Force reset completed (fixed)');
        
    } catch (error) {
        console.error('❌ Force reset error:', error);
        // Last resort - reload page
        if (confirm('Reset başarısız. Sayfayı yenilemek ister misiniz?')) {
            window.location.reload();
        }
    }
};

window.testInteractive = function() {
    console.log('🧪 Testing interactive solution...');
    
    try {
        const solution = managers.state.getStateValue('problem').solution;
        if (!solution) {
            console.error('❌ No solution data for testing');
            return;
        }
        
        console.log('📊 Solution Data:', solution);
        
        // Test interactive solution manager
        const initResult = interactiveSolutionManager.initializeInteractiveSolution(solution);
        console.log('📊 Init Result:', initResult);
        
        if (initResult.success) {
            const stepOptions = interactiveSolutionManager.generateStepOptions(0);
            console.log('📊 Step Options:', stepOptions);
        }
        
    } catch (error) {
        console.error('❌ Interactive test error:', error);
    }
};

// --- CLEANUP AND ERROR RECOVERY ---
window.addEventListener('beforeunload', async () => {
    try {
        // Cleanup resources
        if (managers.canvas) {
            managers.canvas.destroy && managers.canvas.destroy();
        }
        
        if (mathSymbolPanel) {
            mathSymbolPanel.destroy && mathSymbolPanel.destroy();
        }
        
        console.log('✅ Application cleanup completed on unload');
    } catch (error) {
        console.error('❌ Cleanup on unload failed:', error);
    }
});

// Handle uncaught errors
window.addEventListener('error', (event) => {
    console.error('🚨 Uncaught error:', event.error);
    
    // Don't show error popup for minor issues
    const minorErrorKeywords = ['ResizeObserver', 'Non-Error promise rejection'];
    const isMinorError = minorErrorKeywords.some(keyword => 
        event.error?.message?.includes(keyword)
    );
    
    if (!isMinorError) {
        managers.error && managers.error.handleError(event.error, {
            operation: 'global_error_handler',
            context: { filename: event.filename, lineno: event.lineno }
        });
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled promise rejection:', event.reason);
    
    managers.error && managers.error.handleError(new Error(event.reason), {
        operation: 'unhandled_promise_rejection'
    });
    
    // Prevent the default behavior (logging to console)
    event.preventDefault();
});

// --- INITIALIZATION TRIGGER ---
// The initialization will be triggered by the DOMContentLoaded event at the top

console.log(`
🎉 FIXED INDEX.JS LOADED
🐛 Issues Fixed:
  ✅ Module import/export consistency
  ✅ Proper error handling and recovery
  ✅ State management improvements  
  ✅ Event handler cleanup and deduplication
  ✅ API integration fixes
  ✅ Interactive solution system fixes
  ✅ Math rendering improvements
  ✅ DOM timing issue resolution
  ✅ Memory leak prevention
  ✅ Better debugging capabilities

🚀 Ready for testing!
`);

// Export for module compatibility
export { 
    managers,
    isInitialized,
    handleNewQuestion,
    handleNewProblem,
    handleStartInteractiveSolution,
    handleShowFullSolution,
    handleShowStepByStepSolution,
    setupInteractiveHandlers
};