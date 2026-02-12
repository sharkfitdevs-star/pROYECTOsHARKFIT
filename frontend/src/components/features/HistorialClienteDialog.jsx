import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Ciclos_Retencion } from '@/entities/Ciclos_Retencion';
import { CheckCircle, XCircle, AlertCircle, TrendingUp, Clock } from 'lucide-react';
import moment from 'moment';

export default function HistorialClienteDialog({ open, onOpenChange, cliente, sedes, planes }) {
  const [ciclos, setCiclos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && cliente) {
      cargarHistorial();
    }
  }, [open, cliente]);

  const cargarHistorial = async () => {
    try {
      setLoading(true);
      const ciclosData = await Ciclos_Retencion.filter({ cliente: cliente.id }, '-fecha_evento');
      setCiclos(ciclosData);
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoading(false);
    }
  };

  const obtenerIconoEvento = (tipoEvento) => {
    switch (tipoEvento) {
      case 'Renovó':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'Recuperado':
        return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case 'Venció':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'No pagó':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'Baja':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const obtenerColorEvento = (tipoEvento) => {
    switch (tipoEvento) {
      case 'Renovó':
        return 'bg-green-100 border-green-300';
      case 'Recuperado':
        return 'bg-blue-100 border-blue-300';
      case 'Venció':
        return 'bg-yellow-100 border-yellow-300';
      case 'No pagó':
        return 'bg-orange-100 border-orange-300';
      case 'Baja':
        return 'bg-red-100 border-red-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  if (!cliente) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historial de Retención - {cliente.nombre_cliente}</DialogTitle>
          <p className="text-sm text-gray-600">
            WhatsApp: {cliente.whatsapp} | Primera compra: {moment(cliente.fecha_primer_compra).format('DD/MM/YYYY')}
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando historial...</p>
            </div>
          </div>
        ) : ciclos.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No hay eventos de retención registrados para este cliente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumen */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Card className="bg-green-50">
                <CardContent className="pt-4 pb-3 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {ciclos.filter(c => c.tipo_evento === 'Renovó').length}
                  </div>
                  <p className="text-xs text-gray-600">Renovaciones</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50">
                <CardContent className="pt-4 pb-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {ciclos.filter(c => c.tipo_evento === 'Recuperado').length}
                  </div>
                  <p className="text-xs text-gray-600">Recuperados</p>
                </CardContent>
              </Card>
              <Card className="bg-yellow-50">
                <CardContent className="pt-4 pb-3 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {ciclos.filter(c => c.tipo_evento === 'Venció').length}
                  </div>
                  <p className="text-xs text-gray-600">Vencidos</p>
                </CardContent>
              </Card>
              <Card className="bg-orange-50">
                <CardContent className="pt-4 pb-3 text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {ciclos.filter(c => c.tipo_evento === 'No pagó').length}
                  </div>
                  <p className="text-xs text-gray-600">No pagó</p>
                </CardContent>
              </Card>
              <Card className="bg-red-50">
                <CardContent className="pt-4 pb-3 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {ciclos.filter(c => c.tipo_evento === 'Baja').length}
                  </div>
                  <p className="text-xs text-gray-600">Bajas</p>
                </CardContent>
              </Card>
            </div>

            {/* Línea de tiempo */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Línea de Tiempo</h3>
              {ciclos.map((ciclo, index) => {
                const sede = sedes.find(s => s.id === ciclo.sede);
                const plan = planes.find(p => p.id === ciclo.plan);
                
                return (
                  <Card key={ciclo.id} className={`border-l-4 ${obtenerColorEvento(ciclo.tipo_evento)}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {obtenerIconoEvento(ciclo.tipo_evento)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{ciclo.tipo_evento}</Badge>
                              <span className="text-sm font-medium">
                                {moment(ciclo.fecha_evento).format('DD/MM/YYYY')}
                              </span>
                            </div>
                            {ciclo.monto && (
                              <span className="text-lg font-bold text-green-600">
                                ${ciclo.monto.toLocaleString()}
                              </span>
                            )}
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            {sede && (
                              <p><span className="font-medium">Sede:</span> {sede.nombre_sede}</p>
                            )}
                            {plan && (
                              <p><span className="font-medium">Plan:</span> {plan.nombre_plan}</p>
                            )}
                            {ciclo.dias_desde_ultimo_pago !== undefined && ciclo.dias_desde_ultimo_pago !== null && (
                              <p>
                                <span className="font-medium">Días desde último pago:</span> {ciclo.dias_desde_ultimo_pago}
                              </p>
                            )}
                            {ciclo.nota && (
                              <p className="mt-2 p-2 bg-gray-50 rounded text-xs italic">
                                {ciclo.nota}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}