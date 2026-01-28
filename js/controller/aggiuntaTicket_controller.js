
import { getAddressFromCoordinates } from '../servizi/nominatim.js';


// *********************************** Inizzializzatore aggiunta ticket ********************************************

export const initAggiuntaTicket = (params) => {

    // Inserimento latidune e longitudine
    setupLatLng(params);



    /*
    // 2. Gestione INVIO FORM
    const form = document.getElementById('form-ticket');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        // Qui aggiungerai la logica per inviare i dati al server...
        console.log("Invio ticket in corso...");
    });
    */


};




// ****************************** Funzione per ricavare latidune e longitudine del nuovo ticket ******************************
const setupLatLng = async (params) => {
    // Variabili per le coordinate finali
    let finalLat, finalLng;

    // Usiamo i parametri passati (GPS o Click)
    if (params && params.lat && params.lng) {
        finalLat = params.lat;
        finalLng = params.lng;
    }
    // 2) Non dovrebbero mai mancare, se mancano, prendiamo il centro della mappa
    else if (window.map) {
        console.warn("Nessuna coordinata ricevuta: utilizzo il centro della mappa.");

        const center = window.map.getCenter();
        finalLat = center.lat;
        finalLng = center.lng;
    }


    if (finalLat && finalLng) {
        const latField = document.getElementById('lat');
        const lngField = document.getElementById('lng');

        if (latField && lngField) {
            latField.value = finalLat.toFixed(6);
            lngField.value = finalLng.toFixed(6);
        }

        const addField = document.getElementById('indirizzo-ticket');

        if (addField) {
            const add = await getAddressFromCoordinates(finalLat, finalLng);
            addField.value = add;
        }

    } else {
        // Caso impossibile (succede solo se la mappa non è caricata per nulla)
        alert("Errore critico: impossibile determinare la posizione.");
        return; // Ferma tutto
    }
}