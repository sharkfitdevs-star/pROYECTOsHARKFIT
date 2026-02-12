import { Prospectos } from '../entities/Prospectos.js';
import { Ventas } from '../entities/Ventas.js';
import { Planes_Servicios } from '../entities/Planes_Servicios.js';

export default async function moverNPSCruzados(ctx) {
  const { isInServiceRole } = ctx;

  // Validar que la función sea ejecutada por un service role
  if (!isInServiceRole) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Service role required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Obtener todos los prospectos en estado "NPS Online"
    const prospectosNPS = await Prospectos.filter({ estado_pipeline: 'NPS Online' });

    if (!prospectosNPS || prospectosNPS.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No hay prospectos en NPS Online',
          moved: 0
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const hoy = new Date();
    let prospectosMoved = 0;

    // Catálogo de planes para detectar compras reales (Plan/Programa)
    const planes = await Planes_Servicios.list();
    const planById = new Map();
    (planes || []).forEach(p => {
      if (p?.id) planById.set(p.id, p);
    });

    for (const prospecto of prospectosNPS) {
      // Calcular días desde que está en NPS Online usando fecha_ingreso_nps (con fallback a updatedAt)
      const fechaBase = prospecto.fecha_ingreso_nps || prospecto.updatedAt;
      const fechaActualizacion = new Date(fechaBase);
      const diasTranscurridos = Math.floor((hoy - fechaActualizacion) / (1000 * 60 * 60 * 24));

      // Si lleva 2 o más días en NPS Online
      if (diasTranscurridos >= 2) {
        const ventas = await Ventas.filter({ prospecto_id: prospecto.id });

        // Solo cuenta como compra si el item es Plan o Programa
        const tieneCompraPlanPrograma = (ventas || []).some(v => {
          if (!v?.plan) return false;
          const plan = planById.get(v.plan);
          return plan?.tipo_item === 'Plan' || plan?.tipo_item === 'Programa';
        });

        // Si NO tiene compra real, mover a NPS Cruzados
        if (!tieneCompraPlanPrograma) {
          await Prospectos.update(prospecto.id, {
            estado_pipeline: 'NPS Cruzados'
          });
          prospectosMoved++;
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Proceso completado exitosamente`,
        totalRevisados: prospectosNPS.length,
        moved: prospectosMoved,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error en moverNPSCruzados:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error procesando prospectos',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}