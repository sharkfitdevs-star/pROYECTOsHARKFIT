/**
 * Service: Gestión de Alertas
 */
import client from '../client'
import { API_ENDPOINTS, QUERY_PARAMS } from '../endpoints'

class AlertasService {
  async getAll(page = 1, limit = 50) {
    try {
      const response = await client.get(API_ENDPOINTS.ALERTAS.LIST, {
        params: QUERY_PARAMS.PAGINATE(page, limit),
      })
      return response.data
    } catch (error) {
      console.error('Error obteniendo alertas:', error)
      throw error
    }
  }

  async getPendientes() {
    try {
      const response = await client.get(API_ENDPOINTS.ALERTAS.PENDIENTES)
      return response.data
    } catch (error) {
      console.error('Error obteniendo alertas pendientes:', error)
      throw error
    }
  }

  async getStats() {
    try {
      const response = await client.get(API_ENDPOINTS.ALERTAS.STATS)
      return response.data
    } catch (error) {
      console.error('Error obteniendo stats:', error)
      throw error
    }
  }

  async getById(id) {
    try {
      const response = await client.get(API_ENDPOINTS.ALERTAS.DETAIL(id))
      return response.data
    } catch (error) {
      console.error('Error obteniendo alerta ' + id + ':', error)
      throw error
    }
  }

  async create(data) {
    try {
      const response = await client.post(API_ENDPOINTS.ALERTAS.CREATE, data)
      return response.data
    } catch (error) {
      console.error('Error creando alerta:', error)
      throw error
    }
  }

  async cambiarEstado(id, nuevoEstado) {
    try {
      const response = await client.put(
        API_ENDPOINTS.ALERTAS.ESTADO(id),
        { status: nuevoEstado }
      )
      return response.data
    } catch (error) {
      console.error('Error cambiando estado alerta ' + id + ':', error)
      throw error
    }
  }

  async resolverAlerta(id, notas = '') {
    try {
      const response = await client.post(
        API_ENDPOINTS.ALERTAS.MARCAR_RESUELTA(id),
        { resolutionNotes: notas }
      )
      return response.data
    } catch (error) {
      console.error('Error resolviendo alerta ' + id + ':', error)
      throw error
    }
  }

  async asignar(id, userId, userName) {
    try {
      const response = await client.post(
        API_ENDPOINTS.ALERTAS.ASIGNAR(id),
        { userId, userName }
      )
      return response.data
    } catch (error) {
      console.error('Error asignando alerta ' + id + ':', error)
      throw error
    }
  }

  async descartar(id, motivo = '') {
    try {
      const response = await client.post(
        API_ENDPOINTS.ALERTAS.DESCARTAR(id),
        { motivo }
      )
      return response.data
    } catch (error) {
      console.error('Error descartando alerta ' + id + ':', error)
      throw error
    }
  }

  async delete(id) {
    try {
      const response = await client.delete(API_ENDPOINTS.ALERTAS.DELETE(id))
      return response.data
    } catch (error) {
      console.error('Error eliminando alerta ' + id + ':', error)
      throw error
    }
  }
}

export default new AlertasService()
