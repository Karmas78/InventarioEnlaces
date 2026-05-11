/**
 * Export Module (Excel)
 */
import { db } from '../db.js';
import { utils } from './utils.js';

export const exporter = {
    exportData() {
        if(typeof XLSX === 'undefined') {
            utils.showToast('La biblioteca de Excel no ha cargado aún.', 'error');
            return;
        }

        utils.showToast('Generando archivo Excel...', 'info');
        
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
        const historyData = db.getTable('historial').map(h => {
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
        
        if(historyData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(historyData), "Historial");
        else XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{'Mensaje':'No hay historial'}]), "Historial");

        // Save
        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Inventario_Enlaces_${dateStr}.xlsx`);
    }
};
