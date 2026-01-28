import { initHome } from './controller/home_controller.js';
import { initAreaPersonale } from './controller/areapersonale_controller.js';
import { getCurrentUser } from './servizi/autenticazione.js';

// *********************************** Link delle pagine ********************************************
const routes = {
    "/": { title: "Home", file: "html/home.html", init: initHome },
    "/area-personale": { title: "Area personale", file: "html/areapersonale.html", init: initAreaPersonale },

    "/test": { title: "Test", file: "nonEsiste.html" }, // DA ELIMINARE UNA VOLTA FINITI I TEST --> test cosa esce se manca il  file


    "404": { title: "Errore", file: "html/error.html", init: null }
};



// ******************************** Intercettore di click ******************************************
window.addEventListener("click", e => {
    if (e.target.matches("[data-link]")) {
        e.preventDefault();
        navigateTo(e.target.href);
    }
});

// ****************************** Funzione per la navigazione **************************************
const navigateTo = (url) => {
    window.history.pushState(null, null, url);
    router();
};

// *************************** Router per gestire l'aggiornamento **********************************
const router = async () => {
    updateInterface();
    const path = window.location.pathname;
    const route = routes[path] || routes["404"];


    try {
        // Carichiamo il contenuto HTML dal file esterno
        const response = await fetch(route.file);

        if (!response.ok) throw new Error("Errore nel caricamento della pagina");

        const html = await response.text();

        if (html.toLowerCase().includes("<!doctype html>") || html.toLowerCase().includes("<html")) {
            throw new Error("Soft 404: Il server ha restituito l'index invece del file richiesto");
        }

        // Aggiorniamo il titolo e iniettiamo l'HTML
        document.title = route.title;
        document.getElementById("app").innerHTML = html;

        if (route.init) {
            route.init();
        }

        if (route === routes["404"]) {
            console.error("Errore nel percorso, URL non valido")
        }

        // ************* In caso di errore *****************
    } catch (err) {
        console.error("Errore di caricamento:", err);

        // Se il file 404.html stesso non venisse trovato, iniettiamo un HTML di emergenza
        const errorFallback = `
            <div class="error-page">
                <h1>Errore 404</h1>
                <p>La pagina richiesta non è disponibile.</p>
                <a href="/" data-link>Torna alla Home</a>
            </div>`;

        document.getElementById("app").innerHTML = errorFallback;
    }
};


// ************************************ Inizializzazione *******************************************
window.onpopstate = router;
document.addEventListener("DOMContentLoaded", router);






// ************************************ Gestione autenticazione *******************************************
export const updateInterface = () => {

    const user = getCurrentUser();

    const body = document.body;

    if (user) {
        // Se c'è un utente

        // Aggiungiamo la classe: il CSS mostrerà .user-only e nasconderà .guest-only
        body.classList.add('logged-in');

    } else {
        // Rimuoviamo la classe: il CSS torna allo stato originale
        body.classList.remove('logged-in');
    }
};