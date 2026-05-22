import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { supabase } from "../supabase-client";
import { UserContext } from "../contexts/UserContext";
import MapPicker from "./MapPicker";
import { formatTips } from "../apis/Gemeni_api_safety_tips";

function EditPlaceForm({ place, onClose }) {
    const navigate = useNavigate();

    const [useAi, setUseAi] = useState(false);

    // Form
    const [name, setName] = useState(place.name || "");
    const [description, setDescription] = useState(place.description || "");
    const [town, setTown] = useState(place.town || "");
    const [governorate, setGovernorate] = useState(place.governorate || "");
    const [difficulty, setDifficulty] = useState(place.difficulty || "");
    const [safety_tips, setSafety_tips] = useState(place.safety_tips || "");
    const [type, setType] = useState(place.type || "");
    const [position, setPosition] = useState({
        lat: place.latitude,
        lng: place.longitude,
    });

    // Image
    const [removedImages, setRemovedImages] = useState([]); // full object like place_images table
    const [newImageFiles, setNewImageFiles] = useState([]); //image files
    const [newImagePreviews, setNewImagePreviews] = useState([]); //preview URLs for new images
    const [saving, setSaving] = useState(false);
    const [existingImages, setExistingImages] = useState([]); // full objects from place_images table
    useEffect(() => {
        async function fetchImages() {
            const { data, error } = await supabase
                .from("Place_Image")
                .select("*")
                .eq("place_id", place.place_id);
            if (error) {
                console.error("Error fetching images:", error);
            } else {
                setExistingImages(data);
            }
        }
        fetchImages();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Helper: extract storage path from public URL for deletion
    const extractStoragePath = (url) => {
        const pattern = "/storage/v1/object/public/places/";
        const index = url.indexOf(pattern);
        if (index === -1) return null;
        return decodeURIComponent(url.substring(index + pattern.length));
    };

    // Handle deleting an existing image (visually)
    const handleDeleteExistingImage = (image) => {
        if (existingImages.length === 1) {
            return toast.error("At least one image is required. Please add a new image before deleting this one.");
        }
        setRemovedImages((prev) => [...prev, image]);
        setExistingImages((prev) => prev.filter((img) => img.image_id !== image.image_id));
        toast.info("Image will be removed on save");
    };

    // Handle adding new images (visually)
    const handleNewImages = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setNewImageFiles((prev) => [...prev, ...files]);

        const previews = files.map((file) => URL.createObjectURL(file));
        setNewImagePreviews((prev) => [...prev, ...previews]);
    };

    // Remove a pending new image (visually)
    const removeNewImage = (index) => {
        URL.revokeObjectURL(newImagePreviews[index]); //cleanup preview URL
        setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
        setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
    };

    // Save all changes
    const handleSave = async () => {
        if (!name.trim()) return toast.error("Place name is required");
        if (!type) return toast.error("Select place type");
        if (!difficulty) return toast.error("Select difficulty");
        if (!position) return toast.error("Pick location on map");
        if (!town.trim()) return toast.error("Town is required");
        if (!governorate.trim()) return toast.error("Governorate is required");
        setSaving(true);

        let finalSafetyTips = safety_tips;
        if (useAi) {
            try {
                const safetyFromGemeni = await formatTips(safety_tips, name);

                if (safetyFromGemeni) {
                    finalSafetyTips = safetyFromGemeni;
                    setSafety_tips(safetyFromGemeni);
                }
            } catch (err) {
                console.error(err);
            }
        }

        try {
            // Update place basic info
            const { error: updateError } = await supabase
                .from("Place")
                .update({
                    name,
                    description,
                    latitude: position.lat,
                    longitude: position.lng,
                    town,
                    governorate,
                    type,
                    difficulty,
                    safety_tips: finalSafetyTips,
                })
                .eq("place_id", place.place_id);

            if (updateError) throw new Error("Failed to update place: " + updateError.message);

            //  Delete removed images 
            for (const image of removedImages) {
                // Delete from DB first
                const { error: dbError } = await supabase
                    .from("Place_Image")
                    .delete()
                    .eq("image_id", image.image_id);

                if (dbError) throw new Error("Failed to delete image record: " + dbError.message);

                // Then delete from storage using the passed image object
                const path = extractStoragePath(image.url);
                if (path) {
                    await supabase.storage.from("places").remove([path]);
                }
            }

            //  Upload new images
            for (const file of newImageFiles) {
                const safeName = name.replace(/\s+/g, "_").toLowerCase();
                const fileName = `pictures/${safeName}-${Date.now()}-${file.name}`;

                const { error: uploadError } = await supabase.storage
                    .from("places")
                    .upload(fileName, file, { upsert: true });

                if (uploadError) throw new Error("Image upload failed: " + uploadError.message);

                const { data: publicData } = supabase.storage
                    .from("places")
                    .getPublicUrl(fileName);

                const { error: insertError } = await supabase
                    .from("Place_Image")
                    .insert({ url: publicData.publicUrl, place_id: place.place_id });

                if (insertError) throw new Error("Failed to save image record: " + insertError.message);
            }

            toast.success("Place updated successfully!");
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
            <h3 className="text-center mb-3">Edit Place</h3>
            <button className="close-btn" onClick={onClose}>✕</button>

            <div className="add-place-grid">

                <div className="add-place-col">
                    <input className="form-control mb-3" placeholder="Place name" value={name} onChange={(e) => setName(e.target.value)} />
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
                        <option value="river">River</option>
                        <option value="mountain">Mountain</option>
                        <option value="forest">Forest</option>
                        <option value="lake">Lake</option>
                        <option value="beach">Beach</option>
                        <option value="waterfall">Waterfall</option>
                        <option value="cave">Cave</option>
                        <option value="valley">Valley</option>
                        <option value="hill">Hill</option>
                        <option value="park">Park</option>
                        <option value="historical">Historical</option>
                        <option value="religious">Religious</option>
                    </select>

                    <select className="form-select mb-3" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                        <option value="" disabled hidden>Select Difficulty</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>

                    <textarea className="form-control safety-box" placeholder="Safety tips" value={safety_tips} onChange={(e) => setSafety_tips(e.target.value)} />
                    <div className="form-check form-switch" >
                        <input className="form-check-input" type="checkbox" onClick={() => { setUseAi((prev) => !prev) }} />
                        <label className="form-check-label">Use AI to refine safety tips</label>
                    </div>
                </div>

                <div className="add-place-col">
                    {existingImages.length > 0 && (
                        <div className="edit-images-gallery mb-3">
                            <label className="fw-bold mb-2">Current Images</label>
                            <div className="row g-2">
                                {existingImages.map((img) => (
                                    <div key={img.image_id} className="col-6 position-relative">
                                        <img src={img.url} alt="place" className="img-fluid rounded" style={{ height: "100px", objectFit: "cover", width: "100%" }} />
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
                    <p className="mt-2">Updating Place...</p>
                </div>
            )}
        </div>
    );
}

export default EditPlaceForm;