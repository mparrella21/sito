import { getGeoDistribution } from '../../../servizi/api/metrics.js';

export async function initMonitoraggioGlobale() {
    try {
        const geoData = await getGeoDistribution(); // Array di regioni con dati

        // 1. Render Griglia Regioni
        const container = document.getElementById('regions-container');
        if (container) {
            container.innerHTML = geoData.map(region => `
                <div class="region-card">
                    <div class="region-header">
                        <h4>${region.nome}</h4>
                        <span class="badge">${region.activity_level || 'Normal'}</span>
                    </div>
                    <div class="region-stats">
                        <div class="stat-row">
                            <span>Ticket:</span> <strong>${region.total_tickets}</strong>
                        </div>
                        <div class="stat-row">
                            <span>Comuni:</span> <strong>${region.tenants || 0}</strong>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // 2. Init Mappa (Placeholder Logica)
        // Qui andrebbe inizializzato Leaflet o passati i dati alla mappa SVG
        console.log("Dati geografici caricati per la mappa:", geoData);

    } catch (error) {
        console.error("Errore Monitoraggio Globale:", error);
    }
}