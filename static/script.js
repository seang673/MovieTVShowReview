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
        let movieCard = `
            <div class="media-card" onclick="openModal('${movie.id}', '${movie.title}', 'movie')">
                <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title}" width="100%">
                <h3>${movie.title} (${movie.release_date ? movie.release_date.split('-')[0] : "N/A"})</h3>
            </div>
        `;
        moviesList.innerHTML += movieCard;
    });

    tvShows.forEach(show => {
        let showCard = `
            <div class="media-card" onclick="openModal('${show.id}', '${show.name}', 'tv')">
                <img src="https://image.tmdb.org/t/p/w500${show.poster_path}" alt="${show.name}" width="100%">
                <h3>${show.name} (${show.first_air_date ? show.first_air_date.split('-')[0] : "N/A"})</h3>
            </div>
        `;
        tvList.innerHTML += showCard;
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
            throw new error("Failed to fetch media details");
        }
        const data = await response.json();

        let releaseYear = mediaType === "movie" ?
        (data.release_date ? data.release_date.split("-")[0] : "N/A") :
        (data.first_air_date ? data.first_air_date.split("-")[0] : "N/A");

        const genres = data.genres.map(genre => genre.name).join(", ");

        document.getElementById("modalTitle").innerText = `${mediaTitle} (${releaseYear})`;
        document.getElementById("modalOverview").innerText = data.overview || "(No overview available)";
        document.getElementById("movieIdInput").value = mediaId;  // ✅ Store movie ID in hidden field
        document.getElementById("movieTitleInput").value = mediaTitle;  // ✅ Store movie title in hidden field

        document.getElementById("genres").innerText = ("G͟e͟n͟r͟e͟s͟: " + genres) || "Genres: (Unavailable)"
        document.getElementById("movieModal").style.display = "block";


        // ✅ Fetch past reviews for this movie
        const reviewsResponse = await fetch(`/get_reviews/${mediaId}`);
        const reviewsData = await reviewsResponse.json();

        let reviewList = document.getElementById("reviewList");
        reviewList.innerHTML = ""; // ✅ Clear previous reviews

        reviewsData.reviews.forEach(review => {
            let reviewItem = document.createElement("div");
            reviewItem.className = "review-item";
            reviewItem.innerHTML = `<p>${review}</p>`;
            reviewList.appendChild(reviewItem);
        });


    } catch (error) {
        console.error("Error fetching media details:", error);
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

document.querySelectorAll(".rating span").forEach(star => {
    star.addEventListener("mouseover", function() {
        stars.forEach((s, i) => {
            s.style.color = i <= index ? "gold" : "gray"; // ✅ Highlights stars before and including hovered one
        });
    });
    star.addEventListener("mouseout", function() {
        stars.forEach(s => s.style.color = "gray"); // ✅ Resets color when mouse leaves
    });
});


document.querySelectorAll(".rating span").forEach((star, index, stars) => {
    star.addEventListener("click", function() {
        const rating = index + 1;
        console.log(`Clicked star: ${rating}`);

        const movieId = document.querySelector(".rating").getAttribute("data-movie-id");
        rateMovie(movieId, rating);

        stars.forEach((s, i) => {
            s.classList.toggle("selected", i < rating);
        });

    });
});


function getUserRating(movieId){
    fetch(`/get_user_rating/${movieId}`)
    .then(response => response.json())
    .then(data => {
        if (data.user_rating !== null) {
            highlightStars(data.user_rating); // ✅ Apply stored rating
        }
    })
    .catch(error => console.error("Error fetching user rating:", error));
}

function highlightStars(rating) {
    const stars = document.querySelectorAll(".rating span");
    stars.forEach((star, index) => {
        star.classList.toggle("selected", index < rating);
    });
}
const movieId = document.querySelector(".rating").getAttribute("data-movie-id"); // ✅
getUserRating(movieId);



async function submitReview() {
    let reviewText = document.getElementById("reviewText").value;
    let movieId = document.getElementById("movieIdInput").value;
    let movieTitle = document.getElementById("movieTitleInput").value;

    if (!reviewText.trim()){
        return; // Prevent empty reviews
    }

    try{
        const response = await fetch("/submit_review", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                movie_id: movieId,
                movie_title: movieTitle,
                review_text: reviewText
            })
        });
        if (!response.ok) {
            throw new Error("Failed to submit review.");
        }
        document.getElementById("reviewText").value = ""; //To clear the input afterwards
        alert("Review submitted successfully!");

    } catch(error) {
        console.error("Error:", error);
        alert("Error submitting review: "+error)
    }
}

document.querySelector("#reviewForm").addEventListener("submit", async function(event) {
    event.preventDefault(); // ✅ Prevent full page reload

    let formData = new FormData(this);

    try {
        const response = await fetch("/submit_review", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            // ✅ Append new review dynamically inside reviewList
            document.getElementById("reviewList").innerHTML += `
                <div class="review-item">
                    <strong>${data.movie_title}</strong>
                    <p>${data.review_text}</p>
                </div>
            `;
            document.getElementById("reviewText").value = ""; // ✅ Clear textarea after submitting
        } else {
            alert("Error: " + data.error);
        }

    } catch(error) {
        console.error("Error:", error);
    }
});


document.querySelector("form").addEventListener("submit", function(event) {
    let csrfToken = document.querySelector("input[name='csrf_token']").value;
    if (!csrfToken) {
        alert("CSRF token is missing!");
        event.preventDefault();  // ✅ Prevent submission if token is missing
    }
});

document.querySelector("button[type='submit']").addEventListener("click", function(event) {
    console.log("Submit button clicked!");
});


function closeModal() {
    document.getElementById("movieModal").style.display = "none";
}
