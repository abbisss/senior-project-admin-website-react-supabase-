import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import ManageUsers from "./pages/ManageUsers";
import Places from "./pages/Places";
import Services from "./pages/Services";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import { UserProvider } from "./contexts/UserContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Layout from "./components/Layout";
import FavoritePlaces from "./pages/FavoritePlaces";
import PlaceDetails from "./pages/PlaceDetails";
import ServiceDetails from "./pages/ServiceDetails";
import FavoriteServices from "./pages/FavoriteServices";
import Place_Service from "./pages/Place_Service";

function App() {
  return (
    <UserProvider>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />

      <Routes>
        {/* public routes */}
        <Route path="/" element={<LoginPage />} />

        {/* protected + layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/manage-users" element={<ManageUsers />} />

            <Route path="/places" element={<Places />} />
            <Route path="/places/:id" element={<PlaceDetails />}></Route>
            <Route path="/favorite-places" element={<FavoritePlaces />}></Route>

            <Route path="/services" element={<Services />} />
            <Route path="/services/:id" element={<ServiceDetails />}></Route>
            <Route path="/favorite-services" element={<FavoriteServices />}></Route>
            
            <Route path="/place_service" element={<Place_Service />}></Route>
          </Route>
        </Route>
      </Routes>
    </UserProvider>
  );
}

export default App;