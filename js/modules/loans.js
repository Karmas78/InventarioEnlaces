/**
 * Loans Module
 */
import { db } from '../db.js';
import { ui } from './ui.js';
import { utils } from './utils.js';

export const loans = {
    loadLoans(app) {
        const prestamos = db.getAsignaciones(true); // only active
        const equipos = db.getEquipos();
        const funcionarios = db.getFuncionarios();
        const tbody = document.getElementById('loans-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        const prestamosData = prestamos.map(p => {
            const eq = equipos.find(e => e.id === p.equipoId);
            const func = funcionarios.find(f => f.id === p.funcionarioId);
            
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
        const sort = app.sortConfig.loans;
        prestamosData.sort((a, b) => {
            let valA = a[sort.column] || '';
            let valB = b[sort.column] || '';
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            
            if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        ui.updateSortIcons('loans', app.sortConfig);
        
        // Aplicar paginación
        const config = app.paginationConfig.loans;
        ui.updatePaginationUI('loans', prestamosData.length, app.paginationConfig);

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

    openLoanModal() {
        const equipos = db.getEquipos().filter(e => e.estado === 'Operativo' || e.estado === 'Pendiente de Revisión');
        const funcionarios = db.getFuncionarios();
        
        const eqSelect = document.getElementById('loan-equipment');
        if (eqSelect) {
            eqSelect.innerHTML = '<option value="">Seleccione Equipo...</option>' + 
                equipos.map(e => `<option value="${e.id}">${e.assetTag} - ${e.nombre}</option>`).join('');
        }

        const funSelect = document.getElementById('loan-staff');
        if (funSelect) {
            funSelect.innerHTML = '<option value="">Seleccione Funcionario...</option>' + 
                funcionarios.map(f => `<option value="${f.id}">${f.nombre} (${f.rut})</option>`).join('');
        }

        const startInput = document.getElementById('loan-start');
        if (startInput) startInput.valueAsDate = new Date();
        
        document.getElementById('loan-modal').classList.add('active');
    },

    async saveLoan(app) {
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
            utils.showToast('Préstamo registrado exitosamente. Generando Acta...');
            utils.closeModals();
            this.loadLoans(app);
            app.loadDashboard();
            app.updateNotifications();
        } catch (error) {
            utils.showToast(error.message, 'error');
        }
    },

    openReturnModal(loanId, eqId) {
        document.getElementById('return-loan-id').value = loanId;
        document.getElementById('return-eq-id').value = eqId;
        document.getElementById('return-modal').classList.add('active');
    },

    async processReturn(app) {
        const loanId = document.getElementById('return-loan-id').value;
        const status = document.getElementById('return-status').value;
        const notes = document.getElementById('return-notes').value;

        try {
            await db.devolverEquipo(loanId, status, notes);
            utils.showToast('Equipo devuelto correctamente');
            utils.closeModals();
            this.loadLoans(app);
            app.loadInventory();
            app.loadDashboard();
            app.updateNotifications();
        } catch (error) {
            utils.showToast(error.message, 'error');
        }
    },

    generatePDF(prestamoId) {
        const prestamo = db.getAsignaciones().find(p => p.id === prestamoId);
        if (!prestamo) {
            utils.showToast('No se encontró el préstamo', 'error');
            return;
        }

        const equipo = db.getEquipos().find(e => e.id === prestamo.equipoId) || {};
        const funcionario = db.getFuncionarios().find(f => f.id === prestamo.funcionarioId) || {};

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

        utils.showToast('Generando Acta PDF...', 'info');
        const element = document.getElementById('pdf-content');
        const wrapper = element.parentElement;
        wrapper.style.display = 'block';

        const opt = {
            margin:       10,
            filename:     `Acta_Entrega_${funcionario.rut}_${equipo.assetTag}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            wrapper.style.display = 'none';
            utils.showToast('Acta descargada con éxito', 'success');
        });
    },

    generateLoansReportPDF() {
        const prestamos = db.getAsignaciones(true); 
        const equipos = db.getEquipos();
        const funcionarios = db.getFuncionarios();

        if (prestamos.length === 0) {
            utils.showToast('No hay préstamos activos para generar un informe.', 'error');
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

        utils.showToast('Generando Informe de Préstamos...', 'info');
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
            utils.showToast('Informe de Préstamos descargado con éxito', 'success');
        });
    }
};
