import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock, ListTodo, TrendingUp } from 'lucide-react';

export default function TareasReporteCard({ tareas }) {
  // Calcular métricas
  const totalTareas = tareas.length;
  const pendientes = tareas.filter(t => t.estado === 'pendiente').length;
  const enProceso = tareas.filter(t => t.estado === 'en_proceso').length;
  const completadas = tareas.filter(t => t.estado === 'completada').length;
  
  const progreso = totalTareas > 0 ? Math.round((completadas / totalTareas) * 100) : 0;

  // Determinar color de la barra según umbrales
  const getProgressColor = (percentage) => {
    if (percentage < 30) return 'bg-red-500';
    if (percentage < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const progressColor = getProgressColor(progreso);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Reporte de Tareas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Métricas en Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <ListTodo className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Total</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{totalTareas}</p>
          </div>

          <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-xs font-medium text-orange-700">Pendientes</span>
            </div>
            <p className="text-2xl font-bold text-orange-900">{pendientes}</p>
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-700">En Proceso</span>
            </div>
            <p className="text-2xl font-bold text-yellow-900">{enProceso}</p>
          </div>

          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-green-700">Completadas</span>
            </div>
            <p className="text-2xl font-bold text-green-900">{completadas}</p>
          </div>
        </div>

        {/* Barra de Progreso */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Progreso General</span>
            <span className="text-sm font-bold text-gray-900">{progreso}%</span>
          </div>
          <div className="relative">
            <Progress value={progreso} className="h-3" />
            <div 
              className={`absolute top-0 left-0 h-3 rounded-full transition-all duration-500 ${progressColor}`}
              style={{ width: `${progreso}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 text-center">
            {progreso < 30 && '🔴 Bajo progreso - Requiere atención'}
            {progreso >= 30 && progreso < 70 && '🟡 Progreso moderado - En camino'}
            {progreso >= 70 && '🟢 Excelente progreso - ¡Sigue así!'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}