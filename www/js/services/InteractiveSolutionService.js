// www/js/services/InteractiveSolutionService.js
import { stateManager } from '../modules/stateManager.js';
import { mathRenderer } from './MathRenderer.js';
import { APP_CONFIG, API_PROMPTS } from '../core/Config.js';

export class InteractiveSolutionService {
    constructor() {
        this.initialized = false;
        this.currentStep = 0;
        this.solution = null;
        this.totalAttempts = 0;
        this.maxAttempts = 3;
        this.isActive = false;
        this.stepOptions = [];
        this.userProgress = [];
        this.startTime = null;
        this.container = null;
    }

    /**
     * Initialize interactive solution with problem data
     * @param {Object} solutionData - Complete solution from API
     */
    async initializeInteractiveSolution(solutionData) {
        if (!solutionData || !solutionData.adimlar || !solutionData.adimlar.length) {
            throw new Error('Geçerli çözüm adımları bulunamadı');
        }

        try {
            this.solution = solutionData;
            this.currentStep = 0;
            this.totalAttempts = 0;
            this.userProgress = [];
            this.startTime = Date.now();
            this.isActive = true;

            // Calculate max attempts based on solution length
            this.maxAttempts = Math.max(3, this.solution.adimlar.length);

            console.log('Interactive solution initialized:', {
                totalSteps: this.solution.adimlar.length,
                maxAttempts: this.maxAttempts
            });

            // Setup the interactive workspace
            await this.setupInteractiveWorkspace();
            
            // Generate and show first step
            await this.showStep(0);
            
            this.initialized = true;
            return true;

        } catch (error) {
            console.error('Interactive solution initialization error:', error);
            throw error;
        }
    }

    /**
     * Setup the interactive solution workspace UI
     */
    async setupInteractiveWorkspace() {
        this.container = document.getElementById('solution-output') || 
                    document.getElementById('result-container');
        
        if (!this.container) {
            throw new Error('Interactive solution container not found');
        }

        // SORUN: Bu HTML'de 'interactive-step-container' id'si eksik!
        let html = `
            <div class="interactive-solution-workspace" id="interactive-solution-display">
                <!-- Header Section -->
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="text-2xl font-bold text-gray-800">İnteraktif Çözüm</h3>
                        <p class="text-gray-600">Her adımda doğru seçeneği seçerek problemi çözün</p>
                    </div>
                    <button id="back-to-summary-btn" class="btn btn-secondary">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                        </svg>
                        Özete Dön
                    </button>
                </div>

                <!-- Progress Section -->
                <div class="progress-section mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <!-- Current Step -->
                        <div class="text-center">
                            <div class="text-2xl font-bold text-blue-600" id="current-step-display">1</div>
                            <div class="text-sm text-gray-600">/ <span id="total-steps-display">3</span> Adım</div>
                        </div>
                        
                        <!-- Attempts Used -->
                        <div class="text-center">
                            <div class="text-2xl font-bold text-orange-600" id="attempts-display">0</div>
                            <div class="text-sm text-gray-600">/ <span id="max-attempts-display">3</span> Deneme</div>
                        </div>
                        
                        <!-- Success Rate -->
                        <div class="text-center">
                            <div class="text-2xl font-bold text-green-600" id="success-rate-display">0%</div>
                            <div class="text-sm text-gray-600">Başarı Oranı</div>
                        </div>
                    </div>
                    
                    <!-- Progress Bar -->
                    <div class="mt-4">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-sm text-gray-600">İlerleme</span>
                            <span class="text-sm font-medium text-blue-600" id="progress-percentage">0%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-3">
                            <div class="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500" 
                                id="progress-fill" style="width: 0%"></div>
                        </div>
                    </div>
                </div>

                <!-- STEP DISPLAY CONTAINER - Bu eksikti! -->
                <div id="interactive-step-container" class="step-container mb-6">
                    
                    <!-- Step Card -->
                    <div class="step-card bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                        
                        <!-- Step Header -->
                        <div class="step-header mb-6">
                            <div class="flex items-center justify-between mb-4">
                                <h4 class="text-xl font-bold text-gray-800" id="step-title">
                                    Adım 1/3: Düzgün Altıgenin Alanını Hesaplama
                                </h4>
                                <div class="step-indicator bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                    İlk Adım
                                </div>
                            </div>
                            
                            <!-- Step Description -->
                            <div class="step-description p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400 mb-4">
                                <h5 class="font-medium text-blue-800 mb-2">Bu Adımda:</h5>
                                <div class="text-blue-700" id="step-description">
                                    Düzgün altıgenin alanını hesaplamak için önce kenar uzunluğunu bulmalıyız.
                                </div>
                            </div>
                        </div>

                        <!-- Step Mathematics -->
                        <div class="step-content mb-6" id="step-math-content">
                            <div class="math-content p-3 bg-gray-50 rounded-lg border">
                                <div class="text-center" id="step-formula">
                                    $$A = \frac{3\sqrt{3}}{2} \cdot a^2$$
                                </div>
                            </div>
                        </div>

                        <!-- Question Section -->
                        <div class="step-question mb-6">
                            <h5 class="font-semibold text-gray-800 mb-4 text-lg">
                                Bu adımda hangi yaklaşımı kullanmalısınız?
                            </h5>
                            <p class="text-gray-600 mb-4" id="step-question-detail">
                                Düzgün altıgenin alanını hesaplamak için doğru formülü seçin:
                            </p>
                        </div>

                        <!-- OPTIONS CONTAINER - 2 Yanlış + 1 Doğru -->
                        <div class="options-container space-y-4" id="step-options">
                            
                            <!-- Option A - Doğru Seçenek -->
                            <button class="option-btn w-full p-5 text-left bg-white border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 group"
                                    data-option-id="0"
                                    data-is-correct="true"
                                    data-step="0">
                                <div class="flex items-start space-x-4">
                                    <div class="option-letter bg-gray-200 text-gray-700 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                        A
                                    </div>
                                    <div class="flex-1">
                                        <div class="option-text font-semibold text-gray-800 mb-2 text-lg">
                                            Düzgün altıgen alan formülünü doğru uygula
                                        </div>
                                        <div class="option-explanation text-gray-600 mb-3">
                                            Kenar uzunluğunu bulup düzgün altıgen alan formülü A = (3√3/2) × a² kullan
                                        </div>
                                        <div class="option-formula p-3 bg-blue-50 rounded-lg border border-blue-200">
                                            <div class="text-center math-display">
                                                $$A = \frac{3\sqrt{3}}{2} \times a^2$$
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </button>

                            <!-- Option B - Yanlış Seçenek 1 -->
                            <button class="option-btn w-full p-5 text-left bg-white border-2 border-gray-200 rounded-xl hover:border-red-300 hover:bg-red-50 transition-all duration-200 group"
                                    data-option-id="1"
                                    data-is-correct="false"
                                    data-step="0">
                                <div class="flex items-start space-x-4">
                                    <div class="option-letter bg-gray-200 text-gray-700 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg group-hover:bg-red-500 group-hover:text-white transition-colors">
                                        B
                                    </div>
                                    <div class="flex-1">
                                        <div class="option-text font-semibold text-gray-800 mb-2 text-lg">
                                            Dörtgen alan formülünü kullan
                                        </div>
                                        <div class="option-explanation text-gray-600 mb-3">
                                            Altıgeni dörtgen gibi düşünüp A = a × b formülünü uygula
                                        </div>
                                        <div class="option-formula p-3 bg-red-50 rounded-lg border border-red-200">
                                            <div class="text-center math-display">
                                                $$A = a \times b$$
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </button>

                            <!-- Option C - Yanlış Seçenek 2 -->
                            <button class="option-btn w-full p-5 text-left bg-white border-2 border-gray-200 rounded-xl hover:border-red-300 hover:bg-red-50 transition-all duration-200 group"
                                    data-option-id="2"
                                    data-is-correct="false"
                                    data-step="0">
                                <div class="flex items-start space-x-4">
                                    <div class="option-letter bg-gray-200 text-gray-700 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg group-hover:bg-red-500 group-hover:text-white transition-colors">
                                        C
                                    </div>
                                    <div class="flex-1">
                                        <div class="option-text font-semibold text-gray-800 mb-2 text-lg">
                                            Daire alan formülünü kullan
                                        </div>
                                        <div class="option-explanation text-gray-600 mb-3">
                                            Altıgeni daire gibi düşünüp A = πr² formülünü uygula
                                        </div>
                                        <div class="option-formula p-3 bg-red-50 rounded-lg border border-red-200">
                                            <div class="text-center math-display">
                                                $$A = \pi r^2$$
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </button>

                        </div>
                    </div>

                </div>

                <!-- Action Buttons -->
                <div class="action-buttons flex flex-wrap gap-4 justify-center mt-6">
                    <button id="interactive-hint-btn" class="btn btn-outline">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                        </svg>
                        İpucu Al
                    </button>
                    
                    <button id="interactive-reset-btn" class="btn btn-secondary">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>
                        Yeniden Başla
                    </button>
                </div>

                <!-- Feedback Section -->
                <div id="feedback-container" class="feedback-section mt-6 hidden">
                    <div class="feedback-card p-4 rounded-lg border">
                        <div class="feedback-content">
                            <h6 class="font-bold mb-2" id="feedback-title">Geri Bildirim</h6>
                            <p id="feedback-message">Seçiminize göre geri bildirim burada görünecek.</p>
                        </div>
                    </div>
                </div>

            </div>

        `;

        this.container.innerHTML = html;
        this.container.classList.remove('hidden');

        // Attach event listeners
        this.attachEventListeners();
    }

    /**
     * Show a specific step with options
     * @param {number} stepIndex - Index of the step to show
     */
    async showStep(stepIndex) {
        if (!this.solution || !this.solution.adimlar[stepIndex]) {
            throw new Error(`Adım ${stepIndex + 1} bulunamadı`);
        }

        this.currentStep = stepIndex;
        const step = this.solution.adimlar[stepIndex];
        
        // DÜZELTME: Container'ı kontrol et ve yazdır
        const stepContainer = document.getElementById('interactive-step-container');
        
        if (!stepContainer) {
            console.error('interactive-step-container element not found!');
            console.log('Available containers:', document.querySelectorAll('[id*="container"]'));
            
            // Manuel container oluştur
            const fallbackContainer = document.getElementById('solution-output');
            if (fallbackContainer) {
                const newStepContainer = document.createElement('div');
                newStepContainer.id = 'interactive-step-container';
                newStepContainer.className = 'step-container mb-6';
                fallbackContainer.appendChild(newStepContainer);
                console.log('Fallback step container created');
            }
            return;
        }

        console.log('Step container found, showing step:', stepIndex);

        // Generate options for this step
        const options = await this.generateStepOptions(stepIndex);
        
        // Create step HTML - DÜZELTME: Daha basit HTML yapısı
        let stepHTML = `
            <div class="step-card bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <!-- Step Header -->
                <div class="step-header mb-6">
                    <div class="flex items-center justify-between mb-4">
                        <h4 class="text-xl font-bold text-gray-800">
                            Adım ${stepIndex + 1}/${this.solution.adimlar.length}
                        </h4>
                        <div class="step-indicator bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                            ${stepIndex === 0 ? 'İlk Adım' : `${stepIndex + 1}. Adım`}
                        </div>
                    </div>
                    
                    ${step.adimAciklamasi ? `
                        <div class="step-description p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400 mb-4">
                            <h5 class="font-medium text-blue-800 mb-2">Bu Adımda:</h5>
                            <div class="text-blue-700">${step.adimAciklamasi}</div>
                        </div>
                    ` : ''}
                </div>

                <!-- Step Content -->
                <div class="step-content mb-6">
                    ${step.cozum_lateks ? `
                        <div class="math-content mb-4 p-3 bg-gray-50 rounded-lg">
                            ${step.cozum_lateks}
                        </div>
                    ` : ''}
                </div>

                <!-- Options -->
                <div class="step-options">
                    <h5 class="font-semibold text-gray-800 mb-4">Bu adımda ne yapmalısınız?</h5>
                    <div class="options-grid space-y-3">
                        ${options.map((option, index) => `
                            <button class="option-btn w-full p-4 text-left bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 transition-colors" 
                                    data-step="${stepIndex}" 
                                    data-option-id="${option.id}" 
                                    data-is-correct="${option.isCorrect}">
                                <div class="flex items-start">
                                    <div class="option-letter bg-gray-100 text-gray-700 rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium mr-3">
                                        ${String.fromCharCode(65 + index)}
                                    </div>
                                    <div class="option-content flex-1">
                                        <div class="font-medium text-gray-800">${option.text}</div>
                                        ${option.explanation ? `<div class="text-sm text-gray-600 mt-1">${option.explanation}</div>` : ''}
                                    </div>
                                </div>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        // DÜZELTME: HTML'i container'a ekle ve event listener'ları bağla
        stepContainer.innerHTML = stepHTML;
        
        // Event listeners ekle
        this.attachOptionListeners();
        
        // Progress göstergelerini güncelle
        this.updateProgressIndicators();

        // LaTeX render et
        setTimeout(async () => {
            try {
                await mathRenderer.renderContent(stepContainer);
            } catch (error) {
                console.warn('Math rendering failed:', error);
            }
        }, 100);

        console.log('Step displayed successfully:', stepIndex);
    }

    /**
     * Generate options for a specific step
     * @param {number} stepIndex - Index of the step
     * @returns {Array} Array of option objects
     */
    async generateStepOptions(stepIndex) {
        const step = this.solution.adimlar[stepIndex];
        const isFirstStep = stepIndex === 0;
        
        // Create the correct option based on the actual step
        const correctOption = {
            id: 0,
            text: step.adimAciklamasi || `Adım ${stepIndex + 1}'i doğru şekilde uygula`,
            explanation: step.ipucu || "Bu doğru yaklaşımdır.",
            formula: step.cozum_lateks || null,
            isCorrect: true
        };

        // Generate incorrect options
        const incorrectOptions = this.generateIncorrectOptions(stepIndex, step);

        // Combine and shuffle options
        const allOptions = [correctOption, ...incorrectOptions];
        return this.shuffleArray(allOptions).map((option, index) => ({
            ...option,
            id: index
        }));
    }

    /**
     * Generate incorrect options for a step
     * @param {number} stepIndex - Index of the step
     * @param {Object} step - Step data
     * @returns {Array} Array of incorrect options
     */
    generateIncorrectOptions(stepIndex, step) {
        const incorrectOptions = [];
        
        // Common wrong approaches for mathematical problems
        const wrongApproaches = [
            {
                text: "İşlem sırasını yanlış uygula",
                explanation: "Matematik kurallarına aykırı bir sıralama kullan",
                isCorrect: false
            },
            {
                text: "Yanlış matematik kuralı uygula", 
                explanation: "Bu duruma uygun olmayan bir formül kullan",
                isCorrect: false
            },
            {
                text: "İşaret hatası yap",
                explanation: "Pozitif/negatif işaretleri karıştır",
                isCorrect: false
            },
            {
                text: "Birimleri göz ardı et",
                explanation: "Hesaplamada ölçü birimlerini dikkate alma",
                isCorrect: false
            },
            {
                text: "Yanlış değer kullan",
                explanation: "Önceki adımdan yanlış sonuç al",
                isCorrect: false
            }
        ];

        // Select 2 random wrong approaches
        const shuffled = this.shuffleArray(wrongApproaches);
        return shuffled.slice(0, 2);
    }

    /**
     * Handle option selection
     * @param {HTMLElement} optionElement - Selected option element
     */
    async handleOptionSelection(optionElement) {
        const isCorrect = optionElement.dataset.isCorrect === 'true';
        const stepIndex = parseInt(optionElement.dataset.step);
        const optionId = parseInt(optionElement.dataset.optionId);

        // Disable all options
        const allOptions = document.querySelectorAll('.option-label');
        allOptions.forEach(option => {
            option.disabled = true;
            option.style.pointerEvents = 'none';
        });

        // Visual feedback
        if (isCorrect) {
            optionElement.classList.add('border-green-500', 'bg-green-100');
            optionElement.querySelector('.option-letter').classList.add('bg-green-500', 'text-white');
            
            // Record successful step
            this.userProgress.push({
                step: stepIndex,
                selectedOption: optionId,
                correct: true,
                timestamp: Date.now()
            });

            await this.handleCorrectSelection(stepIndex);
            
        } else {
            optionElement.classList.add('border-red-500', 'bg-red-100');
            optionElement.querySelector('.option-letter').classList.add('bg-red-500', 'text-white');
            
            // Highlight correct answer
            const correctOption = document.querySelector('[data-is-correct="true"]');
            if (correctOption) {
                correctOption.classList.add('border-yellow-500', 'bg-yellow-100');
                correctOption.querySelector('.option-letter').classList.add('bg-yellow-500', 'text-white');
            }

            // Record failed attempt
            this.userProgress.push({
                step: stepIndex,
                selectedOption: optionId,
                correct: false,
                timestamp: Date.now()
            });

            this.totalAttempts++;
            await this.handleIncorrectSelection(stepIndex);
        }

        this.updateProgressIndicators();
    }

    /**
     * Handle correct option selection
     * @param {number} stepIndex - Current step index
     */
    async handleCorrectSelection(stepIndex) {
        this.showFeedback(
            'Doğru!', 
            `Tebrikler! Adım ${stepIndex + 1}'i başarıyla tamamladınız.`, 
            'success'
        );

        // Wait for user to see feedback
        await this.delay(2000);

        // Check if this was the last step
        if (stepIndex >= this.solution.adimlar.length - 1) {
            await this.showCompletion();
        } else {
            // Move to next step
            await this.showStep(stepIndex + 1);
        }
    }

    /**
     * Handle incorrect option selection
     * @param {number} stepIndex - Current step index
     */
    async handleIncorrectSelection(stepIndex) {
        const remainingAttempts = this.maxAttempts - this.totalAttempts;
        
        if (remainingAttempts <= 0) {
            // No more attempts - show failure
            this.showFeedback(
                'Deneme Hakkınız Bitti!', 
                `${this.maxAttempts} deneme hakkınızı kullandınız. Ana sayfaya yönlendiriliyorsunuz.`, 
                'error'
            );

            await this.delay(3000);
            await this.resetToUpload();
            
        } else if (stepIndex === 0) {
            // First step error - restart from beginning
            this.showFeedback(
                'Yanlış!', 
                `İlk adımda hata yaptınız. ${remainingAttempts} deneme hakkınız kaldı. Yeniden başlıyorsunuz.`, 
                'warning'
            );

            await this.delay(2500);
            await this.showStep(0);
            
        } else {
            // Other step error - go back to first step
            this.showFeedback(
                'Yanlış!', 
                `Hata yaptınız. ${remainingAttempts} deneme hakkınız kaldı. İlk adıma dönüyorsunuz.`, 
                'warning'
            );

            await this.delay(2500);
            await this.showStep(0);
        }
    }

    /**
     * Show completion screen
     */
    async showCompletion() {
        const completionTime = Date.now() - this.startTime;
        const minutes = Math.floor(completionTime / 60000);
        const seconds = Math.floor((completionTime % 60000) / 1000);
        
        const correctSteps = this.userProgress.filter(p => p.correct).length;
        const totalSteps = this.solution.adimlar.length;
        const successRate = Math.round((correctSteps / totalSteps) * 100);

        const stepContainer = document.getElementById('interactive-step-container');
        if (!stepContainer) return;

        let completionHTML = `
            <div class="interactive-completion bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-8 text-center border border-green-200">
                <div class="completion-icon text-6xl mb-4">🎉</div>
                
                <h3 class="text-3xl font-bold text-green-600 mb-2">Tebrikler!</h3>
                <p class="text-xl text-green-700 mb-6">İnteraktif çözümü başarıyla tamamladınız!</p>
                
                <!-- Performance Stats -->
                <div class="performance-stats grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div class="stat-card bg-white p-4 rounded-lg shadow-sm">
                        <div class="stat-number text-2xl font-bold text-blue-600">${totalSteps}</div>
                        <div class="stat-label text-sm text-gray-600">Toplam Adım</div>
                    </div>
                    <div class="stat-card bg-white p-4 rounded-lg shadow-sm">
                        <div class="stat-number text-2xl font-bold text-green-600">${correctSteps}</div>
                        <div class="stat-label text-sm text-gray-600">Doğru Adım</div>
                    </div>
                    <div class="stat-card bg-white p-4 rounded-lg shadow-sm">
                        <div class="stat-number text-2xl font-bold text-orange-600">${this.totalAttempts}</div>
                        <div class="stat-label text-sm text-gray-600">Toplam Deneme</div>
                    </div>
                    <div class="stat-card bg-white p-4 rounded-lg shadow-sm">
                        <div class="stat-number text-2xl font-bold text-purple-600">${minutes}:${seconds.toString().padStart(2, '0')}</div>
                        <div class="stat-label text-sm text-gray-600">Süre</div>
                    </div>
                </div>

                <!-- Performance Evaluation -->
                <div class="performance-evaluation mb-6">
                    ${this.getPerformanceMessage(successRate, this.totalAttempts)}
                </div>

                <!-- Action Buttons -->
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <button onclick="window.stateManager.setView('result')" 
                            class="btn btn-primary px-6 py-3">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        Tam Çözümü Göster
                    </button>
                    <button onclick="window.stateManager.setView('upload')" 
                            class="btn btn-secondary px-6 py-3">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        Yeni Problem Çöz
                    </button>
                </div>
            </div>
        `;

        stepContainer.innerHTML = completionHTML;
        this.isActive = false;
    }

    /**
     * Get performance message based on success rate and attempts
     * @param {number} successRate - Success percentage
     * @param {number} attempts - Total attempts made
     * @returns {string} Performance message HTML
     */
    getPerformanceMessage(successRate, attempts) {
        if (successRate === 100 && attempts <= 3) {
            return `
                <div class="excellence-message p-4 rounded-lg">
                    <h4 class="font-bold text-green-800 mb-2">🌟 Mükemmel Performans!</h4>
                    <p class="text-green-700">Tüm adımları ilk denemede doğru çözdünüz. Harika iş!</p>
                </div>
            `;
        } else if (successRate >= 80) {
            return `
                <div class="good-performance-message p-4 bg-blue-50 rounded-lg">
                    <h4 class="font-bold text-blue-800 mb-2">👏 Çok İyi!</h4>
                    <p class="text-blue-700">Başarı oranınız %${successRate}. Matematik beceriniz gelişiyor!</p>
                </div>
            `;
        } else {
            return `
                <div class="improvement-tips p-4 rounded-lg">
                    <h4 class="font-bold text-orange-800 mb-2">💪 Gelişim Alanları</h4>
                    <p class="text-orange-700 mb-2">Başarı oranınız %${successRate}. Biraz daha pratik yaparak gelişebilirsiniz!</p>
                    <div class="tips text-sm text-orange-600">
                        <p>• Adımları dikkatli okuyun</p>
                        <p>• İpucularını kullanmaktan çekinmeyin</p>
                        <p>• Benzer problemler çözerek pratik yapın</p>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Show feedback message to user
     * @param {string} title - Feedback title
     * @param {string} message - Feedback message
     * @param {string} type - Feedback type (success, error, warning, info)
     */
    showFeedback(title, message, type = 'info') {
        const feedbackArea = document.getElementById('feedback-area');
        if (!feedbackArea) return;

        const typeClasses = {
            success: 'bg-green-100 border-green-400 text-green-700',
            error: 'bg-red-100 border-red-400 text-red-700',
            warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
            info: 'bg-blue-100 border-blue-400 text-blue-700'
        };

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        feedbackArea.className = `feedback-message p-4 rounded-lg border-l-4 mb-4 ${typeClasses[type]}`;
        feedbackArea.innerHTML = `
            <div class="flex items-start">
                <div class="text-2xl mr-3">${icons[type]}</div>
                <div>
                    <h4 class="font-bold text-lg">${title}</h4>
                    <p>${message}</p>
                </div>
                <button class="feedback-close ml-auto text-gray-400 hover:text-gray-600 text-xl font-bold" onclick="this.parentElement.parentElement.classList.add('hidden')">
                    ×
                </button>
            </div>
        `;
        
        feedbackArea.classList.remove('hidden');

        // Auto-hide after 5 seconds for non-error messages
        if (type !== 'error') {
            setTimeout(() => {
                feedbackArea.classList.add('hidden');
            }, 5000);
        }
    }

    /**
     * Update progress indicators
     */
    updateProgressIndicators() {
        // Update step display
        const currentStepDisplay = document.getElementById('current-step-display');
        const totalStepsDisplay = document.getElementById('total-steps-display');
        const attemptsDisplay = document.getElementById('attempts-display');
        const successRateDisplay = document.getElementById('success-rate-display');
        const progressPercentage = document.getElementById('progress-percentage');
        const progressFill = document.getElementById('progress-fill');

        if (currentStepDisplay) currentStepDisplay.textContent = this.currentStep + 1;
        if (totalStepsDisplay) totalStepsDisplay.textContent = this.solution.adimlar.length;
        if (attemptsDisplay) attemptsDisplay.textContent = this.totalAttempts;

        // Calculate success rate
        const correctSteps = this.userProgress.filter(p => p.correct).length;
        const totalCompleted = this.userProgress.length;
        const successRate = totalCompleted > 0 ? Math.round((correctSteps / totalCompleted) * 100) : 0;
        
        if (successRateDisplay) successRateDisplay.textContent = `${successRate}%`;

        // Update progress bar
        const progressPercent = Math.round((this.currentStep / this.solution.adimlar.length) * 100);
        if (progressPercentage) progressPercentage.textContent = `${progressPercent}%`;
        if (progressFill) progressFill.style.width = `${progressPercent}%`;
    }

    /**
     * Reset to upload screen
     */
    async resetToUpload() {
        this.reset();
        stateManager.setView('upload');
        
        // Show final message
        const uiManager = window.app?.getModule('uiManager');
        if (uiManager) {
            uiManager.showError('Deneme hakkınız bitti. Yeni bir soru yükleyebilirsiniz.');
        }
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Back to main menu
        const backBtn = document.getElementById('back-to-main-menu-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                stateManager.setView('summary');
            });
        }

        // Hint button
        const hintBtn = document.getElementById('interactive-hint-btn');
        if (hintBtn) {
            hintBtn.addEventListener('click', () => {
                this.showHint();
            });
        }

        // Reset button
        const resetBtn = document.getElementById('interactive-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetInteractiveSolution();
            });
        }
    }

    /**
     * Attach option listeners
     */
    attachOptionListeners() {
        const optionButtons = document.querySelectorAll('.option-label');
        optionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleOptionSelection(button);
            });
        });
    }

    /**
     * Show hint for current step
     */
    showHint() {
        if (!this.solution || !this.solution.adimlar[this.currentStep]) return;

        const step = this.solution.adimlar[this.currentStep];
        let hintMessage = 'Bu adım için ipucu: ';

        if (step.ipucu) {
            hintMessage += step.ipucu;
        } else if (step.adimAciklamasi) {
            hintMessage += step.adimAciklamasi.substring(0, 100) + '...';
        } else {
            hintMessage += 'Önceki adımların sonuçlarını dikkatlice inceleyin.';
        }

        this.showFeedback('💡 İpucu', hintMessage, 'info');
    }

    /**
     * Reset interactive solution
     */
    resetInteractiveSolution() {
        if (confirm('İnteraktif çözümü sıfırlamak istediğinizden emin misiniz? Tüm ilerlemeniz kaybolacak.')) {
            this.currentStep = 0;
            this.totalAttempts = 0;
            this.userProgress = [];
            this.startTime = Date.now();
            this.showStep(0);
            
            this.showFeedback('🔄 Sıfırlandı', 'İnteraktif çözüm baştan başlatıldı.', 'info');
        }
    }

    /**
     * Utility function to shuffle array
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled array
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Utility function to delay
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Delay promise
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Escape HTML characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get current progress data
     * @returns {Object} Progress data
     */
    getProgress() {
        const correctSteps = this.userProgress.filter(p => p.correct).length;
        const totalSteps = this.solution?.adimlar?.length || 0;
        
        return {
            currentStep: this.currentStep,
            totalSteps: totalSteps,
            correctSteps: correctSteps,
            totalAttempts: this.totalAttempts,
            maxAttempts: this.maxAttempts,
            successRate: totalSteps > 0 ? Math.round((correctSteps / totalSteps) * 100) : 0,
            isActive: this.isActive,
            timeElapsed: this.startTime ? Date.now() - this.startTime : 0
        };
    }

    /**
     * Check if interactive solution is active
     * @returns {boolean} Whether interactive solution is active
     */
    isInteractiveActive() {
        return this.isActive;
    }

    /**
     * Pause interactive solution
     */
    pause() {
        this.isActive = false;
        console.log('Interactive solution paused');
    }

    /**
     * Resume interactive solution
     */
    resume() {
        this.isActive = true;
        console.log('Interactive solution resumed');
    }

    /**
     * Reset all state
     */
    reset() {
        this.initialized = false;
        this.currentStep = 0;
        this.solution = null;
        this.totalAttempts = 0;
        this.maxAttempts = 3;
        this.isActive = false;
        this.stepOptions = [];
        this.userProgress = [];
        this.startTime = null;
        this.container = null;
        
        console.log('Interactive solution service reset');
    }

    /**
     * Destroy and cleanup
     */
    destroy() {
        this.reset();
        
        // Remove event listeners
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        console.log('Interactive solution service destroyed');
    }
}

// Create and export singleton instance
export const interactiveSolutionService = new InteractiveSolutionService();
