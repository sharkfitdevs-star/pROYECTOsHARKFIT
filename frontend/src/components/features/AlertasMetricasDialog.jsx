import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, 
  TrendingDown, 
  Users, 
  Target, 
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  ClipboardList
} from 'lucide-react';

// Rutas de mejora predefinidas para cada tipo de alerta
const RUTAS_MEJORA = {
  retencion: [
    { id: 'r1', texto: 'Revisar clientes con fecha de vencimiento próxima y contactarlos proactivamente' },
    { id: 'r2', texto: 'Identificar motivos principales de baja y trabajar en soluciones' },
    { id: 'r3', texto: 'Implementar programa de beneficios para clientes fieles' },
    { id: 'r4', texto: 'Realizar encuestas de satisfacción a clientes activos' },
    { id: 'r5', texto: 'Ofrecer planes de fidelización o descuentos por permanencia' },
    { id: 'r6', texto: 'Mejorar seguimiento post-venta en los primeros 30 días' },
    { id: 'r7', texto: 'Capacitar al equipo en técnicas de retención' }
  ],
  asistencia: [
    { id: 'a1', texto: 'Implementar recordatorios automáticos 24h antes de la cita' },
    { id: 'a2', texto: 'Realizar llamados de confirmación el día anterior' },
    { id: 'a3', texto: 'Revisar horarios de agendamiento más demandados' },
    { id: 'a4', texto: 'Ofrecer incentivos por asistencia (ej: descuento en primera compra)' },
    { id: 'a5', texto: 'Analizar patrones de no asistencia por día/hora' },
    { id: 'a6', texto: 'Facilitar reagendamiento rápido vía WhatsApp' },
    { id: 'a7', texto: 'Reducir tiempo entre agendamiento y visita' }
  ],
  conversion: [
    { id: 'c1', texto: 'Capacitar vendedores en técnicas de cierre' },
    { id: 'c2', texto: 'Revisar y mejorar la presentación de planes/servicios' },
    { id: 'c3', texto: 'Analizar objeciones más comunes y preparar respuestas' },
    { id: 'c4', texto: 'Implementar ofertas de cierre inmediato' },
    { id: 'c5', texto: 'Mejorar seguimiento de prospectos indecisos' },
    { id: 'c6', texto: 'Revisar competitividad de precios vs competencia' },
    { id: 'c7', texto: 'Crear urgencia con promociones limitadas' }
  ]
};

export default function AlertasMetricasDialog({
  open,
  onOpenChange,
  metricas = {}, // { retencion: 75, asistencia: 55, conversion: 50 }
  umbrales = { retencion: 85, asistencia: 60, conversion: 55 },
  sedeNombre = 'General'
}) {
  const [expandedAlerta, setExpandedAlerta] = useState(null);
  const [rutasSeleccionadas, setRutasSeleccionadas] = useState({});
  const [notasAdicionales, setNotasAdicionales] = useState({});

  // Calcular alertas activas
  const alertas = useMemo(() => {
    const lista = [];
    
    if (metricas.retencion !== undefined && metricas.retencion < umbrales.retencion) {
      lista.push({
        tipo: 'retencion',
        titulo: 'Alerta de Retención',
        metrica: metricas.retencion,
        umbral: umbrales.retencion,
        diferencia: umbrales.retencion - metricas.retencion,
        icono: Users,
        color: 'red',
        descripcion: `La retención está ${(umbrales.retencion - metricas.retencion).toFixed(1)}% por debajo del objetivo`
      });
    }
    
    if (metricas.asistencia !== undefined && metricas.asistencia < umbrales.asistencia) {
      lista.push({
        tipo: 'asistencia',
        titulo: 'Alerta de Asistencia',
        metrica: metricas.asistencia,
        umbral: umbrales.asistencia,
        diferencia: umbrales.asistencia - metricas.asistencia,
        icono: Target,
        color: 'orange',
        descripcion: `La asistencia está ${(umbrales.asistencia - metricas.asistencia).toFixed(1)}% por debajo del objetivo`
      });
    }
    
    if (metricas.conversion !== undefined && metricas.conversion < umbrales.conversion) {
      lista.push({
        tipo: 'conversion',
        titulo: 'Alerta de Conversión',
        metrica: metricas.conversion,
        umbral: umbrales.conversion,
        diferencia: umbrales.conversion - metricas.conversion,
        icono: TrendingDown,
        color: 'yellow',
        descripcion: `La conversión está ${(umbrales.conversion - metricas.conversion).toFixed(1)}% por debajo del objetivo`
      });
    }
    
    return lista;
  }, [metricas, umbrales]);

  const toggleRuta = (alertaTipo, rutaId) => {
    setRutasSeleccionadas(prev => {
      const current = prev[alertaTipo] || [];
      if (current.includes(rutaId)) {
        return { ...prev, [alertaTipo]: current.filter(id => id !== rutaId) };
      }
      return { ...prev, [alertaTipo]: [...current, rutaId] };
    });
  };

  const getColorClasses = (color) => {
    switch (color) {
      case 'red':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          badge: 'bg-red-100 text-red-800',
          icon: 'text-red-600'
        };
      case 'orange':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          text: 'text-orange-700',
          badge: 'bg-orange-100 text-orange-800',
          icon: 'text-orange-600'
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-700',
          badge: 'bg-yellow-100 text-yellow-800',
          icon: 'text-yellow-600'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-700',
          badge: 'bg-gray-100 text-gray-800',
          icon: 'text-gray-600'
        };
    }
  };

  const hayAlertas = alertas.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Alertas Críticas - {sedeNombre}
          </DialogTitle>
          <DialogDescription>
            Métricas por debajo del umbral establecido y rutas de mejora sugeridas
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {!hayAlertas ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-700">¡Todas las métricas están en buen estado!</h3>
              <p className="text-gray-500 mt-2">No hay alertas críticas en este momento.</p>
              <div className="mt-6 p-4 bg-green-50 rounded-lg inline-block">
                <div className="grid grid-cols-3 gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-gray-600">Retención</p>
                    <p className="text-xl font-bold text-green-600">{metricas.retencion?.toFixed(1) || 0}%</p>
                    <p className="text-xs text-gray-500">Umbral: {umbrales.retencion}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600">Asistencia</p>
                    <p className="text-xl font-bold text-green-600">{metricas.asistencia?.toFixed(1) || 0}%</p>
                    <p className="text-xs text-gray-500">Umbral: {umbrales.asistencia}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600">Conversión</p>
                    <p className="text-xl font-bold text-green-600">{metricas.conversion?.toFixed(1) || 0}%</p>
                    <p className="text-xs text-gray-500">Umbral: {umbrales.conversion}%</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Resumen de métricas */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className={`p-3 rounded-lg border ${metricas.retencion < umbrales.retencion ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  <p className="text-xs text-gray-600 font-medium">Retención</p>
                  <p className={`text-2xl font-bold ${metricas.retencion < umbrales.retencion ? 'text-red-600' : 'text-green-600'}`}>
                    {metricas.retencion?.toFixed(1) || 0}%
                  </p>
                  <p className="text-xs text-gray-500">Umbral: {umbrales.retencion}%</p>
                </div>
                <div className={`p-3 rounded-lg border ${metricas.asistencia < umbrales.asistencia ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                  <p className="text-xs text-gray-600 font-medium">Asistencia</p>
                  <p className={`text-2xl font-bold ${metricas.asistencia < umbrales.asistencia ? 'text-orange-600' : 'text-green-600'}`}>
                    {metricas.asistencia?.toFixed(1) || 0}%
                  </p>
                  <p className="text-xs text-gray-500">Umbral: {umbrales.asistencia}%</p>
                </div>
                <div className={`p-3 rounded-lg border ${metricas.conversion < umbrales.conversion ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
                  <p className="text-xs text-gray-600 font-medium">Conversión</p>
                  <p className={`text-2xl font-bold ${metricas.conversion < umbrales.conversion ? 'text-yellow-600' : 'text-green-600'}`}>
                    {metricas.conversion?.toFixed(1) || 0}%
                  </p>
                  <p className="text-xs text-gray-500">Umbral: {umbrales.conversion}%</p>
                </div>
              </div>

              {/* Alertas detalladas */}
              {alertas.map((alerta) => {
                const colors = getColorClasses(alerta.color);
                const IconComponent = alerta.icono;
                const isExpanded = expandedAlerta === alerta.tipo;
                const rutas = RUTAS_MEJORA[alerta.tipo] || [];
                const seleccionadas = rutasSeleccionadas[alerta.tipo] || [];

                return (
                  <Card key={alerta.tipo} className={`${colors.bg} ${colors.border} border-2`}>
                    <CardHeader className="pb-2">
                      <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedAlerta(isExpanded ? null : alerta.tipo)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${colors.badge}`}>
                            <IconComponent className={`w-5 h-5 ${colors.icon}`} />
                          </div>
                          <div>
                            <CardTitle className={`text-lg ${colors.text}`}>
                              {alerta.titulo}
                            </CardTitle>
                            <p className="text-sm text-gray-600">{alerta.descripcion}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${colors.text}`}>{alerta.metrica.toFixed(1)}%</p>
                            <Badge className={colors.badge}>
                              -{alerta.diferencia.toFixed(1)}% del objetivo
                            </Badge>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="pt-2">
                        <div className="border-t pt-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Lightbulb className="w-4 h-4 text-amber-500" />
                            <h4 className="font-semibold text-gray-700">Rutas de Mejora Sugeridas</h4>
                          </div>
                          <p className="text-sm text-gray-500 mb-4">
                            Selecciona las acciones que implementarás para mejorar esta métrica:
                          </p>

                          <div className="space-y-2">
                            {rutas.map((ruta) => (
                              <label 
                                key={ruta.id}
                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                  seleccionadas.includes(ruta.id) 
                                    ? 'bg-blue-50 border-blue-300' 
                                    : 'bg-white border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                <Checkbox
                                  checked={seleccionadas.includes(ruta.id)}
                                  onCheckedChange={() => toggleRuta(alerta.tipo, ruta.id)}
                                  className="mt-0.5"
                                />
                                <span className={`text-sm ${seleccionadas.includes(ruta.id) ? 'text-blue-800 font-medium' : 'text-gray-700'}`}>
                                  {ruta.texto}
                                </span>
                              </label>
                            ))}
                          </div>

                          <div className="mt-4">
                            <label className="text-sm font-medium text-gray-700 block mb-2">
                              Notas adicionales o acciones personalizadas:
                            </label>
                            <Textarea
                              placeholder="Escribe aquí otras acciones específicas que planeas implementar..."
                              value={notasAdicionales[alerta.tipo] || ''}
                              onChange={(e) => setNotasAdicionales(prev => ({
                                ...prev,
                                [alerta.tipo]: e.target.value
                              }))}
                              rows={2}
                              className="bg-white"
                            />
                          </div>

                          {seleccionadas.length > 0 && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex items-center gap-2">
                                <ClipboardList className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-800">
                                  {seleccionadas.length} acción{seleccionadas.length > 1 ? 'es' : ''} seleccionada{seleccionadas.length > 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {hayAlertas && Object.values(rutasSeleccionadas).some(arr => arr.length > 0) && (
            <Button className="bg-blue-600 hover:bg-blue-700">
              Guardar Plan de Acción
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}