import { getURLBase } from "./baseServizi.js";
import { getUtenteWithRuolo } from "./utenti.js";




const urlBASE = getURLBase();
const urlBaseLogin = urlBASE + "????"; // URL per le credenziali da riverdere




// ****************************************************
// DA ELIMINARE UNA VOLTA CE SI INSERISCE IL COLLEGAMENTO
const esempioResultCredentials = {
    success: true,
    user: {
        id: "455a4f8f-40c6-40b9-b8b7-48718f247e64",
        role: "Cittadino"
    }
}

// ****************************************************
// ****************************************************

const KEY_USER = 'app_current_user';
const KEY_TIMESTAMP = 'app_last_activity';
const SESSION_DURATION = 20 * 60 * 1000; // 20 minuti
let logoutTimer;






// ***********************************************************************
// Funzione che verifica le credenziali
export const login = async (email, password) => {


    const datiLogin = {
        email: email,
        password: password
    };

    try {
        const response = await fetch(urlBaseLogin, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(datiLogin)
        });

        const result = await response.json();

        if (response.ok && result.success) {

            return loginUser(result.user);

        } else {

            throw new Error(result.message || "Errore durante il login");
        }

    } catch (error) {


        // ****************************************************
        // DA ELIMINARE UNA VOLTA CE SI INSERISCE IL COLLEGAMENTO
        return loginUser(esempioResultCredentials.user);
        // ****************************************************
        // ****************************************************



        console.error("Errore Login:", error);
        throw error;
    }
};


// ***************************************************************
// Funzione per il logout
export const logout = () => {
    sessionStorage.removeItem(KEY_USER);
    sessionStorage.removeItem(KEY_TIMESTAMP);
    if (logoutTimer) clearTimeout(logoutTimer);

    // Ricarica la pagina per resettare lo stato dell'app
    window.location.reload();
};


// ***************************************************************
// Funzione per ottenere le informazioni dell'utente attuale
export const getCurrentUser = () => {
    const userStr = sessionStorage.getItem(KEY_USER);
    if (!userStr) return null;

    // Controllo Scadenza
    const lastActivity = sessionStorage.getItem(KEY_TIMESTAMP);
    if (lastActivity && (Date.now() - lastActivity > SESSION_DURATION)) {
        console.log("Sessione scaduta.");
        logout();
        return null;
    }

    updateActivity();
    return JSON.parse(userStr);
};


// ***************************************************************
// Funzione per ottenere il ruolo di un utente
export const getRuolo = async (id) => {

    try {
        const response = await fetch(urlBaseLogin + "/" + id, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(datiLogin)
        });

        const result = await response.json();

        if (response.ok && result.success) {

            return result.user.role;

        } else {

            throw new Error(result.message || "Errore durante il login");
        }

    } catch (error) {


        // ****************************************************
        // DA ELIMINARE UNA VOLTA CE SI INSERISCE IL COLLEGAMENTO
        return esempioResultCredentials.user.role;
        // ****************************************************
        // ****************************************************



        console.error("Errore Login:", error);
        throw error;
    }


};





// ***************************************************************
// --- Funzioni Interne (Helper) ---


// Funzione che salva i dati in sessione effettuando effettivamente il login
const loginUser = async (user) => {

    try {

        const userCompleto = getUtenteWithRuolo(user.id);

        sessionStorage.setItem(KEY_USER, JSON.stringify(userCompleto));
        updateActivity();
        return userCompleto;


    } catch (error) {

        // ****************************************************
        // DA ELIMINARE UNA VOLTA CE SI INSERISCE IL COLLEGAMENTO
        const userCompleto = { ...user, ...esempioResultUser.user };
        sessionStorage.setItem(KEY_USER, JSON.stringify(userCompleto));
        updateActivity();
        return userCompleto;
        // ****************************************************
        // ****************************************************

        console.error("Errore Login:", error);
        throw error;
    }

};


// Funzione per gestire il timer per il logout
const updateActivity = () => {
    sessionStorage.setItem(KEY_TIMESTAMP, Date.now());
    startLogoutTimer();
};


// Funzione che resetta il timer o lo fa partire
const startLogoutTimer = () => {
    if (logoutTimer) clearTimeout(logoutTimer);
    logoutTimer = setTimeout(() => {
        alert("Sessione scaduta per inattività");
        logoutUser();
    }, SESSION_DURATION);
};

// Facciamo partire il monitoraggio attività
window.addEventListener('click', () => {
    if (sessionStorage.getItem(KEY_USER)) updateActivity();
});


