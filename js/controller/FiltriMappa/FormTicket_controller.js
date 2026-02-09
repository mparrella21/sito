import { getPosition, enableMapPickingMode, disableMapPickingMode } from '../../servizi/map.js';
import { getAddressFromCoordinates } from '../../servizi/photon.js';
import { getAllTenantsProvinceRegioni } from '../../servizi/api/tenant.js';
import { getAllCategories, getAllState } from '../../servizi/api/ticket.js';
import { loadTicketMarker } from '../../servizi/map.js';
import { filtraSingoloTicket } from '../../support/filtriTicketMappa.js';
import { isAdmin } from '../../servizi/api/autenticazione.js';



const puntoCentrale = {
    lat: null,
    long: null
}




// 
const configurazioni = [
    { id: 'statiTicket', init: initTicket_StatiTicket, applica: (params) => applicaTicket_StatiTicket(params) }, // Stato
    { id: 'categorieTicket', init: initTicket_CategorieTicket, applica: (params) => applicaTicket_CategorieTicket(params) }, // Categorie
    { id: 'dataTicket', init: initTicket_DataTicket, applica: (params) => applicaTicket_DataTicket(params) }, // Data ticket
    { id: 'posTicket', init: initTicket_PosizioneAttiva, applica: (params) => applicaTicket_PosizioneAttiva(params), richiedeOpen: true }, // Posizione e raggio
    { id: 'zoneTicket', init: initTicket_ZoneAttive, applica: (params) => applicaTicket_ZoneAttive(params), richiedeOpen: true } // Zone da attivare
];




// ---------------------------------------------------------
// ---------------------------------------------------------
// ---------------------------------------------------------
// Init per form ticket
// ---------------------------------------------------------
export const initFormTicket = async (soloAperti = false) => {

    // 1) Scelta e testo
    initTicket_RicercaTesto();


    const userIsAdmin = isAdmin();

    configurazioni.forEach(async conf => {
        const el = document.getElementById(conf.id);
        if (!el) return;


        const isRestricted = el.classList.contains('admin-only');

        if (isRestricted && !userIsAdmin) {
            // Opzionale: ci assicuriamo che sia nascosto anche via JS 
            // nel caso il CSS non bastasse o l'elemento fosse 'open' di default
            el.style.display = 'none';
            return;
        }

        // Se soloAperti è true, resetto solo se l'elemento ha l'attributo 'open'.
        if (!soloAperti || (el && el.open)) {
            conf.init();
        }


    });

}

// ---------------------------------------------------------
// 1) TESTO E SELECT
// ---------------------------------------------------------
function initTicket_RicercaTesto() {
    const scopeSelect = document.querySelector('select[name="text_search_scope"]');
    const textInput = document.querySelector('input[name="text_search"]');

    if (scopeSelect) scopeSelect.value = 'all';
    if (textInput) textInput.value = '';
};


// ---------------------------------------------------------
// 2) STATI (Tutti checkati tranne l'ultimo)
// ---------------------------------------------------------
async function initTicket_StatiTicket() {
    const container = document.getElementById('contanitore-dynamic-stato');
    if (!container) return;

    let state = await getAllState();
    if (!state) return;

    // 1) CARICAMENTO (Se vuoto)
    if (container.innerHTML.trim() === '') {
        Object.entries(state).forEach(([id, nome]) => {
            const label = document.createElement('label');
            label.style.display = 'block';
            label.innerHTML = `<input type="checkbox" name="status" value="${id}"> ${nome}`;
            container.appendChild(label);
        });
    }

    // 2) RESET LOGICA (Tutti true tranne l'ultimo)
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    const total = checkboxes.length;

    checkboxes.forEach((cb, index) => {
        // Se è l'ultimo elemento (index == total - 1), false. Altrimenti true.
        if (index === total - 1) {
            cb.checked = false;
        } else {
            cb.checked = true;
        }
    });
};


// ---------------------------------------------------------
// 3) CATEGORIE 
// ---------------------------------------------------------

async function initTicket_CategorieTicket() {
    const container = document.getElementById('contanitore-dynamic-categorie');
    if (!container) return;

    const categorie = await getAllCategories();
    if (!categorie) return;


    // 1) CARICAMENTO (Se vuoto)
    if (container.innerHTML.trim() === '') {

        categorie.forEach(categoria => {
            const label = document.createElement('label');

            label.innerHTML = `<input type="checkbox" name="categories" value="${categoria.id}"> ${categoria.label}`;
            container.appendChild(label);
        });
    }

    // 2) RESET LOGICA (Nessuna selezionata)
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = false;
    });
};



// ---------------------------------------------------------
// 4) DATE 
// ---------------------------------------------------------
function initTicket_DataTicket() {
    const dateFrom = document.querySelector('input[name="date_from"]');
    const dateTo = document.querySelector('input[name="date_to"]');

    if (dateFrom) dateFrom.value = '';
    if (dateTo) dateTo.value = '';
}



// ---------------------------------------------------------
// 5) POSIZIONE E RAGGIO
// ---------------------------------------------------------
function initTicket_PosizioneAttiva() {
    const inputGeo = document.getElementById('geo-center-input');
    const rangeInput = document.querySelector('input[name="radius_value"]');
    const outputRange = document.getElementById('outRaggio');

    // Reset valori
    if (inputGeo) inputGeo.value = ''; // Toglie coordinate
    if (rangeInput) rangeInput.value = 10; // Default 10
    if (outputRange) outputRange.value = '10 km';

    setPosizione();


    // Gestione Listeners (GPS e Picking)
    const btnGps = document.getElementById('btn-get-gps');
    const btnPoint = document.getElementById('btn-get-point');

    if (btnGps && !btnGps.dataset.init) {
        btnGps.addEventListener('click', async () => {

            const btnP = document.getElementById('btn-get-point');
            if (btnP.classList.contains('attivo')) {
                toggleMapPickingMode();
            }

            inputGeo.value = "Localizzazione GPS in corso...";

            try {
                const position = await getPosition();
                setPosizione(position.coords.latitude, position.coords.longitude);

            } catch (error) {
                console.warn("GPS non disponibile o negato:", error.message);

                // Avvisiamo l'utente e attiviamo la selezione manuale
                alert("Impossibile rilevare la tua posizione. Prova con la modalità alternativa per selezionare un punto sulla mappa");

            }

        });
        btnGps.dataset.init = "true";
    }

    if (btnPoint && !btnPoint.dataset.init) {
        btnPoint.addEventListener('click', toggleMapPickingMode);
        btnPoint.dataset.init = "true";
    }

    // Se stiamo resettando, assicuriamoci che la modalità picking sia spenta
    if (btnPoint && btnPoint.classList.contains('attivo')) {
        toggleMapPickingMode();
    }
}

const toggleMapPickingMode = () => {
    const btn = document.getElementById('btn-get-point');
    const icon = btn.querySelector('i');

    // Controlliamo se è già attivo
    const isActive = btn.classList.contains('attivo');

    if (!isActive) {
        // --- ATTIVAZIONE ---
        btn.classList.add('attivo');
        btn.title = "Annulla selezione";

        // Cambio Icona
        icon.classList.remove('fa-map-marker-alt');
        icon.classList.add('fa-times');


        enableMapPickingMode(
            async (e) => {
                toggleMapPickingMode();
                await setPosizione(e.latlng.lat, e.latlng.lng);
            },
            async (e) => {
                toggleMapPickingMode();
            }
        );

    } else {
        // --- DISATTIVAZIONE ---
        btn.classList.remove('attivo');
        btn.title = "Seleziona posizione sulla mappa";

        // Cambio Icona:
        icon.classList.remove('fa-times');
        icon.classList.add('fa-map-marker-alt');


        disableMapPickingMode();
    }
}


const setPosizione = async (lat = null, long = null) => {
    const positionInput = document.querySelector('input[name="position_value"]');


    if (!lat || !long) {

        positionInput.value = '';
        if (typeof puntoCentrale !== 'undefined') {
            puntoCentrale.lat = null;
            puntoCentrale.long = null;
        }
        return;
    }

    // Caso Update
    if (typeof puntoCentrale !== 'undefined') {
        puntoCentrale.lat = lat;
        puntoCentrale.long = long;
    }


    positionInput.value = `(Ricerca indirizzo...) Lat: ${lat.toFixed(4)}, Lng: ${long.toFixed(4)}`;

    try {
        const address = await getAddressFromCoordinates(lat, long);
        positionInput.value = address || `Posizione: ${lat.toFixed(5)}, ${long.toFixed(5)}`;

        if (positionInput.value == "Indirizzo sconosciuto") {
            positionInput.value = `Inidirizzo non riconosciuto: Posizione: ${lat.toFixed(5)}, ${long.toFixed(5)}`
        }
    } catch (error) {
        console.error("Errore Geocoding:", error);
        positionInput.value = `Posizione: ${lat.toFixed(6)}, ${long.toFixed(6)}`;
    }


}


// ---------------------------------------------------------
// 6) ZONE ATTIVE (Cascata e Chips)
// ---------------------------------------------------------
async function initTicket_ZoneAttive() {
    // 1) Recupero Elementi DOM
    const selRegion = document.getElementById('sel-region');
    const selProv = document.getElementById('sel-province');
    const selCom = document.getElementById('sel-comune');
    const btnAdd = document.getElementById('btn-add-zone');
    const chipsContainer = document.getElementById('selected-zones-list');
    const hiddenInput = document.getElementById('hidden-zones-data');

    // Sicurezza: se manca qualcosa nell'HTML, esci
    if (!selRegion || !selProv || !selCom || !btnAdd) return;

    // -----------------------------------------------------------
    // A. FASE DI RESET 
    // -----------------------------------------------------------

    // 1) Reset Grafico Chips
    if (chipsContainer) chipsContainer.innerHTML = '';
    if (hiddenInput) hiddenInput.value = '';

    // 2) Reset Selects (Riporta tutto allo stato iniziale)
    selRegion.selectedIndex = 0; // Torna a "-- Seleziona Regione --"

    selProv.innerHTML = '<option value="">-- Prima la Regione --</option>';
    selProv.disabled = true;

    selCom.innerHTML = '<option value="">-- Prima la Provincia --</option>';
    selCom.disabled = true;

    btnAdd.disabled = true;

    // -----------------------------------------------------------
    // B. FASE DI INIZIALIZZAZIONE
    // -----------------------------------------------------------

    // Se è già "true", abbiamo finito
    if (selRegion.dataset.init === "true") return;

    // === 1) POPOLAMENTO REGIONI ===
    // Svuota e aggiungi default
    selRegion.innerHTML = '<option value="">-- Seleziona Regione --</option>';


    const regioni = await getAllTenantsProvinceRegioni();
    if (!regioni) return;

    for (const regione of regioni) {
        selRegion.add(new Option(regione.label, regione.istat_code));
    }

    // === 2) EVENTO CAMBIO REGIONE ===
    selRegion.addEventListener('change', () => {
        // Reset Provincia e Comune
        selProv.innerHTML = '<option value="">-- Seleziona Provincia --</option>';
        selCom.innerHTML = '<option value="">-- Prima la Provincia --</option>';
        selProv.disabled = true;
        selCom.disabled = true;
        btnAdd.disabled = true;

        const regCode = selRegion.value;
        const province = regioni.find(r => r.istat_code == regCode)?.province;


        if (regCode && province) {
            selProv.disabled = false;
            btnAdd.disabled = false;

            for (const provincia of province) {
                selProv.add(new Option(provincia.label, provincia.istat_code));
            }
        }
    });

    // === 3) EVENTO CAMBIO PROVINCIA ===
    selProv.addEventListener('change', () => {
        // Reset Comune
        selCom.innerHTML = '<option value="">-- Tutti i Comuni --</option>';
        selCom.disabled = true;

        const regCode = selRegion.value;
        const provCode = selProv.value;

        const comuni = regioni.find(r => r.istat_code == regCode)?.province.find(p => p.istat_code == provCode)?.comuni;



        if (provCode && comuni) {

            if (comuni.length === 0) {
                selCom.innerHTML = '<option value="">-- Nessun comune disponibile --</option>';
            } else {
                selCom.disabled = false;

                comuni.forEach(comune => {
                    selCom.add(new Option(comune.label, comune.istat_code));
                });
            }

        }
    });

    // === 4) EVENTO CLICK AGGIUNGI ===
    btnAdd.addEventListener('click', () => {
        const rVal = selRegion.value;
        const pVal = selProv.value;
        const cVal = selCom.value;

        if (!rVal) return;

        // Costruzione Label (Testo visibile)
        let label = selRegion.options[selRegion.selectedIndex].text;

        // Costruzione ID Univoco (Valore da inviare al DB)
        // Formato: REGIONE|PROVINCIA|COMUNE
        let valueID = rVal;

        if (pVal) {
            label += ` > ${selProv.options[selProv.selectedIndex].text}`;
            valueID += `|${pVal}`;
        }
        if (cVal) {
            label += ` > ${selCom.options[selCom.selectedIndex].text}`;
            valueID += `|${cVal}`;
        }

        addZoneChip(label, valueID);
    });

    // Marcamol come inizializzato per non rifare questo blocco al prossimo reset
    selRegion.dataset.init = "true";
}

// -----------------------------------------------------------
// HELPER FUNCTIONS 
// -----------------------------------------------------------

const addZoneChip = async (label, valueID) => {
    const container = document.getElementById('selected-zones-list');

    // Evita duplicati visivi
    // Controlliamo se esiste già un chip con questo data-value
    const existingChip = container.querySelector(`.chip[data-value="${valueID}"]`);
    if (existingChip) return;

    // Crea Elemento
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.dataset.value = valueID; // Salviamo l'ID nell'HTML

    // HTML interno con icona X
    chip.innerHTML = `
        <span>${label}</span>
        <i class="fas fa-times"></i>
    `;

    // Evento Rimozione sul click della X
    chip.querySelector('i').addEventListener('click', () => {
        chip.remove();
        updateHiddenZonesInput();
    });

    container.appendChild(chip);
    updateHiddenZonesInput();
}

const updateHiddenZonesInput = async () => {
    const hiddenInput = document.getElementById('hidden-zones-data');
    const chips = document.querySelectorAll('#selected-zones-list .chip');

    // Crea un array con tutti i valori dei chip presenti
    const values = Array.from(chips).map(chip => chip.dataset.value);

    // Salva come stringa JSON
    hiddenInput.value = JSON.stringify(values);

}










// ---------------------------------------------------------
// ---------------------------------------------------------
// ---------------------------------------------------------
// ---------------------------------------------------------
// ---------------------------------------------------------
// ---------------------------------------------------------
// Funzione per applicare i filtri per il form ticket
// ---------------------------------------------------------


export const applicaFormTicket = async (mostra = true, soloAperti = false) => {

    // Disabilitiamo tutti se non devono essere mostrati
    if (!mostra) {
        loadTicketMarker({
            filtroTicket: (ticket) => false
        });
        return;
    }


    // 1) RACCOLTA DATI DAL FORM
    const params = {};

    applicaTicket_RicercaTesto(params);

    const userIsAdmin = isAdmin();
    configurazioni.forEach(conf => {
        const el = document.getElementById(conf.id);

        if (!el) return;

        const isRestricted = el.classList.contains('admin-only');

        if (isRestricted && !userIsAdmin) return;

        if (conf.richiedeOpen && !el.open) return;

        // Se soloAperti è true, applico solo se l'elemento ha l'attributo 'open'.
        if (soloAperti && !el.open) return;



        conf.applica(params);


    });

    // 2) CHIAMATA ALLA MAPPA
    // Passiamo la funzione di filtro configurata con questi parametri
    loadTicketMarker({
        filtroTicket: (ticket) => filtraSingoloTicket(ticket, params)
    });
};


// ---------------------------------------------------------
// 1) TESTO E SELECT
// ---------------------------------------------------------
function applicaTicket_RicercaTesto(params) {
    const textScope = document.querySelector('select[name="text_search_scope"]')?.value;
    const textValue = document.querySelector('input[name="text_search"]')?.value?.toLowerCase().trim();
    if (textValue) {
        params.textSearch = { scope: textScope, value: textValue };
    }
}


// ---------------------------------------------------------
// 2) STATI 
// ---------------------------------------------------------
function applicaTicket_StatiTicket(params) {
    const checkedStatus = Array.from(document.querySelectorAll('#contanitore-dynamic-stato input:checked'))
        .map(cb => cb.value);
    if (checkedStatus.length > 0) {
        params.status = checkedStatus;
    }
}


// ---------------------------------------------------------
// 3) CATEGORIE 
// ---------------------------------------------------------
function applicaTicket_CategorieTicket(params) {
    const checkedCats = Array.from(document.querySelectorAll('#contanitore-dynamic-categorie input:checked'))
        .map(cb => cb.value);
    if (checkedCats.length > 0) {
        params.categories = checkedCats;
    }
}


// ---------------------------------------------------------
// 4) DATE
// ---------------------------------------------------------
function applicaTicket_DataTicket(params) {
    const dateFrom = document.querySelector('input[name="date_from"]')?.value;
    const dateTo = document.querySelector('input[name="date_to"]')?.value;
    if (dateFrom || dateTo) {
        params.dateRange = {
            from: dateFrom ? new Date(dateFrom).getTime() : null,
            to: dateTo ? new Date(dateTo).getTime() : null
        };
    }
}


// ---------------------------------------------------------
// 5) POSIZIONE E RAGGIO
// ---------------------------------------------------------
function applicaTicket_PosizioneAttiva(params) {
    const radiusVal = document.querySelector('input[name="radius_value"]')?.value;
    if (puntoCentrale && puntoCentrale.lat && puntoCentrale.long) {
        params.geo = {
            lat: parseFloat(puntoCentrale.lat),
            lng: parseFloat(puntoCentrale.long),
            radiusKm: parseFloat(radiusVal || 10)
        };
    }
}


// ---------------------------------------------------------
// 6) ZONE ATTIVE (Cascata e Chips)
// ---------------------------------------------------------
function applicaTicket_ZoneAttive(params) {
    const hiddenZones = document.getElementById('hidden-zones-data')?.value;
    if (hiddenZones) {
        try {
            // Parsa l'array di stringhe tipo "12|RM|12345"
            const zonesArray = JSON.parse(hiddenZones);
            if (zonesArray.length > 0) {
                params.zones = zonesArray.map(z => {
                    const parts = z.split('|');
                    return {
                        regione: parts[0],
                        provincia: parts[1] || null,
                        comune: parts[2] || null
                    };
                });
            }
        } catch (e) {
            console.error("Errore parsing zone:", e);
        }
    }
}
