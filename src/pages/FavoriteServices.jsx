import { useEffect, useState } from "react";
import { supabase } from "../supabase-client";
import ServiceCard from "../components/ServiceCard";

function FavoriteServices() {
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(false);

    async function fetchFavoriteServices() {
        setLoading(true);
        const { data, error } = await supabase
            .from("Favorite_Service")
            .select(`
                service:Service (
                    *,
                    Service_Image (url)
                )
            `);
        if (error) {
            console.error("Fetch favorites error:", error);
            setLoading(false);
            return;
        }
        const services = data?.map(fav => fav.service) || [];
        setFavorites(services);
        setLoading(false);
    }

    function handleUnfavorite(serviceId) {
        setFavorites(prev => prev.filter(service => service.service_id !== serviceId));
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchFavoriteServices();
    }, []);

    return (
        <div className="container places">
            <div className="d-flex align-items-center justify-content-between my-3">
                <button className="btn btn-primary rounded-pill" onClick={() => window.history.back()}>
                    ← Back
                </button>
                <h2 className="m-0 text-center flex-grow-1">My Favorite Services ❤️</h2>
                <div style={{ width: "80px" }}></div>
            </div>

            <div className="row g-4">
                {favorites.map(service => (
                    <div key={service.service_id} className="col-12 col-sm-6 col-md-4 col-lg-3" onClick={() => fetchFavoriteServices()}>
                        <ServiceCard service={service} onUnFavorite={handleUnfavorite} />
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
                        <p>No favorite services yet ❤️</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default FavoriteServices;