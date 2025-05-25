
const apiKey = "462908883a54600a4f35c65fdb0475cc";
async function fetchMedia(){
    try{

        const movieUrl = `https://api.themoviedb.org/3/movie/upcoming?api_key=${apiKey}&language=en-US&page=1`;
        const tvUrl = `https://api.themoviedb.org/3/tv/on_the_air?api_key=${apiKey}&language=en-US&page=1`;

        const movieResponse = await fetch(movieUrl);
        const movieData = await movieResponse.json();

        const tvResponse = await fetch(tvUrl);
        const tvData = await tvResponse.json();

        const mediaContainer = document.getElementById("mediaContainer");
        const today = new Date().toISOString().split("T")[0];  //Get today's date


        [...movieData.results, ...tvData.results].forEach(media => {
            const releaseDate = media.release_date || media.first_air_date;

            //checks for movies or shows that will come out after the current day
            if (releaseDate && releaseDate > today){
                const mediaCard = document.createElement("div");
                mediaCard.className = "media-card";
                yr = releaseDate.split('-')[0]
                mediaCard.innerHTML = `
                    <img src="https://image.tmdb.org/t/p/w500${media.poster_path}" alt="${media.title || media.name}">
                    <h2>${media.title || media.name} (${yr}) </h2>

                `;
                const type = media.release_date ? "movie" : "tv";
                mediaCard.onclick = () => openModal(media.id, media.title || media.name, type);
                mediaContainer.appendChild(mediaCard);
            }

        });
    } catch (error) {
        console.error("Error fetching media:", error);
    }
}
fetchMedia();

async function openModal(mediaId, mediaTitle, mediaType) {
    const detailsUrl = `https://api.themoviedb.org/3/${mediaType}/${mediaId}?api_key=${apiKey}&language=en-US`;
    const trailerUrl = `https://api.themoviedb.org/3/${mediaType}/${mediaId}/videos?api_key=${apiKey}&language=en-US`;
    const castUrl = `https://api.themoviedb.org/3/${mediaType}/${mediaId}/credits?api_key=${apiKey}&language=en-US`;

    try{
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();

        const trailerResponse = await fetch(trailerUrl);
        const trailerData = await trailerResponse.json();

        const castResponse = await fetch(castUrl);
        const castData = await castResponse.json();


        document.getElementById("modalTitle").innerText = detailsData.title || detailsData.name;
        document.getElementById("modalOverview").innerText = detailsData.overview || "No overview available.";
        document.getElementById("releaseDate").innerText = `Release Date: ${detailsData.release_date || detailsData.first_air_date}`;
        document.getElementById("countdown").innerText = `Countdown: ${getCountdown(detailsData.release_date || detailsData.first_air_date)}`;
        document.getElementById("genres").innerText = "Genres: " + detailsData.genres.map(genre => genre.name).join(", ");
        document.getElementById("cast").innerText = "Cast: " + castData.cast.slice(0, 5).map(actor => actor.name).join(", ");

        setInterval(() => {
            document.querySelectorAll(".countdown").forEach(element => {
                const releaseDate = element.getAttribute("data-release");
                element.innterText = getCountdown(releaseDate);
            });
        }, 60000); //Updates every 60 seconds

        if (trailerData.results.length>0) {
            document.getElementById("trailerContainer").innerHTML = `
                <iframe width="100%" height="250" src="https://www.youtube.com/embed/${trailerData.results[0].key}" frameborder="0" allowfullscreen></iframe>
            `;
        } else {
            document.getElementById("trailerContainer").innerHTML = "<p>(Trailer Unavailable)</p>";
        }

        document.getElementById("mediaModal").style.display = "block";

    } catch(error){
        console.error("Error fetching media details:", error);
    }
}

function getCountdown(releaseDate) {
    const releaseTime = new Date(releaseDate).getTime();
    const now = new Date().getTime();
    const timeDiff = releaseTime - now;

    if (timeDiff <= 0){
        return "Movie is in theaters now!!"
    }

    const days = Math.floor(timeDiff / (1000*60*60*24));
    const hours = Math.floor((timeDiff % (1000*60*60*24)) / (1000*60*60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000*60));

    return `${days}d ${hours}h ${minutes}m left until release ⏳`;

}
function closeModal(){
    document.getElementById("mediaModal").style.display = "none";
}

