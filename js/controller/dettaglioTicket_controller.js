import { renderError } from "./errorTemplate_controller.js";
import { getTicket, getAllReplies, postReply, deleteReply, deleteTicket, getAllState, updateReply, updateTicket, isRisolto } from "../servizi/api/ticket.js";
import { getUtente } from '../servizi/api/utenti.js';
import { getCurrentUser, isResponsabile, isAdmin, getTenantId, isOperatore } from "../servizi/api/autenticazione.js";
import { getMedia } from "../servizi/api/media.js";
import { initMap } from "../servizi/map.js";
import { getAssignments, addRating, getRating } from "../servizi/api/intervention.js";
import { openModal } from "../modal_manager.js";
import { getAddressFromCoordinates } from "../servizi/photon.js";
import { searchTenant } from "../servizi/api/tenant.js";

// Stato globale
let lightboxImages = [];
let currentLightboxIndex = 0;
let currentTicket = null;

export const initDettaglioTicket = async (params = null) => {
    const idTicket = params?.id;

    if (!idTicket) {
        await renderError({ title: "Link non valido", message: "Manca l'identificativo del ticket." });
        return;
    }

    try {
        currentTicket = await getTicket(idTicket);
        if (!currentTicket) throw new Error("Ticket not found");

        await inizzializzaPagina(currentTicket);

        // Controllo se è risolto per bloccare l'aggiunta di nuove risposte
        if (isRisolto(currentTicket.id_status)) {
            lockTicketUI();
        } else {
            await inizializzaFormRisposta(currentTicket.id);
        }

    } catch (error) {
        console.error("Errore pagina ticket:", error);
        let msg = "Impossibile recuperare i dettagli.";
        if (error.message && (error.message.includes("not found") || error.status === 404)) {
            msg = `Il ticket con ID "${idTicket}" non esiste.`;
        }
        await renderError({ code: 404, title: "Errore", message: msg });
    }
};



// Blocca interfaccia per ticket risolti
const lockTicketUI = () => {
    const form = document.getElementById('form-new-reply');
    const msg = document.getElementById('ticket-locked-message');
    if (form) form.classList.add('hidden');
    if (msg) msg.classList.remove('hidden');
};

// =========================================================================
// SEZIONE 1: RENDER PAGINA & INFO
// =========================================================================
const inizzializzaPagina = async (ticket) => {
    const domTitle = document.getElementById('ticket-title');
    const domStatus = document.getElementById('ticket-status');
    const domCreator = document.getElementById('ticket-creator');
    const domDate = document.getElementById('ticket-date');
    const domCoords = document.getElementById('ticket-coords');
    const domCategories = document.getElementById('ticket-categories');
    const domReplies = document.getElementById('replies-container');
    const domActions = document.getElementById('ticket-actions-container');

    // 1. Info Utente Creatore
    let authorName = "Utente sconosciuto";
    try {
        const author = await getUtente(ticket.id_creator_user);
        if (author) authorName = `${author.name} ${author.surname}`;
    } catch (e) { }

    const state = await getAllState();

    // 2. Render Header
    domTitle.innerText = ticket.title;
    domStatus.innerText = state[ticket.id_status] || "sconosciuto";
    domStatus.className = `ticket-status-badge status-${ticket.id_status}`;
    domCreator.innerText = authorName;
    domDate.innerText = formatDate(ticket.creation_date);


    if (domCoords) {
        const add = await getAddressFromCoordinates(ticket.lat, ticket.lon);

        domCoords.innerText = add || `${parseFloat(ticket.lat).toFixed(4)}, ${parseFloat(ticket.lon).toFixed(4)}`;

        if (add == "Indirizzo sconosciuto") {
            domCoords.innerText = `Inidirizzo non riconosciuto: ${parseFloat(ticket.lat).toFixed(4)}, ${parseFloat(ticket.lon).toFixed(4)}`
        }

    }





    // 3. Render Categorie
    domCategories.innerHTML = '';
    if (ticket.categories && Array.isArray(ticket.categories)) {
        ticket.categories.forEach(cat => {
            const badge = document.createElement('span');
            badge.className = 'category-badge';
            badge.innerText = cat.label;
            domCategories.appendChild(badge);
        });
    }

    // 4. Mappa Laterale
    const miniMapContainer = document.getElementById('map');
    if (miniMapContainer) {
        initMap({
            centro: { lat: ticket.lat, long: ticket.lon, zoom: 15 },
            tickets: [ticket]
        });
    }

    // 5. Gestione Permessi Azioni Ticket 
    const canManageTicket = await checkTicketPermissions(ticket);
    if (canManageTicket) {
        domActions.classList.remove('hidden');
        domActions.innerHTML = `
            <button class="btn-ticket-action btn-edit" title="Modifica Ticket" onclick="openEditTicketModal()"><i class="fas fa-edit"></i></button>
            <button class="btn-ticket-action btn-delete" title="Elimina Ticket" onclick="handleDeleteTicket('${ticket.id}')"><i class="fas fa-trash-alt"></i></button>
        `;
    }

    // 6. Render Risposte
    const replies = await getAllReplies(ticket.id);
    await renderReplies(replies, domReplies, ticket);
};

// Verifica se l'utente corrente può gestire il ticket (Manager tenant o Operatore assegnato)
const checkTicketPermissions = async (ticket) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return false;

    const tenant = await searchTenant(ticket.lat, ticket.lon);
    // A. Admin o Manager del tenant corrente: Hanno sempre i permessi
    if (isAdmin() || (isResponsabile() && getTenantId() == tenant?.tenant_id)) {
        console.log(true)
        return true;
    }


    // B. Se non è Admin/Manager e NON è nemmeno Operatore,
    // è inutile controllare le assegnazioni. Ritorna subito false.
    if (!isOperatore()) {
        return false;
    }

    // C. Operatore: controlliamo se è assegnato a questo ticket
    try {
        const assignments = await getAssignments(); // Restituisce assegnazioni del tenant corrente
        // Controlla se c'è un assignment per questo ticket e questo utente
        const isAssigned = assignments.some(a =>
            String(a.id_ticket) === String(ticket.id) &&
            String(a.id_user) === String(currentUser.id)
        );
        return isAssigned;
    } catch (e) {
        console.warn("Impossibile verificare assegnazioni", e);
        return false;
    }
};

// =========================================================================
// SEZIONE 2: RENDER REPLY TIMELINE
// =========================================================================
const renderReplies = async (replies, container, ticket) => {
    container.innerHTML = '';

    if (!replies || replies.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999;">Nessun dettaglio disponibile.</p>';
        return;
    }

    const currentUser = getCurrentUser();
    // Permessi globali (Admin/Responsabile possono modificare tutto)
    const userIsAdminOrManager = isAdmin() || isResponsabile();

    // Cache utenti
    const userCache = {};

    // ID Prima risposta (Corpo ticket)
    const firstReplyId = replies[0]?.id;

    for (const reply of replies) {

        // --- A. Info Autore ---
        let replyAuthorName = "Utente";
        if (userCache[reply.id_creator_user]) {
            replyAuthorName = userCache[reply.id_creator_user];
        } else {
            try {
                const user = await getUtente(reply.id_creator_user);
                if (user) {
                    replyAuthorName = `${user.name} ${user.surname}`;
                    userCache[reply.id_creator_user] = replyAuthorName;
                }
            } catch (e) { }
        }

        // --- B. Classi & Stile ---
        const isReport = reply.type === 'REPORT';
        const roleLabel = isReport ? 'Operatore' : 'Cittadino';
        const isMyReply = currentUser && String(currentUser.id) === String(reply.id_creator_user);


        let cardClass = `reply-card reply-type-${reply.type}`;
        if (isMyReply) cardClass += ' reply-mine';

        // --- C. HTML Struttura ---
        const card = document.createElement('div');
        card.className = cardClass;
        card.dataset.id = reply.id;

        // Header
        let htmlContent = `
            <div class="reply-header">
                <div>
                    <span class="reply-author">${replyAuthorName}</span>
                    <span class="reply-role">${roleLabel}</span>
                </div>
                <span class="reply-date">${formatDate(reply.date)}</span>
            </div>
        `;

        // Body (Testo o Edit Mode)
        htmlContent += `<div class="reply-body-container" id="body-container-${reply.id}">
            <div class="reply-body" id="text-${reply.id}">${escapeHtml(reply.body)}</div>
        </div>`;

        // Allegati
        const attachmentsContainerId = `attachments-${reply.id}`;
        htmlContent += `<div id="${attachmentsContainerId}" class="attachment-gallery"></div>`;

        // --- D. Footer (Rating & Azioni) ---
        htmlContent += `<div class="reply-footer">`;

        // 1. Rating (Solo per REPORT e non la prima reply che è il ticket stesso)
        htmlContent += `<div class="rating-section" id="rating-box-${reply.id}">`;
        if (isReport && String(reply.id) !== String(firstReplyId)) {
            // Placeholder per stelle
            htmlContent += await generateRatingHTML(reply);
        }
        htmlContent += `</div>`;

        // 2. Azioni (Edit / Delete)
        // Logica Permessi:
        // - Admin/Manager: Tutto
        // - Utente: Solo le proprie reply (isMyReply)

        let canEdit = userIsAdminOrManager || isMyReply;

        // Se è la prima reply (il ticket), l'editing è gestito dai permessi del ticket, non della reply
        const isFirst = (String(reply.id) === String(firstReplyId));

        // Se è la prima reply, nascondiamo le azioni reply standard qui, perché c'è la barra azioni in alto
        // Se NON è la prima E ho i permessi (Admin o Mia Reply) -> Mostro Edit e Delete
        if (!isFirst && canEdit) {
            if (userIsAdminOrManager) {
                // Admin possono elimianre e modificare reply
                htmlContent += `<div class="reply-actions-right">
                    <button class="btn-reply-action edit" onclick="enableEditMode('${reply.id}', '${reply.id_ticket}')">
                        <i class="fas fa-pencil-alt"></i> Modifica
                    </button>
                    <button class="btn-reply-action delete" onclick="handleDeleteReply('${reply.id_ticket}', '${reply.id}', false)">
                        <i class="fas fa-trash"></i> Elimina
                    </button>
                </div>`;
                // Utente può solo eliminare reply
            } else if (isMyReply) {

                htmlContent += `<div class="reply-actions-right">
                    <button class="btn-reply-action delete" onclick="handleDeleteReply('${reply.id_ticket}', '${reply.id}', false)">
                        <i class="fas fa-trash"></i> Elimina
                    </button>
                </div>`;
            }

        } else if (isFirst) {
            htmlContent += `<div class="reply-actions-right"><em>Ticket Originale</em></div>`;
        }

        htmlContent += `</div>`; // Chiusura Footer

        card.innerHTML = htmlContent;
        container.appendChild(card);

        // Caricamento asincrono immagini
        if (reply.attachments && reply.attachments.length > 0) {
            loadAttachments(reply.attachments, attachmentsContainerId);
        }
    }

    setupLightboxEvents();
};

// =========================================================================
// SEZIONE 3: MODALITÀ EDIT & DELETE (Risposte)
// =========================================================================

// Attiva la textarea al posto del testo
window.enableEditMode = (replyId, ticketId) => {
    const container = document.getElementById(`body-container-${replyId}`);
    const textEl = document.getElementById(`text-${replyId}`);
    const originalText = textEl.innerText;

    // Sostituisci il contenuto con textarea e bottoni Salva/Annulla
    container.innerHTML = `
        <textarea id="edit-area-${replyId}" class="edit-textarea">${originalText}</textarea>
        <div style="margin-top:5px; display:flex; gap:10px;">
            <button class="btn-submit" style="padding:5px 10px; font-size:0.8rem;" onclick="saveReplyEdit('${ticketId}', '${replyId}')">Salva</button>
            <button class="btn-icon" style="padding:5px 10px; font-size:0.8rem;" onclick="cancelReplyEdit('${replyId}', '${escapeHtml(originalText)}')">Annulla</button>
        </div>
    `;
};

// Annulla modifica
window.cancelReplyEdit = (replyId, originalText) => {
    const container = document.getElementById(`body-container-${replyId}`);
    container.innerHTML = `<div class="reply-body" id="text-${replyId}">${originalText}</div>`;
};

// Salva Modifica
window.saveReplyEdit = async (ticketId, replyId) => {
    const newText = document.getElementById(`edit-area-${replyId}`).value;

    try {
        await updateReply(ticketId, replyId, newText);
        // Ripristina vista normale col nuovo testo
        const container = document.getElementById(`body-container-${replyId}`);
        container.innerHTML = `<div class="reply-body" id="text-${replyId}">${escapeHtml(newText)}</div>`;
    } catch (error) {
        console.error("Errore modifica:", error);
        alert("Errore durante il salvataggio della modifica.");
    }
};

// Elimina Risposta
window.handleDeleteReply = async (idTicket, idReply, isFirst) => {
    if (!confirm("Sei sicuro di voler eliminare questa risposta?")) return;

    try {
        await deleteReply(idTicket, idReply);
        window.location.reload();
    } catch (error) {
        console.error("Errore cancellazione:", error);
        alert("Errore durante l'operazione.");
    }
};

// =========================================================================
// SEZIONE 4: GESTIONE TICKET (Edit / Delete Ticket intero)
// =========================================================================

window.handleDeleteTicket = async (idTicket) => {
    if (!confirm("ATTENZIONE: Stai per eliminare l'intero TICKET.\nTutti i dati andranno persi.\nProcedere?")) return;
    try {
        await deleteTicket(idTicket);
        alert("Ticket eliminato.");
        window.location.href = '/';
    } catch (e) {
        console.error(e);
        alert("Errore eliminazione ticket");
    }
};

window.openEditTicketModal = () => {


    const catSelezionate = currentTicket?.categories.map(cb => String(cb.id));

    const datiDaSalvare = {
        titolo: currentTicket.title,
        categorie: catSelezionate,
    };

    openModal('ticket', {
        lat: currentTicket.lat,
        lng: currentTicket.lon,
        oldData: datiDaSalvare,
        ticketId: currentTicket.id
    });
};

// =========================================================================
// SEZIONE 5: RATING (Valutazioni)
// =========================================================================


const generateRatingHTML = async (reply) => {

    let ratings = []
    try {
        ratings = await getRating(reply.id);

    } catch (error) {


    }
    // 2. Calcolo Statistiche
    const totalVotes = ratings.length;
    const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
    const avg = totalVotes > 0 ? (sum / totalVotes) : 0;

    // 3. Controllo Utente e Voto
    const currentUser = getCurrentUser();

    // Variabile booleana: è loggato?
    const isLoggedIn = !!currentUser;

    // Cerchiamo il voto solo se l'utente è loggato, altrimenti undefined
    const userVote = isLoggedIn ? ratings.find(r => String(r.id_user) === String(currentUser.id)) : undefined;

    const hasVoted = !!userVote;

    // LOGICA DI BLOCCO: Blocco se NON è loggato O se HA votato
    const isInteractionDisabled = !isLoggedIn || hasVoted;

    // Testo del tooltip dinamico
    let tooltipTitle = "Valuta intervento";
    if (!isLoggedIn) {
        tooltipTitle = "Devi effettuare l'accesso per votare";
    } else if (hasVoted) {
        tooltipTitle = "Hai già votato";
    }

    // 4. Generazione HTML
    let starsHtml = `<div class="rating-container" data-reply-id="${reply.id}">`;

    starsHtml += `<div class="stars ${isInteractionDisabled ? 'disabled-stars' : ''}" title="${tooltipTitle}">`;

    for (let i = 1; i <= 5; i++) {
        const fillClass = i <= Math.round(avg) ? '' : 'empty';

        // Logica Click: Rimuovo onclick se l'interazione è disabilitata (non loggato o già votato)
        const onclickAttr = isInteractionDisabled ? '' : `onclick="submitRating('${reply.id}', ${i})"`;

        // Highlight del mio voto (solo se ho votato)
        const myVoteClass = (hasVoted && Math.round(userVote.rating) === i) ? 'user-selected' : '';

        starsHtml += `<i class="fas fa-star star ${fillClass} ${myVoteClass}" ${onclickAttr}></i>`;
    }
    starsHtml += `</div>`;

    // 5. Visualizzazione Conteggio
    if (totalVotes > 0) {
        starsHtml += `<span class="rating-value">(${parseFloat(avg).toFixed(1)} <small class="text-muted">/ ${totalVotes} voti</small>)</span>`;
    } else {
        starsHtml += `<span class="rating-value"><small>Nessun voto</small></span>`;
    }

    starsHtml += `</div>`;

    return starsHtml;
};

window.submitRating = async (replyId, ratingValue) => {
    if (!confirm(`Vuoi valutare questo intervento con ${ratingValue} stelle?`)) return;

    try {
        console.log(ratingValue)
        await addRating(ratingValue, replyId);
        alert("Grazie per la valutazione!");
        window.location.reload();
    } catch (error) {
        console.error("Errore rating:", error);
        alert("Errore invio valutazione: potrebbe già essere presente un voto per questo report. " + (error.message || ""));
    }
};

// =========================================================================
// SEZIONE 6: MEDIA & LIGHTBOX
// =========================================================================
const loadAttachments = async (mediaIds, containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    for (const mediaId of mediaIds) {
        try {
            const imgUrl = await getMedia(mediaId);
            if (imgUrl) {
                const img = document.createElement('img');
                img.src = imgUrl;
                img.className = 'attachment-thumb';
                img.onclick = () => openLightbox(imgUrl);
                img.dataset.fullUrl = imgUrl;
                container.appendChild(img);
            }
        } catch (e) { console.warn("Errore media", mediaId); }
    }
};

const openLightbox = (currentUrl) => {
    const modal = document.getElementById('lightbox-modal');
    const imgEl = document.getElementById('lightbox-img');
    const allImages = document.querySelectorAll('.attachment-thumb');
    lightboxImages = Array.from(allImages).map(img => img.src);
    currentLightboxIndex = lightboxImages.indexOf(currentUrl);
    imgEl.src = currentUrl;
    modal.classList.remove('hidden');
};

const setupLightboxEvents = () => {
    if (window.lightboxInitialized) return;
    window.lightboxInitialized = true;
    const modal = document.getElementById('lightbox-modal');
    const close = () => modal.classList.add('hidden');
    const show = (idx) => {
        if (idx < 0) idx = lightboxImages.length - 1;
        if (idx >= lightboxImages.length) idx = 0;
        currentLightboxIndex = idx;
        document.getElementById('lightbox-img').src = lightboxImages[idx];
    };
    document.querySelector('.lightbox-close').onclick = close;
    document.querySelector('.lightbox-prev').onclick = (e) => { e.stopPropagation(); show(currentLightboxIndex - 1); };
    document.querySelector('.lightbox-next').onclick = (e) => { e.stopPropagation(); show(currentLightboxIndex + 1); };
    modal.onclick = (e) => { if (e.target === modal) close(); };
};


// =========================================================================
// SEZIONE 7: FORM NUOVA RISPOSTA
// =========================================================================
const inizializzaFormRisposta = async (idTicket) => {
    const form = document.getElementById('form-new-reply');
    const btnAddFiles = document.getElementById('btn-add-files');
    const fileInput = document.getElementById('reply-files');
    const fileCountLabel = document.getElementById('file-count');

    if (btnAddFiles) btnAddFiles.onclick = () => fileInput.click();
    if (fileInput) fileInput.onchange = () => {
        fileCountLabel.innerText = fileInput.files.length > 0 ? `${fileInput.files.length} file` : '';
    };

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const text = document.getElementById('reply-text').value;
            const files = fileInput.files;
            const btnSubmit = form.querySelector('.btn-submit');

            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '...';

            try {
                await postReply(idTicket, text, files);
                window.location.reload();
            } catch (error) {
                console.error(error);
                alert("Errore invio risposta.");
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = 'Invia';
            }
        };
    }
};

// --- Helpers ---
const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const escapeHtml = (text) => {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};