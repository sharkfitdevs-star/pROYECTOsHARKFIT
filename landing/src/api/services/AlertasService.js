/**
 * Service: Gestión de Alertas
 * Usa el cliente axios central de landing/src/api/axios.js
 */
import api from '../axios'

const AlertasService = {
  async getPendientes(params = {}) {
    const response = await api.get('/alertas/pendientes', { params })
    return response.data
  },

  async getAll(params = {}) {
    const response = await api.get('/alertas', { params })
    return response.data
  },

  async getStats() {
    const response = await api.get('/alertas/stats')
    return response.data
  },

  async getById(id) {
    const response = await api.get(`/alertas/${id}`)
    return response.data
  },

  async create(data) {
    const response = await api.post('/alertas', data)
    return response.data
  },

  async cambiarEstado(id, nuevoEstado) {
    const response = await api.put(`/alertas/${id}/estado`, { status: nuevoEstado })
    return response.data
  },

  async resolverAlerta(id, notas = '') {
    const response = await api.post(`/alertas/${id}/resolver`, { resolutionNotes: notas })
    return response.data
  },

  async asignar(id, userId, userName) {
    const response = await api.post(`/alertas/${id}/asignar`, { userId, userName })
    return response.data
  },

  async descartar(id, motivo = '') {
    const response = await api.post(`/alertas/${id}/descartar`, { motivo })
    return response.data
  },

  async delete(id) {
    const response = await api.delete(`/alertas/${id}`)
    return response.data
  },

  async limpiarObsoletas(onlyActive = true) {
    const response = await api.delete('/alertas/obsoletas', {
      params: { onlyActive: onlyActive ? 'true' : 'false' }
    })
    return response.data
  },

  async limpiarTodas() {
    const response = await api.delete('/alertas/all')
    return response.data
  },
}

export default AlertasService
