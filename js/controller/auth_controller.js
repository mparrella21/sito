import { closeModal } from '../modal_manager.js';




// *********************************** Inizzializzatore Form ********************************************
export const initAuth = (isLogin = true) => {

    // 1) Setup iniziale su cosa mostrare
    if (isLogin) {
        showLogin();

    } else {
        showRegister();
    }

    // 2) Gestione dei button (Login & Register)
    const btnLogin = document.getElementById("btn-tab-login");
    const btnRegister = document.getElementById("btn-tab-register");
    btnLogin.addEventListener("click", () => {
        showLogin();
    });

    btnRegister.addEventListener("click", () => {
        showRegister();
    });



    // PER GOOGLE DA SISTEMARE
    if (window.google) {
        google.accounts.id.initialize({
            // DA AGGIORNARE QUANDO STARTO IL PROGETTO
            client_id: "IL_TUO_CLIENT_ID_QUI.apps.googleusercontent.com",
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



    /*
    // 2) Gestione LOGIN (Invio Form)
    const formLogin = document.getElementById("form-login");
    formLogin.addEventListener("submit", async (e) => {
        e.preventDefault(); // BLOCCA il ricaricamento della pagina standard

        // Raccogli i dati
        const formData = new FormData(formLogin);

        try {
            // Chiamata all'API PHP (che creeremo dopo)
            const response = await fetch('api/login.php', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // In auth_controller.js dentro l'evento submit del login
                if (result.success) {
                    // 1. Chiudi la modale
                    closeModal();

                    // 2. Aggiorna l'interfaccia utente (Header)
                    // Qui potresti ricaricare la home o chiamare una funzione globale di aggiornamento
                    window.location.reload(); // Il metodo più brutale ma sicuro per l'esame per aggiornare tutto
                    // OPPURE (Più elegante):
                    // updateHeader(result.user); 
                }
            } else {
                // Errore: Mostra messaggio
                showMsg('msg-login', result.message, 'error');
            }
        } catch (err) {
            showMsg('msg-login', "Errore di connessione al server", 'error');
        }
    });

    // 3) Gestione REGISTRAZIONE (Simile al login)
    const formRegister = document.getElementById("form-register");
    formRegister.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(formRegister);

        try {
            const response = await fetch('api/register.php', { method: 'POST', body: formData });
            const result = await response.json();

            if (result.success) {
                showMsg('msg-register', "Registrazione avvenuta! Ora accedi.", 'success');
                formRegister.reset(); // Pulisce i campi
                // Opzionale: Switch automatico al tab Login dopo 2 secondi
            } else {
                showMsg('msg-register', result.message, 'error');
            }
        } catch (err) {
            showMsg('msg-register', "Errore server", 'error');
        }
    });
    */


};

// Funzione helper per mostrare messaggi
function showMsg(elementId, message, type) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.className = `message-box ${type}`; // Imposta classe .error o .success
}




// *********************************** Funzione attivare il login ********************************************
function showLogin() {
    const btnLogin = document.getElementById("btn-tab-login");
    const btnRegister = document.getElementById("btn-tab-register");
    const viewLogin = document.getElementById("view-login");
    const viewRegister = document.getElementById("view-register");

    btnLogin.classList.add("attivo");
    btnRegister.classList.remove("attivo");

    viewLogin.classList.add("attivo");
    viewRegister.classList.remove("attivo");
}

// *********************************** Funzione attivare la registrazione ********************************************
function showRegister() {
    const btnLogin = document.getElementById("btn-tab-login");
    const btnRegister = document.getElementById("btn-tab-register");
    const viewLogin = document.getElementById("view-login");
    const viewRegister = document.getElementById("view-register");

    btnRegister.classList.add("attivo");
    btnLogin.classList.remove("attivo");

    viewRegister.classList.add("attivo");
    viewLogin.classList.remove("attivo");
}






// ***************************************** PER GOOGLE DA SISTEMARE 

// Funzione globale che riceve la risposta da Google
window.handleGoogleCredential = (response) => {
    // response.credential contiene il token JWT cifrato
    sendToBackend(response.credential);
};

const sendToBackend = async (token) => {
    try {
        const response = await fetch('api/google_login.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token })
        });

        const result = await response.json();

        if (result.success) {
            // Chiudi modale e aggiorna header (importa le funzioni necessarie)
            document.getElementById('modal-container').classList.remove('open');
            window.location.reload();
        } else {
            alert("Errore login Google: " + result.message);
        }
    } catch (e) {
        console.error(e);
    }
};