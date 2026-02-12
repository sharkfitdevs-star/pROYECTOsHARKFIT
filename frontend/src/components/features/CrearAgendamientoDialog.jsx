import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Prospectos } from '@/entities/Prospectos';
import { Clientes } from '@/entities/Clientes';
import { Agendamientos } from '@/entities/Agendamientos';
import { Sucursales } from '@/entities/Sucursales';
import { Staff } from '@/entities/Staff';
import { Clases } from '@/entities/Clases';
import { Planes_Servicios } from '@/entities/Planes_Servicios';
import { User } from '@/entities/User';
import { format, addMonths } from 'date-fns';
import { generarTareasOnboardingClienteNuevo } from '@/utils/onboardingHelper';

export default function CrearAgendamientoDialog({ open, onClose, onSave }) {
  const [loading, setLoading] = useState(false);
  const [tipoPersona, setTipoPersona] = useState('prospecto'); // 'prospecto' o 'cliente'
  const [modoCliente, setModoCliente] = useState('existente'); // 'existente' o 'nuevo'
  
  // Catálogos
  const [sucursales, setSucursales] = useState([]);
  const [staff, setStaff] = useState([]);
  const [clases, setClases] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Datos del formulario
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [nombre, setNombre] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [correo, setCorreo] = useState('');
  const [rut, setRut] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [sede, setSede] = useState('');
  const [vendedor, setVendedor] = useState('');
  const [fechaHora, setFechaHora] = useState('');
  const [tipoVisita, setTipoVisita] = useState('Invitación');
  const [notas, setNotas] = useState('');
  
  // Campos específicos para Cliente
  const [fechaPrimerCompra, setFechaPrimerCompra] = useState('');
  const [planActual, setPlanActual] = useState('');
  
  // Campos específicos para El Bosque
  const [claseSeleccionada, setClaseSeleccionada] = useState('');
  
  // Campo específico para Vendify Pro
  const [fechaVisita, setFechaVisita] = useState('');
  
  // Detectar si la sede es "El Bosque"
  const sedeSeleccionada = sucursales.find(s => s.id === sede);
  const isElBosque = sedeSeleccionada?.nombre_sede?.toLowerCase().includes('bosque');
  
  // Detectar si la clase es "Vendify Pro"
  const claseSeleccionadaObj = clases.find(c => c.id === claseSeleccionada);
  const isVendifyPro = claseSeleccionadaObj?.nombre_clase?.toLowerCase().includes('vendify pro');

  useEffect(() => {
    if (open) {
      loadCatalogos();
      resetForm();
    }
  }, [open]);

  const loadCatalogos = async () => {
    try {
      const [sucursalesData, staffData, clasesData, clientesData, planesData, userData] = await Promise.all([
        Sucursales.list(),
        Staff.list(),
        Clases.list(),
        Clientes.list(),
        Planes_Servicios.list(),
        User.me()
      ]);
      
      setSucursales(sucursalesData?.filter(s => s.activa) || []);
      setStaff(staffData?.filter(s => s.activo && s.roles?.includes('vendedor')) || []);
      setClases(clasesData?.filter(c => c.activa) || []);
      setClientes(clientesData || []);
      setPlanes(planesData?.filter(p => p.activo) || []);
      setCurrentUser(userData);
    } catch (error) {
      console.error('Error cargando catálogos:', error);
    }
  };

  const resetForm = () => {
    setTipoPersona('prospecto');
    setModoCliente('existente');
    setClienteSeleccionado('');
    setNombre('');
    setWhatsapp('');
    setCorreo('');
    setRut('');
    setFechaNacimiento('');
    setSede('');
    setVendedor('');
    setFechaHora('');
    setTipoVisita('Invitación');
    setNotas('');
    setFechaPrimerCompra('');
    setPlanActual('');
    setClaseSeleccionada('');
    setFechaVisita('');
  };

  const handleClienteSeleccionadoChange = (clienteId) => {
    setClienteSeleccionado(clienteId);
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente) {
      setNombre(cliente.nombre_cliente || '');
      setWhatsapp(cliente.whatsapp || '');
      setSede(cliente.sede || '');
      setFechaPrimerCompra(cliente.fecha_primer_compra || '');
      setPlanActual(cliente.plan_actual || '');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let prospectoId = null;
      let prospectoNombre = nombre;

      if (tipoPersona === 'cliente') {
        if (modoCliente === 'existente') {
          // Cliente existente: buscar o crear prospecto asociado
          const clienteData = clientes.find(c => c.id === clienteSeleccionado);
          if (!clienteData) {
            alert('Cliente no encontrado');
            setLoading(false);
            return;
          }

          // Buscar si ya existe un prospecto con ese whatsapp
          const prospectosExistentes = await Prospectos.filter({ whatsapp: clienteData.whatsapp });
          
          if (prospectosExistentes && prospectosExistentes.length > 0) {
            // Usar el prospecto existente
            prospectoId = prospectosExistentes[0].id;
            prospectoNombre = prospectosExistentes[0].nombre;
          } else {
            // Crear nuevo prospecto para el cliente
            const nuevoProspecto = await Prospectos.create({
              nombre: clienteData.nombre_cliente,
              whatsapp: clienteData.whatsapp,
              sede: clienteData.sede,
              vendedor_asignado: vendedor || clienteData.vendedor_origen,
              tipo_invitacion: tipoVisita,
              estado_pipeline: 'Agendado',
              fecha_ingreso: format(new Date(), 'yyyy-MM-dd'),
              clase_asistira: claseSeleccionada || undefined,
              fecha_visita: fechaVisita || undefined,
              notas: `Cliente existente - ${notas || ''}`
            });
            prospectoId = nuevoProspecto.id;
            prospectoNombre = nuevoProspecto.nombre;
          }
        } else {
          // Cliente nuevo: crear cliente y prospecto
          const planSeleccionado = planes.find(p => p.id === planActual);
          const fechaInicioPlan = fechaPrimerCompra;
          const fechaFinPlan = planSeleccionado?.duracion_meses 
            ? format(addMonths(new Date(fechaInicioPlan), planSeleccionado.duracion_meses), 'yyyy-MM-dd')
            : null;

          // Crear cliente
          const nuevoCliente = await Clientes.create({
            nombre_cliente: nombre,
            whatsapp: whatsapp,
            sede: sede,
            fecha_primer_compra: fechaPrimerCompra,
            plan_actual: planActual,
            modalidad_actual: planSeleccionado?.modalidad_cobro,
            duracion_actual_meses: planSeleccionado?.duracion_meses,
            canal_origen: 'En sede',
            vendedor_origen: vendedor,
            fecha_inicio_plan_actual: fechaInicioPlan,
            fecha_fin_plan_actual: fechaFinPlan,
            activo: true,
            notas: notas
          });

          // 🎯 TRIGGER AUTOMÁTICO: Generar tareas de onboarding
          try {
            await generarTareasOnboardingClienteNuevo(nuevoCliente);
          } catch (error) {
            console.error('Error generando tareas de onboarding:', error);
          }

          // Crear prospecto asociado
          const nuevoProspecto = await Prospectos.create({
            nombre: nombre,
            whatsapp: whatsapp,
            correo: correo || undefined,
            rut: rut || undefined,
            fecha_nacimiento: fechaNacimiento || undefined,
            sede: sede,
            vendedor_asignado: vendedor,
            tipo_invitacion: tipoVisita,
            estado_pipeline: 'Agendado',
            fecha_ingreso: format(new Date(), 'yyyy-MM-dd'),
            clase_asistira: claseSeleccionada || undefined,
            fecha_visita: fechaVisita || undefined,
            notas: `Cliente nuevo - ${notas || ''}`
          });
          prospectoId = nuevoProspecto.id;
          prospectoNombre = nuevoProspecto.nombre;
        }
      } else {
        // Prospecto nuevo
        const nuevoProspecto = await Prospectos.create({
          nombre: nombre,
          whatsapp: whatsapp,
          correo: correo || undefined,
          rut: rut || undefined,
          fecha_nacimiento: fechaNacimiento || undefined,
          sede: sede,
          vendedor_asignado: vendedor,
          tipo_invitacion: tipoVisita,
          estado_pipeline: 'Agendado',
          fecha_ingreso: format(new Date(), 'yyyy-MM-dd'),
          clase_asistira: claseSeleccionada || undefined,
          fecha_visita: fechaVisita || undefined,
          notas: notas
        });
        prospectoId = nuevoProspecto.id;
        prospectoNombre = nuevoProspecto.nombre;
      }

      // Crear agendamiento
      await Agendamientos.create({
        prospecto_id: prospectoId,
        prospecto_nombre: prospectoNombre,
        sede: sede,
        fecha_hora: fechaHora,
        tipo_visita: tipoVisita,
        resultado_asistencia: 'Pendiente',
        registrado_por: currentUser?.id,
        notas: notas
      });

      onSave?.();
      onClose();
    } catch (error) {
      console.error('Error creando agendamiento:', error);
      alert('Error al crear el agendamiento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Agendamiento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selector Cliente/Prospecto */}
          <div className="space-y-2">
            <Label>Tipo de Persona</Label>
            <RadioGroup value={tipoPersona} onValueChange={setTipoPersona}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="prospecto" id="prospecto" />
                <Label htmlFor="prospecto" className="cursor-pointer">Prospecto</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cliente" id="cliente" />
                <Label htmlFor="cliente" className="cursor-pointer">Cliente</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Si es Cliente: Selector Existente/Nuevo */}
          {tipoPersona === 'cliente' && (
            <div className="space-y-2">
              <Label>Cliente</Label>
              <RadioGroup value={modoCliente} onValueChange={setModoCliente}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="existente" id="existente" />
                  <Label htmlFor="existente" className="cursor-pointer">Seleccionar Existente</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nuevo" id="nuevo" />
                  <Label htmlFor="nuevo" className="cursor-pointer">Crear Nuevo</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Si es Cliente Existente: Selector de Cliente */}
          {tipoPersona === 'cliente' && modoCliente === 'existente' && (
            <div className="space-y-2">
              <Label htmlFor="cliente-select">Seleccionar Cliente *</Label>
              <Select value={clienteSeleccionado} onValueChange={handleClienteSeleccionadoChange} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nombre_cliente} - {cliente.whatsapp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Campos comunes (mostrar si es Prospecto o Cliente Nuevo) */}
          {(tipoPersona === 'prospecto' || (tipoPersona === 'cliente' && modoCliente === 'nuevo')) && (
            <>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre Completo *</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  placeholder="Nombre completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp *</Label>
                <Input
                  id="whatsapp"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  required
                  placeholder="+56912345678"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="correo">Correo</Label>
                  <Input
                    id="correo"
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="correo@ejemplo.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rut">RUT</Label>
                  <Input
                    id="rut"
                    value={rut}
                    onChange={(e) => setRut(e.target.value)}
                    placeholder="12345678-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha-nacimiento">Fecha de Nacimiento</Label>
                <Input
                  id="fecha-nacimiento"
                  type="date"
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Campos específicos para Cliente Nuevo */}
          {tipoPersona === 'cliente' && modoCliente === 'nuevo' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="fecha-primer-compra">Fecha Primer Compra *</Label>
                <Input
                  id="fecha-primer-compra"
                  type="date"
                  value={fechaPrimerCompra}
                  onChange={(e) => setFechaPrimerCompra(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan-actual">Plan Actual *</Label>
                <Select value={planActual} onValueChange={setPlanActual} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {planes.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.nombre_plan} ({plan.duracion_meses} meses - {plan.modalidad_cobro})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Sede */}
          <div className="space-y-2">
            <Label htmlFor="sede">Sede *</Label>
            <Select 
              value={sede} 
              onValueChange={setSede} 
              required
              disabled={tipoPersona === 'cliente' && modoCliente === 'existente' && clienteSeleccionado}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione una sede" />
              </SelectTrigger>
              <SelectContent>
                {sucursales.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre_sede}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Si es El Bosque: Mostrar selector de Clases */}
          {isElBosque && (
            <div className="space-y-2">
              <Label htmlFor="clase">Clase</Label>
              <Select value={claseSeleccionada} onValueChange={setClaseSeleccionada}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una clase" />
                </SelectTrigger>
                <SelectContent>
                  {clases.map((clase) => (
                    <SelectItem key={clase.id} value={clase.id}>
                      {clase.nombre_clase}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Si es Vendify Pro: Mostrar fecha de visita */}
          {isElBosque && isVendifyPro && (
            <div className="space-y-2">
              <Label htmlFor="fecha-visita">Fecha de Visita *</Label>
              <Input
                id="fecha-visita"
                type="date"
                value={fechaVisita}
                onChange={(e) => setFechaVisita(e.target.value)}
                required
              />
            </div>
          )}

          {/* Vendedor */}
          <div className="space-y-2">
            <Label htmlFor="vendedor">Vendedor Asignado *</Label>
            <Select value={vendedor} onValueChange={setVendedor} required>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un vendedor" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fecha y Hora del Agendamiento */}
          <div className="space-y-2">
            <Label htmlFor="fecha-hora">Fecha y Hora del Agendamiento *</Label>
            <Input
              id="fecha-hora"
              type="datetime-local"
              value={fechaHora}
              onChange={(e) => setFechaHora(e.target.value)}
              required
            />
          </div>

          {/* Tipo de Visita */}
          <div className="space-y-2">
            <Label htmlFor="tipo-visita">Tipo de Visita *</Label>
            <Select value={tipoVisita} onValueChange={setTipoVisita} required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Invitación">Invitación</SelectItem>
                <SelectItem value="Promesa de compra">Promesa de compra</SelectItem>
                <SelectItem value="Venta Online">Venta Online</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Notas adicionales..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Crear Agendamiento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}