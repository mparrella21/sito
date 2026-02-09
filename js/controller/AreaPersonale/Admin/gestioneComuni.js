import { getAllTenantsProvinceRegioni, postTenant, deleteTenant } from '../../../servizi/api/tenant.js';



let allTenantsFlat = []; // Cache locale per la ricerca

export async function initGestioneComuni() {
    try {
        // 1. Caricamento Dati Gerarchici
        const hierarchicalData = await getAllTenantsProvinceRegioni();

        // 2. Appiattimento dati per la tabella (Regione -> Provincia -> Comune)
        allTenantsFlat = [];
        hierarchicalData.forEach(regione => {
            if (regione.province) {
                regione.province.forEach(provincia => {
                    if (provincia.comuni) {
                        provincia.comuni.forEach(comune => {
                            allTenantsFlat.push({
                                ...comune,
                                provincia_nome: provincia.nome,
                                regione_nome: regione.nome
                            });
                        });
                    }
                });
            }
        });

        // 3. Render Iniziale
        renderTenantsTable(allTenantsFlat);

        // 4. Setup Ricerca
        const searchInput = document.getElementById('tenant-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = allTenantsFlat.filter(t =>
                    t.label.toLowerCase().includes(term) ||
                    (t.istat_code && t.istat_code.includes(term))
                );
                renderTenantsTable(filtered);
            });
        }

        // 5. Setup Aggiunta (Modal)
        const btnAdd = document.getElementById('add-tenant-btn');
        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                // Logica apertura modale qui (dipende dalla tua implementazione modale)
                // Esempio: document.getElementById('add-tenant-modal').classList.add('active');
                console.log("Apri modale aggiunta comune");
            });
        }

    } catch (error) {
        console.error("Errore Gestione Comuni:", error);
    }
}

function renderTenantsTable(tenants) {
    const tbody = document.getElementById('tenants-table-body');
    if (!tbody) return;

    tbody.innerHTML = tenants.map(t => `
        <tr>
            <td><strong>${t.label}</strong></td>
            <td>${t.istat_code || '--'}</td>
            <td>${t.provincia_nome} (${t.regione_nome})</td>
            <td>
                <button class="btn-icon text-blue" onclick="editTenant('${t.id}')" title="Modifica"><i class="fas fa-edit"></i></button>
                <button class="btn-icon text-red" onclick="handleDeleteTenant('${t.id}')" title="Elimina"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// Funzione globale per l'onclick nell'HTML
window.handleDeleteTenant = async (id) => {
    if (confirm("Sei sicuro di voler eliminare questo comune?")) {
        try {
            await deleteTenant(id);
            initGestioneComuni(); // Ricarica tabella
        } catch (e) { alert("Errore durante l'eliminazione"); }
    }
};