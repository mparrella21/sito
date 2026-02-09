import { richiesta } from "./baseServizi.js";
import { API_URL } from "./config.js";

const URL_USER = `${API_URL}/user`;

// *********************************** Recupero utenti ********************************************
export const getAllUsers = async () => {
    return await richiesta({
        url: URL_USER,
        method: 'GET'
    });
};

// *********************************** Recupero utente singolo ********************************************
export const getUtente = async (id) => {
    if (!id) throw new Error("Errore getUtente: ID utente mancante.");

    return await richiesta({
        url: `${URL_USER}/${id}`,
        method: 'GET',
        auth: false
    });
};

// *********************************** Aggiunta anagrafia utente ********************************************
/* CASO SPECIALE: L'utente si sta registrando, il token non è nel localStorage ma viene passato come parametro.
   Disabilitiamo 'auth' automatico e passiamo l'header manualmente.
*/
export const postUtente = async (accessToken, id, nome, cognome, compleanno, cellulare) => {

    if (!accessToken) throw new Error("Errore postUtente: Token mancante.");
    if (!id) throw new Error("Errore postUtente: ID utente mancante.");

    const body = {
        user_id: id,
        name: nome,
        surname: cognome,
        birth_date: compleanno,
        phonenumber: cellulare,
    };

    return await richiesta({
        url: URL_USER,
        method: 'POST',
        auth: false,
        headers: {
            'Authorization': `Bearer ${accessToken}`
        },
        body: body
    });
};

// *********************************** Elimino utente ********************************************
export const deleteUtente = async (id) => {
    if (!id) throw new Error("Errore deleteUtente: ID utente mancante.");

    return await richiesta({
        url: `${URL_USER}/${id}`,
        method: 'DELETE',
        utente: true
    });
};

// *********************************** Update anagrafia utente ********************************************
export const updateUtente = async (id, nome = null, cognome = null, compleanno = null, cellulare = null) => {

    if (!id) throw new Error("Errore updateUtente: ID utente mancante.")

    // Costruiamo il body mappando i parametri
    const body = {
        name: nome,
        surname: cognome,
        birth_date: compleanno,
        phonenumber: cellulare,
    };

    return await richiesta({
        url: `${URL_USER}/${id}`,
        method: 'PUT',
        body: body
    });
};