import { renderError } from "../../errorTemplate_controller.js";
import { getAllTicketTenant, getAllState, updateTicketStatus, deleteTicket, isRisolto } from "../../../servizi/api/ticket.js";
import { getAssignments, addAssignment, removeAssignment } from "../../../servizi/api/intervention.js";
import { getCurrentUser, getOperatori } from "../../../servizi/api/autenticazione.js";
import { openModal } from "../../../modal_manager.js";
import { getUtente } from "../../../servizi/api/utenti.js";

// Stato Locale
let allTickets = []; // Tutti i ticket del comune
let allAssignments = []; // Tutte le assegnazioni
let statesMap = {}; // Mappa stati

export const initGestioneTicketResponsabile = async () => {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) throw new Error("Utente non loggato");

        // 1. Carica Metadati
        statesMap = await getAllState();
        populateStatusFilter(statesMap);

        // 2. Carica Dati
        await loadData();

        // 3. Setup Listener
        setupListeners();

    } catch (error) {
        console.error("Errore dashboard responsabile:", error);
        await renderError({ title: "Errore", message: "Impossibile caricare la dashboard responsabile." });
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

const loadData = async () => {
    const tableBody = document.getElementById('tickets-table-body');
    const loadingDiv = document.getElementById('tickets-loading');
    const emptyDiv = document.getElementById('tickets-empty');

    loadingDiv.classList.remove('hidden');
    emptyDiv.classList.add('hidden');
    tableBody.innerHTML = '';

    try {
        // Caricamento Parallelo: Ticket e Assegnazioni
        const [tickets, assignments] = await Promise.all([
            getAllTicketTenant(), // Prende tutto (del tenant)
            getAssignments()      // Prende tutte le assegnazioni (del tenant)
        ]);

        allTickets = tickets;
        allAssignments = assignments;

        // Applica Filtri (che a sua volta Renderizza Tabella e Calcola Statistiche)
        applyFilters();

    } catch (error) {
        console.error("Errore fetch dati responsabile:", error);
        loadingDiv.innerText = "Errore durante il recupero dei dati.";
    } finally {
        loadingDiv.classList.add('hidden');
    }
};

const setupListeners = () => {
    document.getElementById('btn-refresh').onclick = loadData;
    document.getElementById('btn-apply-filters').onclick = applyFilters;
    document.getElementById('btn-reset-filters').onclick = () => {
        document.getElementById('filter-title').value = '';
        document.getElementById('filter-status').value = '';
        document.getElementById('filter-date').value = '';
        applyFilters();
    };

    // Espongo globalmente per l'HTML
    window.handleRespAssign = handleRespAssign;
    window.handleRespChangeStatus = handleRespChangeStatus;
    window.handleRespEdit = handleRespEdit;
    window.handleRespDelete = handleRespDelete;
};

// =========================================================================
// FILTRAGGIO, STATISTICHE & RENDER
// =========================================================================

const applyFilters = () => {
    const fTitle = document.getElementById('filter-title').value.toLowerCase();
    const fStatus = document.getElementById('filter-status').value;
    const fDate = document.getElementById('filter-date').value;

    // Filtriamo la lista completa
    const filtered = allTickets.filter(ticket => {
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

    // 1. Aggiorna Statistiche basandosi sui dati FILTRATI
    updateDynamicStats(filtered);

    // 2. Renderizza Tabella
    renderTable(filtered);
};

const updateDynamicStats = (tickets) => {
    const total = tickets.length;
    // Risolto(3)
    const completed = tickets.filter(t => isRisolto(t.id_status)).length;

    // Calcoliamo quanti di questi ticket hanno almeno un assegnazione
    // Creiamo un Set degli ID dei ticket filtrati per velocità
    const ticketIds = new Set(tickets.map(t => String(t.id)));

    // Contiamo le assegnazioni uniche sui ticket visibili
    const assignedTicketIds = new Set();
    allAssignments.forEach(a => {
        if (ticketIds.has(String(a.id_ticket))) {
            assignedTicketIds.add(String(a.id_ticket));
        }
    });

    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-completed').innerText = completed;
    document.getElementById('stat-assigned').innerText = assignedTicketIds.size;
};

const renderTable = (tickets) => {
    const tableBody = document.getElementById('tickets-table-body');
    const emptyDiv = document.getElementById('tickets-empty');
    tableBody.innerHTML = '';

    if (tickets.length === 0) {
        emptyDiv.classList.remove('hidden');
        return;
    }
    emptyDiv.classList.add('hidden');

    // Ordina per data decrescente
    tickets.sort((a, b) => new Date(b.creation_date) - new Date(a.creation_date));

    tickets.forEach(t => {
        const row = document.createElement('tr');

        const statusLabel = statesMap[t.id_status] || 'Sconosciuto';
        const statusClass = `status-${statusLabel.replace(/\s+/g, '')}`;
        const dateFormatted = new Date(t.creation_date).toLocaleDateString('it-IT');

        // Calcolo operatori assegnati a questo ticket
        const opsCount = allAssignments.filter(a => String(a.id_ticket) === String(t.id)).length;
        const opsClass = opsCount > 0 ? '' : 'zero';
        const opsLabel = opsCount > 0 ? `${opsCount} Operatori` : 'Nessuno';

        row.innerHTML = `
            <td>
                <a href="/ticket/${t.id}" data-link class="ticket-link">${escapeHtml(t.title)}</a>
            </td>
            <td>
                <span class="status-badge ${statusClass}">${statusLabel}</span>
            </td>
            <td>${dateFormatted}</td>
            <td>
                <span class="operators-count ${opsClass}">
                    <i class="fas fa-user-hard-hat"></i> ${opsLabel}
                </span>
            </td>
            <td>
                <div class="actions-cell">
                    <button class="btn-action btn-assign" title="Gestisci Assegnazioni" onclick="handleRespAssign('${t.id}')">
                        <i class="fas fa-user-plus"></i>
                    </button>
                    <button class="btn-action btn-status" title="Cambia Stato" onclick="handleRespChangeStatus('${t.id}', '${t.id_status}')">
                        <i class="fas fa-exchange-alt"></i>
                    </button>
                    <button class="btn-action btn-edit" title="Modifica Dati" onclick="handleRespEdit('${t.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" title="Elimina Ticket" onclick="handleRespDelete('${t.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
};

// =========================================================================
// AZIONI RESPONSABILE
// =========================================================================


async function handleRespChangeStatus(id, currentStatusId) {
    const newStatus = prompt("Nuovo ID Stato:\n1=Aperto, 2=In Lav., 3=Risolto", currentStatusId);
    if (newStatus && newStatus !== currentStatusId) {
        try {
            await updateTicketStatus(id, parseInt(newStatus));
            await loadData(); // Ricarica tutto per aggiornare statistiche
        } catch (e) { console.error(e); alert("Errore cambio stato"); }
    }
}

function handleRespEdit(id) {
    const currentTicket = allTickets.find(t => String(t.id) === String(id));
    if (!currentTicket) return;

    const datiDaSalvare = {
        titolo: currentTicket.title,
        descrizione: currentTicket.description || "",
        categorie: currentTicket.categories ? currentTicket.categories.map(c => String(c.id)) : [],
    };

    openModal('ticket', {
        lat: currentTicket.lat,
        lng: currentTicket.lon,
        oldData: datiDaSalvare,
        ticketId: currentTicket.id
    });

}

async function handleRespDelete(id) {
    if (!confirm("Eliminare definitivamente il ticket?")) return;
    try {
        await deleteTicket(id);
        await loadData();
    } catch (e) { console.error(e); alert("Errore eliminazione"); }
}

const escapeHtml = (text) => {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};


// Cache locale per non ricaricare gli operatori ogni volta
let cachedOperators = null;

async function handleRespAssign(ticketId) {
    // 1. Chiudi eventuali dropdown già aperti
    const existing = document.getElementById('assign-dropdown');
    if (existing) {
        existing.remove();
        // Se abbiamo cliccato sullo stesso ticket, chiudiamo e basta (toggle)
        if (existing.dataset.ticketId === String(ticketId)) return;
    }

    // 2. Recupera l'elemento bottone che è stato cliccato (per posizionare il menu)
    const btn = window.event.currentTarget;
    const rect = btn.getBoundingClientRect();

    try {
        // 3. Carica Operatori (se non in cache)
        if (!cachedOperators) {
            cachedOperators = await getOperatori();
        }

        // 4. Trova le assegnazioni attuali per questo ticket
        const ticketAssignments = allAssignments.filter(a => String(a.id_ticket) === String(ticketId));
        // Creiamo un Set di ID utenti già assegnati per lookup veloce
        const assignedUserIds = new Set(ticketAssignments.map(a => String(a.id_user)));

        // 5. Crea il Dropdown HTML
        const dropdown = document.createElement('div');
        dropdown.id = 'assign-dropdown';
        dropdown.dataset.ticketId = ticketId;

        // Stile inline per fare prima (puoi spostarlo nel CSS)
        Object.assign(dropdown.style, {
            position: 'fixed',
            top: `${rect.bottom + 5}px`, // Subito sotto il bottone
            left: `${rect.left - 150}px`, // Leggermente a sinistra per non uscire dallo schermo
            width: '280px',
            maxHeight: '300px',
            overflowY: 'auto',
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
            zIndex: '9999',
            padding: '10px'
        });

        // Header Dropdown
        dropdown.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding-bottom:5px; margin-bottom:10px;">
                <h4 style="margin:0; font-size:0.9rem; color:#333;">Seleziona Operatore</h4>
                <button id="close-assign-btn" style="border:none; background:none; cursor:pointer; font-size:1.2rem;">&times;</button>
            </div>
            <div id="operators-list" style="display:flex; flex-direction:column; gap:5px;"></div>
        `;

        const listContainer = dropdown.querySelector('#operators-list');

        // 6. Genera lista operatori
        if (cachedOperators.length === 0) {
            listContainer.innerHTML = '<small style="color:#999; text-align:center;">Nessun operatore disponibile.</small>';
        } else {
            cachedOperators.forEach(async opTenant => {
                const op = await getUtente(opTenant.id);

                const isAssigned = assignedUserIds.has(String(op.id));
                const item = document.createElement('div');
                Object.assign(item.style, {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px',
                    background: isAssigned ? '#f0f9ff' : '#fff',
                    borderRadius: '5px',
                    border: '1px solid #eee'
                });

                // Nome Operatore
                const nameSpan = document.createElement('span');
                nameSpan.innerText = `${op.name} ${op.surname}`;
                nameSpan.style.fontSize = '0.9rem';

                // Bottone Azione (Assegna / Rimuovi)
                const actionBtn = document.createElement('button');
                actionBtn.style.border = 'none';
                actionBtn.style.borderRadius = '4px';
                actionBtn.style.padding = '4px 8px';
                actionBtn.style.cursor = 'pointer';
                actionBtn.style.fontSize = '0.8rem';
                actionBtn.style.fontWeight = 'bold';

                if (isAssigned) {
                    actionBtn.innerText = 'Rimuovi';
                    actionBtn.style.background = '#ffebee';
                    actionBtn.style.color = '#d32f2f';
                    actionBtn.title = "Rimuovi assegnazione";

                    actionBtn.onclick = async () => {
                        const assignment = ticketAssignments.find(a => String(a.id_user) === String(op.id));
                        if (assignment) {
                            actionBtn.disabled = true;
                            actionBtn.innerText = '...';
                            try {
                                await removeAssignment(assignment.id, op.id);
                                await loadData(); // Ricarica tabella e statistiche
                                dropdown.remove(); // Chiude il menu
                            } catch (e) { console.error(e); alert("Errore rimozione"); }
                        }
                    };
                } else {
                    actionBtn.innerText = 'Assegna';
                    actionBtn.style.background = '#e8f5e9';
                    actionBtn.style.color = '#2e7d32';
                    actionBtn.title = "Assegna ticket";

                    actionBtn.onclick = async () => {
                        actionBtn.disabled = true;
                        actionBtn.innerText = '...';
                        try {
                            await addAssignment(op.id, ticketId);
                            await loadData(); // Ricarica tabella e statistiche
                            dropdown.remove(); // Chiude il menu
                        } catch (e) { console.error(e); alert("Errore assegnazione"); }
                    };
                }

                item.appendChild(nameSpan);
                item.appendChild(actionBtn);
                listContainer.appendChild(item);
            });
        }

        // Aggiungi al body
        document.body.appendChild(dropdown);

        // Chiudi col tasto X
        dropdown.querySelector('#close-assign-btn').onclick = () => dropdown.remove();

        // Chiudi se clicco fuori
        const closeOnClickOutside = (e) => {
            if (!dropdown.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
                dropdown.remove();
                document.removeEventListener('click', closeOnClickOutside);
            }
        };
        // Timeout per evitare che il click attuale chiuda subito il menu
        setTimeout(() => document.addEventListener('click', closeOnClickOutside), 0);

    } catch (e) {
        console.error("Errore gestione assegnazione:", e);
        alert("Impossibile caricare gli operatori.");
    }
}