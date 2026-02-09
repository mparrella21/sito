

// Usiamo l'API di Photon (Komoot) 
const API_URL = "https://photon.komoot.io";

/**
 * 1) REVERSE GEOCODING (Da Lat/Lng a Indirizzo)
 */
export const getAddressFromCoordinates = async (lat, lng) => {
    try {

        const url = `${API_URL}/reverse?lon=${lng}&lat=${lat}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error("Errore Photon API");

        const data = await response.json();

        // Photon restituisce una FeatureCollection GeoJSON
        if (data.features && data.features.length > 0) {
            const props = data.features[0].properties;

            // Costruiamo una stringa leggibile 
            const addressParts = [
                props.street,
                props.housenumber,
                props.city || props.town || props.village,
                props.state
            ].filter(Boolean);

            return addressParts.join(", ") || props.name || "Indirizzo trovato";
        }

        return "Indirizzo sconosciuto";
    } catch (error) {
        console.warn("Errore recupero indirizzo:", error);
        return "Posizione selezionata";
    }
};

/**
 * 2) SEARCH (Da Testo a Coordinate)
 */
export const searchLocation = async (query) => {
    if (!query || query.length < 3) return null;

    try {
        const url = API_URL + "/api/?q=" + encodeURIComponent(query) + "&limit=1";

        const response = await fetch(url);
        const data = await response.json();

        if (data.features && data.features.length > 0) {
            const feature = data.features[0];

            return {
                // GeoJSON mette PRIMA la longitudine, POI la latitudine [lon, lat]
                lat: feature.geometry.coordinates[1],
                lng: feature.geometry.coordinates[0],

                // Formattiamo il nome per mostrarlo all'utente
                displayName: [
                    feature.properties.name,
                    feature.properties.city,
                    feature.properties.state
                ].filter(Boolean).join(", ")
            };
        }
        return null;
    } catch (error) {
        console.error("Errore ricerca:", error);
        return null;
    }
};


