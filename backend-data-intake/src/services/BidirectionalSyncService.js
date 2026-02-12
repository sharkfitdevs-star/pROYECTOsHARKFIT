/**
 * SERVICIO: Sincronización Bidireccional con EVO5
 * Usando Change Streams para detectar cambios en MongoDB
 * y enviarlos automáticamente a EVO5
 */

const axios = require('axios');
const { Cliente, Venta, Usuario, Agendamiento } = require('../models');
const { logger } = require('../utils/logger');

class BidirectionalSyncService {
  constructor() {
    this.evoClient = axios.create({
      baseURL: process.env.EVO_API_URL || 'https://evo-integracao-api.w12app.com.br',
      headers: {
        'Authorization': `Bearer ${process.env.EVO_API_TOKEN}`
      },
      timeout: 15000
    });

    this.isRunning = false;
    this.streams = [];
  }

  /**
   * Iniciar Change Streams para sincronización MongoDB → EVO5
   */
  async iniciar() {
    if (this.isRunning) {
      logger.warn('⚠️  Sync bidireccional ya está corriendo');
      return;
    }

    this.isRunning = true;
    logger.info('🔄 Iniciando sincronización bidireccional MongoDB ↔ EVO5');

    // Watch cambios en Clientes
    this._watchClientes();
    
    // Watch cambios en Ventas
    this._watchVentas();
    
    // Watch cambios en Agendamientos
    this._watchAgendamientos();
  }

  /**
   * Detener Change Streams
   */
  async detener() {
    logger.info('🛑 Deteniendo sincronización bidireccional');
    
    for (const stream of this.streams) {
      await stream.close();
    }
    
    this.streams = [];
    this.isRunning = false;
  }

  /**
   * Watch cambios en Clientes
   * Cuando se crea/actualiza un cliente en MongoDB, enviarlo a EVO5
   */
  _watchClientes() {
    const stream = Cliente.watch();
    this.streams.push(stream);

    stream.on('change', async (change) => {
      try {
        // Solo sincronizar si el cambio NO vino de EVO5 (evitar loops)
        if (change.fullDocument?.source === 'evo') {
          return;
        }

        logger.info(`📝 Cambio detectado en Cliente: ${change.operationType}`);

        switch (change.operationType) {
          case 'insert':
            await this._enviarClienteAEVO5(change.fullDocument, 'crear');
            break;
          
          case 'update':
            await this._enviarClienteAEVO5(change.fullDocument, 'actualizar');
            break;
          
          case 'delete':
            await this._eliminarClienteEnEVO5(change.documentKey._id);
            break;
        }
      } catch (error) {
        logger.error('❌ Error procesando cambio de Cliente:', error);
        // TODO: Encolar para reintento
      }
    });

    stream.on('error', (error) => {
      logger.error('❌ Error en Change Stream de Clientes:', error);
    });

    logger.info('👁️  Watching cambios en Clientes');
  }

  /**
   * Watch cambios en Ventas
   */
  _watchVentas() {
    const stream = Venta.watch();
    this.streams.push(stream);

    stream.on('change', async (change) => {
      try {
        if (change.fullDocument?.source === 'evo') {
          return;
        }

        logger.info(`💰 Cambio detectado en Venta: ${change.operationType}`);

        switch (change.operationType) {
          case 'insert':
            await this._enviarVentaAEVO5(change.fullDocument, 'crear');
            break;
          
          case 'update':
            await this._enviarVentaAEVO5(change.fullDocument, 'actualizar');
            break;
        }
      } catch (error) {
        logger.error('❌ Error procesando cambio de Venta:', error);
      }
    });

    logger.info('👁️  Watching cambios en Ventas');
  }

  /**
   * Watch cambios en Agendamientos
   */
  _watchAgendamientos() {
    const stream = Agendamiento.watch();
    this.streams.push(stream);

    stream.on('change', async (change) => {
      try {
        if (change.fullDocument?.source === 'evo') {
          return;
        }

        logger.info(`📅 Cambio detectado en Agendamiento: ${change.operationType}`);

        switch (change.operationType) {
          case 'insert':
            await this._enviarAgendamientoAEVO5(change.fullDocument, 'crear');
            break;
          
          case 'update':
            await this._enviarAgendamientoAEVO5(change.fullDocument, 'actualizar');
            break;
          
          case 'delete':
            await this._cancelarAgendamientoEnEVO5(change.documentKey._id);
            break;
        }
      } catch (error) {
        logger.error('❌ Error procesando cambio de Agendamiento:', error);
      }
    });

    logger.info('👁️  Watching cambios en Agendamientos');
  }

  /**
   * Enviar Cliente a EVO5
   */
  async _enviarClienteAEVO5(cliente, accion) {
    try {
      const payload = this._mapearClienteParaEVO5(cliente);

      let response;
      if (accion === 'crear') {
        response = await this.evoClient.post('/members', payload);
        logger.info(`✅ Cliente creado en EVO5: ${response.data.id}`);
        
        // Actualizar en MongoDB con el ID de EVO5
        await Cliente.findByIdAndUpdate(cliente._id, {
          externalId: response.data.id,
          lastSyncAt: new Date()
        });
      } else {
        response = await this.evoClient.put(`/members/${cliente.externalId}`, payload);
        logger.info(`✅ Cliente actualizado en EVO5: ${cliente.externalId}`);
        
        await Cliente.findByIdAndUpdate(cliente._id, {
          lastSyncAt: new Date()
        });
      }

      return response.data;
    } catch (error) {
      logger.error(`❌ Error enviando Cliente a EVO5:`, error.message);
      throw error;
    }
  }

  /**
   * Enviar Venta a EVO5
   */
  async _enviarVentaAEVO5(venta, accion) {
    try {
      const payload = this._mapearVentaParaEVO5(venta);

      let response;
      if (accion === 'crear') {
        response = await this.evoClient.post('/sales', payload);
        logger.info(`✅ Venta creada en EVO5: ${response.data.id}`);
        
        await Venta.findByIdAndUpdate(venta._id, {
          externalId: response.data.id,
          lastSyncAt: new Date()
        });
      } else {
        response = await this.evoClient.put(`/sales/${venta.externalId}`, payload);
        logger.info(`✅ Venta actualizada en EVO5: ${venta.externalId}`);
        
        await Venta.findByIdAndUpdate(venta._id, {
          lastSyncAt: new Date()
        });
      }

      return response.data;
    } catch (error) {
      logger.error(`❌ Error enviando Venta a EVO5:`, error.message);
      throw error;
    }
  }

  /**
   * Enviar Agendamiento a EVO5
   */
  async _enviarAgendamientoAEVO5(agendamiento, accion) {
    try {
      const payload = this._mapearAgendamientoParaEVO5(agendamiento);

      let response;
      if (accion === 'crear') {
        response = await this.evoClient.post('/appointments', payload);
        logger.info(`✅ Agendamiento creado en EVO5: ${response.data.id}`);
        
        await Agendamiento.findByIdAndUpdate(agendamiento._id, {
          externalId: response.data.id,
          lastSyncAt: new Date()
        });
      } else {
        response = await this.evoClient.put(`/appointments/${agendamiento.externalId}`, payload);
        logger.info(`✅ Agendamiento actualizado en EVO5: ${agendamiento.externalId}`);
        
        await Agendamiento.findByIdAndUpdate(agendamiento._id, {
          lastSyncAt: new Date()
        });
      }

      return response.data;
    } catch (error) {
      logger.error(`❌ Error enviando Agendamiento a EVO5:`, error.message);
      throw error;
    }
  }

  /**
   * Mapear Cliente MongoDB → EVO5 format
   */
  _mapearClienteParaEVO5(cliente) {
    return {
      name: cliente.name,
      email: cliente.email,
      cellPhone: cliente.cellPhone,
      birthDate: cliente.birthDate,
      cpf: cliente.cpf,
      sex: cliente.sex,
      idBranch: cliente.idBranch,
      status: cliente.status === 'activo' ? 'active' : 'inactive'
      // Agregar más campos según API de EVO5
    };
  }

  /**
   * Mapear Venta MongoDB → EVO5 format
   */
  _mapearVentaParaEVO5(venta) {
    return {
      idMember: venta.idMember,
      idBranch: venta.idBranch,
      amount: venta.amount,
      totalAmount: venta.totalAmount,
      saleDate: venta.saleDate,
      paymentStatus: venta.paymentStatus,
      paymentMethod: venta.paymentMethod
      // Agregar más campos según API de EVO5
    };
  }

  /**
   * Mapear Agendamiento MongoDB → EVO5 format
   */
  _mapearAgendamientoParaEVO5(agendamiento) {
    return {
      idMember: agendamiento.idMember,
      idBranch: agendamiento.idBranch,
      appointmentType: agendamiento.appointmentType,
      startDate: agendamiento.startDate,
      endDate: agendamiento.endDate,
      status: agendamiento.status
      // Agregar más campos según API de EVO5
    };
  }

  /**
   * Eliminar Cliente en EVO5
   */
  async _eliminarClienteEnEVO5(clienteId) {
    try {
      const cliente = await Cliente.findById(clienteId);
      if (cliente?.externalId) {
        await this.evoClient.delete(`/members/${cliente.externalId}`);
        logger.info(`✅ Cliente eliminado en EVO5: ${cliente.externalId}`);
      }
    } catch (error) {
      logger.error('❌ Error eliminando Cliente en EVO5:', error);
    }
  }

  /**
   * Cancelar Agendamiento en EVO5
   */
  async _cancelarAgendamientoEnEVO5(agendamientoId) {
    try {
      const agendamiento = await Agendamiento.findById(agendamientoId);
      if (agendamiento?.externalId) {
        await this.evoClient.put(`/appointments/${agendamiento.externalId}`, {
          status: 'cancelled'
        });
        logger.info(`✅ Agendamiento cancelado en EVO5: ${agendamiento.externalId}`);
      }
    } catch (error) {
      logger.error('❌ Error cancelando Agendamiento en EVO5:', error);
    }
  }
}

module.exports = new BidirectionalSyncService();
