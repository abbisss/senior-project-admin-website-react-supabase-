import { useState, useContext } from "react";
import { toast } from "react-toastify";
import MapPicker from "./MapPicker";
import { UserContext } from "../contexts/UserContext";
import { supabase } from "../supabase-client";

function AddService({ addServiceStatus, setAddServiceStatus, setServiceAdded }) {
    const { dbUser } = useContext(UserContext);
    const [serviceIsBeingAdded, setServiceIsBeingAdded] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [town, setTown] = useState("");
    const [governorate, setGovernorate] = useState("");
    const [type, setType] = useState("");
    const [priceRange, setPriceRange] = useState("");
    const [pricingType, setPricingType] = useState("");
    const [contactInfo, setContactInfo] = useState("");
    const [openingHours, setOpeningHours] = useState("");
    const [image, setImage] = useState(null);
    const [position, setPosition] = useState(null);
    const [verified, setVerified] = useState(false);

    async function handleAddService() {
        setServiceAdded(false);
        setServiceIsBeingAdded(false);
        if (!name.trim()) return toast.error("Service name is required");
        if (!type) return toast.error("Select service type");
        if (!position) return toast.error("Pick location on map");
        if (!image) return toast.error("Image is required");
        if (!town.trim()) return toast.error("Town is required");
        if (!governorate.trim()) return toast.error("Governorate is required");
        setServiceIsBeingAdded(true);

        let imageUrl = "";
        const file = image;

        if (file.size > 10 * 1024 * 1024) {
            return toast.error("Image too large (max 2MB)");
        }

        const safeName = name.replace(/\s+/g, "_").toLowerCase();
        const fileName = `pictures/${safeName}-${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase
            .storage
            .from("services")
            .upload(fileName, file, {
                upsert: true
            });

        if (uploadError) {
            setServiceAdded(false)
            return toast.error("Image upload failed");
        }

        const { data: publicData } = supabase
            .storage
            .from("services")
            .getPublicUrl(fileName);

        imageUrl = publicData.publicUrl;

        const { data: serviceData, error: serviceError } = await supabase
            .from("Service")
            .insert([
                {
                    name,
                    description,
                    latitude: position.lat,
                    longitude: position.lng,
                    town,
                    governorate,
                    type,
                    price_range: priceRange,
                    pricing_type: pricingType,
                    contact_info: contactInfo,
                    opening_hours: openingHours,
                    status: "approved",
                    created_by: dbUser.user_id,
                    is_verified: verified
                }
            ])
            .select()
            .single();

        if (serviceError) {
            setServiceAdded(false);
            return toast.error("Failed to add service");
        }

        const { error: imageError } = await supabase
            .from("Service_Image")
            .insert([
                {
                    url: imageUrl,
                    service_id: serviceData.service_id
                }
            ]);

        if (imageError) {
            console.error(imageError);
            return toast.error("Service added but image failed");
        }

        toast.success("Service added successfully 🎉");
        setAddServiceStatus(!addServiceStatus);
        setServiceAdded(true);
    }

    return (
        <div className="card add-place-container p-4">
            <h3 className="text-center mb-3">Service Details</h3>

            <button
                className="close-btn"
                onClick={() => setAddServiceStatus(!addServiceStatus)}
            >
                ✕
            </button>

            <div className="add-place-grid">
                <div className="add-place-col">
                    <input
                        className="form-control mb-3"
                        placeholder="Service name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />

                    <textarea
                        className="form-control mb-3 desc-box"
                        placeholder="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />

                    <div className="row g-2 mb-3">
                        <div className="col-6">
                            <input
                                className="form-control"
                                placeholder="Town/City"
                                value={town}
                                onChange={(e) => setTown(e.target.value)}
                            />
                        </div>
                        <div className="col-6">
                            <input
                                className="form-control"
                                placeholder="Governorate"
                                value={governorate}
                                onChange={(e) => setGovernorate(e.target.value)}
                            />
                        </div>
                    </div>

                    <select
                        className="form-select mb-3"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                    >
                        <option disabled hidden value="">Select Type</option>
                        <option value="restaurant">Restaurant</option>
                        <option value="cafe">Cafe</option>
                        <option value="hotel">Hotel</option>
                        <option value="campsite">Campsite</option>
                        <option value="guesthouse">Guesthouse</option>
                        <option value="chalet_rent">Chalet Rent</option>
                        <option value="resort">Resort</option>
                        <option value="activity">Activity</option>
                        <option value="tour_guide">Tour Guide</option>
                        <option value="transport">Transport</option>
                        <option value="rental">Rental</option>
                        <option value="shop">Shop</option>
                        <option value="supermarket">Supermarket</option>
                        <option value="parking">Parking</option>
                        <option value="other">Other</option>
                        <option value="rest_area">Rest Area</option>
                    </select>

                    <select
                        className="form-select mb-3"
                        value={priceRange}
                        onChange={(e) => setPriceRange(e.target.value)}
                    >
                        <option disabled hidden value="">Price Range</option>
                        <option value="cheap">Cheap</option>
                        <option value="budget">Budget</option>
                        <option value="moderate">Moderate</option>
                        <option value="expensive">Expensive</option>
                        <option value="luxury">Luxury</option>
                    </select>

                    <select
                        className="form-select mb-3"
                        value={pricingType}
                        onChange={(e) => setPricingType(e.target.value)}
                    >
                        <option disabled hidden value="">Pricing Type</option>
                        <option value="per_item">Per Item</option>
                        <option value="per_person">Per Person</option>
                        <option value="per_night">Per Night</option>
                        <option value="entry_fee">Entry Fee</option>
                        <option value="free">Free</option>
                    </select>

                    <textarea
                        className="form-control desc-box mb-3"
                        placeholder={"Contact info (follow this template)" + "\n" +
                            "Phone: " + "\n" +
                            "Email: " + "\n" +
                            "Social media accounts: "
                        }
                        value={contactInfo}
                        onChange={(e) => setContactInfo(e.target.value)}
                    />

                    <input
                        className="form-control mb-3"
                        placeholder="Opening hours xam - ypm"
                        value={openingHours}
                        onChange={(e) => setOpeningHours(e.target.value)}
                    />
                </div>

                <div className="add-place-col">
                    <div className="image-box">
                        {!image ? (
                            <label className="p-5">
                                Click here to upload an image, you can add more in edit after adding the service
                                <input
                                    type="file"
                                    accept="image/*"
                                    hidden
                                    onChange={(e) =>
                                        setImage(e.target.files[0])
                                    }
                                />
                            </label>
                        ) : (
                            <img
                                src={URL.createObjectURL(image)}
                                alt="preview"
                                className="image-preview"
                            />
                        )}
                    </div>

                    <div className="map-box">
                        <MapPicker setPosition={setPosition} />
                        {!position ? (
                            <p className="text-muted mt-2">Pick location</p>
                        ) : (
                            <p className="text-success mt-2">Location selected ✓</p>
                        )}
                    </div>
                </div>
            </div>
            <div className="form-check d-flex align-items-center gap-2">
                <input
                    className="form-check-input"
                    type="checkbox"
                    checked={verified}
                    onChange={(e) => setVerified(e.target.checked)}
                />
                <label className="form-check-label mb-0">
                    Verified
                </label>
            </div>
            <div className="d-flex justify-content-center">
                <button
                    className="btn btn-primary rounded-pill p-3 w-25"
                    onClick={handleAddService}
                >
                    {serviceIsBeingAdded ? "Adding..." : "Add Service"}
                </button>
            </div>
        </div>
    );
}

export default AddService;