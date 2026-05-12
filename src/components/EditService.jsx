import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { supabase } from "../supabase-client";
import { UserContext } from "../contexts/UserContext";
import MapPicker from "./MapPicker";

function EditServiceForm({ service, onClose }) {
    const navigate = useNavigate();

    const [name, setName] = useState(service.name || "");
    const [description, setDescription] = useState(service.description || "");
    const [town, setTown] = useState(service.town || "");
    const [governorate, setGovernorate] = useState(service.governorate || "");
    const [type, setType] = useState(service.type || "");
    const [priceRange, setPriceRange] = useState(service.price_range || "");
    const [pricingType, setPricingType] = useState(service.pricing_type || "");
    const [contactInfo, setContactInfo] = useState(service.contact_info || "");
    const [openingHours, setOpeningHours] = useState(service.opening_hours || "");
    const [position, setPosition] = useState({
        lat: service.latitude,
        lng: service.longitude,
    });
    const [verified, setVerified] = useState(service.is_verified);

    const [removedImages, setRemovedImages] = useState([]);
    const [newImageFiles, setNewImageFiles] = useState([]);
    const [newImagePreviews, setNewImagePreviews] = useState([]);
    const [saving, setSaving] = useState(false);
    const [existingImages, setExistingImages] = useState([]);

    useEffect(() => {
        async function fetchImages() {
            const { data, error } = await supabase
                .from("Service_Image")
                .select("*")
                .eq("service_id", service.service_id);
            if (error) {
                console.error("Error fetching images:", error);
            } else {
                setExistingImages(data);
            }
        }
        fetchImages();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const extractStoragePath = (url) => {
        const pattern = "/storage/v1/object/public/services/";
        const index = url.indexOf(pattern);
        if (index === -1) return null;
        return decodeURIComponent(url.substring(index + pattern.length));
    };

    const handleDeleteExistingImage = (image) => {
        if (existingImages.length + newImageFiles.length === 1) {
            return toast.error("At least one image is required. Please add a new image before deleting this one.");
        }
        setRemovedImages((prev) => [...prev, image]);
        setExistingImages((prev) => prev.filter((img) => img.image_id !== image.image_id));
        toast.info("Image will be removed on save");
    };

    const handleNewImages = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setNewImageFiles((prev) => [...prev, ...files]);
        const previews = files.map((file) => URL.createObjectURL(file));
        setNewImagePreviews((prev) => [...prev, ...previews]);
    };

    const removeNewImage = (index) => {
        URL.revokeObjectURL(newImagePreviews[index]);
        setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
        setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!name.trim()) return toast.error("Service name is required");
        if (!type) return toast.error("Select service type");
        if (!position) return toast.error("Pick location on map");
        if (!town.trim()) return toast.error("Town is required");
        if (!governorate.trim()) return toast.error("Governorate is required");
        setSaving(true);

        try {
            const { error: updateError } = await supabase
                .from("Service")
                .update({
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
                    is_verified: verified,
                })
                .eq("service_id", service.service_id);

            if (updateError) throw new Error("Failed to update service: " + updateError.message);

            // Delete removed images
            for (const image of removedImages) {
                const { error: dbError } = await supabase
                    .from("Service_Image")
                    .delete()
                    .eq("image_id", image.image_id);
                if (dbError) throw new Error("Failed to delete image record: " + dbError.message);

                const path = extractStoragePath(image.url);
                if (path) {
                    await supabase.storage.from("services").remove([path]);
                }
            }

            // Upload new images
            for (const file of newImageFiles) {
                const safeName = name.replace(/\s+/g, "_").toLowerCase();
                const fileName = `pictures/${safeName}-${Date.now()}-${file.name}`;

                const { error: uploadError } = await supabase.storage
                    .from("services")
                    .upload(fileName, file, { upsert: true });
                if (uploadError) throw new Error("Image upload failed: " + uploadError.message);

                const { data: publicData } = supabase.storage
                    .from("services")
                    .getPublicUrl(fileName);

                const { error: insertError } = await supabase
                    .from("Service_Image")
                    .insert({ url: publicData.publicUrl, service_id: service.service_id });
                if (insertError) throw new Error("Failed to save image record: " + insertError.message);
            }

            toast.success("Service updated successfully!");
            onClose();
            navigate(0);
        } catch (err) {
            console.error(err);
            toast.error(err.message || "Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="card add-place-container p-4">
            <h3 className="text-center mb-3">Edit Service</h3>
            <button className="close-btn" onClick={onClose}>✕</button>

            <div className="add-place-grid">
                <div className="add-place-col">
                    <input className="form-control mb-3" placeholder="Service name" value={name} onChange={(e) => setName(e.target.value)} />
                    <textarea className="form-control mb-3 desc-box" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />

                    <div className="row g-2 mb-3">
                        <div className="col-6">
                            <input className="form-control" placeholder="Town/City" value={town} onChange={(e) => setTown(e.target.value)} />
                        </div>
                        <div className="col-6">
                            <input className="form-control" placeholder="Governorate" value={governorate} onChange={(e) => setGovernorate(e.target.value)} />
                        </div>
                    </div>

                    <select className="form-select mb-3" value={type} onChange={(e) => setType(e.target.value)}>
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

                    <select className="form-select mb-3" value={priceRange} onChange={(e) => setPriceRange(e.target.value)}>
                        <option disabled hidden value="">Price Range</option>
                        <option value="cheap">Cheap</option>
                        <option value="budget">Budget</option>
                        <option value="moderate">Moderate</option>
                        <option value="expensive">Expensive</option>
                        <option value="luxury">Luxury</option>
                    </select>

                    <select className="form-select mb-3" value={pricingType} onChange={(e) => setPricingType(e.target.value)}>
                        <option disabled hidden value="">Pricing Type</option>
                        <option value="per_item">Per Item</option>
                        <option value="per_person">Per Person</option>
                        <option value="per_night">Per Night</option>
                        <option value="entry_fee">Entry Fee</option>
                        <option value="free">Free</option>
                    </select>

                    <textarea className="form-control desc-box mb-3"
                        placeholder={"Contact info (follow this template)" + "\n" +
                            "Phone: " + "\n" +
                            "Email: " + "\n" +
                            "Social media accounts: "
                        }
                        value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} />
                    <input className="form-control mb-3" placeholder="Opening hours xam - ypm" value={openingHours} onChange={(e) => setOpeningHours(e.target.value)} />
                    <div className="d-flex gap-2 align-items-center">
                        <input
                            type="checkbox"
                            checked={verified}
                            onChange={(e) => setVerified(e.target.checked)}
                        />
                        <label className="mb-0">Verified</label>
                    </div>
                </div>
                <div className="add-place-col">
                    {existingImages.length > 0 && (
                        <div className="edit-images-gallery mb-3">
                            <label className="fw-bold mb-2">Current Images</label>
                            <div className="row g-2">
                                {existingImages.map((img) => (
                                    <div key={img.image_id} className="col-6 position-relative">
                                        <img src={img.url} alt="service" className="img-fluid rounded" style={{ height: "100px", objectFit: "cover", width: "100%" }} />
                                        <button
                                            type="button"
                                            className="delete-image-btn"
                                            onClick={() => handleDeleteExistingImage(img)}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {newImagePreviews.length > 0 && (
                        <div className="new-images-preview mb-3">
                            <label className="fw-bold mb-2">New Images to Add</label>
                            <div className="row g-2">
                                {newImagePreviews.map((preview, idx) => (
                                    <div key={idx} className="col-6 position-relative">
                                        <img src={preview} alt="new preview" className="img-fluid rounded" style={{ height: "100px", objectFit: "cover", width: "100%" }} />
                                        <button
                                            type="button"
                                            className="delete-image-btn"
                                            onClick={() => removeNewImage(idx)}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mb-3">
                        <label className="btn btn-outline-success w-100">
                            + Add More Images
                            <input type="file" accept="image/*" multiple hidden onChange={handleNewImages} />
                        </label>
                    </div>

                    <div className="map-box">
                        <MapPicker setPosition={setPosition} initialPosition={position} />
                        <p className="text-muted mt-2">Drag marker or click map to adjust location</p>
                    </div>
                </div>
            </div>

            <div className="d-flex justify-content-center gap-3 mt-3">
                <button className="btn btn-secondary rounded-pill p-3 w-25" onClick={onClose}>
                    Cancel
                </button>
                <button className="btn btn-primary rounded-pill p-3 w-25" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>
            {saving && (
                <div className="mt-2 d-flex flex-column align-items-center justify-content-center">
                    <div className="spinner"></div>
                    <p className="mt-2">Updating Service...</p>
                </div>
            )}
        </div>
    );
}

export default EditServiceForm;