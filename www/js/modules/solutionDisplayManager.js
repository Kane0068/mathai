/**
 * SolutionDisplayManager - Handles solution rendering and display logic
 * Extracts from index.js: Solution display, question summary, full solution rendering
 */

import { mathRendererManager } from './mathRendererManager.js';
import { renderSmartContent, renderMathInContainer } from './ui.js';

export class SolutionDisplayManager {
    constructor() {
        this.currentSolution = null;
    }

    /**
     * Display question summary
     */
    async displayQuestionSummary(problemOzeti, elements) {
        if (!problemOzeti) return;

        const { verilenler, istenen } = problemOzeti;

        let summaryHTML = '<div class="problem-summary bg-blue-50 p-4 rounded-lg mb-4">';
        summaryHTML += '<h3 class="font-semibold text-blue-800 mb-2">Problem Özeti:</h3>';

        if (verilenler && verilenler.length > 0) {
            summaryHTML += '<div class="mb-2"><strong>Verilenler:</strong><ul class="list-disc list-inside ml-4">';
            verilenler.forEach((veri, index) => {
                summaryHTML += `<li class="smart-content" data-content="${this.escapeHtml(veri)}" id="verilen-${index}"></li>`;
            });
            summaryHTML += '</ul></div>';
        }

        if (istenen) {
            summaryHTML += `<div><strong>İstenen:</strong> <span class="smart-content" data-content="${this.escapeHtml(istenen)}" id="istenen-content"></span></div>`;
        }

        summaryHTML += '</div>';
        elements['question'].innerHTML = summaryHTML;

        // Advanced Math Renderer ile render et
        setTimeout(async () => {
            await renderSmartContent(elements['question']);
        }, 50);
    }

    /**
     * Render full solution with all steps
     */
    async renderFullSolution(solution, elements) {
        console.log('renderFullSolution called with Advanced Math Renderer:', solution);
        if (!solution) {
            console.log('No solution provided to renderFullSolution');
            return;
        }

        this.currentSolution = solution;

        let html = '<div class="full-solution-container">';
        html += '<div class="flex justify-between items-center mb-4">';
        html += '<h3 class="text-xl font-bold text-gray-800">Tam Çözüm</h3>';
        html += '<button id="back-to-main-menu-btn" class="btn btn-secondary">Ana Menüye Dön</button>';
        html += '</div>';

        if (solution.adimlar && solution.adimlar.length > 0) {
            solution.adimlar.forEach((step, index) => {
                html += `<div class="solution-step p-4 mb-3 bg-gray-50 rounded-lg">`;
                html += `<div class="step-number font-semibold text-blue-600 mb-2">${index + 1}. Adım</div>`;
                html += `<div class="step-description mb-2 text-gray-700 smart-content" data-content="${this.escapeHtml(step.adimAciklamasi || 'Adım açıklaması')}" id="step-desc-${index}"></div>`;
                if (step.cozum_lateks) {
                    html += `<div class="latex-content mb-2" data-latex="${this.escapeHtml(step.cozum_lateks)}" id="step-latex-${index}"></div>`;
                }
                if (step.ipucu) {
                    html += `<div class="step-hint p-2 bg-yellow-50 rounded text-sm smart-content" data-content="${this.escapeHtml(step.ipucu)}" id="step-hint-${index}"></div>`;
                }
                html += '</div>';
            });
        } else if (solution.tamCozumLateks && solution.tamCozumLateks.length > 0) {
            solution.tamCozumLateks.forEach((latex, index) => {
                html += `<div class="solution-step p-4 mb-3 bg-gray-50 rounded-lg">`;
                html += `<div class="step-number font-semibold text-blue-600 mb-2">${index + 1}. Adım</div>`;
                html += `<div class="latex-content" data-latex="${this.escapeHtml(latex)}" id="legacy-step-${index}"></div>`;
                html += '</div>';
            });
        } else {
            html += '<div class="p-4 bg-red-50 text-red-700 rounded-lg">';
            html += '<p>Çözüm verisi bulunamadı. Lütfen tekrar deneyin.</p>';
            html += '</div>';
        }

        html += '</div>';
        elements['solution-output'].innerHTML = html;

        // Advanced Math Renderer ile render et
        setTimeout(async () => {
            await renderMathInContainer(elements['solution-output'], false);
        }, 100);

        console.log('renderFullSolution completed with Advanced Math Renderer');
    }

    /**
     * Render step-by-step solution (Smart Guide format)
     */
    async renderStepByStepSolution(solution, elements) {
        console.log('🔄 renderStepByStepSolution starting...');

        if (!solution || !solution.adimlar || !solution.adimlar.length) {
            console.error('❌ Step-by-step solution data missing');
            return;
        }

        try {
            let html = '<div class="step-by-step-solution">';
            html += '<div class="flex justify-between items-center mb-4">';
            html += '<h3 class="text-xl font-bold text-gray-800">Adım Adım Çözüm</h3>';
            html += '<button id="back-to-main-menu-btn" class="btn btn-secondary">Ana Menüye Dön</button>';
            html += '</div>';

            // Progress indicator
            html += '<div class="progress-indicator mb-6">';
            html += '<div class="flex justify-between items-center mb-2">';
            html += `<span class="text-sm font-medium text-gray-700">Toplam ${solution.adimlar.length} adım</span>`;
            html += '</div>';
            html += '<div class="progress-steps flex gap-2">';
            
            solution.adimlar.forEach((_, index) => {
                html += `<div class="step-dot w-3 h-3 rounded-full bg-gray-300" data-step="${index}"></div>`;
            });
            
            html += '</div>';
            html += '</div>';

            // Steps container
            html += '<div class="steps-container">';
            
            solution.adimlar.forEach((step, index) => {
                html += `<div class="solution-step mb-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm" data-step="${index}">`;
                
                // Step header
                html += `<div class="step-header flex items-center mb-3">`;
                html += `<div class="step-number w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm mr-3">${index + 1}</div>`;
                html += `<h4 class="font-semibold text-gray-800">Adım ${index + 1}</h4>`;
                html += `</div>`;
                
                // Step description
                if (step.adimAciklamasi) {
                    html += `<div class="step-description mb-3 p-3 bg-blue-50 rounded border border-blue-200">`;
                    html += `<div class="smart-content text-blue-800" data-content="${this.escapeHtml(step.adimAciklamasi)}" id="step-desc-${index}"></div>`;
                    html += `</div>`;
                }
                
                // Mathematical solution
                if (step.cozum_lateks) {
                    html += `<div class="mathematical-solution mb-3">`;
                    html += `<h5 class="text-sm font-medium text-gray-600 mb-2">Matematiksel Çözüm:</h5>`;
                    html += `<div class="latex-content p-3 bg-gray-50 rounded border" data-latex="${this.escapeHtml(step.cozum_lateks)}" id="step-math-${index}"></div>`;
                    html += `</div>`;
                }
                
                // Hint (collapsible)
                if (step.ipucu) {
                    html += `<div class="step-hint-section">`;
                    html += `<button class="hint-toggle flex items-center gap-2 text-sm text-yellow-700 hover:text-yellow-800 transition-colors" data-step="${index}">`;
                    html += `<svg class="w-4 h-4 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">`;
                    html += `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>`;
                    html += `</svg>`;
                    html += `💡 İpucu göster`;
                    html += `</button>`;
                    html += `<div class="hint-content hidden mt-2 p-3 bg-yellow-50 rounded border border-yellow-200">`;
                    html += `<div class="smart-content text-yellow-800" data-content="${this.escapeHtml(step.ipucu)}" id="step-hint-${index}"></div>`;
                    html += `</div>`;
                    html += `</div>`;
                }
                
                html += `</div>`;
            });
            
            html += '</div>';
            html += '</div>';

            elements['solution-output'].innerHTML = html;

            // Setup hint toggles
            this.setupHintToggles();

            // Advanced Math Renderer ile render et
            setTimeout(async () => {
                await renderMathInContainer(elements['solution-output'], false);
                this.animateSteps();
            }, 100);

            console.log('✅ Step-by-step solution rendered');

        } catch (error) {
            console.error('❌ renderStepByStepSolution error:', error);
            throw error;
        }
    }

    /**
     * Setup hint toggle functionality
     */
    setupHintToggles() {
        const hintToggleButtons = document.querySelectorAll('.hint-toggle');
        
        hintToggleButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const stepIndex = button.dataset.step;
                const hintContent = button.parentElement.querySelector('.hint-content');
                const arrow = button.querySelector('svg');
                
                if (hintContent.classList.contains('hidden')) {
                    hintContent.classList.remove('hidden');
                    arrow.style.transform = 'rotate(90deg)';
                    button.innerHTML = button.innerHTML.replace('İpucu göster', 'İpucu gizle');
                } else {
                    hintContent.classList.add('hidden');
                    arrow.style.transform = 'rotate(0deg)';
                    button.innerHTML = button.innerHTML.replace('İpucu gizle', 'İpucu göster');
                }
            });
        });
    }

    /**
     * Animate steps appearance
     */
    animateSteps() {
        const steps = document.querySelectorAll('.solution-step[data-step]');
        const dots = document.querySelectorAll('.step-dot[data-step]');
        
        steps.forEach((step, index) => {
            setTimeout(() => {
                step.style.opacity = '0';
                step.style.transform = 'translateY(20px)';
                step.style.transition = 'all 0.5s ease';
                
                setTimeout(() => {
                    step.style.opacity = '1';
                    step.style.transform = 'translateY(0)';
                    
                    // Update progress dot
                    if (dots[index]) {
                        dots[index].classList.remove('bg-gray-300');
                        dots[index].classList.add('bg-blue-500');
                    }
                }, 50);
            }, index * 200);
        });
    }

    /**
     * Generate solution options HTML (for summary view)
     */
    generateSolutionOptionsHTML() {
        return `
            <div class="solution-options mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 class="font-semibold text-gray-800 mb-4">Çözüm Seçenekleri</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button id="start-solving-workspace-btn" class="btn btn-primary">
                        🎯 İnteraktif Çözüm
                    </button>
                    <button id="show-full-solution-btn" class="btn btn-secondary">
                        📋 Tam Çözümü Gör
                    </button>
                    <button id="step-by-step-btn" class="btn btn-tertiary">
                        📝 Adım Adım Çözüm
                    </button>
                </div>
                <div class="solution-description mt-4 text-sm text-gray-600">
                    <p><strong>İnteraktif Çözüm:</strong> Her adımda seçenekler arasından doğru cevabı seçerek ilerleyin.</p>
                    <p><strong>Tam Çözüm:</strong> Problemin tüm çözümünü bir arada görüntüleyin.</p>
                    <p><strong>Adım Adım:</strong> Her adımı detaylı açıklamalarla inceleyin.</p>
                </div>
            </div>
        `;
    }

    /**
     * Show solution summary
     */
    async displaySolutionSummary(solution, elements) {
        if (!solution) return;

        // Display question summary
        if (solution.problemOzeti) {
            await this.displayQuestionSummary(solution.problemOzeti, elements);
        }

        // Add solution options
        const optionsHTML = this.generateSolutionOptionsHTML();
        
        if (elements['question']) {
            elements['question'].innerHTML += optionsHTML;
        }

        // Store current solution
        this.currentSolution = solution;
    }

    /**
     * Clear solution display
     */
    clearSolutionDisplay(elements) {
        if (elements['solution-output']) {
            elements['solution-output'].innerHTML = '';
        }
        
        if (elements['question']) {
            elements['question'].innerHTML = '';
        }
        
        if (elements['result-container']) {
            elements['result-container'].classList.add('hidden');
        }

        this.currentSolution = null;
        console.log('✅ Solution display cleared');
    }

    /**
     * Show loading state for solution rendering
     */
    showSolutionLoading(message = 'Çözüm hazırlanıyor...', elements) {
        if (elements['solution-output']) {
            elements['solution-output'].innerHTML = `
                <div class="flex items-center justify-center p-8">
                    <div class="text-center">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p class="text-gray-600">${message}</p>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Escape HTML for safe insertion
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get current solution
     */
    getCurrentSolution() {
        return this.currentSolution;
    }

    /**
     * Validate solution data structure
     */
    validateSolution(solution) {
        if (!solution || typeof solution !== 'object') return false;
        
        // Check required fields
        if (!solution.problemOzeti && !solution.adimlar && !solution.tamCozumLateks) {
            return false;
        }

        return true;
    }

    /**
     * Format solution for display
     */
    formatSolutionForDisplay(solution) {
        if (!this.validateSolution(solution)) {
            console.warn('⚠️ Invalid solution data, using fallback');
            return this.createFallbackSolution();
        }

        // Prepare content with math renderer
        return mathRendererManager.prepareContentForRender(solution);
    }

    /**
     * Create fallback solution for errors
     */
    createFallbackSolution() {
        return {
            problemOzeti: {
                verilenler: ["Çözüm verisi işlenemedi"],
                istenen: "Lütfen tekrar deneyin"
            },
            adimlar: [{
                adimAciklamasi: "Çözüm gösterilemiyor",
                cozum_lateks: "\\text{Lütfen tekrar deneyin}",
                ipucu: "Teknik bir sorun oluştu"
            }],
            tamCozumLateks: ["\\text{Çözüm yüklenemedi}"]
        };
    }
}

// Export singleton instance
export const solutionDisplayManager = new SolutionDisplayManager();