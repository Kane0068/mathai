// =================================================================================
//  Configuration Management System
//  Centralizes all app configuration and environment variables
// =================================================================================

export class ConfigManager {
    constructor() {
        this.config = {
            // API Configuration
            api: {
                gemini: {
                    key: "AIzaSyDbjH9TXIFLxWH2HuYJlqIFO7Alhk1iQQs",
                    baseUrl: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
                    timeout: 30000,
                    retryAttempts: 3
                }
            },
            
            // UI Configuration
            ui: {
                animation: {
                    stepDelay: 1500,
                    loadingTimeout: 3000
                },
                canvas: {
                    maxSize: 2048,
                    quality: 0.8,
                    strokeWidth: 3
                },
                render: {
                    timeout: 5000,
                    batchSize: 5,
                    cacheEnabled: true
                }
            },
            
            // Smart Guide Configuration
            smartGuide: {
                maxAttemptsPerStep: 3,
                minStepsRequired: 2,
                finalAnswerEarlyThreshold: 0.7,
                maxConsecutiveFinalAnswers: 2,
                adaptiveDifficulty: true
            },
            
            // Error Handling Configuration
            errorHandling: {
                maxRetries: 3,
                retryDelay: 1000,
                enableLogging: true,
                enableUserFeedback: true
            },
            
            // Performance Configuration
            performance: {
                cacheSize: 100,
                cleanupInterval: 300000, // 5 minutes
                maxMemoryUsage: 50 * 1024 * 1024 // 50MB
            }
        };
        
        this.observers = new Set();
        this.environment = this.detectEnvironment();
        this.loadEnvironmentConfig();
    }
    
    detectEnvironment() {
        if (typeof process !== 'undefined' && process.env) {
            return process.env.NODE_ENV || 'development';
        }
        
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            return 'development';
        }
        
        return 'production';
    }
    
    loadEnvironmentConfig() {
        if (this.environment === 'development') {
            this.config.errorHandling.enableLogging = true;
            this.config.api.gemini.timeout = 60000; // Longer timeout for dev
        } else {
            this.config.errorHandling.enableLogging = false;
            this.config.performance.cacheSize = 200; // More cache in prod
        }
    }
    
    get(path) {
        return this.getNestedValue(this.config, path);
    }
    
    set(path, value) {
        this.setNestedValue(this.config, path, value);
        this.notifyObservers(path, value);
    }
    
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key]) current[key] = {};
            return current[key];
        }, obj);
        target[lastKey] = value;
    }
    
    subscribe(callback) {
        this.observers.add(callback);
        return () => this.observers.delete(callback);
    }
    
    notifyObservers(path, value) {
        this.observers.forEach(callback => {
            try {
                callback(path, value);
            } catch (error) {
                console.error('Config observer error:', error);
            }
        });
    }
    
    // Convenience methods for common configurations
    getApiKey(service = 'gemini') {
        return this.get(`api.${service}.key`);
    }
    
    getApiUrl(service = 'gemini') {
        const baseUrl = this.get(`api.${service}.baseUrl`);
        const key = this.getApiKey(service);
        return `${baseUrl}?key=${key}`;
    }
    
    isDebugMode() {
        return this.environment === 'development';
    }
    
    // Validation
    validate() {
        const requiredPaths = [
            'api.gemini.key',
            'api.gemini.baseUrl'
        ];
        
        const missing = requiredPaths.filter(path => !this.get(path));
        
        if (missing.length > 0) {
            throw new Error(`Missing required configuration: ${missing.join(', ')}`);
        }
        
        return true;
    }
    
    // Export/Import for testing
    export() {
        return JSON.parse(JSON.stringify(this.config));
    }
    
    import(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.notifyObservers('*', this.config);
    }
}

// Singleton instance
export const config = new ConfigManager();

// Validate configuration on load
try {
    config.validate();
} catch (error) {
    console.error('Configuration validation failed:', error);
}