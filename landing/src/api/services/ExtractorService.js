const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005/api';

const ExtractorService = {
  async getConfigs() {
    const response = await fetch(`${API_URL}/extractor/configuraciones`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });
    if (!response.ok) throw new Error('Error al obtener configuraciones');
    return response.json();
  },

  async getConfiguraciones() {
    return this.getConfigs();
  },

  async getLogs(filtros = {}) {
    const params = new URLSearchParams(filtros).toString();
    const response = await fetch(`${API_URL}/extractor/historial?${params}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });
    if (!response.ok) throw new Error('Error al obtener logs');
    return response.json();
  },

  async importarDatos(archivo, opciones = {}) {
    const formData = new FormData();
    formData.append('archivo', archivo);
    Object.keys(opciones).forEach(key => formData.append(key, opciones[key]));
    const response = await fetch(`${API_URL}/extractor/importar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
      body: formData
    });
    if (!response.ok) throw new Error('Error al importar datos');
    return response.json();
  },

  async getHistorialImportaciones(filtros = {}) {
    const params = new URLSearchParams(filtros).toString();
    const response = await fetch(`${API_URL}/extractor/historial?${params}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });
    if (!response.ok) throw new Error('Error al obtener historial');
    return response.json();
  },

  async getPlantillas() {
    const response = await fetch(`${API_URL}/extractor/plantillas`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });
    if (!response.ok) throw new Error('Error al obtener plantillas');
    return response.json();
  },

  async validarArchivo(archivo) {
    const formData = new FormData();
    formData.append('archivo', archivo);
    const response = await fetch(`${API_URL}/extractor/validar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
      body: formData
    });
    if (!response.ok) throw new Error('Error al validar archivo');
    return response.json();
  }
};

export default ExtractorService;
