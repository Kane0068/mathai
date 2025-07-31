// www/js/utils/ApiBridge.js
// Bridge to connect old makeApiCall function with new QuestionProcessor

import { questionProcessor } from '../services/QuestionProcessor.js';
import { APP_CONFIG } from '../core/Config.js';

/**
 * Legacy makeApiCall function that works with the old codebase
 * This maintains compatibility while using the new architecture
 */
export async function makeApiCall(payload) {
    try {
        console.log('Legacy makeApiCall called with payload:', payload);
        
        // Use the new QuestionProcessor's API call method directly
        const response = await fetch(APP_CONFIG.api.gemini.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const content = data.candidates[0].content.parts[0].text;
            
            try {
                // Use the same JSON parsing logic as the new system
                const parsedContent = safeJsonParse(content);
                return parsedContent;
                
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                throw new Error(`Response processing error: ${parseError.message}`);
            }
        }
        
        throw new Error('Invalid API response - content not found');
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
}

/**
 * Safe JSON parsing (copy from QuestionProcessor)
 */
function safeJsonParse(text) {
    try {
        let cleaned = text.trim();
        
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleaned = jsonMatch[0];
        } else {
            throw new Error('JSON structure not found');
        }
        
        cleaned = cleaned
            .replace(/,(\s*[}\]])/g, '$1')
            .replace(/\\n/g, '\\\\n')
            .replace(/\\"/g, '\\\\"')
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        
        return JSON.parse(cleaned);
        
    } catch (parseError) {
        console.error('JSON parse error:', parseError.message);
        throw new Error(`JSON parse failed: ${parseError.message}`);
    }
}

// Make it available globally for old modules that expect it
if (typeof window !== 'undefined') {
    window.makeApiCall = makeApiCall;
}