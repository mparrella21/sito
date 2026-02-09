import { initMap, moveMap } from '../servizi/map.js';
import { searchLocation } from '../servizi/photon.js';

import { openModal } from '../modal_manager.js';
import { openSidebar, toggleSidebar } from '../sidebar_manager.js';

import { getCurrentUser, logout, isAdmin, getTenantId, setTenantId } from '../servizi/api/autenticazione.js';
import { getAllTickets, getAllTicketTenant } from '../servizi/api/ticket.js';
import { getAllBoundaries, getBoundaries, getTenant } from '../servizi/api/tenant.js';

import { navigateTo } from '../router.js';
import { applicaFormComune } from './FiltriMappa/FormComuni_controller.js';
import { applicaFormTicket } from './FiltriMappa/FormTicket_controller.js';
// *********************************** Inizzializzatore home ********************************************
export const initHome = async () => {

    // 1) Inizializza ricerca
    initSearchHandler();

    // 2) Inizializza titolo
    initTitleHome();


    // 3) Gestione zone se utente loggato o meno
    gestioneAutorizzazione();

    // 4) attivare sidebar con i filtri
    await openSidebar("filtriMappa")

    // 5) Inizializzazione mappa
    gestioneInizzializzazioneMappa();

};


// =========================================================================
// 1) GESTIONE TOPBAR
// =========================================================================

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
// Aggiungere nella home "Comune di ..."
const initTitleHome = async () => {
    const title = document.getElementById('titlePage');
    const btn = document.getElementById('btn-Comune');

    const tenantId = getTenantId();
    if (!tenantId) return


    const tenantSession = await getTenant(tenantId);

    if (title) {
        title.innerHTML = "Comune di " + tenantSession.label;
    }

    if (btn) {
        btn.addEventListener('click', cambiaComune);
    }


}

// Esempio funzione per il tasto "Esci dal Comune"
const cambiaComune = () => {
    // 1. Pulisce la sessione 
    setTenantId(null);

    // 2. Redirect alla selezione
    window.location.href = "/seleziona-comune";
};


// =========================================================================
// 2) GESTIONE MAPPA
// =========================================================================



// Funzione di inizializzazione mappa

const gestioneInizzializzazioneMappa = async () => {

    let tickets = [];
    let centro = {};
    let boundaries = [];


    if (isAdmin()) {
        tickets = await getAllTickets();
        boundaries = await getAllBoundaries()
        centro = {
            lat: 41.9028,
            long: 12.4964,
            zoom: 8
        };

        await initMap({
            centro: centro,
            tickets: tickets,
            boundaries: boundaries
        });

        applicaFormComune()



    } else {
        tickets = await getAllTicketTenant();
        boundaries.push(await getBoundaries());

        centro.zoom = 12;

        await initMap({
            centro: centro,
            tickets: tickets,
            boundaries: boundaries,
            filtroComuni: () => true
        });
    }

    applicaFormTicket();

}

// =========================================================================
// 3) GESTIONE ELEMENTI CHE RICHIEDONO L'AUTORIZZIONE
// =========================================================================


// Funzione che gestisce costra mostare in base a se l'utente è loggato o no
const gestioneAutorizzazione = async () => {

    const user = getCurrentUser();

    if (user) {

        document.getElementById('user-name-display').textContent = user.name;
        document.getElementById('user-role-display').textContent = user.role;


        // 1) Button logout 
        initButtonLogout();

        // 2) Gestisce icone e menu a tendina utente
        setupDropdown();

        // 3) Mostra e attiva pulsante aggiungi ticket
        setUpAddTicket();



    } else {
        // 1) Button per accesso
        initButtonLogin();

    }






};







// =========================================================================
// 4) Funzioni helper per setup autorizzazione
// =========================================================================

// Funzione di inizializzazione button gestione login 
const initButtonLogin = () => {
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

}
const initButtonLogout = () => {
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => logout());
    }
}

// Funzione per gestire apertura/chiusura tendina utente loggato
const setupDropdown = () => {
    const btn = document.getElementById('user-menu-btn');
    const menu = document.getElementById('contenuto-tendina-utente');

    if (!menu || !btn) return;


    // 1) Funzione che calcola la posizione della tendina
    const ricalcolaPosizione = () => {

        // Se il menu è chiuso, non calcolare nulla 
        if (!menu.classList.contains('open')) return;

        const rect = btn.getBoundingClientRect();

        // Larghezza menu
        const isSmallScreen = window.matchMedia('(max-width: 20rem)').matches;
        let menuWidth = isSmallScreen ? rect.width : rect.width * 1.2;
        menu.style.width = menuWidth + 'px';


        // Posizione Verticale 
        const topBar = document.querySelector('.topBar-Home');
        const topPosDefault = rect.bottom + rect.height * 0.1 + 'px';
        if (topBar) {
            const topBarRect = topBar.getBoundingClientRect();
            const isOverflowing = topBar.scrollHeight > topBar.clientHeight;

            menu.style.top = isOverflowing ? (topBarRect.bottom * 1.01) + 'px' : topPosDefault;
        } else {

            menu.style.top = topPosDefault;
        }

        // Posizione Orizzontale
        const spazioDaDestra = window.innerWidth - rect.right;
        menu.style.right = spazioDaDestra + 'px';
    };

    // 2) Funzione Toggle 
    const toggleMenu = () => {
        // Apri o Chiudi
        menu.classList.toggle('open');
        btn.classList.toggle('attivo');

        if (menu.classList.contains('open')) {
            // 1) Appena aperto, calcola subito la posizione
            ricalcolaPosizione();

            // 2) Se la finestra cambia, ricalcola pagina
            window.addEventListener('resize', ricalcolaPosizione);
            //window.addEventListener('scroll', ricalcolaPosizione);
        } else {
            // 3) Se chiudo, rimuovi ascoltatore
            window.removeEventListener('resize', ricalcolaPosizione);
            // window.removeEventListener('scroll', ricalcolaPosizione);
        }
    };

    // Assegna il click al bottone
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
    });

    //  Chiudi cliccando fuori
    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && !btn.contains(e.target)) {
            menu.classList.remove('open');
            btn.classList.remove('attivo');

            window.removeEventListener('resize', ricalcolaPosizione);
            // window.removeEventListener('scroll', ricalcolaPosizione);
        }
    });

};



// Funzione per gestire apertura/chiusura tendina utente loggato
const setUpAddTicket = () => {

    const btnAddTicket = document.getElementById('btn-add-ticket');
    if (!btnAddTicket) return;

    btnAddTicket.classList.add('attiva');
    btnAddTicket.addEventListener('click', () => {
        openModal('scelta-posizione');
    });



}



