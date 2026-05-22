import { useState, useContext } from "react";
import { toast } from "react-toastify";
import MapPicker from "./MapPicker";
import { UserContext } from "../contexts/UserContext";
import { supabase } from "../supabase-client";
import { formatTips } from "../apis/Gemeni_api_safety_tips";

function AddPlace({ addPlaceStatus, setAddPlaceStatus, setPlaceAdded }) {
    const { dbUser } = useContext(UserContext);
    const [placeIsBeingAdded, setPlaceIsBeingAdded] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [town, setTown] = useState("");
    const [governorate, setGovernorate] = useState("");
    const [difficulty, setDifficulty] = useState("");
    const [safety_tips, setSafety_tips] = useState("");
    const [type, setType] = useState("");
    const [image, setImage] = useState(null);
    const [position, setPosition] = useState(null);
    const [useAi, setUseAi] = useState(true);

    async function handleAddPlace() {
        setPlaceAdded(false);
        setPlaceIsBeingAdded(false);
        if (!name.trim()) return toast.error("Place name is required");
        if (!type) return toast.error("Select place type");
        if (!difficulty) return toast.error("Select difficulty");
        if (!position) return toast.error("Pick location on map");
        if (!image) return toast.error("Image is required");
        if (!town.trim()) return toast.error("Town is required");
        if (!governorate.trim()) return toast.error("Governorate is required");
        setPlaceIsBeingAdded(true);

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

        let imageUrl = "";

        const file = image;

        if (file.size > 10 * 1024 * 1024) {
            return toast.error("Image too large (max 2MB)");
        }

        const safeName = name.replace(/\s+/g, "_").toLowerCase();
        const fileName = `pictures/${safeName}-${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase
            .storage
            .from("places")
            .upload(fileName, file, {
                upsert: true
            });

        if (uploadError) {
            return toast.error("Image upload failed");
        }

        const { data: publicData } = supabase
            .storage
            .from("places")
            .getPublicUrl(fileName);

        imageUrl = publicData.publicUrl;

        const { data: placeData, error: placeError } = await supabase
            .from("Place")
            .insert([
                {
                    name,
                    description,
                    latitude: position.lat,
                    longitude: position.lng,
                    town,
                    governorate,
                    type,
                    difficulty,
                    safety_tips: finalSafetyTips,
                    status: "approved",
                    created_by: dbUser.user_id,
                }
            ])
            .select()
            .single();

        if (placeError) {
            return toast.error("Failed to add place");
        }

        const { error: imageError } = await supabase
            .from("Place_Image")
            .insert([
                {
                    url: imageUrl,
                    place_id: placeData.place_id
                }
            ]);

        if (imageError) {
            console.error(imageError);
            return toast.error("Place added but image failed");
        }

        toast.success("Place added successfully 🎉");
        setAddPlaceStatus(!addPlaceStatus);
        setPlaceAdded(true);
    }

    return (
        <div className="card add-place-container p-4">
            <h3 className="text-center mb-3">Place Details</h3>

            <button
                className="close-btn"
                onClick={() => setAddPlaceStatus(!addPlaceStatus)}
            >
                ✕
            </button>

            <div className="add-place-grid">
                <div className="add-place-col">
                    <input
                        className="form-control mb-3"
                        placeholder="Place name"
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
                        <option disabled hidden value="">
                            Select Type
                        </option>
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

                    <select
                        className="form-select mb-3"
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                    >
                        <option value="" disabled hidden>
                            Select Difficulty
                        </option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>

                    <textarea
                        className="form-control safety-box"
                        placeholder="Safety tips"
                        value={safety_tips}
                        onChange={(e) => setSafety_tips(e.target.value)}
                    />
                    <div className="form-check form-switch" >
                        <input className="form-check-input" type="checkbox" checked={useAi} onClick={() => { setUseAi((prev) => !prev) }} />
                        <label className="form-check-label">Use AI to refine safety tips</label>
                    </div>
                </div>

                <div className="add-place-col">
                    <div className="image-box">
                        {!image ? (
                            <label className="p-5">
                                Click here to upload an image, you can add more in edit place after adding the place
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

                    {/* Map */}
                    <div className="map-box">
                        <MapPicker setPosition={setPosition} />
                        {!position ? (
                            <p className="text-muted mt-2">
                                Pick location
                            </p>
                        ) : (
                            <p className="text-success mt-2">
                                Location selected ✓
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="d-flex justify-content-center">
                <button
                    className="btn btn-primary rounded-pill p-3 w-25"
                    onClick={handleAddPlace}
                >
                    {placeIsBeingAdded ? "Adding..." : "Add Place"}
                </button>
            </div>
        </div>
    );
}

export default AddPlace;