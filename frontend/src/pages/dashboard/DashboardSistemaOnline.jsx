import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  LayoutDashboard,
  Headphones,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  FileText,
  CreditCard,
  Phone,
  Calendar,
  Target,
  Activity,
  RefreshCw,
  Receipt,
  Undo2,
  MessageCircle,
  PauseCircle,
  PlayCircle
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useMemo } from 'react';

// Importar entidades
import { Tareas_Sistema_Online } from '@/entities/Tareas_Sistema_Online';
import { Seguimiento_Online } from '@/entities/Seguimiento_Online';
import { Alertas_Renovacion } from '@/entities/Alertas_Renovacion';
import { Deudores } from '@/entities/Deudores';
import { Contratos } from '@/entities/Contratos';
import { Tarjetas_Registradas } from '@/entities/Tarjetas_Registradas';
import { Clientes_Riesgo } from '@/entities/Clientes_Riesgo';
import { Onboarding_Clientes } from '@/entities/Onboarding_Clientes';
import { Clientes } from '@/entities/Clientes';
import { Sucursales } from '@/entities/Sucursales';
import { Staff } from '@/entities/Staff';
import { User } from '@/entities/User';
import { Prospectos } from '@/entities/Prospectos';
import { Seguimiento_NPS } from '@/entities/Seguimiento_NPS';
import { Tareas_RS } from '@/entities/Tareas_RS';
import { Planes_Servicios } from '@/entities/Planes_Servicios';
import { Pausas_Clientes } from '@/entities/Pausas_Clientes';
import NPSSinSeguimientoDialog from '@/components/NPSSinSeguimientoDialog';
import SoporteListadoDialog from '@/components/SoporteListadoDialog';
import MedidorTiempoTareas from '@/components/MedidorTiempoTareas';
import TopAsistentes from '@/components/TopAsistentes';
import GestionRenovacionDialog from '@/components/GestionRenovacionDialog';
import GestionDeudorDialog from '@/components/GestionDeudorDialog';
import PrepagosVencidosDialog from '@/components/PrepagosVencidosDialog';
import ConfirmacionBajasDialog from '@/components/ConfirmacionBajasDialog';
import CancelarSuscripcionMPDialog from '@/components/CancelarSuscripcionMPDialog';

export default function DashboardSistemaOnline() {
  const [loading, setLoading] = useState(true);
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState('general');
  const [sedeSeleccionada, setSedeSeleccionada] = useState('todas');
  const [user, setUser] = useState(null);
  const [staffData, setStaffData] = useState(null);
  
  // Estado para dialog NPS sin seguimiento
  const [dialogNPSSinSeguimiento, setDialogNPSSinSeguimiento] = useState(false);
  
  // Estado para dialog de Soporte
  const [dialogSoporte, setDialogSoporte] = useState(false);
  const [tipoMetricaSoporte, setTipoMetricaSoporte] = useState(null);
  
  // Estado para dialogs de Financiero
  const [dialogRenovacion, setDialogRenovacion] = useState(false);
  const [seguimientoSeleccionado, setSeguimientoSeleccionado] = useState(null);
  const [dialogDeudor, setDialogDeudor] = useState(false);
  const [deudorSeleccionado, setDeudorSeleccionado] = useState(null);
  
  // Estados para tareas diarias Financiero
  const [boletasCompletadas, setBoletasCompletadas] = useState(false);
  const [reintegrosCompletados, setReintegrosCompletados] = useState(false);
  
  // Estados para datos
  const [tareas, setTareas] = useState([]);
  const [seguimientoOnline, setSeguimientoOnline] = useState([]);
  const [alertasRenovacion, setAlertasRenovacion] = useState([]);
  const [deudores, setDeudores] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [tarjetas, setTarjetas] = useState([]);
  const [clientesRiesgo, setClientesRiesgo] = useState([]);
  const [onboarding, setOnboarding] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [staff, setStaff] = useState([]);
  const [prospectos, setProspectos] = useState([]);
  const [seguimientoNPS, setSeguimientoNPS] = useState([]);
  const [tareasRS, setTareasRS] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [planesServicios, setPlanesServicios] = useState([]);
  const [pausasClientes, setPausasClientes] = useState([]);
  
  // Estado para dialog de prepago vencidos
  const [dialogPrepagosVencidos, setDialogPrepagosVencidos] = useState(false);
  
  // Estado para dialog de confirmación de bajas
  const [dialogConfirmacionBajas, setDialogConfirmacionBajas] = useState(false);
  
  // Estado para dialog de cancelar suscripción MP
  const [dialogCancelarMP, setDialogCancelarMP] = useState(false);

  // Calcular clientes prepago vencidos
  const clientesPrepagosVencidos = useMemo(() => {
    if (!clientes || !planesServicios) return [];
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    return clientes.filter(cliente => {
      if (!cliente.fecha_fin_plan_actual) return false;
      if (cliente.modalidad_actual !== 'Prepago') return false;
      
      const plan = planesServicios.find(p => p.id === cliente.plan_actual);
      if (plan && plan.tipo_item !== 'Plan' && plan.tipo_item !== 'Programa') return false;
      
      const fechaFin = new Date(cliente.fecha_fin_plan_actual);
      fechaFin.setHours(0, 0, 0, 0);
      
      if (fechaFin >= hoy) return false;
      
      const yaTieneSeguimiento = seguimientoOnline?.find(s => 
        s.cliente_id === cliente.id && 
        (s.estado === 'Renovó' || s.estado === 'No Renovará')
      );
      if (yaTieneSeguimiento) return false;
      
      if (!cliente.activo) return false;
      
      return true;
    });
  }, [clientes, planesServicios, seguimientoOnline]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar usuario y staff
      const userData = await User.me();
      setUser(userData);
      
      const staffList = await Staff.list();
      setStaff(staffList);
      
      const staffUser = staffList.find(s => s.email === userData.email);
      setStaffData(staffUser);

      // Cargar todas las entidades
      const [
        tareasData,
        seguimientoData,
        alertasData,
        deudoresData,
        contratosData,
        tarjetasData,
        riesgoData,
        onboardingData,
        sucursalesData,
        prospectosData,
        seguimientoNPSData,
        tareasRSData,
        clientesData,
        planesServiciosData,
        pausasClientesData
      ] = await Promise.all([
        Tareas_Sistema_Online.list('-fecha_creacion'),
        Seguimiento_Online.list('-dias_vencido'),
        Alertas_Renovacion.list('-dias_vencido'),
        Deudores.list('-dias_atraso'),
        Contratos.filter({ estado: 'Pendiente' }),
        Tarjetas_Registradas.filter({ estado: ['Pendiente', 'Fallida'] }),
        Clientes_Riesgo.filter({ estado: ['Identificado', 'En gestión', 'Contactado'] }),
        Onboarding_Clientes.list('-fecha_ingreso'), // Cargar todos los onboardings
        Sucursales.list(),
        Prospectos.list('-createdAt'), // Cargar TODOS los prospectos
        Seguimiento_NPS.list('-fecha_ingreso_nps'),
        Tareas_RS.list('-createdAt'),
        Clientes.list(),
        Planes_Servicios.list(),
        Pausas_Clientes.list('-createdAt')
      ]);

      setTareas(tareasData);
      setSeguimientoOnline(seguimientoData);
      setAlertasRenovacion(alertasData);
      setDeudores(deudoresData);
      setContratos(contratosData);
      setTarjetas(tarjetasData);
      setClientesRiesgo(riesgoData);
      setOnboarding(onboardingData);
      setSucursales(sucursalesData);
      
      // Filtrar prospectos NPS Online igual que en NPSOnline.jsx
      const prospectosNPS = prospectosData.filter(p => 
        p.estado_pipeline === 'NPS Online' || p.estado_pipeline === 'No compró'
      );
      setProspectos(prospectosNPS);
      setSeguimientoNPS(seguimientoNPSData);
      setTareasRS(tareasRSData);
      setClientes(clientesData);
      setPlanesServicios(planesServiciosData);
      setPausasClientes(pausasClientesData);
      
      // Verificar si hay tareas de boletas/reintegros completadas hoy
      const hoy = format(new Date(), 'yyyy-MM-dd');
      const tareaBoletasHoy = tareasRSData.find(t => 
        t.tipo === 'boletas_electronicas' && 
        t.estado === 'completada' &&
        t.fecha_completada && 
        format(parseISO(t.fecha_completada), 'yyyy-MM-dd') === hoy
      );
      const tareaReintegrosHoy = tareasRSData.find(t => 
        t.tipo === 'reintegros_pendientes' && 
        t.estado === 'completada' &&
        t.fecha_completada && 
        format(parseISO(t.fecha_completada), 'yyyy-MM-dd') === hoy
      );
      setBoletasCompletadas(!!tareaBoletasHoy);
      setReintegrosCompletados(!!tareaReintegrosHoy);

    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar datos por sede seleccionada
  const filtrarPorSede = (items, campoSede = 'sede_id') => {
    if (sedeSeleccionada === 'todas') return items;
    return items.filter(item => item[campoSede] === sedeSeleccionada);
  };

  // Calcular métricas generales
  const calcularMetricasGenerales = () => {
    const tareasFiltradas = filtrarPorSede(tareas, 'sede_id');
    const tareasPendientes = tareasFiltradas.filter(t => t.estado === 'Pendiente').length;
    const tareasEnProceso = tareasFiltradas.filter(t => t.estado === 'En Proceso').length;
    const tareasUrgentes = tareasFiltradas.filter(t => t.prioridad === 'Urgente' && t.estado !== 'Completada').length;
    const tareasVencidas = tareasFiltradas.filter(t => {
      if (!t.fecha_vencimiento || t.estado === 'Completada') return false;
      return differenceInDays(new Date(), parseISO(t.fecha_vencimiento)) > 0;
    }).length;

    return {
      tareasPendientes,
      tareasEnProceso,
      tareasUrgentes,
      tareasVencidas,
      totalTareas: tareasFiltradas.length
    };
  };

  // Calcular métricas por departamento
  const calcularMetricasDepartamento = (departamento) => {
    const tareasFiltradas = filtrarPorSede(tareas, 'sede_id');
    const tareasDept = tareasFiltradas.filter(t => t.departamento === departamento);
    const pendientes = tareasDept.filter(t => t.estado === 'Pendiente').length;
    const enProceso = tareasDept.filter(t => t.estado === 'En Proceso').length;
    const completadas = tareasDept.filter(t => t.estado === 'Completada').length;
    const urgentes = tareasDept.filter(t => t.prioridad === 'Urgente' && t.estado !== 'Completada').length;

    return { pendientes, enProceso, completadas, urgentes, total: tareasDept.length };
  };

  const metricasGenerales = calcularMetricasGenerales();
  const metricasSoporte = calcularMetricasDepartamento('Soporte');
  const metricasFinanciero = calcularMetricasDepartamento('Financiero');
  const metricasRetencion = calcularMetricasDepartamento('Retención');
  const metricasVentas = calcularMetricasDepartamento('Ventas');

  const getPrioridadColor = (prioridad) => {
    switch (prioridad) {
      case 'Urgente': return 'bg-red-600 text-white';
      case 'Alta': return 'bg-orange-500 text-white';
      case 'Media': return 'bg-yellow-500 text-white';
      case 'Baja': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'Completada': return 'bg-green-500 text-white';
      case 'En Proceso': return 'bg-blue-500 text-white';
      case 'Pendiente': return 'bg-yellow-500 text-white';
      case 'Cancelada': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const renderTareasDepartamento = (departamento) => {
    const tareasDept = tareas.filter(t => t.departamento === departamento && t.estado !== 'Completada');
    
    if (tareasDept.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>No hay tareas pendientes en {departamento}</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {tareasDept.map(tarea => {
          const diasVencida = tarea.fecha_vencimiento 
            ? differenceInDays(new Date(), parseISO(tarea.fecha_vencimiento))
            : 0;
          const estaVencida = diasVencida > 0;

          return (
            <div 
              key={tarea.id} 
              className={`border rounded-lg p-4 hover:bg-gray-50 ${estaVencida ? 'border-red-300 bg-red-50' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{tarea.titulo}</h3>
                    <Badge className={getPrioridadColor(tarea.prioridad)}>
                      {tarea.prioridad}
                    </Badge>
                    <Badge className={getEstadoColor(tarea.estado)}>
                      {tarea.estado}
                    </Badge>
                    {estaVencida && (
                      <Badge variant="destructive">
                        Vencida {diasVencida} días
                      </Badge>
                    )}
                  </div>
                  
                  {tarea.descripcion && (
                    <p className="text-sm text-gray-600 mb-2">{tarea.descripcion}</p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      {tarea.tipo_tarea}
                    </span>
                    
                    {tarea.cliente_nombre && (
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {tarea.cliente_nombre}
                      </span>
                    )}
                    
                    {tarea.asignado_nombre && (
                      <span className="flex items-center gap-1">
                        <Activity className="h-4 w-4" />
                        {tarea.asignado_nombre}
                      </span>
                    )}
                    
                    {tarea.fecha_vencimiento && (
                      <span className={`flex items-center gap-1 ${estaVencida ? 'text-red-600 font-semibold' : ''}`}>
                        <Calendar className="h-4 w-4" />
                        Vence: {format(parseISO(tarea.fecha_vencimiento), 'dd/MM/yyyy')}
                      </span>
                    )}
                  </div>

                  {tarea.notas && (
                    <p className="text-sm text-gray-500 mt-2 italic">{tarea.notas}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  {tarea.cliente_whatsapp && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(`https://wa.me/${tarea.cliente_whatsapp}`, '_blank')}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="sm" onClick={() => marcarTareaCompletada(tarea)}>
                    Completar
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const marcarTareaCompletada = async (tarea) => {
    try {
      // Calcular tiempo de resolución en minutos
      const fechaCreacion = tarea.fecha_creacion || tarea.createdAt;
      const ahora = new Date();
      let tiempoResolucion = 0;
      if (fechaCreacion) {
        tiempoResolucion = Math.round((ahora - new Date(fechaCreacion)) / 60000);
      }
      
      await Tareas_Sistema_Online.update(tarea.id, {
        estado: 'Completada',
        fecha_completada: ahora.toISOString(),
        completado_por_id: staffData?.id || null,
        completado_por_nombre: staffData?.nombre || user?.fullName || user?.email,
        tiempo_resolucion_minutos: tiempoResolucion
      });
      await cargarDatos();
    } catch (error) {
      console.error('Error al completar tarea:', error);
    }
  };

  // Handlers para tareas diarias de Financiero
  const handleBoletasChange = async (checked) => {
    setBoletasCompletadas(checked);
    if (checked) {
      // Crear tarea completada de boletas
      await Tareas_RS.create({
        titulo: 'Boletas electrónicas del día',
        descripcion: 'Revisión y emisión de boletas electrónicas diarias',
        tipo: 'boletas_electronicas',
        prioridad: 'media',
        fecha_limite: format(new Date(), 'yyyy-MM-dd'),
        estado: 'completada',
        fecha_completada: new Date().toISOString(),
        responsable: staffData?.id,
        sede: staffData?.sede_principal || sucursales[0]?.id,
        es_recurrente: true,
        frecuencia_recurrencia: 'diaria'
      });
    }
  };

  const handleReintegrosChange = async (checked) => {
    setReintegrosCompletados(checked);
    if (checked) {
      // Crear tarea completada de reintegros
      await Tareas_RS.create({
        titulo: 'Reintegros pendientes revisados',
        descripcion: 'Revisión de reintegros pendientes del día',
        tipo: 'reintegros_pendientes',
        prioridad: 'media',
        fecha_limite: format(new Date(), 'yyyy-MM-dd'),
        estado: 'completada',
        fecha_completada: new Date().toISOString(),
        responsable: staffData?.id,
        sede: staffData?.sede_principal || sucursales[0]?.id,
        es_recurrente: true,
        frecuencia_recurrencia: 'diaria'
      });
    }
  };

  // Handler para gestionar renovación
  const handleGestionarRenovacion = (seguimiento) => {
    setSeguimientoSeleccionado(seguimiento);
    setDialogRenovacion(true);
  };

  // Handler para gestionar deudor
  const handleGestionarDeudor = (deudor) => {
    setDeudorSeleccionado(deudor);
    setDialogDeudor(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando Dashboard Sistema Online...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Dashboard Sistema Online</h1>
          </div>
          <Button onClick={cargarDatos} variant="outline">
            Actualizar
          </Button>
        </div>
        <p className="text-gray-600">Gestión integral de todos los departamentos</p>
      </div>

      {/* Selector de Departamento y Sede */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <Select value={departamentoSeleccionado} onValueChange={setDepartamentoSeleccionado}>
          <SelectTrigger className="w-full md:w-64">
            <SelectValue placeholder="Seleccionar departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">📊 Vista General</SelectItem>
            <SelectItem value="Soporte">🎧 Soporte</SelectItem>
            <SelectItem value="Financiero">💰 Financiero</SelectItem>
            <SelectItem value="Retención">📈 Retención</SelectItem>
            <SelectItem value="Ventas">🛒 Ventas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sedeSeleccionada} onValueChange={setSedeSeleccionada}>
          <SelectTrigger className="w-full md:w-64">
            <SelectValue placeholder="Seleccionar sede" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las sedes</SelectItem>
            {sucursales.filter(s => s.activo).map(sede => (
              <SelectItem key={sede.id} value={sede.id}>{sede.nombre_sede}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Vista General */}
      {departamentoSeleccionado === 'general' && (
        <div className="space-y-6">
          {/* Medidor de Tiempo y Top Asistentes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MedidorTiempoTareas tareas={tareas} />
            <TopAsistentes tareas={tareas} staff={staff} />
          </div>

          {/* Resumen Total de Pendientes por Área */}
          <Card className="border-2 border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-blue-600" />
                Resumen de Tareas Pendientes por Área
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* Soporte */}
                <div 
                  className="text-center p-3 bg-white rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => { setTipoMetricaSoporte('total'); setDialogSoporte(true); }}
                >
                  <Headphones className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-600 font-medium">Soporte</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {filtrarPorSede(onboarding, 'sede').filter(o => !o.contrato_firmado).length + filtrarPorSede(onboarding, 'sede').filter(o => !o.tarjeta_registrada).length}
                  </p>
                  <p className="text-xs text-gray-500">pendientes</p>
                </div>
                
                {/* Financiero */}
                <div className="text-center p-3 bg-white rounded-lg border">
                  <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-600 font-medium">Financiero</p>
                  <p className="text-2xl font-bold text-green-600">
                    {seguimientoOnline.filter(s => s.estado === 'Seguimiento Online').length + 
                     alertasRenovacion.filter(a => a.estado === 'Pendiente').length + 
                     deudores.length}
                  </p>
                  <p className="text-xs text-gray-500">pendientes</p>
                </div>
                
                {/* Retención */}
                <div className="text-center p-3 bg-white rounded-lg border">
                  <TrendingUp className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-600 font-medium">Retención</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {clientesRiesgo.length}
                  </p>
                  <p className="text-xs text-gray-500">pendientes</p>
                </div>
                
                {/* Ventas/NPS */}
                <div className="text-center p-3 bg-white rounded-lg border">
                  <ShoppingCart className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-600 font-medium">Ventas/NPS</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {prospectos.filter(p => {
                      const seguimiento = seguimientoNPS.find(s => s.prospecto_id === p.id);
                      return !seguimiento || !seguimiento.fue_contactado;
                    }).length}
                  </p>
                  <p className="text-xs text-gray-500">sin seguimiento</p>
                </div>
                
                {/* Total */}
                <div className="text-center p-3 bg-blue-100 rounded-lg border-2 border-blue-300">
                  <Target className="h-6 w-6 text-blue-700 mx-auto mb-2" />
                  <p className="text-xs text-blue-700 font-medium">TOTAL</p>
                  <p className="text-3xl font-bold text-blue-700">
                    {(contratos.length + tarjetas.length + onboarding.length) +
                     (seguimientoOnline.filter(s => s.estado === 'Seguimiento Online').length + 
                      alertasRenovacion.filter(a => a.estado === 'Pendiente').length + 
                      deudores.length) +
                     clientesRiesgo.length +
                     prospectos.filter(p => {
                       const seguimiento = seguimientoNPS.find(s => s.prospecto_id === p.id);
                       return !seguimiento || !seguimiento.fue_contactado;
                     }).length}
                  </p>
                  <p className="text-xs text-blue-600">pendientes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Métricas por Departamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Soporte */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg cursor-pointer" onClick={() => setDepartamentoSeleccionado('Soporte')}>
                  <Headphones className="h-5 w-5 text-purple-600" />
                  Soporte
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div 
                    className="flex justify-between text-sm p-2 rounded hover:bg-blue-50 cursor-pointer"
                    onClick={() => { setTipoMetricaSoporte('bienvenida'); setDialogSoporte(true); }}
                  >
                    <span className="text-gray-600 flex items-center gap-1">
                      <Users className="h-3 w-3" /> Bienvenida:
                    </span>
                    <span className="font-semibold text-blue-600">
                      {tareasRS.filter(t => t.tipo === 'onboarding_cliente_nuevo' && t.estado === 'pendiente').length}
                    </span>
                  </div>
                  <div 
                    className="flex justify-between text-sm p-2 rounded hover:bg-red-50 cursor-pointer"
                    onClick={() => { setTipoMetricaSoporte('sin_contrato'); setDialogSoporte(true); }}
                  >
                    <span className="text-gray-600 flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Sin Contrato:
                    </span>
                    <span className="font-semibold text-red-600">{onboarding.filter(o => !o.contrato_firmado).length}</span>
                  </div>
                  <div 
                    className="flex justify-between text-sm p-2 rounded hover:bg-orange-50 cursor-pointer"
                    onClick={() => { setTipoMetricaSoporte('sin_tarjeta'); setDialogSoporte(true); }}
                  >
                    <span className="text-gray-600 flex items-center gap-1">
                      <CreditCard className="h-3 w-3" /> Sin Tarjeta:
                    </span>
                    <span className="font-semibold text-orange-600">{onboarding.filter(o => !o.tarjeta_registrada).length}</span>
                  </div>
                  <div 
                    className="flex justify-between text-sm p-2 rounded hover:bg-purple-50 cursor-pointer"
                    onClick={() => setDialogConfirmacionBajas(true)}
                  >
                    <span className="text-gray-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Confirm. Bajas:
                    </span>
                    <span className="font-semibold text-purple-600">{tareas.filter(t => t.tipo_tarea === 'Confirmación Baja' && t.estado === 'Pendiente').length}</span>
                  </div>
                  <div 
                    className="flex justify-between text-sm p-2 rounded hover:bg-yellow-50 cursor-pointer"
                    onClick={() => { setTipoMetricaSoporte('pendientes'); setDialogSoporte(true); }}
                  >
                    <span className="text-gray-600 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Pendientes:
                    </span>
                    <span className="font-semibold text-yellow-600">{onboarding.filter(o => o.estado_onboarding === 'Pendiente').length}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div 
                      className="flex justify-between text-sm font-semibold p-2 rounded hover:bg-purple-50 cursor-pointer"
                      onClick={() => { setTipoMetricaSoporte('total'); setDialogSoporte(true); }}
                    >
                      <span>Total Onboarding:</span>
                      <span className="text-purple-600">{onboarding.length}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financiero */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setDepartamentoSeleccionado('Financiero')}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Financiero
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pendientes:</span>
                    <span className="font-semibold text-yellow-600">{metricasFinanciero.pendientes}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">En Proceso:</span>
                    <span className="font-semibold text-blue-600">{metricasFinanciero.enProceso}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Urgentes:</span>
                    <span className="font-semibold text-red-600">{metricasFinanciero.urgentes}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Total:</span>
                      <span className="text-green-600">{metricasFinanciero.total}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <div>• Seguimiento: {seguimientoOnline.filter(s => s.estado === 'Seguimiento Online').length}</div>
                  <div>• Alertas: {alertasRenovacion.filter(a => a.estado === 'Pendiente').length}</div>
                  <div>• Deudores: {deudores.length}</div>
                  <div>• Cancelar MP: {tareas.filter(t => t.tipo_tarea === 'Cancelar Suscripción MP' && t.estado === 'Pendiente').length}</div>
                </div>
              </CardContent>
            </Card>

            {/* Retención */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setDepartamentoSeleccionado('Retención')}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Retención
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pendientes:</span>
                    <span className="font-semibold text-yellow-600">{metricasRetencion.pendientes}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">En Proceso:</span>
                    <span className="font-semibold text-blue-600">{metricasRetencion.enProceso}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Urgentes:</span>
                    <span className="font-semibold text-red-600">{metricasRetencion.urgentes}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Total:</span>
                      <span className="text-blue-600">{metricasRetencion.total}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <div>• Clientes Riesgo: {clientesRiesgo.length}</div>
                  <div>• Renovaciones: {seguimientoOnline.length + alertasRenovacion.length}</div>
                </div>
              </CardContent>
            </Card>

            {/* Ventas */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setDepartamentoSeleccionado('Ventas')}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingCart className="h-5 w-5 text-orange-600" />
                  Ventas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pendientes:</span>
                    <span className="font-semibold text-yellow-600">{metricasVentas.pendientes}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">En Proceso:</span>
                    <span className="font-semibold text-blue-600">{metricasVentas.enProceso}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Urgentes:</span>
                    <span className="font-semibold text-red-600">{metricasVentas.urgentes}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Total:</span>
                      <span className="text-orange-600">{metricasVentas.total}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tareas Urgentes */}
          {tareas.filter(t => t.prioridad === 'Urgente' && t.estado !== 'Completada').length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Tareas Urgentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tareas.filter(t => t.prioridad === 'Urgente' && t.estado !== 'Completada').map(tarea => (
                    <div key={tarea.id} className="border border-red-300 rounded-lg p-4 bg-red-50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{tarea.titulo}</h3>
                            <Badge className="bg-red-600 text-white">Urgente</Badge>
                            <Badge className={getEstadoColor(tarea.estado)}>{tarea.estado}</Badge>
                            <Badge variant="outline">{tarea.departamento}</Badge>
                          </div>
                          {tarea.descripcion && (
                            <p className="text-sm text-gray-600 mb-2">{tarea.descripcion}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                            <span>{tarea.tipo_tarea}</span>
                            {tarea.cliente_nombre && <span>Cliente: {tarea.cliente_nombre}</span>}
                            {tarea.fecha_vencimiento && (
                              <span>Vence: {format(parseISO(tarea.fecha_vencimiento), 'dd/MM/yyyy')}</span>
                            )}
                          </div>
                        </div>
                        <Button size="sm" onClick={() => marcarTareaCompletada(tarea)}>
                          Completar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Vista Soporte */}
      {departamentoSeleccionado === 'Soporte' && (
        <div className="space-y-6">
          {/* Medidor de Tiempo y Top Asistentes para Soporte */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MedidorTiempoTareas tareas={tareas} departamento="Soporte" />
            <TopAsistentes tareas={tareas} staff={staff} departamento="Soporte" />
          </div>

          {/* Métricas de Soporte - igual que en Vista General */}
          <Card className="border-2 border-purple-200 bg-purple-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Headphones className="h-5 w-5 text-purple-600" />
                Resumen de Tareas Soporte
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div 
                  className="text-center p-3 bg-white rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => { setTipoMetricaSoporte('bienvenida'); setDialogSoporte(true); }}
                >
                  <Users className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-600 font-medium">Bienvenida</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {tareasRS.filter(t => t.tipo === 'onboarding_cliente_nuevo' && t.estado === 'pendiente').length}
                  </p>
                  <p className="text-xs text-gray-500">pendientes</p>
                </div>
                
                <div 
                  className="text-center p-3 bg-white rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => { setTipoMetricaSoporte('sin_contrato'); setDialogSoporte(true); }}
                >
                  <FileText className="h-6 w-6 text-red-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-600 font-medium">Sin Contrato</p>
                  <p className="text-2xl font-bold text-red-600">
                    {onboarding.filter(o => !o.contrato_firmado).length}
                  </p>
                  <p className="text-xs text-gray-500">pendientes</p>
                </div>
                
                <div 
                  className="text-center p-3 bg-white rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => { setTipoMetricaSoporte('sin_tarjeta'); setDialogSoporte(true); }}
                >
                  <CreditCard className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-600 font-medium">Sin Tarjeta</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {onboarding.filter(o => !o.tarjeta_registrada).length}
                  </p>
                  <p className="text-xs text-gray-500">pendientes</p>
                </div>
                
                <div 
                  className="text-center p-3 bg-white rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setDialogConfirmacionBajas(true)}
                >
                  <AlertTriangle className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-600 font-medium">Confirm. Bajas</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {tareas.filter(t => t.tipo_tarea === 'Confirmación Baja' && t.estado === 'Pendiente').length}
                  </p>
                  <p className="text-xs text-gray-500">pendientes</p>
                </div>
                
                <div 
                  className="text-center p-3 bg-white rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => { setTipoMetricaSoporte('pendientes'); setDialogSoporte(true); }}
                >
                  <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-600 font-medium">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {onboarding.filter(o => o.estado_onboarding === 'Pendiente').length}
                  </p>
                  <p className="text-xs text-gray-500">onboarding</p>
                </div>
                
                {/* Planes por Pausar Hoy */}
                <div className="text-center p-3 bg-white rounded-lg border cursor-pointer hover:shadow-md transition-shadow">
                  <PauseCircle className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-600 font-medium">Por Pausar</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {pausasClientes.filter(p => 
                      p.estado === 'Programada' && 
                      p.fecha_ultimo_cobro === format(new Date(), 'yyyy-MM-dd')
                    ).length}
                  </p>
                  <p className="text-xs text-gray-500">hoy</p>
                </div>
                
                {/* Planes por Activar Hoy */}
                <div className="text-center p-3 bg-white rounded-lg border cursor-pointer hover:shadow-md transition-shadow">
                  <PlayCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-600 font-medium">Por Activar</p>
                  <p className="text-2xl font-bold text-green-600">
                    {pausasClientes.filter(p => 
                      p.estado === 'Pausado' && 
                      p.fecha_fin_pausa === format(new Date(), 'yyyy-MM-dd')
                    ).length}
                  </p>
                  <p className="text-xs text-gray-500">hoy</p>
                </div>
                
                <div 
                  className="text-center p-3 bg-purple-100 rounded-lg border-2 border-purple-300 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => { setTipoMetricaSoporte('total'); setDialogSoporte(true); }}
                >
                  <Target className="h-6 w-6 text-purple-700 mx-auto mb-2" />
                  <p className="text-xs text-purple-700 font-medium">TOTAL</p>
                  <p className="text-3xl font-bold text-purple-700">
                    {onboarding.length}
                  </p>
                  <p className="text-xs text-purple-600">onboarding</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Headphones className="h-6 w-6 text-purple-600" />
                Departamento de Soporte
              </CardTitle>
              <p className="text-sm text-gray-600">Gestión de contratos, tarjetas y onboarding de clientes</p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="tareas" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="tareas">Tareas</TabsTrigger>
                  <TabsTrigger value="contratos">Contratos ({contratos.length})</TabsTrigger>
                  <TabsTrigger value="tarjetas">Tarjetas ({tarjetas.length})</TabsTrigger>
                  <TabsTrigger value="onboarding">Onboarding ({onboarding.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="tareas">
                  {renderTareasDepartamento('Soporte')}
                </TabsContent>

                <TabsContent value="contratos">
                  <div className="space-y-3">
                    {contratos.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No hay contratos pendientes</p>
                      </div>
                    ) : (
                      contratos.map(contrato => (
                        <div key={contrato.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold">{contrato.cliente_nombre}</h3>
                              <p className="text-sm text-gray-600">{contrato.plan}</p>
                              <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                                <span>Venta: {format(parseISO(contrato.fecha_venta), 'dd/MM/yyyy')}</span>
                                <Badge variant="outline">{contrato.dias_pendiente || 0} días pendiente</Badge>
                              </div>
                            </div>
                            <Button size="sm">Gestionar</Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="tarjetas">
                  <div className="space-y-3">
                    {tarjetas.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No hay tarjetas pendientes</p>
                      </div>
                    ) : (
                      tarjetas.map(tarjeta => (
                        <div key={tarjeta.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold">{tarjeta.cliente_nombre}</h3>
                              <div className="flex items-center gap-3 mt-2 text-sm">
                                <Badge className={tarjeta.estado === 'Fallida' ? 'bg-red-500' : 'bg-yellow-500'}>
                                  {tarjeta.estado}
                                </Badge>
                                <span className="text-gray-600">Intentos: {tarjeta.intentos || 0}</span>
                              </div>
                              {tarjeta.motivo_falla && (
                                <p className="text-sm text-red-600 mt-1">{tarjeta.motivo_falla}</p>
                              )}
                            </div>
                            <Button size="sm">Gestionar</Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="onboarding">
                  <div className="space-y-4">
                    {/* Métricas de Onboarding */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <Card className="border-blue-200 bg-blue-50/30">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-blue-700 font-medium">Total</p>
                              <p className="text-2xl font-bold text-blue-600">{onboarding.length}</p>
                            </div>
                            <Users className="h-8 w-8 text-blue-600 opacity-20" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-yellow-200 bg-yellow-50/30">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-yellow-700 font-medium">Pendientes</p>
                              <p className="text-2xl font-bold text-yellow-600">
                                {onboarding.filter(item => {
                                  const diasDesdeIngreso = differenceInDays(new Date(), parseISO(item.fecha_ingreso));
                                  const sinContratoSinMensaje = !item.contrato_firmado && (!item.notas || !item.notas.includes('Mensaje contrato'));
                                  const sinTarjetaSinLink = !item.tarjeta_registrada && (!item.notas || !item.notas.includes('Link tarjeta'));
                                  return diasDesdeIngreso < 2 && (sinContratoSinMensaje || sinTarjetaSinLink);
                                }).length}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">Menos de 2 días</p>
                            </div>
                            <Clock className="h-8 w-8 text-yellow-600 opacity-20" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-red-200 bg-red-50/30">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-red-700 font-medium">Urgentes</p>
                              <p className="text-2xl font-bold text-red-600">
                                {onboarding.filter(item => {
                                  const diasDesdeIngreso = differenceInDays(new Date(), parseISO(item.fecha_ingreso));
                                  const sinContratoSinMensaje = !item.contrato_firmado && (!item.notas || !item.notas.includes('Mensaje contrato'));
                                  const sinTarjetaSinLink = !item.tarjeta_registrada && (!item.notas || !item.notas.includes('Link tarjeta'));
                                  return diasDesdeIngreso >= 2 && (sinContratoSinMensaje || sinTarjetaSinLink);
                                }).length}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">+2 días sin gestionar</p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-red-600 opacity-20" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Listado de Onboarding */}
                    {onboarding.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No hay procesos de onboarding pendientes</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {onboarding.map(item => {
                          const diasDesdeIngreso = differenceInDays(new Date(), parseISO(item.fecha_ingreso));
                          const sinContratoSinMensaje = !item.contrato_firmado && (!item.notas || !item.notas.includes('Mensaje contrato'));
                          const sinTarjetaSinLink = !item.tarjeta_registrada && (!item.notas || !item.notas.includes('Link tarjeta'));
                          const esUrgente = diasDesdeIngreso >= 2 && (sinContratoSinMensaje || sinTarjetaSinLink);
                          const esPendiente = diasDesdeIngreso < 2 && (sinContratoSinMensaje || sinTarjetaSinLink);

                          return (
                            <div 
                              key={item.id} 
                              className={`border rounded-lg p-4 hover:bg-gray-50 ${
                                esUrgente ? 'border-red-300 bg-red-50' : 
                                esPendiente ? 'border-yellow-300 bg-yellow-50' : 
                                ''
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold">{item.cliente_nombre}</h3>
                                    <Badge className={getEstadoColor(item.estado_onboarding)}>
                                      {item.estado_onboarding}
                                    </Badge>
                                    {esUrgente && (
                                      <Badge variant="destructive">
                                        Urgente - {diasDesdeIngreso} días
                                      </Badge>
                                    )}
                                    {esPendiente && (
                                      <Badge variant="outline" className="bg-yellow-100">
                                        Pendiente - {diasDesdeIngreso} día{diasDesdeIngreso !== 1 ? 's' : ''}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-2 text-sm">
                                    <span className="text-gray-600">
                                      Contrato: {item.contrato_firmado ? '✓' : '✗'}
                                    </span>
                                    <span className="text-gray-600">
                                      Tarjeta: {item.tarjeta_registrada ? '✓' : '✗'}
                                    </span>
                                    <span className="text-gray-500">
                                      Ingreso: {format(parseISO(item.fecha_ingreso), 'dd/MM/yyyy')}
                                    </span>
                                  </div>
                                  {(sinContratoSinMensaje || sinTarjetaSinLink) && (
                                    <div className="flex items-center gap-2 mt-2">
                                      {sinContratoSinMensaje && (
                                        <Badge className="bg-red-100 text-red-800 text-xs">
                                          <FileText className="h-3 w-3 mr-1" />
                                          Sin contrato - No enviado
                                        </Badge>
                                      )}
                                      {sinTarjetaSinLink && (
                                        <Badge className="bg-orange-100 text-orange-800 text-xs">
                                          <CreditCard className="h-3 w-3 mr-1" />
                                          Sin tarjeta - No enviado
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <Button size="sm">Ver Detalle</Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vista Financiero */}
      {departamentoSeleccionado === 'Financiero' && (
        <div className="space-y-6">
          {/* Medidor de Tiempo y Top Asistentes para Financiero */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MedidorTiempoTareas tareas={tareas} departamento="Financiero" />
            <TopAsistentes tareas={tareas} staff={staff} departamento="Financiero" />
          </div>

          {/* Tareas Diarias de Financiero */}
          <Card className="border-2 border-green-200 bg-green-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Tareas Diarias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Boletas Electrónicas */}
                <div className={`p-4 rounded-lg border ${boletasCompletadas ? 'bg-green-100 border-green-300' : 'bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Receipt className="h-6 w-6 text-green-600" />
                      <div>
                        <h3 className="font-semibold">Boletas Electrónicas</h3>
                        <p className="text-sm text-gray-500">Revisar y emitir boletas del día</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="boletas" 
                        checked={boletasCompletadas}
                        onCheckedChange={handleBoletasChange}
                      />
                      <label htmlFor="boletas" className="text-sm font-medium cursor-pointer">
                        {boletasCompletadas ? 'Completada' : 'Marcar como completada'}
                      </label>
                    </div>
                  </div>
                  {boletasCompletadas && (
                    <div className="mt-2 text-sm text-green-700">
                      ✓ Completada hoy
                    </div>
                  )}
                </div>

                {/* Reintegros Pendientes */}
                <div className={`p-4 rounded-lg border ${reintegrosCompletados ? 'bg-green-100 border-green-300' : 'bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Undo2 className="h-6 w-6 text-blue-600" />
                      <div>
                        <h3 className="font-semibold">Reintegros Pendientes</h3>
                        <p className="text-sm text-gray-500">Revisar solicitudes de reintegro</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="reintegros" 
                        checked={reintegrosCompletados}
                        onCheckedChange={handleReintegrosChange}
                      />
                      <label htmlFor="reintegros" className="text-sm font-medium cursor-pointer">
                        {reintegrosCompletados ? 'Completada' : 'Marcar como completada'}
                      </label>
                    </div>
                  </div>
                  {reintegrosCompletados && (
                    <div className="mt-2 text-sm text-green-700">
                      ✓ Completada hoy
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-green-600" />
                Departamento Financiero
              </CardTitle>
              <p className="text-sm text-gray-600">Gestión de seguimiento online, alertas de renovación y deudores</p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="renovaciones" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="renovaciones">
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Renovaciones ({seguimientoOnline.filter(s => s.estado === 'Seguimiento Online').length})
                  </TabsTrigger>
                  <TabsTrigger value="deudores">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Deudores ({deudores.filter(d => d.estado_gestion !== 'Recuperado' && d.estado_gestion !== 'Irrecuperable').length})
                  </TabsTrigger>
                  <TabsTrigger value="alertas">Alertas ({alertasRenovacion.filter(a => a.estado === 'Pendiente').length})</TabsTrigger>
                  <TabsTrigger value="tareas">Tareas</TabsTrigger>
                </TabsList>

                {/* Tab Renovaciones Vencidas */}
                <TabsContent value="renovaciones">
                  <div className="space-y-4">
                    {/* Métricas de renovaciones */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                      <Card 
                        className="border-yellow-200 bg-yellow-50/30 cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => setDialogPrepagosVencidos(true)}
                      >
                        <CardContent className="pt-4">
                          <div className="text-center">
                            <p className="text-sm text-yellow-700 font-medium">Por Contactar</p>
                            <p className="text-2xl font-bold text-yellow-600">
                              {clientesPrepagosVencidos.length}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Prepago/Programa</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-blue-200 bg-blue-50/30">
                        <CardContent className="pt-4">
                          <div className="text-center">
                            <p className="text-sm text-blue-700 font-medium">En Seguimiento</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {seguimientoOnline.filter(s => s.estado === 'Seguimiento Online' || s.estado === 'Contactado').length}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-purple-200 bg-purple-50/30">
                        <CardContent className="pt-4">
                          <div className="text-center">
                            <p className="text-sm text-purple-700 font-medium">Contactados</p>
                            <p className="text-2xl font-bold text-purple-600">
                              {seguimientoOnline.filter(s => s.estado === 'Contactado').length}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-green-200 bg-green-50/30">
                        <CardContent className="pt-4">
                          <div className="text-center">
                            <p className="text-sm text-green-700 font-medium">Renovaron</p>
                            <p className="text-2xl font-bold text-green-600">
                              {seguimientoOnline.filter(s => s.estado === 'Renovó').length}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-red-200 bg-red-50/30">
                        <CardContent className="pt-4">
                          <div className="text-center">
                            <p className="text-sm text-red-700 font-medium">No Renovarán</p>
                            <p className="text-2xl font-bold text-red-600">
                              {seguimientoOnline.filter(s => s.estado === 'No Renovará').length}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card 
                        className="border-purple-200 bg-purple-50/30 cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => setDialogCancelarMP(true)}
                      >
                        <CardContent className="pt-4">
                          <div className="text-center">
                            <p className="text-sm text-purple-700 font-medium">Cancelar MP</p>
                            <p className="text-2xl font-bold text-purple-600">
                              {tareas.filter(t => t.tipo_tarea === 'Cancelar Suscripción MP' && t.estado === 'Pendiente').length}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Suscripciones</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Listado de clientes vencidos */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <RefreshCw className="h-5 w-5 text-yellow-600" />
                        Clientes con Renovación Vencida
                      </h3>
                      
                      {seguimientoOnline.filter(s => s.estado === 'Seguimiento Online' || s.estado === 'Contactado').length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p>No hay clientes con renovación vencida pendientes de gestionar</p>
                        </div>
                      ) : (
                        seguimientoOnline
                          .filter(s => s.estado === 'Seguimiento Online' || s.estado === 'Contactado')
                          .sort((a, b) => (b.dias_vencido || 0) - (a.dias_vencido || 0))
                          .map(cliente => {
                            const tieneSeguimientoHoy = cliente.fecha_proximo_seguimiento && 
                              format(parseISO(cliente.fecha_proximo_seguimiento), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                            
                            return (
                              <div 
                                key={cliente.id} 
                                className={`border rounded-lg p-4 hover:bg-gray-50 ${
                                  cliente.dias_vencido > 7 ? 'border-red-300 bg-red-50' :
                                  cliente.dias_vencido > 3 ? 'border-orange-300 bg-orange-50' :
                                  'border-yellow-300 bg-yellow-50'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h3 className="font-semibold">{cliente.cliente_nombre}</h3>
                                      <Badge variant="outline" className={
                                        cliente.dias_vencido > 7 ? 'bg-red-100 text-red-700' :
                                        cliente.dias_vencido > 3 ? 'bg-orange-100 text-orange-700' :
                                        'bg-yellow-100 text-yellow-700'
                                      }>
                                        {cliente.dias_vencido} días vencido
                                      </Badge>
                                      {cliente.fue_contactado && (
                                        <Badge className="bg-blue-500 text-white">Contactado</Badge>
                                      )}
                                      {tieneSeguimientoHoy && (
                                        <Badge className="bg-purple-500 text-white">Seguimiento Hoy</Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">{cliente.cliente_whatsapp}</p>
                                    <div className="flex items-center gap-3 text-sm text-gray-500">
                                      <span>
                                        Vencimiento: {format(parseISO(cliente.fecha_vencimiento), 'dd/MM/yyyy')}
                                      </span>
                                      {cliente.fecha_compromiso_renovacion && (
                                        <span className="text-green-600 font-medium">
                                          Compromiso: {format(parseISO(cliente.fecha_compromiso_renovacion), 'dd/MM/yyyy')}
                                        </span>
                                      )}
                                    </div>
                                    {cliente.detalle_contacto && (
                                      <p className="text-sm text-gray-600 mt-2 italic bg-white p-2 rounded">
                                        Último contacto: {cliente.detalle_contacto}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="text-green-600 border-green-300"
                                      onClick={() => window.open(`https://wa.me/${cliente.cliente_whatsapp?.replace(/\D/g, '')}`, '_blank')}
                                    >
                                      <MessageCircle className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => window.open(`tel:${cliente.cliente_whatsapp}`, '_blank')}
                                    >
                                      <Phone className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      size="sm"
                                      onClick={() => handleGestionarRenovacion(cliente)}
                                    >
                                      Gestionar
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Tab Deudores */}
                <TabsContent value="deudores">
                  <div className="space-y-4">
                    {/* Métricas de deudores */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <Card className="border-yellow-200 bg-yellow-50/30">
                        <CardContent className="pt-4">
                          <div className="text-center">
                            <p className="text-sm text-yellow-700 font-medium">Pendientes</p>
                            <p className="text-2xl font-bold text-yellow-600">
                              {deudores.filter(d => d.estado_gestion === 'Pendiente').length}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-blue-200 bg-blue-50/30">
                        <CardContent className="pt-4">
                          <div className="text-center">
                            <p className="text-sm text-blue-700 font-medium">En Gestión</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {deudores.filter(d => d.estado_gestion === 'En gestión' || d.estado_gestion === 'Contactado').length}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-purple-200 bg-purple-50/30">
                        <CardContent className="pt-4">
                          <div className="text-center">
                            <p className="text-sm text-purple-700 font-medium">Promesa Pago</p>
                            <p className="text-2xl font-bold text-purple-600">
                              {deudores.filter(d => d.estado_gestion === 'Promesa de pago').length}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-green-200 bg-green-50/30">
                        <CardContent className="pt-4">
                          <div className="text-center">
                            <p className="text-sm text-green-700 font-medium">Recuperados</p>
                            <p className="text-2xl font-bold text-green-600">
                              {deudores.filter(d => d.estado_gestion === 'Recuperado').length}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Listado de deudores */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        Clientes Deudores
                      </h3>
                      
                      {deudores.filter(d => d.estado_gestion !== 'Recuperado' && d.estado_gestion !== 'Irrecuperable').length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p>No hay deudores pendientes de gestionar</p>
                        </div>
                      ) : (
                        deudores
                          .filter(d => d.estado_gestion !== 'Recuperado' && d.estado_gestion !== 'Irrecuperable')
                          .sort((a, b) => (b.dias_atraso || 0) - (a.dias_atraso || 0))
                          .map(deudor => {
                            const tienePromesaHoy = deudor.fecha_promesa_pago && 
                              format(parseISO(deudor.fecha_promesa_pago), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                            
                            return (
                              <div 
                                key={deudor.id} 
                                className={`border rounded-lg p-4 hover:bg-gray-50 ${
                                  deudor.dias_atraso > 30 ? 'border-red-300 bg-red-50' :
                                  deudor.dias_atraso > 14 ? 'border-orange-300 bg-orange-50' :
                                  'border-yellow-300 bg-yellow-50'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h3 className="font-semibold">{deudor.cliente_nombre}</h3>
                                      <Badge className="bg-red-600 text-white">
                                        ${deudor.monto_adeudado?.toLocaleString('es-CL') || 0}
                                      </Badge>
                                      <Badge variant="outline" className={
                                        deudor.dias_atraso > 30 ? 'bg-red-100 text-red-700' :
                                        deudor.dias_atraso > 14 ? 'bg-orange-100 text-orange-700' :
                                        'bg-yellow-100 text-yellow-700'
                                      }>
                                        {deudor.dias_atraso} días atraso
                                      </Badge>
                                      <Badge className={
                                        deudor.estado_gestion === 'Promesa de pago' ? 'bg-purple-500' :
                                        deudor.estado_gestion === 'Contactado' ? 'bg-blue-500' :
                                        deudor.estado_gestion === 'En gestión' ? 'bg-yellow-500' :
                                        'bg-gray-500'
                                      }>
                                        {deudor.estado_gestion}
                                      </Badge>
                                      {tienePromesaHoy && (
                                        <Badge className="bg-purple-600 text-white">Promesa Hoy</Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">{deudor.cliente_whatsapp}</p>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                      <span>Intentos: {deudor.intentos_cobro || 0}</span>
                                      {deudor.ultimo_intento && (
                                        <span>
                                          Último intento: {format(parseISO(deudor.ultimo_intento), 'dd/MM/yyyy')}
                                        </span>
                                      )}
                                      {deudor.fecha_promesa_pago && (
                                        <span className="text-purple-600 font-medium">
                                          Promesa: {format(parseISO(deudor.fecha_promesa_pago), 'dd/MM/yyyy')}
                                        </span>
                                      )}
                                    </div>
                                    {deudor.resultado_ultimo_intento && (
                                      <p className="text-sm text-gray-600 mt-2 italic bg-white p-2 rounded">
                                        Último resultado: {deudor.resultado_ultimo_intento}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="text-green-600 border-green-300"
                                      onClick={() => window.open(`https://wa.me/${deudor.cliente_whatsapp?.replace(/\D/g, '')}`, '_blank')}
                                    >
                                      <MessageCircle className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => window.open(`tel:${deudor.cliente_whatsapp}`, '_blank')}
                                    >
                                      <Phone className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      size="sm"
                                      onClick={() => handleGestionarDeudor(deudor)}
                                    >
                                      Gestionar
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="alertas">
                  <div className="space-y-3">
                    {alertasRenovacion.filter(a => a.estado === 'Pendiente').length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No hay alertas de renovación pendientes</p>
                      </div>
                    ) : (
                      alertasRenovacion.filter(a => a.estado === 'Pendiente').map(alerta => (
                        <div key={alerta.id} className={`border rounded-lg p-4 ${alerta.dias_vencido > 14 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className={`h-5 w-5 ${alerta.dias_vencido > 14 ? 'text-red-600' : 'text-yellow-600'}`} />
                                <h3 className="font-semibold">Cliente ID: {alerta.cliente_id}</h3>
                                <Badge className={getPrioridadColor(alerta.prioridad)}>
                                  {alerta.prioridad}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 mt-2 text-sm">
                                <Badge variant="destructive">
                                  {alerta.dias_vencido} días vencido
                                </Badge>
                                <span className="text-gray-600">
                                  Tipo: {alerta.tipo_alerta}
                                </span>
                              </div>
                            </div>
                            <Button size="sm">Gestionar</Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="tareas">
                  {renderTareasDepartamento('Financiero')}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vista Retención */}
      {departamentoSeleccionado === 'Retención' && (
        <div className="space-y-6">
          {/* Medidor de Tiempo y Top Asistentes para Retención */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MedidorTiempoTareas tareas={tareas} departamento="Retención" />
            <TopAsistentes tareas={tareas} staff={staff} departamento="Retención" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-blue-600" />
                Departamento de Retención
              </CardTitle>
              <p className="text-sm text-gray-600">Gestión de clientes en riesgo y renovaciones</p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="tareas" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="tareas">Tareas</TabsTrigger>
                  <TabsTrigger value="riesgo">Clientes en Riesgo ({clientesRiesgo.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="tareas">
                  {renderTareasDepartamento('Retención')}
                </TabsContent>

                <TabsContent value="riesgo">
                  <div className="space-y-3">
                    {clientesRiesgo.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No hay clientes en riesgo</p>
                      </div>
                    ) : (
                      clientesRiesgo.map(cliente => (
                        <div key={cliente.id} className={`border rounded-lg p-4 ${
                          cliente.nivel_riesgo === 'Crítico' ? 'bg-red-50 border-red-200' :
                          cliente.nivel_riesgo === 'Alto' ? 'bg-orange-50 border-orange-200' :
                          'bg-yellow-50 border-yellow-200'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold">{cliente.cliente_nombre}</h3>
                                <Badge className={
                                  cliente.nivel_riesgo === 'Crítico' ? 'bg-red-600' :
                                  cliente.nivel_riesgo === 'Alto' ? 'bg-orange-500' :
                                  cliente.nivel_riesgo === 'Medio' ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }>
                                  {cliente.nivel_riesgo}
                                </Badge>
                                <Badge className={getEstadoColor(cliente.estado)}>
                                  {cliente.estado}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">{cliente.cliente_whatsapp}</p>
                              <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                                <span>Motivo: {cliente.motivo_riesgo}</span>
                                {cliente.detalle_motivo && (
                                  <span className="italic">- {cliente.detalle_motivo}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => window.open(`https://wa.me/${cliente.cliente_whatsapp}`, '_blank')}>
                                <Phone className="h-4 w-4" />
                              </Button>
                              <Button size="sm">Gestionar</Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vista Ventas */}
      {departamentoSeleccionado === 'Ventas' && (
        <div className="space-y-6">
          {/* Medidor de Tiempo y Top Asistentes para Ventas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MedidorTiempoTareas tareas={tareas} departamento="Ventas" />
            <TopAsistentes tareas={tareas} staff={staff} departamento="Ventas" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-6 w-6 text-orange-600" />
                Departamento de Ventas
              </CardTitle>
              <p className="text-sm text-gray-600">Gestión de tareas relacionadas con ventas y experiencia al cliente</p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="tareas" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="tareas">Tareas</TabsTrigger>
                  <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
                  <TabsTrigger value="asistentes_ventas">Asist. Ventas</TabsTrigger>
                  <TabsTrigger value="experiencia">Experiencia</TabsTrigger>
                </TabsList>

                <TabsContent value="tareas">
                  {renderTareasDepartamento('Ventas')}
                </TabsContent>

                <TabsContent value="vendedores">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Tareas de Vendedores</h3>
                    {(() => {
                      const tareasVendedores = tareas.filter(t => 
                        t.departamento === 'Ventas' && 
                        t.tipo_tarea !== 'Otra' &&
                        t.asignado_nombre &&
                        staff.find(s => s.id === t.asignado_a && s.rol === 'Vendedor')
                      );
                      
                      if (tareasVendedores.length === 0) {
                        return (
                          <div className="text-center py-8 text-gray-500">
                            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>No hay tareas asignadas a vendedores</p>
                          </div>
                        );
                      }

                      // Agrupar por vendedor
                      const tareasPorVendedor = {};
                      tareasVendedores.forEach(tarea => {
                        const vendedor = tarea.asignado_nombre;
                        if (!tareasPorVendedor[vendedor]) {
                          tareasPorVendedor[vendedor] = [];
                        }
                        tareasPorVendedor[vendedor].push(tarea);
                      });

                      return (
                        <div className="space-y-4">
                          {Object.entries(tareasPorVendedor).map(([vendedor, tareas]) => (
                            <Card key={vendedor}>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center justify-between">
                                  <span>{vendedor}</span>
                                  <Badge variant="outline">{tareas.length} tareas</Badge>
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2">
                                  {tareas.map(tarea => (
                                    <div key={tarea.id} className="border rounded p-3 text-sm">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium">{tarea.titulo}</span>
                                        <Badge className={getPrioridadColor(tarea.prioridad)} size="sm">
                                          {tarea.prioridad}
                                        </Badge>
                                      </div>
                                      {tarea.descripcion && (
                                        <p className="text-gray-600 text-xs mb-1">{tarea.descripcion}</p>
                                      )}
                                      <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Badge className={getEstadoColor(tarea.estado)} size="sm">
                                          {tarea.estado}
                                        </Badge>
                                        {tarea.fecha_vencimiento && (
                                          <span>Vence: {format(parseISO(tarea.fecha_vencimiento), 'dd/MM/yyyy')}</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </TabsContent>

                <TabsContent value="asistentes_ventas">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Tareas de Asistentes de Ventas</h3>
                    {(() => {
                      const tareasAsistentes = tareas.filter(t => 
                        t.departamento === 'Ventas' && 
                        t.tipo_tarea !== 'Otra' &&
                        t.asignado_nombre &&
                        staff.find(s => s.id === t.asignado_a && s.rol === 'Asistente de Ventas')
                      );
                      
                      if (tareasAsistentes.length === 0) {
                        return (
                          <div className="text-center py-8 text-gray-500">
                            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>No hay tareas asignadas a asistentes de ventas</p>
                          </div>
                        );
                      }

                      // Agrupar por asistente
                      const tareasPorAsistente = {};
                      tareasAsistentes.forEach(tarea => {
                        const asistente = tarea.asignado_nombre;
                        if (!tareasPorAsistente[asistente]) {
                          tareasPorAsistente[asistente] = [];
                        }
                        tareasPorAsistente[asistente].push(tarea);
                      });

                      return (
                        <div className="space-y-4">
                          {Object.entries(tareasPorAsistente).map(([asistente, tareas]) => (
                            <Card key={asistente}>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center justify-between">
                                  <span>{asistente}</span>
                                  <Badge variant="outline">{tareas.length} tareas</Badge>
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2">
                                  {tareas.map(tarea => (
                                    <div key={tarea.id} className="border rounded p-3 text-sm">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium">{tarea.titulo}</span>
                                        <Badge className={getPrioridadColor(tarea.prioridad)} size="sm">
                                          {tarea.prioridad}
                                        </Badge>
                                      </div>
                                      {tarea.descripcion && (
                                        <p className="text-gray-600 text-xs mb-1">{tarea.descripcion}</p>
                                      )}
                                      <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Badge className={getEstadoColor(tarea.estado)} size="sm">
                                          {tarea.estado}
                                        </Badge>
                                        {tarea.fecha_vencimiento && (
                                          <span>Vence: {format(parseISO(tarea.fecha_vencimiento), 'dd/MM/yyyy')}</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </TabsContent>

                <TabsContent value="experiencia">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Experiencia al Cliente</h3>
                    
                    {/* Métricas de Experiencia */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Tareas Asistentes Experiencia */}
                      <Card className="border-blue-200 bg-blue-50/30">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-blue-700 font-medium">Tareas Asignadas</p>
                              <p className="text-2xl font-bold text-blue-600">
                                {tareas.filter(t => 
                                  t.departamento === 'Ventas' && 
                                  t.estado !== 'Completada' &&
                                  staff.find(s => s.id === t.asignado_a && s.rol === 'Asistente de Experiencia al Cliente')
                                ).length}
                              </p>
                            </div>
                            <Activity className="h-8 w-8 text-blue-600 opacity-20" />
                          </div>
                        </CardContent>
                      </Card>

                      {/* NPS Online sin seguimiento */}
                      <Card 
                        className="border-yellow-200 bg-yellow-50/30 cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => setDialogNPSSinSeguimiento(true)}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-yellow-700 font-medium">NPS sin Seguimiento</p>
                              <p className="text-2xl font-bold text-yellow-600">
                                {(() => {
                                  // Prospectos en NPS Online sin seguimiento o sin contacto registrado
                                  return prospectos.filter(p => {
                                    const seguimiento = seguimientoNPS.find(s => s.prospecto_id === p.id);
                                    return !seguimiento || !seguimiento.fue_contactado;
                                  }).length;
                                })()}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">Sin contacto registrado</p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-yellow-600 opacity-20" />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Seguimiento programado hoy */}
                      <Card className="border-green-200 bg-green-50/30">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-green-700 font-medium">Seguimiento Hoy</p>
                              <p className="text-2xl font-bold text-green-600">
                                {(() => {
                                  const hoy = format(new Date(), 'yyyy-MM-dd');
                                  return seguimientoNPS.filter(s => 
                                    s.fecha_proximo_seguimiento && 
                                    format(parseISO(s.fecha_proximo_seguimiento), 'yyyy-MM-dd') === hoy
                                  ).length;
                                })()}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">Programados para hoy</p>
                            </div>
                            <Calendar className="h-8 w-8 text-green-600 opacity-20" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Tareas de Asistentes de Experiencia */}
                    {(() => {
                      const tareasExperiencia = tareas.filter(t => 
                        t.departamento === 'Ventas' && 
                        t.estado !== 'Completada' &&
                        t.asignado_nombre &&
                        staff.find(s => s.id === t.asignado_a && s.rol === 'Asistente de Experiencia al Cliente')
                      );
                      
                      if (tareasExperiencia.length > 0) {
                        // Agrupar por asistente
                        const tareasPorAsistente = {};
                        tareasExperiencia.forEach(tarea => {
                          const asistente = tarea.asignado_nombre;
                          if (!tareasPorAsistente[asistente]) {
                            tareasPorAsistente[asistente] = [];
                          }
                          tareasPorAsistente[asistente].push(tarea);
                        });

                        return (
                          <div className="space-y-4 mt-6">
                            <h4 className="font-semibold">Tareas Pendientes</h4>
                            {Object.entries(tareasPorAsistente).map(([asistente, tareas]) => (
                              <Card key={asistente}>
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-base flex items-center justify-between">
                                    <span>{asistente}</span>
                                    <Badge variant="outline">{tareas.length} tareas</Badge>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-2">
                                    {tareas.map(tarea => (
                                      <div key={tarea.id} className="border rounded p-3 text-sm">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="font-medium">{tarea.titulo}</span>
                                          <Badge className={getPrioridadColor(tarea.prioridad)} size="sm">
                                            {tarea.prioridad}
                                          </Badge>
                                        </div>
                                        {tarea.descripcion && (
                                          <p className="text-gray-600 text-xs mb-1">{tarea.descripcion}</p>
                                        )}
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                          <Badge className={getEstadoColor(tarea.estado)} size="sm">
                                            {tarea.estado}
                                          </Badge>
                                          {tarea.fecha_vencimiento && (
                                            <span>Vence: {format(parseISO(tarea.fecha_vencimiento), 'dd/MM/yyyy')}</span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Listado de NPS sin seguimiento */}
                    {(() => {
                      const prospectosSinSeguimiento = prospectos.filter(p => {
                        const seguimiento = seguimientoNPS.find(s => s.prospecto_id === p.id);
                        return !seguimiento || !seguimiento.fue_contactado;
                      });
                      
                      if (prospectosSinSeguimiento.length > 0) {
                        return (
                          <div className="mt-6">
                            <h4 className="font-semibold mb-3">Prospectos NPS sin Seguimiento</h4>
                            <div className="space-y-2">
                              {prospectosSinSeguimiento.slice(0, 10).map(prospecto => {
                                const diasEnNPS = prospecto.fecha_ingreso_nps 
                                  ? differenceInDays(new Date(), parseISO(prospecto.fecha_ingreso_nps))
                                  : 0;
                                
                                return (
                                  <div key={prospecto.id} className="border rounded-lg p-3 hover:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{prospecto.nombre}</span>
                                          <Badge variant="outline" className="text-xs">
                                            {diasEnNPS} días en NPS
                                          </Badge>
                                        </div>
                                        <p className="text-sm text-gray-600">{prospecto.whatsapp}</p>
                                      </div>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => window.open(`https://wa.me/${prospecto.whatsapp}`, '_blank')}
                                      >
                                        <Phone className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                              {prospectosSinSeguimiento.length > 10 && (
                                <p className="text-sm text-gray-500 text-center pt-2">
                                  Y {prospectosSinSeguimiento.length - 10} más...
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Listado de seguimientos programados hoy */}
                    {(() => {
                      const hoy = format(new Date(), 'yyyy-MM-dd');
                      const seguimientosHoy = seguimientoNPS.filter(s => 
                        s.fecha_proximo_seguimiento && 
                        format(parseISO(s.fecha_proximo_seguimiento), 'yyyy-MM-dd') === hoy
                      );
                      
                      if (seguimientosHoy.length > 0) {
                        return (
                          <div className="mt-6">
                            <h4 className="font-semibold mb-3">Seguimientos Programados Hoy</h4>
                            <div className="space-y-2">
                              {seguimientosHoy.map(seguimiento => {
                                const prospecto = prospectos.find(p => p.id === seguimiento.prospecto_id);
                                
                                return (
                                  <div key={seguimiento.id} className="border rounded-lg p-3 hover:bg-gray-50 bg-green-50/30">
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">
                                            {seguimiento.prospecto_nombre || prospecto?.nombre}
                                          </span>
                                          <Badge className="bg-green-500 text-white text-xs">
                                            Seguimiento Hoy
                                          </Badge>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                          {seguimiento.prospecto_whatsapp || prospecto?.whatsapp}
                                        </p>
                                        {seguimiento.detalle_seguimiento && (
                                          <p className="text-xs text-gray-500 mt-1 italic">
                                            Último contacto: {seguimiento.detalle_seguimiento.substring(0, 100)}...
                                          </p>
                                        )}
                                      </div>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => window.open(`https://wa.me/${seguimiento.prospecto_whatsapp || prospecto?.whatsapp}`, '_blank')}
                                      >
                                        <Phone className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Dialog NPS sin Seguimiento */}
      <NPSSinSeguimientoDialog
        open={dialogNPSSinSeguimiento}
        onClose={() => setDialogNPSSinSeguimiento(false)}
        prospectos={prospectos.filter(p => {
          const seguimiento = seguimientoNPS.find(s => s.prospecto_id === p.id);
          return !seguimiento || !seguimiento.fue_contactado;
        })}
        sucursales={sucursales}
        staff={staff}
        onRecargar={cargarDatos}
      />
      
      {/* Dialog Soporte Listado */}
      <SoporteListadoDialog
        open={dialogSoporte}
        onClose={() => setDialogSoporte(false)}
        tipo={tipoMetricaSoporte}
        onboardings={onboarding}
        tareasRS={tareasRS}
        sucursales={sucursales}
        staff={staff}
        onRecargar={cargarDatos}
      />
      
      {/* Dialog Gestión Renovación */}
      <GestionRenovacionDialog
        open={dialogRenovacion}
        onClose={() => {
          setDialogRenovacion(false);
          setSeguimientoSeleccionado(null);
        }}
        seguimiento={seguimientoSeleccionado}
        onSuccess={cargarDatos}
      />
      
      {/* Dialog Gestión Deudor */}
      <GestionDeudorDialog
        open={dialogDeudor}
        onClose={() => {
          setDialogDeudor(false);
          setDeudorSeleccionado(null);
        }}
        deudor={deudorSeleccionado}
        onSuccess={cargarDatos}
      />
      
      {/* Dialog Prepagos Vencidos */}
      <PrepagosVencidosDialog
        open={dialogPrepagosVencidos}
        onClose={() => setDialogPrepagosVencidos(false)}
        clientes={clientes}
        planesServicios={planesServicios}
        seguimientoOnline={seguimientoOnline}
        sucursales={sucursales}
        onRecargar={cargarDatos}
      />
      
      {/* Dialog Confirmación de Bajas */}
      <ConfirmacionBajasDialog
        open={dialogConfirmacionBajas}
        onOpenChange={setDialogConfirmacionBajas}
        tareas={tareas}
        sucursales={sucursales}
        staff={staff}
        user={user}
        staffData={staffData}
        onSuccess={cargarDatos}
      />
      
      {/* Dialog Cancelar Suscripción MP */}
      <CancelarSuscripcionMPDialog
        open={dialogCancelarMP}
        onOpenChange={setDialogCancelarMP}
        tareas={tareas}
        sucursales={sucursales}
        staff={staff}
        user={user}
        staffData={staffData}
        onSuccess={cargarDatos}
      />
    </div>
  );
}