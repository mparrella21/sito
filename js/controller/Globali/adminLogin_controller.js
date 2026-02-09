import { login, logout, isAdmin, getCurrentUser, loginUser, parseJwt, getRuoli, setTenantId } from '../../servizi/api/autenticazione.js';
import { navigateTo } from '../../router.js';


export const initAdminLogin = async () => {

    // 1. Riferimenti DOM
    const form = document.getElementById('form-login-admin');
    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const errorBox = document.getElementById('login-error');
    const errorText = document.getElementById('error-text');
    const btnSubmit = form.querySelector('.btn-submit');
    const spinner = document.getElementById('btn-spinner');
    const btnText = form.querySelector('.btn-text');
    const togglePass = document.getElementById('toggle-password');

    // 2. Gestione Toggle Password (mostra/nascondi)
    if (togglePass) {
        togglePass.addEventListener('click', () => {
            const type = passInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passInput.setAttribute('type', type);
            togglePass.classList.toggle('fa-eye');
            togglePass.classList.toggle('fa-eye-slash');
        });
    }

    // 3. Gestione Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Reset errori
        errorBox.classList.add('hidden');
        setLoading(true);

        const email = emailInput.value.trim();
        const password = passInput.value.trim();

        try {
            // A. Chiamata API Login
            const result = await login(email, password);

            const ruoli = getRuoli();
            const jwtUser = parseJwt(result.access_token);

            // B. Controllo Ruolo (Sicurezza lato client)
            // Anche se il login è ok, se non è admin non deve entrare qui
            if (result && ruoli[jwtUser.role] == ruoli[3]) {
                const user = await loginUser(result, email);
                setTenantId(null);
                // SUCCESSO: Redirect alla Dashboard Admin
                navigateTo('/area-personale');
            } else {
                // FALLIMENTO: Utente normale ha provato ad accedere come admin
                throw new Error("Accesso negato: non possiedi i privilegi di amministratore.");
            }

        } catch (error) {
            console.error("Login fallito:", error);

            // Se l'utente non era admin, facciamo logout forzato per pulire il token --> Sicurezza, non dovrebbe essersi loggato
            if (await getCurrentUser())
                await logout(false);

            // Mostra errore nell'interfaccia
            let msg = "Credenziali non valide.";
            if (error.message.includes("privilegi")) {
                msg = error.message;
            } else if (error.message.includes("Network")) {
                msg = "Errore di connessione al server.";
            }

            errorText.innerText = msg;
            errorBox.classList.remove('hidden');
        } finally {
            setLoading(false);
        }
    });

    // Helper per stato caricamento bottone
    function setLoading(isLoading) {
        if (isLoading) {
            btnSubmit.disabled = true;
            spinner.classList.remove('hidden');
            btnText.classList.add('hidden');
        } else {
            btnSubmit.disabled = false;
            spinner.classList.add('hidden');
            btnText.classList.remove('hidden');
        }
    }
};