import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabase-client";
import PlaceCard from "../components/PlaceCard";
import AddPlace from "../components/AddPlace";
import { Link } from "react-router-dom";
import { Tooltip } from "bootstrap";

const LIMIT = 12;

const placeTypes = [
    { value: "all", label: "All 🌍" },
    { value: "river", label: "River 🚣" },
    { value: "mountain", label: "Mountain ⛰️" },
    { value: "forest", label: "Forest 🌲" },
    { value: "lake", label: "Lake 🌊" },
    { value: "beach", label: "Beach 🏖️" },
    { value: "waterfall", label: "Waterfall 💧" },
    { value: "cave", label: "Cave 🕳️" },
    { value: "valley", label: "Valley 🏞️" },
    { value: "hill", label: "Hill 🌄" },
    { value: "park", label: "Park 🌳" },
    { value: "historical", label: "Historical 🏛️" },
    { value: "religious", label: "Religious ⛪" },
];


function Places() {
    const [selectedPlaceType, setSelectedPlaceType] = useState("all");
    const [difficulty, setDifficulty] = useState(0);
    const [places, setPlaces] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchName, setSearchName] = useState("");
    const [addPlaceStatus, setAddPlaceStatus] = useState(false);
    const difficultyLevels = ["no choice", "easy", "medium", "hard"];
    const [placeAdded, setPlaceAdded] = useState(false);

    const [hasMore, setHasMore] = useState(true);
    const pageRef = useRef(0);
    const hasMoreRef = useRef(true);
    const loadingRef = useRef(false);

    async function fetchPlaces (type, difficulty, name, pageNum, reset = false) {
        if (loadingRef.current) return;
        setLoading(true);
        loadingRef.current = true;

        let query = supabase
            .from("Place")
            .select(`*, Place_Image (url)`)
            .eq("status", "approved")
            .range(pageNum * LIMIT, (pageNum + 1) * LIMIT - 1);

        if (type && type !== "all") query = query.eq("type", type);
        if (difficulty !== 0)
            query = query.eq("difficulty", difficultyLevels[difficulty]);
        if (name && name.trim() !== "")
            query = query.or(`name.ilike.%${name.trim()}%,town.ilike.%${name.trim()}%,governorate.ilike.%${name.trim()}%`);

        const { data, error } = await query;

        if (error) {
            console.error("Fetch places error:", error);
            setLoading(false);
            loadingRef.current = false;
            return;
        }

        if (data.length < LIMIT) {
            setHasMore(false);
            hasMoreRef.current = false;
        } else {
            setHasMore(true);
            hasMoreRef.current = true;
        }

        setPlaces(prev => reset ? data : [...prev, ...data]);
        setLoading(false);
        loadingRef.current = false;
    };

    // Reset on filter change
    useEffect(() => {
        pageRef.current = 0;
        hasMoreRef.current = true;
        setHasMore(true);
        fetchPlaces(selectedPlaceType, difficulty, searchName, 0, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPlaceType, difficulty, searchName, placeAdded]);

    useEffect(() => {
        const handleScroll = () => {
            if (
                window.innerHeight + window.scrollY >= document.body.offsetHeight - 300 &&
                hasMoreRef.current &&
                !loadingRef.current
            ) {
                const nextPage = pageRef.current + 1;
                pageRef.current = nextPage;
                fetchPlaces(selectedPlaceType, difficulty, searchName, nextPage, false);
            }
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPlaceType, difficulty, searchName]);

    useEffect(() => {
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(el => new Tooltip(el));
    }, []);

    return (
        <div className="container places">
            <div className="d-flex justify-content-center gap-3 m-3 col-12">
                <div className="searchbar-place">
                    <input
                        type="text"
                        placeholder="Search places by name, town or governorate..."
                        data-bs-toggle="tooltip"
                        data-bs-title="Search places by name, town or governorate..."
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                    />
                </div>
                <div className="d-flex gap-2">
                    <button
                        className="btn place-btn rounded-pill d-flex flex-column align-items-center justify-content-center px-3 py-2"
                        onClick={() => setAddPlaceStatus(!addPlaceStatus)}>
                        <span className="fs-5 lh-1 text-muted">➕</span>
                        <span className="small mt-1 text-muted fw-bold">Add Place</span>
                    </button>
                    <Link to="/favorite-places" className="navbar-brand">
                        <button className="btn place-btn rounded-pill d-flex flex-column align-items-center justify-content-center px-3 py-2">
                            <span className="fs-5 lh-1 text-muted">❤️</span>
                            <span className="small mt-1 text-muted fw-bold">See favorites</span>
                        </button>
                    </Link>
                </div>
            </div>

            {addPlaceStatus && <AddPlace addPlaceStatus={addPlaceStatus} setAddPlaceStatus={setAddPlaceStatus} setPlaceAdded={setPlaceAdded} />}

            <div className="container places-type-buttons">
                {placeTypes.map((type) => (
                    <button
                        key={type.value}
                        className={`place-type-btn ${selectedPlaceType === type.value ? "selected-place-type" : ""}`}
                        onClick={() => setSelectedPlaceType(type.value)}
                    >
                        {type.label}
                    </button>
                ))}
            </div>

            <div className="difficulty-filter">
                <p className="difficulty-title">Difficulty</p>
                <input
                    type="range"
                    min="0"
                    max="3"
                    step="1"
                    value={difficulty}
                    onChange={(e) => setDifficulty(Number(e.target.value))}
                    className="difficulty-slider"
                />
                <div className="slider-labels">
                    <span className={difficulty === 0 ? "active" : ""}>No choice</span>
                    <span className={difficulty === 1 ? "active" : ""}>Easy</span>
                    <span className={difficulty === 2 ? "active" : ""}>Medium</span>
                    <span className={difficulty === 3 ? "active" : ""}>Hard</span>
                </div>
            </div>

            <div className="row g-4">
                {places.map((place) => (
                    <div key={place.place_id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                        <PlaceCard place={place} />
                    </div>
                ))}
                {loading && (
                    <div className="loading">
                        <div className="spinner"></div>
                        <p>Loading places...</p>
                    </div>
                )}
                {places.length === 0 && !loading && (
                    <div className="col-12">
                        <br /><br />
                        <p className="text-center">No places found for the selected type.</p>
                    </div>
                )}
                {!hasMore && places.length > 0 && (
                    <div className="col-12 text-center text-muted pb-4">
                        <small>All places loaded</small>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Places;