import { db } from './db.js';
import { utils } from './modules/utils.js';
import { ui } from './modules/ui.js';
import { dashboard } from './modules/dashboard.js';
import { inventory } from './modules/inventory.js';
import { loans } from './modules/loans.js';
import { staff } from './modules/staff.js';
import { settings } from './modules/settings.js';
import { history } from './modules/history.js';
import { exporter } from './modules/export.js';

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
    viewConfig: {
        inventory: 'list',
        loans: 'list'
    },
    currentAlerts: [],

    async init() {
        this.bindEvents();
        utils.loadTheme();
        
        db.onAuthChange(async (user) => {
            const loginScreen = document.getElementById('login-screen');
            if (user) {
                if(loginScreen) loginScreen.classList.remove('active');
                
                const nameEl = document.querySelector('.user-info .name');
                if(nameEl) nameEl.innerText = user.email.split('@')[0];

                try {
                    await db.initData();
                    utils.loadTheme();
                    ui.syncPaginationSelects(this.paginationConfig);
                    this.loadDashboard();
                    this.loadInventory();
                    this.loadLoans();
                    this.loadBrands();
                    this.loadCategories();
                    this.updateNotifications();
                } catch (error) {
                    utils.showToast(error.message, 'error');
                }
            } else {
                if(loginScreen) loginScreen.classList.add('active');
            }
        });
    },

    bindEvents() {
        // Login
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = document.getElementById('login-btn');
                if (!btn) return;
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Entrando...';
                btn.disabled = true;
                
                try {
                    await db.login(
                        document.getElementById('login-email').value,
                        document.getElementById('login-password').value
                    );
                    utils.showToast('Bienvenido al sistema');
                } catch (error) {
                    utils.showToast('Credenciales incorrectas. Verifica tu correo y contraseña.', 'error');
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
                const targetId = link.dataset.target;
                const targetPage = document.getElementById(targetId);
                if (!targetPage) return;

                document.querySelectorAll('.sidebar-nav .nav-item').forEach(l => l.classList.remove('active'));
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                
                link.classList.add('active');
                targetPage.classList.add('active');
                
                if(targetId === 'dashboard') this.loadDashboard();
                if(targetId === 'inventory') this.loadInventory();
                if(targetId === 'loans') this.loadLoans();
                if(targetId === 'history') this.loadHistory();
                if(targetId === 'settings') {
                    this.loadStaff();
                    this.loadBrands();
                    this.loadCategories();
                }
                
                if (window.innerWidth <= 768) {
                    utils.toggleSidebar();
                }
            });
        });

        // Search
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterInventory(e.target.value);
            });
        }

        // Filters
        ['filter-category', 'filter-status', 'filter-location'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', () => this.filterInventory());
        });

        // Photo Preview
        const photoGallery = document.getElementById('eq-photo-input-gallery');
        const photoCamera = document.getElementById('eq-photo-input-camera');
        if (photoGallery) photoGallery.addEventListener('change', (e) => inventory.previewPhoto(e));
        if (photoCamera) photoCamera.addEventListener('change', (e) => inventory.previewPhoto(e));
    },

    // Delegated Methods to Modules
    showToast(msg, type) { utils.showToast(msg, type); },
    toggleSidebar() { utils.toggleSidebar(); },
    toggleTheme() { utils.toggleTheme(); },
    closeModals() { utils.closeModals(); },
    
    logout() {
        db.logout().then(() => {
            utils.showToast('Sesión cerrada');
            document.getElementById('inventory-table-body').innerHTML = '';
            document.getElementById('loans-table-body').innerHTML = '';
            document.getElementById('critical-equipments').innerHTML = '';
        });
    },

    loadDashboard() { dashboard.loadDashboard(this); },
    
    loadInventory(data) { inventory.loadInventory(this, data); },
    viewEquipment(id) { inventory.viewEquipment(id, this); },
    editEquipment(id) { inventory.openEquipmentModal(id); },
    duplicateEquipment(id) { inventory.duplicateEquipment(id); },
    deleteEquipment(id) { inventory.deleteEquipment(id, this); },
    filterInventory(term) { inventory.filterInventory(this, term); },
    openEquipmentModal(id) { inventory.openEquipmentModal(id); },
    saveEquipment() { inventory.saveEquipment(this); },

    loadLoans() { loans.loadLoans(this); },
    openLoanModal() { loans.openLoanModal(); },
    saveLoan() { loans.saveLoan(this); },
    openReturnModal(lId, eId) { loans.openReturnModal(lId, eId); },
    processReturn() { loans.processReturn(this); },
    generatePDF(id) { loans.generatePDF(id); },
    generateLoansReportPDF() { loans.generateLoansReportPDF(); },

    loadStaff() { staff.loadStaff(); },
    openFuncionarioModal(id) { staff.openFuncionarioModal(id); },
    saveFuncionario() { staff.saveFuncionario(); },
    deleteFuncionario(id) { staff.deleteFuncionario(id); },

    loadCategories() { settings.loadCategories(this); },
    openCategoriaModal(id) { settings.openCategoriaModal(id); },
    saveCategoria() { settings.saveCategoria(this); },
    deleteCategoria(id) { settings.deleteCategoria(id, this); },
    loadBrands() { settings.loadBrands(); },
    openMarcaModal(id) { settings.openMarcaModal(id); },
    saveMarca() { settings.saveMarca(); },
    deleteMarca(id) { settings.deleteMarca(id); },
    refreshSettingsData() { settings.refreshSettingsData(this); },
    resetDatabase() { settings.resetDatabase(); },
    changeRole(role) { settings.changeRole(role); },
    importCSV(input) { settings.importCSV(input); },

    loadHistory() { history.loadHistory(); },
    
    exportData() { exporter.exportData(); },
    openInventoryReportModal() { loans.openInventoryReportModal ? loans.openInventoryReportModal() : settings.openInventoryReportModal ? settings.openInventoryReportModal() : this._openInventoryReportModal(); },
    
    // Some missing report methods that were in app.js
    _openInventoryReportModal() {
        document.getElementById('report-status-filter').value = '';
        document.getElementById('inventory-report-modal').classList.add('active');
    },

    generateInventoryReportPDF() {
        // Moving this to loans or settings would be better, but for now:
        const statusFilter = document.getElementById('report-status-filter').value;
        let equipos = db.getEquipos();
        if (statusFilter) equipos = equipos.filter(e => e.estado === statusFilter);

        if (equipos.length === 0) {
            utils.showToast('No hay equipos para este filtro.', 'error');
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
            tbody.innerHTML += `
                <tr style="background:${rowBg};">
                    <td style="padding:6px; border:1px solid #ddd;">${eq.assetTag || ''}</td>
                    <td style="padding:6px; border:1px solid #ddd;">${eq.serie || ''}</td>
                    <td style="padding:6px; border:1px solid #ddd;">${eq.nombre || ''}</td>
                    <td style="padding:6px; border:1px solid #ddd;">${eq.categoria || ''}</td>
                    <td style="padding:6px; border:1px solid #ddd;">${eq.marca || ''} ${eq.modelo || ''}</td>
                    <td style="padding:6px; border:1px solid #ddd;">${eq.ubicacion || 'Sin Asignar'}</td>
                    <td style="padding:6px; border:1px solid #ddd;">${eq.estado || ''}</td>
                    <td style="padding:6px; border:1px solid #ddd;">${eq.fechaAdquisicion || ''}</td>
                </tr>
            `;
        });

        this.closeModals();
        utils.showToast('Generando Informe...', 'info');
        const element = document.getElementById('pdf-inventory-report');
        const wrapper = document.getElementById('pdf-inventory-report-wrapper');
        wrapper.style.display = 'block';

        const opt = {
            margin: 10,
            filename: `Informe_Equipos_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'letter', orientation: 'landscape' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            wrapper.style.display = 'none';
            utils.showToast('Informe descargado', 'success');
        });
    },

    updateNotifications() { ui.updateNotifications(this); },
    openNotificationsModal() { ui.openNotificationsModal(this.currentAlerts); },

    // Pagination/Sort actions (called from HTML)
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
    }
};

window.app = app;

document.addEventListener('DOMContentLoaded', () => {
    try {
        app.init();
    } catch (e) {
        console.error("App init error:", e);
    }
});
