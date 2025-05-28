function fetchNews() {
    fetch("/get_news")
    .then(response => response.json())
    .then(data => {
        const movieContainer = document.getElementById("movieNews");
        const tvContainer = document.getElementById("showsNews");

        movieContainer.innerHTML = data.movies.map(article => `
            <div class="news-card">
                <h3>${article.title}</h3>
                <p>${article.description}</p>
                <a href="${article.url}" target="_blank">Read More</a>
            </div>
        `).join("");

        tvContainer.innerHTML = data.tv_shows.map(article => `
            <div class="news-card">
                <h3>${article.title}</h3>
                <p>${article.description}</p>
                <a href="${article.url}" target="_blank">Read More</a>
            </div>
        `).join("");
    })
    .catch(error => console.error("Error fetching news:", error));
}

fetchNews();

