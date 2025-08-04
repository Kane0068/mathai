// TÜM ESKI RENDER IMPORT/FONKSIYONLARINI KALDIR VE ŞUNU YAZ:

export function showLoading(message = "Yükleniyor...") {
    const statusEl = document.getElementById('status-message');
    if (statusEl) {
        statusEl.innerHTML = `
            <div class="flex items-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-lg">
                <div class="loader w-5 h-5 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                <span>${message}</span>
            </div>
        `;
        statusEl.classList.remove('hidden');
    }
}

export function showError(message, isCritical = false, onAction = null) {
    const statusEl = document.getElementById('status-message');
    if (statusEl) {
        statusEl.innerHTML = `
            <div class="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
                <div class="flex items-center gap-2 mb-2">
                    <span class="text-red-500">⚠️</span>
                    <span class="font-medium">${isCritical ? 'Kritik Hata' : 'Hata'}</span>
                </div>
                <p class="text-sm">${message}</p>
                ${onAction ? '<button onclick="this.parentElement.parentElement.remove();" class="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-sm">Tamam</button>' : ''}
            </div>
        `;
        statusEl.classList.remove('hidden');
    }
}

export function showSuccess(message) {
    const statusEl = document.getElementById('status-message');
    if (statusEl) {
        statusEl.innerHTML = `
            <div class="p-4 bg-green-50 text-green-700 rounded-lg border border-green-200">
                <div class="flex items-center gap-2">
                    <span class="text-green-500">✅</span>
                    <span>${message}</span>
                </div>
            </div>
        `;
        statusEl.classList.remove('hidden');
        setTimeout(() => statusEl.classList.add('hidden'), 3000);
    }
}

// YENİ RENDER FONKSİYONLARI - MathRenderer'ı kullanacak
export async function renderMath(content, element, displayMode = false) {
    // Lazy import - sadece ihtiyaç olduğunda yükle
    const { mathRenderer } = await import('../core/mathRenderer.js');
    return await mathRenderer.render(content, element, { displayMode });
}

export async function renderMathInContainer(container, displayMode = false) {
    if (!container) return;
    
    const { mathRenderer } = await import('../core/mathRenderer.js');
    const elements = container.querySelectorAll('.smart-content[data-content], .latex-content[data-latex]');
    
    for (const element of elements) {
        const content = element.getAttribute('data-content') || element.getAttribute('data-latex');
        if (content) {
            await mathRenderer.render(content, element, { displayMode });
        }
    }
}

export async function initializeRenderSystem() {
    try {
        const { mathRenderer } = await import('../core/mathRenderer.js');
        return await mathRenderer.initialize();
    } catch (error) {
        console.error('Render sistemi başlatılamadı:', error);
        return false;
    }
}

// Geriye kalan fonksiyonlar - sadece bunları bırak:
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}