import { navigateTo } from '../../router.js';
import { getCurrentUser, getRuolo, isAdmin } from '../../servizi/api/autenticazione.js';

export const initLandingPage = async () => {

    // 1. Controllo di sicurezza / UX
    // Se l'utente è già loggato e HA un tenant in memoria, 
    // forse non dovrebbe vedere questa pagina ma essere reindirizzato.
    // Tuttavia, se ha cliccato esplicitamente "Home Generale", lasciamolo qui.

    // 2. Setup Event Listeners
    const btnSeleziona = document.getElementById('btn-seleziona-comune');
    const btnAdmin = document.getElementById('btn-login-admin');

    if (btnSeleziona) {
        btnSeleziona.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('/seleziona-comune');
        });
    }

    if (btnAdmin) {
        btnAdmin.addEventListener('click', async (e) => {
            e.preventDefault();

            // Logica intelligente per Admin
            const user = getCurrentUser();

            // Se è già loggato come admin, lo mandiamo diretto all'area personale
            if (user && isAdmin()) {

                navigateTo('/area-personale');
            } else {
                // Se non è loggato, va al login admin
                navigateTo('/admin');
            }
        });
    }
};