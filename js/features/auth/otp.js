// OTP Verification Feature

const OTP = {
    currentEmail: '',

    show(email) {
        this.currentEmail = email;
        Modals.open('otpModal');
    },

    async verify(otp) {
        try {
            if (!this.currentEmail) {
                Helpers.showToast('Session expired. Please login again.', 'error');
                return;
            }

            const data = await API.post('/auth/verify-otp', {
                email: this.currentEmail,
                otp
            });

            // Save token and user data
            Storage.set(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN, data.token);
            Storage.set(APP_CONFIG.STORAGE_KEYS.USER_DATA, data.user);

            Helpers.showToast('Email verified successfully!', 'success');
            Modals.close('otpModal');

            setTimeout(() => location.reload(), 1000);
        } catch (error) {
            Helpers.showToast(error.message || 'Invalid OTP', 'error');
        }
    },

    async resend() {
        try {
            if (!this.currentEmail) {
                Helpers.showToast('Session expired', 'error');
                return;
            }

            await API.post('/auth/resend-otp', { email: this.currentEmail });
            Helpers.showToast('OTP sent successfully!', 'success');
        } catch (error) {
            Helpers.showToast(error.message || 'Failed to send OTP', 'error');
        }
    },

    init() {
        document.addEventListener('submit', async (e) => {
            if (e.target && e.target.id === 'otpForm') {
                e.preventDefault();
                const otp = document.getElementById('otpCode').value;
                await this.verify(otp);
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'resendOTP') {
                e.preventDefault();
                this.resend();
            }
        });
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => OTP.init());

// Make OTP globally available
window.OTP = OTP;
