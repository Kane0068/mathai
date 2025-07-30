// =================================================================================
//  UI Service - Centralized UI management and rendering
// =================================================================================

import { 
    showLoading, 
    showError, 
    showSuccess, 
    showAnimatedLoading,
    renderMath,
    renderMathInContainer,
    renderSmartContent,
    renderLatexContent,
    smartRender,
    batchRender,
    waitForRenderSystem,
    getRenderStats,
    clearRenderCache
} from '../modules/ui.js';

export class UIService {
    constructor(stateManager, mathRenderer) {
        this.stateManager = stateManager;
        this.mathRenderer = mathRenderer;
        this.currentView = null;
        this.viewHistory = [];
        this.renderQueue = [];
        this.isRendering = false;
        
        // Subscribe to state changes
        this.stateManager.subscribe(this.onStateChange.bind(this));
    }
    
    onStateChange(newState) {
        const newView = newState.ui.view;
        
        if (newView !== this.currentView) {
            this.viewHistory.push(this.currentView);
            this.currentView = newView;
            this.handleViewChange(newView, newState);
        }
        
        // Handle loading state
        if (newState.ui.isLoading) {
            this.showLoading(newState.ui.loadingMessage || 'İşleniyor...');
        } else if (this.currentView !== 'loading') {
            this.showLoading(false);
        }
        
        // Handle error state
        if (newState.ui.error) {
            this.showError(newState.ui.error, true, () => {
                this.stateManager.clearError();
                this.stateManager.resetToSetupSafely();
            });
        }
    }
    
    handleViewChange(view, state) {
        console.log(`🎨 View changed to: ${view}`);
        
        switch (view) {
            case 'setup':
                this.showSetupView();
                break;
                
            case 'solving':
                this.showSolvingView();
                break;
                
            case 'fullSolution':
                this.showFullSolutionView(state.problem.solution);
                break;
                
            case 'interactive':
                this.showInteractiveView(state.problem.solution, state.ui.interactiveStep);
                break;
                
            default:
                console.warn('Unknown view:', view);
        }
    }
    
    showSetupView() {
        const containers = {
            setup: document.getElementById('setup-container'),
            result: document.getElementById('result-container'),
            solution: document.getElementById('solution-output')
        };
        
        if (containers.setup) containers.setup.classList.remove('hidden');
        if (containers.result) containers.result.classList.add('hidden');
        if (containers.solution) containers.solution.classList.add('hidden');
        
        // Reset any active canvases or inputs
        this.resetInputs();
    }
    
    showSolvingView() {
        // This is handled by the loading states
        console.log('🔄 Showing solving view...');
    }
    
    async showFullSolutionView(solution) {
        if (!solution) {
            console.error('No solution provided for full solution view');
            return;
        }
        
        const containers = {
            setup: document.getElementById('setup-container'),
            result: document.getElementById('result-container'),
            solution: document.getElementById('solution-output')
        };
        
        if (containers.setup) containers.setup.classList.add('hidden');
        if (containers.result) containers.result.classList.remove('hidden');
        if (containers.solution) containers.solution.classList.remove('hidden');
        
        // Render the full solution
        await this.renderFullSolution(solution);
    }
    
    async showInteractiveView(solution, currentStep = 0) {
        if (!solution) {
            console.error('No solution provided for interactive view');
            return;
        }
        
        const containers = {
            setup: document.getElementById('setup-container'),
            result: document.getElementById('result-container'),
            solution: document.getElementById('solution-output')
        };
        
        if (containers.setup) containers.setup.classList.add('hidden');
        if (containers.result) containers.result.classList.remove('hidden');
        if (containers.solution) containers.solution.classList.remove('hidden');
        
        // Render the interactive solution
        await this.renderInteractiveSolution(solution, currentStep);
    }
    
    async renderFullSolution(solution) {
        const container = document.getElementById('solution-output');
        if (!container) return;
        
        try {
            // Build solution HTML
            const solutionHTML = this.buildFullSolutionHTML(solution);
            container.innerHTML = solutionHTML;
            
            // Render all math content
            await this.renderMathInContainer(container);
            
            console.log('✅ Full solution rendered successfully');
            
        } catch (error) {
            console.error('❌ Full solution render error:', error);
            container.innerHTML = '<p class="text-red-600">Çözüm görüntülenirken hata oluştu.</p>';
        }
    }
    
    buildFullSolutionHTML(solution) {
        let html = '<div class="solution-container space-y-6">';
        
        // Problem summary
        if (solution.problemOzeti) {
            html += '<div class="problem-summary bg-blue-50 p-4 rounded-lg">';
            html += '<h3 class="text-lg font-semibold text-blue-800 mb-3">Problem Özeti</h3>';
            
            if (solution.problemOzeti.verilenler) {
                html += '<div class="mb-3"><strong>Verilenler:</strong><ul class="list-disc ml-5 mt-2">';
                solution.problemOzeti.verilenler.forEach(item => {
                    html += `<li class="smart-content" data-content="${this.escapeHtml(item)}"></li>`;
                });
                html += '</ul></div>';
            }
            
            if (solution.problemOzeti.istenen) {
                html += `<div><strong>İstenen:</strong> <span class="smart-content" data-content="${this.escapeHtml(solution.problemOzeti.istenen)}"></span></div>`;
            }
            
            html += '</div>';
        }
        
        // Solution steps
        if (solution.adimlar && solution.adimlar.length > 0) {
            html += '<div class="solution-steps">';
            html += '<h3 class="text-lg font-semibold text-gray-800 mb-4">Çözüm Adımları</h3>';
            
            solution.adimlar.forEach((step, index) => {
                html += `<div class="step bg-white p-4 rounded-lg border border-gray-200 mb-4">`;
                html += `<div class="step-header flex items-center mb-3">`;
                html += `<div class="step-number bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm mr-3">${index + 1}</div>`;
                html += `<div class="step-description text-gray-700">${this.escapeHtml(step.adimAciklamasi)}</div>`;
                html += `</div>`;
                
                if (step.cozum_lateks) {
                    html += `<div class="step-solution latex-content" data-latex="${this.escapeHtml(step.cozum_lateks)}"></div>`;
                }
                
                if (step.ipucu) {
                    html += `<div class="step-hint bg-yellow-50 p-3 rounded mt-3 text-sm text-yellow-800">`;
                    html += `<strong>💡 İpucu:</strong> ${this.escapeHtml(step.ipucu)}`;
                    html += `</div>`;
                }
                
                html += `</div>`;
            });
            
            html += '</div>';
        }
        
        // Final answer
        if (solution.tamCozumLateks && solution.tamCozumLateks.length > 0) {
            html += '<div class="final-answer bg-green-50 p-4 rounded-lg border border-green-200">';
            html += '<h3 class="text-lg font-semibold text-green-800 mb-3">Tam Çözüm</h3>';
            
            solution.tamCozumLateks.forEach(latex => {
                html += `<div class="latex-content mb-2" data-latex="${this.escapeHtml(latex)}"></div>`;
            });
            
            html += '</div>';
        }
        
        // Action buttons
        html += this.buildActionButtons();
        
        html += '</div>';
        
        return html;
    }
    
    buildActionButtons() {
        return `
            <div class="action-buttons flex flex-wrap gap-3 mt-6 pt-4 border-t">
                <button id="new-problem-btn" class="btn btn-primary">
                    🆕 Yeni Problem
                </button>
                <button id="interactive-mode-btn" class="btn btn-secondary">
                    🎯 Interaktif Mod
                </button>
                <button id="export-solution-btn" class="btn btn-outline">
                    📤 Çözümü Dışa Aktar
                </button>
            </div>
        `;
    }
    
    async renderInteractiveSolution(solution, currentStep) {
        // This would be implemented by the interactive solution manager
        // For now, we'll delegate to the existing system
        console.log(`🎯 Rendering interactive solution, step: ${currentStep}`);
    }
    
    resetInputs() {
        // Reset file inputs
        const fileInput = document.getElementById('problem-image');
        if (fileInput) fileInput.value = '';
        
        // Reset text inputs
        const textInput = document.getElementById('problem-text');
        if (textInput) textInput.value = '';
        
        // Clear canvases (this would need canvas manager integration)
        console.log('🧹 Inputs reset');
    }
    
    // Delegated UI methods
    showLoading(message) {
        return showLoading(message);
    }
    
    showError(message, showResetButton = false, onReset = () => {}) {
        return showError(message, showResetButton, onReset);
    }
    
    showSuccess(message, autoHide = true, hideDelay = 3000) {
        return showSuccess(message, autoHide, hideDelay);
    }
    
    showAnimatedLoading(steps, stepDelay = 1500) {
        return showAnimatedLoading(steps, stepDelay);
    }
    
    async renderMath(content, element, displayMode = false) {
        return await renderMath(content, element, displayMode);
    }
    
    async renderMathInContainer(container, displayMode = false) {
        return await renderMathInContainer(container, displayMode);
    }
    
    async renderSmartContent(container) {
        return await renderSmartContent(container);
    }
    
    async renderLatexContent(container) {
        return await renderLatexContent(container);
    }
    
    // Utility methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Navigation methods
    goBack() {
        if (this.viewHistory.length > 0) {
            const previousView = this.viewHistory.pop();
            this.stateManager.setView(previousView);
            return true;
        }
        return false;
    }
    
    canGoBack() {
        return this.viewHistory.length > 0;
    }
    
    // Cleanup
    dispose() {
        this.renderQueue = [];
        clearRenderCache();
    }
}