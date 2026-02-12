import React, { useEffect, useMemo, useState } from 'react';
import { Users, TrendingUp, Clock, XCircle, Target, Building2, User, Phone, Mail, Calendar, CheckCircle2, MessageSquare, Download, Ban, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Prospectos } from '@/entities/Prospectos';
import { Sucursales } from '@/entities/Sucursales';
import { Staff } from '@/entities/Staff';
import { Agendamientos } from '@/entities/Agendamientos';
import { Seguimiento_NPS } from '@/entities/Seguimiento_NPS';
import { Ventas } from '@/entities/Ventas';
import { Planes_Servicios } from '@/entities/Planes_Servicios';
import UserEntity from '@/entities/User';
import MetricaDialog from '@/components/MetricaDialog';
import axios from 'axios';
import moment from 'moment';
import 'moment/locale/es';

moment.locale('es');

const ITEMS_PER_PAGE = 25;

export default function NPSOnline() {
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const focusProspectoId = urlParams.get('prospectoId');

  const [prospectos, setProspectos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [staff, setStaff] = useState([]);
  const [seguimientos, setSeguimientos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [agendamientos, setAgendamientos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroSede, setFiltroSede] = useState('todas');
  const [filtroVendedor, setFiltroVendedor] = useState('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos');
  const [filtroOrigen, setFiltroOrigen] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  // Pagination states for each table
  const [currentPageSeguimiento, setCurrentPageSeguimiento] = useState(1);
  const [currentPageAsistieron, setCurrentPageAsistieron] = useState(1);
  const [currentPageNoAsistieron, setCurrentPageNoAsistieron] = useState(1);

  // Dialogs
  const [dialogCompromiso, setDialogCompromiso] = useState(false);
  const [dialogNoInteresa, setDialogNoInteresa] = useState(false);
  const [dialogSeguimiento, setDialogSeguimiento] = useState(false);
  const [dialogMetrica, setDialogMetrica] = useState(false);
  const [metricaSeleccionada, setMetricaSeleccionada] = useState(null);
  const [prospectoSeleccionado, setProspectoSeleccionado] = useState(null);
  const [fechaSeguimiento, setFechaSeguimiento] = useState('');
  const [notas, setNotas] = useState('');
  
  // Seguimiento form
  const [detalleSeguimiento, setDetalleSeguimiento] = useState('');
  const [resultadoSeguimiento, setResultadoSeguimiento] = useState('Contactado sin respuesta');
  const [fechaProximoSeguimiento, setFechaProximoSeguimiento] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (!focusProspectoId) return;
    if (loading) return;

    const el = document.getElementById(`prospecto-${focusProspectoId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusProspectoId, loading]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPageSeguimiento(1);
    setCurrentPageAsistieron(1);
    setCurrentPageNoAsistieron(1);
  }, [filtroSede, filtroVendedor, filtroPeriodo, filtroOrigen, busqueda]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [prospectosData, sucursalesData, staffData, seguimientosData, ventasData, planesData, agendamientosData] = await Promise.all([
        Prospectos.list('-createdAt'),
        Sucursales.list('nombre_sede'),
        Staff.list('nombre'),
        Seguimiento_NPS.list('-createdAt'),
        Ventas.list('-fecha_venta'),
        Planes_Servicios.list('nombre_plan'),
        Agendamientos.list('-fecha_hora')
      ]);

      // Filtrar solo prospectos con estado "NPS Online" o "No compró"
      const prospectosNPS = prospectosData.filter(p => 
        p.estado_pipeline === 'NPS Online' || p.estado_pipeline === 'No compró'
      );

      setProspectos(prospectosNPS);
      setSucursales(sucursalesData);
      setStaff(staffData);
      setSeguimientos(seguimientosData);
      setVentas(ventasData);
      setPlanes(planesData);
      setAgendamientos(agendamientosData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calcular tiempo en NPS Online desde que se colocó el estado (fecha_ingreso_nps)
  const calcularTiempoEnNPS = (prospecto) => {
    const fechaIngreso = prospecto?.fecha_ingreso_nps
      ? moment(prospecto.fecha_ingreso_nps)
      : moment(prospecto?.updatedAt);

    const ahora = moment();
    const diffHorasTotal = Math.max(0, ahora.diff(fechaIngreso, 'hours'));
    const dias = Math.floor(diffHorasTotal / 24);
    const horas = diffHorasTotal % 24;

    return { dias, horas, diffHorasTotal };
  };

  const formatTiempoEnNPS = (prospecto) => {
    const { dias, horas } = calcularTiempoEnNPS(prospecto);
    if (dias <= 0) return `${horas}h`;
    return `${dias}d ${horas}h`;
  };

  const helpers = useMemo(() => {
    const planById = new Map();
    (planes || []).forEach((p) => {
      if (p?.id) planById.set(p.id, p);
    });

    const ventasByProspecto = new Map();
    (ventas || []).forEach((v) => {
      if (!v?.prospecto_id) return;
      const arr = ventasByProspecto.get(v.prospecto_id) || [];
      arr.push(v);
      ventasByProspecto.set(v.prospecto_id, arr);
    });

    const agByProspecto = new Map();
    (agendamientos || []).forEach((a) => {
      if (!a?.prospecto_id) return;
      const arr = agByProspecto.get(a.prospecto_id) || [];
      arr.push(a);
      agByProspecto.set(a.prospecto_id, arr);
    });

    const getLastAgendamiento = (prospectoId) => {
      const arr = agByProspecto.get(prospectoId) || [];
      if (!arr.length) return null;
      return arr.slice().sort((x, y) => new Date(y.fecha_hora) - new Date(x.fecha_hora))[0];
    };

    const tuvoAsistencia = (prospectoId) => {
      const last = getLastAgendamiento(prospectoId);
      return last?.resultado_asistencia === 'Asistió';
    };

    const noAsistio = (prospectoId) => {
      const last = getLastAgendamiento(prospectoId);
      return last?.resultado_asistencia === 'No asistió';
    };

    const tieneCompraPlanPrograma = (prospectoId) => {
      const arr = ventasByProspecto.get(prospectoId) || [];
      return arr.some((v) => {
        if (!v?.plan) return false;
        const plan = planById.get(v.plan);
        return plan?.tipo_item === 'Plan' || plan?.tipo_item === 'Programa';
      });
    };

    const origenProspecto = (prospecto) => {
      const pid = prospecto?.id;
      if (!pid) return 'otros';

      // Para estar en "asistio_no_compro" debe:
      // 1. Tener un agendamiento con resultado_asistencia = 'Asistió'
      // 2. NO tener compra de Plan/Programa
      // 3. Estar en estado NPS Online (ya filtrado al inicio)
      if (tuvoAsistencia(pid) && !tieneCompraPlanPrograma(pid)) return 'asistio_no_compro';
      
      // Para estar en "no_asistio" debe:
      // 1. Tener un agendamiento con resultado_asistencia = 'No asistió'
      // 2. Estar en estado NPS Online (ya filtrado al inicio)
      if (noAsistio(pid)) return 'no_asistio';

      return 'otros';
    };

    return { origenProspecto, tuvoAsistencia, noAsistio, tieneCompraPlanPrograma };
  }, [agendamientos, planes, ventas]);

  // Filtrar prospectos
  const prospectosFiltrados = prospectos.filter((prospecto) => {
    // Filtro de sede
    if (filtroSede !== 'todas' && prospecto.sede !== filtroSede) return false;

    // Filtro de vendedor
    if (filtroVendedor !== 'todos' && prospecto.vendedor_asignado !== filtroVendedor) return false;

    // Filtro de origen
    const origen = helpers.origenProspecto(prospecto);
    if (filtroOrigen === 'asistio_no_compro' && origen !== 'asistio_no_compro') return false;
    if (filtroOrigen === 'no_asistio' && origen !== 'no_asistio') return false;

    // Filtro de periodo (días en NPS)
    const { dias: diasEnNPS } = calcularTiempoEnNPS(prospecto);
    if (filtroPeriodo === 'hoy' && diasEnNPS !== 0) return false;
    if (filtroPeriodo === 'menos_2' && diasEnNPS >= 2) return false;
    if (filtroPeriodo === 'mas_2' && diasEnNPS < 2) return false;

    // Búsqueda por nombre o whatsapp
    if (busqueda) {
      const searchLower = busqueda.toLowerCase();
      const nombreMatch = prospecto.nombre?.toLowerCase().includes(searchLower);
      const whatsappMatch = prospecto.whatsapp?.includes(busqueda);
      if (!nombreMatch && !whatsappMatch) return false;
    }

    return true;
  });

  // Dividir por secciones
  // Prospectos en seguimiento: tienen fecha_proximo_seguimiento pendiente (hoy o futura)
  const prospectosEnSeguimiento = prospectosFiltrados.filter((p) => {
    const seguimiento = seguimientos.find(s => s.prospecto_id === p.id);
    if (!seguimiento?.fecha_proximo_seguimiento) return false;
    const fechaSeguimiento = moment(seguimiento.fecha_proximo_seguimiento);
    const hoy = moment().startOf('day');
    return fechaSeguimiento.isSameOrAfter(hoy);
  });

  // Filtrar los otros segmentos excluyendo los que están en seguimiento
  const idsEnSeguimiento = new Set(prospectosEnSeguimiento.map(p => p.id));
  
  const prospectosAsistieronNoCompraron = prospectosFiltrados.filter(
    (p) => !idsEnSeguimiento.has(p.id) && helpers.origenProspecto(p) === 'asistio_no_compro'
  );
  const prospectosNoAsistieron = prospectosFiltrados.filter(
    (p) => !idsEnSeguimiento.has(p.id) && helpers.origenProspecto(p) === 'no_asistio'
  );

  // Calcular métricas
  const totalProspectos = prospectosFiltrados.length;
  const diasPromedio = totalProspectos > 0 
    ? (
        prospectosFiltrados.reduce((sum, p) => sum + calcularTiempoEnNPS(p).diffHorasTotal, 0) /
        totalProspectos /
        24
      ).toFixed(1)
    : 0;
  const prospectosMas2Dias = prospectosFiltrados.filter(p => calcularTiempoEnNPS(p).dias >= 2).length;

  const totalEnSeguimiento = prospectosEnSeguimiento.length;
  const totalAsistieronNoCompraron = prospectosAsistieronNoCompraron.length;
  const totalNoAsistio = prospectosNoAsistieron.length;

  // Prospectos marcados como "No le interesa" (desde Seguimiento_NPS)
  // Nota: se calcula sobre prospectosFiltrados (respeta filtros) y excluye los que están en seguimiento programado,
  // para que las métricas sean mutuamente excluyentes (igual que No asistió / Asistió y no compró).
  const prospectosNoInteresa = prospectosFiltrados.filter((p) => {
    if (idsEnSeguimiento.has(p.id)) return false;
    const seg = seguimientos.find((s) => s.prospecto_id === p.id);
    return seg?.resultado_seguimiento === 'No le interesa';
  });
  const totalNoInteresa = prospectosNoInteresa.length;
  
  // Calcular prospectos sin seguimiento
  const prospectosSinSeguimiento = prospectosFiltrados.filter(prospecto => {
    const seguimiento = seguimientos.find(s => s.prospecto_id === prospecto.id);
    return !seguimiento || !seguimiento.fue_contactado;
  }).length;

  // Pagination calculations for each table
  const paginateSeguimiento = {
    totalItems: prospectosEnSeguimiento.length,
    totalPages: Math.ceil(prospectosEnSeguimiento.length / ITEMS_PER_PAGE),
    startIndex: (currentPageSeguimiento - 1) * ITEMS_PER_PAGE,
    endIndex: currentPageSeguimiento * ITEMS_PER_PAGE,
  };
  const paginatedSeguimiento = prospectosEnSeguimiento.slice(paginateSeguimiento.startIndex, paginateSeguimiento.endIndex);

  const paginateAsistieron = {
    totalItems: prospectosAsistieronNoCompraron.length,
    totalPages: Math.ceil(prospectosAsistieronNoCompraron.length / ITEMS_PER_PAGE),
    startIndex: (currentPageAsistieron - 1) * ITEMS_PER_PAGE,
    endIndex: currentPageAsistieron * ITEMS_PER_PAGE,
  };
  const paginatedAsistieron = prospectosAsistieronNoCompraron.slice(paginateAsistieron.startIndex, paginateAsistieron.endIndex);

  const paginateNoAsistieron = {
    totalItems: prospectosNoAsistieron.length,
    totalPages: Math.ceil(prospectosNoAsistieron.length / ITEMS_PER_PAGE),
    startIndex: (currentPageNoAsistieron - 1) * ITEMS_PER_PAGE,
    endIndex: currentPageNoAsistieron * ITEMS_PER_PAGE,
  };
  const paginatedNoAsistieron = prospectosNoAsistieron.slice(paginateNoAsistieron.startIndex, paginateNoAsistieron.endIndex);

  // Pagination component renderer
  const renderPagination = (currentPage, totalPages, totalItems, startIndex, endIndex, onPageChange) => {
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
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
          >
            Primera
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
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
                    onClick={() => onPageChange(item)}
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
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            Última
          </Button>
        </div>
      </div>
    );
  };

  // Handlers
  const handleIndicoCompromiso = async () => {
    if (!fechaSeguimiento) {
      alert('Por favor selecciona una fecha de seguimiento');
      return;
    }

    setLoading(true);
    try {
      // Actualizar estado del prospecto a "Compromiso de compra"
      await Prospectos.update(prospectoSeleccionado.id, {
        estado_pipeline: 'Compromiso de compra',
        notas: notas ? `${prospectoSeleccionado.notas || ''}\n[${moment().format('DD/MM/YYYY HH:mm')}] Indicó compromiso desde NPS Online: ${notas}` : prospectoSeleccionado.notas
      });

      // Crear agendamiento de seguimiento
      await Agendamientos.create({
        prospecto_id: prospectoSeleccionado.id,
        prospecto_nombre: prospectoSeleccionado.nombre,
        sede: prospectoSeleccionado.sede,
        fecha_hora: `${fechaSeguimiento}T10:00:00`,
        tipo_visita: 'Promesa de compra',
        resultado_asistencia: 'Pendiente',
        notas: notas || 'Seguimiento desde NPS Online'
      });

      alert('Prospecto movido a Compromisos de Compra');
      setDialogCompromiso(false);
      setProspectoSeleccionado(null);
      setFechaSeguimiento('');
      setNotas('');
      await cargarDatos();
    } catch (error) {
      console.error('Error indicando compromiso:', error);
      alert('Error al procesar la acción');
    } finally {
      setLoading(false);
    }
  };

  const handleNoInteresa = async () => {
    if (!confirm('¿Estás seguro de marcar este prospecto como "No le interesa"?')) {
      return;
    }

    setLoading(true);
    try {
      await Prospectos.update(prospectoSeleccionado.id, {
        estado_pipeline: 'Descartado',
        notas: notas ? `${prospectoSeleccionado.notas || ''}\n[${moment().format('DD/MM/YYYY HH:mm')}] Descartado desde NPS Online: ${notas}` : prospectoSeleccionado.notas
      });

      alert('Prospecto marcado como Descartado');
      setDialogNoInteresa(false);
      setProspectoSeleccionado(null);
      setNotas('');
      await cargarDatos();
    } catch (error) {
      console.error('Error marcando como no interesa:', error);
      alert('Error al procesar la acción');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarSeguimiento = async () => {
    if (!detalleSeguimiento) {
      alert('Por favor ingresa el detalle del seguimiento');
      return;
    }

    if ((resultadoSeguimiento === 'Reagendar' || resultadoSeguimiento === 'Nueva fecha de seguimiento') && !fechaProximoSeguimiento) {
      alert('Por favor selecciona la fecha del próximo seguimiento');
      return;
    }

    setLoading(true);
    try {
      const user = await UserEntity.me();
      const staffActual = staff.find(s => s.email === user.email);

      // Buscar seguimiento existente
      const seguimientoExistente = seguimientos.find(s => s.prospecto_id === prospectoSeleccionado.id);

      const seguimientoData = {
        fue_contactado: true,
        fecha_contacto: new Date().toISOString(),
        responsable_seguimiento: staffActual?.id,
        detalle_seguimiento: detalleSeguimiento,
        resultado_seguimiento: resultadoSeguimiento,
        fecha_proximo_seguimiento: (resultadoSeguimiento === 'Reagendar' || resultadoSeguimiento === 'Nueva fecha de seguimiento') ? fechaProximoSeguimiento : null,
        notas: notas
      };

      if (seguimientoExistente) {
        // Actualizar seguimiento existente
        await Seguimiento_NPS.update(seguimientoExistente.id, seguimientoData);
      } else {
        // Crear nuevo seguimiento
        await Seguimiento_NPS.create({
          prospecto_id: prospectoSeleccionado.id,
          prospecto_nombre: prospectoSeleccionado.nombre,
          prospecto_whatsapp: prospectoSeleccionado.whatsapp,
          fecha_ingreso_nps: prospectoSeleccionado.fecha_ingreso_nps || new Date().toISOString(),
          sede: prospectoSeleccionado.sede,
          vendedor_asignado: prospectoSeleccionado.vendedor_asignado,
          ...seguimientoData
        });
      }

      alert('Seguimiento registrado exitosamente');
      setDialogSeguimiento(false);
      setProspectoSeleccionado(null);
      setDetalleSeguimiento('');
      setResultadoSeguimiento('Contactado sin respuesta');
      setFechaProximoSeguimiento('');
      setNotas('');
      await cargarDatos();
    } catch (error) {
      console.error('Error registrando seguimiento:', error);
      alert('Error al registrar seguimiento');
    } finally {
      setLoading(false);
    }
  };

  // Handlers para métricas clickeables
  const handleClickMetrica = (tipo) => {
    let prospectosFiltradosMetrica = [];
    let titulo = '';
    let icono = null;

    switch(tipo) {
      case 'total':
        prospectosFiltradosMetrica = prospectosFiltrados;
        titulo = 'Total Prospectos';
        icono = <Users className="w-5 h-5 text-blue-600" />;
        break;
      case 'en_seguimiento':
        prospectosFiltradosMetrica = prospectosEnSeguimiento;
        titulo = 'En Seguimiento';
        icono = <Calendar className="w-5 h-5 text-green-600" />;
        break;
      case 'mas_2_dias':
        prospectosFiltradosMetrica = prospectosFiltrados.filter(p => calcularTiempoEnNPS(p).dias >= 2);
        titulo = '+2 Días';
        icono = <TrendingUp className="w-5 h-5 text-red-600" />;
        break;
      case 'sin_seguimiento':
        prospectosFiltradosMetrica = prospectosFiltrados.filter(prospecto => {
          const seguimiento = seguimientos.find(s => s.prospecto_id === prospecto.id);
          return !seguimiento || !seguimiento.fue_contactado;
        });
        titulo = 'Sin Seguimiento';
        icono = <XCircle className="w-5 h-5 text-purple-600" />;
        break;
      case 'no_asistio':
        prospectosFiltradosMetrica = prospectosNoAsistieron;
        titulo = 'No asistió';
        icono = <XCircle className="w-5 h-5 text-red-600" />;
        break;
      case 'asistio_no_compro':
        prospectosFiltradosMetrica = prospectosAsistieronNoCompraron;
        titulo = 'Asistió y no compró';
        icono = <Users className="w-5 h-5 text-blue-600" />;
        break;
      case 'no_interesa':
        prospectosFiltradosMetrica = prospectosNoInteresa;
        titulo = 'No le interesa';
        icono = <Ban className="w-5 h-5 text-slate-600" />;
        break;
      default:
        return;
    }

    setMetricaSeleccionada({
      tipo,
      titulo,
      icono,
      prospectos: prospectosFiltradosMetrica
    });
    setDialogMetrica(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando prospectos NPS Online...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">NPS Online</h1>
        <p className="text-sm text-gray-600 mt-1">Prospectos que no compraron - Seguimiento online</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-8 gap-3">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleClickMetrica('total')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Prospectos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{totalProspectos}</span>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleClickMetrica('en_seguimiento')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">En Seguimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-600">{totalEnSeguimiento}</span>
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Días Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-orange-600">{diasPromedio}</span>
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleClickMetrica('mas_2_dias')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">+2 Días</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-red-600">{prospectosMas2Dias}</span>
              <TrendingUp className="w-5 h-5 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleClickMetrica('sin_seguimiento')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Sin Seguimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-purple-600">{prospectosSinSeguimiento}</span>
              <XCircle className="w-5 h-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleClickMetrica('no_asistio')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">No asistió</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-red-600">{totalNoAsistio}</span>
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleClickMetrica('asistio_no_compro')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Asistió y no compró</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-blue-600">{totalAsistieronNoCompraron}</span>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleClickMetrica('no_interesa')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">No le interesa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-slate-700">{totalNoInteresa}</span>
              <Ban className="w-5 h-5 text-slate-600" />
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
                  <SelectItem value="menos_2">Menos de 2 días</SelectItem>
                  <SelectItem value="mas_2">2 días o más</SelectItem>
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
              <label className="text-sm font-medium mb-1.5 block">Origen</label>
              <Select value={filtroOrigen} onValueChange={setFiltroOrigen}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="asistio_no_compro">Asistieron y no compraron</SelectItem>
                  <SelectItem value="no_asistio">No asistieron</SelectItem>
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

      {(() => {
        const renderTabla = (items) => (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prospecto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días en NPS</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seguimiento</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sede</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                      No hay prospectos que coincidan con los filtros
                    </td>
                  </tr>
                ) : (
                  items.map((prospecto) => {
                    const vendedor = staff.find((s) => s.id === prospecto.vendedor_asignado);
                    const sede = sucursales.find((s) => s.id === prospecto.sede);
                    const { dias: diasEnNPS } = calcularTiempoEnNPS(prospecto);
                    const seguimiento = seguimientos.find((s) => s.prospecto_id === prospecto.id);
                    const isFocused = focusProspectoId && prospecto.id === focusProspectoId;

                    return (
                      <tr
                        key={prospecto.id}
                        id={isFocused ? `prospecto-${prospecto.id}` : undefined}
                        className={
                          isFocused
                            ? 'bg-blue-50 ring-1 ring-blue-200'
                            : 'hover:bg-gray-50'
                        }
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="font-medium text-sm">{prospecto.nombre}</p>
                              <p className="text-xs text-gray-500">{prospecto.estado_pipeline}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Phone className="w-3 h-3" />
                              {prospecto.whatsapp || 'N/A'}
                            </div>
                            {prospecto.correo && (
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <Mail className="w-3 h-3" />
                                {prospecto.correo}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={`${
                              diasEnNPS >= 2
                                ? 'bg-red-100 text-red-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {formatTiempoEnNPS(prospecto)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {seguimiento?.fue_contactado ? (
                            <div className="space-y-1">
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Contactado
                              </Badge>
                              <p className="text-xs text-gray-500">
                                {seguimiento.resultado_seguimiento}
                              </p>
                              {seguimiento.fecha_proximo_seguimiento && (
                                <div className="flex items-center gap-1 text-xs text-green-700">
                                  <Calendar className="w-3 h-3" />
                                  {moment(seguimiento.fecha_proximo_seguimiento).format('DD/MM/YYYY')}
                                </div>
                              )}
                            </div>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-600">Pendiente</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">{vendedor?.nombre || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm">
                            <Building2 className="w-3 h-3 text-gray-400" />
                            {sede?.nombre_sede || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => {
                                setProspectoSeleccionado(prospecto);
                                setDialogSeguimiento(true);
                                if (seguimiento) {
                                  setDetalleSeguimiento(seguimiento.detalle_seguimiento || '');
                                  setResultadoSeguimiento(
                                    seguimiento.resultado_seguimiento || 'Contactado sin respuesta'
                                  );
                                  setFechaProximoSeguimiento(seguimiento.fecha_proximo_seguimiento || '');
                                  setNotas(seguimiento.notas || '');
                                }
                              }}
                              title="Registrar seguimiento"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => {
                                setProspectoSeleccionado(prospecto);
                                setDialogCompromiso(true);
                              }}
                              title="Indicó compromiso de compra"
                            >
                              <Target className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => {
                                setProspectoSeleccionado(prospecto);
                                setDialogNoInteresa(true);
                              }}
                              title="No le interesa"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        );

        return (
          <div className="space-y-4">
            {/* Prospectos en Seguimiento */}
            {prospectosEnSeguimiento.length > 0 && (
              <Card className="border-green-200 bg-green-50/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-green-600" />
                    Prospectos en Seguimiento
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="px-4 pb-3 text-xs text-muted-foreground">
                    {prospectosEnSeguimiento.length} prospecto(s) con seguimiento programado
                  </div>
                  {renderTabla(paginatedSeguimiento)}
                  {renderPagination(
                    currentPageSeguimiento,
                    paginateSeguimiento.totalPages,
                    paginateSeguimiento.totalItems,
                    paginateSeguimiento.startIndex,
                    paginateSeguimiento.endIndex,
                    setCurrentPageSeguimiento
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Asistieron y no compraron</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="px-4 pb-3 text-xs text-muted-foreground">
                  {prospectosAsistieronNoCompraron.length} prospecto(s)
                </div>
                {renderTabla(paginatedAsistieron)}
                {renderPagination(
                  currentPageAsistieron,
                  paginateAsistieron.totalPages,
                  paginateAsistieron.totalItems,
                  paginateAsistieron.startIndex,
                  paginateAsistieron.endIndex,
                  setCurrentPageAsistieron
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">No asistieron</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="px-4 pb-3 text-xs text-muted-foreground">
                  {prospectosNoAsistieron.length} prospecto(s)
                </div>
                {renderTabla(paginatedNoAsistieron)}
                {renderPagination(
                  currentPageNoAsistieron,
                  paginateNoAsistieron.totalPages,
                  paginateNoAsistieron.totalItems,
                  paginateNoAsistieron.startIndex,
                  paginateNoAsistieron.endIndex,
                  setCurrentPageNoAsistieron
                )}
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Dialog Indicó Compromiso */}
      {dialogCompromiso && prospectoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Indicó Compromiso de Compra</h3>
            
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <p className="text-sm font-medium text-blue-900">{prospectoSeleccionado.nombre}</p>
              <p className="text-xs text-blue-700">{prospectoSeleccionado.whatsapp}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Fecha de Seguimiento <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={fechaSeguimiento}
                  onChange={(e) => setFechaSeguimiento(e.target.value)}
                  min={moment().format('YYYY-MM-DD')}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Notas</label>
                <textarea
                  className="w-full border rounded-md p-2 text-sm"
                  rows={3}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Detalles del compromiso..."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogCompromiso(false);
                  setProspectoSeleccionado(null);
                  setFechaSeguimiento('');
                  setNotas('');
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleIndicoCompromiso}
                disabled={!fechaSeguimiento}
                className="flex-1"
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog No Interesa */}
      {dialogNoInteresa && prospectoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">No le Interesa</h3>
            
            <div className="bg-red-50 p-3 rounded-lg mb-4">
              <p className="text-sm font-medium text-red-900">{prospectoSeleccionado.nombre}</p>
              <p className="text-xs text-red-700">{prospectoSeleccionado.whatsapp}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Notas</label>
                <textarea
                  className="w-full border rounded-md p-2 text-sm"
                  rows={3}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Motivo del descarte..."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogNoInteresa(false);
                  setProspectoSeleccionado(null);
                  setNotas('');
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleNoInteresa}
                variant="destructive"
                className="flex-1"
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Registrar Seguimiento */}
      {dialogSeguimiento && prospectoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Registrar Seguimiento</h3>
            
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <p className="text-sm font-medium text-blue-900">{prospectoSeleccionado.nombre}</p>
              <p className="text-xs text-blue-700">{prospectoSeleccionado.whatsapp}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Detalle del Seguimiento <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full border rounded-md p-2 text-sm"
                  rows={4}
                  value={detalleSeguimiento}
                  onChange={(e) => setDetalleSeguimiento(e.target.value)}
                  placeholder="¿Qué se habló? ¿Cuál fue la respuesta del prospecto?"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Resultado del Seguimiento <span className="text-red-500">*</span>
                </label>
                <Select value={resultadoSeguimiento} onValueChange={setResultadoSeguimiento}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="Contactado sin respuesta">Contactado sin respuesta</SelectItem>
                    <SelectItem value="Indicó compromiso">Indicó compromiso</SelectItem>
                    <SelectItem value="No le interesa">No le interesa</SelectItem>
                    <SelectItem value="Compró">Compró</SelectItem>
                    <SelectItem value="Nueva fecha de seguimiento">Nueva fecha de seguimiento</SelectItem>
                    <SelectItem value="Reagendar">Reagendar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(resultadoSeguimiento === 'Reagendar' || resultadoSeguimiento === 'Nueva fecha de seguimiento') && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Fecha Próximo Seguimiento <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={fechaProximoSeguimiento}
                    onChange={(e) => setFechaProximoSeguimiento(e.target.value)}
                    min={moment().format('YYYY-MM-DD')}
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-1.5 block">Notas Adicionales</label>
                <textarea
                  className="w-full border rounded-md p-2 text-sm"
                  rows={2}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas adicionales..."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogSeguimiento(false);
                  setProspectoSeleccionado(null);
                  setDetalleSeguimiento('');
                  setResultadoSeguimiento('Contactado sin respuesta');
                  setFechaProximoSeguimiento('');
                  setNotas('');
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleRegistrarSeguimiento}
                disabled={!detalleSeguimiento}
                className="flex-1"
              >
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Métrica */}
      <MetricaDialog
        open={dialogMetrica}
        onOpenChange={setDialogMetrica}
        metrica={metricaSeleccionada}
        prospectos={metricaSeleccionada?.prospectos || []}
        sucursales={sucursales}
        staff={staff}
        seguimientos={seguimientos}
        agendamientos={agendamientos}
        calcularTiempoEnNPS={calcularTiempoEnNPS}
        formatTiempoEnNPS={formatTiempoEnNPS}
        onRegistrarSeguimiento={(prospecto, seguimiento) => {
          setDialogMetrica(false);
          setProspectoSeleccionado(prospecto);
          setDialogSeguimiento(true);
          if (seguimiento) {
            setDetalleSeguimiento(seguimiento.detalle_seguimiento || '');
            setResultadoSeguimiento(seguimiento.resultado_seguimiento || 'Contactado sin respuesta');
            setFechaProximoSeguimiento(seguimiento.fecha_proximo_seguimiento || '');
            setNotas(seguimiento.notas || '');
          }
        }}
        onIndicoCompromiso={(prospecto) => {
          setDialogMetrica(false);
          setProspectoSeleccionado(prospecto);
          setDialogCompromiso(true);
        }}
        onNoInteresa={(prospecto) => {
          setDialogMetrica(false);
          setProspectoSeleccionado(prospecto);
          setDialogNoInteresa(true);
        }}
      />
    </div>
  );
}