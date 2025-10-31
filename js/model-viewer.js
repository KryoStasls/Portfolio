// js/model-viewer.js - Mobile-Optimized 3D Model Viewer

// Store active viewers
const viewers = {};

// Model Viewer Class
class ModelViewer {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.canvas = document.getElementById(canvasId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.model = null;
        this.animationId = null;
        this.viewMode = 'textured';
        this.isInitialized = false;
        
        // Touch handling
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartDistance = 0;
        this.isTouch = false;
        
        // Performance settings
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.pixelRatio = this.isMobile ? Math.min(window.devicePixelRatio, 2) : window.devicePixelRatio;
    }

    init() {
        if (this.isInitialized) return;
        
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0e27);
        
        // Get proper dimensions from parent container
        const container = this.canvas.parentElement;
        const width = container.clientWidth || container.offsetWidth || 400;
        const height = container.clientHeight || container.offsetHeight || 400;
        
        // Camera setup
        const aspect = width / height;
        this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
        this.camera.position.set(0, 1, 3);
        
        // Renderer setup with mobile optimizations
        try {
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                antialias: !this.isMobile,
                alpha: true,
                powerPreference: this.isMobile ? "low-power" : "high-performance"
            });
            
            this.renderer.setPixelRatio(this.pixelRatio);
            this.renderer.setSize(width, height);
            this.canvas.style.width = width + 'px';
            this.canvas.style.height = height + 'px';
            
            this.renderer.shadowMap.enabled = !this.isMobile;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.outputEncoding = THREE.sRGBEncoding;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.2;
        } catch (error) {
            console.error('Failed to create WebGL renderer:', error);
            this.showError('WebGL not supported');
            return;
        }
        
        // Lighting setup
        this.setupLighting();
        
        // Controls setup with touch support
        this.setupControls();
        
        // Touch event handlers for mobile
        this.setupTouchHandlers();
        
        // Handle resize
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);
        
        // Handle visibility change
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        
        this.isInitialized = true;
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Main directional light
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 5);
        if (!this.isMobile) {
            dirLight.castShadow = true;
            dirLight.shadow.camera.near = 0.1;
            dirLight.shadow.camera.far = 50;
            dirLight.shadow.camera.left = -10;
            dirLight.shadow.camera.right = 10;
            dirLight.shadow.camera.top = 10;
            dirLight.shadow.camera.bottom = -10;
            dirLight.shadow.mapSize.width = 2048;
            dirLight.shadow.mapSize.height = 2048;
        }
        this.scene.add(dirLight);
        
        // Fill light
        const fillLight = new THREE.DirectionalLight(0x667eea, 0.3);
        fillLight.position.set(-5, 5, -5);
        this.scene.add(fillLight);
        
        // Rim light
        const rimLight = new THREE.DirectionalLight(0x764ba2, 0.2);
        rimLight.position.set(0, -5, -10);
        this.scene.add(rimLight);
    }

    setupControls() {
        if (!THREE.OrbitControls) {
            console.error('OrbitControls not loaded!');
            return;
        }
        
        this.controls = new THREE.OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 10;
        this.controls.enablePan = !this.isMobile;
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 2;
        
        if (this.isMobile) {
            this.controls.rotateSpeed = 0.5;
            this.controls.zoomSpeed = 0.8;
        }
    }

    setupTouchHandlers() {
        if (!this.isMobile) return;
        
        this.canvas.addEventListener('touchstart', (e) => {
            this.isTouch = true;
            
            if (e.touches.length === 1) {
                this.touchStartX = e.touches[0].clientX;
                this.touchStartY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                this.touchStartDistance = Math.sqrt(dx * dx + dy * dy);
            }
        }, { passive: true });
        
        this.canvas.addEventListener('touchmove', (e) => {
            if (!this.isTouch) return;
            
            if (e.touches.length === 2 && this.touchStartDistance > 0) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const scale = distance / this.touchStartDistance;
                
                const newDistance = this.camera.position.length() / scale;
                if (newDistance > this.controls.minDistance && newDistance < this.controls.maxDistance) {
                    this.camera.position.multiplyScalar(1 / scale);
                    this.touchStartDistance = distance;
                }
            }
        }, { passive: true });
        
        this.canvas.addEventListener('touchend', () => {
            this.isTouch = false;
            this.touchStartDistance = 0;
        }, { passive: true });
    }

    loadModel(modelPath) {
        // Show loading state
        this.showLoading(true);
        
        if (!THREE.GLTFLoader) {
            console.error('GLTFLoader is not available!');
            this.showError('3D loader not available');
            this.showLoading(false);
            return;
        }
        
        const loader = new THREE.GLTFLoader();
        
        loader.load(
            modelPath,
            (gltf) => {
                // Remove old model
                if (this.model) {
                    this.scene.remove(this.model);
                    this.disposeModel(this.model);
                }
                
                this.model = gltf.scene;
                
                // Center and scale model
                const box = new THREE.Box3().setFromObject(this.model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = maxDim > 0 ? 2 / maxDim : 1;
                
                this.model.scale.multiplyScalar(scale);
                this.model.position.sub(center.multiplyScalar(scale));
                
                // Setup materials
                this.model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = !this.isMobile;
                        child.receiveShadow = !this.isMobile;
                        
                        if (child.material && child.material.map) {
                            child.userData.originalMap = child.material.map;
                        }
                        
                        if (this.isMobile && child.material) {
                            child.material.envMapIntensity = 0.5;
                            child.material.roughness = Math.min(child.material.roughness + 0.1, 1);
                        }
                    }
                });
                
                this.scene.add(this.model);
                this.showLoading(false);
                
                // Force a resize to ensure proper dimensions
                this.handleResize();
                
                // Start animation if not already running
                if (!this.animationId) {
                    this.animate();
                }
                
                // Enable auto-rotate for 2 seconds
                this.controls.autoRotate = true;
                setTimeout(() => {
                    this.controls.autoRotate = false;
                }, 2000);
            },
            (progress) => {
                const percent = progress.total > 0 ? (progress.loaded / progress.total) * 100 : 0;
                this.updateLoadingProgress(percent);
            },
            (error) => {
                console.error('Error loading model:', error);
                this.showError('Failed to load 3D model');
                this.showLoading(false);
            }
        );
    }

    setViewMode(mode) {
        this.viewMode = mode;
        
        if (!this.model) return;
        
        this.model.traverse((child) => {
            if (child.isMesh) {
                switch(mode) {
                    case 'wireframe':
                        child.material.wireframe = true;
                        break;
                    case 'solid':
                        child.material.wireframe = false;
                        if (child.material.map) {
                            child.material.map = null;
                            child.material.color = new THREE.Color(0x808080);
                            child.material.needsUpdate = true;
                        }
                        break;
                    case 'textured':
                    default:
                        child.material.wireframe = false;
                        if (child.userData.originalMap) {
                            child.material.map = child.userData.originalMap;
                            child.material.needsUpdate = true;
                        }
                        break;
                }
            }
        });
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        if (document.hidden) return;
        
        if (this.controls) {
            this.controls.update();
        }
        
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    handleResize() {
        if (!this.camera || !this.renderer || !this.canvas) return;
        
        // Get the parent container dimensions
        const container = this.canvas.parentElement;
        const width = container.clientWidth || container.offsetWidth || 400;
        const height = container.clientHeight || container.offsetHeight || 400;
        
        // Ensure canvas has explicit dimensions
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    handleVisibilityChange() {
        if (document.hidden && this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        } else if (!document.hidden && this.model && !this.animationId) {
            this.animate();
        }
    }

    showLoading(show) {
        const container = this.canvas.parentElement;
        let loadingEl = container.querySelector('.model-loading');
        
        if (show) {
            if (!loadingEl) {
                loadingEl = document.createElement('div');
                loadingEl.className = 'model-loading';
                loadingEl.innerHTML = `
                    <div class="spinner"></div>
                    <div class="loading-text">Loading 3D Model...</div>
                    <div class="loading-progress">0%</div>
                `;
                container.appendChild(loadingEl);
            }
        } else if (loadingEl) {
            loadingEl.remove();
        }
    }

    updateLoadingProgress(percent) {
        const container = this.canvas.parentElement;
        const progressEl = container.querySelector('.loading-progress');
        if (progressEl) {
            progressEl.textContent = `${Math.round(percent)}%`;
        }
    }

    showError(message) {
        const container = this.canvas.parentElement;
        let errorEl = container.querySelector('.model-error');
        
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'model-error';
            errorEl.textContent = message;
            container.appendChild(errorEl);
            
            setTimeout(() => errorEl.remove(), 5000);
        }
    }

    disposeModel(model) {
        model.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => this.disposeMaterial(material));
                } else {
                    this.disposeMaterial(child.material);
                }
            }
        });
    }

    disposeMaterial(material) {
        if (material.map) material.map.dispose();
        if (material.normalMap) material.normalMap.dispose();
        if (material.roughnessMap) material.roughnessMap.dispose();
        if (material.metalnessMap) material.metalnessMap.dispose();
        material.dispose();
    }

    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        
        if (this.model) {
            this.disposeModel(this.model);
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.controls) {
            this.controls.dispose();
        }
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.model = null;
    }
}

// Global functions for HTML onclick handlers
function load3DModel(canvasId, modelPath, buttonElement) {
    // Check if Three.js is loaded
    if (typeof THREE === 'undefined') {
        console.error('Three.js is not loaded');
        alert('Three.js library is not loaded');
        return;
    }
    
    // Check if GLTFLoader is loaded
    if (typeof THREE.GLTFLoader === 'undefined') {
        console.error('GLTFLoader is not loaded');
        alert('GLTF Loader is not available');
        return;
    }
    
    // Initialize viewer if needed
    if (!viewers[canvasId]) {
        viewers[canvasId] = new ModelViewer(canvasId);
        viewers[canvasId].init();
    }
    
    // Show canvas and hide placeholder
    const canvas = document.getElementById(canvasId);
    const container = canvas.parentElement;
    const placeholder = container.querySelector('.model-placeholder');
    
    canvas.classList.add('active');
    if (placeholder) {
        placeholder.classList.add('hidden');
    }
    
    // Load the model
    viewers[canvasId].loadModel(modelPath);
    
    // Update button states if needed
    if (buttonElement) {
        buttonElement.style.display = 'none';
    }
}

function setViewMode(canvasId, mode, buttonElement) {
    if (!viewers[canvasId]) return;
    
    viewers[canvasId].setViewMode(mode);
    
    // Update button states
    const container = buttonElement.parentElement;
    container.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    buttonElement.classList.add('active');
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    Object.values(viewers).forEach(viewer => viewer.dispose());
});

// Mobile info tooltips
document.addEventListener('DOMContentLoaded', () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
        const modelViewers = document.querySelectorAll('.model-viewer');
        modelViewers.forEach(viewer => {
            const container = viewer.querySelector('.model-container');
            if (container && !container.querySelector('.mobile-info')) {
                const info = document.createElement('div');
                info.className = 'mobile-info';
                info.innerHTML = '📱 Tap to load • Pinch to zoom • Drag to rotate';
                info.style.cssText = 'position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); font-size: 0.8rem; color: var(--text-secondary); text-align: center; z-index: 10; background: rgba(0,0,0,0.5); padding: 5px 10px; border-radius: 5px;';
                container.appendChild(info);
            }
        });
    }
});