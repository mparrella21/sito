


// Immagina che questa funzione venga chiamata quando l'utente scrive nella barra di ricerca
// o quando carichi la pagina.
export const applicaFiltri = () => {

    // 1. Raccogli i dati attuali (STATO)
    const userRole = 'operatore'; // Lo prenderai dalla sessione reale
    const userComuni = ['Napoli', 'Portici']; // Dalla sessione
    const searchText = document.getElementById('search-input').value; // Dall'HTML

    // 2. Chiedi alla logica di creare la funzione di filtro perfetta per questo momento
    const funzioneDiFiltro = creaFiltroMappa({
        ruolo: userRole,
        comuniPermessi: userComuni,
        testoRicerca: searchText
    });

    // 3. Passi la funzione alla mappa
    // La mappa non sa che stai filtrando per ruolo o per ricerca, lei esegue e basta.
    loadComuniBoundaries({
        filtroComuni: funzioneDiFiltro
    });
};





/**
 * Questa funzione decide quale regola applicare.
 * Restituisce una FUNZIONE che accetta (props) e ritorna true/false.
 */
export const creaFiltroMappa = (params) => {
    const { ruolo, testoRicerca, comuniPermessi } = params;

    // Normalizziamo il testo di ricerca (minuscolo per evitare problemi)
    const searchString = testoRicerca ? testoRicerca.toLowerCase() : "";

    // Restituiamo la funzione di filtro vera e propria
    return (props) => {
        const nomeComune = props.name.toLowerCase(); // Assumendo che nel GeoJSON sia 'name'

        // 1. PRIMA REGOLA: Se c'è una ricerca, deve matchare il nome
        // (Se searchString è vuota, includes restituisce sempre true, quindi non rompe nulla)
        const matchRicerca = nomeComune.includes(searchString);

        if (!matchRicerca) return false; // Se non corrisponde al nome cercato, scarta subito

        // 2. SECONDA REGOLA: Permessi basati sul Ruolo
        if (ruolo === 'admin') {
            return true; // L'admin vede tutto (se passa il filtro ricerca)
        }

        if (ruolo === 'operatore' || ruolo === 'cittadino') {
            // Devono vedere solo i comuni nella loro lista permessa
            if (!comuniPermessi || comuniPermessi.length === 0) return false;

            // Verifica se il nome del comune è nell'array dei permessi
            // Nota: uso toLowerCase() anche qui per sicurezza
            return comuniPermessi.some(c => c.toLowerCase() === nomeComune);
        }

        // Default: se il ruolo non è riconosciuto, nascondi tutto per sicurezza
        return false;
    };
};




