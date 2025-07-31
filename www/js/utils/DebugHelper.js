// www/js/utils/DebugHelper.js
// Debug utilities to test the question processing flow

export class DebugHelper {
    
    /**
     * Test the entire question processing flow with a mock question
     */
    static async testQuestionFlow() {
        console.log('🔍 Testing question processing flow...');
        
        try {
            // Import required modules
            const { stateManager } = await import('../modules/stateManager.js');
            const { questionProcessor } = await import('../services/QuestionProcessor.js');
            
            // Create a mock text question
            const mockQuestion = "2x + 5 = 15 denklemini çöz";
            
            console.log('1. Setting mock question in state...');
            stateManager.setState('problem.source', mockQuestion);
            stateManager.setState('problem.sourceType', 'text');
            
            console.log('2. Checking initial state...');
            stateManager.debugState();
            
            console.log('3. Processing question...');
            await questionProcessor.processQuestion('text', mockQuestion);
            
            console.log('4. Checking final state...');
            stateManager.debugState();
            
            const solution = stateManager.getState('problem.solution');
            if (solution) {
                console.log('✅ SUCCESS: Solution found in state!', solution);
                return true;
            } else {
                console.log('❌ FAILURE: No solution in state');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Test failed:', error);
            return false;
        }
    }
    
    /**
     * Test with a mock API response
     */
    static async testWithMockResponse() {
        console.log('🔍 Testing with mock API response...');
        
        const mockResponse = {
            problemOzeti: {
                verilenler: ["2x + 5 = 15 denklemi verilmiştir"],
                istenen: "x değerini bulun"
            },
            adimlar: [
                {
                    adimAciklamasi: "Denklemi sadeleştirin",
                    cozum_lateks: "$$2x + 5 = 15$$",
                    ipucu: "Her iki tarafa aynı işlemi uygulayın"
                },
                {
                    adimAciklamasi: "5'i karşı tarafa geçirin",
                    cozum_lateks: "$$2x = 15 - 5$$",
                    ipucu: "Çıkarma işlemi yapın"
                },
                {
                    adimAciklamasi: "İşlemi tamamlayın",
                    cozum_lateks: "$$2x = 10$$",
                    ipucu: "10'u 2'ye bölün"
                },
                {
                    adimAciklamasi: "x'i bulun",
                    cozum_lateks: "$$x = 5$$",
                    ipucu: "Sonucu kontrol edin"
                }
            ],
            sonuclar: ["x = 5"]
        };
        
        try {
            const { stateManager } = await import('../modules/stateManager.js');
            const { questionProcessor } = await import('../services/QuestionProcessor.js');
            
            console.log('1. Storing mock response...');
            questionProcessor.storeResults(mockResponse);
            
            console.log('2. Checking state...');
            stateManager.debugState();
            
            const solution = stateManager.getState('problem.solution');
            if (solution) {
                console.log('✅ SUCCESS: Mock solution stored!');
                return true;
            } else {
                console.log('❌ FAILURE: Mock solution not stored');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Mock test failed:', error);
            return false;
        }
    }
    
    /**
     * Check if buttons can access the solution
     */
    static async checkButtonAccess() {
        console.log('🔍 Checking button access to solution...');
        
        try {
            // Try multiple ways to access stateManager
            let stateManager;
            
            if (window.stateManager) {
                stateManager = window.stateManager;
                console.log('Using window.stateManager');
            } else if (window.app && window.app.getStateManager) {
                stateManager = window.app.getStateManager();
                console.log('Using app.getStateManager()');
            } else {
                // Import directly
                const { stateManager: importedStateManager } = await import('../modules/stateManager.js');
                stateManager = importedStateManager;
                console.log('Using imported stateManager');
            }
            
            const solution = stateManager.getState('problem.solution');
            
            console.log('Current solution in state:', solution);
            
            if (solution) {
                console.log('✅ Buttons should work - solution exists');
                console.log('Solution has adimlar:', !!solution.adimlar);
                console.log('Solution has problemOzeti:', !!solution.problemOzeti);
                return true;
            } else {
                console.log('❌ Buttons will show error - no solution');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Button access check failed:', error);
            return false;
        }
    }
    
    /**
     * Test file upload simulation with valid image
     */
    static simulateFileUpload() {
        console.log('🧪 Simulating file upload...');
        
        // Create a larger, valid test image (simple math equation image)
        // This is a valid base64 image that contains "2+2=?"
        const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFPSURBVBiVY2CgAzCysbIxMTMzM7GwsrCwsLKwsLGxsbOzs3NwcHBycnJxcXFzc3P38PD09PT29vb19fX39/cPCAgICg4ODgkJCQ0NDQsLC4+IiIiMjIyKioqOjo6JiYmNjY2Li4uPj09ISEhMTExKSkpOTk5JSUlNTU1LS0tPT8/IyMjMzMzKysrOzs7JycnNzc3Ly8vPzy8oKCgsLCwqKiouLi4pKSktLS0rKysrKysvLy+vqKioqKioqKioqampqamtra2tra2rq6urq6urq6urr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+vr6+v';
        
        // Extract just the base64 part (remove data:image/png;base64,)
        const base64Only = testImageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        
        try {
            // Simulate the file upload process
            window.stateManager.setState('problem.source', base64Only);
            window.stateManager.setState('problem.sourceType', 'image');
            
            // Check if it was stored
            const storedSource = window.stateManager.getState('problem.source');
            console.log('✅ Test image stored:', !!storedSource);
            
            // Now test the photo button
            if (window.app && window.app.getModule) {
                const uiManager = window.app.getModule('uiManager');
                if (uiManager) {
                    console.log('🧪 Triggering photo processing...');
                    uiManager.handleStartFromPhoto();
                } else {
                    console.log('❌ UIManager not found');
                }
            } else {
                console.log('❌ App not found');
            }
            
        } catch (error) {
            console.error('❌ File upload simulation failed:', error);
        }
    }

    /**
     * Test with text instead of image to avoid image validation issues
     */
    static async testWithTextInput() {
        console.log('🧪 Testing with text input...');
        
        try {
            // Set text input
            const testText = "2x + 5 = 15 denklemini çöz";
            window.stateManager.setState('problem.source', testText);
            window.stateManager.setState('problem.sourceType', 'text');
            
            console.log('🧪 Text stored, triggering processing...');
            
            // Get UIManager and process
            const uiManager = window.app.getModule('uiManager');
            if (uiManager) {
                await uiManager.processQuestion('text');
                console.log('✅ Text processing completed');
            } else {
                console.log('❌ UIManager not found');
            }
            
        } catch (error) {
            console.error('❌ Text input test failed:', error);
        }
    }

    /**
     * Test direct API call
     */
    static async testDirectApiCall() {
        console.log('🧪 Testing direct API call...');
        
        try {
            // Import the config
            const { APP_CONFIG, API_PROMPTS } = await import('../core/Config.js');
            
            console.log('🧪 Config loaded');
            console.log('🧪 API Endpoint:', APP_CONFIG.api.gemini.endpoint);
            
            // Prepare a simple text request
            const promptText = API_PROMPTS.masterSolution.replace('{PROBLEM_CONTEXT}', '2 + 2 = ?');
            
            const requestData = {
                contents: [{
                    role: "user",
                    parts: [{ text: promptText }]
                }]
            };
            
            console.log('🧪 Making direct API call...');
            
            const response = await fetch(APP_CONFIG.api.gemini.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            
            console.log('🧪 Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('🧪 API Error:', errorText);
                return false;
            }
            
            const responseData = await response.json();
            console.log('🧪 API Response:', responseData);
            
            if (responseData.candidates && responseData.candidates[0] && responseData.candidates[0].content) {
                const content = responseData.candidates[0].content.parts[0].text;
                console.log('🧪 Response content:', content.substring(0, 200) + '...');
                
                try {
                    // Clean up markdown-wrapped JSON
                    let cleanContent = content.trim();
                    cleanContent = cleanContent.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
                    cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
                    
                    const parsed = JSON.parse(cleanContent);
                    console.log('✅ API call successful and JSON parsed');
                    console.log('✅ Parsed response:', parsed);
                    return parsed;
                } catch (parseError) {
                    console.log('❌ JSON parse failed:', parseError);
                    console.log('Raw content:', content);
                    return content;
                }
            }
            
        } catch (error) {
            console.error('🧪 Direct API test failed:', error);
            return false;
        }
    }

    /**
     * Test the complete flow step by step
     */
    static async testCompleteFlow() {
        console.log('🧪 Testing complete flow step by step...');
        
        try {
            // Step 1: Test image storage
            console.log('Step 1: Testing image storage...');
            const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAJMAnIAaAAAAABJRU5ErkJggg==';
            window.stateManager.setState('problem.source', testImageBase64);
            window.stateManager.setState('problem.sourceType', 'image');
            
            const storedSource = window.stateManager.getState('problem.source');
            if (!storedSource) {
                console.log('❌ Step 1 failed: Image not stored');
                return false;
            }
            console.log('✅ Step 1 passed: Image stored');
            
            // Step 2: Test QuestionProcessor creation
            console.log('Step 2: Testing QuestionProcessor creation...');
            const { QuestionProcessor } = await import('../services/QuestionProcessor.js');
            const processor = new QuestionProcessor();
            console.log('✅ Step 2 passed: QuestionProcessor created');
            
            // Step 3: Test direct processing
            console.log('Step 3: Testing question processing...');
            const result = await processor.processQuestion('image', testImageBase64);
            console.log('✅ Step 3 result:', result);
            
            // Step 4: Check if solution is stored
            const solution = window.stateManager.getState('problem.solution');
            if (!solution) {
                console.log('❌ Step 4 failed: Solution not stored');
                return false;
            }
            console.log('✅ Step 4 passed: Solution stored');
            
            return true;
            
        } catch (error) {
            console.error('❌ Complete flow test failed at step:', error);
            return false;
        }
    }
    static async checkAllComponents() {
        console.log('🔍 Checking all critical components...');
        
        const checks = {
            app: !!window.app,
            stateManager: !!window.stateManager,
            uiManager: !!(window.app && window.app.getModule && window.app.getModule('uiManager')),
            questionProcessor: true, // Will check during import
            apiKey: true, // Will check during config import
        };
        
        try {
            // Check QuestionProcessor
            const { questionProcessor } = await import('../services/QuestionProcessor.js');
            checks.questionProcessor = !!questionProcessor;
        } catch (error) {
            checks.questionProcessor = false;
            console.error('QuestionProcessor import failed:', error);
        }
        
        try {
            // Check API configuration
            const { APP_CONFIG } = await import('../core/Config.js');
            checks.apiKey = !!APP_CONFIG.api.gemini.apiKey;
            checks.apiEndpoint = !!APP_CONFIG.api.gemini.endpoint;
        } catch (error) {
            checks.apiKey = false;
            console.error('Config import failed:', error);
        }
        
        console.table(checks);
        
        const allOk = Object.values(checks).every(Boolean);
        console.log(allOk ? '✅ All components OK' : '❌ Some components missing');
        
        return checks;
    }
    static async forceTestSolution() {
        console.log('🔧 Force setting test solution...');
        
        const testSolution = {
            problemOzeti: {
                verilenler: ["Test problemi"],
                istenen: "Test sonucu"
            },
            adimlar: [
                {
                    adimAciklamasi: "Test adımı",
                    cozum_lateks: "$x = 1$",
                    ipucu: "Test ipucu"
                }
            ],
            sonuclar: ["Test sonuç"]
        };
        
        try {
            // Try multiple ways to access stateManager
            let stateManager;
            
            if (window.stateManager) {
                stateManager = window.stateManager;
                console.log('Using window.stateManager');
            } else if (window.app && window.app.getStateManager) {
                stateManager = window.app.getStateManager();
                console.log('Using app.getStateManager()');
            } else {
                // Import directly
                const { stateManager: importedStateManager } = await import('../modules/stateManager.js');
                stateManager = importedStateManager;
                console.log('Using imported stateManager');
            }
            
            stateManager.setState('problem.solution', testSolution);
            if (stateManager.setSolution) {
                stateManager.setSolution(testSolution);
            }
            
            console.log('✅ Test solution forced into state');
            console.log('Now try clicking the buttons!');
            
            // Verify it was set
            const verification = stateManager.getState('problem.solution');
            console.log('Verification - solution in state:', verification);
            
            return true;
            
        } catch (error) {
            console.error('❌ Force test failed:', error);
            return false;
        }
    }
}

// Make available globally for console debugging
if (typeof window !== 'undefined') {
    window.DebugHelper = DebugHelper;
}