import { Clientes_Riesgo } from '../entities/Clientes_Riesgo.js';
import { Alertas_Renovacion } from '../entities/Alertas_Renovacion.js';
import { Configuracion_Alertas } from '../entities/Configuracion_Alertas.js';
import { Tareas_RS } from '../entities/Tareas_RS.js';
import { Sucursales } from '../entities/Sucursales.js';
import { Clientes } from '../entities/Clientes.js';

export default async function generarAlertasClientesRiesgo(ctx) {
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

    // Obtener configuración de alertas de clientes en riesgo activas
    const configuraciones = await Configuracion_Alertas.filter({
      tipo_alerta: 'cliente_riesgo',
      activa: true
    });

    const config = configuraciones.length > 0 ? configuraciones[0] : {
      dias_umbral_activacion: 0, // Umbral 0 = tarea inmediata
      dias_prioridad_alta: 7,
      dias_critico: 14,
      crear_tarea_automatica: true, // CAMBIO: Activado por defecto
      asignar_a: 'responsable_sede'
    };

    const clientesRiesgo = await Clientes_Riesgo.filter({
      estado: ['Identificado', 'En gestión', 'Contactado']
    });
    
    const alertasCreadas = [];
    const alertasActualizadas = [];
    const tareasCreadas = [];

    for (const clienteRiesgo of clientesRiesgo) {
      // Calcular días sin gestión
      const fechaIdentificacion = new Date(clienteRiesgo.fecha_identificacion);
      const diasSinGestion = Math.floor((hoy - fechaIdentificacion) / (1000 * 60 * 60 * 24));
      
      // Si umbral es 0, crear tarea inmediatamente cuando se identifica (diasSinGestion >= 0)
      // Si umbral es mayor a 0, esperar esos días (diasSinGestion >= umbral)
      const cumpleUmbral = config.dias_umbral_activacion === 0 
        ? diasSinGestion >= 0 
        : diasSinGestion >= config.dias_umbral_activacion;

      if (!cumpleUmbral) continue;

      // Verificar si ya existe una alerta activa para este cliente en riesgo
      const alertasExistentes = await Alertas_Renovacion.filter({
        cliente_id: clienteRiesgo.cliente_id,
        tipo_alerta: 'Cliente en Riesgo',
        estado: ['Pendiente', 'En Proceso']
      });

      const fechaAlerta = new Date(hoy);

      // Determinar prioridad según configuración y nivel de riesgo
      let prioridad = 'Media';
      if (clienteRiesgo.nivel_riesgo === 'Crítico' || (config.dias_critico && diasSinGestion > config.dias_critico)) {
        prioridad = 'Alta';
      } else if (clienteRiesgo.nivel_riesgo === 'Alto' || (config.dias_prioridad_alta && diasSinGestion > config.dias_prioridad_alta)) {
        prioridad = 'Alta';
      }

      if (alertasExistentes.length === 0) {
        // Crear nueva alerta
        const nuevaAlerta = await Alertas_Renovacion.create({
          cliente_id: clienteRiesgo.cliente_id,
          fecha_vencimiento: clienteRiesgo.fecha_identificacion,
          fecha_alerta: fechaAlerta.toISOString().split('T')[0],
          tipo_alerta: 'Cliente en Riesgo',
          estado: 'Pendiente',
          prioridad: prioridad,
          dias_vencido: diasSinGestion,
          sede: clienteRiesgo.sede_id,
          notas: `Cliente en riesgo ${clienteRiesgo.nivel_riesgo}. Motivo: ${clienteRiesgo.motivo_riesgo}. ${diasSinGestion} días sin gestión. ${clienteRiesgo.detalle_motivo || ''}. Alerta generada automáticamente.`
        });

        alertasCreadas.push(nuevaAlerta);

        // Crear tarea automática si está configurado
        if (config.crear_tarea_automatica && clienteRiesgo.sede_id) {
          const sede = await Sucursales.get(clienteRiesgo.sede_id);
          if (sede?.responsable_sede) {
            const cliente = await Clientes.get(clienteRiesgo.cliente_id);
            const nuevaTarea = await Tareas_RS.create({
              titulo: `Cliente en Riesgo ${clienteRiesgo.nivel_riesgo}: ${cliente?.nombre || clienteRiesgo.cliente_nombre}`,
              descripcion: `Cliente en riesgo ${clienteRiesgo.nivel_riesgo}. Motivo: ${clienteRiesgo.motivo_riesgo}. ${diasSinGestion} días sin gestión. Requiere atención urgente.`,
              tipo: 'cliente_riesgo', // CAMBIO: Tipo específico para identificar en el dashboard
              prioridad: clienteRiesgo.nivel_riesgo === 'Crítico' ? 'urgente' : prioridad === 'Alta' ? 'alta' : 'media',
              fecha_limite: new Date(hoy.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              estado: 'pendiente',
              responsable: sede.responsable_sede,
              sede: clienteRiesgo.sede_id,
              cliente: clienteRiesgo.cliente_id,
              notas: `Alerta de cliente en riesgo generada automáticamente. Cliente Riesgo ID: ${clienteRiesgo.id}. Detalle: ${clienteRiesgo.detalle_motivo || 'N/A'}`
            });
            tareasCreadas.push(nuevaTarea);
          }
        }
      } else {
        // Actualizar alerta existente si cambió la prioridad o días
        const alertaExistente = alertasExistentes[0];
        if (alertaExistente.dias_vencido !== diasSinGestion || alertaExistente.prioridad !== prioridad) {
          await Alertas_Renovacion.update(alertaExistente.id, {
            dias_vencido: diasSinGestion,
            prioridad: prioridad,
            notas: `${alertaExistente.notas || ''}\nActualizado: ${diasSinGestion} días sin gestión. Nivel: ${clienteRiesgo.nivel_riesgo}`
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
      mensaje: `Proceso completado. ${alertasCreadas.length} alertas de clientes en riesgo creadas, ${alertasActualizadas.length} actualizadas, ${tareasCreadas.length} tareas creadas.`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generando alertas de clientes en riesgo:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}