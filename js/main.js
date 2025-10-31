// js/main.js - Navigation and Common Functions

// Mobile Menu Toggle
function toggleMobileMenu() {
    const btn = document.querySelector('.mobile-menu-btn');
    const overlay = document.getElementById('mobileNav');
    
    if (btn && overlay) {
        btn.classList.toggle('active');
        overlay.classList.toggle('active');
        
        // Prevent body scroll when menu is open
        if (overlay.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
}

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    const overlay = document.getElementById('mobileNav');
    const btn = document.querySelector('.mobile-menu-btn');
    
    if (overlay && overlay.classList.contains('active')) {
        if (!overlay.contains(e.target) && !btn.contains(e.target)) {
            btn.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
});

// Smooth scroll for anchor links
document.addEventListener('DOMContentLoaded', () => {
    // Handle mobile menu links
    const mobileLinks = document.querySelectorAll('.mobile-nav-item, .mobile-nav-subitem');
    mobileLinks.forEach(link => {
        if (link.tagName === 'A') {
            link.addEventListener('click', () => {
                const btn = document.querySelector('.mobile-menu-btn');
                const overlay = document.getElementById('mobileNav');
                if (btn && overlay) {
                    btn.classList.remove('active');
                    overlay.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        }
    });
    
    // Add active class to current page nav item
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-item, .dropdown-item');
    
    navLinks.forEach(link => {
        if (link.tagName === 'A') {
            const href = link.getAttribute('href');
            if (href === currentPage) {
                link.classList.add('active');
                
                // Also highlight parent if in dropdown
                const parent = link.closest('.dropdown-trigger');
                if (parent) {
                    parent.classList.add('active');
                }
            }
        }
    });
    
    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.8s ease-out forwards';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe elements that should animate
    const animateElements = document.querySelectorAll('.asset-card, .render-image, .model-viewer');
    animateElements.forEach(el => {
        if (el) {
            el.style.opacity = '0';
            observer.observe(el);
        }
    });
    
    // Handle video loading
    const video = document.querySelector('.video-container video');
    if (video) {
        video.addEventListener('loadeddata', () => {
            video.play().catch(e => {
                console.log('Autoplay prevented:', e);
            });
        });
    }
    
    // Lazy load images
    if ('loading' in HTMLImageElement.prototype) {
        const images = document.querySelectorAll('img[loading="lazy"]');
        images.forEach(img => {
            if (img.dataset.src) {
                img.src = img.dataset.src;
            }
        });
    }
});

// Prevent zoom on double tap for iOS, while allowing taps on buttons/links
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        // Check if the tap target is a button, link, or has an onclick
        const targetElement = e.target;
        const isInteractive = targetElement.tagName === 'BUTTON' || 
                              targetElement.tagName === 'A' || 
                              targetElement.hasAttribute('onclick');

        if (!isInteractive) {
            e.preventDefault(); // Only prevent default if it's NOT a button/link
        }
    }
    lastTouchEnd = now;
}, false);

// Handle orientation change
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        window.scrollTo(0, 0);
    }, 100);
});

// Performance monitoring
if ('performance' in window && 'PerformanceObserver' in window) {
    try {
        const perfObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                // Log slow resources
                if (entry.duration > 3000) {
                    console.warn('Slow resource:', entry.name, entry.duration);
                }
            }
        });
        perfObserver.observe({ entryTypes: ['resource'] });
    } catch (e) {
        // PerformanceObserver might not be supported
    }
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    // ESC key closes mobile menu
    if (e.key === 'Escape') {
        const btn = document.querySelector('.mobile-menu-btn');
        const overlay = document.getElementById('mobileNav');
        if (btn && overlay && overlay.classList.contains('active')) {
            btn.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
});