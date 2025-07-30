/**
 * FIXED MODULE EXPORTS AND STATE MANAGEMENT
 * 
 * This file fixes the module export/import issues and provides
 * a centralized way to manage all modules and their states.
 * 
 * Key Fixes:
 * 1. Consistent export/import patterns
 * 2. Singleton management
 * 3. Module dependency resolution
 * 4. State synchronization
 * 5. Error recovery mechanisms
 */

// === FIXED STATE MANAGER ===
export class FixedStateManager {
    constructor() {
        this.state = {
            user: null,
            problem: { solution: null },
            ui: { 
                view: 'setup', 
                isLoading: false, 
                error: null, 
                inputMode: 'photo', 
                handwritingInputType: 'canvas',
                interactiveStep: 0 
            }
        };
        
        this.subscribers = new Set();
        this.middleware = [this.loggerMiddleware.bind(this)];
        this.isDispatching = false;
        this.backupStates = [];
        this.maxBackups = 5;
    }
    
    subscribe(callback) {
        if (typeof callback !== 'function') {
            console.error('❌ State subscriber must be a function');
            return () => {};
        }
        
        this.subscribers.add(callback);
        
        // Send initial state
        try {
            callback(this.state);
        } catch (error) {
            console.error('❌ Subscriber callback error:', error);
            this.subscribers.delete(callback);
        }
        
        // Return unsubscribe function
        return () => this.subscribers.delete(callback);
    }
    
    dispatch(action) {
        if (this.isDispatching) {
            console.warn('⚠️ Cannot dispatch while dispatching');
            return;
        }
        
        if (!action || typeof action !== 'object' || !action.type) {
            console.error('❌ Invalid action:', action);
            return;
        }
        
        this.isDispatching = true;
        
        try {
            const prevState = this.state;
            
            // Create backup
            this.createBackup();
            
            // Apply reducer
            const newState = this.reducer(prevState, action);
            
            // Check if state actually changed
            if (newState === prevState) {
                this.isDispatching = false;
                return;
            }
            
            // Apply middleware
            this.middleware.forEach(mw => {
                try {
                    mw(action, prevState, newState);
                } catch (mwError) {
                    console.error('❌ Middleware error:', mwError);
                }
            });
            
            this.state = newState;
            
            // Notify subscribers
            this.notifySubscribers(newState);
            
        } catch (error) {
            console.error('❌ Dispatch error:', error);
            this.handleDispatchError(error, action);
        } finally {
            this.isDispatching = false;
        }
    }
    
    reducer(state, action) {
        try {
            const newUser = this.userReducer(state.user, action);
            const newProblem = this.problemReducer(state.problem, action);
            const newUi = this.uiReducer(state.ui, action);
            
            // Only create new state if something changed
            if (state.user === newUser && state.problem === newProblem && state.ui === newUi) {
                return state;
            }
            
            return { 
                user: newUser, 
                problem: newProblem, 
                ui: newUi 
            };
        } catch (error) {
            console.error('❌ Reducer error:', error);
            return state;
        }
    }
    
    userReducer(state, action) {
        switch (action.type) {
            case 'SET_USER':
                return action.payload;
            case 'UPDATE_USER':
                return state ? { ...state, ...action.payload } : action.payload;
            case 'RESET':
                return null;
            default:
                return state;
        }
    }
    
    problemReducer(state, action) {
        switch (action.type) {
            case 'SET_SOLUTION':
                return { ...state, solution: action.payload };
            case 'CLEAR_SOLUTION':
                return { ...state, solution: null };
            case 'RESET':
                return { solution: null };
            default:
                return state;
        }
    }
    
    uiReducer(state, action) {
        switch (action.type) {
            case 'SET_VIEW':
                return state.view === action.payload ? state : { ...state, view: action.payload };
            case 'SET_INPUT_MODE':
                return state.inputMode === action.payload ? state : { ...state, inputMode: action.payload };
            case 'SET_HANDWRITING_INPUT_TYPE':
                return state.handwritingInputType === action.payload ? state : { ...state, handwritingInputType: action.payload };
            case 'SET_LOADING':
                const { status, message = '' } = action.payload;
                if (state.isLoading === status && state.loadingMessage === message) return state;
                return { ...state, isLoading: status, loadingMessage: message };
            case 'SET_ERROR':
                return { ...state, isLoading: false, error: action.payload, errorTimestamp: Date.now() };
            case 'CLEAR_ERROR':
                return state.error === null ? state : { ...state, error: null, errorTimestamp: null };
            case 'SET_INTERACTIVE_STEP':
                return { ...state, interactiveStep: action.payload };
            case 'NEXT_INTERACTIVE_STEP':
                return { ...state, interactiveStep: state.interactiveStep + 1 };
            case 'RESET':
                return { 
                    view: 'setup', 
                    isLoading: false, 
                    error: null, 
                    inputMode: 'photo', 
                    handwritingInputType: 'canvas',
                    interactiveStep: 0,
                    errorTimestamp: null,
                    loadingMessage: ''
                };
            default:
                return state;
        }
    }
    
    loggerMiddleware(action, prevState, newState) {
        if (action.type === 'SET_LOADING' && !newState.ui.isLoading) {
            // Don't log loading end states to reduce noise
            return;
        }
        
        console.group(`%cState Action: %c${action.type}`, 'color: gray;', 'color: blue; font-weight: bold;');
        console.log('%cPayload:', 'color: #9E9E9E;', action.payload);
        console.log('%cPrevious State:', 'color: #FF9800;', prevState);
        console.log('%cNew State:', 'color: #4CAF50;', newState);
        console.groupEnd();
    }
    
    notifySubscribers(newState) {
        const subscribersToRemove = [];
        
        this.subscribers.forEach(callback => {
            try {
                callback(newState);
            } catch (error) {
                console.error('❌ Subscriber notification error:', error);
                subscribersToRemove.push(callback);
            }
        });
        
        // Remove failed subscribers
        subscribersToRemove.forEach(callback => {
            this.subscribers.delete(callback);
        });
    }
    
    createBackup() {
        try {
            const backup = {
                state: JSON.parse(JSON.stringify(this.state)),
                timestamp: Date.now(),
                id: `backup_${Date.now()}`
            };
            
            this.backupStates.push(backup);
            
            // Limit backup count
            if (this.backupStates.length > this.maxBackups) {
                this.backupStates.shift();
            }
        } catch (error) {
            console.error('❌ Backup creation failed:', error);
        }
    }
    
    restoreFromBackup(backupId = null) {
        try {
            let backup;
            if (backupId) {
                backup = this.backupStates.find(b => b.id === backupId);
            } else {
                backup = this.backupStates[this.backupStates.length - 1];
            }
            
            if (!backup) {
                throw new Error('No backup found');
            }
            
            this.state = backup.state;
            this.notifySubscribers(this.state);
            
            console.log(`✅ State restored from backup: ${backup.id}`);
            return true;
        } catch (error) {
            console.error('❌ State restoration failed:', error);
            return false;
        }
    }
    
    handleDispatchError(error, action) {
        console.error('❌ Dispatch error for action:', action.type, error);
        
        // Try to restore from backup
        if (this.backupStates.length > 0) {
            console.log('🔄 Attempting to restore from backup...');
            this.restoreFromBackup();
        }
    }
    
    // Action creators with validation
    setUser = (user) => {
        if (!user || typeof user !== 'object') {
            console.error('❌ Invalid user data:', user);
            return;
        }
        this.dispatch({ type: 'SET_USER', payload: user });
    };
    
    setSolution = (solutionData) => {
        if (!solutionData) {
            console.error('❌ Invalid solution data:', solutionData);
            return;
        }
        this.dispatch({ type: 'SET_SOLUTION', payload: solutionData });
    };
    
    setLoading = (status, message = '') => {
        this.dispatch({ type: 'SET_LOADING', payload: { status, message } });
    };
    
    setError = (errorMessage) => {
        this.dispatch({ type: 'SET_ERROR', payload: errorMessage });
    };
    
    clearError = () => {
        this.dispatch({ type: 'CLEAR_ERROR' });
    };
    
    setView = (view) => {
        const validViews = ['setup', 'summary', 'solving', 'fullSolution', 'interactive'];
        if (!validViews.includes(view)) {
            console.error('❌ Invalid view:', view);
            return;
        }
        this.dispatch({ type: 'SET_VIEW', payload: view });
    };
    
    setInputMode = (mode) => {
        const validModes = ['photo', 'handwriting'];
        if (!validModes.includes(mode)) {
            console.error('❌ Invalid input mode:', mode);
            return;
        }
        this.dispatch({ type: 'SET_INPUT_MODE', payload: mode });
    };
    
    setHandwritingInputType = (type) => {
        const validTypes = ['canvas', 'keyboard'];
        if (!validTypes.includes(type)) {
            console.error('❌ Invalid handwriting input type:', type);
            return;
        }
        this.dispatch({ type: 'SET_HANDWRITING_INPUT_TYPE', payload: type });
    };
    
    reset = () => {
        this.dispatch({ type: 'RESET' });
    };
    
    resetToSetupSafely = () => {
        // Keep user and problem data, only reset UI
        this.dispatch({ type: 'SET_VIEW', payload: 'setup' });
        this.dispatch({ type: 'CLEAR_ERROR' });
        this.dispatch({ type: 'SET_LOADING', payload: { status: false, message: '' } });
        this.dispatch({ type: 'SET_INTERACTIVE_STEP', payload: 0 });
    };
    
    // Getters with validation
    getStateValue = (key) => {
        if (!this.state.hasOwnProperty(key)) {
            console.warn('⚠️ Invalid state key:', key);
            return null;
        }
        return this.state[key];
    };
    
    getState = () => {
        return { ...this.state };
    };
    
    // Debug methods
    getDebugInfo = () => {
        return {
            state: this.state,
            subscriberCount: this.subscribers.size,
            backupCount: this.backupStates.length,
            isDispatching: this.isDispatching
        };
    };
}

// === MODULE MANAGER ===
export class ModuleManager {
    constructor() {
        this.modules = new Map();
        this.dependencies = new Map();
        this.initializationOrder = [];
        this.isInitialized = false;
    }
    
    register(name, moduleInstance, dependencies = []) {
        this.modules.set(name, {
            instance: moduleInstance,
            dependencies: dependencies,
            initialized: false
        });
        
        this.dependencies.set(name, dependencies);
        console.log(`📦 Module registered: ${name}`);
    }
    
    async initializeAll() {
        if (this.isInitialized) {
            console.warn('⚠️ Modules already initialized');
            return;
        }
        
        try {
            // Calculate initialization order
            this.calculateInitOrder();
            
            // Initialize modules in order
            for (const moduleName of this.initializationOrder) {
                await this.initializeModule(moduleName);
            }
            
            this.isInitialized = true;
            console.log('✅ All modules initialized successfully');
            
        } catch (error) {
            console.error('❌ Module initialization failed:', error);
            throw error;
        }
    }
    
    calculateInitOrder() {
        const visited = new Set();
        const visiting = new Set();
        const order = [];
        
        const visit = (moduleName) => {
            if (visiting.has(moduleName)) {
                throw new Error(`Circular dependency detected: ${moduleName}`);
            }
            
            if (visited.has(moduleName)) {
                return;
            }
            
            visiting.add(moduleName);
            
            const deps = this.dependencies.get(moduleName) || [];
            for (const dep of deps) {
                if (this.modules.has(dep)) {
                    visit(dep);
                }
            }
            
            visiting.delete(moduleName);
            visited.add(moduleName);
            order.push(moduleName);
        };
        
        for (const moduleName of this.modules.keys()) {
            visit(moduleName);
        }
        
        this.initializationOrder = order;
        console.log('📋 Module initialization order:', order);
    }
    
    async initializeModule(name) {
        const moduleInfo = this.modules.get(name);
        if (!moduleInfo) {
            throw new Error(`Module not found: ${name}`);
        }
        
        if (moduleInfo.initialized) {
            return;
        }
        
        try {
            console.log(`🔄 Initializing module: ${name}`);
            
            // Check dependencies
            for (const dep of moduleInfo.dependencies) {
                const depInfo = this.modules.get(dep);
                if (depInfo && !depInfo.initialized) {
                    throw new Error(`Dependency not initialized: ${dep}`);
                }
            }
            
            // Initialize module
            if (moduleInfo.instance.initialize) {
                await moduleInfo.instance.initialize();
            }
            
            moduleInfo.initialized = true;
            console.log(`✅ Module initialized: ${name}`);
            
        } catch (error) {
            console.error(`❌ Module initialization failed: ${name}`, error);
            throw error;
        }
    }
    
    get(name) {
        const moduleInfo = this.modules.get(name);
        return moduleInfo ? moduleInfo.instance : null;
    }
    
    getStatus() {
        const status = {};
        for (const [name, info] of this.modules.entries()) {
            status[name] = {
                initialized: info.initialized,
                dependencies: info.dependencies
            };
        }
        return status;
    }
}

// === FIXED API MANAGER ===
export class FixedAPIManager {
    constructor() {
        this.masterSolutionPrompt = this.createMasterPrompt();
        this.retryConfig = {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 5000
        };
    }
    
    createMasterPrompt() {
        return `Solve the math problem and respond in the following JSON format.

CRITICAL: ALL RESPONSES MUST BE IN TURKISH LANGUAGE. Mathematical expressions must follow the exact LaTeX format compatible with MathJax v3 and KaTeX renderer.

INTELLIGENT STEP CREATION RULES:
- Analyze the problem complexity and create appropriate number of steps
- Simple concept questions (like "which is irrational?"): 1-2 steps maximum
- Multiple choice questions: Focus on the logical reasoning, not checking each option separately
- Calculation problems: Break into natural mathematical steps
- Complex proofs: More detailed steps are acceptable

ROADMAP CONTENT RULES FOR adimAciklamasi AND ipucu:
- ABSOLUTELY NO LaTeX expressions in adimAciklamasi and ipucu fields
- Use ONLY verbal explanations in Turkish
- Be brief and direct about what to think or do
- Focus on the thinking process, not showing calculations
- Example GOOD: "Hangi sayının rasyonel olmadığını belirlemek için kök altındaki sayıları incele"
- Example BAD: "√2 ifadesini kontrol et" (no LaTeX symbols)

JSON SCHEMA:
{
  "problemOzeti": {
    "verilenler": [
      "Turkish explanation text with math: $LaTeX_inline$",
      "Another data in Turkish: $\\\\frac{a}{b} = 5$"
    ],
    "istenen": "What is requested in Turkish: $\\\\sqrt{x^2 + y^2}$"
  },
  "adimlar": [
    {
      "adimAciklamasi": "PURE VERBAL Turkish explanation - NO MATH SYMBOLS OR LaTeX",
      "cozum_lateks": "$pure_latex_expression$",
      "ipucu": "PURE VERBAL Turkish helpful hint - NO MATH SYMBOLS OR LaTeX", 
      "yanlisSecenekler": [
        {
          "metin": "$wrong_latex_expression$",
          "yanlisGeriBildirimi": "Turkish explanation why it's wrong with math: $LaTeX_inline$"
        }
      ]
    }
  ],
  "tamCozumLateks": [
    "$step_1_pure_latex$",
    "$step_2_pure_latex$", 
    "$final_answer_pure_latex$"
  ]
}

Problem: {PROBLEM_CONTEXT}

RESPOND ONLY IN JSON FORMAT, NO OTHER TEXT.`;
    }
    
    async makeApiCallWithRetry(sourceType, sourceData, problemContextForPrompt, maxRetries = null) {
        const retries = maxRetries || this.retryConfig.maxRetries;
        let lastError;
        
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`🔄 API call attempt ${attempt}/${retries}`);
                
                const result = await this.makeApiCall(sourceType, sourceData, problemContextForPrompt);
                
                if (this.validateApiResponse(result)) {
                    console.log(`✅ API call successful on attempt ${attempt}`);
                    return result;
                } else {
                    throw new Error('Invalid API response format');
                }
                
            } catch (error) {
                lastError = error;
                console.error(`❌ API call attempt ${attempt} failed:`, error.message);
                
                if (attempt < retries) {
                    const delay = Math.min(
                        this.retryConfig.baseDelay * Math.pow(2, attempt - 1),
                        this.retryConfig.maxDelay
                    );
                    console.log(`⏳ Waiting ${delay}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        console.error('❌ All API call attempts failed');
        throw lastError || new Error('API call failed after all retries');
    }
    
    async makeApiCall(sourceType, sourceData, problemContextForPrompt) {
        const promptText = this.masterSolutionPrompt.replace('{PROBLEM_CONTEXT}', problemContextForPrompt);
        const payloadParts = [{ text: promptText }];
        
        if (sourceType !== 'text') {
            payloadParts.push({ 
                inlineData: { 
                    mimeType: 'image/png', 
                    data: sourceData 
                } 
            });
        }
        
        const payload = {
            contents: [{
                role: "user",
                parts: payloadParts
            }]
        };
        
        // Store last call for retry functionality
        window.lastApiCall = () => this.makeRawApiCall(payload);
        
        return await this.makeRawApiCall(payload);
    }
    
    async makeRawApiCall(payload) {
        const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyDbjH9TXIFLxWH2HuYJlqIFO7Alhk1iQQs';
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'User-Agent': 'MathAI/1.0'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid API response structure');
        }
        
        const content = data.candidates[0].content.parts[0].text;
        return this.parseApiResponse(content);
    }
    
    parseApiResponse(content) {
        try {
            console.log('🔄 Parsing API response...');
            
            // Try direct JSON parse first
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                return this.normalizeApiResponse(result);
            }
            
            throw new Error('No valid JSON found in response');
            
        } catch (error) {
            console.error('❌ API response parsing failed:', error);
            return this.createFallbackResponse();
        }
    }
    
    normalizeApiResponse(data) {
        // Normalize LaTeX content to fix backslash issues
        if (data.adimlar && Array.isArray(data.adimlar)) {
            data.adimlar.forEach(step => {
                if (step.cozum_lateks) {
                    step.cozum_lateks = this.normalizeLatex(step.cozum_lateks);
                }
            });
        }
        
        if (data.tamCozumLateks && Array.isArray(data.tamCozumLateks)) {
            data.tamCozumLateks = data.tamCozumLateks.map(latex => this.normalizeLatex(latex));
        }
        
        if (data.problemOzeti) {
            if (data.problemOzeti.verilenler) {
                data.problemOzeti.verilenler = data.problemOzeti.verilenler.map(item => this.normalizeLatex(item));
            }
            if (data.problemOzeti.istenen) {
                data.problemOzeti.istenen = this.normalizeLatex(data.problemOzeti.istenen);
            }
        }
        
        return data;
    }
    
    normalizeLatex(content) {
        if (!content || typeof content !== 'string') return content;
        
        return content
            // Fix backslash inconsistencies
            .replace(/\\{4,}/g, '\\\\')  // 4+ backslashes -> 2
            .replace(/\\{3}/g, '\\\\')   // 3 backslashes -> 2
            // Clean whitespace
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    validateApiResponse(data) {
        if (!data || typeof data !== 'object') return false;
        if (!data.problemOzeti) return false;
        if (!data.adimlar || !Array.isArray(data.adimlar) || data.adimlar.length === 0) return false;
        return true;
    }
    
    createFallbackResponse() {
        return {
            problemOzeti: {
                verilenler: ["Problem analiz edilirken bir sorun oluştu."],
                istenen: "Lütfen soruyu daha net bir şekilde tekrar deneyin."
            },
            adimlar: [{
                adimAciklamasi: "API'dan çözüm alınamadı",
                cozum_lateks: "\\text{Çözüm gösterilemiyor}",
                ipucu: "Lütfen tekrar deneyin"
            }],
            tamCozumLateks: ["\\text{Çözüm adımları üretilemedi}"],
            _fallback: true
        };
    }
    
    async checkApiHealth() {
        try {
            const testPayload = {
                contents: [{
                    role: "user",
                    parts: [{ text: "Test: 2+2=?" }]
                }]
            };
            
            const response = await this.makeRawApiCall(testPayload);
            
            return {
                healthy: true,
                response: response
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }
}

// === CENTRALIZED MODULE EXPORTS ===
export const fixedStateManager = new FixedStateManager();
export const moduleManager = new ModuleManager();
export const fixedAPIManager = new FixedAPIManager();

// Make globally available for backward compatibility
if (typeof window !== 'undefined') {
    window.fixedStateManager = fixedStateManager;
    window.moduleManager = moduleManager;
    window.fixedAPIManager = fixedAPIManager;
    
    // Legacy compatibility
    window.stateManager = fixedStateManager;
    window.makeApiCall = fixedAPIManager.makeRawApiCall.bind(fixedAPIManager);
    window.checkApiHealth = fixedAPIManager.checkApiHealth.bind(fixedAPIManager);
}

console.log('✅ Fixed module exports and state management loaded');