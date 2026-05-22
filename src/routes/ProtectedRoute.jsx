import { useContext, useEffect, useRef } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { UserContext } from "../contexts/UserContext";
import { toast } from "react-toastify";

function ProtectedRoute() {
  const { user, isAdmin, loading, dbUser } = useContext(UserContext);
  const shownRef = useRef(false);

  useEffect(() => {
    if (!loading && user && (!dbUser || !isAdmin) && !shownRef.current) {
      toast.error("Access denied 🚫 Admins only");
      shownRef.current = true;
    }
  }, [loading, user, dbUser, isAdmin]);

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center mt-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading account...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  if (!dbUser || !isAdmin) return <Navigate to="/" replace />;

  return <Outlet />;
}

export default ProtectedRoute;