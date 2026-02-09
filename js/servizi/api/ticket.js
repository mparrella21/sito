import { richiesta } from "./baseServizi.js";
import { API_URL } from "./config.js";
import { getAllTenants } from "./tenant.js";

// --- COSTANTI URL ---
const URL_TICKET = `${API_URL}/ticket`;
const URL_CATEGORIES = `${URL_TICKET}/categories`;

// =========================================================================
// 1. GESTIONE STATI
// =========================================================================

const state = {
    1: 'Aperto',
    2: 'In lavorazione',
    3: 'Risolto'
};

/**
 * Restituisce una copia degli stati disponibili
 */
export const getAllState = async () => {
    return structuredClone(state);
};

// Helper Stato Risolto
export const isRisolto = (statusId) => {
    return statusId == 3;
};


// =========================================================================
// 2. GESTIONE TICKET
// =========================================================================

/**
 * Helper interno per recuperare i ticket del tenant in sessione
 */
const getAllTicketCurrentTenant = async () => {
    return await richiesta({
        url: URL_TICKET,
        method: 'GET',
        auth: false,
        tenant: true
    });
};

/**
 * Recupera i ticket di uno specifico tenant (o di quello in sessione se null)
 */
export const getAllTicketTenant = async (idTenant = null) => {
    if (!idTenant) return getAllTicketCurrentTenant();

    return await richiesta({
        url: URL_TICKET,
        method: 'GET',
        auth: false,
        body: { tenant_id: idTenant }
    });
};

/**
 * Recupera i ticket di TUTTI i tenant disponibili
 */
export const getAllTickets = async (listaIdTenant = null) => {
    try {
        if (!listaIdTenant) {
            const tenants = await getAllTenants();
            listaIdTenant = tenants.map(t => typeof t === 'object' ? t.id : t);
        }

        if (!listaIdTenant.length) return [];

        const promesse = listaIdTenant.map(id => getAllTicketTenant(id));
        const risultati = await Promise.all(promesse);

        return risultati.flat();
    } catch (error) {
        console.error("Errore nel caricamento massivo dei ticket:", error);
        return [];
    }
};

/**
 * Recupera i dettagli di un singolo ticket
 */
export const getTicket = async (id) => {
    if (!id) throw new Error("ID ticket mancante");
    return await richiesta({
        url: `${URL_TICKET}/${id}`,
        method: 'GET',
        auth: false,
        tenant: true
    });
};

/**
 * Crea un nuovo ticket 
 */
export const postTicket = async (title, lat, lon, categories, id_status = 1) => {
    if (!lat || !lon) throw new Error("Coordinate (lat/lon) mancanti per creare il ticket");
    if (!title) throw new Error("Coordinate (lat/lon) mancanti per creare il ticket");


    const body = {
        title: title,
        id_status: id_status,
        lat: lat,
        lon: lon,
        categories: categories
    };

    return await richiesta({
        url: URL_TICKET,
        method: 'POST',
        tenant: true,
        body: body
    });
};

/**
 * Aggiorna un ticket esistente 
 */
export const updateTicket = async (id, title = null, lat = null, lon = null, categories) => {
    if (!id) throw new Error("ID ticket mancante");


    const body = {
        title: title,
        lat: lat,
        lon: lon,
        categories: categories
    };

    return await richiesta({
        url: `${URL_TICKET}/${id}`,
        method: 'PUT',
        tenant: true,
        utente: true,
        body: body
    });
};

/**
 * Aggiorna lo stato di un ticket esistente 
 */
export const updateTicketStatus = async (id, id_status = 1) => {
    if (!id) throw new Error("ID ticket mancante");

    const body = {
        id_status: id_status
    };

    return await richiesta({
        url: `${URL_TICKET}/${id}/status`,
        method: 'PUT',
        tenant: true,
        utente: true,
        body: body
    });
};

/**
 * Rimuove un ticket 
 */
export const deleteTicket = async (id) => {
    if (!id) throw new Error("ID ticket mancante");


    const replies = await getAllReplies(id)
    if (replies && !(replies.length === 0)) {
        for (const reply of replies) {

            try {
                await deleteReply(id, reply.id)
            } catch {
                console.warn("Errore eliminazione di una reply")
            }
        }
    }



    return await richiesta({
        url: `${URL_TICKET}/${id}`,
        method: 'DELETE',
        utente: true,
        tenant: true
    });
};

// =========================================================================
// 3. GESTIONE REPLY
// =========================================================================

/**
 * Recupera tutte le reply associate a un ticket
 */
export const getAllReplies = async (idTicket) => {
    if (!idTicket) throw new Error("ID ticket mancante");
    return await richiesta({
        url: `${URL_TICKET}/${idTicket}/reply`,
        method: 'GET',
        auth: false,
        tenant: true
    });
};

/**
 * Recupera una singola reply specifica
 */
export const getReply = async (idTicket, idReply) => {
    if (!idTicket || !idReply) throw new Error("ID ticket o ID reply mancanti");

    return await richiesta({
        url: `${URL_TICKET}/${idTicket}/reply/${idReply}`,
        method: 'GET',
        auth: false,
        tenant: true
    });
};

/**
 * Inserisce una nuova reply 
 */
export const postReply = async (idTicket, body = null, imgs = []) => {
    if (!idTicket) throw new Error("ID ticket mancante");


    const bodyData = new FormData();
    bodyData.append('body', body || "");

    if (imgs && imgs.length > 0) {
        for (let i = 0; i < imgs.length; i++) {
            const file = imgs[i];
            bodyData.append('file', file);
        }
    }





    return await richiesta({
        url: `${URL_TICKET}/${idTicket}/reply`,
        method: 'POST',
        utente: true,
        tenant: true,
        body: bodyData
    });
};

/**
 * Aggiorna una reply 
 */
export const updateReply = async (idTicket, idReply, textBody) => {
    if (!idTicket || !idReply) throw new Error("ID ticket o ID reply mancanti");

    const data = {};
    if (textBody !== undefined) data.body = textBody;

    return await richiesta({
        url: `${URL_TICKET}/${idTicket}/reply/${idReply}`,
        method: 'PUT',
        tenant: true,
        body: data
    });
};

/**
 * Rimuove una reply 
 */
export const deleteReply = async (idTicket, idReply) => {
    if (!idTicket || !idReply) throw new Error("ID ticket o ID reply mancanti");

    return await richiesta({
        url: `${URL_TICKET}/${idTicket}/reply/${idReply}`,
        method: 'DELETE',
        tenant: true,
        utente: true
    });
};

// =========================================================================
// 4. GESTIONE CATEGORIE
// =========================================================================

/**
 * Recupera l'elenco di tutte le categorie
 */
export const getAllCategories = async () => {
    return await richiesta({
        url: URL_CATEGORIES,
        method: 'GET',
        auth: false
    });
};

/**
 * Crea una nuova categoria
 */
export const createCategory = async (label) => {
    return await richiesta({
        url: URL_CATEGORIES,
        method: 'POST',
        body: { label }
    });
};

/**
 * Aggiorna una categoria esistente 
 */
export const updateCategory = async (id, label) => {
    const payload = {};
    if (label !== undefined) payload.label = label;

    return await richiesta({
        url: `${URL_CATEGORIES}/${id}`,
        method: 'PUT',
        body: { payload }
    });
};

/**
 * Rimuove una categoria 
 */
export const deleteCategory = async (id) => {
    return await richiesta({
        url: `${URL_CATEGORIES}/${id}`,
        method: 'DELETE',
        auth: true
    });
};