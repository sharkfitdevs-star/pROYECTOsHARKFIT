import { Contratos } from '../entities/Contratos.js';
import { Alertas_Renovacion } from '../entities/Alertas_Renovacion.js';
import { Configuracion_Alertas } from '../entities/Configuracion_Alertas.js';
import { Tareas_RS } from '../entities/Tareas_RS.js';
import { Sucursales } from '../entities/Sucursales.js';
import { Clientes } from '../entities/Clientes.js';

export default async function generarAlertasContratos(ctx) {
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

    // Obtener configuración de alertas de contratos activas
    const configuraciones = await Configuracion_Alertas.filter({
      tipo_alerta: 'contrato_pendiente',
      activa: true
    });

    const config = configuraciones.length > 0 ? configuraciones[0] : {
      dias_umbral_activacion: 3,
      dias_prioridad_alta: 7,
      dias_critico: 14,
      crear_tarea_automatica: false,
      asignar_a: 'responsable_sede'
    };

    const contratos = await Contratos.filter({
      estado: 'Pendiente'
    });
    
    const alertasCreadas = [];
    const alertasActualizadas = [];
    const tareasCreadas = [];

    for (const contrato of contratos) {
      const diasPendiente = contrato.dias_pendiente || 0;
      
      // Si umbral es 0, crear tarea inmediatamente cuando hay contrato pendiente (diasPendiente >= 0)
      // Si umbral es mayor a 0, esperar esos días (diasPendiente >= umbral)
      const cumpleUmbral = config.dias_umbral_activacion === 0 
        ? diasPendiente >= 0 
        : diasPendiente >= config.dias_umbral_activacion;

      if (!cumpleUmbral) continue;

      // Verificar si ya existe una alerta activa para este contrato
      const alertasExistentes = await Alertas_Renovacion.filter({
        cliente_id: contrato.cliente,
        tipo_alerta: 'Contrato Pendiente',
        estado: ['Pendiente', 'En Proceso']
      });

      const fechaAlerta = new Date(hoy);

      // Determinar prioridad según configuración
      let prioridad = 'Media';
      if (config.dias_critico && diasPendiente > config.dias_critico) {
        prioridad = 'Alta';
      } else if (config.dias_prioridad_alta && diasPendiente > config.dias_prioridad_alta) {
        prioridad = 'Alta';
      }

      if (alertasExistentes.length === 0) {
        // Crear nueva alerta
        const nuevaAlerta = await Alertas_Renovacion.create({
          cliente_id: contrato.cliente,
          fecha_vencimiento: contrato.fecha_venta,
          fecha_alerta: fechaAlerta.toISOString().split('T')[0],
          tipo_alerta: 'Contrato Pendiente',
          estado: 'Pendiente',
          prioridad: prioridad,
          dias_vencido: diasPendiente,
          sede: contrato.sede,
          notas: `Contrato pendiente de firma por ${diasPendiente} días. Plan: ${contrato.plan_contratado}. Método esperado: ${contrato.metodo_firma}. Alerta generada automáticamente.`
        });

        alertasCreadas.push(nuevaAlerta);

        // Crear tarea automática si está configurado
        if (config.crear_tarea_automatica && contrato.sede) {
          const sede = await Sucursales.get(contrato.sede);
          if (sede?.responsable_sede) {
            const cliente = await Clientes.get(contrato.cliente);
            const nuevaTarea = await Tareas_RS.create({
              titulo: `Contrato Pendiente: ${cliente?.nombre || 'Cliente'}`,
              descripcion: `Contrato pendiente de firma por ${diasPendiente} días. Plan: ${contrato.plan_contratado}. Requiere seguimiento urgente.`,
              tipo: 'administrativa',
              prioridad: prioridad === 'Alta' ? 'alta' : 'media',
              fecha_limite: new Date(hoy.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              estado: 'pendiente',
              responsable: sede.responsable_sede,
              sede: contrato.sede,
              cliente: contrato.cliente,
              notas: `Alerta de contrato pendiente generada automáticamente. Fecha venta: ${contrato.fecha_venta}`
            });
            tareasCreadas.push(nuevaTarea);
          }
        }
      } else {
        // Actualizar alerta existente si cambió la prioridad o días
        const alertaExistente = alertasExistentes[0];
        if (alertaExistente.dias_vencido !== diasPendiente || alertaExistente.prioridad !== prioridad) {
          await Alertas_Renovacion.update(alertaExistente.id, {
            dias_vencido: diasPendiente,
            prioridad: prioridad,
            notas: `${alertaExistente.notas || ''}\nActualizado: ${diasPendiente} días pendiente.`
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
      mensaje: `Proceso completado. ${alertasCreadas.length} alertas de contratos creadas, ${alertasActualizadas.length} actualizadas, ${tareasCreadas.length} tareas creadas.`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generando alertas de contratos:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}