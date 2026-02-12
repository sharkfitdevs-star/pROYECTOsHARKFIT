import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Timer, TrendingDown, Award, Zap } from 'lucide-react';
import { differenceInMinutes, parseISO } from 'date-fns';

export default function MedidorTiempoTareas({ tareas = [], staff = [], departamento = null }) {
  // Filtrar tareas completadas (opcionalmente por departamento)
  const tareasCompletadas = tareas.filter(t => {
    const esCompletada = t.estado === 'Completada' && t.fecha_completada && (t.fecha_creacion || t.createdAt);
    
    if (departamento) {
      return esCompletada && t.departamento === departamento;
    }
    return esCompletada;
  });

  // Calcular tiempo de resolución para cada tarea
  const tareasConTiempo = tareasCompletadas.map(t => {
    // Usar tiempo_resolucion_minutos si existe, sino calcular
    if (t.tiempo_resolucion_minutos && t.tiempo_resolucion_minutos > 0) {
      return { ...t, tiempoMinutos: t.tiempo_resolucion_minutos };
    }
    
    try {
      const fechaCreacion = parseISO(t.fecha_creacion || t.createdAt);
      const fechaCompletada = parseISO(t.fecha_completada);
      const minutos = differenceInMinutes(fechaCompletada, fechaCreacion);
      return { ...t, tiempoMinutos: minutos > 0 ? minutos : 0 };
    } catch {
      return { ...t, tiempoMinutos: 0 };
    }
  }).filter(t => t.tiempoMinutos > 0);

  // Calcular métricas
  const totalTareasCompletadas = tareasConTiempo.length;
  
  const tiempoPromedioMinutos = totalTareasCompletadas > 0
    ? Math.round(tareasConTiempo.reduce((sum, t) => sum + t.tiempoMinutos, 0) / totalTareasCompletadas)
    : 0;

  const tiempoMinimoMinutos = totalTareasCompletadas > 0
    ? Math.min(...tareasConTiempo.map(t => t.tiempoMinutos))
    : 0;

  const tiempoMaximoMinutos = totalTareasCompletadas > 0
    ? Math.max(...tareasConTiempo.map(t => t.tiempoMinutos))
    : 0;

  // Tareas resueltas rápido (menos de 1 hora)
  const tareasRapidas = tareasConTiempo.filter(t => t.tiempoMinutos < 60).length;
  const porcentajeRapidas = totalTareasCompletadas > 0
    ? Math.round((tareasRapidas / totalTareasCompletadas) * 100)
    : 0;

  // Formatear tiempo
  const formatearTiempo = (minutos) => {
    if (minutos < 60) {
      return `${minutos} min`;
    } else if (minutos < 1440) { // menos de 24 horas
      const horas = Math.floor(minutos / 60);
      const mins = minutos % 60;
      return mins > 0 ? `${horas}h ${mins}m` : `${horas}h`;
    } else {
      const dias = Math.floor(minutos / 1440);
      const horasRestantes = Math.floor((minutos % 1440) / 60);
      return horasRestantes > 0 ? `${dias}d ${horasRestantes}h` : `${dias}d`;
    }
  };

  // Calcular color según tiempo promedio
  const getColorTiempo = (minutos) => {
    if (minutos < 60) return 'text-green-600'; // menos de 1 hora
    if (minutos < 240) return 'text-yellow-600'; // menos de 4 horas
    if (minutos < 1440) return 'text-orange-600'; // menos de 24 horas
    return 'text-red-600'; // más de 24 horas
  };

  // Obtener progreso del medidor (0-100)
  const getProgresoMedidor = (minutos) => {
    // Escala: 0-30min = excelente, 30-60min = bueno, 1-4h = regular, 4-24h = lento, +24h = crítico
    if (minutos <= 30) return 100;
    if (minutos <= 60) return 85;
    if (minutos <= 240) return 65;
    if (minutos <= 1440) return 40;
    return 15;
  };

  const progreso = getProgresoMedidor(tiempoPromedioMinutos);

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 to-white">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Timer className="h-5 w-5 text-blue-600" />
          Tiempo de Resolución
          {departamento && (
            <Badge variant="outline" className="ml-2 text-xs">{departamento}</Badge>
          )}
        </CardTitle>
        <p className="text-xs text-gray-500">Tareas completadas</p>
      </CardHeader>
      <CardContent>
        {totalTareasCompletadas === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Clock className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No hay tareas completadas para medir</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Medidor Visual */}
            <div className="relative">
              {/* Barra de fondo */}
              <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                {/* Barra de progreso con gradiente */}
                <div 
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progreso}%`,
                    background: progreso >= 80 
                      ? 'linear-gradient(90deg, #22c55e, #4ade80)' 
                      : progreso >= 60 
                        ? 'linear-gradient(90deg, #eab308, #facc15)'
                        : progreso >= 40
                          ? 'linear-gradient(90deg, #f97316, #fb923c)'
                          : 'linear-gradient(90deg, #dc2626, #ef4444)'
                  }}
                />
              </div>
              {/* Indicador de posición */}
              <div 
                className="absolute top-0 h-6 w-1 bg-gray-800 rounded transition-all duration-500"
                style={{ left: `${progreso}%`, transform: 'translateX(-50%)' }}
              />
            </div>

            {/* Leyenda del medidor */}
            <div className="flex justify-between text-xs text-gray-500 px-1">
              <span>Lento</span>
              <span>Regular</span>
              <span>Rápido</span>
            </div>

            {/* Tiempo Promedio Destacado */}
            <div className="text-center py-3 bg-white rounded-lg shadow-sm border">
              <p className="text-sm text-gray-500 mb-1">Tiempo Promedio</p>
              <p className={`text-3xl font-bold ${getColorTiempo(tiempoPromedioMinutos)}`}>
                {formatearTiempo(tiempoPromedioMinutos)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {totalTareasCompletadas} tareas completadas
              </p>
            </div>

            {/* Métricas Adicionales */}
            <div className="grid grid-cols-3 gap-2">
              {/* Tiempo Mínimo */}
              <div className="text-center p-2 bg-green-50 rounded-lg border border-green-200">
                <Zap className="h-4 w-4 text-green-600 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Más Rápido</p>
                <p className="text-sm font-bold text-green-600">
                  {formatearTiempo(tiempoMinimoMinutos)}
                </p>
              </div>

              {/* Tiempo Máximo */}
              <div className="text-center p-2 bg-red-50 rounded-lg border border-red-200">
                <TrendingDown className="h-4 w-4 text-red-600 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Más Lento</p>
                <p className="text-sm font-bold text-red-600">
                  {formatearTiempo(tiempoMaximoMinutos)}
                </p>
              </div>

              {/* % Resueltas en menos de 1 hora */}
              <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-200">
                <Award className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Rápidas (&lt;1h)</p>
                <p className="text-sm font-bold text-blue-600">
                  {porcentajeRapidas}%
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}