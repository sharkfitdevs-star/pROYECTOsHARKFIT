import { Tarjetas_Registradas } from '../entities/Tarjetas_Registradas.js';
import { Alertas_Renovacion } from '../entities/Alertas_Renovacion.js';
import { Configuracion_Alertas } from '../entities/Configuracion_Alertas.js';
import { Tareas_RS } from '../entities/Tareas_RS.js';
import { Sucursales } from '../entities/Sucursales.js';
import { Clientes } from '../entities/Clientes.js';

export default async function generarAlertasTarjetas(ctx) {
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

    // Obtener configuración de alertas de tarjetas activas
    const configuraciones = await Configuracion_Alertas.filter({
      tipo_alerta: 'tarjeta_pendiente',
      activa: true
    });

    const config = configuraciones.length > 0 ? configuraciones[0] : {
      dias_umbral_activacion: 2, // 2 intentos fallidos
      dias_prioridad_alta: 4,
      dias_critico: 6,
      crear_tarea_automatica: false,
      asignar_a: 'responsable_sede'
    };

    const tarjetas = await Tarjetas_Registradas.filter({
      estado: ['Pendiente', 'Fallida']
    });
    
    const alertasCreadas = [];
    const alertasActualizadas = [];
    const tareasCreadas = [];

    for (const tarjeta of tarjetas) {
      const intentos = tarjeta.intentos || 0;
      
      // Si umbral es 0, crear tarea inmediatamente cuando hay tarjeta pendiente/fallida (intentos >= 0)
      // Si umbral es mayor a 0, esperar esos intentos (intentos >= umbral)
      const cumpleUmbral = config.dias_umbral_activacion === 0 
        ? intentos >= 0 
        : intentos >= config.dias_umbral_activacion;

      if (!cumpleUmbral) continue;

      // Verificar si ya existe una alerta activa para esta tarjeta
      const alertasExistentes = await Alertas_Renovacion.filter({
        cliente_id: tarjeta.cliente,
        tipo_alerta: 'Tarjeta Pendiente',
        estado: ['Pendiente', 'En Proceso']
      });

      const fechaAlerta = new Date(hoy);

      // Determinar prioridad según configuración (basado en intentos)
      let prioridad = 'Media';
      if (config.dias_critico && intentos >= config.dias_critico) {
        prioridad = 'Alta';
      } else if (config.dias_prioridad_alta && intentos >= config.dias_prioridad_alta) {
        prioridad = 'Alta';
      }

      if (alertasExistentes.length === 0) {
        // Crear nueva alerta
        const nuevaAlerta = await Alertas_Renovacion.create({
          cliente_id: tarjeta.cliente,
          fecha_vencimiento: tarjeta.fecha_registro,
          fecha_alerta: fechaAlerta.toISOString().split('T')[0],
          tipo_alerta: 'Tarjeta Pendiente',
          estado: 'Pendiente',
          prioridad: prioridad,
          dias_vencido: intentos,
          sede: tarjeta.sede,
          notas: `Tarjeta con ${intentos} intentos fallidos. Estado: ${tarjeta.estado}. ${tarjeta.motivo_falla ? `Motivo: ${tarjeta.motivo_falla}` : ''}. Alerta generada automáticamente.`
        });

        alertasCreadas.push(nuevaAlerta);

        // Crear tarea automática si está configurado
        if (config.crear_tarea_automatica && tarjeta.sede) {
          const sede = await Sucursales.get(tarjeta.sede);
          if (sede?.responsable_sede) {
            const cliente = await Clientes.get(tarjeta.cliente);
            const nuevaTarea = await Tareas_RS.create({
              titulo: `Tarjeta Pendiente: ${cliente?.nombre || 'Cliente'}`,
              descripcion: `Tarjeta con ${intentos} intentos fallidos. ${tarjeta.motivo_falla ? `Motivo: ${tarjeta.motivo_falla}` : ''}. Requiere gestión urgente.`,
              tipo: 'administrativa',
              prioridad: prioridad === 'Alta' ? 'alta' : 'media',
              fecha_limite: new Date(hoy.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              estado: 'pendiente',
              responsable: sede.responsable_sede,
              sede: tarjeta.sede,
              cliente: tarjeta.cliente,
              notas: `Alerta de tarjeta pendiente generada automáticamente. Tipo: ${tarjeta.tipo_tarjeta || 'N/A'}`
            });
            tareasCreadas.push(nuevaTarea);
          }
        }
      } else {
        // Actualizar alerta existente si cambió la prioridad o intentos
        const alertaExistente = alertasExistentes[0];
        if (alertaExistente.dias_vencido !== intentos || alertaExistente.prioridad !== prioridad) {
          await Alertas_Renovacion.update(alertaExistente.id, {
            dias_vencido: intentos,
            prioridad: prioridad,
            notas: `${alertaExistente.notas || ''}\nActualizado: ${intentos} intentos fallidos.`
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
      mensaje: `Proceso completado. ${alertasCreadas.length} alertas de tarjetas creadas, ${alertasActualizadas.length} actualizadas, ${tareasCreadas.length} tareas creadas.`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generando alertas de tarjetas:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}