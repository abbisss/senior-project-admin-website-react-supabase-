import { useEffect, useState} from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabase-client";
import ServiceCard from "../components/ServiceCard";
import { UserContext } from "../contexts/UserContext";

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
  { value: "rest_area", label: "Rest Area 🛋️" },
  { value: "other", label: "Other 📌" },
];

const priceRanges = [
  { value: "all", label: "All 💰" },
  { value: "cheap", label: "Cheap" },
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

function NearbyServices() {
  const { id } = useParams();                   
  const [placeName, setPlaceName] = useState("");
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchName, setSearchName] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedPriceRange, setSelectedPriceRange] = useState("all");
  const [selectedPricingType, setSelectedPricingType] = useState("all");
  const [isOpen, setIsOpen] = useState(false);

  const [filteredServices, setFilteredServices] = useState([]);

  const getPlaceName = async () => {
    const { data, error } = await supabase
      .from("Place")
      .select("name")
      .eq("place_id", id)
      .single();
    if (!error && data) setPlaceName(data.name);
  };

  const getPlaceServices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("Place_Service")
      .select(`
        distance_km,
        Service (*, Service_Image (*))
      `)
      .eq("place_id", id);

    if (!error && data) {
      const formatted = data.map((item) => ({
        ...item.Service,
        distance_km: item.distance_km || 0,
      }));
      setServices(formatted);
    } else {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    getPlaceName();
    getPlaceServices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isOpenNow = (str) => {
    if (typeof str !== "string") return false;
    const match = str.match(
      /^\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*[-–—]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*$/i
    );
    if (!match) return false;

    let openHour = parseInt(match[1], 10);
    const openMin = match[2] ? parseInt(match[2], 10) : 0;
    const openMer = match[3].toLowerCase();
    let closeHour = parseInt(match[4], 10);
    const closeMin = match[5] ? parseInt(match[5], 10) : 0;
    const closeMer = match[6].toLowerCase();

    if (openMer === "am" && openHour === 12) openHour = 0;
    if (openMer === "pm" && openHour !== 12) openHour += 12;
    if (closeMer === "am" && closeHour === 12) closeHour = 0;
    if (closeMer === "pm" && closeHour !== 12) closeHour += 12;

    if (openHour === 0 && openMin === 0 && closeHour === 0 && closeMin === 0)
      return true;

    const now = new Date();
    const current = now.getHours() * 60 + now.getMinutes();
    const open = openHour * 60 + openMin;
    const close = closeHour * 60 + closeMin;

    if (open > close) return current >= open || current < close;
    return current >= open && current < close;
  };


  useEffect(() => {
    let result = [...services];

    if (selectedType !== "all")
      result = result.filter((s) => s.type === selectedType);
    if (selectedPricingType !== "all")
      result = result.filter((s) => s.pricing_type === selectedPricingType);
    if (selectedPriceRange !== "all")
      result = result.filter((s) => s.price_range === selectedPriceRange);
    if (isOpen)
      result = result.filter((s) => isOpenNow(s.opening_hours));
    if (searchName.trim())
      result = result.filter((s) =>
        s.name?.toLowerCase().includes(searchName.trim().toLowerCase())
      );

     setFilteredServices(result);
  }, [
    services,
    selectedType,
    selectedPricingType,
    selectedPriceRange,
    isOpen,
    searchName,
  ]);

  return (
    <div className="container places">

      <div className="d-flex justify-content-center align-items-center mt-4 mb-4">
        <div className="d-flex align-items-center gap-3">
          <h2 className="fw-bold m-0">{placeName || "Place"}</h2>
          <span className="badge bg-primary text-white fs-5">
            {services.length} service{services.length !== 1 && "s"} found
          </span>
        </div>
      </div>

      <div className="d-flex flex-wrap align-items-center justify-content-center gap-3 mb-3">
        <div className="searchbar-place">
          <input
            type="text"
            placeholder="Search services by name..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
        </div>
        <div className="form-check form-switch d-flex align-items-center gap-2 ms-2">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            id="openNowSwitch"
            checked={isOpen}
            onChange={() => setIsOpen(!isOpen)}
          />
          <label className="form-check-label" htmlFor="openNowSwitch">
            Open Now
          </label>
        </div>
      </div>

      <p className="difficulty-title text-center">Service Type</p>
      <div className="places-type-buttons">
        {serviceTypes.map((t) => (
          <button
            key={t.value}
            className={`place-type-btn ${
              selectedType === t.value ? "selected-place-type" : ""
            }`}
            style={{ padding: "6px 14px", fontSize: "0.85rem" }}
            onClick={() => setSelectedType(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="difficulty-title text-center">Price Range</p>
      <div className="places-type-buttons">
        {priceRanges.map((r) => (
          <button
            key={r.value}
            className={`place-type-btn ${
              selectedPriceRange === r.value ? "selected-place-type" : ""
            }`}
            style={{ padding: "6px 14px", fontSize: "0.85rem" }}
            onClick={() => setSelectedPriceRange(r.value)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <p className="difficulty-title text-center">Pricing Type</p>
      <div className="places-type-buttons">
        {pricingTypes.map((pt) => (
          <button
            key={pt.value}
            className={`place-type-btn ${
              selectedPricingType === pt.value ? "selected-place-type" : ""
            }`}
            style={{ padding: "6px 14px", fontSize: "0.85rem" }}
            onClick={() => setSelectedPricingType(pt.value)}
          >
            {pt.label}
          </button>
        ))}
      </div>


      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading services...</p>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="text-center mt-5">
          <p className="text-muted">No services match your filters.</p>
        </div>
      ) : (
        <div className="row g-4">
          {filteredServices.map((service) => (
            <div
              key={service.service_id}
              className="col-12 col-sm-6 col-md-4 col-lg-3"
            >
              <ServiceCard service={service} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NearbyServices;