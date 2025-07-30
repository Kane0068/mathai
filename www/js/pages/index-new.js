// =================================================================================
//  Index Page - New Modular Architecture
//  Entry point for the math assistant application
// =================================================================================

import { mathAiApp } from '../core/application.js';
import { AuthManager } from '../modules/auth.js';

// Application initialization
window.addEventListener('load', async () => {
    try {
        // Initialize authentication first
        AuthManager.initProtectedPage(async (userData) => {
            if (userData) {
                console.log('👤 User authenticated:', userData.displayName || userData.email);
                
                // Wait for app initialization
                await mathAiApp.initialize();
                
                // Set user in state
                const stateManager = mathAiApp.getService('stateManager');
                stateManager.setUser(userData);
                
                // Setup page-specific event handlers
                setupPageEventHandlers();
                
                console.log('✅ Application ready');
                
            } else {
                console.error('❌ User authentication failed');
                document.body.innerHTML = '<div class="text-center p-8"><p class="text-red-600">Uygulama başlatılamadı. Lütfen giriş yapın.</p></div>';
            }
        });
        
    } catch (error) {
        console.error('❌ Application initialization failed:', error);
        
        // Show user-friendly error
        document.body.innerHTML = `
            <div class="text-center p-8">
                <h2 class="text-xl font-semibold text-red-600 mb-4">Uygulama Başlatılamadı</h2>
                <p class="text-gray-600 mb-4">${error.message}</p>
                <button onclick="location.reload()" class="btn btn-primary">Yeniden Dene</button>
            </div>
        `;
    }
});

function setupPageEventHandlers() {
    console.log('🎧 Setting up page-specific event handlers...');
    
    // Get services
    const stateManager = mathAiApp.getService('stateManager');
    const canvasManager = mathAiApp.getService('canvasManager');
    
    // Initialize main canvas
    const handwritingCanvas = document.getElementById('handwritingCanvas');
    if (handwritingCanvas) {
        canvasManager.initCanvas('handwritingCanvas');
    }
    
    // Setup input mode switching
    setupInputModeHandlers();
    
    // Setup smart guide integration
    setupSmartGuideHandlers();
    
    // Setup authentication handlers
    setupAuthHandlers();
    
    // Subscribe to app events
    setupAppEventHandlers();
    
    console.log('✅ Page event handlers set up');
}

function setupInputModeHandlers() {
    const stateManager = mathAiApp.getService('stateManager');
    
    // Photo/Handwriting mode toggle
    const photoModeBtn = document.getElementById('photo-mode-btn');
    const handwritingModeBtn = document.getElementById('handwriting-mode-btn');
    
    if (photoModeBtn) {
        photoModeBtn.addEventListener('click', () => {
            stateManager.setInputMode('photo');
        });
    }
    
    if (handwritingModeBtn) {
        handwritingModeBtn.addEventListener('click', () => {
            stateManager.setInputMode('handwriting');
        });
    }
    
    // Canvas/Keyboard toggle for handwriting mode
    const switchToCanvasBtn = document.getElementById('switchToCanvasBtn');
    const switchToKeyboardBtn = document.getElementById('switchToKeyboardBtn');
    
    if (switchToCanvasBtn) {
        switchToCanvasBtn.addEventListener('click', () => {
            stateManager.setHandwritingInputType('canvas');
        });
    }
    
    if (switchToKeyboardBtn) {
        switchToKeyboardBtn.addEventListener('click', () => {
            stateManager.setHandwritingInputType('keyboard');
        });
    }
}

function setupSmartGuideHandlers() {
    // Smart guide integration
    const startSolvingBtn = document.getElementById('start-solving-workspace-btn');
    
    if (startSolvingBtn) {
        startSolvingBtn.addEventListener('click', async () => {
            const solution = mathAiApp.getService('problemSolverService').getCurrentSolution();
            
            if (solution) {
                // Start interactive/smart guide mode
                mathAiApp.startInteractiveMode();
            } else {
                mathAiApp.getService('uiService').showError('Önce bir problem çözmelisiniz.');
            }
        });
    }
    
    // Show full solution button
    const showFullSolutionBtn = document.getElementById('show-full-solution-btn');
    
    if (showFullSolutionBtn) {
        showFullSolutionBtn.addEventListener('click', () => {
            const stateManager = mathAiApp.getService('stateManager');
            stateManager.setView('fullSolution');
        });
    }
}

function setupAuthHandlers() {
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            AuthManager.logout();
        });
    }
}

function setupAppEventHandlers() {
    // Listen to application events
    mathAiApp.addEventListener('problem:solved', (event) => {
        console.log('✅ Problem solved:', event.detail);
        updateUIAfterSolution(event.detail.solution);
    });
    
    mathAiApp.addEventListener('problem:new', (event) => {
        console.log('🆕 New problem started');
        resetUIForNewProblem();
    });
    
    mathAiApp.addEventListener('interactive:start', (event) => {
        console.log('🎯 Interactive mode started');
        setupInteractiveMode(event.detail.solution);
    });
    
    mathAiApp.addEventListener('app:error', (event) => {
        console.error('❌ Application error:', event.detail.error);
        handleApplicationError(event.detail.error);
    });
}

function updateUIAfterSolution(solution) {
    // Update query count display
    updateQueryCount();
    
    // Enable solution-related buttons
    const startSolvingBtn = document.getElementById('start-solving-workspace-btn');
    const showFullSolutionBtn = document.getElementById('show-full-solution-btn');
    
    if (startSolvingBtn) startSolvingBtn.disabled = false;
    if (showFullSolutionBtn) showFullSolutionBtn.disabled = false;
}

function resetUIForNewProblem() {
    // Reset file inputs
    const problemImage = document.getElementById('problem-image');
    const keyboardInput = document.getElementById('keyboard-input');
    
    if (problemImage) problemImage.value = '';
    if (keyboardInput) keyboardInput.value = '';
    
    // Clear canvas
    const canvasManager = mathAiApp.getService('canvasManager');
    canvasManager.clearCanvas('handwritingCanvas');
    
    // Disable solution buttons
    const startSolvingBtn = document.getElementById('start-solving-workspace-btn');
    const showFullSolutionBtn = document.getElementById('show-full-solution-btn');
    
    if (startSolvingBtn) startSolvingBtn.disabled = true;
    if (showFullSolutionBtn) showFullSolutionBtn.disabled = true;
}

function setupInteractiveMode(solution) {
    // This would integrate with the existing smart guide system
    console.log('🎯 Setting up interactive mode with solution:', solution);
    
    // Initialize smart guide with the new architecture
    // This is a placeholder for the actual smart guide integration
}

async function updateQueryCount() {
    try {
        const firestoreManager = mathAiApp.getService('firestoreManager');
        if (firestoreManager) {
            const count = await firestoreManager.getTodayQueryCount();
            const queryCountElement = document.getElementById('query-count');
            if (queryCountElement) {
                queryCountElement.textContent = `${count}/3`;
            }
        }
    } catch (error) {
        console.warn('Failed to update query count:', error);
    }
}

function handleApplicationError(error) {
    const uiService = mathAiApp.getService('uiService');
    
    if (uiService) {
        uiService.showError(`Uygulama hatası: ${error.message}`, true, () => {
            location.reload();
        });
    } else {
        // Fallback error display
        alert(`Uygulama hatası: ${error.message}\n\nSayfa yeniden yüklenecek.`);
        location.reload();
    }
}

// Global error handlers
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    if (mathAiApp.isReady()) {
        const errorHandler = mathAiApp.getService('errorHandler');
        if (errorHandler) {
            errorHandler.handleError(event.error, 'GLOBAL_ERROR');
        }
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    if (mathAiApp.isReady()) {
        const errorHandler = mathAiApp.getService('errorHandler');
        if (errorHandler) {
            errorHandler.handleError(event.reason, 'UNHANDLED_PROMISE');
        }
    }
});

// Make app globally available for debugging
window.mathAiApp = mathAiApp;

console.log('📄 Index page script loaded');