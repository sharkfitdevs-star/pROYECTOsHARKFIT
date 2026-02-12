/**
 * Service: Gestión de Alertas
 * Todos los métodos CRUD para alertas
 */

import client from '../client'
import { API_ENDPOINTS, QUERY_PARAMS } from '../endpoints'

class AlertasService {
  /**
   * Obtener todas las alertas
   */
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

  /**
   * Obtener alertas pendientes de resolver
   */
  async getPendientes() {
    try {
      const response = await client.get(API_ENDPOINTS.ALERTAS.PENDIENTES)
      return response.data
    } catch (error) {
      console.error('Error obteniendo alertas pendientes:', error)
      throw error
    }
  }

  /**
   * Obtener una alerta por ID
   */
  async getById(id) {
    try {
      const response = await client.get(API_ENDPOINTS.ALERTAS.DETAIL(id))
      return response.data
    } catch (error) {
      console.error(`Error obteniendo alerta ${id}:`, error)
      throw error
    }
  }

  /**
   * Crear nueva alerta
   */
  async create(data) {
    try {
      const response = await client.post(API_ENDPOINTS.ALERTAS.CREATE, data)
      return response.data
    } catch (error) {
      console.error('Error creando alerta:', error)
      throw error
    }
  }

  /**
   * Actualizar alerta
   */
  async update(id, data) {
    try {
      const response = await client.put(API_ENDPOINTS.ALERTAS.UPDATE(id), data)
      return response.data
    } catch (error) {
      console.error(`Error actualizando alerta ${id}:`, error)
      throw error
    }
  }

  /**
   * Marcar alerta como resuelta
   */
  async resolverAlerta(id) {
    try {
      const response = await client.post(
        API_ENDPOINTS.ALERTAS.MARCAR_RESUELTA(id)
      )
      return response.data
    } catch (error) {
      console.error(`Error resolviendo alerta ${id}:`, error)
      throw error
    }
  }

  /**
   * Eliminar alerta
   */
  async delete(id) {
    try {
      const response = await client.delete(API_ENDPOINTS.ALERTAS.DELETE(id))
      return response.data
    } catch (error) {
      console.error(`Error eliminando alerta ${id}:`, error)
      throw error
    }
  }
}

// Exportar instancia singleton
export default new AlertasService()
