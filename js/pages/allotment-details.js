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

        renderAllotmentDetails(ipo);

    } catch (error) {
        console.error('Error loading IPO details:', error);
        document.getElementById('loading').innerHTML = '<p class="text-danger">Failed to load details. Please try again.</p>';
    }
});

function renderAllotmentDetails(ipo) {
    document.getElementById('companyName').textContent = ipo.companyName;
    document.getElementById('ipoStatus').textContent = ipo.status.toUpperCase();
    document.getElementById('ipoStatus').className = `status-badge status-${ipo.status}`;

    // Summary Cards
    const priceMax = ipo.priceRange ? ipo.priceRange.max : 0;
    const priceRangeText = ipo.priceRange ? `₹${ipo.priceRange.min} - ₹${ipo.priceRange.max}` : 'N/A';
    document.getElementById('issuePrice').textContent = priceRangeText;

    const gmpData = ipo.gmp || [];
    const latestGmp = gmpData.length > 0 ? gmpData[gmpData.length - 1] : null;

    let gmpVal = 0;
    if (latestGmp) {
        gmpVal = latestGmp.value;
        const percent = ((gmpVal / priceMax) * 100).toFixed(2);
        document.getElementById('currentGmp').textContent = `₹${gmpVal} (${percent}%)`;
    } else {
        document.getElementById('currentGmp').textContent = '—';
    }

    // Est Profit (Assuming 1 Lot)
    const lotSize = ipo.lotSize || 0;
    const estProfitVal = gmpVal * lotSize;
    document.getElementById('estProfit').textContent = `₹${estProfitVal}`;

    // Est Listing
    const estListingVal = priceMax + gmpVal;
    document.getElementById('estListing').textContent = `₹${estListingVal}`;


    // IPO Details Grid
    document.getElementById('priceRange').textContent = priceRangeText;
    document.getElementById('issueSize').textContent = ipo.issueSize ? `₹${ipo.issueSize} Cr` : 'N/A';
    document.getElementById('lotSize').textContent = `${lotSize} Shares`;
    document.getElementById('ipoCategory').textContent = ipo.category; // e.g., SME, Mainboard

    document.getElementById('openDate').textContent = Helpers.formatDate(ipo.openDate);
    document.getElementById('closeDate').textContent = Helpers.formatDate(ipo.closeDate);
    document.getElementById('allotmentDate').textContent = Helpers.formatDate(ipo.allotmentDate);
    document.getElementById('listingDate').textContent = Helpers.formatDate(ipo.listingDate);

    // Auto-generate FAQ
    Helpers.renderFAQ('allotment', ipo.companyName, 'ipoFaq');
}
