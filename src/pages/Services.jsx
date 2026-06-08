import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabase-client";
import ServiceCard from "../components/ServiceCard";
import AddService from "../components/AddService";
import { Link } from "react-router-dom";
import { Tooltip } from "bootstrap";

const LIMIT = 12;

const serviceTypes = [
    { value: "all", label: "All 🌍" },
    { value: "restaurant", label: "Restaurant 🍽️" },
    { value: "cafe", label: "Cafe ☕" },
    { value: "hotel", label: "Hotel 🏨" },
    { value: "campsite", label: "Campsite ⛺" },
    { value: "guesthouse", label: "Guesthouse 🏡" },
    { value: "chalet_rent", label: "Chalet Rent 🏠" },
    { value: "resort", label: "Resort 🌴" },
    { value: "activity", label: "Activity 🏄" },
    { value: "tour_guide", label: "Tour Guide 🧭" },
    { value: "transport", label: "Transport 🚗" },
    { value: "rental", label: "Rental 🎒" },
    { value: "shop", label: "Shop 🛍️" },
    { value: "supermarket", label: "Supermarket 🛒" },
    { value: "parking", label: "Parking 🅿️" },
    { value: "other", label: "Other 📌" },
    { value: "rest_area", label: "Rest Area 🛋️" },
];

const priceRanges = [
    { value: "all", label: "All 💰" },
    { value: "cheap", label: " Cheap" },
    { value: "budget", label: "Budget" },
    { value: "moderate", label: "Moderate" },
    { value: "expensive", label: "Expensive" },
    { value: "luxury", label: "Luxury" },
];

const pricingTypes = [
    { value: "all", label: "All 🏷️" },
    { value: "free", label: "Free" },
    { value: "per_item", label: "Per Item" },
    { value: "per_person", label: "Per Person" },
    { value: "per_night", label: "Per Night" },
    { value: "entry_fee", label: "Entry Fee" },
];

function Services() {
    const [selectedServiceType, setSelectedServiceType] = useState("all");
    const [selectedPriceRange, setSelectedPriceRange] = useState("all");
    const [selectedPricingType, setSelectedPricingType] = useState("all");
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchName, setSearchName] = useState("");
    const [addServiceStatus, setAddServiceStatus] = useState(false);
    const [serviceAdded, setServiceAdded] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const pageRef = useRef(0);
    const hasMoreRef = useRef(true);
    const loadingRef = useRef(false);

    async function fetchServices(type, priceRange, pricingType, name, pageNum, reset = false) {
        if (loadingRef.current) return;
        setLoading(true);
        loadingRef.current = true;

        let query = supabase
            .from("Service")
            .select(`*, Service_Image (url)`)
            .eq("status", "approved")
            .range(pageNum * LIMIT, (pageNum + 1) * LIMIT - 1);

        if (type !== "all") query = query.eq("type", type);
        if (priceRange !== "all") query = query.eq("price_range", priceRange);
        if (pricingType !== "all") query = query.eq("pricing_type", pricingType);
        if (name.trim() !== "") {
            query = query.or(`name.ilike.%${name.trim()}%,town.ilike.%${name.trim()}%,governorate.ilike.%${name.trim()}%`);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Fetch services error:", error);
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

        setServices(prev => reset ? data : [...prev, ...data]);
        setLoading(false);
        loadingRef.current = false;
    }

    useEffect(() => {
        pageRef.current = 0;
        hasMoreRef.current = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHasMore(true);
        fetchServices(selectedServiceType, selectedPriceRange, selectedPricingType, searchName, 0, true);
    }, [selectedServiceType, selectedPriceRange, selectedPricingType, searchName, serviceAdded]);

    // Infinite scroll
    useEffect(() => {
        const handleScroll = () => {
            if (
                window.innerHeight + window.scrollY >= document.body.offsetHeight - 300 &&
                hasMoreRef.current && //user is 300px from bottom
                !loadingRef.current
            ) {
                const nextPage = pageRef.current + 1;
                pageRef.current = nextPage;
                fetchServices(selectedServiceType, selectedPriceRange, selectedPricingType, searchName, nextPage, false);
            }
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll); //cleanup

    }, [selectedServiceType, selectedPriceRange, selectedPricingType, searchName]);

    useEffect(() => {
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(el => new Tooltip(el));
    }, []);

    return (
        <div className="container places">
            <div className="d-flex justify-content-center gap-3 m-3">
                <div className="searchbar-place">
                    <input
                        type="text"
                        placeholder="Search services by name, town or governorate..."
                        data-bs-toggle="tooltip"
                        data-bs-title="Search services by name, town or governorate..."
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                    />
                </div>

                <div className="d-flex gap-2">
                    <button
                        className="btn place-btn rounded-pill d-flex flex-column align-items-center justify-content-center px-3 py-2"
                        onClick={() => setAddServiceStatus(!addServiceStatus)}
                    >
                        <span className="fs-5 lh-1 text-muted">➕</span>
                        <span className="small mt-1 text-muted fw-bold">Add Service</span>
                    </button>

                    <Link to="/favorite-services" className="navbar-brand">
                        <button className="btn place-btn rounded-pill d-flex flex-column align-items-center justify-content-center px-3 py-2">
                            <span className="fs-5 lh-1 text-muted">❤️</span>
                            <span className="small mt-1 text-muted fw-bold">See favorites</span>
                        </button>
                    </Link>
                </div>
            </div>

            {addServiceStatus && (
                <AddService
                    addServiceStatus={addServiceStatus}
                    setAddServiceStatus={setAddServiceStatus}
                    setServiceAdded={setServiceAdded}
                />
            )}

            <div className="container places-type-buttons">
                {serviceTypes.map((type) => (
                    <button
                        key={type.value}
                        className={`place-type-btn ${selectedServiceType === type.value ? "selected-place-type" : ""}`}
                        onClick={() => setSelectedServiceType(type.value)}
                    >
                        {type.label}
                    </button>
                ))}
            </div>

            <p className="difficulty-title text-center">Price Range</p>
            <div className="container places-type-buttons mt-2">
                {priceRanges.map((range) => (
                    <button
                        key={range.value}
                        className={`place-type-btn ${selectedPriceRange === range.value ? "selected-place-type" : ""}`}
                        onClick={() => setSelectedPriceRange(range.value)}
                    >
                        {range.label}
                    </button>
                ))}
            </div>

            <div className="difficulty-filter">
                <p className="difficulty-title">Pricing Type</p>
                <div className="d-flex flex-wrap gap-2 justify-content-center mt-2">
                    {pricingTypes.map((pt) => (
                        <button
                            key={pt.value}
                            className={`place-type-btn ${selectedPricingType === pt.value ? "selected-place-type" : ""}`}
                            onClick={() => setSelectedPricingType(pt.value)}
                        >
                            {pt.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="row g-4">
                {services.map((service) => (
                    <div key={service.service_id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                        <ServiceCard service={service} />
                    </div>
                ))}

                {loading && (
                    <div className="loading">
                        <div className="spinner"></div>
                        <p>Loading services...</p>
                    </div>
                )}

                {services.length === 0 && !loading && (
                    <div className="col-12">
                        <br /><br />
                        <p className="text-center">No services found for the selected filters.</p>
                    </div>
                )}

                {!hasMore && services.length > 0 && (
                    <div className="col-12 text-center text-muted pb-4">
                        <small>All services loaded</small>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Services;