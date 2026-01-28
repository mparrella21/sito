import { initAuth } from './controller/auth_controller.js';
import { initAggiuntaTicket } from './controller/aggiuntaTicket_controller.js';


let lastPath = "";

// *********************************** Link delle pagine dei modali  ***********************************
const modalRoutes = {
    "auth": { file: "html/authenticationForm.html", init: initAuth },
    "ticket": { file: "html/aggiuntaTicket.html", init: initAggiuntaTicket },
};



// *********************************** Funzione per aprire il modale ***********************************
export const openModal = async (path, params = null) => {
    const container = document.getElementById('contenitore-modale');
    if (!container) {
        alert("Errore apertura modale: Contenitore non trovato");
        return;
    }

    const route = modalRoutes[path] || null;

    if (!route) {
        console.error("Tipo modale non riconosciuto");
        alert("Errore apertura modale: Tipo modale non riconosciuto ", path);
        return;
    }


    if (lastPath != path) {
        try {
            // Caricamento HTML l'HTML
            const response = await fetch(route.file);

            if (!response.ok) throw new Error("Errore nel caricamento della pagina");

            const html = await response.text();

            if (html.toLowerCase().includes("<!doctype html>") || html.toLowerCase().includes("<html")) {
                throw new Error("Soft 404: Il server ha restituito l'index invece del file richiesto");
            }

            container.innerHTML = html;

            // Aggiunta classi al primo figlio per la visualizzazione
            if (container.firstElementChild) {
                container.firstElementChild.classList.add('animazione-modale', 'pagina-modale');
            }

            // Inizzializzazione contenuto modale
            if (route.init) route.init(params);

            // Gestione chiusura modale
            setupCloseHandlers(container);

            // Mostrare la modale
            lastPath = path;
            container.classList.add('open');

        } catch (error) {
            console.error("Errore apertura modale:", error);
            alert("Errore apertura modale:", error);
        }
    } else {
        // Mostrare la modale
        container.classList.add('open');
    }



};



// *********************************** Funzione per gestire la chiusura da pulsante e sfondo ***********************************
const setupCloseHandlers = (container) => {

    // Chiusura tramite tasto
    const closeBtn = container.querySelector('.btn-close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    // Chiusura cliccando fuori
    container.onclick = (e) => {
        if (e.target === container) closeModal();
    };
};





// *********************************** Funzione per chiudere il modale ***********************************
export const closeModal = () => {
    const container = document.getElementById('contenitore-modale');
    container.classList.remove('open');

    // Se dopo 10 secondi non riapro il modale elimino il testo
    setTimeout(() => {
        if (!container.classList.contains("open")) {
            container.innerHTML = "";
            lastPath = "";
        }

    }, 10000)
};







