document.addEventListener('DOMContentLoaded', async () => {
    // Get ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const ipoId = urlParams.get('id');

    if (!ipoId) {
        window.location.href = 'gmp.html';
        return;
    }

    try {
        const loading = document.getElementById('loading');
        const content = document.getElementById('detailContent');

        // Fetch IPO details
        // Note: API.get returns the parsed JSON body directly if using the helper in api.js
        // The API route is GET /api/ipos/:id, returning { ipo: ... } or just the object
        // Let's assume standard response wrapper { ipo: ... } or check api.js behavior
        // Based on ipoController.getIPOById, it returns res.json({ ipo })

        const data = await API.get(`/ipos/${ipoId}`);
        const ipo = data.ipo;

        if (!ipo) throw new Error('IPO not found');

        loading.style.display = 'none';
        content.style.display = 'block';

        renderDetails(ipo);
        renderChart(ipo);

    } catch (error) {
        console.error('Error loading IPO details:', error);
        document.getElementById('loading').innerHTML = '<p class="text-danger">Failed to load details. Please try again.</p>';
    }
});

function renderDetails(ipo) {
    document.getElementById('companyName').textContent = ipo.companyName;
    document.getElementById('ipoStatus').textContent = ipo.status.toUpperCase();
    document.getElementById('ipoStatus').className = `status-badge status-${ipo.status}`;

    // GMP Data
    const gmpData = ipo.gmp || [];
    const latestGmp = gmpData.length > 0 ? gmpData[gmpData.length - 1] : null;

    if (latestGmp) {
        const priceMax = ipo.priceRange.max;
        const gmpValue = latestGmp.value;
        const gmpPercent = ((gmpValue / priceMax) * 100).toFixed(2);
        const estimatedListing = priceMax + gmpValue;

        // Trend Logic
        const previousGmp = gmpData.length > 1 ? gmpData[gmpData.length - 2] : null;
        let trendHtml = '';
        if (latestGmp && previousGmp) {
            if (latestGmp.value > previousGmp.value) {
                trendHtml = '<span style="color: var(--success); margin-left: 10px; font-size: 0.8em;"><i class="fas fa-arrow-up"></i></span>';
            } else if (latestGmp.value < previousGmp.value) {
                trendHtml = '<span style="color: var(--danger); margin-left: 10px; font-size: 0.8em;"><i class="fas fa-arrow-down"></i></span>';
            } else {
                trendHtml = '<span style="color: #6c757d; margin-left: 10px; font-size: 0.8em;"><i class="fas fa-minus"></i></span>';
            }
        } else {
            trendHtml = '<span style="color: var(--success); margin-left: 10px; font-size: 0.8em;"><i class="fas fa-arrow-up"></i></span>';
        }

        document.getElementById('currentGmpValue').innerHTML = `₹${gmpValue} ${trendHtml}`;
        document.getElementById('listingEstimate').textContent = `₹${estimatedListing} (${priceMax} + ${gmpValue})`;
        document.getElementById('gmpPercentage').textContent = `${gmpPercent}%`;
        document.getElementById('lastUpdated').textContent = Helpers.formatDate(latestGmp.date);
    } else {
        document.getElementById('currentGmpValue').textContent = '—';
        document.getElementById('listingEstimate').textContent = '—';
    }

    // Render History Table (Reverse order for latest first)
    const tbody = document.getElementById('gmpHistoryBody');
    if (gmpData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">No GMP history available</td></tr>';
    } else {
        // Reverse to show latest first
        const history = [...gmpData].reverse();

        tbody.innerHTML = history.map((entry, index) => {
            // Calculate change from *previous* entry (which is the *next* one in this reversed array)
            const previousValue = index < history.length - 1 ? history[index + 1].value : entry.value;
            const diff = entry.value - previousValue;
            let diffHtml = '';

            if (index < history.length - 1) { // Don't show diff for the very first (oldest) entry
                if (diff > 0) diffHtml = `<small style="color: var(--success); margin-left:8px;">(+₹${diff})</small>`;
                else if (diff < 0) diffHtml = `<small style="color: var(--danger); margin-left:8px;">(₹${diff})</small>`;
                else diffHtml = `<small style="color: #ccc; margin-left:8px;">-</small>`;
            }

            const dateObj = new Date(entry.date);
            const dateStr = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

            return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 12px 0; color: #aaa;">
                    ${dateStr} <span style="font-size: 0.8em; opacity: 0.7; margin-left: 5px;">${timeStr}</span>
                </td>
                <td style="text-align: right; padding: 12px 0;">
                    <span style="font-weight: 600; font-size: 1.1em; color: #fff;">₹${entry.value}</span>
                    ${diffHtml}
                </td>
            </tr>
        `;
        }).join('');
    }
}

function renderChart(ipo) {
    const ctx = document.getElementById('gmpChart').getContext('2d');
    const gmpData = ipo.gmp || [];

    // Extract labels (Date/Time) and data (Value)
    const labels = gmpData.map(entry => {
        const d = new Date(entry.date);
        return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    });
    const values = gmpData.map(entry => entry.value);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'GMP Value (₹)',
                data: values,
                borderColor: '#10B981', // Primary Green
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                tension: 0.4, // Smooth curve
                fill: true,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#10B981',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: (context) => ` GMP: ₹${context.raw}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}
