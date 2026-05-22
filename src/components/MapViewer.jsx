import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";

function MapViewer({ place }) {
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    });

    if (!isLoaded) return <p>Loading map...</p>;
    if (!place?.latitude || !place?.longitude) return <p>No location available</p>;

    const position = {
        lat: Number(place.latitude),
        lng: Number(place.longitude),
    };

    const openInGoogleMaps = () => {
        window.open(
            `https://www.google.com/maps?q=${position.lat},${position.lng}`,
            "_blank"
        );
    };

    return (
        <GoogleMap
            center={position}
            zoom={13}
            mapContainerStyle={{ width: "100%", height: "300px" }}
            options={{
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
                draggable: false,
                clickableIcons: false,
            }}
            onClick={openInGoogleMaps}
        >
            <Marker position={position} onClick={openInGoogleMaps} />
        </GoogleMap>
    );
}
export default MapViewer;