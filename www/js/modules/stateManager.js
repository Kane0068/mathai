// www/js/modules/stateManager.js
import { VIEWS, ELEMENTS } from '../core/Config.js';

export class StateManager {
    constructor() {
        this.state = {
            currentView: VIEWS.UPLOAD,
            user: null,
            problem: {
                source: null,
                sourceType: null,
                summary: null,
                solution: null,
                currentStep: 0
            },
            ui: {
                loading: false,
                loadingMessage: '',
                error: null
            },
            canvas: {
                currentTool: 'pen',
                mode: 'drawing' // 'drawing' or 'text'
            }
        };
        
        this.listeners = new Map();
        this.elements = new Map();
        this.viewElements = this.initializeViewElements();
    }

    // Initialize DOM element references
    initializeElements() {
        Object.entries(ELEMENTS).forEach(([key, id]) => {
            const element = document.getElementById(id);
            if (element) {
                this.elements.set(key, element);
            } else {
                console.warn(`Element not found: ${id}`);
            }
        });
    }

    // Get DOM element by key
    getElement(key) {
        return this.elements.get(key);
    }

    // Define which DOM elements are visible for each view
    initializeViewElements() {
        return {
            [VIEWS.UPLOAD]: {
                show: [
                    'upload-container',
                    'upload-selection',
                    'handwriting-container'
                ],
                hide: [
                    'question-summary-container',
                    'top-action-buttons',
                    'solving-workspace',
                    'result-container',
                    'preview-container'
                ]
            },
            [VIEWS.SUMMARY]: {
                show: [
                    'question-summary-container',
                    'top-action-buttons'
                ],
                hide: [
                    'upload-container',
                    'solving-workspace',
                    'result-container'
                ]
            },
            [VIEWS.SOLVING]: {
                show: [
                    'question-summary-container',
                    'solving-workspace'
                ],
                hide: [
                    'upload-container',
                    'top-action-buttons',
                    'result-container'
                ]
            },
            [VIEWS.INTERACTIVE]: {
                show: [
                    'solving-workspace'
                ],
                hide: [
                    'upload-container',
                    'question-summary-container',
                    'top-action-buttons',
                    'result-container'
                ]
            },
            [VIEWS.RESULT]: {
                show: [
                    'result-container'
                ],
                hide: [
                    'upload-container',
                    'question-summary-container',
                    'top-action-buttons',
                    'solving-workspace'
                ]
            }
        };
    }

    // Set application state
    setState(key, value) {
        const keys = key.split('.');
        let current = this.state;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        const lastKey = keys[keys.length - 1];
        const oldValue = current[lastKey];
        current[lastKey] = value;
        
        // Notify listeners
        this.notifyListeners(key, value, oldValue);
        
        // Special logging for user data
        if (key === 'user' || key.startsWith('user.')) {
            console.log(`User state updated: ${key}`, value);
        } else {
            console.log(`State updated: ${key}`, value);
        }
    }

    // Get application state
    getState(key = null) {
        if (!key) return this.state;
        
        const keys = key.split('.');
        let current = this.state;
        
        for (const k of keys) {
            if (current === null || current === undefined) return undefined;
            current = current[k];
        }
        
        return current;
    }

    // Convenience method for getting state values
    getStateValue(key) {
        return this.getState(key);
    }

    // Convenience method for setting solution (used by old code)
    setSolution(solutionData) {
        console.log('setSolution called with:', solutionData);
        this.setState('problem.solution', solutionData);
        console.log('Solution set in state, verification:', this.getState('problem.solution'));
    }

    // Debug method to check current state
    debugState() {
        console.log('=== STATE DEBUG ===');
        console.log('Full state:', this.state);
        console.log('Problem state:', this.state.problem);
        console.log('Solution:', this.state.problem?.solution);
        console.log('==================');
    }

    // Set current view and handle UI transitions
    setView(view) {
        if (!Object.values(VIEWS).includes(view)) {
            console.warn(`Invalid view: ${view}`);
            return;
        }

        const oldView = this.state.currentView;
        this.setState('currentView', view);
        
        // Handle view transitions
        this.handleViewTransition(oldView, view);
        
        console.log(`View changed: ${oldView} -> ${view}`);
    }

    // Handle DOM element visibility for view transitions
    handleViewTransition(oldView, newView) {
        const viewConfig = this.viewElements[newView];
        if (!viewConfig) {
            console.warn(`No view configuration found for: ${newView}`);
            return;
        }

        // Hide elements
        viewConfig.hide.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                element.classList.add('hidden');
            }
        });

        // Show elements
        viewConfig.show.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                element.classList.remove('hidden');
            }
        });

        // Handle specific view logic
        this.handleViewSpecificLogic(newView);
    }

    // Handle view-specific initialization logic
    handleViewSpecificLogic(view) {
        switch (view) {
            case VIEWS.UPLOAD:
                this.resetProblem();
                break;
            case VIEWS.SUMMARY:
                this.updateQuestionSummary();
                break;
            case VIEWS.SOLVING:
                this.initializeSolvingWorkspace();
                break;
            case VIEWS.INTERACTIVE:
                this.initializeInteractiveMode();
                break;
            case VIEWS.RESULT:
                this.displayResults();
                break;
        }
    }

    // Reset problem state
    resetProblem() {
        this.setState('problem', {
            source: null,
            sourceType: null,
            summary: null,
            solution: null,
            currentStep: 0
        });
    }

    // Update question summary display
    updateQuestionSummary() {
        const problem = this.getState('problem');
        if (problem && problem.summary) {
            // This will be handled by UIManager
            this.notifyListeners('view.summary.update', problem.summary);
        }
    }

    // Initialize solving workspace
    initializeSolvingWorkspace() {
        const problem = this.getState('problem');
        if (problem && problem.solution) {
            this.notifyListeners('view.solving.init', problem.solution);
        }
    }

    // Initialize interactive mode
    initializeInteractiveMode() {
        const problem = this.getState('problem');
        if (problem && problem.solution) {
            this.notifyListeners('view.interactive.init', problem.solution);
        }
    }

    // Display results
    displayResults() {
        const problem = this.getState('problem');
        if (problem && problem.solution) {
            this.notifyListeners('view.result.display', problem.solution);
        }
    }

    // Add state change listener
    addListener(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);
    }

    // Remove state change listener
    removeListener(key, callback) {
        if (this.listeners.has(key)) {
            const callbacks = this.listeners.get(key);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    // Notify listeners of state changes
    notifyListeners(key, newValue, oldValue = null) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).forEach(callback => {
                try {
                    callback(newValue, oldValue);
                } catch (error) {
                    console.error(`Listener error for key ${key}:`, error);
                }
            });
        }
    }

    // Get current view
    getCurrentView() {
        return this.state.currentView;
    }

    // Check if specific view is active
    isView(view) {
        return this.state.currentView === view;
    }

    // Set loading state
    setLoading(loading, message = '') {
        this.setState('ui.loading', loading);
        this.setState('ui.loadingMessage', message);
    }

    // Set error state
    setError(error) {
        this.setState('ui.error', error);
    }

    // Clear error state
    clearError() {
        this.setState('ui.error', null);
    }

    // Debug method to log current state
    logState() {
        console.log('Current State:', JSON.stringify(this.state, null, 2));
    }
}

// Create and export singleton instance
export const stateManager = new StateManager();