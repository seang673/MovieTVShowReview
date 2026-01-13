console.log("JavaScript is loaded");

async function searchMedia(){
    let query = document.getElementById('searchBox').value;
    if (query.length < 2) {
        document.getElementById("results").innerHTML = "<p>Type at least 2 characters to search.</p>";
        return;
    }

    const apiKey = "462908883a54600a4f35c65fdb0475cc";

    try{
        let movieResponse = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}`);
        let tvResponse = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${query}`);

        if (!movieResponse.ok || !tvResponse.ok){
            throw new Error("Failed to fetch data from TMDB")
        }

        let movieData = await movieResponse.json();
        let tvData = await tvResponse.json();

        if (!movieData.results.length && !tvData.results.length) {
            document.getElementById("results").innerHTML = "<p>No results found.</p>";
        } else {
            displayResults(movieData.results, tvData.results);
        }

    } catch (error){
        document.getElementById("results").innerHTML = `<p>Error: ${error.message}</p>`;
        console.error("API Request Failed:", error);
    }
}

function displayResults(movies, tvShows){
    let resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML=`
        <div class="movies-container">
            <h2 style="font-family: Georgia, serif;">Movies</h2>
            <div id="movies-list"></div>
        </div>
        <div class="tv-container">
            <h2 style="font-family: Georgia, serif;">TV Shows</h2>
            <div id="tv-list"></div>
        </div>`;

    let moviesList = document.getElementById("movies-list");
    let tvList = document.getElementById("tv-list");

    movies.forEach(movie => {
        const movieCard = document.createElement("div");
        movieCard.className = "media-card";
        const year = movie.release_date ? movie.release_date.split('-')[0]: "N/A";

        movieCard.innerHTML = `
                <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title}" width="100%">
                <h3>${movie.title} (${year})</h3>
        `;
        movieCard.addEventListener("click", function() {
                    const posterUrl = this.querySelector("img").src;
                    const type = "movie";

                    document.getElementById("posterUrlInput").value = posterUrl;
                    openModal(movie.id, movie.title, type);
                    }
                );
        moviesList.appendChild(movieCard);
    });

    tvShows.forEach(show => {
        const showCard = document.createElement("div");
        showCard.className = "show-card";
        const year = show.first_air_date ? show.first_air_date.split('-')[0] : "N/A";

        showCard.innerHTML = `
                <img src="https://image.tmdb.org/t/p/w500${show.poster_path}" alt="${show.title}" width="100%">
                <h3>${show.name} (${year})</h3>
        `;
        showCard.addEventListener("click", function() {
                    const posterUrl = this.querySelector("img").src;
                    const type = "tv";

                    document.getElementById("posterUrlInput").value = posterUrl;
                    openModal(show.id, show.name, type);
                    }
                );
        tvList.appendChild(showCard);
        });
    }
    if (!movies.length && !tvShows.length) {
        resultsDiv.innerHTML = "<p>No results found.</p>";
    }

async function openModal(mediaId, mediaTitle, mediaType){
    const apiKey = "462908883a54600a4f35c65fdb0475cc";
    let apiUrl;

    if (mediaType === "movie")
    {
        apiUrl = `https://api.themoviedb.org/3/movie/${mediaId}?api_key=${apiKey}`;
    } else if (mediaType === "tv"){
        apiUrl = `https://api.themoviedb.org/3/tv/${mediaId}?api_key=${apiKey}`;
    } else {
        console.error("Invalid media type")
        return;
    }

    try{
        const response = await fetch(apiUrl);
        if (!response.ok){
            throw new Error("Failed to fetch media details");
        }
        const data = await response.json();

        let releaseDate = mediaType === "movie" ?
        (data.release_date ? data.release_date : "N/A") :
        (data.first_air_date ? data.first_air_date : "N/A");

        const genres = data.genres.map(genre => genre.name).join(", ");
        const runtime = data.runtime;

        const rating = String(data.vote_average);
        rating = rating.substring(0, 3); // Limit to 3 characters

        document.getElementById("modalTitle").innerText = `${mediaTitle}`;
        document.getElementById("release-date").innerText = `Release Date: ${releaseDate}`;
        document.getElementById("modalOverview").innerText = data.overview || "(No overview available)";

        document.getElementById("movieIdInput").value = mediaId;  // ✅ Store movie ID in hidden field
        document.getElementById("movieTitleInput").value = mediaTitle;  // ✅ Store movie title in hidden field

        document.getElementById("genres").innerText = ("G͟e͟n͟r͟e͟s͟: " + genres) || "Genres: (Unavailable)";
        const runtimeElement = document.getElementById("runtime");

        if (runtime && typeof runtime === "number") {
            // Movie → show runtime
            runtimeElement.style.display = "block";
            runtimeElement.innerText = `Runtime: ${runtime} minutes`;
        } else {
            // TV show → hide runtime entirely
            runtimeElement.style.display = "none";
        }
        document.getElementById("rating").innerText = ("Popularity Rating: " + rating) || "Rating: (Unavailable)";

        document.getElementById("movieModal").style.display = "block";
        document.getElementById("modalTitle").setAttribute("data-id", mediaId);
        document.getElementById("modalTitle").setAttribute("data-type", mediaType);

        // ✅ Fetch past reviews for this movie
        const reviewsResponse = await fetch(`/get_reviews/${mediaId}`);
        const reviewsData = await reviewsResponse.json();

        let reviewList = document.getElementById("reviewList");
        reviewList.innerHTML = ""; // ✅ Clear previous reviews

        reviewsData.reviews.forEach(review => {
            let starsHTML = "";
            for (let i = 1; i <= 5; i++) {
                starsHTML += i <= review.rating
                    ? `<i class="fa-solid fa-star" style="color: gold;"></i>`
                    : `<i class="fa-regular fa-star" style="color: gold;"></i>`;
            }

            let reviewItem = document.createElement("div");
            reviewItem.className = "review-item";
            reviewItem.innerHTML = `
            <div class="stars">${starsHTML}</div>
            <p>${review.review_text}</p>`;
            reviewList.appendChild(reviewItem);
        });

        document.getElementById("movieModal").style.display = "block";

        // ✅ Debug: Ensure stars exist when modal opens
        console.log("Stars Found After Modal Opens:", document.querySelectorAll(".star").length);

        // ✅ Event delegation: Attach listener after modal opens
        document.getElementById("reviewForm").addEventListener("click", function(event) {
            if (event.target.classList.contains("star")) {
                const rating = event.target.getAttribute("data-value");

                // Remove 'selected' class from all stars
                document.querySelectorAll(".star").forEach(s => s.classList.remove("selected"));

                // Highlight clicked star and all previous stars
                event.target.classList.add("selected");
                let prevSibling = event.target.previousElementSibling;
                while (prevSibling) {
                    prevSibling.classList.add("selected");
                    prevSibling = prevSibling.previousElementSibling;
                }

                // ✅ Store rating in hidden input
                document.getElementById("ratingInput").value = rating;

                console.log("Selected Rating:", rating);  // ✅ Debugging step
            }
        });
        } catch (error) {
            console.error("Error fetching media details:", error);
        }
    }

async function saveMedia(){
    const csrfTokenElement = document.querySelector("input[name='csrf_token']");
    if (!csrfTokenElement) {
        console.error("CSRF token input field not found!");
        return;
    }
    const csrfToken = csrfTokenElement.value;

    const mediaId = document.getElementById("modalTitle").getAttribute("data-id");
    const mediaTitle = document.getElementById("modalTitle").innerText;
    const mediaType = document.getElementById("modalTitle").getAttribute("data-type");

    const apiKey = "462908883a54600a4f35c65fdb0475cc";
    let apiUrl;
    if (mediaType === "movie")
    {
        apiUrl = `https://api.themoviedb.org/3/movie/${mediaId}?api_key=${apiKey}`;
    } else if (mediaType === "tv"){
        apiUrl = `https://api.themoviedb.org/3/tv/${mediaId}?api_key=${apiKey}`;
    } else {
        console.error("Invalid media type")
        return;
    }
    const response = await fetch(apiUrl);
        if (!response.ok){
            throw new Error("Failed to fetch media details");
        }
        const data = await response.json();

    const releaseDate = mediaType === "movie" ?
        (data.release_date ? data.release_date : "N/A") :
        (data.first_air_date ? data.first_air_date : "N/A");
    const theposterUrl = document.getElementById("posterUrlInput").value;

     const payload = {
        media_id: mediaId,
        title: mediaTitle,
        media_type: mediaType,
        release_date: releaseDate,
        poster_url: theposterUrl,
        csrf_token: csrfToken
    };

    console.log("Sending JSON:", JSON.stringify(payload));

    try{
        const response = await fetch("/save_media", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken
            },
            body: JSON.stringify(payload)
        });

        const resultText = await response.text(); // ✅ Log raw response before parsing
        console.log("Raw Response:", resultText);

        try{
            const result = JSON.parse(resultText);
            alert(result.message || "Error occurred");
        } catch(error){
            console.error("Error parsing JSON response:", error);
            alert("Failed to save media");
        }
    } catch (error){
        console.error("Fetch Error:", error);
    }
}

function rateMovie(movieId, rating) {
    console.log(`Sending rating: ${rating} for movieId: ${movieId}`);

    fetch("/rate_movie", {
        method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify({movie_id: movieId, rating})
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log("Rating submtted successfully");
        } else{
            console.error("Error submitting rating:", data.error);
        }
    })
    .catch(error => console.error("Fetch error:", error));
}

document.querySelectorAll(".star").forEach(star => {
    star.addEventListener("click", function() {
        const rating = this.getAttribute("data-value");

        // ✅ Remove 'selected' class from all stars
        document.querySelectorAll(".star").forEach(s => s.classList.remove("selected"));

        // ✅ Add 'selected' class to clicked star and all previous stars
        this.classList.add("selected");
        this.previousElementSibling?.classList.add("selected");

        // ✅ Store rating inside hidden input
        document.getElementById("ratingInput").value = rating;
        alert("You have selected rating:", rating);

        console.log("Selected Rating:", rating); // ✅ Debugging step
    });
});

document.querySelectorAll(".star").forEach(star => {
    star.addEventListener("click", function(event) {
        console.log("Star clicked:", event.target.getAttribute("data-value"));
    });
});


async function submitReview() {
    const csrfToken = document.getElementById("csrfToken").value;
    const mediaId = String(document.getElementById("movieIdInput").value);
    const movieTitle = document.getElementById("movieTitleInput").value;
    const rating = parseInt(document.getElementById("ratingInput").value);
    const reviewText = document.getElementById("reviewText").value;
    const userId = String(document.getElementById("userIdInput").value);  // ✅ Replace with actual user ID

    if (!userId){
        alert("User ID is missing! Ensure login");
        return;
    }

    if (!rating || !reviewText.trim()) {
        alert("Please select a rating and write a review!");
        return;
    }
    console.log("User ID Retrieved:", typeof userId);
    console.log("Media ID Retrieved:", typeof mediaId);
    console.log("Movie Title:", typeof movieTitle);
    console.log("Rating:", typeof rating);
    console.log("Review Text:", typeof reviewText);

    const payload = {
        media_id: mediaId,
        user_id: userId,
        movie_title: movieTitle,
        rating: rating,
        review_text: reviewText,
        csrf_token: csrfToken
    };

    console.log("Sending JSON:", JSON.stringify(payload));

    try {
        const response = await fetch("/submit_review", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log("Parsed result:", result);

        alert(result.message || "Error occurred");


        if (result.success) {
            let starsHTML = "";
            for (let i = 1; i <= 5; i++) {
                starsHTML += i <= result.rating
                ? `<i class="fa-solid fa-star" style="color: gold;"></i>`
                : `<i class="fa-regular fa-star" style="color: gold;"></i>`;
            }

            const reviewList = document.getElementById("reviewList");
            const reviewItem = document.createElement("div");
            reviewItem.className = "review-item";
            reviewItem.innerHTML =
                `<div class="stars">${starsHTML}</div><br>
                <p>${result.review_text}</p>`;
            reviewList.appendChild(reviewItem);

            document.getElementById("reviewText").value = "";
        }
        } catch (error) {
            console.error("Error parsing JSON response:", error);
            alert("Failed to submit review.");
        }
    }

function closeModal() {
    document.getElementById("movieModal").style.display = "none";
}
