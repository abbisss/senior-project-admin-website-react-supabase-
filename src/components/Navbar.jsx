import { Link } from "react-router-dom";
import { useContext, useState } from "react";
import { UserContext } from "../contexts/UserContext";
import ProfileMenu from "./ProfileMenu";
import { supabase } from "../supabase-client";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Collapse } from "bootstrap";

function Navbar() {
    const { dbUser, setDbUser } = useContext(UserContext);
    const profile_pic = dbUser?.profile_pic || "/default-profile.jpg";
    const [currentPath, setCurrentPath] = useState(window.location.pathname);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const navigate = useNavigate();

    const handleProfileClick = () => {
        setProfileMenuOpen(prev => !prev);
    };

    const closeProfileMenu = () => {
        setProfileMenuOpen(false);
    };

    const handleLogout = () => {
        window.confirm("Are you sure you want to logout?") &&
            supabase.auth.signOut().then(() => {
                navigate("/");
                setDbUser(null);
            }).catch((error) => {
                console.error("Logout error:", error);
                toast.error("Logout failed");
            });
    };

    const handleSaveProfile = async (updatedUser) => {
        const oldImageUrl = dbUser?.profile_pic;
        if (
            updatedUser.name?.trim() === "" ||
            updatedUser.age <= 0 ||
            (updatedUser.language !== "AR" && updatedUser.language !== "EN") || 
            (updatedUser.phone && updatedUser.phone.length < 8)
        ) {
            return toast.error("Please fill all fields correctly.");
        }

        const payload = {
            name: updatedUser.name.trim(),
            age: Number(updatedUser.age),
            language: updatedUser.language,
            profile_pic: updatedUser.profile_pic,
            phone: updatedUser.phone
        };

        if (updatedUser.profileFile) {
            const file = updatedUser.profileFile;

            if (file.size > 10 * 1024 * 1024) {
                return toast.error("File too large (max 10MB)");
            }

            const fileName = `avatars/${updatedUser.user_id}-${Date.now()}-${file.name}`;

            const { error: uploadError } = await supabase
                .storage
                .from("profiles")
                .upload(fileName, file, {
                    upsert: true
                });

            if (uploadError) {
                console.error(uploadError);
                return toast.error("Image upload failed");
            }

            const { data } = supabase
                .storage
                .from("profiles")
                .getPublicUrl(fileName);

            payload.profile_pic = data.publicUrl;
        }

        const { error } = await supabase
            .from("User")
            .update(payload)
            .eq("user_id", updatedUser.user_id);

        if (error) {
            return toast.error("Update failed");
        }

        setDbUser((prev) => {
            const updated = { ...prev, ...payload };
            return updated;
        });

        toast.success("Profile updated successfully");
        if (
            oldImageUrl &&
            oldImageUrl !== "https://qwtxlgzjjtjdohmnsuly.supabase.co/storage/v1/object/public/profiles/avatars/default_profile.jpg"
        ) {
            const oldPath = oldImageUrl.split(
                "/storage/v1/object/public/profiles/"
            )[1];

            const { error } = await supabase.storage
                .from("profiles")
                .remove([oldPath]);

            if (error) {
                console.error("Delete failed:", error.message);
            }
        }
    };

    const closeNavbar = () => {
        const nav = document.getElementById("nav");
        const bsCollapse = Collapse.getInstance(nav);

        if (bsCollapse) {
            bsCollapse.hide();
        }
    };

    const toggleNavbar = () => {
        const nav = document.getElementById("nav");
        const bsCollapse = Collapse.getOrCreateInstance(nav);
        bsCollapse.toggle();
    };

    return (
        <div>
            <nav className="navbar navbar-expand-lg my-navbar px-2">

                <Link className="navbar-brand d-flex align-items-center navbar-brand-custom" to="/dashboard" onClick={() => { setCurrentPath("/dashboard"); closeNavbar(); }}>
                    <img
                        src="/logo.png"
                        width="40"
                        height="40"
                        className="me-2 rounded-circle"
                        alt="logo"
                    />
                    Daherni Admin Web 🌿
                </Link>

                <button
                    type="button"
                    className="navbar-toggler"
                    aria-controls="nav"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                    onClick={toggleNavbar}
                    
                >
                    <span className="navbar-toggler-icon small-toggler"></span>
                </button>

                <div className="collapse navbar-collapse justify-content-center" id="nav">
                    <ul className="navbar-nav align-items-center mx-auto mb-2 mb-lg-0 gap-1">

                        <li className="nav-item" onClick={() => { setCurrentPath("/dashboard"); closeNavbar(); }}>
                            <Link className={`btn btn-outline-dark me-2 ${currentPath === "/dashboard" ? "nav-link-custom-active" : "nav-link-custom"}`} to="/dashboard">
                                Dashboard
                            </Link>
                        </li>

                        <li className="nav-item" onClick={() => { setCurrentPath("/places"); closeNavbar(); }}>
                            <Link className={`btn btn-outline-dark me-2 ${currentPath.startsWith("/places") ? "nav-link-custom-active" : "nav-link-custom"}`} to="/places">
                                Places
                            </Link>
                        </li>

                        <li className="nav-item" onClick={() => { setCurrentPath("/services"); closeNavbar(); }}>
                            <Link className={`btn btn-outline-dark me-2 ${currentPath.startsWith("/services") ? "nav-link-custom-active" : "nav-link-custom"}`} to="/services">
                                Services
                            </Link>
                        </li>

                        <li className="nav-item" onClick={() => { setCurrentPath("/place_service"); closeNavbar(); }}>
                            <Link className={`btn btn-outline-dark me-2 ${currentPath.startsWith("/place_service") ? "nav-link-custom-active" : "nav-link-custom"}`} to="/place_service">
                                Place-Service
                            </Link>
                        </li>

                        <li className="nav-item" onClick={() => { setCurrentPath("/manage-users"); closeNavbar(); }}>
                            <Link className={`btn btn-outline-dark me-2 ${currentPath === "/manage-users" ? "nav-link-custom-active" : "nav-link-custom"}`} to="/manage-users">
                                Users
                            </Link>
                        </li>

                    </ul>
                    <div className="d-flex flex-column align-items-center ">
                        <img
                            src={profile_pic}
                            className="profile-btn"
                            onClick={() => { handleProfileClick(); closeNavbar(); }}
                            alt="profile"
                        />
                        {dbUser?.name && <span className="profile-name">Welcome {dbUser.name}!</span>}
                    </div>
                </div>
                {profileMenuOpen && (<ProfileMenu onClose={closeProfileMenu} onLogout={handleLogout} onSave={handleSaveProfile} user={dbUser} />)}
            </nav>
        </div>
    );
}

export default Navbar;