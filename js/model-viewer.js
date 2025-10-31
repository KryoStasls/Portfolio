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
        
        // Camera setup
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
        this.camera.position.set(0, 1, 3);
        
        // Renderer setup with mobile optimizations
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: !this.isMobile, // Disable antialiasing on mobile for performance
            alpha: true,
            powerPreference: this.isMobile ? "low-power" : "high-performance"
        });
        
        this.renderer.setPixelRatio(this.pixelRatio);
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.shadowMap.enabled = !this.isMobile; // Disable shadows on mobile
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        // Lighting setup
        this.setupLighting();
        
        // Controls setup with touch support
        this.setupControls();
        
        // Touch event handlers for mobile
        this.setupTouchHandlers();
        
        // Handle resize
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);
        
        // Handle visibility change (pause when not visible)
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
            dirLight.shadow.mapSize.width = this.isMobile ? 512 : 2048;
            dirLight.shadow.mapSize.height = this.isMobile ? 512 : 2048;
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
        this.controls = new THREE.OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 10;
        this.controls.enablePan = !this.isMobile; // Disable pan on mobile
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 2;
        
        // Mobile-specific settings
        if (this.isMobile) {
            this.controls.rotateSpeed = 0.5;
            this.controls.zoomSpeed = 0.8;
        }
    }

    setupTouchHandlers() {
        if (!this.isMobile) return;
        
        // Touch start
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
        
        // Touch move
        this.canvas.addEventListener('touchmove', (e) => {
            if (!this.isTouch) return;
            
            if (e.touches.length === 2 && this.touchStartDistance > 0) {
                // Pinch zoom
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const scale = distance / this.touchStartDistance;
                
                // Adjust camera distance based on pinch
                const newDistance = this.camera.position.length() / scale;
                if (newDistance > this.controls.minDistance && newDistance < this.controls.maxDistance) {
                    this.camera.position.multiplyScalar(1 / scale);
                    this.touchStartDistance = distance;
                }
            }
        }, { passive: true });
        
        // Touch end
        this.canvas.addEventListener('touchend', () => {
            this.isTouch = false;
            this.touchStartDistance = 0;
        }, { passive: true });
    }

    loadModel(modelPath) {
        // Show loading state
        this.showLoading(true);
        
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
                const scale = 2 / maxDim;
                
                this.model.scale.multiplyScalar(scale);
                this.model.position.sub(center.multiplyScalar(scale));
                
                // Setup materials for mobile
                this.model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = !this.isMobile;
                        child.receiveShadow = !this.isMobile;
                        
                        // Save original materials
                        if (child.material && child.material.map) {
                            child.userData.originalMap = child.material.map;
                        }
                        
                        // Optimize materials for mobile
                        if (this.isMobile && child.material) {
                            child.material.envMapIntensity = 0.5;
                            child.material.roughness = Math.min(child.material.roughness + 0.1, 1);
                        }
                    }
                });
                
                this.scene.add(this.model);
                this.showLoading(false);
                
                // Start animation
                if (!this.animationId) {
                    this.animate();
                }
                
                // Enable auto-rotate for 2 seconds to show the model
                this.controls.autoRotate = true;
                setTimeout(() => {
                    this.controls.autoRotate = false;
                }, 2000);
            },
            (progress) => {
                const percent = (progress.loaded / progress.total) * 100;
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
                        // Restore original texture if available
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
        
        // Only render when visible
        if (document.hidden) return;
        
        // Update controls
        if (this.controls) {
            this.controls.update();
        }
        
        // Render
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    handleResize() {
        if (!this.camera || !this.renderer || !this.canvas) return;
        
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        
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
        // Cancel animation
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        
        // Dispose Three.js objects
        if (this.model) {
            this.disposeModel(this.model);
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.controls) {
            this.controls.dispose();
        }
        
        // Clear references
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

// Auto-load on mobile if user opts in
document.addEventListener('DOMContentLoaded', () => {
    // Check if mobile and if user has preference
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Add info text for mobile users
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