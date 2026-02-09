
import { getAllTenantsProvinceRegioni } from '../../servizi/api/tenant.js';

import { loadComuniBoundaries } from '../../servizi/map.js';
import { filtraSingoloComune } from '../../support/filtriComuneMappa.js';



//
const configurazioni = [
    { id: 'zoneComune', init: initComune_ZoneAttive, applica: (params) => applicaComune_ZoneAttive(params) } // Zone da attivare
];




// ---------------------------------------------------------
// ---------------------------------------------------------
// ---------------------------------------------------------
// Init per form comune
// ---------------------------------------------------------
export const initFormComune = async (soloAperti = false) => {

    // 1) Scelta e testo
    initComune_RicercaTesto();


    configurazioni.forEach(async conf => {
        const el = document.getElementById(conf.id);
        if (!el) return;

        // Se soloAperti è true, resetto solo se l'elemento ha l'attributo 'open'.
        if (!soloAperti || (el && el.open)) {
            conf.init();
        }


    });

}

// ---------------------------------------------------------
// 1) TESTO E SELECT
// ---------------------------------------------------------
function initComune_RicercaTesto() {
    const scopeSelect = document.querySelector('select[name="text_search_scope_comune"]');
    const textInput = document.querySelector('input[name="text_search_comune"]');

    if (scopeSelect) scopeSelect.value = 'all';
    if (textInput) textInput.value = '';
};



// ---------------------------------------------------------
// 2) ZONE ATTIVE (Cascata e Chips)
// ---------------------------------------------------------
async function initComune_ZoneAttive() {
    // 1) Recupero Elementi DOM
    const selRegion = document.getElementById('sel-region-comune');
    const selProv = document.getElementById('sel-province-comune');
    const selCom = document.getElementById('sel-comune-comune');
    const btnAdd = document.getElementById('btn-add-zone-comune');
    const chipsContainer = document.getElementById('selected-zones-list-comune');
    const hiddenInput = document.getElementById('hidden-zones-data-comune');

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
    const container = document.getElementById('selected-zones-list-comune');

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
    const hiddenInput = document.getElementById('hidden-zones-data-comune');
    const chips = document.querySelectorAll('#selected-zones-list-comune .chip');

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
// Funzione per applicare i filtri per il form comune
// ---------------------------------------------------------


export const applicaFormComune = async (mostra = true, soloAperti = false) => {

    // Disabilitiamo tutti se non devono essere mostrati
    if (!mostra) {
        loadComuniBoundaries({
            filtroComuni: (comune) => false
        });
        return;
    }


    // 1) RACCOLTA DATI DAL FORM
    const params = {};

    applicaComune_RicercaTesto(params);

    configurazioni.forEach(conf => {
        const el = document.getElementById(conf.id);

        if (!el) return;

        if (conf.richiedeOpen && !el.open) return;

        // Se soloAperti è true, applico solo se l'elemento ha l'attributo 'open'.
        if (soloAperti && !el.open) return;


        conf.applica(params);
    });

    // 2) CHIAMATA ALLA MAPPA
    // Passiamo la funzione di filtro configurata con questi parametri
    loadComuniBoundaries({
        filtroComuni: (comune) => filtraSingoloComune(comune, params)
    });
};


// ---------------------------------------------------------
// 1) TESTO E SELECT
// ---------------------------------------------------------
function applicaComune_RicercaTesto(params) {
    const textScope = document.querySelector('select[name="text_search_scope_comune"]')?.value;
    const textValue = document.querySelector('input[name="text_search_comune"]')?.value?.toLowerCase().trim();
    if (textValue) {
        params.textSearch = { scope: textScope, value: textValue };
    }
}

// ---------------------------------------------------------
// 6) ZONE ATTIVE (Cascata e Chips)
// ---------------------------------------------------------
function applicaComune_ZoneAttive(params) {
    const hiddenZones = document.getElementById('hidden-zones-data-comune')?.value;

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
