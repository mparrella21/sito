import { getAllTenants } from '../../servizi/api/tenant.js';



export const initSelezionaTenant = async () => {
    const listContainer = document.getElementById('tenant-list');
    const searchInput = document.getElementById('tenant-search');
    const noResults = document.getElementById('no-results');

    // Array locale per la ricerca veloce
    let allTenantsData = [];

    // 1) Fetch dei dati
    try {

        const tenants = await getAllTenants();

        allTenantsData = tenants;
        renderList(allTenantsData, listContainer, noResults);

    } catch (error) {
        console.error("Errore caricamento comuni:", error);
        listContainer.innerHTML = `
            <div class="erroreLista">
                <i class="fas fa-exclamation-circle"></i>
                <p>Impossibile caricare la lista.</p>
                <button onclick="window.location.reload()" style="margin-top:10px; padding:5px 10px; cursor:pointer;">Riprova</button>
            </div>
        `;
    }

    // 2) Event Listener per la Ricerca
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();

            // Filtriamo l'array
            const filtered = allTenantsData.filter(t =>
                t.label.toLowerCase().includes(searchTerm) ||
                (t.provincia_label && t.provincia_label.toLowerCase().includes(searchTerm))
            );

            renderList(filtered, listContainer, noResults);
        });
    }
};

// Funzione Helper per Renderizzare HTML
const renderList = (items, container, noResultsElement) => {
    container.innerHTML = '';

    if (items.length === 0) {
        noResultsElement.classList.remove('hidden');
        return;
    } else {
        noResultsElement.classList.add('hidden');
    }

    items.forEach(tenant => {
        // Creiamo l'elemento link
        const itemLink = document.createElement('a');
        itemLink.className = 'tenant-item';

        // Costruiamo l'URL dinamico: /{uuid}/
        // IMPORTANTE: href deve essere gestito dal router
        itemLink.href = `/${tenant.id}/`;
        itemLink.setAttribute('data-link', ''); // Attiva il router

        itemLink.innerHTML = `
            <div class="tenant-icon">
                <i class="fas fa-landmark"></i>
            </div>
            <div class="tenant-info">
                <span class="tenant-name">${tenant.label}</span>
                <span class="tenant-location">${tenant.provincia_label || 'Italia'}</span>
            </div>
            <div style="margin-left: auto; color: #ccc;">
                <i class="fas fa-chevron-right"></i>
            </div>
        `;

        container.appendChild(itemLink);
    });
};
