// =================================================================================
//  API Yanıt İşleyici - apiResponseProcessor.js
//  API'den gelen matematik içerikli yanıtları işler ve render eder
// =================================================================================

import { enhancedMathRenderer } from './enhancedMathRenderer.js';

// GELİŞTİRİLMİŞ: Daha güçlü Türkçe karakter ve metin temizleme
function robustTextClean(text) {
    if (!text || typeof text !== 'string') return '';

    let cleaned = text;

    // 1. ADIM: Türkçe karakter düzeltmeleri - GENİŞLETİLDİ
    // Escape karakterleri düzelt (kelime sınırı kontrolü ile)
    const turkishCharMap = {
        '\\c': 'ç', '\\C': 'Ç',
        '\\g': 'ğ', '\\G': 'Ğ', 
        '\\i': 'ı', '\\I': 'İ',
        '\\o': 'ö', '\\O': 'Ö',
        '\\s': 'ş', '\\S': 'Ş',
        '\\u': 'ü', '\\U': 'Ü'
    };

    // LaTeX komutlarını koruyarak Türkçe karakterleri düzelt
    Object.entries(turkishCharMap).forEach(([escaped, correct]) => {
        // Kelime sınırında olan escape karakterleri düzelt
        const regex = new RegExp(escaped.replace(/\\/g, '\\\\') + '(?![a-zA-Z])', 'g');
        cleaned = cleaned.replace(regex, correct);
    });
    
    // Unicode birleşik karakterleri düzelt
    cleaned = cleaned.replace(/g\u02d8/g, 'ğ');
    cleaned = cleaned.replace(/s\u0327/g, 'ş');
    cleaned = cleaned.replace(/c\u0327/g, 'ç');
    
    // 2. ADIM: Zero-width space karakterlerini temizle
    cleaned = cleaned.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
    
    // 3. ADIM: Birleşik kelimeleri akıllıca ayır
    // Küçük harften büyük harfe geçişlerde boşluk ekle
    cleaned = cleaned.replace(/([a-zğüşıöç])([A-ZĞÜŞİÖÇ])/g, '$1 $2');
    
    // Özel kalıpları düzelt
    cleaned = cleaned.replace(/is\s*leminin/g, 'işleminin');
    cleaned = cleaned.replace(/bulunuz/g, 'bulunuz');
    cleaned = cleaned.replace(/sonucunu/g, 'sonucunu');
    
    // LaTeX komutlarından sonra gelen metni ayır
    cleaned = cleaned.replace(/(\})([a-zA-ZğüşıöçĞÜŞİÖÇ])/g, '$1 $2');
    cleaned = cleaned.replace(/([a-zA-ZğüşıöçĞÜŞİÖÇ])(\$)/g, '$1 $2');
    
    // 4. ADIM: Markdown düzeltmeleri
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    cleaned = cleaned.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // 5. ADIM: Fazla boşlukları temizle
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
}

// YENİ: LaTeX ifadelerini doğru parse etme
function correctLatexParsing(text) {
    if (!text || typeof text !== 'string') return text;
    
    // log_base value formatını düzelt
    // Örnek: log_4 32 kalmalı, log_4 (4^{5/2}) olmamalı
    text = text.replace(/\\log_(\d+)\s*\(?\s*\d+\s*\)?/g, (match) => {
        // Orijinal formatı koru
        return match;
    });
    
    // Yanlış parse edilmiş üslü ifadeleri düzelt
    text = text.replace(/\\log_(\d+)\s*\([^)]+\^\{[^}]+\}\)/g, (match) => {
        // Sadece sayıyı çıkar
        const baseMatch = match.match(/\\log_(\d+)/);
        const valueMatch = match.match(/\((\d+)/);
        if (baseMatch && valueMatch) {
            return `\\log_{${baseMatch[1]}} ${valueMatch[1]}`;
        }
        return match;
    });
    
    return text;
}

class APIResponseProcessor {
    constructor() {
        this.turkishCharacterFix = true;
        this.spacePreservation = true;
        this.debugMode = false;
        
        // Performans metrikleri
        this.metrics = {
            totalProcessed: 0,
            successfullyProcessed: 0,
            averageProcessingTime: 0,
            commonIssues: new Map(),
            turkishContentCount: 0
        };
    }

    /**
     * API yanıtını ön işleme - GELİŞTİRİLDİ
     */
    preprocessResponse(response) {
        console.log('🔄 Ön işlenmiş yanıt:', response);
        
        const processed = JSON.parse(JSON.stringify(response));
        
        // Tüm string değerleri temizle
        const processValue = (value) => {
            if (typeof value === 'string') {
                // Önce LaTeX düzeltmelerini yap
                value = correctLatexParsing(value);
                // Sonra genel temizlik
                return robustTextClean(value);
            } else if (Array.isArray(value)) {
                return value.map(item => processValue(item));
            } else if (typeof value === 'object' && value !== null) {
                const result = {};
                for (const key in value) {
                    result[key] = processValue(value[key]);
                }
                return result;
            }
            return value;
        };

        const result = processValue(processed);
        
        // Türkçe içerik tespiti
        if (this.hasTurkishContent(JSON.stringify(result))) {
            this.metrics.turkishContentCount++;
        }
        
        return result;
    }

    /**
     * Türkçe içerik kontrolü
     */
    hasTurkishContent(text) {
        const turkishChars = /[ğĞıİöÖşŞüÜçÇ]/;
        return turkishChars.test(text);
    }

    /**
     * HTML yapısı oluşturma - GELİŞTİRİLDİ
     */
    createHTMLStructure(response) {
        const container = document.createElement('div');
        container.className = 'api-response-structure';

        // Problem özeti
        if (response.problemOzeti) {
            const summarySection = this.createSection('problem-summary', 'Problem Özeti', response.problemOzeti);
            container.appendChild(summarySection);
        }

        // Adımlar
        if (response.adimlar && Array.isArray(response.adimlar)) {
            const stepsSection = document.createElement('div');
            stepsSection.className = 'steps-section';
            
            const stepsTitle = document.createElement('h3');
            stepsTitle.textContent = 'Çözüm Adımları';
            stepsSection.appendChild(stepsTitle);

            response.adimlar.forEach((adim, index) => {
                const stepElement = this.createStep(adim, index + 1);
                stepsSection.appendChild(stepElement);
            });

            container.appendChild(stepsSection);
        }

        // Tam çözüm
        if (response.tamCozumLateks && Array.isArray(response.tamCozumLateks)) {
            const fullSolutionSection = this.createLatexSection(
                'full-solution',
                'Tam Çözüm',
                response.tamCozumLateks
            );
            container.appendChild(fullSolutionSection);
        }

        // Sonuç kontrolü
        if (response.sonucKontrolu) {
            const verificationSection = this.createSection(
                'result-verification',
                'Sonuç Kontrolü',
                { aciklama: response.sonucKontrolu }
            );
            container.appendChild(verificationSection);
        }

        return container;
    }

    /**
     * Bölüm oluşturma - GELİŞTİRİLDİ
     */
    createSection(className, title, content) {
        const section = document.createElement('div');
        section.className = `response-section ${className}`;

        if (title) {
            const titleElement = document.createElement('h3');
            titleElement.textContent = title;
            section.appendChild(titleElement);
        }

        if (typeof content === 'string') {
            const contentElement = document.createElement('div');
            contentElement.className = 'section-content';
            contentElement.setAttribute('data-math-content', 'true');
            contentElement.textContent = content;
            section.appendChild(contentElement);
        } else if (typeof content === 'object') {
            Object.entries(content).forEach(([key, value]) => {
                const itemElement = document.createElement('div');
                itemElement.className = `content-item ${key}`;
                
                if (key !== 'latex' && key !== 'formul') {
                    const label = document.createElement('span');
                    label.className = 'item-label';
                    label.textContent = this.formatLabel(key) + ': ';
                    itemElement.appendChild(label);
                }
                
                const valueElement = document.createElement('span');
                valueElement.className = 'item-value';
                valueElement.setAttribute('data-math-content', 'true');
                valueElement.textContent = value;
                itemElement.appendChild(valueElement);
                
                section.appendChild(itemElement);
            });
        }

        return section;
    }

    /**
     * LaTeX bölümü oluşturma
     */
    createLatexSection(className, title, latexArray) {
        const section = document.createElement('div');
        section.className = `response-section ${className}`;

        if (title) {
            const titleElement = document.createElement('h3');
            titleElement.textContent = title;
            section.appendChild(titleElement);
        }

        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'latex-content-wrapper';

        latexArray.forEach((latex, index) => {
            const latexElement = document.createElement('div');
            latexElement.className = 'latex-line';
            latexElement.setAttribute('data-math-content', 'true');
            latexElement.setAttribute('data-line-index', index);
            latexElement.textContent = latex;
            contentWrapper.appendChild(latexElement);
        });

        section.appendChild(contentWrapper);
        return section;
    }

    /**
     * Adım elementi oluşturma
     */
    createStep(step, stepNumber) {
        const stepElement = document.createElement('div');
        stepElement.className = 'solution-step';
        stepElement.setAttribute('data-step-number', stepNumber);

        const stepHeader = document.createElement('div');
        stepHeader.className = 'step-header';
        
        const stepTitle = document.createElement('h4');
        stepTitle.textContent = `Adım ${stepNumber}: ${step.baslik || ''}`;
        stepHeader.appendChild(stepTitle);
        
        stepElement.appendChild(stepHeader);

        const stepContent = document.createElement('div');
        stepContent.className = 'step-content';

        // Açıklama
        if (step.aciklama) {
            const explanation = document.createElement('div');
            explanation.className = 'step-explanation';
            explanation.setAttribute('data-math-content', 'true');
            explanation.textContent = step.aciklama;
            stepContent.appendChild(explanation);
        }

        // İşlemler
        if (step.islemler && Array.isArray(step.islemler)) {
            const operationsContainer = document.createElement('div');
            operationsContainer.className = 'step-operations';
            
            step.islemler.forEach((islem, index) => {
                const operationElement = document.createElement('div');
                operationElement.className = 'operation-item';
                operationElement.setAttribute('data-math-content', 'true');
                operationElement.setAttribute('data-operation-index', index);
                
                // İşlem türüne göre format
                if (typeof islem === 'string') {
                    operationElement.textContent = islem;
                } else if (islem.tur && islem.deger) {
                    operationElement.setAttribute('data-operation-type', islem.tur);
                    operationElement.textContent = islem.deger;
                }
                
                operationsContainer.appendChild(operationElement);
            });
            
            stepContent.appendChild(operationsContainer);
        }

        stepElement.appendChild(stepContent);
        return stepElement;
    }

    /**
     * Label formatlama
     */
    formatLabel(key) {
        const labelMap = {
            'tur': 'Tür',
            'seviye': 'Seviye',
            'verilenler': 'Verilenler',
            'istenen': 'İstenen',
            'aciklama': 'Açıklama',
            'formul': 'Formül',
            'hesaplama': 'Hesaplama',
            'sonuc': 'Sonuç'
        };
        
        return labelMap[key] || key.charAt(0).toUpperCase() + key.slice(1);
    }

    /**
     * Ana işleme fonksiyonu
     */
    async processApiResponse(apiResponse, targetContainer, options = {}) {
        const startTime = performance.now();
        this.metrics.totalProcessed++;
        
        console.log('🚀 API yanıtı işleniyor:', apiResponse);
        
        try {
            // Container kontrolü
            if (!targetContainer || !(targetContainer instanceof HTMLElement)) {
                throw new Error('Geçerli bir target container gerekli');
            }

            // Ön işleme
            const preprocessedResponse = this.preprocessResponse(apiResponse);
            
            // HTML yapısı oluştur
            const htmlStructure = this.createHTMLStructure(preprocessedResponse);
            
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
     * Post-processing işlemleri
     */
    async performPostProcessing(container, response) {
        // Responsive ayarlar
        this.makeResponsive(container);
        
        // Accessibility
        this.enhanceAccessibility(container);
        
        // Event listener'lar
        this.attachEventListeners(container);
        
        console.log('✅ Post-processing tamamlandı');
    }

    /**
     * Responsive düzenlemeler
     */
    makeResponsive(container) {
        // Tüm matematik elementlerine responsive class ekle
        const mathElements = container.querySelectorAll('[data-math-content="true"]');
        mathElements.forEach(element => {
            element.classList.add('responsive-math');
        });
        
        // Overflow kontrolü
        const sections = container.querySelectorAll('.response-section');
        sections.forEach(section => {
            if (section.scrollWidth > section.clientWidth) {
                section.classList.add('has-overflow');
                section.style.overflowX = 'auto';
            }
        });
    }

    /**
     * Erişilebilirlik iyileştirmeleri
     */
    enhanceAccessibility(container) {
        // ARIA etiketleri
        container.setAttribute('role', 'article');
        container.setAttribute('aria-label', 'Matematik çözümü');
        
        // Başlıklar için ARIA
        const headings = container.querySelectorAll('h3, h4');
        headings.forEach((heading, index) => {
            heading.setAttribute('id', `heading-${index}`);
        });
        
        // Matematik içerikler için ARIA
        const mathContents = container.querySelectorAll('[data-math-content="true"]');
        mathContents.forEach(element => {
            element.setAttribute('role', 'math');
        });
    }

    /**
     * Event listener'ları ekle
     */
    attachEventListeners(container) {
        // Kopyalama fonksiyonu
        const mathElements = container.querySelectorAll('[data-math-content="true"]');
        mathElements.forEach(element => {
            element.addEventListener('dblclick', (e) => {
                this.copyToClipboard(element.textContent);
                this.showCopyFeedback(element);
            });
        });
        
        // Genişletme/daraltma
        const sections = container.querySelectorAll('.response-section');
        sections.forEach(section => {
            const title = section.querySelector('h3');
            if (title) {
                title.style.cursor = 'pointer';
                title.addEventListener('click', () => {
                    section.classList.toggle('collapsed');
                });
            }
        });
    }

    /**
     * Panoya kopyalama
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            console.log('📋 Panoya kopyalandı');
        } catch (err) {
            console.error('Kopyalama hatası:', err);
        }
    }

    /**
     * Kopyalama geri bildirimi
     */
    showCopyFeedback(element) {
        const feedback = document.createElement('div');
        feedback.className = 'copy-feedback';
        feedback.textContent = 'Kopyalandı!';
        
        element.appendChild(feedback);
        
        setTimeout(() => {
            feedback.remove();
        }, 2000);
    }

    /**
     * Fallback içerik gösterimi
     */
    async showFallbackContent(container, originalResponse, error) {
        container.innerHTML = `
            <div class="error-fallback">
                <h3>⚠️ İçerik işlenirken bir hata oluştu</h3>
                <p>Hata detayı: ${error.message}</p>
                <details>
                    <summary>Ham veri</summary>
                    <pre>${JSON.stringify(originalResponse, null, 2)}</pre>
                </details>
            </div>
        `;
        
        // Basit render denemesi
        try {
            const fallbackElements = container.querySelectorAll('pre');
            for (const element of fallbackElements) {
                await enhancedMathRenderer.renderContent(element, element.textContent, {
                    fallbackOnly: true
                });
            }
        } catch (fallbackError) {
            console.error('Fallback render hatası:', fallbackError);
        }
    }

    /**
     * Ortalama işleme süresini güncelle
     */
    updateAverageProcessingTime(newTime) {
        const currentAvg = this.metrics.averageProcessingTime;
        const totalProcessed = this.metrics.successfullyProcessed;
        
        this.metrics.averageProcessingTime = 
            (currentAvg * (totalProcessed - 1) + newTime) / totalProcessed;
    }

    /**
     * Metrikleri getir
     */
    getMetrics() {
        const successRate = this.metrics.totalProcessed > 0
            ? ((this.metrics.successfullyProcessed / this.metrics.totalProcessed) * 100).toFixed(2)
            : '0.00';
            
        const turkishContentRate = this.metrics.totalProcessed > 0
            ? ((this.metrics.turkishContentCount / this.metrics.totalProcessed) * 100).toFixed(2)
            : '0.00';

        return {
            totalProcessed: this.metrics.totalProcessed,
            successfullyProcessed: this.metrics.successfullyProcessed,
            successRate: successRate + '%',
            averageProcessingTime: this.metrics.averageProcessingTime.toFixed(2) + 'ms',
            turkishContentRate: turkishContentRate + '%',
            commonIssues: Array.from(this.metrics.commonIssues.entries())
        };
    }

    /**
     * Metrikleri sıfırla
     */
    resetMetrics() {
        this.metrics = {
            totalProcessed: 0,
            successfullyProcessed: 0,
            averageProcessingTime: 0,
            commonIssues: new Map(),
            turkishContentCount: 0
        };
        console.log('📊 API Response Processor metrikleri sıfırlandı');
    }
}

// Singleton instance
export const apiResponseProcessor = new APIResponseProcessor();

// Debug modu için global erişim
if (typeof window !== 'undefined') {
    window._apiResponseProcessor = apiResponseProcessor;
}