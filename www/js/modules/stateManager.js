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

// export const stateManager = new StateManager();