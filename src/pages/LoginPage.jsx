import "../style.css";
import { useState } from "react";
import { supabase } from "../supabase-client";
import { useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";

function LoginPage() {
    //constants
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [login_error, setLoginError] = useState("");
    const navigate = useNavigate();

    //functions
    const handleLogin = async (e) => {
        e.preventDefault(); //prevent reload
        const isEmail = /\S+@\S+\.\S+/.test(email);
        setLoginError(""); // reset error message

        if (!email || !password) {
            setLoginError("Please enter both email and password!");
            return;
        }
        if (isEmail) {
            const { error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                console.error("Login error:", error.message);
                setLoginError("Invalid email or password! Please try again.");
                return;
            } else {
                navigate("/dashboard");
            }
        }
        else {
            setLoginError("Invalid email format! Please enter a valid email address.");
            return;
        }
    }
    

    const handleGoogleLogin = async (e) => {
        e.preventDefault();
        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: window.location.origin + "/dashboard"
            }
        });
    };

    return (
        <div className="container-fluid vh-100 d-flex flex-column justify-content-center align-items-center">

            {/* Header */}
            <div className="d-flex align-items-center gap-2 mb-4">
                <img
                    src="/logo.png"
                    alt="Logo"
                    className="rounded-circle border"
                    width="70"
                    height="70"
                />
                <h2 className="m-0 fw-bold">Welcome Daherni Admin!</h2>
            </div>

            {/* Login Card */}
            <div className="card shadow p-4 login-container">

                <h4 className="text-center mb-4">Login to Your Account</h4>

                <form className=" from d-flex flex-column gap-3">

                    <input
                        type="text"
                        value={email}
                        placeholder="Email"
                        className="form-control text-center mb-2"
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <input
                        type="password"
                        value={password}
                        placeholder="Password"
                        className="form-control text-center mb-2"
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    {login_error && <p className="text-danger text-center">{login_error}</p>}

                    <button type="submit" className="btn btn-primary w-100 fw-bold" onClick={handleLogin}>
                        Login
                    </button>

                    <p className="text-center mb-0 mt-0">Or</p>

                    <button className="btn btn-dark border w-100 d-flex align-items-center justify-content-center gap-2"
                        onClick={handleGoogleLogin}>
                       <FcGoogle size={20} />
                        Sign in with Google
                    </button>
                </form>
            </div>
        </div>
    );

}
export default LoginPage;