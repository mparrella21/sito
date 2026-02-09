
import { renderError } from "../../errorTemplate_controller.js";
import { getAllTicketTenant, getAllState, updateTicketStatus, deleteTicket, isRisolto } from "../../../servizi/api/ticket.js";
import { getAssignments } from "../../../servizi/api/intervention.js";
import { getCurrentUser } from "../../../servizi/api/autenticazione.js";
import { openModal } from "../../../modal_manager.js";

// Stato Locale
let myTickets = []; // Ticket assegnati all'operatore
let statesMap = {}; // Mappa ID -> Label

export const initGestioneTicketOperatore = async () => {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) throw new Error("Utente non loggato");

        // 1. Carica Metadati (Stati)
        statesMap = await getAllState();
        populateStatusFilter(statesMap);

        // 2. Carica Dati
        await loadData(currentUser.id);

        // 3. Listener
        setupListeners();

    } catch (error) {
        console.error("Errore init dashboard operatore:", error);
        await renderError({ title: "Errore", message: "Impossibile caricare i ticket assegnati." });
    }
};

const populateStatusFilter = (states) => {
    const select = document.getElementById('filter-status');
    Object.entries(states).forEach(([id, label]) => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.innerText = label;
        select.appendChild(opt);
    });
};

const loadData = async (userId) => {
    const tableBody = document.getElementById('tickets-table-body');
    const loadingDiv = document.getElementById('tickets-loading');
    const emptyDiv = document.getElementById('tickets-empty');

    loadingDiv.classList.remove('hidden');
    emptyDiv.classList.add('hidden');
    tableBody.innerHTML = '';

    try {
        // 1. Prendo tutti gli assignment del tenant
        const allAssignments = await getAssignments();
        console.log(allAssignments)
        // 2. Filtro solo quelli miei
        const myAssignments = allAssignments.filter(a => String(a.id_user) == String(userId));


        if (myAssignments.length === 0) {
            updateStats(0, 0);
            loadingDiv.classList.add('hidden');
            emptyDiv.classList.remove('hidden');
            return;
        }

        // 3. Prendo TUTTI i ticket del tenant (per avere i dettagli: titolo, stato, coords)
        const allTenantTickets = await getAllTicketTenant();

        // 4. Incrocio i dati: tengo solo i ticket il cui ID è presente nei miei assignment
        // Nota: a.ticket_id potrebbe essere stringa o numero, converto in String per sicurezza
        const myTicketIds = new Set(myAssignments.map(a => String(a.id_ticket)));


        myTickets = allTenantTickets.filter(t => myTicketIds.has(String(t.id)));

        // 5. Aggiorno Statistiche
        calculateAndShowStats();

        // 6. Mostra Tabella (applica filtri di default)
        applyFilters();

    } catch (error) {
        console.error("Errore caricamento dati operatore:", error);
        loadingDiv.innerText = "Errore durante il recupero delle assegnazioni.";
    } finally {
        loadingDiv.classList.add('hidden');
    }
};

const calculateAndShowStats = () => {
    const total = myTickets.length;
    // Consideriamo risolto se status è 3 (Risolto) 
    const completed = myTickets.filter(t => isRisolto(t.id_status) == 3).length;

    updateStats(total, completed);
};

const updateStats = (total, completed) => {
    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-completed').innerText = completed;
};

const setupListeners = () => {
    document.getElementById('btn-refresh').onclick = () => {
        const user = getCurrentUser();
        if (user) loadData(user.id);
    };
    document.getElementById('btn-apply-filters').onclick = applyFilters;
    document.getElementById('btn-reset-filters').onclick = () => {
        document.getElementById('filter-title').value = '';
        document.getElementById('filter-status').value = '';
        document.getElementById('filter-date').value = '';
        applyFilters();
    };

    // Espongo funzioni globali per i bottoni in tabella
    window.handleOpChangeStatus = handleOpChangeStatus;
    window.handleOpEditTicket = handleOpEditTicket;
    window.handleOpDeleteTicket = handleOpDeleteTicket;
};

// =========================================================================
// FILTRAGGIO & RENDER
// =========================================================================

const applyFilters = () => {
    const fTitle = document.getElementById('filter-title').value.toLowerCase();
    const fStatus = document.getElementById('filter-status').value;
    const fDate = document.getElementById('filter-date').value;

    const filtered = myTickets.filter(ticket => {
        if (fTitle && !ticket.title.toLowerCase().includes(fTitle)) return false;
        if (fStatus && String(ticket.id_status) !== String(fStatus)) return false;
        if (fDate) {
            const d = new Date(ticket.creation_date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            if (`${year}-${month}-${day}` !== fDate) return false;
        }
        return true;
    });

    renderTable(filtered);
};

const renderTable = (tickets) => {
    const tableBody = document.getElementById('tickets-table-body');
    const emptyDiv = document.getElementById('tickets-empty');
    tableBody.innerHTML = '';

    if (tickets.length === 0) {
        emptyDiv.classList.remove('hidden');
        emptyDiv.innerHTML = '<i class="fas fa-search"></i> Nessun risultato dai filtri.';
        return;
    }
    emptyDiv.classList.add('hidden');

    // Ordina per data (più recenti)
    tickets.sort((a, b) => new Date(b.creation_date) - new Date(a.creation_date));

    tickets.forEach(t => {
        const row = document.createElement('tr');

        const statusLabel = statesMap[t.id_status] || 'Sconosciuto';
        const statusClass = `status-${statusLabel.replace(/\s+/g, '')}`;
        const dateFormatted = new Date(t.creation_date).toLocaleDateString('it-IT');

        // Passiamo l'oggetto ticket serializzato (o l'ID) alle funzioni
        // Nota: per handleOpEditTicket serve l'oggetto completo o bisogna recuperarlo
        // Per semplicità uso l'ID e lo cerco nell'array locale 'myTickets'

        row.innerHTML = `
            <td>
                <a href="/ticket/${t.id}" data-link class="ticket-link">${escapeHtml(t.title)}</a>
            </td>
            <td>
                <span class="status-badge ${statusClass}">${statusLabel}</span>
            </td>
            <td>${dateFormatted}</td>
            <td>
                <div class="actions-cell">
                    <button class="btn-action btn-status" title="Cambia Stato" onclick="handleOpChangeStatus('${t.id}', '${t.id_status}')">
                        <i class="fas fa-exchange-alt"></i>
                    </button>
                    <button class="btn-action btn-edit" title="Modifica Dati" onclick="handleOpEditTicket('${t.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" title="Elimina Ticket" onclick="handleOpDeleteTicket('${t.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
};

// =========================================================================
// AZIONI OPERATORE
// =========================================================================

async function handleOpChangeStatus(id, currentStatusId) {
    // Semplice prompt per cambiare stato (puoi migliorarlo con un modale custom)
    // 1=Aperto, 2=In Lavorazione, 3=Risolto
    const newStatus = prompt("Inserisci ID nuovo stato:\n1 = Aperto\n2 = In lavorazione\n3 = Risolto\n4 = Chiuso", currentStatusId);

    if (newStatus && newStatus !== currentStatusId) {
        try {
            await updateTicketStatus(id, parseInt(newStatus));
            // Ricarica dati
            const user = getCurrentUser();
            if (user) loadData(user.id);
        } catch (e) {
            console.error(e);
            alert("Errore aggiornamento stato");
        }
    }
}

function handleOpEditTicket(id) {
    // Cerco il ticket nell'array locale
    const currentTicket = myTickets.find(t => String(t.id) === String(id));
    if (!currentTicket) return;

    // Preparo l'oggetto per il form, assumendo che 'categories' siano i soli dati extra oltre a titolo
    // Adatto 'datiDaSalvare' per come se lo aspetta il form del tuo modale
    const datiDaSalvare = {
        titolo: currentTicket.title,
        categorie: currentTicket.categories ? currentTicket.categories.map(c => String(c.id)) : [],
    };
    // Chiamata richiesta nel prompt
    openModal('ticket', {
        lat: currentTicket.lat,
        lng: currentTicket.lon,
        oldData: datiDaSalvare,
        ticketId: currentTicket.id
    });
}

async function handleOpDeleteTicket(id) {
    if (!confirm("Sei sicuro di voler eliminare questo ticket?")) return;

    try {
        await deleteTicket(id);
        const user = getCurrentUser();
        if (user) loadData(user.id);
    } catch (e) {
        console.error(e);
        alert("Errore eliminazione ticket");
    }
}

// Helper Sicurezza
const escapeHtml = (text) => {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};