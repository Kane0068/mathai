// stateManager.js
// Uygulama durumu yönetimi

import { logError, sleep } from './utils.js';

export class StateManager {
    constructor() {
        this.state = {
            user: null,
            problem: { solution: null },
            ui: { 
                view: 'setup', 
                isLoading: false, 
                error: null, 
                inputMode: 'photo', 
                handwritingInputType: 'keyboard',
                interactiveStep: 0 
            },
        };
        this.subscribers = new Set();
        this.middleware = [this.loggerMiddleware];
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        callback(this.state); // Abone olduğunda ilk durumu hemen gönder
        return () => this.subscribers.delete(callback); // Abonelikten çıkma fonksiyonu
    }
    resetToSetupSafely() {
        // Sadece UI state'ini sıfırla, user ve problem verilerini koru
        const currentUser = this.state.user;
        const currentProblem = this.state.problem;
        
        this.state = {
            user: currentUser, // Kullanıcı verilerini koru
            problem: currentProblem, // Problem verilerini koru (yeniden çözüm için)
            ui: { 
                view: 'setup', 
                isLoading: false, 
                error: null, 
                inputMode: 'photo', 
                handwritingInputType: 'keyboard',
                interactiveStep: 0 
            }
        };
        
        // Subscribers'ı bilgilendir
        this.subscribers.forEach(cb => cb(this.state));
        
        console.log('✅ State safely reset to setup with preserved data');
    }
    dispatch(action) {
        const prevState = this.state;
        const newState = this.reducer(prevState, action);

        // DÖNGÜ KIRICI: Eğer state objesinin referansı değişmediyse, hiçbir şey yapma.
        if (newState === prevState) {
            return;
        }

        this.middleware.forEach(mw => mw(action, prevState, newState));
        this.state = newState;
        this.subscribers.forEach(cb => cb(newState));
    }

    reducer(state, action) {
        const newUser = this.userReducer(state.user, action);
        const newProblem = this.problemReducer(state.problem, action);
        const newUi = this.uiReducer(state.ui, action);

        if (state.user === newUser && state.problem === newProblem && state.ui === newUi) {
            return state; // Hiçbir alt state değişmedi, mevcut objeyi döndür.
        }
        return { user: newUser, problem: newProblem, ui: newUi };
    }

    // Alt Reducer'lar: Her biri kendi state parçasından sorumludur.
    userReducer(state, action) {
        switch (action.type) {
            case 'SET_USER': return action.payload;
            case 'RESET': return state; // User'ı sıfırlama, sadece problem ve UI'ı sıfırla
            default: return state;
        }
    }

    problemReducer(state, action) {
        switch (action.type) {
            case 'SET_SOLUTION': return { ...state, solution: action.payload };
            case 'RESET': return { solution: null };
            default: return state;
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
                if (state.isLoading === action.payload.status && state.loadingMessage === action.payload.message) return state;
                return { ...state, isLoading: action.payload.status, loadingMessage: action.payload.message || '' };
            case 'SET_ERROR':
                return { ...state, isLoading: false, error: action.payload };
            case 'CLEAR_ERROR':
                return state.error === null ? state : { ...state, error: null };
            case 'NEXT_INTERACTIVE_STEP':
                 return { ...state, interactiveStep: state.interactiveStep + 1 };
            case 'SET_INTERACTIVE_STEP':
                 return { ...state, interactiveStep: action.payload };
            case 'RESET':
                return { 
                    view: 'setup', 
                    isLoading: false, 
                    error: null, 
                    inputMode: 'photo', 
                    handwritingInputType: 'keyboard', // Varsayılan olarak klavye girişi
                    interactiveStep: 0 
                };
            default: return state;
        }
    }

    loggerMiddleware(action, prevState, newState) {
        console.group(`%cState Action: %c${action.type}`, 'color: gray;', 'color: blue; font-weight: bold;');
        console.log('%cPayload:', 'color: #9E9E9E;', action.payload);
        console.log('%cPrevious State:', 'color: #FF9800;', prevState);
        console.log('%cNew State:', 'color: #4CAF50;', newState);
        console.groupEnd();
    }

    // DÜZELTME: getStateValue metodunu ekle
    getStateValue(key) {
        return this.state[key];
    }

    // Action Creators
    setUser = (user) => this.dispatch({ type: 'SET_USER', payload: user });
    setSolution = (solutionData) => this.dispatch({ type: 'SET_SOLUTION', payload: solutionData });
    setLoading = (status, message = '') => this.dispatch({ type: 'SET_LOADING', payload: { status, message } });
    setError = (errorMessage) => this.dispatch({ type: 'SET_ERROR', payload: errorMessage });
    clearError = () => this.dispatch({ type: 'CLEAR_ERROR' });
    setView = (view) => this.dispatch({ type: 'SET_VIEW', payload: view });
    setInputMode = (mode) => this.dispatch({ type: 'SET_INPUT_MODE', payload: mode });
    setHandwritingInputType = (type) => this.dispatch({ type: 'SET_HANDWRITING_INPUT_TYPE', payload: type });
    setInteractiveStep = (step) => this.dispatch({ type: 'SET_INTERACTIVE_STEP', payload: step });
    nextInteractiveStep = () => this.dispatch({ type: 'NEXT_INTERACTIVE_STEP' });
    reset = () => this.dispatch({ type: 'RESET' });
}

// Enhanced State Manager with validation and backup
export class EnhancedStateManager extends StateManager {
    constructor() {
        super();
        this.backupStates = [];
        this.maxBackups = 5;
        this.stateValidators = new Map();
        this.errorRecovery = {
            enabled: true,
            maxRetries: 3,
            retryDelay: 1000,
            criticalErrors: []
        };
        
        this.setupStateValidation();
        this.setupErrorRecovery();
    }
    
    setupStateValidation() {
        // UI state validator
        this.stateValidators.set('ui', (uiState) => {
            const validViews = ['setup', 'summary', 'solving', 'fullSolution', 'interactive'];
            const validInputModes = ['photo', 'handwriting'];
            const validHandwritingTypes = ['canvas', 'keyboard'];
            
            const errors = [];
            
            if (!validViews.includes(uiState.view)) {
                errors.push(`Invalid view: ${uiState.view}`);
            }
            
            if (!validInputModes.includes(uiState.inputMode)) {
                errors.push(`Invalid input mode: ${uiState.inputMode}`);
            }
            
            if (!validHandwritingTypes.includes(uiState.handwritingInputType)) {
                errors.push(`Invalid handwriting type: ${uiState.handwritingInputType}`);
            }
            
            return {
                isValid: errors.length === 0,
                errors
            };
        });
        
        // Problem state validator
        this.stateValidators.set('problem', (problemState) => {
            const errors = [];
            
            if (problemState.solution) {
                if (!problemState.solution.problemOzeti) {
                    errors.push('Missing problem summary');
                }
                
                if (!problemState.solution.adimlar || !Array.isArray(problemState.solution.adimlar)) {
                    errors.push('Missing or invalid steps array');
                }
                
                if (problemState.solution.adimlar?.length === 0) {
                    errors.push('Empty steps array');
                }
            }
            
            return {
                isValid: errors.length === 0,
                errors
            };
        });
        
        // User state validator
        this.stateValidators.set('user', (userState) => {
            const errors = [];
            
            if (!userState) {
                errors.push('User state is null or undefined');
                return { isValid: false, errors };
            }
            
            if (!userState.uid) {
                errors.push('Missing user UID');
            }
            
            if (!userState.email) {
                errors.push('Missing user email');
            }
            
            if (!userState.displayName) {
                errors.push('Missing user display name');
            }
            
            if (typeof userState.dailyQueryCount !== 'number' || userState.dailyQueryCount < 0) {
                errors.push('Invalid daily query count');
            }
            
            return {
                isValid: errors.length === 0,
                errors
            };
        });
    }
    
    setupErrorRecovery() {
        // Listen for critical state errors
        window.addEventListener('error', (event) => {
            if (event.error && event.error.message.includes('state')) {
                this.handleCriticalStateError(event.error);
            }
        });
        
        // Periodic state health check
        setInterval(() => {
            this.performStateHealthCheck();
        }, 30000); // Every 30 seconds
    }
    
    setState(updates) {
        try {
            // Create backup before updating
            this.createStateBackup();
            
            // Validate updates
            const validationResults = this.validateStateUpdates(updates);
            
            if (!validationResults.isValid) {
                console.warn('⚠️ State validation warnings:', validationResults.warnings);
                
                // Filter out invalid updates
                const validUpdates = this.filterValidUpdates(updates, validationResults);
                
                if (Object.keys(validUpdates).length === 0) {
                    throw new Error('No valid state updates provided');
                }
                
                updates = validUpdates;
            }
            
            // Call parent setState
            const result = super.setState(updates);
            
            // Validate final state
            this.validateCompleteState();
            
            console.log('✅ State updated successfully:', updates);
            return result;
            
        } catch (error) {
            console.error('❌ State update error:', error);
            
            // Attempt recovery
            if (this.errorRecovery.enabled) {
                this.attemptStateRecovery(error, updates);
            }
            
            throw error;
        }
    }
    
    validateStateUpdates(updates) {
        const warnings = [];
        let isValid = true;
        
        for (const [key, value] of Object.entries(updates)) {
            if (this.stateValidators.has(key)) {
                const validator = this.stateValidators.get(key);
                const validation = validator(value);
                
                if (!validation.isValid) {
                    warnings.push(`${key}: ${validation.errors.join(', ')}`);
                    isValid = false;
                }
            }
        }
        
        return { isValid, warnings };
    }
    
    filterValidUpdates(updates, validationResults) {
        const validUpdates = {};
        
        for (const [key, value] of Object.entries(updates)) {
            if (this.stateValidators.has(key)) {
                const validator = this.stateValidators.get(key);
                const validation = validator(value);
                
                if (validation.isValid) {
                    validUpdates[key] = value;
                }
            } else {
                // No validator, assume valid
                validUpdates[key] = value;
            }
        }
        
        return validUpdates;
    }
    
    validateCompleteState() {
        const currentState = this.getState();
        const errors = [];
        
        for (const [key, validator] of this.stateValidators) {
            if (currentState[key]) {
                const validation = validator(currentState[key]);
                if (!validation.isValid) {
                    errors.push(`${key}: ${validation.errors.join(', ')}`);
                }
            }
        }
        
        if (errors.length > 0) {
            console.warn('⚠️ State validation warnings:', errors);
            
            // Auto-fix common issues
            this.attemptAutoFix(currentState, errors);
        }
        
        return errors.length === 0;
    }
    
    attemptAutoFix(currentState, errors) {
        console.log('🔧 Attempting auto-fix for state issues...');
        
        const fixes = {};
        
        // Fix invalid view
        if (errors.some(e => e.includes('Invalid view'))) {
            fixes.ui = { ...currentState.ui, view: 'setup' };
            console.log('🔧 Auto-fixed: Reset view to setup');
        }
        
        // Fix missing user data
        if (errors.some(e => e.includes('Missing user'))) {
            if (currentState.user) {
                fixes.user = {
                    ...currentState.user,
                    displayName: currentState.user.displayName || 'Kullanıcı',
                    dailyQueryCount: typeof currentState.user.dailyQueryCount === 'number' ? 
                        currentState.user.dailyQueryCount : 0
                };
                console.log('🔧 Auto-fixed: Filled missing user data');
            }
        }
        
        // Fix empty problem steps
        if (errors.some(e => e.includes('Empty steps array'))) {
            if (currentState.problem?.solution) {
                fixes.problem = {
                    ...currentState.problem,
                    solution: null
                };
                console.log('🔧 Auto-fixed: Reset invalid problem solution');
            }
        }
        
        if (Object.keys(fixes).length > 0) {
            try {
                super.setState(fixes);
                console.log('✅ Auto-fix applied successfully');
            } catch (fixError) {
                console.error('❌ Auto-fix failed:', fixError);
            }
        }
    }
    
    createStateBackup() {
        try {
            const currentState = this.getState();
            const backup = {
                state: JSON.parse(JSON.stringify(currentState)),
                timestamp: new Date().toISOString(),
                id: `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };
            
            this.backupStates.push(backup);
            
            // Limit backup count
            if (this.backupStates.length > this.maxBackups) {
                this.backupStates.shift();
            }
            
            console.log(`💾 State backup created: ${backup.id}`);
            
        } catch (error) {
            console.error('❌ Failed to create state backup:', error);
        }
    }
    
    restoreFromBackup(backupId = null) {
        try {
            let backup;
            
            if (backupId) {
                backup = this.backupStates.find(b => b.id === backupId);
            } else {
                // Get most recent backup
                backup = this.backupStates[this.backupStates.length - 1];
            }
            
            if (!backup) {
                throw new Error('No backup found for restoration');
            }
            
            // Validate backup before restoring
            const backupValidation = this.validateStateUpdates(backup.state);
            
            if (!backupValidation.isValid) {
                console.warn('⚠️ Backup validation failed, attempting partial restore...');
                
                // Try to restore only valid parts
                const validParts = this.filterValidUpdates(backup.state, backupValidation);
                super.setState(validParts);
            } else {
                // Full restore
                this.state = backup.state;
                this.notifySubscribers();
            }
            
            console.log(`✅ State restored from backup: ${backup.id}`);
            return true;
            
        } catch (error) {
            console.error('❌ State restoration failed:', error);
            return false;
        }
    }
    
    attemptStateRecovery(error, failedUpdates) {
        console.log('🔄 Attempting state recovery...');
        
        // Record critical error
        this.errorRecovery.criticalErrors.push({
            error: error.message,
            failedUpdates,
            timestamp: new Date().toISOString()
        });
        
        // Strategy 1: Restore from backup
        if (this.backupStates.length > 0) {
            console.log('🔄 Recovery strategy 1: Restore from backup');
            if (this.restoreFromBackup()) {
                return true;
            }
        }
        
        // Strategy 2: Reset to safe state
        console.log('🔄 Recovery strategy 2: Reset to safe state');
        try {
            const safeState = this.createSafeState();
            this.state = safeState;
            this.notifySubscribers();
            console.log('✅ State reset to safe configuration');
            return true;
        } catch (resetError) {
            console.error('❌ Safe state reset failed:', resetError);
        }
        
        // Strategy 3: Emergency reset
        console.log('🔄 Recovery strategy 3: Emergency reset');
        try {
            this.emergencyReset();
            return true;
        } catch (emergencyError) {
            console.error('❌ Emergency reset failed:', emergencyError);
        }
        
        return false;
    }
    
    createSafeState() {
        return {
            user: null,
            ui: {
                view: 'setup',
                inputMode: 'handwriting',
                handwritingInputType: 'canvas',
                isLoading: false,
                error: null
            },
            problem: {
                solution: null
            }
        };
    }
    
    emergencyReset() {
        console.log('🚨 Emergency state reset initiated');
        
        // Clear all state
        this.state = this.createSafeState();
        this.backupStates = [];
        this.subscribers.clear();
        
        // Show emergency message
        if (window.showError) {
            window.showError(
                'Kritik durum hatası. Sistem sıfırlandı.',
                true,
                () => window.location.reload()
            );
        }
        
        console.log('🚨 Emergency reset completed');
    }
    
    performStateHealthCheck() {
        try {
            const currentState = this.getState();
            const healthReport = {
                timestamp: new Date().toISOString(),
                isHealthy: true,
                issues: [],
                recommendations: []
            };
            
            // Check state structure
            if (!currentState.ui || !currentState.problem) {
                healthReport.isHealthy = false;
                healthReport.issues.push('Missing core state sections');
                healthReport.recommendations.push('Perform emergency reset');
            }
            
            // Check for stale error states
            if (currentState.ui?.error && currentState.ui.error.length > 0) {
                const errorAge = Date.now() - (currentState.ui.errorTimestamp || 0);
                if (errorAge > 300000) { // 5 minutes
                    healthReport.issues.push('Stale error state detected');
                    healthReport.recommendations.push('Clear error state');
                    this.clearError();
                }
            }
            
            // Check memory usage
            const backupSize = JSON.stringify(this.backupStates).length;
            if (backupSize > 1000000) { // 1MB
                healthReport.issues.push('Backup states consuming too much memory');
                healthReport.recommendations.push('Clear old backups');
                this.cleanupBackups();
            }
            
            // Critical errors check
            if (this.errorRecovery.criticalErrors.length > 10) {
                healthReport.isHealthy = false;
                healthReport.issues.push('Too many critical errors');
                healthReport.recommendations.push('System restart recommended');
            }
            
            if (!healthReport.isHealthy) {
                console.warn('⚠️ State health check failed:', healthReport);
            }
            
            return healthReport;
            
        } catch (error) {
            console.error('❌ State health check failed:', error);
            return { isHealthy: false, error: error.message };
        }
    }
    
    cleanupBackups() {
        const keepCount = Math.floor(this.maxBackups / 2);
        this.backupStates = this.backupStates.slice(-keepCount);
        console.log(`🧹 Backup cleanup: kept ${keepCount} most recent backups`);
    }
    
    handleCriticalStateError(error) {
        console.error('🚨 Critical state error detected:', error);
        
        if (this.errorRecovery.enabled) {
            const recovered = this.attemptStateRecovery(error, {});
            if (!recovered) {
                console.error('🚨 State recovery failed - manual intervention required');
                
                if (window.showError) {
                    window.showError(
                        'Kritik sistem hatası tespit edildi. Sayfa yenilenecek.',
                        true,
                        () => window.location.reload()
                    );
                }
            }
        }
    }
    
    getStateDebugInfo() {
        return {
            currentState: this.getState(),
            backupCount: this.backupStates.length,
            subscriberCount: this.subscribers.size,
            errorHistory: this.errorRecovery.criticalErrors.slice(-5),
            lastHealthCheck: this.performStateHealthCheck()
        };
    }
    
    exportState() {
        try {
            const exportData = {
                state: this.getState(),
                backups: this.backupStates,
                metadata: {
                    exportTime: new Date().toISOString(),
                    version: '2.0',
                    errorCount: this.errorRecovery.criticalErrors.length
                }
            };
            
            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            console.error('❌ State export failed:', error);
            return null;
        }
    }
    
    importState(exportedData) {
        try {
            const data = typeof exportedData === 'string' ? 
                JSON.parse(exportedData) : exportedData;
            
            if (!data.state || !data.metadata) {
                throw new Error('Invalid exported state format');
            }
            
            // Validate imported state
            const validation = this.validateStateUpdates(data.state);
            if (!validation.isValid) {
                throw new Error(`Invalid state data: ${validation.warnings.join(', ')}`);
            }
            
            // Import state
            this.state = data.state;
            this.backupStates = data.backups || [];
            
            this.notifySubscribers();
            
            console.log('✅ State imported successfully');
            return true;
            
        } catch (error) {
            console.error('❌ State import failed:', error);
            return false;
        }
    }
}
