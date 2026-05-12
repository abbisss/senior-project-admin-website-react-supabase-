import { useEffect, useState } from "react";
import { supabase } from "../supabase-client";
import PlaceCard from "../components/PlaceCard";

function FavoritePlaces() {
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(false);

    async function fetchFavoritePlaces() {
        setLoading(true);

        const { data, error } = await supabase
            .from("Favorite_Place")
            .select(`
                place:Place (
                    *,
                    Place_Image (url)
                )
            `);

        if (error) {
            console.error("Fetch favorites error:", error);
            setLoading(false);
            return;
        }

        const places = data?.map(fav => fav.place) || [];

        setFavorites(places);
        setLoading(false);
    }

    function handleUnfavorite(placeId) {
        setFavorites(prev =>
            prev.filter(place => place.place_id !== placeId)
        );
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchFavoritePlaces();
    }, []);

    return (
        <div className="container places">
            <div className="d-flex align-items-center justify-content-between my-3">
                <button
                    className="btn btn-primary rounded-pill"
                    onClick={() => window.history.back()}
                >
                    ← Back
                </button>

                <h2 className="m-0 text-center flex-grow-1">
                    My Favorite Places ❤️
                </h2>

                <div style={{ width: "80px" }}></div>
            </div>

            <div className="row g-4" >

                {favorites.map((place) => (
                    <div key={place.place_id} className="col-12 col-sm-6 col-md-4 col-lg-3" onClick={() => { fetchFavoritePlaces() }}>
                        <PlaceCard place={place}
                        onUnFavorite={handleUnfavorite}
                        />
                    </div>
                ))}

                {loading && (
                    <div className="loading">
                        <div className="spinner"></div>
                        <p>Loading favorites...</p>
                    </div>
                )}

                {favorites.length === 0 && !loading && (
                    <div className="col-12 text-center">
                        <br /><br />
                        <p>No favorite places yet ❤️</p>
                    </div>
                )}

            </div>
        </div>
    );
}

export default FavoritePlaces;