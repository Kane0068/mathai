// debug.js - Yeni dosya oluşturun
export const MathDebugger = {
    // Render durumunu kontrol et
    checkRenderStatus() {
        const stats = globalRenderManager.getStats();
        console.table(stats);
        return stats;
    },
    
    // Problemli elementleri bul
    findFailedRenders() {
        const failed = document.querySelectorAll('.render-error');
        console.log(`${failed.length} başarısız render bulundu:`);
        failed.forEach((el, i) => {
            console.log(`${i + 1}. Element:`, el);
            console.log('İçerik:', el.textContent);
        });
        return failed;
    },
    
    // Tüm matematik elementlerini yeniden render et
    async reRenderAll() {
        console.log('🔄 Tüm elementler yeniden render ediliyor...');
        
        const containers = [
            document.getElementById('question'),
            document.getElementById('solution-output'),
            document.getElementById('step-by-step-container')
        ].filter(Boolean);
        
        for (const container of containers) {
            await globalRenderManager.renderContainer(container);
        }
        
        console.log('✅ Yeniden render tamamlandı');
    },
    
    // Test render
    async testRender(content) {
        const testDiv = document.createElement('div');
        testDiv.style.position = 'fixed';
        testDiv.style.top = '50%';
        testDiv.style.left = '50%';
        testDiv.style.transform = 'translate(-50%, -50%)';
        testDiv.style.background = 'white';
        testDiv.style.padding = '20px';
        testDiv.style.border = '2px solid #333';
        testDiv.style.zIndex = '9999';
        
        document.body.appendChild(testDiv);
        
        const result = await globalRenderManager.renderElement(testDiv, content, { displayMode: true });
       
       console.log('Test render sonucu:', result);
       
       // 5 saniye sonra kaldır
       setTimeout(() => {
           document.body.removeChild(testDiv);
       }, 5000);
       
       return result;
   }
};

// Global erişim için
window.MathDebugger = MathDebugger;