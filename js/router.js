import { initHome } from './controller/home_controller.js';
import { initAreaPersonale } from './controller/areapersonale_controller.js';
import { initDettaglioTicket } from './controller/dettaglioTicket_controller.js';

import { initLandingPage } from './controller/Globali/langingPage_controller.js';
import { initSelezionaTenant } from './controller/Globali/selezioneTenant.js'
import { initAdminLogin } from './controller/Globali/adminLogin_controller.js';

import { getCurrentUser, getTenantId, setTenantId, isAdmin, isCittadino, getTenantIdCurrentUser } from './servizi/api/autenticazione.js';
import { getTenant } from './servizi/api/tenant.js';

import { destroySidebar } from './sidebar_manager.js';
import { renderError } from './controller/errorTemplate_controller.js';


// Regex UUID
const UUID_REGEX = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/;

// *********************************** CONFIGURAZIONE ROTTE ********************************************

const TENANT_ROUTES = {
    "/": { title: "Home", file: "/html/home.html", init: initHome },
    "/area-personale": { title: "Area personale", file: "/html/areapersonale.html", init: initAreaPersonale },
    "/ticket/:id": { title: "Dettaglio Segnalazione", file: "/html/dettaglioTicket.html", init: initDettaglioTicket },
};

const GLOBAL_ROUTES = {
    "/": { title: "Benvenuto", file: "/html/Globali/landingPage.html", init: initLandingPage },
    "/seleziona-comune": { title: "Seleziona Comune", file: "/html/Globali/selezionaTenant.html", init: initSelezionaTenant },
    "/admin": { title: "Portale Admin", file: "/html/Globali/adminLogin.html", init: initAdminLogin }
};



// *************************** ROUTER PRINCIPALE **********************************
const router = async () => {
    const fullPath = window.location.pathname;
    const segments = fullPath.split('/').filter(Boolean);

    let route = null;
    let params = {};

    const firstSegment = segments[0];

    // -----------------------------------------------------------
    // CASO 1: URL CON TENANT ESPLICITO 
    // -----------------------------------------------------------
    if (firstSegment && UUID_REGEX.test(firstSegment)) {

        const tenantId = firstSegment;

        // Verifichiamo che il comune esista PRIMA di mostrare qualsiasi cosa
        try {

            await getTenant(tenantId);

            if (!await checkPermessiTenant(tenantId)) {
                return;
            }
            // Se siamo qui, il tenant è valido
            setTenantId(tenantId);

        } catch (error) {
            await renderError({
                title: "Comune non trovato",
                message: "Il comune richiesto non esiste o l'identificativo non è valido.",
                code: 404
            });
            return;
        }


        // Analizziamo il resto del path 
        const internalSegments = segments.slice(1);

        // Cerchiamo match nelle rotte interne
        for (const routePath in TENANT_ROUTES) {
            const match = matchRoute(routePath, internalSegments);
            if (match) {
                route = TENANT_ROUTES[routePath];
                params = match;
                break;
            }
        }

        // Se c'è l'ID ma la rotta interna non esiste 
        if (!route) {
            await renderError({ code: 404 });
            return;
        }

    } else {
        // -----------------------------------------------------------
        // CASO 2: URL SENZA TENANT
        // -----------------------------------------------------------

        const savedTenant = getTenantId();

        // -----------------------------------------------------------------
        // A) Controlliamo se l'utente sta cercando di vedere una pagina interna senza prefisso Tenant (o è stato reindirizzato da una pagina)
        let internalMatch = null;
        let matchedRouteConfig = null;

        for (const routePath in TENANT_ROUTES) {
            const match = matchRoute(routePath, segments);
            if (match) {
                internalMatch = match;
                matchedRouteConfig = TENANT_ROUTES[routePath];
                break;
            }
        }

        if (internalMatch) {

            if (isAdmin()) {

                // 1) ADMIN: Ha visione globale -> CARICA LA PAGINA
                route = matchedRouteConfig;
                params = internalMatch;
            }
            else if (savedTenant) {
                // 2) USER CON COMUNE: Redirect
                replaceStateTo(`/${savedTenant}${fullPath}`);
                return;
            }
            else {
                // 3) USER SENZA COMUNE

                for (const globalPath in GLOBAL_ROUTES) {
                    const match = matchRoute(globalPath, segments);
                    if (match) {
                        route = GLOBAL_ROUTES[globalPath];
                        params = match;
                        break;
                    }
                }

                // Se dopo il ciclo 'route' è ancora null, significa che NON è globale
                // Quindi è un tentativo di accesso non autorizzato a risorsa interna               
                if (!route) {
                    await renderError({
                        message: "Devi selezionare un Comune per visualizzare questa pagina.",
                        code: 400
                    });
                    return;
                }
            }
        }

        // -----------------------------------------------------------------
        // B) Rotte Globali
        if (!route) {
            for (const routePath in GLOBAL_ROUTES) {
                const match = matchRoute(routePath, segments);
                if (match) {
                    route = GLOBAL_ROUTES[routePath];
                    params = match;
                    break;
                }
            }
        }
    }


    // -----------------------------------------------------------
    // FASE 3: RENDERING
    // -----------------------------------------------------------

    updateInterface();

    if (!route) {
        await renderError({ code: 404 });
        return;
    }

    try {
        destroySidebar();

        const response = await fetch(route.file);
        if (!response.ok) throw new Error("HTML non trovato");

        const html = await response.text();
        if (html.toLowerCase().includes("<!doctype html>")) throw new Error("Soft 404");

        document.title = route.title;
        document.getElementById("app").innerHTML = html;

        if (route.init) {
            await route.init(params);
        }

    } catch (err) {
        console.error("Router Error:", err);
        try {
            await renderError({ code: 500, message: "Impossibile caricare la pagina." });
        } catch {
            // Se ci sono altri problemi, iniettiamo un HTML di emergenza
            const errorFallback = `
            <div class="error-page">
                <h1>Errore 404 - Errore Interno del Server</h1>
                <p>Impossibile caricare la pagina.</p>
                <a href="/" data-link>Torna alla Home generale</a>
            </div>`;

            document.getElementById("app").innerHTML = errorFallback;
        }
    }
};


// ************************************ Init *******************************************
window.onpopstate = router;
document.addEventListener("DOMContentLoaded", router);


// ******************************** Navigation Helpers ******************************************
window.addEventListener("click", e => {
    const link = e.target.closest("[data-link]");
    if (link) {
        e.preventDefault();
        navigateTo(link.getAttribute("href"));
    }
});

export const navigateTo = (url) => {
    window.history.pushState(null, null, url);
    router();
};

const replaceStateTo = (url) => {
    window.history.replaceState(null, null, url);
    router();
};

const matchRoute = (routePattern, pathSegments) => {
    const routeSegments = routePattern.split("/").filter(Boolean);
    if (routeSegments.length !== pathSegments.length) return null;

    const params = {};
    for (let i = 0; i < routeSegments.length; i++) {
        const routeSeg = routeSegments[i];
        const pathSeg = pathSegments[i];
        if (routeSeg.startsWith(":")) params[routeSeg.slice(1)] = pathSeg;
        else if (routeSeg !== pathSeg) return null;
    }
    return params;
};

// ************************************ Gestione Interfaccia *******************************************
export const updateInterface = async () => {
    const user = getCurrentUser();

    const body = document.body;

    // 1) Gestione classe logged-in
    if (user) {
        body.classList.add('logged-in');
    } else {
        body.classList.remove('logged-in');
    }


    // 2) Gestione classe admin-logged 
    if (user && isAdmin()) {
        body.classList.add('admin-logged');
    } else {
        body.classList.remove('admin-logged');
    }
};


// Helper 
const checkPermessiTenant = async (urlTenantId) => {
    const user = getCurrentUser();
    if (!user) return true;

    const userTenantId = getTenantIdCurrentUser();

    // 1) ADMIN e  CITTADINO:   Passano sempre
    if (isAdmin() || isCittadino()) return true;


    // 3. MANAGER/OPERATORE: Controllo Stretto
    if (userTenantId !== urlTenantId) {

        setTenantId(userTenantId);
        // Se il comune nell'URL è diverso da quello assegnato al dipendente
        await renderError(
            {
                code: 403,
                message: "Accesso Negato: Non puoi accedere all'area di lavoro di un altro Comune. Verrai reindirizzato al tuo comune."
            }
        );

        setTimeout(() => {
            replaceStateTo(`/${userTenantId}/`);
        }, 5000);

        return false;
    }

    return true;
};