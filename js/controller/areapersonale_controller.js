
import { initProfilo } from "./AreaPersonale/profilo.js";
import { initElencoTicketPersonali } from "./AreaPersonale/Cittadini/elencoTicketPersonali.js";

import { initGestioneTicketOperatore } from "./AreaPersonale/Operatori/gestioneTicketOperatore.js";

import { initGestioneTicketResponsabile } from "./AreaPersonale/Responsabili/gestioneTicketResponsabile.js";
import { initGestioneOperatori } from "./AreaPersonale/Responsabili/gestioneOperatori.js";






// Variabili con le voci del menu per ogni ruolo
const menuBase = [
    {
        id: 'profilo', label: 'Il mio Profilo', icon: 'fa-user', title: 'Il mio Profilo', file: '/html/AreaPersonale/profilo.html', init: initProfilo
    }
];


const menuCittadino = [
    {
        id: 'ticket-cittadino', label: 'I miei Ticket', icon: 'fa-list-ul', title: 'I miei Ticket', file: '/html/AreaPersonale/Cittadini/elencoTicketPersonali.html', init: initElencoTicketPersonali
    }
];


const menuOperatore = [
    {
        id: 'gestione-ticket-operatore', label: 'Gestione Ticket', icon: 'fa-tools',
        title: 'Gestione Ticket', file: '/html/AreaPersonale/Operatori/gestioneTicketOperatore.html', init: initGestioneTicketOperatore
    }
    // Aggiungere schermata con ticket completati?
]


const menuResponsabile = [
    {
        id: 'gestione-ticket-responsabile', label: 'Gestione Ticket', icon: 'fa-tools',
        title: 'Gestione Ticket', file: '/html/AreaPersonale/Responsabili/gestioneTicketResponsabile.html', init: initGestioneTicketResponsabile
    },
    {
        id: 'gestione-operatori', label: 'Gestione Operatori', icon: 'fa-users-cog',
        title: 'Gestione Ticket', file: '/html/AreaPersonale/Responsabili/gestioneOperatori.html', init: initGestioneOperatori
    },




    // DA AGGIUNGERE??? 
    { id: 'statistiche', label: 'Statistiche', icon: 'fa-chart-pie' }
];


// Mappa delle configurazioni
const ruoliMenu = {
    'cittadino': menuCittadino,
    'operatore': menuOperatore,
    'responsabile': menuResponsabile
};



// *********************************** Inizzializzatore area personale ********************************************
export const initAreaPersonale = () => {

    // Dati simulati per testare (poi userai quelli veri)
    const user = { nome: "Mario", ruolo: "operatore" };



    // 1) Riempimento Header
    document.getElementById('user-name-display').textContent = user.nome;
    document.getElementById('user-role-display').textContent = user.ruolo;

    // 2) Generazione Menu Dinamico
    renderSidebarMenu(user.ruolo);

};




// *********************************** Generazione menù dinamico in base al ruolo ********************************************
const renderSidebarMenu = (ruolo) => {
    const menuContainer = document.getElementById('dashboard-menu');
    menuContainer.innerHTML = "";

    // Prende l'array specifico dal dizionario, o un array vuoto se il ruolo non esiste
    const specificMenu = ruoliMenu[ruolo] || [];

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
            items.init();
        }

    } catch (error) {
        console.error("Errore caricamento vista:", error);
        contentDiv.innerHTML = `<p>Pagina in costruzione</p>`;
    }
};