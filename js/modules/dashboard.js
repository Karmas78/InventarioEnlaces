/**
 * Dashboard Module
 */
import { db } from '../db.js';
import { ui } from './ui.js';

export const dashboard = {
    loadDashboard(app) {
        const equipos = db.getEquipos();
        const prestamos = db.getAsignaciones(true);
        
        const statTotal = document.getElementById('stat-total');
        const statLoans = document.getElementById('stat-loans');
        const statMaintenance = document.getElementById('stat-maintenance');
        const statOperative = document.getElementById('stat-operative');

        if (statTotal) statTotal.innerText = equipos.length;
        if (statLoans) statLoans.innerText = prestamos.length;
        
        const enMantenimiento = equipos.filter(e => e.estado === 'En Reparación' || e.estado === 'Pendiente de Revisión').length;
        if (statMaintenance) statMaintenance.innerText = enMantenimiento;
        
        const operativos = equipos.filter(e => e.estado === 'Operativo').length;
        if (statOperative) statOperative.innerText = operativos;

        // Equipos críticos / Antiguos (> 3 years)
        const currentYear = new Date().getFullYear();
        let criticos = equipos.filter(e => {
            if (e.estado === 'De Baja') return true;
            const adqYear = new Date(e.fechaAdquisicion).getFullYear();
            return (currentYear - adqYear) >= 3;
        });

        // Aplicar ordenamiento
        const sort = app.sortConfig.dashboard;
        criticos.sort((a, b) => {
            let valA = a[sort.column] || '';
            let valB = b[sort.column] || '';
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            
            if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        ui.updateSortIcons('dashboard', app.sortConfig);
        
        // Aplicar paginación
        const config = app.paginationConfig.dashboard;
        ui.updatePaginationUI('dashboard', criticos.length, app.paginationConfig);
        
        let pagedCriticos = criticos;
        if (config.pageSize !== 'all') {
            const size = parseInt(config.pageSize);
            const start = (config.currentPage - 1) * size;
            pagedCriticos = criticos.slice(start, start + size);
        }

        const tbody = document.getElementById('critical-equipments');
        if (!tbody) return;
        tbody.innerHTML = '';
        pagedCriticos.forEach(e => {
            const statusClass = e.estado === 'De Baja' ? 'badge-critical' : 'badge-warning';
            tbody.innerHTML += `
                <tr>
                    <td><strong>${e.assetTag}</strong></td>
                    <td>${e.nombre}</td>
                    <td>${e.fechaAdquisicion}</td>
                    <td><span class="badge-status ${statusClass}">${e.estado} (Antiguo/Crítico)</span></td>
                </tr>
            `;
        });
    }
};
