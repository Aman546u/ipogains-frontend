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

        console.log(`🌐 API Request: ${APP_CONFIG.API_URL}${endpoint}`, config);

        try {
            const response = await fetch(`${APP_CONFIG.API_URL}${endpoint}`, config);
            console.log(`📥 API Response Status: ${response.status}`);

            // Handle rate limiting specifically
            if (response.status === 429) {
                const text = await response.text();
                let message = 'Too many requests. Please try again later.';
                try {
                    const jsonData = JSON.parse(text);
                    message = jsonData.error || message;
                } catch (e) {
                    if (text && text.length < 100) message = text;
                }
                throw new Error(message);
            }

            const responseText = await response.text();
            console.log(`📄 API Response Body Preview:`, responseText.substring(0, 200));

            let data;
            try {
                data = responseText ? JSON.parse(responseText) : {};
            } catch (e) {
                console.error('❌ JSON Parse Error:', e, responseText);
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
            console.error('❌ API Error:', error);
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
