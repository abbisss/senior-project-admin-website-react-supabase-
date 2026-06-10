import Navbar from "./Navbar";
import Footer from "./Footer";
import { Outlet } from "react-router-dom";

// Outlet = placeholder where the matched child route component is rendered
// React Router uses your route configuration and then injects the matched child route element into <Outlet />

export default function Layout() {
  return (
    <div className="app-wrapper">
      

      <div className="app-content">
        <Outlet />
      </div>

      <Footer />
    </div>
  );
}