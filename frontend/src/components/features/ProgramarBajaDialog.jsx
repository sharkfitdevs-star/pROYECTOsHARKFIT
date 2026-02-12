import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Clientes } from '@/entities/Clientes';
import { Bajas_Programadas } from '@/entities/Bajas_Programadas';
import { Tareas_RS } from '@/entities/Tareas_RS';
import { Sucursales } from '@/entities/Sucursales';
import { Staff } from '@/entities/Staff';
import User from '@/entities/User';
import { format, addDays, parseISO } from 'date-fns';
import axios from 'axios';

export default function ProgramarBajaDialog({ open, onClose, onSuccess, clientePreseleccionado = null }) {
  const [loading, setLoading] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [staff, setStaff] = useState([]);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state
  const [sedeSeleccionada, setSedeSeleccionada] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [fechaBaja, setFechaBaja] = useState('');
  const [motivo, setMotivo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [fechaUltimoCobro, setFechaUltimoCobro] = useState('');
  const [metodoCobro, setMetodoCobro] = useState('');
  const [referenciaPago, setReferenciaPago] = useState('');
  const [programada, setProgramada] = useState(true);
  const [notas, setNotas] = useState('');

  // Auto-populated fields
  const [sede, setSede] = useState(null);
  const [responsableSede, setResponsableSede] = useState(null);

  useEffect(() => {
    if (open) {
      cargarDatos();
      if (clientePreseleccionado) {
        setClienteSeleccionado(clientePreseleccionado);
        autoPopularCampos(clientePreseleccionado);
      }
    } else {
      resetForm();
    }
  }, [open, clientePreseleccionado]);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      // Cargar sedes activas
      const sedesData = await Sucursales.filter({ activa: true }, 'nombre_sede', 100);
      setSedes(sedesData);

      // Cargar staff activo con rol RS
      const staffData = await Staff.filter({ activo: true }, 'nombre', 100);
      setStaff(staffData);

    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar clientes cuando se selecciona una sede
  const cargarClientesPorSede = async (sedeId) => {
    if (!sedeId) {
      setClientes([]);
      return;
    }

    try {
      setLoadingClientes(true);
      
      // Cargar solo clientes activos con suscripción de la sede seleccionada
      const clientesData = await Clientes.filter({ 
        sede: sedeId,
        estado_suscripcion: 'Activo'
      }, '-updatedAt', 1000);
      
      // Filtrar solo clientes con planes de suscripción
      const clientesSuscripcion = clientesData.filter(c => 
        c.modalidad_actual === 'Suscripción' && c.activo
      );
      
      setClientes(clientesSuscripcion);

    } catch (error) {
      console.error('Error cargando clientes:', error);
      setClientes([]);
    } finally {
      setLoadingClientes(false);
    }
  };

  const autoPopularCampos = async (cliente) => {
    // Auto-popular sede
    if (cliente.sede) {
      const sedeData = sedes.find(s => s.id === cliente.sede);
      setSede(sedeData);

      // Auto-popular responsable de sede
      if (sedeData?.responsable_sede) {
        const rsData = staff.find(s => s.id === sedeData.responsable_sede);
        setResponsableSede(rsData);
      }
    }

    // Auto-popular fecha de baja (fecha_fin_plan_actual)
    if (cliente.fecha_fin_plan_actual) {
      setFechaBaja(format(parseISO(cliente.fecha_fin_plan_actual), 'yyyy-MM-dd'));
    }

    // Auto-popular fecha último cobro (fecha_inicio_plan_actual como referencia)
    if (cliente.fecha_inicio_plan_actual) {
      setFechaUltimoCobro(format(parseISO(cliente.fecha_inicio_plan_actual), 'yyyy-MM-dd'));
    }
  };

  const resetForm = () => {
    setSedeSeleccionada('');
    setClienteSeleccionado(null);
    setClientes([]);
    setFechaBaja('');
    setMotivo('');
    setDetalle('');
    setFechaUltimoCobro('');
    setMetodoCobro('');
    setReferenciaPago('');
    setProgramada(true);
    setNotas('');
    setSede(null);
    setResponsableSede(null);
    setSearchTerm('');
  };

  // Manejar cambio de sede
  const handleSedeChange = (sedeId) => {
    setSedeSeleccionada(sedeId);
    setClienteSeleccionado(null);
    setSearchTerm('');
    
    // Buscar sede y responsable
    const sedeData = sedes.find(s => s.id === sedeId);
    setSede(sedeData);
    
    if (sedeData?.responsable_sede) {
      const rsData = staff.find(s => s.id === sedeData.responsable_sede);
      setResponsableSede(rsData);
    } else {
      setResponsableSede(null);
    }
    
    // Cargar clientes de la sede
    cargarClientesPorSede(sedeId);
  };

  const validarFormulario = () => {
    if (!clienteSeleccionado) {
      alert('Debe seleccionar un cliente');
      return false;
    }
    if (!fechaBaja) {
      alert('Debe ingresar la fecha de baja programada');
      return false;
    }
    if (!motivo) {
      alert('Debe seleccionar un motivo');
      return false;
    }
    if (!metodoCobro) {
      alert('Debe seleccionar el método de cobro');
      return false;
    }
    if (!fechaUltimoCobro) {
      alert('Debe ingresar la fecha del último cobro');
      return false;
    }

    // Validar que fecha de baja no sea menor a hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaBajaDate = new Date(fechaBaja);
    if (fechaBajaDate < hoy) {
      alert('La fecha de baja no puede ser anterior a hoy');
      return false;
    }

    return true;
  };

  const verificarDuplicado = async () => {
    try {
      const bajasExistentes = await Bajas_Programadas.filter({
        cliente: clienteSeleccionado.id,
        estado_gestion: ['programada', 'en_gestion']
      }, '-createdAt', 10);

      if (bajasExistentes.length > 0) {
        const confirmar = window.confirm(
          `Este cliente ya tiene una baja programada para el ${format(parseISO(bajasExistentes[0].fecha_baja_programada), 'dd/MM/yyyy')}. ¿Desea crear una nueva de todas formas?`
        );
        return confirmar;
      }
      return true;
    } catch (error) {
      console.error('Error verificando duplicados:', error);
      return true;
    }
  };

  const handleSubmit = async () => {
    if (!validarFormulario()) return;

    const puedeCrear = await verificarDuplicado();
    if (!puedeCrear) return;

    try {
      setLoading(true);
      const user = await User.me();

      // 1. Crear registro de Baja Programada
      const bajaData = {
        cliente: clienteSeleccionado.id,
        cliente_nombre: clienteSeleccionado.nombre_cliente,
        cliente_whatsapp: clienteSeleccionado.whatsapp,
        estado_cliente: (clienteSeleccionado.estado_suscripcion || 'Activo').toLowerCase(),
        plan_actual: clienteSeleccionado.plan_actual,
        fecha_baja_programada: fechaBaja,
        motivo,
        detalle_motivo: detalle,
        fecha_ultimo_cobro: fechaUltimoCobro,
        metodo_cobro: metodoCobro,
        referencia_pago: referenciaPago,
        programada,
        sede: sede?.id,
        responsable_sede: responsableSede?.id,
        estado_gestion: 'programada',
        creado_por: user.email,
        notas
      };

      const bajaCreada = await Bajas_Programadas.create(bajaData);

      // 2. Crear tarea automática para el Responsable de Sede
      const fechaVencimientoTarea = addDays(parseISO(fechaBaja), -2); // 48h antes

      const descripcionTarea = `
Cliente: ${clienteSeleccionado.nombre_cliente} (${clienteSeleccionado.whatsapp})
Sede: ${sede?.nombre_sede || 'N/A'}
Plan vence: ${format(parseISO(fechaBaja), 'dd/MM/yyyy')}
Motivo: ${motivo}${detalle ? ` - ${detalle}` : ''}
Último cobro: ${format(parseISO(fechaUltimoCobro), 'dd/MM/yyyy')}
Método: ${metodoCobro}${referenciaPago ? ` (${referenciaPago})` : ''}
      `.trim();

      const tareaData = {
        titulo: `Baja Programada: ${clienteSeleccionado.nombre_cliente}`,
        descripcion: descripcionTarea,
        tipo: 'baja_programada',
        prioridad: 'alta',
        fecha_limite: format(fechaVencimientoTarea, 'yyyy-MM-dd'),
        estado: 'pendiente',
        responsable: responsableSede?.id,
        sede: sede?.id,
        cliente: clienteSeleccionado.id,
        notas: `Baja programada ID: ${bajaCreada.id}`
      };

      const tareaCreada = await Tareas_RS.create(tareaData);

      // 3. Actualizar la baja con el ID de la tarea
      await Bajas_Programadas.update(bajaCreada.id, {
        tarea_asignada: tareaCreada.id
      });

      alert('Baja programada exitosamente. Se ha creado una tarea para el Responsable de Sede.');
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error programando baja:', error);
      alert('Error al programar la baja. Por favor intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const clientesFiltrados = clientes.filter(c => {
    const searchLower = searchTerm.toLowerCase();
    return (
      c.nombre_cliente?.toLowerCase().includes(searchLower) ||
      c.whatsapp?.includes(searchTerm) ||
      c.id?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Programar Baja de Cliente</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selector de Sede PRIMERO */}
          <div className="space-y-2">
            <Label htmlFor="sede">Sede *</Label>
            <Select 
              value={sedeSeleccionada} 
              onValueChange={handleSedeChange}
              disabled={!!clientePreseleccionado}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar sede primero..." />
              </SelectTrigger>
              <SelectContent>
                {sedes.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre_sede}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Seleccione la sede para buscar clientes
            </p>
          </div>

          {/* Buscador de Cliente - Solo se habilita después de seleccionar sede */}
          <div className="space-y-2">
            <Label>Cliente *</Label>
            {!sedeSeleccionada && !clientePreseleccionado ? (
              <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
                Primero seleccione una sede para buscar clientes
              </div>
            ) : (
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-full justify-between"
                    disabled={!!clientePreseleccionado || loadingClientes}
                  >
                    {loadingClientes ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cargando clientes...
                      </>
                    ) : clienteSeleccionado ? (
                      <span className="truncate">
                        {clienteSeleccionado.nombre_cliente} - {clienteSeleccionado.plan_actual}
                      </span>
                    ) : (
                      "Buscar cliente..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0">
                  <div className="flex flex-col">
                    {/* Search Input */}
                    <div className="flex items-center border-b px-3">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <input
                        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Escriba para buscar por nombre, whatsapp..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                      />
                    </div>
                    
                    {/* Results List */}
                    <div className="max-h-64 overflow-auto">
                      {clientesFiltrados.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          {loadingClientes 
                            ? "Cargando..." 
                            : searchTerm 
                              ? `No se encontraron resultados para "${searchTerm}"`
                              : `${clientes.length} clientes disponibles. Escriba para buscar...`
                          }
                        </div>
                      ) : (
                        <div className="p-1">
                          {clientesFiltrados.map((cliente) => (
                            <button
                              key={cliente.id}
                              onClick={() => {
                                setClienteSeleccionado(cliente);
                                autoPopularCampos(cliente);
                                setOpenCombobox(false);
                                setSearchTerm('');
                              }}
                              className="w-full flex items-start gap-2 px-2 py-2 text-left hover:bg-accent rounded-sm transition-colors"
                            >
                              <Check
                                className={cn(
                                  "mt-1 h-4 w-4 shrink-0",
                                  clienteSeleccionado?.id === cliente.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col flex-1 min-w-0">
                                <span className="font-medium truncate">{cliente.nombre_cliente}</span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {cliente.whatsapp} • {cliente.plan_actual} • Vence: {cliente.fecha_fin_plan_actual ? format(parseISO(cliente.fecha_fin_plan_actual), 'dd/MM/yyyy') : 'N/A'}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Información Auto-poblada */}
          {clienteSeleccionado && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Sede</Label>
                <p className="font-medium">{sede?.nombre_sede || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Responsable de Sede</Label>
                <p className="font-medium">{responsableSede?.nombre || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Plan Actual</Label>
                <p className="font-medium">{clienteSeleccionado.plan_actual}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Estado</Label>
                <p className="font-medium">{clienteSeleccionado.estado_suscripcion || 'Activo'}</p>
              </div>
            </div>
          )}

          {/* Fecha de Baja Programada */}
          <div className="space-y-2">
            <Label htmlFor="fechaBaja">Fecha de Baja Programada *</Label>
            <Input
              id="fechaBaja"
              type="date"
              value={fechaBaja}
              onChange={(e) => setFechaBaja(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
            <p className="text-xs text-muted-foreground">
              Fecha en la que vence el plan y se ejecutará la baja
            </p>
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo de la Baja *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Precio">Precio</SelectItem>
                <SelectItem value="Mudanza">Mudanza</SelectItem>
                <SelectItem value="No uso">No uso</SelectItem>
                <SelectItem value="Servicio">Servicio</SelectItem>
                <SelectItem value="Competencia">Competencia</SelectItem>
                <SelectItem value="Salud">Salud</SelectItem>
                <SelectItem value="Otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Detalle del Motivo */}
          {(motivo === 'Otro' || motivo) && (
            <div className="space-y-2">
              <Label htmlFor="detalle">Detalle del Motivo</Label>
              <Textarea
                id="detalle"
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                placeholder="Agregar detalles adicionales..."
                rows={3}
              />
            </div>
          )}

          {/* Fecha Último Cobro */}
          <div className="space-y-2">
            <Label htmlFor="fechaUltimoCobro">Fecha del Último Cobro *</Label>
            <Input
              id="fechaUltimoCobro"
              type="date"
              value={fechaUltimoCobro}
              onChange={(e) => setFechaUltimoCobro(e.target.value)}
            />
          </div>

          {/* Método de Cobro */}
          <div className="space-y-2">
            <Label htmlFor="metodoCobro">Método de Cobro *</Label>
            <Select value={metodoCobro} onValueChange={setMetodoCobro}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                <SelectItem value="Evo">Evo</SelectItem>
                <SelectItem value="Mercado Pago">Mercado Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Referencia de Pago */}
          <div className="space-y-2">
            <Label htmlFor="referenciaPago">Referencia de Pago (últimos 4 dígitos / ID)</Label>
            <Input
              id="referenciaPago"
              value={referenciaPago}
              onChange={(e) => setReferenciaPago(e.target.value)}
              placeholder="Ej: 1234 o ID de transacción"
            />
          </div>

          {/* Checkbox Baja Programada */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="programada"
              checked={programada}
              onCheckedChange={setProgramada}
            />
            <Label htmlFor="programada" className="cursor-pointer">
              Confirmar como Baja Programada
            </Label>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notas">Notas Adicionales</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Información adicional relevante..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Programar Baja'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}