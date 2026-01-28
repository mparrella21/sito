
/*
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";


// IMPORTANTE: Nominatim richiede che tu identifichi la tua app.
// Cambia questa stringa con il nome del tuo progetto reale.
const HEADERS = {
    "User-Agent": "ProgettoUniversitario_Segnalazioni/1.0 (unisa)"
};

/**
 * 1. REVERSE GEOCODING (Da Lat/Lng a Indirizzo)
 * /
export const getAddressFromCoordinates = async (lat, lng) => {

    try {
        const url = `${NOMINATIM_BASE_URL}/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;

        const response = await fetch(url, { headers: HEADERS });
        if (!response.ok) throw new Error("Errore Nominatim");

        const data = await response.json();

        // Ritorniamo l'indirizzo formattato (o un messaggio di fallback)
        return data.display_name || "Indirizzo sconosciuto";
    } catch (error) {
        console.warn("Errore recupero indirizzo:", error);
        return "Posizione selezionata (Indirizzo non disponibile)";
    }
};

/**
 * 2. SEARCH / FORWARD GEOCODING (Da Testo a Coordinate)
 * /
export const searchLocation = async (query) => {
    if (!query || query.length < 3) return null;

    try {
        // Cerchiamo solo in Italia (&countrycodes=it) e limitiamo a 1 risultato
        const url = `${NOMINATIM_BASE_URL}/search?q=${encodeURIComponent(query)}&format=jsonv2&limit=1&countrycodes=it`;

        const response = await fetch(url, { headers: HEADERS });
        const data = await response.json();

        if (data && data.length > 0) {
            console.log(data)
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                displayName: data[0].display_name
            };
        }
        return null; // Nessun risultato
    } catch (error) {
        console.error("Errore ricerca:", error);
        return null;
    }
};


*/

// Sostituire nominatiom con photon

// Usiamo l'API di Photon (Komoot) che è basata su OSM ma è CORS-friendly e più veloce
const API_URL = "https://photon.komoot.io";

/**
 * 1. REVERSE GEOCODING (Da Lat/Lng a Indirizzo)
 */
export const getAddressFromCoordinates = async (lat, lng) => {
    try {
        // Photon vuole 'lon' invece di 'lng'
        const url = `${API_URL}/reverse?lon=${lng}&lat=${lat}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error("Errore Photon API");

        const data = await response.json();

        // Photon restituisce una FeatureCollection GeoJSON
        if (data.features && data.features.length > 0) {
            const props = data.features[0].properties;

            // Costruiamo una stringa leggibile (Photon separa i campi)
            // Es: "Via Roma, Napoli, Campania, Italia"
            const addressParts = [
                props.street,
                props.housenumber,
                props.city || props.town || props.village, // Cerca città o paese
                props.state
            ].filter(Boolean); // Rimuove i valori null/undefined

            return addressParts.join(", ") || props.name || "Indirizzo trovato";
        }

        return "Indirizzo sconosciuto";
    } catch (error) {
        console.warn("Errore recupero indirizzo:", error);
        return "Posizione selezionata";
    }
};

/**
 * 2. SEARCH (Da Testo a Coordinate)
 */
export const searchLocation = async (query) => {
    if (!query || query.length < 3) return null;

    try {
        // lang=it forza i risultati in italiano se disponibili
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
        return null; // Nessun risultato
    } catch (error) {
        console.error("Errore ricerca:", error);
        return null;
    }
};


