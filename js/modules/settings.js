/**
 * Settings Module
 */
import { db } from '../db.js';
import { utils } from './utils.js';

export const settings = {
    loadCategories(app) {
        const cats = db.getCategorias().sort((a, b) => a.nombre.localeCompare(b.nombre));
        const tbody = document.getElementById('categories-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        cats.forEach(c => {
            tbody.innerHTML += `
                <tr>
                    <td><strong>${c.nombre}</strong></td>
                    <td class="actions-cell">
                        <button class="btn-icon" onclick="app.openCategoriaModal('${c.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon" onclick="app.deleteCategoria('${c.id}')" title="Eliminar" style="color:var(--danger)"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });

        this.updateCategorySelects(cats);
    },

    updateCategorySelects(cats) {
        const eqSelect = document.getElementById('eq-category');
        const filterSelect = document.getElementById('filter-category');
        if (!eqSelect || !filterSelect) return;

        const currentEqVal = eqSelect.value;
        const currentFilterVal = filterSelect.value;

        const options = '<option value="">' + (eqSelect.tagName === 'SELECT' ? 'Seleccionar...' : 'Todas') + '</option>' + 
            cats.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('');

        eqSelect.innerHTML = options;
        filterSelect.innerHTML = '<option value="">Todas las Categorías</option>' + cats.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('');
        
        eqSelect.value = currentEqVal;
        filterSelect.value = currentFilterVal;
    },

    openCategoriaModal(id = null) {
        const form = document.getElementById('categoria-form');
        if (form) form.reset();
        document.getElementById('categoria-id').value = '';
        const titleEl = document.getElementById('categoria-modal-title');
        if (id) {
            const cat = db.getCategorias().find(c => c.id === id);
            if (cat) {
                if (titleEl) titleEl.innerText = 'Editar Categoría';
                document.getElementById('categoria-id').value = cat.id;
                document.getElementById('categoria-nombre').value = cat.nombre;
            }
        } else {
            if (titleEl) titleEl.innerText = 'Nueva Categoría';
        }
        document.getElementById('categoria-modal').classList.add('active');
    },

    async saveCategoria(app) {
        const nombre = document.getElementById('categoria-nombre').value.trim();
        const id = document.getElementById('categoria-id').value;
        if (!nombre) return;
        try {
            await db.saveCategoria({ id, nombre });
            utils.showToast('Categoría guardada');
            utils.closeModals();
            this.loadCategories(app);
        } catch (error) {
            utils.showToast(error.message, 'error');
        }
    },

    async deleteCategoria(id, app) {
        if (!confirm('¿Eliminar esta categoría?')) return;
        try {
            await db.eliminarCategoria(id);
            this.loadCategories(app);
        } catch (error) {
            utils.showToast(error.message, 'error');
        }
    },

    loadBrands() {
        const marcas = db.getMarcas().sort((a, b) => a.nombre.localeCompare(b.nombre));
        const tbody = document.getElementById('brands-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        marcas.forEach(m => {
            tbody.innerHTML += `
                <tr>
                    <td><strong>${m.nombre}</strong></td>
                    <td class="actions-cell">
                        <button class="btn-icon" onclick="app.openMarcaModal('${m.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon" onclick="app.deleteMarca('${m.id}')" title="Eliminar" style="color:var(--danger)"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });

        const datalist = document.getElementById('brand-list');
        if (datalist) {
            datalist.innerHTML = marcas.map(m => `<option value="${m.nombre}">`).join('');
        }
    },

    openMarcaModal(id = null) {
        const form = document.getElementById('marca-form');
        if (form) form.reset();
        document.getElementById('marca-id').value = '';
        const titleEl = document.getElementById('marca-modal-title');
        if (id) {
            const marca = db.getMarcas().find(m => m.id === id);
            if (marca) {
                if (titleEl) titleEl.innerText = 'Editar Marca';
                document.getElementById('marca-id').value = marca.id;
                document.getElementById('marca-nombre').value = marca.nombre;
            }
        } else {
            if (titleEl) titleEl.innerText = 'Nueva Marca';
        }
        document.getElementById('marca-modal').classList.add('active');
    },

    async saveMarca() {
        const nombre = document.getElementById('marca-nombre').value.trim();
        const id = document.getElementById('marca-id').value;
        if (!nombre) return;
        try {
            await db.saveMarca({ id, nombre });
            utils.showToast('Marca guardada');
            utils.closeModals();
            this.loadBrands();
        } catch (error) {
            utils.showToast(error.message, 'error');
        }
    },

    async deleteMarca(id) {
        if (!confirm('¿Eliminar esta marca?')) return;
        try {
            await db.eliminarMarca(id);
            this.loadBrands();
        } catch (error) {
            utils.showToast(error.message, 'error');
        }
    },

    async refreshSettingsData(app) {
        utils.showToast('Sincronizando datos base...', 'info');
        try {
            await db.initData();
            this.loadBrands();
            this.loadCategories(app);
            utils.showToast('Sincronización completada', 'success');
        } catch (error) {
            utils.showToast(error.message, 'error');
        }
    },

    resetDatabase() {
        if(confirm('🚨 ADVERTENCIA CRÍTICA 🚨\n¿Estás absolutamente seguro de que deseas borrar toda la base de datos?\nEsta acción no se puede deshacer y perderás todo el inventario, préstamos e historial.')) {
            localStorage.clear();
            location.reload();
        }
    },

    changeRole(role) {
        const roleEl = document.querySelector('.user-info .role');
        if(roleEl) roleEl.innerText = role;
        utils.showToast(`Rol cambiado a: ${role}`, 'info');
        
        const isViewer = role === 'Visualizador';
        document.querySelectorAll('.btn-primary').forEach(btn => {
            btn.style.opacity = isViewer ? '0.5' : '1';
            btn.style.pointerEvents = isViewer ? 'none' : 'auto';
        });
    },

    importCSV(input) {
        if (input.files && input.files[0]) {
            const fileName = input.files[0].name;
            utils.showToast(`Procesando archivo: ${fileName}...`, 'info');
            setTimeout(() => {
                utils.showToast(`Se han importado los equipos desde ${fileName} correctamente.`, 'success');
                input.value = '';
            }, 2000);
        }
    }
};
