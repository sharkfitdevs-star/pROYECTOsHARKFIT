import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Phone, CheckCircle, Clock, Filter } from 'lucide-react';
import { Alertas_Renovacion } from '@/entities/Alertas_Renovacion';
import { Clientes } from '@/entities/Clientes';
import { Sucursales } from '@/entities/Sucursales';
import { Staff } from '@/entities/Staff';
import moment from 'moment';
import { useToast } from '@/components/ui/use-toast';
import RegistrarContactoDialog from '@/components/RegistrarContactoDialog';

export default function AlertasRenovacionPage() {
  const [alertas, setAlertas] = useState([]);
  const [alertasFiltradas, setAlertasFiltradas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Filtros
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [prioridadFilter, setPrioridadFilter] = useState('todas');
  const [sedeFilter, setSedeFilter] = useState('todas');

  // Dialog
  const [contactoDialogOpen, setContactoDialogOpen] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [alertas, estadoFilter, prioridadFilter, sedeFilter]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [alertasData, clientesData, sedesData, staffData] = await Promise.all([
        Alertas_Renovacion.list('-fecha_alerta'),
        Clientes.list('nombre_cliente'),
        Sucursales.list('nombre_sede'),
        Staff.list('nombre')
      ]);

      setAlertas(alertasData || []);
      setClientes(clientesData || []);
      setSedes(sedesData.filter(s => s.activo) || []);
      setStaff(staffData.filter(s => s.activo) || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las alertas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let resultado = [...alertas];

    if (estadoFilter !== 'todos') {
      resultado = resultado.filter(a => a.estado === estadoFilter);
    }

    if (prioridadFilter !== 'todas') {
      resultado = resultado.filter(a => a.prioridad === prioridadFilter);
    }

    if (sedeFilter !== 'todas') {
      resultado = resultado.filter(a => a.sede === sedeFilter);
    }

    setAlertasFiltradas(resultado);
  };

  const handleCambiarEstado = async (alertaId, nuevoEstado) => {
    try {
      const updateData = { estado: nuevoEstado };
      
      if (nuevoEstado === 'Resuelta' || nuevoEstado === 'Cerrada') {
        updateData.fecha_resolucion = moment().format('YYYY-MM-DD');
      }

      await Alertas_Renovacion.update(alertaId, updateData);
      
      toast({
        title: "Estado actualizado",
        description: `La alerta ha sido marcada como ${nuevoEstado}`
      });

      await cargarDatos();
    } catch (error) {
      console.error('Error actualizando estado:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive"
      });
    }
  };

  const handleAsignar = async (alertaId, staffId) => {
    try {
      await Alertas_Renovacion.update(alertaId, {
        asignado_a: staffId,
        estado: 'En Proceso'
      });

      toast({
        title: "Alerta asignada",
        description: "La alerta ha sido asignada correctamente"
      });

      await cargarDatos();
    } catch (error) {
      console.error('Error asignando alerta:', error);
      toast({
        title: "Error",
        description: "No se pudo asignar la alerta",
        variant: "destructive"
      });
    }
  };

  const handleContactar = (alerta) => {
    const cliente = clientes.find(c => c.id === alerta.cliente_id);
    if (cliente) {
      setClienteSeleccionado(cliente);
      setContactoDialogOpen(true);
    }
  };

  const getBadgeEstado = (estado) => {
    switch (estado) {
      case 'Pendiente':
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>;
      case 'En Proceso':
        return <Badge className="bg-blue-500"><Phone className="w-3 h-3 mr-1" />En Proceso</Badge>;
      case 'Resuelta':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Resuelta</Badge>;
      case 'Cerrada':
        return <Badge variant="outline">Cerrada</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const getBadgePrioridad = (prioridad) => {
    switch (prioridad) {
      case 'Alta':
        return <Badge className="bg-red-500">Alta</Badge>;
      case 'Media':
        return <Badge className="bg-orange-500">Media</Badge>;
      case 'Baja':
        return <Badge className="bg-gray-500">Baja</Badge>;
      default:
        return <Badge variant="outline">{prioridad}</Badge>;
    }
  };

  // Métricas
  const alertasPendientes = alertas.filter(a => a.estado === 'Pendiente').length;
  const alertasEnProceso = alertas.filter(a => a.estado === 'En Proceso').length;
  const alertasResueltas = alertas.filter(a => a.estado === 'Resuelta').length;
  const alertasAltaPrioridad = alertas.filter(a => a.prioridad === 'Alta' && a.estado !== 'Resuelta' && a.estado !== 'Cerrada').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando alertas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <AlertCircle className="w-8 h-8" />
              Alertas de Renovación
            </h1>
            <p className="text-gray-600 mt-1">
              Gestión de alertas de clientes vencidos sin renovar
            </p>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{alertasPendientes}</div>
            <p className="text-sm text-gray-600">Pendientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{alertasEnProceso}</div>
            <p className="text-sm text-gray-600">En Proceso</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{alertasResueltas}</div>
            <p className="text-sm text-gray-600">Resueltas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{alertasAltaPrioridad}</div>
            <p className="text-sm text-gray-600">Alta Prioridad</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
                <SelectItem value="En Proceso">En Proceso</SelectItem>
                <SelectItem value="Resuelta">Resuelta</SelectItem>
                <SelectItem value="Cerrada">Cerrada</SelectItem>
              </SelectContent>
            </Select>

            <Select value={prioridadFilter} onValueChange={setPrioridadFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las prioridades</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Media">Media</SelectItem>
                <SelectItem value="Baja">Baja</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sedeFilter} onValueChange={setSedeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Sede" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las sedes</SelectItem>
                {sedes.map(sede => (
                  <SelectItem key={sede.id} value={sede.id}>{sede.nombre_sede}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Alertas */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Alertas ({alertasFiltradas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b hover:bg-gray-50">
                  <th className="text-left p-2 font-medium">Cliente</th>
                  <th className="text-left p-2 font-medium">Sede</th>
                  <th className="text-left p-2 font-medium">Días Vencido</th>
                  <th className="text-left p-2 font-medium">Prioridad</th>
                  <th className="text-left p-2 font-medium">Estado</th>
                  <th className="text-left p-2 font-medium">Asignado a</th>
                  <th className="text-left p-2 font-medium">Fecha Alerta</th>
                  <th className="text-left p-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {alertasFiltradas.length === 0 ? (
                  <tr className="border-b hover:bg-gray-50">
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                      No hay alertas
                    </td>
                  </tr>
                ) : (
                  alertasFiltradas.map(alerta => {
                    const cliente = clientes.find(c => c.id === alerta.cliente_id);
                    const sede = sedes.find(s => s.id === alerta.sede);
                    const asignado = staff.find(s => s.id === alerta.asignado_a);

                    return (
                      <TableRow key={alerta.id}>
                        <TableCell className="font-medium">{cliente?.nombre_cliente || '-'}</td>
                        <td className="p-2">{sede?.nombre_sede || '-'}</td>
                        <td className="p-2">
                          <Badge variant="outline">{alerta.dias_vencido} días</Badge>
                        </td>
                        <td className="p-2">{getBadgePrioridad(alerta.prioridad)}</td>
                        <td className="p-2">{getBadgeEstado(alerta.estado)}</td>
                        <td className="p-2">{asignado?.nombre || 'Sin asignar'}</td>
                        <td className="p-2">{moment(alerta.fecha_alerta).format('DD/MM/YYYY')}</td>
                        <td className="p-2">
                          <div className="flex gap-2">
                            {alerta.estado === 'Pendiente' && (
                              <>
                                <Select onValueChange={(staffId) => handleAsignar(alerta.id, staffId)}>
                                  <SelectTrigger className="w-[120px] h-8">
                                    <SelectValue placeholder="Asignar" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {staff.map(s => (
                                      <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </>
                            )}
                            
                            {(alerta.estado === 'Pendiente' || alerta.estado === 'En Proceso') && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleContactar(alerta)}
                                >
                                  <Phone className="w-4 h-4 mr-1" />
                                  Contactar
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleCambiarEstado(alerta.id, 'Resuelta')}
                                >
                                  Resolver
                                </Button>
                              </>
                            )}

                            {alerta.estado === 'Resuelta' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleCambiarEstado(alerta.id, 'Cerrada')}
                              >
                                Cerrar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Contacto */}
      <RegistrarContactoDialog
        open={contactoDialogOpen}
        onOpenChange={setContactoDialogOpen}
        cliente={clienteSeleccionado}
        onSuccess={cargarDatos}
      />
    </div>
  );
}