import React, { useState, useEffect } from 'react';
import { Calendar, User, Building2, TrendingUp, Clock, CheckCircle2, XCircle, AlertCircle, Plus, Phone, Mail, Eye, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Agendamientos } from '@/entities/Agendamientos';
import { Prospectos } from '@/entities/Prospectos';
import { Sucursales } from '@/entities/Sucursales';
import { Staff } from '@/entities/Staff';
import { Ventas } from '@/entities/Ventas';
import AgregarCompromisoManualDialog from '@/components/AgregarCompromisoManualDialog';
import RegistrarVentaDialog from '@/components/RegistrarVentaDialog';
import NoComproDialog from '@/components/NoComproDialog';
import ReagendarDialog from '@/components/ReagendarDialog';
import DetallesAgendamientoDialog from '@/components/DetallesAgendamientoDialog';
import { usePermission } from '@/components/PermissionContext';
import moment from 'moment';
import 'moment/locale/es';
moment.locale('es');

export default function CompromisosCompra() {
  const { hasPermission } = usePermission();
  const [compromisos, setCompromisos] = useState([]);
  const [prospectos, setProspectos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [staff, setStaff] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroSede, setFiltroSede] = useState('todas');
  const [filtroVendedor, setFiltroVendedor] = useState('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  // Selección múltiple
  const [seleccionados, setSeleccionados] = useState([]);

  // Dialogs
  const [dialogAgregarManual, setDialogAgregarManual] = useState(false);
  const [dialogVenta, setDialogVenta] = useState(false);
  const [dialogNoCompro, setDialogNoCompro] = useState(false);
  const [dialogReagendar, setDialogReagendar] = useState(false);
  const [dialogDetalles, setDialogDetalles] = useState(false);
  const [compromisoSeleccionado, setCompromisoSeleccionado] = useState(null);



  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [agendamientosData, prospectosData, sucursalesData, staffData, ventasData] = await Promise.all([
        Agendamientos.list('-fecha_hora'),
        Prospectos.list('-createdAt'),
        Sucursales.list('nombre_sede'),
        Staff.list('nombre'),
        Ventas.list('-fecha_venta')
      ]);

      // Filtrar solo prospectos con estado "Compromiso de compra"
      const prospectosCompromisos = prospectosData.filter(p => p.estado_pipeline === 'Compromiso de compra');
      const idsProspectosCompromisos = prospectosCompromisos.map(p => p.id);
      
      // Filtrar agendamientos que correspondan a estos prospectos
      const compromisosData = agendamientosData.filter(a => idsProspectosCompromisos.includes(a.prospecto_id));

      setCompromisos(compromisosData);
      setProspectos(prospectosData);
      setSucursales(sucursalesData);
      setStaff(staffData);
      setVentas(ventasData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calcular estado del compromiso
  const calcularEstadoCompromiso = (compromiso) => {
    const prospecto = prospectos.find(p => p.id === compromiso.prospecto_id);
    if (!prospecto) return 'desconocido';

    // Si ya compró (verificar si tiene venta DESPUÉS de crear el compromiso)
    const yaCompro = ventas.some(v => v.prospecto_id === compromiso.prospecto_id && 
      v.tipo_venta !== 'Solo Inscripción' && // Excluir inscripciones
      moment(v.fecha_venta).isAfter(moment(prospecto.fecha_compromiso || compromiso.createdAt)));
    if (yaCompro) return 'convertido';

    // Si está perdido o no compró
    if (prospecto.estado_pipeline === 'Perdido' || prospecto.estado_pipeline === 'No compró') {
      return 'perdido';
    }

    // Usar fecha_compromiso del prospecto en lugar de fecha_hora del agendamiento
    const fechaCompromiso = prospecto.fecha_compromiso ? moment(prospecto.fecha_compromiso) : moment(compromiso.fecha_hora);
    const hoy = moment();
    
    // Si está vencido (fecha pasó)
    if (fechaCompromiso.isBefore(hoy, 'day')) {
      return 'vencido';
    }

    // Si está pendiente
    return 'pendiente';
  };

  // Calcular días restantes o vencidos
  const calcularDias = (fechaCompromiso) => {
    const fecha = moment(fechaCompromiso);
    const hoy = moment();
    const dias = fecha.diff(hoy, 'days');
    
    if (dias > 0) return `${dias} días`;
    if (dias === 0) return 'Hoy';
    return `${Math.abs(dias)} días vencido`;
  };

  // Filtrar compromisos
  const compromisosFiltrados = compromisos.filter(compromiso => {
    const prospecto = prospectos.find(p => p.id === compromiso.prospecto_id);
    if (!prospecto) return false;

    const estado = calcularEstadoCompromiso(compromiso);

    // Filtro de sede
    if (filtroSede !== 'todas' && compromiso.sede !== filtroSede) return false;

    // Filtro de vendedor
    if (filtroVendedor !== 'todos' && prospecto.vendedor_asignado !== filtroVendedor) return false;

    // Filtro de estado
    if (filtroEstado !== 'todos' && estado !== filtroEstado) return false;

    // Filtro de periodo - usar fecha_compromiso del prospecto
    const fechaCompromiso = prospecto.fecha_compromiso ? moment(prospecto.fecha_compromiso) : moment(compromiso.fecha_hora);
    const hoy = moment();
    if (filtroPeriodo === 'hoy' && !fechaCompromiso.isSame(hoy, 'day')) return false;
    if (filtroPeriodo === 'esta_semana' && !fechaCompromiso.isSame(hoy, 'week')) return false;
    if (filtroPeriodo === 'este_mes' && !fechaCompromiso.isSame(hoy, 'month')) return false;
    if (filtroPeriodo === 'vencidos' && !fechaCompromiso.isBefore(hoy, 'day')) return false;

    // Búsqueda por nombre o whatsapp
    if (busqueda) {
      const searchLower = busqueda.toLowerCase();
      const nombreMatch = prospecto.nombre?.toLowerCase().includes(searchLower);
      const whatsappMatch = prospecto.whatsapp?.includes(busqueda);
      if (!nombreMatch && !whatsappMatch) return false;
    }

    return true;
  });

  // Calcular métricas
  const totalCompromisos = compromisosFiltrados.length;
  const pendientes = compromisosFiltrados.filter(c => calcularEstadoCompromiso(c) === 'pendiente').length;
  const vencidos = compromisosFiltrados.filter(c => calcularEstadoCompromiso(c) === 'vencido').length;
  const convertidos = compromisosFiltrados.filter(c => calcularEstadoCompromiso(c) === 'convertido').length;
  const tasaConversion = totalCompromisos > 0 ? ((convertidos / totalCompromisos) * 100).toFixed(1) : 0;

  // Handlers
  const handleMarcarCompro = (compromiso) => {
    setCompromisoSeleccionado(compromiso);
    setDialogVenta(true);
  };

  const handleMarcarNoCompro = (compromiso) => {
    setCompromisoSeleccionado(compromiso);
    setDialogNoCompro(true);
  };

  const handleReagendar = (compromiso) => {
    setCompromisoSeleccionado(compromiso);
    setDialogReagendar(true);
  };

  const handleVerDetalles = (compromiso) => {
    setCompromisoSeleccionado(compromiso);
    setDialogDetalles(true);
  };

  // Handlers de selección múltiple
  const handleSeleccionarTodos = (checked) => {
    if (checked) {
      setSeleccionados(compromisosFiltrados.map(c => c.id));
    } else {
      setSeleccionados([]);
    }
  };

  const handleSeleccionarUno = (compromisoId, checked) => {
    if (checked) {
      setSeleccionados([...seleccionados, compromisoId]);
    } else {
      setSeleccionados(seleccionados.filter(id => id !== compromisoId));
    }
  };

  const handleEliminarSeleccionados = async () => {
    if (seleccionados.length === 0) {
      alert('No hay compromisos seleccionados');
      return;
    }

    const confirmacion = confirm(`¿Estás seguro de eliminar ${seleccionados.length} compromiso(s)?`);
    if (!confirmacion) return;

    setLoading(true);
    try {
      // Eliminar los agendamientos seleccionados
      await Promise.all(seleccionados.map(id => Agendamientos.delete(id)));

      // Actualizar el estado de los prospectos asociados
      const prospectosAActualizar = compromisos
        .filter(c => seleccionados.includes(c.id))
        .map(c => c.prospecto_id);

      await Promise.all(
        prospectosAActualizar.map(prospectoId => 
          Prospectos.update(prospectoId, { 
            estado_pipeline: 'Descartado',
            fecha_compromiso: null
          })
        )
      );

      alert(`${seleccionados.length} compromiso(s) eliminado(s) exitosamente`);
      setSeleccionados([]);
      cargarDatos();
    } catch (error) {
      console.error('Error eliminando compromisos:', error);
      alert('Error al eliminar los compromisos');
    } finally {
      setLoading(false);
    }
  };



  const getBadgeEstado = (estado) => {
    switch (estado) {
      case 'pendiente':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Pendiente</Badge>;
      case 'vencido':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Vencido</Badge>;
      case 'convertido':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Convertido</Badge>;
      case 'perdido':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Perdido</Badge>;
      default:
        return <Badge>Desconocido</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando compromisos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compromisos de Compra</h1>
          <p className="text-sm text-gray-600 mt-1">Gestiona y da seguimiento a los compromisos de compra</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {seleccionados.length > 0 && hasPermission('prospectos_eliminar_masivo') && (
            <Button 
              onClick={handleEliminarSeleccionados} 
              variant="destructive"
              className="flex-1 sm:flex-initial"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar ({seleccionados.length})
            </Button>
          )}
          <Button onClick={() => setDialogAgregarManual(true)} className="flex-1 sm:flex-initial">
            <Plus className="w-4 h-4 mr-2" />
            Agregar Compromiso Manual
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Compromisos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{totalCompromisos}</span>
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-blue-600">{pendientes}</span>
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Vencidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-red-600">{vencidos}</span>
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Convertidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-600">{convertidos}</span>
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Tasa Conversión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-600">{tasaConversion}%</span>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Periodo</label>
              <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="hoy">Hoy</SelectItem>
                  <SelectItem value="esta_semana">Esta semana</SelectItem>
                  <SelectItem value="este_mes">Este mes</SelectItem>
                  <SelectItem value="vencidos">Vencidos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Sede</label>
              <Select value={filtroSede} onValueChange={setFiltroSede}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {sucursales.map(sede => (
                    <SelectItem key={sede.id} value={sede.id}>{sede.nombre_sede}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Vendedor</label>
              <Select value={filtroVendedor} onValueChange={setFiltroVendedor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {staff.filter(s => s.roles?.includes('vendedor')).map(vendedor => (
                    <SelectItem key={vendedor.id} value={vendedor.id}>{vendedor.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Estado</label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="convertido">Convertido</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Buscar</label>
              <Input
                placeholder="Nombre o WhatsApp..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Compromisos */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-center w-12">
                    <Checkbox
                      checked={seleccionados.length === compromisosFiltrados.length && compromisosFiltrados.length > 0}
                      onCheckedChange={handleSeleccionarTodos}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prospecto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Compromiso</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sede</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {compromisosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                      No hay compromisos que coincidan con los filtros
                    </td>
                  </tr>
                ) : (
                  compromisosFiltrados.map(compromiso => {
                    const prospecto = prospectos.find(p => p.id === compromiso.prospecto_id);
                    const vendedor = staff.find(s => s.id === prospecto?.vendedor_asignado);
                    const sede = sucursales.find(s => s.id === compromiso.sede);
                    const estado = calcularEstadoCompromiso(compromiso);

                    return (
                      <tr key={compromiso.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-center">
                          <Checkbox
                            checked={seleccionados.includes(compromiso.id)}
                            onCheckedChange={(checked) => handleSeleccionarUno(compromiso.id, checked)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="font-medium text-sm">{prospecto?.nombre || 'N/A'}</p>
                              <p className="text-xs text-gray-500">{prospecto?.estado_pipeline || 'N/A'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Phone className="w-3 h-3" />
                              {prospecto?.whatsapp || 'N/A'}
                            </div>
                            {prospecto?.correo && (
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <Mail className="w-3 h-3" />
                                {prospecto.correo}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            {prospecto?.fecha_compromiso ? (
                              <>
                                <p className="font-medium">{moment(prospecto.fecha_compromiso).format('DD/MM/YYYY')}</p>
                                <p className="text-xs text-gray-500">Compromiso</p>
                              </>
                            ) : (
                              <>
                                <p className="font-medium">{moment(compromiso.fecha_hora).format('DD/MM/YYYY')}</p>
                                <p className="text-xs text-gray-500">{moment(compromiso.fecha_hora).format('HH:mm')}</p>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${
                            estado === 'vencido' ? 'text-red-600' : 
                            estado === 'pendiente' ? 'text-blue-600' : 
                            'text-gray-600'
                          }`}>
                            {calcularDias(prospecto?.fecha_compromiso || compromiso.fecha_hora)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{vendedor?.nombre || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm">
                            <Building2 className="w-3 h-3 text-gray-400" />
                            {sede?.nombre_sede || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {getBadgeEstado(estado)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleVerDetalles(compromiso)}
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {estado === 'pendiente' || estado === 'vencido' ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleMarcarCompro(compromiso)}
                                  title="Marcar como compró"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleMarcarNoCompro(compromiso)}
                                  title="Marcar como no compró"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => handleReagendar(compromiso)}
                                  title="Reagendar"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </Button>
                              </>
                            ) : null}
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

      {/* Dialogs */}
      {dialogAgregarManual && (
        <AgregarCompromisoManualDialog
          open={dialogAgregarManual}
          onClose={() => {
            setDialogAgregarManual(false);
            cargarDatos();
          }}
        />
      )}

      {dialogVenta && compromisoSeleccionado && (
        <RegistrarVentaDialog
          open={dialogVenta}
          onClose={() => {
            setDialogVenta(false);
            setCompromisoSeleccionado(null);
            cargarDatos();
          }}
          prospecto={prospectos.find(p => p.id === compromisoSeleccionado.prospecto_id)}
          agendamiento={compromisoSeleccionado}
        />
      )}

      {dialogNoCompro && compromisoSeleccionado && (
        <NoComproDialog
          open={dialogNoCompro}
          onClose={() => {
            setDialogNoCompro(false);
            setCompromisoSeleccionado(null);
            cargarDatos();
          }}
          prospecto={prospectos.find(p => p.id === compromisoSeleccionado.prospecto_id)}
          agendamiento={compromisoSeleccionado}
        />
      )}

      {dialogReagendar && compromisoSeleccionado && (
        <ReagendarDialog
          open={dialogReagendar}
          onClose={() => {
            setDialogReagendar(false);
            setCompromisoSeleccionado(null);
            cargarDatos();
          }}
          agendamiento={compromisoSeleccionado}
        />
      )}

      {dialogDetalles && compromisoSeleccionado && (
        <DetallesAgendamientoDialog
          open={dialogDetalles}
          onClose={() => {
            setDialogDetalles(false);
            setCompromisoSeleccionado(null);
          }}
          agendamiento={compromisoSeleccionado}
        />
      )}
    </div>
  );
}