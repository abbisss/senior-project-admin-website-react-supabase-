import { useState, useEffect } from "react";
import { supabase } from "../supabase-client";
import { toast } from "react-toastify";

function ManageUsers() {
  const [totalUsers, setTotalUsers] = useState("");
  const [totalAdmins, setTotalAdmins] = useState("");
  const [totalActiveUsers, setTotalActiveUsers] = useState("");
  const [totalNewThisMonth, setTotalNewThisMonth] = useState("");

  const [adminName, setAdminName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [admins, setAdmins] = useState([]);
  const [filteredAdmins, setFilteredAdmins] = useState([]);
  const [searchedAdmin, setSearchedAdmin] = useState("");

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchedUser, setSearchedUser] = useState("");

  async function getUsersStats() {
    const { data, error } = await supabase
      .from("User")
      .select("role, last_login, created_at");

    if (error) {
      console.log("error fetching users stats", error.message);
      return;
    }

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    let totalUsers = data.length;

    let totalAdmins = data.filter(u => u.role === "admin").length;

    let totalActiveUsers = data.filter(u => {
      if (!u.last_login) return false;
      const last = new Date(u.last_login);
      const diffDays = (now - last) / (1000 * 60 * 60 * 24);
      return diffDays <= 7; // active in last 7 days
    }).length;

    let totalNewThisMonth = data.filter(u => {
      const created = new Date(u.created_at);
      return (
        created.getMonth() === thisMonth &&
        created.getFullYear() === thisYear
      );
    }).length;

    setTotalUsers(totalUsers);
    setTotalAdmins(totalAdmins);
    setTotalActiveUsers(totalActiveUsers);
    setTotalNewThisMonth(totalNewThisMonth);
  }

  async function createAdmin() {
    if (!adminName.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!adminEmail.trim()) {
      toast.error("Email is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      toast.error("Invalid email format");
      return;
    }

    if (!adminPassword.trim()) {
      toast.error("Password is required");
      return;
    }

    if (adminPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (adminPhone && adminPhone.length < 8) {
      toast.error("Phone must be at least 8 characters");
      return;
    }

    if (adminPhone && adminPhone.trim() !== "") {
      const phoneRegex = /^[0-9+\s-]{6,20}$/;
      if (!phoneRegex.test(adminPhone)) {
        toast.error("Invalid phone number");
        return;
      }
    }

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        toast.error("You must be logged in as admin");
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          data: {
            display_name: adminName,
            phone: adminPhone || null,
          },
        },
      });

      if (authError?.message === "User already registered") {
        return toast.error("Admin already exists");
      }
      if (authError) throw authError;

      const authUser = authData.user;
      if (!authUser) throw new Error("User creation failed");

      const { error: dbError } = await supabase.from("User").insert([
        {
          name: adminName,
          email: adminEmail,
          phone: adminPhone || null,
          role: "admin",
          auth_id: authUser.id,
        },
      ]);

      if (dbError) throw dbError;

      await supabase.auth.signOut();

      await supabase.auth.setSession({
        access_token: currentSession.access_token,
        refresh_token: currentSession.refresh_token,
      });

      toast.success("Admin added successfully to verify and use account check your email!");
      getUsersStats();
      setAdminName("");
      setAdminEmail("");
      setAdminPhone("");
      setAdminPassword("");
      getAdmins();

    } catch (error) {
      console.error("Error creating admin:", error.message);
      toast.error("Failed to create admin");
    }
  };

  async function clearAdminFields() {
    setAdminName("");
    setAdminPhone("");
    setAdminEmail("");
    setAdminPassword("");
  }

  
  async function getAdmins() {
    const { data, error } = await supabase
      .from("User")
      .select("*")
      .eq("role", "admin");

    if (error) {
      console.error("Error fetching admins:", error.message);
      setAdmins([]);
      return;
    }

    setAdmins(data || []);
    setFilteredAdmins(data || []);
  }

  async function getUsers() {
    const { data, error } = await supabase
      .from("User")
      .select("*")
      .eq("role", "regular");

    if (error) {
      console.error("Error fetching users:", error.message);
      setAdmins([]);
      return;
    }

    setUsers(data || []);
    setFilteredUsers(data || []);
  }

  async function deleteUser(userId) {
    try {
      const { data: userTrips } = await supabase
        .from("Trip")
        .select("trip_id")
        .eq("user_id", userId);

      const tripIds = userTrips?.map((t) => t.trip_id) ?? [];

      await supabase.from("Favorite_Place").delete().eq("user_id", userId);
      await supabase.from("Favorite_Service").delete().eq("user_id", userId);
      await supabase.from("Place_Review").delete().eq("user_id", userId);
      await supabase.from("Service_Review").delete().eq("user_id", userId);
      await supabase.from("Notification").delete().eq("user_id", userId);

      if (tripIds.length > 0) {
        await supabase.from("Trip_Places").delete().in("trip_id", tripIds);
        await supabase.from("Trip_Services").delete().in("trip_id", tripIds);
        await supabase.from("Trip").delete().in("trip_id", tripIds);
      }

      await supabase.from("Place").update({ created_by: null }).eq("created_by", userId);
      await supabase.from("Service").update({ created_by: null }).eq("created_by", userId);

      const { error } = await supabase
        .from("User")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("User deleted successfully");
      getUsers();
      getAdmins();
      getUsersStats();

    } catch (err) {
      console.error(err);
      toast.error("Failed to delete user");
    }
  }

  useEffect(() => {
    getUsersStats();
    getAdmins();
    getUsers();
  }, []);

  useEffect(() => {
    setFilteredAdmins(admins.filter((admin) =>
      admin.name.toLowerCase().includes(searchedAdmin.toLowerCase())
    ))
  }, [searchedAdmin, admins])

  useEffect(() => {
    setFilteredUsers(users.filter((user) =>
      user.name.toLowerCase().includes(searchedUser.toLowerCase())
    ))
  }, [searchedUser, users])

  return (
    <div className="manage-users-page">

      <h5 className="fw-bold text-dark mb-2 text-center">
        Users Insights
      </h5>
      <div className="d-flex flex-wrap gap-3 justify-content-center justify-content-lg-between align-items-stretch">
        <div className="card bg-card border-0 shadow-sm p-3 flex-fill text-center rounded-5">
          <div className="d-flex flex-column align-items-center gap-2">
            <span className="bi bi-people-fill fs-3 text-primary"></span>
            <h6 className="text-muted mb-0">Total Users</h6>
            <h4 className="fw-bold mb-0">{totalUsers}</h4>
          </div>
        </div>

        <div className="card bg-card border-0 shadow-sm p-3 flex-fill text-center rounded-5">
          <div className="d-flex flex-column align-items-center gap-2">
            <span className="bi bi-person-badge-fill fs-3 text-success"></span>
            <h6 className="text-muted mb-0">Admins</h6>
            <h4 className="fw-bold mb-0">{totalAdmins}</h4>
          </div>
        </div>

        <div className="card bg-card border-0 shadow-sm p-3 flex-fill text-center rounded-5">
          <div className="d-flex flex-column align-items-center gap-2">
            <span className="bi bi-person-check-fill fs-3 text-success"></span>
            <h6 className="text-muted mb-0">Active Users</h6>
            <h4 className="fw-bold mb-0">{totalActiveUsers}</h4>
          </div>
        </div>

        <div className="card bg-card border-0 shadow-sm p-3 flex-fill text-center rounded-5">
          <div className="d-flex flex-column align-items-center gap-2">
            <span className="bi bi-graph-up-arrow fs-3 text-warning"></span>
            <h6 className="text-muted mb-0">New This Month</h6>
            <h4 className="fw-bold mb-0">{totalNewThisMonth}</h4>
          </div>
        </div>
      </div>

      <div className="bg-card mt-3 rounded-5 text-center p-4 d-flex flex-column align-items-center">
        <h5 className="text-success mb-4 fw-bold">Create New Admin</h5>

        <div className="row g-3 justify-content-center">
          <div className="col-12 col-md-6 col-lg-3">
            <input type="text" className="form-control text-center" placeholder="Full name"
              value={adminName} onChange={(e) => setAdminName(e.target.value)}
            />
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <input type="email" className="form-control text-center" placeholder="Email"
              value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)}
            />
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <input type="text" className="form-control text-center" placeholder="Phone"
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
              value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)}
            />
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <input type="password" className="form-control text-center" placeholder="Password"
              value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-5 note-pill mt-3 d-flex align-items-center justify-content-center py-3 px-2 gap-2">
          <i className="bi bi-exclamation-triangle"></i>
          <span className="text-danger">Admins have full dashboard permissions. Assign this role carefully.</span>
        </div>

        <div className="d-flex gap-2 justify-content-center mt-3">
          <button type="button" className="btn btn-primary" onClick={() => createAdmin()}>Add admin</button>
          <button className="btn text-muted px-3 border" onClick={() => clearAdminFields()}>Clear</button>
        </div>

      </div>

      <div className="bg-card mt-3 rounded-5 text-center p-4">
        <div className="d-flex justify-content-between align-items-center px-5 gap-1">
          <h4 className="text-success">Adminstrators</h4>
          <span className="position-relative d-block">
            <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
            <input
              type="text"
              className="form-control ps-5"
              placeholder="Search admins"
              value={searchedAdmin}
              onChange={(e) => { setSearchedAdmin(e.target.value) }}
            />
          </span>
        </div>

        <div className="table-responsive mt-3">
          <table className="table table-hover align-middle text-center">
            <thead className="table-light">
              <tr>
                <th>Profile</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Created At</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredAdmins.map((admin) => (
                <tr key={admin.user_id}>
                  <td>
                    <img
                      src={admin.profile_pic || "public/default_profile.jpg"}
                      alt="profile"
                      className="rounded-circle"
                      width="40"
                      height="40"
                      style={{ objectFit: "cover" }}
                    />
                  </td>
                  <td>{admin.name}</td>
                  <td>{admin.email}</td>
                  <td>{admin.phone || "-"}</td>
                  <td>
                    {new Date(admin.created_at).toLocaleDateString("en-GB")}
                  </td>
                  <td>
                    {new Date(admin.last_login).toLocaleDateString("en-GB")}
                  </td>
                  <td>
                    <button className="btn btn-danger"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete admin!?")) {
                          deleteUser(admin.user_id);
                        }
                      }}
                    >Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>

          <div className="text-muted small text-center mt-2">
            <p className="text-muted">Showing {filteredAdmins.length} of {admins.length} admins</p>
          </div>
        </div>
      </div>

      {/*users */}
      <div className="bg-card mt-3 rounded-5 text-center p-4">
        <div className="d-flex justify-content-between align-items-center px-5 gap-1">
          <h4 className="text-success">Regular Users</h4>
          <span className="position-relative d-block">
            <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
            <input
              type="text"
              className="form-control ps-5"
              placeholder="Search users"
              value={searchedUser}
              onChange={(e) => { setSearchedUser(e.target.value) }}
            />
          </span>
        </div>

        <div className="table-responsive mt-3">
          <table className="table table-hover align-middle text-center">
            <thead className="table-light">
              <tr>
                <th>Profile</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Created At</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.user_id}>
                  <td>
                    <img
                      src={user.profile_pic || "public/default_profile.jpg"}
                      alt="profile"
                      className="rounded-circle"
                      width="40"
                      height="40"
                      style={{ objectFit: "cover" }}
                    />
                  </td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone || "-"}</td>
                  <td>
                    {new Date(user.created_at).toLocaleDateString("en-GB")}
                  </td>
                  <td>
                    {new Date(user.last_login).toLocaleDateString("en-GB")}
                  </td>
                  <td>
                    <button className="btn btn-danger"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete user!?")) {
                          deleteUser(user.user_id);
                        }
                      }}
                    >Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>

          <div className="text-muted small text-center mt-2">
            <p className="text-muted">Showing {filteredUsers.length} of {users.length} users</p>
          </div>
        </div>

      </div>

    </div>

  );
}
export default ManageUsers;