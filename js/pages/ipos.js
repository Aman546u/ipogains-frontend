// Global state
let allIPOs = [];
let filteredIPOs = [];
let displayedCount = 6; // Show 6 cards initially
const CARDS_PER_PAGE = 6;

// Load IPOs for the dedicated IPO page
async function loadIPOs() {
    try {
        const grid = document.getElementById('ipoGrid');
        if (!grid) return;

        grid.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading IPO Data...</p></div>';

        const data = await API.get('/ipos?limit=50&sort=-openDate');

        if (data && data.ipos && Array.isArray(data.ipos) && data.ipos.length > 0) {
            allIPOs = data.ipos;
            filterIPOs(); // Initial render with default filters
        } else {
            grid.innerHTML = '<p class="text-center text-muted">No IPOs found</p>';
        }
    } catch (error) {
        console.error('Error loading IPOs:', error);
        const grid = document.getElementById('ipoGrid');
        if (grid) grid.innerHTML = '<p class="text-center text-danger">Failed to load IPOs</p>';
    }
}

// Render the grid with pagination
function renderGrid(ipos) {
    const grid = document.getElementById('ipoGrid');
    const viewMoreContainer = document.getElementById('viewMoreContainer');
    const viewMoreBtn = document.getElementById('viewMoreBtn');

    if (!grid) return;

    if (ipos.length === 0) {
        grid.innerHTML = '<p class="text-center text-muted">No IPOs match your filters</p>';
        if (viewMoreContainer) viewMoreContainer.style.display = 'none';
        return;
    }

    // Show only displayedCount cards
    const visibleIPOs = ipos.slice(0, displayedCount);

    grid.innerHTML = visibleIPOs.map(ipo => {
        try {
            // Safety checks
            const companyName = ipo.companyName || 'Unknown Company';
            const category = ipo.category || 'IPO';

            // Use calculated status
            const status = Helpers.calculateDisplayStatus(ipo);

            // ID Logic: Prefer _id (MongoDB) over id
            const id = ipo._id || ipo.id;

            // DEBUG: Log to verify ID is captured
            if (!id) {
                console.error('❌ NO ID FOUND FOR:', ipo.companyName, ipo);
                return ''; // Skip invalid IPOs to avoid broken links
            }

            // Formatting Helpers
            const gmpData = Array.isArray(ipo.gmp) ? ipo.gmp : [];
            const latestGmp = gmpData.length > 0 ? gmpData[gmpData.length - 1] : null;
            const gmpVal = (latestGmp && latestGmp.value) ? latestGmp.value : 0;

            let trendIcon = '';
            const previousGmp = gmpData.length > 1 ? gmpData[gmpData.length - 2] : null;

            if (latestGmp && previousGmp) {
                try {
                    if (latestGmp.value > previousGmp.value) trendIcon = '<i class="fas fa-arrow-up text-success"></i>';
                    else if (latestGmp.value < previousGmp.value) trendIcon = '<i class="fas fa-arrow-down text-danger"></i>';
                } catch (e) { console.error('Trend Error', e); }
            }

            // GMP or Listing Gain
            let gmpText = 'N/A';
            let gmpClass = '';
            let gmpLabel = 'GMP';

            if (status === 'listed' && ipo.listingGain) {
                gmpLabel = 'Listing Gain';
                const gain = ipo.listingGain.percentage || 0;
                const gainAmount = ipo.listingGain.amount || 0;
                gmpText = `₹${gainAmount} (${gain}%)`;
                gmpClass = gain >= 0 ? 'text-success' : 'text-danger';
            } else if (latestGmp) {
                gmpText = `₹${gmpVal}`;
                if (ipo.priceRange && ipo.priceRange.max) {
                    const pct = ((gmpVal / ipo.priceRange.max) * 100).toFixed(2);
                    gmpText += ` (${pct}%)`;
                }
                gmpText += ` ${trendIcon}`;
                gmpClass = 'text-success';
            }

            // Subscription Rounding
            const subVal = (ipo.subscription && ipo.subscription.total) ? ipo.subscription.total : 0;
            const subTotal = subVal ? `${Number(subVal).toFixed(2)}x` : 'N/A';

            const issueSize = ipo.issueSize ? `₹${ipo.issueSize} Cr` : 'N/A';

            // Dates
            const openDate = ipo.openDate ? Helpers.formatDate(ipo.openDate) : 'N/A';

            // Initials
            const initials = Helpers.getInitials(companyName);

            // Price
            const priceText = (ipo.priceRange && ipo.priceRange.min && ipo.priceRange.max)
                ? `₹${ipo.priceRange.min} - ₹${ipo.priceRange.max}`
                : 'N/A';

            const lotSize = ipo.lotSize ? `${ipo.lotSize} shares` : 'N/A';

            return `
            <div class="ipo-card">
                <!-- Header -->
                <div class="ipo-header" style="justify-content: space-between; margin-bottom: 0;">
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <div class="ipo-logo">
                            ${ipo.companyLogo ? `<img src="${ipo.companyLogo}" alt="${companyName}" style="width: 100%; height: 100%; object-fit: contain;">` : initials}
                        </div>
                        <div>
                            <h3 style="font-size: 1.1rem; font-weight: 700; margin: 0; color: var(--text-primary); line-height: 1.3;">${companyName}</h3>
                            <span style="font-size: 0.85rem; color: var(--text-secondary);">${category}</span>
                        </div>
                    </div>
                    <span class="status-badge status-${status}" style="font-size: 0.75rem; padding: 4px 10px; border-radius: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${status}</span>
                </div>

                <!-- Details Grid -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px 10px; margin-top: 5px;">
                    <!-- Issue Price -->
                    <div style="display: flex; gap: 10px; align-items: flex-start;">
                        <div style="color: var(--text-muted); padding-top: 2px;"><i class="fas fa-rupee-sign"></i></div>
                        <div>
                            <small style="display: block; color: var(--text-muted); font-size: 0.75rem;">Issue Price</small>
                            <span style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary);">${priceText}</span>
                        </div>
                    </div>

                    <!-- Lot Size -->
                    <div style="display: flex; gap: 10px; align-items: flex-start;">
                        <div style="color: var(--text-muted); padding-top: 2px;"><i class="fas fa-users"></i></div>
                        <div>
                            <small style="display: block; color: var(--text-muted); font-size: 0.75rem;">Lot Size</small>
                            <span style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary);">${lotSize}</span>
                        </div>
                    </div>

                    <!-- Open Date -->
                    <div style="display: flex; gap: 10px; align-items: flex-start;">
                        <div style="color: var(--text-muted); padding-top: 2px;"><i class="far fa-calendar-alt"></i></div>
                        <div>
                            <small style="display: block; color: var(--text-muted); font-size: 0.75rem;">Open Date</small>
                            <span style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary);">${openDate}</span>
                        </div>
                    </div>

                    <!-- GMP -->
                    <div style="display: flex; gap: 10px; align-items: flex-start;">
                        <div style="color: var(--text-muted); padding-top: 2px;"><i class="fas fa-chart-line"></i></div>
                        <div>
                            <small style="display: block; color: var(--text-muted); font-size: 0.75rem;">${gmpLabel}</small>
                            <span class="${gmpClass}" style="font-weight: 600; font-size: 0.95rem;">${gmpText}</span>
                        </div>
                    </div>
                </div>

                <!-- Stats Row with Divider -->
                <div style="border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); padding: 12px 0; display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                    <div>
                        <small style="display: block; color: var(--text-muted); font-size: 0.75rem;">Issue Size</small>
                        <span style="font-weight: 700; font-size: 1rem; color: var(--text-primary);">${issueSize}</span>
                    </div>
                    <div style="text-align: right;">
                        <small style="display: block; color: var(--text-muted); font-size: 0.75rem;">Subscription</small>
                        <span style="font-weight: 700; font-size: 1rem; color: var(--text-primary);">${subTotal}</span>
                    </div>
                </div>

                <!-- Actions -->
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <div style="display: flex; gap: 10px;">
                        <a href="javascript:void(0)" onclick="window.location.href='gmp-detail.html?id=${id}'" class="btn-action btn-gmp" style="flex: 1;">
                            <i class="fas fa-chart-line mr-2"></i> Check GMP
                        </a>
                        <a href="javascript:void(0)" onclick="window.location.href='subscription.html?id=${id}'" class="btn-action btn-sub" style="flex: 1;">
                            <i class="fas fa-chart-bar mr-2"></i> Subscription
                        </a>
                    </div>
                    <a href="javascript:void(0)" onclick="window.location.href='allotment-details.html?id=${id}'" class="btn-action btn-allotment" style="width: 100%;">
                        <i class="fas fa-check-circle mr-2"></i> Allotment Status
                    </a>
                </div>
            </div>
            `;
        } catch (mapError) {
            console.error('Error mapping IPO:', mapError, ipo);
            return ''; // Skip invalid
        }
    }).join('');

    // Show/Hide View More button
    if (viewMoreContainer && viewMoreBtn) {
        if (ipos.length > displayedCount) {
            viewMoreContainer.style.display = 'block';
            viewMoreBtn.innerHTML = `<span>View More IPOs (${ipos.length - displayedCount} remaining)</span> <i class="fas fa-chevron-down"></i>`;
            viewMoreBtn.classList.remove('expanded');
        } else if (displayedCount > CARDS_PER_PAGE && ipos.length <= displayedCount) {
            // All shown, offer to collapse
            viewMoreContainer.style.display = 'block';
            viewMoreBtn.innerHTML = `<span>Show Less</span> <i class="fas fa-chevron-up"></i>`;
            viewMoreBtn.classList.add('expanded');
        } else {
            viewMoreContainer.style.display = 'none';
        }
    }
}

// Filter Logic
function filterIPOs() {
    // Reset pagination when filtering
    displayedCount = CARDS_PER_PAGE;

    // Get active filter values
    const statusBtn = document.querySelector('.filter-btn.active[data-status]');
    const categoryBtn = document.querySelector('.filter-btn.active[data-category]');
    const searchInput = document.getElementById('searchInput');

    const statusFilter = statusBtn ? statusBtn.dataset.status : 'all';
    const categoryFilter = categoryBtn ? categoryBtn.dataset.category : 'all';
    const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';

    filteredIPOs = allIPOs.filter(ipo => {
        // Status Filter
        if (statusFilter !== 'all' && ipo.status !== statusFilter) return false;

        // Category Filter
        if (categoryFilter !== 'all' && ipo.category !== categoryFilter) return false;

        // Search Filter
        if (searchQuery) {
            const name = ipo.companyName.toLowerCase();
            const symbol = (ipo.symbol || '').toLowerCase();
            return name.includes(searchQuery) || symbol.includes(searchQuery);
        }

        return true;
    });

    renderGrid(filteredIPOs);
}

// Load on page load
document.addEventListener('DOMContentLoaded', () => {
    loadIPOs();
    setupIPOFilters();
    setupViewMore();
    setupFAQ();
});

function setupIPOFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('searchInput');

    if (filterBtns) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const siblingBtns = btn.parentElement.querySelectorAll('.filter-btn');
                siblingBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filterIPOs(); // Trigger filter on click
            });
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            filterIPOs(); // Trigger filter on typing
        });
    }
}

// View More button handler
function setupViewMore() {
    const viewMoreBtn = document.getElementById('viewMoreBtn');
    if (viewMoreBtn) {
        viewMoreBtn.addEventListener('click', () => {
            if (viewMoreBtn.classList.contains('expanded')) {
                // Collapse back to initial
                displayedCount = CARDS_PER_PAGE;
            } else {
                // Show more
                displayedCount += CARDS_PER_PAGE;
            }
            renderGrid(filteredIPOs);

            // Scroll to show new cards
            if (!viewMoreBtn.classList.contains('expanded')) {
                const grid = document.getElementById('ipoGrid');
                if (grid) {
                    grid.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }
            }
        });
    }
}

// FAQ Accordion
function setupFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', () => {
                // Close others (optional - for accordion style)
                faqItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('active');
                    }
                });
                // Toggle current
                item.classList.toggle('active');
            });
        }
    });
}
