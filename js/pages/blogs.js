const API_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    loadNews();
});

async function loadNews() {
    try {
        const loading = document.getElementById('loading');
        const newsGrid = document.getElementById('newsGrid');
        const noNews = document.getElementById('noNews');

        const response = await fetch(`${API_URL}/news`);
        const data = await response.json();

        loading.style.display = 'none';

        if (!data.news || data.news.length === 0) {
            noNews.style.display = 'block';
            return;
        }

        newsGrid.innerHTML = data.news.map(item => `
            <div class="news-card">
                <img src="${item.image || 'assets/images/defaults/news-default.jpg'}" alt="${item.title}" class="news-image" onerror="this.src='/assets/images/defaults/news-default.jpg'">
                <div class="news-content">
                    <div class="news-category">${item.category}</div>
                    <a href="blog-detail.html?slug=${item.slug}" style="text-decoration: none;">
                        <h3 class="news-title">${item.title}</h3>
                    </a>
                    <p class="news-summary">${item.summary}</p>
                    <div class="news-meta">
                        <span>${formatDate(item.createdAt)}</span>
                        <a href="blog-detail.html?slug=${item.slug}" class="read-more-btn">Read More <i class="fas fa-arrow-right"></i></a>
                    </div>
                </div>
            </div>
        `).join('');

        newsGrid.style.display = 'grid';

    } catch (error) {
        console.error('Error loading news:', error);
        document.getElementById('loading').innerHTML = '<p class="text-danger">Failed to load blogs</p>';
    }
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}
