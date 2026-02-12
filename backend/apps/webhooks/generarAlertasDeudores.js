import { Deudores } from '../entities/Deudores.js';
import { Alertas_Renovacion } from '../entities/Alertas_Renovacion.js';
import { Configuracion_Alertas } from '../entities/Configuracion_Alertas.js';
import { Tareas_RS } from '../entities/Tareas_RS.js';
import { Sucursales } from '../entities/Sucursales.js';
import { Clientes } from '../entities/Clientes.js';

export default async function generarAlertasDeudores(ctx) {
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

    // Obtener configuración de alertas de deudores activas
    const configuraciones = await Configuracion_Alertas.filter({
      tipo_alerta: 'deudor',
      activa: true
    });

    const config = configuraciones.length > 0 ? configuraciones[0] : {
      dias_umbral_activacion: 2, // 2 días en estado deudor
      dias_prioridad_alta: 15,
      dias_critico: 30,
      crear_tarea_automatica: true, // CAMBIO: Activado por defecto
      asignar_a: 'responsable_sede'
    };

    const deudores = await Deudores.filter({
      estado_gestion: ['Pendiente', 'En gestión', 'Contactado']
    });
    
    const alertasCreadas = [];
    const alertasActualizadas = [];
    const tareasCreadas = [];

    for (const deudor of deudores) {
      // Si umbral es 0, crear tarea inmediatamente cuando hay atraso (dias_atraso >= 0)
      // Si umbral es mayor a 0, esperar esos días (dias_atraso >= umbral)
      const cumpleUmbral = config.dias_umbral_activacion === 0 
        ? deudor.dias_atraso >= 0 
        : deudor.dias_atraso >= config.dias_umbral_activacion;

      if (!deudor.dias_atraso || !cumpleUmbral) continue;

      // Verificar si ya existe una alerta activa para este deudor
      const alertasExistentes = await Alertas_Renovacion.filter({
        cliente_id: deudor.cliente,
        tipo_alerta: 'Deudor',
        estado: ['Pendiente', 'En Proceso']
      });

      const fechaAlerta = new Date(hoy);

      // Determinar prioridad según configuración
      let prioridad = 'Media';
      if (config.dias_critico && deudor.dias_atraso > config.dias_critico) {
        prioridad = 'Alta';
      } else if (config.dias_prioridad_alta && deudor.dias_atraso > config.dias_prioridad_alta) {
        prioridad = 'Alta';
      }

      if (alertasExistentes.length === 0) {
        // Crear nueva alerta
        const nuevaAlerta = await Alertas_Renovacion.create({
          cliente_id: deudor.cliente,
          fecha_vencimiento: deudor.fecha_ultimo_pago || hoy.toISOString().split('T')[0],
          fecha_alerta: fechaAlerta.toISOString().split('T')[0],
          tipo_alerta: 'Deudor',
          estado: 'Pendiente',
          prioridad: prioridad,
          dias_vencido: deudor.dias_atraso,
          sede: deudor.sede,
          notas: `Deudor con ${deudor.dias_atraso} días de atraso. Monto adeudado: $${deudor.monto_adeudado?.toLocaleString('es-CL')}. Alerta generada automáticamente.`
        });

        alertasCreadas.push(nuevaAlerta);

        // Crear tarea automática si está configurado
        if (config.crear_tarea_automatica && deudor.sede) {
          const sede = await Sucursales.get(deudor.sede);
          if (sede?.responsable_sede) {
            const cliente = await Clientes.get(deudor.cliente);
            const nuevaTarea = await Tareas_RS.create({
              titulo: `Contactar Cliente con Deuda: ${cliente?.nombre || deudor.cliente_nombre}`,
              descripcion: `Cliente con ${deudor.dias_atraso} días de atraso. Monto: ${deudor.monto_adeudado?.toLocaleString('es-CL')}. Requiere gestión de cobro urgente.`,
              tipo: 'deudor', // CAMBIO: Tipo específico para identificar en el dashboard
              prioridad: prioridad === 'Alta' ? 'alta' : 'media',
              fecha_limite: new Date(hoy.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              estado: 'pendiente',
              responsable: sede.responsable_sede,
              sede: deudor.sede,
              cliente: deudor.cliente,
              notas: `Alerta de deudor generada automáticamente. Deudor ID: ${deudor.id}. Intentos previos: ${deudor.intentos_cobro || 0}`
            });
            tareasCreadas.push(nuevaTarea);
          }
        }
      } else {
        // Actualizar alerta existente si cambió la prioridad o días
        const alertaExistente = alertasExistentes[0];
        if (alertaExistente.dias_vencido !== deudor.dias_atraso || alertaExistente.prioridad !== prioridad) {
          await Alertas_Renovacion.update(alertaExistente.id, {
            dias_vencido: deudor.dias_atraso,
            prioridad: prioridad,
            notas: `${alertaExistente.notas || ''}\nActualizado: ${deudor.dias_atraso} días de atraso. Monto: $${deudor.monto_adeudado?.toLocaleString('es-CL')}`
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
      mensaje: `Proceso completado. ${alertasCreadas.length} alertas de deudores creadas, ${alertasActualizadas.length} actualizadas, ${tareasCreadas.length} tareas creadas.`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generando alertas de deudores:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}