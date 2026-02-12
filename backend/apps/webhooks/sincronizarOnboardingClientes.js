export default async function(ctx) {
  const { client, isInServiceRole } = ctx;

  // Permitir ejecución desde service role O desde usuario autenticado
  // (para la migración inicial desde la UI)
  
  try {
    // Importar entidades
    const { Clientes } = await import('@/entities/Clientes.js');
    const { Onboarding_Clientes } = await import('@/entities/Onboarding_Clientes.js');

    // Cargar todos los clientes
    const clientes = await Clientes.list('-fecha_primer_compra');
    
    // Cargar onboardings existentes
    const onboardingsExistentes = await Onboarding_Clientes.list();
    const clientesConOnboarding = new Set(onboardingsExistentes.map(o => o.cliente_id));

    let clientesCreados = 0;
    const resultados = [];

    // Crear registro de onboarding para cada cliente que no lo tenga
    for (const cliente of clientes) {
      // Verificar si ya tiene onboarding
      if (clientesConOnboarding.has(cliente.id)) {
        continue;
      }

      try {
        // Crear registro de onboarding
        const onboarding = await Onboarding_Clientes.create({
          cliente_id: cliente.id,
          cliente_nombre: cliente.nombre_cliente || 'Cliente',
          cliente_whatsapp: cliente.whatsapp || '',
          sede: cliente.sede,
          fecha_ingreso: cliente.fecha_primer_compra || cliente.createdAt || new Date().toISOString(),
          contrato_firmado: false,
          tarjeta_registrada: false,
          estado_onboarding: 'Pendiente'
        });

        clientesCreados++;
        resultados.push({
          cliente_id: cliente.id,
          nombre: cliente.nombre_cliente,
          onboarding_id: onboarding.id
        });

      } catch (error) {
        console.error(`Error creando onboarding para cliente ${cliente.id}:`, error);
        resultados.push({
          cliente_id: cliente.id,
          nombre: cliente.nombre_cliente,
          error: error.message
        });
      }
    }

    return {
      success: true,
      message: `Proceso completado. ${clientesCreados} registros de onboarding creados.`,
      totalClientes: clientes.length,
      clientesConOnboardingPrevio: clientesConOnboarding.size,
      clientesCreados,
      resultados: resultados.slice(0, 10) // Mostrar solo los primeros 10 para no saturar
    };

  } catch (error) {
    console.error('Error en sincronizarOnboardingClientes:', error);
    return {
      success: false,
      message: 'Error al sincronizar onboarding de clientes',
      error: error.message
    };
  }
}