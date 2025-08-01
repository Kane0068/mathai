// www/js/modules/ui.js - Fixed Version with Real Question Processing
import { ELEMENTS, APP_CONFIG } from '../core/Config.js';
import { stateManager } from './stateManager.js';

export class UIManager {
    constructor() {
        this.elements = new Map();
        this.eventListeners = new Map();
        this.initialized = false;
    }

    /**
     * Initialize UI Manager
     */
    init() {
        if (this.initialized) return;
        
        try {
            this.initializeElements();
            this.attachEventListeners();
            this.setupStateListeners();
            this.initialized = true;
            console.log('UIManager initialized successfully');
        } catch (error) {
            console.error('UIManager initialization failed:', error);
            throw error;
        }
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        Object.entries(ELEMENTS).forEach(([key, id]) => {
            const element = document.getElementById(id);
            if (element) {
                this.elements.set(key, element);
            } else {
                console.warn(`Element not found: ${id} (${key})`);
            }
        });

        // Initialize stateManager elements
        stateManager.initializeElements();
    }

    /**
     * Get DOM element by key
     */
    getElement(key) {
        return this.elements.get(key) || stateManager.getElement(key);
    }

    /**
     * Attach all event listeners
     */
    attachEventListeners() {
        // Upload/File selection events
        this.attachFileEvents();
        
        // Button events
        this.attachButtonEvents();
        
        // Form events
        this.attachFormEvents();
        
        // Global events
        this.attachGlobalEvents();
    }

    /**
     * Attach file upload related events
     */
    attachFileEvents() {
        // File input change events
        const imageUploader = this.getElement('imageUploader');
        const cameraUploader = this.getElement('cameraUploader');
        
        if (imageUploader) {
            this.addEventListener(imageUploader, 'change', (e) => this.handleFileSelect(e.target.files[0]));
        }
        
        if (cameraUploader) {
            this.addEventListener(cameraUploader, 'change', (e) => this.handleFileSelect(e.target.files[0]));
        }

        // File selection buttons
        const selectFileBtn = this.getElement('selectFileBtn');
        const takePhotoBtn = this.getElement('takePhotoBtn');
        const changePhotoBtn = this.getElement('changePhotoBtn');
        
        if (selectFileBtn) {
            this.addEventListener(selectFileBtn, 'click', () => imageUploader?.click());
        }
        
        if (takePhotoBtn) {
            this.addEventListener(takePhotoBtn, 'click', () => cameraUploader?.click());
        }
        
        if (changePhotoBtn) {
            this.addEventListener(changePhotoBtn, 'click', () => this.resetFileSelection());
        }
    }

    /**
     * Attach button event listeners
     */
    attachButtonEvents() {
        // Main action buttons - FIXED to use real QuestionProcessor
        this.attachButtonEvent('startFromPhotoBtn', () => this.handleStartFromPhoto());
        this.attachButtonEvent('recognizeHandwritingBtn', () => this.handleCanvasSubmit());
        this.attachButtonEvent('startFromTextBtn', () => this.handleTextSubmit());
        
        // Solution action buttons
        this.attachButtonEvent('start-solving-workspace-btn', () => this.handleStartSolving());
        this.attachButtonEvent('solve-all-btn', () => this.handleInteractiveSolving());
        this.attachButtonEvent('show-full-solution-btn', () => this.handleShowFullSolution());
        this.attachButtonEvent('new-question-btn', () => this.handleNewQuestion());
        this.attachButtonEvent('goBackBtn', () => this.handleGoBack());

        // File selection buttons
        this.attachButtonEvent('selectFileBtn', () => this.getElement('imageUploader')?.click());
        this.attachButtonEvent('takePhotoBtn', () => this.getElement('cameraUploader')?.click());
        this.attachButtonEvent('changePhotoBtn', () => this.resetFileSelection());

        // Canvas tool buttons
        this.attachButtonEvent('hw-pen-btn', () => this.setCanvasTool('pen'));
        this.attachButtonEvent('hw-eraser-btn', () => this.setCanvasTool('eraser'));
        this.attachButtonEvent('hw-clear-btn', () => this.clearCanvas());
        this.attachButtonEvent('hw-undo-btn', () => this.undoCanvas());
        
        // Mode switching buttons
        this.attachButtonEvent('photo-mode-btn', () => this.handleModeSwitch('photo'));
        this.attachButtonEvent('handwriting-mode-btn', () => this.handleModeSwitch('handwriting'));
        this.attachButtonEvent('switchToCanvasBtn', () => this.handleInputTypeSwitch('canvas'));
        this.attachButtonEvent('switchToKeyboardBtn', () => this.handleInputTypeSwitch('keyboard'));
        
        // Logout button
        this.attachButtonEvent('logout-btn', () => this.handleLogout());
    }

    /**
     * Attach form related events
     */
    attachFormEvents() {
        // Text input events
        const keyboardInput = document.getElementById('keyboard-input');
        if (keyboardInput) {
            this.addEventListener(keyboardInput, 'input', (e) => this.handleTextInput(e.target.value));
            this.addEventListener(keyboardInput, 'keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleTextSubmit();
                }
            });
        }
    }

    /**
     * Attach global events
     */
    attachGlobalEvents() {
        // Back to main menu buttons (using event delegation)
        document.addEventListener('click', (event) => {
            if (event.target && event.target.id === 'back-to-main-menu-btn') {
                stateManager.setView('summary');
            }
        });

        // Logout buttons
        document.addEventListener('click', (event) => {
            if (event.target && event.target.matches('[data-action="logout"]')) {
                this.handleLogout();
            }
        });
    }

    /**
     * Setup state change listeners
     */
    setupStateListeners() {
        // Listen for loading state changes
        stateManager.addListener('ui.loading', (loading, message) => {
            this.updateLoadingState(loading, message);
        });

        // Listen for error state changes
        stateManager.addListener('ui.error', (error) => {
            this.updateErrorState(error);
        });

        // Listen for view changes
        stateManager.addListener('currentView', (newView) => {
            this.handleViewChange(newView);
        });
    }

    /**
     * Helper method to attach button events safely
     */
    attachButtonEvent(elementId, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            this.addEventListener(element, 'click', handler);
        }
    }

    /**
     * Add event listener with cleanup tracking
     */
    addEventListener(element, event, handler) {
        element.addEventListener(event, handler);
        
        // Track listeners for cleanup
        const key = `${element.id || 'unnamed'}_${event}`;
        if (!this.eventListeners.has(key)) {
            this.eventListeners.set(key, []);
        }
        this.eventListeners.get(key).push({ element, event, handler });
    }

    /**
     * Handle file selection
     */
    async handleFileSelect(file) {
        if (!file) return;
        
        console.log('🔥 File selected:', file.name, file.size, file.type);
        
        // Validate file
        const validation = this.validateFile(file);
        if (!validation.valid) {
            this.showError(validation.message);
            return;
        }

        try {
            this.showLoading('Dosya yükleniyor...');
            
            const base64 = await this.fileToBase64(file);
            console.log('🔥 File converted to base64, length:', base64.length);
            
            const imagePreview = this.getElement('imagePreview');
            const previewContainer = this.getElement('previewContainer');
            const uploadSelection = this.getElement('uploadSelection');
            const startFromPhotoBtn = this.getElement('startFromPhotoBtn');
            
            // Show preview
            if (imagePreview) {
                imagePreview.src = `data:${file.type};base64,${base64}`;
            }
            
            if (previewContainer) previewContainer.classList.remove('hidden');
            if (uploadSelection) uploadSelection.classList.add('hidden');
            if (startFromPhotoBtn) startFromPhotoBtn.disabled = false;
            
            // Store file data in state
            console.log('🔥 Storing image data in state...');
            stateManager.setState('problem.source', base64);
            stateManager.setState('problem.sourceType', 'image');
            
            // Verify it was stored
            const storedSource = stateManager.getState('problem.source');
            console.log('🔥 Verification - source stored:', storedSource ? storedSource.length : 'null');
            
            this.showSuccess('Dosya başarıyla yüklendi!');
            
        } catch (error) {
            console.error('🔥 File selection error:', error);
            this.showError('Dosya yüklenirken bir hata oluştu.');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Validate uploaded file
     */
    validateFile(file) {
        if (file.size > APP_CONFIG.api.maxFileSize) {
            return {
                valid: false,
                message: `Dosya boyutu ${APP_CONFIG.api.maxFileSize / (1024 * 1024)}MB'dan büyük olamaz.`
            };
        }
        
        if (!APP_CONFIG.api.supportedImageTypes.includes(file.type)) {
            return {
                valid: false,
                message: 'Sadece JPEG, PNG, GIF ve WebP dosyaları desteklenir.'
            };
        }
        
        return { valid: true };
    }

    /**
     * Convert file to base64
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Reset file selection UI
     */
    resetFileSelection() {
        const previewContainer = this.getElement('previewContainer');
        const uploadSelection = this.getElement('uploadSelection');
        const startFromPhotoBtn = this.getElement('startFromPhotoBtn');
        
        if (previewContainer) previewContainer.classList.add('hidden');
        if (uploadSelection) uploadSelection.classList.remove('hidden');
        if (startFromPhotoBtn) startFromPhotoBtn.disabled = true;
        
        // Clear state
        stateManager.setState('problem.source', null);
        stateManager.setState('problem.sourceType', null);
    }

    /**
     * Handle mode switching (photo/handwriting)
     */
    handleModeSwitch(mode) {
        stateManager.setState('inputMode', mode);
        console.log(`Switched to ${mode} mode`);
    }

    /**
     * Handle input type switching (canvas/keyboard)
     */
    handleInputTypeSwitch(type) {
        stateManager.setState('handwritingInputType', type);
        console.log(`Switched to ${type} input`);
    }

    /**
     * Button event handlers - FIXED to use real QuestionProcessor
     */
    handleStartFromPhoto() {
        console.log('🔥 handleStartFromPhoto called');
        const source = stateManager.getState('problem.source');
        console.log('🔥 Source check:', source ? source.length : 'null');
        
        if (!source) {
            this.showError('Lütfen önce bir resim yükleyin.');
            return;
        }
        
        // Process the image using the real QuestionProcessor
        this.processQuestion('image');
    }

    /**
     * Handle canvas drawing submission
     */
    async handleCanvasSubmit() {
        try {
            const { canvasManager } = await import('./canvasManager.js');
            const mainCanvas = 'handwritingCanvas';
            
            if (canvasManager.isEmpty(mainCanvas)) {
                this.showError('Lütfen önce bir şeyler çizin.');
                return;
            }
            
            const dataURL = canvasManager.toDataURL(mainCanvas);
            if (!dataURL) {
                this.showError('Canvas verisi alınamadı.');
                return;
            }
            
            // Store canvas data
            const base64Data = dataURL.split(',')[1];
            stateManager.setState('problem.source', base64Data);
            stateManager.setState('problem.sourceType', 'canvas');
            
            // Process the drawing using the real QuestionProcessor
            this.processQuestion('canvas');
            
        } catch (error) {
            console.error('Canvas submit error:', error);
            this.showError('Canvas verisi işlenirken hata oluştu.');
        }
    }

    handleTextSubmit() {
        const keyboardInput = document.getElementById('keyboard-input');
        const text = keyboardInput?.value.trim();
        
        if (!text) {
            this.showError('Lütfen bir soru yazın.');
            return;
        }
        
        console.log('🔥 Text input:', text);
        stateManager.setState('problem.source', text);
        stateManager.setState('problem.sourceType', 'text');
        
        // Process the text using the real QuestionProcessor
        this.processQuestion('text');
    }

    /**
     * REAL QUESTION PROCESSING - This is the key fix!
     */
    async processQuestion(sourceType) {
        try {
            console.log('🔥 Starting real question processing for:', sourceType);
            
            this.showLoading('Soru işleniyor...');
            
            // Import and use the real QuestionProcessor
            const { questionProcessor } = await import('../services/QuestionProcessor.js');
            
            const source = stateManager.getState('problem.source');
            if (!source) {
                throw new Error('Kaynak veri bulunamadı');
            }
            
            console.log('🔥 Calling questionProcessor.processQuestion');
            const result = await questionProcessor.processQuestion(sourceType, source);
            
            console.log('🔥 Question processing completed:', result);
            
            // Check if solution was stored in state
            const storedSolution = stateManager.getState('problem.solution');
            console.log('🔥 Final verification - solution stored:', !!storedSolution);
            
            if (storedSolution) {
                // Switch to summary view to show the results
                stateManager.setView('summary');
                this.showSuccess('Soru başarıyla çözüldü!');
            } else {
                throw new Error('Çözüm state\'e kaydedilemedi');
            }
            
        } catch (error) {
            console.error('🔥 Question processing error:', error);
            
            // Show user-friendly error message
            let errorMessage = 'Soru işlenirken bir hata oluştu.';
            
            if (error.message.includes('limit')) {
                errorMessage = 'Günlük sorgu limitiniz doldu.';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = 'İnternet bağlantısı hatası. Lütfen bağlantınızı kontrol edin.';
            } else if (error.message.includes('timeout')) {
                errorMessage = 'İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.';
            } else if (error.message.includes('not valid') || error.message.includes('invalid')) {
                errorMessage = 'Görsel dosyası geçersiz. Lütfen farklı bir resim deneyin.';
            }
            
            this.showError(errorMessage);
            
        } finally {
            this.hideLoading();
        }
    }

    handleStartSolving() {
        console.log('handleStartSolving called');
        const solution = stateManager.getState('problem.solution');
        console.log('Solution check in handleStartSolving:', solution);
        
        if (solution) {
            // Initialize the smart guide and then set view
            this.initializeSmartGuideWorkspace(solution);
        } else {
            console.log('No solution found, showing error');
            this.showError('Henüz bir çözüm bulunamadı. Lütfen önce bir soru yükleyin.');
        }
    }

    /**
     * Initialize smart guide workspace for "I Will Solve It Myself"
     */
    async initializeSmartGuideWorkspace(solution) {
        try {
            // Import and initialize smart guide service
            const { smartGuideService } = await import('../services/SmartGuideService.js');
            
            console.log('Initializing smart guide workspace...');
            await smartGuideService.initializeGuidance(solution);
            
            // Set view to solving
            stateManager.setView('solving');
            
        } catch (error) {
            console.error('Smart guide initialization error:', error);
            this.showError('Çözüm alanı başlatılamadı. Lütfen tekrar deneyin.');
        }
    }

    async handleInteractiveSolving() {
        console.log('handleInteractiveSolving called');
        const solution = stateManager.getState('problem.solution');
        
        if (!solution) {
            this.showError('Henüz bir çözüm bulunamadı. Lütfen önce bir soru yükleyin.');
            return;
        }

        try {
            // Import with proper destructuring
            const module = await import('../services/InteractiveSolutionService.js');
            const interactiveService = module.interactiveSolutionService;
            
            console.log('Initializing interactive solution...');
            await interactiveService.initializeInteractiveSolution(solution);
            
            // Set view to interactive
            stateManager.setView('interactive');
            
        } catch (error) {
            console.error('Interactive solution initialization error:', error);
            this.showError('İnteraktif çözüm başlatılamadı. Lütfen tekrar deneyin.');
        }
    }
    async handleInteractiveInit(solution) {
        try {
            console.log('Initializing interactive mode with solution:', solution);
            
            // Import interactive solution service
            const { interactiveSolutionService } = await import('../services/InteractiveSolutionService.js');
            
            // Initialize the interactive solution
            await interactiveSolutionService.initializeInteractiveSolution(solution);
            
        } catch (error) {
            console.error('Interactive mode initialization error:', error);
            
            this.showError('İnteraktif çözüm başlatılamadı. Tam çözüme yönlendiriliyorsunuz.');
            setTimeout(() => {
                stateManager.setView('result');
            }, 2000);
        }
    }
    handleShowFullSolution() {
        console.log('handleShowFullSolution called');
        const solution = stateManager.getState('problem.solution');
        console.log('Solution check in handleShowFullSolution:', solution);
        
        if (solution) {
            stateManager.setView('result');
        } else {
            console.log('No solution found, showing error');
            this.showError('Henüz bir çözüm bulunamadı. Lütfen önce bir soru yükleyin.');
        }
    }

    handleNewQuestion() {
        stateManager.setView('upload');
    }

    handleGoBack() {
        stateManager.setView('summary');
    }

    handleTextInput(value) {
        // Handle real-time text input if needed
        console.log('Text input:', value);
    }

    /**
     * Canvas tool methods - integrated with CanvasManager
     */
    async setCanvasTool(tool) {
        try {
            const { canvasManager } = await import('./canvasManager.js');
            
            // Set tool for main canvas
            const mainCanvas = 'handwritingCanvas';
            canvasManager.setTool(mainCanvas, tool);
            
            // Update UI to reflect active tool
            this.updateCanvasToolUI(tool);
            
        } catch (error) {
            console.error('Canvas tool set error:', error);
        }
    }

    async clearCanvas() {
        try {
            const { canvasManager } = await import('./canvasManager.js');
            
            // Clear main canvas
            const mainCanvas = 'handwritingCanvas';
            canvasManager.clear(mainCanvas);
            
            // Clear any stored canvas data in state
            stateManager.setState('problem.source', null);
            stateManager.setState('problem.sourceType', null);
            
        } catch (error) {
            console.error('Canvas clear error:', error);
        }
    }

    async undoCanvas() {
        try {
            const { canvasManager } = await import('./canvasManager.js');
            
            // Undo main canvas
            const mainCanvas = 'handwritingCanvas';
            canvasManager.undo(mainCanvas);
            
        } catch (error) {
            console.error('Canvas undo error:', error);
        }
    }

    /**
     * Update canvas tool UI to show active tool
     */
    updateCanvasToolUI(activeTool) {
        const toolButtons = ['hw-pen-btn', 'hw-eraser-btn'];
        
        toolButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.classList.remove('canvas-tool-active');
                if (buttonId.includes(activeTool)) {
                    button.classList.add('canvas-tool-active');
                }
            }
        });
    }

    /**
     * UI state management methods
     */
    updateLoadingState(loading, message) {
        if (loading) {
            this.showLoading(message);
        } else {
            this.hideLoading();
        }
    }

    updateErrorState(error) {
        if (error) {
            this.showError(error);
        }
    }

    handleViewChange(newView) {
        console.log(`UI handling view change to: ${newView}`);
        // Additional UI updates specific to view changes can be added here
    }

    /**
     * Notification methods
     */
    showLoading(message = 'Yükleniyor...') {
        console.log(`Loading: ${message}`);
        
        // Find or create loading indicator
        let loadingIndicator = document.getElementById('loading-indicator');
        if (!loadingIndicator) {
            loadingIndicator = document.createElement('div');
            loadingIndicator.id = 'loading-indicator';
            loadingIndicator.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            loadingIndicator.innerHTML = `
                <div class="bg-white rounded-lg p-6 max-w-sm mx-4">
                    <div class="flex items-center space-x-3">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span class="text-gray-800">${message}</span>
                    </div>
                </div>
            `;
            document.body.appendChild(loadingIndicator);
        } else {
            loadingIndicator.querySelector('span').textContent = message;
            loadingIndicator.classList.remove('hidden');
        }
    }

    hideLoading() {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.classList.add('hidden');
        }
    }

    showError(message, persistent = false) {
        console.error('UI Error:', message);
        this.showNotification(message, 'error', persistent);
    }

    showSuccess(message) {
        console.log('UI Success:', message);
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info', persistent = false) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 max-w-sm p-4 rounded-lg shadow-lg z-50 ${
            type === 'error' ? 'bg-red-100 border border-red-400 text-red-700' :
            type === 'success' ? 'bg-green-100 border border-green-400 text-green-700' :
            'bg-blue-100 border border-blue-400 text-blue-700'
        }`;
        
        notification.innerHTML = `
            <div class="flex items-center justify-between">
                <span>${message}</span>
                <button class="ml-3 text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.remove()">
                    <span class="sr-only">Close</span>
                    <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds unless persistent
        if (!persistent) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 5000);
        }
    }

    /**
     * Logout handler
     */
    async handleLogout() {
        try {
            const { AuthManager } = await import('./auth.js');
            await AuthManager.logout();
        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect on error
            window.location.href = 'login.html';
        }
    }

    /**
     * Cleanup method
     */
    destroy() {
        // Remove all event listeners
        this.eventListeners.forEach((listeners) => {
            listeners.forEach(({ element, event, handler }) => {
                element.removeEventListener(event, handler);
            });
        });
        
        this.eventListeners.clear();
        this.elements.clear();
        this.initialized = false;
    }
}

// Create and export singleton instance
export const uiManager = new UIManager();