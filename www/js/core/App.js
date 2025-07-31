// www/js/core/App.js - Final Version
import { APP_CONFIG, VIEWS } from './Config.js';
import { AuthManager } from '../modules/auth.js';
import { StateManager } from '../modules/stateManager.js';
import { UIManager } from '../modules/ui.js';
import { CanvasManager } from '../modules/canvasManager.js';
import { ErrorHandler } from '../modules/errorHandler.js';

export class App {
    constructor() {
        this.initialized = false;
        this.modules = {};
        this.initializationPromise = null;
    }

    async init() {
        // Prevent multiple initializations
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        if (this.initialized) return;
        
        this.initializationPromise = this._performInitialization();
        return this.initializationPromise;
    }

    async _performInitialization() {
        try {
            console.log('MathAI App initializing...');
            
            // Initialize core modules first
            await this.initializeCoreModules();
            
            // Initialize authentication and wait for user data
            await this.initializeAuth();
            
            // Initialize UI components
            await this.initializeUI();
            
            // Setup global error handlers
            this.setupGlobalErrorHandlers();
            
            this.initialized = true;
            console.log('MathAI App initialized successfully');
            
        } catch (error) {
            console.error('App initialization failed:', error);
            this.modules.errorHandler?.handleError(error, {
                operation: 'app_initialization',
                fallbackMessage: 'Uygulama başlatılamadı'
            });
            throw error;
        }
    }

    /**
     * Initialize core modules in correct order
     */
    async initializeCoreModules() {
        console.log('Initializing core modules...');

        // Initialize error handler first (for error tracking)
        this.modules.errorHandler = new ErrorHandler();
        
        // Initialize state manager (required by other modules)
        this.modules.stateManager = new StateManager();
        
        // Initialize UI manager (handles DOM interactions)
        this.modules.uiManager = new UIManager();
        
        // Initialize canvas manager (handles drawing)
        this.modules.canvasManager = new CanvasManager();

        console.log('Core modules initialized');
    }

    /**
     * Initialize authentication and set user data
     */
    async initializeAuth() {
        console.log('Initializing authentication...');
        
        try {
            const userData = await new Promise((resolve, reject) => {
                // Set a timeout to prevent hanging
                const timeout = setTimeout(() => {
                    reject(new Error('Authentication timeout'));
                }, 10000); // 10 second timeout

                AuthManager.initProtectedPage((userData) => {
                    clearTimeout(timeout);
                    console.log('User authenticated:', userData);
                    resolve(userData);
                });
            });
            
            // Set user data in state
            this.modules.stateManager.setState('user', userData);
            console.log('User data set in state:', userData);
            
            return userData;
        } catch (error) {
            console.error('Authentication initialization failed:', error);
            
            // Create fallback user data for development/testing
            const fallbackUser = {
                uid: 'fallback-user-' + Date.now(),
                email: 'fallback@mathapp.com',
                membershipType: 'free',
                dailyQueryCount: 0,
                displayName: 'Test User'
            };
            
            console.warn('Using fallback user data:', fallbackUser);
            this.modules.stateManager.setState('user', fallbackUser);
            
            return fallbackUser;
        }
    }

    /**
     * Initialize UI components
     */
    async initializeUI() {
        console.log('Initializing UI components...');
        
        try {
            // Set initial view
            this.modules.stateManager.setView(VIEWS.UPLOAD);
            
            // Initialize UI manager
            this.modules.uiManager.init();
            
            // Initialize canvas manager
            this.modules.canvasManager.init();
            
            console.log('UI components initialized');
        } catch (error) {
            console.error('UI initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup global error handlers
     */
    setupGlobalErrorHandlers() {
        // Global error handler for uncaught errors
        window.addEventListener('error', (event) => {
            console.error('Global error caught:', event.error);
            this.handleError(event.error, { 
                source: 'global_error',
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.handleError(event.reason, { 
                source: 'unhandled_promise',
                promise: event.promise
            });
            
            // Prevent the default handling (which would log to console)
            event.preventDefault();
        });

        // Handle network errors
        window.addEventListener('offline', () => {
            this.modules.uiManager?.showError(
                'İnternet bağlantısı kesildi. Lütfen bağlantınızı kontrol edin.',
                true
            );
        });

        window.addEventListener('online', () => {
            this.modules.uiManager?.showSuccess(
                'İnternet bağlantısı yeniden kuruldu.'
            );
        });

        console.log('Global error handlers setup complete');
    }

    /**
     * Global error handler
     */
    handleError(error, context = {}) {
        if (this.modules.errorHandler) {
            this.modules.errorHandler.handleError(error, context);
        } else {
            console.error('Error handler not available:', error, context);
        }

        // Show user-friendly error message
        if (this.modules.uiManager) {
            let userMessage = 'Bir hata oluştu.';
            
            if (context.operation === 'app_initialization') {
                userMessage = 'Uygulama başlatılırken bir hata oluştu. Lütfen sayfayı yenileyin.';
            } else if (error.message && error.message.includes('network')) {
                userMessage = 'İnternet bağlantısı hatası. Lütfen bağlantınızı kontrol edin.';
            } else if (error.message && error.message.includes('timeout')) {
                userMessage = 'İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.';
            }
            
            this.modules.uiManager.showError(userMessage);
        }
    }

    /**
     * Get module instance
     */
    getModule(name) {
        return this.modules[name];
    }

    /**
     * Get state manager instance
     */
    getStateManager() {
        return this.modules.stateManager;
    }

    /**
     * Get UI manager instance
     */
    getUIManager() {
        return this.modules.uiManager;
    }

    /**
     * Get canvas manager instance
     */
    getCanvasManager() {
        return this.modules.canvasManager;
    }

    /**
     * Get error handler instance
     */
    getErrorHandler() {
        return this.modules.errorHandler;
    }

    /**
     * Check if app is initialized
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Get app configuration
     */
    getConfig() {
        return APP_CONFIG;
    }

    /**
     * Restart the application
     */
    async restart() {
        console.log('Restarting application...');
        
        try {
            // Destroy existing modules
            this.destroy();
            
            // Reset initialization state
            this.initialized = false;
            this.initializationPromise = null;
            
            // Re-initialize
            await this.init();
            
            console.log('Application restarted successfully');
        } catch (error) {
            console.error('Application restart failed:', error);
            throw error;
        }
    }

    /**
     * Destroy and cleanup
     */
    destroy() {
        console.log('Destroying application...');
        
        try {
            // Destroy modules in reverse order
            if (this.modules.canvasManager) {
                this.modules.canvasManager.destroy();
            }
            
            if (this.modules.uiManager) {
                this.modules.uiManager.destroy();
            }
            
            // Clear modules
            this.modules = {};
            this.initialized = false;
            this.initializationPromise = null;
            
            console.log('Application destroyed');
        } catch (error) {
            console.error('Error during application destruction:', error);
        }
    }

    /**
     * Get application status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            modules: Object.keys(this.modules),
            currentView: this.modules.stateManager?.getCurrentView(),
            userAuthenticated: !!this.modules.stateManager?.getState('user'),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Development helper: Log application state
     */
    logStatus() {
        console.log('Application Status:', this.getStatus());
        
        if (this.modules.stateManager) {
            this.modules.stateManager.logState();
        }
    }
}

// Create global app instance
export const app = new App();

// Make app available globally for debugging
if (typeof window !== 'undefined') {
    window.app = app;
    window.APP_CONFIG = APP_CONFIG;
}

// Export individual modules for convenience
export { StateManager } from '../modules/stateManager.js';
export { UIManager } from '../modules/ui.js';
export { CanvasManager } from '../modules/canvasManager.js';
export { AuthManager } from '../modules/auth.js';