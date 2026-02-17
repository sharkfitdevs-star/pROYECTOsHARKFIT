/**
 * SERVICE: SyncService
 * Sincronización con fuentes externas (EVO, W12, webhooks, polling)
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const {
  findClienteByIdentifiers,
  findClienteByEmail,
  upsertCliente,
  upsertVenta,
  upsertLead,
  createSyncLog,
  updateSyncLog,
  getLastSuccessfulSyncBySource,
  findSyncLogById
} = require('../db/repositories');
const { logger } = require('../utils/logger');

class SyncService {
  /**
   * Sincronizar desde API externa (EVO, W12, etc)
   * @param {String} sourceId - Identificador de la fuente configurada
   * @param {Object} config - Configuración de conexión
   * @param {String} modo - 'full' o 'incremental'
   * @param {Array} entidades - Qué entidades sincronizar
   */
  async sincronizarDesdeAPI(sourceId, config, modo = 'incremental', entidades = ['clientes', 'ventas']) {
    const syncId = uuidv4();
    await createSyncLog({
      syncId,
      fuente: config.tipo || 'API',
      estatus: 'Procesando',
      iniciado: new Date()
    });

    try {
      logger.info(`🔄 Iniciando sincronización desde ${config.tipo}`, { syncId });

      // Crear cliente axios con configuración
      const apiClient = axios.create({
        baseURL: config.baseURL,
        headers: config.headers || {},
        timeout: 30000
      });

      let cambios = {
        clientesNuevos: 0,
        clientesActualizados: 0,
        ventasNuevas: 0,
        leadsNuevos: 0
      };

      // Sincronizar cada entidad
      if (entidades.includes('clientes')) {
        const resultado = await this._sincronizarClientes(apiClient, config, modo, syncId);
        cambios.clientesNuevos += resultado.inseridos;
        cambios.clientesActualizados += resultado.actualizados;
      }

      if (entidades.includes('ventas')) {
        const resultado = await this._sincronizarVentas(apiClient, config, modo, syncId);
        cambios.ventasNuevas += resultado.inseridos;
      }

      if (entidades.includes('leads')) {
        const resultado = await this._sincronizarLeads(apiClient, config, modo, syncId);
        cambios.leadsNuevos += resultado.inseridos;
      }

      // Actualizar syncLog
      const finalizado = new Date();
      const existingLog = await findSyncLogById(syncId);
      const duracionMs = existingLog?.iniciado
        ? finalizado - new Date(existingLog.iniciado)
        : null;
      await updateSyncLog(syncId, {
        estatus: 'Exitoso',
        cambios,
        finalizado,
        duracionMs
      });
      logger.info(`✅ Sincronización completada`, { syncId, cambios });

      return {
        syncId,
        estatus: 'Exitoso',
        cambios,
        duracionMs
      };
    } catch (error) {
      logger.error(`❌ Error sincronizando`, error, { syncId });

      const proximoIntento = new Date(Date.now() + 5 * 60 * 1000);
      const existingLog = await findSyncLogById(syncId);
      await updateSyncLog(syncId, {
        estatus: 'Fallido',
        errores: [{ error: error.message }],
        finalizado: new Date(),
        proximoIntento,
        reintentoCount: (existingLog?.reintentoCount || 0) + 1
      });

      throw {
        syncId,
        estatus: 'Fallido',
        error: error.message,
        proximoIntento
      };
    }
  }

  /**
   * Procesar webhook (evento en tiempo real)
   */
  async procesarWebhook(evento, dato, fuente = 'API', syncId = null) {
    syncId = syncId || uuidv4();

    try {
      logger.info(`📨 Webhook recibido: ${evento}`, { syncId });

      switch (evento) {
        case 'cliente.creado':
        case 'cliente.actualizado':
          await this._procesarClienteWebhook(dato, syncId);
          break;

        case 'venta.completada':
        case 'venta.cancelada':
          await this._procesarVentaWebhook(dato, syncId);
          break;

        case 'lead.creado':
        case 'lead.actualizado':
          await this._procesarLeadWebhook(dato, syncId);
          break;

        default:
          logger.warn(`⚠️ Evento desconocido: ${evento}`);
      }

      // Registrar en syncLog
      await createSyncLog({
        syncId,
        fuente,
        estatus: 'Exitoso',
        registosProcesados: 1,
        registosInseridos: 1,
        finalizado: new Date(),
        duracionMs: 100
      });

      return { procesado: true, syncId };
    } catch (error) {
      logger.error('Error procesando webhook:', error, { syncId });

      await createSyncLog({
        syncId,
        fuente,
        estatus: 'Fallido',
        errores: [{ error: error.message }],
        finalizado: new Date()
      });

      throw error;
    }
  }

  /**
   * Validar conexión a API
   */
  async validarConexionAPI(config) {
    try {
      const apiClient = axios.create({
        baseURL: config.baseURL,
        headers: config.headers || {},
        timeout: 10000
      });

      const startTime = Date.now();
      const response = await apiClient.get(config.testEndpoint || '/');
      const latencia = Date.now() - startTime;

      return {
        conectado: response.status < 400,
        status: response.status,
        latencia,
        mensaje: '✅ Conexión exitosa'
      };
    } catch (error) {
      return {
        conectado: false,
        status: error.response?.status || 0,
        error: error.message,
        mensaje: '❌ No se pudo conectar'
      };
    }
  }

  /**
   * ==================== MÉTODOS PRIVADOS ====================
   */

  /**
   * Sincronizar clientes desde API
   * @private
   */
  async _sincronizarClientes(apiClient, config, modo, syncId) {
    try {
      let endpoint = config.endpoints?.clientes || '/clientes';
      
      // Si es incremental, agregar filtro por fecha
      if (modo === 'incremental') {
        const ultimaSync = await getLastSuccessfulSyncBySource(config.tipo);

        if (ultimaSync?.finalizado) {
          const fecha = new Date(ultimaSync.finalizado).toISOString().split('T')[0];
          endpoint += `?updatedAt=${fecha}`;
        }
      }

      const response = await apiClient.get(endpoint);
      const clientes = Array.isArray(response.data) ? response.data : response.data.data || [];

      let inseridos = 0;
      let actualizados = 0;

      for (const datoRaw of clientes) {
        try {
          // Mapear campos según configuración
          const dato = this._mapearDato(datoRaw, config.mapeo?.clientes);

          // Buscar cliente existente
          const resultado = await upsertCliente({
            ...dato,
            clienteId: dato.clienteId || uuidv4(),
            syncedAt: new Date(),
            fuente: config.tipo
          });

          if (resultado.updated) {
            actualizados++;
          }
          if (resultado.inserted) {
            inseridos++;
          }
        } catch (error) {
          logger.error('Error sincronizando cliente:', error);
        }
      }

      return { inseridos, actualizados };
    } catch (error) {
      logger.error('Error en _sincronizarClientes:', error);
      throw error;
    }
  }

  /**
   * Sincronizar ventas desde API
   * @private
   */
  async _sincronizarVentas(apiClient, config, modo, syncId) {
    try {
      let endpoint = config.endpoints?.ventas || '/ventas';
      
      if (modo === 'incremental') {
        const ultimaSync = await getLastSuccessfulSyncBySource(config.tipo);

        if (ultimaSync?.finalizado) {
          const fecha = new Date(ultimaSync.finalizado).toISOString().split('T')[0];
          endpoint += `?updatedAt=${fecha}`;
        }
      }

      const response = await apiClient.get(endpoint);
      const ventas = Array.isArray(response.data) ? response.data : response.data.data || [];

      let inseridos = 0;
      let actualizados = 0;

      for (const datoRaw of ventas) {
        try {
          const dato = this._mapearDato(datoRaw, config.mapeo?.ventas);

          // Buscar cliente por email
          const cliente = await findClienteByEmail(dato.emailCliente || datoRaw.emailCliente);

          if (!cliente) continue;

          // Buscar venta existente
          const resultado = await upsertVenta({
            ...dato,
            clienteId: cliente.id,
            ventaId: dato.ventaId || uuidv4(),
            syncedAt: new Date(),
            fuente: config.tipo
          });

          if (resultado.updated) {
            actualizados++;
          }
          if (resultado.inserted) {
            inseridos++;
          }
        } catch (error) {
          logger.error('Error sincronizando venta:', error);
        }
      }

      return { inseridos, actualizados };
    } catch (error) {
      logger.error('Error en _sincronizarVentas:', error);
      throw error;
    }
  }

  /**
   * Sincronizar leads desde API
   * @private
   */
  async _sincronizarLeads(apiClient, config, modo, syncId) {
    let inseridos = 0;
    let actualizados = 0;

    // Implementación similar a clientes y ventas
    return { inseridos, actualizados };
  }

  /**
   * Procesar cliente desde webhook
   * @private
   */
  async _procesarClienteWebhook(dato, syncId) {
    try {
      await upsertCliente({
        ...dato,
        eventoId: dato.id,
        clienteId: dato.clienteId || uuidv4(),
        syncedAt: new Date(),
        fuente: 'webhook'
      });
      logger.info('✅ Cliente procesado desde webhook:', { eventoId: dato.id });
    } catch (error) {
      logger.error('Error procesando cliente webhook:', error);
      throw error;
    }
  }

  /**
   * Procesar venta desde webhook
   * @private
   */
  async _procesarVentaWebhook(dato, syncId) {
    try {
      const cliente = await findClienteByIdentifiers({ eventoId: dato.clienteId });
      if (!cliente) throw new Error('Cliente no encontrado');

      await upsertVenta({
        ...dato,
        eventoVentaId: dato.id,
        clienteId: cliente.id,
        ventaId: dato.ventaId || uuidv4(),
        syncedAt: new Date(),
        fuente: 'webhook'
      });
      logger.info('✅ Venta procesada desde webhook:', { eventoVentaId: dato.id });
    } catch (error) {
      logger.error('Error procesando venta webhook:', error);
      throw error;
    }
  }

  /**
   * Procesar lead desde webhook
   * @private
   */
  async _procesarLeadWebhook(dato, syncId) {
    try {
      const resultado = await upsertLead({
        ...dato,
        eventoId: dato.id,
        leadId: dato.leadId || uuidv4(),
        syncedAt: new Date(),
        fuente: 'webhook'
      });
      logger.info('✅ Lead procesado desde webhook:', { leadId: dato.leadId || resultado.id });
    } catch (error) {
      logger.error('Error procesando lead webhook:', error);
      throw error;
    }
  }

  /**
   * Mapear datos según configuración
   * Si no hay mapeo, devuelve el dato tal cual
   * @private
   */
  _mapearDato(datoRaw, mapeo) {
    if (!mapeo) return datoRaw;

    const dateMapeado = {};
    Object.entries(mapeo).forEach(([claveRaw, claveDest]) => {
      if (datoRaw[claveRaw] !== undefined) {
        dateMapeado[claveDest] = datoRaw[claveRaw];
      }
    });

    return dateMapeado;
  }
}

module.exports = new SyncService();
