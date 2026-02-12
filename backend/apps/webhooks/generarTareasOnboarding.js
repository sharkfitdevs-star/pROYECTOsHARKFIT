export default async function(ctx) {
  const { client, isInServiceRole } = ctx;

  // Validar que sea service role
  if (!isInServiceRole) {
    return {
      success: false,
      message: 'Esta función solo puede ser ejecutada por un service role'
    };
  }

  try {
    // Importar entidades
    const { Onboarding_Clientes } = await import('@/entities/Onboarding_Clientes.js');
    const { Tareas_RS } = await import('@/entities/Tareas_RS.js');
    const { Sucursales } = await import('@/entities/Sucursales.js');
    const { Staff } = await import('@/entities/Staff.js');

    // Cargar datos
    const onboardings = await Onboarding_Clientes.list('-fecha_ingreso');
    const sedes = await Sucursales.list();
    const staffList = await Staff.list();
    const tareasExistentes = await Tareas_RS.list();

    const ahora = new Date();
    const DIAS_UMBRAL = 2; // Días antes de crear tarea
    let tareasCreadas = 0;
    const resultados = [];

    for (const onboarding of onboardings) {
      // Calcular días desde ingreso
      const fechaIngreso = new Date(onboarding.fecha_ingreso);
      const diasDesdeIngreso = Math.floor((ahora - fechaIngreso) / (1000 * 60 * 60 * 24));

      // Solo procesar si han pasado al menos DIAS_UMBRAL días
      if (diasDesdeIngreso < DIAS_UMBRAL) continue;

      // Buscar responsable de la sede (Soporte)
      const sede = sedes.find(s => s.id === onboarding.sede);
      const responsableSoporte = staffList.find(s => 
        s.sede_principal === onboarding.sede && 
        s.departamento === 'Soporte'
      );

      // Si no hay contrato firmado, crear tarea
      if (!onboarding.contrato_firmado) {
        // Verificar si ya existe tarea activa
        const tareaExistente = tareasExistentes.find(t => 
          t.tipo === 'onboarding_contrato' &&
          t.cliente === onboarding.cliente_id &&
          t.estado !== 'completada' &&
          t.estado !== 'cancelada'
        );

        if (!tareaExistente) {
          const nuevaTarea = await Tareas_RS.create({
            titulo: `Contrato pendiente: ${onboarding.cliente_nombre}`,
            descripcion: `El cliente ${onboarding.cliente_nombre} lleva ${diasDesdeIngreso} días sin firmar el contrato. Contactar y enviar recordatorio.`,
            tipo: 'onboarding_contrato',
            prioridad: diasDesdeIngreso >= 5 ? 'urgente' : diasDesdeIngreso >= 3 ? 'alta' : 'media',
            fecha_limite: new Date(ahora.getTime() + 24 * 60 * 60 * 1000).toISOString(), // Mañana
            estado: 'pendiente',
            responsable: responsableSoporte?.id || null,
            sede: onboarding.sede,
            cliente: onboarding.cliente_id,
            notas: `WhatsApp: ${onboarding.cliente_whatsapp}\nSede: ${sede?.nombre_sede || 'N/A'}\nDías sin contrato: ${diasDesdeIngreso}`
          });

          // Actualizar onboarding con ID de tarea
          await Onboarding_Clientes.update(onboarding.id, {
            tarea_contrato_id: nuevaTarea.id,
            estado_onboarding: 'En Proceso'
          });

          tareasCreadas++;
          resultados.push({
            cliente: onboarding.cliente_nombre,
            tipo: 'contrato',
            dias: diasDesdeIngreso,
            tarea_id: nuevaTarea.id
          });
        }
      }

      // Si no hay tarjeta registrada, crear tarea
      if (!onboarding.tarjeta_registrada) {
        // Verificar si ya existe tarea activa
        const tareaExistente = tareasExistentes.find(t => 
          t.tipo === 'onboarding_tarjeta' &&
          t.cliente === onboarding.cliente_id &&
          t.estado !== 'completada' &&
          t.estado !== 'cancelada'
        );

        if (!tareaExistente) {
          const nuevaTarea = await Tareas_RS.create({
            titulo: `Tarjeta pendiente: ${onboarding.cliente_nombre}`,
            descripcion: `El cliente ${onboarding.cliente_nombre} lleva ${diasDesdeIngreso} días sin registrar su tarjeta. Enviar link de registro.`,
            tipo: 'onboarding_tarjeta',
            prioridad: diasDesdeIngreso >= 5 ? 'urgente' : diasDesdeIngreso >= 3 ? 'alta' : 'media',
            fecha_limite: new Date(ahora.getTime() + 24 * 60 * 60 * 1000).toISOString(), // Mañana
            estado: 'pendiente',
            responsable: responsableSoporte?.id || null,
            sede: onboarding.sede,
            cliente: onboarding.cliente_id,
            notas: `WhatsApp: ${onboarding.cliente_whatsapp}\nSede: ${sede?.nombre_sede || 'N/A'}\nDías sin tarjeta: ${diasDesdeIngreso}`
          });

          // Actualizar onboarding con ID de tarea
          await Onboarding_Clientes.update(onboarding.id, {
            tarea_tarjeta_id: nuevaTarea.id,
            estado_onboarding: 'En Proceso'
          });

          tareasCreadas++;
          resultados.push({
            cliente: onboarding.cliente_nombre,
            tipo: 'tarjeta',
            dias: diasDesdeIngreso,
            tarea_id: nuevaTarea.id
          });
        }
      }
    }

    return {
      success: true,
      message: `Proceso completado. ${tareasCreadas} tareas creadas.`,
      tareasCreadas,
      resultados
    };

  } catch (error) {
    console.error('Error en generarTareasOnboarding:', error);
    return {
      success: false,
      message: 'Error al generar tareas de onboarding',
      error: error.message
    };
  }
}