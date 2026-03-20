const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const AlertasService = {
  async getAlertas(filtros = {}) {
    const params = new URLSearchParams(filtros).toString();
    const response = await fetch(`${API_URL}/alertas?${params}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });
    if (!response.ok) throw new Error('Error al obtener alertas');
    return response.json();
  },

  async getAll(filtros = {}) {
    const params = new URLSearchParams(filtros).toString();
    const response = await fetch(`${API_URL}/alertas?${params}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });
    if (!response.ok) throw new Error('Error al obtener alertas');
    return response.json();
  },

  async getPendientes() {
    const response = await fetch(`${API_URL}/alertas/no-leidas`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });
    if (!response.ok) throw new Error('Error al obtener alertas pendientes');
    return response.json();
  },

  async getAlertasNoLeidas() {
    return this.getPendientes();
  },

  async marcarLeida(alertaId) {
    const response = await fetch(`${API_URL}/alertas/${alertaId}/leer`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });
    if (!response.ok) throw new Error('Error al marcar alerta como leída');
    return response.json();
  },

  async marcarTodasLeidas() {
    const response = await fetch(`${API_URL}/alertas/leer-todas`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });
    if (!response.ok) throw new Error('Error al marcar alertas como leídas');
    return response.json();
  },

  async getContadorNoLeidas() {
    const response = await fetch(`${API_URL}/alertas/contador`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });
    if (!response.ok) throw new Error('Error al obtener contador');
    return response.json();
  }
};

export default AlertasService;
