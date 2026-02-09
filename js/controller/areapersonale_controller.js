
import { getCurrentUser } from "../servizi/api/autenticazione.js";
import { initProfilo } from "../controller/AreaPersonale/profilo.js";

import { renderError } from "./errorTemplate_controller.js";
import { getMenu } from "../support/configAreaPersonale.js";



const menuBase = [
    {
        id: 'profilo', label: 'Il mio Profilo', icon: 'fa-user',
        title: 'Il mio Profilo', file: '/html/AreaPersonale/profilo.html', init: initProfilo
    }
];

// *********************************** Inizzializzatore area personale ********************************************
export const initAreaPersonale = async () => {
    const user = getCurrentUser();

    if (!user) {
        await renderError({ code: 403 });
        return;
    }




    // 1) Riempimento Header
    document.getElementById('user-name-display').textContent = user.name;
    document.getElementById('user-role-display').textContent = user.role;

    // 2) Generazione Menu Dinamico
    renderSidebarMenu(user.role);

};




// *********************************** Generazione menù dinamico in base al ruolo ********************************************
const renderSidebarMenu = (ruolo) => {
    const menuContainer = document.getElementById('dashboard-menu');
    menuContainer.innerHTML = "";

    // Prende l'array specifico dal dizionario, o un array vuoto se il ruolo non esiste
    const specificMenu = getMenu(); // ruoliMenu[ruolo] || [];

    // Unisce Base + Specifico
    const menuItems = [...menuBase, ...specificMenu];


    // Creazione HTML
    menuItems.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <a class="nav-link" data-view="${item.id}">
                <i class="fas ${item.icon}"></i> ${item.label}
            </a>
        `;

        // Event Listener per cambio vista
        li.querySelector('a').addEventListener('click', (e) => {
            // Gestione classe active
            document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
            e.currentTarget.classList.add('active');

            // Carica contenuto
            loadDashboardView(item);
        });

        menuContainer.appendChild(li);
    });

    // Attiva il primo elemento di default
    menuContainer.firstElementChild.querySelector('a').classList.add('active');

    loadDashboardView(menuItems[0]);
};







// *********************************** Funzione che cambia solo il contenuto centrale ***********************************
const loadDashboardView = async (items) => {
    const contentDiv = document.getElementById('dashboard-content');
    const titleDiv = document.getElementById('page-title');

    // 1) Aggiorna il Titolo
    titleDiv.textContent = items.title;

    // 2) Mostra un loader mentre carica
    contentDiv.innerHTML = '<div class="loading-spinner">Caricamento in corso...</div>';

    try {
        // 3) Fetch dinamica del file HTML
        const response = await fetch(items.file);

        if (!response.ok) throw new Error(`Impossibile caricare ${items.file}`);

        const html = await response.text();

        if (html.toLowerCase().includes("<!doctype html>") || html.toLowerCase().includes("<html")) {
            throw new Error("Soft 404: Il server ha restituito l'index invece del file richiesto");
        }

        contentDiv.innerHTML = html;

        // 4) ESECUZIONE LOGICA SPECIFICA (Il "Controller" della vista)
        if (items.init && typeof items.init === 'function') {
            await items.init();
        }

    } catch (error) {
        console.error("Errore caricamento vista:", error);
        contentDiv.innerHTML = `<p>Pagina in costruzione</p>`;
    }
};