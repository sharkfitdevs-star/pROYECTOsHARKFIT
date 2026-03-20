const ReglaAlerta = require('../models/automatizaciones/ReglaAlerta');
const Alerta = require('../models/Alerta');
const Cliente = require('../models/Cliente');
const Venta = require('../models/Venta');

const CATALOGOS_REGLAS = {
  tiposAlerta: [
    'membresia_por_vencer',
    'membresia_vencida',
    'pago_pendiente',
    'cliente_inactivo',
    'cumpleanos_cliente',
    'contrato_por_vencer',
    'evaluacion_pendiente',
    'inasistencia_detectada',
    'stock_bajo',
    'stock_critico',
    'sincronizacion_fallida',
    'importacion_con_errores',
    'kpi_bajo_umbral',
    'kpi_sobre_umbral',
    'tendencia_negativa',
  ],
  prioridades: ['baja', 'media', 'alta', 'urgente', 'critica'],
  frecuencias: ['cada_5_min', 'cada_hora', 'diaria', 'manual'],
  operadores: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in', 'exists'],
};

const PLANTILLAS = [
  {
    nombre: 'Membresias por vencer (7 dias)',
    tipoAlerta: 'membresia_por_vencer',
    prioridad: 'alta',
    frecuencia: 'diaria',
    configuracion: {
      diasAnticipacion: 7,
      tituloPlantilla: 'Membresia por vencer',
      descripcionPlantilla: 'El cliente {{memberName}} vence en {{diasRestantes}} dias',
    },
  },
  {
    nombre: 'Pagos pendientes vencidos',
    tipoAlerta: 'pago_pendiente',
    prioridad: 'alta',
    frecuencia: 'cada_hora',
    configuracion: {
      diasAnticipacion: 0,
      tituloPlantilla: 'Pago pendiente',
      descripcionPlantilla: 'La venta {{idSale}} presenta pago pendiente',
    },
  },
  {
    nombre: 'Clientes inactivos 30 dias',
    tipoAlerta: 'cliente_inactivo',
    prioridad: 'media',
    frecuencia: 'diaria',
    configuracion: {
      diasAnticipacion: 30,
      tituloPlantilla: 'Cliente inactivo',
      descripcionPlantilla: 'El cliente {{memberName}} no presenta actividad reciente',
    },
  },
];

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
    cumpleanos_cliente: 'cumpleanos',
    kpi_bajo_umbral: 'kpi_rendimiento',
    kpi_sobre_umbral: 'kpi_rendimiento',
    sincronizacion_fallida: 'sistema',
    importacion_con_errores: 'sistema',
  };
  return mapa[tipo] || 'otro';
}

function templateString(base, data) {
  let value = String(base || '');
  Object.entries(data || {}).forEach(([k, v]) => {
    value = value.replace(new RegExp(`{{${k}}}`, 'g'), String(v ?? ''));
  });
  return value;
}

class AlertaRulesEngine {
  async listarReglas(filtros = {}) {
    const query = {};
    if (filtros.activa !== undefined) query.activa = filtros.activa;
    if (filtros.frecuencia) query.frecuencia = filtros.frecuencia;
    if (filtros.tipoAlerta) query.tipoAlerta = filtros.tipoAlerta;
    if (filtros.q) query.$text = { $search: filtros.q };
    return ReglaAlerta.find(query).sort({ createdAt: -1 }).lean();
  }

  async evaluarRegla(reglaId, contexto = {}) {
    const regla = await ReglaAlerta.findById(reglaId);
    if (!regla) throw new Error('Regla no encontrada');

    const resultado = await this._evaluarReglaDoc(regla, contexto);
    regla.ultimaEvaluacionAt = new Date();
    regla.ultimoResultado = {
      alertasGeneradas: resultado.alertasGeneradas,
      detalle: resultado.detalle,
      at: new Date(),
    };
    await regla.save();

    return resultado;
  }

  async evaluarPorFrecuencia(frecuencia, contexto = {}) {
    const reglas = await ReglaAlerta.find({ activa: true, frecuencia });
    const resultados = [];

    for (const regla of reglas) {
      const resultado = await this._evaluarReglaDoc(regla, contexto);
      regla.ultimaEvaluacionAt = new Date();
      regla.ultimoResultado = {
        alertasGeneradas: resultado.alertasGeneradas,
        detalle: resultado.detalle,
        at: new Date(),
      };
      await regla.save();
      resultados.push({ reglaId: String(regla._id), nombre: regla.nombre, ...resultado });
    }

    return {
      frecuencia,
      totalReglas: reglas.length,
      resultados,
      totalAlertas: resultados.reduce((acc, r) => acc + r.alertasGeneradas, 0),
    };
  }

  async evaluarTodas(contexto = {}) {
    const reglas = await ReglaAlerta.find({ activa: true });
    const resultados = [];

    for (const regla of reglas) {
      const resultado = await this._evaluarReglaDoc(regla, contexto);
      regla.ultimaEvaluacionAt = new Date();
      regla.ultimoResultado = {
        alertasGeneradas: resultado.alertasGeneradas,
        detalle: resultado.detalle,
        at: new Date(),
      };
      await regla.save();
      resultados.push({ reglaId: String(regla._id), nombre: regla.nombre, ...resultado });
    }

    return {
      totalReglas: reglas.length,
      resultados,
      totalAlertas: resultados.reduce((acc, r) => acc + r.alertasGeneradas, 0),
    };
  }

  async _evaluarReglaDoc(regla, contexto = {}) {
    if (!regla.activa) {
      return { alertasGeneradas: 0, detalle: 'Regla inactiva' };
    }

    let candidatos = [];
    const now = new Date();
    const dias = Number(regla.configuracion?.diasAnticipacion || 0);

    if (regla.tipoAlerta === 'membresia_por_vencer') {
      const limite = new Date(now.getTime() + dias * 24 * 60 * 60 * 1000);
      candidatos = await Cliente.find({
        membershipEndDate: { $gte: now, $lte: limite },
        status: { $in: ['activo', 'prospecto'] },
      })
        .limit(200)
        .lean();
    } else if (regla.tipoAlerta === 'membresia_vencida') {
      candidatos = await Cliente.find({
        membershipEndDate: { $lt: now },
        status: { $in: ['activo', 'prospecto'] },
      })
        .limit(200)
        .lean();
    } else if (regla.tipoAlerta === 'pago_pendiente') {
      const limitePago = new Date(now.getTime() - dias * 24 * 60 * 60 * 1000);
      candidatos = await Venta.find({
        paymentStatus: { $nin: ['Pagado', 'paid', 'PAGO_COMPLETADO'] },
        dueDate: { $lte: limitePago },
      })
        .limit(200)
        .lean();
    } else if (regla.tipoAlerta === 'cliente_inactivo') {
      const limiteInactivo = new Date(now.getTime() - dias * 24 * 60 * 60 * 1000);
      candidatos = await Cliente.find({
        lastUpdate: { $lte: limiteInactivo },
        status: 'activo',
      })
        .limit(200)
        .lean();
    } else {
      const payload = contexto.payload || {};
      if (Object.keys(payload).length > 0) candidatos = [payload];
    }

    const filtrados = (candidatos || []).filter((item) => {
      if (!Array.isArray(regla.condiciones) || regla.condiciones.length === 0) return true;
      return regla.condiciones.every((cond) => {
        const valorActual = getByPath(item, cond.campo);
        return evalCondicion(valorActual, cond.operador, cond.valor);
      });
    });

    let generadas = 0;
    for (const item of filtrados) {
      const entidadId = item.idMember || item.idSale || item._id || 'sistema';
      const uniqueDate = now.toISOString().slice(0, 10);
      const idAlert = `regla_${regla._id}_${entidadId}_${uniqueDate}`;

      const yaExiste = await Alerta.findOne({
        idAlert,
        status: { $in: ['pendiente', 'en_proceso'] },
      }).lean();
      if (yaExiste) continue;

      const dataTemplate = {
        memberName: item.memberName || item.name || 'Cliente',
        idSale: item.idSale || '',
        diasRestantes: item.membershipEndDate ? Math.max(0, Math.ceil((new Date(item.membershipEndDate).getTime() - now.getTime()) / 86400000)) : '',
      };

      const title = templateString(
        regla.configuracion?.tituloPlantilla || `Regla: ${regla.nombre}`,
        dataTemplate
      );
      const description = templateString(
        regla.configuracion?.descripcionPlantilla || `Alerta generada por la regla ${regla.nombre}`,
        dataTemplate
      );

      await Alerta.create({
        idAlert,
        type: mapTipoAlerta(regla.tipoAlerta),
        priority: regla.prioridad || 'media',
        status: 'pendiente',
        title,
        description,
        idMember: item.idMember || null,
        memberName: item.memberName || item.name || null,
        idBranch: item.idBranch || null,
        branchName: item.branchName || null,
        source: 'rules_engine',
        automatic: true,
        alertData: {
          customData: {
            reglaId: String(regla._id),
            reglaNombre: regla.nombre,
            tipoAlerta: regla.tipoAlerta,
          },
        },
      });
      generadas += 1;
    }

    return {
      alertasGeneradas: generadas,
      candidatos: candidatos.length,
      evaluados: filtrados.length,
      detalle: `Evaluados ${filtrados.length} registros`,
    };
  }

  getCatalogos() {
    return CATALOGOS_REGLAS;
  }

  getPlantillas() {
    return PLANTILLAS;
  }

  async estadisticasGenerales() {
    const [total, activas, porFrecuencia] = await Promise.all([
      ReglaAlerta.countDocuments({}),
      ReglaAlerta.countDocuments({ activa: true }),
      ReglaAlerta.aggregate([
        { $group: { _id: '$frecuencia', total: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return {
      total,
      activas,
      inactivas: total - activas,
      porFrecuencia,
    };
  }
}

module.exports = {
  AlertaRulesEngine,
  CATALOGOS_REGLAS,
  PLANTILLAS_REGLAS_ALERTAS: PLANTILLAS,
};
