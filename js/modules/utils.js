/**
 * Utils Module - Shared helper functions
 */

export const utils = {
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
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

    loadTheme() {
        const theme = localStorage.getItem('theme');
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        }
        this.updateThemeIcon();
    },

    toggleTheme() {
        const isDark = document.body.classList.toggle('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
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

    closeModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    },

    getStatusBadge(estado) {
        if(estado === 'Operativo') return 'badge-success';
        if(estado === 'En Reparación') return 'badge-warning';
        if(estado === 'De Baja') return 'badge-danger';
        if(estado === 'Pendiente de Revisión') return 'badge-info';
        return '';
    }
};
