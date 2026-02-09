import { getGlobalVolumes } from '../../../servizi/api/metrics.js';

export async function initDashboardAdmin() {
    try {
        const stats = await getGlobalVolumes();

        // 1. Popola le Card
        document.getElementById('total-tickets').textContent = (stats.total_tickets || 0).toLocaleString();
        document.getElementById('active-tenants').textContent = (stats.active_tenants || 0).toLocaleString();

        // Esempio ticket risolti (se fornito da API)
        if (stats.solved_tickets) {
            document.getElementById('solved-tickets').textContent = stats.solved_tickets.toLocaleString();
        }

        // 2. Inizializza Grafico Andamento (Chart.js)
        const ctx = document.getElementById('main-dashboard-chart');
        if (ctx && window.Chart) {
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: stats.history ? stats.history.map(h => h.date) : ['Lun', 'Mar', 'Mer', 'Gio', 'Ven'],
                    datasets: [{
                        label: 'Nuovi Ticket',
                        data: stats.history ? stats.history.map(h => h.count) : [12, 19, 3, 5, 2],
                        borderColor: '#3498db',
                        tension: 0.4,
                        fill: true,
                        backgroundColor: 'rgba(52, 152, 219, 0.1)'
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

    } catch (error) {
        console.error("Errore Init Dashboard:", error);
    }
}