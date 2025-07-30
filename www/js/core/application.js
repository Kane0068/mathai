// =================================================================================
//  Application Core - Main application orchestrator
// =================================================================================

import { container, initializeContainer } from './container.js';
import { config } from './config.js';
import { ApiService } from '../services/apiService.js';
import { ProblemSolverService } from '../services/problemSolverService.js';
import { UIService } from '../services/uiService.js';

export class MathAiApplication {
    constructor() {
        this.initialized = false;
        this.services = {};
        this.eventListeners = new Map();
        this.state = 'initializing';
    }
    
    async initialize() {
        if (this.initialized) {
            console.warn('Application already initialized');
            return this;
        }
        
        try {
            console.log('🚀 Initializing MathAi Application...');
            
            // Initialize dependency container
            await initializeContainer();
            
            // Initialize services
            await this.initializeServices();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize UI
            await this.initializeUI();
            
            this.initialized = true;
            this.state = 'ready';
            
            console.log('✅ MathAi Application initialized successfully');
            
            // Notify application ready
            this.dispatchEvent('app:ready', { application: this });
            
            return this;
            
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.state = 'error';
            this.dispatchEvent('app:error', { error });
            throw error;
        }
    }
    
    async initializeServices() {
        console.log('🔧 Initializing services...');
        
        // Get core services from container
        const stateManager = container.get('stateManager');
        const errorHandler = container.get('errorHandler');
        const canvasManager = container.get('canvasManager');
        const mathRenderer = container.get('mathRenderer');
        
        // Create application services
        const apiService = new ApiService(errorHandler);
        const uiService = new UIService(stateManager, mathRenderer);
        const problemSolverService = new ProblemSolverService(apiService, stateManager, uiService);
        
        // Register services in container
        container
            .registerInstance('apiService', apiService)
            .registerInstance('uiService', uiService)
            .registerInstance('problemSolverService', problemSolverService);
        
        // Store references for easy access
        this.services = {
            stateManager,
            errorHandler,
            canvasManager,
            mathRenderer,
            apiService,
            uiService,
            problemSolverService
        };
        
        console.log('✅ Services initialized');
    }
    
    setupEventListeners() {
        console.log('🎧 Setting up event listeners...');
        
        // Global error handling
        window.addEventListener('error', (event) => {
            this.services.errorHandler.handleError(event.error, 'GLOBAL_ERROR');
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.services.errorHandler.handleError(event.reason, 'UNHANDLED_PROMISE');
        });
        
        // DOM content loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.onDOMReady();
            });
        } else {
            this.onDOMReady();
        }
        
        // Page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.onPageHidden();
            } else {
                this.onPageVisible();
            }
        });
        
        // Before unload cleanup
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        console.log('✅ Event listeners set up');
    }
    
    onDOMReady() {
        console.log('📄 DOM ready, setting up UI event handlers...');
        
        // Photo upload handling
        this.setupPhotoUpload();
        
        // Text input handling
        this.setupTextInput();
        
        // Canvas/handwriting handling
        this.setupCanvasInput();
        
        // Solution view navigation
        this.setupSolutionNavigation();
        
        // Smart guide integration
        this.setupSmartGuideIntegration();
    }
    
    setupPhotoUpload() {
        const fileInput = document.getElementById('problem-image');
        const uploadButton = document.getElementById('upload-btn');
        
        if (fileInput) {
            fileInput.addEventListener('change', async (event) => {
                const file = event.target.files[0];
                if (file) {
                    try {
                        const imageData = await this.fileToBase64(file);
                        await this.solveProblem('photo', imageData);
                    } catch (error) {
                        this.services.uiService.showError('Fotoğraf yüklenirken hata oluştu: ' + error.message);
                    }
                }
            });
        }
        
        if (uploadButton) {
            uploadButton.addEventListener('click', () => {
                fileInput?.click();
            });
        }
    }
    
    setupTextInput() {
        const textInput = document.getElementById('problem-text');
        const textButton = document.getElementById('text-solve-btn');
        
        if (textButton && textInput) {
            textButton.addEventListener('click', async () => {
                const text = textInput.value.trim();
                if (text) {
                    try {
                        await this.solveProblem('text', text);
                    } catch (error) {
                        this.services.uiService.showError('Metin problemi çözülürken hata oluştu: ' + error.message);
                    }
                }
            });
        }
        
        if (textInput) {
            textInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter' && event.ctrlKey) {
                    textButton?.click();
                }
            });
        }
    }
    
    setupCanvasInput() {
        // Canvas setup will be handled by canvas manager
        // This is a placeholder for canvas-related event handling
        console.log('🎨 Canvas input setup (delegated to canvas manager)');
    }
    
    setupSolutionNavigation() {
        // Setup navigation buttons in solution views
        document.addEventListener('click', (event) => {
            const target = event.target;
            
            if (target.id === 'new-problem-btn') {
                this.startNewProblem();
            } else if (target.id === 'interactive-mode-btn') {
                this.startInteractiveMode();
            } else if (target.id === 'export-solution-btn') {
                this.exportSolution();
            } else if (target.id === 'back-btn') {
                this.services.uiService.goBack();
            }
        });
    }
    
    setupSmartGuideIntegration() {
        // Integration with smart guide system
        console.log('🧠 Smart guide integration setup');
    }
    
    async initializeUI() {
        console.log('🎨 Initializing UI...');
        
        // Wait for math rendering system to be ready with timeout
        try {
            const mathRenderer = this.services.mathRenderer;
            if (mathRenderer && typeof mathRenderer.waitForSystem === 'function') {
                await Promise.race([
                    mathRenderer.waitForSystem(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Render system timeout')), 10000))
                ]);
                console.log('✅ Math render system ready');
            }
        } catch (error) {
            console.warn('⚠️ Math render system initialization warning:', error.message);
            // Continue without math rendering - fallback to text
        }
        
        // Set initial view
        this.services.stateManager.setView('setup');
        
        console.log('✅ UI initialized');
    }
    
    // Main application methods
    async solveProblem(inputType, inputData) {
        try {
            console.log(`🔍 Solving problem with input type: ${inputType}`);
            
            this.services.stateManager.setView('solving');
            const solution = await this.services.problemSolverService.solveProblem(inputType, inputData);
            
            // Navigate to solution view
            this.services.stateManager.setView('fullSolution');
            
            this.dispatchEvent('problem:solved', { solution, inputType });
            
            return solution;
            
        } catch (error) {
            console.error('Problem solving failed:', error);
            this.services.stateManager.setError(error.message);
            throw error;
        }
    }
    
    startNewProblem() {
        console.log('🆕 Starting new problem...');
        this.services.stateManager.resetToSetupSafely();
        this.dispatchEvent('problem:new');
    }
    
    startInteractiveMode() {
        console.log('🎯 Starting interactive mode...');
        const solution = this.services.problemSolverService.getCurrentSolution();
        
        if (solution) {
            this.services.stateManager.setView('interactive');
            this.services.stateManager.setInteractiveStep(0);
            this.dispatchEvent('interactive:start', { solution });
        } else {
            this.services.uiService.showError('Önce bir problem çözmelisiniz.');
        }
    }
    
    exportSolution() {
        console.log('📤 Exporting solution...');
        
        try {
            const solutionText = this.services.problemSolverService.exportSolution('text');
            
            // Create downloadable file
            const blob = new Blob([solutionText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'matematik_cozumu.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.services.uiService.showSuccess('Çözüm başarıyla indirildi!');
            this.dispatchEvent('solution:exported');
            
        } catch (error) {
            this.services.uiService.showError('Çözüm dışa aktarılırken hata oluştu: ' + error.message);
        }
    }
    
    // Utility methods
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    onPageHidden() {
        console.log('👁️ Page hidden');
        // Pause any ongoing operations
    }
    
    onPageVisible() {
        console.log('👁️ Page visible');
        // Resume operations
    }
    
    // Event system
    dispatchEvent(type, detail = {}) {
        const event = new CustomEvent(type, { detail });
        window.dispatchEvent(event);
    }
    
    addEventListener(type, callback) {
        window.addEventListener(type, callback);
        
        if (!this.eventListeners.has(type)) {
            this.eventListeners.set(type, []);
        }
        this.eventListeners.get(type).push(callback);
    }
    
    removeEventListener(type, callback) {
        window.removeEventListener(type, callback);
        
        const listeners = this.eventListeners.get(type);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    // Public API
    getService(name) {
        return this.services[name] || container.get(name);
    }
    
    getState() {
        return this.services.stateManager.state;
    }
    
    isReady() {
        return this.state === 'ready';
    }
    
    // Cleanup
    cleanup() {
        console.log('🧹 Cleaning up application...');
        
        // Cleanup services
        Object.values(this.services).forEach(service => {
            if (typeof service.dispose === 'function') {
                service.dispose();
            }
        });
        
        // Clear event listeners
        this.eventListeners.forEach((listeners, type) => {
            listeners.forEach(callback => {
                window.removeEventListener(type, callback);
            });
        });
        this.eventListeners.clear();
        
        // Dispose container
        container.dispose();
        
        console.log('✅ Application cleanup complete');
    }
}

// Global application instance
export const mathAiApp = new MathAiApplication();

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
    // Make app globally available for debugging
    window.mathAiApp = mathAiApp;
    
    // Initialize on next tick to ensure all modules are loaded
    setTimeout(() => {
        mathAiApp.initialize().catch(error => {
            console.error('Failed to initialize MathAi application:', error);
        });
    }, 0);
}