import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Search, PauseCircle, User, Building2, CreditCard, Calendar, MessageCircle } from 'lucide-react';
import { Clientes } from '@/entities/Clientes';
import { Sucursales } from '@/entities/Sucursales';
import { Planes_Servicios } from '@/entities/Planes_Servicios';
import { Pausas_Clientes } from '@/entities/Pausas_Clientes';
import { Tareas_Sistema_Online } from '@/entities/Tareas_Sistema_Online';
import moment from 'moment';

export default function ProgramarPausaDialog({ open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  // Datos
  const [clientes, setClientes] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [planes, setPlanes] = useState([]);
  
  // Filtros
  const [sedeFilter, setSedeFilter] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  
  // Selección y formulario
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [fechaUltimoCobro, setFechaUltimoCobro] = useState('');
  const [fechaFinPausa, setFechaFinPausa] = useState('');
  const [plataformaCobro, setPlataformaCobro] = useState('');
  const [motivoPausa, setMotivoPausa] = useState('');
  const [detalleMotivo, setDetalleMotivo] = useState('');
  const [programarMensajePausa, setProgramarMensajePausa] = useState(false);
  const [programarMensajeActivacion, setProgramarMensajeActivacion] = useState(false);

  useEffect(() => {
    if (open) {
      cargarDatos();
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setClienteSeleccionado(null);
    setFechaUltimoCobro('');
    setFechaFinPausa('');
    setPlataformaCobro('');
    setMotivoPausa('');
    setDetalleMotivo('');
    setProgramarMensajePausa(false);
    setProgramarMensajeActivacion(false);
    setBusqueda('');
    setSedeFilter('todas');
  };

  const cargarDatos = async () => {
    try {
      setLoadingData(true);
      const [clientesData, sucursalesData, planesData] = await Promise.all([
        Clientes.list('-createdAt'),
        Sucursales.list('nombre_sede'),
        Planes_Servicios.list('nombre_plan')
      ]);
      
      setClientes(clientesData);
      setSucursales(sucursalesData.filter(s => s.activo));
      setPlanes(planesData.filter(p => p.activo));
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Filtrar solo clientes con suscripción activa
  const clientesSuscripcion = useMemo(() => {
    return clientes.filter(c => {
      // Solo clientes con modalidad Suscripción y estado activo
      if (c.modalidad_actual !== 'Suscripción') return false;
      if (c.estado_suscripcion !== 'Activo') return false;
      
      // Filtro por sede
      if (sedeFilter !== 'todas' && c.sede !== sedeFilter) return false;
      
      // Filtro por búsqueda
      if (busqueda.trim()) {
        const termino = busqueda.toLowerCase();
        return c.nombre_cliente?.toLowerCase().includes(termino) ||
               c.whatsapp?.toLowerCase().includes(termino);
      }
      
      return true;
    });
  }, [clientes, sedeFilter, busqueda]);

  const obtenerPlan = (planId) => planes.find(p => p.id === planId);
  const obtenerSede = (sedeId) => sucursales.find(s => s.id === sedeId);

  const handleSeleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
  };

  const handleProgramarPausa = async () => {
    if (!clienteSeleccionado) {
      alert('Por favor selecciona un cliente');
      return;
    }
    if (!fechaUltimoCobro) {
      alert('Por favor ingresa la fecha de último cobro');
      return;
    }
    if (!fechaFinPausa) {
      alert('Por favor ingresa la fecha de inicio del siguiente plan');
      return;
    }
    if (!plataformaCobro) {
      alert('Por favor selecciona la plataforma de cobro');
      return;
    }

    try {
      setLoading(true);
      
      const plan = obtenerPlan(clienteSeleccionado.plan_actual);
      const sede = obtenerSede(clienteSeleccionado.sede);
      
      // 1. Crear registro de pausa
      const nuevaPausa = await Pausas_Clientes.create({
        cliente_id: clienteSeleccionado.id,
        cliente_nombre: clienteSeleccionado.nombre_cliente,
        cliente_whatsapp: clienteSeleccionado.whatsapp,
        sede_id: clienteSeleccionado.sede,
        plan_id: clienteSeleccionado.plan_actual,
        plan_nombre: plan?.nombre_plan || '',
        plataforma_cobro: plataformaCobro,
        fecha_ultimo_cobro: fechaUltimoCobro,
        fecha_fin_pausa: fechaFinPausa,
        motivo_pausa: motivoPausa || 'Otro',
        detalle_motivo: detalleMotivo,
        estado: 'Programada',
        programar_mensaje_pausa: programarMensajePausa,
        programar_mensaje_activacion: programarMensajeActivacion,
        notas: `Pausa programada el ${moment().format('DD/MM/YYYY HH:mm')}`
      });

      // 2. Crear tarea para PAUSAR el plan (fecha_ultimo_cobro)
      const tareaPausar = await Tareas_Sistema_Online.create({
        titulo: `Pausar Plan: ${clienteSeleccionado.nombre_cliente}`,
        descripcion: `Pausar suscripción en ${plataformaCobro}.\n\nPlan: ${plan?.nombre_plan || 'N/A'}\nWhatsApp: ${clienteSeleccionado.whatsapp}\nMotivo: ${motivoPausa || 'No especificado'}\n${detalleMotivo ? `Detalle: ${detalleMotivo}` : ''}\n\nFecha reactivación: ${moment(fechaFinPausa).format('DD/MM/YYYY')}`,
        departamento: 'Soporte',
        tipo_tarea: 'Otra',
        prioridad: 'Alta',
        estado: 'Pendiente',
        fecha_creacion: new Date().toISOString(),
        fecha_vencimiento: fechaUltimoCobro,
        sede_id: clienteSeleccionado.sede,
        cliente_id: clienteSeleccionado.id,
        cliente_nombre: clienteSeleccionado.nombre_cliente,
        cliente_whatsapp: clienteSeleccionado.whatsapp,
        referencia_id: nuevaPausa.id,
        referencia_tipo: 'Pausas_Clientes',
        notas: `Plataforma: ${plataformaCobro} | ${programarMensajePausa ? 'Enviar mensaje de pausa' : 'No enviar mensaje'}`
      });

      // 3. Crear tarea para ACTIVAR el plan (fecha_fin_pausa)
      const tareaActivar = await Tareas_Sistema_Online.create({
        titulo: `Activar Plan: ${clienteSeleccionado.nombre_cliente}`,
        descripcion: `Reactivar suscripción en ${plataformaCobro} después de pausa.\n\nPlan: ${plan?.nombre_plan || 'N/A'}\nWhatsApp: ${clienteSeleccionado.whatsapp}\n\nFecha pausa: ${moment(fechaUltimoCobro).format('DD/MM/YYYY')}`,
        departamento: 'Soporte',
        tipo_tarea: 'Otra',
        prioridad: 'Alta',
        estado: 'Pendiente',
        fecha_creacion: new Date().toISOString(),
        fecha_vencimiento: fechaFinPausa,
        sede_id: clienteSeleccionado.sede,
        cliente_id: clienteSeleccionado.id,
        cliente_nombre: clienteSeleccionado.nombre_cliente,
        cliente_whatsapp: clienteSeleccionado.whatsapp,
        referencia_id: nuevaPausa.id,
        referencia_tipo: 'Pausas_Clientes',
        notas: `Plataforma: ${plataformaCobro} | ${programarMensajeActivacion ? 'Enviar mensaje de activación' : 'No enviar mensaje'}`
      });

      // 4. Actualizar la pausa con los IDs de las tareas
      await Pausas_Clientes.update(nuevaPausa.id, {
        tarea_pausar_id: tareaPausar.id,
        tarea_activar_id: tareaActivar.id
      });

      alert(`✅ Pausa programada exitosamente\n\n• Cliente: ${clienteSeleccionado.nombre_cliente}\n• Pausar el: ${moment(fechaUltimoCobro).format('DD/MM/YYYY')}\n• Activar el: ${moment(fechaFinPausa).format('DD/MM/YYYY')}\n• Plataforma: ${plataformaCobro}\n\nSe crearon 2 tareas en Sistema Online (Soporte)`);
      
      resetForm();
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error programando pausa:', error);
      alert('Error al programar la pausa');
    } finally {
      setLoading(false);
    }
  };

  const handleCerrar = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleCerrar}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PauseCircle className="w-5 h-5 text-blue-600" />
            Programar Pausa de Plan
          </DialogTitle>
          <DialogDescription>
            Programa una pausa temporal para un cliente con suscripción
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>¿Qué hace esta acción?</strong><br />
              Programa una pausa del plan del cliente. Genera dos tareas en Sistema Online (Soporte):
              una para pausar el plan en la fecha de último cobro y otra para activarlo en la fecha de inicio.
            </p>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Filtrar por Sede</Label>
              <Select value={sedeFilter} onValueChange={setSedeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las sedes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las sedes</SelectItem>
                  {sucursales.map(sede => (
                    <SelectItem key={sede.id} value={sede.id}>{sede.nombre_sede}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Buscar Cliente</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Nombre o WhatsApp..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Cliente Seleccionado */}
          {clienteSeleccionado ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {clienteSeleccionado.nombre_cliente}
                  </h4>
                  <p className="text-sm text-blue-700 mt-1">{clienteSeleccionado.whatsapp}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-blue-600">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {obtenerSede(clienteSeleccionado.sede)?.nombre_sede || 'N/A'}
                    </span>
                    <span className="flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      {obtenerPlan(clienteSeleccionado.plan_actual)?.nombre_plan || 'N/A'}
                    </span>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setClienteSeleccionado(null)}
                  className="text-blue-600"
                >
                  Cambiar
                </Button>
              </div>

              {/* Formulario de Pausa */}
              <div className="mt-4 pt-4 border-t border-blue-200 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Fecha Último Cobro (Pausar) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={fechaUltimoCobro}
                      onChange={(e) => setFechaUltimoCobro(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Fecha en que se debe pausar el plan</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Fecha Inicio Siguiente Plan (Activar) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={fechaFinPausa}
                      onChange={(e) => setFechaFinPausa(e.target.value)}
                      min={fechaUltimoCobro || undefined}
                    />
                    <p className="text-xs text-gray-500 mt-1">Fecha en que se debe reactivar el plan</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Plataforma de Cobro <span className="text-red-500">*</span>
                  </Label>
                  <Select value={plataformaCobro} onValueChange={setPlataformaCobro}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar plataforma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EVO">EVO</SelectItem>
                      <SelectItem value="Mercado Pago">Mercado Pago</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Motivo de la Pausa</Label>
                  <Select value={motivoPausa} onValueChange={setMotivoPausa}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar motivo (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vacaciones">Vacaciones</SelectItem>
                      <SelectItem value="Viaje">Viaje</SelectItem>
                      <SelectItem value="Lesión">Lesión</SelectItem>
                      <SelectItem value="Personal">Personal</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Detalle del Motivo</Label>
                  <Textarea
                    value={detalleMotivo}
                    onChange={(e) => setDetalleMotivo(e.target.value)}
                    placeholder="Detalles adicionales (opcional)"
                    rows={2}
                  />
                </div>

                <div className="space-y-3 p-3 bg-white rounded-lg border">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-green-600" />
                    Mensajes Programados
                  </p>
                  
                  {/* Mensaje de Activación de pausa - se envía 3 días antes de reactivar */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={programarMensajeActivacion}
                        onCheckedChange={setProgramarMensajeActivacion}
                      />
                      <span className="text-sm">Programar mensaje de activación de pausa</span>
                    </label>
                    
                    {programarMensajeActivacion && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs font-medium text-blue-800 mb-2">
                          ⚠️ Programar este mensaje 3 días antes de la activación:
                        </p>
                        <div className="text-sm text-blue-900 whitespace-pre-line font-mono bg-white p-2 rounded border">
{`Hola buenas tardes/buen día ${clienteSeleccionado?.nombre_cliente?.split(' ')[0] || clienteSeleccionado?.nombre_cliente || '[Nombre]'}, espero estés muy bien, te escribimos para recordar que tu plan se activará nuevamente el día ${fechaFinPausa ? moment(fechaFinPausa).format('DD/MM/YYYY') : '[fecha]'}, te esperamos 🤗`}
                        </div>
                        {fechaFinPausa && (
                          <p className="text-xs text-blue-600 mt-2 font-medium">
                            📅 Fecha para enviar este mensaje: {moment(fechaFinPausa).subtract(3, 'days').format('DD/MM/YYYY')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Mensaje de Plan en Pausa - se envía al momento de pausar */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={programarMensajePausa}
                        onCheckedChange={setProgramarMensajePausa}
                      />
                      <span className="text-sm">Programar mensaje de Plan en Pausa</span>
                    </label>
                    
                    {programarMensajePausa && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs font-medium text-green-800 mb-2">Vista previa del mensaje:</p>
                        <div className="text-sm text-green-900 whitespace-pre-line font-mono bg-white p-2 rounded border">
{`⏸️ PAUSA DE PLAN

Tu plan quedará pausado luego del cobro del: ${fechaUltimoCobro ? moment(fechaUltimoCobro).format('DD/MM/YYYY') : '[fecha último cobro]'}

Tu plan se reactivará el: ${fechaFinPausa ? moment(fechaFinPausa).format('DD/MM/YYYY') : '[fecha reactivación]'}

Tu siguiente cobro al volver será el: ${fechaFinPausa ? moment(fechaFinPausa).add(30, 'days').format('DD/MM/YYYY') : '[fecha siguiente cobro]'}

✅ Confirmamos la gestión de tu pausa. ¡Te avisaremos antes de la reactivación!`}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Listado de Clientes */
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <p className="text-sm font-medium text-gray-600">
                  Clientes con Suscripción Activa ({clientesSuscripcion.length})
                </p>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {loadingData ? (
                  <div className="p-8 text-center text-gray-500">
                    Cargando clientes...
                  </div>
                ) : clientesSuscripcion.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No se encontraron clientes con suscripción activa
                    {busqueda && ' que coincidan con la búsqueda'}
                  </div>
                ) : (
                  <div className="divide-y">
                    {clientesSuscripcion.slice(0, 50).map(cliente => {
                      const plan = obtenerPlan(cliente.plan_actual);
                      const sede = obtenerSede(cliente.sede);
                      
                      return (
                        <div
                          key={cliente.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleSeleccionarCliente(cliente)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{cliente.nombre_cliente}</p>
                              <p className="text-xs text-gray-500">{cliente.whatsapp}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className="text-xs">
                                {sede?.nombre_sede || 'N/A'}
                              </Badge>
                              <p className="text-xs text-gray-500 mt-1">{plan?.nombre_plan || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {clientesSuscripcion.length > 50 && (
                      <div className="p-3 text-center text-sm text-gray-500 bg-gray-50">
                        Mostrando 50 de {clientesSuscripcion.length} clientes. Usa el buscador para encontrar más.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleCerrar} className="flex-1">
            Cancelar
          </Button>
          <Button 
            onClick={handleProgramarPausa}
            disabled={!clienteSeleccionado || !fechaUltimoCobro || !fechaFinPausa || !plataformaCobro || loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Programando...' : 'Programar Pausa'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}