/**
 * InteractiveUIManager - Handles interactive solution UI components
 * Extracts from index.js: Interactive HTML generation, event handling, DOM manipulation
 */

import { showError, showSuccess } from './ui.js';
import { mathRendererManager } from './mathRendererManager.js';

export class InteractiveUIManager {
    constructor() {
        this.currentStepData = null;
        this.eventListeners = new Map();
    }

    /**
     * Generate interactive HTML for a step
     */
    generateInteractiveHTML(stepData) {
        if (!stepData || !stepData.options) {
            console.error('❌ generateInteractiveHTML: stepData eksik');
            return '<div class="p-4 text-red-600">Adım verisi eksik</div>';
        }

        this.currentStepData = stepData;
        const progress = (stepData.stepNumber / stepData.totalSteps) * 100;

        return `
            <div class="interactive-solution-workspace p-6 bg-white rounded-lg shadow-md">
                <!-- Header -->
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-800">İnteraktif Çözüm</h3>
                    <button id="back-to-main-menu-btn" class="btn btn-secondary">Ana Menüye Dön</button>
                </div>
                
                <!-- Progress -->
                <div class="progress-section mb-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div class="progress-info">
                            <div class="flex justify-between items-center mb-2">
                                <h4 class="text-lg font-semibold text-gray-800">Adım ${stepData.stepNumber} / ${stepData.totalSteps}</h4>
                                <span class="text-sm text-gray-500">${Math.round(progress)}% tamamlandı</span>
                            </div>
                            <div class="progress-bar bg-gray-200 h-2 rounded-full overflow-hidden">
                                <div class="progress-fill bg-blue-500 h-full transition-all duration-500" 
                                     style="width: ${progress}%"></div>
                            </div>
                        </div>
                        
                        <div class="attempt-info">
                            <div class="flex justify-between items-center mb-2">
                                <h4 class="text-lg font-semibold text-gray-800">Deneme Hakkı</h4>
                                <span class="text-sm ${stepData.remainingAttempts <= 1 ? 'text-red-500' : stepData.remainingAttempts <= 2 ? 'text-orange-500' : 'text-green-500'}">
                                    ${stepData.remainingAttempts} / ${stepData.maxAttempts} kaldı
                                </span>
                            </div>
                            <div class="attempt-dots flex gap-1">
                                ${this.generateAttemptDots(stepData.attempts, stepData.maxAttempts)}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Step Description -->
                <div class="step-description mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 class="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                        <span class="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            ${stepData.stepNumber}
                        </span>
                        Bu Adımda Yapılacak:
                    </h4>
                    <div class="text-blue-700" id="interactive-step-desc">${this.escapeHtml(stepData.stepDescription)}</div>
                </div>
                
                <!-- Warning Container -->
                <div id="interactive-warning-container" class="mb-4"></div>
                
                <!-- Options -->
                <div class="options-section mb-6">
                    <h4 class="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 12l2 2 4-4"/>
                            <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
                        </svg>
                        Doğru çözüm adımını seçin:
                    </h4>
                    <div class="options-grid space-y-3" id="interactive-options-container">
                        ${this.generateInteractiveOptions(stepData.options)}
                    </div>
                </div>
                
                <!-- Action Buttons -->
                <div class="action-buttons flex flex-wrap gap-3 mb-4">
                    <button id="interactive-submit-btn" class="btn btn-primary flex-1" disabled>
                        Seçimi Onayla
                    </button>
                    <button id="interactive-hint-btn" class="btn btn-secondary">
                        💡 İpucu
                    </button>
                </div>
                
                <!-- Result Container -->
                <div id="interactive-result-container" class="result-section hidden mb-4"></div>
                
                <!-- Navigation -->
                <div class="navigation-section flex justify-between mt-6 pt-4 border-t">
                    <div class="text-sm text-gray-500">
                        <p><strong>Kurallar:</strong></p>
                        <ul class="text-xs mt-1 space-y-1">
                            <li>• İlk adımda yanlış: Adımı tekrarlarsınız</li>
                            <li>• Diğer adımlarda yanlış: Baştan başlarsınız</li>
                            <li>• Toplam ${stepData.maxAttempts} deneme hakkınız var</li>
                        </ul>
                    </div>
                    <div class="flex gap-2">
                        <button id="interactive-reset-btn" class="btn btn-tertiary text-sm">
                            🔄 Baştan Başla
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate attempt dots visual indicator
     */
    generateAttemptDots(attempts, maxAttempts) {
        return Array.from({ length: maxAttempts }, (_, i) => `
            <div class="w-3 h-3 rounded-full ${i < attempts ? 'bg-red-400' : 'bg-gray-200'}"></div>
        `).join('');
    }

    /**
     * Generate interactive options HTML
     */
    generateInteractiveOptions(options) {
        if (!Array.isArray(options) || options.length === 0) {
            console.error('❌ generateInteractiveOptions: Geçersiz options');
            return '<div class="text-red-600 p-4">Seçenekler yüklenemedi</div>';
        }

        console.log('🔄 Seçenekler oluşturuluyor:', options);

        return options.map((option, index) => {
            const displayId = option.displayId !== undefined ? option.displayId : index;
            const optionLetter = String.fromCharCode(65 + index); // A, B, C...

            return `
                <label class="option-label flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-all duration-200" 
                       data-option-id="${displayId}">
                    <input type="radio" 
                           name="interactive-step-options" 
                           value="${displayId}" 
                           class="sr-only option-radio">
                    <div class="option-letter w-8 h-8 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center font-bold text-sm mr-3 mt-0.5">
                        ${optionLetter}
                    </div>
                    <div class="option-content flex-1">
                        <div class="text-gray-800 font-medium option-text" id="option-text-${displayId}">
                            ${this.escapeHtml(option.text || 'Seçenek metni eksik')}
                        </div>
                        ${option.latex ? `
                            <div class="text-sm text-gray-600 mt-1 option-latex" id="option-latex-${displayId}">
                                ${this.escapeHtml(option.latex)}
                            </div>
                        ` : ''}
                    </div>
                </label>
            `;
        }).join('');
    }

    /**
     * Generate result HTML based on evaluation result
     */
    generateResultHTML(result) {
        if (result.isCorrect) {
            return `
                <div class="result-message success p-4 rounded-lg bg-green-100 border border-green-300">
                    <div class="flex items-center gap-3">
                        <div class="text-3xl">✅</div>
                        <div class="flex-1">
                            <h4 class="font-semibold text-green-800 mb-1">Doğru!</h4>
                            <p class="text-green-700 text-sm">${this.escapeHtml(result.explanation)}</p>
                            
                            ${result.isCompleted ? `
                                <div class="mt-3 p-3 bg-green-50 rounded border border-green-200">
                                    <h5 class="font-semibold text-green-800 mb-2">🎉 Tebrikler! Tüm adımları tamamladınız!</h5>
                                </div>
                            ` : `
                                <p class="text-green-600 text-sm mt-2">
                                    <strong>Sonraki adıma geçiliyor...</strong> (${result.currentStep}/${result.totalSteps})
                                </p>
                            `}
                        </div>
                    </div>
                </div>
            `;
        } else {
            const isLastAttempt = result.shouldResetToSetup || result.remainingAttempts <= 0;
            const bgClass = isLastAttempt ? 'bg-red-100 border-red-300' : 'bg-orange-100 border-orange-300';
            const textClass = isLastAttempt ? 'text-red-800' : 'text-orange-800';

            return `
                <div class="result-message error p-4 rounded-lg ${bgClass} border">
                    <div class="flex items-center gap-3">
                        <div class="text-3xl">${isLastAttempt ? '❌' : '⚠️'}</div>
                        <div class="flex-1">
                            <h4 class="font-semibold ${textClass} mb-1">
                                ${isLastAttempt ? 'Deneme Hakkınız Bitti!' : 'Yanlış Seçim'}
                            </h4>
                            <p class="${textClass} text-sm mb-2">${this.escapeHtml(result.explanation)}</p>
                            
                            <div class="mt-2">
                                <p class="text-sm ${textClass}">
                                    <strong>Kalan Hak:</strong> ${result.remainingAttempts}
                                </p>
                            </div>
                            
                            ${isLastAttempt ? `
                                <div class="mt-3 p-3 bg-red-50 rounded border border-red-200">
                                    <p class="text-red-700 text-sm font-medium">
                                        Tüm deneme haklarınız bitti. Ana menüye yönlendiriliyorsunuz...
                                    </p>
                                </div>
                            ` : `
                                <div class="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                                    <p class="text-blue-700 text-sm">
                                        ${result.restartCurrentStep ?
                            '🔄 Bu adımı tekrar çözeceksiniz.' :
                            '🔄 Baştan başlayacaksınız.'
                        }
                                    </p>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Generate completion HTML with statistics
     */
    generateCompletionHTML(completionStats) {
        let performanceMessage = '';
        let performanceColor = 'text-green-600';

        switch (completionStats.performance) {
            case 'excellent':
                performanceMessage = '🏆 Mükemmel performans! Çok az hatayla tamamladınız.';
                performanceColor = 'text-green-600';
                break;
            case 'good':
                performanceMessage = '👍 İyi performans! Başarıyla tamamladınız.';
                performanceColor = 'text-blue-600';
                break;
            case 'average':
                performanceMessage = '📚 Ortalama performans. Pratik yaparak gelişebilirsiniz.';
                performanceColor = 'text-yellow-600';
                break;
            case 'needs_improvement':
                performanceMessage = '💪 Daha fazla pratik yaparak gelişebilirsiniz.';
                performanceColor = 'text-orange-600';
                break;
        }

        return `
            <div class="interactive-completion text-center p-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                <div class="completion-icon text-6xl mb-4">🎉</div>
                <h3 class="text-2xl font-bold text-green-800 mb-2">İnteraktif Çözüm Tamamlandı!</h3>
                <p class="text-gray-700 mb-6">Tüm adımları başarıyla çözdünüz!</p>
                
                <!-- PERFORMANS BİLGİLERİ -->
                <div class="performance-stats mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="stat-card p-4 bg-white rounded-lg border border-gray-200">
                        <div class="stat-number text-2xl font-bold text-blue-600">${completionStats.totalSteps}</div>
                        <div class="stat-label text-sm text-gray-600">Toplam Adım</div>
                    </div>
                    <div class="stat-card p-4 bg-white rounded-lg border border-gray-200">
                        <div class="stat-number text-2xl font-bold ${completionStats.totalAttempts <= completionStats.totalSteps + 2 ? 'text-green-600' : 'text-orange-600'}">${completionStats.totalAttempts}</div>
                        <div class="stat-label text-sm text-gray-600">Toplam Deneme</div>
                    </div>
                    <div class="stat-card p-4 bg-white rounded-lg border border-gray-200">
                        <div class="stat-number text-2xl font-bold ${completionStats.successRate >= 80 ? 'text-green-600' : 'text-yellow-600'}">%${Math.round(completionStats.successRate)}</div>
                        <div class="stat-label text-sm text-gray-600">Başarı Oranı</div>
                    </div>
                    <div class="stat-card p-4 bg-white rounded-lg border border-gray-200">
                        <div class="stat-number text-2xl font-bold text-purple-600">${completionStats.totalTimeFormatted}</div>
                        <div class="stat-label text-sm text-gray-600">Toplam Süre</div>
                    </div>
                </div>
                
                <!-- PERFORMANS DEĞERLENDİRMESİ -->
                <div class="performance-evaluation mb-6 p-4 bg-white rounded-lg border border-gray-200">
                    <h4 class="font-semibold text-gray-800 mb-2">Performans Değerlendirmesi</h4>
                    <p class="font-medium ${performanceColor}">${performanceMessage}</p>
                    
                    ${completionStats.performance !== 'excellent' ? `
                        <div class="improvement-tips mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                            <h5 class="font-medium text-blue-800 mb-2">📈 Gelişim Önerileri:</h5>
                            <ul class="text-sm text-blue-700 space-y-1">
                                ${completionStats.successRate < 80 ? '<li>• Seçenekleri daha dikkatli okuyun</li>' : ''}
                                ${completionStats.totalAttempts > completionStats.totalSteps + 3 ? '<li>• İlk denemede doğru cevap vermeye odaklanın</li>' : ''}
                                <li>• Matematik adımlarını mantıklı sırayla düşünün</li>
                                <li>• Pratik yaparak hızınızı artırın</li>
                            </ul>
                        </div>
                    ` : `
                        <div class="excellence-message mt-3 p-3 bg-green-50 rounded border border-green-200">
                            <p class="text-green-700 text-sm">
                                🌟 Mükemmel çalışma! Matematik problemlerini çözmede çok iyisiniz.
                            </p>
                        </div>
                    `}
                </div>
                
                <!-- AKSİYON BUTONLARI -->
                <div class="action-buttons space-y-3">
                    <button id="interactive-new-problem-btn" class="btn btn-primary w-full">
                        🎯 Yeni Problem Çöz
                    </button>
                    <button id="interactive-review-solution-btn" class="btn btn-secondary w-full">
                        📋 Tam Çözümü Gözden Geçir
                    </button>
                    <button id="interactive-try-step-by-step-btn" class="btn btn-tertiary w-full">
                        📝 Adım Adım Çözümü Dene
                    </button>
                    <button id="back-to-main-menu-btn" class="btn btn-quaternary w-full">
                        🏠 Ana Menüye Dön
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Show interactive hint
     */
    showHint(hint) {
        const resultContainer = document.getElementById('interactive-result-container');
        if (!resultContainer) return;

        resultContainer.innerHTML = `
            <div class="hint-message p-4 rounded-lg bg-yellow-100 border border-yellow-300">
                <div class="flex items-center gap-3">
                    <div class="text-2xl">💡</div>
                    <div class="flex-1">
                        <h4 class="font-semibold text-yellow-800 mb-1">İpucu</h4>
                        <p class="text-yellow-700 text-sm">${this.escapeHtml(hint.hint)}</p>
                    </div>
                </div>
            </div>
        `;

        resultContainer.classList.remove('hidden');

        // 5 saniye sonra gizle
        setTimeout(() => {
            resultContainer.classList.add('hidden');
            resultContainer.innerHTML = '';
        }, 5000);
    }

    /**
     * Show error message
     */
    showInteractiveError(message) {
        const solutionOutput = document.getElementById('solution-output');
        if (!solutionOutput) return;

        solutionOutput.innerHTML = `
            <div class="p-4 bg-red-50 text-red-700 rounded-lg">
                <h4 class="font-bold mb-2">İnteraktif Çözüm Hatası</h4>
                <p>${this.escapeHtml(message)}</p>
                <button id="back-to-main-menu-btn" class="btn btn-secondary mt-4">Ana Menüye Dön</button>
            </div>
        `;
    }

    /**
     * Show reset notification
     */
    showResetNotification(message) {
        const notification = document.createElement('div');
        notification.id = 'reset-notification';
        notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
        notification.innerHTML = `
            <div class="flex items-center gap-3">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
                <div>
                    <div class="font-semibold">Deneme Hakları Bitti</div>
                    <div class="text-sm opacity-90">${message || 'Soru yükleme ekranına yönlendiriliyorsunuz...'}</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 5 saniye sonra kaldır
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * Highlight options based on result
     */
    highlightOptions(result) {
        const optionLabels = document.querySelectorAll('.option-label');

        optionLabels.forEach(label => {
            const optionId = parseInt(label.dataset.optionId);

            // Tüm vurguları temizle
            label.classList.remove('border-green-500', 'bg-green-50', 'border-red-500', 'bg-red-50');

            if (optionId === result.selectedOption.displayId) {
                // Seçilen seçenek
                if (result.isCorrect) {
                    label.classList.add('border-green-500', 'bg-green-50');
                } else {
                    label.classList.add('border-red-500', 'bg-red-50');
                }
            } else if (result.correctOption && optionId === result.correctOption.displayId) {
                // Doğru seçenek (yanlış seçim yapıldıysa göster)
                if (!result.isCorrect) {
                    label.classList.add('border-green-500', 'bg-green-50');

                    // Doğru cevap etiketi ekle
                    if (!label.querySelector('.correct-label')) {
                        const correctLabel = document.createElement('div');
                        correctLabel.className = 'correct-label absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold';
                        correctLabel.textContent = 'DOĞRU';
                        label.style.position = 'relative';
                        label.appendChild(correctLabel);
                    }
                }
            }
        });
    }

    /**
     * Disable interactive UI during processing
     */
    disableUI() {
        const submitBtn = document.getElementById('interactive-submit-btn');
        const optionLabels = document.querySelectorAll('.option-label');

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Kontrol ediliyor...
            `;
        }

        optionLabels.forEach(label => {
            label.style.pointerEvents = 'none';
            label.style.opacity = '0.7';
        });
    }

    /**
     * Enable interactive UI
     */
    enableUI() {
        const submitBtn = document.getElementById('interactive-submit-btn');
        const optionLabels = document.querySelectorAll('.option-label');

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Seçimi Onayla';
        }

        optionLabels.forEach(label => {
            label.style.pointerEvents = 'auto';
            label.style.opacity = '1';
        });
    }

    /**
     * Clear all interactive DOM elements
     */
    clearDOM() {
        console.log('🧹 Interaktif DOM temizleniyor...');
        
        // Solution output'u tamamen temizle
        const solutionOutput = document.getElementById('solution-output');
        if (solutionOutput) {
            solutionOutput.innerHTML = '';
            solutionOutput.classList.add('hidden');
        }
        
        // Result container'ı gizle
        const resultContainer = document.getElementById('result-container');
        if (resultContainer) {
            resultContainer.classList.add('hidden');
            resultContainer.style.display = 'none';
        }
        
        // Status message'ı temizle
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
            statusMessage.innerHTML = '';
        }
        
        // Interactive specific containers
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
        
        console.log('✅ Tüm interaktif DOM elementleri temizlendi');
    }

    /**
     * Validate DOM elements exist
     */
    validateDOM() {
        const requiredElements = [
            'interactive-options-container',
            'interactive-submit-btn',
            'interactive-result-container'
        ];

        for (const elementId of requiredElements) {
            const element = document.getElementById(elementId);
            if (!element) {
                console.error(`❌ DOM doğrulaması başarısız: ${elementId} bulunamadı`);
                return false;
            }
        }

        // Seçenek sayısını kontrol et
        const optionsContainer = document.getElementById('interactive-options-container');
        const optionLabels = optionsContainer.querySelectorAll('.option-label');

        if (optionLabels.length === 0) {
            console.error('❌ DOM doğrulaması başarısız: Hiç seçenek bulunamadı');
            return false;
        }

        console.log(`✅ DOM doğrulaması başarılı: ${optionLabels.length} seçenek bulundu`);
        return true;
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
     * Clean up resources
     */
    cleanup() {
        this.currentStepData = null;
        this.eventListeners.clear();
        this.clearDOM();
    }
}

// Export singleton instance
export const interactiveUIManager = new InteractiveUIManager();