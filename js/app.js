// API Base URL
const API_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : 'http://localhost:3000/api';

// Global state
let currentUser = null;
let authToken = localStorage.getItem('authToken');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    checkAuthStatus();
});

function initializeApp() {
    // Load stats
    loadStats();

    // Load IPOs
    loadIPOs();

    // Setup smooth scrolling
    setupSmoothScroll();

    // Setup navbar scroll effect
    setupNavbarScroll();
}

function setupEventListeners() {
    // Mobile menu
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Contact form
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmit);
    }

    // Newsletter form
    const newsletterForm = document.querySelector('.newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', handleNewsletterSubmit);
    }

    // Filter buttons
    setupFilters();

    // Search
    const searchInput = document.getElementById('searchIPO');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
}

function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

                // Close mobile menu if open
                document.getElementById('navLinks')?.classList.remove('active');

                // Update active nav link
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                });
                this.classList.add('active');
            }
        });
    });
}

function setupNavbarScroll() {
    const navbar = document.getElementById('navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    });
}

function setupFilters() {
    // Status filters
    document.querySelectorAll('[data-status]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-status]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterIPOs();
        });
    });

    // Category filters
    document.querySelectorAll('[data-category]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-category]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterIPOs();
        });
    });
}

async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/ipos/stats/overview`);
        const data = await response.json();

        if (data.stats) {
            document.getElementById('totalIPOs').textContent = data.stats.total;
            document.getElementById('openIPOs').textContent = data.stats.open;
            document.getElementById('upcomingIPOs').textContent = data.stats.upcoming;
            document.getElementById('avgGain').textContent = data.stats.averageListingGain + '%';
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

let allIPOs = [];

async function loadIPOs(filters = {}) {
    const grid = document.getElementById('ipoGrid');
    grid.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading IPOs...</p></div>';

    try {
        const queryParams = new URLSearchParams(filters).toString();
        const response = await fetch(`${API_URL}/ipos?${queryParams}`);
        const data = await response.json();

        allIPOs = data.ipos || [];
        displayIPOs(allIPOs);

        // Populate allotment dropdown
        populateAllotmentDropdown(allIPOs);

        // Load GMP data
        displayGMPCards(allIPOs);
    } catch (error) {
        console.error('Error loading IPOs:', error);
        grid.innerHTML = '<p class="text-center text-muted">Failed to load IPOs. Please try again.</p>';
    }
}

function displayIPOs(ipos) {
    const grid = document.getElementById('ipoGrid');

    if (!ipos || ipos.length === 0) {
        grid.innerHTML = '<p class="text-center text-muted">No IPOs found.</p>';
        return;
    }

    grid.innerHTML = ipos.map(ipo => createIPOCard(ipo)).join('');

    // Start countdown timers
    ipos.forEach(ipo => {
        if (ipo.status === 'open') {
            startCountdown(ipo._id, ipo.closeDate);
        }
    });
}

function createIPOCard(ipo) {
    const logo = ipo.companyLogo || getInitials(ipo.companyName);
    const statusClass = `status-${ipo.status}`;
    const subscription = ipo.subscription?.total || 0;
    const gmp = ipo.gmp && ipo.gmp.length > 0 ? ipo.gmp[ipo.gmp.length - 1] : null;

    return `
        <div class="ipo-card" onclick="viewIPODetails('${ipo._id}')">
            <div class="ipo-header">
                <div class="ipo-logo">${logo}</div>
                <div class="ipo-info">
                    <h3>${ipo.companyName}</h3>
                    <span class="ipo-category">${ipo.category}</span>
                </div>
            </div>
            
            <div class="ipo-details">
                <div class="detail-row">
                    <span class="detail-label">Price Range</span>
                    <span class="detail-value">₹${ipo.priceRange.min} - ₹${ipo.priceRange.max}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Lot Size</span>
                    <span class="detail-value">${ipo.lotSize} shares</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Min Investment</span>
                    <span class="detail-value">₹${ipo.minInvestment.toLocaleString()}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Open Date</span>
                    <span class="detail-value">${formatDate(ipo.openDate)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Close Date</span>
                    <span class="detail-value">${formatDate(ipo.closeDate)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status</span>
                    <span class="status-badge ${statusClass}">
                        <i class="fas fa-circle"></i> ${ipo.status}
                    </span>
                </div>
                ${gmp ? `
                <div class="detail-row">
                    <span class="detail-label">GMP</span>
                    <span class="detail-value text-success">₹${gmp.value} (${gmp.percentage}%)</span>
                </div>
                ` : ''}
            </div>
            
            ${ipo.status === 'open' ? `
            <div class="subscription-bar">
                <div class="subscription-label">
                    <span>Subscription</span>
                    <span class="text-success">${subscription.toFixed(2)}x</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.min(subscription * 10, 100)}%"></div>
                </div>
            </div>
            
            <div class="countdown-timer" id="countdown-${ipo._id}">
                <div class="timer-unit">
                    <div class="timer-value">00</div>
                    <div class="timer-label">Days</div>
                </div>
                <div class="timer-unit">
                    <div class="timer-value">00</div>
                    <div class="timer-label">Hours</div>
                </div>
                <div class="timer-unit">
                    <div class="timer-value">00</div>
                    <div class="timer-label">Mins</div>
                </div>
                <div class="timer-unit">
                    <div class="timer-value">00</div>
                    <div class="timer-label">Secs</div>
                </div>
            </div>
            ` : ''}
            
            ${ipo.status === 'listed' && ipo.listingGain ? `
            <div class="detail-row">
                <span class="detail-label">Listing Gain</span>
                <span class="detail-value ${ipo.listingGain.percentage >= 0 ? 'text-success' : 'text-danger'}">
                    ${ipo.listingGain.percentage >= 0 ? '+' : ''}${ipo.listingGain.percentage}%
                </span>
            </div>
            ` : ''}
        </div>
    `;
}

function startCountdown(ipoId, closeDate) {
    const countdownElement = document.getElementById(`countdown-${ipoId}`);
    if (!countdownElement) return;

    const timer = setInterval(() => {
        const now = new Date().getTime();
        const end = new Date(closeDate).getTime();
        const distance = end - now;

        if (distance < 0) {
            clearInterval(timer);
            countdownElement.innerHTML = '<p class="text-center text-muted">IPO Closed</p>';
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        const units = countdownElement.querySelectorAll('.timer-value');
        if (units.length === 4) {
            units[0].textContent = String(days).padStart(2, '0');
            units[1].textContent = String(hours).padStart(2, '0');
            units[2].textContent = String(minutes).padStart(2, '0');
            units[3].textContent = String(seconds).padStart(2, '0');
        }
    }, 1000);
}

function filterIPOs() {
    const statusBtn = document.querySelector('[data-status].active');
    const categoryBtn = document.querySelector('[data-category].active');

    const status = statusBtn?.dataset.status;
    const category = categoryBtn?.dataset.category;

    let filtered = allIPOs;

    if (status && status !== 'all') {
        filtered = filtered.filter(ipo => ipo.status === status);
    }

    if (category && category !== 'all') {
        filtered = filtered.filter(ipo => ipo.category === category);
    }

    displayIPOs(filtered);
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    const filtered = allIPOs.filter(ipo =>
        ipo.companyName.toLowerCase().includes(query)
    );
    displayIPOs(filtered);
}

function populateAllotmentDropdown(ipos) {
    const select = document.getElementById('selectIPO');
    if (!select) return;

    const closedIPOs = ipos.filter(ipo => ipo.status === 'closed' || ipo.status === 'listed');

    select.innerHTML = '<option value="">Choose an IPO...</option>' +
        closedIPOs.map(ipo => `<option value="${ipo._id}">${ipo.companyName}</option>`).join('');
}

function displayGMPCards(ipos) {
    const grid = document.getElementById('gmpGrid');
    if (!grid) return;

    const iposWithGMP = ipos.filter(ipo => ipo.gmp && ipo.gmp.length > 0);

    if (iposWithGMP.length === 0) {
        grid.innerHTML = '<p class="text-center text-muted">No GMP data available.</p>';
        return;
    }

    grid.innerHTML = iposWithGMP.map(ipo => {
        const latestGMP = ipo.gmp[ipo.gmp.length - 1];
        return `
            <div class="gmp-card">
                <div class="gmp-header">
                    <h3>${ipo.companyName}</h3>
                    <div class="gmp-value">₹${latestGMP.value}</div>
                    <div class="gmp-percentage">${latestGMP.percentage}%</div>
                    <small class="text-muted">Updated: ${formatDate(latestGMP.date)}</small>
                </div>
                <div class="gmp-chart">
                    <i class="fas fa-chart-line"></i> GMP Trend Chart
                </div>
            </div>
        `;
    }).join('');
}

function viewIPODetails(ipoId) {
    // This would open a detailed modal or navigate to details page
    showToast('IPO details feature coming soon!', 'info');
}

async function handleContactSubmit(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('contactName').value,
        email: document.getElementById('contactEmail').value,
        subject: document.getElementById('contactSubject').value,
        message: document.getElementById('contactMessage').value
    };

    showToast('Message sent successfully! We\'ll get back to you soon.', 'success');
    e.target.reset();
}

async function handleNewsletterSubmit(e) {
    e.preventDefault();
    showToast('Subscribed successfully!', 'success');
    e.target.reset();
}

// Utility functions
function getInitials(name) {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Modal functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

function switchModal(closeId, openId) {
    closeModal(closeId);
    setTimeout(() => openModal(openId), 200);
}

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Check auth status
async function checkAuthStatus() {
    if (!authToken) {
        showGuestUI();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            showAuthenticatedUI(data.user);
        } else {
            localStorage.removeItem('authToken');
            authToken = null;
            showGuestUI();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showGuestUI();
    }
}

function showGuestUI() {
    document.getElementById('loginBtn')?.addEventListener('click', () => openModal('loginModal'));
    document.getElementById('registerBtn')?.addEventListener('click', () => openModal('registerModal'));
    document.getElementById('userMenu').style.display = 'none';
}

function showAuthenticatedUI(user) {
    document.getElementById('loginBtn').style.display = 'none';
    document.getElementById('registerBtn').style.display = 'none';
    document.getElementById('userMenu').style.display = 'block';

    if (user.role === 'admin') {
        document.getElementById('adminLink').style.display = 'block';
    }

    document.getElementById('logoutBtn')?.addEventListener('click', logout);
}

function logout() {
    localStorage.removeItem('authToken');
    authToken = null;
    currentUser = null;
    location.reload();
}
