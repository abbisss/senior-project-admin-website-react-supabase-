import { useEffect, useState, useContext } from "react";
import { supabase } from "../supabase-client";
import { UserContext } from "../contexts/UserContext";
import { Link } from "react-router-dom";

function ServiceCard({ service, onUnFavorite }) {
    const [rating, setRating] = useState(null);
    const [isFav, setIsFav] = useState(false);
    const { dbUser } = useContext(UserContext);

    async function getServiceAverageRating(serviceId) {
        const { data, error } = await supabase
            .from("Service_Review")
            .select("rating")
            .eq("service_id", serviceId);

        if (error) {
            console.error("Rating fetch error:", error);
            return null;
        }
        if (!data || data.length === 0) return null;
        const sum = data.reduce((acc, review) => acc + review.rating, 0);
        return (sum / data.length).toFixed(1);
    }

    async function getFavorite() {
        const { data, error } = await supabase
            .from("Favorite_Service")
            .select("*")
            .eq("user_id", dbUser.user_id)
            .eq("service_id", service.service_id);

        if (error) {
            console.error("error getting favorite:", error);
            return;
        }
        setIsFav(data && data.length > 0);
    }

    async function handleFavoriteChange() {
        if (isFav) {
            const { error } = await supabase
                .from("Favorite_Service")
                .delete()
                .eq("user_id", dbUser.user_id)
                .eq("service_id", service.service_id);
            if (error) {
                console.error("error removing favorite:", error);
                return;
            }
            setIsFav(false);
            if (onUnFavorite) onUnFavorite(service.service_id);
        } else {
            const { error } = await supabase
                .from("Favorite_Service")
                .insert([
                    {
                        user_id: dbUser.user_id,
                        service_id: service.service_id,
                    },
                ]);
            if (error) {
                console.error("error adding favorite:", error);
                return;
            }
            setIsFav(true);
        }
    }

    function getPriceBadgeClass(priceRange) {
        switch (priceRange) {
            case 'cheap':
                return 'bg-success text-white';
            case 'budget':
                return 'bg-warning text-dark';
            case 'moderate':
                return 'bg-info text-dark';
            case 'expensive':
                return 'bg-danger text-white';
            case 'luxury':
                return 'bg-dark text-white';
            default:
                return 'bg-secondary text-dark';
        }
    }

    useEffect(() => {
        const fetchRating = async () => {
            const avg = await getServiceAverageRating(service.service_id);
            setRating(avg);
        };
        fetchRating();
    }, [service.service_id]);

    useEffect(() => {
        const fetchFavs = async () => {
            await getFavorite();
        };
        fetchFavs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [service.service_id, dbUser.user_id]);

    return (
        <div className="d-flex flex-column text-center place-card position-relative">
            <div
                className={`position-absolute top-0 end-0 m-2 z-3 rounded-pill 
                d-flex align-items-center justify-content-center favorite-heart 
                ${isFav ? "favorite-heart-active" : ""}`}
                onClick={handleFavoriteChange}
            >
                ♥
            </div>
            <div className="place-image-container">
                <img
                    src={service.Service_Image[0]?.url}
                    alt={service.name}
                    className="place-image"
                />
            </div>
            <Link to={`/services/${service.service_id}`} className="text-decoration-none text-reset">
                <div className="place-info mt-2">
                    <h3 className="place-name">{service.name} {service.is_verified ? <i className="bi bi-patch-check-fill text-primary" data-bs-toggle="tooltip"
                        title="Verified service by owner"></i> : <i className="bi bi-patch-check" data-bs-toggle="tooltip"
                            title="The service was added by a user or admin, but the owner has not yet verified it"></i>}</h3>
                    <div className="d-flex justify-content-center gap-2 flex-wrap">
                        <span className="badge bg-secondary place-difficulty"
                        >{service.type}</span>
                        {service.price_range && (
                            <span className={`badge ${getPriceBadgeClass(service.price_range)} place-difficulty`}>{service.price_range}</span>
                        )}
                    </div>
                    <div className="d-flex justify-content-center gap-3 mt-1">
                        <span className="fs-3 rounded-pill bg-success-subtle d-flex 
                        justify-content-center align-items-center px-1">
                            ⭐
                            <span className="fs-6">
                                {rating === null ? "no yet" : rating}
                            </span>
                        </span>
                    </div>
                    <p className="place-desc">{service.description}</p>
                </div>
            </Link>
        </div>
    );
}
export default ServiceCard;