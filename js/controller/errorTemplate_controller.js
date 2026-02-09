import { getTenantId } from '../servizi/api/autenticazione.js';
import { destroySidebar } from '../sidebar_manager.js';




// ***********************************************************************
// MAPPA ERRORI STANDARD
// ***********************************************************************
const ERROR_DEFAULTS = {
    400: {
        title: "Richiesta non valida",
        message: "Il server non è riuscito a comprendere la richiesta a causa di una sintassi non valida."
    },
    401: {
        title: "Autenticazione richiesta",
        message: "La sessione è scaduta o non hai effettuato il login."
    },
    403: {
        title: "Accesso Negato",
        message: "Non disponi dei permessi necessari per accedere a questa risorsa."
    },
    404: {
        title: "Pagina non trovata",
        message: "La risorsa che stai cercando non esiste, è stata spostata o il link è errato."
    },
    408: {
        title: "Tempo scaduto",
        message: "Il server ha impiegato troppo tempo per rispondere. Riprova."
    },
    500: {
        title: "Errore Interno del Server",
        message: "Si è verificato un problema tecnico sui nostri sistemi. Stiamo lavorando per risolverlo."
    },
    502: {
        title: "Bad Gateway",
        message: "Il server ha ricevuto una risposta non valida."
    },
    503: {
        title: "Servizio non disponibile",
        message: "Il sistema è momentaneamente in manutenzione o sovraccarico. Riprova tra qualche minuto."
    }
};

// Fallback generico se il codice non è in lista
const GENERIC_DEFAULT = {
    title: "Si è verificato un problema",
    message: "Operazione non completata a causa di un errore imprevisto."
};


/**
 * Mostra una pagina di errore.
 * @param {Object} params
 * @param {string} [params.title] - Titolo specifico (se null, usa quello della mappa)
 * @param {string} [params.message] - Messaggio specifico (se null, usa quello della mappa)
 * @param {number|string} [params.code] - Codice errore (es. 404, 500)
 */
export const renderError = async ({ title = null, message = null, code = null }) => {
    const app = document.getElementById("app");
    destroySidebar();

    // 1) Preparazione messaggio
    const defaults = (code && ERROR_DEFAULTS[code]) ? ERROR_DEFAULTS[code] : GENERIC_DEFAULT;

    let finalTitle = title || defaults.title;
    const finalMessage = message || defaults.message;

    if (code) {
        finalTitle = `Errore ${code}: ${finalTitle}`;
    }

    try {
        // 2) CARICAMENTO HTML
        const response = await fetch('/html/error_template.html');
        if (!response.ok) throw new Error("Impossibile caricare template errore");

        const html = await response.text();
        app.innerHTML = html;

        // 3) Popolamente UI
        const titleEl = document.getElementById("titolo-errore");
        const msgEl = document.getElementById("messaggio-errore");
        const linkEl = document.getElementById("link-home");

        const actionsContainer = document.getElementById("warningMessage");

        if (titleEl) titleEl.innerText = finalTitle;
        if (msgEl) msgEl.innerText = finalMessage;

        // 4) GESTIONE LINK HOME E AVVISO TENANT
        if (linkEl) {
            const tenantId = getTenantId();

            if (tenantId) {
                // CASO A: Utente dentro un comune
                linkEl.setAttribute("href", `/${tenantId}/`);
                linkEl.innerText = "Torna alla Home del Comune";
                // Rimuoviamo eventuali classi di warning se presenti
                linkEl.classList.remove("btn-warning");
                linkEl.classList.add("btn-primary");
                warningMessage.classList.add("hidden");
            } else {
                // CASO B: Utente senza contesto (Globale)
                linkEl.setAttribute("href", "/");
                linkEl.innerText = "Torna alla Home Generale";


                warningMessage.classList.remove("hidden");

            }
        }

        document.title = finalTitle;

    } catch (e) {
        console.error("Errore critico renderError:", e);

        // 5) FALLBACK DI EMERGENZA (Senza fetch)
        const tenantId = getTenantId();
        const homeLink = tenantId ? `/${tenantId}/` : "/";
        const homeText = tenantId ? "Torna alla Home del Comune" : "Torna alla Home Generale";

        let extraWarning = "";
        if (!tenantId) {
            extraWarning = `<p style="color:orange; margin-top:10px;"><small>Nessun comune selezionato. Tornerai alla selezione iniziale.</small></p>`;
        }

        app.innerHTML = `
            <div class="pagine pagina-errore" style="text-align: center; padding: 50px; font-family: sans-serif;">
                <h1 style="color: #d9534f;">${finalTitle}</h1>
                <p style="font-size: 1.2rem; color: #555;">${finalMessage}</p>
                <br>
                <div style="margin-top: 20px;">
                    <button onclick="history.back()" style="padding: 10px 20px; cursor: pointer; margin-right: 10px;">Indietro</button>
                    <a href="${homeLink}" data-link style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">${homeText}</a>
                    ${extraWarning}
                </div>
            </div>`;
    }
};