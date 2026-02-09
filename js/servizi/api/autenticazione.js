import { richiesta } from "./baseServizi.js";
import { BASE_URL, API_URL } from "./config.js";
import { getUtente } from "./utenti.js";


const URL_AUTH = `${BASE_URL}/auth`;
const URL_OPERATOR = `${API_URL}/operator`;
const URL_MANAGER = `${API_URL}/manager`;

// --- CHIAVI STORAGE ---
const ACCESS_TOKEN_KEY = 'app_access_token';
const REFRESH_TOKEN_KEY = 'app_refresh_token';
const USER_KEY = 'app_current_user';
const LAST_ACTIVITY_KEY = 'app_last_activity';
const LOGIN_TIMESTAMP_KEY = 'app_login_timestamp';

// --- CHIAVI SESSION ---
const TENANT_ID_KEY = 'app_tenant_id';

// --- CONFIGURAZIONE TEMPI ---
const INACTIVITY_LIMIT = 1 * 60 * 60 * 1000; // 1 Ora
const ABSOLUTE_EXPIRATION = 3 * 24 * 60 * 60 * 1000; // 3 Giorni

let activityTimer;
let absoluteTimer;

const ruoli = {
    0: "cittadino",
    1: "operatore",
    2: "responsabile",
    3: "admin"
};

export const getRuoli = () => {
    return structuredClone(ruoli);
}

// ***********************************************************************
// GETTERS & SETTERS
// ***********************************************************************

export const getAccessToken = async () => {
    let token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return null;

    // Verifica scadenza
    if (isTokenExpired(token)) {
        console.warn("Token scaduto. Tentativo di refresh...");
        try {
            token = await performRefreshToken();
        } catch (e) {
            // Se il refresh fallisce (es. refresh token scaduto anche lui), facciamo logout
            console.error("Refresh fallito", e);
            logout();
            return null;
        }
    }

    return token;
};



export const getTenantId = () => {
    // 1) Cerca nel SessionStorage (priorità assoluta per la scheda corrente)
    let tid = sessionStorage.getItem(TENANT_ID_KEY);
    if (tid) return JSON.parse(tid);

    // 2) Se non c'è in sessione, prendiamo quello di default dell'utente se c'è 
    const user = getCurrentUserSync();
    if (user?.tenant_id) {
        setTenantId(user?.tenant_id);
        return user?.tenant_id;
    }
    return null;
};

export const setTenantId = (tenantId) => {

    if (tenantId) {
        sessionStorage.setItem(TENANT_ID_KEY, JSON.stringify(tenantId));
    } else {
        sessionStorage.removeItem(TENANT_ID_KEY);
    }
};


export const getTenantIdCurrentUser = () => {

    // 1) Cerca nel SessionStorage (priorità assoluta per la scheda corrente)
    let tid = getCurrentUser()?.tenant_id;
    if (!tid) return null;

    return tid;
};

// ***************************************************************
// RECUPERO UTENTE
// ***************************************************************
// Versione interna sincrona per uso interno per evitare di chiamare logout ricorsivamente
const getCurrentUserSync = () => {
    const userStr = localStorage.getItem(USER_KEY);
    try { return userStr ? JSON.parse(userStr) : null; } catch (e) { return null; }
}

export const setCurrentUser = (user) => {
    if (!user) {
        logout();
        return;
    }
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export const getCurrentUser = () => {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;

    // 1) Controllo Scadenza Assoluta (3 Giorni) - NON SI RESETTA COL REFRESH
    const loginTime = parseInt(localStorage.getItem(LOGIN_TIMESTAMP_KEY) || 0);
    if (Date.now() - loginTime > ABSOLUTE_EXPIRATION) {
        logout(); return null;
    }

    // 2) Controllo Inattività (1 Ora) - RESETTATO DAI CLICK
    const lastActivity = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
    if (Date.now() - lastActivity > INACTIVITY_LIMIT) {
        logout(); return null;
    }

    updateActivityTimestamp();

    try {
        return JSON.parse(userStr);
    } catch (e) {
        return null;
    }
};

export const getRuolo = () => {
    const user = getCurrentUser();
    return user ? user.role : null;
};


export const isAdmin = () => {
    return getRuolo() === ruoli[3];
}

export const isResponsabile = () => {
    return getRuolo() == ruoli[2];
}

export const isOperatore = () => {
    return getRuolo() == ruoli[1];
}
export const isCittadino = () => {
    return getRuolo() === ruoli[0];
}




// ***********************************************************************
// REGISTRAZIONE
// ***********************************************************************
export const register = async (email, password) => {
    return await richiesta({
        url: `${URL_AUTH}/register`,
        method: 'POST',
        auth: false,
        body: { email, password }
    });
};

// ***********************************************************************
// LOGIN
// ***********************************************************************
export const login = async (email, password) => {
    return await richiesta({
        url: `${URL_AUTH}/login`,
        method: 'POST',
        auth: false,
        body: { email, password }
    });
};


// ***************************************************************
// REFRESH TOKEN (Implementazione)
// ***************************************************************
const performRefreshToken = async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!refreshToken) throw new Error("No refresh token available");

    // Usiamo fetch diretto o richiesta con auth:false per evitare loop infiniti
    const response = await fetch(`${URL_AUTH}/refresh`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (!response.ok) {
        throw new Error("Refresh token expired or invalid");
    }

    const data = await response.json();

    // Aggiorniamo i token
    localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
    if (data.refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
    }

    return data.access_token;
};

// ***************************************************************
// LOGOUT
// ***************************************************************
export const logout = async (redirect = true) => {
    // 1) Chiamata Server per invalidare il refresh token
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
        try {
            await fetch(`${URL_AUTH}/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken })
            });
        } catch (e) {
            console.warn("Impossibile contattare server per logout, procedo localmente", e);
        }
    }

    // 2) Pulizia LocalStorage (Auth)
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    localStorage.removeItem(LOGIN_TIMESTAMP_KEY);

    // 3) Pulizia SessionStorage (Tenant)
    sessionStorage.removeItem(TENANT_ID_KEY);

    // 4) Stop Timer
    if (activityTimer) clearTimeout(activityTimer);
    if (absoluteTimer) clearTimeout(absoluteTimer);

    // 5) Reload
    if (redirect)
        window.location.reload();
};




// ***************************************************************
// ZONA OPERATORE
// ***************************************************************


// Recupera tutti gli operatori del comunet dell'utente
export const getOperatori = async () => {
    return await richiesta({
        url: URL_OPERATOR,
        method: 'GET',
        tenant: true
    });

};


// Aggiunge un operatore al comune tramite il suo user_id
export const addOperatore = async (operator_id) => {
    if (!operator_id) throw new Error("Manca l'operetor id per poter aggiungerlo al comune");
    return await richiesta({
        url: URL_OPERATOR,
        method: 'POST',
        tenant: true,
        body: { operator_id }
    });

};


// Rimuove un operatore dal comune dato il suo user_id
export const removeOperatore = async (operator_id) => {
    if (!operator_id) throw new Error("Manca l'operetor id per poterlo rimuovere dal comune");
    return await richiesta({
        url: `${URL_OPERATOR}/${operator_id}`,
        method: 'DELETE',
        tenant: true
    });

};

// ***************************************************************
// ZONA MANAGER
// ***************************************************************


// Recupera tutti i manager del comune dell'utente
export const getManager = async () => {
    return await richiesta({
        url: URL_MANAGER,
        method: 'GET',
        tenant: true
    });

};


// Aggiunge un manager al comune tramite il suo user_id
export const addManager = async (manager_id) => {
    if (!manager_id) throw new Error("Manca il manager id per poterlo aggiungere al comune");
    return await richiesta({
        url: URL_MANAGER,
        method: 'POST',
        tenant: true,
        body: { manager_id }
    });

};


// Rimuove un manager dal tenant tramite il suo user_id
export const rimuoviManager = async (manager_id) => {
    if (!manager_id) throw new Error("Manca il manager id per poterlo rimuovere dal comune");

    return await richiesta({
        url: `${URL_MANAGER} / ${manager_id}`,
        method: 'DELETE',
        tenant: true
    });

};




// ***************************************************************
// --- HELPER  ---
// ***************************************************************

export const loginUser = async (tokenData, email) => {
    try {
        // 1) Salva Token 
        localStorage.setItem(ACCESS_TOKEN_KEY, tokenData.access_token);
        localStorage.setItem(REFRESH_TOKEN_KEY, tokenData.refresh_token);

        const jwtUser = parseJwt(tokenData.access_token);
        const userCompleto = await getUtente(jwtUser.sub);

        userCompleto.role = ruoli[jwtUser.role] || ruoli[0];
        userCompleto.tenant_id = jwtUser.tid;
        userCompleto.email = email || "";


        // 2) Gestione Tenant 
        // Se l'utente ha un tenant predefinito, e non è in nessun tenant
        if (!getTenantId() && jwtUser.tid) setTenantId(jwtUser.tid);


        // 3) Salva Utente 
        localStorage.setItem(USER_KEY, JSON.stringify(userCompleto));

        // 4) Timer
        const now = Date.now();
        localStorage.setItem(LOGIN_TIMESTAMP_KEY, now);
        localStorage.setItem(LAST_ACTIVITY_KEY, now);

        startSessionMonitors();
        return userCompleto;

    } catch (error) {
        console.error("Errore post-login:", error);
        throw error;
    }
};

// --- GESTIONE TIMER ---
const updateActivityTimestamp = () => {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now());
    startInactivityTimer();
};

const startInactivityTimer = () => {
    if (activityTimer) clearTimeout(activityTimer);
    activityTimer = setTimeout(() => {
        alert("Sessione scaduta per inattività (1h).");
        logout();
    }, INACTIVITY_LIMIT);
};

const startAbsoluteTimer = () => {
    const loginTime = parseInt(localStorage.getItem(LOGIN_TIMESTAMP_KEY) || Date.now());
    const timeRemaining = ABSOLUTE_EXPIRATION - (Date.now() - loginTime);

    if (timeRemaining <= 0) logout();
    else {
        if (absoluteTimer) clearTimeout(absoluteTimer);
        absoluteTimer = setTimeout(() => {
            alert("Sessione scaduta (limite 3 giorni).");
            logout();
        }, timeRemaining);
    }
};

const startSessionMonitors = () => {
    if (!localStorage.getItem(ACCESS_TOKEN_KEY)) return;
    startInactivityTimer();
    startAbsoluteTimer();
};

window.addEventListener('click', () => {
    if (localStorage.getItem(ACCESS_TOKEN_KEY)) updateActivityTimestamp();
});


// --- GESTIONE ALTRO ---
export function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return {};
    }
}


// Funzione interna per il controllo scadenza JWT
const isTokenExpired = (token) => {
    try {
        const payload = parseJwt(token);
        if (!payload || !payload.exp) return true;

        // Current time in seconds
        const now = Math.floor(Date.now() / 1000);


        return (payload.exp - 10) < now;
    } catch (error) {
        return true;
    }
};



// ***************************************************************
// INIZIALIZZAZIONE AL CARICAMENTO
// ***************************************************************

const initSession = async () => {
    // 1. Controllo rapido: se non c'è token, non facciamo nulla
    const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!storedToken) return;

    // 2. Controllo validità e Refresh automatico
    // Chiamando getAccessToken(), se il token è scaduto lui prova a fare il refresh.
    // Se il refresh fallisce, getAccessToken fa logout().
    const validToken = await getAccessToken();

    // 3. Se alla fine di tutto abbiamo un token valido, avviamo i monitor
    if (validToken) {
        startSessionMonitors();
    }
};

// Avvio automatico
initSession();