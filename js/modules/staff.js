/**
 * Staff Module
 */
import { db } from '../db.js';
import { utils } from './utils.js';

export const staff = {
    loadStaff() {
        const funcionarios = db.getFuncionarios();
        const tbody = document.getElementById('staff-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (funcionarios.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:40px;">No hay funcionarios registrados.</td></tr>`;
            return;
        }

        funcionarios.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')).forEach(f => {
            const tienePrestamoActivo = db.getAsignaciones(true).some(p => p.funcionarioId === f.id);
            
            tbody.innerHTML += `
                <tr>
                    <td>
                        <div style="display: flex; gap: 15px; align-items: center;">
                            <div class="avatar" style="background: var(--background-color); color: var(--secondary-color); width:35px; height:35px;"><i class="fa-solid fa-user"></i></div>
                            <div>
                                <strong>${f.nombre}</strong><br>
                                <small class="text-muted">${f.email || 'Sin correo'}</small>
                            </div>
                        </div>
                    </td>
                    <td>${f.rut}</td>
                    <td>
                        <strong>${f.departamento || 'Sin Depto.'}</strong><br>
                        <small class="text-muted">${f.cargo || 'Funcionario'}</small>
                    </td>
                    <td class="actions-cell">
                        <button class="btn-icon" onclick="app.openFuncionarioModal('${f.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon" onclick="app.deleteFuncionario('${f.id}')" title="Eliminar" style="color:var(--danger)" ${tienePrestamoActivo ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''}><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    },

    openFuncionarioModal(id = null) {
        const form = document.getElementById('funcionario-form');
        if(form) form.reset();
        const idInput = document.getElementById('func-id');
        if (idInput) idInput.value = '';

        const titleEl = document.getElementById('funcionario-modal-title');
        if (id) {
            const func = db.getFuncionarios().find(f => f.id === id);
            if (func) {
                if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-user-pen"></i> Editar Funcionario';
                document.getElementById('func-id').value = func.id;
                document.getElementById('func-nombre').value = func.nombre || '';
                document.getElementById('func-rut').value = func.rut || '';
                document.getElementById('func-email').value = func.email || '';
                document.getElementById('func-cargo').value = func.cargo || '';
                document.getElementById('func-departamento').value = func.departamento || '';
                document.getElementById('func-telefono').value = func.telefono || '';
            }
        } else {
            if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-user-plus"></i> Nuevo Funcionario';
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
            utils.showToast('Funcionario guardado exitosamente');
            utils.closeModals();
            this.loadStaff();
        } catch (error) {
            utils.showToast(error.message, 'error');
        }
    },

    async deleteFuncionario(id) {
        const func = db.getFuncionarios().find(f => f.id === id);
        if (!func) return;
        if (!confirm(`¿Deseas eliminar a "${func.nombre}" del sistema?\nEsta acción no se puede deshacer.`)) return;
        try {
            await db.eliminarFuncionario(id);
            utils.showToast(`Funcionario "${func.nombre}" eliminado`, 'success');
            this.loadStaff();
        } catch (error) {
            utils.showToast(error.message, 'error');
        }
    }
};
