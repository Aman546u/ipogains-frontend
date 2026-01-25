// Authentication handling
const API_URL = window.location.origin + '/api';

let currentEmail = '';

// Login form
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            if (data.requiresVerification) {
                currentEmail = email;
                closeModal('loginModal');
                openModal('otpModal');
                showToast('Please verify your email with the OTP sent', 'info');
            } else {
                localStorage.setItem('authToken', data.token);
                showToast('Login successful!', 'success');
                closeModal('loginModal');
                setTimeout(() => location.reload(), 1000);
            }
        } else {
            showToast(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('An error occurred. Please try again.', 'error');
    }
});

// Register form
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentEmail = email;
            closeModal('registerModal');
            openModal('otpModal');
            showToast('Registration successful! Please verify your email.', 'success');
        } else {
            showToast(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('An error occurred. Please try again.', 'error');
    }
});

// OTP form
document.getElementById('otpForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const otp = document.getElementById('otpCode').value;

    if (!currentEmail) {
        showToast('Session expired. Please login again.', 'error');
        closeModal('otpModal');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/verify-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: currentEmail, otp })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            showToast('Email verified successfully!', 'success');
            closeModal('otpModal');
            setTimeout(() => location.reload(), 1000);
        } else {
            showToast(data.error || 'Invalid OTP', 'error');
        }
    } catch (error) {
        console.error('OTP verification error:', error);
        showToast('An error occurred. Please try again.', 'error');
    }
});

// Resend OTP
document.getElementById('resendOTP')?.addEventListener('click', async () => {
    if (!currentEmail) {
        showToast('Session expired. Please login again.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/resend-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: currentEmail })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('OTP sent successfully!', 'success');
        } else {
            showToast(data.error || 'Failed to send OTP', 'error');
        }
    } catch (error) {
        console.error('Resend OTP error:', error);
        showToast('An error occurred. Please try again.', 'error');
    }
});

// Allotment form
document.getElementById('allotmentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        showToast('Please login to check allotment status', 'error');
        openModal('loginModal');
        return;
    }

    const ipoId = document.getElementById('selectIPO').value;
    const panCard = document.getElementById('panCard').value.toUpperCase();

    if (!ipoId) {
        showToast('Please select an IPO', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/allotment/check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ ipoId, panCard })
        });

        const data = await response.json();

        if (response.ok) {
            displayAllotmentResult(data);
        } else {
            showToast(data.error || 'Failed to check allotment', 'error');
        }
    } catch (error) {
        console.error('Allotment check error:', error);
        showToast('An error occurred. Please try again.', 'error');
    }
});

function displayAllotmentResult(data) {
    const resultDiv = document.getElementById('allotmentResult');

    if (!data.found) {
        resultDiv.className = 'allotment-result result-error';
        resultDiv.innerHTML = `
            <i class="fas fa-times-circle" style="font-size: 2rem; color: var(--danger);"></i>
            <h3>No Application Found</h3>
            <p>${data.message}</p>
        `;
    } else {
        const statusClass = data.allotment.status === 'allotted' ? 'result-success' : 'result-error';
        const statusIcon = data.allotment.status === 'allotted' ? 'check-circle' : 'times-circle';
        const statusColor = data.allotment.status === 'allotted' ? 'var(--success)' : 'var(--danger)';

        resultDiv.className = `allotment-result ${statusClass}`;
        resultDiv.innerHTML = `
            <i class="fas fa-${statusIcon}" style="font-size: 2rem; color: ${statusColor};"></i>
            <h3>${data.allotment.ipoName}</h3>
            <div class="detail-row">
                <span class="detail-label">Status</span>
                <span class="detail-value" style="color: ${statusColor}; font-weight: 800;">
                    ${data.allotment.status.toUpperCase()}
                </span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Application Number</span>
                <span class="detail-value">${data.allotment.applicationNumber}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Applied Date</span>
                <span class="detail-value">${formatDate(data.allotment.appliedDate)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Lot Size</span>
                <span class="detail-value">${data.allotment.lotSize} shares</span>
            </div>
        `;
    }

    resultDiv.style.display = 'block';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}
