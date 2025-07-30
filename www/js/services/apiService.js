// =================================================================================
//  API Service - Handles all external API communications
// =================================================================================

import { config } from '../core/config.js';

export class ApiService {
    constructor(errorHandler) {
        this.errorHandler = errorHandler;
        this.requestCache = new Map();
        this.rateLimiter = {
            requests: 0,
            lastReset: Date.now(),
            maxRequestsPerMinute: 60
        };
    }
    
    async makeApiCall(prompt, image = null, retries = 0) {
        try {
            // Rate limiting check
            this.checkRateLimit();
            
            // Cache check for text-only requests
            const cacheKey = this.getCacheKey(prompt, image);
            if (!image && this.requestCache.has(cacheKey)) {
                console.log('📦 Using cached response');
                return this.requestCache.get(cacheKey);
            }
            
            const requestBody = this.buildRequestBody(prompt, image);
            const response = await this.sendRequest(requestBody);
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            const result = this.extractResponseContent(data);
            
            // Cache successful text-only responses
            if (!image && result) {
                this.requestCache.set(cacheKey, result);
                this.cleanupCache();
            }
            
            return result;
            
        } catch (error) {
            console.error(`API call failed (attempt ${retries + 1}):`, error);
            
            const maxRetries = config.get('errorHandling.maxRetries');
            if (retries < maxRetries) {
                const delay = config.get('errorHandling.retryDelay') * (retries + 1);
                console.log(`⏳ Retrying in ${delay}ms...`);
                await this.delay(delay);
                return this.makeApiCall(prompt, image, retries + 1);
            }
            
            throw this.errorHandler.handleError(error, 'API_CALL_FAILED');
        }
    }
    
    checkRateLimit() {
        const now = Date.now();
        
        // Reset counter every minute
        if (now - this.rateLimiter.lastReset > 60000) {
            this.rateLimiter.requests = 0;
            this.rateLimiter.lastReset = now;
        }
        
        if (this.rateLimiter.requests >= this.rateLimiter.maxRequestsPerMinute) {
            throw new Error('Rate limit exceeded. Please wait a moment.');
        }
        
        this.rateLimiter.requests++;
    }
    
    getCacheKey(prompt, image) {
        const imageHash = image ? this.hashString(image) : 'no-image';
        return `${this.hashString(prompt)}_${imageHash}`;
    }
    
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }
    
    buildRequestBody(prompt, image) {
        const contents = [{
            parts: [{ text: prompt }]
        }];
        
        if (image) {
            // Extract base64 data and mime type
            const matches = image.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
                const [, mimeType, base64Data] = matches;
                contents[0].parts.push({
                    inline_data: {
                        mime_type: mimeType,
                        data: base64Data
                    }
                });
            }
        }
        
        return {
            contents,
            generationConfig: {
                temperature: 0.1,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH", 
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        };
    }
    
    async sendRequest(requestBody) {
        const url = config.getApiUrl('gemini');
        const timeout = config.get('api.gemini.timeout');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response;
            
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }
    
    extractResponseContent(data) {
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error('No response candidates found');
        }
        
        const candidate = data.candidates[0];
        
        if (candidate.finishReason === 'SAFETY') {
            throw new Error('Response blocked by safety filter');
        }
        
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            throw new Error('No content in response');
        }
        
        return candidate.content.parts[0].text;
    }
    
    cleanupCache() {
        const maxCacheSize = config.get('performance.cacheSize');
        
        if (this.requestCache.size > maxCacheSize) {
            const entries = Array.from(this.requestCache.entries());
            const toDelete = entries.slice(0, Math.floor(maxCacheSize * 0.3));
            
            toDelete.forEach(([key]) => {
                this.requestCache.delete(key);
            });
            
            console.log(`🧹 Cleaned up ${toDelete.length} cache entries`);
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Public methods for cache management
    clearCache() {
        this.requestCache.clear();
        console.log('🗑️ API cache cleared');
    }
    
    getCacheStats() {
        return {
            size: this.requestCache.size,
            maxSize: config.get('performance.cacheSize'),
            rateLimitRemaining: this.rateLimiter.maxRequestsPerMinute - this.rateLimiter.requests
        };
    }
    
    dispose() {
        this.clearCache();
    }
}