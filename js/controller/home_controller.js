import { initMap, moveMap } from '../servizi/map.js';
import { openModal } from '../modal_manager.js';
import { searchLocation } from '../servizi/nominatim.js';



// *********************************** Inizzializzatore home ********************************************
export const initHome = async () => {

    // 1) Iniziallizza ricerca
    initSearchHandler();

    // 2) Button per accesso
    const btnLogin = document.getElementById('btn-open-login');
    if (btnLogin) {
        btnLogin.addEventListener('click', () => {
            openModal("auth", true);
        });
    }

    const btnRegister = document.getElementById('btn-open-register');
    if (btnRegister) {
        btnRegister.addEventListener('click', () => {
            openModal("auth", false);
        });
    }

    // 3) Carichiamo la mappa
    initMap({
        centro: { // MEDIA DELLA POSIZIONE DEI TICKET --> bordo solo delle province di quella regione
            lat: 41.9028,
            long: 12.4964,
            zoom: 10
        },
        filtroTicket: (ticket) => true,
        filtroComuni: (prop) => prop.name === 'Salerno' // false // 
    });



    // 4) Gestione zone se utente loggato o meno


    // gestioneAutorizzazione();









    // ******************* PER ORA MOSTRA TUTTO 
    setupDropdown();
    setUpAddTicket();


};



// ZONA DA SITEMARE
// *******************************************************************************
// Funzione che gestisce costra mostare in base a se l'utente è loggato o no
const gestioneAutorizzazione = () => {
    const container = document.getElementById('user-auth-zone');
    if (user) {

        // Gestisce icone e menu a tendina utente
        setupDropdown();

        // Mostra e attiva pulsante aggiungi ticket
        setUpAddTicket();


    } else {
        // Muovi la mappa! (Usa window.map direttamente o crea una funzione in map.js)
        if (window.map) {
            // flyTo fa un'animazione fluida invece di scattare
            //window.map.flyTo([result.lat, result.lng], 16); // 16 è lo zoom level (vicino)
        }


    }

};

// *******************************************************************************// *******************************************************************************// *******************************************************************************// *******************************************************************************// *******************************************************************************// *******************************************************************************// *******************************************************************************// *******************************************************************************

// SOTTO OK












// *******************************************************************************
// Funzione di inizializzazione ricerca 
const initSearchHandler = () => {
    const searchInput = document.getElementById('map-search');
    const searchBtn = document.getElementById('btn-search');

    if (!searchInput) return;

    // Funzione che esegue la ricerca
    const performSearch = async () => {
        const query = searchInput.value;
        if (!query) return;

        // Feedback visivo 
        searchBtn.style.opacity = "0.5";

        const result = await searchLocation(query);

        searchBtn.style.opacity = "1";

        if (result) {
            console.log("Trovato:", result);


            moveMap(result.lat, result.lng);

        } else {
            alert("Luogo non trovato. Prova a essere più specifico.");
        }
    };

    // Evento Click Bottone
    searchBtn.addEventListener('click', performSearch);

    // Evento Tasto Invio
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
};


// *******************************************************************************
// Funzione per gestire apertura/chiusura tendina utente loggato
const setupDropdown = () => {
    const btn = document.getElementById('user-menu-btn');
    const menu = document.getElementById('contenuto-tendina-utente');

    // Toggle menu al click
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('open');
        btn.classList.toggle('attivo');
    });

    // Chiudi se clicchi fuori
    document.addEventListener('click', (e) => {
        if (!btn.contains(e.target) && !menu.contains(e.target)) {
            menu.classList.remove('open');
            btn.classList.remove('attivo');
        }
    });
};


// *******************************************************************************
// Funzione per gestire apertura/chiusura tendina utente loggato
const setUpAddTicket = () => {

    const btnAddTicket = document.getElementById('btn-add-ticket');
    if (btnAddTicket) {

        btnAddTicket.classList.add('attiva');
        btnAddTicket.addEventListener('click', async () => {

            try {
                // 1) Proviamo a prendere la posizione GPS
                const position = await getPosition();

                // CASO A: SUCCESSO GPS
                // Apriamo il modale passando le coordinate
                openModal('ticket', {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });

            } catch (error) {
                // CASO B: FALLIMENTO GPS (O RIFIUTO UTENTE)
                console.warn("GPS non disponibile o negato:", error.message);

                // Avvisiamo l'utente e attiviamo la selezione manuale
                alert("Impossibile rilevare la tua posizione. Clicca un punto sulla mappa per segnalare il problema.");

                enableMapPickingMode();
            }
        });
    }

}



// *******************************************************************************
// Funzione per mettere la Geolocation API in una Promise 
const getPosition = () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocalizzazione non supportata"));
        } else {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        }
    });
};

// Funzione per attivare la modalità "Clicca sulla mappa"
const enableMapPickingMode = () => {
    const mapDiv = document.getElementById('map');

    // 1) Cambia il cursore per far capire che è cliccabile
    mapDiv.classList.add('picking-mode');

    // 2) Aggiungi un listener "usa e getta" sulla mappa
    window.map.once('click', (e) => {
        openModal('ticket', { lat: e.latlng.lat, lng: e.latlng.lng });
        mapDiv.classList.remove('picking-mode');
    });

}