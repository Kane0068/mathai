// www/js/modules/canvasManager.js
import { APP_CONFIG } from '../core/Config.js';
import { stateManager } from './stateManager.js';

export class CanvasManager {
    constructor() {
        this.canvases = new Map();
        this.contexts = new Map();
        this.tools = new Map();
        this.history = new Map();
        this.isDrawing = new Map();
        this.initialized = false;
        
        // Drawing settings
        this.defaultSettings = {
            tool: APP_CONFIG.canvas.defaultTool,
            penColor: APP_CONFIG.canvas.penColor,
            penWidth: APP_CONFIG.canvas.penWidth,
            backgroundColor: APP_CONFIG.canvas.backgroundColor,
            eraserWidth: 10
        };
    }

    /**
     * Initialize Canvas Manager
     */
    init() {
        if (this.initialized) return;
        
        try {
            this.initializeCanvases();
            this.setupEventListeners();
            this.initialized = true;
            console.log('CanvasManager initialized successfully');
        } catch (error) {
            console.error('CanvasManager initialization failed:', error);
            throw error;
        }
    }

    /**
     * Initialize all canvas elements found in the DOM
     */
    initializeCanvases() {
        // Find all canvas elements
        const canvasElements = document.querySelectorAll('canvas[id]');
        
        canvasElements.forEach(canvas => {
            this.initializeCanvas(canvas.id);
        });
    }

    /**
     * Initialize a specific canvas
     * @param {string} canvasId - Canvas element ID
     */
    initializeCanvas(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.warn(`Canvas not found: ${canvasId}`);
            return false;
        }

        try {
            const ctx = canvas.getContext('2d');
            
            // Store references
            this.canvases.set(canvasId, canvas);
            this.contexts.set(canvasId, ctx);
            
            // Initialize drawing state
            this.tools.set(canvasId, { ...this.defaultSettings });
            this.history.set(canvasId, []);
            this.isDrawing.set(canvasId, false);
            
            // Setup canvas
            this.setupCanvas(canvasId);
            
            // Setup event listeners for this canvas
            this.setupCanvasEventListeners(canvasId);
            
            console.log(`Canvas initialized: ${canvasId}`);
            return true;
            
        } catch (error) {
            console.error(`Canvas initialization failed for ${canvasId}:`, error);
            return false;
        }
    }

    /**
     * Setup canvas properties and initial state
     */
    setupCanvas(canvasId) {
        const canvas = this.canvases.get(canvasId);
        const ctx = this.contexts.get(canvasId);
        
        if (!canvas || !ctx) return;

        // Set canvas size first (without calling other setup methods)
        this.setCanvasSize(canvasId);
        
        // Set initial drawing properties
        const settings = this.tools.get(canvasId);
        ctx.strokeStyle = settings.penColor;
        ctx.lineWidth = settings.penWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Fill background
        ctx.fillStyle = settings.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Save initial state
        this.saveState(canvasId);
    }

    /**
     * Set canvas size without triggering other setup methods
     */
    setCanvasSize(canvasId) {
        const canvas = this.canvases.get(canvasId);
        if (!canvas) return;

        // Get the computed style dimensions
        const rect = canvas.getBoundingClientRect();
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        // Set default size if no dimensions available
        const width = rect.width || 400;
        const height = rect.height || 300;
        
        // Set the actual canvas size
        canvas.width = width * devicePixelRatio;
        canvas.height = height * devicePixelRatio;
        
        // Scale the context to match the device pixel ratio
        const ctx = this.contexts.get(canvasId);
        if (ctx) {
            ctx.scale(devicePixelRatio, devicePixelRatio);
            
            // Set canvas style size to match the container
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
        }
    }

    /**
     * Resize canvas to match its display size (public method for external calls)
     */
    resizeCanvas(canvasId) {
        const canvas = this.canvases.get(canvasId);
        if (!canvas) return;

        // Just update the size without re-initializing everything
        this.setCanvasSize(canvasId);
        
        // Re-apply drawing settings after resize
        const ctx = this.contexts.get(canvasId);
        const settings = this.tools.get(canvasId);
        
        if (ctx && settings) {
            ctx.strokeStyle = settings.penColor;
            ctx.lineWidth = settings.penWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }
    }

    /**
     * Setup event listeners for all canvases
     */
    setupEventListeners() {
        // Window resize handler
        window.addEventListener('resize', () => {
            this.canvases.forEach((canvas, canvasId) => {
                this.resizeCanvas(canvasId);
            });
        });
    }

    /**
     * Setup event listeners for a specific canvas
     */
    setupCanvasEventListeners(canvasId) {
        const canvas = this.canvases.get(canvasId);
        if (!canvas) return;

        // Mouse events
        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e, canvasId));
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e, canvasId));
        canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e, canvasId));
        canvas.addEventListener('mouseout', (e) => this.handleMouseUp(e, canvasId));

        // Touch events for mobile
        canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e, canvasId));
        canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e, canvasId));
        canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e, canvasId));
    }

    /**
     * Get coordinates relative to canvas
     */
    getCoordinates(e, canvasId) {
        const canvas = this.canvases.get(canvasId);
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    /**
     * Mouse event handlers
     */
    handleMouseDown(e, canvasId) {
        e.preventDefault();
        const coords = this.getCoordinates(e, canvasId);
        this.startDrawing(canvasId, coords.x, coords.y);
    }

    handleMouseMove(e, canvasId) {
        e.preventDefault();
        if (!this.isDrawing.get(canvasId)) return;
        
        const coords = this.getCoordinates(e, canvasId);
        this.continueDrawing(canvasId, coords.x, coords.y);
    }

    handleMouseUp(e, canvasId) {
        e.preventDefault();
        this.stopDrawing(canvasId);
    }

    /**
     * Touch event handlers
     */
    handleTouchStart(e, canvasId) {
        e.preventDefault();
        const coords = this.getCoordinates(e, canvasId);
        this.startDrawing(canvasId, coords.x, coords.y);
    }

    handleTouchMove(e, canvasId) {
        e.preventDefault();
        if (!this.isDrawing.get(canvasId)) return;
        
        const coords = this.getCoordinates(e, canvasId);
        this.continueDrawing(canvasId, coords.x, coords.y);
    }

    handleTouchEnd(e, canvasId) {
        e.preventDefault();
        this.stopDrawing(canvasId);
    }

    /**
     * Drawing logic
     */
    startDrawing(canvasId, x, y) {
        const ctx = this.contexts.get(canvasId);
        const settings = this.tools.get(canvasId);
        
        if (!ctx || !settings) return;

        this.isDrawing.set(canvasId, true);
        
        if (settings.tool === 'pen') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = settings.penColor;
            ctx.lineWidth = settings.penWidth;
        } else if (settings.tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = settings.eraserWidth;
        }
        
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    continueDrawing(canvasId, x, y) {
        const ctx = this.contexts.get(canvasId);
        if (!ctx || !this.isDrawing.get(canvasId)) return;

        ctx.lineTo(x, y);
        ctx.stroke();
    }

    stopDrawing(canvasId) {
        if (!this.isDrawing.get(canvasId)) return;
        
        this.isDrawing.set(canvasId, false);
        this.saveState(canvasId);
    }

    /**
     * Tool management
     */
    setTool(canvasId, tool) {
        const settings = this.tools.get(canvasId);
        if (!settings) return;

        if (['pen', 'eraser'].includes(tool)) {
            settings.tool = tool;
            console.log(`Canvas ${canvasId} tool set to: ${tool}`);
            
            // Update state
            stateManager.setState('canvas.currentTool', tool);
        } else {
            console.warn(`Invalid tool: ${tool}`);
        }
    }

    getTool(canvasId) {
        const settings = this.tools.get(canvasId);
        return settings ? settings.tool : null;
    }

    /**
     * Drawing properties
     */
    setPenColor(canvasId, color) {
        const settings = this.tools.get(canvasId);
        if (settings) {
            settings.penColor = color;
        }
    }

    setPenWidth(canvasId, width) {
        const settings = this.tools.get(canvasId);
        if (settings) {
            settings.penWidth = Math.max(1, Math.min(20, width));
        }
    }

    setEraserWidth(canvasId, width) {
        const settings = this.tools.get(canvasId);
        if (settings) {
            settings.eraserWidth = Math.max(5, Math.min(50, width));
        }
    }

    /**
     * Canvas operations
     */
    clear(canvasId) {
        const canvas = this.canvases.get(canvasId);
        const ctx = this.contexts.get(canvasId);
        const settings = this.tools.get(canvasId);
        
        if (!canvas || !ctx || !settings) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = settings.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        this.saveState(canvasId);
        console.log(`Canvas cleared: ${canvasId}`);
    }

    /**
     * History management
     */
    saveState(canvasId) {
        const canvas = this.canvases.get(canvasId);
        const history = this.history.get(canvasId);
        
        if (!canvas || !history) return;

        const imageData = canvas.toDataURL();
        history.push(imageData);
        
        // Limit history size
        if (history.length > 20) {
            history.shift();
        }
    }

    undo(canvasId) {
        const canvas = this.canvases.get(canvasId);
        const ctx = this.contexts.get(canvasId);
        const history = this.history.get(canvasId);
        
        if (!canvas || !ctx || !history || history.length <= 1) {
            console.log(`Cannot undo canvas ${canvasId}: insufficient history`);
            return;
        }

        // Remove current state
        history.pop();
        
        // Get previous state
        const previousState = history[history.length - 1];
        
        if (previousState) {
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = previousState;
            
            console.log(`Canvas undo: ${canvasId}`);
        }
    }

    /**
     * Canvas data operations
     */
    toDataURL(canvasId, type = 'image/png', quality = 0.9) {
        const canvas = this.canvases.get(canvasId);
        return canvas ? canvas.toDataURL(type, quality) : null;
    }

    toBlob(canvasId, callback, type = 'image/png', quality = 0.9) {
        const canvas = this.canvases.get(canvasId);
        if (canvas) {
            canvas.toBlob(callback, type, quality);
        }
    }

    isEmpty(canvasId) {
        const canvas = this.canvases.get(canvasId);
        const ctx = this.contexts.get(canvasId);
        
        if (!canvas || !ctx) return true;

        try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Check if all pixels are the background color
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];
                
                // If any pixel is not white/transparent, canvas is not empty
                if (r !== 255 || g !== 255 || b !== 255 || a !== 255) {
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            console.error('Canvas empty check error:', error);
            return true;
        }
    }

    /**
     * Canvas management
     */
    getCanvas(canvasId) {
        return this.canvases.get(canvasId);
    }

    getContext(canvasId) {
        return this.contexts.get(canvasId);
    }

    getAllCanvases() {
        return Array.from(this.canvases.keys());
    }

    /**
     * Cleanup and destroy
     */
    destroyCanvas(canvasId) {
        // Remove event listeners
        const canvas = this.canvases.get(canvasId);
        if (canvas) {
            canvas.removeEventListener('mousedown', this.handleMouseDown);
            canvas.removeEventListener('mousemove', this.handleMouseMove);
            canvas.removeEventListener('mouseup', this.handleMouseUp);
            canvas.removeEventListener('mouseout', this.handleMouseUp);
            canvas.removeEventListener('touchstart', this.handleTouchStart);
            canvas.removeEventListener('touchmove', this.handleTouchMove);
            canvas.removeEventListener('touchend', this.handleTouchEnd);
        }

        // Clear references
        this.canvases.delete(canvasId);
        this.contexts.delete(canvasId);
        this.tools.delete(canvasId);
        this.history.delete(canvasId);
        this.isDrawing.delete(canvasId);
    }

    destroy() {
        // Clean up all canvases
        this.canvases.forEach((canvas, canvasId) => {
            this.destroyCanvas(canvasId);
        });
        
        // Remove global event listeners
        window.removeEventListener('resize', this.resizeCanvas);
        
        this.initialized = false;
        console.log('CanvasManager destroyed');
    }
}

// Create and export singleton instance
export const canvasManager = new CanvasManager();