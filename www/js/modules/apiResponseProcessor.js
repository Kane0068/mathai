// =================================================================================
//  API Yanıt İşleyici - apiResponseProcessor.js
//  API'den gelen matematik içerikli yanıtları işler ve render eder
// =================================================================================

import { enhancedMathRenderer } from './enhancedMathRenderer.js';
// YENİ: "Kurşun Geçirmez" Metin Temizleme Fonksiyonu
// Bu fonksiyon, tüm karakter ve boşluk sorunlarını tek seferde çözer.
function robustTextClean(text) {
    if (!text || typeof text !== 'string') return '';

    let cleaned = text;

    // 1. ADIM: En Önemli Düzeltme - Karakter Bozulmalarını Gider
    // Ters eğik çizgi ile bozulmuş Türkçe karakterleri düzelt
    cleaned = cleaned.replace(/\\c/g, 'ç').replace(/\\C/g, 'Ç')
                     .replace(/\\g/g, 'ğ').replace(/\\G/g, 'Ğ')
                     .replace(/\\i/g, 'ı').replace(/\\I/g, 'İ')
                     .replace(/\\o/g, 'ö').replace(/\\O/g, 'Ö')
                     .replace(/\\s/g, 'ş').replace(/\\S/g, 'Ş')
                     .replace(/\\u/g, 'ü').replace(/\\U/g, 'Ü');
    
    // "g˘unu" gibi özel birleşik karakterleri düzelt
    cleaned = cleaned.replace(/g\u02d8/g, 'ğ');

    // 2. ADIM: Birleşik kelimeleri ayır
    // Örnek: "Sonucukontroletmek" -> "Sonucu kontrol etmek"
    cleaned = cleaned.replace(/([a-zğüşıöç])([A-ZĞÜŞİÖÇ])/g, '$1 $2')
                     .replace(/([a-zA-Zğüşıöç])([\\$])/g, '$1 $2')
                     .replace(/(\})([a-zA-Zğüşıöç0-9])/g, '$1 $2');

    // 3. ADIM: Genel Temizlik
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1') // Markdown bold
                     .replace(/\s+/g, ' ')             // Çoklu boşlukları tek boşluğa indir
                     .trim();

    return cleaned;
}
export class ApiResponseProcessor {
    constructor() {
        this.processingQueue = [];
        this.isProcessing = false;
        this.turkishCharacterFix = true;
        this.spacePreservation = true;
        
        // İşleme metrikleri
        this.metrics = {
            totalResponses: 0,
            successfullyProcessed: 0,
            mixedContentResponses: 0,
            turkishContentResponses: 0,
            averageProcessingTime: 0,
            commonIssues: new Map()
        };
    }

    /**
     * Ana API yanıt işleme fonksiyonu
     * @param {Object} apiResponse - API'den gelen yanıt
     * @param {HTMLElement} targetContainer - Yanıtın render edileceği container
     * @param {Object} options - İşleme seçenekleri
     * @returns {Promise<Object>} - İşleme sonucu
     */
    async processApiResponse(apiResponse, targetContainer, options = {}) {
        const startTime = performance.now();
        this.metrics.totalResponses++;

        try {
            console.log('🚀 API yanıtı işleniyor:', apiResponse);

            // Yanıt validasyonu
            const validation = this.validateApiResponse(apiResponse);
            if (!validation.isValid) {
                throw new Error(`Geçersiz API yanıtı: ${validation.errors.join(', ')}`);
            }

            // Yanıt ön işleme
            const preprocessedResponse = this.preprocessResponse(apiResponse);
            console.log('🔄 Ön işlenmiş yanıt:', preprocessedResponse);

            const htmlStructure = await this.buildHtmlStructure(preprocessedResponse, options);
            
            // Container'a ekle
            targetContainer.innerHTML = '';
            targetContainer.appendChild(htmlStructure);

            // Matematik içerikleri render et
            const renderResult = await enhancedMathRenderer.renderContainer(targetContainer, {
                enableTurkishSupport: this.turkishCharacterFix,
                preserveSpaces: this.spacePreservation,
                ...options
            });

            // Post-processing
            await this.performPostProcessing(targetContainer, preprocessedResponse);

            // Metrikleri güncelle
            this.metrics.successfullyProcessed++;
            const processingTime = performance.now() - startTime;
            this.updateAverageProcessingTime(processingTime);

            const result = {
                success: true,
                processingTime: processingTime,
                renderResult: renderResult,
                processedResponse: preprocessedResponse,
                container: targetContainer
            };

            console.log('✅ API yanıtı başarıyla işlendi:', result);
            return result;

        } catch (error) {
            console.error('❌ API yanıt işleme hatası:', error);
            
            // Hata tipini kaydet
            const errorType = error.constructor.name;
            const currentCount = this.metrics.commonIssues.get(errorType) || 0;
            this.metrics.commonIssues.set(errorType, currentCount + 1);

            // Fallback gösterimi
            await this.showFallbackContent(targetContainer, apiResponse, error);

            return {
                success: false,
                error: error.message,
                processingTime: performance.now() - startTime,
                fallbackUsed: true
            };
        }
    }

    /**
     * API yanıtını validate eder
     * @param {Object} apiResponse - Validate edilecek yanıt
     * @returns {Object} - Validation sonucu
     */
    validateApiResponse(apiResponse) {
        const errors = [];
        
        if (!apiResponse) {
            errors.push('API yanıtı boş');
        }
        
        if (typeof apiResponse !== 'object') {
            errors.push('API yanıtı object değil');
        }
        
        // Gerekli alanları kontrol et
        const requiredFields = ['problemOzeti', 'adimlar'];
        requiredFields.forEach(field => {
            if (!apiResponse[field]) {
                errors.push(`Gerekli alan eksik: ${field}`);
            }
        });
        
        // Adımları kontrol et
        if (apiResponse.adimlar && Array.isArray(apiResponse.adimlar)) {
            apiResponse.adimlar.forEach((adim, index) => {
                if (!adim.adimBasligi) {
                    errors.push(`Adım ${index + 1}: başlık eksik`);
                }
                if (!adim.cozum_lateks) {
                    errors.push(`Adım ${index + 1}: çözüm LaTeX eksik`);
                }
            });
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }


    
    /**
     * API yanıtını ön işlemden geçirir (GÜNCELLENDİ)
     * @param {Object} apiResponse - İşlenecek yanıt
     * @returns {Object} - İşlenmiş yanıt
     */
    preprocessResponse(apiResponse) {
        const processed = JSON.parse(JSON.stringify(apiResponse));

        // YENİ: Tüm metin alanlarını tek bir güçlü fonksiyonla temizle
        this.recursiveObjectWalk(processed, (value, key, obj) => {
            if (typeof value === 'string') {
                // Sadece sözel içerikleri temizle, LaTeX'e dokunma
                if (key !== 'cozum_lateks' && key !== 'metin_lateks') {
                    obj[key] = robustTextClean(value);
                }
            }
        });

        this.cleanLatexExpressions(processed);
        this.detectMixedContent(processed);

        // Türkçe içeriği burada tespit et
        if (this.hasTurkishContent(processed)) {
            this.metrics.turkishContentResponses++;
        }
        
        return processed;
    }

    

    /**
     * LaTeX ifadelerini temizler ve düzeltir
     * @param {Object} response - Düzeltilecek yanıt
     */
    cleanLatexExpressions(response) {
        const latexFixes = {
            // Çift backslash sorunları
            '\\\\\\\\': '\\\\',
            '\\\\cdot': '\\cdot',
            '\\\\times': '\\times',
            '\\\\frac': '\\frac',
            
            // Eksik parantezleri tamamla
            '\\frac{': '\\frac{',
            
            // Yaygın LaTeX hataları
            '\\sqrt{}': '\\sqrt{x}',
            '\\frac{}{}': '\\frac{a}{b}',
            
            // Türkçe LaTeX komutları
            '\\text{değer}': '\\text{değer}',
            '\\text{sonuç}': '\\text{sonuç}'
        };

        this.recursiveStringReplace(response, latexFixes);
    }

    /**
     * Karışık içerik tespiti yapar
     * @param {Object} response - Analiz edilecek yanıt
     */
    detectMixedContent(response) {
        let hasMixedContent = false;
        
        this.recursiveObjectWalk(response, (value) => {
            if (typeof value === 'string') {
                // Metin + LaTeX karışımı var mı?
                const hasText = /[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+/.test(value);
                const hasLatex = /\$|\\\w+/.test(value);
                
                if (hasText && hasLatex) {
                    hasMixedContent = true;
                }
            }
        });
        
        if (hasMixedContent) {
            this.metrics.mixedContentResponses++;
            response._hasMixedContent = true;
        }
    }

    /**
     * HTML yapısını oluşturur
     * @param {Object} response - İşlenmiş yanıt
     * @param {Object} options - Yapı seçenekleri
     * @returns {Promise<HTMLElement>} - Oluşturulan HTML yapısı
     */
    async buildHtmlStructure(response, options) {
        const container = document.createElement('div');
        container.className = 'api-response-container';
        
        if (response.problemOzeti) {
            container.appendChild(this.createProblemSection(response.problemOzeti));
        }
        if (response.adimlar && Array.isArray(response.adimlar)) {
            container.appendChild(this.createStepsSection(response.adimlar));
        }
        if (response.tamCozumLateks) {
            container.appendChild(this.createSolutionSection(response.tamCozumLateks));
        }
        if (response.sonucKontrolu) {
            container.appendChild(this.createVerificationSection(response.sonucKontrolu));
        }
        return container;
    }


    /**
     * Problem özeti bölümünü oluşturur
     * @param {Object} problemOzeti - Problem özeti verileri
     * @returns {HTMLElement} - Problem özeti HTML elementi
     */
    createProblemSection(problemOzeti) {
        const section = document.createElement('div');
        section.className = 'problem-summary-section';
        
        const title = document.createElement('h3');
        title.textContent = 'Problem Özeti';
        title.className = 'section-title';
        section.appendChild(title);
        
        if (problemOzeti.verilenler && Array.isArray(problemOzeti.verilenler)) {
            const givenDiv = document.createElement('div');
            givenDiv.className = 'given-data';
            const givenTitle = document.createElement('h4');
            givenTitle.textContent = 'Verilenler:';
            givenDiv.appendChild(givenTitle);
            const givenList = document.createElement('ul');
            problemOzeti.verilenler.forEach(veri => {
                const li = document.createElement('li');
                li.className = 'problem-text smart-content';
                // GÜNCELLENDİ: Metin içeriği temizlenerek attribute'a yazılıyor
                const cleanedVeri = robustTextClean(veri);
                li.setAttribute('data-content', cleanedVeri);
                li.textContent = cleanedVeri; // Fallback
                givenList.appendChild(li);
            });
            givenDiv.appendChild(givenList);
            section.appendChild(givenDiv);
        }
        
        if (problemOzeti.istenen) {
            const requestedDiv = document.createElement('div');
            requestedDiv.className = 'requested-data';
            const requestedTitle = document.createElement('h4');
            requestedTitle.textContent = 'İstenen:';
            requestedDiv.appendChild(requestedTitle);
            const requestedContent = document.createElement('p');
            requestedContent.className = 'problem-text smart-content';
            // GÜNCELLENDİ: Metin içeriği temizlenerek attribute'a yazılıyor
            const cleanedIstenen = robustTextClean(problemOzeti.istenen);
            requestedContent.setAttribute('data-content', cleanedIstenen);
            requestedContent.textContent = cleanedIstenen; // Fallback
            requestedDiv.appendChild(requestedContent);
            section.appendChild(requestedDiv);
        }
        return section;
    }

    /**
     * Çözüm adımları bölümünü oluşturur
     * @param {Array} adimlar - Çözüm adımları
     * @returns {HTMLElement} - Adımlar HTML elementi
     */
    createStepsSection(adimlar) {
        const section = document.createElement('div');
        section.className = 'solution-steps-section';
        const title = document.createElement('h3');
        title.textContent = 'Çözüm Adımları';
        title.className = 'section-title';
        section.appendChild(title);
        
        adimlar.forEach((adim, index) => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'solution-step';
            stepDiv.setAttribute('data-step', index + 1);
            
            const stepTitle = document.createElement('h4');
            stepTitle.className = 'step-title';
            stepTitle.textContent = `${adim.adimNo || index + 1}. ${adim.adimBasligi}`;
            stepDiv.appendChild(stepTitle);
            
            if (adim.adimAciklamasi) {
                const explanation = document.createElement('p');
                explanation.className = 'step-explanation smart-content';
                // GÜNCELLENDİ: Açıklama metni temizleniyor
                const cleanedAciklama = robustTextClean(adim.adimAciklamasi);
                explanation.setAttribute('data-content', cleanedAciklama);
                explanation.textContent = cleanedAciklama;
                stepDiv.appendChild(explanation);
            }
            
            if (adim.cozum_lateks) {
                const solution = document.createElement('div');
                solution.className = 'step-solution latex-content';
                // LaTeX içeriği temizlenMEZ, olduğu gibi kalır.
                solution.setAttribute('data-latex', adim.cozum_lateks);
                solution.textContent = adim.cozum_lateks;
                stepDiv.appendChild(solution);
            }
            
            if (adim.ipucu) {
                const hintDiv = document.createElement('div');
                hintDiv.className = 'step-hint collapsed';
                const hintButton = document.createElement('button');
                hintButton.className = 'hint-toggle-btn';
                hintButton.textContent = '💡 İpucu Göster';
                hintButton.onclick = () => this.toggleHint(hintDiv);
                const hintContent = document.createElement('p');
                hintContent.className = 'hint-content smart-content';
                // GÜNCELLENDİ: İpucu metni temizleniyor
                const cleanedIpucu = robustTextClean(adim.ipucu);
                hintContent.setAttribute('data-content', cleanedIpucu);
                hintContent.textContent = cleanedIpucu;
                hintDiv.appendChild(hintButton);
                hintDiv.appendChild(hintContent);
                stepDiv.appendChild(hintDiv);
            }
            
            if (adim.yanlisSecenekler && Array.isArray(adim.yanlisSecenekler)) {
                const wrongOptionsDiv = document.createElement('div');
                wrongOptionsDiv.className = 'wrong-options collapsed';
                const wrongButton = document.createElement('button');
                wrongButton.className = 'wrong-options-toggle-btn';
                wrongButton.textContent = '⚠️ Yaygın Hatalar';
                wrongButton.onclick = () => this.toggleWrongOptions(wrongOptionsDiv);
                wrongOptionsDiv.appendChild(wrongButton);
                const wrongList = document.createElement('ul');
                wrongList.className = 'wrong-options-list';
                adim.yanlisSecenekler.forEach(yanlis => {
                    const li = document.createElement('li');
                    li.className = 'wrong-option';
                    const wrongMath = document.createElement('div');
                    wrongMath.className = 'wrong-math latex-content';
                    wrongMath.setAttribute('data-latex', yanlis.metin_lateks);
                    wrongMath.textContent = yanlis.metin_lateks;
                    const wrongExplanation = document.createElement('p');
                    wrongExplanation.className = 'wrong-explanation smart-content';
                    // GÜNCELLENDİ: Hata açıklaması metni temizleniyor
                    const cleanedHata = robustTextClean(yanlis.hataAciklamasi);
                    wrongExplanation.setAttribute('data-content', cleanedHata);
                    wrongExplanation.textContent = cleanedHata;
                    li.appendChild(wrongMath);
                    li.appendChild(wrongExplanation);
                    wrongList.appendChild(li);
                });
                wrongOptionsDiv.appendChild(wrongList);
                stepDiv.appendChild(wrongOptionsDiv);
            }
            
            section.appendChild(stepDiv);
        });
        return section;
    }

    /**
     * Tam çözüm bölümünü oluşturur
     * @param {Array} tamCozumLateks - Tam çözüm LaTeX listesi
     * @returns {HTMLElement} - Tam çözüm HTML elementi
     */
    createSolutionSection(tamCozumLateks) {
        const section = document.createElement('div');
        section.className = 'complete-solution-section';
        
        const title = document.createElement('h3');
        title.textContent = 'Tam Çözüm';
        title.className = 'section-title';
        section.appendChild(title);
        
        if (Array.isArray(tamCozumLateks)) {
            tamCozumLateks.forEach((latex, index) => {
                const solutionStep = document.createElement('div');
                solutionStep.className = 'complete-solution-step latex-content';
                solutionStep.setAttribute('data-latex', latex);
                solutionStep.setAttribute('data-step', index + 1);
                solutionStep.textContent = latex; // Fallback
                section.appendChild(solutionStep);
            });
        }
        
        return section;
    }

    /**
     * Sonuç kontrolü bölümünü oluşturur
     * @param {string} sonucKontrolu - Sonuç kontrol açıklaması
     * @returns {HTMLElement} - Sonuç kontrol HTML elementi
     */
    createVerificationSection(sonucKontrolu) {
        const section = document.createElement('div');
        section.className = 'verification-section';
        
        const title = document.createElement('h3');
        title.textContent = 'Sonuç Kontrolü';
        title.className = 'section-title';
        section.appendChild(title);
        
        const content = document.createElement('p');
        content.className = 'verification-content smart-content';
        // GÜNCELLENDİ: Metin içeriği temizlenerek attribute'a yazılıyor
        const cleanedKontrol = robustTextClean(sonucKontrolu);
        content.setAttribute('data-content', cleanedKontrol);
        content.textContent = cleanedKontrol; // Fallback
        section.appendChild(content);
        
        return section;
    }


    /**
     * Post-processing işlemlerini gerçekleştirir
     * @param {HTMLElement} container - İşlenecek container
     * @param {Object} response - İşlenmiş yanıt
     */
    async performPostProcessing(container, response) {
        // Türkçe metin stillerini uygula
        this.applyTurkishTextStyles(container);
        
        // Erişilebilirlik özelliklerini ekle
        this.addAccessibilityFeatures(container);
        
        // Responsive sınıflarını ekle
        this.addResponsiveClasses(container);
        
        // Animasyonları ekle
        this.addAnimations(container);
        
        // Event listener'ları ekle
        this.attachEventListeners(container);
    }

    /**
     * Fallback içeriği gösterir
     * @param {HTMLElement} container - Container
     * @param {Object} originalResponse - Orijinal API yanıtı
     * @param {Error} error - Oluşan hata
     */
    async showFallbackContent(container, originalResponse, error) {
        container.innerHTML = '';
        container.className = 'api-response-fallback';
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <h3>⚠️ İçerik Render Hatası</h3>
            <p>API yanıtı işlenirken bir sorun oluştu. Ham içerik aşağıda gösterilmektedir:</p>
            <details>
                <summary>Hata Detayları</summary>
                <code>${error.message}</code>
            </details>
        `;
        
        const rawContent = document.createElement('pre');
        rawContent.className = 'raw-api-response';
        rawContent.textContent = JSON.stringify(originalResponse, null, 2);
        
        container.appendChild(errorDiv);
        container.appendChild(rawContent);
    }

    /**
     * Yardımcı fonksiyonlar
     */
    
    recursiveStringReplace(obj, replacements) {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                for (const [find, replace] of Object.entries(replacements)) {
                    obj[key] = obj[key].replace(new RegExp(find, 'g'), replace);
                }
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                this.recursiveStringReplace(obj[key], replacements);
            }
        }
    }
    
    recursivePatternReplace(obj, pattern, replacement) {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                obj[key] = obj[key].replace(pattern, replacement);
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                this.recursivePatternReplace(obj[key], pattern, replacement);
            }
        }
    }
    
    recursiveObjectWalk(obj, callback) {
        for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                this.recursiveObjectWalk(obj[key], callback);
            } else {
                callback(obj[key], key, obj);
            }
        }
    }
    
    hasTurkishContent(obj) {
        let hasTurkish = false;
        this.recursiveObjectWalk(obj, (value) => {
            if (typeof value === 'string' && /[ğüşıöçĞÜŞİÖÇ]/.test(value)) {
                hasTurkish = true;
            }
        });
        return hasTurkish;
    }
    
    toggleHint(hintDiv) {
        hintDiv.classList.toggle('collapsed');
        const button = hintDiv.querySelector('.hint-toggle-btn');
        button.textContent = hintDiv.classList.contains('collapsed') ? 
            '💡 İpucu Göster' : '💡 İpucu Gizle';
    }
    
    toggleWrongOptions(wrongDiv) {
        wrongDiv.classList.toggle('collapsed');
        const button = wrongDiv.querySelector('.wrong-options-toggle-btn');
        button.textContent = wrongDiv.classList.contains('collapsed') ? 
            '⚠️ Yaygın Hatalar' : '⚠️ Gizle';
    }
    
    applyTurkishTextStyles(container) {
        const turkishElements = container.querySelectorAll('.turkish-text');
        turkishElements.forEach(el => {
            el.style.fontFamily = 'Arial, sans-serif';
            el.style.fontFeatureSettings = '"locl" 1';
        });
    }
    
    addAccessibilityFeatures(container) {
        // Matematik içerikleri için aria-label ekle
        const mathElements = container.querySelectorAll('.latex-content, .smart-content');
        mathElements.forEach((el, index) => {
            el.setAttribute('role', 'math');
            el.setAttribute('aria-label', `Matematik ifadesi ${index + 1}`);
        });
        
        // Adımlar için navigation
        const steps = container.querySelectorAll('.solution-step');
        steps.forEach((step, index) => {
            step.setAttribute('tabindex', '0');
            step.setAttribute('aria-label', `Çözüm adımı ${index + 1}`);
        });
    }
    
    addResponsiveClasses(container) {
        container.classList.add('responsive-math-content');
        
        // Mobil cihazlar için özel sınıflar
        if (window.innerWidth < 768) {
            container.classList.add('mobile-math-content');
        }
    }
    
    addAnimations(container) {
        // Adımları sırayla animasyonla göster
        const steps = container.querySelectorAll('.solution-step');
        steps.forEach((step, index) => {
            step.style.opacity = '0';
            step.style.transform = 'translateY(20px)';
            step.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            
            setTimeout(() => {
                step.style.opacity = '1';
                step.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }
    
    attachEventListeners(container) {
        // Matematik ifadelerine tıklama ile büyütme
        const mathElements = container.querySelectorAll('.latex-content');
        mathElements.forEach(el => {
            el.style.cursor = 'pointer';
            el.addEventListener('click', () => {
                el.classList.toggle('math-zoomed');
            });
        });
        
        // Adımlarda keyboard navigation
        const steps = container.querySelectorAll('.solution-step');
        steps.forEach((step, index) => {
            step.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown' && steps[index + 1]) {
                    steps[index + 1].focus();
                }
                if (e.key === 'ArrowUp' && steps[index - 1]) {
                    steps[index - 1].focus();
                }
            });
        });
    }
    
    updateAverageProcessingTime(newTime) {
        this.metrics.averageProcessingTime = 
            (this.metrics.averageProcessingTime * (this.metrics.totalResponses - 1) + newTime) / 
            this.metrics.totalResponses;
    }
    
    /**
     * Debug ve istatistik fonksiyonları
     */
    
    getMetrics() {
        const issuesSummary = {};
        this.metrics.commonIssues.forEach((count, issue) => {
            issuesSummary[issue] = count;
        });
        
        return {
            ...this.metrics,
            commonIssues: issuesSummary,
            successRate: (this.metrics.successfullyProcessed / this.metrics.totalResponses * 100).toFixed(2) + '%',
            mixedContentRate: (this.metrics.mixedContentResponses / this.metrics.totalResponses * 100).toFixed(2) + '%',
            turkishContentRate: (this.metrics.turkishContentResponses / this.metrics.totalResponses * 100).toFixed(2) + '%'
        };
    }
    
    async debugApiResponse(apiResponse, options = {}) {
        console.group('🔍 API Yanıt Debug');
        
        // Validation
        const validation = this.validateApiResponse(apiResponse);
        console.log('✅ Validation:', validation);
        
        // Preprocessing
        const preprocessed = this.preprocessResponse(apiResponse);
        console.log('🔄 Preprocessed:', preprocessed);
        
        // Test container
        const testContainer = document.createElement('div');
        testContainer.style.position = 'absolute';
        testContainer.style.left = '-9999px';
        document.body.appendChild(testContainer);
        
        try {
            const result = await this.processApiResponse(apiResponse, testContainer, options);
            console.log('🎨 Processing Result:', result);
            console.log('📱 Generated HTML:', testContainer.innerHTML.substring(0, 500) + '...');
            
            return {
                validation,
                preprocessed,
                processingResult: result,
                generatedHtml: testContainer.innerHTML
            };
        } finally {
            document.body.removeChild(testContainer);
            console.groupEnd();
        }
    }
}

// Global instance oluştur
export const apiResponseProcessor = new ApiResponseProcessor();

// Auto-init
if (typeof window !== 'undefined') {
    window.apiResponseProcessor = apiResponseProcessor;
    console.log('✅ API Response Processor hazır');
}