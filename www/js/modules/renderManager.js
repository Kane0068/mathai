// =================================================================================
//  MathAi - Render Manager Modülü
//  Tüm görünüm render işlemleri burada yönetilir
// =================================================================================

import { renderMath, renderMathInContainer, renderSmartContent } from './ui.js';

/**
 * Problem özetini render eder
 * @param {Object} problemOzeti - Problem özet verisi
 * @param {HTMLElement} targetElement - Hedef DOM elementi
 */
export async function renderProblemSummary(problemOzeti, targetElement) {
    if (!problemOzeti || !targetElement) return;
    
    const { verilenler, istenen } = problemOzeti;
    
    let summaryHTML = '<div class="problem-summary bg-blue-50 p-4 rounded-lg mb-4">';
    summaryHTML += '<h3 class="font-semibold text-blue-800 mb-2">Problem Özeti:</h3>';
    
    if (verilenler && verilenler.length > 0) {
        summaryHTML += '<div class="mb-2"><strong>Verilenler:</strong><ul class="list-disc list-inside ml-4">';
        verilenler.forEach((veri, index) => {
            summaryHTML += `<li class="smart-content" data-content="${escapeHtml(veri)}" id="verilen-${index}"></li>`;
        });
        summaryHTML += '</ul></div>';
    }
    
    if (istenen) {
        summaryHTML += `<div><strong>İstenen:</strong> <span class="smart-content" data-content="${escapeHtml(istenen)}" id="istenen-content"></span></div>`;
    }
    
    summaryHTML += '</div>';
    targetElement.innerHTML = summaryHTML;
    
    // Advanced Math Renderer ile render et
    setTimeout(async () => {
        await renderSmartContent(targetElement);
    }, 50);
}

/**
 * Tam çözüm görünümünü render eder
 * @param {Object} solution - Çözüm verisi
 * @param {HTMLElement} targetElement - Hedef DOM elementi
 */
export async function renderFullSolution(solution, targetElement) {
    console.log('renderFullSolution called with Advanced Math Renderer:', solution);
    if (!solution || !targetElement) {
        console.log('No solution or target element provided');
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
            html += `<div class="step-description mb-2 text-gray-700 smart-content" data-content="${escapeHtml(step.adimAciklamasi || 'Adım açıklaması')}" id="step-desc-${index}"></div>`;
            if (step.cozum_lateks) {
                html += `<div class="latex-content mb-2" data-latex="${escapeHtml(step.cozum_lateks)}" id="step-latex-${index}"></div>`;
            }
            if (step.ipucu) {
                html += `<div class="step-hint p-2 bg-yellow-50 rounded text-sm smart-content" data-content="${escapeHtml(step.ipucu)}" id="step-hint-${index}"></div>`;
            }
            html += '</div>';
        });
    } else if (solution.tamCozumLateks && solution.tamCozumLateks.length > 0) {
        solution.tamCozumLateks.forEach((latex, index) => {
            html += `<div class="solution-step p-4 mb-3 bg-gray-50 rounded-lg">`;
            html += `<div class="step-number font-semibold text-blue-600 mb-2">${index + 1}. Adım</div>`;
            html += `<div class="latex-content" data-latex="${escapeHtml(latex)}" id="legacy-step-${index}"></div>`;
            html += '</div>';
        });
    } else {
        html += '<div class="p-4 bg-red-50 text-red-700 rounded-lg">';
        html += '<p>Çözüm verisi bulunamadı. Lütfen tekrar deneyin.</p>';
        html += '</div>';
    }
    
    html += '</div>';
    targetElement.innerHTML = html;
    
    // Advanced Math Renderer ile render et
    setTimeout(async () => {
        await renderMathInContainer(targetElement, false);
    }, 100);
    
    console.log('renderFullSolution completed with Advanced Math Renderer');
}

/**
 * İnteraktif çözüm adımını render eder
 * @param {Object} stepData - Adım verisi
 * @param {HTMLElement} targetElement - Hedef DOM elementi
 */
export async function renderInteractiveStep(stepData, targetElement) {
    console.log('renderInteractiveStep başlıyor:', stepData);
    
    if (!stepData || !stepData.options || !targetElement) {
        console.error('Step data veya target element eksik:', stepData);
        return;
    }
    
    const progress = (stepData.stepNumber / stepData.totalSteps) * 100;
    
    // Container'ı temizle
    targetElement.innerHTML = '';
    
    // HTML içeriğini oluştur
    const htmlContent = generateInteractiveStepHTML(stepData, progress);
    
    // HTML'i ayarla
    targetElement.innerHTML = htmlContent;
    
    // DOM'un hazır olmasını bekle
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Math render'ı ayrı bir task olarak çalıştır
    setTimeout(async () => {
        try {
            console.log('Math rendering başlıyor...');
            await renderMathInContainer(targetElement, false);
            console.log('Math rendering tamamlandı');
            
            // Final doğrulama
            const optionsContainer = targetElement.querySelector('#interactive-options-container');
            if (optionsContainer) {
                console.log('Final doğrulama - seçenek sayısı:', optionsContainer.children.length);
            }
        } catch (renderError) {
            console.error('Math render hatası:', renderError);
        }
    }, 150);
}

/**
 * İnteraktif adım HTML'ini oluşturur
 * @param {Object} stepData - Adım verisi
 * @param {number} progress - İlerleme yüzdesi
 * @returns {string} - HTML string
 */
function generateInteractiveStepHTML(stepData, progress) {
    return `
        <div class="interactive-solution-workspace p-6 bg-white rounded-lg shadow-md">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold text-gray-800">İnteraktif Çözüm</h3>
                <button id="back-to-main-menu-btn" class="btn btn-secondary">Ana Menüye Dön</button>
            </div>
            
            <!-- İlerleme ve Deneme Bilgisi -->
            <div class="progress-section mb-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <!-- İlerleme -->
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
                    
                    <!-- Deneme Bilgisi -->
                    <div class="attempt-info">
                        <div class="flex justify-between items-center mb-2">
                            <h4 class="text-lg font-semibold text-gray-800">Deneme Hakkı</h4>
                            <span class="text-sm ${stepData.remainingAttempts <= 1 ? 'text-red-500' : stepData.remainingAttempts <= 2 ? 'text-orange-500' : 'text-green-500'}">
                                ${stepData.remainingAttempts} / ${stepData.maxAttempts} kaldı
                            </span>
                        </div>
                        <div class="attempt-dots flex gap-1">
                            ${Array.from({length: stepData.maxAttempts}, (_, i) => `
                                <div class="w-3 h-3 rounded-full ${
                                    i < stepData.attempts ? 'bg-red-400' : 'bg-gray-200'
                                }"></div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Adım Açıklaması -->
            <div class="step-description mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 class="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <span class="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        ${stepData.stepNumber}
                    </span>
                    Bu Adımda Yapılacak:
                </h4>
                <div class="text-blue-700 smart-content" data-content="${escapeHtml(stepData.stepDescription)}" id="interactive-step-desc"></div>
            </div>
            
            <!-- Uyarı Mesajları -->
            <div id="interactive-warning-container" class="mb-4">
                <!-- Uyarı mesajları buraya gelecek -->
            </div>
            
            <!-- Seçenekler -->
            <div class="options-section mb-6">
                <h4 class="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 12l2 2 4-4"/>
                        <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
                    </svg>
                    Doğru çözüm adımını seçin:
                </h4>
                <div class="options-grid space-y-3" id="interactive-options-container">
                    ${generateOptionsHTML(stepData)}
                </div>
            </div>
            
            <!-- Aksiyon Butonları -->
            <div class="action-buttons flex flex-wrap gap-3 mb-4">
                <button id="interactive-submit-btn" class="btn btn-primary flex-1" disabled>
                    Seçimi Onayla
                </button>
                <button id="interactive-hint-btn" class="btn btn-secondary">
                    💡 İpucu
                </button>
            </div>
            
            <!-- Sonuç Alanı -->
            <div id="interactive-result-container" class="result-section hidden mb-4">
                <!-- Sonuç mesajları buraya gelecek -->
            </div>
            
            <!-- Navigasyon -->
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
 * İnteraktif seçenekler HTML'ini oluşturur
 * @param {Object} stepData - Adım verisi
 * @returns {string} - Options HTML
 */
function generateOptionsHTML(stepData) {
    if (!stepData.options || !Array.isArray(stepData.options)) {
        console.error('Options verisi eksik:', stepData);
        return '<p class="text-red-600">Seçenekler yüklenemedi</p>';
    }
    
    return stepData.options.map((option, index) => {
        const optionLetter = String.fromCharCode(65 + index);
        const optionId = option.displayId !== undefined ? option.displayId : index;
        
        return `
            <label class="option-label flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-all duration-200" data-option-id="${optionId}">
                <input type="radio" name="interactive-step-${stepData.stepNumber}" value="${optionId}" class="sr-only">
                <div class="option-letter w-8 h-8 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center font-bold text-sm mr-3 mt-0.5">
                    ${optionLetter}
                </div>
                <div class="option-content flex-1">
                    <div class="text-gray-800 font-medium smart-content" data-content="${escapeHtml(option.text)}" id="option-text-${optionId}"></div>
                    ${option.latex ? `<div class="text-sm text-gray-600 mt-1 latex-content" data-latex="${escapeHtml(option.latex)}" id="option-latex-${optionId}"></div>` : ''}
                </div>
            </label>
        `;
    }).join('');
}

/**
 * İnteraktif tamamlanma ekranını render eder
 * @param {Object} completionStats - Tamamlanma istatistikleri
 * @param {HTMLElement} targetElement - Hedef DOM elementi
 */
export async function renderInteractiveCompletion(completionStats, targetElement) {
    if (!targetElement) return;
    
    // Performans mesajı
    let performanceMessage = '';
    let performanceColor = 'text-green-600';
    
    switch(completionStats.performance) {
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
    
    targetElement.innerHTML = `
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
    
    // Math render
    setTimeout(async () => {
        await renderMathInContainer(targetElement, false);
    }, 50);
}

/**
 * HTML karakterlerini escape eder
 * @param {string} text - Escape edilecek metin
 * @returns {string} - Escape edilmiş metin
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}