/**
 * History Module
 */
import { db } from '../db.js';

export const history = {
    loadHistory() {
        const historial = db.getTable('historial').sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
        const equipos = db.getEquipos();
        const funcionarios = db.getFuncionarios();
        const tbody = document.getElementById('history-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        historial.forEach(h => {
            const eq = equipos.find(e => e.id === h.equipoId) || { assetTag: 'Desconocido', nombre: 'Equipo Borrado' };
            let funcNombre = 'Sistema';
            if (h.funcionarioId !== 'Sistema') {
                const func = funcionarios.find(f => f.id === h.funcionarioId);
                funcNombre = func ? func.nombre : 'Funcionario Desconocido';
            }
            
            tbody.innerHTML += `
                <tr>
                    <td>${h.fecha}</td>
                    <td><strong>${eq.assetTag}</strong> - ${eq.nombre}</td>
                    <td>${funcNombre}</td>
                    <td>${h.accion}</td>
                </tr>
            `;
        });
    }
};
