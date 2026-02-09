import { initFiltriMappa } from './controller/Sidebar/filtriMappa_controller.js';


let lastPath = "";

// *********************************** Link delle pagine per la sidebar  ***********************************
const sidebarRoutes = {
    "filtriMappa": { file: "/html/Sidebar/filtriMappa.html", init: initFiltriMappa, title: "Filtri mappa" },
};


// *********************************** Funzione per aprire la sidebar ***********************************
export const openSidebar = async (path, params = null) => {

    const container = document.getElementById('contenitore-sidebar');
    if (!container) {
        alert("Errore apertura sidebar: Contenitore non trovato");
        return;
    }

    if (lastPath != path) {
        const route = sidebarRoutes[path] || null;

        if (!route) {
            console.error("Tipo di sidebar non riconosciuta");
            alert("Errore apertura sidebar: Tipo di sidebar non riconosciuta", path);
            return;
        }


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
                container.firstElementChild.classList.add('pagina-sidebar');
            }


            if (!container.querySelector('.sidebar-tab')) {
                const tab = document.createElement('button');
                tab.id = 'sidebar-tab';
                tab.className = 'sidebar-tab';
                tab.innerHTML = '<i class="fas fa-chevron-right"></i>';


                const baseTitle = route.title || null;

                if (baseTitle) {
                    const updateTooltip = () => {
                        const isOpen = container.classList.contains('open');
                        tab.setAttribute('data-text', `${baseTitle}`);//${isOpen ? 'Chiudi' : 'Apri'} 
                    };

                    tab.onclick = () => {
                        toggleSidebar(path);
                        updateTooltip();
                    };


                    updateTooltip();
                } else {
                    tab.onclick = () => toggleSidebar(path);
                }
                container.appendChild(tab);

            }


            // Inizzializzazione contenuto sidebar
            if (route.init) route.init(params);


            // Mostrare la sidebar
            lastPath = path;
            container.classList.add('attivo');

        } catch (error) {
            console.error("Errore apertura sidebar:", error);
            alert("Errore apertura sidebar:", error);
        }
    } else {
        // Mostrare la sidebar
        container.classList.add('open');
    }



};


// *********************************** Funzione per attivare  o disattivare la sidebar a seconda dello stato attuale ***********************************
export const toggleSidebar = (path) => {

    if (lastPath != path) {
        openSidebar(path);
        return;
    }

    const container = document.getElementById('contenitore-sidebar');

    if (container.classList.contains('open')) {
        closeSidebar();

    } else {
        openSidebar(path);
    }


};





// *********************************** Funzione per chiudere la sidebar ***********************************
export const closeSidebar = () => {
    const container = document.getElementById('contenitore-sidebar');
    container.classList.remove('open');

    /*
        // Se dopo 10 minuti non riapro la sidebar elimino il testo
        setTimeout(() => {
            if (!container.classList.contains("open")) {
                container.innerHTML = "";
                lastPath = "";
            }
    
        }, 600000)
        */
};

// *********************************** Funzione per distruggere completamente ***********************************
export const destroySidebar = () => {
    const container = document.getElementById('contenitore-sidebar');
    container.classList.remove('open', 'attivo');
    container.innerHTML = "";
    lastPath = "";
};



