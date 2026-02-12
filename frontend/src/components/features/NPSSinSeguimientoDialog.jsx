import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, User, Building2, Calendar, MessageSquare, Target, XCircle, Clock } from 'lucide-react';
import { Prospectos } from '@/entities/Prospectos';
import { Seguimiento_NPS } from '@/entities/Seguimiento_NPS';
import { Agendamientos } from '@/entities/Agendamientos';
import { User as UserEntity } from '@/entities/User';
import moment from 'moment';
import 'moment/locale/es';

moment.locale('es');

export default function NPSSinSeguimientoDialog({ 
  open, 
  onClose, 
  prospectos, 
  sucursales, 
  staff,
  onRecargar 
}) {
  const [dialogSeguimiento, setDialogSeguimiento] = useState(false);
  const [dialogCompromiso, setDialogCompromiso] = useState(false);
  const [dialogNoInteresa, setDialogNoInteresa] = useState(false);
  const [prospectoSeleccionado, setProspectoSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);

  // Estados para formularios
  const [detalleSeguimiento, setDetalleSeguimiento] = useState('');
  const [resultadoSeguimiento, setResultadoSeguimiento] = useState('Contactado sin respuesta');
  const [fechaProximoSeguimiento, setFechaProximoSeguimiento] = useState('');
  const [fechaCompromiso, setFechaCompromiso] = useState('');
  const [notas, setNotas] = useState('');

  const calcularDiasEnNPS = (prospecto) => {
    const fechaIngreso = prospecto?.fecha_ingreso_nps
      ? moment(prospecto.fecha_ingreso_nps)
      : moment(prospecto?.updatedAt);
    return moment().diff(fechaIngreso, 'days');
  };

  const handleRegistrarSeguimiento = async () => {
    if (!detalleSeguimiento) {
      alert('Por favor ingresa el detalle del seguimiento');
      return;
    }

    if ((resultadoSeguimiento === 'Reagendar' || resultadoSeguimiento === 'Nueva fecha de seguimiento') && !fechaProximoSeguimiento) {
      alert('Por favor selecciona la fecha del próximo seguimiento');
      return;
    }

    setLoading(true);
    try {
      const user = await UserEntity.me();
      const staffActual = staff.find(s => s.email === user.email);

      await Seguimiento_NPS.create({
        prospecto_id: prospectoSeleccionado.id,
        prospecto_nombre: prospectoSeleccionado.nombre,
        prospecto_whatsapp: prospectoSeleccionado.whatsapp,
        fecha_ingreso_nps: prospectoSeleccionado.fecha_ingreso_nps || new Date().toISOString(),
        sede: prospectoSeleccionado.sede,
        vendedor_asignado: prospectoSeleccionado.vendedor_asignado,
        fue_contactado: true,
        fecha_contacto: new Date().toISOString(),
        responsable_seguimiento: staffActual?.id,
        detalle_seguimiento: detalleSeguimiento,
        resultado_seguimiento: resultadoSeguimiento,
        fecha_proximo_seguimiento: (resultadoSeguimiento === 'Reagendar' || resultadoSeguimiento === 'Nueva fecha de seguimiento') ? fechaProximoSeguimiento : null,
        notas: notas
      });

      alert('Seguimiento registrado exitosamente');
      setDialogSeguimiento(false);
      resetFormularios();
      if (onRecargar) onRecargar();
    } catch (error) {
      console.error('Error registrando seguimiento:', error);
      alert('Error al registrar seguimiento');
    } finally {
      setLoading(false);
    }
  };

  const handleIndicoCompromiso = async () => {
    if (!fechaCompromiso) {
      alert('Por favor selecciona una fecha de seguimiento');
      return;
    }

    setLoading(true);
    try {
      await Prospectos.update(prospectoSeleccionado.id, {
        estado_pipeline: 'Compromiso de compra',
        fecha_compromiso: fechaCompromiso,
        notas: notas ? `${prospectoSeleccionado.notas || ''}\n[${moment().format('DD/MM/YYYY HH:mm')}] Indicó compromiso desde NPS Online: ${notas}` : prospectoSeleccionado.notas
      });

      await Agendamientos.create({
        prospecto_id: prospectoSeleccionado.id,
        prospecto_nombre: prospectoSeleccionado.nombre,
        sede: prospectoSeleccionado.sede,
        fecha_hora: `${fechaCompromiso}T10:00:00`,
        tipo_visita: 'Promesa de compra',
        resultado_asistencia: 'Pendiente',
        notas: notas || 'Seguimiento desde NPS Online'
      });

      alert('Prospecto movido a Compromisos de Compra');
      setDialogCompromiso(false);
      resetFormularios();
      if (onRecargar) onRecargar();
    } catch (error) {
      console.error('Error indicando compromiso:', error);
      alert('Error al procesar la acción');
    } finally {
      setLoading(false);
    }
  };

  const handleNoInteresa = async () => {
    if (!confirm('¿Estás seguro de marcar este prospecto como "No le interesa"?')) {
      return;
    }

    setLoading(true);
    try {
      await Prospectos.update(prospectoSeleccionado.id, {
        estado_pipeline: 'Descartado',
        notas: notas ? `${prospectoSeleccionado.notas || ''}\n[${moment().format('DD/MM/YYYY HH:mm')}] Descartado desde NPS Online: ${notas}` : prospectoSeleccionado.notas
      });

      alert('Prospecto marcado como Descartado');
      setDialogNoInteresa(false);
      resetFormularios();
      if (onRecargar) onRecargar();
    } catch (error) {
      console.error('Error marcando como no interesa:', error);
      alert('Error al procesar la acción');
    } finally {
      setLoading(false);
    }
  };

  const resetFormularios = () => {
    setProspectoSeleccionado(null);
    setDetalleSeguimiento('');
    setResultadoSeguimiento('Contactado sin respuesta');
    setFechaProximoSeguimiento('');
    setFechaCompromiso('');
    setNotas('');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-yellow-600" />
              Prospectos NPS sin Seguimiento
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-1">
              {prospectos.length} prospecto{prospectos.length !== 1 ? 's' : ''} sin contacto registrado
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prospecto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días en NPS</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sede</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {prospectos.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                        No hay prospectos sin seguimiento
                      </td>
                    </tr>
                  ) : (
                    prospectos.map((prospecto) => {
                      const vendedor = staff.find((s) => s.id === prospecto.vendedor_asignado);
                      const sede = sucursales.find((s) => s.id === prospecto.sede);
                      const diasEnNPS = calcularDiasEnNPS(prospecto);

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
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Phone className="w-3 h-3" />
                              {prospecto.whatsapp || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              className={`${
                                diasEnNPS >= 2
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-orange-100 text-orange-800'
                              }`}
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              {diasEnNPS}d
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">{vendedor?.nombre || 'N/A'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-sm">
                              <Building2 className="w-3 h-3 text-gray-400" />
                              {sede?.nombre_sede || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                                onClick={() => {
                                  setProspectoSeleccionado(prospecto);
                                  setDialogSeguimiento(true);
                                }}
                                title="Registrar seguimiento"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-green-600 border-green-200 hover:bg-green-50"
                                onClick={() => {
                                  setProspectoSeleccionado(prospecto);
                                  setDialogCompromiso(true);
                                }}
                                title="Indicó compromiso de compra"
                              >
                                <Target className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => {
                                  setProspectoSeleccionado(prospecto);
                                  setDialogNoInteresa(true);
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
          </div>

          <div className="p-4 border-t bg-gray-50">
            <Button variant="outline" onClick={onClose} className="w-full">
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Registrar Seguimiento */}
      {dialogSeguimiento && prospectoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Registrar Seguimiento</h3>
            
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <p className="text-sm font-medium text-blue-900">{prospectoSeleccionado.nombre}</p>
              <p className="text-xs text-blue-700">{prospectoSeleccionado.whatsapp}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Detalle del Seguimiento <span className="text-red-500">*</span>
                </label>
                <Textarea
                  rows={4}
                  value={detalleSeguimiento}
                  onChange={(e) => setDetalleSeguimiento(e.target.value)}
                  placeholder="¿Qué se habló? ¿Cuál fue la respuesta del prospecto?"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Resultado del Seguimiento <span className="text-red-500">*</span>
                </label>
                <Select value={resultadoSeguimiento} onValueChange={setResultadoSeguimiento}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="Contactado sin respuesta">Contactado sin respuesta</SelectItem>
                    <SelectItem value="Indicó compromiso">Indicó compromiso</SelectItem>
                    <SelectItem value="No le interesa">No le interesa</SelectItem>
                    <SelectItem value="Compró">Compró</SelectItem>
                    <SelectItem value="Nueva fecha de seguimiento">Nueva fecha de seguimiento</SelectItem>
                    <SelectItem value="Reagendar">Reagendar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(resultadoSeguimiento === 'Reagendar' || resultadoSeguimiento === 'Nueva fecha de seguimiento') && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Fecha Próximo Seguimiento <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={fechaProximoSeguimiento}
                    onChange={(e) => setFechaProximoSeguimiento(e.target.value)}
                    min={moment().format('YYYY-MM-DD')}
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-1.5 block">Notas Adicionales</label>
                <Textarea
                  rows={2}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas adicionales..."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogSeguimiento(false);
                  resetFormularios();
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleRegistrarSeguimiento}
                disabled={!detalleSeguimiento || loading}
                className="flex-1"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Indicó Compromiso */}
      {dialogCompromiso && prospectoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Indicó Compromiso de Compra</h3>
            
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <p className="text-sm font-medium text-blue-900">{prospectoSeleccionado.nombre}</p>
              <p className="text-xs text-blue-700">{prospectoSeleccionado.whatsapp}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Fecha de Seguimiento <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={fechaCompromiso}
                  onChange={(e) => setFechaCompromiso(e.target.value)}
                  min={moment().format('YYYY-MM-DD')}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Notas</label>
                <Textarea
                  rows={3}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Detalles del compromiso..."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogCompromiso(false);
                  resetFormularios();
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleIndicoCompromiso}
                disabled={!fechaCompromiso || loading}
                className="flex-1"
              >
                {loading ? 'Procesando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog No Interesa */}
      {dialogNoInteresa && prospectoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">No le Interesa</h3>
            
            <div className="bg-red-50 p-3 rounded-lg mb-4">
              <p className="text-sm font-medium text-red-900">{prospectoSeleccionado.nombre}</p>
              <p className="text-xs text-red-700">{prospectoSeleccionado.whatsapp}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Notas</label>
                <Textarea
                  rows={3}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Motivo del descarte..."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogNoInteresa(false);
                  resetFormularios();
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleNoInteresa}
                variant="destructive"
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Procesando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}