// Mobile Optimization Module
const MobileManager = {
    // Detect mobile device
    isMobile: () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    },
    
    // Detect touch device
    isTouch: () => {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    },
    
    // Initialize mobile optimizations
    init: () => {
        if (MobileManager.isMobile()) {
            document.body.classList.add('mobile-device');
            
            // Add touch-specific optimizations
            if (MobileManager.isTouch()) {
                document.body.classList.add('touch-device');
            }
            
            // Setup mobile-specific event listeners
            MobileManager.setupMobileEvents();
            
            // Optimize viewport
            MobileManager.optimizeViewport();
            
            // Setup swipe gestures
            MobileManager.setupSwipeGestures();
        }
    },
    
    // Setup mobile-specific events
    setupMobileEvents: () => {
        // Prevent zoom on double tap for buttons
        document.addEventListener('touchend', (e) => {
            if (e.target.matches('button, .btn, .ribbon-btn')) {
                e.preventDefault();
            }
        });
        
        // Handle orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                MobileManager.handleOrientationChange();
            }, 100);
        });
        
        // Handle keyboard appearance on mobile
        if (MobileManager.isMobile()) {
            const viewport = document.querySelector('meta[name=viewport]');
            let originalContent = viewport.content;
            
            document.addEventListener('focusin', (e) => {
                if (e.target.matches('input, textarea, select')) {
                    viewport.content = originalContent + ', user-scalable=yes';
                }
            });
            
            document.addEventListener('focusout', (e) => {
                if (e.target.matches('input, textarea, select')) {
                    viewport.content = originalContent;
                }
            });
        }
    },
    
    // Optimize viewport for mobile
    optimizeViewport: () => {
        const viewport = document.querySelector('meta[name=viewport]');
        if (viewport) {
            viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        }
    },
    
    // Handle orientation change
    handleOrientationChange: () => {
        // Refresh charts if visible
        if (!document.getElementById('charts-area').classList.contains('hidden')) {
            setTimeout(() => {
                ChartsManager.refreshAll();
            }, 300);
        }
        
        // Adjust modal positioning
        const modal = document.getElementById('modal');
        if (modal.classList.contains('active')) {
            MobileManager.adjustModalForMobile();
        }
        
        // Adjust search popup
        const searchPopup = document.getElementById('searchPopup');
        if (searchPopup.classList.contains('active')) {
            MobileManager.adjustSearchPopupForMobile();
        }
    },
    
    // Setup swipe gestures
    setupSwipeGestures: () => {
        let startX = 0;
        let startY = 0;
        let endX = 0;
        let endY = 0;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchend', (e) => {
            endX = e.changedTouches[0].clientX;
            endY = e.changedTouches[0].clientY;
            
            MobileManager.handleSwipe(startX, startY, endX, endY);
        });
    },
    
    // Handle swipe gestures
    handleSwipe: (startX, startY, endX, endY) => {
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const minSwipeDistance = 50;
        
        // Horizontal swipe
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX > 0) {
                // Swipe right
                MobileManager.handleSwipeRight();
            } else {
                // Swipe left
                MobileManager.handleSwipeLeft();
            }
        }
        
        // Vertical swipe
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > minSwipeDistance) {
            if (deltaY > 0) {
                // Swipe down
                MobileManager.handleSwipeDown();
            } else {
                // Swipe up
                MobileManager.handleSwipeUp();
            }
        }
    },
    
    // Handle swipe right
    handleSwipeRight: () => {
        // Open mobile menu if closed
        if (!STATE.mobileMenuOpen) {
            toggleMobileMenu();
        }
    },
    
    // Handle swipe left
    handleSwipeLeft: () => {
        // Close mobile menu if open
        if (STATE.mobileMenuOpen) {
            toggleMobileMenu();
        }
    },
    
    // Handle swipe up
    handleSwipeUp: () => {
        // Open search popup if on home screen
        if (!document.getElementById('home-screen').classList.contains('hidden')) {
            toggleSearchPopup();
        }
    },
    
    // Handle swipe down
    handleSwipeDown: () => {
        // Close search popup if open
        if (STATE.searchPopupOpen) {
            closeSearchPopup();
        }
    },
    
    // Adjust modal for mobile
    adjustModalForMobile: () => {
        const modal = document.getElementById('modal');
        const modalContent = modal.querySelector('.modal-content');
        
        if (MobileManager.isMobile()) {
            modalContent.style.maxHeight = '90vh';
            modalContent.style.maxWidth = '95vw';
            modalContent.style.margin = '1rem';
        }
    },
    
    // Adjust search popup for mobile
    adjustSearchPopupForMobile: () => {
        const searchPopup = document.getElementById('searchPopup');
        
        if (MobileManager.isMobile()) {
            searchPopup.style.bottom = '20px';
            searchPopup.style.right = '10px';
            searchPopup.style.left = '10px';
            searchPopup.style.minWidth = 'auto';
        }
    },
    
    // Toggle mobile menu
    toggleMobileMenu: () => {
        STATE.mobileMenuOpen = !STATE.mobileMenuOpen;
        const mobileMenu = document.getElementById('mobileMenu');
        
        if (STATE.mobileMenuOpen) {
            mobileMenu.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        }
    },
    
    // Optimize button sizes for touch
    optimizeButtonSizes: () => {
        const buttons = document.querySelectorAll('button, .btn');
        buttons.forEach(button => {
            const rect = button.getBoundingClientRect();
            if (rect.height < 44) {
                button.style.minHeight = '44px';
            }
            if (rect.width < 44) {
                button.style.minWidth = '44px';
            }
        });
    },
    
    // Setup pull-to-refresh
    setupPullToRefresh: () => {
        let startY = 0;
        let currentY = 0;
        let isPulling = false;
        
        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
            }
        });
        
        document.addEventListener('touchmove', (e) => {
            if (window.scrollY === 0) {
                currentY = e.touches[0].clientY;
                const diff = currentY - startY;
                
                if (diff > 0 && diff > 50) {
                    isPulling = true;
                    e.preventDefault();
                }
            }
        });
        
        document.addEventListener('touchend', () => {
            if (isPulling) {
                isPulling = false;
                MobileManager.handlePullToRefresh();
            }
        });
    },
    
    // Handle pull-to-refresh
    handlePullToRefresh: () => {
        showToast('Atualizando dados...', 'info');
        
        // Refresh current screen data
        if (!document.getElementById('home-screen').classList.contains('hidden')) {
            updateHomeStats();
        } else if (!document.getElementById('goals-screen').classList.contains('hidden')) {
            updateGoalsDisplay();
        } else if (!document.getElementById('transactions-recent-screen').classList.contains('hidden')) {
            TransactionUI.updateRecentTransactions();
        } else if (!document.getElementById('charts-area').classList.contains('hidden')) {
            ChartsManager.refreshAll();
        }
        
        setTimeout(() => {
            showToast('Dados atualizados!', 'success');
        }, 1000);
    },
    
    // Setup mobile-specific keyboard handling
    setupMobileKeyboard: () => {
        const inputs = document.querySelectorAll('input, textarea');
        
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                if (MobileManager.isMobile()) {
                    setTimeout(() => {
                        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300);
                }
            });
        });
    },
    
    // Optimize font sizes for mobile
    optimizeFontSizes: () => {
        if (MobileManager.isMobile()) {
            const style = document.createElement('style');
            style.textContent = `
                @media (max-width: 768px) {
                    .home-title { font-size: 2.5rem !important; }
                    .home-subtitle { font-size: 1rem !important; }
                    .modal-title { font-size: 1.2rem !important; }
                    .section-header h2 { font-size: 1.5rem !important; }
                    .btn { font-size: 0.9rem !important; }
                    .form-input { font-size: 1rem !important; }
                }
            `;
            document.head.appendChild(style);
        }
    },
    
    // Setup haptic feedback
    setupHapticFeedback: () => {
        if ('vibrate' in navigator) {
            document.addEventListener('click', (e) => {
                if (e.target.matches('button, .btn')) {
                    navigator.vibrate(50);
                }
            });
        }
    }
};

// Mobile-specific UI functions
function toggleMobileMenu() {
    MobileManager.toggleMobileMenu();
}

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    const mobileMenu = document.getElementById('mobileMenu');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    
    if (STATE.mobileMenuOpen && 
        !mobileMenu.contains(e.target) && 
        !menuToggle.contains(e.target)) {
        toggleMobileMenu();
    }
});

// Initialize mobile optimizations
document.addEventListener('DOMContentLoaded', () => {
    MobileManager.init();
    
    // Setup additional mobile features
    if (MobileManager.isMobile()) {
        MobileManager.setupPullToRefresh();
        MobileManager.setupMobileKeyboard();
        MobileManager.optimizeFontSizes();
        MobileManager.setupHapticFeedback();
        
        // Optimize button sizes after DOM is loaded
        setTimeout(() => {
            MobileManager.optimizeButtonSizes();
        }, 100);
    }
});

// Handle window resize
window.addEventListener('resize', UTILS.debounce(() => {
    if (MobileManager.isMobile()) {
        MobileManager.optimizeButtonSizes();
        
        // Adjust modals and popups
        if (document.getElementById('modal').classList.contains('active')) {
            MobileManager.adjustModalForMobile();
        }
        
        if (document.getElementById('searchPopup').classList.contains('active')) {
            MobileManager.adjustSearchPopupForMobile();
        }
    }
}, 300));

// Prevent zoom on double tap for specific elements
document.addEventListener('touchend', (e) => {
    if (e.target.matches('.btn, button, .ribbon-btn, .floating-search')) {
        e.preventDefault();
    }
});

// Add mobile-specific CSS classes
if (MobileManager.isMobile()) {
    document.body.classList.add('mobile-device');
}

if (MobileManager.isTouch()) {
    document.body.classList.add('touch-device');
}

// Export for global use
window.MobileManager = MobileManager;