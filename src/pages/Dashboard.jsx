import { useContext, useEffect, useState } from "react";
import { UserContext } from "../contexts/UserContext";
import { supabase } from "../supabase-client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

function Dashboard() {
    const navigate = useNavigate();
    const { user, loading } = useContext(UserContext);
    const [platformStats, setPlatformStats] = useState({
        totalUsers: "",
        percentageNewUsers: "",
        totalPlaces: "",
        percentageNewPlaces: "",
        totalServices: "",
        percentageNewServices: "",
        totalPendings: "",
        PendingState: "",
    });

    const [favorite_places, setFavoritePlaces] = useState([]);
    const [favorite_services, setFavoriteServices] = useState([]);

    const [monthlyUsersData, setMonthlyUsersData] = useState([]);

    const [peakMonth, setPeakMonth] = useState(null);
    const [avgUsers, setAvgUsers] = useState(0);
    const [growthPercent, setGrowthPercent] = useState(0);

    const [places, setPlaces] = useState([]);
    const [placePieData, setPlacePieData] = useState([])

    const [services, setServices] = useState([]);
    const [serviceChartData, setServiceChartData] = useState([]);

    const [pendingPlaces, setPendingPlaces] = useState([]);
    const [pendingServices, setPendingServices] = useState([]);

    async function getPlatformOverViewStats() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        // run all queries in parallel
        const [
            { data: users, error: usersError },
            { data: new_users, error: newUsersError },
            { data: places, error: placesError },
            { data: new_places, error: newPlacesError },
            { data: services, error: servicesError },
            { data: new_services, error: newServicesError },
            { data: placePendings },
            { data: servicePendings }
        ] = await Promise.all([
            supabase.from("User").select("user_id"),
            supabase
                .from("User")
                .select("user_id")
                .gte("created_at", startOfMonth.toISOString())
                .lt("created_at", startOfNextMonth.toISOString()),

            supabase.from("Place").select("place_id").eq("status", "approved"),
            supabase
                .from("Place")
                .select("place_id")
                .eq("status", "approved")
                .gte("created_at", startOfMonth.toISOString())
                .lt("created_at", startOfNextMonth.toISOString()),

            supabase.from("Service").select("service_id").eq("status", "approved"),
            supabase
                .from("Service")
                .select("service_id")
                .eq("status", "approved")
                .gte("created_at", startOfMonth.toISOString())
                .lt("created_at", startOfNextMonth.toISOString()),

            supabase.from("Place").select("place_id").eq("status", "pending"),
            supabase.from("Service").select("service_id").eq("status", "pending"),
        ]);

        if (usersError || newUsersError || placesError || newPlacesError || servicesError || newServicesError) {
            throw new Error("Error fetching stats");
        }

        const users_count = users?.length || 0;
        const new_users_count = new_users?.length || 0;

        const places_count = places?.length || 0;
        const new_places_count = new_places?.length || 0;

        const services_count = services?.length || 0;
        const new_services_count = new_services?.length || 0;

        const perc_new_users =
            users_count === 0 ? "0" : ((new_users_count / users_count) * 100).toFixed(2);

        const perc_new_places =
            places_count === 0 ? "0" : ((new_places_count / places_count) * 100).toFixed(2);

        const perc_new_services =
            services_count === 0 ? "0" : ((new_services_count / services_count) * 100).toFixed(2);

        const pendings =
            (placePendings?.length || 0) + (servicePendings?.length || 0);

        const pending_status =
            pendings < 20
                ? "Normal, review before they are stacked"
                : "Urgent, review now!";

        setPlatformStats({
            totalUsers: users_count.toString(),
            percentageNewUsers: perc_new_users,
            totalPlaces: places_count.toString(),
            percentageNewPlaces: perc_new_places,
            totalServices: services_count.toString(),
            percentageNewServices: perc_new_services,
            totalPendings: pendings.toString(),
            PendingState: pending_status,
        });
    }

    async function getTopFavoritePlaces() {
        //It loops through all favourite records(favs)
        //For each place_id, it counts how many times it appears
        //Stores results in countMap like: { placeId: numberOfLikes }
        //So you end up with how many users favorited each place

        const { data: favs, error: favError } = await supabase
            .from('Favorite_Place')
            .select('place_id');

        if (favError) {
            console.error('Error fetching favourites:', favError);
            return;
        }

        if (!favs || favs.length === 0) {
            setFavoritePlaces([]);
            return;
        }

        // Count favourites per place (How many users favorited each place)
        const countMap = {};
        favs.forEach(({ place_id }) => {
            countMap[place_id] = (countMap[place_id] || 0) + 1;
        });

        // Get top 5 place_ids by favourite count
        const topPlaceIds = Object.entries(countMap) //converts object into array
            .sort(([, a], [, b]) => b - a) //sorts places by highest favorites first
            .slice(0, 5)
            .map(([id]) => parseInt(id, 10)); //10 : decimal system

        const { data: places, error: placeError } = await supabase
            .from('Place')
            .select(`
                    place_id,
                    type,
                    name,
                    town,
                    governorate,
                    Place_Review ( rating )
                    `)
            .in('place_id', topPlaceIds);

        if (placeError) {
            console.error('Error fetching places:', placeError);
            return;
        }

        // Combine counts and compute average ratings
        const result = (places || []).map((place) => {
            const id = place.place_id;
            const reviews = place.Place_Review || [];
            const avgRating =
                reviews.length === 0
                    ? 0
                    : (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);

            return {
                place,
                favorites: countMap[id],
                avgRating,
            };
        });

        //descending
        result.sort((a, b) => b.favorites - a.favorites);

        setFavoritePlaces(result);
    }

    async function getTopFavoriteServices() {

        const { data: favs, error: favError } = await supabase
            .from('Favorite_Service')
            .select('service_id');

        if (favError) {
            console.error('Error fetching favourites:', favError);
            return;
        }

        if (!favs || favs.length === 0) {
            setFavoritePlaces([]);
            return;
        }

        const countMap = {};
        favs.forEach(({ service_id }) => {
            countMap[service_id] = (countMap[service_id] || 0) + 1;
        });

        const topServiceIds = Object.entries(countMap) //converts object into array
            .sort(([, a], [, b]) => b - a) //sorts places by highest favorites first
            .slice(0, 5)
            .map(([id]) => parseInt(id, 10)); //10 : decimal system

        const { data: services, error: serviceError } = await supabase
            .from('Service')
            .select(`
                    service_id,
                    type,
                    name,
                    town,
                    governorate,
                    Service_Review ( rating )
                    `)
            .in('service_id', topServiceIds);

        if (serviceError) {
            console.error('Error fetching services:', serviceError);
            return;
        }

        // Combine counts and compute average ratings
        const result = (services || []).map((service) => {
            const id = service.service_id;
            const reviews = service.Service_Review || [];
            const avgRating =
                reviews.length === 0
                    ? 0
                    : (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);

            return {
                service,
                favorites: countMap[id],
                avgRating,
            };
        });

        //descending
        result.sort((a, b) => b.favorites - a.favorites);

        setFavoriteServices(result);
    }

    async function fetchUsersCreateData() {
        const { data, error } = await supabase.from("User")
            .select("created_at")
        if (error) {
            throw new Error(error.message);
        }
        buildMonthlyUsersData(data);
        getUserMonthStats();
    }

    function buildMonthlyUsersData(data) {
        const currentYear = new Date().getFullYear();

        const months = [
            { month: "Jan", users: 0 },
            { month: "Feb", users: 0 },
            { month: "Mar", users: 0 },
            { month: "Apr", users: 0 },
            { month: "May", users: 0 },
            { month: "Jun", users: 0 },
            { month: "Jul", users: 0 },
            { month: "Aug", users: 0 },
            { month: "Sep", users: 0 },
            { month: "Oct", users: 0 },
            { month: "Nov", users: 0 },
            { month: "Dec", users: 0 },
        ];

        data.forEach(user => {
            const date = new Date(user.created_at);

            if (date.getFullYear() === currentYear) {
                const monthIndex = date.getMonth();
                months[monthIndex].users += 1;
            }
        });

        setMonthlyUsersData(months);
    }

    function getUserMonthStats() {

        if (!monthlyUsersData || monthlyUsersData.length === 0) return;

        // Peak month
        let peak = monthlyUsersData[0];

        // Total for average
        let total = 0;

        for (let i = 0; i < monthlyUsersData.length; i++) {
            const item = monthlyUsersData[i];

            total += item.users;

            if (item.users > peak.users) {
                peak = item;
            }
        }

        setPeakMonth(peak);
        // Average
        setAvgUsers(Math.round(total / monthlyUsersData.length));

        // Growth (current month vs previous month)
        const currentMonthIndex = new Date().getMonth();

        if (currentMonthIndex > 0) {
            const current = monthlyUsersData[currentMonthIndex].users;
            const prev = monthlyUsersData[currentMonthIndex - 1].users;
            const growth =
                prev === 0 ? 0 : ((current - prev) / prev) * 100;

            setGrowthPercent(Number(growth.toFixed(1)));
        } else {
            setGrowthPercent(0);
        }
    }

    async function fetchPlaces() {
        const { data, error } = await supabase
            .from("Place")
            .select("type");

        if (error) {
            console.error(error);
            return;
        }

        setPlaces(data);
        buildPlacePieData(data);
    }

    function buildPlacePieData(data) {
        if (!data || data.length === 0) return;

        const counts = {};

        // count each category
        data.forEach(place => {
            const type = place.type || "Unknown";

            counts[type] = (counts[type] || 0) + 1;
        });

        const total = Object.values(counts).reduce((sum, val) => sum + val, 0);

        const pieData = Object.keys(counts).map(key => ({
            name: key,
            value: counts[key],
            percent: total === 0 ? 0 : ((counts[key] / total) * 100).toFixed(1)
        }));

        setPlacePieData(pieData);
    }

    async function fetchServices() {
        const { data, error } = await supabase
            .from("Service")
            .select("type");

        if (error) {
            console.error(error);
            return;
        }

        setServices(data);
        buildServiceChartData(data);
    }

    function buildServiceChartData(data) {
        if (!data || data.length === 0) return;

        const counts = {};

        // count each category
        data.forEach(service => {
            const type = service.type || "Unknown";

            counts[type] = (counts[type] || 0) + 1;
        });

        const total = Object.values(counts).reduce((sum, val) => sum + val, 0);

        const ChartData = Object.keys(counts).map(key => ({
            name: key,
            value: counts[key],
            percent: total === 0 ? 0 : ((counts[key] / total) * 100).toFixed(1)
        }));

        setServiceChartData(ChartData);
    }

    async function fetchPendingPlacesDetails() {
        const { data, error } = await supabase.from('Place').select('*, User:created_by(name)')
            .eq('status', "pending");
        if (error) {
            console.error("Error fetching place details:", error);
            return;
        } else {
            setPendingPlaces(data);
        }
    }

    async function fetchPendingServicesDetails() {
        const { data, error } = await supabase.from('Service').select('*, User:created_by(name)')
            .eq('status', "pending");
        if (error) {
            console.error("Error fetching service details:", error);
            return;
        } else {
            setPendingServices(data);
        }
    }

    async function acceptPlace(id) {
        const { error } = await supabase.from("Place")
            .update({ status: "approved" })
            .eq("place_id", id)
        if (error) {
            toast.error("failed to accept request!");
            return;
        }
        toast.success("request approved successfully!");
        fetchPlaces();
        fetchPendingPlacesDetails();
        getPlatformOverViewStats();
    }

    async function deletePlace(id) {
        if (!window.confirm("Are you sure you want to delete this place request? This action cannot be undone.")) {
            return;
        }

        // get images first
        const { data, error: fetchError } = await supabase
            .from("Place_Image")
            .select("url")
            .eq("place_id", id);

        if (fetchError) {
            console.error(fetchError);
            return;
        }

        const paths = (data || []).map(img => {
            return decodeURIComponent(
                img.url.split("/storage/v1/object/public/places/")[1]
            );
        });

        // 2. delete storage files
        const { error: storageError } = await supabase.storage
            .from("places")
            .remove(paths);

        if (storageError) {
            console.error("Storage delete failed:", storageError);
            return;
        }

        // 3. delete DB AFTER
        const { error } = await supabase.rpc("delete_place", {
            p_id: id,
        });

        if (error) {
            console.error("DB delete failed:", error);
            return;
        }
        toast.success("request rejected successfully!");
        fetchPlaces();
        fetchPendingPlacesDetails();
        getPlatformOverViewStats();
    }

    async function acceptService(id) {
        const { error } = await supabase.from("Service")
            .update({ status: "approved" })
            .eq("service_id", id)
        if (error) {
            toast.error("failed to accept request!");
            return;
        }
        toast.success("request approved successfully!");
        fetchServices();
        fetchPendingServicesDetails();
        getPlatformOverViewStats();
    }

    async function deleteService(id) {
        if (!window.confirm("Are you sure you want to delete this service request? This action cannot be undone."))
            return;

        const { data, error: fetchError } = await supabase
            .from("Service_Image")
            .select("url")
            .eq("service_id", id);
        if (fetchError) {
            console.error(fetchError);
            return;
        }
        const paths = (data || []).map(img => {
            return decodeURIComponent(img.url.split("/storage/v1/object/public/services/")[1]);
        });
        if (paths.length > 0) {
            const { error: storageError } = await supabase.storage.from("services").remove(paths);
            if (storageError) {
                console.error("Storage delete failed:", storageError);
                return;
            }
        }

        await supabase.from("Service_Image").delete().eq("service_id", id);
        await supabase.from("Favorite_Service").delete().eq("service_id", id);
        await supabase.from("Service_Review").delete().eq("service_id", id);
        await supabase.from("Place_Service").delete().eq("service_id", id);

        const { error } = await supabase.from("Service").delete().eq("service_id", id);
        if (error) {
            console.error("DB delete failed:", error);
            return;
        }
        toast.success("request rejected successfully!");
        fetchServices();
        fetchPendingServicesDetails();
        getPlatformOverViewStats();
    }

    async function exportReport() {
        const wb = new ExcelJS.Workbook(); //Creates an Excel file in memory

        // Color palette to use them in my excel
        const DARK_GREEN = { argb: "1a2e1a" };
        const MID_GREEN = { argb: "2e5233" };
        const LIGHT_GREEN = { argb: "e8f5e9" };
        const AMBER = { argb: "d4894a" };
        const PALE_AMBER = { argb: "fff3e0" };
        const GOLD = { argb: "ffd4af37" };
        const SILVER = { argb: "f5f5f5" };
        const BRONZE = { argb: "fbe9e7" };
        const WHITE = { argb: "ffffff" };

        // apply fill to every cell in a row ─
        const fillRow = (row, color, bold = false) => {
            row.eachCell(cell => {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: color };
                if (bold) cell.font = { bold: true, color: WHITE };
            });
        };

        // apply zebra stripes on even rows 
        const zebra = (row, idx, color = LIGHT_GREEN) => {
            if (idx % 2 === 0) fillRow(row, color);
        };

        // style the first row as a title (big header)
        const addTitle = (ws, text, mergeRange, fillColor) => {
            ws.addRow([text]);
            ws.mergeCells(mergeRange);
            const cell = ws.getCell(mergeRange.split(":")[0]);
            cell.font = { size: 16, bold: true, color: WHITE };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: fillColor };
            cell.alignment = { horizontal: "left", indent: 1 };
            ws.getRow(1).height = 32;
        };

        // style a header row
        const addHeader = (ws, headers, fillColor) => {
            const row = ws.addRow(headers);
            row.eachCell(cell => {
                cell.font = { bold: true, color: WHITE };
                cell.fill = { type: "pattern", pattern: "solid", fgColor: fillColor };
            });
        };

        //sheet 1 (overview)
        const ws1 = wb.addWorksheet("Overview");
        ws1.getColumn(1).width = 30;
        ws1.getColumn(2).width = 25;

        addTitle(ws1, "DAHERNI PLATFORM REPORT", "A1:B1", DARK_GREEN);
        ws1.addRow([]); // spacer
        addHeader(ws1, ["Metric", "Value"], MID_GREEN);

        const overviewRows = [
            ["Total Users", platformStats.totalUsers],
            ["New Users This Month (%)", platformStats.percentageNewUsers + "%"],
            ["Total Places", platformStats.totalPlaces],
            ["New Places This Month (%)", platformStats.percentageNewPlaces + "%"],
            ["Total Services", platformStats.totalServices],
            ["New Services This Month (%)", platformStats.percentageNewServices + "%"],
            ["Total Pending", platformStats.totalPendings],
            ["Pending Status", platformStats.PendingState],
        ];
        overviewRows.forEach((rd, i) => {
            const row = ws1.addRow(rd);
            zebra(row, i, LIGHT_GREEN);
        });

        //sheet 2 user growth / month
        const ws2 = wb.addWorksheet("Users Growth");
        ws2.getColumn(1).width = 16;
        ws2.getColumn(2).width = 18;

        addTitle(ws2, "USERS JOINED PER MONTH", "A1:B1", DARK_GREEN);
        ws2.addRow([]);
        addHeader(ws2, ["Month", "Users Joined"], MID_GREEN);

        const maxUsers = Math.max(...monthlyUsersData.map(m => m.users));
        monthlyUsersData.forEach((m, i) => {
            const row = ws2.addRow([m.month, m.users]);
            if (m.users === maxUsers) {
                fillRow(row, AMBER, true);    // peak month with different color
            } else {
                zebra(row, i, LIGHT_GREEN);
            }
        });

        //sheet 3 top fav places
        const ws3 = wb.addWorksheet("Top Places");
        ws3.columns = [
            { width: 5 }, { width: 28 }, { width: 16 },
            { width: 16 }, { width: 18 }, { width: 12 }, { width: 12 }
        ];

        addTitle(ws3, "TOP FAVORITE PLACES", "A1:G1", DARK_GREEN);
        ws3.addRow([]);
        addHeader(ws3, ["#", "Place Name", "Type", "Town", "Governorate", "Favorites", "Avg Rating"], MID_GREEN);

        favorite_places.forEach((item, i) => {
            const row = ws3.addRow([
                i + 1,
                item.place?.name,
                item.place?.type,
                item.place?.town,
                item.place?.governorate,
                item.favorites,
                item.avgRating,
            ]);
            if (i === 0) fillRow(row, GOLD, true);       //top 3 rankings under each others
            else if (i === 1) fillRow(row, SILVER);
            else if (i === 2) fillRow(row, BRONZE);
            else zebra(row, i, LIGHT_GREEN);
        });

        //sheet 4 top services
        const ws4 = wb.addWorksheet("Top Services");
        ws4.columns = ws3.columns; //same as places

        addTitle(ws4, "TOP FAVORITE SERVICES", "A1:G1", AMBER);
        ws4.addRow([]);
        addHeader(ws4, ["#", "Service Name", "Type", "Town", "Governorate", "Favorites", "Avg Rating"], AMBER);

        favorite_services.forEach((item, i) => {
            const row = ws4.addRow([
                i + 1,
                item.service?.name,
                item.service?.type,
                item.service?.town,
                item.service?.governorate,
                item.favorites,
                item.avgRating,
            ]);
            if (i === 0) fillRow(row, GOLD, true);
            else if (i === 1) fillRow(row, SILVER);
            else if (i === 2) fillRow(row, BRONZE);
            else zebra(row, i, PALE_AMBER);
        });

        //sheet 5 top place categories
        const ws5 = wb.addWorksheet("Place Categories");
        ws5.getColumn(1).width = 24;
        ws5.getColumn(2).width = 14;
        ws5.getColumn(3).width = 16;

        addTitle(ws5, "PLACE CATEGORY DISTRIBUTION", "A1:C1", DARK_GREEN);
        ws5.addRow([]);
        addHeader(ws5, ["Category", "Count", "Percentage"], MID_GREEN);

        placePieData.forEach((p, i) => {
            const row = ws5.addRow([p.name, p.value, p.percent + "%"]);
            zebra(row, i, LIGHT_GREEN);
        });

        //sheet 6 top service categories
        const ws6 = wb.addWorksheet("Service Categories");
        ws6.getColumn(1).width = 24;
        ws6.getColumn(2).width = 14;
        ws6.getColumn(3).width = 16;

        addTitle(ws6, "SERVICE CATEGORY DISTRIBUTION", "A1:C1", AMBER);
        ws6.addRow([]);
        addHeader(ws6, ["Category", "Count", "Percentage"], AMBER);

        serviceChartData.forEach((s, i) => {
            const row = ws6.addRow([s.name, s.value, s.percent + "%"]);
            zebra(row, i, PALE_AMBER);
        });

        // sheet 7 pending places
        const ws7 = wb.addWorksheet("Pending Places");
        ws7.getColumn(1).width = 26;
        ws7.getColumn(2).width = 16;
        ws7.getColumn(3).width = 20;
        ws7.getColumn(4).width = 16;

        addTitle(ws7, "PENDING PLACE REQUESTS", "A1:D1", DARK_GREEN);
        ws7.addRow([]);
        addHeader(ws7, ["Place Name", "Type", "Submitted By", "Date"], MID_GREEN);

        pendingPlaces.forEach((p, i) => {
            const row = ws7.addRow([
                p.name,
                p.type,
                p.User?.name || "Unknown",
                new Date(p.created_at).toLocaleDateString(),
            ]);
            zebra(row, i, LIGHT_GREEN);
        });

        //sheet 8 pending services
        const ws8 = wb.addWorksheet("Pending Services");
        ws8.getColumn(1).width = 26;
        ws8.getColumn(2).width = 16;
        ws8.getColumn(3).width = 20;
        ws8.getColumn(4).width = 16;

        addTitle(ws8, "PENDING SERVICE REQUESTS", "A1:D1", AMBER);
        ws8.addRow([]);
        addHeader(ws8, ["Service Name", "Type", "Submitted By", "Date"], AMBER);

        pendingServices.forEach((s, i) => {
            const row = ws8.addRow([
                s.name,
                s.type,
                s.User?.name || "Unknown",
                new Date(s.created_at).toLocaleDateString(),
            ]);
            zebra(row, i, PALE_AMBER);
        });

        //make my excel downloadable
        const buffer = await wb.xlsx.writeBuffer();
        const date = new Date().toISOString().split("T")[0];
        saveAs(new Blob([buffer], { type: "application/octet-stream" }), `Daherni_Report_${date}.xlsx`);
    }
    useEffect(() => {

        getPlatformOverViewStats();
        getTopFavoritePlaces();
        getTopFavoriteServices();
        fetchUsersCreateData();
        fetchPlaces();
        fetchServices();
        fetchPendingPlacesDetails();
        fetchPendingServicesDetails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        getUserMonthStats();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [monthlyUsersData]);

    useEffect(() => {
        const updateLastLogin = async () => {
            if (!user) return;
            const { error } = await supabase
                .from("User")
                .update({ last_login: new Date().toISOString() })
                .eq("auth_id", user.id)
                .select();

            if (error) {
                console.error("Last login update error:", error.message);
            }
        };
        updateLastLogin();
    }, [user]);

    if (loading) return <p>Loading...</p>;

    return (
        <div className="dashboard px-4">
            <h3 className="d-flex gap-2 align-items-center"><i className="bi bi-gear-fill small"></i>
                <span>Admin Dashboard</span>
            </h3>

            <h6 className="text-success gap-3 d-flex px-2"><i className="bi bi-calendar"></i>
                <span className="fw-bold">
                    {new Date().toLocaleDateString("en-GB", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                    }).replace(/^(\w+)\s/, "$1, ")}
                </span>
            </h6>

            <h6 className="text-success gap-2 d-flex px-2 mt-4"><i className="bi bi-bar-chart-fill"></i>
                <span className="fw-bold">Platform overview</span></h6>

            <div className="container-fluid px-0">
                <div className="row g-3">
                    <div className="col-12 col-md-6 col-lg-3">
                        <div className="card border-0 shadow-sm rounded-4 p-4 bg-card h-100">
                            <div className="d-flex align-items-center justify-content-between">
                                <div>
                                    <h6 className="text-muted mb-1">Total Users</h6>
                                    <h4 className="fw-bold mb-1">{platformStats.totalUsers}</h4>
                                    <small className="text-success">+{platformStats.percentageNewUsers}% this month</small>
                                </div>
                                <i className="bi bi-people-fill fs-1 text-primary"></i>
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-md-6 col-lg-3">
                        <div className="card border-0 shadow-sm rounded-4 p-4 bg-card h-100">
                            <div className="d-flex align-items-center justify-content-between">
                                <div>
                                    <h6 className="text-muted mb-1">Total Places</h6>
                                    <h4 className="fw-bold mb-1">{platformStats.totalPlaces}</h4>
                                    <small className="text-success">+{platformStats.percentageNewPlaces}% this month</small>
                                </div>
                                <i className="bi bi-geo-alt-fill fs-1 text-success"></i>
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-md-6 col-lg-3">
                        <div className="card border-0 shadow-sm rounded-4 p-4 bg-card h-100">
                            <div className="d-flex align-items-center justify-content-between">
                                <div>
                                    <h6 className="text-muted mb-1">Total Services</h6>
                                    <h4 className="fw-bold mb-1">{platformStats.totalServices}</h4>
                                    <small className="text-success">+{platformStats.percentageNewServices}% this month</small>
                                </div>
                                <i className="bi bi-briefcase-fill fs-1 text-warning"></i>
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-md-6 col-lg-3">
                        <div className="card border-0 shadow-sm rounded-4 p-4 bg-card h-100">
                            <div className="d-flex align-items-center justify-content-between">
                                <div>
                                    <h6 className="text-muted mb-1">Pending Requests</h6>
                                    <h4 className="fw-bold mb-1">{platformStats.totalPendings}</h4>
                                    {platformStats.PendingState.charAt(0) === "N" ?
                                        (<small className="text-success">Normal, review before they are stacked</small>) :
                                        (<small className="text-danger">Urgent, review now!</small>)}
                                </div>
                                <i className="bi bi-hourglass-split fs-1 text-danger"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <span className="text-success d-flex gap-1 mt-3 fw-bold px-2">
                <i className="bi bi-heart-fill"></i> Top Favorites</span>

            <div className="container-fluid px-0 mt-2">
                <div className="row g-3">
                    <div className="col-12 col-md-4 col-lg-6">
                        <div className="card border-0 shadow-sm rounded-4 p-4 bg-card h-100">
                            <div className="d-flex justify-content-between">
                                <div className="d-flex flex-column">
                                    <span>
                                        <h4 className="mb-0"><i className="bi bi-geo-alt-fill text-success small"></i>Top 5 Favorite Places</h4>
                                        <small className="text-success">All time favorites by users</small>
                                    </span>
                                </div>
                                <span className="badge rounded-pill bg-success small d-flex align-items-center px-4 fs-6">Places</span>
                            </div>
                            <div className="table-responsive mt-3">
                                <table className="table table-hover align-middle text-center table-success" style={{ minHeight: "437px" }}>
                                    <thead >
                                        <tr>
                                            <th>#</th>
                                            <th>Place</th>
                                            <th>Type</th>
                                            <th>Town</th>
                                            <th>Governorate</th>
                                            <th>Saves</th>
                                            <th>Rating</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {favorite_places.map((item) => (
                                            <tr key={item.place.place_id}
                                                style={{ cursor: "pointer" }}
                                                onClick={() => navigate(`/places/${item.place.place_id}`)}
                                            >
                                                <td>{item.place.place_id}</td>
                                                <td>{item.place.name}</td>
                                                <td>{item.place.type || "-"}</td>
                                                <td>{item.place.town}</td>
                                                <td>{item.place.governorate}</td>
                                                <td>{item.favorites}</td>
                                                <td className="">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <i
                                                            key={star}
                                                            className={
                                                                star <= Math.round(item.avgRating)
                                                                    ? "bi bi-star-fill text-warning"
                                                                    : "bi bi-star text-muted"
                                                            }
                                                        ></i>
                                                    ))}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-md-4 col-lg-6">
                        <div className="card border-0 shadow-sm rounded-4 p-4 bg-card h-100">
                            <div className="d-flex justify-content-between">
                                <div className="d-flex flex-column">
                                    <span>
                                        <h4 className="mb-0"><i className="bi bi-briefcase-fill text-warning small"></i>Top 5 Favorite Services</h4>
                                        <small className="text-success">All time favorites by users</small>
                                    </span>
                                </div>
                                <span className="badge rounded-pill bg-accent small d-flex align-items-center px-4 fs-6">Services</span>
                            </div>
                            <div className="table-responsive mt-3">
                                <table className="table table-hover align-middle text-center table-success">
                                    <thead >
                                        <tr>
                                            <th>#</th>
                                            <th>Place</th>
                                            <th>Type</th>
                                            <th>Town</th>
                                            <th>Governorate</th>
                                            <th>Saves</th>
                                            <th>Rating</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {favorite_services.map((item) => (
                                            <tr key={item.service.service_id}
                                                style={{ cursor: "pointer" }}
                                                onClick={() => navigate(`/services/${item.service.service_id}`)}
                                            >
                                                <td>{item.service.service_id}</td>
                                                <td>{item.service.name}</td>
                                                <td>{item.service.type || "-"}</td>
                                                <td>{item.service.town}</td>
                                                <td>{item.service.governorate}</td>
                                                <td>{item.favorites}</td>
                                                <td className="">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <i
                                                            key={star}
                                                            className={
                                                                star <= Math.round(item.avgRating)
                                                                    ? "bi bi-star-fill text-warning"
                                                                    : "bi bi-star text-muted"
                                                            }
                                                        ></i>
                                                    ))}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <span className="text-success d-flex gap-1 mt-3 fw-bold px-2">
                <i className="bi bi-graph-up"></i> Analytics and Insights</span>

            <div className="container-fluid px-0 mt-2">
                <div className="row g-3">
                    <div className="col-md-4 px-0">
                        <div className="card shadow-sm h-100 p-2 bg-card">
                            <div className="d-flex h-100">
                                <div className="flex-grow-1">

                                    <div className="mb-2">
                                        <h5 className="mb-1"><i className="bi bi-person-fill text-primary"></i>Users Joined Per Month</h5>
                                        <small className="text-success">Jan–Dec {new Date().getFullYear().toString()} - Total {monthlyUsersData.reduce((sum, m) => sum + m.users, 0)}</small>
                                        <span className={`badge ms-2 ${growthPercent > 0 ? 'bg-success' : growthPercent < 0 ? 'bg-danger' : 'bg-secondary'}`}>{growthPercent > 0 ? '+' : ''}{growthPercent.toString()}% this month</span>
                                    </div>
                                    <hr />
                                    <div className="mt-5">
                                        <ResponsiveContainer width="99%" height={180}>
                                            <BarChart data={monthlyUsersData}>
                                                <XAxis dataKey="month" type="category" interval={1} tick={{ dx: 10 }} />
                                                <YAxis />
                                                <Tooltip />
                                                <Bar dataKey="users" fill="#0d6efd" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                            <hr className="mb-2" />
                            <div className="ms-3 d-flex justify-content-evenly gap-4">
                                <div>
                                    <div className="fw-bold text-primary">Peak Month</div>
                                    <small>{peakMonth?.month} – {peakMonth?.users} users</small>
                                </div>

                                <div>
                                    <div className="fw-bold text-success">Avg / Month</div>
                                    <small>{avgUsers?.toString()} users</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-4">
                        <div className="card shadow-sm h-100 d-flex flex-column p-2 bg-card">
                            <h5><i className="bi bi-geo-alt-fill text-success"></i>Place Categories</h5>
                            <h6 className="text-success"><small>Distribution among {places.length} places</small></h6>
                            <hr />
                            <div className="row align-items-center">
                                <div className="col-7 mt-4">
                                    <ResponsiveContainer width="100%" height={250}>
                                        <PieChart>
                                            <Pie
                                                data={placePieData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={85}
                                                innerRadius={55}
                                                paddingAngle={3}
                                                label={false}
                                            >
                                                {placePieData.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={`hsl(${(index * 137.508) % 360}, 70%, 50%)`}
                                                        stroke="#fff"
                                                        strokeWidth={2}
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value, name) => [`${value}`, `${name}`]}
                                                contentStyle={{
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                                    fontSize: '13px'
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="col-5">
                                    {placePieData.map((item, index) => (
                                        <div
                                            key={index}
                                            className="d-flex align-items-center gap-2 mb-2"
                                        >
                                            <span
                                                className="d-inline-block"
                                                style={{
                                                    width: 12,
                                                    height: 12,
                                                    borderRadius: '4px',
                                                    backgroundColor: `hsl(${(index * 137.508) % 360}, 70%, 50%)`,
                                                    flexShrink: 0
                                                }}
                                            />
                                            <div className="d-flex justify-content-between flex-grow-1">
                                                <span className="small text-dark fw-medium text-truncate" style={{ maxWidth: '100px' }}>
                                                    {item.name}
                                                </span>
                                                <span className="small fw-bold text-muted ms-2">
                                                    {item.percent}%
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-4">
                        <div className="card shadow-sm h-100 d-flex flex-column p-2 bg-card">
                            <h5><i className="bi bi-briefcase-fill text-warning"></i> Service Categories</h5>
                            <h6 className="text-success"><small>Distribution among {services.length} services</small></h6>
                            <hr className="mt-2 mb-3" />
                            <div className="flex-grow-1 overflow-auto">
                                {serviceChartData
                                    .sort((a, b) => b.value - a.value)
                                    .map((item, idx) => (
                                        <div key={idx} className="mb-3">
                                            <div className="d-flex justify-content-between mb-1">
                                                <span className="fw-semibold text-truncate me-2" style={{ fontSize: "0.8rem" }}>
                                                    <i className="bi bi-tag-fill me-1" style={{ color: `hsl(${(idx * 137.508) % 360}, 70%, 50%)` }}></i>
                                                    {item.name}
                                                </span>
                                                <span className="text-muted small flex-shrink-0">{item.value} services ({item.percent}%)</span>
                                            </div>
                                            <div className="progress" style={{ height: "5px" }}>
                                                <div
                                                    className="progress-bar"
                                                    role="progressbar"
                                                    style={{
                                                        width: `${item.percent}%`,
                                                        backgroundColor: `hsl(${(idx * 137.508) % 360}, 70%, 50%)`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <h6 className=" gap-2 d-flex px-2 mt-4"><i className="bi bi-exclamation-triangle-fill text-warning"></i>
                <span className="fw-bold text-warning">Approval requests {platformStats.PendingState.charAt(0) === "N" ?
                    (<small className="bg-warning badge">{platformStats.totalPendings} Pending</small>) :
                    (<small className="bg-danger badge">{platformStats.totalPendings} Pending</small>)}</span></h6>
            <div className="container-fluid px-0 mt-2">
                <div className="row g-3">
                    <div className="col-12 col-md-4 col-lg-6">
                        <div className="card border-0 shadow-sm rounded-4 p-4 bg-card h-75">
                            <div className="d-flex justify-content-between">
                                <div className="d-flex flex-column">
                                    <span>
                                        <h4 className="mb-0"><i className="bi bi-geo-alt-fill text-success small"></i>Pending Place Requests</h4>
                                        <small className="text-success px-2"> Awaiting admin review & approval</small>
                                    </span>
                                </div>
                                <span className="badge rounded-pill bg-success small d-flex align-items-center px-4 fs-6">{pendingPlaces.length} pendings</span>
                            </div>

                            {pendingPlaces.length == 0 ? (<div className="text-center text-muted mt-5">no pendings</div>) : (<div className="table-responsive h-75 mb-5 mt-2"
                                style={{ maxHeight: "400px", minHeight: "200px", overflowY: "auto" }}
                            >
                                <table className="table table-hover align-middle text-center table-success">
                                    <thead >
                                        <tr>
                                            <th>Place</th>
                                            <th>Type</th>
                                            <th>Submitted_by</th>
                                            <th>Date</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingPlaces.map((item) => (
                                            <tr key={item.place_id}>
                                                <td>{item.name}</td>

                                                <td>
                                                    <span className="badge bg-primary">
                                                        {item.type || "-"}
                                                    </span>
                                                </td>

                                                <td>{item.User?.name || "Unknown"}</td>

                                                <td>
                                                    {new Date(item.created_at).toLocaleDateString()}
                                                </td>

                                                <td>
                                                    <div className="d-flex justify-content-center gap-2">

                                                        <button className="btn btn-success btn-sm"
                                                            onClick={() => { acceptPlace(item.place_id) }}
                                                        >
                                                            <i className="bi bi-check-circle-fill"></i>
                                                        </button>

                                                        <button className="btn btn-danger btn-sm"
                                                            onClick={() => { deletePlace(item.place_id) }}
                                                        >
                                                            <i className="bi bi-x-circle-fill"></i>
                                                        </button>

                                                        <button className="btn btn-secondary btn-sm"
                                                            onClick={() => navigate(`/places/${item.place_id}`)}
                                                        >
                                                            <i className="bi bi-eye-fill"></i>
                                                        </button>

                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>)}

                        </div>
                    </div>

                    <div className="col-12 col-md-4 col-lg-6">
                        <div className="card border-0 shadow-sm rounded-4 p-4 bg-card h-75 mb-5">
                            <div className="d-flex justify-content-between">
                                <div className="d-flex flex-column">
                                    <span>
                                        <h4 className="mb-0"><i className="bi bi-briefcase-fill text-warning small"></i> Pending Service Requests</h4>
                                        <small className="text-success">Awaiting admin review & approval</small>
                                    </span>
                                </div>
                                <span className="badge rounded-pill bg-accent small d-flex align-items-center px-4 fs-6">{pendingServices.length} pendings</span>
                            </div>
                            {pendingServices.length == 0 ? (<div className="text-center text-muted mt-5">no pendings</div>) : (<div className="table-responsive mt-3 h-75 overflow-auto"
                                style={{ maxHeight: "400px", minHeight: "200px", overflowY: "auto" }}>
                                <table className="table table-hover align-middle text-center table-success">
                                    <thead >
                                        <tr>
                                            <th>Service</th>
                                            <th>Type</th>
                                            <th>Submitted_by</th>
                                            <th>Date</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingServices.map((item) => (
                                            <tr key={item.service_id} >
                                                <td>{item.name}</td>

                                                <td>
                                                    <span className="badge bg-primary">
                                                        {item.type || "-"}
                                                    </span>
                                                </td>

                                                <td>{item.User?.name || "Unknown"}</td>

                                                <td>
                                                    {new Date(item.created_at).toLocaleDateString()}
                                                </td>

                                                <td>
                                                    <div className="d-flex justify-content-center gap-2">

                                                        <button className="btn btn-success btn-sm"
                                                            onClick={() => acceptService(item.service_id)}
                                                        >
                                                            <i className="bi bi-check-circle-fill"></i>
                                                        </button>

                                                        <button className="btn btn-danger btn-sm"
                                                            onClick={() => deleteService(item.service_id)}
                                                        >
                                                            <i className="bi bi-x-circle-fill"></i>
                                                        </button>

                                                        <button className="btn btn-secondary btn-sm"
                                                            onClick={() => navigate(`/services/${item.service_id}`)}
                                                        >
                                                            <i className="bi bi-eye-fill"></i>
                                                        </button>

                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                            </div>)}

                        </div>
                    </div>
                </div>

                <div className="mb-4">
                    <h6 className="text-success fw-semibold mb-3">
                        <i className="bi bi-download me-1"></i> Export & Reports
                    </h6>

                    <div className="card export-card border-0 rounded-4 p-4 p-lg-5 text-white">
                        <div className="row align-items-center g-4">
                            <div className="col-12 col-md-8">

                                <div className="d-flex align-items-center gap-3 mb-3">
                                    <div className="export-icon rounded-3 d-flex align-items-center justify-content-center fs-4">
                                        📊
                                    </div>

                                    <div>
                                        <div className="text-white-50 small fw-semibold text-uppercase">
                                            Platform Report
                                        </div>
                                        <h5 className="mb-0 fw-semibold">
                                            Export Full Platform Report
                                        </h5>
                                    </div>
                                </div>

                                <p className="text-white-50 mb-3 export-desc">
                                    Downloads a complete Excel workbook with 8 sheets covering all platform data
                                    — users, places, services, favorites, categories, and pending requests.
                                </p>

                                <div className="d-flex flex-wrap gap-2">
                                    {[
                                        { icon: "bi-bar-chart-fill", label: "Summary" },
                                        { icon: "bi-people-fill", label: "Users" },
                                        { icon: "bi-geo-alt-fill", label: "Top Places" },
                                        { icon: "bi-briefcase-fill", label: "Top Services" },
                                        { icon: "bi-pie-chart-fill", label: "Categories" },
                                        { icon: "bi-hourglass-split", label: "Pendings" },
                                    ].map(tag => (
                                        <span
                                            key={tag.label}
                                            className="badge export-badge d-flex align-items-center gap-1 px-3 py-2 rounded-pill"
                                        >
                                            <i className={`bi ${tag.icon}`}></i> {tag.label}
                                        </span>
                                    ))}
                                </div>

                            </div>

                            <div className="col-12 col-md-4 d-flex flex-column align-items-md-end gap-2">

                                <button
                                    className="btn export-btn fw-semibold d-flex align-items-center gap-2 px-4 py-3 rounded-3"
                                    onClick={exportReport}
                                >
                                    <i className="bi bi-file-earmark-excel-fill"></i>
                                    Export as Excel
                                </button>

                                <small className="text-white-50 export-footer">
                                    <i className="bi bi-clock me-1"></i>
                                    Generated on export · .xlsx format
                                </small>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;