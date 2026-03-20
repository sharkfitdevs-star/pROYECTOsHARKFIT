const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005/api';
import { getAccessToken } from '../../config/authStorage';

const DashboardWidgetsService = {
  getHeaders() {
    const token = getAccessToken() || localStorage.getItem('auth_token');
    const headers = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  },

  async getMiConfig() {
    const response = await fetch(`${API_URL}/dashboard/widgets/mi-config`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Error al obtener configuración');
    return response.json();
  },

  async actualizarConfig(data) {
    const response = await fetch(`${API_URL}/dashboard/widgets/mi-config`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Error al actualizar configuración');
    return response.json();
  },

  async actualizarLayout(layout) {
    const response = await fetch(`${API_URL}/dashboard/widgets/mi-config/layout`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ layout })
    });
    if (!response.ok) throw new Error('Error al actualizar layout');
    return response.json();
  },

  async agregarWidget(widgetId, posicion = {}) {
    const response = await fetch(`${API_URL}/dashboard/widgets/mi-config/widget`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ widgetId, posicion })
    });
    if (!response.ok) throw new Error('Error al agregar widget');
    return response.json();
  },

  async quitarWidget(instanceId) {
    const response = await fetch(`${API_URL}/dashboard/widgets/mi-config/widget/${instanceId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Error al quitar widget');
    return response.json();
  },

  async resetearDashboard() {
    const response = await fetch(`${API_URL}/dashboard/widgets/mi-config/reset`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Error al resetear dashboard');
    return response.json();
  },

  async getWidgetsDisponibles(rol = null) {
    const url = rol 
      ? `${API_URL}/dashboard/widgets/disponibles?rol=${rol}`
      : `${API_URL}/dashboard/widgets/disponibles`;
    
    const response = await fetch(url, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Error al obtener widgets disponibles');
    return response.json();
  },

  async getWidgetData(codigo, params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = queryParams 
      ? `${API_URL}/dashboard/widgets/data/${codigo}?${queryParams}`
      : `${API_URL}/dashboard/widgets/data/${codigo}`;
    
    const response = await fetch(url, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Error al obtener datos del widget');
    return response.json();
  },

  async getWidgetsDataBatch(widgets, params = {}) {
    const response = await fetch(`${API_URL}/dashboard/widgets/data/batch`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ widgets, ...params })
    });
    if (!response.ok) throw new Error('Error al obtener datos');
    return response.json();
  },

  async seedWidgets() {
    const response = await fetch(`${API_URL}/dashboard/widgets/seed`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Error al crear widgets base');
    return response.json();
  },

  async getCatalogos() {
    const response = await fetch(`${API_URL}/dashboard/widgets/catalogos`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error('Error al obtener catálogos');
    return response.json();
  }
};

export default DashboardWidgetsService;
