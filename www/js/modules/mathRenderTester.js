// =================================================================================
//  MathAi - Math Rendering Test Suite
//  Comprehensive Testing for Turkish + LaTeX Math Rendering
// =================================================================================

/**
 * Math Render Tester - Comprehensive testing suite for mathematical content rendering
 * Tests Turkish + LaTeX mixed content, error handling, and performance
 */
export class MathRenderTester {
    constructor() {
        this.testResults = [];
        this.currentTest = null;
        this.testStats = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            errors: 0
        };
        
        // Test categories
        this.testCategories = {
            BASIC_LATEX: 'basic_latex',
            COMPLEX_LATEX: 'complex_latex',
            TURKISH_TEXT: 'turkish_text',
            MIXED_CONTENT: 'mixed_content',
            ERROR_HANDLING: 'error_handling',
            PERFORMANCE: 'performance',
            EDGE_CASES: 'edge_cases'
        };
        
        // Test data sets
        this.testData = this.initializeTestData();
        
        // Performance benchmarks
        this.performanceBenchmarks = {
            basicRenderTime: 100, // ms
            complexRenderTime: 500, // ms
            mixedContentTime: 300, // ms
            errorRecoveryTime: 200 // ms
        };
    }
    
    /**
     * Initialize comprehensive test data
     */
    initializeTestData() {
        return {
            [this.testCategories.BASIC_LATEX]: [
                {
                    name: 'Simple equation',
                    input: '$x + y = 5$',
                    expected: 'rendered',
                    shouldContain: ['x', '+', 'y', '=', '5']
                },
                {
                    name: 'Fraction',
                    input: '$\\frac{a}{b} = c$',
                    expected: 'rendered',
                    shouldContain: ['fraction']
                },
                {
                    name: 'Square root',
                    input: '$\\sqrt{16} = 4$',
                    expected: 'rendered',
                    shouldContain: ['root']
                },
                {
                    name: 'Superscript',
                    input: '$x^2 + y^2 = z^2$',
                    expected: 'rendered',
                    shouldContain: ['sup']
                },
                {
                    name: 'Subscript',
                    input: '$a_1 + a_2 = a_3$',
                    expected: 'rendered',
                    shouldContain: ['sub']
                }
            ],
            
            [this.testCategories.COMPLEX_LATEX]: [
                {
                    name: 'Integral',
                    input: '$\\int_{0}^{\\infty} e^{-x} dx = 1$',
                    expected: 'rendered',
                    shouldContain: ['integral']
                },
                {
                    name: 'Sum notation',
                    input: '$\\sum_{i=1}^{n} x_i = S$',
                    expected: 'rendered',
                    shouldContain: ['sum']
                },
                {
                    name: 'Matrix',
                    input: '$\\begin{matrix} a & b \\\\ c & d \\end{matrix}$',
                    expected: 'rendered',
                    shouldContain: ['matrix']
                },
                {
                    name: 'Limit',
                    input: '$\\lim_{x \\to \\infty} \\frac{1}{x} = 0$',
                    expected: 'rendered',
                    shouldContain: ['limit']
                },
                {
                    name: 'Trigonometric',
                    input: '$\\sin^2(x) + \\cos^2(x) = 1$',
                    expected: 'rendered',
                    shouldContain: ['sin', 'cos']
                }
            ],
            
            [this.testCategories.TURKISH_TEXT]: [
                {
                    name: 'Pure Turkish text',
                    input: 'Bu bir matematik problemidir.',
                    expected: 'text',
                    shouldContain: ['Bu', 'matematik']
                },
                {
                    name: 'Turkish with numbers',
                    input: 'Beş artı üç eşittir sekiz.',
                    expected: 'text',
                    shouldContain: ['Beş', 'üç', 'sekiz']
                },
                {
                    name: 'Turkish math terminology',
                    input: 'Karekökünü alın ve sonucu bulun.',
                    expected: 'text',
                    shouldContain: ['Karekökünü', 'sonucu']
                },
                {
                    name: 'Turkish characters',
                    input: 'Üç değişkenli denklemin çözümü şöyledir.',
                    expected: 'text',
                    shouldContain: ['Üç', 'değişkenli', 'çözümü', 'şöyledir']
                }
            ],
            
            [this.testCategories.MIXED_CONTENT]: [
                {
                    name: 'Turkish text with inline math',
                    input: 'Denklem $x^2 + 3x + 2 = 0$ şeklindedir.',
                    expected: 'mixed',
                    shouldContain: ['Denklem', 'şeklindedir'],
                    shouldRenderMath: true
                },
                {
                    name: 'Multiple math expressions',
                    input: 'İlk değer $a = 5$, ikinci değer $b = 3$ olsun. Toplam $a + b = 8$ bulunur.',
                    expected: 'mixed',
                    shouldContain: ['İlk', 'değer', 'ikinci', 'Toplam'],
                    shouldRenderMath: true
                },
                {
                    name: 'Complex mixed content',
                    input: 'Integral $\\int_{0}^{1} x^2 dx$ hesaplandığında sonuç $\\frac{1}{3}$ çıkar.',
                    expected: 'mixed',
                    shouldContain: ['hesaplandığında', 'sonuç', 'çıkar'],
                    shouldRenderMath: true
                },
                {
                    name: 'Turkish question with math',
                    input: 'Aşağıdaki denklemi çözünüz: $2x + 5 = 11$',
                    expected: 'mixed',
                    shouldContain: ['Aşağıdaki', 'denklemi', 'çözünüz'],
                    shouldRenderMath: true
                }
            ],
            
            [this.testCategories.ERROR_HANDLING]: [
                {
                    name: 'Invalid LaTeX syntax',
                    input: '$\\invalidcommand{test}$',
                    expected: 'error_recovery',
                    shouldRecover: true
                },
                {
                    name: 'Unmatched delimiters',
                    input: '$x + y = 5',
                    expected: 'error_recovery',
                    shouldRecover: true
                },
                {
                    name: 'Empty math delimiters',
                    input: 'Test $$ content',
                    expected: 'error_recovery',
                    shouldRecover: true
                },
                {
                    name: 'Nested delimiters',
                    input: '$x + $y = 5$ + z$',
                    expected: 'error_recovery',
                    shouldRecover: true
                },
                {
                    name: 'Unicode characters',
                    input: 'Test with unicode: α β γ δ',
                    expected: 'text',
                    shouldContain: ['Test', 'unicode']
                }
            ],
            
            [this.testCategories.EDGE_CASES]: [
                {
                    name: 'Empty content',
                    input: '',
                    expected: 'empty',
                    shouldHandle: true
                },
                {
                    name: 'Only whitespace',
                    input: '   \n\t  ',
                    expected: 'empty',
                    shouldHandle: true
                },
                {
                    name: 'Very long content',
                    input: 'a'.repeat(10000) + '$x^2$' + 'b'.repeat(10000),
                    expected: 'mixed',
                    shouldHandle: true
                },
                {
                    name: 'Special characters',
                    input: 'Test @#$%^&*()_+ content',
                    expected: 'text',
                    shouldContain: ['Test', 'content']
                },
                {
                    name: 'HTML content',
                    input: '<script>alert("test")</script> $x + y$',
                    expected: 'mixed',
                    shouldSanitize: true
                }
            ],
            
            [this.testCategories.PERFORMANCE]: [
                {
                    name: 'Simple render performance',
                    input: '$x + y = 5$',
                    expected: 'performance',
                    maxTime: 100
                },
                {
                    name: 'Complex render performance',
                    input: '$\\int_{0}^{\\infty} \\sum_{n=1}^{\\infty} \\frac{x^n}{n!} dx$',
                    expected: 'performance',
                    maxTime: 500
                },
                {
                    name: 'Mixed content performance',
                    input: 'Bu denklem $\\frac{a}{b} = \\sqrt{c^2 + d^2}$ şeklindedir ve çözümü $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$ formülü ile bulunur.',
                    expected: 'performance',
                    maxTime: 300
                }
            ]
        };
    }
    
    /**
     * Run all tests
     */
    async runAllTests(renderer, options = {}) {
        console.log('🧪 Math Render Test Suite başlatılıyor...');
        
        const testOptions = {
            verbose: false,
            stopOnError: false,
            categories: Object.values(this.testCategories),
            ...options
        };
        
        this.resetStats();
        const startTime = Date.now();
        
        try {
            // Run tests by category
            for (const category of testOptions.categories) {
                console.log(`\n📂 Testing category: ${category}`);
                await this.runCategoryTests(category, renderer, testOptions);
            }
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            // Generate comprehensive report
            const report = this.generateTestReport(totalTime);
            
            if (testOptions.verbose) {
                console.log('\n📊 Test Results Summary:');
                console.table(this.testStats);
                console.log('\n📋 Detailed Report:', report);
            }
            
            return report;
            
        } catch (error) {
            console.error('❌ Test suite execution failed:', error);
            return {
                success: false,
                error: error.message,
                stats: this.testStats
            };
        }
    }
    
    /**
     * Run tests for a specific category
     */
    async runCategoryTests(category, renderer, options) {
        const tests = this.testData[category] || [];
        
        for (let i = 0; i < tests.length; i++) {
            const test = tests[i];
            const testId = `${category}_${i}`;
            
            try {
                console.log(`  🔬 Running: ${test.name}`);
                
                const result = await this.runSingleTest(test, testId, renderer, options);
                
                if (result.passed) {
                    console.log(`  ✅ ${test.name} - PASSED`);
                    this.testStats.passed++;
                } else {
                    console.log(`  ❌ ${test.name} - FAILED: ${result.reason}`);
                    this.testStats.failed++;
                    
                    if (options.stopOnError) {
                        throw new Error(`Test failed: ${test.name}`);
                    }
                }
                
            } catch (error) {
                console.error(`  💥 ${test.name} - ERROR:`, error.message);
                this.testStats.errors++;
                
                this.testResults.push({
                    testId,
                    category,
                    name: test.name,
                    passed: false,
                    error: error.message,
                    timestamp: Date.now()
                });
                
                if (options.stopOnError) {
                    throw error;
                }
            }
            
            this.testStats.total++;
        }
    }
    
    /**
     * Run a single test
     */
    async runSingleTest(test, testId, renderer, options) {
        const startTime = Date.now();
        let element = null;
        
        try {
            // Create test element
            element = document.createElement('div');
            element.id = `test-${testId}`;
            element.style.position = 'absolute';
            element.style.left = '-9999px';
            document.body.appendChild(element);
            
            // Perform the render
            const renderResult = await this.performRender(test, element, renderer);
            const endTime = Date.now();
            const renderTime = endTime - startTime;
            
            // Validate the result
            const validation = this.validateRenderResult(test, element, renderResult, renderTime);
            
            // Store test result
            const testResult = {
                testId,
                category: test.category,
                name: test.name,
                input: test.input,
                expected: test.expected,
                passed: validation.passed,
                reason: validation.reason,
                renderTime,
                renderResult,
                validation,
                timestamp: Date.now()
            };
            
            this.testResults.push(testResult);
            
            return testResult;
            
        } finally {
            // Clean up test element
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }
    }
    
    /**
     * Perform the actual render operation
     */
    async performRender(test, element, renderer) {
        const renderOptions = {
            displayMode: test.displayMode || false,
            priority: 'test',
            timeout: 5000
        };
        
        if (!renderer || typeof renderer.render !== 'function') {
            throw new Error('Invalid renderer provided');
        }
        
        return await renderer.render(test.input, element, renderOptions);
    }
    
    /**
     * Validate render result against test expectations
     */
    validateRenderResult(test, element, renderResult, renderTime) {
        const validation = {
            passed: false,
            reason: '',
            checks: {}
        };
        
        try {
            // Check if render was successful
            if (test.expected === 'rendered' || test.expected === 'mixed') {
                validation.checks.renderSuccess = renderResult === true;
                if (!validation.checks.renderSuccess) {
                    validation.reason = 'Render failed';
                    return validation;
                }
            }
            
            // Check if error recovery worked
            if (test.expected === 'error_recovery') {
                validation.checks.errorRecovery = element.innerHTML.length > 0;
                if (!validation.checks.errorRecovery) {
                    validation.reason = 'Error recovery failed';
                    return validation;
                }
            }
            
            // Check performance requirements
            if (test.expected === 'performance' && test.maxTime) {
                validation.checks.performance = renderTime <= test.maxTime;
                if (!validation.checks.performance) {
                    validation.reason = `Performance: ${renderTime}ms > ${test.maxTime}ms`;
                    return validation;
                }
            }
            
            // Check content requirements
            if (test.shouldContain) {
                const elementContent = element.textContent || element.innerHTML;
                validation.checks.contentCheck = test.shouldContain.every(item => 
                    elementContent.toLowerCase().includes(item.toLowerCase())
                );
                if (!validation.checks.contentCheck) {
                    validation.reason = 'Missing expected content';
                    return validation;
                }
            }
            
            // Check math rendering
            if (test.shouldRenderMath) {
                const hasMathElements = element.querySelector('.katex, .MathJax, .math-rendered') !== null;
                validation.checks.mathRendering = hasMathElements;
                if (!validation.checks.mathRendering) {
                    validation.reason = 'Math content not rendered';
                    return validation;
                }
            }
            
            // Check sanitization
            if (test.shouldSanitize) {
                const hasScriptTags = element.innerHTML.includes('<script>');
                validation.checks.sanitization = !hasScriptTags;
                if (!validation.checks.sanitization) {
                    validation.reason = 'Content not sanitized';
                    return validation;
                }
            }
            
            // Check empty content handling
            if (test.expected === 'empty') {
                validation.checks.emptyHandling = true; // Just that it didn't crash
            }
            
            // All checks passed
            validation.passed = Object.values(validation.checks).every(check => check !== false);
            if (!validation.passed && !validation.reason) {
                validation.reason = 'Some validation checks failed';
            }
            
        } catch (error) {
            validation.reason = `Validation error: ${error.message}`;
        }
        
        return validation;
    }
    
    /**
     * Run specific test by name
     */
    async runSpecificTest(testName, renderer, options = {}) {
        for (const [category, tests] of Object.entries(this.testData)) {
            const test = tests.find(t => t.name === testName);
            if (test) {
                console.log(`🎯 Running specific test: ${testName}`);
                return await this.runSingleTest(test, `specific_${testName}`, renderer, options);
            }
        }
        
        throw new Error(`Test not found: ${testName}`);
    }
    
    /**
     * Run performance benchmark tests
     */
    async runPerformanceBenchmarks(renderer) {
        console.log('⚡ Running performance benchmarks...');
        
        const benchmarks = [];
        const performanceTests = this.testData[this.testCategories.PERFORMANCE];
        
        for (const test of performanceTests) {
            const iterations = 10;
            const times = [];
            
            for (let i = 0; i < iterations; i++) {
                const startTime = Date.now();
                const element = document.createElement('div');
                document.body.appendChild(element);
                
                try {
                    await renderer.render(test.input, element);
                    const endTime = Date.now();
                    times.push(endTime - startTime);
                } finally {
                    document.body.removeChild(element);
                }
            }
            
            const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
            const minTime = Math.min(...times);
            const maxTime = Math.max(...times);
            
            benchmarks.push({
                name: test.name,
                averageTime: avgTime,
                minTime,
                maxTime,
                iterations,
                withinBenchmark: avgTime <= (test.maxTime || this.performanceBenchmarks.basicRenderTime)
            });
            
            console.log(`  📊 ${test.name}: avg=${avgTime.toFixed(2)}ms, min=${minTime}ms, max=${maxTime}ms`);
        }
        
        return benchmarks;
    }
    
    /**
     * Generate comprehensive test report
     */
    generateTestReport(totalTime) {
        const successRate = this.testStats.total > 0 ? 
            (this.testStats.passed / this.testStats.total * 100).toFixed(2) : 0;
        
        const categoryStats = {};
        this.testResults.forEach(result => {
            if (!categoryStats[result.category]) {
                categoryStats[result.category] = { passed: 0, failed: 0, total: 0 };
            }
            categoryStats[result.category].total++;
            if (result.passed) {
                categoryStats[result.category].passed++;
            } else {
                categoryStats[result.category].failed++;
            }
        });
        
        const failedTests = this.testResults.filter(result => !result.passed);
        const slowTests = this.testResults.filter(result => result.renderTime > 1000);
        
        return {
            summary: {
                totalTests: this.testStats.total,
                passed: this.testStats.passed,
                failed: this.testStats.failed,
                errors: this.testStats.errors,
                successRate: `${successRate}%`,
                totalTime: `${totalTime}ms`,
                averageTimePerTest: this.testStats.total > 0 ? `${(totalTime / this.testStats.total).toFixed(2)}ms` : '0ms'
            },
            categoryStats,
            failedTests: failedTests.map(test => ({
                name: test.name,
                category: test.category,
                reason: test.reason,
                input: test.input.substring(0, 100)
            })),
            slowTests: slowTests.map(test => ({
                name: test.name,
                renderTime: test.renderTime
            })),
            recommendations: this.generateRecommendations()
        };
    }
    
    /**
     * Generate recommendations based on test results
     */
    generateRecommendations() {
        const recommendations = [];
        
        const failureRate = this.testStats.total > 0 ? 
            (this.testStats.failed / this.testStats.total) : 0;
        
        if (failureRate > 0.1) {
            recommendations.push('Consider improving error handling - high failure rate detected');
        }
        
        const slowTests = this.testResults.filter(r => r.renderTime > 500);
        if (slowTests.length > 0) {
            recommendations.push('Optimize performance - some renders are taking too long');
        }
        
        const errorRecoveryTests = this.testResults.filter(r => 
            r.category === this.testCategories.ERROR_HANDLING && !r.passed
        );
        if (errorRecoveryTests.length > 0) {
            recommendations.push('Improve error recovery mechanisms');
        }
        
        const mixedContentTests = this.testResults.filter(r => 
            r.category === this.testCategories.MIXED_CONTENT && !r.passed
        );
        if (mixedContentTests.length > 0) {
            recommendations.push('Enhance mixed Turkish+LaTeX content handling');
        }
        
        return recommendations;
    }
    
    /**
     * Reset test statistics
     */
    resetStats() {
        this.testResults = [];
        this.testStats = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            errors: 0
        };
    }
    
    /**
     * Get test results
     */
    getTestResults() {
        return {
            results: this.testResults,
            stats: this.testStats
        };
    }
    
    /**
     * Export test results to JSON
     */
    exportResults() {
        return JSON.stringify({
            timestamp: Date.now(),
            results: this.testResults,
            stats: this.testStats,
            categories: this.testCategories
        }, null, 2);
    }
}

// Create singleton instance
export const mathRenderTester = new MathRenderTester();

// Global access for debugging and manual testing
window.mathRenderTester = mathRenderTester;