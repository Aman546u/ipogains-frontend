document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    loadAllotmentIPOs();
    setupAllotmentForm();
});

// Helper to get token correctly (handling JSON stringification)
const getToken = () => {
    const item = localStorage.getItem('authToken');
    try {
        return item ? JSON.parse(item) : null;
    } catch (e) {
        return item; // If not JSON, return as is
    }
};

// Helper to see if user is logged in
const isLoggedIn = () => {
    return !!getToken();
};

function checkAuthStatus() {
    return isLoggedIn();
}

async function loadAllotmentIPOs() {
    try {
        const response = await fetch(`${APP_CONFIG.API_URL}/ipos`);
        const data = await response.json();
        console.log('IPO Data received:', data);

        if (data.success && data.ipos) {
            const select = document.getElementById('allotmentIPO');

            // Filter IPOs that are closed or listed (where allotment is relevant)
            // USER REQUEST: Only show closed IPOs (recently closed), not old ones or listed ones if link not provided?
            // "only those ipo which is closed not listed" -> Status = closed
            // "recently closed 15-20" -> limit 20

            let relevantIPOs = data.ipos.filter(ipo => {
                const status = Helpers.calculateDisplayStatus(ipo);
                return status === 'closed' || status === 'listed';
            });

            // Sort by closeDate descending (most recent first)
            relevantIPOs.sort((a, b) => new Date(b.closeDate) - new Date(a.closeDate));

            // REMOVED LIMIT: Show all relevant IPOs for allotment check
            console.log('Relevant IPOs for allotment:', relevantIPOs.length);

            if (relevantIPOs.length === 0) {
                const opt = document.createElement('option');
                opt.text = "No IPOs available for allotment check";
                select.add(opt);
                select.disabled = true;
                return;
            }

            relevantIPOs.forEach(ipo => {
                const status = Helpers.calculateDisplayStatus(ipo);
                const info = status === 'listed' ? 'LISTED' : 'CLOSED';

                const option = document.createElement('option');
                option.value = ipo._id;
                option.text = `${ipo.companyName} (${info})`;
                option.dataset.link = ipo.allotmentLink || ''; // Store link
                option.dataset.status = status; // Store status
                option.dataset.registrar = ipo.registrar || 'Registrar'; // Store registrar name
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading IPOs:', error);
        showToast('Failed to load IPO list', 'error');
    }
}

function setupAllotmentForm() {
    const form = document.getElementById('allotmentForm');
    const select = document.getElementById('allotmentIPO');
    const panInputGroup = document.getElementById('panInputGroup');
    const panInput = document.getElementById('panCard');
    const externalMsg = document.getElementById('externalCheckMessage');
    const submitBtn = form.querySelector('button[type="submit"]');

    // Initial state check
    checkAuthStatus();

    // Helper to update UI based on selection
    const updateFormState = () => {
        const selectedOption = select.options[select.selectedIndex];
        if (!selectedOption) return;

        const link = selectedOption.dataset.link;
        const status = selectedOption.dataset.status;
        const registrar = selectedOption.dataset.registrar || 'Registrar';
        const ipoId = select.value;

        const resultDiv = document.getElementById('allotmentResult');
        if (resultDiv && resultDiv.dataset.lastIpo !== ipoId) {
            resultDiv.classList.add('hidden');
            resultDiv.dataset.lastIpo = ipoId;
        }

        // Reset state
        submitBtn.classList.remove('btn-success', 'btn-primary', 'btn-secondary');
        submitBtn.disabled = false;

        if (!ipoId) {
            submitBtn.innerHTML = '<i class="fas fa-search"></i> Check Status';
            submitBtn.classList.add('btn-primary');
            submitBtn.disabled = true;
            if (panInputGroup) panInputGroup.style.display = 'none';
            if (externalMsg) externalMsg.style.display = 'none';
            return;
        }

        // USER REQUEST: When link provided, open it. Otherwise show "Link Not Available"
        if (link && link.trim() !== '') {
            submitBtn.innerHTML = `<i class="fas fa-shield-alt"></i> Check on ${registrar}`;
            submitBtn.classList.add('btn-success');
            submitBtn.dataset.mode = 'external';
            submitBtn.dataset.url = link;

            if (panInputGroup) panInputGroup.style.display = 'none';
            if (externalMsg) {
                externalMsg.style.display = 'block';
                const title = externalMsg.querySelector('h4');
                if (title) title.textContent = `Secure Check via ${registrar}`;
            }
        } else {
            // No link available
            submitBtn.innerHTML = '<i class="fas fa-ban"></i> Link Not Available';
            submitBtn.classList.add('btn-secondary');
            submitBtn.disabled = true;
            submitBtn.dataset.mode = 'none';

            if (panInputGroup) panInputGroup.style.display = 'none';
            if (externalMsg) externalMsg.style.display = 'none';
        }
    };

    // Attach listener
    select.addEventListener('change', updateFormState);

    // Run once on load to ensure correct state (Hidden)
    updateFormState();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Form submitted!');
        console.log('Button mode:', submitBtn.dataset.mode);
        console.log('Button URL:', submitBtn.dataset.url);

        // Check if external mode
        if (submitBtn.dataset.mode === 'external') {
            const url = submitBtn.dataset.url;
            const ipoId = select.value;
            console.log('External mode - URL:', url, 'IPO ID:', ipoId);

            if (url) {
                console.log('Opening URL now...');
                // 1. OPEN LINK IMMEDIATELY
                window.open(url, '_blank');
                console.log('window.open called');

                // 2. TRACK RELIABLY WITH KEEPALIVE
                try {
                    const currentToken = getToken();
                    console.log('Token exists:', !!currentToken);
                    if (currentToken) {
                        // keepalive: true ensures the request outlives the page interaction
                        fetch(`${APP_CONFIG.API_URL}/allotment/log-external`, {
                            method: 'POST',
                            keepalive: true,
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${currentToken}`
                            },
                            body: JSON.stringify({ ipoId })
                        }).catch(err => console.error('Keepalive tracking failed:', err));
                    } else {
                        showToast('Please login to track this application in your dashboard.', 'info');
                    }
                } catch (e) {
                    console.error('Tracking error:', e);
                }
            } else {
                console.log('No URL found, cannot open');
            }
            return;
        }

        // Internal Mode Logic
        const ipoId = select.value;
        const panCard = document.getElementById('panCard')?.value || '';
        const resultDiv = document.getElementById('allotmentResult');

        if (!ipoId) {
            showToast('Please select an IPO', 'error');
            return;
        }

        const token = getToken();
        // PAN is now always required for internal checks
        if (!panCard || panCard.length !== 10) {
            showToast('Please enter a valid 10-digit PAN card number', 'error');
            return;
        }

        // UI Loading State
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
        submitBtn.disabled = true;
        resultDiv.classList.add('hidden');
        resultDiv.innerHTML = '';

        try {
            const token = getToken();
            const response = await fetch(`${APP_CONFIG.API_URL}/allotment/check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: JSON.stringify({ ipoId, panCard: panCard.toUpperCase() })
            });

            const data = await response.json();

            resultDiv.classList.remove('hidden');

            if (data.success) {
                // Check tracking status
                if (data.trackingStatus === 'auth_error') {
                    showToast('Session expired. Check not saved to dashboard. Please login again.', 'warning');
                } else if (data.trackingStatus === 'tracked') {
                    // Optional: showToast('Result saved to dashboard', 'success');
                }

                if (data.found) {
                    const status = data.allotment.status.toLowerCase();
                    let statusClass = 'info';
                    let icon = 'fa-info-circle';
                    let statusText = 'Pending';
                    let message = 'Your application status is currently pending.';

                    if (status === 'allotted') {
                        statusClass = 'success';
                        icon = 'fa-check-circle';
                        statusText = 'Allotted';
                        message = `Congratulations! You have been allotted <strong>${data.allotment.lotSize}</strong> shares.`;
                        triggerConfetti();
                    } else if (status === 'not_allotted') {
                        statusClass = 'danger';
                        icon = 'fa-times-circle';
                        statusText = 'Not Allotted';
                        message = 'We regret to inform you that you have not been allotted any shares for this IPO.';
                    }

                    resultDiv.innerHTML = `
                        <div class="allotment-card ${statusClass}">
                            <div class="status-icon">
                                <i class="fas ${icon}"></i>
                            </div>
                            <div class="status-details">
                                <h3>${statusText}</h3>
                                <p class="company-name">${data.allotment.ipoName}</p>
                                <p class="message">${message}</p>
                                <div class="meta-info">
                                    <span>App No: ${data.allotment.applicationNumber}</span>
                                    <span>Applied: ${new Date(data.allotment.appliedDate).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    resultDiv.innerHTML = `
                        <div class="alert alert-warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            <strong>No Application Found</strong>
                            <p>${data.message || 'We could not find an application with this PAN for the selected IPO.'}</p>
                        </div>
                    `;
                }
            } else {
                resultDiv.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle"></i>
                        <strong>Error</strong>
                        <p>${data.error || 'Something went wrong. Please try again.'}</p>
                    </div>
                `;
            }

        } catch (error) {
            console.error('Allotment check error:', error);
            resultDiv.classList.remove('hidden');
            resultDiv.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i>
                    <strong>System Error</strong>
                    <p>Failed to connect to the server. Please check your internet connection.</p>
                </div>
            `;
        } finally {
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    });
}

// Simple Confetti Effect
function triggerConfetti() {
    if (window.confetti) {
        window.confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#22c55e', '#3b82f6', '#f59e0b']
        });
    }
}
