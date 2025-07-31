// www/js/services/SmartGuideService.js
import { mathRenderer } from './MathRenderer.js';
import { stateManager } from '../modules/stateManager.js';

export class SmartGuideService {
    constructor() {
        this.initialized = false;
        this.currentStep = 0;
        this.solution = null;
        this.stepHistory = [];
        this.maxAttempts = 3;
        this.attemptCount = 0;
        this.guidanceActive = false;
        this.inputMode = 'text'; // 'text' or 'drawing'
    }

    /**
     * Initialize smart guidance with solution data
     * @param {Object} solutionData - Complete solution from API
     */
    async initializeGuidance(solutionData) {
        if (!solutionData) {
            throw new Error('Solution data required for guidance initialization');
        }

        try {
            this.solution = solutionData;
            this.currentStep = 0;
            this.stepHistory = [];
            this.attemptCount = 0;
            this.guidanceActive = true;
            
            // Initialize the solving workspace
            await this.setupSolvingWorkspace();
            
            // Show first step
            await this.showCurrentStep();
            
            this.initialized = true;
            console.log('Smart guidance initialized successfully');
            
        } catch (error) {
            console.error('Smart guidance initialization error:', error);
            throw error;
        }
    }

    /**
     * Setup the solving workspace UI for "I Will Solve It Myself"
     */
    async setupSolvingWorkspace() {
        const container = document.getElementById('step-by-step-container');
        if (!container) {
            throw new Error('Step-by-step container not found');
        }

        // Clear existing content
        container.innerHTML = '';

        if (!this.solution || !this.solution.adimlar) {
            container.innerHTML = '<div class="text-red-600">Çözüm adımları bulunamadı.</div>';
            return;
        }

        // Create step-by-step workspace similar to old architecture
        let html = '<div class="smart-guide-workspace">';
        html += '<div class="mb-4">';
        html += '<h3 class="text-lg font-semibold text-gray-800 mb-2">Adım Adım Çözüm Alanı</h3>';
        html += '<p class="text-gray-600">Her adımı kendiniz çözerek ilerleyin. Yazılı veya çizili yanıtlarınızı girebilirsiniz.</p>';
        html += '</div>';

        // Create steps
        this.solution.adimlar.forEach((step, index) => {
            const isActive = index === this.currentStep;
            const isCompleted = index < this.currentStep;
            
            html += `<div class="step-block mb-4 p-4 border-2 rounded-lg ${
                isActive ? 'border-blue-400 bg-blue-50 active' : 
                isCompleted ? 'border-green-400 bg-green-50 step-correct' : 
                'border-gray-200 bg-gray-50 inactive'
            }" id="step-block-${index}">`;
            
            html += `<h4 class="font-semibold mb-2">Adım ${index + 1}/${this.solution.adimlar.length}</h4>`;
            
            if (step.adimAciklamasi) {
                html += `<div class="step-description mb-3 text-gray-700">${step.adimAciklamasi}</div>`;
            }
            
            if (isActive) {
                // Active step - show input area
                html += '<div class="step-content">';
                html += '<div class="input-section mb-4">';
                html += '<div class="flex space-x-2 mb-2">';
                html += `<button class="btn btn-sm ${this.inputMode === 'text' ? 'btn-primary' : 'btn-secondary'}" onclick="window.smartGuideService.switchInputMode('text', ${index})">Metin</button>`;
                html += `<button class="btn btn-sm ${this.inputMode === 'drawing' ? 'btn-primary' : 'btn-secondary'}" onclick="window.smartGuideService.switchInputMode('drawing', ${index})">Çizim</button>`;
                html += '</div>';
                
                if (this.inputMode === 'text') {
                    html += `<textarea id="step-text-input-${index}" class="w-full p-3 border border-gray-300 rounded-md" rows="3" placeholder="Adım ${index + 1} için yanıtınızı yazın..."></textarea>`;
                } else {
                    html += `<canvas id="step-canvas-${index}" class="border border-gray-300 rounded-md bg-white" width="400" height="200"></canvas>`;
                    html += '<div class="canvas-tools mt-2 flex space-x-2">';
                    html += `<button class="btn btn-sm btn-secondary" onclick="window.smartGuideService.setCanvasTool('pen', ${index})">Kalem</button>`;
                    html += `<button class="btn btn-sm btn-secondary" onclick="window.smartGuideService.setCanvasTool('eraser', ${index})">Silgi</button>`;
                    html += `<button class="btn btn-sm btn-secondary" onclick="window.smartGuideService.clearCanvas(${index})">Temizle</button>`;
                    html += '</div>';
                }
                
                html += '</div>';
                html += '<div class="action-buttons flex space-x-2">';
                html += `<button class="btn btn-primary" onclick="window.smartGuideService.submitStep(${index})">Adımı Gönder</button>`;
                html += `<button class="btn btn-secondary" onclick="window.smartGuideService.showHint(${index})">İpucu Al</button>`;
                if (index > 0) {
                    html += `<button class="btn btn-gray" onclick="window.smartGuideService.goBackStep(${index})">Önceki Adım</button>`;
                }
                html += '</div>';
                html += '</div>';
                
            } else if (isCompleted) {
                // Completed step - show what user entered
                html += '<div class="step-content opacity-75">';
                html += '<div class="user-answer p-3 bg-white rounded border">';
                html += '<strong>Girilen Yanıt:</strong><br>';
                html += this.stepHistory[index]?.userAnswer || 'Kullanıcı yanıtı';
                html += '</div>';
                html += '</div>';
            } else {
                // Future step - disabled
                html += '<div class="step-content text-gray-500">';
                html += '<p>Bu adım önceki adımlar tamamlandıktan sonra aktif olacak.</p>';
                html += '</div>';
            }
            
            html += '</div>'; // step-block
        });

        // Progress indicator
        html += '<div class="progress-section mt-6 p-4 bg-gray-100 rounded-lg">';
        html += '<div class="flex justify-between items-center mb-2">';
        html += `<span class="text-sm font-medium">İlerleme: ${this.currentStep}/${this.solution.adimlar.length}</span>`;
        html += `<span class="text-sm text-gray-600">${Math.round((this.currentStep / this.solution.adimlar.length) * 100)}%</span>`;
        html += '</div>';
        html += '<div class="w-full bg-gray-200 rounded-full h-2">';
        html += `<div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: ${(this.currentStep / this.solution.adimlar.length) * 100}%"></div>`;
        html += '</div>';
        html += '</div>';

        html += '</div>'; // smart-guide-workspace
        
        container.innerHTML = html;
        
        // Initialize canvas if needed
        if (this.inputMode === 'drawing') {
            setTimeout(() => {
                this.initializeStepCanvas(this.currentStep);
            }, 100);
        }
    }

    /**
     * Switch input mode between text and drawing
     */
    switchInputMode(mode, stepIndex) {
        this.inputMode = mode;
        this.setupSolvingWorkspace(); // Re-render with new mode
    }

    /**
     * Initialize canvas for a step
     */
    initializeStepCanvas(stepIndex) {
        const canvas = document.getElementById(`step-canvas-${stepIndex}`);
        if (canvas) {
            // Basic canvas setup - you can integrate with your CanvasManager here
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add basic drawing functionality
            let isDrawing = false;
            
            canvas.addEventListener('mousedown', (e) => {
                isDrawing = true;
                ctx.beginPath();
                const rect = canvas.getBoundingClientRect();
                ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
            });
            
            canvas.addEventListener('mousemove', (e) => {
                if (!isDrawing) return;
                const rect = canvas.getBoundingClientRect();
                ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                ctx.stroke();
            });
            
            canvas.addEventListener('mouseup', () => {
                isDrawing = false;
            });
        }
    }

    /**
     * Submit current step
     */
    async submitStep(stepIndex) {
        let userAnswer = '';
        
        if (this.inputMode === 'text') {
            const textInput = document.getElementById(`step-text-input-${stepIndex}`);
            userAnswer = textInput?.value.trim() || '';
        } else {
            const canvas = document.getElementById(`step-canvas-${stepIndex}`);
            userAnswer = canvas?.toDataURL() || '';
        }
        
        if (!userAnswer) {
            this.showNotification('Lütfen bir yanıt girin.', 'warning');
            return;
        }
        
        // Store the user's answer
        if (!this.stepHistory[stepIndex]) {
            this.stepHistory[stepIndex] = {};
        }
        this.stepHistory[stepIndex].userAnswer = userAnswer;
        this.stepHistory[stepIndex].inputMode = this.inputMode;
        
        // Move to next step
        this.currentStep = Math.min(this.currentStep + 1, this.solution.adimlar.length);
        
        if (this.currentStep >= this.solution.adimlar.length) {
            // All steps completed
            await this.showCompletion();
        } else {
            // Re-render with next step active
            await this.setupSolvingWorkspace();
            this.showNotification('Adım tamamlandı! Bir sonraki adıma geçin.', 'success');
        }
    }

    /**
     * Go back to previous step
     */
    goBackStep(stepIndex) {
        if (stepIndex > 0) {
            this.currentStep = stepIndex - 1;
            this.setupSolvingWorkspace();
        }
    }

    /**
     * Canvas tool methods
     */
    setCanvasTool(tool, stepIndex) {
        // Implement canvas tool switching
        console.log(`Setting canvas tool: ${tool} for step ${stepIndex}`);
    }

    clearCanvas(stepIndex) {
        const canvas = document.getElementById(`step-canvas-${stepIndex}`);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    /**
     * Attach event listeners for the smart guide
     */
    attachEventListeners() {
        const submitBtn = document.getElementById('submit-step-answer');
        const hintBtn = document.getElementById('get-hint-btn');
        const skipBtn = document.getElementById('skip-step-btn');
        const answerInput = document.getElementById('step-answer-input');

        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.handleStepSubmission());
        }

        if (hintBtn) {
            hintBtn.addEventListener('click', () => this.showHint());
        }

        if (skipBtn) {
            skipBtn.addEventListener('click', () => this.skipStep());
        }

        if (answerInput) {
            answerInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleStepSubmission();
                }
            });
        }
    }

    /**
     * Show current step
     */
    async showCurrentStep() {
        if (!this.solution || !this.solution.adimlar) return;

        const steps = this.solution.adimlar;
        if (this.currentStep >= steps.length) {
            await this.showCompletion();
            return;
        }

        const step = steps[this.currentStep];
        const container = document.getElementById('current-step-container');
        
        if (!container) return;

        // Create step content
        let stepHTML = `
            <div class="step-header mb-4">
                <h3 class="text-lg font-semibold text-gray-800">
                    Adım ${this.currentStep + 1}/${steps.length}
                </h3>
            </div>
            <div class="step-content">
        `;

        if (step.aciklama) {
            stepHTML += `
                <div class="step-explanation mb-3">
                    <h4 class="font-medium text-gray-700 mb-2">Açıklama:</h4>
                    <div class="smart-content" data-content="${this.escapeHtml(step.aciklama)}"></div>
                </div>
            `;
        }

        if (step.islem) {
            stepHTML += `
                <div class="step-operation mb-3">
                    <h4 class="font-medium text-gray-700 mb-2">Bu adımda yapılması gereken:</h4>
                    <div class="smart-content bg-blue-50 p-3 rounded" data-content="${this.escapeHtml(step.islem)}"></div>
                </div>
            `;
        }

        stepHTML += `
            </div>
            <div class="step-question mt-4 p-3 bg-green-50 rounded border border-green-200">
                <h4 class="font-medium text-green-800 mb-2">Soru:</h4>
                <p class="text-green-700">Bu adımın sonucunu hesaplayın ve aşağıya yazın.</p>
            </div>
        `;

        container.innerHTML = stepHTML;

        // Render math content
        await mathRenderer.renderContent(container);

        // Update progress
        this.updateProgressIndicator();
    }

    /**
     * Handle step submission
     */
    async handleStepSubmission() {
        const answerInput = document.getElementById('step-answer-input');
        if (!answerInput) return;

        const userAnswer = answerInput.value.trim();
        if (!userAnswer) {
            this.showNotification('Lütfen bir cevap girin.', 'warning');
            return;
        }

        // Validate answer
        const isCorrect = await this.validateAnswer(userAnswer);
        
        if (isCorrect) {
            this.handleCorrectAnswer(userAnswer);
        } else {
            this.handleIncorrectAnswer(userAnswer);
        }
    }

    /**
     * Validate user answer
     */
    async validateAnswer(userAnswer) {
        if (!this.solution || !this.solution.adimlar) return false;

        const currentStepData = this.solution.adimlar[this.currentStep];
        if (!currentStepData || !currentStepData.sonuc) return false;

        // Simple validation - normalize both answers
        const expectedAnswer = this.normalizeAnswer(currentStepData.sonuc);
        const userAnswerNormalized = this.normalizeAnswer(userAnswer);

        return expectedAnswer === userAnswerNormalized;
    }

    /**
     * Normalize answer for comparison
     */
    normalizeAnswer(answer) {
        if (typeof answer !== 'string') return String(answer);
        
        return answer
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/[.,]/g, '.')
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .trim();
    }

    /**
     * Handle correct answer
     */
    handleCorrectAnswer(userAnswer) {
        this.stepHistory.push({
            step: this.currentStep,
            userAnswer: userAnswer,
            correct: true,
            attempts: this.attemptCount + 1
        });

        this.showNotification('Doğru! Bir sonraki adıma geçiyorsunuz.', 'success');
        
        // Clear input
        const answerInput = document.getElementById('step-answer-input');
        if (answerInput) answerInput.value = '';

        // Move to next step
        setTimeout(() => {
            this.currentStep++;
            this.attemptCount = 0;
            this.showCurrentStep();
        }, 1500);
    }

    /**
     * Handle incorrect answer
     */
    handleIncorrectAnswer(userAnswer) {
        this.attemptCount++;
        
        this.stepHistory.push({
            step: this.currentStep,
            userAnswer: userAnswer,
            correct: false,
            attempts: this.attemptCount
        });

        if (this.attemptCount >= this.maxAttempts) {
            this.showNotification(
                `Üzgünüm, ${this.maxAttempts} deneme hakkınız da bitti. Doğru cevap gösteriliyor.`, 
                'error'
            );
            this.showCorrectAnswer();
        } else {
            const remaining = this.maxAttempts - this.attemptCount;
            this.showNotification(
                `Yanlış cevap. ${remaining} deneme hakkınız kaldı. Tekrar deneyin.`, 
                'warning'
            );
        }
    }

    /**
     * Show hint for current step
     */
    showHint() {
        const currentStepData = this.solution.adimlar[this.currentStep];
        if (!currentStepData) return;

        let hint = 'Bu adım için ipucu: ';
        
        if (currentStepData.aciklama) {
            hint += currentStepData.aciklama.substring(0, 50) + '...';
        } else if (currentStepData.islem) {
            hint += 'İşlem: ' + currentStepData.islem.substring(0, 30) + '...';
        } else {
            hint += 'Önceki adımların sonuçlarını kullanın.';
        }

        this.showNotification(hint, 'info');
    }

    /**
     * Skip current step
     */
    skipStep() {
        this.stepHistory.push({
            step: this.currentStep,
            userAnswer: null,
            correct: false,
            skipped: true
        });

        this.showCorrectAnswer();
    }

    /**
     * Show correct answer and move to next step
     */
    showCorrectAnswer() {
        const currentStepData = this.solution.adimlar[this.currentStep];
        if (!currentStepData) return;

        this.showNotification(
            `Doğru cevap: ${currentStepData.sonuc}`, 
            'info',
            3000
        );

        setTimeout(() => {
            this.currentStep++;
            this.attemptCount = 0;
            this.showCurrentStep();
        }, 3000);
    }

    /**
     * Show completion message
     */
    async showCompletion() {
        const container = document.getElementById('current-step-container');
        if (!container) return;

        const correctAnswers = this.stepHistory.filter(h => h.correct).length;
        const totalSteps = this.solution.adimlar.length;
        const score = Math.round((correctAnswers / totalSteps) * 100);

        container.innerHTML = `
            <div class="completion-message text-center py-8">
                <div class="text-6xl mb-4">🎉</div>
                <h3 class="text-2xl font-bold text-green-600 mb-4">Tebrikler!</h3>
                <p class="text-lg text-gray-700 mb-4">Problemi tamamladınız!</p>
                <div class="score-summary bg-green-50 p-4 rounded-lg border border-green-200 mb-4">
                    <p class="text-green-800">
                        <strong>Skorunuz: ${score}%</strong><br>
                        ${correctAnswers}/${totalSteps} adımı doğru çözdünüz
                    </p>
                </div>
                <div class="flex justify-center space-x-4">
                    <button id="review-solution-btn" class="btn btn-primary">Çözümü İncele</button>
                    <button id="new-problem-btn" class="btn btn-secondary">Yeni Problem</button>
                </div>
            </div>
        `;

        // Attach completion event listeners
        const reviewBtn = document.getElementById('review-solution-btn');
        const newProblemBtn = document.getElementById('new-problem-btn');

        if (reviewBtn) {
            reviewBtn.addEventListener('click', () => {
                stateManager.setView('result');
            });
        }

        if (newProblemBtn) {
            newProblemBtn.addEventListener('click', () => {
                stateManager.setView('upload');
            });
        }

        this.guidanceActive = false;
    }

    /**
     * Update progress indicator
     */
    updateProgressIndicator(container = null) {
        const progressContainer = container || document.getElementById('progress-indicator');
        if (!progressContainer || !this.solution) return;

        const totalSteps = this.solution.adimlar.length;
        const progress = Math.round((this.currentStep / totalSteps) * 100);

        progressContainer.innerHTML = `
            <div class="progress-bar bg-gray-200 rounded-full h-2 mb-2">
                <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                     style="width: ${progress}%"></div>
            </div>
            <div class="text-sm text-gray-600 text-center">
                Adım ${this.currentStep}/${totalSteps} (${progress}%)
            </div>
        `;
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info', duration = 2000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 max-w-sm p-3 rounded-lg shadow-lg z-50 transition-all duration-300 ${
            type === 'error' ? 'bg-red-100 border border-red-400 text-red-700' :
            type === 'success' ? 'bg-green-100 border border-green-400 text-green-700' :
            type === 'warning' ? 'bg-yellow-100 border border-yellow-400 text-yellow-700' :
            'bg-blue-100 border border-blue-400 text-blue-700'
        }`;
        
        notification.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="text-sm">${message}</span>
                <button class="ml-2 text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.remove()">
                    <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, duration);
        }
    }

    /**
     * Escape HTML characters
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Reset all attempts (called when limit reached)
     */
    resetAllAttempts() {
        this.currentStep = 0;
        this.attemptCount = 0;
        this.stepHistory = [];
        this.guidanceActive = false;
        
        console.log('Smart guide attempts reset');
    }

    /**
     * Get current progress
     */
    getProgress() {
        if (!this.solution || !this.solution.adimlar) return 0;
        
        return {
            currentStep: this.currentStep,
            totalSteps: this.solution.adimlar.length,
            percentage: Math.round((this.currentStep / this.solution.adimlar.length) * 100),
            correctAnswers: this.stepHistory.filter(h => h.correct).length,
            attempts: this.attemptCount,
            maxAttempts: this.maxAttempts
        };
    }

    /**
     * Check if guidance is active
     */
    isActive() {
        return this.guidanceActive;
    }

    /**
     * Pause guidance
     */
    pause() {
        this.guidanceActive = false;
        console.log('Smart guidance paused');
    }

    /**
     * Resume guidance
     */
    resume() {
        this.guidanceActive = true;
        console.log('Smart guidance resumed');
    }

    /**
     * Destroy and cleanup
     */
    destroy() {
        this.initialized = false;
        this.guidanceActive = false;
        this.solution = null;
        this.stepHistory = [];
        this.currentStep = 0;
        this.attemptCount = 0;
        
        // Remove event listeners
        const container = document.getElementById('step-by-step-container');
        if (container) {
            container.innerHTML = '';
        }
        
        console.log('Smart guide service destroyed');
    }
}

// Create and export singleton instance
export const smartGuideService = new SmartGuideService();