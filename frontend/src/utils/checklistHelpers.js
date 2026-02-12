import { Checklist_Templates } from '@/entities/Checklist_Templates';
import { Checklist_Items } from '@/entities/Checklist_Items';
import { Checklist_Asignados } from '@/entities/Checklist_Asignados';
import { Checklist_Ejecuciones } from '@/entities/Checklist_Ejecuciones';
import { Alertas_Checklist } from '@/entities/Alertas_Checklist';
import { Staff } from '@/entities/Staff';

/**
 * Asigna checklist automáticamente a un usuario para una fecha específica
 */
export async function asignarChecklistAutomatico(usuarioId, fecha, sedeId, turno) {
  try {
    // Obtener usuario y sus roles
    const usuario = await Staff.get(usuarioId);
    if (!usuario || !usuario.roles || usuario.roles.length === 0) {
      console.log('Usuario sin roles asignados');
      return [];
    }

    // Obtener día de la semana
    const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const diaSemana = diasSemana[new Date(fecha).getDay()];

    const checklistsCreados = [];

    // Para cada rol del usuario, buscar plantillas activas
    for (const rol of usuario.roles) {
      const plantillas = await Checklist_Templates.filter({
        rol_asociado: rol,
        activo: true
      });

      for (const plantilla of plantillas) {
        // Verificar si aplica para este día
        if (!plantilla.dias_activos || !plantilla.dias_activos.includes(diaSemana)) {
          continue;
        }

        // Verificar si ya existe un checklist asignado para esta fecha
        const existente = await Checklist_Asignados.filter({
          plantilla_id: plantilla.id,
          usuario_id: usuarioId,
          fecha_asignacion: fecha
        });

        if (existente && existente.length > 0) {
          continue; // Ya existe, no duplicar
        }

        // Obtener items de la plantilla
        const items = await Checklist_Items.filter({
          plantilla_id: plantilla.id,
          activo: true
        });

        // Crear checklist asignado
        const checklistAsignado = await Checklist_Asignados.create({
          plantilla_id: plantilla.id,
          usuario_id: usuarioId,
          fecha_asignacion: fecha,
          sede_id: sedeId,
          turno: turno,
          estado: 'pendiente',
          porcentaje_completitud: 0,
          items_completados: 0,
          items_totales: items.length,
          items_obligatorios_pendientes: items.filter(i => i.es_obligatorio).length,
          genero_alertas: false
        });

        checklistsCreados.push(checklistAsignado);
      }
    }

    return checklistsCreados;
  } catch (error) {
    console.error('Error al asignar checklist automático:', error);
    throw error;
  }
}

/**
 * Calcula el porcentaje de completitud de un checklist
 */
export async function calcularCompletitud(checklistAsignadoId) {
  try {
    const checklist = await Checklist_Asignados.get(checklistAsignadoId);
    if (!checklist) return 0;

    // Obtener todas las ejecuciones
    const ejecuciones = await Checklist_Ejecuciones.filter({
      checklist_asignado_id: checklistAsignadoId
    });

    const completados = ejecuciones.filter(e => e.completado).length;
    const porcentaje = checklist.items_totales > 0 
      ? Math.round((completados / checklist.items_totales) * 100) 
      : 0;

    // Contar items obligatorios pendientes
    const items = await Checklist_Items.filter({
      plantilla_id: checklist.plantilla_id,
      activo: true
    });

    const itemsObligatorios = items.filter(i => i.es_obligatorio);
    const ejecucionesCompletadas = ejecuciones.filter(e => e.completado);
    
    const obligatoriosPendientes = itemsObligatorios.filter(item => 
      !ejecucionesCompletadas.find(e => e.item_id === item.id)
    ).length;

    // Actualizar checklist
    await Checklist_Asignados.update(checklistAsignadoId, {
      items_completados: completados,
      porcentaje_completitud: porcentaje,
      items_obligatorios_pendientes: obligatoriosPendientes,
      estado: porcentaje === 100 ? 'completado' : checklist.estado
    });

    return porcentaje;
  } catch (error) {
    console.error('Error al calcular completitud:', error);
    throw error;
  }
}

/**
 * Verifica y genera alertas por retraso en inicio de checklist
 */
export async function verificarAlertasRetraso() {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const ahora = new Date();

    // Obtener checklist pendientes de hoy
    const checklistsPendientes = await Checklist_Asignados.filter({
      fecha_asignacion: hoy,
      estado: 'pendiente'
    });

    for (const checklist of checklistsPendientes) {
      const plantilla = await Checklist_Templates.get(checklist.plantilla_id);
      
      if (!plantilla || !plantilla.genera_alerta_retraso) continue;

      // Calcular hora esperada de inicio
      const [hora, minuto] = plantilla.hora_inicio_esperada.split(':');
      const horaEsperada = new Date(checklist.fecha_asignacion);
      horaEsperada.setHours(parseInt(hora), parseInt(minuto), 0);

      // Calcular minutos de retraso
      const minutosRetraso = Math.floor((ahora - horaEsperada) / (1000 * 60));

      if (minutosRetraso >= (plantilla.minutos_alerta_retraso || 15)) {
        // Verificar si ya existe una alerta para este checklist
        const alertaExistente = await Alertas_Checklist.filter({
          checklist_asignado_id: checklist.id,
          tipo_alerta: 'retraso_inicio',
          estado_alerta: 'activa'
        });

        if (!alertaExistente || alertaExistente.length === 0) {
          // Obtener supervisor
          const usuario = await Staff.get(checklist.usuario_id);
          const supervisor = await obtenerSupervisor(usuario);

          // Crear alerta
          await Alertas_Checklist.create({
            checklist_asignado_id: checklist.id,
            tipo_alerta: 'retraso_inicio',
            nivel_severidad: minutosRetraso > 30 ? 'critical' : 'warning',
            usuario_afectado_id: checklist.usuario_id,
            supervisor_notificado_id: supervisor?.id,
            fecha_hora_generacion: new Date().toISOString(),
            estado_alerta: 'activa',
            descripcion: `Checklist ${plantilla.nombre_plantilla} no iniciado. Retraso de ${minutosRetraso} minutos.`
          });

          // Marcar que generó alertas
          await Checklist_Asignados.update(checklist.id, {
            genero_alertas: true
          });
        }
      }
    }
  } catch (error) {
    console.error('Error al verificar alertas de retraso:', error);
  }
}

/**
 * Verifica y genera alertas por checklist no completados
 */
export async function verificarAlertasIncompletos() {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const ahora = new Date();

    // Obtener checklist en progreso o pendientes de hoy
    const checklistsActivos = await Checklist_Asignados.filter({
      fecha_asignacion: hoy
    });

    for (const checklist of checklistsActivos.filter(c => 
      c.estado === 'en_progreso' || c.estado === 'pendiente'
    )) {
      const plantilla = await Checklist_Templates.get(checklist.plantilla_id);
      
      if (!plantilla || !plantilla.genera_alerta_incompleto) continue;

      // Si tiene fecha de inicio, verificar tiempo transcurrido
      if (checklist.fecha_hora_inicio) {
        const inicio = new Date(checklist.fecha_hora_inicio);
        const minutosTranscurridos = Math.floor((ahora - inicio) / (1000 * 60));

        if (minutosTranscurridos > plantilla.minutos_max_completar) {
          // Verificar si ya existe una alerta
          const alertaExistente = await Alertas_Checklist.filter({
            checklist_asignado_id: checklist.id,
            tipo_alerta: 'tiempo_excedido',
            estado_alerta: 'activa'
          });

          if (!alertaExistente || alertaExistente.length === 0) {
            const usuario = await Staff.get(checklist.usuario_id);
            const supervisor = await obtenerSupervisor(usuario);

            await Alertas_Checklist.create({
              checklist_asignado_id: checklist.id,
              tipo_alerta: 'tiempo_excedido',
              nivel_severidad: 'warning',
              usuario_afectado_id: checklist.usuario_id,
              supervisor_notificado_id: supervisor?.id,
              fecha_hora_generacion: new Date().toISOString(),
              estado_alerta: 'activa',
              descripcion: `Checklist ${plantilla.nombre_plantilla} excedió el tiempo máximo de ${plantilla.minutos_max_completar} minutos.`
            });

            await Checklist_Asignados.update(checklist.id, {
              genero_alertas: true
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error al verificar alertas de incompletos:', error);
  }
}

/**
 * Detecta patrones recurrentes de incumplimiento
 */
export async function detectarPatronesRecurrentes(usuarioId) {
  try {
    // Obtener últimos 7 días
    const hace7Dias = new Date();
    hace7Dias.setDate(hace7Dias.getDate() - 7);
    const fechaInicio = hace7Dias.toISOString().split('T')[0];

    // Obtener checklist del usuario en los últimos 7 días
    const checklistsRecientes = await Checklist_Asignados.filter({
      usuario_id: usuarioId
    });

    const checklistsUltimos7Dias = checklistsRecientes.filter(c => 
      c.fecha_asignacion >= fechaInicio
    );

    if (checklistsUltimos7Dias.length < 3) return; // Necesitamos al menos 3 días

    // Contar incumplimientos
    const incumplimientos = checklistsUltimos7Dias.filter(c => 
      c.estado === 'vencido' || c.estado === 'omitido' || c.genero_alertas
    ).length;

    const tasaIncumplimiento = incumplimientos / checklistsUltimos7Dias.length;

    // Si más del 40% son incumplimientos, generar alerta de patrón
    if (tasaIncumplimiento > 0.4) {
      const usuario = await Staff.get(usuarioId);
      const supervisor = await obtenerSupervisor(usuario);

      // Verificar si ya existe una alerta de patrón reciente
      const alertasPatron = await Alertas_Checklist.filter({
        usuario_afectado_id: usuarioId,
        tipo_alerta: 'patron_recurrente',
        estado_alerta: 'activa'
      });

      if (!alertasPatron || alertasPatron.length === 0) {
        await Alertas_Checklist.create({
          checklist_asignado_id: checklistsUltimos7Dias[0].id,
          tipo_alerta: 'patron_recurrente',
          nivel_severidad: 'critical',
          usuario_afectado_id: usuarioId,
          supervisor_notificado_id: supervisor?.id,
          fecha_hora_generacion: new Date().toISOString(),
          estado_alerta: 'activa',
          descripcion: `Patrón recurrente detectado: ${incumplimientos} de ${checklistsUltimos7Dias.length} checklist incumplidos en los últimos 7 días (${Math.round(tasaIncumplimiento * 100)}%).`,
          requiere_seguimiento: true
        });
      }
    }
  } catch (error) {
    console.error('Error al detectar patrones recurrentes:', error);
  }
}

/**
 * Obtiene el supervisor de un usuario
 */
async function obtenerSupervisor(usuario) {
  try {
    if (!usuario || !usuario.sede_id) return null;

    // Buscar jefe de ventas de la misma sede
    const staff = await Staff.filter({
      sede_id: usuario.sede_id,
      activo: true
    });

    const supervisor = staff.find(s => 
      s.roles && (s.roles.includes('jefe_ventas') || s.roles.includes('direccion'))
    );

    return supervisor || null;
  } catch (error) {
    console.error('Error al obtener supervisor:', error);
    return null;
  }
}

/**
 * Marca un checklist como vencido si pasó el tiempo límite
 */
export async function marcarChecklistsVencidos() {
  try {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const fechaAyer = ayer.toISOString().split('T')[0];

    // Obtener checklist pendientes o en progreso de ayer
    const checklistsAyer = await Checklist_Asignados.filter({
      fecha_asignacion: fechaAyer
    });

    for (const checklist of checklistsAyer.filter(c => 
      c.estado === 'pendiente' || c.estado === 'en_progreso'
    )) {
      // Marcar como vencido
      await Checklist_Asignados.update(checklist.id, {
        estado: 'vencido'
      });

      // Generar alerta si corresponde
      const plantilla = await Checklist_Templates.get(checklist.plantilla_id);
      if (plantilla?.genera_alerta_incompleto) {
        const usuario = await Staff.get(checklist.usuario_id);
        const supervisor = await obtenerSupervisor(usuario);

        await Alertas_Checklist.create({
          checklist_asignado_id: checklist.id,
          tipo_alerta: 'no_completado',
          nivel_severidad: 'critical',
          usuario_afectado_id: checklist.usuario_id,
          supervisor_notificado_id: supervisor?.id,
          fecha_hora_generacion: new Date().toISOString(),
          estado_alerta: 'activa',
          descripcion: `Checklist ${plantilla.nombre_plantilla} no fue completado.`
        });

        await Checklist_Asignados.update(checklist.id, {
          genero_alertas: true
        });
      }

      // Detectar patrones recurrentes
      await detectarPatronesRecurrentes(checklist.usuario_id);
    }
  } catch (error) {
    console.error('Error al marcar checklist vencidos:', error);
  }
}

/**
 * Obtiene el nombre del día de la semana en español
 */
export function obtenerDiaSemana(fecha) {
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  return dias[new Date(fecha).getDay()];
}

/**
 * Formatea duración en minutos a texto legible
 */
export function formatearDuracion(minutos) {
  if (minutos < 60) {
    return `${minutos} min`;
  }
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
}