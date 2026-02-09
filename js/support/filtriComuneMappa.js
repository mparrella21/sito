
// ---------------------------------------------------------
// Funzione per verificare se un comune verifica delle condizioni
// ---------------------------------------------------------
export const filtraSingoloComune = async (comune, params) => {


    // 1) Filtro Zone (Regione/Provincia/Comune)
    if (params.zones) {

        // Logica OR: Il comune deve appartenere ad ALMENO UNA delle zone selezionate
        const matchZone = params.zones.some(zona => {

            // Verifica Regione
            console.log(comune?.regione_code != zona.regione)
            if (comune?.regione_code != zona.regione) return false;

            // Verifica Provincia (se specificata nel filtro)
            if (zona.provincia && String(comune?.provincia_code) != zona.provincia) return false;

            // Verifica Comune (se specificato nel filtro)
            if (zona.comune && String(comune?.istat_code) != zona.comune) return false;

            return true;
        });

        console.log(matchZone)
        if (!matchZone) return false;
    }

    console.log(2)
    // 6) Filtro Testuale
    if (params.textSearch) {
        const val = params.textSearch.value;
        const scope = params.textSearch.scope;

        let textMatch = false;

        // Logica in base allo scope selezionato
        switch (scope) {
            case 'region':
                textMatch = comune.regione_label?.toLowerCase().includes(val);
                break;
            case 'province':
                textMatch = comune.provincia_label?.toLowerCase().includes(val);
                break;
            case 'municipality':
                textMatch = comune.label?.toLowerCase().includes(val);
                break;
            case 'all':
            default:
                // Cerca ovunque
                textMatch = (comune.regione_label?.toLowerCase().includes(val)) ||
                    (comune.provincia_label?.toLowerCase().includes(val)) ||
                    (comune.label?.toLowerCase().includes(val));
                break;
        }

        if (!textMatch) return false;
    }



    return true;
}

