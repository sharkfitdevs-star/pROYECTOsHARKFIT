import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Prospectos } from '@/entities/Prospectos';
import { Agendamientos } from '@/entities/Agendamientos';
import { Sucursales } from '@/entities/Sucursales';
import { Staff } from '@/entities/Staff';
import { User } from '@/entities/User';
import moment from 'moment';
import { cn } from '@/lib/utils';

export default function AgregarCompromisoManualDialog({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [sucursales, setSucursales] = useState([]);
  const [staff, setStaff] = useState([]);
  const [prospectos, setProspectos] = useState([]);
  const [user, setUser] = useState(null);

  // Tipo de registro
  const [tipoRegistro, setTipoRegistro] = useState('nuevo'); // 'nuevo' o 'existente'

  // Datos del nuevo prospecto
  const [nombre, setNombre] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [correo, setCorreo] = useState('');

  // Datos del prospecto existente
  const [prospectoExistente, setProspectoExistente] = useState('');
  const [openCombobox, setOpenCombobox] = useState(false);
  const [searchProspecto, setSearchProspecto] = useState('');

  // Datos del compromiso
  const [sede, setSede] = useState('');
  const [vendedor, setVendedor] = useState('');
  const [fechaCompromiso, setFechaCompromiso] = useState('');
  const [horaCompromiso, setHoraCompromiso] = useState('');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [sucursalesData, staffData, prospectosData, userData] = await Promise.all([
        Sucursales.list('nombre_sede'),
        Staff.list('nombre'),
        Prospectos.list('nombre'),
        User.me()
      ]);

      setSucursales(sucursalesData);
      setStaff(staffData.filter(s => s.roles?.includes('vendedor') && s.activo));
      setProspectos(prospectosData);
      setUser(userData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let prospectoId;
      let whatsappAValidar;

      // Si es un nuevo prospecto, crearlo primero
      if (tipoRegistro === 'nuevo') {
        if (!nombre || !whatsapp || !sede || !vendedor) {
          alert('Por favor completa todos los campos obligatorios del prospecto');
          setLoading(false);
          return;
        }

        whatsappAValidar = whatsapp;

        // Verificar si ya existe un prospecto con este whatsapp
        const prospectoExistentePorWhatsapp = prospectos.find(p => p.whatsapp === whatsapp);
        
        if (prospectoExistentePorWhatsapp) {
          // Ya existe - solo actualizar
          prospectoId = prospectoExistentePorWhatsapp.id;
          
          // Actualizar el prospecto existente
          await Prospectos.update(prospectoId, {
            estado_pipeline: 'Compromiso de compra',
            tipo_invitacion: 'Promesa de compra',
            fecha_compromiso: `${fechaCompromiso}T${horaCompromiso}:00`,
            notas: `${prospectoExistentePorWhatsapp.notas || ''}\n\n[${moment().format('DD/MM/YYYY HH:mm')}] Compromiso actualizado: ${notas || ''}`
          });

          alert(`El contacto ${prospectoExistentePorWhatsapp.nombre} ya existía. Se actualizó la fecha del compromiso.`);
        } else {
          // No existe - crear nuevo
          const nuevoProspecto = await Prospectos.create({
            nombre,
            whatsapp,
            correo: correo || undefined,
            sede,
            vendedor_asignado: vendedor,
            tipo_invitacion: 'Promesa de compra',
            estado_pipeline: 'Compromiso de compra',
            fecha_ingreso: moment().format('YYYY-MM-DD'),
            fecha_compromiso: `${fechaCompromiso}T${horaCompromiso}:00`,
            notas: `Compromiso de compra registrado manualmente. ${notas || ''}`
          });

          prospectoId = nuevoProspecto.id;
        }
      } else {
        // Usar prospecto existente
        if (!prospectoExistente) {
          alert('Por favor selecciona un prospecto');
          setLoading(false);
          return;
        }
        prospectoId = prospectoExistente;
        
        const prospecto = prospectos.find(p => p.id === prospectoExistente);
        whatsappAValidar = prospecto?.whatsapp;

        // Actualizar el prospecto a estado Compromiso de compra
        await Prospectos.update(prospectoId, {
          estado_pipeline: 'Compromiso de compra',
          tipo_invitacion: 'Promesa de compra',
          fecha_compromiso: `${fechaCompromiso}T${horaCompromiso}:00`
        });
      }

      // Validar campos del compromiso
      if (!fechaCompromiso || !horaCompromiso || !sede) {
        alert('Por favor completa la fecha, hora y sede del compromiso');
        setLoading(false);
        return;
      }

      // Verificar si ya existe un agendamiento tipo "Promesa de compra" para este prospecto
      const agendamientosExistentes = await Agendamientos.filter({ 
        prospecto_id: prospectoId,
        tipo_visita: 'Promesa de compra'
      });

      const fechaHora = `${fechaCompromiso}T${horaCompromiso}:00`;
      
      const prospecto = tipoRegistro === 'nuevo' 
        ? { nombre } 
        : prospectos.find(p => p.id === prospectoExistente);

      if (agendamientosExistentes && agendamientosExistentes.length > 0) {
        // Ya existe un agendamiento - actualizar la fecha
        await Agendamientos.update(agendamientosExistentes[0].id, {
          fecha_hora: fechaHora,
          sede,
          notas: `${agendamientosExistentes[0].notas || ''}\n\n[${moment().format('DD/MM/YYYY HH:mm')}] Fecha actualizada: ${notas || ''}`
        });
      } else {
        // No existe - crear nuevo agendamiento
        await Agendamientos.create({
          prospecto_id: prospectoId,
          prospecto_nombre: prospecto.nombre,
          sede,
          fecha_hora: fechaHora,
          tipo_visita: 'Promesa de compra',
          resultado_asistencia: 'Pendiente',
          registrado_por: user?.id || 'sistema',
          notas: notas || 'Compromiso registrado manualmente'
        });
      }

      alert('Compromiso de compra registrado exitosamente');
      onClose();
    } catch (error) {
      console.error('Error registrando compromiso:', error);
      alert('Error al registrar el compromiso. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar Compromiso de Compra Manual</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Registro */}
          <div className="space-y-2">
            <Label>Tipo de Registro</Label>
            <RadioGroup value={tipoRegistro} onValueChange={setTipoRegistro}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nuevo" id="nuevo" />
                <Label htmlFor="nuevo" className="font-normal cursor-pointer">
                  Nuevo Prospecto (ej: persona que pagó inscripción)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existente" id="existente" />
                <Label htmlFor="existente" className="font-normal cursor-pointer">
                  Prospecto Existente
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Formulario para Nuevo Prospecto */}
          {tipoRegistro === 'nuevo' && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-sm text-blue-900">Datos del Nuevo Prospecto</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre Completo *</Label>
                  <Input
                    id="nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp *</Label>
                  <Input
                    id="whatsapp"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="Ej: +56912345678"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="correo">Correo Electrónico</Label>
                  <Input
                    id="correo"
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="Ej: juan@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendedor-nuevo">Vendedor Asignado *</Label>
                  <Select value={vendedor} onValueChange={setVendedor} required>
                    <SelectTrigger id="vendedor-nuevo">
                      <SelectValue placeholder="Seleccionar vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Buscador de Prospecto Existente */}
          {tipoRegistro === 'existente' && (
            <div className="space-y-2">
              <Label>Buscar Prospecto *</Label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-full justify-between"
                  >
                    {prospectoExistente
                      ? prospectos.find((p) => p.id === prospectoExistente)?.nombre
                      : "Escribe para buscar..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Buscar por nombre o WhatsApp..." 
                      value={searchProspecto}
                      onValueChange={setSearchProspecto}
                    />
                    <CommandList>
                      <CommandEmpty>No se encontraron prospectos.</CommandEmpty>
                      <CommandGroup>
                        {prospectos
                          .filter(p => {
                            const search = searchProspecto.toLowerCase();
                            return (
                              p.nombre?.toLowerCase().includes(search) ||
                              p.whatsapp?.toLowerCase().includes(search)
                            );
                          })
                          .map((p) => (
                            <CommandItem
                              key={p.id}
                              value={p.id}
                              onSelect={() => {
                                setProspectoExistente(p.id);
                                setOpenCombobox(false);
                                setSearchProspecto('');
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  prospectoExistente === p.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{p.nombre}</span>
                                <span className="text-xs text-muted-foreground">
                                  {p.whatsapp} • {p.estado_pipeline || 'Sin estado'}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {prospectoExistente && (
                <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-md border border-blue-200">
                  <p className="font-medium text-blue-900">
                    {prospectos.find(p => p.id === prospectoExistente)?.nombre}
                  </p>
                  <p className="text-xs">
                    WhatsApp: {prospectos.find(p => p.id === prospectoExistente)?.whatsapp}
                  </p>
                  <p className="text-xs">
                    Estado: {prospectos.find(p => p.id === prospectoExistente)?.estado_pipeline || 'Sin estado'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Datos del Compromiso */}
          <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-semibold text-sm text-green-900">Datos del Compromiso de Compra</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sede">Sede *</Label>
                <Select value={sede} onValueChange={setSede} required>
                  <SelectTrigger id="sede">
                    <SelectValue placeholder="Seleccionar sede" />
                  </SelectTrigger>
                  <SelectContent>
                    {sucursales.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.nombre_sede}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha Estimada de Compra *</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={fechaCompromiso}
                  onChange={(e) => setFechaCompromiso(e.target.value)}
                  min={moment().format('YYYY-MM-DD')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hora">Hora Estimada *</Label>
                <Input
                  id="hora"
                  type="time"
                  value={horaCompromiso}
                  onChange={(e) => setHoraCompromiso(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas">Notas / Contexto</Label>
              <Textarea
                id="notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Pagó inscripción $20.000. Interesado en plan mensual. Espera recibir pago de sueldo el día 5."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Registrar Compromiso'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}