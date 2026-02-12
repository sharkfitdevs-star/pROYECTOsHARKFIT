import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Phone, Building2, FileText, CreditCard, CheckCircle2, XCircle, AlertTriangle, X, Filter, Users, Calendar } from 'lucide-react';
import { Onboarding_Clientes } from '@/entities/Onboarding_Clientes';
import { Tareas_RS } from '@/entities/Tareas_RS';
import moment from 'moment';
import 'moment/locale/es';

moment.locale('es');

export default function SoporteListadoDialog({
  open,
  onClose,
  tipo, // 'sin_contrato', 'sin_tarjeta', 'pendientes', 'total', 'bienvenida'
  onboardings,
  tareasRS,
  sucursales,
  staff,
  onRecargar
}) {
  const [loading, setLoading] = useState(false);
  // Usar useRef para mantener el filtro persistente entre recargas
  const filtroSedeRef = useRef('todas');
  const [filtroSede, setFiltroSedeState] = useState('todas');
  
  // Sincronizar el estado con la ref al montar
  useEffect(() => {
    setFiltroSedeState(filtroSedeRef.current);
  }, [tareasRS, onboardings]);
  
  // Función wrapper para actualizar tanto el estado como la ref
  const setFiltroSede = (valor) => {
    filtroSedeRef.current = valor;
    setFiltroSedeState(valor);
  };
  const [dialogEnviarMensaje, setDialogEnviarMensaje] = useState(false);
  const [dialogEnviarLink, setDialogEnviarLink] = useState(false);
  const [onboardingSeleccionado, setOnboardingSeleccionado] = useState(null);
  const [opcionesMensaje, setOpcionesMensaje] = useState({ mensajeEnviado: false, clienteBloqueado: false });
  const [opcionesLink, setOpcionesLink] = useState({ linkEnviado: false, clienteBloqueado: false });
  const [mensajeParaCopiar, setMensajeParaCopiar] = useState('');
  
  // Estado para dialog de registro de tarjeta
  const [dialogRegistroTarjeta, setDialogRegistroTarjeta] = useState(false);
  const [onboardingTarjeta, setOnboardingTarjeta] = useState(null);
  const [plataformaTarjeta, setPlataformaTarjeta] = useState('');
  const [correoMercadoPago, setCorreoMercadoPago] = useState('');

  const obtenerTitulo = () => {
    switch (tipo) {
      case 'sin_contrato': return 'Clientes Sin Contrato';
      case 'sin_tarjeta': return 'Clientes Sin Tarjeta';
      case 'pendientes': return 'Clientes Pendientes';
      case 'total': return 'Total Clientes Onboarding';
      case 'bienvenida': return 'Bienvenida Cliente Nuevo';
      default: return 'Listado';
    }
  };

  const obtenerListado = () => {
    if (tipo === 'bienvenida') {
      // Retornar tareas de bienvenida filtradas por sede
      let tareas = tareasRS?.filter(t => t.tipo === 'onboarding_cliente_nuevo' && t.estado === 'pendiente') || [];
      if (filtroSede !== 'todas') {
        tareas = tareas.filter(t => t.sede === filtroSede);
      }
      return tareas;
    }
    
    if (!onboardings) return [];
    
    // Primero filtrar por sede si está seleccionada
    let listadoFiltrado = onboardings;
    if (filtroSede !== 'todas') {
      listadoFiltrado = onboardings.filter(o => o.sede === filtroSede);
    }
    
    // Luego filtrar por tipo
    switch (tipo) {
      case 'sin_contrato': return listadoFiltrado.filter(o => !o.contrato_firmado);
      case 'sin_tarjeta': return listadoFiltrado.filter(o => !o.tarjeta_registrada);
      case 'pendientes': return listadoFiltrado.filter(o => o.estado_onboarding === 'Pendiente');
      case 'total': return listadoFiltrado;
      default: return [];
    }
  };

  const handleMarcarContratoFirmado = async (onboarding) => {
    if (!confirm('¿Confirmar que el cliente firmó el contrato?')) return;
    setLoading(true);
    try {
      await Onboarding_Clientes.update(onboarding.id, {
        contrato_firmado: true,
        fecha_firma_contrato: new Date().toISOString(),
        estado_onboarding: onboarding.tarjeta_registrada ? 'Completado' : 'En Proceso'
      });
      if (onboarding.tarea_contrato_id) {
        await Tareas_RS.update(onboarding.tarea_contrato_id, {
          estado: 'completada',
          fecha_completada: new Date().toISOString()
        });
      }
      alert('Contrato marcado como firmado');
      if (onRecargar) onRecargar();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al marcar contrato');
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarTarjetaRegistrada = async (onboarding) => {
    // Abrir dialog para seleccionar plataforma
    setOnboardingTarjeta(onboarding);
    setPlataformaTarjeta('');
    setCorreoMercadoPago('');
    setDialogRegistroTarjeta(true);
  };

  const handleConfirmarRegistroTarjeta = async () => {
    if (!plataformaTarjeta) {
      alert('Por favor selecciona una plataforma');
      return;
    }
    if (plataformaTarjeta === 'Mercado Pago' && !correoMercadoPago) {
      alert('Por favor ingresa el correo de registro en Mercado Pago');
      return;
    }
    setLoading(true);
    try {
      const updateData = {
        tarjeta_registrada: true,
        fecha_registro_tarjeta: new Date().toISOString(),
        estado_onboarding: onboardingTarjeta.contrato_firmado ? 'Completado' : 'En Proceso',
        plataforma_tarjeta: plataformaTarjeta
      };
      if (plataformaTarjeta === 'Mercado Pago') {
        updateData.correo_mercado_pago = correoMercadoPago;
      }
      await Onboarding_Clientes.update(onboardingTarjeta.id, updateData);
      if (onboardingTarjeta.tarea_tarjeta_id) {
        await Tareas_RS.update(onboardingTarjeta.tarea_tarjeta_id, {
          estado: 'completada',
          fecha_completada: new Date().toISOString()
        });
      }
      alert(`Tarjeta registrada en ${plataformaTarjeta}`);
      setDialogRegistroTarjeta(false);
      setOnboardingTarjeta(null);
      setPlataformaTarjeta('');
      setCorreoMercadoPago('');
      if (onRecargar) onRecargar();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al marcar tarjeta');
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarNoRequiereTarjeta = async (onboarding) => {
    if (!confirm('¿Confirmar que el plan NO requiere tarjeta?')) return;
    setLoading(true);
    try {
      await Onboarding_Clientes.update(onboarding.id, {
        plan_no_requiere_tarjeta: true,
        tarjeta_registrada: true,
        fecha_registro_tarjeta: new Date().toISOString(),
        estado_onboarding: onboarding.contrato_firmado ? 'Completado' : 'En Proceso'
      });
      if (onboarding.tarea_tarjeta_id) {
        await Tareas_RS.update(onboarding.tarea_tarjeta_id, {
          estado: 'completada',
          fecha_completada: new Date().toISOString()
        });
      }
      alert('Marcado como plan que no requiere tarjeta');
      if (onRecargar) onRecargar();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al marcar');
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarMensajeContrato = (onboarding) => {
    setOnboardingSeleccionado(onboarding);
    setOpcionesMensaje({ mensajeEnviado: false, clienteBloqueado: false });
    setMensajeParaCopiar(`Hola! como estás? te hablamos desde Vendify!🏋🏻
queremos informarte que, el sistema por defecto, bloquea el acceso cuando no están los documentos firmados✍🏻

Te envío una imagen de como debes firmarlos, a penas este ok, favor me avisas para poder desbloquear✅. muchas gracias!`);
    setDialogEnviarMensaje(true);
  };

  const handleEnviarLinkTarjeta = (onboarding) => {
    setOnboardingSeleccionado(onboarding);
    setOpcionesLink({ linkEnviado: false, clienteBloqueado: false });
    setMensajeParaCopiar(`Te adjunto link de Registro de tarjeta, para tu Plan Contratado(           )

Importante: dejar tu registro al día antes de asistir a clases para que el Ingreso quede liberado 🥰`);
    setDialogEnviarLink(true);
  };

  const handleConfirmarEnvioMensaje = async () => {
    if (!opcionesMensaje.mensajeEnviado && !opcionesMensaje.clienteBloqueado) {
      alert('Por favor selecciona al menos una opción');
      return;
    }
    setLoading(true);
    try {
      const resultados = [];
      if (opcionesMensaje.mensajeEnviado) resultados.push('Mensaje enviado');
      if (opcionesMensaje.clienteBloqueado) resultados.push('Cliente bloqueado en EVO');
      const notaActual = onboardingSeleccionado.notas || '';
      const nuevaNota = `${notaActual}\n[${moment().format('DD/MM/YYYY HH:mm')}] Mensaje contrato: ${resultados.join(', ')}`;
      await Onboarding_Clientes.update(onboardingSeleccionado.id, { notas: nuevaNota });
      alert(`Resultado registrado: ${resultados.join(', ')}`);
      setDialogEnviarMensaje(false);
      setOnboardingSeleccionado(null);
      if (onRecargar) onRecargar();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al registrar el envío');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarEnvioLink = async () => {
    if (!opcionesLink.linkEnviado && !opcionesLink.clienteBloqueado) {
      alert('Por favor selecciona al menos una opción');
      return;
    }
    setLoading(true);
    try {
      const resultados = [];
      if (opcionesLink.linkEnviado) resultados.push('Link enviado');
      if (opcionesLink.clienteBloqueado) resultados.push('Cliente bloqueado en EVO');
      const notaActual = onboardingSeleccionado.notas || '';
      const nuevaNota = `${notaActual}\n[${moment().format('DD/MM/YYYY HH:mm')}] Link tarjeta: ${resultados.join(', ')}`;
      await Onboarding_Clientes.update(onboardingSeleccionado.id, { notas: nuevaNota });
      alert(`Resultado registrado: ${resultados.join(', ')}`);
      setDialogEnviarLink(false);
      setOnboardingSeleccionado(null);
      if (onRecargar) onRecargar();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al registrar el envío');
    } finally {
      setLoading(false);
    }
  };

  const copiarMensaje = () => {
    navigator.clipboard.writeText(mensajeParaCopiar);
    alert('Mensaje copiado al portapapeles ✓');
  };

  const listado = obtenerListado();

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col z-50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {tipo === 'sin_contrato' && <FileText className="w-5 h-5 text-red-600" />}
              {tipo === 'sin_tarjeta' && <CreditCard className="w-5 h-5 text-orange-600" />}
              {tipo === 'pendientes' && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
              {tipo === 'bienvenida' && <Users className="w-5 h-5 text-blue-600" />}
              {obtenerTitulo()}
            </DialogTitle>
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-gray-500">
                {listado.length} cliente{listado.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <Select value={filtroSede} onValueChange={setFiltroSede}>
                  <SelectTrigger className="w-[180px] h-8">
                    <SelectValue placeholder="Filtrar por sede" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las sedes</SelectItem>
                    {sucursales?.map(sede => (
                      <SelectItem key={sede.id} value={sede.id}>{sede.nombre_sede}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="overflow-x-auto">
              {tipo === 'bienvenida' ? (
                /* Tabla para tareas de Bienvenida */
                <table className="w-full">
                  <thead className="bg-gray-50 border-b sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarea</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sede</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Responsable</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridad</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {listado.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                          No hay tareas de bienvenida pendientes
                        </td>
                      </tr>
                    ) : (
                      listado.map((tarea) => {
                        const sede = sucursales?.find(s => s.id === tarea.sede);
                        const responsable = staff?.find(s => s.id === tarea.responsable);
                        const diasParaVencer = tarea.fecha_limite 
                          ? moment(tarea.fecha_limite).diff(moment(), 'days')
                          : null;
                        const estaVencida = diasParaVencer !== null && diasParaVencer < 0;

                        return (
                          <tr key={tarea.id} className={`hover:bg-gray-50 ${estaVencida ? 'bg-red-50' : ''}`}>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-sm">{tarea.titulo}</p>
                                <p className="text-xs text-gray-500 mt-1">{tarea.descripcion}</p>
                                <Badge className="mt-1 bg-blue-100 text-blue-800 text-xs">
                                  {tarea.tipo}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 text-sm">
                                <Building2 className="w-3 h-3 text-gray-400" />
                                {sede?.nombre_sede || 'N/A'}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm">{responsable?.nombre || 'Sin asignar'}</p>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm">
                                {tarea.fecha_limite ? (
                                  <>
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-gray-400" />
                                      {moment(tarea.fecha_limite).format('DD/MM/YYYY')}
                                    </div>
                                    <div className={`text-xs ${estaVencida ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                                      {estaVencida 
                                        ? `Vencida hace ${Math.abs(diasParaVencer)} día${Math.abs(diasParaVencer) !== 1 ? 's' : ''}`
                                        : diasParaVencer === 0 
                                          ? 'Vence hoy'
                                          : `Vence en ${diasParaVencer} día${diasParaVencer !== 1 ? 's' : ''}`
                                      }
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-gray-400">Sin fecha</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={
                                tarea.prioridad === 'urgente' ? 'bg-red-100 text-red-800' :
                                tarea.prioridad === 'alta' ? 'bg-orange-100 text-orange-800' :
                                tarea.prioridad === 'media' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }>
                                {tarea.prioridad}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                  onClick={async () => {
                                    if (!confirm('¿Marcar tarea como completada?')) return;
                                    setLoading(true);
                                    try {
                                      await Tareas_RS.update(tarea.id, {
                                        estado: 'completada',
                                        fecha_completada: new Date().toISOString()
                                      });
                                      alert('Tarea completada');
                                      // Recargar datos sin cerrar el dialog ni cambiar el filtro
                                      if (onRecargar) await onRecargar();
                                    } catch (error) {
                                      console.error('Error:', error);
                                      alert('Error al completar tarea');
                                    } finally {
                                      setLoading(false);
                                    }
                                  }}
                                  disabled={loading}
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Completar
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              ) : (
                /* Tabla para onboardings */
                <table className="w-full">
                  <thead className="bg-gray-50 border-b sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sede</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Ingreso</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contrato</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarjeta</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {listado.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                          No hay clientes en esta categoría
                        </td>
                      </tr>
                    ) : (
                      listado.map((onboarding) => {
                        const sede = sucursales?.find(s => s.id === onboarding.sede);
                        const diasDesdeIngreso = moment().diff(moment(onboarding.fecha_ingreso), 'days');

                        return (
                          <tr key={onboarding.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-sm">{onboarding.cliente_nombre}</p>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Phone className="w-3 h-3" />
                                  {onboarding.cliente_whatsapp}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 text-sm">
                                <Building2 className="w-3 h-3 text-gray-400" />
                                {sede?.nombre_sede || 'N/A'}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm">
                                <div>{moment(onboarding.fecha_ingreso).format('DD/MM/YYYY')}</div>
                                <div className="text-xs text-gray-500">
                                  Hace {diasDesdeIngreso} día{diasDesdeIngreso !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={onboarding.contrato_firmado}
                                    onCheckedChange={() => !onboarding.contrato_firmado && handleMarcarContratoFirmado(onboarding)}
                                    disabled={onboarding.contrato_firmado || loading}
                                  />
                                  {onboarding.contrato_firmado ? (
                                    <Badge className="bg-green-100 text-green-800">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      Firmado
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-red-100 text-red-800">
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Pendiente
                                    </Badge>
                                  )}
                                </div>
                                {!onboarding.contrato_firmado && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs"
                                    onClick={() => handleEnviarMensajeContrato(onboarding)}
                                  >
                                    Enviar mensaje
                                  </Button>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={onboarding.tarjeta_registrada}
                                    onCheckedChange={() => !onboarding.tarjeta_registrada && handleMarcarTarjetaRegistrada(onboarding)}
                                    disabled={onboarding.tarjeta_registrada || loading}
                                  />
                                  {onboarding.tarjeta_registrada ? (
                                    <Badge className={onboarding.plan_no_requiere_tarjeta ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}>
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      {onboarding.plan_no_requiere_tarjeta 
                                        ? 'No requiere' 
                                        : onboarding.plataforma_tarjeta 
                                          ? `${onboarding.plataforma_tarjeta}` 
                                          : 'Registrada'}
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-orange-100 text-orange-800">
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Pendiente
                                    </Badge>
                                  )}
                                </div>
                                {!onboarding.tarjeta_registrada && (
                                  <div className="flex flex-col gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs"
                                      onClick={() => handleEnviarLinkTarjeta(onboarding)}
                                    >
                                      Enviar link
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                                      onClick={() => handleMarcarNoRequiereTarjeta(onboarding)}
                                    >
                                      No requiere
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={
                                    onboarding.estado_onboarding === 'Completado'
                                      ? 'bg-green-100 text-green-800'
                                      : onboarding.estado_onboarding === 'En Proceso'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }
                                >
                                  {onboarding.estado_onboarding}
                                </Badge>
                                {!onboarding.contrato_firmado && diasDesdeIngreso >= 2 && (
                                  <Badge className="bg-red-100 text-red-800 text-xs">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Urgente
                                  </Badge>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="p-4 border-t bg-gray-50">
            <Button variant="outline" onClick={onClose} className="w-full">
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Enviar Mensaje Contrato */}
      {dialogEnviarMensaje && onboardingSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Enviar Mensaje - Contrato</h3>
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <p className="text-sm font-medium text-blue-900">{onboardingSeleccionado.cliente_nombre}</p>
              <div className="flex items-center gap-1 text-xs text-blue-700">
                <Phone className="w-3 h-3" />
                {onboardingSeleccionado.cliente_whatsapp}
              </div>
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Mensaje para enviar:</label>
              <div className="relative">
                <textarea
                  value={mensajeParaCopiar}
                  readOnly
                  className="w-full border rounded-md p-3 text-sm bg-gray-50 font-mono"
                  rows={6}
                />
                <Button type="button" size="sm" onClick={copiarMensaje} className="absolute top-2 right-2">
                  Copiar
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <Checkbox
                  checked={opcionesMensaje.mensajeEnviado}
                  onCheckedChange={(checked) => setOpcionesMensaje({...opcionesMensaje, mensajeEnviado: checked})}
                />
                <span className="text-sm">Mensaje enviado</span>
              </label>
              <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <Checkbox
                  checked={opcionesMensaje.clienteBloqueado}
                  onCheckedChange={(checked) => setOpcionesMensaje({...opcionesMensaje, clienteBloqueado: checked})}
                />
                <span className="text-sm">Cliente bloqueado en EVO</span>
              </label>
            </div>
            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => { setDialogEnviarMensaje(false); setOnboardingSeleccionado(null); }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmarEnvioMensaje}
                disabled={(!opcionesMensaje.mensajeEnviado && !opcionesMensaje.clienteBloqueado) || loading}
                className="flex-1"
              >
                {loading ? 'Guardando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Enviar Link Tarjeta */}
      {dialogEnviarLink && onboardingSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Enviar Link - Registro de Tarjeta</h3>
            <div className="bg-purple-50 p-3 rounded-lg mb-4">
              <p className="text-sm font-medium text-purple-900">{onboardingSeleccionado.cliente_nombre}</p>
              <div className="flex items-center gap-1 text-xs text-purple-700">
                <Phone className="w-3 h-3" />
                {onboardingSeleccionado.cliente_whatsapp}
              </div>
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Mensaje para enviar:</label>
              <div className="relative">
                <textarea
                  value={mensajeParaCopiar}
                  readOnly
                  className="w-full border rounded-md p-3 text-sm bg-gray-50 font-mono"
                  rows={6}
                />
                <Button type="button" size="sm" onClick={copiarMensaje} className="absolute top-2 right-2">
                  Copiar
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <Checkbox
                  checked={opcionesLink.linkEnviado}
                  onCheckedChange={(checked) => setOpcionesLink({...opcionesLink, linkEnviado: checked})}
                />
                <span className="text-sm">Link enviado</span>
              </label>
              <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <Checkbox
                  checked={opcionesLink.clienteBloqueado}
                  onCheckedChange={(checked) => setOpcionesLink({...opcionesLink, clienteBloqueado: checked})}
                />
                <span className="text-sm">Cliente bloqueado en EVO</span>
              </label>
            </div>
            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => { setDialogEnviarLink(false); setOnboardingSeleccionado(null); }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmarEnvioLink}
                disabled={(!opcionesLink.linkEnviado && !opcionesLink.clienteBloqueado) || loading}
                className="flex-1"
              >
                {loading ? 'Guardando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Registro de Tarjeta */}
      {dialogRegistroTarjeta && onboardingTarjeta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Registrar Tarjeta</h3>
            
            <div className="bg-green-50 p-3 rounded-lg mb-4">
              <p className="text-sm font-medium text-green-900">{onboardingTarjeta.cliente_nombre}</p>
              <div className="flex items-center gap-1 text-xs text-green-700">
                <Phone className="w-3 h-3" />
                {onboardingTarjeta.cliente_whatsapp}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  ¿Dónde se registró la tarjeta? <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <label 
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      plataformaTarjeta === 'EVO' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setPlataformaTarjeta('EVO')}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      plataformaTarjeta === 'EVO' ? 'border-blue-500' : 'border-gray-300'
                    }`}>
                      {plataformaTarjeta === 'EVO' && (
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <div>
                      <span className="font-medium">EVO</span>
                      <p className="text-xs text-gray-500">Registro en plataforma EVO</p>
                    </div>
                  </label>
                  
                  <label 
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      plataformaTarjeta === 'Mercado Pago' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setPlataformaTarjeta('Mercado Pago')}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      plataformaTarjeta === 'Mercado Pago' ? 'border-blue-500' : 'border-gray-300'
                    }`}>
                      {plataformaTarjeta === 'Mercado Pago' && (
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <div>
                      <span className="font-medium">Mercado Pago</span>
                      <p className="text-xs text-gray-500">Registro en Mercado Pago</p>
                    </div>
                  </label>
                </div>
              </div>

              {plataformaTarjeta === 'Mercado Pago' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Correo de registro en Mercado Pago <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={correoMercadoPago}
                    onChange={(e) => setCorreoMercadoPago(e.target.value)}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogRegistroTarjeta(false);
                  setOnboardingTarjeta(null);
                  setPlataformaTarjeta('');
                  setCorreoMercadoPago('');
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmarRegistroTarjeta}
                disabled={!plataformaTarjeta || (plataformaTarjeta === 'Mercado Pago' && !correoMercadoPago) || loading}
                className="flex-1"
              >
                {loading ? 'Guardando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}