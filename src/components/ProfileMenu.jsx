import { useState, useEffect } from "react";
function ProfileMenu({ onClose, onLogout, onSave, user }) {
    const [tempUser, setTempUser] = useState(user);
    useEffect(() => {
        setTempUser(user);
    }, [user]);

    const handleImageEdit = (e) => {
        const file = e.target.files[0];

        if (!file) return;

        const imageUrl = URL.createObjectURL(file);

        setTempUser((prev) => ({
            ...prev,
            profile_pic: imageUrl,
            profileFile: file, // store real file for upload later
        }));
    };

    const handleImageRemove = () => {
        window.confirm("Are you sure you want to remove your profile picture?") &&
            setTempUser((prev) => ({
                ...prev,
                profile_pic: "https://qwtxlgzjjtjdohmnsuly.supabase.co/storage/v1/object/public/profiles/avatars/default_profile.jpg"
            })
            )
    }

    return (
        <div className="position-absolute top-0 end-0 mt-2 me-2 bg-white border rounded shadow p-2 profile-menu" >
            <div className="d-flex justify-content-between align-items-center mb-3">
                <strong>Profile</strong>
                <button onClick={onClose} className="btn btn-sm btn-light border">
                    ✕
                </button>
            </div>

            <div className="text-center mb-3">
                <img
                    src={tempUser?.profile_pic || "/default-profile.jpg"}
                    key={tempUser?.profile_pic} //  forces re-render
                    alt="profile"
                    className="rounded-circle"
                    width="120"
                    height="120"
                    style={{ objectFit: "cover" }}
                />

                <div className="d-flex justify-content-center gap-2 mt-2">
                    <input
                        type="file"
                        accept="image/*"
                        id="profileUpload"
                        style={{ display: "none" }}
                        onChange={handleImageEdit}
                    />

                    <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => document.getElementById("profileUpload").click()}
                    >
                        Change
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={handleImageRemove}>
                        Remove
                    </button>
                </div>
            </div>

            <div className="mb-1 gap-2">
                <div className="mb-1 d-flex justify-content-between align-items-center ">
                    <strong>Name: </strong> <input
                        type="text"
                        value={tempUser.name}
                        className="form-control form-control-sm flex-grow-1"
                        onChange={(e) => {
                            setTempUser((prev) => ({
                                ...prev,
                                name: e.target.value
                            }))
                        }}
                    />
                </div>
                <div className="mb-1 d-flex justify-content-between align-items-center">
                    <strong>Age:</strong>  <input
                        type="number"
                        min={12}
                        max={100}
                        value={tempUser.age}
                        className="form-control form-control-sm flex-grow-1"
                        onChange={(e) => {
                            setTempUser((prev) => ({
                                ...prev,
                                age: e.target.value
                            }))
                        }}
                    />
                </div>

                <div className="mb-1 d-flex justify-content-between align-items-center">
                    <strong>Phone:</strong>  <input
                        type="text"
                        value={tempUser.phone}
                        className="form-control form-control-sm flex-grow-1"
                        onKeyDown={(e) => {
                            if (
                                !/[0-9]/.test(e.key) &&
                                e.key !== "Backspace" &&
                                e.key !== "ArrowLeft" &&
                                e.key !== "ArrowRight"
                            ) {
                                e.preventDefault();
                            }
                        }}
                        onChange={(e) => {
                            setTempUser((prev) => ({
                                ...prev,
                                phone: e.target.value
                            }))
                        }}
                    />
                </div>
            </div>


            <div className="mb-1">
                <strong>Language</strong>
                <div className="d-flex gap-2 mt-2">
                    <button className={`btn btn-sm btn-outline-secondary w-50 ${tempUser.language === 'AR' ? 'active-lang' : ''}`}
                        onClick={() => setTempUser((prev) => ({
                            ...prev,
                            language: "AR"
                        }))}
                    >
                        AR
                    </button>
                    <button className={`btn btn-sm btn-outline-secondary w-50 ${tempUser.language === 'EN' ? 'active-lang' : ''}`}
                        onClick={() => setTempUser((prev) => ({
                            ...prev,
                            language: "EN"
                        }))}
                    >
                        EN
                    </button>
                </div>
            </div>

            <hr />

            <div className="d-flex gap-2">
                <button className="btn btn-success w-100"
                    onClick={() => {
                        onSave(tempUser);
                        onClose();
                    }}
                >
                    Save
                </button>

                <button className="btn btn-danger w-100"
                    onClick={onLogout}
                >
                    Logout
                </button>
            </div>
        </div>
    );
}

export default ProfileMenu;