/**
 * ApplicationLifecycle - Manages app initialization, cleanup, and state transitions
 * Extracts from index.js: App initialization, DOM caching, event listeners setup, cleanup logic
 */

import { AuthManager } from './auth.js';
import { showLoading, showError, showSuccess, waitForRenderSystem } from './ui.js';
import { enhancedMathRenderer } from './enhancedAdvancedMathRenderer.js';
import { CanvasManager } from './canvasManager.js';
import { EnhancedErrorHandler } from './errorHandler.js';
import { EnhancedStateManager } from './stateManager.js';
import { smartGuide } from './smartGuide.js';

export class ApplicationLifecycle {
    constructor() {
        this.isInitialized = false;
        this.elements = {};
        this.canvasManager = null;
        this.errorHandler = null;
        this.stateManager = null;
        this.cleanupTasks = [];
    }

    /**
     * Initialize the application
     */
    async initializeApplication() {
        if (this.isInitialized) {
            console.warn('⚠️ Application already initialized');
            return;
        }

        try {
            console.log('🔄 Application initializing...');
            
            // Initialize core managers
            this.initializeManagers();
            
            // Auth manager initialization
            AuthManager.initProtectedPage((userData) => this.handleUserAuthentication(userData));
            
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Initialize core manager instances
     */
    initializeManagers() {
        this.canvasManager = new CanvasManager();
        this.errorHandler = new EnhancedErrorHandler();
        this.stateManager = new EnhancedStateManager();
        
        console.log('✅ Core managers initialized');
    }

    /**
     * Handle user authentication success
     */
    async handleUserAuthentication(userData) {
        if (!userData) {
            this.handleAuthenticationFailure();
            return;
        }

        try {
            showLoading("Matematik render sistemi başlatılıyor...");
            
            // Initialize math renderer with timeout
            await this.initializeMathRenderer();
            
            // Wait for render system
            await waitForRenderSystem();
            
            // Setup DOM and events
            await this.setupApplication();
            
            // Configure state management
            this.configureStateManagement(userData);
            
            // Configure smart guide
            this.configureSmartGuide();
            
            showLoading(false);
            this.isInitialized = true;
            
            console.log('✅ Application successfully initialized');
            
            // Show success message
            setTimeout(() => {
                showSuccess("Matematik çözüm sistemi hazır! Enhanced Math Renderer v2 aktif.", true, 3000);
            }, 500);
            
        } catch (error) {
            console.error('❌ User authentication handling failed:', error);
            this.handleAuthenticationError(error);
        }
    }

    /**
     * Initialize math renderer with error handling
     */
    async initializeMathRenderer() {
        try {
            await Promise.race([
                enhancedMathRenderer.initializeSystem(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Renderer timeout')), 8000))
            ]);
            console.log('✅ Math renderer initialized');
        } catch (initError) {
            console.warn('⚠️ Math renderer initialization failed, continuing with fallback:', initError.message);
            // Continue without math renderer - app should still function
        }
    }

    /**
     * Setup application DOM and events
     */
    async setupApplication() {
        this.cacheDOMElements();
        this.setupEventListeners();
        this.setupGlobalErrorHandling();
    }

    /**
     * Cache DOM elements for performance
     */
    cacheDOMElements() {
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
                this.elements[id] = element;
            } else {
                missingElements.push(id);
                console.warn(`⚠️ Element not found: ${id}`);
            }
        });
        
        if (missingElements.length > 0) {
            console.error('❌ Critical elements missing:', missingElements);
            throw new Error(`DOM elements missing: ${missingElements.slice(0, 3).join(', ')}${missingElements.length > 3 ? '...' : ''}`);
        }

        // Initialize canvas
        this.initializeCanvas();
        
        console.log('✅ DOM elements cached successfully');
    }

    /**
     * Initialize canvas with error handling
     */
    initializeCanvas() {
        try {
            if (this.elements['handwritingCanvas']) {
                this.canvasManager.initCanvas('handwritingCanvas');
                console.log('✅ Canvas initialized successfully');
            } else {
                console.error('❌ Handwriting canvas element not found');
            }
        } catch (canvasError) {
            console.error('❌ Canvas initialization error:', canvasError);
            throw new Error('Canvas system could not be initialized');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Enhanced back button handler
        this.setupEnhancedBackButtonHandler();
        
        // Error handler events
        window.addEventListener('show-error-message', (event) => {
            const { message, isCritical } = event.detail;
            if (isCritical) {
                showError(message, true, () => this.stateManager.clearError());
            } else {
                this.stateManager.setError(message);
            }
        });

        console.log('✅ Event listeners setup completed');
    }

    /**
     * Setup global error handling
     */
    setupGlobalErrorHandling() {
        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('❌ Unhandled promise rejection:', event.reason);
            
            if (event.reason && event.reason.message && 
                (event.reason.message.includes('render') || 
                 event.reason.message.includes('interactive') ||
                 event.reason.message.includes('canvas'))) {
                
                showError('Sistem hatası tespit edildi. Lütfen sayfayı yenileyin.', true);
            }
        });

        // Global errors
        window.addEventListener('error', (event) => {
            console.error('❌ Global error:', event.error);
            
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

        console.log('✅ Global error handling setup completed');
    }

    /**
     * Setup enhanced back button handler
     */
    setupEnhancedBackButtonHandler() {
        document.addEventListener('click', (event) => {
            if (event.target && event.target.id === 'back-to-main-menu-btn') {
                event.preventDefault();
                event.stopPropagation();
                
                console.log('🔄 Enhanced back-to-main-menu handler triggered');
                
                try {
                    this.handleBackToMainMenu();
                } catch (error) {
                    console.error('❌ Back button handler error:', error);
                    this.handleBackButtonFallback();
                }
            }
        });
    }

    /**
     * Handle back to main menu navigation
     */
    async handleBackToMainMenu() {
        const currentView = this.stateManager ? this.stateManager.getStateValue('ui').view : 'unknown';
        console.log(`📍 Current view: ${currentView}`);
        
        showLoading("Ana menüye dönülüyor...");
        
        try {
            // View-specific cleanup
            await this.performViewCleanup(currentView);
            
            // State transition
            if (this.stateManager) {
                this.stateManager.setView('summary');
                console.log('✅ State transitioned to summary');
            }
            
            showLoading(false);
            setTimeout(() => {
                showSuccess("Ana menüye başarıyla döndünüz.", true, 2000);
            }, 200);
            
        } catch (error) {
            console.error('❌ Back to main menu error:', error);
            showLoading(false);
            this.handleBackButtonFallback();
        }
    }

    /**
     * Perform view-specific cleanup
     */
    async performViewCleanup(currentView) {
        switch (currentView) {
            case 'interactive':
                await this.cleanupInteractiveView();
                break;
            case 'solving':
                await this.cleanupSolvingView();
                break;
            case 'fullSolution':
                await this.cleanupFullSolutionView();
                break;
        }
    }

    /**
     * Cleanup interactive view
     */
    async cleanupInteractiveView() {
        console.log('🧹 Interactive view cleanup...');
        
        if (window.interactiveSolutionManager) {
            window.interactiveSolutionManager.reset();
            console.log('✅ Interactive solution manager reset');
        }
        
        this.clearInteractiveDOM();
        console.log('✅ Interactive DOM cleared');
    }

    /**
     * Cleanup solving view
     */
    async cleanupSolvingView() {
        console.log('🧹 Solving view cleanup...');
        
        if (window.smartGuide) {
            window.smartGuide.reset();
            console.log('✅ Smart guide reset');
        }
        
        const solvingWorkspace = document.getElementById('solving-workspace');
        if (solvingWorkspace) {
            const stepContainer = document.getElementById('step-by-step-container');
            if (stepContainer) {
                stepContainer.innerHTML = '';
            }
        }
    }

    /**
     * Cleanup full solution view
     */
    async cleanupFullSolutionView() {
        console.log('🧹 Full solution view cleanup...');
        
        const solutionOutput = document.getElementById('solution-output');
        if (solutionOutput) {
            solutionOutput.innerHTML = '';
            console.log('✅ Solution output cleared');
        }
    }

    /**
     * Clear interactive DOM elements
     */
    clearInteractiveDOM() {
        const solutionOutput = document.getElementById('solution-output');
        if (solutionOutput) {
            solutionOutput.innerHTML = '';
            solutionOutput.classList.add('hidden');
        }
        
        const resultContainer = document.getElementById('result-container');
        if (resultContainer) {
            resultContainer.classList.add('hidden');
            resultContainer.style.display = 'none';
        }
        
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
            statusMessage.innerHTML = '';
        }
        
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
    }

    /**
     * Handle back button fallback
     */
    handleBackButtonFallback() {
        console.log('🔄 Back button fallback triggered');
        
        if (confirm('Bir hata oluştu. Ana menüye dönmek için sayfayı yenilemek ister misiniz?')) {
            window.location.reload();
        } else {
            try {
                if (this.stateManager) {
                    this.stateManager.setView('setup');
                }
            } catch (fallbackError) {
                console.error('❌ Fallback also failed:', fallbackError);
            }
        }
    }

    /**
     * Configure state management
     */
    configureStateManagement(userData) {
        this.stateManager.subscribe((state) => this.handleStateChange(state));
        this.stateManager.setUser(userData);
        console.log('✅ State management configured');
    }

    /**
     * Configure smart guide
     */
    configureSmartGuide() {
        smartGuide.setCanvasManager(this.canvasManager);
        console.log('✅ Smart guide configured');
    }

    /**
     * Handle state changes
     */
    async handleStateChange(state) {
        // This would be called when state changes
        // Implementation depends on specific state management needs
        console.log('🔄 State changed:', state);
    }

    /**
     * Handle authentication failure
     */
    handleAuthenticationFailure() {
        document.body.innerHTML = '<div class="flex items-center justify-center min-h-screen"><p class="text-red-600">Uygulama başlatılamadı. Lütfen yeniden giriş yapın.</p></div>';
    }

    /**
     * Handle initialization error
     */
    handleInitializationError(error) {
        document.body.innerHTML = '<div class="p-4 bg-red-100 text-red-800">Uygulama başlatılamadı. Lütfen sayfayı yenileyin.</div>';
        console.error('❌ Initialization error:', error);
    }

    /**
     * Handle authentication error
     */
    handleAuthenticationError(error) {
        showLoading(false);
        showError("Uygulama başlatılırken bir sorun oluştu. Lütfen sayfayı yenileyin.", true, () => {
            window.location.reload();
        });
    }

    /**
     * Add cleanup task
     */
    addCleanupTask(task) {
        if (typeof task === 'function') {
            this.cleanupTasks.push(task);
        }
    }

    /**
     * Perform application cleanup
     */
    async cleanup() {
        console.log('🧹 Application cleanup starting...');
        
        try {
            // Run all cleanup tasks
            for (const task of this.cleanupTasks) {
                try {
                    await task();
                } catch (taskError) {
                    console.error('❌ Cleanup task failed:', taskError);
                }
            }
            
            // Reset managers
            if (this.canvasManager) {
                this.canvasManager.cleanup?.();
            }
            
            if (this.stateManager) {
                this.stateManager.reset?.();
            }
            
            // Clear DOM references
            this.elements = {};
            this.isInitialized = false;
            
            console.log('✅ Application cleanup completed');
            
        } catch (error) {
            console.error('❌ Application cleanup failed:', error);
        }
    }

    /**
     * Get application status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            elementsCount: Object.keys(this.elements).length,
            managersReady: !!(this.canvasManager && this.errorHandler && this.stateManager),
            cleanupTasksCount: this.cleanupTasks.length
        };
    }

    /**
     * Get DOM elements
     */
    getElements() {
        return this.elements;
    }

    /**
     * Get managers
     */
    getManagers() {
        return {
            canvasManager: this.canvasManager,
            errorHandler: this.errorHandler,
            stateManager: this.stateManager
        };
    }
}

// Export singleton instance
export const applicationLifecycle = new ApplicationLifecycle();