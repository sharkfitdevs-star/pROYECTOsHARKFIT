import { Clientes } from '../entities/Clientes.js';
import { Configuracion_Alertas } from '../entities/Configuracion_Alertas.js';
import { Tareas_RS } from '../entities/Tareas_RS.js';
import { Sucursales } from '../entities/Sucursales.js';
import { Staff } from '../entities/Staff.js';

export default async function generarAlertasClienteNuevo(ctx) {
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

    // Obtener configuración de alertas de cliente nuevo activas
    const configuraciones = await Configuracion_Alertas.filter({
      tipo_alerta: 'cliente_nuevo',
      activa: true
    });

    if (configuraciones.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        mensaje: 'No hay configuraciones activas de cliente_nuevo'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const config = configuraciones[0];

    // Obtener clientes nuevos (creados en los últimos X días según configuración)
    const diasBusqueda = config.dias_umbral_activacion || 1; // Por defecto buscar clientes de hoy
    const fechaDesde = new Date(hoy);
    fechaDesde.setDate(fechaDesde.getDate() - diasBusqueda);

    const todosClientes = await Clientes.list('-createdAt');
    
    // Filtrar clientes creados desde la fecha de búsqueda
    const clientesNuevos = todosClientes.filter(cliente => {
      const fechaCreacion = new Date(cliente.createdAt);
      fechaCreacion.setHours(0, 0, 0, 0);
      return fechaCreacion >= fechaDesde && fechaCreacion <= hoy;
    });

    const tareasCreadas = [];

    for (const cliente of clientesNuevos) {
      // Verificar si ya se crearon tareas para este cliente
      const tareasExistentes = await Tareas_RS.filter({
        cliente: cliente.id,
        tipo: 'onboarding_cliente_nuevo'
      });

      if (tareasExistentes.length > 0) {
        // Ya se crearon tareas para este cliente, saltar
        continue;
      }

      // Obtener sede y responsable
      const sede = cliente.sede ? await Sucursales.get(cliente.sede) : null;

      // Crear tareas según configuración
      if (config.tareas_automaticas && config.tareas_automaticas.length > 0) {
        for (const tareaConfig of config.tareas_automaticas) {
          let responsableId = null;

          // Determinar responsable según configuración
          if (tareaConfig.asignar_a === 'responsable_sede' && sede?.responsable_sede) {
            responsableId = sede.responsable_sede;
          } else if (tareaConfig.asignar_a === 'staff_especifico' && tareaConfig.staff_id) {
            responsableId = tareaConfig.staff_id;
          } else if (tareaConfig.asignar_a === 'departamento' && tareaConfig.departamento) {
            // Buscar staff del departamento (primer staff activo del departamento)
            const staffDepartamento = await Staff.filter({
              departamento: tareaConfig.departamento,
              activo: true
            }, 'nombre', 1);
            
            if (staffDepartamento.length > 0) {
              responsableId = staffDepartamento[0].id;
            }
          }

          // Si no se pudo determinar responsable, usar responsable de sede por defecto
          if (!responsableId && sede?.responsable_sede) {
            responsableId = sede.responsable_sede;
          }

          // Calcular fecha límite
          const fechaLimite = new Date(hoy);
          fechaLimite.setDate(fechaLimite.getDate() + (tareaConfig.dias_limite || 3));

          // Reemplazar variables en título y descripción
          const titulo = tareaConfig.titulo
            .replace('{cliente_nombre}', cliente.nombre || 'Cliente')
            .replace('{plan}', cliente.plan_actual?.nombre_plan || 'N/A');

          const descripcion = tareaConfig.descripcion
            .replace('{cliente_nombre}', cliente.nombre || 'Cliente')
            .replace('{plan}', cliente.plan_actual?.nombre_plan || 'N/A')
            .replace('{whatsapp}', cliente.whatsapp || 'N/A')
            .replace('{fecha_compra}', cliente.fecha_primer_compra || 'N/A');

          // Crear tarea
          const nuevaTarea = await Tareas_RS.create({
            titulo: titulo,
            descripcion: descripcion,
            tipo: 'onboarding_cliente_nuevo',
            prioridad: tareaConfig.prioridad || 'media',
            fecha_limite: fechaLimite.toISOString().split('T')[0],
            estado: 'pendiente',
            responsable: responsableId,
            sede: cliente.sede,
            cliente: cliente.id,
            notas: `Tarea generada automáticamente para cliente nuevo. Departamento: ${tareaConfig.departamento || 'N/A'}`
          });

          tareasCreadas.push(nuevaTarea);
        }
      } else {
        // Si no hay tareas configuradas, crear una tarea genérica de bienvenida
        const fechaLimite = new Date(hoy);
        fechaLimite.setDate(fechaLimite.getDate() + 3);

        const nuevaTarea = await Tareas_RS.create({
          titulo: `Bienvenida Cliente Nuevo: ${cliente.nombre}`,
          descripcion: `Dar bienvenida y onboarding al cliente nuevo ${cliente.nombre}. Plan: ${cliente.plan_actual?.nombre_plan || 'N/A'}`,
          tipo: 'onboarding_cliente_nuevo',
          prioridad: 'media',
          fecha_limite: fechaLimite.toISOString().split('T')[0],
          estado: 'pendiente',
          responsable: sede?.responsable_sede,
          sede: cliente.sede,
          cliente: cliente.id,
          notas: 'Tarea genérica generada automáticamente para cliente nuevo'
        });

        tareasCreadas.push(nuevaTarea);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      clientesNuevos: clientesNuevos.length,
      tareasCreadas: tareasCreadas.length,
      mensaje: `Proceso completado. ${clientesNuevos.length} clientes nuevos detectados, ${tareasCreadas.length} tareas creadas.`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generando alertas de cliente nuevo:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}