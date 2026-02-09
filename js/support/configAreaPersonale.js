
import { getRuolo } from "../servizi/api/autenticazione.js";

import { initElencoTicketPersonali } from "../controller/AreaPersonale/Cittadini/elencoTicketPersonali.js";


import { initGestioneTicketOperatore } from "../controller/AreaPersonale/Operatori/gestioneTicketOperatore.js";

import { initGestioneTicketResponsabile } from "../controller/AreaPersonale/Responsabili/gestioneTicketResponsabile.js";
import { initGestioneOperatori } from "../controller/AreaPersonale/Responsabili/gestioneOperatori.js";


import { initDashboardAdmin } from "../controller/AreaPersonale/Admin/dashboardAdmin.js";
import { initGestioneComuni } from "../controller/AreaPersonale/Admin/gestioneComuni.js";
import { initGestioneResponsabili } from "../controller/AreaPersonale/Admin/gestioneResponsabili.js";
import { initMonitoraggioGlobale } from "../controller/AreaPersonale/Admin/monitoraggioGlobale.js";
import { initReportStatistiche } from "../controller/AreaPersonale/Admin/reportStatistiche.js";
import { initConfigurazioneSistema } from "../controller/AreaPersonale/Admin/configurazioneSistema.js";

// -------------------------------------------------------
// Variabili cone menu per ogni ruolo
// -------------------------------------------------------

const menuCittadino = [
    {
        id: 'ticket-cittadino', label: 'I miei Ticket', icon: 'fa-list-ul',
        title: 'I miei Ticket', file: '/html/AreaPersonale/Cittadini/elencoTicketPersonali.html', init: initElencoTicketPersonali
    }
];


const menuOperatore = [
    {
        id: 'gestione-ticket-operatore', label: 'Gestione Ticket', icon: 'fa-tools',
        title: 'Gestione Ticket', file: '/html/AreaPersonale/Operatori/gestioneTicketOperatore.html', init: initGestioneTicketOperatore
    }
]


const menuResponsabile = [
    {
        id: 'gestione-ticket-responsabile', label: 'Gestione Ticket', icon: 'fa-tools',
        title: 'Gestione Ticket', file: '/html/AreaPersonale/Responsabili/gestioneTicketResponsabile.html', init: initGestioneTicketResponsabile
    },
    {
        id: 'gestione-operatori', label: 'Gestione Operatori', icon: 'fa-users-cog',
        title: 'Gestione Ticket', file: '/html/AreaPersonale/Responsabili/gestioneOperatori.html', init: initGestioneOperatori
    }
];

const menuAdmin = [
    /*{
        id: 'dashboard-admin', label: 'Dashboard Admin', icon: 'fa-chart-line',
        title: 'Dashboard Amministratore', file: '/html/AreaPersonale/Admin/dashboardAdmin.html', init: initDashboardAdmin
    },
    {
        id: 'gestione-comuni', label: 'Gestione Comuni', icon: 'fa-city',
        title: 'Gestione Comuni/Tenant', file: '/html/AreaPersonale/Admin/gestioneComuni.html', init: initGestioneComuni
    },

    {
        id: 'gestione-responsabili', label: 'Gestione Responsabili', icon: 'fa-user-tie',
        title: 'Gestione Responsabili', file: '/html/AreaPersonale/Admin/gestioneResponsabili.html', init: initGestioneResponsabili
    },
    {
        id: 'monitoraggio-globale', label: 'Monitoraggio Globale', icon: 'fa-globe-europe',
        title: 'Monitoraggio Globale Comuni', file: '/html/AreaPersonale/Admin/monitoraggioGlobale.html', init: initMonitoraggioGlobale
    },
    {
        id: 'report-statistiche', label: 'Report e Statistiche', icon: 'fa-chart-bar',
        title: 'Report e Statistiche Avanzate', file: '/html/AreaPersonale/Admin/reportStatistiche.html', init: initReportStatistiche
    },
    {
        id: 'configurazione-sistema', label: 'Configurazione Sistema', icon: 'fa-cogs',
        title: 'Configurazione del Sistema', file: '/html/AreaPersonale/Admin/configurazioneSistema.html', init: initConfigurazioneSistema
    }
*/
]


// Mappa delle configurazioni
const ruoliMenu = {
    'cittadino': menuCittadino,
    'operatore': menuOperatore,
    'responsabile': menuResponsabile,
    'admin': menuAdmin
};


export const getMenu = (ruolo) => {

    if (!ruolo) {
        ruolo = getRuolo();
    }

    return ruoliMenu[ruolo] || [];
}