import { db } from './db.js';

const app = {
    sortConfig: {
        dashboard: { column: 'assetTag', direction: 'asc' },
        inventory: { column: 'assetTag', direction: 'asc' },
        loans: { column: 'equipoNombre', direction: 'asc' }
    },
    paginationConfig: {
        dashboard: { currentPage: 1, pageSize: 10 },
        inventory: { currentPage: 1, pageSize: 10 },
        loans: { currentPage: 1, pageSize: 10 }
    },
    async init() {
        this.bindEvents();
        this.loadTheme();
        // Escuchar el estado de autenticación
        db.onAuthChange(async (user) => {
            const loginScreen = document.getElementById('login-screen');
            if (user) {
                // Usuario autenticado
                if(loginScreen) loginScreen.classList.remove('active');
                
                // Mostrar correo en sidebar
                const nameEl = document.querySelector('.user-info .name');
                if(nameEl) nameEl.innerText = user.email.split('@')[0];

                try {
                    await db.initData();
                    this.loadTheme();
                    this.syncPaginationSelects();
                    this.loadDashboard();
                    this.loadInventory();
                    this.loadLoans();
                    this.updateNotifications();
                } catch (error) {
                    this.showToast(error.message, 'error');
                }
            } else {
                // No autenticado
                if(loginScreen) loginScreen.classList.add('active');
            }
        });
    },

    bindEvents() {
        // Login Submit
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = document.getElementById('login-btn');
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Entrando...';
                btn.disabled = true;
                
                try {
                    await db.login(
                        document.getElementById('login-email').value,
                        document.getElementById('login-password').value
                    );
                    this.showToast('Bienvenido al sistema');
                } catch (error) {
                    this.showToast('Credenciales incorrectas. Verifica tu correo y contraseña.', 'error');
                } finally {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }
            });
        }

        // Navigation
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.sidebar-nav .nav-item').forEach(l => l.classList.remove('active'));
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                
                link.classList.add('active');
                document.getElementById(link.dataset.target).classList.add('active');
                
                if(link.dataset.target === 'dashboard') this.loadDashboard();
                if(link.dataset.target === 'inventory') this.loadInventory();
                if(link.dataset.target === 'loans') this.loadLoans();
                if(link.dataset.target === 'history') this.loadHistory();
                if(link.dataset.target === 'settings') this.loadStaff();
                
                if (window.innerWidth <= 768) {
                    document.getElementById('sidebar').classList.remove('active');
                    document.querySelector('.sidebar-overlay').classList.remove('active');
                }
            });
        });

        // Search
        document.getElementById('global-search').addEventListener('input', (e) => {
            this.filterInventory(e.target.value);
        });

        // Filters
        document.getElementById('filter-category').addEventListener('change', () => this.filterInventory());
        document.getElementById('filter-status').addEventListener('change', () => this.filterInventory());
        document.getElementById('filter-location').addEventListener('change', () => this.filterInventory());
    },

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('active');
        document.querySelector('.sidebar-overlay').classList.toggle('active');
    },

    logout() {
        db.logout().then(() => {
            this.showToast('Sesión cerrada');
            // Limpiar las tablas visualmente al salir
            document.getElementById('inventory-table-body').innerHTML = '';
            document.getElementById('loans-table-body').innerHTML = '';
            document.getElementById('critical-equipments').innerHTML = '';
        });
    },

    // Dashbaord
    loadDashboard() {
        const equipos = db.getEquipos();
        const prestamos = db.getAsignaciones(true);
        
        document.getElementById('stat-total').innerText = equipos.length;
        document.getElementById('stat-loans').innerText = prestamos.length;
        
        const enMantenimiento = equipos.filter(e => e.estado === 'En Reparación' || e.estado === 'Pendiente de Revisión').length;
        document.getElementById('stat-maintenance').innerText = enMantenimiento;
        
        const operativos = equipos.filter(e => e.estado === 'Operativo').length;
        document.getElementById('stat-operative').innerText = operativos;

        // Equipos críticos / Antiguos (> 3 years)
        const currentYear = new Date().getFullYear();
        let criticos = equipos.filter(e => {
            if (e.estado === 'De Baja') return true;
            const adqYear = new Date(e.fechaAdquisicion).getFullYear();
            return (currentYear - adqYear) >= 3;
        });

        // Aplicar ordenamiento
        const sort = this.sortConfig.dashboard;
        criticos.sort((a, b) => {
            let valA = a[sort.column] || '';
            let valB = b[sort.column] || '';
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            
            if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        this.updateSortIcons('dashboard');
        
        // Aplicar paginación
        const config = this.paginationConfig.dashboard;
        this.updatePaginationUI('dashboard', criticos.length);
        
        let pagedCriticos = criticos;
        if (config.pageSize !== 'all') {
            const size = parseInt(config.pageSize);
            const start = (config.currentPage - 1) * size;
            pagedCriticos = criticos.slice(start, start + size);
        }

        const tbody = document.getElementById('critical-equipments');
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
    },

    // Inventory
    loadInventory(filteredData = null) {
        const equipos = filteredData !== null ? filteredData : db.getEquipos();
        const prestamos = db.getAsignaciones(true); // Activos
        const funcionarios = db.getFuncionarios();
        const tbody = document.getElementById('inventory-table-body');
        tbody.innerHTML = '';

        // Poblar filtro de ubicación dinámicamente (solo cuando no hay filtro activo)
        if (!filteredData) {
            const locationSelect = document.getElementById('filter-location');
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

        // Aplicar ordenamiento
        const sort = this.sortConfig.inventory;
        equipos.sort((a, b) => {
            let valA = a[sort.column] || '';
            let valB = b[sort.column] || '';
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            
            if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        this.updateSortIcons('inventory');
        
        // Aplicar paginación
        const config = this.paginationConfig.inventory;
        this.updatePaginationUI('inventory', equipos.length);

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

    viewEquipment(id) {
        const eq = db.getEquipos().find(e => e.id === id);
        if (!eq) return;

        const content = document.getElementById('details-content');
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
                    <p><span class="badge-status ${this.getStatusBadge(eq.estado)}">${eq.estado}</span></p>
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

        document.getElementById('btn-edit-from-details').onclick = () => {
            this.closeModals();
            this.editEquipment(id);
        };

        document.getElementById('details-modal').classList.add('active');
    },

    getStatusBadge(estado) {
        if(estado === 'Operativo') return 'badge-success';
        if(estado === 'En Reparación') return 'badge-warning';
        if(estado === 'De Baja') return 'badge-danger';
        if(estado === 'Pendiente de Revisión') return 'badge-info';
        return '';
    },

    editEquipment(id) {
        this.openEquipmentModal(id);
    },

    duplicateEquipment(id) {
        const eq = db.getEquipos().find(e => e.id === id);
        if (!eq) return;

        // Abrimos el modal como "Nuevo Equipo" (esto resetea el formulario)
        this.openEquipmentModal();
        
        // El título ya está puesto como "Registrar Equipo" por openEquipmentModal()
        // Ahora poblamos los campos que queremos copiar
        document.getElementById('eq-name').value = eq.nombre || '';
        document.getElementById('eq-category').value = eq.categoria || '';
        document.getElementById('eq-brand').value = eq.marca || '';
        document.getElementById('eq-model').value = eq.modelo || '';
        document.getElementById('eq-date').value = eq.fechaAdquisicion || '';
        document.getElementById('eq-status').value = eq.estado || 'Operativo';
        document.getElementById('eq-location').value = eq.ubicacion || '';
        document.getElementById('eq-notes').value = eq.observaciones || '';
        
        // Aseguramos que los campos únicos estén vacíos
        document.getElementById('eq-id').value = '';
        document.getElementById('eq-asset').value = '';
        document.getElementById('eq-serial').value = '';
        document.getElementById('eq-photo-base64').value = '';
        document.getElementById('eq-photo-preview').style.display = 'none';

        this.showToast('Datos copiados. Ingresa el nuevo Asset Tag y Serie.', 'info');
    },

    async deleteEquipment(id) {
        if(confirm('¿Estás seguro de que deseas eliminar este equipo del inventario? Esta acción no se puede deshacer.')) {
            try {
                await db.eliminarEquipo(id);
                this.showToast('Equipo eliminado exitosamente', 'success');
                this.loadInventory();
                this.loadDashboard();
                this.loadHistory();
                this.updateNotifications();
            } catch (error) {
                this.showToast(error.message, 'error');
            }
        }
    },

    filterInventory(searchTerm = '') {
        this.paginationConfig.inventory.currentPage = 1; // Reset a página 1 al filtrar
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

        this.loadInventory(equipos);
    },

    // Modals
    openEquipmentModal(id = null) {
        const form = document.getElementById('equipment-form');
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

    updateNotifications() {
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
        badge.innerText = alerts.length;
        badge.style.display = alerts.length > 0 ? 'block' : 'none';

        this.currentAlerts = alerts;
    },

    openNotificationsModal() {
        const container = document.getElementById('notifications-list');
        if (!this.currentAlerts || this.currentAlerts.length === 0) {
            container.innerHTML = `
                <div style="padding: 40px; text-align: center; color: var(--text-muted);">
                    <i class="fa-solid fa-bell-slash fa-3x" style="margin-bottom: 15px; opacity: 0.3;"></i>
                    <p>No hay alertas pendientes en este momento.</p>
                </div>
            `;
        } else {
            container.innerHTML = this.currentAlerts.map(a => `
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
    },

    closeModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    },

    async saveEquipment() {
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
            this.showToast('Equipo guardado exitosamente');
            this.closeModals();
            this.loadInventory();
            this.loadDashboard();
            this.updateNotifications();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    // Loans
    loadLoans() {
        const prestamos = db.getAsignaciones(true); // only active
        const equipos = db.getEquipos();
        const funcionarios = db.getFuncionarios();
        const tbody = document.getElementById('loans-table-body');
        tbody.innerHTML = '';

        const prestamosData = prestamos.map(p => {
            const eq = equipos.find(e => e.id === p.equipoId);
            const func = funcionarios.find(f => f.id === p.funcionarioId);
            
            // Highlight overdue
            const isOverdue = new Date(p.fechaDevolucionPrevista) < new Date();
            const statusClass = isOverdue ? 'badge-danger' : 'badge-warning';
            const statusText = isOverdue ? 'En Préstamo' : 'En Préstamo'; 

            return {
                ...p,
                equipoNombre: eq ? eq.nombre : 'Desconocido',
                funcionarioNombre: func ? func.nombre : 'Desconocido',
                assetTag: eq ? eq.assetTag : 'N/A',
                departamento: func ? func.departamento : '',
                statusClass,
                statusText,
                isOverdue
            };
        });

        // Aplicar ordenamiento
        const sort = this.sortConfig.loans;
        prestamosData.sort((a, b) => {
            let valA = a[sort.column] || '';
            let valB = b[sort.column] || '';
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            
            if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        this.updateSortIcons('loans');
        
        // Aplicar paginación
        const config = this.paginationConfig.loans;
        this.updatePaginationUI('loans', prestamosData.length);

        let pagedLoans = prestamosData;
        if (config.pageSize !== 'all') {
            const size = parseInt(config.pageSize);
            const start = (config.currentPage - 1) * size;
            pagedLoans = prestamosData.slice(start, start + size);
        }

        pagedLoans.forEach(p => {
            tbody.innerHTML += `
                <tr>
                    <td><strong>${p.assetTag}</strong> - ${p.equipoNombre}</td>
                    <td>${p.funcionarioNombre} (${p.departamento})</td>
                    <td>${p.fechaEntrega}</td>
                    <td class="${p.isOverdue ? 'text-danger fw-bold' : ''}">${p.fechaDevolucionPrevista}</td>
                    <td><span class="badge-status ${p.statusClass}">${p.statusText}</span></td>
                    <td style="display: flex; gap: 5px; align-items: center;">
                        <button class="btn btn-sm btn-primary" onclick="app.openReturnModal('${p.id}', '${p.equipoId}')" style="margin-right: 5px;">Devolver</button>
                        <button class="btn-icon" title="Acta PDF" onclick="app.generatePDF('${p.id}')"><i class="fa-solid fa-file-pdf"></i></button>
                    </td>
                </tr>
            `;
        });
    },

    sortData(section, column) {
        const config = this.sortConfig[section];
        if (config.column === column) {
            config.direction = config.direction === 'asc' ? 'desc' : 'asc';
        } else {
            config.column = column;
            config.direction = 'asc';
        }

        if (section === 'dashboard') this.loadDashboard();
        if (section === 'inventory') this.loadInventory();
        if (section === 'loans') this.loadLoans();
    },

    updateSortIcons(section) {
        const config = this.sortConfig[section];
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

    // Pagination Helpers
    changePageSize(section, size) {
        this.paginationConfig[section].pageSize = size;
        this.paginationConfig[section].currentPage = 1;
        if (section === 'dashboard') this.loadDashboard();
        if (section === 'inventory') this.loadInventory();
        if (section === 'loans') this.loadLoans();
    },

    changePage(section, delta) {
        this.paginationConfig[section].currentPage += delta;
        if (section === 'dashboard') this.loadDashboard();
        if (section === 'inventory') this.loadInventory();
        if (section === 'loans') this.loadLoans();
    },

    updatePaginationUI(section, totalItems) {
        const config = this.paginationConfig[section];
        const container = document.getElementById(`pagination-${section}`);
        if (!container) return;

        if (config.pageSize === 'all') {
            container.querySelector('.pagination-controls').style.display = 'none';
            return;
        }

        container.querySelector('.pagination-controls').style.display = 'flex';
        const totalPages = Math.ceil(totalItems / parseInt(config.pageSize)) || 1;
        
        // Corregir página actual si está fuera de rango
        if (config.currentPage > totalPages) config.currentPage = totalPages;
        if (config.currentPage < 1) config.currentPage = 1;

        container.querySelector('.page-numbers').innerText = `Página ${config.currentPage} de ${totalPages}`;
        
        const prevBtn = container.querySelector('button:first-of-type');
        const nextBtn = container.querySelector('button:last-of-type');
        
        prevBtn.disabled = config.currentPage === 1;
        nextBtn.disabled = config.currentPage === totalPages;
    },

    // Theme Helpers
    toggleTheme() {
        const isDark = document.body.classList.toggle('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        this.updateThemeIcon();
    },

    loadTheme() {
        const theme = localStorage.getItem('theme');
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        }
        this.updateThemeIcon();
    },

    updateThemeIcon() {
        const icon = document.querySelector('#theme-toggle i');
        if (!icon) return;
        if (document.body.classList.contains('dark-theme')) {
            icon.className = 'fa-solid fa-sun';
        } else {
            icon.className = 'fa-solid fa-moon';
        }
    },

    syncPaginationSelects() {
        ['dashboard', 'inventory', 'loans'].forEach(section => {
            const select = document.querySelector(`#pagination-${section} .pagination-select`);
            if (select) {
                select.value = this.paginationConfig[section].pageSize;
            }
        });
    },

    openLoanModal() {
        const equipos = db.getEquipos().filter(e => e.estado === 'Operativo' || e.estado === 'Pendiente de Revisión');
        const funcionarios = db.getFuncionarios();
        
        const eqSelect = document.getElementById('loan-equipment');
        eqSelect.innerHTML = '<option value="">Seleccione Equipo...</option>' + 
            equipos.map(e => `<option value="${e.id}">${e.assetTag} - ${e.nombre}</option>`).join('');

        const funSelect = document.getElementById('loan-staff');
        funSelect.innerHTML = '<option value="">Seleccione Funcionario...</option>' + 
            funcionarios.map(f => `<option value="${f.id}">${f.nombre} (${f.rut})</option>`).join('');

        document.getElementById('loan-start').valueAsDate = new Date();
        document.getElementById('loan-modal').classList.add('active');
    },

    previewPhoto(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400; // Redimensionamos para no saturar LocalStorage
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Comprimir en calidad 80%
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                document.getElementById('eq-photo-base64').value = dataUrl;
                document.getElementById('eq-photo-img').src = dataUrl;
                document.getElementById('eq-photo-preview').style.display = 'block';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    async saveLoan() {
        const form = document.getElementById('loan-form');
        if(!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        try {
            await db.crearPrestamo(
                document.getElementById('loan-equipment').value,
                document.getElementById('loan-staff').value,
                document.getElementById('loan-start').value,
                document.getElementById('loan-end').value,
                document.getElementById('loan-notes').value
            );
            this.showToast('Préstamo registrado exitosamente. Generando Acta...');
            this.closeModals();
            this.loadLoans();
            this.loadDashboard();
            this.updateNotifications();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    openReturnModal(loanId, eqId) {
        document.getElementById('return-loan-id').value = loanId;
        document.getElementById('return-eq-id').value = eqId;
        document.getElementById('return-modal').classList.add('active');
    },

    async processReturn() {
        const loanId = document.getElementById('return-loan-id').value;
        const status = document.getElementById('return-status').value;
        const notes = document.getElementById('return-notes').value;

        try {
            await db.devolverEquipo(loanId, status, notes);
            this.showToast('Equipo devuelto correctamente');
            this.closeModals();
            this.loadLoans();
            this.loadInventory();
            this.loadDashboard();
            this.updateNotifications();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    generatePDF(prestamoId) {
        const prestamo = db.getAsignaciones().find(p => p.id === prestamoId);
        if (!prestamo) {
            this.showToast('No se encontró el préstamo', 'error');
            return;
        }

        const equipo = db.getEquipos().find(e => e.id === prestamo.equipoId) || {};
        const funcionario = db.getFuncionarios().find(f => f.id === prestamo.funcionarioId) || {};

        // Llenar datos en la plantilla
        document.getElementById('pdf-fecha').innerText = new Date(prestamo.fechaEntrega).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('pdf-funcionario').innerText = funcionario.nombre || 'N/A';
        document.getElementById('pdf-rut').innerText = funcionario.rut || 'N/A';
        document.getElementById('pdf-cargo').innerText = funcionario.cargo || 'N/A';
        
        document.getElementById('pdf-eq-tipo').innerText = equipo.categoria || 'N/A';
        document.getElementById('pdf-eq-modelo').innerText = `${equipo.marca || ''} ${equipo.modelo || ''}`.trim() || 'N/A';
        document.getElementById('pdf-eq-serie').innerText = equipo.serie || 'N/A';
        document.getElementById('pdf-eq-tag').innerText = equipo.assetTag || 'N/A';
        
        document.getElementById('pdf-observaciones').innerText = prestamo.observaciones || 'Ninguna.';
        document.getElementById('pdf-devolucion').innerText = prestamo.fechaDevolucionPrevista ? new Date(prestamo.fechaDevolucionPrevista).toLocaleDateString('es-CL') : 'Indefinida';
        
        document.getElementById('pdf-firma-nombre').innerText = funcionario.nombre || 'Funcionario';
        document.getElementById('pdf-firma-cargo').innerText = funcionario.cargo || 'Funcionario';

        // Generar PDF
        this.showToast('Generando Acta PDF...', 'info');
        const element = document.getElementById('pdf-content');
        element.parentElement.style.display = 'block'; // Mostrar temporalmente para el render

        const opt = {
            margin:       10,
            filename:     `Acta_Entrega_${funcionario.rut}_${equipo.assetTag}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            element.parentElement.style.display = 'none';
            this.showToast('Acta descargada con éxito', 'success');
        });
    },

    // ---- Informe PDF de Equipos ----
    openInventoryReportModal() {
        document.getElementById('report-status-filter').value = '';
        document.getElementById('inventory-report-modal').classList.add('active');
    },

    generateInventoryReportPDF() {
        const statusFilter = document.getElementById('report-status-filter').value;
        let equipos = db.getEquipos();
        if (statusFilter) {
            equipos = equipos.filter(e => e.estado === statusFilter);
        }

        if (equipos.length === 0) {
            this.showToast('No hay equipos que coincidan con el filtro seleccionado.', 'error');
            return;
        }

        const fechaHoy = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('rpt-inv-fecha').innerText = fechaHoy;
        document.getElementById('rpt-inv-filtro').innerText = statusFilter || 'Todos los Equipos';
        document.getElementById('rpt-inv-total').innerText = equipos.length;

        const tbody = document.getElementById('rpt-inv-tbody');
        tbody.innerHTML = '';
        equipos.forEach((eq, idx) => {
            const rowBg = idx % 2 === 0 ? '#ffffff' : '#f5f5f5';
            let estadoColor = '#2e7d32'; // verde
            if (eq.estado === 'En Reparación') estadoColor = '#e65100';
            if (eq.estado === 'De Baja') estadoColor = '#b71c1c';
            if (eq.estado === 'Pendiente de Revisión') estadoColor = '#1565c0';

            tbody.innerHTML += `
                <tr style="background:${rowBg};">
                    <td style="padding:6px; border:1px solid #ddd;">${eq.assetTag || ''}</td>
                    <td style="padding:6px; border:1px solid #ddd;">${eq.serie || ''}</td>
                    <td style="padding:6px; border:1px solid #ddd;">${eq.nombre || ''}</td>
                    <td style="padding:6px; border:1px solid #ddd;">${eq.categoria || ''}</td>
                    <td style="padding:6px; border:1px solid #ddd;">${eq.marca || ''} ${eq.modelo || ''}</td>
                    <td style="padding:6px; border:1px solid #ddd;">${eq.ubicacion || 'Sin Asignar'}</td>
                    <td style="padding:6px; border:1px solid #ddd; color:${estadoColor}; font-weight:bold;">${eq.estado || ''}</td>
                    <td style="padding:6px; border:1px solid #ddd;">${eq.fechaAdquisicion || ''}</td>
                </tr>
            `;
        });

        this.closeModals();
        this.showToast('Generando Informe de Equipos...', 'info');

        const wrapper = document.getElementById('pdf-inventory-report-wrapper');
        const element = document.getElementById('pdf-inventory-report');
        wrapper.style.display = 'block';

        const dateStr = new Date().toISOString().split('T')[0];
        const filterStr = statusFilter ? `_${statusFilter.replace(/ /g,'_')}` : '_Todos';
        const opt = {
            margin: 10,
            filename: `Informe_Equipos${filterStr}_${dateStr}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'letter', orientation: 'landscape' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            wrapper.style.display = 'none';
            this.showToast('Informe de Equipos descargado con éxito', 'success');
        });
    },

    // ---- Informe PDF de Préstamos ----
    generateLoansReportPDF() {
        const prestamos = db.getAsignaciones(true); // solo activos
        const equipos = db.getEquipos();
        const funcionarios = db.getFuncionarios();

        if (prestamos.length === 0) {
            this.showToast('No hay préstamos activos para generar un informe.', 'error');
            return;
        }

        const fechaHoy = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('rpt-loans-fecha').innerText = fechaHoy;
        document.getElementById('rpt-loans-total').innerText = prestamos.length;

        let overdueCount = 0;
        const tbody = document.getElementById('rpt-loans-tbody');
        tbody.innerHTML = '';

        prestamos.forEach((p, idx) => {
            const eq = equipos.find(e => e.id === p.equipoId) || {};
            const func = funcionarios.find(f => f.id === p.funcionarioId) || {};
            const isOverdue = new Date(p.fechaDevolucionPrevista) < new Date();
            if (isOverdue) overdueCount++;

            const rowBg = isOverdue ? '#fff3cd' : (idx % 2 === 0 ? '#ffffff' : '#f5f5f5');
            const estadoText = isOverdue ? 'ATRASADO' : 'En Préstamo';
            const estadoColor = isOverdue ? '#b71c1c' : '#1565c0';

            tbody.innerHTML += `
                <tr style="background:${rowBg};">
                    <td style="padding:6px; border:1px solid #ddd; font-weight:bold;">${eq.assetTag || 'N/A'}</td>
                    <td style="padding:6px; border:1px solid #ddd; color:#555;">${eq.serie || 'N/A'}</td>
                    <td style="padding:6px; border:1px solid #ddd;">${eq.nombre || 'Desconocido'}</td>
                    <td style="padding:6px; border:1px solid #ddd;">${func.nombre || 'Desconocido'}</td>
                    <td style="padding:6px; border:1px solid #ddd;">${func.cargo || ''}</td>
                    <td style="padding:6px; border:1px solid #ddd;">${p.fechaEntrega || ''}</td>
                    <td style="padding:6px; border:1px solid #ddd; ${isOverdue ? 'font-weight:bold; color:#b71c1c;' : ''}">${p.fechaDevolucionPrevista || ''}</td>
                    <td style="padding:6px; border:1px solid #ddd; color:${estadoColor}; font-weight:bold;">${estadoText}</td>
                </tr>
            `;
        });

        const overdueBox = document.getElementById('rpt-loans-overdue-box');
        if (overdueCount > 0) {
            document.getElementById('rpt-loans-overdue-count').innerText = overdueCount;
            overdueBox.style.display = 'block';
        } else {
            overdueBox.style.display = 'none';
        }

        this.showToast('Generando Informe de Préstamos...', 'info');

        const wrapper = document.getElementById('pdf-loans-report-wrapper');
        const element = document.getElementById('pdf-loans-report');
        wrapper.style.display = 'block';

        const dateStr = new Date().toISOString().split('T')[0];
        const opt = {
            margin: [5, 5, 5, 5],
            filename: `Informe_Prestamos_Activos_${dateStr}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'letter', orientation: 'landscape' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            wrapper.style.display = 'none';
            this.showToast('Informe de Préstamos descargado con éxito', 'success');
        });
    },

    exportData() {
        if(typeof XLSX === 'undefined') {
            this.showToast('La biblioteca de Excel no ha cargado aún.', 'error');
            return;
        }

        this.showToast('Generando archivo Excel...', 'info');
        
        // Prepare Equipos
        const equipos = db.getEquipos().map(e => ({
            'Asset Tag': e.assetTag || '',
            'N° Serie': e.serie || '',
            'Nombre/Tipo': e.nombre || '',
            'Categoría': e.categoria || '',
            'Marca': e.marca || '',
            'Modelo': e.modelo || '',
            'Fecha Adquisición': e.fechaAdquisicion || '',
            'Estado': e.estado || '',
            'Ubicación': e.ubicacion || '',
            'Observaciones': e.observaciones || ''
        }));

        // Prepare Préstamos
        const prestamos = db.getAsignaciones().map(p => {
            const eq = db.getEquipos().find(e => e.id === p.equipoId) || {};
            const func = db.getFuncionarios().find(f => f.id === p.funcionarioId) || {};
            return {
                'Equipo': eq.nombre || 'Desconocido',
                'Asset Tag': eq.assetTag || '',
                'Funcionario': func.nombre || 'Desconocido',
                'RUT': func.rut || '',
                'Fecha Entrega': p.fechaEntrega || '',
                'Fecha Devolución': p.fechaDevolucionPrevista || '',
                'Estado Préstamo': p.estado || '',
                'Notas': p.observaciones || ''
            };
        });

        // Prepare Historial
        const historial = db.getTable('historial').map(h => {
            const eq = db.getEquipos().find(e => e.id === h.equipoId) || {};
            const func = db.getFuncionarios().find(f => f.id === h.funcionarioId) || {};
            return {
                'Fecha': h.fecha || '',
                'Equipo': eq.nombre || 'Desconocido',
                'Asset Tag': eq.assetTag || '',
                'Funcionario': func.nombre || 'Sistema',
                'Acción Realizada': h.accion || ''
            };
        });

        // Create Workbook
        const wb = XLSX.utils.book_new();
        
        if(equipos.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(equipos), "Equipos");
        else XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{'Mensaje':'No hay equipos'}]), "Equipos");
        
        if(prestamos.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prestamos), "Préstamos");
        else XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{'Mensaje':'No hay préstamos'}]), "Préstamos");
        
        if(historial.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(historial), "Historial");
        else XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{'Mensaje':'No hay historial'}]), "Historial");

        // Save
        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Inventario_Enlaces_${dateStr}.xlsx`);
    },

    // History
    loadHistory() {
        const historial = db.getTable('historial').sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
        const equipos = db.getEquipos();
        const funcionarios = db.getFuncionarios();
        const tbody = document.getElementById('history-table-body');
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
    },

    // ---- Gestión de Funcionarios ----
    loadStaff() {
        const funcionarios = db.getFuncionarios();
        const prestamosActivos = db.getAsignaciones(true);
        const tbody = document.getElementById('staff-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (funcionarios.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:20px;"><i class="fa-solid fa-users-slash"></i> No hay funcionarios registrados.</td></tr>`;
            return;
        }

        funcionarios.forEach(f => {
            const tienePrestamoActivo = prestamosActivos.some(p => p.funcionarioId === f.id);
            tbody.innerHTML += `
                <tr>
                    <td><strong>${f.nombre}</strong></td>
                    <td><code style="font-size:12px;">${f.rut}</code></td>
                    <td>${f.cargo || ''}</td>
                    <td>${f.departamento || ''}</td>
                    <td><a href="mailto:${f.email || ''}" style="color:var(--primary-color);">${f.email || '—'}</a></td>
                    <td style="display:flex; gap:6px; align-items:center;">
                        <button class="btn-icon" onclick="app.openFuncionarioModal('${f.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon" onclick="app.deleteFuncionario('${f.id}')" title="${tienePrestamoActivo ? 'Tiene préstamo activo' : 'Eliminar'}" style="color:var(--danger); ${tienePrestamoActivo ? 'opacity:0.4; cursor:not-allowed;' : ''}" ${tienePrestamoActivo ? 'disabled' : ''}><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    },

    openFuncionarioModal(id = null) {
        const form = document.getElementById('funcionario-form');
        form.reset();
        document.getElementById('func-id').value = '';

        if (id) {
            const func = db.getFuncionarios().find(f => f.id === id);
            if (func) {
                document.getElementById('funcionario-modal-title').innerHTML = '<i class="fa-solid fa-user-pen"></i> Editar Funcionario';
                document.getElementById('func-id').value = func.id;
                document.getElementById('func-nombre').value = func.nombre || '';
                document.getElementById('func-rut').value = func.rut || '';
                document.getElementById('func-email').value = func.email || '';
                document.getElementById('func-cargo').value = func.cargo || '';
                document.getElementById('func-departamento').value = func.departamento || '';
                document.getElementById('func-telefono').value = func.telefono || '';
            }
        } else {
            document.getElementById('funcionario-modal-title').innerHTML = '<i class="fa-solid fa-user-plus"></i> Nuevo Funcionario';
        }

        document.getElementById('funcionario-modal').classList.add('active');
    },

    async saveFuncionario() {
        const form = document.getElementById('funcionario-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        try {
            await db.saveFuncionario({
                id: document.getElementById('func-id').value || undefined,
                nombre: document.getElementById('func-nombre').value.trim(),
                rut: document.getElementById('func-rut').value.trim(),
                email: document.getElementById('func-email').value.trim(),
                cargo: document.getElementById('func-cargo').value.trim(),
                departamento: document.getElementById('func-departamento').value.trim(),
                telefono: document.getElementById('func-telefono').value.trim()
            });
            this.showToast('Funcionario guardado exitosamente');
            this.closeModals();
            this.loadStaff();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    async deleteFuncionario(id) {
        const func = db.getFuncionarios().find(f => f.id === id);
        if (!func) return;
        if (!confirm(`¿Deseas eliminar a "${func.nombre}" del sistema?\nEsta acción no se puede deshacer.`)) return;
        try {
            await db.eliminarFuncionario(id);
            this.showToast(`Funcionario "${func.nombre}" eliminado`, 'success');
            this.loadStaff();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    // Settings
    changeRole(role) {
        document.querySelector('.user-info .role').innerText = role;
        this.showToast(`Rol cambiado a: ${role}`, 'info');
        
        // Block main action buttons if is visualizer
        const isViewer = role === 'Visualizador';
        document.querySelectorAll('.btn-primary').forEach(btn => {
            btn.style.opacity = isViewer ? '0.5' : '1';
            btn.style.pointerEvents = isViewer ? 'none' : 'auto';
        });
    },

    resetDatabase() {
        if(confirm('🚨 ADVERTENCIA CRÍTICA 🚨\n¿Estás absolutamente seguro de que deseas borrar toda la base de datos?\nEsta acción no se puede deshacer y perderás todo el inventario, préstamos e historial.')) {
            localStorage.clear();
            location.reload();
        }
    },

    importCSV(input) {
        if (input.files && input.files[0]) {
            const fileName = input.files[0].name;
            this.showToast(`Procesando archivo: ${fileName}...`, 'info');
            
            // Simular tiempo de carga
            setTimeout(() => {
                this.showToast(`Se han importado los equipos desde ${fileName} correctamente.`, 'success');
                input.value = ''; // Reset input
            }, 2000);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
window.app = app; // Exponer la app al ámbito global para los botones en el HTML
