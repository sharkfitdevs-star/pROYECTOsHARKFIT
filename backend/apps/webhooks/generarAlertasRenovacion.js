import { Clientes } from '../entities/Clientes.js';
import { Alertas_Renovacion } from '../entities/Alertas_Renovacion.js';
import { Seguimiento_Online } from '../entities/Seguimiento_Online.js';
import { Ciclos_Retencion } from '../entities/Ciclos_Retencion.js';
import { Seguimiento_Renovaciones } from '../entities/Seguimiento_Renovaciones.js';
import { Configuracion_Alertas } from '../entities/Configuracion_Alertas.js';
import { Tareas_RS } from '../entities/Tareas_RS.js';
import { Sucursales } from '../entities/Sucursales.js';

export default async function generarAlertasRenovacion(ctx) {
  const { isInServiceRole } = ctx;

  // Solo permitir ejecución desde service role (automatización)
  if (!isInServiceRole) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Obtener configuración de alertas de renovación activas
    const configuraciones = await Configuracion_Alertas.filter({
      tipo_alerta: 'renovacion',
      activa: true
    });

    // Si no hay configuraciones activas, usar valores por defecto
    const config = configuraciones.length > 0 ? configuraciones[0] : {
      dias_umbral_activacion: 3, // 3 días post vencimiento
      dias_prioridad_alta: 7,
      dias_critico: 14,
      crear_tarea_automatica: true, // CAMBIO: Activado por defecto
      asignar_a: 'responsable_sede'
    };

    // Obtener todos los clientes
    const clientes = await Clientes.list();
    
    const alertasCreadas = [];
    const alertasActualizadas = [];
    const tareasCreadas = [];

    for (const cliente of clientes) {
      if (!cliente.fecha_fin_plan_actual) continue;

      const fechaFin = new Date(cliente.fecha_fin_plan_actual);
      fechaFin.setHours(0, 0, 0, 0);

      const diasVencido = Math.floor((hoy - fechaFin) / (1000 * 60 * 60 * 24));

      // Usar umbral de configuración
      // Si umbral es 0, crear tarea inmediatamente cuando vence (diasVencido >= 0)
      // Si umbral es mayor a 0, esperar esos días (diasVencido > umbral)
      const cumpleUmbral = config.dias_umbral_activacion === 0 
        ? diasVencido >= 0 
        : diasVencido > config.dias_umbral_activacion;

      if (cumpleUmbral) {
        // Verificar si el cliente renovó recientemente (buscar ciclos de retención tipo "Renovó")
        const ciclosRecientes = await Ciclos_Retencion.filter({
          cliente_id: cliente.id,
          tipo_evento: 'Renovó'
        }, '-fecha_evento', 1);

        // Si renovó recientemente (últimos 7 días), no crear alerta
        if (ciclosRecientes.length > 0) {
          const ultimaRenovacion = new Date(ciclosRecientes[0].fecha_evento);
          const diasDesdeRenovacion = Math.floor((hoy - ultimaRenovacion) / (1000 * 60 * 60 * 24));
          if (diasDesdeRenovacion <= 7) {
            continue;
          }
        }

        // Verificar si ya existe una alerta activa para este cliente
        const alertasExistentes = await Alertas_Renovacion.filter({
          cliente_id: cliente.id,
          estado: ['Pendiente', 'En Proceso']
        });

        const fechaAlerta = new Date(fechaFin);
        fechaAlerta.setDate(fechaAlerta.getDate() + config.dias_umbral_activacion);

        // Determinar prioridad según configuración
        let prioridad = 'Media';
        if (config.dias_critico && diasVencido > config.dias_critico) {
          prioridad = 'Crítica';
        } else if (config.dias_prioridad_alta && diasVencido > config.dias_prioridad_alta) {
          prioridad = 'Alta';
        }

        if (alertasExistentes.length === 0) {
          // Crear nueva alerta
          const nuevaAlerta = await Alertas_Renovacion.create({
            cliente_id: cliente.id,
            fecha_vencimiento: cliente.fecha_fin_plan_actual,
            fecha_alerta: fechaAlerta.toISOString().split('T')[0],
            tipo_alerta: 'Llamada Pendiente',
            estado: 'Pendiente',
            prioridad: prioridad,
            dias_vencido: diasVencido,
            sede: cliente.sede,
            notas: `Cliente con ${diasVencido} días vencido. Alerta generada automáticamente.`
          });

          alertasCreadas.push(nuevaAlerta);

          // Actualizar estado en Seguimiento_Online a "Pasó a Alerta"
          const seguimientos = await Seguimiento_Online.filter({
            cliente_id: cliente.id,
            estado: ['Seguimiento Online', 'Contactado']
          });

          for (const seg of seguimientos) {
            await Seguimiento_Online.update(seg.id, {
              estado: 'Pasó a Alerta',
              dias_vencido: diasVencido
            });
          }

          // Crear tarea automática si está configurado
          if (config.crear_tarea_automatica && cliente.sede) {
            const sede = await Sucursales.get(cliente.sede);
            if (sede?.responsable_sede) {
              const nuevaTarea = await Tareas_RS.create({
                titulo: `Contactar Cliente por Renovación: ${cliente.nombre}`,
                descripcion: `Cliente con ${diasVencido} días vencido. Requiere contacto urgente para renovación. Plan: ${cliente.plan_actual?.nombre_plan || 'N/A'}`,
                tipo: 'renovacion_vencida', // CAMBIO: Tipo específico para identificar en el dashboard
                prioridad: prioridad === 'Crítica' ? 'urgente' : prioridad === 'Alta' ? 'alta' : 'media',
                fecha_limite: new Date(hoy.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                estado: 'pendiente',
                responsable: sede.responsable_sede,
                sede: cliente.sede,
                cliente: cliente.id,
                notas: `Alerta generada automáticamente. Cliente vencido desde ${cliente.fecha_fin_plan_actual}. Alerta ID: ${nuevaAlerta.id}`
              });
              tareasCreadas.push(nuevaTarea);
            }
          }
        } else {
          // Actualizar alerta existente si cambió la prioridad o días vencido
          const alertaExistente = alertasExistentes[0];
          if (alertaExistente.dias_vencido !== diasVencido || alertaExistente.prioridad !== prioridad) {
            await Alertas_Renovacion.update(alertaExistente.id, {
              dias_vencido: diasVencido,
              prioridad: prioridad,
              notas: `${alertaExistente.notas || ''}\nActualizado: ${diasVencido} días vencido.`
            });
            alertasActualizadas.push(alertaExistente);
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      alertasCreadas: alertasCreadas.length,
      alertasActualizadas: alertasActualizadas.length,
      tareasCreadas: tareasCreadas.length,
      mensaje: `Proceso completado. ${alertasCreadas.length} alertas creadas, ${alertasActualizadas.length} alertas actualizadas, ${tareasCreadas.length} tareas creadas.`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generando alertas de renovación:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}