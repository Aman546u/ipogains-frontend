// Application Constants

const CONFIG = {
    // API URL Configuration
    // If running locally, point to localhost:3000
    // If deployed, point to your production backend URL
    // You can hardcode your production URL here
    API_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:3000/api'
        : 'https://ipogains-backend.onrender.com/api', // REPLACE THIS with your actual production backend URL

    IPO_STATUS: {
        UPCOMING: 'upcoming',
        OPEN: 'open',
        CLOSED: 'closed',
        LISTED: 'listed'
    },

    IPO_CATEGORY: {
        MAINBOARD: 'Mainboard',
        SME: 'SME'
    },

    ALLOTMENT_STATUS: {
        PENDING: 'pending',
        ALLOTTED: 'allotted',
        NOT_ALLOTTED: 'not_allotted'
    },

    TOAST_DURATION: 3000,
    OTP_LENGTH: 6,

    STORAGE_KEYS: {
        AUTH_TOKEN: 'authToken',
        USER_DATA: 'userData'
    }
};

// Make CONFIG globally available
window.APP_CONFIG = CONFIG;
