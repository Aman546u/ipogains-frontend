document.addEventListener('DOMContentLoaded', async () => {
    // Get ID from URL
    // Get ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    let ipoId = urlParams.get('id');

    // Fallback: Check hash for id (e.g. #id=123)
    if (!ipoId && window.location.hash) {
        // Remove # and parse
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        ipoId = hashParams.get('id');
        console.log('🆔 Found ID in Hash:', ipoId);
    }

    if (!ipoId) {
        window.location.href = 'ipos.html';
        return;
    }

    try {
        const loading = document.getElementById('loading');
        const content = document.getElementById('detailContent');

        const data = await API.get(`/ipos/${ipoId}`);
        const ipo = data.ipo;

        if (!ipo) throw new Error('IPO not found');

        loading.style.display = 'none';
        content.style.display = 'block';

        renderSubscriptionDetails(ipo);

    } catch (error) {
        console.error('Error loading IPO details:', error);
        document.getElementById('loading').innerHTML = '<p class="text-danger">Failed to load details. Please try again.</p>';
    }
});

function renderSubscriptionDetails(ipo) {
    document.getElementById('companyName').textContent = ipo.companyName;
    document.getElementById('ipoStatus').textContent = ipo.status.toUpperCase();
    document.getElementById('ipoStatus').className = `status-badge status-${ipo.status}`;

    // Summary Cards
    const price = ipo.priceRange ? `₹${ipo.priceRange.min} - ₹${ipo.priceRange.max}` : 'N/A';
    document.getElementById('issuePrice').textContent = price;

    const gmpData = ipo.gmp || [];
    const latestGmp = gmpData.length > 0 ? gmpData[gmpData.length - 1] : null;
    if (latestGmp) {
        const gmpVal = latestGmp.value;
        const priceMax = ipo.priceRange.max;
        const percent = ((gmpVal / priceMax) * 100).toFixed(2);
        document.getElementById('currentGmp').textContent = `₹${gmpVal} (${percent}%)`;
    } else {
        document.getElementById('currentGmp').textContent = '—';
    }

    const sub = ipo.subscription || {};
    const subTotal = (sub.total !== undefined && sub.total !== null) ? Number(sub.total).toFixed(2) : '0.00';
    document.getElementById('totalSubscription').textContent = `${subTotal}x`;
    document.getElementById('issueSize').textContent = ipo.issueSize ? `₹${ipo.issueSize} Cr` : 'N/A';

    // Tables
    renderShareSubscriptionTable(ipo);

    // Auto-generate FAQ
    Helpers.renderFAQ('subscription', ipo.companyName, 'ipoFaq');
}

function renderShareSubscriptionTable(ipo) {
    const tbody = document.getElementById('shareSubscriptionBody');
    const sub = ipo.subscription || {};
    const sd = ipo.subscriptionDetails || {};
    const sharesOffered = sd.sharesOffered || {};

    const categories = [
        { name: 'QIB', offered: sharesOffered.qib, value: sub.qib },
        { name: 'NII', offered: sharesOffered.nii, value: sub.nii },
        { name: 'Retail (RII)', offered: sharesOffered.retail, value: sub.retail },
        { name: 'Shareholder', offered: sharesOffered.shareholder, value: sub.shareholder },
        { name: 'Total', value: sub.total, bold: true }
    ];

    tbody.innerHTML = categories.map(cat => {
        const val = (cat.value !== undefined && cat.value !== null) ? `${Number(cat.value).toFixed(2)}x` : '0.00x';

        // Fix: Show '0' instead of '-' if the value is explicitly provided as 0
        let offText = '-';
        if (cat.offered !== undefined && cat.offered !== null) {
            offText = Number(cat.offered).toLocaleString('en-IN');
        }

        const style = cat.bold
            ? 'font-weight: 700; background: rgba(59, 130, 246, 0.05); border-top: 2px solid var(--dark-border);'
            : 'border-bottom: 1px solid var(--dark-border);';
        const textColor = cat.bold ? 'var(--info)' : 'var(--text-primary)';

        return `
            <tr style="${style}">
                <td style="${textColor}">${cat.name}</td>
                <td class="text-right" style="text-align: right; color: var(--text-secondary);">${offText}</td>
                <td class="text-right" style="text-align: right; ${textColor} font-weight: 600;">${val}</td>
            </tr>
        `;
    }).join('');
}


