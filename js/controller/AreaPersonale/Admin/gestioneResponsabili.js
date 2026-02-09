import { getAllUsers, deleteUtente } from '../../../servizi/api/utenti.js';

export async function initGestioneResponsabili() {
    try {
        const users = await getAllUsers();

        // Filtriamo solo Admin e Manager (assumendo che l'oggetto user abbia un campo 'role')
        // Se il backend non restituisce il ruolo, bisognerà implementare un endpoint specifico.
        const managers = users.filter(u => u.role === 'admin' || u.role === 'manager');

        const tbody = document.getElementById('responsabili-table-body');
        if (tbody) {
            tbody.innerHTML = managers.map(u => `
                <tr>
                    <td>${u.name} ${u.surname}</td>
                    <td>${u.email}</td>
                    <td><span class="badge ${u.role === 'admin' ? 'bg-red' : 'bg-blue'}">${u.role}</span></td>
                    <td>
                        <button class="btn-icon text-red" onclick="handleDeleteUser('${u.id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error("Errore Gestione Responsabili:", error);
    }
}

window.handleDeleteUser = async (id) => {
    if (confirm("Eliminare questo utente?")) {
        await deleteUtente(id);
        initGestioneResponsabili();
    }
};