/**
 * Service: Gestión de Ventas
 * Todos los métodos CRUD para ventas
 */

import client from '../client'
import { API_ENDPOINTS, QUERY_PARAMS } from '../endpoints'

class VentasService {
  /**
   * Obtener todas las ventas con paginación
   */
  async getAll(page = 1, limit = 50) {
    try {
      const response = await client.get(API_ENDPOINTS.VENTAS.LIST, {
        params: QUERY_PARAMS.PAGINATE(page, limit),
      })
      return response.data
    } catch (error) {
      console.error('Error obteniendo ventas:', error)
      throw error
    }
  }

  /**
   * Obtener una venta por ID
   */
  async getById(id) {
    try {
      const response = await client.get(API_ENDPOINTS.VENTAS.DETAIL(id))
      return response.data
    } catch (error) {
      console.error(`Error obteniendo venta ${id}:`, error)
      throw error
    }
  }

  /**
   * Crear nueva venta
   */
  async create(data) {
    try {
      const response = await client.post(API_ENDPOINTS.VENTAS.CREATE, data)
      return response.data
    } catch (error) {
      console.error('Error creando venta:', error)
      throw error
    }
  }

  /**
   * Actualizar venta
   */
  async update(id, data) {
    try {
      const response = await client.put(API_ENDPOINTS.VENTAS.UPDATE(id), data)
      return response.data
    } catch (error) {
      console.error(`Error actualizando venta ${id}:`, error)
      throw error
    }
  }

  /**
   * Cambiar estado de una venta
   */
  async cambiarEstado(id, estado) {
    try {
      const response = await client.patch(API_ENDPOINTS.VENTAS.ESTADO(id), {
        estado,
      })
      return response.data
    } catch (error) {
      console.error(`Error cambiando estado de venta ${id}:`, error)
      throw error
    }
  }

  /**
   * Eliminar venta (soft delete)
   */
  async delete(id) {
    try {
      const response = await client.delete(API_ENDPOINTS.VENTAS.DELETE(id))
      return response.data
    } catch (error) {
      console.error(`Error eliminando venta ${id}:`, error)
      throw error
    }
  }
}

// Exportar instancia singleton
export default new VentasService()
