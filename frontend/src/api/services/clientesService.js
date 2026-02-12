/**
 * Service: Gestión de Clientes
 * Todos los métodos CRUD para clientes
 */

import client from '../client'
import { API_ENDPOINTS, QUERY_PARAMS } from '../endpoints'

class ClientesService {
  /**
   * Obtener todos los clientes con paginación
   */
  async getAll(page = 1, limit = 50) {
    try {
      const response = await client.get(API_ENDPOINTS.CLIENTES.LIST, {
        params: QUERY_PARAMS.PAGINATE(page, limit),
      })
      return response.data
    } catch (error) {
      console.error('Error obteniendo clientes:', error)
      throw error
    }
  }

  /**
   * Obtener un cliente por ID
   */
  async getById(id) {
    try {
      const response = await client.get(API_ENDPOINTS.CLIENTES.DETAIL(id))
      return response.data
    } catch (error) {
      console.error(`Error obteniendo cliente ${id}:`, error)
      throw error
    }
  }

  /**
   * Buscar clientes
   */
  async search(query) {
    try {
      const response = await client.get(API_ENDPOINTS.CLIENTES.SEARCH, {
        params: QUERY_PARAMS.SEARCH(query),
      })
      return response.data
    } catch (error) {
      console.error('Error buscando clientes:', error)
      throw error
    }
  }

  /**
   * Crear nuevo cliente
   */
  async create(data) {
    try {
      const response = await client.post(API_ENDPOINTS.CLIENTES.CREATE, data)
      return response.data
    } catch (error) {
      console.error('Error creando cliente:', error)
      throw error
    }
  }

  /**
   * Actualizar cliente
   */
  async update(id, data) {
    try {
      const response = await client.put(API_ENDPOINTS.CLIENTES.UPDATE(id), data)
      return response.data
    } catch (error) {
      console.error(`Error actualizando cliente ${id}:`, error)
      throw error
    }
  }

  /**
   * Eliminar cliente (soft delete)
   */
  async delete(id) {
    try {
      const response = await client.delete(API_ENDPOINTS.CLIENTES.DELETE(id))
      return response.data
    } catch (error) {
      console.error(`Error eliminando cliente ${id}:`, error)
      throw error
    }
  }

  /**
   * Exportar clientes a CSV/Excel
   */
  async exportar(format = 'csv', filters = {}) {
    try {
      const response = await client.get(API_ENDPOINTS.CLIENTES.EXPORTAR, {
        params: { format, ...filters },
        responseType: 'blob',
      })
      return response.data
    } catch (error) {
      console.error('Error exportando clientes:', error)
      throw error
    }
  }
}

// Exportar instancia singleton
export default new ClientesService()
