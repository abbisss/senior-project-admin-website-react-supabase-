import { useEffect, useState } from "react";
import { supabase } from "../supabase-client";
import { toast } from "react-toastify";
import AddPlaceService from "../components/AddPlaceService";

const serviceTypes = [
    { value: "all", label: "All 🌍" },
    { value: "restaurant", label: "Restaurant 🍽️" },
    { value: "cafe", label: "Cafe ☕" },
    { value: "hotel", label: "Hotel 🏨" },
    { value: "campsite", label: "Campsite ⛺" },
    { value: "parking", label: "Parking 🅿️" },
    { value: "guesthouse", label: "Guesthouse 🏡" },
    { value: "chalet_rent", label: "Chalet Rent 🏠" },
    { value: "resort", label: "Resort 🌴" },
    { value: "activity", label: "Activity 🏄" },
    { value: "tour_guide", label: "Tour Guide 🧭" },
    { value: "transport", label: "Transport 🚗" },
    { value: "rental", label: "Rental 🎒" },
    { value: "shop", label: "Shop 🛍️" },
    { value: "supermarket", label: "Supermarket 🛒" },
    { value: "other", label: "Other 📌" },
    { value: "rest_area", label: "Rest Area 🛋️" },
];

function Place_Service() {
    const [places, setPlaces] = useState([]);
    const [placeSearchName, setPlaceSearchName] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [showAddService, setShowAddService] = useState(false);

    const [totalLinked, setTotalLinked] = useState("");
    const [primaryCount, setPrimaryCount] = useState("");
    const [avgDistance, setAvgDistance] = useState("");
    const [serviceTypeCount, setServiceTypeCount] = useState("");

    const [selectedType, setSelectedType] = useState("all");
    const visibleTypes = serviceTypes.slice(0, 5);
    const hiddenTypes = serviceTypes.slice(5);
    const [showMore, setShowMore] = useState(false);
    const [minDistance, setMinDistance] = useState("");
    const [maxDistance, setMaxDistance] = useState("");
    const [primaryOnly, setPrimaryOnly] = useState(false);
    const [serviceName, setServiceName] = useState("");

    const [services, setServices] = useState([]);
    const [allServices, setAllServices] = useState([]);

    const [openEditService, setOpenEditService] = useState(false);
    const [currentEdetingService, setCurrentEditingServie] = useState(null);
    const [edit_notes, setEditNotes] = useState("");
    const [edit_dist, setEditDistance] = useState("");
    const [edit_isprimary, setEdit_isprimary] = useState(false);

    async function searchPlaces(name) {
        let query = supabase
            .from("Place")
            .select(`*`)
            .eq("status", "approved");

        if (name && name.trim() !== "") {
            query = query
                .or(`name.ilike.%${name.trim()}%`)
                .order("name", { ascending: true })
        }

        const { data, error } = await query;

        if (error) {
            console.error(error);
            return;
        }

       setPlaces( data.slice(0, 5) || []);
    }

    async function getPlaceServiceStats(place_id) {
        if (!place_id) return null;

        const { data, error } = await supabase
            .from("Place_Service")
            .select(`
            distance_km,
            is_primary,
            service:service_id (type)
        `)
            .eq("place_id", place_id);

        if (error || !data) {
            console.error("Stats fetch error:", error);
            return null;
        }

        const totalLinked = data.length;

        const primaryCount = data.filter(item => item.is_primary).length;

        const validDistances = data
            .map(item => Number(item.distance_km))
            .filter(d => !isNaN(d));

        const avgDistance =
            validDistances.length > 0
                ? (validDistances.reduce((a, b) => a + b, 0) / validDistances.length).toFixed(1)
                : 0;

        //used sets because it doesnt allow booleans
        const serviceTypesSet = new Set(
            data
                .map(item => item.service?.type)
                .filter(Boolean)
        );

        setTotalLinked(totalLinked);
        setPrimaryCount(primaryCount);
        setAvgDistance(avgDistance);
        setServiceTypeCount(serviceTypesSet.size)
    }

    async function getPlaceServices(place_id) {
        if (!place_id) return;

        const { data: id_data, error: id_error } = await supabase
            .from("Place_Service")
            .select("service_id, distance_km, is_primary, notes")
            .eq("place_id", place_id);

        if (id_error) {
            console.log("error finding services " + id_error.message);
            return;
        }

        const serviceIds = id_data.map(item => item.service_id);

        if (serviceIds.length === 0) {
            setServices([]);
            return;
        }

        const { data, error } = await supabase
            .from("Service")
            .select("*")
            .in("service_id", serviceIds);

        if (error) {
            console.log("error finding services " + error.message);
            return;
        }

        const merged = data.map(service => {
            const match = id_data.find(i => i.service_id === service.service_id);
            return {
                ...service,
                is_primary: match?.is_primary,
                distance_km: match?.distance_km || null,
                notes: match?.notes || ""
            };
        });

        setAllServices(merged);
    }

    async function deleteServiceLink(place_id, service_id) {
        if (!place_id || !service_id) return

        const { error } = await supabase.from("Place_Service")
            .delete()
            .eq("place_id", place_id)
            .eq("service_id", service_id)
        if (error) {
            console.log("error deleting service" + error); return;
        }
        getPlaceServices(place_id);
        getPlaceServiceStats(place_id);
        return toast.success("service deleted successfully!");
    }

    useEffect(() => {
        searchPlaces(placeSearchName);
        setShowDropdown(!selectedPlace && placeSearchName.length > 0);
        // eslint-disable-next-line
    }, [placeSearchName]);

    useEffect(() => {
        if (!selectedPlace) {

            setTotalLinked("");
            setPrimaryCount("");
            setAvgDistance("");
            setServiceTypeCount("");
            return;
        }
        getPlaceServiceStats(selectedPlace.place_id);
        getPlaceServices(selectedPlace.place_id);
    }, [selectedPlace])

    useEffect(() => {
        if (!selectedPlace) return;
        getPlaceServices(selectedPlace.place_id);
        getPlaceServiceStats(selectedPlace.place_id);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setShowAddService, showAddService])



    useEffect(() => {
        let filtered = [...allServices];

        if (serviceName.trim()) {
            const lowerName = serviceName.trim().toLowerCase();
            filtered = filtered.filter(s =>
                s.name?.toLowerCase().includes(lowerName)
            );
        }

        if (primaryOnly) {
            filtered = filtered.filter(s => s.is_primary);
        }

        if (selectedType !== "all") {
            filtered = filtered.filter(s => s.type === selectedType)
        }

        const min = parseFloat(minDistance);
        const max = parseFloat(maxDistance);
        if (!isNaN(min)) {
            filtered = filtered.filter(s => {
                const d = parseFloat(s.distance_km);
                return !isNaN(d) && d >= min;
            });
        }
        if (!isNaN(max)) {
            filtered = filtered.filter(s => {
                const d = parseFloat(s.distance_km);
                return !isNaN(d) && d <= max;
            });
        }

        setServices(filtered);
    }, [minDistance, maxDistance, primaryOnly, serviceName, allServices, selectedType]);


    async function updateServicePlace(notes, distance, isPrimary) {
        if (!selectedPlace || !currentEdetingService) {
            return toast.error("Missing place or service");
        }

        const serviceId = currentEdetingService.service_id;
        const placeId = selectedPlace.place_id;

        const parsedDistance = parseFloat(distance);

        if (distance !== "" && (isNaN(parsedDistance) || parsedDistance < 0)) {
            return toast.error("Distance must be a valid positive number");
        }

        if (notes && notes.length > 500) {
            return toast.error("Notes are too long (max 500 characters)");
        }

        const { error } = await supabase
            .from("Place_Service")
            .update({
                notes: notes || null,
                distance_km: distance !== "" ? parsedDistance : null,
                is_primary: isPrimary
            })
            .eq("place_id", placeId)
            .eq("service_id", serviceId);

        if (error) {
            console.log(error);
            return toast.error("Failed to update service");
        }

        toast.success("Service updated successfully!");

        setOpenEditService(false);
        getPlaceServices(placeId);
        getPlaceServiceStats(placeId);
    }


    return (
        <div className="my-mt mx-auto container">
            <div className="place-add-service mx-auto mt-3 rounded-3 p-3">

                <div className="d-flex align-items-center gap-3 flex-wrap w-100">

                    <div className="searchbar-place-service d-flex flex-column position-relative">
                        <input
                            type="text"
                            placeholder="Search places — e.g. Tayrfelsay River..."
                            value={placeSearchName}
                            onChange={(e) => setPlaceSearchName(e.target.value)}
                        />
                        {showDropdown && places.length > 0 && (
                            <div className="dropdown-place-menu dropdown-menu show mt-5">
                                {places.map((p) => (
                                    <div
                                        key={p.place_id}
                                        className="dropdown-item"
                                        onClick={() => {
                                            setPlaceSearchName(p.name);
                                            setSelectedPlace(p);
                                            setShowDropdown(false);
                                        }}
                                    >
                                        {p.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                     

                    {selectedPlace && (
                        <div className="d-flex align-items-center gap-2 py-2 px-3 bg-accent rounded-pill flex-nowrap">
                            <i className="bi bi-pin-map-fill flex-shrink-0"></i>

                            <span className="text-truncate">
                                {selectedPlace.name}
                            </span>

                            <button
                                type="button"
                                className="btn-close flex-shrink-0"
                                onClick={() => {
                                    setSelectedPlace(null);
                                    setPlaceSearchName("");
                                    setServices([])
                                }}
                            ></button>
                        </div>
                    )}

                    <button
                        className={`btn rounded-4 ms-auto ${selectedPlace ? "btn-primary" : "btn-secondary"}`}
                        onClick={() => {
                            if (!selectedPlace) {
                                toast.error("Choose a place first");
                                return;
                            }
                            setShowAddService(true);
                        }}
                    >
                        <span className="bi bi-plus-lg"></span> add service
                    </button>

                </div>

                {showAddService && (
                    <AddPlaceService
                        setShowAddService={setShowAddService}
                        selectedPlace={selectedPlace}

                    />
                )}
            </div>
                
            <div className="row g-3 mt-2 justify-content-center">
                <div className="col-6 col-sm-4 col-md-3 col-lg-2">
                    <div className="card p-2 text-center bg-card border-0 h-100">
                        <h6 className="text-muted mb-1">Linked Services</h6>
                        <h4 className="fw-bold text-success">{totalLinked}</h4>
                    </div>
                </div>

                <div className="col-6 col-sm-4 col-md-3 col-lg-2">
                    <div className="card p-2 text-center bg-card border-0 h-100">
                        <h6 className="text-muted mb-1">Primary</h6>
                        <h4 className="fw-bold text-success">{primaryCount}</h4>
                    </div>
                </div>

                <div className="col-6 col-sm-4 col-md-3 col-lg-2">
                    <div className="card p-2 text-center bg-card border-0 h-100">
                        <h6 className="text-muted mb-1">Avg Distance</h6>
                        <h4 className="fw-bold text-success">{avgDistance}</h4>
                    </div>
                </div>

                <div className="col-6 col-sm-4 col-md-3 col-lg-2">
                    <div className="card p-2 text-center bg-card border-0 h-100">
                        <h6 className="text-muted mb-1">Service Types</h6>
                        <h4 className="fw-bold text-success">{serviceTypeCount}</h4>
                    </div>
                </div>
            </div>

            <div className="bg-card rounded-3 p-3 mt-3 d-flex flex-wrap align-items-center gap-2">
                <div className="d-flex flex-wrap align-items-center gap-2 w-100">

                    {visibleTypes.map((t) => (
                        <div
                            key={t.value}
                            className={`btn btn-sm rounded-pill border ${selectedType === t.value ? "btn-active" : ""
                                }`}
                            onClick={() => setSelectedType(t.value)}
                        >
                            {t.label}
                        </div>
                    ))}

                    <button
                        className="btn btn-sm rounded-pill border d-flex align-items-center"
                        onClick={() => setShowMore(!showMore)}
                    >
                        <i className="bi bi-three-dots"></i>
                    </button>


                    <span className="text-muted fs-4 mx-2">|</span>

                    <div className="d-flex flex-wrap align-items-center gap-2">

                        <i className="bi bi-signpost-2 text-muted"></i>

                        <span className="text-muted small">Distance</span>

                        <div className="d-flex align-items-center gap-2">

                            <input
                                type="number"
                                className="form-control form-control-sm text-center"
                                style={{ width: "70px" }}
                                value={minDistance}
                                min={0}
                                placeholder="0"
                                onChange={(e) => { setMinDistance(e.target.value) }}
                            />

                            <span className="text-muted">-</span>

                            <input
                                type="number"
                                className="form-control form-control-sm text-center"
                                min={0}
                                placeholder="50"
                                style={{ width: "70px" }}
                                value={maxDistance}
                                onChange={(e) => { setMaxDistance(e.target.value) }}
                            />

                            <span className="d-flex align-items-center gap-1 ms-2">
                                <input type="checkbox"
                                    checked={primaryOnly}
                                    onChange={() => setPrimaryOnly(!primaryOnly)}
                                />
                                <span className="small mb-0">Primary only</span>
                            </span>
                        </div>
                    </div>

                </div>

                {showMore && (
                    <div className="d-flex position-absolute flex-wrap gap-2 z-3 col-8 mt-3 bg-card p-3 rounded-5 border">
                        {hiddenTypes.map((t) => (
                            <button
                                key={t.value}
                                onClick={() => {
                                    setSelectedType(t.value);
                                    setShowMore(false);
                                }}
                                className={`btn btn-sm rounded-pill border shadow-sm ${selectedType === t.value ? "btn-active" : ""
                                    }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                )}
                <div className="d-flex gap-3 align-items-center mt-3">
                    <span className="text-muted small">Showing {<span className="text-success fw-bold">{services.length}</span>} services</span>
                    <input type="text" className="searchbar-place-service h-25 w-50 small shadow-sm"
                        placeholder="filter by name"
                        value={serviceName}
                        onChange={(e) => setServiceName(e.target.value)}
                    />
                </div>

                <div className="table table-responsive-sm">
                    <table className="table table-hover align-middle mt-3">
                        <thead>
                            <tr className="align-middle text-center">
                                <th>Service</th>
                                <th>Type</th>
                                <th>Distance</th>
                                <th>Notes</th>
                                <th>Primary</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {services.map((s) => (
                                <tr key={s.service_id} className="align-middle text-center">

                                    <td className="fw-semibold">{s.name}</td>

                                    <td>
                                        <span className="badge bg-secondary-light text-dark border">
                                            {s.type}
                                        </span>
                                    </td>

                                    <td>
                                        <span className="text-muted small">
                                            {s.distance_km ?? "-"} km
                                        </span>
                                    </td>

                                    <td className="text-muted small">
                                        {s.notes
                                            ? (s.notes.length > 35 ? s.notes.slice(0, 35) + "..." : s.notes)
                                            : "-"}
                                    </td>

                                    <td>
                                        {s.is_primary ? (
                                            <span className="badge bg-success">
                                                Primary
                                            </span>
                                        ) : (
                                            <span className="badge bg-secondary">
                                                No
                                            </span>
                                        )}
                                    </td>

                                    <td>
                                        <div className="d-flex justify-content-center gap-2">
                                            <button className="btn btn-sm btn-outline-primary"
                                                onClick={() => {
                                                    setOpenEditService(true);
                                                    setCurrentEditingServie(s);

                                                    setEditNotes(s.notes || "");
                                                    setEditDistance(s.distance_km || "");
                                                    setEdit_isprimary(s.is_primary || false);
                                                }}
                                            >
                                                <i className="bi bi-pencil"></i>
                                            </button>
                                            <button className="btn btn-sm btn-outline-danger"
                                                onClick={() => {
                                                    if (window.confirm("Are you sure you want to delete this service?")) {
                                                        deleteServiceLink(selectedPlace.place_id, s.service_id);
                                                    }
                                                }}
                                            >
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </div>
                                    </td>

                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {openEditService && (<div className="edit-place-service-container">
                    <h3 className="text-center mb-3 mt-2">Edit {currentEdetingService.name}</h3>
                    <button className="close-btn" onClick={() => setOpenEditService(!openEditService)}>✕</button>
                    <div className="d-flex flex-column gap-2 text-center align-items-center">
                        <textarea className="form-control form-control-sm text-center"
                            placeholder="Enter notes"
                            value={edit_notes}
                            onChange={(e) => setEditNotes(e.target.value)}
                        ></textarea>
                        <input type="number" className="form-control form-control-sm text-center" min={0}
                            placeholder="distance" value={edit_dist} onChange={(e) => setEditDistance(e.target.value)} />
                        <span className="d-flex align-items-center gap-1 ms-2">
                            <input type="checkbox"
                                checked={edit_isprimary}
                                onChange={() => setEdit_isprimary(!edit_isprimary)}
                            />
                            <span className="small mb-0">is primary</span>
                        </span>
                        <div className="d-flex flex-column flex-sm-row justify-content-end gap-2 mt-3">
                            <button className="btn border-dark  w-sm-auto"
                                onClick={() => { setOpenEditService(false) }}
                            >Cancle</button>
                            <button className="btn btn-secondary fw-bold border-dark  w-sm-auto"
                                onClick={() => { updateServicePlace(edit_notes, edit_dist, edit_isprimary) }}
                            >Update service</button>
                        </div>
                    </div>
                </div>)}
            </div>
        </div>
    );
}

export default Place_Service;