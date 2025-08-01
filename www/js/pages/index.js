// www/js/pages/index.js - Completely Clean Version
import { app } from '../core/App.js';
import { stateManager } from '../modules/stateManager.js';
import { mathRenderer } from '../services/MathRenderer.js';
import { smartGuideService } from '../services/SmartGuideService.js';
import { makeApiCall } from '../utils/ApiBridge.js';
import { DebugHelper } from '../utils/DebugHelper.js';
import { LegacyBridge } from '../utils/LegacyBridge.js';
const { interactiveSolutionService } = await import('../services/InteractiveSolutionService.js');

/**
 * Main Index Page Controller
 * Clean architecture with no legacy references
 */
class IndexPageController {
    constructor() {
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        try {
            console.log('Initializing Index Page...');

            // Initialize the core application
            await app.init();

            // Setup state listeners for this page
            this.setupStateListeners();

            // Setup page-specific functionality
            this.setupPageSpecificFeatures();

            this.initialized = true;
            console.log('Index page initialized successfully');

        } catch (error) {
            console.error('Index page initialization failed:', error);
            this.handleInitializationError(error);
        }
    }

    setupStateListeners() {
        // Listen for view changes to handle page-specific logic
        stateManager.addListener('currentView', (newView) => {
            this.handleViewChange(newView);
        });

        // Listen for problem summary updates
        stateManager.addListener('view.summary.update', (summary) => {
            this.handleSummaryUpdate(summary);
        });

        // Listen for solution rendering requests
        stateManager.addListener('view.result.display', (solution) => {
            this.handleSolutionDisplay(solution);
        });

        // Listen for interactive mode initialization
        stateManager.addListener('view.interactive.init', (solution) => {
            this.handleInteractiveInit(solution);
        });
    }

    setupPageSpecificFeatures() {
        // Initialize math renderer with error handling
        mathRenderer.init().catch(error => {
            console.warn('Math renderer initialization failed, continuing without advanced math rendering:', error);
        });

        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Setup page visibility handlers
        this.setupVisibilityHandlers();
    }

    handleViewChange(newView) {
        console.log(`Index page handling view change to: ${newView}`);

        switch (newView) {
            case 'upload':
                this.handleUploadView();
                break;
            case 'summary':
                this.handleSummaryView();
                break;
            case 'solving':
                this.handleSolvingView();
                break;
            case 'interactive':
                this.handleInteractiveView();
                break;
            case 'result':
                this.handleResultView();
                break;
        }
    }

    handleUploadView() {
        stateManager.setState('problem', {
            source: null,
            sourceType: null,
            summary: null,
            solution: null,
            currentStep: 0
        });

        setTimeout(() => {
            const firstInput = document.querySelector('input[type="file"], input[type="text"]');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }

    handleSummaryView() {
        const problem = stateManager.getState('problem');
        if (problem && problem.summary) {
            this.handleSummaryUpdate(problem.summary);
        }
    }

    handleSolvingView() {
        console.log('Setting up solving workspace');
        // The SmartGuideService will handle the detailed setup
    }

    handleInteractiveView() {
        const solution = stateManager.getState('problem.solution');
        if (solution) {
            this.handleInteractiveInit(solution);
        } else {
            console.error('No solution available for interactive mode');
            stateManager.setView('summary');
        }
    }

    handleResultView() {
        const solution = stateManager.getState('problem.solution');
        if (solution) {
            this.handleSolutionDisplay(solution);
        }
    }

    async handleSummaryUpdate(summary) {
        const container = document.getElementById('question');
        if (container && summary) {
            try {
                await mathRenderer.renderProblemSummary(summary, container);
            } catch (error) {
                console.error('Summary rendering error:', error);
                container.innerHTML = `
                    <div class="problem-summary bg-blue-50 p-4 rounded-lg">
                        <h3 class="font-semibold text-blue-800 mb-2">Problem Özeti:</h3>
                        <p><strong>Verilenler:</strong> ${summary.verilenler?.join(', ') || 'Belirtilmemiş'}</p>
                        <p><strong>İstenen:</strong> ${summary.istenen || 'Belirtilmemiş'}</p>
                    </div>
                `;
            }
        }
    }

    async handleSolutionDisplay(solution) {
        const container = document.getElementById('solution-output') || 
                         document.querySelector('.full-solution-container') ||
                         document.getElementById('result-container');
        
        if (container && solution) {
            try {
                container.classList.remove('hidden');
                await this.renderFullSolution(solution, container);
            } catch (error) {
                console.error('Solution rendering error:', error);
                this.renderFallbackSolution(container, solution);
            }
        }
    }

    async renderFullSolution(solution, container) {
        console.log('renderFullSolution called:', solution);
        if (!solution) {
            console.log('No solution provided');
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
                
                if (step.adimAciklamasi) {
                    html += `<div class="step-description mb-2 text-gray-700">${this.escapeHtml(step.adimAciklamasi)}</div>`;
                }
                
                if (step.cozum_lateks) {
                    html += `<div class="latex-content mb-2">${step.cozum_lateks}</div>`;
                }
                
                if (step.ipucu) {
                    html += `<div class="step-hint p-2 bg-yellow-50 rounded text-sm">${this.escapeHtml(step.ipucu)}</div>`;
                }
                
                html += '</div>';
            });
        }
        
        html += '</div>';
        container.innerHTML = html;
        
        setTimeout(async () => {
            await mathRenderer.renderContent(container);
        }, 100);
    }

    async handleInteractiveInit(solution) {
        try {
            console.log('Initializing interactive mode with solution:', solution);
            await interactiveSolutionService.initializeInteractiveSolution(solution);
            
        } catch (error) {
            console.error('Interactive mode initialization error:', error);
            
            const uiManager = app.getModule('uiManager');
            if (uiManager) {
                uiManager.showError('İnteraktif çözüm başlatılamadı. Tam çözüme yönlendiriliyorsunuz.');
                setTimeout(() => {
                    stateManager.setView('result');
                }, 2000);
            }
        }
    }

    async renderInteractiveSolution(solution) {
        console.log('renderInteractiveSolution called');
        
        const container = document.getElementById('solution-output') || document.getElementById('result-container');
        if (!container) {
            throw new Error('Solution container not found');
        }
        
        if (!solution || !solution.adimlar || !solution.adimlar.length) {
            container.innerHTML = `
                <div class="p-4 bg-red-50 text-red-700 rounded-lg">
                    <p>İnteraktif çözüm için adımlar bulunamadı.</p>
                    <button id="back-to-main-menu-btn" class="btn btn-secondary mt-2">Ana Menüye Dön</button>
                </div>`;
            return;
        }

        try {
            let html = '<div class="interactive-solution-container">';
            html += '<div class="flex justify-between items-center mb-4">';
            html += '<h3 class="text-xl font-bold text-gray-800">İnteraktif Çözüm</h3>';
            html += '<button id="back-to-main-menu-btn" class="btn btn-secondary">Ana Menüye Dön</button>';
            html += '</div>';
            
            html += '<div class="bg-blue-50 p-4 rounded-lg mb-4">';
            html += '<p class="text-blue-800">Her adımda doğru seçeneği seçerek problemi çözün. 3 deneme hakkınız var.</p>';
            html += '</div>';
            
            const firstStep = solution.adimlar[0];
            html += '<div id="interactive-step-container">';
            html += `<div class="step-header mb-4">`;
            html += `<h4 class="text-lg font-semibold">Adım 1/${solution.adimlar.length}</h4>`;
            html += `<p class="text-gray-700">${firstStep.adimAciklamasi || 'İlk adımı seçin'}</p>`;
            html += `</div>`;
            
            html += '<div id="interactive-options-container" class="space-y-3">';
            
            html += `<button class="option-btn w-full p-4 text-left bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 transition-colors" data-option="0" data-correct="true">`;
            html += `<div class="font-medium">${firstStep.adimAciklamasi || 'Doğru adım'}</div>`;
            if (firstStep.cozum_lateks) {
                html += `<div class="mt-2 text-sm text-gray-600">${firstStep.cozum_lateks}</div>`;
            }
            html += `</button>`;
            
            html += `<button class="option-btn w-full p-4 text-left bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 transition-colors" data-option="1" data-correct="false">`;
            html += `<div class="font-medium">Yanlış yaklaşım kullanmak</div>`;
            html += `<div class="mt-2 text-sm text-gray-600">Bu adım için uygun olmayan bir yöntem</div>`;
            html += `</button>`;
            
            html += `<button class="option-btn w-full p-4 text-left bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 transition-colors" data-option="2" data-correct="false">`;
            html += `<div class="font-medium">İşlem sırasını yanlış uygulamak</div>`;
            html += `<div class="mt-2 text-sm text-gray-600">Matematik kurallarına aykırı bir sıralama</div>`;
            html += `</button>`;
            
            html += '</div>';
            html += '</div>';
            html += '</div>';
            
            container.innerHTML = html;
            
            this.attachInteractiveEventListeners(solution);
            
            setTimeout(async () => {
                await mathRenderer.renderContent(container);
            }, 100);
            
        } catch (error) {
            console.error('Interactive solution rendering error:', error);
            container.innerHTML = `
                <div class="p-4 bg-red-50 text-red-700 rounded-lg">
                    <p>İnteraktif çözüm başlatılamadı: ${error.message}</p>
                    <button id="back-to-main-menu-btn" class="btn btn-secondary mt-2">Ana Menüye Dön</button>
                </div>`;
        }
    }

    attachInteractiveEventListeners(solution) {
        const optionButtons = document.querySelectorAll('.option-btn');
        let currentStep = 0;
        let attempts = 0;
        const maxAttempts = 3;
        
        optionButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const isCorrect = e.target.closest('button').dataset.correct === 'true';
                
                if (isCorrect) {
                    e.target.closest('button').classList.add('bg-green-100', 'border-green-400');
                    optionButtons.forEach(btn => btn.disabled = true);
                    
                    setTimeout(() => {
                        currentStep++;
                        if (currentStep < solution.adimlar.length) {
                            this.renderNextInteractiveStep(solution, currentStep);
                        } else {
                            this.showInteractiveCompletion();
                        }
                    }, 1500);
                    
                } else {
                    attempts++;
                    e.target.closest('button').classList.add('bg-red-100', 'border-red-400');
                    e.target.closest('button').disabled = true;
                    
                    if (attempts >= maxAttempts) {
                        const correctBtn = document.querySelector('[data-correct="true"]');
                        if (correctBtn) {
                            correctBtn.classList.add('bg-yellow-100', 'border-yellow-400');
                        }
                        
                        setTimeout(() => {
                            stateManager.setView('upload');
                            const uiManager = app.getModule('uiManager');
                            if (uiManager) {
                                uiManager.showError('3 deneme hakkınız bitti. Yeni soru yükleyebilirsiniz.');
                            }
                        }, 2000);
                    }
                }
            });
        });
    }

    renderNextInteractiveStep(solution, stepIndex) {
        this.showInteractiveCompletion();
    }

    showInteractiveCompletion() {
        const container = document.getElementById('solution-output');
        if (container) {
            container.innerHTML = `
                <div class="completion-message text-center py-8">
                    <div class="text-6xl mb-4">🎉</div>
                    <h3 class="text-2xl font-bold text-green-600 mb-4">Tebrikler!</h3>
                    <p class="text-lg text-gray-700 mb-4">İnteraktif çözümü tamamladınız!</p>
                    <div class="flex justify-center space-x-4">
                        <button onclick="window.stateManager.setView('result')" class="btn btn-primary">Tam Çözümü Göster</button>
                        <button onclick="window.stateManager.setView('upload')" class="btn btn-secondary">Yeni Problem</button>
                    </div>
                </div>
            `;
        }
    }

    renderFallbackSolution(container, solution) {
        let html = '<div class="solution-fallback">';
        html += '<h3 class="text-xl font-bold mb-4">Çözüm</h3>';
        
        if (solution.adimlar && solution.adimlar.length > 0) {
            html += '<div class="steps">';
            solution.adimlar.forEach((step, index) => {
                html += `<div class="step mb-4 p-3 bg-gray-50 rounded">`;
                html += `<h4 class="font-medium">Adım ${index + 1}</h4>`;
                if (step.adimAciklamasi) html += `<p><strong>Açıklama:</strong> ${step.adimAciklamasi}</p>`;
                if (step.cozum_lateks) html += `<p><strong>İşlem:</strong> ${step.cozum_lateks}</p>`;
                if (step.ipucu) html += `<p><strong>İpucu:</strong> ${step.ipucu}</p>`;
                html += `</div>`;
            });
            html += '</div>';
        }
        
        html += '</div>';
        container.innerHTML = html;
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                stateManager.setView('upload');
            }
            
            if (e.key === 'Escape') {
                const currentView = stateManager.getCurrentView();
                if (currentView === 'result' || currentView === 'solving' || currentView === 'interactive') {
                    stateManager.setView('summary');
                } else if (currentView === 'summary') {
                    stateManager.setView('upload');
                }
            }
        });
    }

    setupVisibilityHandlers() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Pause services when page becomes hidden
                if (smartGuideService.isActive()) {
                    smartGuideService.pause();
                }
                if (interactiveSolutionService.isInteractiveActive()) {
                    interactiveSolutionService.pause();
                }
            } else {
                // Resume services when page becomes visible
                if (smartGuideService.isActive()) {
                    smartGuideService.resume();
                }
                if (interactiveSolutionService.isInteractiveActive()) {
                    interactiveSolutionService.resume();
                }
            }
        });
    }

    handleInitializationError(error) {
        console.error('Critical initialization error:', error);
        
        const errorContainer = document.createElement('div');
        errorContainer.className = 'fixed inset-0 bg-red-50 flex items-center justify-center z-50';
        errorContainer.innerHTML = `
            <div class="max-w-md mx-4 p-6 bg-white rounded-lg shadow-lg border border-red-200">
                <div class="flex items-center mb-4">
                    <div class="text-red-500 text-2xl mr-3">⚠️</div>
                    <h2 class="text-xl font-semibold text-red-800">Uygulama Başlatılamadı</h2>
                </div>
                <p class="text-red-700 mb-4">
                    Uygulama başlatılırken bir hata oluştu. Lütfen sayfayı yenileyin.
                </p>
                <div class="flex space-x-3">
                    <button onclick="window.location.reload()" 
                            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                        Sayfayı Yenile
                    </button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
                        Kapat
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(errorContainer);
    }

    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    isInitialized() {
        return this.initialized;
    }

    destroy() {
        smartGuideService.destroy();
        interactiveSolutionService.destroy();
        this.initialized = false;
        console.log('Index page controller destroyed');
    }
}

// Create and initialize the page controller
const indexPageController = new IndexPageController();

// Initialize when DOM is ready with proper error handling
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        indexPageController.init().catch(error => {
            console.error('Page initialization failed:', error);
        });
    });
} else {
    indexPageController.init().catch(error => {
        console.error('Page initialization failed:', error);
    });
}

// Export for debugging purposes
window.indexPageController = indexPageController;
window.app = app;
window.stateManager = stateManager;
window.DebugHelper = DebugHelper;
window.smartGuideService = smartGuideService;
window.interactiveSolutionService = interactiveSolutionService;