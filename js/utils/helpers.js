// Helper Utility Functions

const Helpers = {
    // Format date
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    },

    // Get initials from name
    getInitials(name) {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    },

    // Scroll to section
    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    },

    // Show toast notification
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;

        setTimeout(() => {
            toast.classList.remove('show');
        }, APP_CONFIG.TOAST_DURATION);
    },

    // Validate PAN card
    validatePAN(pan) {
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        return panRegex.test(pan.toUpperCase());
    },

    // Validate email
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Calculate generic status based on time
    calculateDisplayStatus(ipo) {
        if (!ipo) return 'upcoming';

        const now = new Date();

        // Helper to parse date string and set specific time
        // Handling potentially ISO strings or YYYY-MM-DD
        const getDateWithTime = (dateStr, hours, minutes) => {
            if (!dateStr) return null;
            const d = new Date(dateStr);
            d.setHours(hours, minutes, 0, 0);
            return d;
        };

        const listingDate = getDateWithTime(ipo.listingDate, 10, 0); // 10:00 AM
        const closeDate = getDateWithTime(ipo.closeDate, 16, 30);    // 4:30 PM
        const openDate = getDateWithTime(ipo.openDate, 10, 0);       // 10:00 AM

        // If explicitly marked as something else by admin/backend? 
        // We defer to the time-based logic requested by user.

        // 1. Listed Check
        if (listingDate && now >= listingDate) {
            return 'listed';
        }

        // 2. Closed Check (After 4:30 PM on closing date)
        // If it's NOT listed yet, but past close time
        if (closeDate && now >= closeDate) {
            return 'closed';
        }

        // 3. Open Check
        if (openDate && now >= openDate) {
            return 'open';
        }

        return 'upcoming';
    }
};

// Make Helpers globally available
window.Helpers = Helpers;
