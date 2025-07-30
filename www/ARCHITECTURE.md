# Mathematics Assistant - Modular Architecture

## Overview

The application has been refactored from a monolithic structure to a modular, maintainable architecture using dependency injection and service-oriented design patterns.

## New Architecture Structure

```
js/
├── core/                          # Core application infrastructure
│   ├── config.js                  # Configuration management
│   ├── container.js               # Dependency injection container
│   └── application.js             # Main application orchestrator
├── services/                      # Business logic services
│   ├── apiService.js             # API communication
│   ├── problemSolverService.js   # Math problem solving logic
│   └── uiService.js              # UI management and rendering
├── modules/                       # Existing modules (preserved)
│   ├── auth.js
│   ├── stateManager.js
│   ├── ui.js
│   ├── canvasManager.js
│   ├── errorHandler.js
│   ├── smartGuide.js
│   └── ...
└── pages/                        # Page-specific scripts
    ├── index-new.js              # New modular index page
    └── ...
```

## Key Improvements

### 1. Configuration Management (`js/core/config.js`)
- Centralized configuration for API keys, timeouts, and settings
- Environment-specific configurations
- Observable configuration changes
- Validation and type safety

### 2. Dependency Injection (`js/core/container.js`)
- Manages singleton instances
- Prevents duplicate instantiation
- Circular dependency detection
- Service lifecycle management

### 3. Service Layer
- **ApiService**: Handles all external API calls with caching and retry logic
- **ProblemSolverService**: Encapsulates math problem solving workflow
- **UIService**: Manages UI state and rendering operations

### 4. Application Core (`js/core/application.js`)
- Main application orchestrator
- Event-driven architecture
- Centralized error handling
- Service initialization and cleanup

## Benefits of the New Architecture

### Maintainability
- Clear separation of concerns
- Single responsibility principle
- Easy to locate and modify specific functionality

### Testability
- Services can be easily mocked and tested in isolation
- Dependency injection allows for easy test setup
- Clear interfaces between components

### Scalability
- New features can be added as separate services
- Easy to extend existing functionality
- Modular structure supports team development

### Performance
- Singleton management prevents memory leaks
- Lazy loading of services
- Efficient resource management

## Migration Guide

### Old vs New Structure

**Before:**
```javascript
// Multiple singleton instances created
const stateManager = new StateManager();  // in multiple files
const errorHandler = new AdvancedErrorHandler();  // duplicated
```

**After:**
```javascript
// Single instance managed by container
const stateManager = container.get('stateManager');
const errorHandler = container.get('errorHandler');
```

### Configuration Usage

**Before:**
```javascript
const API_KEY = "hardcoded-key";  // scattered throughout code
```

**After:**
```javascript
const apiKey = config.getApiKey('gemini');  // centralized
```

### Service Access

**Before:**
```javascript
// Direct instantiation and method calls
const result = await makeApiCall(prompt, image);
```

**After:**
```javascript
// Service-based approach
const apiService = mathAiApp.getService('apiService');
const result = await apiService.makeApiCall(prompt, image);
```

## Usage Examples

### Initializing the Application
```javascript
import { mathAiApp } from './js/core/application.js';

// Application auto-initializes
await mathAiApp.initialize();

// Access services
const stateManager = mathAiApp.getService('stateManager');
const uiService = mathAiApp.getService('uiService');
```

### Solving a Problem
```javascript
// Through the application interface
await mathAiApp.solveProblem('photo', imageData);

// Or directly through the service
const problemSolver = mathAiApp.getService('problemSolverService');
const solution = await problemSolver.solveProblem('text', 'x^2 + 5x + 6 = 0');
```

### Configuration Management
```javascript
// Get configuration values
const timeout = config.get('api.gemini.timeout');
const cacheSize = config.get('performance.cacheSize');

// Update configuration
config.set('ui.animation.stepDelay', 2000);

// Subscribe to changes
config.subscribe((path, value) => {
    console.log(`Config changed: ${path} = ${value}`);
});
```

## Error Handling

The new architecture provides comprehensive error handling:

1. **Global Error Catching**: Unhandled errors are caught and processed
2. **Service-Level Errors**: Each service handles its own errors appropriately
3. **User-Friendly Messages**: Errors are translated to user-friendly messages
4. **Recovery Mechanisms**: Automatic retry and fallback strategies

## Performance Optimizations

1. **Lazy Loading**: Services are only instantiated when needed
2. **Caching**: API responses and render results are cached
3. **Memory Management**: Proper cleanup and disposal methods
4. **Batch Operations**: Multiple operations are batched for efficiency

## Future Enhancements

The modular architecture supports easy addition of:

1. **Plugin System**: New math solving algorithms as plugins
2. **Theming**: UI themes as separate modules
3. **Analytics**: Usage tracking and analytics services
4. **Offline Support**: Caching and offline processing capabilities
5. **Multi-language**: Internationalization support

## Development Guidelines

### Adding New Services
1. Create service in `js/services/`
2. Register in `js/core/container.js`
3. Document dependencies and interfaces
4. Add appropriate error handling

### Configuration Changes
1. Add new config in `js/core/config.js`
2. Update validation rules
3. Document configuration options
4. Test environment-specific behavior

### Testing Strategy
1. Unit test individual services
2. Integration test service interactions
3. Mock dependencies for isolated testing
4. Test error scenarios and edge cases

## Backward Compatibility

The refactor maintains backward compatibility:
- All existing features are preserved
- UI behavior remains the same
- API integrations continue to work
- No breaking changes for end users

The old `index.js` is preserved as a backup, and the new modular system is activated through `index-new.js`.