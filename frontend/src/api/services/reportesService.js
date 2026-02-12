/**
 * Service: Reportes y Estadísticas
 * Endpoints para obtener datos agregados
 */

import client from '../client'
import { API_ENDPOINTS } from '../endpoints'

class ReportesService {
  /**
   * Obtener resumen general del dashboard
   * (total ventas, clientes, ingresos, etc)
   */
  async getSummary(periodo = 'mes') {
    try {
      const response = await client.get(API_ENDPOINTS.REPORTES.SUMMARY, {
        params: { periodo },
      })
      return response.data
    } catch (error) {
      console.error('Error obteniendo summary:', error)
      throw error
    }
  }

  /**
   * Obtener reporte de ventas
   */
  async getVentas(filtros = {}) {
    try {
      const response = await client.get(API_ENDPOINTS.REPORTES.VENTAS, {
        params: filtros,
      })
      return response.data
    } catch (error) {
      console.error('Error obteniendo reporte de ventas:', error)
      throw error
    }
  }

  /**
   * Obtener reporte de clientes
   */
  async getClientes(filtros = {}) {
    try {
      const response = await client.get(API_ENDPOINTS.REPORTES.CLIENTES, {
        params: filtros,
      })
      return response.data
    } catch (error) {
      console.error('Error obteniendo reporte de clientes:', error)
      throw error
    }
  }

  /**
   * Obtener reporte de alertas
   */
  async getAlertas(filtros = {}) {
    try {
      const response = await client.get(API_ENDPOINTS.REPORTES.ALERTAS, {
        params: filtros,
      })
      return response.data
    } catch (error) {
      console.error('Error obteniendo reporte de alertas:', error)
      throw error
    }
  }

  /**
   * Crear reporte personalizado
   */
  async createCustom(config) {
    try {
      const response = await client.post(API_ENDPOINTS.REPORTES.CUSTOM, config)
      return response.data
    } catch (error) {
      console.error('Error creando reporte personalizado:', error)
      throw error
    }
  }

  /**
   * Exportar reporte a CSV/PDF/Excel
   */
  async exportar(tipo, formato = 'csv') {
    try {
      const response = await client.get(API_ENDPOINTS.REPORTES.EXPORTAR, {
        params: { tipo, formato },
        responseType: 'blob',
      })
      return response.data
    } catch (error) {
      console.error(`Error exportando reporte ${tipo}:`, error)
      throw error
    }
  }
}

// Exportar instancia singleton
export default new ReportesService()
