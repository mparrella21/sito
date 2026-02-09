import { getAccessToken, getTenantId, getCurrentUser } from "./autenticazione.js";





// Contenuto header default
const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
};



/**
 * Effettua una richiesta API gestendo token, body e errori.
 * * @param {Object} options - Oggetto di configurazione
 * @param {string} options.url - L'URL completo da chiamare
 * @param {string} [options.method='GET'] - Metodo HTTP (GET, POST, etc.)
 * @param {Object|FormData} [options.body=null] - Dati da inviare
 * @param {Object} [options.headers={}] - Header personalizzati da aggiungere/sovrascrivere
 * @param {boolean} [options.auth=true] - Se true, aggiunge il Bearer Token
 * @param {boolean} [options.tenant=false] - Se true, passa al server il tenant id della sessione
 * @param {boolean} [options.utente=false] - Se true, passa al server il user id della sessione
 */
export const richiesta = async ({
    url, method = 'GET', body = null, headers = {}, auth = true, tenant = false, utente = false
}) => {

    // 1) Clona l'header di base per non modificare l'originale e unisce/sovrascrive con quelli passati (se ci sono)
    const finalHeaders = { ...defaultHeaders, ...headers };

    // 2) Gestione Auth (Token)
    if (auth) {
        const token = await getAccessToken();
        if (!token) throw new Error("Autenticazione mancante. Effettua il login.");
        finalHeaders['Authorization'] = `Bearer ${token}`;
    }


    // 3) Configurazione Fetch base
    const config = {
        method: method,
        headers: finalHeaders
    };


    // 4) GESTIONE DATI AUTOMATICI E QUERY PARAMS 
    let finalBody = body;

    // A) Validazione preliminare: GET non supporta FormData
    if (method === 'GET' && finalBody instanceof FormData) {
        throw new Error("Il metodo GET non supporta l'invio di FormData (file). Usa POST o cambia struttura dati.");
    }

    // B) Aggiunta dati automatici (Tenant & Utente) direttamente nel body
    if (tenant) {
        const tenantId = getTenantId();
        if (!tenantId) throw new Error("Tenant ID mancante.");
        finalBody = appendToBody(finalBody, 'tenant_id', tenantId);
    }

    if (utente) {
        const user = getCurrentUser();
        if (!user || !user.id) throw new Error("Utente non loggato o ID mancante.");
        finalBody = appendToBody(finalBody, 'user_id', user.id);
    }

    // C) Se è una GET, trasformiamo tutto il body accumulato in Query Params
    const urlObj = new URL(url);
    if (method === 'GET' && finalBody) {
        Object.entries(finalBody).forEach(([key, value]) => {
            // Gestione array (es. categorie) e valori nulli
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    value.forEach(v => urlObj.searchParams.append(key, v));
                } else {
                    urlObj.searchParams.append(key, value);
                }
            }
        });
        finalBody = null; // Svuotiamo per il punto 5
    }

    const finalUrl = urlObj.toString();


    // 5) Gestione Body 
    if (finalBody) {
        if (finalBody instanceof FormData) {
            // Se è un file, il browser DEVE gestire il Content-Type (boundary)
            // Quindi lo rimuoviamo forzatamente
            delete finalHeaders['Content-Type'];
            config.body = finalBody;
        } else {
            // Se è un oggetto, lo trasformiamo in JSON
            config.body = JSON.stringify(finalBody);
        }
    }



    // 6) Esecuzione
    try {


        const response = await fetch(finalUrl, config);


        // 7) Gestione No Content e ok di delete e put
        let data;
        try {
            data = await response.json();
        } catch {
            if (response.ok) {
                return null;
            }
        }


        // 8) Gestione Errore 
        if (!response.ok) {
            const errorMessage = data?.message || data?.error || `Errore HTTP: ${response.status} : ${response.statusText}`;;
            throw new Error(errorMessage);
        }


        // Altrimenti ritorniamo direttamente i dati parsati
        return data;

    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error("Il server ha risposto con un formato non valido (non JSON).");
        }
        console.error(`Errore nella richiesta [${method}] [${finalUrl}]:`, error);
        throw error;
    }
};




/**
 * Funzione Helper per aggiungere dati al body (JSON o FormData)
 */
function appendToBody(currentBody, key, value) {
    if (currentBody instanceof FormData) {
        // Se è FormData, appendiamo direttamente
        currentBody.append(key, value);
        return currentBody;
    } else {
        // Se è JSON (o null), creiamo/estendiamo l'oggetto
        return {
            ...currentBody,
            [key]: value
        };
    }
}