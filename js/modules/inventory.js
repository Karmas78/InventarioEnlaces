/**
 * Inventory Module
 */
import { db } from '../db.js';
import { ui } from './ui.js';
import { utils } from './utils.js';

export const inventory = {
    loadInventory(app, filteredData = null) {
        const equipos = filteredData !== null ? filteredData : db.getEquipos();
        const prestamos = db.getAsignaciones(true); // Activos
        const funcionarios = db.getFuncionarios();
        const tbody = document.getElementById('inventory-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        // Poblar filtro de ubicación dinámicamente
        if (!filteredData) {
            const locationSelect = document.getElementById('filter-location');
            if (locationSelect) {
                const currentVal = locationSelect.value;
                const allEquipos = db.getEquipos();
                const locations = [...new Set(
                    allEquipos.map(e => e.ubicacion).filter(u => u && u !== 'Sin asignar')
                )].sort();

                locationSelect.innerHTML = '<option value="">Todas las Ubicaciones</option>';
                locations.forEach(loc => {
                    const opt = document.createElement('option');
                    opt.value = loc;
                    opt.textContent = loc;
                    if (loc === currentVal) opt.selected = true;
                    locationSelect.appendChild(opt);
                });
            }
        }

        // Aplicar ordenamiento
        const sort = app.sortConfig.inventory;
        equipos.sort((a, b) => {
            let valA = a[sort.column] || '';
            let valB = b[sort.column] || '';
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            
            if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        ui.updateSortIcons('inventory', app.sortConfig);
        
        // Aplicar paginación
        const config = app.paginationConfig.inventory;
        ui.updatePaginationUI('inventory', equipos.length, app.paginationConfig);

        let pagedEquipos = equipos;
        if (config.pageSize !== 'all') {
            const size = parseInt(config.pageSize);
            const start = (config.currentPage - 1) * size;
            pagedEquipos = equipos.slice(start, start + size);
        }

        pagedEquipos.forEach(eq => {
            let statusClass = 'badge-success';
            if(eq.estado === 'En Reparación') statusClass = 'badge-warning';
            if(eq.estado === 'De Baja') statusClass = 'badge-danger';
            if(eq.estado === 'Pendiente de Revisión') statusClass = 'badge-info';

            let asignadoA = '';
            const prestamoActivo = prestamos.find(p => p.equipoId === eq.id);
            if (prestamoActivo) {
                const func = funcionarios.find(f => f.id === prestamoActivo.funcionarioId);
                asignadoA = func ? `<br><small style="color:var(--secondary-color)"><i class="fa-solid fa-user"></i> ${func.nombre}</small>` : '';
            }

            const photoHtml = eq.foto ? 
                `<img src="${eq.foto}" style="width: 45px; height: 45px; border-radius: 8px; object-fit: cover; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">` : 
                `<div style="width: 45px; height: 45px; border-radius: 8px; background: #e2e8f0; display: flex; align-items: center; justify-content: center; color: #94a3b8;"><i class="fa-solid fa-camera"></i></div>`;

            tbody.innerHTML += `
                <tr>
                    <td>
                        <div style="display: flex; gap: 15px; align-items: center;">
                            ${photoHtml}
                            <div>
                                <strong>${eq.assetTag}</strong><br>
                                <small class="text-muted">${eq.serie}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <strong>${eq.nombre}</strong>${eq.observaciones ? ` <i class="fa-solid fa-circle-info" title="${eq.observaciones}" style="color:var(--primary-color); cursor:help; font-size:12px;"></i>` : ''}<br>
                        <small class="text-muted">${eq.marca} ${eq.modelo}</small>
                    </td>
                    <td>${eq.categoria}</td>
                    <td>
                        ${eq.ubicacion || 'Sin Asignar'}
                        ${asignadoA}
                    </td>
                    <td><span class="badge-status ${statusClass}">${eq.estado}</span></td>
                    <td class="actions-cell">
                        <button class="btn-icon" onclick="app.viewEquipment('${eq.id}')" title="Ver Detalles"><i class="fa-solid fa-eye"></i></button>
                        <button class="btn-icon" onclick="app.duplicateEquipment('${eq.id}')" title="Duplicar Equipo"><i class="fa-solid fa-copy"></i></button>
                        <button class="btn-icon" onclick="app.editEquipment('${eq.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon" onclick="app.deleteEquipment('${eq.id}')" title="Eliminar" style="color:var(--danger)"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    },

    viewEquipment(id, app) {
        const eq = db.getEquipos().find(e => e.id === id);
        if (!eq) return;

        const content = document.getElementById('details-content');
        if (!content) return;
        
        const photoHtml = eq.foto ? 
            `<img src="${eq.foto}" alt="Foto Equipo">` : 
            `<div style="width: 100%; height: 100%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #94a3b8;"><i class="fa-solid fa-camera fa-3x"></i></div>`;

        content.innerHTML = `
            <div class="photo-container">${photoHtml}</div>
            <div class="details-info">
                <div class="detail-item">
                    <label>Asset Tag</label>
                    <p>${eq.assetTag}</p>
                </div>
                <div class="detail-item">
                    <label>Número de Serie</label>
                    <p>${eq.serie}</p>
                </div>
                <div class="detail-item">
                    <label>Nombre del Equipo</label>
                    <p>${eq.nombre}</p>
                </div>
                <div class="detail-item">
                    <label>Categoría</label>
                    <p>${eq.categoria}</p>
                </div>
                <div class="detail-item">
                    <label>Marca</label>
                    <p>${eq.marca || '—'}</p>
                </div>
                <div class="detail-item">
                    <label>Modelo</label>
                    <p>${eq.modelo || '—'}</p>
                </div>
                <div class="detail-item">
                    <label>Estado</label>
                    <p><span class="badge-status ${utils.getStatusBadge(eq.estado)}">${eq.estado}</span></p>
                </div>
                <div class="detail-item">
                    <label>Ubicación</label>
                    <p>${eq.ubicacion || 'Sin asignar'}</p>
                </div>
                <div class="detail-item">
                    <label>Fecha Adquisición</label>
                    <p>${eq.fechaAdquisicion}</p>
                </div>
                <div class="detail-item full-width">
                    <label>Observaciones</label>
                    <p style="white-space: pre-wrap;">${eq.observaciones || 'Sin observaciones.'}</p>
                </div>
            </div>
        `;

        const editBtn = document.getElementById('btn-edit-from-details');
        if (editBtn) {
            editBtn.onclick = () => {
                utils.closeModals();
                this.openEquipmentModal(id);
            };
        }

        document.getElementById('details-modal').classList.add('active');
    },

    duplicateEquipment(id) {
        const eq = db.getEquipos().find(e => e.id === id);
        if (!eq) return;

        this.openEquipmentModal();
        
        document.getElementById('eq-name').value = eq.nombre || '';
        document.getElementById('eq-category').value = eq.categoria || '';
        document.getElementById('eq-brand').value = eq.marca || '';
        document.getElementById('eq-model').value = eq.modelo || '';
        document.getElementById('eq-date').value = eq.fechaAdquisicion || '';
        document.getElementById('eq-status').value = eq.estado || 'Operativo';
        document.getElementById('eq-location').value = eq.ubicacion || '';
        document.getElementById('eq-notes').value = eq.observaciones || '';
        
        document.getElementById('eq-id').value = '';
        document.getElementById('eq-asset').value = '';
        document.getElementById('eq-serial').value = '';
        document.getElementById('eq-photo-base64').value = '';
        document.getElementById('eq-photo-preview').style.display = 'none';

        utils.showToast('Datos copiados. Ingresa el nuevo Asset Tag y Serie.', 'info');
    },

    async deleteEquipment(id, app) {
        if(confirm('¿Estás seguro de que deseas eliminar este equipo del inventario? Esta acción no se puede deshacer.')) {
            try {
                await db.eliminarEquipo(id);
                utils.showToast('Equipo eliminado exitosamente', 'success');
                this.loadInventory(app);
                app.loadDashboard();
                app.loadHistory();
                app.updateNotifications();
            } catch (error) {
                utils.showToast(error.message, 'error');
            }
        }
    },

    filterInventory(app, searchTerm = '') {
        app.paginationConfig.inventory.currentPage = 1;
        let equipos = db.getEquipos();
        const term = (searchTerm || document.getElementById('global-search').value).toLowerCase();
        const cat = document.getElementById('filter-category').value;
        const stat = document.getElementById('filter-status').value;
        const loc = document.getElementById('filter-location').value;

        if(term) {
            equipos = equipos.filter(e => e.nombre.toLowerCase().includes(term) || e.serie.toLowerCase().includes(term) || e.assetTag.toLowerCase().includes(term));
        }
        if(cat) equipos = equipos.filter(e => e.categoria === cat);
        if(stat) equipos = equipos.filter(e => e.estado === stat);
        if(loc) equipos = equipos.filter(e => e.ubicacion === loc);

        this.loadInventory(app, equipos);
    },

    openEquipmentModal(id = null) {
        const form = document.getElementById('equipment-form');
        if (!form) return;
        form.reset();
        
        if (id) {
            document.getElementById('equipment-modal-title').innerText = 'Editar Equipo';
            const eq = db.getEquipos().find(e => e.id === id);
            if (eq) {
                document.getElementById('eq-id').value = eq.id;
                document.getElementById('eq-asset').value = eq.assetTag;
                document.getElementById('eq-serial').value = eq.serie;
                document.getElementById('eq-name').value = eq.nombre;
                document.getElementById('eq-category').value = eq.categoria;
                document.getElementById('eq-brand').value = eq.marca;
                document.getElementById('eq-model').value = eq.modelo;
                document.getElementById('eq-date').value = eq.fechaAdquisicion;
                document.getElementById('eq-status').value = eq.estado;
                document.getElementById('eq-location').value = eq.ubicacion || '';
                document.getElementById('eq-notes').value = eq.observaciones || '';
                
                if (eq.foto) {
                    document.getElementById('eq-photo-base64').value = eq.foto;
                    document.getElementById('eq-photo-img').src = eq.foto;
                    document.getElementById('eq-photo-preview').style.display = 'block';
                } else {
                    document.getElementById('eq-photo-base64').value = '';
                    document.getElementById('eq-photo-preview').style.display = 'none';
                }
            }
        } else {
            document.getElementById('equipment-modal-title').innerText = 'Registrar Equipo';
            document.getElementById('eq-id').value = '';
            document.getElementById('eq-location').value = '';
            document.getElementById('eq-notes').value = '';
            document.getElementById('eq-photo-base64').value = '';
            document.getElementById('eq-photo-input-gallery').value = '';
            document.getElementById('eq-photo-input-camera').value = '';
            document.getElementById('eq-photo-preview').style.display = 'none';
        }
        
        document.getElementById('equipment-modal').classList.add('active');
    },

    async saveEquipment(app) {
        const form = document.getElementById('equipment-form');
        if(!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        try {
            await db.saveEquipo({
                id: document.getElementById('eq-id').value || undefined,
                assetTag: document.getElementById('eq-asset').value,
                serie: document.getElementById('eq-serial').value,
                nombre: document.getElementById('eq-name').value,
                categoria: document.getElementById('eq-category').value,
                marca: document.getElementById('eq-brand').value,
                modelo: document.getElementById('eq-model').value,
                fechaAdquisicion: document.getElementById('eq-date').value,
                estado: document.getElementById('eq-status').value,
                ubicacion: document.getElementById('eq-location').value || 'Sin asignar',
                observaciones: document.getElementById('eq-notes').value || '',
                foto: document.getElementById('eq-photo-base64').value || null
            });
            utils.showToast('Equipo guardado exitosamente');
            utils.closeModals();
            this.loadInventory(app);
            app.loadDashboard();
            app.updateNotifications();
        } catch (error) {
            utils.showToast(error.message, 'error');
        }
    },

    previewPhoto(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                document.getElementById('eq-photo-base64').value = dataUrl;
                document.getElementById('eq-photo-img').src = dataUrl;
                document.getElementById('eq-photo-preview').style.display = 'block';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
};
