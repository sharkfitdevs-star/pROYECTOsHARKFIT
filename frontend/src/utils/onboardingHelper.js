import { Configuracion_Alertas } from '@/entities/Configuracion_Alertas';
import { Tareas_RS } from '@/entities/Tareas_RS';
import { Onboarding_Clientes } from '@/entities/Onboarding_Clientes';
import { Sucursales } from '@/entities/Sucursales';
import { Staff } from '@/entities/Staff';

/**
 * Función helper que se ejecuta automáticamente después de crear un cliente
 * para generar tareas de onboarding según la configuración de alertas
 */
export async function generarTareasOnboardingClienteNuevo(cliente) {
  try {
    // 1. Crear registro en Onboarding_Clientes
    const onboardingExistente = await Onboarding_Clientes.filter({
      cliente_id: cliente.id
    });

    let onboarding;
    if (onboardingExistente.length === 0) {
      onboarding = await Onboarding_Clientes.create({
        cliente_id: cliente.id,
        cliente_nombre: cliente.nombre || cliente.nombre_cliente || 'Cliente',
        cliente_whatsapp: cliente.whatsapp || '',
        sede: cliente.sede,
        fecha_ingreso: new Date().toISOString(),
        contrato_firmado: false,
        tarjeta_registrada: false,
        estado_onboarding: 'Pendiente'
      });
      console.log(`✅ Registro de onboarding creado para ${cliente.nombre || cliente.nombre_cliente}`);
    } else {
      onboarding = onboardingExistente[0];
      console.log(`ℹ️ Ya existe registro de onboarding para ${cliente.nombre || cliente.nombre_cliente}`);
    }

    // 2. Obtener configuración de alertas de cliente nuevo activas
    const configuraciones = await Configuracion_Alertas.filter({
      tipo_alerta: 'cliente_nuevo',
      activa: true
    });

    if (configuraciones.length === 0) {
      console.log('No hay configuraciones activas de cliente_nuevo');
      return { success: true, tareasCreadas: 0, onboarding };
    }

    const config = configuraciones[0];

    // 3. Verificar si ya se crearon tareas para este cliente
    const tareasExistentes = await Tareas_RS.filter({
      cliente: cliente.id,
      tipo: 'onboarding_cliente_nuevo'
    });

    if (tareasExistentes.length > 0) {
      console.log('Ya existen tareas de onboarding para este cliente');
      return { success: true, tareasCreadas: 0, mensaje: 'Tareas ya existen', onboarding };
    }

    // 4. Obtener sede y responsable
    const sede = cliente.sede ? await Sucursales.get(cliente.sede) : null;
    const hoy = new Date();
    const tareasCreadas = [];

    // 5. Crear tareas según configuración
    if (config.tareas_automaticas && config.tareas_automaticas.length > 0) {
      for (const tareaConfig of config.tareas_automaticas) {
        let responsableId = null;

        // Determinar responsable según configuración
        if (tareaConfig.asignar_a === 'responsable_sede' && sede?.responsable_sede) {
          responsableId = sede.responsable_sede;
        } else if (tareaConfig.asignar_a === 'staff_especifico' && tareaConfig.staff_id) {
          responsableId = tareaConfig.staff_id;
        } else if (tareaConfig.asignar_a === 'departamento' && tareaConfig.departamento) {
          // Buscar staff del departamento
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
          .replace('{cliente_nombre}', cliente.nombre || cliente.nombre_cliente || 'Cliente')
          .replace('{plan}', cliente.plan_actual?.nombre_plan || 'N/A');

        const descripcion = tareaConfig.descripcion
          .replace('{cliente_nombre}', cliente.nombre || cliente.nombre_cliente || 'Cliente')
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
    } else if (config.crear_tarea_automatica) {
      // Si no hay tareas configuradas pero está activado crear_tarea_automatica, crear una tarea genérica
      const fechaLimite = new Date(hoy);
      fechaLimite.setDate(fechaLimite.getDate() + 3);

      const nuevaTarea = await Tareas_RS.create({
        titulo: `Bienvenida Cliente Nuevo: ${cliente.nombre || cliente.nombre_cliente}`,
        descripcion: `Dar bienvenida y onboarding al cliente nuevo ${cliente.nombre || cliente.nombre_cliente}. Plan: ${cliente.plan_actual?.nombre_plan || 'N/A'}`,
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

    console.log(`✅ Tareas de onboarding creadas para ${cliente.nombre || cliente.nombre_cliente}: ${tareasCreadas.length} tareas`);

    return {
      success: true,
      tareasCreadas: tareasCreadas.length,
      mensaje: `${tareasCreadas.length} tareas de onboarding creadas automáticamente`,
      onboarding
    };

  } catch (error) {
    console.error('Error generando tareas de onboarding:', error);
    return {
      success: false,
      error: error.message
    };
  }
}