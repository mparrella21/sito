
import { getAddressFromCoordinates } from '../../servizi/photon.js';
import { enableMapPickingMode } from '../../servizi/map.js';
import { getAllCategories, postReply, postTicket, updateTicket } from '../../servizi/api/ticket.js';
import { openModal, closeModal } from '../../modal_manager.js';
import { checkPunto } from './sceltaPosizione_controller.js';


let latTicket = null;
let lngTicket = null;

// *********************************** Inizzializzatore aggiunta ticket ********************************************

export const initAggiuntaTicket = async (params) => {

    const h2 = document.querySelector('.ticket-header h2');

    const loadingSpan = document.createElement('span');
    loadingSpan.className = 'loader-spinner dark';


    // 1) Setup form
    h2.appendChild(loadingSpan);

    try {
        await setupLatLng(params);

        await setupCategorie();

        await setupModifica();

        if (params && params.oldData) {
            await setupSalvataggi(params.oldData);
        }
    } finally {
        if (h2.contains(loadingSpan)) {
            loadingSpan.remove();
        }
    }


    let ticketId = null;

    if (params && params?.ticketId) {
        ticketId = params.ticketId;
        // 2) Aggiorna vista se solo c'è il ticket;
        if (ticketId) {
            disabilitaInserimento(ticketId);
        }
    }

    // 2) Gestione INVIO FORM
    initSubmitBtn(ticketId);


};


// --------------------------------------------------------
// Funzione Helper per notificare il caricamento
// --------------------------------------------------------
const toggleSpinnerNextTo = (elementId, show) => {
    const el = document.getElementById(elementId);
    if (!el) return;

    // Cerchiamo se esiste già lo spinner dentro
    let spinner = el.querySelector('.loader-spinner');

    if (show) {
        if (!spinner) {
            // Se non c'è, lo creiamo al volo
            spinner = document.createElement('span');
            spinner.className = 'loader-spinner dark'; // Usa 'dark' per rotellina scura
            spinner.style.marginLeft = "10px"; // Spazio dal testo
            el.appendChild(spinner);
        }
    } else {
        if (spinner) {
            spinner.remove(); // Lo eliminiamo quando finito
        }
    }
};


// --------------------------------------------------------
// Funzioni di inizializzaione
// --------------------------------------------------------


// GESTIONE INDIRIZZO (Reverse Geocoding)
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

        latTicket = finalLat;
        lngTicket = finalLng;

        const addField = document.getElementById('indirizzo-ticket');

        if (addField) {
            const add = await getAddressFromCoordinates(finalLat, finalLng);
            addField.value = add || `Posizione: ${parseFloat(finalLat).toFixed(5)}, ${parseFloat(finalLng).toFixed(5)}`;

            if (addField.value == "Indirizzo sconosciuto") {
                addField.value = `Inidirizzo non riconosciuto: Posizione: ${parseFloat(finalLat).toFixed(5)}, ${parseFloat(finalLng).toFixed(5)}`
            }

        }


    } else {
        // Caso impossibile (succede solo se la mappa non è caricata per nulla)
        alert("Errore critico: impossibile determinare la posizione.");
        return;
    }
}



// CARICAMENTO CATEGORIE
const setupCategorie = async () => {
    const categorie = await getAllCategories();
    if (!categorie) return;

    const container = document.getElementById('contenitore-categorie');
    if (!container) return;

    // Pulisci prima
    container.innerHTML = '';

    for (const categoria of categorie) {
        // Creiamo il wrapper
        const wrapper = document.createElement('label');
        wrapper.className = 'checkbox-item';

        // Creiamo l'input
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = categoria.id;
        checkbox.name = 'tipo_multiplo';

        // Testo
        const span = document.createElement('span');
        span.innerText = categoria.label;

        // Uniamo tutto
        wrapper.appendChild(checkbox);
        wrapper.appendChild(span);
        container.appendChild(wrapper);
    }
}

// LOGICA TASTO "MODIFICA POSIZIONE"

const setupModifica = async () => {
    const btnModifica = document.getElementById('modifcaPosizione');

    if (!btnModifica) return;

    btnModifica.addEventListener('click', (e) => {
        e.preventDefault();

        // A) Salviamo quello che l'utente ha scritto finora
        const inputTitolo = document.getElementById('titolo');
        const inputDesc = document.getElementById('descrizione');
        const inputFoto = document.getElementById('foto');
        const containerCategorie = document.getElementById('contenitore-categorie');

        const catSelezionate = Array.from(
            containerCategorie.querySelectorAll('input[type="checkbox"]:checked')
        ).map(cb => cb.value);

        //  Creiamo l'oggetto "oldData"
        const datiDaSalvare = {
            titolo: inputTitolo.value,
            descrizione: inputDesc.value,
            categorie: catSelezionate,
            files: Array.from(inputFoto.files)
        };



        // B) Chiudiamo il modale per liberare la vista sulla mappa
        closeModal();

        // C) Avvisiamo l'utente
        // (Opzionale: usa un toast se ce l'hai, altrimenti alert o nulla)
        alert("Clicca sulla mappa per scegliere la nuova posizione. (Tasto destro per annullare)");

        // D) Attiviamo il 'mirino' sulla mappa
        enableMapPickingMode(async (e) => {
            if (await checkPunto(e.latlng.lat, e.latlng.lng)) {
                openModal('ticket', {
                    lat: e.latlng.lat,
                    lng: e.latlng.lng,
                    oldData: datiDaSalvare
                });
            }
        },
            (e) => {

                openModal('ticket', {
                    lat: latTicket,
                    lng: lngTicket,
                    oldData: datiDaSalvare
                });
            });
    });

}



// RIPRISTINO DATI VECCHI (Se presenti)
const setupSalvataggi = (old) => {
    // Riferimenti al DOM
    const inputTitolo = document.getElementById('titolo');
    const inputDesc = document.getElementById('descrizione');
    const inputFoto = document.getElementById('foto');
    const containerCategorie = document.getElementById('contenitore-categorie');



    // A) Testi semplici
    if (old.titolo) inputTitolo.value = old.titolo;
    if (old.descrizione) inputDesc.value = old.descrizione;

    // B) Categorie (Checkbox)
    if (old.categorie && old.categorie.length > 0) {
        // Cicla tutte le checkbox e checka quelle che erano salvate
        const checkboxes = containerCategorie.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            console.log(old.categorie)
            console.log(cb.value)
            if (old.categorie.includes(cb.value)) {
                cb.checked = true;
            }
        });
    }

    // C) File 
    if (old.files && old.files.length > 0) {

        const dataTransfer = new DataTransfer();

        // Poiché abbiamo salvato un Array, possiamo usare forEach
        old.files.forEach(singleFile => {
            dataTransfer.items.add(singleFile);
        });

        // Riassegniamo i file all'input
        inputFoto.files = dataTransfer.files;

        // Feedback visivo (opzionale, se hai una label che conta i file)
        const labelCount = document.getElementById('file-count');
        if (labelCount) labelCount.innerText = `${old.files.length} file selezionati`;
    }


}

// DISABILITA DESCRIZIONE e INSEIMENTO IMMAGINE SE UPDATE TICKET
const disabilitaInserimento = async (ticketId) => {

    const title = document.getElementById('titleModal');
    const btn = document.getElementById("btn-submit-ticket");

    const foto = document.getElementById("row-foto");
    const descrizione = document.getElementById("row-descrizione");

    const inputDesc = document.getElementById('descrizione');
    const inputFoto = document.getElementById('foto');




    if (ticketId) {
        title.innerText = "Aggiorna Segnalazione";
        btn.innerText = "Modifica ticket";

        foto.classList.add("hidden");
        descrizione.classList.add("hidden");
        inputDesc.required = false;
        inputFoto.required = false;

    } else {
        title.innerText = "Nuova Segnalazione"
        btn.innerText = "Invia Segnalazione"
        foto.classList.remove("hidden");
        descrizione.classList.remove("hidden");
        inputDesc.required = true;
        inputFoto.required = true;
    }


}

// --------------------------------------------------------
// Inserimento ticket
// --------------------------------------------------------

const initSubmitBtn = async (ticketId) => {

    const form = document.getElementById('form-ticket');


    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);



        const containerCategorie = document.getElementById('contenitore-categorie');
        const catSelezionateRaw = Array.from(
            containerCategorie.querySelectorAll('input[type="checkbox"]:checked')
        ).map(cb => Number(cb.value));

        const extraCategoryIds = extractCategoryIds(catSelezionateRaw);

        let files;
        if (!ticketId) {
            const inputFoto = document.getElementById('foto');
            files = inputFoto.files;
        }


        let creazioneTicket = false;
        try {
            if (!ticketId) {
                const result = await postTicket(formData.get('titolo'), latTicket, lngTicket, extraCategoryIds);
                creazioneTicket = true;

                const response = await postReply(result.id, formData.get('descrizione'), files);
            } else {
                console.log(1)
                const result = await updateTicket(ticketId, formData.get('titolo'), latTicket, lngTicket, extraCategoryIds)
            }



            form.reset();
            closeModal();
            window.location.reload();

        } catch (error) {
            if (ticketId) {
                alert("Errore nell'aggiornamento dei ticket")
            } else if (creazioneTicket) {
                alert("Ticket creato, ma errore creazione prima reply, vai alla pagina del ticket per riprovare")
            } else {
                alert("Errore creazione ticket")
            }
        }

    });
}

const extractCategoryIds = (categories) => {
    if (!Array.isArray(categories)) return [];

    return categories.map(c => (typeof c === 'object' && c.id ? c.id : c));
};