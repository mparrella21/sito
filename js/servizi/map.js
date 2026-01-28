
import { getAllTickets } from "./ticket.js";



// *********************************** Variabili iniziali ********************************************
let lat_start = 41.9028;
let long_start = 12.4964;
let zoom_start = 6;


let rawGeoData = null;
let currentGeoLayer = null;

let ticketsLayerGroup = null;

const URLFile_Comuni = '../img/limits_IT_municipalities.geojson';



// ************************************************************************************************
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

    // Aggiunta dei marker per ogni ticket
    await loadTicketMarker(params);

    // Aggiunta dei bordi ai comuni
    await loadComuniBoundaries(params);
}


// ************************************************************************************************
// Funzione per caricare i marker dei ticket
const loadTicketMarker = async (params) => {
    if (ticketsLayerGroup) {
        ticketsLayerGroup.clearLayers();
    }

    const tickets = await getAllTickets();

    // Ciclo per inserire i marker
    tickets.forEach(ticket => {

        if (params && typeof params.filtroTicket === 'function') {
            // Eseguiamo la funzione esterna passando le proprietà del ticket
            if (!params.filtroTicket(ticket)) {
                return;
            }

        }


        const marker = L.marker([ticket.lat, ticket.lon]);
        marker.addTo(ticketsLayerGroup);

        // ---------------------------------------> DA SISTEMARE, sia colore marker sia  schermata dettaglio
        marker.bindPopup(`<b>Dettaglio:</b><br>${ticket.info}`);




    });
}



// ************************************************************************************************
// Funzione per caricare i bordi dei comuni
const loadComuniBoundaries = async (params) => {

    // Se ci sono già dei bordi li rimuoviamo prima di caricarli
    if (currentGeoLayer) {
        window.map.removeLayer(currentGeoLayer);
    }


    try {

        // Se non abbiamo mai caricato i dati dal file li carichiamo
        if (!rawGeoData) {
            const response = await fetch(URLFile_Comuni);
            rawGeoData = await response.json();
        }


        // Assegniamo il layer alla variabile
        currentGeoLayer = L.geoJSON(rawGeoData, {

            // Filtro dei comuni da mostrare
            filter: (feature) => {

                // Controllo se ci è stata passata una funzione di filtro personalizzata
                if (params && typeof params.filtroComuni === 'function') {
                    // Eseguiamo la funzione esterna passando le proprietà del comune
                    return params.filtroComuni(feature.properties);
                }

                // Default: Nascondi tutto
                return false;
            },


            // Definiamo lo stile di base
            style: (feature) => {

                let css = "stile-comune-base";

                // DA SISTEMARE ----------------------> Aggiungere stile, da modificare con la richiesta al db poi
                if (feature.properties.name === 'Salerno') {
                    css += ' stile-proprio-comune';
                }


                return {
                    className: css
                };
            },

            onEachFeature: (feature, layer) => {

                if (feature.properties?.name) {
                    layer.bindPopup(feature.properties.name);
                }

                layer.on({
                    mouseover: (e) => {
                        e.target.bringToFront();
                    },

                    mouseout: (e) => {

                    },

                    click: (e) => {
                        window.map.fitBounds(e.target.getBounds());
                    }
                });
            }

        }).addTo(window.map);

    } catch (error) {
        console.error("Errore GeoJSON:", error);
    }
};




// ************************************************************************************************
// Funzione per inizializzare la mappa (viene inserita nell'elemento con l'id "map")
export const moveMap = async (lat, lng) => {

    if (window.map) {

        window.map.flyTo([lat, lng]);
    }

}











/*
--------------------------------COSA MOSTRARE CLICK SUL TICKET --------------------------------------
tickets.forEach(ticket => {
    const marker = L.marker([ticket.lat, ticket.lon]).addTo(map);

    // Gestiamo il click sul marker
    marker.on('click', () => {
        // Opzione A: Reindirizzamento tramite il tuo router
        // Supponendo che il tuo router gestisca gli URL:
        window.history.pushState({}, "", `/ticket/${ticket.id}`);
        
        // Qui dovresti chiamare la funzione del tuo router 
        // che carica il contenuto del ticket nel <main id="app">
        caricaPaginaTicket(ticket.id); 
    });
});
--------------------------------------------------
marker.bindPopup(`
    <b>Ticket #${ticket.id}</b><br>
    ${ticket.info}<br>
    <a href="/ticket/${ticket.id}" data-link>Visualizza dettagli</a>
`);
--------------------------------------------------



*/


/*
------------------------COME GESTIRE IL COLORE -----------------------
const redIcon = L.icon({
    iconUrl: 'js/images/marker-red.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
});

// Uso dell'icona
L.marker([lat, lon], {icon: redIcon}).addTo(map);
---------------------------------------------------------
const markerHtmlStyles = `
  background-color: #ff5733; // Colore dinamico qui
    width: 2rem;
    height: 2rem;
    display: block;
    left: -1rem;
    top: -1rem;
    position: relative;
    border - radius: 2rem 2rem 0;
    transform: rotate(45deg);
    border: 1px solid #FFFFFF`;

const icon = L.divIcon({
  className: "my-custom-pin",
  iconAnchor: [0, 24],
  labelAnchor: [-6, 0],
  popupAnchor: [0, -36],
  html: `< span style = "${markerHtmlStyles}" />`
});

L.marker([lat, lon], {icon: icon}).addTo(map);


*/
