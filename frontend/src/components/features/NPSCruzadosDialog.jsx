import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Phone, Mail, Building2, MessageSquare, Target, XCircle, PhoneCall } from 'lucide-react';
import { Prospectos } from '@/entities/Prospectos';
import { Agendamientos } from '@/entities/Agendamientos';
import { Seguimiento_NPS } from '@/entities/Seguimiento_NPS';
import UserEntity from '@/entities/User';
import moment from 'moment';

export default function NPSCruzadosDialog({ 
  open, 
  onOpenChange, 
  prospectos, 
  ventas, 
  planes, 
  agendamientos, 
  seguimientos, 
  sucursales, 
  staff,
  onSuccess 
}) {
  // Dialogs
  const [dialogCompromiso, setDialogCompromiso] = useState(false);
  const [dialogNoInteresa, setDialogNoInteresa] = useState(false);
  const [dialogSeguimiento, setDialogSeguimiento] = useState(false);
  const [dialogLlamada, setDialogLlamada] = useState(false);
  const [prospectoSeleccionado, setProspectoSeleccionado] = useState(null);
  const [fechaSeguimiento, setFechaSeguimiento] = useState('');
  const [notas, setNotas] = useState('');
  
  // Seguimiento form
  const [detalleSeguimiento, setDetalleSeguimiento] = useState('');
  const [resultadoSeguimiento, setResultadoSeguimiento] = useState('Contactado sin respuesta');
  const [fechaProximoSeguimiento, setFechaProximoSeguimiento] = useState('');

  // Llamada form
  const [resultadoLlamada, setResultadoLlamada] = useState('Contestó');

  const [loading, setLoading] = useState(false);

  const calcularDiasEnNPSOnline = (prospecto) => {
    const fechaIngreso = prospecto?.fecha_ingreso_nps
      ? moment(prospecto.fecha_ingreso_nps)
      : moment(prospecto?.updatedAt);
    const ahora = moment();
    const diffHorasTotal = Math.max(0, ahora.diff(fechaIngreso, 'hours'));
    return Math.floor(diffHorasTotal / 24);
  };

  const npsCruzadosPendientes = useMemo(() => {
    const planById = {};
    (planes || []).forEach(p => {
      if (p?.id) planById[p.id] = p;
    });

    const ventasByProspecto = {};
    (ventas || []).forEach(v => {
      if (!v?.prospecto_id) return;
      if (!ventasByProspecto[v.prospecto_id]) ventasByProspecto[v.prospecto_id] = [];
      ventasByProspecto[v.prospecto_id].push(v);
    });

    const agByProspecto = {};
    (agendamientos || []).forEach(a => {
      if (!a?.prospecto_id) return;
      if (!agByProspecto[a.prospecto_id]) agByProspecto[a.prospecto_id] = [];
      agByProspecto[a.prospecto_id].push(a);
    });

    const getLastAgendamiento = (prospectoId) => {
      const arr = agByProspecto[prospectoId] || [];
      if (!arr.length) return null;
      return arr.slice().sort((x, y) => new Date(y.fecha_hora) - new Date(x.fecha_hora))[0];
    };

    const tieneCompraPlanPrograma = (prospectoId) => {
      const arr = ventasByProspecto[prospectoId] || [];
      return arr.some(v => {
        if (!v?.plan) return false;
        const plan = planById[v.plan];
        return plan?.tipo_item === 'Plan' || plan?.tipo_item === 'Programa';
      });
    };

    const esCruzado = (prospecto) => {
      if (!prospecto?.id) return false;
      if (prospecto.estado_pipeline !== 'NPS Online') return false;
      if (calcularDiasEnNPSOnline(prospecto) < 2) return false;
      if (tieneCompraPlanPrograma(prospecto.id)) return false;

      const last = getLastAgendamiento(prospecto.id);
      const noAsistio = last?.resultado_asistencia === 'No asistió';
      const asistio = last?.resultado_asistencia === 'Asistió';

      return noAsistio || asistio;
    };

    const tieneSeguimiento = (prospectoId) => {
      return (seguimientos || []).some(s => s.prospecto_id === prospectoId && s.fue_contactado);
    };

    return (prospectos || []).filter(p => {
      return esCruzado(p) && !tieneSeguimiento(p.id);
    });
  }, [prospectos, ventas, planes, agendamientos, seguimientos]);

  // Handlers para acciones
  const handleIndicoCompromiso = async () => {
    if (!fechaSeguimiento) {
      alert('Por favor selecciona una fecha de seguimiento');
      return;
    }

    setLoading(true);
    try {
      await Prospectos.update(prospectoSeleccionado.id, {
        estado_pipeline: 'Compromiso de compra',
        notas: notas ? `${prospectoSeleccionado.notas || ''}\n[${moment().format('DD/MM/YYYY HH:mm')}] Indicó compromiso desde Dashboard RS: ${notas}` : prospectoSeleccionado.notas
      });

      await Agendamientos.create({
        prospecto_id: prospectoSeleccionado.id,
        prospecto_nombre: prospectoSeleccionado.nombre,
        sede: prospectoSeleccionado.sede,
        fecha_hora: `${fechaSeguimiento}T10:00:00`,
        tipo_visita: 'Promesa de compra',
        resultado_asistencia: 'Pendiente',
        notas: notas || 'Seguimiento desde Dashboard RS'
      });

      alert('Prospecto movido a Compromisos de Compra');
      setDialogCompromiso(false);
      setProspectoSeleccionado(null);
      setFechaSeguimiento('');
      setNotas('');
      if (onSuccess) onSuccess();
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
        notas: notas ? `${prospectoSeleccionado.notas || ''}\n[${moment().format('DD/MM/YYYY HH:mm')}] Descartado desde Dashboard RS: ${notas}` : prospectoSeleccionado.notas
      });

      alert('Prospecto marcado como Descartado');
      setDialogNoInteresa(false);
      setProspectoSeleccionado(null);
      setNotas('');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error marcando como no interesa:', error);
      alert('Error al procesar la acción');
    } finally {
      setLoading(false);
    }
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

      const seguimientoExistente = seguimientos.find(s => s.prospecto_id === prospectoSeleccionado.id);

      const seguimientoData = {
        fue_contactado: true,
        fecha_contacto: new Date().toISOString(),
        responsable_seguimiento: staffActual?.id,
        detalle_seguimiento: detalleSeguimiento,
        resultado_seguimiento: resultadoSeguimiento,
        fecha_proximo_seguimiento: (resultadoSeguimiento === 'Reagendar' || resultadoSeguimiento === 'Nueva fecha de seguimiento') ? fechaProximoSeguimiento : null,
        notas: notas
      };

      if (seguimientoExistente) {
        await Seguimiento_NPS.update(seguimientoExistente.id, seguimientoData);
      } else {
        await Seguimiento_NPS.create({
          prospecto_id: prospectoSeleccionado.id,
          prospecto_nombre: prospectoSeleccionado.nombre,
          prospecto_whatsapp: prospectoSeleccionado.whatsapp,
          fecha_ingreso_nps: prospectoSeleccionado.fecha_ingreso_nps || new Date().toISOString(),
          sede: prospectoSeleccionado.sede,
          vendedor_asignado: prospectoSeleccionado.vendedor_asignado,
          ...seguimientoData
        });
      }

      alert('Seguimiento registrado exitosamente');
      setDialogSeguimiento(false);
      setProspectoSeleccionado(null);
      setDetalleSeguimiento('');
      setResultadoSeguimiento('Contactado sin respuesta');
      setFechaProximoSeguimiento('');
      setNotas('');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error registrando seguimiento:', error);
      alert('Error al registrar seguimiento');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarLlamada = async () => {
    setLoading(true);
    try {
      const user = await UserEntity.me();
      const staffActual = staff.find(s => s.email === user.email);

      const seguimientoExistente = seguimientos.find(s => s.prospecto_id === prospectoSeleccionado.id);

      const detalle = `Llamada realizada: ${resultadoLlamada}${notas ? `. ${notas}` : ''}`;

      const seguimientoData = {
        fue_contactado: resultadoLlamada === 'Contestó',
        fecha_contacto: new Date().toISOString(),
        responsable_seguimiento: staffActual?.id,
        detalle_seguimiento: detalle,
        resultado_seguimiento: resultadoLlamada === 'Contestó' ? 'Contactado sin respuesta' : 'No contesta',
        notas: notas
      };

      if (seguimientoExistente) {
        await Seguimiento_NPS.update(seguimientoExistente.id, seguimientoData);
      } else {
        await Seguimiento_NPS.create({
          prospecto_id: prospectoSeleccionado.id,
          prospecto_nombre: prospectoSeleccionado.nombre,
          prospecto_whatsapp: prospectoSeleccionado.whatsapp,
          fecha_ingreso_nps: prospectoSeleccionado.fecha_ingreso_nps || new Date().toISOString(),
          sede: prospectoSeleccionado.sede,
          vendedor_asignado: prospectoSeleccionado.vendedor_asignado,
          ...seguimientoData
        });
      }

      alert('Llamada registrada exitosamente');
      setDialogLlamada(false);
      setProspectoSeleccionado(null);
      setResultadoLlamada('Contestó');
      setNotas('');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error registrando llamada:', error);
      alert('Error al registrar llamada');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>NPS Cruzados Pendientes ({npsCruzadosPendientes.length})</DialogTitle>
            <p className="text-sm text-gray-600">
              Prospectos con +2 días en NPS Online sin compra de Plan/Programa y sin seguimiento registrado
            </p>
          </DialogHeader>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
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
                {npsCruzadosPendientes.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      No hay NPS Cruzados pendientes
                    </td>
                  </tr>
                ) : (
                  npsCruzadosPendientes.map((prospecto) => {
                    const vendedor = staff.find((s) => s.id === prospecto.vendedor_asignado);
                    const sede = sucursales.find((s) => s.id === prospecto.sede);
                    const diasEnNPS = calcularDiasEnNPSOnline(prospecto);

                    return (
                      <tr key={prospecto.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="font-medium text-sm">{prospecto.nombre}</p>
                              <p className="text-xs text-gray-500">NPS Online</p>
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
                          <Badge
                            className={`${
                              diasEnNPS > 10
                                ? 'bg-red-100 text-red-800'
                                : diasEnNPS > 5
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {diasEnNPS} {diasEnNPS === 1 ? 'día' : 'días'}
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
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
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
                              variant="ghost"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
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
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setProspectoSeleccionado(prospecto);
                                setDialogNoInteresa(true);
                              }}
                              title="No le interesa"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              onClick={() => {
                                setProspectoSeleccionado(prospecto);
                                setDialogLlamada(true);
                              }}
                              title="Registrar llamada"
                            >
                              <PhoneCall className="w-4 h-4" />
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
      </Dialog>

      {/* Dialog Indicó Compromiso */}
      {dialogCompromiso && prospectoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
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
                  value={fechaSeguimiento}
                  onChange={(e) => setFechaSeguimiento(e.target.value)}
                  min={moment().format('YYYY-MM-DD')}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Notas</label>
                <textarea
                  className="w-full border rounded-md p-2 text-sm"
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
                  setProspectoSeleccionado(null);
                  setFechaSeguimiento('');
                  setNotas('');
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleIndicoCompromiso}
                disabled={!fechaSeguimiento || loading}
                className="flex-1"
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog No Interesa */}
      {dialogNoInteresa && prospectoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">No le Interesa</h3>
            
            <div className="bg-red-50 p-3 rounded-lg mb-4">
              <p className="text-sm font-medium text-red-900">{prospectoSeleccionado.nombre}</p>
              <p className="text-xs text-red-700">{prospectoSeleccionado.whatsapp}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Notas</label>
                <textarea
                  className="w-full border rounded-md p-2 text-sm"
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
                  setProspectoSeleccionado(null);
                  setNotas('');
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
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Registrar Seguimiento */}
      {dialogSeguimiento && prospectoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
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
                <textarea
                  className="w-full border rounded-md p-2 text-sm"
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
                  <SelectContent>
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
                <textarea
                  className="w-full border rounded-md p-2 text-sm"
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
                  setProspectoSeleccionado(null);
                  setDetalleSeguimiento('');
                  setResultadoSeguimiento('Contactado sin respuesta');
                  setFechaProximoSeguimiento('');
                  setNotas('');
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
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Registrar Llamada */}
      {dialogLlamada && prospectoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Registrar Llamada</h3>
            
            <div className="bg-purple-50 p-3 rounded-lg mb-4">
              <p className="text-sm font-medium text-purple-900">{prospectoSeleccionado.nombre}</p>
              <p className="text-xs text-purple-700">{prospectoSeleccionado.whatsapp}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Resultado de la Llamada <span className="text-red-500">*</span>
                </label>
                <Select value={resultadoLlamada} onValueChange={setResultadoLlamada}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Contestó">Contestó</SelectItem>
                    <SelectItem value="No contestó">No contestó</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Notas</label>
                <textarea
                  className="w-full border rounded-md p-2 text-sm"
                  rows={3}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Detalles de la llamada..."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogLlamada(false);
                  setProspectoSeleccionado(null);
                  setResultadoLlamada('Contestó');
                  setNotas('');
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleRegistrarLlamada}
                disabled={loading}
                className="flex-1"
              >
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}