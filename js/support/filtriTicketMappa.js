import { getTenant, searchTenant } from "../servizi/api/tenant.js";

// ---------------------------------------------------------
// Funzione per verificare se un ticket verifica delle condizioni
// ---------------------------------------------------------
export const filtraSingoloTicket = async (ticket, params) => {

    // 1) Filtro Stato
    if (params.status && !params.status.includes(String(ticket.id_status))) {
        return false;
    }
    // 2) Filtro Categorie
    if (params.categories) {
        // Controllo di sicurezza: se il ticket non ha l'array categories, lo scartiamo
        if (!ticket.categories || !Array.isArray(ticket.categories)) {
            return false;
        }

        // Cerchiamo se c'è un'intersezione tra le categorie selezionate e quelle del ticket.
        const hasMatch = ticket.categories.some(ticketCat =>
            params.categories.includes(String(ticketCat.id))
        );

        // Se non c'è nemmeno una corrispondenza, nascondi il ticket
        if (!hasMatch) {
            return false;
        }
    }


    // 3) Filtro Data
    if (params.dateRange) {
        const ticketDate = new Date(ticket.creation_date).getTime();
        if (params.dateRange.from && ticketDate < params.dateRange.from) return false;
        // Aggiungiamo un giorno (86400000ms) alla data fine per includere tutto il giorno selezionato
        if (params.dateRange.to && ticketDate > (params.dateRange.to + 86400000)) return false;
    }


    const posizioneTicket = await searchTenant(ticket.lat, ticket.lon);
    const comune = await getTenant(posizioneTicket.tenant_id)

    // 4) Filtro Zone (Regione/Provincia/Comune)
    if (params.zones) {

        // Logica OR: Il ticket deve appartenere ad ALMENO UNA delle zone selezionate
        const matchZone = params.zones.some(zona => {

            // Verifica Regione
            if (String(comune.regione_code) != zona.regione) return false;


            // Verifica Provincia (se specificata nel filtro)
            if (zona.provincia && String(comune.provincia_code) != zona.provincia) return false;

            // Verifica Comune (se specificato nel filtro)
            if (zona.comune && String(comune.istat_code) != zona.comune) return false;

            return true;
        });

        if (!matchZone) return false;
    }

    // 5) Filtro Geospaziale (Raggio)
    if (params.geo) {
        if (!ticket.lat || !ticket.lon) return false; // Se il ticket non ha coordinate, via

        const dist = calcolaDistanzaKm(params.geo.lat, params.geo.lng, ticket.lat, ticket.lon);
        if (dist > params.geo.radiusKm) return false;
    }

    // 6) Filtro Testuale
    if (params.textSearch) {
        const val = params.textSearch.value;
        const scope = params.textSearch.scope;

        let textMatch = false;

        // Logica in base allo scope selezionato
        switch (scope) {
            case 'title':
                textMatch = ticket.title?.toLowerCase().includes(val);
                break;
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
                textMatch = (ticket.title?.toLowerCase().includes(val)) ||
                    (comune.reg_name?.toLowerCase().includes(val)) ||
                    (comune.provincia_label?.toLowerCase().includes(val)) ||
                    (comune.label?.toLowerCase().includes(val));
                break;
        }

        if (!textMatch) return false;
    }

    return true;
};

// Helper per calcolare distanza (Formula Haversine semplificata)
function calcolaDistanzaKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raggio Terra in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}