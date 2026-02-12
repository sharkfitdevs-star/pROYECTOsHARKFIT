/**
 * Service: Gestión de Agendamientos
 * Todos los métodos CRUD para agendamientos
 */

import client from '../client'
import { API_ENDPOINTS, QUERY_PARAMS } from '../endpoints'

class AgendamientosService {
  /**
   * Obtener todos los agendamientos
   */
  async getAll(page = 1, limit = 50) {
    try {
      const response = await client.get(API_ENDPOINTS.AGENDAMIENTOS.LIST, {
        params: QUERY_PARAMS.PAGINATE(page, limit),
      })
      return response.data
    } catch (error) {
      console.error('Error obteniendo agendamientos:', error)
      throw error
    }
  }

  /**
   * Obtener agendamientos por rango de fechas (para calendario)
   */
  async getCalendar(desde, hasta) {
    try {
      const response = await client.get(API_ENDPOINTS.AGENDAMIENTOS.CALENDAR, {
        params: { desde, hasta },
      })
      return response.data
    } catch (error) {
      console.error('Error obteniendo calendario:', error)
      throw error
    }
  }

  /**
   * Obtener un agendamiento por ID
   */
  async getById(id) {
    try {
      const response = await client.get(API_ENDPOINTS.AGENDAMIENTOS.DETAIL(id))
      return response.data
    } catch (error) {
      console.error(`Error obteniendo agendamiento ${id}:`, error)
      throw error
    }
  }

  /**
   * Crear nuevo agendamiento
   */
  async create(data) {
    try {
      const response = await client.post(API_ENDPOINTS.AGENDAMIENTOS.CREATE, data)
      return response.data
    } catch (error) {
      console.error('Error creando agendamiento:', error)
      throw error
    }
  }

  /**
   * Actualizar agendamiento
   */
  async update(id, data) {
    try {
      const response = await client.put(
        API_ENDPOINTS.AGENDAMIENTOS.UPDATE(id),
        data
      )
      return response.data
    } catch (error) {
      console.error(`Error actualizando agendamiento ${id}:`, error)
      throw error
    }
  }

  /**
   * Eliminar agendamiento
   */
  async delete(id) {
    try {
      const response = await client.delete(API_ENDPOINTS.AGENDAMIENTOS.DELETE(id))
      return response.data
    } catch (error) {
      console.error(`Error eliminando agendamiento ${id}:`, error)
      throw error
    }
  }
}

// Exportar instancia singleton
export default new AgendamientosService()
