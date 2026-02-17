/**
 * SERVICE: SyncService (MongoDB)
 * Sincronización con fuentes externas (EVO, W12, webhooks, polling)
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { Cliente, Venta, SyncLog } = require('../models');
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
    const syncLog = new SyncLog({
      sync_id: uuidv4(),
      tenant_id: config.tenantId || 'default',
      fuente: config.tipo || 'API',
      tipo: modo === 'full' ? 'full' : 'incremental',
      estado: 'iniciado',
      filtros: { modo, entidades },
      iniciado_en: new Date()
    });

    await syncLog.save();

    try {
      logger.info(`🔄 Iniciando sincronización desde ${config.tipo}`, { syncId: syncLog._id });

      // Crear cliente axios con configuración
      const apiClient = axios.create({
        baseURL: config.baseURL,
        headers: config.headers || {},
        timeout: 30000
      });

      let results = {
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0
      };

      // Sincronizar cada entidad
      if (entidades.includes('clientes')) {
        const resultado = await this._sincronizarClientes(apiClient, config, modo, syncLog);
        results.processed += resultado.processed;
        results.created += resultado.created;
        results.updated += resultado.updated;
      }

      if (entidades.includes('ventas')) {
        const resultado = await this._sincronizarVentas(apiClient, config, modo, syncLog);
        results.processed += resultado.processed;
        results.created += resultado.created;
        results.updated += resultado.updated;
      }

      // Actualizar syncLog
      syncLog.markCompleted(results);
      await syncLog.save();
      
      logger.info(`✅ Sincronización completada`, { syncId: syncLog._id, results });

      return {
        syncId: syncLog._id,
        status: 'completado',
        results,
        duration: syncLog.duration
      };
    } catch (error) {
      logger.error(`❌ Error sincronizando`, error, { syncId: syncLog._id });

      syncLog.markError(error);
      await syncLog.save();

      throw {
        syncId: syncLog._id,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Procesar webhook (evento en tiempo real)
   */
  async procesarWebhook(evento, dato, fuente = 'API') {
    const syncLog = new SyncLog({
      sync_id: uuidv4(),
      tenant_id: 'default',
      fuente: fuente,
      tipo: 'manual',
      estado: 'iniciado',
      filtros: { evento },
      iniciado_en: new Date()
    });

    await syncLog.save();

    try {
      logger.info(`📨 Webhook recibido: ${evento}`, { syncId: syncLog._id });

      let processed = false;

      switch (evento) {
        case 'cliente.creado':
        case 'cliente.actualizado':
          await this._procesarClienteWebhook(dato, syncLog);
          processed = true;
          break;

        case 'venta.completada':
        case 'venta.cancelada':
          await this._procesarVentaWebhook(dato, syncLog);
          processed = true;
          break;

        default:
          logger.warn(`⚠️ Evento desconocido: ${evento}`);
      }

      // Actualizar syncLog
      if (processed) {
        syncLog.markCompleted({ processed: 1, created: 1, updated: 0 });
      } else {
        syncLog.status = 'completado';
        syncLog.recordsSkipped = 1;
      }
      
      await syncLog.save();

      return { processed: true, syncId: syncLog._id };
    } catch (error) {
      logger.error('Error procesando webhook:', error, { syncId: syncLog._id });

      syncLog.markError(error);
      await syncLog.save();

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
   * Obtener logs de sincronización
   */
  async obtenerLogs(filtros = {}) {
    const query = {};

    // Mapear filtros al schema de MongoModels
    if (filtros.syncType || filtros.tipo) {
      query.tipo = filtros.syncType || filtros.tipo;
    }

    if (filtros.status || filtros.estado) {
      query.estado = filtros.status || filtros.estado;
    }

    if (filtros.desde) {
      query.iniciado_en = { $gte: new Date(filtros.desde) };
    }

    const logs = await SyncLog.find(query)
      .sort({ iniciado_en: -1 })
      .limit(filtros.limit || 50);

    return logs;
  }

  /**
   * ==================== MÉTODOS PRIVADOS ====================
   */

  /**
   * Sincronizar clientes desde API
   * @private
   */
  async _sincronizarClientes(apiClient, config, modo, syncLog) {
    try {
      let endpoint = config.endpoints?.clientes || '/clientes';
      
      // Si es incremental, agregar filtro por fecha
      if (modo === 'incremental') {
        const ultimaSync = await SyncLog.findOne({
          fuente: config.tipo,
          estado: 'completado'
        }).sort({ completado_en: -1 });

        if (ultimaSync?.completado_en) {
          const fecha = ultimaSync.completado_en.toISOString().split('T')[0];
          endpoint += `?updatedAt=${fecha}`;
        }
      }

      const response = await apiClient.get(endpoint);
      const clientes = Array.isArray(response.data) ? response.data : response.data.data || [];

      let processed = 0;
      let created = 0;
      let updated = 0;

      for (const datoRaw of clientes) {
        try {
          // Mapear campos según configuración
          const dato = this._mapearDato(datoRaw, config.mapeo?.clientes);

          // Buscar cliente existente
          const existingCliente = await Cliente.findOne({
            $or: [
              { uniqueId: dato.uniqueId },
              { idMember: dato.idMember },
              { email: dato.email }
            ]
          });

          if (existingCliente) {
            // Actualizar
            Object.assign(existingCliente, {
              ...dato,
              lastSyncAt: new Date(),
              source: config.tipo
            });
            await existingCliente.save();
            updated++;
          } else {
            // Crear nuevo
            const nuevoCliente = new Cliente({
              ...dato,
              uniqueId: dato.uniqueId || uuidv4(),
              lastSyncAt: new Date(),
              source: config.tipo
            });
            await nuevoCliente.save();
            created++;
          }

          processed++;
        } catch (error) {
          logger.error('Error sincronizando cliente:', error);
          syncLog.addError(error, datoRaw);
        }
      }

      return { processed, created, updated };
    } catch (error) {
      logger.error('Error en _sincronizarClientes:', error);
      throw error;
    }
  }

  /**
   * Sincronizar ventas desde API
   * @private
   */
  async _sincronizarVentas(apiClient, config, modo, syncLog) {
    try {
      let endpoint = config.endpoints?.ventas || '/ventas';
      
      if (modo === 'incremental') {
        const ultimaSync = await SyncLog.findOne({
          fuente: config.tipo,
          estado: 'completado'
        }).sort({ completado_en: -1 });

        if (ultimaSync?.completado_en) {
          const fecha = ultimaSync.completado_en.toISOString().split('T')[0];
          endpoint += `?updatedAt=${fecha}`;
        }
      }

      const response = await apiClient.get(endpoint);
      const ventas = Array.isArray(response.data) ? response.data : response.data.data || [];

      let processed = 0;
      let created = 0;
      let updated = 0;

      for (const datoRaw of ventas) {
        try {
          const dato = this._mapearDato(datoRaw, config.mapeo?.ventas);

          // Buscar cliente
          const cliente = await Cliente.findOne({
            $or: [
              { idMember: dato.idMember },
              { email: dato.emailCliente }
            ]
          });

          if (!cliente) {
            syncLog.addWarning('Cliente no encontrado para venta', datoRaw);
            continue;
          }

          // Buscar venta existente
          const existingVenta = await Venta.findOne({
            $or: [
              { idSale: dato.idSale },
              { externalId: dato.externalId }
            ]
          });

          if (existingVenta) {
            // Actualizar
            Object.assign(existingVenta, {
              ...dato,
              lastSyncAt: new Date(),
              source: config.tipo
            });
            await existingVenta.save();
            updated++;
          } else {
            // Crear nueva
            const nuevaVenta = new Venta({
              ...dato,
              idSale: dato.idSale || uuidv4(),
              lastSyncAt: new Date(),
              source: config.tipo
            });
            await nuevaVenta.save();
            created++;
          }

          processed++;
        } catch (error) {
          logger.error('Error sincronizando venta:', error);
          syncLog.addError(error, datoRaw);
        }
      }

      return { processed, created, updated };
    } catch (error) {
      logger.error('Error en _sincronizarVentas:', error);
      throw error;
    }
  }

  /**
   * Procesar cliente desde webhook
   * @private
   */
  async _procesarClienteWebhook(dato, syncLog) {
    try {
      const existingCliente = await Cliente.findOne({
        $or: [
          { uniqueId: dato.uniqueId },
          { idMember: dato.idMember },
          { email: dato.email }
        ]
      });

      if (existingCliente) {
        Object.assign(existingCliente, {
          ...dato,
          lastSyncAt: new Date(),
          source: 'webhook'
        });
        await existingCliente.save();
        logger.info('✅ Cliente actualizado desde webhook:', { id: existingCliente._id });
      } else {
        const nuevoCliente = new Cliente({
          ...dato,
          uniqueId: dato.uniqueId || uuidv4(),
          lastSyncAt: new Date(),
          source: 'webhook'
        });
        await nuevoCliente.save();
        logger.info('✅ Cliente creado desde webhook:', { id: nuevoCliente._id });
      }
    } catch (error) {
      logger.error('Error procesando cliente webhook:', error);
      throw error;
    }
  }

  /**
   * Procesar venta desde webhook
   * @private
   */
  async _procesarVentaWebhook(dato, syncLog) {
    try {
      const cliente = await Cliente.findOne({
        $or: [
          { idMember: dato.idMember },
          { email: dato.emailCliente }
        ]
      });

      if (!cliente) {
        throw new Error('Cliente no encontrado');
      }

      const existingVenta = await Venta.findOne({
        $or: [
          { idSale: dato.idSale },
          { externalId: dato.externalId }
        ]
      });

      if (existingVenta) {
        Object.assign(existingVenta, {
          ...dato,
          lastSyncAt: new Date(),
          source: 'webhook'
        });
        await existingVenta.save();
        logger.info('✅ Venta actualizada desde webhook:', { id: existingVenta._id });
      } else {
        const nuevaVenta = new Venta({
          ...dato,
          idSale: dato.idSale || uuidv4(),
          lastSyncAt: new Date(),
          source: 'webhook'
        });
        await nuevaVenta.save();
        logger.info('✅ Venta creada desde webhook:', { id: nuevaVenta._id });
      }
    } catch (error) {
      logger.error('Error procesando venta webhook:', error);
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

    const datoMapeado = {};
    Object.entries(mapeo).forEach(([claveRaw, claveDest]) => {
      if (datoRaw[claveRaw] !== undefined) {
        datoMapeado[claveDest] = datoRaw[claveRaw];
      }
    });

    return datoMapeado;
  }
}

module.exports = new SyncService();
