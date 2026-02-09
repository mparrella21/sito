import { closeModal } from '../../modal_manager.js';
import { login, register, loginUser, logout, getRuoli, parseJwt, getCurrentUser } from '../../servizi/api/autenticazione.js';
import { postUtente } from '../../servizi/api/utenti.js';


// *********************************** Inizzializzatore Form ********************************************
export const initAuth = (isLogin = true) => {

    // 1) Setup iniziale su cosa mostrare
    showFormAccesso(true);
    if (isLogin) {
        showLogin();
    } else {
        showRegister();
    }

    // 2) Gestione dei button (Login & Register)
    initButtonScelta();

    // 2) Gestione LOGIN 
    gestioneLogin();

    // 3) Gestione REGISTRAZIONE
    gestioneRegistrazione();

};




// *********************************** Funzione per decidere che form mostrare********************************************
const showFormAccesso = (cosaMostrare) => {
    const formDiAccesso = document.getElementById("formDiAccesso");
    const formDatiAnagrafici = document.getElementById("formDatiAnagrafici");

    if (cosaMostrare) {

        formDiAccesso.classList.remove("hidden");
        formDatiAnagrafici.classList.add("hidden");
        const msg = document.getElementById("msg-dati");
        msg.classList.remove("success", "error")
    } else {
        formDiAccesso.classList.add("hidden");
        formDatiAnagrafici.classList.remove("hidden");
    }



}
// *********************************** Funzione inizializzazione button ********************************************
const initButtonScelta = () => {
    const btnLogin = document.getElementById("btn-tab-login");
    const btnRegister = document.getElementById("btn-tab-register");
    btnLogin.addEventListener("click", () => {
        showLogin();
    });

    btnRegister.addEventListener("click", () => {
        showRegister();
    });
}




// *********************************** Funzione inizializzazione login ********************************************
const gestioneLogin = () => {
    const formLogin = document.getElementById("form-login");
    if (!formLogin) return;

    formLogin.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Raccogli i dati
        const formData = new FormData(formLogin);

        let credenzialiValide = false;
        let result;
        try {

            // Verifico le credenziali
            result = await login(formData.get('email'), formData.get('password'))

            credenzialiValide = true;


            const ruoli = getRuoli();
            const jwtUser = parseJwt(result.access_token);

            // B. Controllo Ruolo (Sicurezza lato client)
            // Anche se il login è ok, se è admin non deve entrare qui
            if (result && ruoli[jwtUser.role] == ruoli[3]) {


                if (await getCurrentUser())
                    await logout(false);

                formLogin.reset();
                showMsg('msg-login', "Errore durante l'accesso", 'error');


            } else {
                // Prendo informazioni utente e salvo la sessione
                const user = await loginUser(result, formData.get('email'));
                closeModal();
                window.location.reload();
            }

        } catch (error) {
            formLogin.reset();

            if (!credenzialiValide) {
                // Credenziali errate
                showMsg('msg-login', "Credenziali errate", 'error');
            } else {
                // Utente non trovato


                showMsg('msg-login', "Credenziali corrette ma dati anagrafici non trovati, il form verra aggiornato per l'inserimento", 'error');

                // aspetto e poi cambio form
                setTimeout(() => {
                    gestioneAnagrafica(result);
                    showFormAccesso(false);
                }, 5000);
            }

        }
    });



    // Disabilitato finche non attivo
    if (false && window.google) {
        google.accounts.id.initialize({

            client_id: "802415952838-9lehle0ro3dgu7dma0321lhccihdcp1h.apps.googleusercontent.com",
            callback: window.handleGoogleCredential
        });

        google.accounts.id.renderButton(
            document.getElementById("google-btn-container"),
            {
                type: "standard",
                theme: "outline",
                size: "large",
                width: "110px",
                text: "signin",
                shape: "pill"
            }
        );
    }
}



// *********************************** Funzione inizializzazione registrazione ********************************************
const gestioneRegistrazione = () => {
    const formRegister = document.getElementById("form-register");


    formRegister.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(formRegister);

        let credenzialiValide = false;
        let result;
        let email = formData.get('email')
        try {

            result = await register(email, formData.get('password'));

            credenzialiValide = true;
            const user = await postUtente(result.access_token, result.user_id, formData.get('nome'), formData.get('cognome'), formData.get('data-nascita'), formData.get('cellulare'));


            showMsg('msg-register', "Registrazione avvenuta! Ora accedi.", 'success');
            formRegister.reset();
            setTimeout(() => {
                showLogin();
            }, 5000);

        } catch (err) {
            if (!credenzialiValide) {
                // Credenziali errate
                showMsg('msg-register', "Errore durante l'autenticazione, possibile che la mail già sia stata usata", 'error');
            } else {
                // Utente non trovato
                showMsg('msg-register', "Errore durante la registrazione dei dati anafraci, verrai reindirizzato per provare", 'error');

                // aspetto e poi cambio form
                setTimeout(() => {
                    gestioneAnagrafica(result, email);
                    showFormAccesso(false);
                }, 5000);
            }


        }
    });
}

// *********************************** Funzione inizializzazione registrazione ********************************************
const gestioneAnagrafica = (result, email) => {
    const formDati = document.getElementById("form-dati");


    formDati.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(formDati);


        try {

            const resultPost = await postUtente(result.access_token, result.user_id, formData.get('nome'), formData.get('cognome'), formData.get('data-nascita'), formData.get('cellulare'))

            const user = await loginUser(result, email);


            closeModal();
            window.location.reload();

        } catch (err) {
            // formDati.reset();
            showMsg('msg-dati', "Errore inserimento dati, riprova il login diretto", 'error');

            // aspetto e poi cambio form
            setTimeout(() => {
                showFormAccesso(true);
                showLogin();
            }, 5000);
        }
    });
}











// **************** Funzione attivare il login ****************
function showLogin() {
    const btnLogin = document.getElementById("btn-tab-login");
    const btnRegister = document.getElementById("btn-tab-register");
    const viewLogin = document.getElementById("view-login");
    const viewRegister = document.getElementById("view-register");

    btnLogin.classList.add("attivo");
    btnRegister.classList.remove("attivo");

    viewLogin.classList.add("attivo");
    viewRegister.classList.remove("attivo");

    const msg = document.getElementById("msg-login");
    msg.classList.remove("success", "error")
}

// **************** Funzione attivare la registrazione ****************
function showRegister() {
    const btnLogin = document.getElementById("btn-tab-login");
    const btnRegister = document.getElementById("btn-tab-register");
    const viewLogin = document.getElementById("view-login");
    const viewRegister = document.getElementById("view-register");

    btnRegister.classList.add("attivo");
    btnLogin.classList.remove("attivo");

    viewRegister.classList.add("attivo");
    viewLogin.classList.remove("attivo");

    const msg = document.getElementById("msg-register");
    msg.classList.remove("success", "error")
}



// **************** Funzione helper per mostrare messaggi ****************
function showMsg(elementId, message, type) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.className = `message-box ${type}`; // Imposta classe .error o .success


}




// **************** Funzioni per google  ****************

// Funzione globale che riceve la risposta da Google
window.handleGoogleCredential = (response) => {
    // response.credential contiene il token JWT cifrato
    //  sendToBackend(response.credential);
    console.log("GOOGLE TOKEN:", response.credential);
};

