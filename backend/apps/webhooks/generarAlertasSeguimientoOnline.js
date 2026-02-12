import { Seguimiento_Online } from '../entities/Seguimiento_Online.js';
import { Alertas_Renovacion } from '../entities/Alertas_Renovacion.js';
import { Configuracion_Alertas } from '../entities/Configuracion_Alertas.js';
import { Tareas_RS } from '../entities/Tareas_RS.js';
import { Sucursales } from '../entities/Sucursales.js';
import { Clientes } from '../entities/Clientes.js';

export default async function generarAlertasSeguimientoOnline(ctx) {
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

    // Obtener configuración de alertas de seguimiento online activas
    const configuraciones = await Configuracion_Alertas.filter({
      tipo_alerta: 'seguimiento_online',
      activa: true
    });

    const config = configuraciones.length > 0 ? configuraciones[0] : {
      dias_umbral_activacion: 2,
      dias_prioridad_alta: 3,
      dias_critico: 4,
      crear_tarea_automatica: false,
      asignar_a: 'responsable_sede'
    };

    const seguimientos = await Seguimiento_Online.filter({
      estado: ['Seguimiento Online', 'Pendiente']
    });
    
    const alertasCreadas = [];
    const alertasActualizadas = [];
    const tareasCreadas = [];

    for (const seguimiento of seguimientos) {
      const diasVencido = seguimiento.dias_vencido || 0;
      
      // Si umbral es 0, crear tarea inmediatamente cuando está en seguimiento (diasVencido >= 0)
      // Si umbral es mayor a 0, esperar esos días (diasVencido >= umbral)
      // Límite superior: solo procesar hasta 3 días vencidos (después pasa a alerta de renovación)
      const cumpleUmbral = config.dias_umbral_activacion === 0 
        ? diasVencido >= 0 
        : diasVencido >= config.dias_umbral_activacion;

      if (!cumpleUmbral || diasVencido > 3) continue;

      // Verificar si ya existe una alerta activa para este seguimiento
      const alertasExistentes = await Alertas_Renovacion.filter({
        cliente_id: seguimiento.cliente_id,
        tipo_alerta: 'Seguimiento Online',
        estado: ['Pendiente', 'En Proceso']
      });

      const fechaAlerta = new Date(hoy);

      // Determinar prioridad según configuración
      let prioridad = 'Media';
      if (config.dias_critico && diasVencido >= config.dias_critico) {
        prioridad = 'Alta';
      } else if (config.dias_prioridad_alta && diasVencido >= config.dias_prioridad_alta) {
        prioridad = 'Alta';
      }

      if (alertasExistentes.length === 0) {
        // Crear nueva alerta
        const nuevaAlerta = await Alertas_Renovacion.create({
          cliente_id: seguimiento.cliente_id,
          fecha_vencimiento: seguimiento.fecha_vencimiento,
          fecha_alerta: fechaAlerta.toISOString().split('T')[0],
          tipo_alerta: 'Seguimiento Online',
          estado: 'Pendiente',
          prioridad: prioridad,
          dias_vencido: diasVencido,
          sede: seguimiento.sede,
          notas: `Cliente en seguimiento online con ${diasVencido} días vencido. ${seguimiento.fue_contactado ? 'Ya fue contactado.' : 'Pendiente de contacto.'} Alerta generada automáticamente.`
        });

        alertasCreadas.push(nuevaAlerta);

        // Crear tarea automática si está configurado
        if (config.crear_tarea_automatica && seguimiento.sede) {
          const sede = await Sucursales.get(seguimiento.sede);
          if (sede?.responsable_sede) {
            const cliente = await Clientes.get(seguimiento.cliente_id);
            const nuevaTarea = await Tareas_RS.create({
              titulo: `Seguimiento Online: ${cliente?.nombre || seguimiento.cliente_nombre}`,
              descripcion: `Cliente con ${diasVencido} días vencido en seguimiento online. ${seguimiento.fue_contactado ? 'Requiere seguimiento adicional.' : 'Requiere contacto inicial.'}`,
              tipo: 'seguimiento',
              prioridad: prioridad === 'Alta' ? 'alta' : 'media',
              fecha_limite: new Date(hoy.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              estado: 'pendiente',
              responsable: sede.responsable_sede,
              sede: seguimiento.sede,
              cliente: seguimiento.cliente_id,
              notas: `Alerta de seguimiento online generada automáticamente. Vencimiento: ${seguimiento.fecha_vencimiento}`
            });
            tareasCreadas.push(nuevaTarea);
          }
        }
      } else {
        // Actualizar alerta existente si cambió la prioridad o días
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

    return new Response(JSON.stringify({
      success: true,
      alertasCreadas: alertasCreadas.length,
      alertasActualizadas: alertasActualizadas.length,
      tareasCreadas: tareasCreadas.length,
      mensaje: `Proceso completado. ${alertasCreadas.length} alertas de seguimiento online creadas, ${alertasActualizadas.length} actualizadas, ${tareasCreadas.length} tareas creadas.`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generando alertas de seguimiento online:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}