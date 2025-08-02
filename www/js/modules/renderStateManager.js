// renderStateManager.js - Yeni dosya
export class RenderStateManager {
    constructor() {
        this.activeRenders = new Map();
        this.renderHistory = [];
        this.errorLog = [];
    }
    
    async trackRender(id, renderFunction) {
        if (this.activeRenders.has(id)) {
            console.warn(`Render ${id} zaten aktif, iptal ediliyor`);
            return this.activeRenders.get(id);
        }
        
        const renderPromise = this.executeRender(id, renderFunction);
        this.activeRenders.set(id, renderPromise);
        
        try {
            const result = await renderPromise;
            this.activeRenders.delete(id);
            this.renderHistory.push({id, success: true, timestamp: Date.now()});
            return result;
        } catch (error) {
            this.activeRenders.delete(id);
            this.errorLog.push({id, error: error.message, timestamp: Date.now()});
            throw error;
        }
    }
    
    async executeRender(id, renderFunction) {
        const startTime = performance.now();
        
        try {
            const result = await renderFunction();
            const duration = performance.now() - startTime;
            
            if (duration > 1000) {
                console.warn(`Yavaş render: ${id} - ${duration.toFixed(2)}ms`);
            }
            
            return result;
        } catch (error) {
            console.error(`Render hatası ${id}:`, error);
            throw error;
        }
    }
    
    cancelAllRenders() {
        this.activeRenders.clear();
    }
    
    getStats() {
        return {
            activeCount: this.activeRenders.size,
            totalRenders: this.renderHistory.length,
            errorCount: this.errorLog.length,
            successRate: this.renderHistory.length > 0 
                ? (this.renderHistory.filter(r => r.success).length / this.renderHistory.length) * 100 
                : 0
        };
    }
}

export const renderStateManager = new RenderStateManager();