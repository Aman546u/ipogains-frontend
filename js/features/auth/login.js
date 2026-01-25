// Login Feature

const Login = {
    async handleLogin(email, password) {
        try {
            const data = await API.post('/auth/login', { email, password });

            if (data.requiresVerification) {
                // Close login modal and show OTP modal
                Modals.close('loginModal');
                OTP.show(email);
                Helpers.showToast('Please verify your email with OTP', 'info');
                return;
            }

            // Save token and user data
            Storage.set(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN, data.token);
            Storage.set(APP_CONFIG.STORAGE_KEYS.USER_DATA, data.user);

            // Close the login modal
            Modals.close('loginModal');

            Helpers.showToast('Login successful!', 'success');

            // Reload page to update UI
            setTimeout(() => location.reload(), 1000);
        } catch (error) {
            Helpers.showToast(error.message || 'Login failed', 'error');
        }
    },

    init() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;
                await this.handleLogin(email, password);
            });
        }
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => Login.init());

