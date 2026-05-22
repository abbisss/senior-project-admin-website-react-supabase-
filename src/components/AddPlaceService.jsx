import { useState, useEffect } from "react";
import { supabase } from "../supabase-client";
import { toast } from "react-toastify";
import Place_Service from "../pages/Place_Service";

function AddPlaceService({ setShowAddService, selectedPlace }) {
    const [services, setServices] = useState([])
    const [serviceSearchName, setServiceSearchName] = useState("");
    const [selectedService, setSelectedService] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);

    const [distance, setDistance] = useState("");
    const [notes, setNotes] = useState("");
    const [is_primary, setIsPrimary] = useState(false);

    async function searchServices(name) {

        let query = supabase
            .from("Service")
            .select(`*`)
            .eq("status", "approved");

        if (name && name.trim() !== "") {
            query = query
                .or(`name.ilike.%${name.trim()}%`)
                .order("name", { ascending: true })
                .limit(5);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Fetch services error:", error);
            return;
        }

        setServices(data || []);
    }

    function getDistance(place_lat, place_lng, service_lat, service_lng) {
        if (
            place_lat == null || place_lng == null ||
            service_lat == null || service_lng == null
        ) return null;

        const nums = [place_lat, place_lng, service_lat, service_lng].map(Number);

        if (nums.some(n => isNaN(n))) return null;

        const [lat1, lon1, lat2, lon2] = nums;

        if (
            lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90 ||
            lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180
        ) return null;

        const R = 6371;
        const toRad = (deg) => deg * Math.PI / 180;

        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        setDistance(+(R * c).toFixed(2))
    }

    async function checkExistingLink(place_id, service_id) {
        const { data, error } = await supabase
            .from("Place_Service")
            .select("id")
            .eq("place_id", place_id)
            .eq("service_id", service_id)

        if (error) {
            toast.error("error fetching data");
            return true;
        }

        if (data.length > 0) {
            toast.error("Service already linked to place!");
            return true;
        }

        return false;
    }

    async function handleLinkService(selectedPlace, selectedService) {
        if (!selectedPlace || !selectedService) {
            return toast.error("choose both place and service to link!")
        }

        const exists = await checkExistingLink(selectedPlace.place_id, selectedService.service_id);
        if (exists) return;

        const { error } = await supabase.from("Place_Service").insert([
            {
                place_id: selectedPlace.place_id,
                service_id: selectedService.service_id,
                distance_km: distance,
                notes: notes,
                is_primary
            }
        ])
        if (error) return toast.error("error linking service");

        setShowAddService(false);
        return toast.success("Service linked successfully!");
    }

    useEffect(() => {
        searchServices(serviceSearchName)
        setShowDropdown(!selectedService && serviceSearchName.length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serviceSearchName])

    return (
        <div className="card add-place-service-container p-3 p-md-4 w-100 w-md-75 w-lg-50 mx-auto">
            <h5 className="fw-bold mb-3 text-center text-md-start">
                Link a Service →
                <span className="text-success fs-6">{" " + selectedPlace.name}</span>
            </h5>

            <button
                className="close-btn"
                onClick={() => setShowAddService(false)}
            >
                ✕
            </button>

            <div className="d-flex flex-column flex-md-row gap-2">
                <div className="searchbar-place-service d-flex flex-column gap-3 w-100 position-relative">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Search services by name"
                        value={serviceSearchName}
                        onChange={(e) => setServiceSearchName(e.target.value)}
                    />

                    {showDropdown && services.length > 0 && (
                        <div className="dropdown-place-menu dropdown-menu show w-100">
                            {services.map((s) => (
                                <div
                                    key={s.service_id}
                                    className="dropdown-item"
                                    onClick={() => {
                                        setServiceSearchName(s.name);
                                        setSelectedService(s);
                                        setShowDropdown(false);
                                        getDistance(
                                            selectedPlace.latitude,
                                            selectedPlace.longitude,
                                            s.latitude,
                                            s.longitude
                                        )
                                    }}
                                >
                                    {s.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {selectedService && (
                    <div className="d-flex align-items-center gap-2 py-2 px-3 bg-accent rounded-pill flex-nowrap mt-2 mt-md-0">
                        <i className="bi bi-pin-map-fill flex-shrink-0"></i>

                        <span className="text-truncate">
                            {selectedService.name}
                        </span>

                        <button
                            type="button"
                            className="btn-close flex-shrink-0"
                            onClick={() => {
                                setSelectedService(null);
                                setServiceSearchName("");
                                setDistance("")
                            }}
                        ></button>
                    </div>
                )}
            </div>

            <hr />

            <div className="container-fluid bg-secondary-light rounded-2 d-flex flex-column flex-md-row justify-content-between 
            fs-6 align-items-start align-items-md-center p-2 gap-2">
                <div className="d-flex gap-1">
                    <span className="bi bi-signpost-2"></span>
                    <p className="mb-0">{distance && (`Distance ${distance} km`)}</p>
                </div>

                <p className="mb-0 text-muted small">Distance auto calculated from coordinates</p>
            </div>

            <hr />

            <h6 className="text-muted fw-bold">Notes (optional)</h6>
            <textarea
                className="form-control mb-3 desc-box"
                placeholder="eg. Preferred for group tours, require booking...."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
            />

            <hr className="mt-0" />

            <div className="container-fluid bg-secondary-light rounded-2 p-2 d-flex flex-column flex-md-row justify-content-between
            align-items-start align-items-md-center gap-2">
                <div>
                    <h5>⭐ Set is as primary</h5>
                    <p className="text-muted small mb-0">Mark as main or known service for this place</p>
                </div>
                <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox"
                        onChange={() => setIsPrimary(!is_primary)} />
                    <label className="form-check-label">Is Primary</label>
                </div>
            </div>

            <div className="d-flex flex-column flex-sm-row justify-content-end gap-2 mt-3">
                <button className="btn border-dark w-100 w-sm-auto"
                    onClick={() => { setShowAddService(false) }}
                >Cancle</button>
                <button className="btn btn-secondary fw-bold border-dark w-100 w-sm-auto"
                    onClick={() => handleLinkService(selectedPlace, selectedService)}
                >Link service</button>
            </div>
        </div>
    )
}
export default AddPlaceService