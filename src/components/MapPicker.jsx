import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { useState, useEffect } from "react";

function MapPicker({ setPosition, initialPosition = null }) {
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    });

    const [selected, setSelected] = useState(initialPosition);
    const center = initialPosition || { lat: 33.8547, lng: 35.8623 };

    useEffect(() => {
        if (initialPosition) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSelected(initialPosition);
            setPosition(initialPosition);
        }
    }, [initialPosition, setPosition]);

    if (!isLoaded) return <p>Loading map...</p>;

    const handleMapClick = (e) => {
        const pos = {
            lat: e.latLng.lat(),
            lng: e.latLng.lng(),
        };
        setSelected(pos);
        setPosition(pos);
    };

    const handleMarkerDragEnd = (e) => {
        const pos = {
            lat: e.latLng.lat(),
            lng: e.latLng.lng(),
        };
        setSelected(pos);
        setPosition(pos);
    };

    return (
        <GoogleMap
            center={center}
            zoom={10}
            mapContainerStyle={{ width: "100%", height: "300px" }}
            onClick={handleMapClick}
            options={{
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
            }}
        >
            {selected && (
                <Marker
                    position={selected}
                    draggable={true}
                    onDragEnd={handleMarkerDragEnd}
                />
            )}
        </GoogleMap>
    );
}

export default MapPicker;