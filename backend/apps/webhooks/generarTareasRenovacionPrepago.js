import { Clientes } from '../entities/Clientes.js';
import { Sucursales } from '../entities/Sucursales.js';
import { Staff } from '../entities/Staff.js';
import { Tareas_RS } from '../entities/Tareas_RS.js';
import { Ciclos_Retencion } from '../entities/Ciclos_Retencion.js';

export default async function generarTareasRenovacionPrepago(ctx) {
  const { isInServiceRole } = ctx;

  // Validar que la función se ejecute solo desde service role
  if (!isInServiceRole) {
    return { error: 'No autorizado' };
  }

  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // 1. Obtener todos los clientes con planes prepago vencidos
    const todosClientes = await Clientes.list();
    
    const clientesVencidos = todosClientes.filter(cliente => {
      // Solo clientes con modalidad Prepago
      if (cliente.modalidad_actual !== 'Prepago') return false;
      
      // Solo clientes activos
      if (!cliente.activo) return false;
      
      // Verificar que tenga fecha de fin
      if (!cliente.fecha_fin_plan_actual) return false;
      
      // Calcular días vencidos
      const fechaFin = new Date(cliente.fecha_fin_plan_actual);
      fechaFin.setHours(0, 0, 0, 0);
      const diasVencidos = Math.floor((hoy - fechaFin) / (1000 * 60 * 60 * 24));
      
      // Solo clientes con más de 2 días vencidos
      return diasVencidos > 2;
    });

    console.log(`Clientes prepago vencidos >2 días: ${clientesVencidos.length}`);

    // 2. Obtener todas las sedes y staff
    const sedes = await Sucursales.list();
    const staff = await Staff.list();

    // 3. Obtener tareas existentes para evitar duplicados
    const tareasExistentes = await Tareas_RS.list();

    // 4. Verificar ciclos de retención recientes (últimos 7 días)
    const hace7Dias = new Date();
    hace7Dias.setDate(hace7Dias.getDate() - 7);
    const ciclosRetencion = await Ciclos_Retencion.list();

    const tareasCreadas = [];
    const tareasOmitidas = [];

    // 5. Procesar cada cliente vencido
    for (const cliente of clientesVencidos) {
      // Verificar si ya renovó recientemente (últimos 7 días)
      const renovoReciente = ciclosRetencion.some(ciclo => 
        ciclo.cliente === cliente.id &&
        ciclo.tipo_evento === 'Renovó' &&
        new Date(ciclo.fecha_evento) >= hace7Dias
      );

      if (renovoReciente) {
        tareasOmitidas.push({
          cliente: cliente.nombre_cliente,
          razon: 'Renovó recientemente'
        });
        continue;
      }

      // Verificar si ya existe una tarea abierta para este cliente
      const tareaExistente = tareasExistentes.find(tarea =>
        tarea.cliente === cliente.id &&
        tarea.tipo === 'seguimiento' &&
        (tarea.estado === 'pendiente' || tarea.estado === 'en_proceso') &&
        tarea.titulo?.includes('Renovación Prepago')
      );

      if (tareaExistente) {
        tareasOmitidas.push({
          cliente: cliente.nombre_cliente,
          razon: 'Ya existe tarea abierta'
        });
        continue;
      }

      // Obtener sede del cliente
      const sede = sedes.find(s => s.id === cliente.sede);
      if (!sede) {
        tareasOmitidas.push({
          cliente: cliente.nombre_cliente,
          razon: 'Sede no encontrada'
        });
        continue;
      }

      // Obtener responsable de sede
      const responsableSede = staff.find(s => s.id === sede.responsable_sede);
      if (!responsableSede) {
        tareasOmitidas.push({
          cliente: cliente.nombre_cliente,
          razon: 'Responsable de sede no encontrado'
        });
        continue;
      }

      // Calcular días vencidos
      const fechaFin = new Date(cliente.fecha_fin_plan_actual);
      fechaFin.setHours(0, 0, 0, 0);
      const diasVencidos = Math.floor((hoy - fechaFin) / (1000 * 60 * 60 * 24));

      // Crear tarea de renovación prepago
      const nuevaTarea = await Tareas_RS.create({
        titulo: `Renovación Prepago - ${cliente.nombre_cliente}`,
        descripcion: `Cliente con plan prepago vencido hace ${diasVencidos} días. Plan: ${cliente.plan_actual || 'No especificado'}. Contactar para gestionar renovación.`,
        tipo: 'seguimiento',
        prioridad: diasVencidos > 7 ? 'alta' : 'media',
        fecha_limite: new Date(hoy.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 días desde hoy
        estado: 'pendiente',
        responsable: responsableSede.id,
        sede: sede.id,
        cliente: cliente.id,
        notas: `Días vencidos: ${diasVencidos}. WhatsApp: ${cliente.whatsapp || 'No disponible'}`
      });

      tareasCreadas.push({
        tarea_id: nuevaTarea.id,
        cliente: cliente.nombre_cliente,
        sede: sede.nombre,
        responsable: responsableSede.nombre,
        dias_vencidos: diasVencidos
      });
    }

    return {
      success: true,
      mensaje: `Proceso completado. Tareas creadas: ${tareasCreadas.length}, Omitidas: ${tareasOmitidas.length}`,
      tareas_creadas: tareasCreadas,
      tareas_omitidas: tareasOmitidas,
      total_clientes_vencidos: clientesVencidos.length
    };

  } catch (error) {
    console.error('Error generando tareas de renovación prepago:', error);
    return {
      success: false,
      error: error.message
    };
  }
}