/**
 * History Module
 */
import { db } from '../db.js';

export const history = {
    loadHistory() {
        const historial = db.getTable('history').sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
        const equipos = db.getEquipos();
        const funcionarios = db.getFuncionarios();
        const tbody = document.getElementById('history-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        historial.forEach(h => {
            const eq = equipos.find(e => e.id === h.equipoId) || { assetTag: 'Desconocido', nombre: 'Equipo Borrado' };
            const func = funcionarios.find(f => f.id === h.funcionarioId) || { nombre: 'Funcionario Desconocido' };
            
            tbody.innerHTML += `
                <tr>
                    <td>${h.fecha}</td>
                    <td><strong>${eq.assetTag}</strong> - ${eq.nombre}</td>
                    <td>${func.nombre}</td>
                    <td>${h.accion}</td>
                </tr>
            `;
        });
    }
};
