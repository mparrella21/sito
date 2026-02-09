import { applicaFormComune, initFormComune } from "../FiltriMappa/FormComuni_controller.js";
import { initFormTicket, applicaFormTicket } from "../FiltriMappa/FormTicket_controller.js";





const menu = {
    "ticket": {
        idBtnArea: "btn-tab-ticket",
        idArea: "area-ticket",
        idForm: "form-filtri-ticket",
        titleSwitch: "Mostra Ticket sulla Mappa",


        init: initFormTicket,
        applicaFiltri: applicaFormTicket
    },
    "comuni": {
        idBtnArea: "btn-tab-comuni",
        idArea: "area-comuni",
        idForm: "form-filtri-comuni",
        titleSwitch: "Mostra confini comuni sulla Mappa",


        init: initFormComune,
        applicaFiltri: applicaFormComune,
        onlyAdmin: true

    }
};







export const initFiltriMappa = async () => {

    // 1) Inizializzazione button scelta
    initButtonScelta();

    // 2) Vista da mostrare inizialmente
    showArea(menu["ticket"]);

    // 3) Inizzializzare tutti i form
    reset();

    // 4) Inizializzazione 
    initButtonFooter();

}








// *******************************************************************************
// Funzione di inizializzazione button scelta
const initButtonScelta = () => {

    Object.values(menu).forEach(elemento => {

        const btn = document.getElementById(elemento.idBtnArea);
        btn.addEventListener("click", () => {
            showArea(elemento);
        });


        const globalToggle = document.getElementById('toggle-generale');
        const formContainer = document.getElementById(elemento.idForm);

        globalToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                formContainer.classList.remove('disabilitato');
            } else {
                formContainer.classList.add('disabilitato');
            }
        });

    });


}

// *******************************************************************************
// Funzione per mostrare una determinata area
function showArea(menuArea) {

    Object.values(menu).forEach(elemento => {

        const isArea = (menuArea == elemento);

        const btn = document.getElementById(elemento.idBtnArea);
        const view = document.getElementById(elemento.idArea);


        const className = "attivo";

        if (isArea) {
            btn.classList.add(className);
            view.classList.add(className);

            const labelToggle = document.getElementById("switch-label");
            labelToggle.innerText = elemento.titleSwitch;


        } else {
            btn.classList.remove(className);
            view.classList.remove(className);
        }


    });

}


// *******************************************************************************
// Funzione di inizializzazione applica e reset  
function initButtonFooter() {

    const btnApply = document.getElementById("btn-apply");
    const btnReset = document.getElementById("btn-reset");

    if (!btnApply || !btnReset) return;

    if (btnApply)
        btnApply.addEventListener("click", () => {
            applica();
        });

    if (btnReset)
        btnReset.addEventListener("click", () => {
            reset();
        });
}




// *******************************************************************************
// Funzione per applicare i filtri dell'area attiva
function applica() {

    const globalToggleLogic = document.getElementById('toggle-generale')?.checked ?? true;
    const onlyOpenLogic = document.getElementById('logic-only-open')?.checked ?? false;

    Object.values(menu).forEach(elemento => {

        const view = document.getElementById(elemento.idArea);

        if (view.classList.contains("attivo")) {
            if (elemento.applicaFiltri) {
                elemento.applicaFiltri(globalToggleLogic, onlyOpenLogic);
            }
        }
    });

}

// *******************************************************************************
// Funzione per resettare i filtri dell'area attiva
function reset() {

    const onlyOpenLogic = document.getElementById('logic-only-open')?.checked ?? false;

    Object.values(menu).forEach(elemento => {

        const view = document.getElementById(elemento.idArea);

        if (view.classList.contains("attivo")) {
            if (elemento.init) {
                elemento.init(onlyOpenLogic);
            }
        }

    });
}

