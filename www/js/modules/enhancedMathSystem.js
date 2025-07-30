// =================================================================================
//  MathAi - Enhanced Math System - Complete Integration
//  Advanced Error-Free Mathematical Content Rendering System
// =================================================================================

import { enhancedMathRenderer } from './enhancedMathRenderer.js';
import { mathErrorHandler } from './mathErrorHandler.js';
import { turkishMathProcessor } from './turkishMathProcessor.js';
import { mathRenderTester } from './mathRenderTester.js';

/**
 * Enhanced Math System - Complete integrated system
 * Combines all advanced math rendering components into a unified, error-free system
 */
export class EnhancedMathSystem {
    constructor() {
        this.components = {
            renderer: enhancedMathRenderer,
            errorHandler: mathErrorHandler,
            turkishProcessor: turkishMathProcessor,
            tester: mathRenderTester
        };
        
        this.systemState = {
            initialized: false,
            healthy: true,
            lastHealthCheck: null,
            errorCount: 0,
            renderCount: 0,
            successRate: 100
        };
        
        this.configuration = {
            enableTurkishProcessing: true,
            enableErrorRecovery: true,
            enablePerformanceMonitoring: true,
            enableCaching: true,
            maxErrorsBeforeAlert: 10,
            healthCheckInterval: 60000, // 1 minute
            autoRecovery: true
        };
        
        this.observers = [];
        this.metrics = {
            renderTimes: [],
            errorTypes: new Map(),
            popularContent: new Map(),
            performanceHistory: []
        };
        
        this.initializeSystem();
    }
    
    /**
     * Initialize the complete math system
     */
    async initializeSystem() {
        console.log('🚀 Enhanced Math System başlatılıyor...');
        
        try {
            // Initialize all components
            await this.initializeComponents();
            
            // Setup error handling integration
            this.setupErrorHandling();
            
            // Setup performance monitoring
            this.setupPerformanceMonitoring();
            
            // Setup health monitoring
            this.setupHealthMonitoring();
            
            // Run system validation
            await this.validateSystem();
            
            this.systemState.initialized = true;
            this.systemState.lastHealthCheck = Date.now();
            
            console.log('✅ Enhanced Math System hazır ve sağlıklı');
            this.notifyObservers('system_ready', this.getSystemStatus());
            
        } catch (error) {
            console.error('❌ Enhanced Math System başlatma hatası:', error);
            this.systemState.healthy = false;
            throw error;
        }
    }
    
    /**
     * Initialize all system components
     */
    async initializeComponents() {
        // Renderer is already initialized in its constructor
        // Just ensure it's ready
        if (!this.components.renderer.engines.mathJax.ready && 
            !this.components.renderer.engines.katex.ready) {
            console.log('⏳ Render motorları bekleniyor...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log('✅ Tüm bileşenler hazır');
    }
    
    /**
     * Setup integrated error handling
     */
    setupErrorHandling() {
        // Override renderer's error handling to use our advanced error handler
        const originalRender = this.components.renderer.render.bind(this.components.renderer);
        
        this.components.renderer.render = async (content, element, options = {}) => {
            try {
                const result = await originalRender(content, element, options);
                if (result) {
                    this.systemState.renderCount++;
                    this.updateSuccessRate(true);
                }
                return result;
            } catch (error) {
                this.systemState.errorCount++;
                this.updateSuccessRate(false);
                
                // Use advanced error handler for recovery
                const recoveryResult = await this.components.errorHandler.handleRenderError(
                    error, content, element, options
                );
                
                if (recoveryResult.success) {
                    this.systemState.renderCount++;
                    return true;
                }
                
                // Final fallback
                return false;
            }
        };
    }
    
    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
        if (!this.configuration.enablePerformanceMonitoring) return;
        
        // Wrap renderer to monitor performance
        const originalRender = this.components.renderer.render.bind(this.components.renderer);
        
        this.components.renderer.render = async (content, element, options = {}) => {
            const startTime = performance.now();
            
            try {
                const result = await originalRender(content, element, options);
                const renderTime = performance.now() - startTime;
                
                this.recordPerformanceMetric(content, renderTime, true);
                return result;
                
            } catch (error) {
                const renderTime = performance.now() - startTime;
                this.recordPerformanceMetric(content, renderTime, false);
                throw error;
            }
        };
    }
    
    /**
     * Setup health monitoring
     */
    setupHealthMonitoring() {
        setInterval(() => {
            this.performHealthCheck();
        }, this.configuration.healthCheckInterval);
    }
    
    /**
     * Main render function with full system integration
     */
    async render(content, element, options = {}) {
        if (!this.systemState.initialized) {
            throw new Error('Enhanced Math System not initialized');
        }
        
        if (!this.systemState.healthy) {
            console.warn('⚠️  System unhealthy, attempting auto-recovery');
            if (this.configuration.autoRecovery) {
                await this.attemptSystemRecovery();
            }
        }
        
        const enhancedOptions = {
            enableTurkishProcessing: this.configuration.enableTurkishProcessing,
            enableErrorRecovery: this.configuration.enableErrorRecovery,
            ...options
        };
        
        try {
            let processedContent = content;
            
            // Turkish processing if enabled
            if (enhancedOptions.enableTurkishProcessing && 
                this.components.turkishProcessor.containsTurkishMath(content)) {
                
                const turkishResult = this.components.turkishProcessor.processTurkishMathContent(
                    content, { preserveOriginal: false }
                );
                
                if (turkishResult.hasTurkishMath) {
                    processedContent = turkishResult.processedContent;
                    console.log('🇹🇷 Turkish processing applied:', turkishResult.conversions);
                }
            }
            
            // Render with enhanced system
            const renderResult = await this.components.renderer.render(
                processedContent, element, enhancedOptions
            );
            
            // Track popular content
            this.trackPopularContent(content);
            
            return renderResult;
            
        } catch (error) {
            console.error('System render error:', error);
            
            // Advanced error recovery if enabled
            if (enhancedOptions.enableErrorRecovery) {
                return await this.components.errorHandler.handleRenderError(
                    error, content, element, enhancedOptions
                );
            }
            
            throw error;
        }
    }
    
    /**
     * Render container with full system integration
     */
    async renderContainer(container, options = {}) {
        if (!container) return false;
        
        const elements = container.querySelectorAll('[data-latex], .smart-content, .math-content');
        const renderPromises = [];
        
        for (const element of elements) {
            const content = element.getAttribute('data-latex') || 
                           element.getAttribute('data-content') ||
                           element.textContent;
                           
            if (content) {
                renderPromises.push(
                    this.render(content, element, options).catch(error => {
                        console.warn('Container element render failed:', error);
                        return false;
                    })
                );
            }
        }
        
        const results = await Promise.allSettled(renderPromises);
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
        
        console.log(`📦 Container render: ${successCount}/${results.length} successful`);
        return successCount > 0;
    }
    
    /**
     * Run comprehensive system validation
     */
    async validateSystem() {
        console.log('🔍 System validation başlatılıyor...');
        
        const validationTests = [
            {
                name: 'Basic LaTeX rendering',
                content: '$x^2 + y^2 = z^2$',
                expectedType: 'math'
            },
            {
                name: 'Turkish text rendering',
                content: 'Bu bir matematik problemidir',
                expectedType: 'text'
            },
            {
                name: 'Mixed content rendering',
                content: 'Denklem $ax^2 + bx + c = 0$ şeklindedir',
                expectedType: 'mixed'
            },
            {
                name: 'Error recovery',
                content: '$\\invalidcommand{test}$',
                expectedType: 'error_recovery'
            }
        ];
        
        const results = [];
        
        for (const test of validationTests) {
            const element = document.createElement('div');
            document.body.appendChild(element);
            
            try {
                const result = await this.render(test.content, element, { 
                    fallbackToText: true,
                    timeout: 5000 
                });
                
                results.push({
                    name: test.name,
                    passed: result !== false,
                    hasContent: element.innerHTML.length > 0
                });
                
            } catch (error) {
                results.push({
                    name: test.name,
                    passed: false,
                    error: error.message
                });
            } finally {
                document.body.removeChild(element);
            }
        }
        
        const allPassed = results.every(r => r.passed);
        console.log('🎯 System validation:', allPassed ? 'PASSED' : 'FAILED', results);
        
        return { passed: allPassed, results };
    }
    
    /**
     * Run comprehensive system tests
     */
    async runSystemTests(options = {}) {
        console.log('🧪 Running comprehensive system tests...');
        
        const testOptions = {
            verbose: true,
            stopOnError: false,
            ...options
        };
        
        try {
            const testReport = await this.components.tester.runAllTests(this, testOptions);
            
            // Update system health based on test results
            const successRate = parseFloat(testReport.summary.successRate);
            this.systemState.healthy = successRate >= 80; // 80% success rate threshold
            
            console.log('📊 System test completed:', testReport.summary);
            return testReport;
            
        } catch (error) {
            console.error('❌ System test failed:', error);
            this.systemState.healthy = false;
            throw error;
        }
    }
    
    /**
     * Perform system health check
     */
    async performHealthCheck() {
        const healthMetrics = {
            timestamp: Date.now(),
            components: {},
            systemHealth: 'healthy',
            issues: []
        };
        
        try {
            // Check renderer health
            const rendererStats = this.components.renderer.getSystemStats();
            healthMetrics.components.renderer = {
                engines: rendererStats.engines,
                cacheSize: rendererStats.cache.size,
                errors: rendererStats.errors.count
            };
            
            // Check error handler health
            const errorStats = this.components.errorHandler.getErrorStats();
            healthMetrics.components.errorHandler = {
                totalErrors: errorStats.totalErrors,
                recentErrors: errorStats.recentErrors.length,
                topErrorType: errorStats.topErrorType
            };
            
            // Check Turkish processor health
            const turkishStats = this.components.turkishProcessor.getProcessingStats();
            healthMetrics.components.turkishProcessor = {
                conversions: turkishStats.conversions,
                cacheHitRate: turkishStats.hitRate,
                errors: turkishStats.errors
            };
            
            // Analyze health
            if (this.systemState.errorCount > this.configuration.maxErrorsBeforeAlert) {
                healthMetrics.systemHealth = 'degraded';
                healthMetrics.issues.push('High error count detected');
            }
            
            if (this.systemState.successRate < 80) {
                healthMetrics.systemHealth = 'unhealthy';
                healthMetrics.issues.push('Low success rate');
            }
            
            if (rendererStats.errors.count > 50) {
                healthMetrics.systemHealth = 'degraded';
                healthMetrics.issues.push('Renderer errors accumulating');
            }
            
            this.systemState.healthy = healthMetrics.systemHealth === 'healthy';
            this.systemState.lastHealthCheck = Date.now();
            
            // Record performance history
            this.metrics.performanceHistory.push({
                timestamp: Date.now(),
                successRate: this.systemState.successRate,
                errorCount: this.systemState.errorCount,
                renderCount: this.systemState.renderCount
            });
            
            // Maintain history size
            if (this.metrics.performanceHistory.length > 100) {
                this.metrics.performanceHistory = this.metrics.performanceHistory.slice(-100);
            }
            
            console.log('💓 Health check:', healthMetrics.systemHealth, healthMetrics.issues);
            
        } catch (error) {
            console.error('Health check failed:', error);
            healthMetrics.systemHealth = 'unhealthy';
            healthMetrics.issues.push(`Health check error: ${error.message}`);
            this.systemState.healthy = false;
        }
        
        this.notifyObservers('health_check', healthMetrics);
        return healthMetrics;
    }
    
    /**
     * Attempt system recovery
     */
    async attemptSystemRecovery() {
        console.log('🔧 Attempting system recovery...');
        
        try {
            // Reset components
            this.components.renderer.reset();
            this.components.errorHandler.reset();
            this.components.turkishProcessor.reset();
            
            // Reset system state
            this.systemState.errorCount = 0;
            this.systemState.renderCount = 0;
            this.systemState.successRate = 100;
            
            // Re-validate system
            const validation = await this.validateSystem();
            this.systemState.healthy = validation.passed;
            
            if (this.systemState.healthy) {
                console.log('✅ System recovery successful');
                this.notifyObservers('recovery_success', this.getSystemStatus());
            } else {
                console.error('❌ System recovery failed');
                this.notifyObservers('recovery_failed', this.getSystemStatus());
            }
            
        } catch (error) {
            console.error('Recovery attempt failed:', error);
            this.systemState.healthy = false;
        }
    }
    
    /**
     * Helper methods
     */
    updateSuccessRate(success) {
        const recentRenders = Math.min(this.systemState.renderCount, 100);
        const recentSuccesses = recentRenders * (this.systemState.successRate / 100);
        const newSuccesses = recentSuccesses + (success ? 1 : 0);
        this.systemState.successRate = (newSuccesses / (recentRenders + 1)) * 100;
    }
    
    recordPerformanceMetric(content, renderTime, success) {
        this.metrics.renderTimes.push(renderTime);
        
        // Keep only recent metrics
        if (this.metrics.renderTimes.length > 1000) {
            this.metrics.renderTimes = this.metrics.renderTimes.slice(-1000);
        }
    }
    
    trackPopularContent(content) {
        const key = content.substring(0, 50); // Limit key length
        const current = this.metrics.popularContent.get(key) || 0;
        this.metrics.popularContent.set(key, current + 1);
        
        // Keep only top 100 popular items
        if (this.metrics.popularContent.size > 100) {
            const entries = Array.from(this.metrics.popularContent.entries());
            entries.sort((a, b) => b[1] - a[1]);
            this.metrics.popularContent = new Map(entries.slice(0, 100));
        }
    }
    
    /**
     * Observer pattern for system events
     */
    addObserver(observer) {
        this.observers.push(observer);
    }
    
    removeObserver(observer) {
        const index = this.observers.indexOf(observer);
        if (index > -1) {
            this.observers.splice(index, 1);
        }
    }
    
    notifyObservers(event, data) {
        this.observers.forEach(observer => {
            try {
                observer(event, data);
            } catch (error) {
                console.warn('Observer notification failed:', error);
            }
        });
    }
    
    /**
     * Get comprehensive system status
     */
    getSystemStatus() {
        const avgRenderTime = this.metrics.renderTimes.length > 0 ?
            this.metrics.renderTimes.reduce((sum, time) => sum + time, 0) / this.metrics.renderTimes.length : 0;
        
        return {
            initialized: this.systemState.initialized,
            healthy: this.systemState.healthy,
            lastHealthCheck: this.systemState.lastHealthCheck,
            errorCount: this.systemState.errorCount,
            renderCount: this.systemState.renderCount,
            successRate: this.systemState.successRate.toFixed(2) + '%',
            averageRenderTime: avgRenderTime.toFixed(2) + 'ms',
            components: {
                renderer: this.components.renderer.getSystemStats(),
                errorHandler: this.components.errorHandler.getErrorStats(),
                turkishProcessor: this.components.turkishProcessor.getProcessingStats()
            },
            configuration: this.configuration
        };
    }
    
    /**
     * Update system configuration
     */
    updateConfiguration(newConfig) {
        this.configuration = { ...this.configuration, ...newConfig };
        console.log('⚙️  System configuration updated:', newConfig);
        this.notifyObservers('config_updated', this.configuration);
    }
    
    /**
     * Export system analytics
     */
    exportAnalytics() {
        return {
            timestamp: Date.now(),
            systemStatus: this.getSystemStatus(),
            performanceHistory: this.metrics.performanceHistory,
            popularContent: Array.from(this.metrics.popularContent.entries()),
            renderTimeDistribution: this.getRenderTimeDistribution()
        };
    }
    
    getRenderTimeDistribution() {
        const times = this.metrics.renderTimes;
        if (times.length === 0) return {};
        
        times.sort((a, b) => a - b);
        return {
            min: times[0],
            max: times[times.length - 1],
            median: times[Math.floor(times.length / 2)],
            p95: times[Math.floor(times.length * 0.95)],
            p99: times[Math.floor(times.length * 0.99)]
        };
    }
}

// Create singleton instance
export const enhancedMathSystem = new EnhancedMathSystem();

// Global access for debugging and integration
window.enhancedMathSystem = enhancedMathSystem;

// Backward compatibility exports
export const mathRenderer = {
    render: (content, element, displayMode) => 
        enhancedMathSystem.render(content, element, { displayMode }),
    renderContainer: (container, displayMode) => 
        enhancedMathSystem.renderContainer(container, { displayMode }),
    getStats: () => enhancedMathSystem.getSystemStatus()
};