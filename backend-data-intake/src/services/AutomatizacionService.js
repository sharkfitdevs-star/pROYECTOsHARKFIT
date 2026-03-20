const Automatizacion = require('../models/automatizaciones/Automatizacion');
const LogAutomatizacion = require('../models/automatizaciones/LogAutomatizacion');
const Alerta = require('../models/Alerta');

const CATALOGOS = {
  eventos: [
    'CLIENTE_CREADO',
    'CLIENTE_ACTUALIZADO',
    'CLIENTE_INACTIVO',
    'MEMBRESIA_POR_VENCER',
    'VENTA_CREADA',
    'VENTA_PAGADA',
    'VENTA_VENCIDA',
    'VENTA_CANCELADA',
    'ALERTA_GENERADA',
    'KPI_BAJO_UMBRAL',
    'KPI_SOBRE_UMBRAL',
    'IMPORTACION_COMPLETADA',
    'IMPORTACION_ERROR',
    'SYNC_EVO_COMPLETADO',
    'COLABORADOR_CREADO',
    'COLABORADOR_INACTIVO',
    'CONTRATO_POR_VENCER',
    'EVALUACION_COMPLETADA',
    'STOCK_BAJO',
    'ENTREGA_REALIZADA',
    'COMPRA_REGISTRADA',
  ],
  operadores: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in', 'exists'],
  acciones: ['CREAR_ALERTA', 'EMITIR_EVENTO', 'REGISTRAR_LOG'],
};

function getByPath(obj, path) {
  if (!path) return undefined;
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function evalCondicion(valorActual, operador, valorEsperado) {
  switch (operador) {
    case 'eq':
      return valorActual === valorEsperado;
    case 'neq':
      return valorActual !== valorEsperado;
    case 'gt':
      return Number(valorActual) > Number(valorEsperado);
    case 'gte':
      return Number(valorActual) >= Number(valorEsperado);
    case 'lt':
      return Number(valorActual) < Number(valorEsperado);
    case 'lte':
      return Number(valorActual) <= Number(valorEsperado);
    case 'contains':
      return String(valorActual || '').toLowerCase().includes(String(valorEsperado || '').toLowerCase());
    case 'in':
      return Array.isArray(valorEsperado) ? valorEsperado.includes(valorActual) : false;
    case 'exists':
      return valorEsperado ? valorActual != null : valorActual == null;
    default:
      return false;
  }
}

function mapTipoAlerta(tipo) {
  const mapa = {
    membresia_por_vencer: 'membresia_por_vencer',
    membresia_vencida: 'membresia_vencida',
    pago_pendiente: 'pago_pendiente',
    cliente_inactivo: 'inactividad',
    kpi_bajo_umbral: 'kpi_rendimiento',
    kpi_sobre_umbral: 'kpi_rendimiento',
    sincronizacion_fallida: 'sistema',
    importacion_con_errores: 'sistema',
  };
  return mapa[tipo] || 'otro';
}

class AutomatizacionService {
  constructor(eventBus = null) {
    this.eventBus = eventBus;
    this.subscriptions = new Map();
    this.inicializado = false;
  }

  setEventBus(eventBus) {
    this.eventBus = eventBus;
  }

  async inicializar() {
    await this.recargarSuscripciones();
    this.inicializado = true;
  }

  async recargarSuscripciones() {
    for (const unsubscribe of this.subscriptions.values()) {
      try {
        unsubscribe();
      } catch (_) {
      }
    }
    this.subscriptions.clear();

    if (!this.eventBus || typeof this.eventBus.subscribe !== 'function') {
      return;
    }

    const eventos = await Automatizacion.distinct('evento', { activa: true, archivada: false });
    for (const evento of eventos) {
      const unsubscribe = this.eventBus.subscribe(evento, async (event) => {
        const payload = event?.data || {};
        const contexto = event?.contexto || {};
        await this.procesarEvento(evento, payload, contexto);
      });
      this.subscriptions.set(evento, unsubscribe);
    }
  }

  async listar(filtros = {}) {
    const query = { archivada: { $ne: true } };
    if (filtros.activa !== undefined) query.activa = filtros.activa;
    if (filtros.evento) query.evento = filtros.evento;
    if (filtros.q) query.$text = { $search: filtros.q };

    return Automatizacion.find(query).sort({ createdAt: -1 }).lean();
  }

  evaluarCondiciones(condiciones = [], payload = {}, contexto = {}) {
    if (!Array.isArray(condiciones) || condiciones.length === 0) return true;
    const scope = { ...payload, contexto };
    return condiciones.every((cond) => {
      const valorActual = getByPath(scope, cond.campo);
      return evalCondicion(valorActual, cond.operador, cond.valor);
    });
  }

  async ejecutarAccion(accion, automatizacion, evento, payload, contexto) {
    if (!accion || !accion.tipo) return;

    if (accion.tipo === 'CREAR_ALERTA') {
      const cfg = accion.config || {};
      const alertType = mapTipoAlerta(cfg.tipoAlerta || 'otro');
      const now = new Date();
      const idAlert = `auto_${automatizacion._id}_${evento}_${now.getTime()}`;
      await Alerta.create({
        idAlert,
        type: alertType,
        priority: cfg.prioridad || 'media',
        status: 'pendiente',
        title: cfg.titulo || `Automatizacion: ${automatizacion.nombre}`,
        description: cfg.descripcion || `Evento ${evento} procesado por la automatizacion ${automatizacion.nombre}`,
        idMember: payload.idMember || payload.clienteId || null,
        memberName: payload.memberName || payload.nombre || null,
        idBranch: payload.idBranch || null,
        branchName: payload.branchName || null,
        suggestedActions: Array.isArray(cfg.accionesSugeridas) ? cfg.accionesSugeridas : [],
        source: 'automation_engine',
        automatic: true,
        alertData: {
          customData: {
            automatizacionId: String(automatizacion._id),
            evento,
            payload,
            contexto,
          },
        },
      });
    }

    if (accion.tipo === 'EMITIR_EVENTO' && this.eventBus && typeof this.eventBus.emit === 'function') {
      const cfg = accion.config || {};
      const nombreEvento = cfg.evento || 'ALERTA_GENERADA';
      await this.eventBus.emit(nombreEvento, {
        ...payload,
        automatizacionId: String(automatizacion._id),
        automatizacionNombre: automatizacion.nombre,
      });
    }
  }

  async registrarLog(data) {
    await LogAutomatizacion.create(data);
  }

  async procesarEvento(evento, payload = {}, contexto = {}) {
    const inicio = Date.now();
    const automatizaciones = await Automatizacion.find({
      evento,
      activa: true,
      archivada: false,
    });

    const resultado = {
      evento,
      total: automatizaciones.length,
      ejecutadas: 0,
      omitidas: 0,
      errores: 0,
    };

    for (const automatizacion of automatizaciones) {
      try {
        const cumple = this.evaluarCondiciones(automatizacion.condiciones, payload, contexto);

        if (!cumple) {
          resultado.omitidas += 1;
          await this.registrarLog({
            automatizacionId: automatizacion._id,
            nombreAutomatizacion: automatizacion.nombre,
            evento,
            estado: 'omitida',
            detalle: 'Condiciones no cumplidas',
            contexto,
            payload,
            accionesEjecutadas: 0,
            duracionMs: Date.now() - inicio,
          });
          continue;
        }

        let accionesEjecutadas = 0;
        for (const accion of automatizacion.acciones || []) {
          await this.ejecutarAccion(accion, automatizacion, evento, payload, contexto);
          accionesEjecutadas += 1;
        }

        resultado.ejecutadas += 1;
        automatizacion.ultimaEjecucionAt = new Date();
        automatizacion.ultimoResultado = {
          estado: 'ok',
          detalle: `Acciones ejecutadas: ${accionesEjecutadas}`,
          at: new Date(),
        };
        await automatizacion.save();

        await this.registrarLog({
          automatizacionId: automatizacion._id,
          nombreAutomatizacion: automatizacion.nombre,
          evento,
          estado: 'ejecutada',
          detalle: 'Ejecucion correcta',
          contexto,
          payload,
          accionesEjecutadas,
          duracionMs: Date.now() - inicio,
        });
      } catch (error) {
        resultado.errores += 1;
        await this.registrarLog({
          automatizacionId: automatizacion._id,
          nombreAutomatizacion: automatizacion.nombre,
          evento,
          estado: 'error',
          detalle: 'Error ejecutando automatizacion',
          contexto,
          payload,
          accionesEjecutadas: 0,
          duracionMs: Date.now() - inicio,
          error: {
            mensaje: error.message,
            stack: error.stack || '',
          },
        });

        automatizacion.ultimoResultado = {
          estado: 'error',
          detalle: error.message,
          at: new Date(),
        };
        await automatizacion.save();
      }
    }

    return resultado;
  }

  async ejecutarManualmente(automatizacionId, payload = {}, contexto = {}) {
    const automatizacion = await Automatizacion.findById(automatizacionId);
    if (!automatizacion || automatizacion.archivada) {
      throw new Error('Automatizacion no encontrada');
    }

    return this.procesarEvento(automatizacion.evento, payload, {
      ...contexto,
      ejecucionManual: true,
      automatizacionForzada: String(automatizacionId),
    });
  }

  async probarCondiciones(automatizacionId, payload = {}, contexto = {}) {
    const automatizacion = await Automatizacion.findById(automatizacionId).lean();
    if (!automatizacion || automatizacion.archivada) {
      throw new Error('Automatizacion no encontrada');
    }

    const cumple = this.evaluarCondiciones(automatizacion.condiciones, payload, contexto);
    return { cumple, condiciones: automatizacion.condiciones || [] };
  }

  async estadisticasGenerales() {
    const [total, activas, archivadas, logsUltimoDia] = await Promise.all([
      Automatizacion.countDocuments({}),
      Automatizacion.countDocuments({ activa: true, archivada: false }),
      Automatizacion.countDocuments({ archivada: true }),
      LogAutomatizacion.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
    ]);

    return {
      total,
      activas,
      archivadas,
      logsUltimoDia,
    };
  }

  async logs(automatizacionId, limit = 100) {
    const filter = {};
    if (automatizacionId) filter.automatizacionId = automatizacionId;
    return LogAutomatizacion.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  }

  getCatalogos() {
    return CATALOGOS;
  }
}

module.exports = {
  AutomatizacionService,
  CATALOGOS_AUTOMATIZACIONES: CATALOGOS,
};
