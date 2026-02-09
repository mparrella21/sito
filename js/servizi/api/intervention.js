import { richiesta } from "./baseServizi.js";
import { API_URL } from "./config.js";

// --- COSTANTI URL ---
const BASE_INTERVENTION = `${API_URL}/intervention`;

const URL_OP_CATEGORIES = `${BASE_INTERVENTION}/operator-categories`;
const URL_MAP_USER_OP = `${BASE_INTERVENTION}/mappings/user-operator`;
const URL_MAP_OP_TICKET = `${BASE_INTERVENTION}/mappings/operator-ticket`;
const URL_ASSIGNMENT = `${BASE_INTERVENTION}/assignment`;
const URL_RATING = `${BASE_INTERVENTION}/rating`;


// *********************************** Recupero Categorie operatore ********************************************
export const getOperatorCategories = async () => {
    return await richiesta({
        url: URL_OP_CATEGORIES
    });
};

// *********************************** Aggiunta Categorie operatore ********************************************
export const createOperatorCategory = async (label) => {
    return await richiesta({
        url: URL_OP_CATEGORIES,
        method: 'POST',
        body: { label }
    });
};

// *********************************** Aggiornamento Categorie operatore ********************************************
export const updateOperatorCategory = async (id, label) => {
    return await richiesta({
        url: `${URL_OP_CATEGORIES}/${id}`,
        method: 'PUT',
        body: { label }
    });
};

// *********************************** Eliminazione categoria ********************************************
export const deleteOperatorCategory = async (id) => {
    return await richiesta({
        url: `${URL_OP_CATEGORIES}/${id}`,
        method: 'DELETE'
    });
};

// *********************************** Recupero tutti mapping operatore->categoria ********************************************
export const getUserOperatorMappings = async () => {
    return await richiesta({
        url: URL_MAP_USER_OP,
        method: 'GET',
        tenant: true
    });
};

// *********************************** Aggiunta categoria a operatore ********************************************
// QUI id_user RESTA: È un admin che assegna una categoria a un altro utente
export const addUserOperatorCategory = async (id_user, id_operator_category) => {
    return await richiesta({
        url: URL_MAP_USER_OP,
        method: 'POST',
        tenant: true,
        body: {
            id_user,
            id_operator_category
        }
    });
};

// *********************************** cancella categoria a operatore ********************************************
// QUI id_user RESTA: È un admin che toglie la categoria a un altro utente
export const removeUserOperatorCategory = async (id_user, id_operator_category) => {
    return await richiesta({
        url: URL_MAP_USER_OP,
        method: 'DELETE',
        tenant: true,
        body: {
            id_user,
            id_operator_category
        }
    });
};

// *********************************** Recupero operatori della categoria di un ticket ********************************************
export const getOperatorCategoryTicketCategoryMappings = async () => {
    return await richiesta({
        url: URL_MAP_OP_TICKET,
        method: 'GET'
    });
};

// *********************************** Aggiunta operatori della categoria di un ticket ********************************************
export const addOperatorCategoryTicketCategoryMapping = async (id_operator_category, id_ticket_category) => {
    return await richiesta({
        url: URL_MAP_OP_TICKET,
        method: 'POST',
        body: {
            id_operator_category,
            id_ticket_category
        }
    });
};

// *********************************** Rimozione operatore della categoria di un ticket ********************************************
export const removeOperatorCategoryTicketCategoryMapping = async (id_operator_category, id_ticket_category) => {
    return await richiesta({
        url: URL_MAP_OP_TICKET,
        method: 'DELETE',
        body: {
            id_operator_category,
            id_ticket_category
        }
    });
};

// *********************************** Recupero delle assegnazione operatore-ticket ********************************************
export const getAssignments = async () => {
    return await richiesta({
        url: URL_ASSIGNMENT,
        method: 'GET',
        tenant: true
    });
};

// *********************************** Recupero di una assegnazione operatore-ticket ********************************************
export const getAssignmentById = async (id) => {
    return await richiesta({
        url: `${URL_ASSIGNMENT}/${id}`,
        method: 'GET',
        tenant: true
    });
};

// *********************************** Aggiunta delle assegnazione operatore-ticket ********************************************
export const addAssignment = async (user_id, id_ticket) => {
    return await richiesta({
        url: URL_ASSIGNMENT,
        method: 'POST',
        tenant: true,
        body: {
            user_id,
            id_ticket
        }
    });
};

// *********************************** Rimozione di una assegnazione operatore-ticket ********************************************
// QUI id_user RESTA: Admin rimuove assegnazione
export const removeAssignment = async (id, id_user) => {
    return await richiesta({
        url: `${URL_ASSIGNMENT}/${id}`,
        method: 'DELETE',
        tenant: true,
        body: { id_user }
    });
};

// *********************************** Recupero valutazione di un intervento ********************************************
export const getRating = async (id) => {
    return await richiesta({
        url: `${URL_RATING}/${id}`,
        method: 'GET',
        tenant: true
    });
};

// *********************************** Aggiunta valutazione di un intervento ********************************************
export const addRating = async (rating, id_ticket_reply) => {
    return await richiesta({
        url: URL_RATING,
        method: 'POST',
        tenant: true,
        utente: true,
        body: {
            rating,
            id_ticket_reply
        }
    });
};

// *********************************** Rimozione valutazione di un intervento ********************************************
// MODIFICA: Qui c'era user_id, quindi è l'utente che cancella il PROPRIO rating.
// Abbiamo rimosso il parametro user_id e aggiunto utente: true
export const deleteRating = async (id) => {
    return await richiesta({
        url: `${URL_RATING}/${id}`,
        method: 'DELETE',
        tenant: true,
        utente: true
    });
};