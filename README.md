# IPOGains Frontend

This is the frontend user interface for the IPOGains platform. It is a static site built with HTML, CSS, and Vanilla JavaScript.

## 🚀 How to Run Locally

1.  Navigate to this folder:
    ```bash
    cd frontend
    ```
2.  Run with any static server. If you have Node.js installed:
    ```bash
    npx serve .
    ```
    Or if you use Python:
    ```bash
    python -m http.server 5500
    ```
3.  Open `http://localhost:5500` (or the port shown) in your browser.

## 🔗 Connection to Backend

This frontend connects to a separate backend API.

-   **Development**: By default, if running on `localhost`, it connects to `http://localhost:3000/api`.
-   **Production**: You can configure the production URL in `js/config/constants.js`.

## 📂 Structure
-   `index.html`: Main landing page
-   `css/`: Stylesheets
-   `js/`: JavaScript logic
-   `pages/`: Other HTML pages

## 📦 Deployment
You can deploy this folder easily to:
-   Vercel
-   Netlify
-   GitHub Pages
-   Render (Static Site)
