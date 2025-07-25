// =================================================================================
//  MathAi - Gelişmiş Görselleştirme Motoru (Advanced Visualization Engine)
//  Three.js, animasyonlar ve interaktif matematik görselleştirmeleri
// =================================================================================

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

export class AdvancedVisualizationEngine {
    constructor() {
        this.scenes = new Map(); // Her görselleştirme için ayrı scene
        this.renderers = new Map();
        this.cameras = new Map();
        this.animations = new Map();
        this.interactionEnabled = true;
        this.defaultColors = {
            primary: 0x4f46e5,
            secondary: 0x7c3aed,
            accent: 0x06b6d4,
            grid: 0xcccccc,
            axis: 0x666666,
            surface: 0x3b82f6,
            highlight: 0xf59e0b
        };
    }

    // ===== 3D GEOMETRİ VİZUALİZASYONU =====
    
    async visualizeGeometry(containerId, geometryType, parameters = {}) {
        const container = document.getElementById(containerId);
        if (!container) throw new Error(`Container ${containerId} not found`);

        const scene = this.createScene(containerId);
        const camera = this.createCamera(containerId, 'perspective');
        const renderer = this.createRenderer(containerId, container);

        // Işıklandırma sistemi
        this.setupLighting(scene);
        
        // Koordinat sistemi
        if (parameters.showAxes !== false) {
            this.addCoordinateSystem(scene, parameters.axisSize || 5);
        }

        // Geometrik şekil oluştur
        const geometry = this.createGeometry(geometryType, parameters);
        scene.add(geometry);

        // Kamera kontrolları
        this.setupCameraControls(containerId, camera, renderer);

        // Render loop başlat
        this.startRenderLoop(containerId, scene, camera, renderer);

        return {
            scene,
            camera,
            renderer,
            geometry,
            updateGeometry: (newParams) => this.updateGeometry(geometry, geometryType, newParams)
        };
    }

    createGeometry(type, params) {
        const group = new THREE.Group();
        
        switch (type) {
            case 'cube':
                return this.createCube(params);
            case 'sphere':
                return this.createSphere(params);
            case 'cylinder':
                return this.createCylinder(params);
            case 'cone':
                return this.createCone(params);
            case 'pyramid':
                return this.createPyramid(params);
            case 'prism':
                return this.createPrism(params);
            case 'torus':
                return this.createTorus(params);
            case 'custom':
                return this.createCustomGeometry(params);
            default:
                return this.createCube(params);
        }
    }

    createCube(params = {}) {
        const size = params.size || 2;
        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshLambertMaterial({
            color: params.color || this.defaultColors.primary,
            transparent: true,
            opacity: params.opacity || 0.8
        });
        
        const cube = new THREE.Mesh(geometry, material);
        
        // Kenar çizgileri ekle
        if (params.showEdges !== false) {
            const edges = new THREE.EdgesGeometry(geometry);
            const lineMaterial = new THREE.LineBasicMaterial({ 
                color: params.edgeColor || 0x000000,
                linewidth: 2
            });
            const wireframe = new THREE.LineSegments(edges, lineMaterial);
            cube.add(wireframe);
        }

        // Boyut etiketleri
        if (params.showDimensions) {
            this.addDimensionLabels(cube, { width: size, height: size, depth: size });
        }

        return cube;
    }

    createSphere(params = {}) {
        const radius = params.radius || 1;
        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        const material = new THREE.MeshLambertMaterial({
            color: params.color || this.defaultColors.primary,
            transparent: true,
            opacity: params.opacity || 0.8
        });
        
        const sphere = new THREE.Mesh(geometry, material);

        // Meridyen ve paralel çizgileri
        if (params.showGrid) {
            this.addSphereGrid(sphere, radius);
        }

        // Radius gösterimi
        if (params.showRadius) {
            this.addRadiusLine(sphere, radius);
        }

        return sphere;
    }

    createCylinder(params = {}) {
        const radius = params.radius || 1;
        const height = params.height || 2;
        const geometry = new THREE.CylinderGeometry(radius, radius, height, 32);
        const material = new THREE.MeshLambertMaterial({
            color: params.color || this.defaultColors.primary,
            transparent: true,
            opacity: params.opacity || 0.8
        });
        
        const cylinder = new THREE.Mesh(geometry, material);

        // Yükseklik ve radius çizgileri
        if (params.showDimensions) {
            this.addCylinderDimensions(cylinder, radius, height);
        }

        return cylinder;
    }

    // ===== FONKSİYON GRAFİKLERİ =====

    async visualizeFunctionGraph(containerId, functionStr, parameters = {}) {
        const container = document.getElementById(containerId);
        if (!container) throw new Error(`Container ${containerId} not found`);

        const scene = this.createScene(containerId);
        const camera = this.createCamera(containerId, 'perspective');
        const renderer = this.createRenderer(containerId, container);

        // Grid ve eksenler
        this.addGridAndAxes(scene, parameters);

        // Fonksiyonu parse et ve çiz
        const graph = await this.createFunctionGraph(functionStr, parameters);
        scene.add(graph);

        // Kamera pozisyonu ayarla
        camera.position.set(10, 10, 10);
        camera.lookAt(0, 0, 0);

        // Kontroller
        this.setupCameraControls(containerId, camera, renderer);
        this.startRenderLoop(containerId, scene, camera, renderer);

        return {
            scene,
            camera,
            renderer,
            graph,
            updateFunction: (newFunctionStr) => this.updateFunctionGraph(graph, newFunctionStr, parameters)
        };
    }

    async createFunctionGraph(functionStr, params = {}) {
        const group = new THREE.Group();
        
        // Fonksiyon tipini belirle
        if (this.is2DFunction(functionStr)) {
            group.add(this.create2DFunctionGraph(functionStr, params));
        } else if (this.is3DFunction(functionStr)) {
            group.add(this.create3DFunctionGraph(functionStr, params));
        } else if (this.isParametricFunction(functionStr)) {
            group.add(this.createParametricGraph(functionStr, params));
        }

        return group;
    }

    create2DFunctionGraph(functionStr, params = {}) {
        const points = [];
        const xMin = params.xMin || -10;
        const xMax = params.xMax || 10;
        const resolution = params.resolution || 200;
        const step = (xMax - xMin) / resolution;

        // Fonksiyonu güvenli şekilde evaluate et
        const func = this.parseMathFunction(functionStr);

        for (let x = xMin; x <= xMax; x += step) {
            try {
                const y = func(x);
                if (isFinite(y)) {
                    points.push(new THREE.Vector3(x, y, 0));
                }
            } catch (e) {
                // Tanımsız noktaları atla
                continue;
            }
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: params.color || this.defaultColors.primary,
            linewidth: params.linewidth || 3
        });

        const line = new THREE.Line(geometry, material);

        // Fonksiyon etiketi ekle
        if (params.showLabel) {
            this.addFunctionLabel(line, functionStr);
        }

        return line;
    }

    create3DFunctionGraph(functionStr, params = {}) {
        const xMin = params.xMin || -5;
        const xMax = params.xMax || 5;
        const zMin = params.zMin || -5;
        const zMax = params.zMax || 5;
        const resolution = params.resolution || 50;

        const geometry = new THREE.PlaneGeometry(
            xMax - xMin, 
            zMax - zMin, 
            resolution, 
            resolution
        );

        const func = this.parseMathFunction(functionStr);
        const vertices = geometry.attributes.position.array;

        // Her vertex için y değerini hesapla
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            try {
                vertices[i + 1] = func(x, z);
            } catch (e) {
                vertices[i + 1] = 0;
            }
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();

        // Renk gradyanı oluştur
        const material = this.createGradientMaterial(vertices, params);
        
        const surface = new THREE.Mesh(geometry, material);

        // Wireframe ekle
        if (params.showWireframe) {
            const wireframe = new THREE.WireframeGeometry(geometry);
            const wireframeMaterial = new THREE.LineBasicMaterial({
                color: 0x000000,
                opacity: 0.3,
                transparent: true
            });
            const wireframeMesh = new THREE.LineSegments(wireframe, wireframeMaterial);
            surface.add(wireframeMesh);
        }

        return surface;
    }

    // ===== ANİMASYON SİSTEMİ =====

    async animateSolutionSteps(containerId, steps, duration = 1000) {
        const sceneData = this.scenes.get(containerId);
        if (!sceneData) throw new Error('Scene not found');

        const animations = [];

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const animation = this.createStepAnimation(step, duration, i);
            animations.push(animation);
        }

        // Animasyonları sırayla çalıştır
        return this.playAnimationSequence(animations);
    }

    createStepAnimation(step, duration, index) {
        return {
            type: step.type, // 'highlight', 'transform', 'draw', 'fade'
            target: step.target,
            properties: step.properties,
            duration: duration,
            delay: index * duration * 0.3, // Overlap için
            easing: step.easing || 'easeInOutQuad'
        };
    }

    async playAnimationSequence(animations) {
        const promises = animations.map(anim => this.playAnimation(anim));
        return Promise.all(promises);
    }

    playAnimation(animation) {
        return new Promise((resolve) => {
            const { target, properties, duration, delay, easing } = animation;
            
            setTimeout(() => {
                this.tweenProperties(target, properties, duration, easing)
                    .then(resolve);
            }, delay);
        });
    }

    tweenProperties(target, properties, duration, easing) {
        return new Promise((resolve) => {
            const startProps = {};
            const endProps = properties;
            
            // Başlangıç değerlerini kaydet
            Object.keys(endProps).forEach(key => {
                startProps[key] = this.getNestedProperty(target, key);
            });

            const startTime = performance.now();
            
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easedProgress = this.applyEasing(progress, easing);

                // Değerleri interpolate et
                Object.keys(endProps).forEach(key => {
                    const startValue = startProps[key];
                    const endValue = endProps[key];
                    const currentValue = this.interpolateValue(startValue, endValue, easedProgress);
                    this.setNestedProperty(target, key, currentValue);
                });

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    // ===== MATEMATİKSEL FONKSİYON PARSER =====

    parseMathFunction(functionStr) {
        // Güvenli matematik fonksiyon parser
        // mathjs kütüphanesini kullan
        try {
            const expr = math.parse(functionStr);
            const compiled = expr.compile();
            
            return (...args) => {
                const scope = {};
                if (args.length === 1) {
                    scope.x = args[0];
                } else if (args.length === 2) {
                    scope.x = args[0];
                    scope.z = args[1];
                }
                return compiled.evaluate(scope);
            };
        } catch (error) {
            console.error('Function parse error:', error);
            return () => 0; // Fallback
        }
    }

    // ===== YARDIMCI FONKSIYONLAR =====

    createScene(id) {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf8fafc);
        this.scenes.set(id, scene);
        return scene;
    }

    createCamera(id, type = 'perspective') {
        let camera;
        if (type === 'perspective') {
            camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
            camera.position.set(5, 5, 5);
        } else {
            camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 1000);
            camera.position.set(0, 0, 5);
        }
        
        this.cameras.set(id, camera);
        return camera;
    }

    createRenderer(id, container) {
        const renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true
        });
        
        const rect = container.getBoundingClientRect();
        renderer.setSize(rect.width, rect.height);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        container.appendChild(renderer.domElement);
        this.renderers.set(id, renderer);
        
        // Responsive resize
        this.setupResizeHandler(id, container, renderer);
        
        return renderer;
    }

    setupLighting(scene) {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        scene.add(ambientLight);

        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);

        // Point light
        const pointLight = new THREE.PointLight(0xffffff, 0.3);
        pointLight.position.set(-10, -10, -5);
        scene.add(pointLight);
    }

    addCoordinateSystem(scene, size = 5) {
        const axes = new THREE.Group();
        
        // X axis (kırmızı)
        const xGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(size, 0, 0)
        ]);
        const xMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
        const xAxis = new THREE.Line(xGeometry, xMaterial);
        axes.add(xAxis);

        // Y axis (yeşil)
        const yGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, size, 0)
        ]);
        const yMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        const yAxis = new THREE.Line(yGeometry, yMaterial);
        axes.add(yAxis);

        // Z axis (mavi)
        const zGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, size)
        ]);
        const zMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
        const zAxis = new THREE.Line(zGeometry, zMaterial);
        axes.add(zAxis);

        scene.add(axes);
        return axes;
    }

    setupCameraControls(id, camera, renderer) {
        // Basit mouse kontrolları - Three.js OrbitControls olmadan
        const canvas = renderer.domElement;
        let isMouseDown = false;
        let mouseX = 0, mouseY = 0;
        let theta = 0, phi = 0;
        const radius = camera.position.length();

        canvas.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!isMouseDown) return;

            const deltaX = e.clientX - mouseX;
            const deltaY = e.clientY - mouseY;

            theta += deltaX * 0.01;
            phi += deltaY * 0.01;

            phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));

            camera.position.x = radius * Math.sin(phi) * Math.cos(theta);
            camera.position.y = radius * Math.cos(phi);
            camera.position.z = radius * Math.sin(phi) * Math.sin(theta);

            camera.lookAt(0, 0, 0);

            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        canvas.addEventListener('mouseup', () => {
            isMouseDown = false;
        });

        // Zoom
        canvas.addEventListener('wheel', (e) => {
            const scale = e.deltaY > 0 ? 1.1 : 0.9;
            camera.position.multiplyScalar(scale);
        });
    }

    startRenderLoop(id, scene, camera, renderer) {
        const animate = () => {
            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        };
        animate();
    }

    setupResizeHandler(id, container, renderer) {
        const camera = this.cameras.get(id);
        
        const handleResize = () => {
            const rect = container.getBoundingClientRect();
            camera.aspect = rect.width / rect.height;
            camera.updateProjectionMatrix();
            renderer.setSize(rect.width, rect.height);
        };

        window.addEventListener('resize', handleResize);
        
        // ResizeObserver for container size changes
        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(handleResize);
            resizeObserver.observe(container);
        }
    }

    // Easing fonksiyonları
    applyEasing(t, type) {
        switch (type) {
            case 'linear': return t;
            case 'easeInQuad': return t * t;
            case 'easeOutQuad': return t * (2 - t);
            case 'easeInOutQuad': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            case 'easeInCubic': return t * t * t;
            case 'easeOutCubic': return (--t) * t * t + 1;
            case 'easeInOutCubic': return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
            default: return t;
        }
    }

    // Utility fonksiyonlar
    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    setNestedProperty(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => current[key], obj);
        target[lastKey] = value;
    }

    interpolateValue(start, end, progress) {
        if (typeof start === 'number') {
            return start + (end - start) * progress;
        }
        // Vector3, Color vb. için genişletilebilir
        return end;
    }

    is2DFunction(functionStr) {
        return /^[^,]*$/.test(functionStr) && functionStr.includes('x');
    }

    is3DFunction(functionStr) {
        return functionStr.includes('x') && functionStr.includes('z');
    }

    isParametricFunction(functionStr) {
        return functionStr.includes('t') && functionStr.includes(',');
    }

    // Cleanup
    dispose(id) {
        const scene = this.scenes.get(id);
        const renderer = this.renderers.get(id);
        
        if (scene) {
            scene.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
        
        if (renderer) {
            renderer.dispose();
            if (renderer.domElement.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
        }

        this.scenes.delete(id);
        this.renderers.delete(id);
        this.cameras.delete(id);
    }
}

// Export singleton instance
export const visualizationEngine = new AdvancedVisualizationEngine();