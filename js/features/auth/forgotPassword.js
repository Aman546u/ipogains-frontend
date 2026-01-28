// Forgot Password Feature

const ForgotPassword = {
    currentEmail: '',

    async sendOTP(email) {
        try {
            const data = await API.post('/auth/forgot-password', { email });

            this.currentEmail = email;
            Helpers.showToast('OTP sent! Please check your Inbox and SPAM folder.', 'success');

            // Store email for reset form
            document.getElementById('resetEmail').value = email;

            // Switch to reset password modal
            Modals.switch('forgotPasswordModal', 'resetPasswordModal');
        } catch (error) {
            Helpers.showToast(error.message || 'Failed to send OTP', 'error');
        }
    },

    async resetPassword(email, otp, newPassword) {
        try {
            const data = await API.post('/auth/reset-password', {
                email,
                otp,
                newPassword
            });

            Helpers.showToast(data.message, 'success');

            // Close modal and open login
            Modals.close('resetPasswordModal');
            setTimeout(() => Modals.open('loginModal'), 500);
        } catch (error) {
            Helpers.showToast(error.message || 'Failed to reset password', 'error');
        }
    },

    init() {
        document.addEventListener('submit', async (e) => {
            // Forgot password form
            if (e.target && e.target.id === 'forgotPasswordForm') {
                e.preventDefault();
                const email = document.getElementById('forgotEmail').value;
                await this.sendOTP(email);
            }

            // Reset password form
            if (e.target && e.target.id === 'resetPasswordForm') {
                e.preventDefault();

                const email = document.getElementById('resetEmail').value;
                const otp = document.getElementById('resetOTP').value;
                const newPassword = document.getElementById('newPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;

                // Validate passwords match
                if (newPassword !== confirmPassword) {
                    Helpers.showToast('Passwords do not match', 'error');
                    return;
                }

                // Validate password length
                if (newPassword.length < 6) {
                    Helpers.showToast('Password must be at least 6 characters', 'error');
                    return;
                }

                await this.resetPassword(email, otp, newPassword);
            }
        });
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => ForgotPassword.init());

// Make ForgotPassword globally available
window.ForgotPassword = ForgotPassword;
