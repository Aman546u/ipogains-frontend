// Modal Management

const Modals = {
    open(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    },

    close(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    },

    switch(closeId, openId) {
        this.close(closeId);
        setTimeout(() => this.open(openId), 200);
    },

    init() {
        // Close modal on background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.close(modal.id);
                }
            });
        });

        // Close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                if (modal) {
                    this.close(modal.id);
                }
            });
        });
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => Modals.init());

// Make Modals globally available
window.Modals = Modals;

// Global functions for inline onclick handlers
function openModal(modalId) {
    Modals.open(modalId);
}

function closeModal(modalId) {
    Modals.close(modalId);
}

function switchModal(closeId, openId) {
    Modals.switch(closeId, openId);
}
