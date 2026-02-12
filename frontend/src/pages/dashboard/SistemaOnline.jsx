import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Onboarding_Clientes } from '@/entities/Onboarding_Clientes';
import { Clientes } from '@/entities/Clientes';
import { Contratos } from '@/entities/Contratos';
import { Tarjetas_Registradas } from '@/entities/Tarjetas_Registradas';
import { Sucursales } from '@/entities/Sucursales';
import { Staff } from '@/entities/Staff';
import { Tareas_RS } from '@/entities/Tareas_RS';
import { User } from '@/entities/User';
import {
  CheckCircle2, XCircle, Clock, Users, FileText, CreditCard,
  AlertTriangle, Building2, Phone, Search, Calendar, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import moment from 'moment';
import 'moment/locale/es';

moment.locale('es');

const ITEMS_PER_PAGE = 25;

export default function SistemaOnline() {
  const [loading, setLoading] = useState(true);
  const [onboardings, setOnboardings] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [tarjetas, setTarjetas] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [staff, setStaff] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Filtros
  const [filtroSede, setFiltroSede] = useState('todas');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);


  useEffect(() => {
    cargarDatos();
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filtroSede, filtroEstado, busqueda]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [
        user,
        onboardingsData,
        clientesData,
        contratosData,
        tarjetasData,
        sedesData,
        staffData,
        tareasData
      ] = await Promise.all([
        User.me(),
        Onboarding_Clientes.list('-fecha_ingreso'),
        Clientes.list('-createdAt'),
        Contratos.list('-createdAt'),
        Tarjetas_Registradas.list('-createdAt'),
        Sucursales.list('nombre_sede'),
        Staff.list('nombre'),
        Tareas_RS.list('-createdAt')
      ]);

      setCurrentUser(user);
      setOnboardings(onboardingsData || []);
      setClientes(clientesData || []);
      setContratos(contratosData || []);
      setTarjetas(tarjetasData || []);
      setSedes(sedesData || []);
      setStaff(staffData || []);
      setTareas(tareasData || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
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

      // Marcar tarea como completada si existe
      if (onboarding.tarea_contrato_id) {
        await Tareas_RS.update(onboarding.tarea_contrato_id, {
          estado: 'completada',
          fecha_completada: new Date().toISOString()
        });
      }

      alert('Contrato marcado como firmado');
      await cargarDatos();
    } catch (error) {
      console.error('Error marcando contrato:', error);
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

      // Marcar tarea como completada si existe
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
      await cargarDatos();
    } catch (error) {
      console.error('Error marcando tarjeta:', error);
      alert('Error al marcar tarjeta');
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarNoRequiereTarjeta = async (onboarding) => {
    if (!confirm('¿Confirmar que el plan de este cliente NO requiere tarjeta?')) return;

    setLoading(true);
    try {
      await Onboarding_Clientes.update(onboarding.id, {
        plan_no_requiere_tarjeta: true,
        tarjeta_registrada: true, // Se marca como completado
        fecha_registro_tarjeta: new Date().toISOString(),
        estado_onboarding: onboarding.contrato_firmado ? 'Completado' : 'En Proceso'
      });

      // Marcar tarea como completada si existe
      if (onboarding.tarea_tarjeta_id) {
        await Tareas_RS.update(onboarding.tarea_tarjeta_id, {
          estado: 'completada',
          fecha_completada: new Date().toISOString()
        });
      }

      alert('Marcado como plan que no requiere tarjeta');
      await cargarDatos();
    } catch (error) {
      console.error('Error marcando no requiere tarjeta:', error);
      alert('Error al marcar');
    } finally {
      setLoading(false);
    }
  };

  // Estados para dialogs de envío
  const [dialogEnviarMensaje, setDialogEnviarMensaje] = useState(false);
  const [dialogEnviarLink, setDialogEnviarLink] = useState(false);
  const [onboardingSeleccionado, setOnboardingSeleccionado] = useState(null);
  const [opcionesMensaje, setOpcionesMensaje] = useState({
    mensajeEnviado: false,
    clienteBloqueado: false
  });
  const [opcionesLink, setOpcionesLink] = useState({
    linkEnviado: false,
    clienteBloqueado: false
  });
  const [mensajeParaCopiar, setMensajeParaCopiar] = useState('');

  // Estado para dialog de métricas
  const [dialogMetrica, setDialogMetrica] = useState(false);
  const [tipoMetrica, setTipoMetrica] = useState(null); // 'sin_contrato', 'sin_tarjeta', 'pendientes', 'completados'

  // Estado para dialog de registro de tarjeta
  const [dialogRegistroTarjeta, setDialogRegistroTarjeta] = useState(false);
  const [onboardingTarjeta, setOnboardingTarjeta] = useState(null);
  const [plataformaTarjeta, setPlataformaTarjeta] = useState('');
  const [correoMercadoPago, setCorreoMercadoPago] = useState('');

  const handleEnviarMensajeContrato = async (onboarding) => {
    setOnboardingSeleccionado(onboarding);
    setOpcionesMensaje({ mensajeEnviado: false, clienteBloqueado: false });
    
    // Mensaje personalizado para contrato
    const mensaje = `Hola! como estás? te hablamos desde Vendify!🏋🏻
queremos informarte que, el sistema por defecto, bloquea el acceso cuando no están los documentos firmados✍🏻

Te envío una imagen de como debes firmarlos, a penas este ok, favor me avisas para poder desbloquear✅. muchas gracias!`;
    
    setMensajeParaCopiar(mensaje);
    setDialogEnviarMensaje(true);
  };

  const handleEnviarLinkTarjeta = async (onboarding) => {
    setOnboardingSeleccionado(onboarding);
    setOpcionesLink({ linkEnviado: false, clienteBloqueado: false });
    
    // Mensaje personalizado para tarjeta
    const mensaje = `Te adjunto link de Registro de tarjeta, para tu Plan Contratado(           )

Importante: dejar tu registro al día antes de asistir a clases para que el Ingreso quede liberado 🥰`;
    
    setMensajeParaCopiar(mensaje);
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
      
      await Onboarding_Clientes.update(onboardingSeleccionado.id, {
        notas: nuevaNota
      });

      alert(`Resultado registrado: ${resultados.join(', ')}`);
      setDialogEnviarMensaje(false);
      setOnboardingSeleccionado(null);
      setOpcionesMensaje({ mensajeEnviado: false, clienteBloqueado: false });
      await cargarDatos();
    } catch (error) {
      console.error('Error registrando envío:', error);
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
      
      await Onboarding_Clientes.update(onboardingSeleccionado.id, {
        notas: nuevaNota
      });

      alert(`Resultado registrado: ${resultados.join(', ')}`);
      setDialogEnviarLink(false);
      setOnboardingSeleccionado(null);
      setOpcionesLink({ linkEnviado: false, clienteBloqueado: false });
      await cargarDatos();
    } catch (error) {
      console.error('Error registrando envío:', error);
      alert('Error al registrar el envío');
    } finally {
      setLoading(false);
    }
  };

  const copiarMensaje = () => {
    navigator.clipboard.writeText(mensajeParaCopiar);
    alert('Mensaje copiado al portapapeles ✓');
  };

  const handleClickMetrica = (tipo) => {
    setTipoMetrica(tipo);
    setDialogMetrica(true);
  };

  const obtenerListadoMetrica = () => {
    switch (tipoMetrica) {
      case 'sin_contrato':
        return onboardingsFiltrados.filter(o => !o.contrato_firmado);
      case 'sin_tarjeta':
        return onboardingsFiltrados.filter(o => !o.tarjeta_registrada);
      case 'pendientes':
        return onboardingsFiltrados.filter(o => o.estado_onboarding === 'Pendiente');
      case 'completados':
        return onboardingsFiltrados.filter(o => o.estado_onboarding === 'Completado');
      default:
        return [];
    }
  };

  const obtenerTituloMetrica = () => {
    switch (tipoMetrica) {
      case 'sin_contrato':
        return 'Clientes Sin Contrato';
      case 'sin_tarjeta':
        return 'Clientes Sin Tarjeta';
      case 'pendientes':
        return 'Clientes Pendientes';
      case 'completados':
        return 'Clientes Completados';
      default:
        return '';
    }
  };


  // Filtrar onboardings
  const onboardingsFiltrados = onboardings.filter((onb) => {
    if (filtroSede !== 'todas' && onb.sede !== filtroSede) return false;
    
    if (filtroEstado === 'pendiente' && onb.estado_onboarding !== 'Pendiente') return false;
    if (filtroEstado === 'en_proceso' && onb.estado_onboarding !== 'En Proceso') return false;
    if (filtroEstado === 'completado' && onb.estado_onboarding !== 'Completado') return false;

    if (busqueda) {
      const searchLower = busqueda.toLowerCase();
      const nombreMatch = onb.cliente_nombre?.toLowerCase().includes(searchLower);
      const whatsappMatch = onb.cliente_whatsapp?.includes(busqueda);
      if (!nombreMatch && !whatsappMatch) return false;
    }

    return true;
  });

  // Calcular métricas
  const totalClientes = onboardingsFiltrados.length;
  const sinContrato = onboardingsFiltrados.filter(o => !o.contrato_firmado).length;
  const sinTarjeta = onboardingsFiltrados.filter(o => !o.tarjeta_registrada).length;
  const completados = onboardingsFiltrados.filter(o => o.estado_onboarding === 'Completado').length;
  const pendientes = onboardingsFiltrados.filter(o => o.estado_onboarding === 'Pendiente').length;

  // Pagination calculations
  const totalItems = onboardingsFiltrados.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedOnboardings = onboardingsFiltrados.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Pagination component renderer
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t bg-gray-50">
        <div className="text-sm text-gray-600">
          Mostrando {startIndex + 1} - {Math.min(endIndex, totalItems)} de {totalItems} registros
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
          >
            Primera
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                return page === 1 ||
                       page === totalPages ||
                       Math.abs(page - currentPage) <= 1;
              })
              .reduce((acc, page, idx, arr) => {
                if (idx > 0 && page - arr[idx - 1] > 1) {
                  acc.push('...');
                }
                acc.push(page);
                return acc;
              }, [])
              .map((item, idx) => (
                item === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">...</span>
                ) : (
                  <Button
                    key={item}
                    variant={currentPage === item ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => handlePageChange(item)}
                  >
                    {item}
                  </Button>
                )
              ))
            }
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            Última
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando sistema online...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Sistema Online - Onboarding Clientes</h1>
        <p className="text-muted-foreground mt-1">
          Gestión de contratos y tarjetas de clientes nuevos
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{totalClientes}</span>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-red-200 bg-red-50/30 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleClickMetrica('sin_contrato')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Sin Contrato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-red-600">{sinContrato}</span>
              <FileText className="w-5 h-5 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-orange-200 bg-orange-50/30 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleClickMetrica('sin_tarjeta')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">Sin Tarjeta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-orange-600">{sinTarjeta}</span>
              <CreditCard className="w-5 h-5 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-yellow-200 bg-yellow-50/30 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleClickMetrica('pendientes')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-yellow-600">{pendientes}</span>
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-green-200 bg-green-50/30 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleClickMetrica('completados')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Completados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-600">{completados}</span>
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Sede</label>
              <Select value={filtroSede} onValueChange={setFiltroSede}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {sedes.map(sede => (
                    <SelectItem key={sede.id} value={sede.id}>{sede.nombre_sede}</SelectItem>
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
                  <SelectItem value="en_proceso">En Proceso</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-2">
              <label className="text-sm font-medium mb-1.5 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Nombre o WhatsApp..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Clientes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Clientes en Onboarding ({onboardingsFiltrados.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sede</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Ingreso</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contrato</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarjeta</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedOnboardings.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                      No hay clientes que coincidan con los filtros
                    </td>
                  </tr>
                ) : (
                  paginatedOnboardings.map((onboarding) => {
                    const sede = sedes.find(s => s.id === onboarding.sede);
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
                                disabled={onboarding.contrato_firmado}
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
                                disabled={onboarding.tarjeta_registrada}
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
                                  No requiere tarjeta
                                </Button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
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
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
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
          </div>
          {renderPagination()}
        </CardContent>
      </Card>

      {/* Dialog Enviar Mensaje Contrato */}
      {dialogEnviarMensaje && onboardingSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Enviar Mensaje - Contrato</h3>
            
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <p className="text-sm font-medium text-blue-900">{onboardingSeleccionado.cliente_nombre}</p>
              <div className="flex items-center gap-1 text-xs text-blue-700">
                <Phone className="w-3 h-3" />
                {onboardingSeleccionado.cliente_whatsapp}
              </div>
            </div>

            {/* Mensaje para copiar */}
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Mensaje para enviar:</label>
              <div className="relative">
                <textarea
                  value={mensajeParaCopiar}
                  readOnly
                  className="w-full border rounded-md p-3 text-sm bg-gray-50 font-mono"
                  rows={6}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={copiarMensaje}
                  className="absolute top-2 right-2"
                >
                  Copiar
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Resultado del envío <span className="text-red-500">*</span>
                </label>
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
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogEnviarMensaje(false);
                  setOnboardingSeleccionado(null);
                  setOpcionesMensaje({ mensajeEnviado: false, clienteBloqueado: false });
                }}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Enviar Link - Registro de Tarjeta</h3>
            
            <div className="bg-purple-50 p-3 rounded-lg mb-4">
              <p className="text-sm font-medium text-purple-900">{onboardingSeleccionado.cliente_nombre}</p>
              <div className="flex items-center gap-1 text-xs text-purple-700">
                <Phone className="w-3 h-3" />
                {onboardingSeleccionado.cliente_whatsapp}
              </div>
            </div>

            {/* Mensaje para copiar */}
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Mensaje para enviar:</label>
              <div className="relative">
                <textarea
                  value={mensajeParaCopiar}
                  readOnly
                  className="w-full border rounded-md p-3 text-sm bg-gray-50 font-mono"
                  rows={6}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={copiarMensaje}
                  className="absolute top-2 right-2"
                >
                  Copiar
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Resultado del envío <span className="text-red-500">*</span>
                </label>
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
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogEnviarLink(false);
                  setOnboardingSeleccionado(null);
                  setOpcionesLink({ linkEnviado: false, clienteBloqueado: false });
                }}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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

      {/* Dialog Listado de Métrica */}
      {dialogMetrica && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{obtenerTituloMetrica()}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDialogMetrica(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {obtenerListadoMetrica().length} cliente{obtenerListadoMetrica().length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sede</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Ingreso</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contrato</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarjeta</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {obtenerListadoMetrica().length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                          No hay clientes en esta categoría
                        </td>
                      </tr>
                    ) : (
                      obtenerListadoMetrica().map((onboarding) => {
                        const sede = sedes.find(s => s.id === onboarding.sede);
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
                                    disabled={onboarding.contrato_firmado}
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
                                    disabled={onboarding.tarjeta_registrada}
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
                                      No requiere tarjeta
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
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
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
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
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50">
              <Button
                variant="outline"
                onClick={() => setDialogMetrica(false)}
                className="w-full"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}