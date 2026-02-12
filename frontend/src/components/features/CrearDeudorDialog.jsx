import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, AlertCircle, User, Building2, CreditCard, DollarSign } from 'lucide-react';
import { Clientes } from '@/entities/Clientes';
import { Sucursales } from '@/entities/Sucursales';
import { Planes_Servicios } from '@/entities/Planes_Servicios';
import { Deudores } from '@/entities/Deudores';
import { Tareas_RS } from '@/entities/Tareas_RS';
import { Staff } from '@/entities/Staff';
import moment from 'moment';

export default function CrearDeudorDialog({ open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  // Datos
  const [clientes, setClientes] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [staff, setStaff] = useState([]);
  const [deudoresExistentes, setDeudoresExistentes] = useState([]);
  
  // Filtros
  const [sedeFilter, setSedeFilter] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  
  // Selección
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  useEffect(() => {
    if (open) {
      cargarDatos();
    }
  }, [open]);

  const cargarDatos = async () => {
    try {
      setLoadingData(true);
      const [clientesData, sucursalesData, planesData, staffData, deudoresData] = await Promise.all([
        Clientes.list('-createdAt'),
        Sucursales.list('nombre_sede'),
        Planes_Servicios.list('nombre_plan'),
        Staff.list('nombre'),
        Deudores.list('-createdAt')
      ]);
      
      setClientes(clientesData);
      setSucursales(sucursalesData.filter(s => s.activo));
      setPlanes(planesData.filter(p => p.activo));
      setStaff(staffData.filter(s => s.activo));
      setDeudoresExistentes(deudoresData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Filtrar solo clientes con suscripción activa
  const clientesSuscripcion = useMemo(() => {
    return clientes.filter(c => {
      // Solo clientes con modalidad Suscripción
      if (c.modalidad_actual !== 'Suscripción') return false;
      
      // Excluir clientes que ya son deudores activos
      const yaEsDeudor = deudoresExistentes.some(d => 
        d.cliente_id === c.id && 
        !['Recuperado', 'Irrecuperable'].includes(d.estado_gestion)
      );
      if (yaEsDeudor) return false;
      
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
  }, [clientes, deudoresExistentes, sedeFilter, busqueda]);

  const obtenerPlan = (planId) => {
    return planes.find(p => p.id === planId);
  };

  const obtenerSede = (sedeId) => {
    return sucursales.find(s => s.id === sedeId);
  };

  const obtenerRSPorSede = (sedeId) => {
    // Buscar staff con rol RS en la sede, o cualquier staff de la sede
    const rs = staff.find(s => s.sede_principal === sedeId && s.roles?.includes('RS'));
    if (rs) return rs;
    // Si no hay RS, buscar cualquier staff de la sede
    return staff.find(s => s.sede_principal === sedeId);
  };

  const handleSeleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
  };

  const handleCrearDeudor = async () => {
    if (!clienteSeleccionado) {
      alert('Por favor selecciona un cliente');
      return;
    }

    try {
      setLoading(true);
      
      const plan = obtenerPlan(clienteSeleccionado.plan_actual);
      const sede = obtenerSede(clienteSeleccionado.sede);
      const responsableSede = obtenerRSPorSede(clienteSeleccionado.sede);
      
      const montoDeuda = plan?.precio || 0;
      const inicioMes = moment().startOf('month').format('YYYY-MM-DD');
      
      // 1. Crear registro de Deudor
      const nuevoDeudor = await Deudores.create({
        cliente_id: clienteSeleccionado.id,
        cliente_nombre: clienteSeleccionado.nombre_cliente,
        cliente_whatsapp: clienteSeleccionado.whatsapp,
        sede_id: clienteSeleccionado.sede,
        monto_adeudado: montoDeuda,
        dias_atraso: moment().diff(moment(inicioMes), 'days'),
        fecha_ultimo_pago: clienteSeleccionado.fecha_inicio_plan_actual || null,
        plan_actual: plan?.nombre_plan || '',
        estado_gestion: 'Pendiente',
        intentos_cobro: 0,
        notas: `Deuda generada manualmente el ${moment().format('DD/MM/YYYY')} - Suscripción mes ${moment().format('MMMM YYYY')}`
      });

      // 2. Actualizar estado del cliente a Deudor
      await Clientes.update(clienteSeleccionado.id, {
        estado_suscripcion: 'Deudor'
      });

      // 3. Crear tarea para Financiero (solo si hay responsable)
      if (responsableSede?.id) {
        await Tareas_RS.create({
          titulo: `Deudor a contactar: ${clienteSeleccionado.nombre_cliente}`,
          descripcion: `Cliente con deuda de suscripción del mes ${moment().format('MMMM YYYY')}.\nPlan: ${plan?.nombre_plan || 'N/A'}\nMonto: ${montoDeuda?.toLocaleString('es-CL') || '0'}\nWhatsApp: ${clienteSeleccionado.whatsapp}`,
          tipo: 'deudor',
          prioridad: 'alta',
          fecha_limite: moment().add(3, 'days').format('YYYY-MM-DD'),
          estado: 'pendiente',
          responsable: responsableSede.id,
          sede: clienteSeleccionado.sede,
          cliente: clienteSeleccionado.id,
          notas: `Deudor creado manualmente - ID: ${nuevoDeudor.id}`
        });
      }

      alert(`✅ Deudor creado exitosamente\n\n• Cliente: ${clienteSeleccionado.nombre_cliente}\n• Monto deuda: $${montoDeuda?.toLocaleString('es-CL') || '0'}\n• Se creó tarea para Financiero`);
      
      // Limpiar y cerrar
      setClienteSeleccionado(null);
      setBusqueda('');
      setSedeFilter('todas');
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creando deudor:', error);
      alert('Error al crear el deudor');
    } finally {
      setLoading(false);
    }
  };

  const handleCerrar = () => {
    setClienteSeleccionado(null);
    setBusqueda('');
    setSedeFilter('todas');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleCerrar}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            Crear Deudor
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Info */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-sm text-orange-800">
              <strong>¿Qué hace esta acción?</strong><br />
              Genera una deuda de la suscripción del plan que inicia este mes. 
              Automáticamente actualiza el estado del cliente a "Deudor" y crea una tarea 
              para el área de Financiero.
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
          {clienteSeleccionado && (
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
                  <div className="mt-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="font-semibold text-green-700">
                      Monto deuda: ${obtenerPlan(clienteSeleccionado.plan_actual)?.precio?.toLocaleString('es-CL') || '0'}
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
            </div>
          )}

          {/* Listado de Clientes */}
          {!clienteSeleccionado && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <p className="text-sm font-medium text-gray-600">
                  Clientes con Suscripción ({clientesSuscripcion.length})
                </p>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {loadingData ? (
                  <div className="p-8 text-center text-gray-500">
                    Cargando clientes...
                  </div>
                ) : clientesSuscripcion.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No se encontraron clientes con suscripción
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
                              {plan?.precio && (
                                <p className="text-xs font-medium text-green-600 mt-1">
                                  ${plan.precio.toLocaleString('es-CL')}
                                </p>
                              )}
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
            onClick={handleCrearDeudor}
            disabled={!clienteSeleccionado || loading}
            className="flex-1 bg-orange-600 hover:bg-orange-700"
          >
            {loading ? 'Creando...' : 'Crear Deudor'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}