
import { getURLBase } from "./baseServizi.js";
import { getCurrentUser } from './autenticazione.js';


const urlBASE = getURLBase() + "/ticket"

// ****************************************************
// DA ELIMINARE UNA VOLTA CE SI INSERISCE IL COLLEGAMENTO
const esempioResultTickets = {
    success: true,
    ticket: {
        "categories": [{ "id": 1, "label": "Illuminazione pubblica" }, { "id": 3, "label": "Manutenzione strade" }, { "id": 5, "label": "Segnaletica" }],
        "creation_date": "Sat, 24 Jan 2026 22:41:51 GMT",
        "id": "c68a398b-268f-4805-aa04-1dd2e2ee88da",
        "id_creator_user": "455a4f8f-40c6-40b9-b8b7-48718f247e64",
        "id_status": 1,
        "lat": "40.6882860",
        "lon": "14.5222150",
        "title": "Problema illuminazione pubblica"
    }
}
// ****************************************************
// ****************************************************





// *********************************** Recupero tickets ********************************************
export const getAllTickets = async () => {

    try {

        const response = await fetch(urlBASE, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok && result.success) {
            return result.tickets;
        } else {
            throw new Error("Errore nel recupero tickets");
        }
    } catch (error) {
        console.error("Errore database:", error);

        return [ticket];
    }
};


// *********************************** Recupero ticket ********************************************
export const getTicket = async (id) => {

    if (!id) throw new Error("Errore nel recupero ticket: id assente");

    try {

        const response = await fetch(urlBASE + "/" + id, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok && result.success) {
            return result.ticket;
        } else {
            throw new Error("Errore nel recupero ticket");
        }

    } catch (error) {
        console.error("Errore database:", error);

        throw error;
    }
};






// *********************************** Inserimento ticket ********************************************
export const postTicket = async (ticket) => {

    const user = getCurrentUser();

    // Se non c'è l'utente nel browser, blocca tutto PRIMA di chiamare il server
    if (!user || !user.id) {
        alert("Devi fare login per poter inserire un ticket!");
        return;
    }

    const dati = {
        ...ticket,
        id_creator_user: user.id
    }

    try {

        const response = await fetch(urlBASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(dati)
        });

        const result = await response.json();

        return result.success;
    } catch (error) {
        console.error(error);
        throw error;
    }
};





// *************************************************************************
// *************************************************************************
// *************************************************************************
// ***************************** Gestione reply ****************************



// *********************************** Recupero tutte le reply per un ticket ********************************************
export const getAllReplies = async (idTicket) => {

    try {

        const response = await fetch(urlBASE + "/" + idTicket + "/reply", {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok && result.success) {
            return result.replies;
        } else {
            throw new Error("Errore nel recupero replies");
        }
    } catch (error) {
        console.error("Errore database:", error);

        return [];
    }
};


// *********************************** Recupero reply  di un ticket ********************************************
export const getReply = async (idTicket, idReply) => {

    if (!id) throw new Error("Errore nel recupero ticket: id assente");

    try {

        const response = await fetch(urlBASE + "/" + idTicket + "/reply/" + idReply, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok && result.success) {
            return result.reply;
        } else {
            throw new Error("Errore nel recupero reply");
        }

    } catch (error) {
        console.error("Errore database:", error);

        throw error;
    }
};






// *********************************** Inserimento ticket ********************************************
export const postReply = async (idTicket, reply) => {

    const user = getCurrentUser();

    // Se non c'è l'utente nel browser, blocca tutto PRIMA di chiamare il server
    if (!user || !user.id) {
        alert("Devi fare login per poter inserire un ticket!");
        return;
    }

    const dati = {
        ...reply,
        user: user.id
    }

    try {

        const response = await fetch(urlBASE + "/" + idTicket + "/reply", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(dati)
        });

        const result = await response.json();

        return result.success;
    } catch (error) {
        console.error(error);
        throw error;
    }
};