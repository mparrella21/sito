import { getURLBase } from "./baseServizi.js";
import { getRuolo } from "./autenticazione.js";


const urlBASE = getURLBase() + "/user";


// ****************************************************
// DA ELIMINARE UNA VOLTA CE SI INSERISCE IL COLLEGAMENTO
const esempioResultUser = {
    success: true,
    user: {
        id: "455a4f8f-40c6-40b9-b8b7-48718f247e64",
        name: "Mario",
        phonenumber: "3331234567",
        surname: "Rossi",
        birth_date: Date("Tue, 15 May 1990 00:00:00 GMT"),
        creation_date: Date("Sat, 24 Jan 2026 22:13:15 GMT")
    }
}
// ****************************************************
// ****************************************************




// *********************************** Recupero utenti ********************************************
export const getAllUsers = async () => {

    try {

        const response = await fetch(urlBASE, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok && result) {
            return result.users;
        } else {
            throw new Error("Errore nel recupero degli utenti");
        }

    } catch (error) {
        console.error("Errore database:", error);

        return [];
    }
};



// *********************************** Recupero utente ********************************************
export const getUtente = async (id) => {

    if (!id) throw new Error("Errore nel recupero dati utente: id assente");

    try {

        const response = await fetch(urlBASE + "/" + id, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok && result.success) {
            return result.user;
        } else {
            throw new Error(result.message || "Errore nel recupero dati utente");
        }
    } catch (error) {
        console.error("Errore database:", error);


        // ****************************************************
        // DA ELIMINARE UNA VOLTA CE SI INSERISCE IL COLLEGAMENTO
        return esempioResultUser.user;
        // ****************************************************
        // ****************************************************

        throw error;
    }

};


// *********************************** Recupero utente con anche richiesta del ruolo ********************************************
export const getUtenteWithRuolo = async (id) => {

    if (!id) throw new Error("Errore nel recupero dati utente: id assente");

    try {

        const user = getUtente(id);
        user.role = getRuolo(id);

        return user;


    } catch (error) {
        console.error("Errore database:", error);

        // ****************************************************
        // DA ELIMINARE UNA VOLTA CE SI INSERISCE IL COLLEGAMENTO
        const utenteCompleto = {
            ...esempioResultUser.user,
            role: getRuolo(id)
        };
        return utenteCompleto;
        // ****************************************************
        // ****************************************************

        throw error;
    }

};
