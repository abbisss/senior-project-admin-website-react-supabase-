import { useEffect, useState, useContext } from "react";
import { supabase } from "../supabase-client";
import { UserContext } from "../contexts/UserContext";
import { Link } from "react-router-dom";

function PlaceCard({ place, onUnFavorite }) {
    const [rating, setRating] = useState(null);
    const [isFav, setIsFav] = useState(false);
    const { dbUser } = useContext(UserContext);

    async function getPlaceAverageRating(placeId) {
        const { data, error } = await supabase
            .from("Place_Review")
            .select("rating")
            .eq("place_id", placeId);

        if (error) {
            console.error("Rating fetch error:", error);
            return null;
        }

        if (!data || data.length === 0) {
            return null; // no reviews yet
        }

        const sum = data.reduce((acc, review) => acc + review.rating, 0);
        const avg = sum / data.length;

        return avg.toFixed(1);
    }

    async function getFavorite() {
        const { data, error } = await supabase
            .from("Favorite_Place")
            .select("*")
            .eq("user_id", dbUser.user_id)
            .eq("place_id", place.place_id)
            ;
        if (error) {
            console.error("error getting favorite:", error);
            return
        }

        if (!data || data.length === 0) {
            setIsFav(false);
        } else {
            setIsFav(true)
        }
    }

    async function handleFavoriteChange() {
        if (isFav) {
            //remove if exists
            const { error } = await supabase
                .from("Favorite_Place")
                .delete()
                .eq("user_id", dbUser.user_id)
                .eq("place_id", place.place_id);

            if (error) {
                console.error("error removing favorite:", error);
                return;
            }
            setIsFav(false);
            removeFavorite() 

        } else {
            // add if not exists
            const { error } = await supabase
                .from("Favorite_Place")
                .insert([
                    {
                        user_id: dbUser.user_id,
                        place_id: place.place_id,
                    },
                ]);

            if (error) {
                console.error("error adding favorite:", error);
                return;
            }
            setIsFav(true);
        }
    }
    
    //for favorites page
    async function removeFavorite() {
        const { error } = await supabase
            .from("Favorite_Place")
            .delete()
            .eq("user_id", dbUser.user_id)
            .eq("place_id", place.place_id);

        if (!error) {
            onUnFavorite(place.place_id);
        }
    }
    useEffect(() => {
        const fetchRating = async () => {
            const avg = await getPlaceAverageRating(place.place_id);
            setRating(avg);
        };

        fetchRating();
    }, [place.place_id]);

    useEffect(() => {
        const fetchFavs = async () => {
            await getFavorite();
        };

        fetchFavs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [place.place_id, dbUser.user_id]);


    return (
        <div className="d-flex flex-column text-center place-card position-relative"> 
    
            <div
                className={`position-absolute top-0 end-0 m-2 z-3 rounded-pill 
                d-flex align-items-center justify-content-center favorite-heart 
                ${isFav ? "favorite-heart-active" : ""}`}
                onClick={() => { handleFavoriteChange(), setIsFav(!isFav)}}
            >
                ♥
            </div>
            <div className="place-image-container">
                <img src={place.Place_Image[0]?.url} alt={place.name} className="place-image" />
            </div>
            <Link to={`/places/${place.place_id}`} className="text-decoration-none text-reset">
            <div className="place-info mt-2">
                <h3 className="place-name">{place.name}</h3>
                <div className="d-flex justify-content-center gap-3">
                    <span className={`place-difficulty ${place.difficulty === "easy"
                        ? "bg-success"
                        : place.difficulty === "medium"
                            ? "bg-warning text-dark"
                            : "bg-danger"
                        }`}>
                        {place.difficulty}
                    </span>
                    <span className="fs-3 rounded-pill bg-success-subtle d-flex 
                    justify-content-center align-items-center px-1 ms-auto">
                        ⭐
                        <span className="fs-6">
                            {rating === null ? ("no yet") : (rating)}
                        </span>
                    </span>
                </div>

                <p className="place-desc">
                    {place.description}
                </p>
            </div>
  
        </Link>
         </div>
    )
}
export default PlaceCard;