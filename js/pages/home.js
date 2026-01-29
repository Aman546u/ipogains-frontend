document.addEventListener('DOMContentLoaded', () => {
    loadHomeData();
});

async function loadHomeData() {
    try {
        // CACHE LOGIC
        const cachedIPOs = Storage.get('home_ipos_cache');
        const cacheTime = Storage.get('home_ipos_time');
        const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

        if (cachedIPOs && cacheTime && (Date.now() - cacheTime < CACHE_DURATION)) {
            console.log('⚡ Using cached home data');
            processAndRender(cachedIPOs);
            fetchHomeData(true); // Background update
        } else {
            await fetchHomeData(false);
        }

    } catch (error) {
        console.error('Error loading home data:', error);
    }
}

async function fetchHomeData(isBackground = false) {
    try {
        const data = await API.get('/ipos');
        if (data.ipos) {
            Storage.set('home_ipos_cache', data.ipos);
            Storage.set('home_ipos_time', Date.now());
            processAndRender(data.ipos);
            if (!isBackground) console.log('✅ Home data loaded from server');
        }
    } catch (e) {
        if (!isBackground) throw e;
    }
}

function processAndRender(rawIPOs) {
    // Pre-process IPOs with accurate time-based status
    const ipos = (rawIPOs || []).map(ipo => ({
        ...ipo,
        status: Helpers.calculateDisplayStatus(ipo)
    }));

    renderLiveIPOs(ipos);
    renderCalendar(ipos);
    renderHomeGMP(ipos);
    renderHomeSubscription(ipos);
    renderClosedIPOs(ipos);
}

function renderLiveIPOs(ipos) {
    const tbody = document.getElementById('liveIpoTableBody');
    const liveIPOs = ipos.filter(ipo => ipo.status === 'open');

    if (liveIPOs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding: 30px;">No IPOs are currently open for subscription.</td></tr>';
        return;
    }

    tbody.innerHTML = liveIPOs.map(ipo => createIPORow(ipo)).join('');
}

function renderClosedIPOs(ipos) {
    const tbody = document.getElementById('closedIposTableBody');
    // Filter closed (or listed) but show as "Recently Closed"
    const closedIPOs = ipos.filter(ipo => ipo.status === 'closed' || ipo.status === 'listed')
        .sort((a, b) => new Date(b.closeDate) - new Date(a.closeDate))
        .slice(0, 5);

    if (closedIPOs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding: 30px;">No recently closed IPOs.</td></tr>';
        return;
    }

    tbody.innerHTML = closedIPOs.map(ipo => createIPORow(ipo)).join('');
}

function createIPORow(ipo) {
    const initials = Helpers.getInitials(ipo.companyName);
    const issueSize = ipo.issueSize ? `₹${ipo.issueSize} Cr` : '-';
    // Min Invest
    const minInvest = ipo.minInvestment ? `₹${ipo.minInvestment.toLocaleString('en-IN')}` : '-';
    // Subscription
    const sub = (ipo.subscription && ipo.subscription.total) ? `${ipo.subscription.total}x` : '-';

    // GMP & Profit
    let gmpVal = 0;
    let gmpText = '₹0';
    let gmpSub = '0%';
    let profit = '₹0';
    let profitClass = 'text-muted'; // Default grey if 0

    if (ipo.status === 'listed' && ipo.listingGain) {
        // If listed, show listing gain
        gmpVal = ipo.listingGain.amount || 0;
        gmpText = `₹${gmpVal}`;
        gmpSub = `${ipo.listingGain.percentage}%`;
        profit = `₹${((ipo.listingGain.amount || 0) * ipo.lotSize).toLocaleString('en-IN')}`;
        if (gmpVal > 0) profitClass = 'text-success';
        else if (gmpVal < 0) profitClass = 'text-danger';
    } else if (ipo.gmp && ipo.gmp.length > 0) {
        // If not listed, show GMP
        const latestInfo = ipo.gmp[ipo.gmp.length - 1];
        gmpVal = latestInfo.value;
        const price = ipo.priceRange.max;
        const pct = price ? ((gmpVal / price) * 100).toFixed(1) : 0;

        gmpText = `₹${gmpVal}`;
        gmpSub = `(${pct}%)`; // Screenshot style: (12.6%)

        const estProfitVal = gmpVal * ipo.lotSize;
        profit = `₹${estProfitVal.toLocaleString('en-IN')}`;
        if (gmpVal > 0) profitClass = 'text-success'; // Your screenshot uses green text
    }

    return `
    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        <td>
            <div class="company-cell">
                <div class="company-logo-small">
                    ${ipo.companyLogo ? `<img src="${ipo.companyLogo}" style="width:100%; height:100%; object-fit:contain;">` : initials}
                </div>
                <a href="subscription.html?id=${ipo._id}" class="company-name-link" style="color: var(--text-primary);">${ipo.companyName}</a>
            </div>
        </td>
        <td>
            <span class="badge-gray">${ipo.category === 'SME' ? 'SME' : 'Mainboard'}</span>
        </td>
        <td>
            <span class="price-text" style="color: var(--text-primary);">₹${ipo.priceRange.max}</span>
        </td>
        <td class="gmp-cell">
            <span class="gmp-val" style="color: ${gmpVal > 0 ? 'var(--primary-green)' : (gmpVal < 0 ? 'var(--danger)' : '#888')}">${gmpText}</span>
            <span class="gmp-sub">${gmpSub}</span>
        </td>
        <td style="font-weight: 600; color: var(--text-primary);">${minInvest}</td>
        <td style="font-weight: 600; color: var(--text-primary);">${sub}</td>
        <td style="color: var(--text-primary);">${issueSize}</td>
        <td class="text-right">
            <span style="font-weight: 700; color: ${gmpVal > 0 ? 'var(--primary-green)' : (gmpVal < 0 ? 'var(--danger)' : '#888')}">${profit}</span>
        </td>
    </tr>
    `;
}

function renderCalendar(ipos) {
    const tbody = document.getElementById('calendarTableBody');
    // Filter upcoming or open
    const calendarIPOs = ipos.filter(ipo => ipo.status === 'upcoming' || ipo.status === 'open')
        .sort((a, b) => new Date(a.openDate) - new Date(b.openDate))
        .slice(0, 5);

    if (calendarIPOs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding: 30px;">No upcoming IPO events found.</td></tr>';
        return;
    }

    tbody.innerHTML = calendarIPOs.map(ipo => {
        const date = Helpers.formatDate(ipo.openDate);
        const initials = Helpers.getInitials(ipo.companyName);
        const statusClass = `status-${ipo.status}`; // status-open, status-upcoming
        const eventType = ipo.status === 'open' ? 'Closing Soon' : 'Opening Soon'; // Simple logic
        const typeBadge = ipo.category === 'SME' ? 'SME' : 'Mainboard';

        return `
            <tr>
                <td style="font-weight: 600; white-space: nowrap;">${date}</td>
                <td>
                    <div class="company-cell">
                        <div class="company-logo-small">
                            ${ipo.companyLogo ? `<img src="${ipo.companyLogo}" style="width:100%; height:100%; object-fit:contain;">` : initials}
                        </div>
                        <a href="subscription.html?id=${ipo._id}" class="company-name-link">${ipo.companyName}</a>
                    </div>
                </td>
                <td><span class="badge-gray">${typeBadge}</span></td>
                <td>${eventType}</td>
                <td class="text-right">
                    <span class="status-badge ${statusClass}" style="font-size: 0.75rem; padding: 4px 10px;">${ipo.status.toUpperCase()}</span>
                </td>
            </tr>
        `;
    }).join('');
}

function renderHomeGMP(ipos) {
    const tbody = document.getElementById('gmpHomeTableBody');
    const gmpIPOs = ipos.filter(ipo =>
        ipo.status !== 'listed' &&
        ipo.gmp && ipo.gmp.length > 0
    )
        .sort((a, b) => new Date(b.gmp[b.gmp.length - 1].date) - new Date(a.gmp[a.gmp.length - 1].date))
        .slice(0, 5);

    if (gmpIPOs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding: 30px;">No active GMP data available.</td></tr>';
        return;
    }

    tbody.innerHTML = gmpIPOs.map(ipo => {
        const latestInfo = ipo.gmp[ipo.gmp.length - 1];
        const initials = Helpers.getInitials(ipo.companyName);

        // Trend Logic
        let trendIcon = '';
        if (ipo.gmp.length > 1) {
            const prev = ipo.gmp[ipo.gmp.length - 2].value;
            if (latestInfo.value > prev) trendIcon = '<i class="fas fa-arrow-up ml-1"></i>';
            else if (latestInfo.value < prev) trendIcon = '<i class="fas fa-arrow-down ml-1"></i>';
        }

        const gmpColor = latestInfo.value >= 0 ? 'var(--primary-green)' : 'var(--danger)';
        const estProfit = (latestInfo.value * ipo.lotSize).toLocaleString('en-IN');

        // GMP %
        const price = ipo.priceRange.max;
        const pct = price ? ((latestInfo.value / price) * 100).toFixed(1) : 0;

        return `
            <tr onclick="window.location.href='gmp-detail.html?id=${ipo._id}'" style="cursor: pointer;">
                <td>
                    <div class="company-cell">
                        <div class="company-logo-small">
                            ${ipo.companyLogo ? `<img src="${ipo.companyLogo}" style="width:100%; height:100%; object-fit:contain;">` : initials}
                        </div>
                        <span class="company-name-link" style="color: var(--text-primary);">${ipo.companyName}</span>
                    </div>
                </td>
                <td style="font-weight: 600;">₹${ipo.priceRange.max}</td>
                <td class="text-right">
                    <div style="font-weight: 700; color: ${gmpColor};">₹${latestInfo.value} ${trendIcon}</div>
                    <div style="font-size: 0.75rem; color: #888;">(${pct}%)</div>
                </td>
                <td class="text-right" style="font-weight: 700; color: ${latestInfo.value >= 0 ? 'var(--success)' : 'var(--danger)'};">₹${estProfit}</td>
                <td class="text-right">
                     <span class="badge-gray" style="font-size: 0.7rem;">Expected</span>
                </td>
            </tr>
        `;
    }).join('');
}

function renderHomeSubscription(ipos) {
    const containerCard = document.getElementById('subscriptionCard');
    const noDataDiv = document.getElementById('subNoData');
    const tbody = document.getElementById('subscriptionTableBody');

    const subIPOs = ipos.filter(ipo => (ipo.status === 'open' || ipo.status === 'closed') && ipo.subscription && ipo.subscription.total)
        .sort((a, b) => new Date(b.closeDate) - new Date(a.closeDate))
        .slice(0, 5);

    if (subIPOs.length === 0) {
        if (containerCard) containerCard.style.display = 'none';
        if (noDataDiv) noDataDiv.style.display = 'block';
        return;
    } else {
        if (containerCard) containerCard.style.display = 'block';
        if (noDataDiv) noDataDiv.style.display = 'none';
    }

    tbody.innerHTML = subIPOs.map(ipo => {
        const initials = Helpers.getInitials(ipo.companyName);
        const typeBadge = ipo.category === 'SME' ? 'SME' : 'Mainboard';

        return `
            <tr>
                <td>
                    <div class="company-cell">
                        <div class="company-logo-small">
                            ${ipo.companyLogo ? `<img src="${ipo.companyLogo}" style="width:100%; height:100%; object-fit:contain;">` : initials}
                        </div>
                        <a href="subscription.html?id=${ipo._id}" class="company-name-link">${ipo.companyName}</a>
                    </div>
                </td>
                <td><span class="badge-gray">${typeBadge}</span></td>
                <td>${ipo.subscription.retail || '-'}x</td>
                <td>${ipo.subscription.nii || '-'}x</td>
                <td>${ipo.subscription.qib || '-'}x</td>
                <td class="text-right" style="font-weight: 700; color: var(--primary-green);">${ipo.subscription.total}x</td>
            </tr>
        `;
    }).join('');
}
