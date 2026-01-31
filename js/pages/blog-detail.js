const API_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');

    if (slug) {
        loadNewsDetail(slug);
    } else {
        window.location.href = 'blogs.html';
    }
});

async function loadNewsDetail(slug) {
    try {
        const loading = document.getElementById('loading');
        const article = document.getElementById('articleContent');
        const notFound = document.getElementById('notFound');

        const response = await fetch(`${API_URL}/news/${slug}`);

        if (!response.ok) {
            loading.style.display = 'none';
            notFound.style.display = 'block';
            return;
        }

        const data = await response.json();
        const news = data.news;

        if (!news) {
            loading.style.display = 'none';
            notFound.style.display = 'block';
            return;
        }

        // Populate Content
        document.title = `${news.title} - IPOGains Blogs`;
        document.getElementById('newsCategory').textContent = news.category;
        document.getElementById('newsTitle').textContent = news.title;
        document.getElementById('newsDate').textContent = formatDate(news.createdAt);
        document.getElementById('newsAuthor').textContent = news.author || 'Admin';
        document.getElementById('newsImage').src = news.image || 'assets/images/defaults/news-default.jpg';
        document.getElementById('newsBody').innerHTML = news.content;

        // Meta tags for SEO (Basic JS update, though SSR is better for real SEO)
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', news.summary);

        loading.style.display = 'none';
        article.style.display = 'block';

    } catch (error) {
        console.error('Error loading article:', error);
        document.getElementById('loading').innerHTML = '<p class="text-danger">Failed to load article</p>';
    }
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}
