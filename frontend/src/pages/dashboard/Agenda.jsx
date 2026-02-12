import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Agendamientos } from '@/entities/Agendamientos';
import { Prospectos } from '@/entities/Prospectos';
import { Clientes } from '@/entities/Clientes';
import { Sucursales } from '@/entities/Sucursales';
import { Staff } from '@/entities/Staff';
import { Ventas } from '@/entities/Ventas';
import { Clases } from '@/entities/Clases';
import { Cerradores } from '@/entities/Cerradores';
import { sincronizarClienteDesdeVenta } from '@/components/SyncClientesHelper';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Calendar as CalendarIcon, Filter, Trash2, Edit, DollarSign, Ban, MoreVertical, Plus, UserCheck, Info, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import EditAgendamientoDialog from '@/components/EditAgendamientoDialog';
import ReagendarDialog from '@/components/ReagendarDialog';
import RegistrarVentaDialog from '@/components/RegistrarVentaDialog';
import NoComproDialog from '@/components/NoComproDialog';
import AccionesAgendamientoMenu from '@/components/AccionesAgendamientoMenu';
import CompromisoCompraDialog from '@/components/CompromisoCompraDialog';
import NoInteresadoDialog from '@/components/NoInteresadoDialog';
import DetallesAgendamientoDialog from '@/components/DetallesAgendamientoDialog';
import AsignarCerradorDialog from '@/components/AsignarCerradorDialog';
import EditarEstadoDialog from '@/components/EditarEstadoDialog';
import CrearAgendamientoDialog from '@/components/CrearAgendamientoDialog';

const ITEMS_PER_PAGE = 25;

export default function Agenda() {
  const navigate = useNavigate();

  const [agendamientos, setAgendamientos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [staff, setStaff] = useState([]);
  const [prospectos, setProspectos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clases, setClases] = useState([]);
  const [cerradores, setCerradores] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSede, setSelectedSede] = useState('all');
  const [fechaInicio, setFechaInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [fechaFin, setFechaFin] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [horaInicio, setHoraInicio] = useState('00:00');
  const [horaFin, setHoraFin] = useState('23:59');
  const [todoElDia, setTodoElDia] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estados temporales para los filtros (antes de aplicar)
  const [tempSelectedSede, setTempSelectedSede] = useState('all');
  const [tempFechaInicio, setTempFechaInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [tempFechaFin, setTempFechaFin] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [tempHoraInicio, setTempHoraInicio] = useState('00:00');
  const [tempHoraFin, setTempHoraFin] = useState('23:59');
  const [tempTodoElDia, setTempTodoElDia] = useState(true);
  const [tempSearchQuery, setTempSearchQuery] = useState('');
  
  // Estados para dialogs
  const [crearDialogOpen, setCrearDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [reagendarDialogOpen, setReagendarDialogOpen] = useState(false);
  const [ventaDialogOpen, setVentaDialogOpen] = useState(false);
  const [noComproDialogOpen, setNoComproDialogOpen] = useState(false);
  const [compromisoDialogOpen, setCompromisoDialogOpen] = useState(false);
  const [noInteresadoDialogOpen, setNoInteresadoDialogOpen] = useState(false);
  const [noInteresadoTipo, setNoInteresadoTipo] = useState('no_interesado');
  const [detallesDialogOpen, setDetallesDialogOpen] = useState(false);
  const [asignarCerradorDialogOpen, setAsignarCerradorDialogOpen] = useState(false);
  const [editarEstadoDialogOpen, setEditarEstadoDialogOpen] = useState(false);
  const [selectedAgendamiento, setSelectedAgendamiento] = useState(null);

  useEffect(() => {
    loadCatalogos();
  }, []);

  useEffect(() => {
    fetchAgendamientos();
  }, [selectedSede, fechaInicio, fechaFin, horaInicio, horaFin, todoElDia, searchQuery]);

  const loadCatalogos = async () => {
    try {
      const [sucursalesData, staffData, prospectosData, clientesData, clasesData, cerradoresData, ventasData] = await Promise.all([
        Sucursales.list(),
        Staff.list(),
        Prospectos.list(),
        Clientes.list(),
        Clases.list(),
        Cerradores.list(),
        Ventas.list()
      ]);
      setSucursales(sucursalesData?.filter(s => s.activa) || []);
      // Cargar TODO el staff (activos e inactivos) para poder mostrar nombres de vendedores históricos
      setStaff(staffData || []);
      setProspectos(prospectosData || []);
      setClientes(clientesData || []);
      setClases(clasesData || []);
      setCerradores(cerradoresData || []);
      setVentas(ventasData || []);
    } catch (error) {
      console.error('Error cargando catálogos:', error);
    }
  };

  const fetchAgendamientos = async () => {
    setLoading(true);
    try {
      let result = await Agendamientos.list('-fecha_hora');
      
      // Filtrar por periodo (rango de fechas)
      if (fechaInicio && fechaFin) {
        const inicio = new Date(fechaInicio + 'T00:00:00');
        const fin = new Date(fechaFin + 'T23:59:59');
        result = result.filter(a => {
          const fechaAgenda = new Date(a.fecha_hora);
          return fechaAgenda >= inicio && fechaAgenda <= fin;
        });
      }

      // Filtrar por sede
      if (selectedSede && selectedSede !== 'all') {
        result = result.filter(a => a.sede === selectedSede);
      }

      // Filtrar por rango horario personalizado
      if (!todoElDia && horaInicio && horaFin) {
        result = result.filter(a => {
          const fechaAgenda = new Date(a.fecha_hora);
          const horaAgenda = format(fechaAgenda, 'HH:mm');
          return horaAgenda >= horaInicio && horaAgenda <= horaFin;
        });
      }

      // Filtrar por búsqueda (nombre o WhatsApp)
      if (searchQuery && searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        result = result.filter(a => {
          const prospecto = prospectos.find(p => p.id === a.prospecto_id);
          const nombre = (a.prospecto_nombre || '').toLowerCase();
          const whatsapp = (prospecto?.whatsapp || '').toLowerCase();
          const correo = (prospecto?.correo || '').toLowerCase();
          
          return nombre.includes(query) || whatsapp.includes(query) || correo.includes(query);
        });
      }

      setAgendamientos(result);
    } catch (error) {
      console.error('Error fetching agendamientos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAplicarFiltros = () => {
    setSelectedSede(tempSelectedSede);
    setFechaInicio(tempFechaInicio);
    setFechaFin(tempFechaFin);
    setHoraInicio(tempHoraInicio);
    setHoraFin(tempHoraFin);
    setTodoElDia(tempTodoElDia);
    setSearchQuery(tempSearchQuery);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const applyQuickRange = (range) => {
    const today = new Date();

    let start;
    let end;

    if (range === 'hoy') {
      start = startOfDay(today);
      end = endOfDay(today);
    } else if (range === 'ayer') {
      const y = subDays(today, 1);
      start = startOfDay(y);
      end = endOfDay(y);
    } else if (range === 'semana') {
      start = startOfWeek(today, { weekStartsOn: 1 });
      end = endOfWeek(today, { weekStartsOn: 1 });
    } else {
      // mes
      start = startOfMonth(today);
      end = endOfMonth(today);
    }

    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');

    // Aplicar y mantener filtros actuales (sede/búsqueda/horario)
    setTempFechaInicio(startStr);
    setTempFechaFin(endStr);

    setFechaInicio(startStr);
    setFechaFin(endStr);
    setCurrentPage(1); // Reset to first page when date range changes
  };

  const handleMarcarAsistencia = async (agendamiento, resultado) => {
    setLoading(true);
    try {
      await Agendamientos.update(agendamiento.id, {
        resultado_asistencia: resultado
      });

      // Actualizar estado del prospecto
      let nuevoEstado = '';
      if (resultado === 'Asistió') {
        nuevoEstado = 'Asistió';
      } else if (resultado === 'No asistió') {
        nuevoEstado = 'No asistió';
      } else if (resultado === 'Reagendado') {
        nuevoEstado = 'Reagendado';
      }

      if (nuevoEstado && agendamiento.prospecto_id) {
        await Prospectos.update(agendamiento.prospecto_id, {
          estado_pipeline: nuevoEstado
        });
      }

      await fetchAgendamientos();
    } catch (error) {
      console.error('Error updating asistencia:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAgendamiento = async (agendamientoId) => {
    if (!confirm('¿Estás seguro de eliminar este agendamiento?')) return;
    setLoading(true);
    try {
      await Agendamientos.delete(agendamientoId);
      await fetchAgendamientos();
    } catch (error) {
      console.error('Error deleting agendamiento:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handlers para dialogs
  const handleEditAgendamiento = (agendamiento) => {
    setSelectedAgendamiento(agendamiento);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async (data) => {
    setLoading(true);
    try {
      await Agendamientos.update(selectedAgendamiento.id, data);
      await fetchAgendamientos();
      setEditDialogOpen(false);
      setSelectedAgendamiento(null);
    } catch (error) {
      console.error('Error updating agendamiento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReagendar = (agendamiento) => {
    setSelectedAgendamiento(agendamiento);
    setReagendarDialogOpen(true);
  };

  const handleSaveReagendar = async (data) => {
    setLoading(true);
    try {
      // Marcar el agendamiento actual como reagendado
      await Agendamientos.update(selectedAgendamiento.id, {
        resultado_asistencia: 'Reagendado',
        notas: data.notas
      });

      // Crear nuevo agendamiento
      await Agendamientos.create({
        prospecto_id: selectedAgendamiento.prospecto_id,
        prospecto_nombre: selectedAgendamiento.prospecto_nombre,
        sede: selectedAgendamiento.sede,
        fecha_hora: data.fecha_hora,
        tipo_visita: selectedAgendamiento.tipo_visita,
        resultado_asistencia: 'Pendiente',
        registrado_por: selectedAgendamiento.registrado_por,
        notas: data.notas
      });

      // Actualizar estado del prospecto
      if (selectedAgendamiento.prospecto_id) {
        await Prospectos.update(selectedAgendamiento.prospecto_id, {
          estado_pipeline: 'Reagendado',
          fecha_visita: data.fecha_hora.split('T')[0]
        });
      }

      await fetchAgendamientos();
      setReagendarDialogOpen(false);
      setSelectedAgendamiento(null);
    } catch (error) {
      console.error('Error reagendando:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarVenta = (agendamiento) => {
    setSelectedAgendamiento(agendamiento);
    setVentaDialogOpen(true);
  };

  const handleSaveVenta = async (data) => {
    setLoading(true);
    try {
      const prospecto = prospectos.find(p => p.id === selectedAgendamiento.prospecto_id);
      
      // Crear venta
      const venta = await Ventas.create({
        prospecto_id: selectedAgendamiento.prospecto_id,
        prospecto_nombre: selectedAgendamiento.prospecto_nombre,
        tipo_venta: data.tipo_venta,
        fecha_venta: data.fecha_venta,
        vendedor: prospecto?.vendedor_asignado,
        cerrador: data.cerrador,
        sede: selectedAgendamiento.sede,
        monto: data.monto,
        plan: data.plan,
        descuento: data.descuento,
        estado: 'Cerrada',
        notas: data.notas
      });

      // Actualizar estado del prospecto según tipo de venta
      let nuevoEstado = '';
      if (data.tipo_venta === 'Solo Inscripción') {
        nuevoEstado = 'Inscripción';
      } else if (data.tipo_venta === 'Online') {
        nuevoEstado = 'Compró (online)';
      } else {
        nuevoEstado = 'Compró (en sede)';
      }
      
      await Prospectos.update(selectedAgendamiento.prospecto_id, {
        estado_pipeline: nuevoEstado
      });

      // Marcar agendamiento como "ya_gestionado" (solo para cambiar el botón visualmente)
      await Agendamientos.update(selectedAgendamiento.id, {
        ya_gestionado: true
      });

      // Sincronizar con Clientes y Ciclos_Retencion
      try {
        await sincronizarClienteDesdeVenta(venta, prospecto);
      } catch (syncError) {
        console.error('Error sincronizando cliente:', syncError);
        // No bloqueamos el flujo si falla la sincronización
      }

      await fetchAgendamientos();
      setVentaDialogOpen(false);
      setSelectedAgendamiento(null);
    } catch (error) {
      console.error('Error registrando venta:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNoCompro = (agendamiento) => {
    setSelectedAgendamiento(agendamiento);
    setNoComproDialogOpen(true);
  };

  const handleSaveNoCompro = async (data) => {
    setLoading(true);
    try {
      // Actualizar estado del prospecto
      const updateProspecto = {
        estado_pipeline: data.razon,
        notas: data.notas
      };

      // Si pasa a NPS Online ("No compró"), establecer fecha_ingreso_nps (solo si no existe)
      if (data.razon === 'No compró') {
        const prospecto = prospectos.find(p => p.id === selectedAgendamiento.prospecto_id);
        if (!prospecto?.fecha_ingreso_nps) {
          updateProspecto.fecha_ingreso_nps = new Date().toISOString();
        }
      }

      await Prospectos.update(selectedAgendamiento.prospecto_id, updateProspecto);

      // Marcar agendamiento como "ya_gestionado" (solo para cambiar el botón visualmente)
      await Agendamientos.update(selectedAgendamiento.id, {
        ya_gestionado: true
      });

      await fetchAgendamientos();
      setNoComproDialogOpen(false);

      // Mantenerse en Agenda con los filtros actuales
      setSelectedAgendamiento(null);
    } catch (error) {
      console.error('Error marcando no compró:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompromisoCompra = (agendamiento) => {
    setSelectedAgendamiento(agendamiento);
    setCompromisoDialogOpen(true);
  };





  const handleSaveCompromiso = async (data) => {
    setLoading(true);
    try {
      // Marcar el agendamiento como "ya_gestionado" después de registrar compromiso
      await Agendamientos.update(selectedAgendamiento.id, {
        tipo_visita: 'Promesa de compra',
        ya_gestionado: true,
        notas: data.notas
      });

      // Actualizar estado del prospecto a "Compromiso de compra" con la fecha del compromiso
      if (selectedAgendamiento.prospecto_id) {
        // Extraer solo la fecha (sin hora) del datetime-local
        const fechaCompromiso = data.fecha_hora.split('T')[0];
        
        await Prospectos.update(selectedAgendamiento.prospecto_id, {
          estado_pipeline: 'Compromiso de compra',
          fecha_compromiso: fechaCompromiso, // Usar la fecha indicada por el usuario
          notas: data.notas
        });
      }

      await fetchAgendamientos();
      setCompromisoDialogOpen(false);
      setSelectedAgendamiento(null);
    } catch (error) {
      console.error('Error guardando compromiso:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNoInteresado = (agendamiento) => {
    setSelectedAgendamiento(agendamiento);
    setNoInteresadoTipo('no_interesado');
    setNoInteresadoDialogOpen(true);
  };

  const handleNoContesta = (agendamiento) => {
    setSelectedAgendamiento(agendamiento);
    setNoInteresadoTipo('no_contesta');
    setNoInteresadoDialogOpen(true);
  };

  const handleSaveNoInteresado = async (data) => {
    setLoading(true);
    try {
      // Actualizar agendamiento
      await Agendamientos.update(selectedAgendamiento.id, {
        resultado_asistencia: data.tipo === 'no_interesado' ? 'No asistió' : 'No contesta',
        notas: `${data.razon}${data.notas ? ': ' + data.notas : ''}`
      });

      // Actualizar estado del prospecto
      const nuevoEstado = data.tipo === 'no_interesado' ? 'Perdido' : 'No contesta';
      await Prospectos.update(selectedAgendamiento.prospecto_id, {
        estado_pipeline: nuevoEstado,
        notas: `${data.razon}${data.notas ? ': ' + data.notas : ''}`
      });

      await fetchAgendamientos();
      setNoInteresadoDialogOpen(false);
      setSelectedAgendamiento(null);
    } catch (error) {
      console.error('Error guardando:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAsignarCerrador = (agendamiento) => {
    setSelectedAgendamiento(agendamiento);
    setAsignarCerradorDialogOpen(true);
  };

  const handleSaveAsignarCerrador = async (data) => {
    setLoading(true);
    try {
      await Agendamientos.update(selectedAgendamiento.id, {
        cerrador_asignado: data.cerrador_asignado
      });

      await fetchAgendamientos();
      setAsignarCerradorDialogOpen(false);
      setSelectedAgendamiento(null);
    } catch (error) {
      console.error('Error asignando cerrador:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalles = (agendamiento) => {
    setSelectedAgendamiento(agendamiento);
    setDetallesDialogOpen(true);
  };

  const handleEditarEstado = (agendamiento) => {
    setSelectedAgendamiento(agendamiento);
    setEditarEstadoDialogOpen(true);
  };

  const handleSaveEditarEstado = async (data) => {
    setLoading(true);
    try {
      await Agendamientos.update(selectedAgendamiento.id, {
        resultado_asistencia: data.resultado_asistencia
      });

      // Actualizar estado del prospecto
      let nuevoEstado = '';
      if (data.resultado_asistencia === 'Asistió') {
        nuevoEstado = 'Asistió';
      } else if (data.resultado_asistencia === 'No asistió') {
        nuevoEstado = 'NPS Online'; // Mover automáticamente a NPS Online
      } else if (data.resultado_asistencia === 'Reagendado') {
        nuevoEstado = 'Reagendado';
      }

      if (nuevoEstado && selectedAgendamiento.prospecto_id) {
        const updateData = {
          estado_pipeline: nuevoEstado
        };

        // Si es "No asistió", establecer fecha_ingreso_nps (solo si no existe)
        if (data.resultado_asistencia === 'No asistió') {
          const prospecto = prospectos.find(p => p.id === selectedAgendamiento.prospecto_id);
          if (!prospecto?.fecha_ingreso_nps) {
            updateData.fecha_ingreso_nps = new Date().toISOString();
          }
        }

        await Prospectos.update(selectedAgendamiento.prospecto_id, updateData);

        // Si es "No asistió", crear registro de seguimiento NPS
        if (data.resultado_asistencia === 'No asistió') {
          const prospecto = prospectos.find(p => p.id === selectedAgendamiento.prospecto_id);
          if (prospecto) {
            const { Seguimiento_NPS } = await import('@/entities/Seguimiento_NPS');
            
            // Verificar si ya existe un registro de seguimiento para este prospecto
            const seguimientosExistentes = await Seguimiento_NPS.filter({ prospecto_id: prospecto.id });
            
            if (seguimientosExistentes.length === 0) {
              await Seguimiento_NPS.create({
                prospecto_id: prospecto.id,
                prospecto_nombre: prospecto.nombre,
                prospecto_whatsapp: prospecto.whatsapp,
                fecha_ingreso_nps: new Date().toISOString(),
                sede: prospecto.sede,
                vendedor_asignado: prospecto.vendedor_asignado,
                fue_contactado: false,
                resultado_seguimiento: 'Pendiente'
              });
            }
          }
        }
      }

      await fetchAgendamientos();
      setEditarEstadoDialogOpen(false);

      // Mantenerse en Agenda con los filtros actuales
      setSelectedAgendamiento(null);
    } catch (error) {
      console.error('Error actualizando estado:', error);
    } finally {
      setLoading(false);
    }
  };

  const getResultadoBadgeColor = (resultado) => {
    const colors = {
      'Pendiente': 'bg-yellow-100 text-yellow-800',
      'Asistió': 'bg-green-100 text-green-800',
      'No asistió': 'bg-red-100 text-red-800',
      'Reagendado': 'bg-blue-100 text-blue-800',
      'Gestionado': 'bg-purple-100 text-purple-800',
      'Compromiso de compra': 'bg-indigo-100 text-indigo-800',
      'No contesta': 'bg-gray-100 text-gray-800'
    };
    return colors[resultado] || 'bg-gray-100 text-gray-800';
  };

  const getConfirmacionBadgeColor = (estadoConfirmacion) => {
    const colors = {
      'Confirmó': 'bg-green-100 text-green-800',
      'No confirmó': 'bg-orange-100 text-orange-800',
      'Pendiente': 'bg-slate-100 text-slate-800'
    };
    return colors[estadoConfirmacion] || 'bg-slate-100 text-slate-800';
  };

  // Verificar si un agendamiento tiene venta asociada
  const tieneVentaAsociada = (agendamiento) => {
    if (!agendamiento.prospecto_id) return false;
    return ventas.some(v => v.prospecto_id === agendamiento.prospecto_id);
  };

  // Pagination calculations
  const totalItems = agendamientos.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedAgendamientos = agendamientos.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll to top of the list
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const agruparPorSede = () => {
    const grupos = {};
    paginatedAgendamientos.forEach(agenda => {
      const sede = sucursales.find(s => s.id === agenda.sede);
      const sedeNombre = sede?.nombre_sede || agenda.sede;
      if (!grupos[sedeNombre]) {
        grupos[sedeNombre] = [];
      }
      grupos[sedeNombre].push(agenda);
    });
    return grupos;
  };

  const agendamientosPorSede = agruparPorSede();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Agenda de Visitas</h1>
        <Button onClick={() => setCrearDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Agendamiento
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Buscador */}
          <div className="mb-4">
            <Label htmlFor="search-query">Buscar por Nombre o WhatsApp</Label>
            <input
              id="search-query"
              type="text"
              value={tempSearchQuery}
              onChange={(e) => setTempSearchQuery(e.target.value)}
              placeholder="Buscar agendamiento..."
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="filter-fecha-inicio">Fecha Inicio</Label>
              <input
                id="filter-fecha-inicio"
                type="date"
                value={tempFechaInicio}
                onChange={(e) => setTempFechaInicio(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div>
              <Label htmlFor="filter-fecha-fin">Fecha Fin</Label>
              <input
                id="filter-fecha-fin"
                type="date"
                value={tempFechaFin}
                onChange={(e) => setTempFechaFin(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div>
              <Label htmlFor="filter-sede">Sede</Label>
              <Select
                value={tempSelectedSede}
                onValueChange={(value) => setTempSelectedSede(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las sedes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las sedes</SelectItem>
                  {sucursales.map((sede) => (
                    <SelectItem key={sede.id} value={sede.id}>
                      {sede.nombre_sede}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Filtro de Horario */}
          <div className="border-t pt-4 mb-4">
            <div className="flex items-center gap-4 mb-3">
              <Label className="text-base font-semibold">Filtro por Horario</Label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tempTodoElDia}
                  onChange={(e) => setTempTodoElDia(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm">Todo el día</span>
              </label>
            </div>
            
            {!tempTodoElDia && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hora-inicio">Hora Inicio</Label>
                  <input
                    id="hora-inicio"
                    type="time"
                    value={tempHoraInicio}
                    onChange={(e) => setTempHoraInicio(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div>
                  <Label htmlFor="hora-fin">Hora Fin</Label>
                  <input
                    id="hora-fin"
                    type="time"
                    value={tempHoraFin}
                    onChange={(e) => setTempHoraFin(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Filtros rápidos */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t pt-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => applyQuickRange('hoy')} disabled={loading}>
                Hoy
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => applyQuickRange('ayer')} disabled={loading}>
                Ayer
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => applyQuickRange('semana')} disabled={loading}>
                Esta semana
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => applyQuickRange('mes')} disabled={loading}>
                Este mes
              </Button>
            </div>

            {/* Botón Filtrar */}
            <div className="flex justify-end">
              <Button onClick={handleAplicarFiltros} disabled={loading}>
                <Filter className="w-4 h-4 mr-2" />
                Filtrar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold">{agendamientos.length}</div>
            <p className="text-xs text-muted-foreground">Total Agendados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">
              {agendamientos.filter(a => a.resultado_asistencia === 'Pendiente').length}
            </div>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {agendamientos.filter(a => a.resultado_asistencia === 'Asistió').length}
            </div>
            <p className="text-xs text-muted-foreground">Asistieron</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-red-600">
              {agendamientos.filter(a => a.resultado_asistencia === 'No asistió').length}
            </div>
            <p className="text-xs text-muted-foreground">No Asistieron</p>
          </CardContent>
        </Card>
      </div>

      {/* Agendamientos por Sede */}
      {loading ? (
        <div className="text-center py-8">Cargando...</div>
      ) : agendamientos.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">
              <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No hay agendamientos para esta fecha</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {Object.keys(agendamientosPorSede).map((sede) => (
            <Card key={sede}>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">{sede} ({agendamientosPorSede[sede].length})</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Vista de Tarjetas para Móvil */}
                <div className="block md:hidden space-y-3">
                  {agendamientosPorSede[sede].map((agenda) => {
                    const prospecto = prospectos.find(p => p.id === agenda.prospecto_id);
                    const vendedor = prospecto ? staff.find(s => s.id === prospecto.vendedor_asignado) : null;
                    const vendedorNombre = vendedor?.nombre || '-';
                    const clase = prospecto ? clases.find(c => c.id === prospecto.clase_asistira) : null;
                    const claseNombre = clase?.nombre_clase || '-';
                    const cerrador = agenda.cerrador_asignado ? cerradores.find(c => c.id === agenda.cerrador_asignado) : null;
                    const cerradorNombre = cerrador?.nombre_cerrador || '-';
                    
                    return (
                      <div 
                        key={agenda.id}
                        id={`agendamiento-${agenda.id}`}
                        className="border rounded-lg p-3 bg-white shadow-sm transition-all duration-300"
                      >
                          <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-1">
                              <h3 className="font-semibold text-sm">{agenda.prospecto_nombre}</h3>
                              {prospecto && clientes.some(c => c.whatsapp === prospecto.whatsapp) && (
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{format(new Date(agenda.fecha_hora), 'HH:mm')}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              className={`${getResultadoBadgeColor(agenda.resultado_asistencia)} text-xs cursor-pointer hover:opacity-80`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditarEstado(agenda);
                              }}
                            >
                              {agenda.resultado_asistencia}
                            </Badge>

                            {agenda?.estado_confirmacion && agenda.estado_confirmacion !== 'Pendiente' ? (
                              <Badge className={`${getConfirmacionBadgeColor(agenda.estado_confirmacion)} text-[10px]`}
                                title="Confirmación de asistencia (llamado)"
                              >
                                {agenda.estado_confirmacion}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                          <div>
                            <span className="text-gray-500">Tipo:</span>
                            <Badge variant="outline" className="text-xs ml-1">{agenda.tipo_visita}</Badge>
                          </div>
                          <div>
                            <span className="text-gray-500">Vendedor:</span>
                            <p className="font-medium">{vendedorNombre}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Clase:</span>
                            <p className="font-medium">{claseNombre}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Cerrador:</span>
                            <div className="flex items-center gap-1">
                              <p className="font-medium">{cerradorNombre}</p>
                              {!agenda.cerrador_asignado ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAsignarCerrador(agenda);
                                  }}
                                >
                                  <Plus className="w-3 h-3 text-blue-600" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAsignarCerrador(agenda);
                                  }}
                                >
                                  <Edit className="w-3 h-3 text-gray-600" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <span className="text-gray-500">Notas:</span>
                                <p className="font-medium">{agenda.notas || '-'}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVerDetalles(agenda);
                                }}
                                title="Ver detalles completos"
                              >
                                <Info className="w-4 h-4 text-blue-600" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 pt-2 border-t">
                          <AccionesAgendamientoMenu
                            agendamiento={agenda}
                            tieneVenta={tieneVentaAsociada(agenda)}
                            yaGestionado={agenda.ya_gestionado === true}
                            onRegistrarVenta={() => handleRegistrarVenta(agenda)}
                            onCompromisoCompra={() => handleCompromisoCompra(agenda)}
                            onNoCompro={() => handleNoCompro(agenda)}
                            onReagendar={() => handleReagendar(agenda)}
                            onNoInteresado={() => handleNoInteresado(agenda)}
                            onNoContesta={() => handleNoContesta(agenda)}
                            onAsignarCerrador={() => handleAsignarCerrador(agenda)}
                            disabled={loading}
                          />
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" disabled={loading} className="flex-1">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditAgendamiento(agenda)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteAgendamiento(agenda.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Vista de Tabla para Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hora</TableHead>
                        <TableHead>Prospecto</TableHead>
                        <TableHead>Tipo Visita</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Vendedor</TableHead>
                        <TableHead>Clase</TableHead>
                        <TableHead>Cerrador</TableHead>
                        <TableHead>Notas</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agendamientosPorSede[sede].map((agenda) => {
                        // Buscar el prospecto y su vendedor
                        const prospecto = prospectos.find(p => p.id === agenda.prospecto_id);
                        const vendedor = prospecto ? staff.find(s => s.id === prospecto.vendedor_asignado) : null;
                        const vendedorNombre = vendedor?.nombre || '-';
                        const clase = prospecto ? clases.find(c => c.id === prospecto.clase_asistira) : null;
                        const claseNombre = clase?.nombre_clase || '-';
                        const cerrador = agenda.cerrador_asignado ? cerradores.find(c => c.id === agenda.cerrador_asignado) : null;
                        const cerradorNombre = cerrador?.nombre_cerrador || '-';
                        
                        return (
                          <TableRow 
                            key={agenda.id}
                            id={`agendamiento-${agenda.id}`}
                            className="transition-all duration-300"
                          >
                            <TableCell className="font-medium">
                              {format(new Date(agenda.fecha_hora), 'HH:mm')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {agenda.prospecto_nombre}
                                {prospecto && clientes.some(c => c.whatsapp === prospecto.whatsapp) && (
                                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{agenda.tipo_visita}</Badge>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  className={`${getResultadoBadgeColor(agenda.resultado_asistencia)} cursor-pointer hover:opacity-80`}
                                  onClick={() => handleEditarEstado(agenda)}
                                >
                                  {agenda.resultado_asistencia}
                                </Badge>

                                {agenda?.estado_confirmacion && agenda.estado_confirmacion !== 'Pendiente' ? (
                                  <Badge
                                    className={`${getConfirmacionBadgeColor(agenda.estado_confirmacion)} text-[10px]`}
                                    title="Confirmación de asistencia (llamado)"
                                  >
                                    {agenda.estado_confirmacion}
                                  </Badge>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {vendedorNombre}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {claseNombre}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                <span>{cerradorNombre}</span>
                                {!agenda.cerrador_asignado ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => handleAsignarCerrador(agenda)}
                                  >
                                    <Plus className="w-4 h-4 text-blue-600" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => handleAsignarCerrador(agenda)}
                                  >
                                    <Edit className="w-3 h-3 text-gray-600" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <span className="flex-1">{agenda.notas || '-'}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleVerDetalles(agenda);
                                  }}
                                  title="Ver detalles completos"
                                >
                                  <Info className="w-4 h-4 text-blue-600" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2 justify-center">
                                <AccionesAgendamientoMenu
                                  agendamiento={agenda}
                                  tieneVenta={tieneVentaAsociada(agenda)}
                                  yaGestionado={agenda.ya_gestionado === true}
                                  onRegistrarVenta={() => handleRegistrarVenta(agenda)}
                                  onCompromisoCompra={() => handleCompromisoCompra(agenda)}
                                  onNoCompro={() => handleNoCompro(agenda)}
                                  onReagendar={() => handleReagendar(agenda)}
                                  onNoInteresado={() => handleNoInteresado(agenda)}
                                  onNoContesta={() => handleNoContesta(agenda)}
                                  disabled={loading}
                                />
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" disabled={loading}>
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditAgendamiento(agenda)}>
                                      <Edit className="w-4 h-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteAgendamiento(agenda.id)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Card>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
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
                      {/* Show page numbers */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          // Show first page, last page, current page, and pages around current
                          return page === 1 ||
                                 page === totalPages ||
                                 Math.abs(page - currentPage) <= 1;
                        })
                        .reduce((acc, page, idx, arr) => {
                          // Add ellipsis where there are gaps
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
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Dialogs */}
      <CrearAgendamientoDialog 
        open={crearDialogOpen} 
        onClose={() => setCrearDialogOpen(false)} 
        onSave={fetchAgendamientos} 
      />
      <EditAgendamientoDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        agendamiento={selectedAgendamiento}
        onSave={handleSaveEdit}
      />
      
      <ReagendarDialog
        open={reagendarDialogOpen}
        onClose={() => setReagendarDialogOpen(false)}
        agendamiento={selectedAgendamiento}
        onSave={handleSaveReagendar}
      />
      
      <RegistrarVentaDialog
        open={ventaDialogOpen}
        onClose={() => setVentaDialogOpen(false)}
        agendamiento={selectedAgendamiento}
        prospecto={prospectos.find(p => p.id === selectedAgendamiento?.prospecto_id)}
        onSave={handleSaveVenta}
      />
      
      <NoComproDialog
        open={noComproDialogOpen}
        onClose={() => setNoComproDialogOpen(false)}
        onSave={handleSaveNoCompro}
        prospecto={prospectos.find(p => p.id === selectedAgendamiento?.prospecto_id)}
        agendamiento={selectedAgendamiento}
      />
      
      <CompromisoCompraDialog
        open={compromisoDialogOpen}
        onClose={() => setCompromisoDialogOpen(false)}
        agendamiento={selectedAgendamiento}
        onSave={handleSaveCompromiso}
      />
      
      <NoInteresadoDialog
        open={noInteresadoDialogOpen}
        onClose={() => setNoInteresadoDialogOpen(false)}
        agendamiento={selectedAgendamiento}
        tipo={noInteresadoTipo}
        onSave={handleSaveNoInteresado}
      />

      <AsignarCerradorDialog
        open={asignarCerradorDialogOpen}
        onClose={() => setAsignarCerradorDialogOpen(false)}
        agendamiento={selectedAgendamiento}
        onSave={handleSaveAsignarCerrador}
      />

      <DetallesAgendamientoDialog
        open={detallesDialogOpen}
        onClose={() => setDetallesDialogOpen(false)}
        agendamiento={selectedAgendamiento}
        prospecto={prospectos.find(p => p.id === selectedAgendamiento?.prospecto_id)}
        vendedor={staff.find(s => s.id === prospectos.find(p => p.id === selectedAgendamiento?.prospecto_id)?.vendedor_asignado)}
        clase={clases.find(c => c.id === prospectos.find(p => p.id === selectedAgendamiento?.prospecto_id)?.clase_asistira)}
        cerrador={cerradores.find(c => c.id === selectedAgendamiento?.cerrador_asignado)}
        sede={sucursales.find(s => s.id === selectedAgendamiento?.sede)}
      />

      <EditarEstadoDialog
        open={editarEstadoDialogOpen}
        onClose={() => setEditarEstadoDialogOpen(false)}
        agendamiento={selectedAgendamiento}
        onSave={handleSaveEditarEstado}
      />
    </div>
  );
}