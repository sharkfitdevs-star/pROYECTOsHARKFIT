import React, { useEffect, useMemo, useState } from 'react';
import { Users, Clock, AlertTriangle, Building2, User, Phone, Mail, XCircle, MessageSquare, Target, PhoneCall, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Prospectos } from '@/entities/Prospectos';
import { Sucursales } from '@/entities/Sucursales';
import { Staff } from '@/entities/Staff';
import { Agendamientos } from '@/entities/Agendamientos';
import { Ventas } from '@/entities/Ventas';
import { Planes_Servicios } from '@/entities/Planes_Servicios';
import { Seguimiento_NPS } from '@/entities/Seguimiento_NPS';
import UserEntity from '@/entities/User';
import moment from 'moment';
import 'moment/locale/es';

moment.locale('es');

const ITEMS_PER_PAGE = 25;

export default function NPSCruzados() {
  const [prospectos, setProspectos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [staff, setStaff] = useState([]);
  const [agendamientos, setAgendamientos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [seguimientos, setSeguimientos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroSede, setFiltroSede] = useState('todas');
  const [filtroVendedor, setFiltroVendedor] = useState('todos');
  const [filtroDias, setFiltroDias] = useState('todos');
  const [filtroOrigen, setFiltroOrigen] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  // Pagination states for each table
  const [currentPageAsistieron, setCurrentPageAsistieron] = useState(1);
  const [currentPageNoAsistieron, setCurrentPageNoAsistieron] = useState(1);

  // Dialogs
  const [dialogCompromiso, setDialogCompromiso] = useState(false);
  const [dialogNoInteresa, setDialogNoInteresa] = useState(false);
  const [dialogSeguimiento, setDialogSeguimiento] = useState(false);
  const [dialogLlamada, setDialogLlamada] = useState(false);
  const [prospectoSeleccionado, setProspectoSeleccionado] = useState(null);
  const [fechaSeguimiento, setFechaSeguimiento] = useState('');
  const [notas, setNotas] = useState('');
  
  // Seguimiento form
  const [detalleSeguimiento, setDetalleSeguimiento] = useState('');
  const [resultadoSeguimiento, setResultadoSeguimiento] = useState('Contactado sin respuesta');
  const [fechaProximoSeguimiento, setFechaProximoSeguimiento] = useState('');

  // Llamada form
  const [resultadoLlamada, setResultadoLlamada] = useState('Contestó');

  useEffect(() => {
    cargarDatos();
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPageAsistieron(1);
    setCurrentPageNoAsistieron(1);
  }, [filtroSede, filtroVendedor, filtroDias, filtroOrigen, busqueda]);

  const cargarDatos = async () => {
    setLoading(true);
    const [prospectosData, sucursalesData, staffData, agendamientosData, ventasData, planesData, seguimientosData] =
      await Promise.all([
        Prospectos.list('-updatedAt'),
        Sucursales.list('nombre_sede'),
        Staff.list('nombre'),
        Agendamientos.list('-fecha_hora'),
        Ventas.list('-fecha_venta'),
        Planes_Servicios.list('nombre_plan'),
        Seguimiento_NPS.list('-createdAt')
      ]);

    // Base: prospectos actualmente en NPS Online (de aquí se deriva la lista de cruzados)
    const prospectosNPSOnline = (prospectosData || []).filter((p) => p.estado_pipeline === 'NPS Online');

    setProspectos(prospectosNPSOnline);
    setSucursales(sucursalesData || []);
    setStaff(staffData || []);
    setAgendamientos(agendamientosData || []);
    setVentas(ventasData || []);
    setPlanes(planesData || []);
    setSeguimientos(seguimientosData || []);
    setLoading(false);
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
      if (noAsistio(pid)) return 'no_asistio';
      if (tuvoAsistencia(pid) && !tieneCompraPlanPrograma(pid)) return 'asistio_no_compro';
      return 'otros';
    };

    return { tieneCompraPlanPrograma, origenProspecto };
  }, [agendamientos, planes, ventas]);

  const calcularDiasEnNPSOnline = (prospecto) => {
    const fechaIngreso = prospecto?.fecha_ingreso_nps
      ? moment(prospecto.fecha_ingreso_nps)
      : moment(prospecto?.updatedAt);
    const ahora = moment();
    const diffHorasTotal = Math.max(0, ahora.diff(fechaIngreso, 'hours'));
    return Math.floor(diffHorasTotal / 24);
  };

  // Base: debe llevar +2 días en NPS Online y NO tener compra de Plan/Programa
  const baseCruzados = useMemo(() => {
    return (prospectos || []).filter((p) => {
      const dias = calcularDiasEnNPSOnline(p);
      if (dias < 2) return false;
      if (helpers.tieneCompraPlanPrograma(p.id)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospectos, helpers]);

  // Filtros UI
  const prospectosFiltrados = useMemo(() => {
    return baseCruzados.filter((prospecto) => {
      if (filtroSede !== 'todas' && prospecto.sede !== filtroSede) return false;
      if (filtroVendedor !== 'todos' && prospecto.vendedor_asignado !== filtroVendedor) return false;

      const dias = calcularDiasEnNPSOnline(prospecto);
      if (filtroDias === '2_5' && (dias < 2 || dias > 5)) return false;
      if (filtroDias === '6_10' && (dias < 6 || dias > 10)) return false;
      if (filtroDias === 'mas_10' && dias <= 10) return false;

      const origen = helpers.origenProspecto(prospecto);
      if (filtroOrigen === 'no_asistio' && origen !== 'no_asistio') return false;
      if (filtroOrigen === 'asistio_no_compro' && origen !== 'asistio_no_compro') return false;

      if (busqueda) {
        const searchLower = busqueda.toLowerCase();
        const nombreMatch = prospecto.nombre?.toLowerCase().includes(searchLower);
        const whatsappMatch = prospecto.whatsapp?.includes(busqueda);
        if (!nombreMatch && !whatsappMatch) return false;
      }

      return true;
    });
  }, [baseCruzados, busqueda, filtroDias, filtroOrigen, filtroSede, filtroVendedor, helpers]);

  const prospectosNoAsistio = useMemo(
    () => prospectosFiltrados.filter((p) => helpers.origenProspecto(p) === 'no_asistio'),
    [helpers, prospectosFiltrados]
  );

  const prospectosAsistioNoCompro = useMemo(
    () => prospectosFiltrados.filter((p) => helpers.origenProspecto(p) === 'asistio_no_compro'),
    [helpers, prospectosFiltrados]
  );

  // Métricas
  const totalProspectos = prospectosFiltrados.length;
  const totalNoAsistio = prospectosNoAsistio.length;
  const totalAsistioNoCompro = prospectosAsistioNoCompro.length;

  const diasPromedio = totalProspectos
    ? (
        prospectosFiltrados.reduce((sum, p) => sum + calcularDiasEnNPSOnline(p), 0) / totalProspectos
      ).toFixed(1)
    : 0;

  const masAntiguos = prospectosFiltrados.filter((p) => calcularDiasEnNPSOnline(p) > 10).length;

  // Pagination calculations for each table
  const paginateAsistieron = {
    totalItems: prospectosAsistioNoCompro.length,
    totalPages: Math.ceil(prospectosAsistioNoCompro.length / ITEMS_PER_PAGE),
    startIndex: (currentPageAsistieron - 1) * ITEMS_PER_PAGE,
    endIndex: currentPageAsistieron * ITEMS_PER_PAGE,
  };
  const paginatedAsistieron = prospectosAsistioNoCompro.slice(paginateAsistieron.startIndex, paginateAsistieron.endIndex);

  const paginateNoAsistieron = {
    totalItems: prospectosNoAsistio.length,
    totalPages: Math.ceil(prospectosNoAsistio.length / ITEMS_PER_PAGE),
    startIndex: (currentPageNoAsistieron - 1) * ITEMS_PER_PAGE,
    endIndex: currentPageNoAsistieron * ITEMS_PER_PAGE,
  };
  const paginatedNoAsistieron = prospectosNoAsistio.slice(paginateNoAsistieron.startIndex, paginateNoAsistieron.endIndex);

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

  // Handlers para acciones
  const handleIndicoCompromiso = async () => {
    if (!fechaSeguimiento) {
      alert('Por favor selecciona una fecha de seguimiento');
      return;
    }

    setLoading(true);
    try {
      await Prospectos.update(prospectoSeleccionado.id, {
        estado_pipeline: 'Compromiso de compra',
        notas: notas ? `${prospectoSeleccionado.notas || ''}\\n[${moment().format('DD/MM/YYYY HH:mm')}] Indicó compromiso desde NPS Cruzados: ${notas}` : prospectoSeleccionado.notas
      });

      await Agendamientos.create({
        prospecto_id: prospectoSeleccionado.id,
        prospecto_nombre: prospectoSeleccionado.nombre,
        sede: prospectoSeleccionado.sede,
        fecha_hora: `${fechaSeguimiento}T10:00:00`,
        tipo_visita: 'Promesa de compra',
        resultado_asistencia: 'Pendiente',
        notas: notas || 'Seguimiento desde NPS Cruzados'
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
        notas: notas ? `${prospectoSeleccionado.notas || ''}\\n[${moment().format('DD/MM/YYYY HH:mm')}] Descartado desde NPS Cruzados: ${notas}` : prospectoSeleccionado.notas
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
        await Seguimiento_NPS.update(seguimientoExistente.id, seguimientoData);
      } else {
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

  const handleRegistrarLlamada = async () => {
    setLoading(true);
    try {
      const user = await UserEntity.me();
      const staffActual = staff.find(s => s.email === user.email);

      const seguimientoExistente = seguimientos.find(s => s.prospecto_id === prospectoSeleccionado.id);

      const detalle = `Llamada realizada: ${resultadoLlamada}${notas ? `. ${notas}` : ''}`;

      const seguimientoData = {
        fue_contactado: resultadoLlamada === 'Contestó',
        fecha_contacto: new Date().toISOString(),
        responsable_seguimiento: staffActual?.id,
        detalle_seguimiento: detalle,
        resultado_seguimiento: resultadoLlamada === 'Contestó' ? 'Contactado sin respuesta' : 'No contesta',
        notas: notas
      };

      if (seguimientoExistente) {
        await Seguimiento_NPS.update(seguimientoExistente.id, seguimientoData);
      } else {
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

      alert('Llamada registrada exitosamente');
      setDialogLlamada(false);
      setProspectoSeleccionado(null);
      setResultadoLlamada('Contestó');
      setNotas('');
      await cargarDatos();
    } catch (error) {
      console.error('Error registrando llamada:', error);
      alert('Error al registrar llamada');
    } finally {
      setLoading(false);
    }
  };

  const renderTabla = (items) => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prospecto</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días en NPS</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedor</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sede</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.length === 0 ? (
            <tr>
              <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                No hay prospectos que coincidan con los filtros
              </td>
            </tr>
          ) : (
            items.map((prospecto) => {
              const vendedor = staff.find((s) => s.id === prospecto.vendedor_asignado);
              const sede = sucursales.find((s) => s.id === prospecto.sede);
              const diasEnNPS = calcularDiasEnNPSOnline(prospecto);

              return (
                <tr key={prospecto.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-sm">{prospecto.nombre}</p>
                        <p className="text-xs text-gray-500">NPS Online</p>
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
                        diasEnNPS > 10
                          ? 'bg-red-100 text-red-800'
                          : diasEnNPS > 5
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {diasEnNPS} {diasEnNPS === 1 ? 'día' : 'días'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">{vendedor?.nombre || 'N/A'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm">
                      <Building2 className="w-3 h-3 text-gray-400" />
                      {sede?.nombre_sede || 'N/A'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => {
                          setProspectoSeleccionado(prospecto);
                          setDialogSeguimiento(true);
                          const seguimiento = seguimientos.find(s => s.prospecto_id === prospecto.id);
                          if (seguimiento) {
                            setDetalleSeguimiento(seguimiento.detalle_seguimiento || '');
                            setResultadoSeguimiento(seguimiento.resultado_seguimiento || 'Contactado sin respuesta');
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
                        variant="ghost"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
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
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setProspectoSeleccionado(prospecto);
                          setDialogNoInteresa(true);
                        }}
                        title="No le interesa"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                        onClick={() => {
                          setProspectoSeleccionado(prospecto);
                          setDialogLlamada(true);
                        }}
                        title="Registrar llamada"
                      >
                        <PhoneCall className="w-4 h-4" />
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando prospectos NPS Cruzados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">NPS Cruzados</h1>
        <p className="text-sm text-gray-600 mt-1">
          Prospectos con +2 días en NPS Online, sin compra de Plan/Programa
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{totalProspectos}</span>
              <Users className="w-5 h-5 text-blue-600" />
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">+10 Días</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-red-600">{masAntiguos}</span>
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Asistió y no compró</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-blue-600">{totalAsistioNoCompro}</span>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Días en NPS</label>
              <Select value={filtroDias} onValueChange={setFiltroDias}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="2_5">2-5 días</SelectItem>
                  <SelectItem value="6_10">6-10 días</SelectItem>
                  <SelectItem value="mas_10">Más de 10 días</SelectItem>
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
                  {sucursales.map((sede) => (
                    <SelectItem key={sede.id} value={sede.id}>
                      {sede.nombre_sede}
                    </SelectItem>
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
                  {staff
                    .filter((s) => s.roles?.includes('vendedor'))
                    .map((vendedor) => (
                      <SelectItem key={vendedor.id} value={vendedor.id}>
                        {vendedor.nombre}
                      </SelectItem>
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
                  <SelectItem value="no_asistio">No asistió</SelectItem>
                  <SelectItem value="asistio_no_compro">Asistió y no compró</SelectItem>
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

      {/* Secciones */}
      <div className="space-y-4">
        {(filtroOrigen === 'todos' || filtroOrigen === 'asistio_no_compro') && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Asistieron y no compraron</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="px-4 pb-3 text-xs text-muted-foreground">
                {prospectosAsistioNoCompro.length} prospecto(s)
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
        )}

        {(filtroOrigen === 'todos' || filtroOrigen === 'no_asistio') && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">No asistieron</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="px-4 pb-3 text-xs text-muted-foreground">
                {prospectosNoAsistio.length} prospecto(s)
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
        )}
      </div>

      {/* Dialog Indicó Compromiso */}
      {dialogCompromiso && prospectoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                  <SelectContent>
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

      {/* Dialog Registrar Llamada */}
      {dialogLlamada && prospectoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Registrar Llamada</h3>
            
            <div className="bg-purple-50 p-3 rounded-lg mb-4">
              <p className="text-sm font-medium text-purple-900">{prospectoSeleccionado.nombre}</p>
              <p className="text-xs text-purple-700">{prospectoSeleccionado.whatsapp}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Resultado de la Llamada <span className="text-red-500">*</span>
                </label>
                <Select value={resultadoLlamada} onValueChange={setResultadoLlamada}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Contestó">Contestó</SelectItem>
                    <SelectItem value="No contestó">No contestó</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Notas</label>
                <textarea
                  className="w-full border rounded-md p-2 text-sm"
                  rows={3}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Detalles de la llamada..."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogLlamada(false);
                  setProspectoSeleccionado(null);
                  setResultadoLlamada('Contestó');
                  setNotas('');
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleRegistrarLlamada}
                className="flex-1"
              >
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}