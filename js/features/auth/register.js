// Register Feature

const Register = {
    async handleRegister(email, password) {
        try {
            if (!Helpers.validateEmail(email)) {
                Helpers.showToast('Please enter a valid email', 'error');
                return;
            }

            if (password.length < 6) {
                Helpers.showToast('Password must be at least 6 characters', 'error');
                return;
            }

            const data = await API.post('/auth/register', { email, password });

            Helpers.showToast(data.message, 'success');

            // Close register modal
            Modals.close('registerModal');

            // Check if OTP verification is required
            if (data.requiresOTP) {
                // Show OTP modal for email verification
                OTP.show(email);
            } else if (data.token) {
                // Auto-verified - save token and reload
                Storage.set(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN, data.token);
                Storage.set(APP_CONFIG.STORAGE_KEYS.USER_DATA, data.user);
                setTimeout(() => location.reload(), 1000);
            } else {
                // Show login modal
                setTimeout(() => Modals.open('loginModal'), 500);
            }
        } catch (error) {
            Helpers.showToast(error.message || 'Registration failed', 'error');
        }
    },

    init() {
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('registerEmail').value;
                const password = document.getElementById('registerPassword').value;
                await this.handleRegister(email, password);
            });
        }
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => Register.init());

