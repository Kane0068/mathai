// www/js/utils/LegacyBridge.js
// Bridge to maintain compatibility with old system components

/**
 * Legacy function compatibility layer
 */
export class LegacyBridge {
    
    /**
     * Create legacy-compatible functions for old modules
     */
    static setupLegacyFunctions() {
        // Make key functions globally available for old modules
        
        // escapeHtml function
        window.escapeHtml = function(text) {
            if (typeof text !== 'string') return text;
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };

        // Math rendering functions
        window.renderMathInContainer = async function(container, forceRender = false) {
            try {
                const { mathRenderer } = await import('../services/MathRenderer.js');
                await mathRenderer.renderContent(container);
            } catch (error) {
                console.error('Math rendering error:', error);
            }
        };

        window.renderSmartContent = async function(container) {
            try {
                const { mathRenderer } = await import('../services/MathRenderer.js');
                await mathRenderer.renderContent(container);
            } catch (error) {
                console.error('Smart content rendering error:', error);
            }
        };

        // Legacy UI functions
        window.showError = function(message, persistent = false) {
            if (window.app && window.app.getModule) {
                const uiManager = window.app.getModule('uiManager');
                if (uiManager) {
                    uiManager.showError(message, persistent);
                    return;
                }
            }
            console.error('UI Error:', message);
        };

        window.showSuccess = function(message) {
            if (window.app && window.app.getModule) {
                const uiManager = window.app.getModule('uiManager');
                if (uiManager) {
                    uiManager.showSuccess(message);
                    return;
                }
            }
            console.log('UI Success:', message);
        };

        window.showLoading = function(message = 'Yükleniyor...', show = true) {
            if (window.app && window.app.getModule) {
                const stateManager = window.app.getModule('stateManager');
                if (stateManager) {
                    stateManager.setState('ui.loading', show);
                    if (show && message) {
                        stateManager.setState('ui.loadingMessage', message);
                    }
                    return;
                }
            }
            if (show) {
                console.log('Loading:', message);
            } else {
                console.log('Loading finished');
            }
        };

        // Legacy element access
        window.elements = new Proxy({}, {
            get: function(target, prop) {
                return document.getElementById(prop);
            }
        });

        console.log('Legacy bridge functions setup complete');
    }

    /**
     * Create legacy InteractiveSolutionManager compatibility
     */
    static createInteractiveSolutionManagerBridge() {
        window.interactiveSolutionManager = {
            reset: function() {
                console.log('Legacy interactiveSolutionManager.reset() called');
            },
            
            initializeInteractiveSolution: function(solution) {
                console.log('Legacy interactiveSolutionManager.initializeInteractiveSolution() called', solution);
                return {
                    totalSteps: solution?.adimlar?.length || 0,
                    maxAttempts: 3,
                    currentStep: 1
                };
            },
            
            generateStepOptions: function(stepIndex) {
                console.log('Legacy interactiveSolutionManager.generateStepOptions() called', stepIndex);
                return {
                    stepNumber: stepIndex + 1,
                    totalSteps: 3,
                    options: [
                        { id: 0, text: 'Doğru seçenek', isCorrect: true },
                        { id: 1, text: 'Yanlış seçenek 1', isCorrect: false },
                        { id: 2, text: 'Yanlış seçenek 2', isCorrect: false }
                    ]
                };
            },
            
            evaluateSelection: function(optionId) {
                console.log('Legacy interactiveSolutionManager.evaluateSelection() called', optionId);
                return {
                    isCorrect: optionId === 0,
                    message: optionId === 0 ? 'Doğru!' : 'Yanlış!',
                    shouldResetToSetup: false
                };
            }
        };
    }

    /**
     * Create legacy SmartGuide compatibility
     */
    static createSmartGuideBridge() {
        window.smartGuide = {
            reset: function() {
                console.log('Legacy smartGuide.reset() called');
                if (window.smartGuideService) {
                    window.smartGuideService.reset();
                }
            },
            
            resetAllAttempts: function() {
                console.log('Legacy smartGuide.resetAllAttempts() called');
                if (window.smartGuideService) {
                    window.smartGuideService.reset();
                }
            },
            
            initializeGuidance: async function(solution) {
                console.log('Legacy smartGuide.initializeGuidance() called', solution);
                if (window.smartGuideService) {
                    return await window.smartGuideService.initializeGuidance(solution);
                }
            }
        };
    }

    /**
     * Create legacy rendering functions
     */
    static createRenderingBridge() {
        // renderFullSolution function
        window.renderFullSolution = async function(solution) {
            console.log('Legacy renderFullSolution called');
            if (window.indexPageController) {
                const container = document.getElementById('solution-output') || document.getElementById('result-container');
                if (container) {
                    await window.indexPageController.renderFullSolution(solution, container);
                }
            }
        };

        // renderInteractiveSolution function
        window.renderInteractiveSolution = async function(solution) {
            console.log('Legacy renderInteractiveSolution called');
            if (window.indexPageController) {
                await window.indexPageController.renderInteractiveSolution(solution);
            }
        };

        // renderSmartGuideWorkspace function
        window.renderSmartGuideWorkspace = async function() {
            console.log('Legacy renderSmartGuideWorkspace called');
            if (window.smartGuideService) {
                await window.smartGuideService.setupSolvingWorkspace();
            }
        };
    }

    /**
     * Setup all legacy bridges
     */
    static setupAll() {
        this.setupLegacyFunctions();
        this.createInteractiveSolutionManagerBridge();
        this.createSmartGuideBridge();
        this.createRenderingBridge();
        
        console.log('All legacy bridges setup complete');
    }
}

// Auto-setup when module loads
LegacyBridge.setupAll();