/**
 * ProblemInputManager - Handles all types of problem input processing
 * Extracts from index.js: file handling, canvas processing, text input
 */

import { showError, showAnimatedLoading, showLoading } from './ui.js';

export class ProblemInputManager {
    constructor(canvasManager = null) {
        this.canvasManager = canvasManager;
    }

    /**
     * Process different types of problem input
     * @param {string} sourceType - 'image', 'canvas', or 'text'
     * @param {Object} elements - DOM elements object
     * @returns {Object} - {sourceData, problemContextForPrompt}
     */
    async processProblemInput(sourceType, elements) {
        let sourceData;
        let problemContextForPrompt = "Görseldeki matematik problemini çöz.";

        try {
            switch (sourceType) {
                case 'image':
                    sourceData = await this.processImageInput(elements);
                    break;
                case 'canvas':
                    sourceData = await this.processCanvasInput(elements);
                    break;
                case 'text':
                    const result = await this.processTextInput(elements);
                    sourceData = result.sourceData;
                    problemContextForPrompt = result.problemContextForPrompt;
                    break;
                default:
                    throw new Error(`Desteklenmeyen kaynak türü: ${sourceType}`);
            }

            return { sourceData, problemContextForPrompt };
        } catch (error) {
            console.error('❌ Problem input processing error:', error);
            throw error;
        }
    }

    /**
     * Process image file input
     */
    async processImageInput(elements) {
        const file = document.getElementById('imageUploader').files[0];
        if (!file) {
            throw new Error("Lütfen bir resim dosyası seçin.");
        }

        // Validate file
        await this.validateImageFile(file);
        
        return await this.toBase64(file);
    }

    /**
     * Process canvas drawing input
     */
    async processCanvasInput(elements) {
        if (this.isCanvasEmpty('handwritingCanvas')) {
            throw new Error("Lütfen önce bir şeyler çiziniz.");
        }

        return this.canvasManager.toDataURL('handwritingCanvas').split(',')[1];
    }

    /**
     * Process text input
     */
    async processTextInput(elements) {
        const sourceData = elements['keyboard-input'].value.trim();
        if (!sourceData) {
            throw new Error("Lütfen bir soru yazın.");
        }

        return {
            sourceData,
            problemContextForPrompt: sourceData
        };
    }

    /**
     * Validate image file size and type
     */
    async validateImageFile(file) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            throw new Error("Dosya boyutu 5MB'dan büyük olamaz.");
        }

        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            throw new Error("Sadece JPEG, PNG, GIF ve WebP dosyaları desteklenir.");
        }
    }

    /**
     * Convert file to base64
     */
    async toBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
        });
    }

    /**
     * Handle file selection with preview
     */
    async handleFileSelect(file, elements) {
        if (!file) return;

        try {
            await this.validateImageFile(file);
            
            const base64 = await this.toBase64(file);
            elements['imagePreview'].src = `data:${file.type};base64,${base64}`;
            elements['preview-container'].classList.remove('hidden');
            elements['upload-selection'].classList.add('hidden');
            elements['startFromPhotoBtn'].disabled = false;
        } catch (error) {
            showError(error.message, false);
        }
    }

    /**
     * Check if canvas is empty
     */
    isCanvasEmpty(canvasId) {
        try {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return true;

            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Check if any pixel has non-zero alpha (transparency)
            for (let i = 3; i < imageData.data.length; i += 4) {
                if (imageData.data[i] !== 0) {
                    return false;
                }
            }
            return true;
        } catch (error) {
            console.error('Canvas boşluk kontrolü hatası:', error);
            return true; // Hata durumunda boş kabul et
        }
    }

    /**
     * Show analysis loading steps
     */
    showAnalysisSteps() {
        const analysisSteps = [
            { title: "API bağlantısı kuruluyor", description: "Yapay zeka servisine bağlanılıyor..." },
            { title: "Soru içerik kontrolü yapılıyor", description: "Problem analiz ediliyor..." },
            { title: "Matematiksel ifadeler tespit ediliyor", description: "Formüller ve denklemler çözümleniyor..." },
            { title: "Çözüm adımları hazırlanıyor", description: "Adım adım çözüm planı oluşturuluyor..." },
            { title: "Enhanced Math Renderer hazırlanıyor", description: "Gelişmiş matematik render sistemi ile optimize ediliyor..." }
        ];

        showAnimatedLoading(analysisSteps, 800);
    }

    /**
     * Clear input areas
     */
    clearInputAreas() {
        // Canvas temizleme
        const canvas = document.getElementById('handwritingCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        // Text input temizleme
        const textInput = document.getElementById('keyboard-input');
        if (textInput) {
            textInput.value = '';
        }

        // Image preview temizleme
        const imagePreview = document.getElementById('imagePreview');
        const previewContainer = document.getElementById('preview-container');
        const uploadSelection = document.getElementById('upload-selection');
        const startFromPhotoBtn = document.getElementById('startFromPhotoBtn');

        if (imagePreview) imagePreview.src = '';
        if (previewContainer) previewContainer.classList.add('hidden');
        if (uploadSelection) uploadSelection.classList.remove('hidden');
        if (startFromPhotoBtn) startFromPhotoBtn.disabled = true;

        // File input temizleme
        const imageUploader = document.getElementById('imageUploader');
        if (imageUploader) imageUploader.value = '';

        console.log('✅ Input areas cleared');
    }
}

// Export for backward compatibility
export const problemInputManager = new ProblemInputManager();