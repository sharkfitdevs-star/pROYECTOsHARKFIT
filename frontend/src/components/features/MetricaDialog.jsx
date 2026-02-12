import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Download, Phone, Mail, Building2, User, Calendar, Clock, MessageSquare, Target, XCircle, FileText, CheckCircle, XOctagon } from 'lucide-react';
import axios from 'axios';
import moment from 'moment';

export default function MetricaDialog({ 
  open, 
  onOpenChange, 
  metrica, 
  prospectos, 
  sucursales, 
  staff,
  seguimientos,
  agendamientos,
  calcularTiempoEnNPS,
  formatTiempoEnNPS,
  onRegistrarSeguimiento,
  onIndicoCompromiso,
  onNoInteresa
}) {
  const [detalleProspecto, setDetalleProspecto] = useState(null);
  const [dialogDetalle, setDialogDetalle] = useState(false);
  if (!metrica) return null;

  // Función para obtener el último agendamiento de un prospecto
  const getLastAgendamiento = (prospectoId) => {
    if (!agendamientos) return null;
    const agendamientosProspecto = agendamientos.filter(a => a.prospecto_id === prospectoId);
    if (agendamientosProspecto.length === 0) return null;
    return agendamientosProspecto.sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora))[0];
  };

  const exportarExcel = async () => {
    try {
      const headers = [
        'Nombre',
        'WhatsApp',
        'Correo',
        'Sede',
        'Vendedor',
        'Estado',
        'Días en NPS',
        'Estado Seguimiento',
        'Resultado',
        'Fecha Próximo Seguimiento'
      ];

      const datosExportar = prospectos.map(prospecto => {
        const sede = sucursales.find(s => s.id === prospecto.sede);
        const vendedor = staff.find(s => s.id === prospecto.vendedor_asignado);
        const seguimiento = seguimientos.find(s => s.prospecto_id === prospecto.id);
        const lastAgendamiento = getLastAgendamiento(prospecto.id);
        const { dias } = calcularTiempoEnNPS(prospecto);

        return [
          prospecto.nombre || '',
          prospecto.whatsapp || '',
          prospecto.correo || '',
          sede?.nombre_sede || '',
          vendedor?.nombre || '',
          lastAgendamiento?.resultado_asistencia || 'Sin registro',
          dias,
          seguimiento?.fue_contactado ? 'Contactado' : 'Pendiente',
          seguimiento?.resultado_seguimiento || '',
          seguimiento?.fecha_proximo_seguimiento ? moment(seguimiento.fecha_proximo_seguimiento).format('DD/MM/YYYY') : ''
        ];
      });

      const response = await axios.post(
        `${process.env.PROXY_INTEGRATION_URL}/documents/export-excel`,
        {
          sheets: [
            {
              name: metrica.titulo,
              data: [headers, ...datosExportar]
            }
          ]
        },
        {
          headers: {
            'x-api-key': window.config.apiKey
          },
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${metrica.titulo}_${moment().format('YYYY-MM-DD')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      alert('Excel exportado exitosamente');
    } catch (error) {
      console.error('Error exportando Excel:', error);
      alert('Error al exportar Excel');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto z-50">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {metrica.icono}
              {metrica.titulo} ({prospectos.length})
            </DialogTitle>
            <Button onClick={exportarExcel} size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar Excel
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prospecto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sede</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días en NPS</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seguimiento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detalle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {prospectos.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                    No hay prospectos en esta categoría
                  </td>
                </tr>
              ) : (
                prospectos.map((prospecto) => {
                  const sede = sucursales.find(s => s.id === prospecto.sede);
                  const vendedor = staff.find(s => s.id === prospecto.vendedor_asignado);
                  const seguimiento = seguimientos.find(s => s.prospecto_id === prospecto.id);
                  const lastAgendamiento = getLastAgendamiento(prospecto.id);
                  const { dias } = calcularTiempoEnNPS(prospecto);

                  return (
                    <tr key={prospecto.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-sm">{prospecto.nombre}</p>
                            <p className="text-xs text-gray-500">{prospecto.estado_pipeline}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Phone className="w-3 h-3" />
                            {prospecto.whatsapp || 'N/A'}
                          </div>
                          {prospecto.correo && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Mail className="w-3 h-3" />
                              {prospecto.correo}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm">
                          <Building2 className="w-3 h-3 text-gray-400" />
                          {sede?.nombre_sede || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{vendedor?.nombre || 'N/A'}</td>
                      <td className="px-4 py-3">
                        {lastAgendamiento?.resultado_asistencia ? (
                          <Badge 
                            className={
                              lastAgendamiento.resultado_asistencia === 'Asistió' 
                                ? 'bg-green-100 text-green-800' 
                                : lastAgendamiento.resultado_asistencia === 'No asistió'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }
                          >
                            {lastAgendamiento.resultado_asistencia === 'Asistió' && <CheckCircle className="w-3 h-3 mr-1 inline" />}
                            {lastAgendamiento.resultado_asistencia === 'No asistió' && <XOctagon className="w-3 h-3 mr-1 inline" />}
                            {lastAgendamiento.resultado_asistencia}
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600">Sin registro</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={dias >= 2 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}>
                          {formatTiempoEnNPS(prospecto)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {seguimiento?.fue_contactado ? (
                          <div className="space-y-1">
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              Contactado
                            </Badge>
                            <p className="text-xs text-gray-500">
                              {seguimiento.resultado_seguimiento}
                            </p>
                            {seguimiento.fecha_proximo_seguimiento && (
                              <div className="flex items-center gap-1 text-xs text-green-700">
                                <Calendar className="w-3 h-3" />
                                {moment(seguimiento.fecha_proximo_seguimiento).format('DD/MM/YYYY')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600 text-xs">Pendiente</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => {
                            setDetalleProspecto(prospecto);
                            setDialogDetalle(true);
                          }}
                          title="Ver detalle"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRegistrarSeguimiento?.(prospecto, seguimiento);
                            }}
                            title="Registrar seguimiento"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-green-600 border-green-200 hover:bg-green-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              onIndicoCompromiso?.(prospecto);
                            }}
                            title="Indicó compromiso de compra"
                          >
                            <Target className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNoInteresa?.(prospecto);
                            }}
                            title="No le interesa"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>

      {/* Dialog Detalle del Prospecto */}
      {dialogDetalle && detalleProspecto && (
        <Dialog open={dialogDetalle} onOpenChange={setDialogDetalle}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalle del Prospecto</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Información Personal */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-sm mb-3 text-blue-900">Información Personal</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-600">Nombre</p>
                    <p className="text-sm font-medium">{detalleProspecto.nombre}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">WhatsApp</p>
                    <p className="text-sm font-medium">{detalleProspecto.whatsapp || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Correo</p>
                    <p className="text-sm font-medium">{detalleProspecto.correo || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Estado Pipeline</p>
                    <Badge className="mt-1">{detalleProspecto.estado_pipeline}</Badge>
                  </div>
                </div>
              </div>

              {/* Información de Sede y Vendedor */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-sm mb-3">Asignación</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-600">Sede</p>
                    <p className="text-sm font-medium">
                      {sucursales.find(s => s.id === detalleProspecto.sede)?.nombre_sede || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Vendedor Asignado</p>
                    <p className="text-sm font-medium">
                      {staff.find(s => s.id === detalleProspecto.vendedor_asignado)?.nombre || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Estado de Asistencia */}
              {(() => {
                const lastAgendamiento = getLastAgendamiento(detalleProspecto.id);
                if (lastAgendamiento) {
                  return (
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-sm mb-3 text-purple-900">Último Agendamiento</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-600">Fecha y Hora</p>
                          <p className="text-sm font-medium">
                            {moment(lastAgendamiento.fecha_hora).format('DD/MM/YYYY HH:mm')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Estado</p>
                          <Badge 
                            className={
                              lastAgendamiento.resultado_asistencia === 'Asistió' 
                                ? 'bg-green-100 text-green-800' 
                                : lastAgendamiento.resultado_asistencia === 'No asistió'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }
                          >
                            {lastAgendamiento.resultado_asistencia}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Tipo de Visita</p>
                          <p className="text-sm font-medium">{lastAgendamiento.tipo_visita || 'N/A'}</p>
                        </div>
                        {lastAgendamiento.notas && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-600">Notas</p>
                            <p className="text-sm">{lastAgendamiento.notas}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              })()}

              {/* Seguimiento NPS */}
              {(() => {
                const seguimiento = seguimientos.find(s => s.prospecto_id === detalleProspecto.id);
                if (seguimiento) {
                  return (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-sm mb-3 text-green-900">Seguimiento NPS</h3>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-600">Estado</p>
                            <Badge className={seguimiento.fue_contactado ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                              {seguimiento.fue_contactado ? 'Contactado' : 'Pendiente'}
                            </Badge>
                          </div>
                          {seguimiento.fecha_contacto && (
                            <div>
                              <p className="text-xs text-gray-600">Fecha de Contacto</p>
                              <p className="text-sm font-medium">
                                {moment(seguimiento.fecha_contacto).format('DD/MM/YYYY HH:mm')}
                              </p>
                            </div>
                          )}
                        </div>
                        {seguimiento.resultado_seguimiento && (
                          <div>
                            <p className="text-xs text-gray-600">Resultado</p>
                            <p className="text-sm font-medium">{seguimiento.resultado_seguimiento}</p>
                          </div>
                        )}
                        {seguimiento.detalle_seguimiento && (
                          <div>
                            <p className="text-xs text-gray-600">Detalle</p>
                            <p className="text-sm">{seguimiento.detalle_seguimiento}</p>
                          </div>
                        )}
                        {seguimiento.fecha_proximo_seguimiento && (
                          <div>
                            <p className="text-xs text-gray-600">Próximo Seguimiento</p>
                            <p className="text-sm font-medium">
                              {moment(seguimiento.fecha_proximo_seguimiento).format('DD/MM/YYYY')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              })()}

              {/* Fechas */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-sm mb-3">Fechas</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-600">Fecha de Registro</p>
                    <p className="text-sm font-medium">
                      {moment(detalleProspecto.createdAt).format('DD/MM/YYYY HH:mm')}
                    </p>
                  </div>
                  {detalleProspecto.fecha_ingreso_nps && (
                    <div>
                      <p className="text-xs text-gray-600">Ingreso a NPS Online</p>
                      <p className="text-sm font-medium">
                        {moment(detalleProspecto.fecha_ingreso_nps).format('DD/MM/YYYY HH:mm')}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-600">Días en NPS</p>
                    <Badge className="mt-1">
                      {formatTiempoEnNPS(detalleProspecto)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Notas */}
              {detalleProspecto.notas && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-sm mb-2 text-yellow-900">Notas</h3>
                  <p className="text-sm whitespace-pre-wrap">{detalleProspecto.notas}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <Button onClick={() => setDialogDetalle(false)}>
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}