// =================================================================================
//  Dependency Injection Container
//  Manages singleton instances and dependencies
// =================================================================================

export class Container {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
        this.factories = new Map();
        this.dependencies = new Map();
        this.initializing = new Set();
    }
    
    // Register a singleton service
    registerSingleton(name, factory, dependencies = []) {
        this.services.set(name, {
            type: 'singleton',
            factory,
            dependencies,
            instance: null
        });
        return this;
    }
    
    // Register a factory service (new instance each time)
    registerFactory(name, factory, dependencies = []) {
        this.services.set(name, {
            type: 'factory',
            factory,
            dependencies
        });
        return this;
    }
    
    // Register an existing instance
    registerInstance(name, instance) {
        this.services.set(name, {
            type: 'instance',
            instance
        });
        return this;
    }
    
    // Get a service
    get(name) {
        const service = this.services.get(name);
        
        if (!service) {
            throw new Error(`Service '${name}' not found`);
        }
        
        // Prevent circular dependencies
        if (this.initializing.has(name)) {
            throw new Error(`Circular dependency detected for service '${name}'`);
        }
        
        switch (service.type) {
            case 'instance':
                return service.instance;
                
            case 'singleton':
                if (!service.instance) {
                    this.initializing.add(name);
                    try {
                        const dependencies = this.resolveDependencies(service.dependencies);
                        service.instance = service.factory(...dependencies);
                    } finally {
                        this.initializing.delete(name);
                    }
                }
                return service.instance;
                
            case 'factory':
                this.initializing.add(name);
                try {
                    const dependencies = this.resolveDependencies(service.dependencies);
                    return service.factory(...dependencies);
                } finally {
                    this.initializing.delete(name);
                }
                
            default:
                throw new Error(`Unknown service type: ${service.type}`);
        }
    }
    
    // Resolve array of dependency names
    resolveDependencies(dependencies) {
        return dependencies.map(dep => this.get(dep));
    }
    
    // Check if service exists
    has(name) {
        return this.services.has(name);
    }
    
    // Clear all services (for testing)
    clear() {
        this.services.clear();
        this.singletons.clear();
        this.factories.clear();
        this.dependencies.clear();
        this.initializing.clear();
    }
    
    // Get all registered service names
    getServiceNames() {
        return Array.from(this.services.keys());
    }
    
    // Dispose of singleton instances that have dispose method
    dispose() {
        this.services.forEach((service, name) => {
            if (service.type === 'singleton' && service.instance) {
                if (typeof service.instance.dispose === 'function') {
                    try {
                        service.instance.dispose();
                    } catch (error) {
                        console.error(`Error disposing service '${name}':`, error);
                    }
                }
            }
        });
    }
    
    // Debug information
    getDebugInfo() {
        const info = {};
        this.services.forEach((service, name) => {
            info[name] = {
                type: service.type,
                dependencies: service.dependencies || [],
                hasInstance: service.type === 'singleton' ? !!service.instance : 'N/A'
            };
        });
        return info;
    }
}

// Application container - singleton instance
export const container = new Container();

// Helper function for easy service registration
export function registerServices() {
    // Import modules dynamically to avoid circular dependencies
    const registerCoreServices = async () => {
        const { config } = await import('./config.js');
        const { StateManager } = await import('../modules/stateManager.js');
        const { AdvancedErrorHandler } = await import('../modules/errorHandler.js');
        const { OptimizedCanvasManager } = await import('../modules/canvasManager.js');
        const { advancedMathRenderer } = await import('../modules/advancedMathRenderer.js');
        const { mathSymbolPanel } = await import('../modules/mathSymbolPanel.js');
        const { mathAutocomplete } = await import('../modules/mathAutocomplete.js');
        const { FirestoreManager } = await import('../modules/firestore.js');
        
        // Core services
        container.registerInstance('config', config);
        
        // Singleton services
        container
            .registerSingleton('stateManager', () => new StateManager())
            .registerSingleton('errorHandler', () => new AdvancedErrorHandler())
            .registerSingleton('canvasManager', () => new OptimizedCanvasManager())
            .registerSingleton('firestoreManager', () => new FirestoreManager())
            .registerInstance('mathRenderer', advancedMathRenderer)
            .registerInstance('mathSymbolPanel', mathSymbolPanel)
            .registerInstance('mathAutocomplete', mathAutocomplete);
    };
    
    return registerCoreServices();
}

// Initialize services
export async function initializeContainer() {
    try {
        await registerServices();
        console.log('✅ Container initialized successfully');
        return container;
    } catch (error) {
        console.error('❌ Container initialization failed:', error);
        throw error;
    }
}