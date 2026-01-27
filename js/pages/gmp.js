// Load GMP Data
async function loadGMP() {
    try {
        const grid = document.getElementById('gmpGrid');
        if (!grid) return;

        grid.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading GMP data...</p></div>';

        const data = await API.get('/ipos');

        if (data.ipos && data.ipos.length > 0) {
            // Filter IPOs that have GMP data or are active
            let validIPOs = data.ipos.filter(ipo => ipo.gmp && ipo.gmp.length > 0);

            // Limit to 50
            if (validIPOs.length > 50) {
                validIPOs = validIPOs.slice(0, 50);
            }

            if (validIPOs.length === 0) {
                grid.innerHTML = '<div class="text-center text-muted">No GMP data available currently.</div>';
                return;
            }

            grid.innerHTML = validIPOs.map(ipo => {
                const gmpData = ipo.gmp || [];
                const latestGmp = gmpData.length > 0 ? gmpData[gmpData.length - 1] : null;
                const previousGmp = gmpData.length > 1 ? gmpData[gmpData.length - 2] : null;

                const gmpValue = latestGmp ? latestGmp.value : 0;
                const gmpDate = latestGmp ? Helpers.formatDate(latestGmp.date) : 'N/A';

                const status = Helpers.calculateDisplayStatus(ipo);

                let trendHtml = '';
                if (latestGmp && previousGmp) {
                    if (latestGmp.value > previousGmp.value) {
                        trendHtml = '<span style="color: var(--success); margin-left: 8px;"><i class="fas fa-arrow-up"></i></span>';
                    } else if (latestGmp.value < previousGmp.value) {
                        trendHtml = '<span style="color: var(--danger); margin-left: 8px;"><i class="fas fa-arrow-down"></i></span>';
                    } else {
                        trendHtml = '<span style="color: var(--text-color-light); margin-left: 8px;"><i class="fas fa-minus"></i></span>';
                    }
                } else if (latestGmp) {
                    trendHtml = '<span style="color: var(--success); margin-left: 8px;"><i class="fas fa-arrow-up"></i></span>';
                }

                return `
                <a href="gmp-detail.html?id=${ipo._id}" class="ipo-card" style="text-decoration: none; color: inherit; display: block;">
                    <div class="ipo-header">
                        <div class="ipo-logo">${Helpers.getInitials(ipo.companyName)}</div>
                        <div class="ipo-info">
                            <h3>${ipo.companyName}</h3>
                            <span class="ipo-category">${ipo.category || 'IPO'}</span>
                        </div>
                    </div>
                    <div class="ipo-details">
                        <div class="detail-row">
                             <span class="detail-label">GMP Value</span>
                             <span class="detail-value highlightable" style="color: var(--success); display: flex; align-items: center;">₹${gmpValue}${trendHtml}</span>
                        </div>
                         <div class="detail-row">
                             <span class="detail-label">Last Updated</span>
                             <span class="detail-value">${gmpDate}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Price Range</span>
                            <span class="detail-value">${ipo.priceRange?.min ? '₹' + ipo.priceRange.min : 'N/A'} - ${ipo.priceRange?.max ? '₹' + ipo.priceRange.max : 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Status</span>
                            <span class="status-badge status-${status.toLowerCase()}">${status.toUpperCase()}</span>
                        </div>
                    </div>
                    
                    <div class="card-footer" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color); text-align: center; color: var(--primary-green); font-weight: 600;">
                        View GMP Details <i class="fas fa-arrow-right" style="margin-left: 0.5rem;"></i>
                    </div>
                </a>
            `}).join('');
        } else {
            grid.innerHTML = '<div class="text-center text-muted">No active IPOs found for GMP tracking.</div>';
        }
    } catch (error) {
        console.error('Error loading GMP:', error);
        const grid = document.getElementById('gmpGrid');
        if (grid) grid.innerHTML = '<p class="text-center text-danger">Failed to load GMP data</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadGMP();
    setupFAQ();
});

// FAQ Accordion
function setupFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', () => {
                // Close others (accordion style)
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
