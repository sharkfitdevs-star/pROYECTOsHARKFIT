import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  CheckCircle2, 
  AlertTriangle,
  AlertCircle,
  ListChecks
} from 'lucide-react';
import { format, parseISO, isBefore } from 'date-fns';

export default function TabMiDia({ 
  tareas, 
  alertasRenovacion, 
  clientesRiesgo, 
  checklistsAsignados,
  onOpenTarea,
  onOpenAlerta,
  onOpenClienteRiesgo,
  onOpenChecklist
}) {
  const hoy = new Date();
  const hoyStr = format(hoy, 'yyyy-MM-dd');

  // Tareas del día (vencidas + por vencer hoy)
  const tareasDelDia = useMemo(() => {
    return tareas.filter(t => {
      if (t.estado === 'completada' || t.estado === 'cancelada') return false;
      
      const fechaLimite = parseISO(t.fecha_limite);
      const esVencida = isBefore(fechaLimite, hoy);
      const esHoy = format(fechaLimite, 'yyyy-MM-dd') === hoyStr;
      
      return esVencida || esHoy;
    }).sort((a, b) => {
      // Ordenar: vencidas primero, luego por fecha límite
      const fechaA = parseISO(a.fecha_limite);
      const fechaB = parseISO(b.fecha_limite);
      return fechaA - fechaB;
    });
  }, [tareas, hoy, hoyStr]);

  // Alertas urgentes (críticas)
  const alertasUrgentes = useMemo(() => {
    return alertasRenovacion.filter(a => 
      a.estado === 'Pendiente' && (a.prioridad === 'Alta' || a.dias_vencido > 14)
    ).sort((a, b) => b.dias_vencido - a.dias_vencido);
  }, [alertasRenovacion]);

  // Clientes en riesgo crítico
  const clientesRiesgoCritico = useMemo(() => {
    return clientesRiesgo.filter(c => 
      c.nivel_riesgo === 'Crítico' && c.estado !== 'Recuperado' && c.estado !== 'Perdido'
    );
  }, [clientesRiesgo]);

  // Checklists del día
  const checklistsHoy = useMemo(() => {
    return checklistsAsignados.filter(c => 
      c.fecha_asignacion === hoyStr && (c.estado === 'pendiente' || c.estado === 'en_progreso')
    );
  }, [checklistsAsignados, hoyStr]);

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'Pendiente': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Asistió': return 'bg-green-100 text-green-800 border-green-300';
      case 'No asistió': return 'bg-red-100 text-red-800 border-red-300';
      case 'Reagendado': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPrioridadColor = (prioridad) => {
    switch (prioridad) {
      case 'urgente': return 'bg-red-500';
      case 'alta': return 'bg-orange-500';
      case 'media': return 'bg-yellow-500';
      case 'baja': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Sección: Tareas del Día */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Mis Tareas del Día
            <Badge variant="destructive" className="ml-2">
              {tareasDelDia.filter(t => isBefore(parseISO(t.fecha_limite), hoy)).length} vencidas
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tareasDelDia.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-300" />
              <p>¡No hay tareas pendientes para hoy!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tareasDelDia.map(tarea => {
                const fechaLimite = parseISO(tarea.fecha_limite);
                const esVencida = isBefore(fechaLimite, hoy);
                
                return (
                  <div key={tarea.id} className={`border rounded-lg p-4 ${esVencida ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{tarea.titulo}</h3>
                          <Badge className={getPrioridadColor(tarea.prioridad)}>
                            {tarea.prioridad}
                          </Badge>
                          {esVencida && (
                            <Badge variant="destructive">Vencida</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{tarea.descripcion}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(fechaLimite, 'dd/MM/yyyy')}
                          </span>
                          <span className="capitalize">{tarea.tipo}</span>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => onOpenTarea?.(tarea)}>
                        Gestionar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sección: Alertas Urgentes */}
      {(alertasUrgentes.length > 0 || clientesRiesgoCritico.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Alertas Urgentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Alertas de Renovación */}
              {alertasUrgentes.map(alerta => (
                <div key={alerta.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <h3 className="font-semibold text-red-900">
                          Cliente vencido - {alerta.dias_vencido} días
                        </h3>
                        <Badge className="bg-red-600">Crítico</Badge>
                      </div>
                      <p className="text-sm text-red-700">
                        Requiere contacto urgente para renovación
                      </p>
                    </div>
                    <Button size="sm" variant="destructive" onClick={() => onOpenAlerta?.(alerta)}>
                      Contactar
                    </Button>
                  </div>
                </div>
              ))}

              {/* Clientes en Riesgo Crítico */}
              {clientesRiesgoCritico.map(cliente => (
                <div key={cliente.id} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        <h3 className="font-semibold text-orange-900">
                          {cliente.cliente_nombre} - Riesgo Crítico
                        </h3>
                      </div>
                      <p className="text-sm text-orange-700">
                        Motivo: {cliente.motivo_riesgo} - {cliente.detalle_motivo}
                      </p>
                    </div>
                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={() => onOpenClienteRiesgo?.(cliente)}>
                      Gestionar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sección: Checklists del Día */}
      {checklistsHoy.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Mis Checklists del Día
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {checklistsHoy.map(checklist => (
                <div key={checklist.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">Checklist {checklist.plantilla_id}</h3>
                        <Badge variant={checklist.estado === 'completado' ? 'default' : 'outline'}>
                          {checklist.estado}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Progreso: {checklist.items_completados || 0}/{checklist.items_totales || 0}</span>
                        <span>{checklist.porcentaje_completitud || 0}%</span>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => onOpenChecklist?.(checklist)}>
                      {checklist.estado === 'pendiente' ? 'Iniciar' : 'Continuar'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}