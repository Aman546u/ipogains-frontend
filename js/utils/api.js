// API Utility Functions

const API = {
    // Generic API call function
    async call(endpoint, options = {}) {
        const token = Storage.get(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        const config = { ...defaultOptions, ...options };

        try {
            const response = await fetch(`${APP_CONFIG.API_URL}${endpoint}`, config);

            // Handle rate limiting specifically
            if (response.status === 429) {
                const text = await response.text();
                let message = 'Too many requests. Please try again later.';
                try {
                    const jsonData = JSON.parse(text);
                    message = jsonData.error || message;
                } catch (e) {
                    // Fallback to text if not JSON
                    if (text && text.length < 100) message = text;
                }
                throw new Error(message);
            }

            // Get response text first to handle potential parsing issues
            const responseText = await response.text();
            let data;
            try {
                data = responseText ? JSON.parse(responseText) : {};
            } catch (e) {
                if (!response.ok) {
                    throw new Error(`Server Error: ${response.status}`);
                }
                throw new Error('Invalid response from server');
            }

            if (!response.ok) {
                throw new Error(data.error || data.message || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // GET request
    get(endpoint) {
        return this.call(endpoint, { method: 'GET' });
    },

    // POST request
    post(endpoint, data) {
        return this.call(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    // PUT request
    put(endpoint, data) {
        return this.call(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    // DELETE request
    delete(endpoint) {
        return this.call(endpoint, { method: 'DELETE' });
    }
};

// Make API globally available
window.API = API;
