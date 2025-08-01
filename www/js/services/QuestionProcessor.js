// www/js/services/QuestionProcessor.js
import { APIValidator } from './APIValidator.js';
import { FirestoreManager } from '../modules/firestore.js';
import { stateManager } from '../modules/stateManager.js';
import { APP_CONFIG, API_PROMPTS } from '../core/Config.js';

export class QuestionProcessor {
    constructor() {
        this.apiEndpoint = APP_CONFIG.api.gemini.endpoint;
        this.processing = false;
    }

    /**
     * Process question from different sources
     * @param {string} sourceType - 'image', 'canvas', or 'text'
     * @param {string} sourceData - Base64 image data or text content
     * @param {Object} options - Additional processing options
     */
    async processQuestion(sourceType, sourceData, options = {}) {
        if (this.processing) {
            throw new Error('Başka bir soru işleniyor. Lütfen bekleyin.');
        }

        this.processing = true;

        try {
            console.log('🚀 QuestionProcessor.processQuestion called:', {
                sourceType,
                sourceDataLength: sourceData ? sourceData.length : 0,
                options
            });

            // Validate input
            this.validateInput(sourceType, sourceData);
            console.log('🚀 Input validation passed');

            // Check user query limits
            await this.checkQueryLimits();
            console.log('🚀 Query limits check passed');

            // Prepare API request
            const requestData = this.prepareRequestData(sourceType, sourceData, options);
            console.log('🚀 API request prepared:', {
                hasContents: !!requestData.contents,
                contentsLength: requestData.contents?.length,
                hasImageData: requestData.contents?.[0]?.parts?.some(p => p.inlineData)
            });

            // Make API call
            stateManager.setLoading(true, 'API çağrısı yapılıyor...');
            console.log('🚀 Making API call...');
            const response = await this.callAPI(requestData);
            console.log('🚀 API response received:', {
                hasResponse: !!response,
                responseType: typeof response,
                responseLength: typeof response === 'string' ? response.length : 'not string'
            });

            // Validate and process response
            console.log('🚀 Processing API response...');
            const processedResponse = this.processAPIResponse(response);
            console.log('🚀 Response processed:', {
                hasProblemOzeti: !!processedResponse.problemOzeti,
                hasAdimlar: !!processedResponse.adimlar,
                adimlarCount: processedResponse.adimlar?.length
            });

            // Update user query count
            await this.updateQueryCount();
            console.log('🚀 Query count updated');

            // Store results in state
            console.log('🚀 Storing results in state...');
            this.storeResults(processedResponse);
            
            // Final verification
            const verification = stateManager.getState('problem.solution');
            console.log('🚀 Final verification - solution in state:', !!verification);

            return processedResponse;

        } catch (error) {
            console.error('🚀 Question processing error:', error);
            throw error;
        } finally {
            this.processing = false;
            stateManager.setLoading(false);
        }
    }

    /**
     * Validate input parameters
     */
    validateInput(sourceType, sourceData) {
        const validTypes = ['image', 'canvas', 'text'];
        if (!validTypes.includes(sourceType)) {
            throw new Error(`Geçersiz kaynak türü: ${sourceType}`);
        }

        if (!sourceData) {
            throw new Error('Kaynak verisi boş olamaz');
        }

        // Additional validation based on source type
        switch (sourceType) {
            case 'image':
            case 'canvas':
                if (typeof sourceData !== 'string' || !sourceData.match(/^[A-Za-z0-9+/=]+$/)) {
                    throw new Error('Geçersiz base64 görsel verisi');
                }
                break;
            case 'text':
                if (typeof sourceData !== 'string' || sourceData.trim().length < 3) {
                    throw new Error('Metin çok kısa (minimum 3 karakter)');
                }
                if (sourceData.length > 2000) {
                    throw new Error('Metin çok uzun (maksimum 2000 karakter)');
                }
                break;
        }
    }

    /**
     * Check user query limits
     */
    async checkQueryLimits() {
        const userData = stateManager.getState('user');
        
        // If no user data, try to wait for it briefly
        if (!userData) {
            console.warn('User data not found, waiting for authentication...');
            
            // Wait up to 3 seconds for user data to be available
            for (let i = 0; i < 30; i++) {
                await new Promise(resolve => setTimeout(resolve, 100));
                const retryUserData = stateManager.getState('user');
                if (retryUserData) {
                    console.log('User data found after waiting');
                    return this.validateUserLimits(retryUserData);
                }
            }
            
            // If still no user data, create a fallback
            console.warn('User data still not available, using fallback limits');
            return this.validateUserLimits(this.createFallbackUserData());
        }

        return this.validateUserLimits(userData);
    }

    /**
     * Validate user limits with proper error handling
     */
    validateUserLimits(userData) {
        if (!userData) {
            throw new Error('Kullanıcı verisi bulunamadı');
        }

        const limit = userData.membershipType === 'premium' 
            ? APP_CONFIG.api.dailyLimits.premium 
            : APP_CONFIG.api.dailyLimits.free;

        const currentCount = userData.dailyQueryCount || 0;

        if (currentCount >= limit) {
            throw new Error(`Günlük sorgu limitiniz (${limit}) doldu. Yarın tekrar deneyin.`);
        }

        console.log(`Query limits OK: ${currentCount}/${limit}`);
        return true;
    }

    /**
     * Create fallback user data when auth data is not available
     */
    createFallbackUserData() {
        return {
            uid: 'fallback-user',
            membershipType: 'free',
            dailyQueryCount: 0,
            email: 'unknown@example.com'
        };
    }

    /**
     * Prepare API request data
     */
    prepareRequestData(sourceType, sourceData, options) {
        // Get the appropriate prompt from centralized config
        const promptTemplate = API_PROMPTS.masterSolution;
        const problemContext = options.prompt || this.getDefaultPrompt(sourceType);
        const prompt = promptTemplate.replace('{PROBLEM_CONTEXT}', problemContext);

        const baseRequest = {
            sourceType,
            timestamp: Date.now(),
            version: '2.0'
        };

        switch (sourceType) {
            case 'image':
                return {
                    contents: [{
                        role: "user",
                        parts: [
                            { text: prompt },
                            { 
                                inlineData: { 
                                    mimeType: 'image/png', 
                                    data: sourceData 
                                } 
                            }
                        ]
                    }]
                };

            case 'canvas':
                return {
                    contents: [{
                        role: "user",
                        parts: [
                            { text: prompt },
                            { 
                                inlineData: { 
                                    mimeType: 'image/png', 
                                    data: sourceData 
                                } 
                            }
                        ]
                    }]
                };

            case 'text':
                return {
                    contents: [{
                        role: "user",
                        parts: [{ text: prompt.replace('{PROBLEM_CONTEXT}', sourceData) }]
                    }]
                };

            default:
                throw new Error(`Desteklenmeyen kaynak türü: ${sourceType}`);
        }
    }

    /**
     * Get default prompt based on source type
     */
    getDefaultPrompt(sourceType) {
        switch (sourceType) {
            case 'image':
                return "Görseldeki matematik problemini çöz.";
            case 'canvas':
                return "El yazısı matematik problemini çöz.";
            case 'text':
                return "Bu matematik problemini çöz.";
            default:
                return "Matematik problemini çöz.";
        }
    }

    /**
     * Make API call using centralized configuration
     */
    async callAPI(requestData) {
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        };

        stateManager.setLoading(true, 'API çağrısı yapılıyor...');

        try {
            const response = await fetch(this.apiEndpoint, requestOptions);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API hatası (${response.status}): ${errorText}`);
            }

            const responseData = await response.json();
            
            // Extract content from Gemini API response format
            if (responseData.candidates && responseData.candidates[0] && responseData.candidates[0].content) {
                return responseData.candidates[0].content.parts[0].text;
            }
            
            return responseData;

        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('İnternet bağlantısı hatası. Lütfen bağlantınızı kontrol edin.');
            }
            throw error;
        }
    }

    /**
     * Process and validate API response
     */
    processAPIResponse(response) {
        stateManager.setLoading(true, 'Yanıt işleniyor...');

        try {
            // Parse JSON content if it's a string
            let parsedContent;
            if (typeof response === 'string') {
                parsedContent = this.safeJsonParse(response);
            } else {
                parsedContent = response;
            }

            // Validate response structure
            const validation = APIValidator.validateApiResponse(parsedContent);

            if (!validation.valid) {
                console.warn('API response validation errors:', validation.errors);
                console.warn('API response warnings:', validation.warnings);

                // Use corrected response if available
                if (validation.correctedResponse) {
                    console.log('Using auto-corrected response');
                    return validation.correctedResponse;
                } else {
                    throw new Error(`Yanıt doğrulama başarısız: ${validation.errors.join(', ')}`);
                }
            }

            // Log warnings if any
            if (validation.warnings.length > 0) {
                console.warn('API response warnings:', validation.warnings);
            }

            return parsedContent;
        } catch (error) {
            console.error('Response processing error:', error);
            throw error;
        }
    }

    /**
     * Safe JSON parsing with markdown cleanup
     */
    safeJsonParse(text) {
        try {
            let cleaned = text.trim();
            
            // Remove markdown code blocks (```json and ```)
            cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
            cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
            
            // Extract JSON from the response if it contains extra text
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                cleaned = jsonMatch[0];
            } else {
                throw new Error('JSON yapısı bulunamadı');
            }
            
            // Fix common JSON issues
            cleaned = cleaned
                .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
                .replace(/\\n/g, '\\\\n') // Fix newline escapes
                .replace(/\\"/g, '\\\\"') // Fix quote escapes
                .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters
            
            return JSON.parse(cleaned);
            
        } catch (parseError) {
            console.error('JSON parse error:', parseError.message);
            console.error('Original text:', text);
            throw new Error(`JSON parse başarısız: ${parseError.message}`);
        }
    }

    /**
     * Extract content from API response
     */
    extractResponseContent(response) {
        // Handle different response formats
        if (typeof response === 'string') {
            return response;
        }

        if (response && typeof response === 'object') {
            // Check common content fields
            const contentFields = ['content', 'data', 'result', 'response', 'text'];
            
            for (const field of contentFields) {
                if (response[field]) {
                    return response[field];
                }
            }

            // If no content field found, assume the entire response is the content
            return response;
        }

        throw new Error('Geçersiz API yanıtı formatı');
    }

    /**
     * Update user query count
     */
    async updateQueryCount() {
        try {
            const userData = stateManager.getState('user');
            if (!userData) {
                console.warn('No user data available for query count update');
                return;
            }

            // Don't update if using fallback user
            if (userData.uid === 'fallback-user') {
                console.log('Skipping query count update for fallback user');
                return;
            }

            const newCount = (userData.dailyQueryCount || 0) + 1;
            
            await FirestoreManager.updateUserQueryCount(userData.uid, newCount);
            
            // Update local state
            stateManager.setState('user.dailyQueryCount', newCount);
            console.log(`Query count updated: ${newCount}`);
            
        } catch (error) {
            console.error('Query count update error:', error);
            // Don't throw error as the main operation succeeded
        }
    }

    /**
     * Store processing results in state
     */
    storeResults(processedResponse) {
        console.log('Storing results in state:', processedResponse);
        
        // Store problem summary
        if (processedResponse.problemOzeti) {
            stateManager.setState('problem.summary', processedResponse.problemOzeti);
        }

        // Store solution - This is the critical part that was missing!
        if (processedResponse.adimlar || processedResponse.solution) {
            // Handle both new format (adimlar) and old format (solution)
            const solution = processedResponse.solution || processedResponse;
            stateManager.setState('problem.solution', solution);
            
            // Also call the legacy setSolution method for compatibility
            stateManager.setSolution(solution);
            
            console.log('Solution stored in state:', solution);
        }

        // Store full response for debugging
        stateManager.setState('problem.fullResponse', processedResponse);

        // Reset current step
        stateManager.setState('problem.currentStep', 0);

        console.log('Question processing results stored in state');
        
        // Verify the solution was stored
        const storedSolution = stateManager.getState('problem.solution');
        console.log('Verification - solution in state:', storedSolution);
    }

    /**
     * Get processing status
     */
    isProcessing() {
        return this.processing;
    }

    /**
     * Cancel current processing (if possible)
     */
    cancelProcessing() {
        // Note: This is a placeholder as fetch doesn't support easy cancellation
        // In a real implementation, you'd use AbortController
        console.log('Processing cancellation requested');
        this.processing = false;
    }

    /**
     * Process question from uploaded image
     */
    async processImageQuestion(base64Data, prompt = null) {
        return this.processQuestion('image', base64Data, { prompt });
    }

    /**
     * Process question from canvas drawing
     */
    async processCanvasQuestion(canvasDataURL, prompt = null) {
        // Extract base64 data from data URL
        const base64Data = canvasDataURL.split(',')[1];
        return this.processQuestion('canvas', base64Data, { prompt });
    }

    /**
     * Process question from text input
     */
    async processTextQuestion(text, prompt = null) {
        return this.processQuestion('text', text, { prompt });
    }

    /**
     * Retry failed processing
     */
    async retryProcessing() {
        const problem = stateManager.getState('problem');
        if (!problem.source || !problem.sourceType) {
            throw new Error('Tekrar deneme için kaynak veri bulunamadı');
        }

        return this.processQuestion(problem.sourceType, problem.source);
    }
}

// Create and export singleton instance
export const questionProcessor = new QuestionProcessor();

if (typeof window !== 'undefined') {
    window.questionProcessor = questionProcessor;
}