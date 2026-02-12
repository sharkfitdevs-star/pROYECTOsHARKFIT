import { Prospectos } from '../entities/Prospectos.js';
import { Ventas } from '../entities/Ventas.js';
import { Planes_Servicios } from '../entities/Planes_Servicios.js';
import { Agendamientos } from '../entities/Agendamientos.js';
import { Sucursales } from '../entities/Sucursales.js';
import { Staff } from '../entities/Staff.js';
import { Tareas_RS } from '../entities/Tareas_RS.js';

export default async function generarTareasNPSCruzados(ctx) {
  const { isInServiceRole } = ctx;

  if (!isInServiceRole) {
    return {
      success: false,
      error: 'Esta función solo puede ejecutarse desde un service role'
    };
  }

  // Nuevo mapeo de cruce (RS de X gestiona NPS Cruzados de Y)
  // Clave = sede evaluada/origen (prospecto.sede), Valor = sede del responsable (staff.sede_principal)
  const reglasNPSCruzado = {
    'Nogales': 'Cisterna',
    'Colón': 'Buin',
    'El Bosque': 'Santiago Centro',
    'Cisterna': 'Colón',
    'Buin': 'Nogales',
    'Santiago Centro': 'El Bosque'
  };

  const ahora = new Date();
  const fechaLimite = new Date(ahora);
  fechaLimite.setDate(fechaLimite.getDate() + 2);

  const [sedes, staffList, prospectosNPSOnline, ventasAll, planes, agendamientosAll] = await Promise.all([
    Sucursales.list(),
    Staff.list(),
    Prospectos.filter({ estado_pipeline: 'NPS Online' }),
    Ventas.list('-fecha_venta'),
    Planes_Servicios.list('nombre_plan'),
    Agendamientos.list('-fecha_hora')
  ]);

  const sedeById = new Map();
  (sedes || []).forEach((s) => {
    if (s?.id) sedeById.set(s.id, s);
  });

  const sedeByNombre = new Map();
  (sedes || []).forEach((s) => {
    if (s?.nombre) sedeByNombre.set(s.nombre, s);
  });

  // Mapear staff RS por sede_principal (nombre sede)
  const staffRSBySedeNombre = new Map();
  (staffList || []).forEach((s) => {
    const sedeId = s?.sede_principal;
    const sedeNombre = sedeId ? sedeById.get(sedeId)?.nombre : null;
    if (!sedeNombre) return;
    if (!s?.roles?.includes('RS')) return;
    if (!staffRSBySedeNombre.has(sedeNombre)) staffRSBySedeNombre.set(sedeNombre, s);
  });

  const planById = new Map();
  (planes || []).forEach((p) => {
    if (p?.id) planById.set(p.id, p);
  });

  const ventasByProspecto = new Map();
  (ventasAll || []).forEach((v) => {
    if (!v?.prospecto_id) return;
    const arr = ventasByProspecto.get(v.prospecto_id) || [];
    arr.push(v);
    ventasByProspecto.set(v.prospecto_id, arr);
  });

  const agByProspecto = new Map();
  (agendamientosAll || []).forEach((a) => {
    if (!a?.prospecto_id) return;
    const arr = agByProspecto.get(a.prospecto_id) || [];
    arr.push(a);
    agByProspecto.set(a.prospecto_id, arr);
  });

  const diasEnNpsOnline = (prospecto) => {
    const base = prospecto?.fecha_ingreso_nps || prospecto?.updatedAt;
    const fechaIngreso = base ? new Date(base) : new Date();
    const diffMs = Date.now() - fechaIngreso.getTime();
    const diffHoras = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
    return Math.floor(diffHoras / 24);
  };

  const tieneCompraPlanPrograma = (prospectoId) => {
    const arr = ventasByProspecto.get(prospectoId) || [];
    return arr.some((v) => {
      if (!v?.plan) return false;
      const plan = planById.get(v.plan);
      return plan?.tipo_item === 'Plan' || plan?.tipo_item === 'Programa';
    });
  };

  const getLastAgendamiento = (prospectoId) => {
    const arr = agByProspecto.get(prospectoId) || [];
    if (!arr.length) return null;
    return arr.slice().sort((x, y) => new Date(y.fecha_hora) - new Date(x.fecha_hora))[0];
  };

  let tareasCreadas = 0;
  let omitidasDuplicado = 0;
  let omitidasSinRegla = 0;
  let omitidasSinResponsable = 0;
  let omitidasNoCumple = 0;

  for (const prospecto of prospectosNPSOnline || []) {
    if (!prospecto?.id) continue;

    // Debe cumplir condición de cruzado
    if (diasEnNpsOnline(prospecto) < 2) {
      omitidasNoCumple++;
      continue;
    }

    if (tieneCompraPlanPrograma(prospecto.id)) {
      omitidasNoCumple++;
      continue;
    }

    // Sede origen (evaluada)
    const sedeOrigenNombre = sedeById.get(prospecto.sede)?.nombre;
    if (!sedeOrigenNombre) {
      omitidasSinRegla++;
      continue;
    }

    // Sede responsable según regla
    const sedeResponsableNombre = reglasNPSCruzado[sedeOrigenNombre];
    if (!sedeResponsableNombre) {
      omitidasSinRegla++;
      continue;
    }

    const responsable = staffRSBySedeNombre.get(sedeResponsableNombre);
    if (!responsable?.id) {
      omitidasSinResponsable++;
      continue;
    }

    // Evitar duplicados: una tarea abierta por prospecto
    const existentes = await Tareas_RS.filter({
      tipo: 'nps_cruzado',
      estado: ['pendiente', 'en_proceso']
    });

    const yaExiste = (existentes || []).some((t) => t?.notas?.includes(`Prospecto ID: ${prospecto.id}`));
    if (yaExiste) {
      omitidasDuplicado++;
      continue;
    }

    const lastAg = getLastAgendamiento(prospecto.id);
    const origen = lastAg?.resultado_asistencia === 'No asistió'
      ? 'No asistió'
      : lastAg?.resultado_asistencia === 'Asistió'
      ? 'Asistió'
      : 'Sin dato';

    const sedeOrigenLabel = sedeOrigenNombre;

    await Tareas_RS.create({
      titulo: `NPS Cruzado - ${prospecto.nombre || 'Prospecto'}`,
      descripcion:
        `Realizar gestión de NPS Cruzado a prospecto en NPS Online (+2 días) sin compra de Plan/Programa.\n` +
        `Origen: ${origen}.\n` +
        `Sede origen: ${sedeOrigenLabel}.\n` +
        `WhatsApp: ${prospecto.whatsapp || 'N/A'}.`,
      tipo: 'nps_cruzado',
      prioridad: 'media',
      fecha_limite: fechaLimite.toISOString().split('T')[0],
      estado: 'pendiente',
      responsable: responsable.id,
      sede: sedeByNombre.get(sedeResponsableNombre)?.id,
      notas:
        `Regla cruce: RS ${sedeResponsableNombre} gestiona NPS Cruzado de ${sedeOrigenLabel}. ` +
        `Prospecto ID: ${prospecto.id}`
    });

    tareasCreadas++;
  }

  return {
    success: true,
    tareasCreadas,
    omitidas: {
      duplicado: omitidasDuplicado,
      sin_regla: omitidasSinRegla,
      sin_responsable: omitidasSinResponsable,
      no_cumple: omitidasNoCumple
    },
    mensaje:
      `NPS Cruzados: creadas ${tareasCreadas}. ` +
      `Omitidas (duplicado ${omitidasDuplicado}, sin regla ${omitidasSinRegla}, sin responsable ${omitidasSinResponsable}, no cumple ${omitidasNoCumple}).`
  };
}