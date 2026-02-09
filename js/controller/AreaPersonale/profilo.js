import { getAccessToken, getCurrentUser, setCurrentUser } from "../../servizi/api/autenticazione.js";
import { updateUtente } from "../../servizi/api/utenti.js";
import { loginUser } from "../../servizi/api/autenticazione.js";

export const initProfilo = () => {




    const user = getCurrentUser()

    if (!user) {
        renderError({ code: 403 });
        return;
    }


    const inputData = document.getElementById('data_nascita');

    if (inputData) {
        const today = new Date();

        const formattedDate = today.toISOString().split('T')[0];

        // 3. Imposta il limite massimo
        inputData.max = formattedDate;
    }

    fillForm(user);

}





/* ===============================
   FORM
================================ */
function fillForm(u) {

    /* ===============================
       DOM
    ================================ */
    const form = document.getElementById('user-profile-form');
    const editBtn = document.getElementById('edit-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    const fields = [
        'nome',
        'cognome',
        'email',
        'telefono',
        'data_nascita',

    ];

    let originalData = {};



    document.getElementById('nome').value = u.name || '';
    document.getElementById('cognome').value = u.surname || '';
    document.getElementById('email').value = u.email || '';
    document.getElementById('telefono').value = u.phonenumber || '';
    document.getElementById('data_nascita').value = formatDate(u.birth_date);

    function storeOriginal(u) {
        originalData = JSON.parse(JSON.stringify(u));
    }

    /* ===============================
       EDIT MODE
    ================================ */
    editBtn.addEventListener('click', () => {
        toggleEdit(true);
    });

    cancelBtn.addEventListener('click', () => {
        fillForm(originalData);
        toggleEdit(false);
    });

    function toggleEdit(edit) {
        document.getElementById('nome').disabled = !edit;
        document.getElementById('cognome').disabled = !edit;
        document.getElementById('telefono').disabled = !edit;
        document.getElementById('data_nascita').disabled = !edit;

        editBtn.classList.toggle('hidden', edit);
        saveBtn.classList.toggle('hidden', !edit);
        cancelBtn.classList.toggle('hidden', !edit);
    }

    /* ===============================
       SAVE
    ================================ */
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const body = {
            name: document.getElementById('nome').value,
            surname: document.getElementById('cognome').value,
            phonenumber: document.getElementById('telefono').value,
            birth_date: document.getElementById('data_nascita').value
        };

        try {

            await updateUtente(u.id, body.name, body.surname, body.birth_date, body.phonenumber)

            setCurrentUser({ ...getCurrentUser(), ...body });


            toggleEdit(false);
            storeOriginal(body);

        } catch (err) {
            console.error('Errore salvataggio profilo', err);
        }
    });


}

/* ===============================
      HELPERS
   ================================ */
export const formatDate = (dateString) => {
    if (!dateString) return '';

    // Crea un oggetto Date javascript dalla stringa (es. "Fri, 03 May...")
    const date = new Date(dateString);

    // Controlla se la data è valida
    if (isNaN(date.getTime())) return '';

    // Estrae anno, mese e giorno
    const year = date.getFullYear();
    // getMonth() parte da 0, quindi aggiungiamo 1. 
    // padStart(2, '0') aggiunge lo zero davanti se necessario (es. 5 diventa 05)
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // Ritorna il formato richiesto dal browser: YYYY-MM-DD
    return `${year}-${month}-${day}`;
};
