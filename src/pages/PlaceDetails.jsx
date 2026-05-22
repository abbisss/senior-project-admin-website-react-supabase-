import { useState, useEffect, useContext, } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabase-client";
import { UserContext } from "../contexts/UserContext";
import { IoArrowBack } from "react-icons/io5";
import EditPlaceForm from "../components/EditPlace";
import MapViewer from "../components/MapViewer";
import { toast } from "react-toastify";

function PlaceDetails() {
    const { dbUser } = useContext(UserContext);
    const { id } = useParams(); // Get the place ID from the URL parameters
    const [place, setPlace] = useState(null);
    const [loading, setLoading] = useState(true);

    const [imagesUrls, setImagesUrls] = useState([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const [isFavorite, setIsFavorite] = useState(false);

    const [editOpen, setEditOpen] = useState(false);

    const [ratingData, setRatingData] = useState(null);
    const [personalRating, setPersonalRating] = useState(1);
    const [reviewText, setReviewText] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviewExists, setReviewExists] = useState(false);
    const [peopleReviews, setPeopleReviews] = useState([])

    useEffect(() => {
        async function load() {
            const data = await getPlaceRatingData();
            setRatingData(data);
        }
        load();
        checkIsFavorite();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function fetchPlaceDetails() {
        if (!id) return;
        const { data, error } = await supabase.from('Place').select('*, Place_Image (url), User:created_by(name)')
            .eq('place_id', id).single();
        if (error) {
            console.error("Error fetching place details:", error);
            return;
        } else {
            setPlace(data);
            setLoading(false);
        }
    }

    async function checkIsFavorite() {
        const user_id = dbUser.user_id;

        const { data, error } = await supabase.from("Favorite_Place").select("*")
            .eq("user_id", user_id)
            .eq("place_id", id).maybeSingle();

        if (error) {
            console.error("Error checking favorite status:", error);
            return
        }
        setIsFavorite(!!data); // If data exists, it's a favorite, otherwise it's not
    }

    async function toggleFavorite() {
        const user_id = dbUser.user_id;
        if (isFavorite) {
            const { error } = await supabase.from("Favorite_Place").delete()
                .eq("user_id", user_id)
                .eq("place_id", id);
            if (error) {
                console.error("Error removing from favorites:", error);
                return;
            }
            setIsFavorite(false);
        } else {
            const { error } = await supabase.from("Favorite_Place").insert({ user_id: user_id, place_id: id });
            if (error) {
                console.error("Error adding to favorites:", error);
                return;
            }
            setIsFavorite(true);
        }
    }

    async function deletePlace() {
        if (!window.confirm("Are you sure you want to delete this place? This action cannot be undone.")) {
            return;
        }

        // get images first
        const { data, error: fetchError } = await supabase
            .from("Place_Image")
            .select("url")
            .eq("place_id", id);

        if (fetchError) {
            console.error(fetchError);
            return;
        }

        const paths = (data || []).map(img => {
            return decodeURIComponent(
                img.url.split("/storage/v1/object/public/places/")[1]
            );
        });

        // 2. delete storage files
        const { error: storageError } = await supabase.storage
            .from("places")
            .remove(paths);

        if (storageError) {
            console.error("Storage delete failed:", storageError);
            return;
        }

        // 3. delete DB AFTER
        const { error } = await supabase.rpc("delete_place", {
            p_id: id,
        });

        if (error) {
            console.error("DB delete failed:", error);
            return;
        }
        window.history.back();
    }

    async function getPlaceRatingData() {
        const { data, error } = await supabase.from("Place_Review").select("rating")
            .eq("place_id", id);

        if (error) {
            console.error("Error fetching ratings:", error);
            return null;
        }
        const reviews = data;
        const total = reviews.length;
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0); //Adds all values into one result
        const average = total ? sum / total : 0;

        const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }; //Initialize counts for each rating
        reviews.forEach(r => {
            counts[r.rating]++; //Increment the count for the corresponding rating
        });

        return { average, total, counts };
    }

    async function checkPersonalReview() {
        const { data, error } = await supabase
            .from("Place_Review")
            .select("*")
            .eq("place_id", id)
            .eq("user_id", dbUser.user_id)
            .limit(1).maybeSingle()

        if (error) {
            console.log("error fetching personal rating", error);
            return;
        }

        if (!data) {
            setReviewExists(false);
            setPersonalRating(1);
            setReviewText("");
            return
        }

        setReviewExists(true);
        setPersonalRating(data.rating);
        setReviewText(data.comment);
    }

    async function handlePersonalReview() {
        if (submittingReview) return;
        setSubmittingReview(true);
        if (reviewExists) {
            const { error } = await supabase
                .from("Place_Review")
                .update({
                    rating: personalRating,
                    comment: reviewText
                })
                .eq("user_id", dbUser.user_id)
                .eq("place_id", id);

            if (error) console.log("error updating review", error);
            await checkPersonalReview();
            await getUsersReviews();
            const data = await getPlaceRatingData();
            setRatingData(data);
            setSubmittingReview(false);
            toast.info("Rating updated successfully!");
            return;
        }

        const { error } = await supabase
            .from("Place_Review")
            .insert({
                rating: personalRating,
                comment: reviewText,
                user_id: dbUser.user_id,
                place_id: id
            });

        await checkPersonalReview();
        await getUsersReviews();
        const data = await getPlaceRatingData();
        setRatingData(data);
        setSubmittingReview(false);
        toast.info("Rating added successfully!");
        if (error) console.log("error inserting review", error);
    }

    async function handleDeleteReview() {
        const { error } = await supabase
            .from("Place_Review")
            .delete()
            .eq("user_id", dbUser.user_id)
            .eq("place_id", id);

        if (error) {
            console.log("error deleting the rating:", error);
            return;
        }

        if (!reviewExists) {
            toast.error("You must have a rating to delete it!")
            return
        }

        setReviewExists(false);
        toast.info("Review deleted successfully!");
        setPersonalRating(1);
        setReviewText("");

        await checkPersonalReview();
        await getUsersReviews();
        const data = await getPlaceRatingData();
        setRatingData(data);
    }

    async function getUsersReviews() {
        const { data, error } = await supabase
            .from("Place_Review")
            .select(`
                    review_id,
                    rating,
                    comment,
                    created_at,
                    User (
                    name,
                    profile_pic
                    )
                `)
            .eq("place_id", id);

        setPeopleReviews(data);
        if (error) {
            console.log("error getting personal reviews" + error);
            return []
        }
    }

    async function deleteUserReview(reviewId) {
        const { error } = await supabase
            .from("Place_Review")
            .delete()
            .eq("review_id", reviewId);

        if (error) {
            console.log("error deleting review:", error);
            toast.error("Failed to delete review");
            return;
        }

        toast.success("Review deleted");

        await checkPersonalReview();
        const data = await getPlaceRatingData();
        setRatingData(data);

        const reviews = await getUsersReviews();
        setPeopleReviews(reviews);
    }

    useEffect(() => {
        fetchPlaceDetails();
        checkIsFavorite();
        checkPersonalReview();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dbUser?.user_id, id]);

    useEffect(() => {
        if (place && place.Place_Image) {
            const urls = place.Place_Image.map(image => image.url);
            setImagesUrls(urls);
        }
    }, [place]);

    useEffect(() => {
        checkIsFavorite();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dbUser?.user_id, id]);

    useEffect(() => {
        getUsersReviews();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, peopleReviews])


    return (
        <>
            <button className="btn btn-accent text-white fw-bold position-fixed top-0 start-0 z-3 my-mt rounded-pill"
                onClick={() => window.history.back()}>
                <IoArrowBack /> Back to places
            </button>
            <div className="place-details-page">
                {loading ? (
                    <div className="d-flex flex-column justify-content-center align-items-center mt-5 mb-5">
                        <div className="spinner"></div>
                        <p>Loading Place Details...</p>
                    </div>) : (
                    <div>
                        <div className="place-images-container">
                            <span className="position-absolute rounded-pill 
                    top-0 end-0 px-2 bg-glass text-black bg-opacity-50 mt-1 me-1">
                                {currentImageIndex + 1} / {imagesUrls.length}</span>
                            <button
                                onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? imagesUrls.length - 1 : prev - 1))}
                                className={`place-images-switcher-btn-left place-images-switcher-btn
                        ${imagesUrls.length <= 1 ? "d-none" : ""}`}
                            >
                                ❮
                            </button>
                            <img src={imagesUrls[currentImageIndex]} alt="place images"
                                className="place-images" />
                            <button
                                onClick={() => setCurrentImageIndex((prev) => (prev === imagesUrls.length - 1 ? 0 : prev + 1))}
                                className={`place-images-switcher-btn-right place-images-switcher-btn 
                         ${imagesUrls.length <= 1 ? "d-none" : ""}`}
                            >
                                ❯
                            </button>
                        </div>

                        <h2 className="mt-2">{place.name}</h2>

                        <div>
                            <span className="badge bg-success me-2 fs-6">
                                {place.type.toString().charAt(0).toUpperCase() + place.type.toString().slice(1)}
                            </span>
                            <span className={`badge ${place.difficulty === 'easy' ? 'difficulty-easy'
                                : place.difficulty === 'medium' ? 'difficulty-medium' : 'difficulty-hard'} me-2 fs-6`}>
                                {place.difficulty.toString().charAt(0).toUpperCase() + place.difficulty.toString().slice(1)}
                            </span>
                            <span className="text-muted fs-6"><span className="bi bi-geo-alt"> </span>{place.town}, {place.governorate} Governorate</span>
                        </div>
                        <span className="mt-2 badge text-muted bg-info">Created by {place.User?.name || "Unknown"}</span>

                        <div className="mt-3 d-flex justify-content-space-between gap-2 mt-4">
                            <button className={`btn ${isFavorite ? "btn-danger" : "btn-outline-success"}
                                               me-2 p-2 place-fav-btn`}
                                onClick={toggleFavorite}>
                                <span className={isFavorite ? "" : "text-danger"}>♥</span>
                                {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                            </button>
                            <div className="d-flex justify-content-center w-75 gap-2">
                                <button className="btn btn-accent text-white w-50 " onClick={() => setEditOpen(!editOpen)}>
                                    Edit Place</button>
                                <button className="btn btn-red text-white w-50 "
                                    onClick={deletePlace}
                                >
                                    Delete Place</button>
                            </div>

                            {editOpen && (<EditPlaceForm place={place} onClose={() => setEditOpen(false)} />)}
                        </div>

                        <div className="container ratings-card bg-primary bg-opacity-10 py-3 mt-4">
                            {!ratingData ? (
                                <p>Loading...</p>
                            ) : (
                                <div className="row d-flex justify-content-between gap-4">

                                    {/* Average */}
                                    <div className="col-4 text-center">
                                        <h2 className="fw-bold mb-1">
                                            {ratingData.average ? ratingData.average.toFixed(1) : "0.0"}
                                        </h2>

                                        <div className="fs-4 text-warning mb-1">
                                            {Array.from({ length: 5 }, (_, i) => {
                                                const value = ratingData.average || 0;

                                                if (value >= i + 1) {
                                                    return <i key={i} className="bi bi-star-fill"></i>;
                                                } else if (value >= i + 0.5) {
                                                    return <i key={i} className="bi bi-star-half"></i>;
                                                } else {
                                                    return <i key={i} className="bi bi-star"></i>;
                                                }
                                            })}
                                        </div>

                                        <p className="text-muted mb-0">
                                            {ratingData.total || 0} ratings
                                        </p>
                                    </div>

                                    {/* Details */}
                                    {/* For each star rating, show the count and a progress bar */}
                                    <div className="col-4">
                                        {[5, 4, 3, 2, 1].map(star => {
                                            const count = ratingData.counts[star];
                                            const percent = ratingData.total
                                                ? (count / ratingData.total) * 100
                                                : 0;

                                            return (
                                                <div key={star} className="d-flex align-items-center mb-1">
                                                    <span className="me-2">{star}★</span>

                                                    <div className="progress flex-grow-1 me-2" style={{ height: "6px" }}>
                                                        <div
                                                            className="progress-bar bg-warning"
                                                            style={{ width: `${percent}%` }}
                                                        ></div>
                                                    </div>

                                                    <span className="small text-muted">{count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="container mt-4 font-">
                            <h4 className="text-muted">ABOUT THE PLACE</h4>
                            <p className="fs-6">{place.description}</p>
                        </div>

                        <div className="container mt-4 bg-danger bg-opacity-10 py-3">
                            <h4 className="text-muted">SAFETY TIPS</h4>
                            <h5 className="text-muted fst-italic fs-6">{"(AI MAY BE USED TO REFINE TIPS)"}</h5>
                            <div className="fs-6">{place.safety_tips?.split(".").filter(Boolean).map((sentence, i) => (
                                <p key={i}> {sentence.trim()}.</p>
                            )) || "No safety tips available."}</div>
                        </div>


                        <div className="container mt-4">
                            <h4 className="text-muted">LOCATION</h4>
                            <p className="text-muted fst-italic">Click the map to view on Google Maps</p>
                            <MapViewer place={place} />
                        </div>

                        <hr className="mt-5" />
                        <p className="text-muted">LEAVE A RATING</p>
                        <div className="border border-muted border-2 rounded p-3 d-flex flex-column ">
                            <p className="fw-light">Rate this place</p>
                            <div className="d-flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <span
                                        key={star}
                                        onClick={() => setPersonalRating(star)}
                                        style={{
                                            cursor: "pointer",
                                            fontSize: "24px",
                                            color: star <= personalRating ? "gold" : "gray"
                                        }}>
                                        ★
                                    </span>
                                ))}
                            </div>

                            <textarea placeholder="Share your thoughts,tips or anything took your attention..."
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                                className="form-control form-control-sm bg-glass bg-opacity-10 mt-3" rows="3"
                            ></textarea>
                        </div>

                        <div className="d-flex gap-2 mt-3">
                            <button className="btn btn-light-primary text-white"
                                onClick={handlePersonalReview}
                                disabled={submittingReview}
                            >
                                {reviewExists ? "Update Review" : "Submit Review"}
                            </button>

                            <button className="btn btn-red text-white ms-3 h-25 "
                                onClick={handleDeleteReview}>
                                Delete Review
                            </button>
                        </div>

                        {submittingReview && (
                            <div className=" d-flex flex-column justify-content-center gap-2 mt-3">
                                <span className="spinner ms-5"></span>
                                <p className="ms-3">Submitting review</p>
                            </div>
                        )}

                        <hr className="mt-4" />

                        <p className="text-muted">{ratingData?.total} Ratings & Reviews </p>

                        {peopleReviews && peopleReviews.length > 0 ? (
                            peopleReviews.map((userReview) => (
                                <div
                                    className="border rounded p-3 bg-light mb-3"
                                    key={userReview.review_id}
                                >
                                    <div className="d-flex justify-content-between align-items-start">

                                        <div className="d-flex align-items-center gap-2">

                                            <img
                                                src={userReview.User?.profile_pic}
                                                alt="user profile pic"
                                                className="rounded-circle"
                                                style={{
                                                    width: "45px",
                                                    height: "45px",
                                                    objectFit: "cover"
                                                }}
                                            />

                                            <div className="d-flex flex-column">
                                                <p className="mb-0 fw-semibold">
                                                    {userReview.User?.name}
                                                </p>

                                                <small className="text-muted">
                                                    {new Date(userReview.created_at).toLocaleDateString()}
                                                </small>
                                            </div>
                                        </div>

                                        <div className="text-warning fs-5">
                                            {Array.from({ length: 5 }, (_, i) => {
                                                const rating = userReview.rating || 0;

                                                if (rating >= i + 1) {
                                                    return <i key={i} className="bi bi-star-fill"></i>;
                                                } else if (rating > i) {
                                                    return <i key={i} className="bi bi-star-half"></i>;
                                                } else {
                                                    return <i key={i} className="bi bi-star"></i>;
                                                }
                                            })}
                                        </div>
                                    </div>

                                    <div className="d-flex justify-content-between align-items-end">

                                        <p className="mt-2 mb-0 text-secondary flex-grow-1 me-3">
                                            {userReview.comment}
                                        </p>

                                        <button className="btn btn-danger btn-sm" onClick={() => {
                                            window.confirm("Are you sure you want to delete this review?")
                                                && deleteUserReview(userReview.review_id)
                                        }}>
                                            delete
                                        </button>

                                    </div>

                                </div>
                            ))
                        ) : (
                            <p className="text-muted">No reviews yet.</p>
                        )}
                    </div>
                )}
            </div></>)
}
export default PlaceDetails;