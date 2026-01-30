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
    renderAppSubscriptionTable(ipo);

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
                <td style="padding: 1rem 1.5rem; ${textColor}">${cat.name}</td>
                <td class="text-right" style="padding: 1rem 1.5rem; text-align: right; color: var(--text-secondary);">${offText}</td>
                <td class="text-right" style="padding: 1rem 1.5rem; text-align: right; ${textColor} font-weight: 600;">${val}</td>
            </tr>
        `;
    }).join('');
}

function renderAppSubscriptionTable(ipo) {
    const tbody = document.getElementById('appSubscriptionBody');
    const sd = ipo.subscriptionDetails || {};

    const categories = [
        { name: 'QIB', data: sd.qib },
        { name: 'NII', data: sd.nii },
        { name: 'Retail (IND)', data: sd.retail },
        { name: 'Shareholder', data: sd.shareholder }
    ];

    // Better filtering: If it's open or closed, show the main categories even if they are 0
    // This looks much more professional than "Data not available"
    const activeCategories = categories.filter(cat => {
        if (!cat.data) return false;
        // Show if any data exists OR if it's one of the main categories for an active/recent IPO
        return cat.data.offered > 0 || cat.data.received > 0 || ['QIB', 'NII', 'Retail (IND)', 'Shareholder'].includes(cat.name);
    });

    // Calculate Total
    const totalOffered = activeCategories.reduce((sum, cat) => sum + (cat.data.offered || 0), 0);
    const totalReceived = activeCategories.reduce((sum, cat) => sum + (cat.data.received || 0), 0);

    const rows = activeCategories.map(cat => ({
        name: cat.name,
        offered: cat.data.offered,
        received: cat.data.received,
        bold: true
    }));

    if (activeCategories.length > 0) {
        rows.push({ name: 'Total', offered: totalOffered, received: totalReceived, bold: true, isTotal: true });
    }

    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding: 2rem; color: var(--text-muted);">Live participation data will appear here during the subscription period.</td></tr>';
        return;
    }

    tbody.innerHTML = rows.map(row => {
        const subVal = (row.offered > 0) ? (row.received / row.offered).toFixed(2) + 'x' : '0.00x';
        const style = row.isTotal ? 'background: rgba(34, 197, 94, 0.05); font-weight: 800; border-top: 2px solid var(--dark-border);' : 'border-bottom: 1px solid var(--dark-border);';

        // Display numbers or '0' clearly
        const offText = (row.offered !== undefined && row.offered !== null) ? Number(row.offered).toLocaleString('en-IN') : '0';
        const recText = (row.received !== undefined && row.received !== null) ? Number(row.received).toLocaleString('en-IN') : '0';

        return `
            <tr style="${style}">
                <td style="padding: 1rem 1.5rem; color: var(--text-primary); font-weight: 700;">${row.name}</td>
                <td class="text-right" style="padding: 1rem 1.5rem; text-align: right; color: var(--text-secondary);">${offText}</td>
                <td class="text-right" style="padding: 1rem 1.5rem; text-align: right; color: var(--text-secondary);">${recText}</td>
                <td class="text-right" style="padding: 1rem 1.5rem; text-align: right; color: var(--primary-green); font-weight: 700;">${subVal}</td>
            </tr>
        `;
    }).join('');
}
