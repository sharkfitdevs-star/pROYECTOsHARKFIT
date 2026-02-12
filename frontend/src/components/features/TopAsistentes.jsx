import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Star, Clock, CheckCircle2, TrendingUp, RefreshCw } from 'lucide-react';
import { differenceInMinutes, parseISO, format } from 'date-fns';
import { Tareas_Sistema_Online } from '@/entities/Tareas_Sistema_Online';

export default function TopAsistentes({ tareas: tareasIniciales = [], staff = [], departamento = null, autoRefreshInterval = 30000 }) {
  const [tareas, setTareas] = useState(tareasIniciales);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Función para recargar tareas
  const recargarTareas = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const tareasData = await Tareas_Sistema_Online.list('-fecha_completada');
      setTareas(tareasData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error recargando tareas:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Auto-refresh cada X segundos
  useEffect(() => {
    const interval = setInterval(() => {
      recargarTareas();
    }, autoRefreshInterval);

    return () => clearInterval(interval);
  }, [autoRefreshInterval, recargarTareas]);

  // Actualizar cuando cambien las tareas iniciales
  useEffect(() => {
    setTareas(tareasIniciales);
  }, [tareasIniciales]);

  // Filtrar tareas completadas (opcionalmente por departamento)
  const tareasCompletadas = tareas.filter(t => {
    const esCompletada = t.estado === 'Completada';
    
    if (departamento) {
      return esCompletada && t.departamento === departamento;
    }
    return esCompletada;
  });

  // Agrupar por persona que completó la tarea
  const tareasCompletadasPorPersona = {};
  
  tareasCompletadas.forEach(tarea => {
    // Determinar quién completó la tarea
    const personaNombre = tarea.completado_por_nombre || tarea.asignado_nombre;
    const personaId = tarea.completado_por_id || tarea.asignado_a;
    
    if (!personaNombre && !personaId) return;
    
    const key = personaId || personaNombre;
    
    // Buscar info del staff
    const staffInfo = staff.find(s => s.id === personaId || s.nombre === personaNombre);
    
    if (!tareasCompletadasPorPersona[key]) {
      tareasCompletadasPorPersona[key] = {
        id: personaId,
        nombre: personaNombre || staffInfo?.nombre || 'Sin nombre',
        rol: staffInfo?.roles?.join(', ') || 'Staff',
        sede: staffInfo?.sede_principal,
        tareasCompletadas: 0,
        tiempoTotalMinutos: 0,
        tareasRapidas: 0, // menos de 1 hora
        tareasUrgentesCompletadas: 0,
      };
    }
    
    tareasCompletadasPorPersona[key].tareasCompletadas++;
    
    // Calcular tiempo de resolución
    if (tarea.tiempo_resolucion_minutos && tarea.tiempo_resolucion_minutos > 0) {
      tareasCompletadasPorPersona[key].tiempoTotalMinutos += tarea.tiempo_resolucion_minutos;
      if (tarea.tiempo_resolucion_minutos < 60) {
        tareasCompletadasPorPersona[key].tareasRapidas++;
      }
    } else if (tarea.fecha_completada && (tarea.fecha_creacion || tarea.createdAt)) {
      try {
        const fechaCreacion = parseISO(tarea.fecha_creacion || tarea.createdAt);
        const fechaCompletada = parseISO(tarea.fecha_completada);
        const minutos = differenceInMinutes(fechaCompletada, fechaCreacion);
        
        if (minutos > 0) {
          tareasCompletadasPorPersona[key].tiempoTotalMinutos += minutos;
          if (minutos < 60) {
            tareasCompletadasPorPersona[key].tareasRapidas++;
          }
        }
      } catch {
        // Ignorar errores de parsing
      }
    }
    
    // Contar tareas urgentes completadas
    if (tarea.prioridad === 'Urgente') {
      tareasCompletadasPorPersona[key].tareasUrgentesCompletadas++;
    }
  });

  // Convertir a array y ordenar por tareas completadas
  const ranking = Object.values(tareasCompletadasPorPersona)
    .map(persona => ({
      ...persona,
      tiempoPromedioMinutos: persona.tareasCompletadas > 0 && persona.tiempoTotalMinutos > 0
        ? Math.round(persona.tiempoTotalMinutos / persona.tareasCompletadas)
        : 0,
      porcentajeRapidas: persona.tareasCompletadas > 0
        ? Math.round((persona.tareasRapidas / persona.tareasCompletadas) * 100)
        : 0
    }))
    .sort((a, b) => b.tareasCompletadas - a.tareasCompletadas);

  // Iconos para posiciones
  const getPosicionIcon = (posicion) => {
    switch (posicion) {
      case 0:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 1:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 2:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <Star className="h-5 w-5 text-blue-400" />;
    }
  };

  // Color de fondo según posición
  const getPosicionBg = (posicion) => {
    switch (posicion) {
      case 0:
        return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300';
      case 1:
        return 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300';
      case 2:
        return 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300';
      default:
        return 'bg-white border-gray-200';
    }
  };

  // Formatear tiempo
  const formatearTiempo = (minutos) => {
    if (!minutos) return '-';
    if (minutos < 60) {
      return `${minutos}m`;
    } else if (minutos < 1440) {
      const horas = Math.floor(minutos / 60);
      return `${horas}h`;
    } else {
      const dias = Math.floor(minutos / 1440);
      return `${dias}d`;
    }
  };

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50/50 to-white">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-purple-600" />
            Top Colaboradores
            {departamento && (
              <Badge variant="outline" className="ml-2 text-xs">{departamento}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-normal">
              {format(lastUpdate, 'HH:mm:ss')}
            </span>
            <RefreshCw 
              className={`h-4 w-4 text-gray-400 cursor-pointer hover:text-purple-600 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
              onClick={recargarTareas}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {ranking.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No hay tareas completadas aún</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ranking.slice(0, 5).map((persona, index) => (
              <div
                key={persona.id || persona.nombre}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-md ${getPosicionBg(index)}`}
              >
                {/* Posición e ícono */}
                <div className="flex-shrink-0 w-10 text-center">
                  {getPosicionIcon(index)}
                  <span className="text-xs text-gray-500 font-medium">#{index + 1}</span>
                </div>

                {/* Info de la persona */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{persona.nombre}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {persona.tareasCompletadas} tareas
                    </span>
                    {persona.tiempoPromedioMinutos > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatearTiempo(persona.tiempoPromedioMinutos)} prom.
                      </span>
                    )}
                    {persona.tareasUrgentesCompletadas > 0 && (
                      <span className="flex items-center gap-1 text-red-600">
                        <TrendingUp className="h-3 w-3" />
                        {persona.tareasUrgentesCompletadas} urgentes
                      </span>
                    )}
                  </div>
                </div>

                {/* Número destacado de tareas */}
                <div className="flex-shrink-0 text-right">
                  <p className={`text-2xl font-bold ${
                    index === 0 ? 'text-yellow-600' :
                    index === 1 ? 'text-gray-600' :
                    index === 2 ? 'text-amber-600' :
                    'text-blue-600'
                  }`}>
                    {persona.tareasCompletadas}
                  </p>
                  {persona.porcentajeRapidas > 0 && (
                    <Badge 
                      className={`text-xs ${
                        persona.porcentajeRapidas >= 70 ? 'bg-green-500' :
                        persona.porcentajeRapidas >= 40 ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }`}
                    >
                      {persona.porcentajeRapidas}% rápidas
                    </Badge>
                  )}
                </div>
              </div>
            ))}

            {/* Mostrar total si hay más de 5 */}
            {ranking.length > 5 && (
              <div className="text-center pt-2 border-t">
                <p className="text-xs text-gray-500">
                  Y {ranking.length - 5} colaborador{ranking.length - 5 > 1 ? 'es' : ''} más...
                </p>
              </div>
            )}

            {/* Resumen general */}
            <div className="mt-4 pt-3 border-t bg-purple-50 rounded-lg p-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-500">Total Completadas</p>
                  <p className="text-lg font-bold text-purple-600">
                    {tareasCompletadas.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Colaboradores</p>
                  <p className="text-lg font-bold text-purple-600">
                    {ranking.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Promedio/Persona</p>
                  <p className="text-lg font-bold text-purple-600">
                    {ranking.length > 0 ? Math.round(tareasCompletadas.length / ranking.length) : 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}