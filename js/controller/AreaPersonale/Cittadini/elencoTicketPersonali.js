
import { renderError } from "../../errorTemplate_controller.js";
import { getAllTicketTenant, getAllState, getAllCategories } from "../../../servizi/api/ticket.js";
import { getCurrentUser, getTenantId } from "../../../servizi/api/autenticazione.js";
import { formatDate } from "../profilo.js";
// Stato Locale
let allTickets = []; // Cache di tutti i ticket scaricati
let categoriesMap = {}; // Mappa ID -> Label
let statesMap = {}; // Mappa ID -> Label

export const initElencoTicketPersonali = async () => {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) throw new Error("Utente non loggato");

        // 1. Caricamento Dati Preliminari (Stati e Categorie)
        await loadMetadata();

        // 2. Caricamento Ticket
        await loadTickets();

        // 3. Setup Event Listeners
        setupListeners();

    } catch (error) {
        console.error("Errore init dashboard ticket:", error);
        await renderError({ title: "Errore Caricamento", message: "Impossibile caricare la dashboard ticket." });
    }
};

const loadMetadata = async () => {
    // Carica stati e categorie in parallelo
    const [states, categories] = await Promise.all([
        getAllState(),
        getAllCategories()
    ]);

    statesMap = states; // es {1: 'Aperto', ...}

    // Popola Select Stati
    const statusSelect = document.getElementById('filter-status');
    Object.entries(states).forEach(([id, label]) => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.innerText = label;
        statusSelect.appendChild(opt);
    });

    // Popola Select Categorie e Mappa
    const catSelect = document.getElementById('filter-category');
    if (categories && Array.isArray(categories)) {
        categories.forEach(cat => {
            categoriesMap[cat.id] = cat.label; // Salviamo per dopo

            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.innerText = cat.label;
            catSelect.appendChild(opt);
        });
    }
};

const loadTickets = async () => {
    const tableBody = document.getElementById('tickets-table-body');
    const loadingDiv = document.getElementById('tickets-loading');
    const emptyDiv = document.getElementById('tickets-empty');

    // Reset UI
    tableBody.innerHTML = '';
    loadingDiv.classList.remove('hidden');
    emptyDiv.classList.add('hidden');

    try {
        const tenantId = getTenantId();
        // Recuperiamo TUTTI i ticket del tenant (o tutti se Admin globale senza tenant)
        allTickets = await getAllTicketTenant(tenantId);

        // Applichiamo i filtri iniziali (mostra tutto)
        applyFilters();

    } catch (error) {
        console.error("Errore fetch ticket:", error);
        loadingDiv.innerText = "Errore durante il recupero dei dati.";
    } finally {
        loadingDiv.classList.add('hidden');
    }
};

const setupListeners = () => {
    document.getElementById('btn-refresh').onclick = loadTickets;

    // Bottone Applica
    document.getElementById('btn-apply-filters').onclick = applyFilters;

    // Bottone Reset
    document.getElementById('btn-reset-filters').onclick = () => {
        document.getElementById('filter-title').value = '';
        document.getElementById('filter-category').value = '';
        document.getElementById('filter-status').value = '';
        document.getElementById('filter-date').value = '';
        applyFilters();
    };

    // Invio su Enter nel campo testo
    document.getElementById('filter-title').onkeyup = (e) => {
        if (e.key === 'Enter') applyFilters();
    };
};

// =========================================================================
// LOGICA DI FILTRAGGIO E RENDER
// =========================================================================

const applyFilters = () => {
    const fTitle = document.getElementById('filter-title').value.toLowerCase();
    const fCat = document.getElementById('filter-category').value;
    const fStatus = document.getElementById('filter-status').value;
    const fDate = document.getElementById('filter-date').value;

    const filtered = allTickets.filter(ticket => {
        // 1. Filtro Titolo (Case Insensitive)
        if (fTitle && !ticket.title.toLowerCase().includes(fTitle)) return false;

        // 2. Filtro Categoria
        // Nota: ticket.categories è un array di oggetti, dobbiamo controllare se ALMENO UNA corrisponde
        if (fCat) {
            const hasCat = ticket.categories.some(c => String(c.id) === String(fCat));
            if (!hasCat) return false;
        }

        // 3. Filtro Stato
        if (fStatus && String(ticket.id_status) !== String(fStatus)) return false;

        // 4. Filtro Data (Confronto YYYY-MM-DD)
        if (fDate) {
            const ticketDate = formatDate(ticket.creation_date);
            if (ticketDate !== fDate) return false;
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
        return;
    }
    emptyDiv.classList.add('hidden');

    // Ordina per data decrescente (più recenti in alto)
    tickets.sort((a, b) => new Date(b.creation_date) - new Date(a.creation_date));

    tickets.forEach(t => {
        const row = document.createElement('tr');

        // 1. Categorie (Join label se multiple)
        const catLabels = t.categories.map(c => c.label).join(', ');

        // 2. Stato (Label e Classe CSS)
        const statusLabel = statesMap[t.id_status] || 'Sconosciuto';
        // Rimuove spazi per la classe CSS (es. "In lavorazione" -> "Inlavorazione")
        const statusClass = `status-${statusLabel.replace(/\s+/g, '')}`;

        // 3. Data
        const dateFormatted = new Date(t.creation_date).toLocaleDateString('it-IT');

        row.innerHTML = `
            <td>
                <a href="/ticket/${t.id}" data-link class="ticket-link" title="Vedi Dettaglio">
                    ${escapeHtml(t.title)}
                </a>
            </td>
            <td>
                <span class="cat-badge">${escapeHtml(catLabels)}</span>
            </td>
            <td>
                <span class="status-badge ${statusClass}">${statusLabel}</span>
            </td>
            <td>${dateFormatted}</td>
            <td style="text-align: center;">
                <a href="/ticket/${t.id}" data-link class="btn-icon-table" title="Vai al ticket">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </td>
        `;

        tableBody.appendChild(row);
    });
};

// Helper Sicurezza XSS
const escapeHtml = (text) => {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};