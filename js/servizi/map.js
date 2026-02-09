
import { getAllState } from "./api/ticket.js";
import { getCurrentUser, getTenantId, isAdmin } from "./api/autenticazione.js";
import { getTenant, searchTenant } from "./api/tenant.js";
import { renderError } from "../controller/errorTemplate_controller.js";




// =========================================================================
// Variabili  
// =========================================================================


let lat_start = 41.9028;
let long_start = 12.4964;
let zoom_start = 6;


let tickets = null;
let boundaries = null;

let currentGeoLayer = null;

let ticketsLayerGroup = null;



const DEFAULT_MARKER_SVG = `
<svg viewBox="0 0 25 41" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <path class="pin-body" d="M12.5 0C5.596 0 0 5.596 0 12.5c0 1.886 0.543 3.652 1.484 5.156L12.5 41l11.016-23.344C24.457 16.152 25 14.386 25 12.5 25 5.596 19.404 0 12.5 0z" />
    
    <circle cx="12.5" cy="12.5" r="4" fill="#ffffff" />
</svg>
`;

// =========================================================================
// 1) INIZIALIZZZIONE MAPPA
// =========================================================================

// Funzione per inizializzare la mappa (viene inserita nell'elemento con l'id "map")
export const initMap = async (params) => {

    // Controlliamo se c'è l'elemento con id "map" che deve contenere la mappa
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;


    // Prendiamo parametri per il centro se forniti, altrimenti si usano quelli di default (centro italia)
    if (params?.centro) {
        lat_start = params.centro.lat || lat_start;
        long_start = params.centro.long || long_start;
        zoom_start = params.centro.zoom || zoom_start;
    }


    window.map = L.map('map').setView([lat_start, long_start], zoom_start);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(window.map);

    // Inizializziamo il gruppo dei marker e lo aggiungiamo alla mappa
    ticketsLayerGroup = L.layerGroup().addTo(window.map);



    if (params?.tickets) {
        tickets = params?.tickets;
        try {
            if (params?.filtroTicket)
                await loadTicketMarker(params);

        } catch {

        }
    }
    if (params?.boundaries) {
        boundaries = params?.boundaries;
        try {
            if (params?.filtroComuni)

                await loadComuniBoundaries(params);
        } catch {

        }
    }

}



// =========================================================================
// 2) GESTIONE TICKET 
// =========================================================================

// Funzione per caricare i marker dei ticket
export const loadTicketMarker = async (params = null) => {

    if (params?.tickets) tickets = params?.tickets;
    if (!tickets) return;

    if (ticketsLayerGroup) {
        ticketsLayerGroup.clearLayers();
    }

    if (!window.zoomListenerActive) {
        initZoomListener();
        window.zoomListenerActive = true;
    }

    try {

        let currentUser = null;
        let state = null;


        try {
            currentUser = await getCurrentUser();
        } catch {
        }
        try {
            state = await getAllState();
        } catch {

        }


        // Ciclo per inserire i marker
        tickets.forEach(async ticket => {


            if (params && typeof params.filtroTicket === 'function') {
                if (!await params.filtroTicket(ticket)) {
                    return;
                }

            }

            // 2) Determina la classe CSS per il colore
            let colorClass = 'Aperto';
            if (state) {
                colorClass = state[ticket.id_status].replace(/\s+/g, '') || 'Aperto';
            }

            if (currentUser && ticket.id_creator_user === currentUser.id) {
                colorClass = 'marker-mine';
            }

            // 3) Crea Icona SVG
            const customIcon = L.divIcon({
                // Combina la classe base + la classe colore
                className: `leaflet-default-icon-path`,
                html: `<div class="marker-scaler ${colorClass}">
              ${DEFAULT_MARKER_SVG}
           </div>`,

                // DIMENSIONI
                iconSize: [21.3, 35],
                iconAnchor: [10.5, 35],
                popupAnchor: [0, -28]
            });

            // 4) Crea Popup e Marker
            const popupContent = await createPopupContent(ticket);
            const marker = L.marker([ticket.lat, ticket.lon], { icon: customIcon });
            marker.addTo(ticketsLayerGroup);
            marker.bindPopup(popupContent);

        });

    } catch (error) {
        console.error("Errore caricamento ticket: ", error)
    }
}

// Funzione Helper per generare l'HTML del popup
async function createPopupContent(ticket) {
    // Formatta Data
    const dataCreazione = new Date(ticket.creation_date).toLocaleDateString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });

    // Formatta Categorie (Badge)
    const categorieHtml = ticket.categories && ticket.categories.length > 0
        ? ticket.categories.map(c => `<span>${c.label}</span>`).join('')
        : '<span>Nessuna categoria</span>';

    // Genera Link 
    let linkHref = `/ticket/${ticket.id}`;

    if (isAdmin()) {
        const tenant = await searchTenant(ticket.lat, ticket.lon);

        if (tenant?.tenant_id) {
            linkHref = `/${tenant.tenant_id}${linkHref}`;
        } else {
            renderError({ code: 404, title: "Errore ricerca tenant", message: "I ticket non possono essere caricati correttamente perchè non appartengono a nessun tenant" })
            return null
        }
    }


    return `
        <div class="ticket-popup-content">
            <h4 title="${ticket.title}">${ticket.title}</h4>
            <div class="ticket-popup-meta">
                📅 ${dataCreazione}
            </div>
            <div class="ticket-popup-cats">
                ${categorieHtml}
            </div>
            <a href="${linkHref}" data-link class="btn-popup-dettaglio">
                Vai al Ticket <i class="fas fa-arrow-right"></i>
            </a>
        </div>
    `;
}



export const initZoomListener = () => {
    const map = window.map;
    if (!map) return;

    const updateMarkerScale = () => {
        const zoom = map.getZoom();

        const maxZoom = 16; // Lo zoom dove il marker è grandezza naturale
        const minScale = 0.3; // Non scendere mai sotto il 30%

        // 0.08 è il fattore di riduzione
        let scale = 1 - ((maxZoom - zoom) * 0.08);

        // Limiti (Clamping)
        if (scale > 1) scale = 1;     // Mai più grande del 100%
        if (scale < minScale) scale = minScale; // Mai più piccolo del minimo

        // --- INIEZIONE NEL CSS ---
        map.getContainer().style.setProperty('--marker-scale', scale);

    };

    map.on('zoom', updateMarkerScale);

    // Eseguiamo subito all'avvio
    updateMarkerScale();
};


// =========================================================================
// 3) GESTIONE BORDI COMUNI
// =========================================================================

// Funzione per caricare i bordi dei comuni
export const loadComuniBoundaries = async (params = null) => {
    if (params?.boundaries) boundaries = params?.boundaries;
    if (!boundaries) return;


    // Se ci sono già dei bordi li rimuoviamo prima di caricarli
    if (currentGeoLayer) {
        window.map.removeLayer(currentGeoLayer);
    }


    try {
        const fullGeoJsonData = mapBoundariesToGeoJSON(boundaries);

        if (!fullGeoJsonData) {
            console.warn("Formato boundaries non valido");
            return;
        }

        let featuresToDraw = fullGeoJsonData.features;

        // Filtro comuni da disegnare
        if (params && typeof params.filtroComuni === 'function') {

            const filterResults = await Promise.all(
                fullGeoJsonData.features.map(async (feature) => {
                    return await params.filtroComuni(feature.properties);
                })
            );

            featuresToDraw = fullGeoJsonData.features.filter((_, index) => filterResults[index]);
        }

        // Se non è rimasto nulla, usciamo
        if (featuresToDraw.length === 0) return;

        // Creiamo il nuovo oggetto GeoJSON filtrato
        const filteredGeoJsonData = {
            ...fullGeoJsonData,
            features: featuresToDraw
        };


        let userTenantIstat_code;
        try {
            const tenantId = getTenantId();
            if (tenantId) {
                const tenantSession = await getTenant(tenantId);
                userTenantIstat_code = tenantSession?.istat_code;
            }


        } catch (e) { }

        // Assegniamo il layer alla variabile
        currentGeoLayer = L.geoJSON(filteredGeoJsonData, {


            // Definiamo lo stile di base
            style: (feature) => {

                let css = "stile-comune-base";

                if (userTenantIstat_code && feature.properties?.istat_code === userTenantIstat_code && !isAdmin()) {
                    css += ' stile-proprio-comune';
                }


                return {
                    className: css
                };
            },

            onEachFeature: (feature, layer) => {

                if (feature.properties?.name) {
                    layer.bindPopup(feature.properties.istat_code);
                }

                layer.on({
                    mouseover: (e) => {
                        e.target.bringToFront();
                    },

                    mouseout: (e) => {

                    },

                    click: (e) => {
                        const map = window.map;
                        if (!map) return;
                        const zoom = map.getZoom();

                        if (zoom < 12) {
                            map.fitBounds(e.target.getBounds());
                        }

                    }
                });
            }

        }).addTo(window.map);

        // 6. AUTO-CENTER 
        if (userTenantIstat_code && !isAdmin()) {

            // Cerchiamo il layer specifico del comune dell'utente
            currentGeoLayer.eachLayer((layer) => {

                if (layer.feature.properties.istat_code == userTenantIstat_code) {
                    // Zoommiamo direttamente sui confini di quel comune
                    window.map.fitBounds(layer.getBounds());

                }
            });
        }
    } catch (error) {
        console.error("Errore enerazione GeoJSON Layer:", error);
    }
};


// *** FUNZIONE HELPER PER LA MAPPATURA ***

const mapBoundariesToGeoJSON = (boundariesList) => {
    if (!Array.isArray(boundariesList)) return null;

    return {
        type: "FeatureCollection",
        features: boundariesList.map(item => ({
            type: "Feature",
            // Qui assegniamo la geometria che ti arriva dall'API
            geometry: item.geometry,
            // Tutto il resto lo mettiamo nelle properties (utile per i filtri e popup)
            properties: {
                istat_code: item.istat_code,
                ...(item.id && { id: item.id }),
                ...(item.label && { label: item.label }),
                ...(item.provincia_code && { provincia_code: item.provincia_code }),
                ...(item.provincia_label && { provincia_label: item.provincia_label }),
                ...(item.regione_code && { regione_code: item.regione_code }),
                ...(item.regione_label && { regione_label: item.regione_label })

            }
        }))
    };
};
// =========================================================================
// 4) FUNZIONI HELPER
// =========================================================================

// Funzione per inizializzare la mappa (viene inserita nell'elemento con l'id "map")
export const moveMap = async (lat, lng) => {

    if (window.map) {

        window.map.flyTo([lat, lng]);
    }

}

// Funzione per mettere la Geolocation API in una Promise 
export const getPosition = () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocalizzazione non supportata"));
        } else {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        }
    });
};


// Variabili "privata" del modulo per ricordarsi le funzioni attive
let pickingHandler = null;
let onRightClickHelper = null;

/**
 * ATTIVA la modalità selezione
 */
export const enableMapPickingMode = (operazione, annullamento = null) => {
    const mapDiv = document.getElementById('map');

    // 1) Sicurezza: Se c'era già una selezione attiva la eliminiamo
    disableMapPickingMode();

    // 2) Cambia cursore
    mapDiv.classList.add('picking-mode');

    // 3) Creiamo la funzione handler (
    pickingHandler = async (e) => {
        await operazione(e);
        disableMapPickingMode();
    };

    // 4) Attiviamo l'ascoltatore
    window.map.on('click', pickingHandler);


    // 5) Definiamo cosa succede al CLICK DESTRO (Annullamento)
    onRightClickHelper = async (e) => {
        // Impediamo che si apra il menu del browser (Ispeziona, Salva, ecc.)
        if (e.originalEvent) {
            e.originalEvent.preventDefault();
        }

        console.log("Selezione annullata dall'utente");

        if (annullamento) {
            await annullamento(e);
        }
        // Disattiviamo tutto senza chiamare la callback
        disableMapPickingMode();
    };

    // 6) Attiviamo l'ascoltatore per il tasto destro
    map.on('contextmenu', onRightClickHelper);




};

/**
 * DISATTIVA la modalità selezione (Annulla)
 */
export const disableMapPickingMode = () => {
    const mapDiv = document.getElementById('map');

    // 1) Rimuovi cursore
    if (mapDiv) mapDiv.classList.remove('picking-mode');

    // 2) Rimuovi l'ascoltatore se esiste
    if (pickingHandler) {
        window.map.off('click', pickingHandler);
        pickingHandler = null;
    }

    // 3) Rimuovi l'ascoltatore del CLICK DESTRO
    if (onRightClickHelper) {
        map.off('contextmenu', onRightClickHelper);
        onRightClickHelper = null;
    }
};

