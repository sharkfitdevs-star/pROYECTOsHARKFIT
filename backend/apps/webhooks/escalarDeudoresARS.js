import { Deudores } from '@/entities/Deudores';
import { Tareas_RS } from '@/entities/Tareas_RS';
import { Staff } from '@/entities/Staff';

export default async function(ctx) {
  const { isInServiceRole } = ctx;
  
  // Solo permitir ejecución desde service role (scheduled trigger)
  if (!isInServiceRole) {
    return { error: 'No autorizado' };
  }

  try {
    // Obtener todos los deudores contactados que no han sido escalados
    const deudores = await Deudores.list('-createdAt');
    const staffList = await Staff.list();
    
    const ahora = new Date();
    const hace24Horas = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
    
    let escalados = 0;
    let tareasCreadas = 0;
    let errores = 0;
    
    for (const deudor of deudores) {
      try {
        // Verificar condiciones para escalar:
        // 1. Estado debe ser "Contactado" o "En gestión"
        // 2. Tiene ultimo_intento (fue contactado)
        // 3. No ha sido escalado aún
        // 4. Pasaron más de 24 horas desde el último contacto
        // 5. No está recuperado ni irrecuperable
        
        if (!['Contactado', 'En gestión'].includes(deudor.estado_gestion)) continue;
        if (!deudor.ultimo_intento) continue;
        if (deudor.escalado_a_rs === true) continue;
        if (['Recuperado', 'Irrecuperable'].includes(deudor.estado_gestion)) continue;
        
        const fechaUltimoIntento = new Date(deudor.ultimo_intento);
        
        // Si pasaron más de 24 horas desde el último contacto
        if (fechaUltimoIntento < hace24Horas) {
          // Buscar RS de la sede
          const responsableSede = staffList.find(s => 
            s.sede_principal === deudor.sede_id && 
            s.roles?.includes('RS') &&
            s.activo
          );
          
          // Si no hay RS, buscar cualquier staff activo de la sede
          const staffDeSede = responsableSede || staffList.find(s => 
            s.sede_principal === deudor.sede_id && 
            s.activo
          );
          
          if (!staffDeSede) {
            console.warn(`No se encontró staff para sede ${deudor.sede_id}`);
            errores++;
            continue;
          }
          
          // Verificar que no exista ya una tarea de deudor escalado para este cliente
          const tareasExistentes = await Tareas_RS.filter({
            cliente: deudor.cliente_id,
            tipo: 'deudor',
            estado: 'pendiente'
          });
          
          const yaExisteTareaRS = tareasExistentes.some(t => 
            t.notas?.includes('Escalado desde Financiero')
          );
          
          if (yaExisteTareaRS) {
            // Ya existe tarea escalada, solo marcar como escalado
            await Deudores.update(deudor.id, {
              escalado_a_rs: true,
              fecha_escalado_rs: ahora.toISOString()
            });
            escalados++;
            continue;
          }
          
          // Crear tarea para RS
          await Tareas_RS.create({
            titulo: `⚠️ Deudor escalado: ${deudor.cliente_nombre}`,
            descripcion: `Deudor contactado por Financiero hace más de 24hrs sin renovar.\n\nPlan: ${deudor.plan_actual || 'N/A'}\nMonto adeudado: $${deudor.monto_adeudado?.toLocaleString('es-CL') || '0'}\nWhatsApp: ${deudor.cliente_whatsapp}\nDías de atraso: ${deudor.dias_atraso || 0}\nÚltimo contacto: ${fechaUltimoIntento.toLocaleDateString('es-CL')}\nResultado: ${deudor.resultado_ultimo_intento || 'Sin detalle'}`,
            tipo: 'deudor',
            prioridad: 'urgente',
            fecha_limite: new Date(ahora.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 días
            estado: 'pendiente',
            responsable: staffDeSede.id,
            sede: deudor.sede_id,
            cliente: deudor.cliente_id,
            notas: `Escalado desde Financiero - Deudor ID: ${deudor.id} - Requiere gestión presencial del RS`
          });
          
          tareasCreadas++;
          
          // Marcar deudor como escalado
          await Deudores.update(deudor.id, {
            escalado_a_rs: true,
            fecha_escalado_rs: ahora.toISOString(),
            notas: (deudor.notas || '') + `\n[${ahora.toLocaleDateString('es-CL')} ${ahora.toLocaleTimeString('es-CL')}] Escalado automáticamente al RS por no renovar en 24hrs`
          });
          
          escalados++;
        }
      } catch (error) {
        console.error(`Error procesando deudor ${deudor.id}:`, error);
        errores++;
      }
    }
    
    return {
      success: true,
      mensaje: `Proceso completado`,
      deudoresRevisados: deudores.length,
      escalados,
      tareasCreadas,
      errores
    };
    
  } catch (error) {
    console.error('Error en escalarDeudoresARS:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}