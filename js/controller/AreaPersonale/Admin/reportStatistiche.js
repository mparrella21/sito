import { getComparativePerformance, getCategoriesDistribution } from '../../../servizi/api/metrics.js';

export async function initReportStatistiche() {
    try {
        const [performanceData, categoriesData] = await Promise.all([
            getComparativePerformance(),
            getCategoriesDistribution()
        ]);

        // 1. Grafico Performance (Bar)
        const ctxPerf = document.getElementById('performance-chart');
        if (ctxPerf && window.Chart) {
            new Chart(ctxPerf, {
                type: 'bar',
                data: {
                    labels: performanceData.map(d => d.nome), // Nome comune
                    datasets: [{
                        label: 'Tempo Risposta (ore)',
                        data: performanceData.map(d => d.response_time),
                        backgroundColor: '#3498db'
                    }]
                },
                options: { responsive: true }
            });
        }

        // 2. Grafico Categorie (Doughnut)
        const ctxCat = document.getElementById('categories-chart');
        if (ctxCat && window.Chart) {
            new Chart(ctxCat, {
                type: 'doughnut',
                data: {
                    labels: categoriesData.map(c => c.name),
                    datasets: [{
                        data: categoriesData.map(c => c.count),
                        backgroundColor: ['#e74c3c', '#f1c40f', '#2ecc71', '#9b59b6', '#34495e']
                    }]
                },
                options: { responsive: true }
            });
        }

        // 3. Tabella Categorie
        const tableBody = document.getElementById('categories-table-body');
        if (tableBody) {
            tableBody.innerHTML = categoriesData.map(c => `
                <tr>
                    <td>${c.name}</td>
                    <td>${c.count}</td>
                    <td>${c.percentage}%</td>
                </tr>
            `).join('');
        }

    } catch (error) {
        console.error("Errore Report Statistiche:", error);
    }
}