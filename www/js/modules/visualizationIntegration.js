// =================================================================================
//  MathAi - Görselleştirme Motoru Entegrasyonu
//  Mevcut uygulamaya 3D görselleştirme özellikleri ekleme
// =================================================================================

import { visualizationEngine } from './modules/advancedVisualizationEngine.js';
import { mathRenderer } from './modules/mathRenderer.js';

export class VisualizationIntegration {
    constructor() {
        this.activeVisualizations = new Map();
        this.visualizationCounter = 0;
    }

    // Mevcut mathRenderer'a 3D desteği ekle
    async enhanceMathRenderer() {
        const originalRender = mathRenderer.render.bind(mathRenderer);
        
        mathRenderer.render = async (content, element, displayMode = false) => {
            // Önce normal render'ı dene
            const success = originalRender(content, element, displayMode);
            
            // 3D görselleştirme gerektiren içerik var mı kontrol et
            await this.checkFor3DContent(content, element);
            
            return success;
        };
    }

    async checkFor3DContent(content, element) {
        // Geometrik şekilleri tespit et
        const geometryPatterns = {
            cube: /küp|cube|kare\s+prizma/i,
            sphere: /küre|sphere|top/i,
            cylinder: /silindir|cylinder|dairesel\s+prizma/i,
            cone: /koni|cone|piramit/i,
            pyramid: /piramit|pyramid/i
        };

        // Fonksiyon grafiklerini tespit et
        const functionPatterns = {
            quadratic: /x\^2|x²|parabol/i,
            cubic: /x\^3|x³/i,
            trigonometric: /sin\(|cos\(|tan\(/i,
            exponential: /e\^x|exp\(/i,
            logarithmic: /log\(|ln\(/i
        };

        for (const [type, pattern] of Object.entries(geometryPatterns)) {
            if (pattern.test(content)) {
                await this.addGeometryVisualization(element, type, content);
                break;
            }
        }

        for (const [type, pattern] of Object.entries(functionPatterns)) {
            if (pattern.test(content)) {
                await this.addFunctionVisualization(element, type, content);
                break;
            }
        }
    }

    async addGeometryVisualization(element, type, content) {
        const containerId = `viz-${++this.visualizationCounter}`;
        
        // Görselleştirme container'ı oluştur
        const vizContainer = this.createVisualizationContainer(containerId, type);
        element.appendChild(vizContainer);

        // Parametreleri içerikten çıkar
        const parameters = this.extractGeometryParameters(content, type);
        
        // 3D görselleştirmeyi oluştur
        const visualization = await visualizationEngine.visualizeGeometry(
            containerId, 
            type, 
            parameters
        );

        this.activeVisualizations.set(containerId, visualization);

        // Kontrol paneli ekle
        this.addVisualizationControls(vizContainer, visualization, type);
    }

    async addFunctionVisualization(element, type, content) {
        const containerId = `viz-${++this.visualizationCounter}`;
        
        const vizContainer = this.createVisualizationContainer(containerId, 'function');
        element.appendChild(vizContainer);

        // Fonksiyonu çıkar
        const functionStr = this.extractFunction(content);
        const parameters = this.extractFunctionParameters(content, type);

        const visualization = await visualizationEngine.visualizeFunctionGraph(
            containerId,
            functionStr,
            parameters
        );

        this.activeVisualizations.set(containerId, visualization);
        this.addFunctionControls(vizContainer, visualization, functionStr);
    }

    createVisualizationContainer(id, type) {
        const container = document.createElement('div');
        container.className = 'visualization-container bg-white rounded-lg border border-gray-200 shadow-sm mt-4';
        container.innerHTML = `
            <div class="visualization-header p-3 bg-gray-50 rounded-t-lg border-b border-gray-200">
                <div class="flex items-center justify-between">
                    <h4 class="font-semibold text-gray-800">
                        <svg class="inline w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
                        </svg>
                        3D Görselleştirme - ${this.getTypeDisplayName(type)}
                    </h4>
                    <div class="visualization-buttons flex space-x-2">
                        <button class="btn-small btn-secondary" onclick="visualizationIntegration.toggleFullscreen('${id}')">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
                            </svg>
                        </button>
                        <button class="btn-small btn-tertiary" onclick="visualizationIntegration.resetView('${id}')">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                            </svg>
                        </button>
                        <button class="btn-small btn-danger" onclick="visualizationIntegration.closeVisualization('${id}')">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
            <div class="visualization-content p-4">
                <div id="${id}" class="visualization-canvas w-full h-80 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"></div>
                <div class="visualization-controls mt-4"></div>
            </div>
        `;
        return container;
    }

    addVisualizationControls(container, visualization, type) {
        const controlsContainer = container.querySelector('.visualization-controls');
        
        const controls = this.createGeometryControls(type, visualization);
        controlsContainer.appendChild(controls);
    }

    createGeometryControls(type, visualization) {
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'geometry-controls bg-gray-50 p-4 rounded-lg';
        
        let controlsHTML = `
            <div class="flex flex-wrap items-center gap-4">
                <div class="control-group">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Görünüm</label>
                    <div class="flex space-x-2">
                        <button class="btn-small btn-primary view-btn active" data-view="solid">Katı</button>
                        <button class="btn-small btn-secondary view-btn" data-view="wireframe">Tel Kafes</button>
                        <button class="btn-small btn-secondary view-btn" data-view="both">İkisi</button>
                    </div>
                </div>
                <div class="control-group">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Şeffaflık</label>
                    <input type="range" class="opacity-slider" min="0.1" max="1" step="0.1" value="0.8">
                </div>
                <div class="control-group">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Animasyon</label>
                    <div class="flex space-x-2">
                        <button class="btn-small btn-accent animate-btn" data-animation="rotate">Döndür</button>
                        <button class="btn-small btn-accent animate-btn" data-animation="pulse">Nabız</button>
                        <button class="btn-small btn-danger" data-animation="stop">Durdur</button>
                    </div>
                </div>
        `;

        // Tip-spesifik kontroller
        switch (type) {
            case 'cube':
                controlsHTML += `
                    <div class="control-group">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Kenar Uzunluğu</label>
                        <input type="range" class="size-slider" min="0.5" max="5" step="0.1" value="2">
                        <span class="size-value text-sm text-gray-600">2.0</span>
                    </div>
                `;
                break;
            case 'sphere':
                controlsHTML += `
                    <div class="control-group">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Yarıçap</label>
                        <input type="range" class="radius-slider" min="0.5" max="5" step="0.1" value="1">
                        <span class="radius-value text-sm text-gray-600">1.0</span>
                    </div>
                `;
                break;
            case 'cylinder':
                controlsHTML += `
                    <div class="control-group">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Yarıçap</label>
                        <input type="range" class="radius-slider" min="0.5" max="3" step="0.1" value="1">
                        <span class="radius-value text-sm text-gray-600">1.0</span>
                    </div>
                    <div class="control-group">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Yükseklik</label>
                        <input type="range" class="height-slider" min="0.5" max="5" step="0.1" value="2">
                        <span class="height-value text-sm text-gray-600">2.0</span>
                    </div>
                `;
                break;
        }

        controlsHTML += `
                <div class="control-group">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Renk</label>
                    <input type="color" class="color-picker" value="#4f46e5">
                </div>
            </div>
        `;

        controlsDiv.innerHTML = controlsHTML;

        // Event listener'ları ekle
        this.attachControlEvents(controlsDiv, visualization, type);

        return controlsDiv;
    }

    addFunctionControls(container, visualization, functionStr) {
        const controlsContainer = container.querySelector('.visualization-controls');
        
        const controls = document.createElement('div');
        controls.className = 'function-controls bg-gray-50 p-4 rounded-lg';
        controls.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="function-input">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Fonksiyon</label>
                    <input type="text" class="function-text w-full p-2 border border-gray-300 rounded" 
                           value="${functionStr}" placeholder="örn: x^2 + 2*x + 1">
                    <button class="btn-small btn-primary mt-2 update-function">Güncelle</button>
                </div>
                <div class="function-range">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Aralık</label>
                    <div class="grid grid-cols-2 gap-2">
                        <input type="number" class="x-min p-2 border border-gray-300 rounded" 
                               value="-10" placeholder="X Min">
                        <input type="number" class="x-max p-2 border border-gray-300 rounded" 
                               value="10" placeholder="X Max">
                    </div>
                </div>
                <div class="function-style">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Görünüm</label>
                    <div class="flex space-x-2">
                        <button class="btn-small btn-primary line-style active" data-style="line">Çizgi</button>
                        <button class="btn-small btn-secondary line-style" data-style="points">Noktalar</button>
                        <button class="btn-small btn-secondary line-style" data-style="surface">Yüzey</button>
                    </div>
                </div>
                <div class="function-animation">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Animasyon</label>
                    <div class="flex space-x-2">
                        <button class="btn-small btn-accent animate-function" data-animation="trace">İz Sür</button>
                        <button class="btn-small btn-accent animate-function" data-animation="wave">Dalga</button>
                        <button class="btn-small btn-danger animate-function" data-animation="stop">Durdur</button>
                    </div>
                </div>
            </div>
        `;

        controlsContainer.appendChild(controls);
        this.attachFunctionControlEvents(controls, visualization);
    }

    attachControlEvents(controlsDiv, visualization, type) {
        // Görünüm butonları
        controlsDiv.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                controlsDiv.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active', 'btn-primary'));
                controlsDiv.querySelectorAll('.view-btn').forEach(b => b.classList.add('btn-secondary'));
                
                e.target.classList.remove('btn-secondary');
                e.target.classList.add('active', 'btn-primary');
                
                this.updateVisualizationView(visualization, e.target.dataset.view);
            });
        });

        // Şeffaflık slider'ı
        const opacitySlider = controlsDiv.querySelector('.opacity-slider');
        if (opacitySlider) {
            opacitySlider.addEventListener('input', (e) => {
                this.updateOpacity(visualization, parseFloat(e.target.value));
            });
        }

        // Animasyon butonları
        controlsDiv.querySelectorAll('.animate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.playGeometryAnimation(visualization, e.target.dataset.animation);
            });
        });

        // Boyut kontrolleri
        const sizeSlider = controlsDiv.querySelector('.size-slider');
        if (sizeSlider) {
            sizeSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                controlsDiv.querySelector('.size-value').textContent = value.toFixed(1);
                this.updateGeometrySize(visualization, { size: value });
            });
        }

        const radiusSlider = controlsDiv.querySelector('.radius-slider');
        if (radiusSlider) {
            radiusSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                controlsDiv.querySelector('.radius-value').textContent = value.toFixed(1);
                this.updateGeometrySize(visualization, { radius: value });
            });
        }

        const heightSlider = controlsDiv.querySelector('.height-slider');
        if (heightSlider) {
            heightSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                controlsDiv.querySelector('.height-value').textContent = value.toFixed(1);
                this.updateGeometrySize(visualization, { height: value });
            });
        }

        // Renk picker
        const colorPicker = controlsDiv.querySelector('.color-picker');
        if (colorPicker) {
            colorPicker.addEventListener('change', (e) => {
                this.updateGeometryColor(visualization, e.target.value);
            });
        }
    }

    attachFunctionControlEvents(controls, visualization) {
        const updateBtn = controls.querySelector('.update-function');
        const functionInput = controls.querySelector('.function-text');
        const xMinInput = controls.querySelector('.x-min');
        const xMaxInput = controls.querySelector('.x-max');

        updateBtn.addEventListener('click', () => {
            const newFunction = functionInput.value;
            const xMin = parseFloat(xMinInput.value) || -10;
            const xMax = parseFloat(xMaxInput.value) || 10;
            
            if (visualization.updateFunction) {
                visualization.updateFunction(newFunction, { xMin, xMax });
            }
        });

        // Çizgi stili butonları
        controls.querySelectorAll('.line-style').forEach(btn => {
            btn.addEventListener('click', (e) => {
                controls.querySelectorAll('.line-style').forEach(b => {
                    b.classList.remove('active', 'btn-primary');
                    b.classList.add('btn-secondary');
                });
                
                e.target.classList.remove('btn-secondary');
                e.target.classList.add('active', 'btn-primary');
                
                this.updateFunctionStyle(visualization, e.target.dataset.style);
            });
        });

        // Fonksiyon animasyonları
        controls.querySelectorAll('.animate-function').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.playFunctionAnimation(visualization, e.target.dataset.animation);
            });
        });
    }

    // Kontrol fonksiyonları
    updateVisualizationView(visualization, viewType) {
        if (!visualization.geometry) return;

        const material = visualization.geometry.material;
        switch (viewType) {
            case 'solid':
                material.wireframe = false;
                material.transparent = true;
                material.opacity = 0.8;
                break;
            case 'wireframe':
                material.wireframe = true;
                material.transparent = false;
                material.opacity = 1;
                break;
            case 'both':
                // İkisini de göstermek için ek wireframe mesh ekle
                break;
        }
    }

    updateOpacity(visualization, opacity) {
        if (visualization.geometry && visualization.geometry.material) {
            visualization.geometry.material.opacity = opacity;
            visualization.geometry.material.transparent = opacity < 1;
        }
    }

    updateGeometryColor(visualization, colorHex) {
        if (visualization.geometry && visualization.geometry.material) {
            visualization.geometry.material.color.setHex(colorHex.replace('#', '0x'));
        }
    }

    updateGeometrySize(visualization, parameters) {
        if (visualization.updateGeometry) {
            visualization.updateGeometry(parameters);
        }
    }

    playGeometryAnimation(visualization, animationType) {
        if (!visualization.geometry) return;

        switch (animationType) {
            case 'rotate':
                this.startRotationAnimation(visualization.geometry);
                break;
            case 'pulse':
                this.startPulseAnimation(visualization.geometry);
                break;
            case 'stop':
                this.stopAllAnimations(visualization.geometry);
                break;
        }
    }

    startRotationAnimation(geometry) {
        const animate = () => {
            geometry.rotation.y += 0.01;
            geometry.rotation.x += 0.005;
            geometry.animationId = requestAnimationFrame(animate);
        };
        animate();
    }

    startPulseAnimation(geometry) {
        const originalScale = geometry.scale.x;
        let direction = 1;
        
        const animate = () => {
            geometry.scale.x += direction * 0.01;
            geometry.scale.y += direction * 0.01;
            geometry.scale.z += direction * 0.01;
            
            if (geometry.scale.x > originalScale * 1.2) direction = -1;
            if (geometry.scale.x < originalScale * 0.8) direction = 1;
            
            geometry.animationId = requestAnimationFrame(animate);
        };
        animate();
    }

    stopAllAnimations(geometry) {
        if (geometry.animationId) {
            cancelAnimationFrame(geometry.animationId);
            geometry.animationId = null;
        }
    }

    // Utility fonksiyonlar
    extractGeometryParameters(content, type) {
        const params = { showDimensions: true, showAxes: true };
        
        // Boyut bilgilerini çıkar
        const sizeRegex = /(\d+(?:\.\d+)?)\s*(cm|m|birim)/gi;
        const matches = content.match(sizeRegex);
        
        if (matches && matches.length > 0) {
            const size = parseFloat(matches[0]);
            switch (type) {
                case 'cube':
                    params.size = size;
                    break;
                case 'sphere':
                    params.radius = size;
                    break;
                case 'cylinder':
                    params.radius = size;
                    if (matches.length > 1) {
                        params.height = parseFloat(matches[1]);
                    }
                    break;
            }
        }

        return params;
    }

    extractFunction(content) {
        // Matematik fonksiyonlarını çıkar
        const patterns = [
            /f\(x\)\s*=\s*([^,\n]+)/i,
            /y\s*=\s*([^,\n]+)/i,
            /([x^0-9\+\-\*\/\(\)\s]+)/i
        ];

        for (const pattern of patterns) {
            const match = content.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        return 'x^2'; // Fallback
    }

    extractFunctionParameters(content, type) {
        const params = { 
            showLabel: true, 
            color: 0x4f46e5,
            resolution: 200
        };

        switch (type) {
            case 'trigonometric':
                params.xMin = -2 * Math.PI;
                params.xMax = 2 * Math.PI;
                break;
            case 'exponential':
                params.xMin = -5;
                params.xMax = 5;
                break;
            default:
                params.xMin = -10;
                params.xMax = 10;
        }

        return params;
    }

    getTypeDisplayName(type) {
        const names = {
            cube: 'Küp',
            sphere: 'Küre',
            cylinder: 'Silindir',
            cone: 'Koni',
            pyramid: 'Piramit',
            function: 'Fonksiyon Grafiği'
        };
        return names[type] || type;
    }

    // Global kontrol fonksiyonları
    toggleFullscreen(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!document.fullscreenElement) {
            container.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    resetView(containerId) {
        const visualization = this.activeVisualizations.get(containerId);
        if (!visualization) return;

        // Kamerayi varsayılan pozisyona döndür
        visualization.camera.position.set(5, 5, 5);
        visualization.camera.lookAt(0, 0, 0);

        // Geometriyi varsayılan duruma döndür
        if (visualization.geometry) {
            visualization.geometry.rotation.set(0, 0, 0);
            visualization.geometry.scale.set(1, 1, 1);
            this.stopAllAnimations(visualization.geometry);
        }
    }

    closeVisualization(containerId) {
        const container = document.getElementById(containerId);
        if (container && container.parentNode) {
            // Animasyonları durdur
            this.resetView(containerId);
            
            // Three.js kaynakları temizle
            visualizationEngine.dispose(containerId);
            
            // DOM'dan kaldır
            container.parentNode.removeChild(container);
            
            // Haritadan sil
            this.activeVisualizations.delete(containerId);
        }
    }

    // Cleanup
    dispose() {
        this.activeVisualizations.forEach((viz, id) => {
            visualizationEngine.dispose(id);
        });
        this.activeVisualizations.clear();
    }
}

// Global instance
export const visualizationIntegration = new VisualizationIntegration();

// CSS stilleri (bu CSS dosyanıza ekleyin)
const additionalStyles = `
.visualization-container {
    transition: all 0.3s ease;
}

.visualization-container:hover {
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.btn-small {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    border-radius: 0.375rem;
    font-weight: 500;
    transition: all 0.2s;
    border: 1px solid transparent;
    cursor: pointer;
}

.btn-small.btn-primary {
    background-color: #4f46e5;
    color: white;
}

.btn-small.btn-secondary {
    background-color: #6b7280;
    color: white;
}

.btn-small.btn-tertiary {
    background-color: #e5e7eb;
    color: #374151;
}

.btn-small.btn-accent {
    background-color: #06b6d4;
    color: white;
}

.btn-small.btn-danger {
    background-color: #ef4444;
    color: white;
}

.btn-small:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.control-group {
    min-width: 120px;
}

.geometry-controls input[type="range"] {
    width: 80px;
}

.function-controls input {
    font-size: 0.875rem;
}

@media (max-width: 768px) {
    .visualization-canvas {
        height: 250px;
    }
    
    .visualization-controls .flex {
        flex-direction: column;
        gap: 1rem;
    }
}
`;

// Stilleri head'e ekle
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = additionalStyles;
    document.head.appendChild(style);
}