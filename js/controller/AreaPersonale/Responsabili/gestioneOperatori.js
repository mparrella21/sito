import { renderError } from "../../errorTemplate_controller.js";
import { getOperatori, register, addOperatore, removeOperatore, getCurrentUser } from "../../../servizi/api/autenticazione.js";
import { getUtente } from "../../../servizi/api/utenti.js";
import { getOperatorCategories, getUserOperatorMappings, getAssignments } from "../../../servizi/api/intervention.js";
import { getAllTicketTenant, isRisolto } from "../../../servizi/api/ticket.js";

// Stato Locale
let enrichedOperators = []; // Array operatori COMPLETI (con nome, cognome, stats e categorie)
let categoriesMap = {};     // Mappa ID -> Label Categoria

export const initGestioneOperatori = async () => {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) throw new Error("Utente non loggato");

        // 1. Carica Tutti i dati necessari
        await loadData();

        // 2. Setup Listener
        setupListeners();

    } catch (error) {
        console.error("Errore init operatori:", error);
        await renderError({ title: "Errore", message: "Impossibile caricare la gestione operatori." });
    }
};

const loadData = async () => {
    const loadingDiv = document.getElementById('loading-state');
    const emptyDiv = document.getElementById('empty-state');
    const tableBody = document.getElementById('operators-table-body');

    loadingDiv.classList.remove('hidden');
    emptyDiv.classList.add('hidden');
    tableBody.innerHTML = '';

    try {
        // 1. Caricamento Parallelo dati grezzi
        const [
            rawOperators,       // Lista ID operatori
            categories,         // Lista definizioni categorie
            mappings,           // Link User <-> Category
            tickets,            // Tutti i ticket del tenant
            assignments         // Tutte le assegnazioni
        ] = await Promise.all([
            getOperatori(),
            getOperatorCategories(),
            getUserOperatorMappings(),
            getAllTicketTenant(),
            getAssignments()
        ]);

        // 2. IDRATAZIONE UTENTI: Scarichiamo i dettagli (Nome, Cognome)
        const fullOperatorsPromises = rawOperators.map(async (opRef) => {
            try {
                const userDetail = await getUtente(opRef.id);
                // Uniamo i dati: { id: "...", ... } + { name: "...", surname: "...", ... }
                return { ...opRef, ...userDetail };
            } catch (e) {
                console.warn(`Impossibile scaricare utente ${opRef.id}`, e);
                return null;
            }
        });

        // Attendiamo che tutti gli utenti siano scaricati e filtriamo eventuali errori
        const fullOperators = (await Promise.all(fullOperatorsPromises)).filter(o => o !== null);

        // 3. Crea Mappa Categorie
        categoriesMap = {};
        const catSelect = document.getElementById('filter-category');
        catSelect.innerHTML = '<option value="">Tutte le categorie</option>';

        categories.forEach(c => {
            categoriesMap[c.id] = c.label;
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.innerText = c.label;
            catSelect.appendChild(opt);
        });

        // 4. Arricchisci i dati con Statistiche e Categorie
        enrichedOperators = fullOperators.map(op => {
            // A. Trova categorie dell'operatore
            const opCats = mappings
                .filter(m => String(m.id_user) === String(op.id))
                .map(m => ({
                    id: m.id_operator_category,
                    label: categoriesMap[m.id_operator_category] || 'N/A'
                }));

            // B. Calcola Statistiche Ticket
            const myAssignments = assignments.filter(a => String(a.id_user) === String(op.id));
            const assignedCount = myAssignments.length;

            const myTicketIds = new Set(myAssignments.map(a => String(a.ticket_id)));

            const completedCount = tickets.filter(t =>
                myTicketIds.has(String(t.id)) && isRisolto(t.id_status)
            ).length;

            return {
                ...op,
                categories: opCats,
                stats: {
                    assigned: assignedCount,
                    completed: completedCount
                }
            };
        });

        // 5. Applica filtri e renderizza
        applyFilters();

    } catch (error) {
        console.error("Errore caricamento dati:", error);
        loadingDiv.innerText = "Errore durante il recupero dei dati.";
    } finally {
        loadingDiv.classList.add('hidden');
    }
};

const setupListeners = () => {
    // Filtri
    document.getElementById('filter-name').addEventListener('input', applyFilters);
    document.getElementById('filter-category').addEventListener('change', applyFilters);

    // Reset
    document.getElementById('btn-reset-filters').addEventListener('click', () => {
        document.getElementById('filter-name').value = '';
        document.getElementById('filter-category').value = '';
        applyFilters();
    });

    // Refresh
    document.getElementById('btn-refresh').addEventListener('click', loadData);

    // Modale Aggiungi Operatore
    const modal = document.getElementById('modal-add-operator');
    const form = document.getElementById('form-add-operator');

    document.getElementById('btn-add-operator').onclick = () => modal.classList.remove('hidden');

    const close = () => modal.classList.add('hidden');
    modal.querySelectorAll('.close-modal, .close-modal-btn').forEach(el => el.onclick = close);

    form.onsubmit = async (e) => {
        e.preventDefault();
        // MODIFICA: Prendo Username invece di Email
        const username = document.getElementById('new-op-username').value;
        const password = document.getElementById('new-op-password').value;
        await handleAddOperator(username, password);
        close();
    };

    // Espongo funzione delete globalmente
    window.handleDeleteOperator = handleDeleteOperator;
};

// =========================================================================
// LOGICA
// =========================================================================

const applyFilters = () => {
    const fName = document.getElementById('filter-name').value.toLowerCase();
    const fCat = document.getElementById('filter-category').value;

    const filtered = enrichedOperators.filter(op => {

        // MODIFICA: Filtro solo su Nome e Cognome (rimossa email)
        const fullName = `${op.name || ''} ${op.surname || ''}`.toLowerCase();

        if (fName && !fullName.includes(fName)) return false;

        // Filtro Categoria
        if (fCat) {
            const hasCat = op.categories.some(c => String(c.id) === String(fCat));
            if (!hasCat) return false;
        }

        return true;
    });

    renderStats(filtered);
    renderTable(filtered);
};

const renderStats = (operators) => {
    const container = document.getElementById('stats-container');

    // Recupera o ricrea il box total se necessario
    container.innerHTML = '';

    // Box Totale
    const totalBox = document.createElement('div');
    totalBox.className = 'stat-box total';
    totalBox.innerHTML = `
        <div class="stat-icon"><i class="fas fa-users"></i></div>
        <div class="stat-info">
            <span class="stat-label">Totale Operatori</span>
            <span class="stat-value" id="stat-total-ops">${operators.length}</span>
        </div>
    `;
    container.appendChild(totalBox);

    // Calcola conteggi per categoria
    const catCounts = {};
    operators.forEach(op => {
        op.categories.forEach(cat => {
            catCounts[cat.label] = (catCounts[cat.label] || 0) + 1;
        });
    });

    // Genera box per categoria
    Object.entries(catCounts).forEach(([label, count]) => {
        const box = document.createElement('div');
        box.className = 'stat-box cat-box';
        box.innerHTML = `
            <div class="stat-icon"><i class="fas fa-tag"></i></div>
            <div class="stat-info">
                <span class="stat-label">${label}</span>
                <span class="stat-value">${count}</span>
            </div>
        `;
        container.appendChild(box);
    });
};

const renderTable = (operators) => {
    const tableBody = document.getElementById('operators-table-body');
    const emptyDiv = document.getElementById('empty-state');

    tableBody.innerHTML = '';

    if (operators.length === 0) {
        emptyDiv.classList.remove('hidden');
        return;
    }
    emptyDiv.classList.add('hidden');

    operators.forEach(op => {
        const row = document.createElement('tr');

        // Avatar Iniziali
        const initials = (op.name?.[0] || '') + (op.surname?.[0] || '?');

        // Badge Categorie
        const catBadges = op.categories.length > 0
            ? op.categories.map(c => `<span class="cat-badge">${c.label}</span>`).join('')
            : '<em style="color:#ccc; font-size:0.8rem">Nessuna</em>';

        // MODIFICA: Rimossa visualizzazione email
        row.innerHTML = `
            <td>
                <div class="user-info">
                    <div class="user-avatar">${initials.toUpperCase()}</div>
                    <div class="user-details">
                        <span class="user-name">${op.name || 'Utente'} ${op.surname || ''}</span>
                    </div>
                </div>
            </td>
            <td>${catBadges}</td>
            <td style="text-align: center;">
                <span class="count-badge">${op.stats.assigned}</span>
            </td>
            <td style="text-align: center;">
                <span class="count-badge ${op.stats.completed > 0 ? 'success' : ''}">${op.stats.completed}</span>
            </td>
            <td style="text-align: center;">
                <button class="btn-icon-delete" title="Rimuovi Operatore" onclick="handleDeleteOperator('${op.id}')">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
};

// =========================================================================
// ACTIONS
// =========================================================================

// MODIFICA: Accetta username invece di email
const handleAddOperator = async (username, password) => {
    const btn = document.querySelector('#form-add-operator button[type="submit"]');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'Creazione in corso...';

    try {
        // Passiamo username come primo parametro alla registrazione
        const regResponse = await register(username, password);

        if (!regResponse || !regResponse.id) {
            throw new Error("La registrazione non ha restituito l'ID utente. Impossibile collegare.");
        }

        const newUserId = regResponse.id;

        // Aggiungi utente al tenant come operatore
        await addOperatore(newUserId);

        alert("Operatore creato e aggiunto con successo!");
        await loadData();

    } catch (error) {
        console.error(error);
        alert("Errore creazione operatore: " + (error.message || "Username forse già in uso?"));
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
};

async function handleDeleteOperator(id) {
    if (!confirm("Sei sicuro di voler rimuovere questo operatore dal tuo team?")) return;

    try {
        await removeOperatore(id);
        await loadData();
    } catch (error) {
        console.error(error);
        alert("Errore durante la rimozione.");
    }
}