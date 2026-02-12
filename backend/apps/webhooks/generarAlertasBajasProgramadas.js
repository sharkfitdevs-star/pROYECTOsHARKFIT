import { Bajas_Programadas } from '../entities/Bajas_Programadas.js';
import { Alertas_Renovacion } from '../entities/Alertas_Renovacion.js';
import { Configuracion_Alertas } from '../entities/Configuracion_Alertas.js';
import { Tareas_RS } from '../entities/Tareas_RS.js';
import { Sucursales } from '../entities/Sucursales.js';

export default async function generarAlertasBajasProgramadas(ctx) {
  const { isInServiceRole } = ctx;

  if (!isInServiceRole) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Obtener configuración de alertas de bajas programadas activas
    const configuraciones = await Configuracion_Alertas.filter({
      tipo_alerta: 'baja_programada',
      activa: true
    });

    const config = configuraciones.length > 0 ? configuraciones[0] : {
      dias_umbral_activacion: 2, // 2 días antes de la fecha de baja
      dias_prioridad_alta: 1,
      dias_critico: 0, // día de la baja
      crear_tarea_automatica: true, // Por defecto crear tarea para bajas
      asignar_a: 'responsable_sede'
    };

    const bajasProgramadas = await Bajas_Programadas.filter({
      estado_gestion: ['programada', 'en_gestion']
    });
    
    const alertasCreadas = [];
    const alertasActualizadas = [];
    const tareasCreadas = [];

    for (const baja of bajasProgramadas) {
      if (!baja.fecha_baja_programada) continue;

      const fechaBaja = new Date(baja.fecha_baja_programada);
      fechaBaja.setHours(0, 0, 0, 0);

      // Calcular días hasta la baja (negativo = ya pasó, positivo = falta)
      const diasHastaBaja = Math.floor((fechaBaja - hoy) / (1000 * 60 * 60 * 24));
      
      // Si umbral es 0, crear tarea inmediatamente cuando se programa la baja (cualquier diasHastaBaja)
      // Si umbral es mayor a 0, solo procesar cuando faltan X días o menos (diasHastaBaja <= umbral)
      const cumpleUmbral = config.dias_umbral_activacion === 0 
        ? true 
        : diasHastaBaja <= config.dias_umbral_activacion;

      if (!cumpleUmbral) continue;

      // Verificar si ya existe una alerta activa para esta baja
      const alertasExistentes = await Alertas_Renovacion.filter({
        cliente_id: baja.cliente_id,
        tipo_alerta: 'Baja Programada',
        estado: ['Pendiente', 'En Proceso']
      });

      const fechaAlerta = new Date(hoy);

      // Determinar prioridad según días hasta la baja
      let prioridad = 'Media';
      if (diasHastaBaja <= config.dias_critico) {
        prioridad = 'Alta';
      } else if (diasHastaBaja <= config.dias_prioridad_alta) {
        prioridad = 'Alta';
      }

      if (alertasExistentes.length === 0) {
        // Crear nueva alerta
        const nuevaAlerta = await Alertas_Renovacion.create({
          cliente_id: baja.cliente_id,
          fecha_vencimiento: baja.fecha_baja_programada,
          fecha_alerta: fechaAlerta.toISOString().split('T')[0],
          tipo_alerta: 'Baja Programada',
          estado: 'Pendiente',
          prioridad: prioridad,
          dias_vencido: Math.abs(diasHastaBaja),
          sede: baja.sede,
          notas: `Baja programada para ${baja.fecha_baja_programada} (${diasHastaBaja >= 0 ? `en ${diasHastaBaja} días` : `hace ${Math.abs(diasHastaBaja)} días`}). Motivo: ${baja.motivo_baja}. ${baja.detalle_motivo || ''}. Alerta generada automáticamente.`
        });

        alertasCreadas.push(nuevaAlerta);

        // Crear tarea automática si está configurado (por defecto sí para bajas)
        if (config.crear_tarea_automatica && baja.sede) {
          const sede = await Sucursales.get(baja.sede);
          if (sede?.responsable_sede) {
            const nuevaTarea = await Tareas_RS.create({
              titulo: `Contactar Baja Programada: ${baja.cliente_nombre}`,
              descripcion: `Baja programada para ${baja.fecha_baja_programada} (${diasHastaBaja >= 0 ? `en ${diasHastaBaja} días` : `hace ${Math.abs(diasHastaBaja)} días`}). Motivo: ${baja.motivo_baja}. Requiere gestión de retención urgente.`,
              tipo: 'baja_programada', // CAMBIO: Tipo específico para identificar en el dashboard
              prioridad: diasHastaBaja <= 0 ? 'urgente' : prioridad === 'Alta' ? 'alta' : 'media',
              fecha_limite: diasHastaBaja > 0 ? baja.fecha_baja_programada : new Date(hoy.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              estado: 'pendiente',
              responsable: sede.responsable_sede,
              sede: baja.sede,
              cliente: baja.cliente_id,
              notas: `Alerta de baja programada generada automáticamente. Baja programada ID: ${baja.id}. Plan actual: ${baja.plan_actual || 'N/A'}`
            });
            tareasCreadas.push(nuevaTarea);
          }
        }
      } else {
        // Actualizar alerta existente si cambió la prioridad o días
        const alertaExistente = alertasExistentes[0];
        if (alertaExistente.dias_vencido !== Math.abs(diasHastaBaja) || alertaExistente.prioridad !== prioridad) {
          await Alertas_Renovacion.update(alertaExistente.id, {
            dias_vencido: Math.abs(diasHastaBaja),
            prioridad: prioridad,
            notas: `${alertaExistente.notas || ''}\nActualizado: ${diasHastaBaja >= 0 ? `Faltan ${diasHastaBaja} días` : `Pasó hace ${Math.abs(diasHastaBaja)} días`}.`
          });
          alertasActualizadas.push(alertaExistente);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      alertasCreadas: alertasCreadas.length,
      alertasActualizadas: alertasActualizadas.length,
      tareasCreadas: tareasCreadas.length,
      mensaje: `Proceso completado. ${alertasCreadas.length} alertas de bajas programadas creadas, ${alertasActualizadas.length} actualizadas, ${tareasCreadas.length} tareas creadas.`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generando alertas de bajas programadas:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}