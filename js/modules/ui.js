/**
 * UI Module - Shared UI components (Pagination, Sorting, Notifications)
 */
import { db } from '../db.js';

export const ui = {
    updateSortIcons(section, sortConfig) {
        const config = sortConfig[section];
        const table = section === 'dashboard' ? document.querySelector('#dashboard .data-table') :
                      section === 'inventory' ? document.querySelector('#inventory .data-table') :
                      document.querySelector('#loans .data-table');
        
        if (!table) return;

        table.querySelectorAll('th').forEach(th => {
            const icon = th.querySelector('i.fa-sort, i.fa-sort-up, i.fa-sort-down');
            if (icon) {
                const onclick = th.getAttribute('onclick') || '';
                if (onclick.includes(`'${config.column}'`)) {
                    icon.className = config.direction === 'asc' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
                    icon.style.opacity = '1';
                    icon.style.color = 'var(--secondary-color)';
                } else {
                    icon.className = 'fa-solid fa-sort';
                    icon.style.opacity = '0.3';
                    icon.style.color = 'inherit';
                }
            }
        });
    },

    updatePaginationUI(section, totalItems, paginationConfig) {
        const config = paginationConfig[section];
        const container = document.getElementById(`pagination-${section}`);
        if (!container) return;

        if (config.pageSize === 'all') {
            container.querySelector('.pagination-controls').style.display = 'none';
            return;
        }

        container.querySelector('.pagination-controls').style.display = 'flex';
        const totalPages = Math.ceil(totalItems / parseInt(config.pageSize)) || 1;
        
        if (config.currentPage > totalPages) config.currentPage = totalPages;
        if (config.currentPage < 1) config.currentPage = 1;

        container.querySelector('.page-numbers').innerText = `Página ${config.currentPage} de ${totalPages}`;
        
        const prevBtn = container.querySelector('button:first-of-type');
        const nextBtn = container.querySelector('button:last-of-type');
        
        prevBtn.disabled = config.currentPage === 1;
        nextBtn.disabled = config.currentPage === totalPages;
    },

    syncPaginationSelects(paginationConfig) {
        ['dashboard', 'inventory', 'loans'].forEach(section => {
            const select = document.querySelector(`#pagination-${section} .pagination-select`);
            if (select) {
                select.value = paginationConfig[section].pageSize;
            }
        });
    },

    updateNotifications(app) {
        const equipos = db.getEquipos();
        const prestamos = db.getAsignaciones(true);
        const alerts = [];

        // Préstamos atrasados
        prestamos.forEach(p => {
            if (new Date(p.fechaDevolucionPrevista) < new Date()) {
                const eq = equipos.find(e => e.id === p.equipoId);
                alerts.push({
                    type: 'danger',
                    icon: 'fa-clock',
                    title: 'Préstamo Vencido',
                    desc: `El equipo ${eq ? eq.assetTag : 'ID:'+p.equipoId} no ha sido devuelto.`
                });
            }
        });

        // Equipos en revisión o reparación
        equipos.forEach(e => {
            if (e.estado === 'Pendiente de Revisión') {
                alerts.push({
                    type: 'warning',
                    icon: 'fa-magnifying-glass',
                    title: 'Pendiente de Revisión',
                    desc: `El equipo ${e.assetTag} (${e.nombre}) requiere inspección.`
                });
            }
            if (e.estado === 'En Reparación') {
                alerts.push({
                    type: 'warning',
                    icon: 'fa-screwdriver-wrench',
                    title: 'En Reparación',
                    desc: `El equipo ${e.assetTag} está fuera de servicio.`
                });
            }
        });

        const badge = document.getElementById('notif-badge');
        if (badge) {
            badge.innerText = alerts.length;
            badge.style.display = alerts.length > 0 ? 'block' : 'none';
        }

        app.currentAlerts = alerts;
    },

    openNotificationsModal(currentAlerts) {
        const container = document.getElementById('notifications-list');
        if (!container) return;

        if (!currentAlerts || currentAlerts.length === 0) {
            container.innerHTML = `
                <div style="padding: 40px; text-align: center; color: var(--text-muted);">
                    <i class="fa-solid fa-bell-slash fa-3x" style="margin-bottom: 15px; opacity: 0.3;"></i>
                    <p>No hay alertas pendientes en este momento.</p>
                </div>
            `;
        } else {
            container.innerHTML = currentAlerts.map(a => `
                <div class="notification-item ${a.type}">
                    <div class="icon"><i class="fa-solid ${a.icon}"></i></div>
                    <div class="content">
                        <h4>${a.title}</h4>
                        <p>${a.desc}</p>
                    </div>
                </div>
            `).join('');
        }
        document.getElementById('notifications-modal').classList.add('active');
    }
};
