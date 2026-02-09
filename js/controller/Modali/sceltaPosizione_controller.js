import { openModal, closeModal } from '../../modal_manager.js';
import { getTenantId, isAdmin } from '../../servizi/api/autenticazione.js';
import { searchTenant } from '../../servizi/api/tenant.js';
import { getPosition, enableMapPickingMode } from '../../servizi/map.js';



export const initSceltaPosizione = () => {

    const btnGps = document.getElementById('btn-usa-gps');
    const btnMappa = document.getElementById('btn-usa-mappa');

    // --- CASO 1: USA GPS ---
    if (btnGps) {
        btnGps.addEventListener('click', async () => {
            // Cambio testo per feedback utente
            const originalText = btnGps.innerHTML;
            btnGps.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Localizzazione...';
            btnGps.disabled = true;

            try {
                // Chiamo il GPS
                const position = await getPosition();

                if (await checkPunto(position.coords.latitude, position.coords.longitude)) {
                    // SUCCESSO: Apro direttamente il modale Ticket passando i dati
                    // openModal sostituirà il contenuto attuale con quello del form ticket
                    openModal('ticket', {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });

                }


            } catch (error) {
                console.warn("GPS fallito", error);
                alert("Impossibile trovare la posizione. Seleziona manualmente sulla mappa.");

                // Fallback: chiudo modale e attivo mappa
                closeModal();
                avviaSelezioneMappa();
            } finally {
                // Ripristino bottone (nel caso l'utente torni indietro o ci sia errore)
                btnGps.innerHTML = originalText;
                btnGps.disabled = false;
            }
        });
    }

    // --- CASO 2: USA MAPPA ---
    if (btnMappa) {
        btnMappa.addEventListener('click', () => {
            // Chiudo il modale "Scelta" per far vedere la mappa sotto
            closeModal();
            avviaSelezioneMappa();
        });
    }
};

// Funzione helper per non ripetere codice
function avviaSelezioneMappa() {

    enableMapPickingMode(async (e) => {
        // Callback: quando l'utente clicca sulla mappa, riapriamo il modale Ticket
        const lat = e.latlng.lat;
        const lon = e.latlng.lng;


        if (await checkPunto(lat, lon)) {
            openModal('ticket', {
                lat: lat,
                lng: lon
            });
        }


    });
}

// Funzione helper per non ripetere codice e controllare punto
export async function checkPunto(lat, lon) {

    if (isAdmin()) return true;

    const tenantId = getTenantId();

    // Cerchiamo a quale comune appartiene quel punto
    const targetTenant = await searchTenant(lat, lon);

    // CASO A: Il punto non appartiene a nessun comune gestito (es. in mare o fuori regione)
    if (!targetTenant?.tenant_id) {
        alert("Il punto selezionato non rientra in nessun comune gestito.");
        return false;
    }

    // CASO B: Il punto è nel comune corretto
    if (getTenantId() == targetTenant.tenant_id) {
        return true;
    }

    // CASO C: Il punto è in UN ALTRO comune gestito -> Proponiamo il cambio
    // targetTenant dovrebbe avere { tenant_id, nome, ... }
    const nomeComune = targetTenant.nome || "un altro comune";

    const messaggio = `Attenzione: il punto selezionato si trova a ${nomeComune}.\n\nVuoi cambiare comune e andare alla pagina di ${nomeComune}?`;

    // confirm restituisce TRUE se l'utente clicca OK/Sì
    if (confirm(messaggio)) {
        // Reindirizzamento hard (così pulisce la sessione del vecchio comune)
        window.location.href = `/${targetTenant.tenant_id}/`;
    }

    // Ritorniamo false per bloccare l'apertura del ticket nel comune attuale
    return false;
}