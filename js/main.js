// Main Application Entry Point

const App = {
    async init() {
        console.log('🚀 IPOGains Application Starting...');

        // Check authentication
        await this.checkAuth();

        // Load components
        this.loadComponents();

        // Setup event listeners
        this.setupEventListeners();

        // Load initial data
        await this.loadInitialData();

        console.log('✅ IPOGains Application Ready!');
    },

    async checkAuth() {
        const token = Storage.get(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        const userData = Storage.get(APP_CONFIG.STORAGE_KEYS.USER_DATA);

        console.log('🔐 Checking authentication...', { hasToken: !!token, hasUserData: !!userData });

        if (token) {
            try {
                const data = await API.get('/auth/me');
                console.log('✅ User authenticated:', data.user.email);

                // Update stored user data
                Storage.set(APP_CONFIG.STORAGE_KEYS.USER_DATA, data.user);

                this.showAuthenticatedUI(data.user);
            } catch (error) {
                console.error('❌ Token validation failed:', error);
                // Token invalid, clear storage
                Storage.remove(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
                Storage.remove(APP_CONFIG.STORAGE_KEYS.USER_DATA);
                this.showGuestUI();
            }
        } else {
            console.log('👤 No token found - showing guest UI');
            this.showGuestUI();
        }
    },

    showGuestUI() {
        console.log('👤 Showing guest UI');
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const userMenu = document.getElementById('userMenu');

        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (registerBtn) registerBtn.style.display = 'inline-flex';
        if (userMenu) userMenu.style.display = 'none';

        // Show mobile links (Clear inline style so CSS takes over)
        const mobileLogin = document.getElementById('mobileLoginLink');
        const mobileRegister = document.getElementById('mobileRegisterLink');
        if (mobileLogin) mobileLogin.style.display = '';
        if (mobileRegister) mobileRegister.style.display = '';
    },

    showAuthenticatedUI(user) {
        console.log('✅ Showing authenticated UI for:', user.email, 'Role:', user.role);
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const userMenu = document.getElementById('userMenu');
        const adminLink = document.getElementById('adminLink');

        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (userMenu) {
            userMenu.style.display = 'block';
            console.log('✅ User menu displayed');
        }

        if (user.role === 'admin' && adminLink) {
            adminLink.style.display = 'block';
            console.log('✅ Admin link displayed');
        }

        // Hide guest mobile links
        const mobileLogin = document.getElementById('mobileLoginLink');
        const mobileRegister = document.getElementById('mobileRegisterLink');
        if (mobileLogin) mobileLogin.style.display = 'none';
        if (mobileRegister) mobileRegister.style.display = 'none';
    },

    loadComponents() {
        // Components will load their own HTML
        // This is handled by individual component files
    },

    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🚪 Logout clicked');
                this.logout();
            });
        }

        // Login/Register buttons
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => Modals.open('loginModal'));
        }

        if (registerBtn) {
            registerBtn.addEventListener('click', () => Modals.open('registerModal'));
        }

        // Mobile menu
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const navLinks = document.getElementById('navLinks');

        if (mobileMenuBtn && navLinks) {
            mobileMenuBtn.addEventListener('click', () => {
                navLinks.classList.toggle('active');
            });
        }

        // User Dropdown Toggle
        const userMenu = document.getElementById('userMenu');
        if (userMenu) {
            const dropdown = userMenu.querySelector('.dropdown-menu');
            const menuBtn = userMenu.querySelector('.btn-icon');

            if (menuBtn && dropdown) {
                menuBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    console.log('👤 User menu clicked');
                    dropdown.classList.toggle('show');

                    // Add/Remove class for manual display if hover fails
                    if (dropdown.classList.contains('show')) {
                        dropdown.style.opacity = '1';
                        dropdown.style.visibility = 'visible';
                        dropdown.style.transform = 'translateY(0)';
                    } else {
                        dropdown.style.opacity = '0';
                        dropdown.style.visibility = 'hidden';
                        dropdown.style.transform = 'translateY(-10px)';
                    }
                });

                // Close dropdown when clicking outside
                document.addEventListener('click', (e) => {
                    if (!userMenu.contains(e.target)) {
                        dropdown.classList.remove('show');
                        dropdown.style.opacity = '0';
                        dropdown.style.visibility = 'hidden';
                        dropdown.style.transform = 'translateY(-10px)';
                    }
                });
            }
        }

        // Smooth scroll for nav links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                // Skip if it's just "#" or if it's a modal trigger
                if (href === '#' || this.hasAttribute('onclick')) {
                    return;
                }

                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                    navLinks?.classList.remove('active');
                }
            });
        });

        // Navbar scroll effect
        // Smart Navbar (Hide on scroll down, Show on scroll up)
        let lastScrollY = window.scrollY;

        window.addEventListener('scroll', () => {
            const navbar = document.getElementById('navbar');
            const navLinks = document.getElementById('navLinks');

            if (navbar) {
                const currentScrollY = window.scrollY;

                // Add shadow on scroll
                if (currentScrollY > 20) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }

                // Hide/Show logic
                // Only hide if:
                // 1. Scrolling DOWN
                // 2. Not at the very top (> 100px)
                // 3. Mobile menu is NOT open
                const isMenuOpen = navLinks && navLinks.classList.contains('active');

                if (currentScrollY > lastScrollY && currentScrollY > 100 && !isMenuOpen) {
                    navbar.classList.add('navbar-hidden');
                } else {
                    navbar.classList.remove('navbar-hidden');
                }

                lastScrollY = currentScrollY;
            }
        }, { passive: true });

        // Prevent accidental logout on page unload
        window.addEventListener('beforeunload', () => {
            console.log('📄 Page unloading - auth state preserved');
        });

        // Initialize Newsletter
        this.setupNewsletter();

        // Setup Mobile Auth Links (Login/Register inside menu)
        this.setupMobileAuthLinks();
    },

    setupMobileAuthLinks() {
        const navLinks = document.getElementById('navLinks');
        if (!navLinks) return;

        // Check if already added
        if (navLinks.querySelector('.mobile-only-auth')) return;

        // Container for mobile auth
        const container = document.createElement('div');
        container.className = 'mobile-only-auth mobile-only-link'; // Uses CSS to hide on desktop
        container.style.display = 'contents'; // Let children use flex/block from CSS

        // Login Link
        const loginLink = document.createElement('a');
        loginLink.href = '#';
        loginLink.className = 'nav-link mobile-only-link';
        loginLink.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        loginLink.onclick = (e) => {
            e.preventDefault();
            Modals.open('loginModal');
            navLinks.classList.remove('active'); // Close menu
        };
        loginLink.id = 'mobileLoginLink';

        // Register Link
        const registerLink = document.createElement('a');
        registerLink.href = '#';
        registerLink.className = 'nav-link mobile-only-link';
        registerLink.innerHTML = '<i class="fas fa-user-plus"></i> Register';
        registerLink.onclick = (e) => {
            e.preventDefault();
            Modals.open('registerModal');
            navLinks.classList.remove('active'); // Close menu
        };
        registerLink.id = 'mobileRegisterLink';

        navLinks.appendChild(loginLink);
        navLinks.appendChild(registerLink);
    },

    setupNewsletter() {
        const popup = document.getElementById('newsletterPopup');
        const closeBtn = document.getElementById('closeNewsletterPopup');
        const popupForm = document.getElementById('popupNewsletterForm');
        const footerForm = document.getElementById('newsletterForm');

        // Handle Popup Display
        if (popup) {
            const hasInteracted = localStorage.getItem('newsletterInteracted');

            if (!hasInteracted) {
                // Show after 3 seconds
                setTimeout(() => {
                    popup.classList.remove('hidden');
                    // Small delay to allow display:block to apply before opacity transition
                    requestAnimationFrame(() => {
                        popup.classList.add('visible');
                    });
                }, 3000);

                // Auto hide ("go where it is now") after 10 seconds
                setTimeout(() => {
                    if (popup.classList.contains('visible')) {
                        popup.classList.remove('visible');
                        popup.classList.add('minimized'); // Optional: Add a class for specific exit animation
                        localStorage.setItem('newsletterInteracted', 'true'); // Don't show again in session
                        // Fully hide after transition
                        setTimeout(() => popup.classList.add('hidden'), 500);
                    }
                }, 13000);
            }

            // Close Button
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    popup.classList.remove('visible');
                    localStorage.setItem('newsletterInteracted', 'true');
                    setTimeout(() => popup.classList.add('hidden'), 500);
                });
            }
        }

        // Shared Submit Handler
        const handleSubscribe = async (e) => {
            e.preventDefault();
            const form = e.target;
            const input = form.querySelector('input[type="email"]');
            const btn = form.querySelector('button');
            const email = input.value;

            if (!email) return;

            const originalContent = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;

            try {
                const response = await fetch(`${APP_CONFIG.API_URL}/subscribers/subscribe`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();

                if (data.success) {
                    Helpers.showToast(data.message, 'success');
                    localStorage.setItem('newsletterInteracted', 'true');
                    if (popup) {
                        popup.classList.remove('visible');
                        setTimeout(() => popup.classList.add('hidden'), 500);
                    }
                    form.reset();
                } else {
                    Helpers.showToast(data.message || 'Subscription failed', 'error');
                }
            } catch (error) {
                console.error('Subscription error:', error);
                Helpers.showToast('Failed to subscribe. Please try again.', 'error');
            } finally {
                btn.innerHTML = originalContent;
                btn.disabled = false;
            }
        };

        if (popupForm) popupForm.addEventListener('submit', handleSubscribe);
        if (footerForm) footerForm.addEventListener('submit', handleSubscribe);
    },

    async loadInitialData() {
        try {
            // Load stats
            const stats = await API.get('/ipos/stats/overview');
            if (stats.stats) {
                this.updateStats(stats.stats);
            }
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    },

    updateStats(stats) {
        const elements = {
            totalIPOs: document.getElementById('totalIPOs'),
            openIPOs: document.getElementById('openIPOs'),
            upcomingIPOs: document.getElementById('upcomingIPOs'),
            avgGain: document.getElementById('avgGain')
        };

        if (elements.totalIPOs) elements.totalIPOs.textContent = stats.total;
        if (elements.openIPOs) elements.openIPOs.textContent = stats.open;
        if (elements.upcomingIPOs) elements.upcomingIPOs.textContent = stats.upcoming;
        if (elements.avgGain) elements.avgGain.textContent = stats.averageListingGain + '%';
    },

    logout() {
        console.log('🚪 Logging out...');
        Storage.remove(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        Storage.remove(APP_CONFIG.STORAGE_KEYS.USER_DATA);
        console.log('✅ Storage cleared');

        Helpers.showToast('Logged out successfully', 'success');

        setTimeout(() => {
            console.log('🔄 Reloading page...');
            location.reload();
        }, 500);
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());

// Make App globally available
window.App = App;

// Debug helper - check auth status
window.checkAuthStatus = () => {
    const token = Storage.get(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    const userData = Storage.get(APP_CONFIG.STORAGE_KEYS.USER_DATA);
    console.log('🔍 Auth Status:', {
        hasToken: !!token,
        token: token ? token.substring(0, 20) + '...' : null,
        userData: userData
    });
};
