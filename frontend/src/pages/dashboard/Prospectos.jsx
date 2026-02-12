import React, { useState, useEffect } from 'react';
import { Prospectos as ProspectosEntity } from '@/entities/Prospectos';
import { Sucursales } from '@/entities/Sucursales';
import { Staff } from '@/entities/Staff';
import { Cerradores } from '@/entities/Cerradores';
import { Planes_Servicios } from '@/entities/Planes_Servicios';
import { Agendamientos } from '@/entities/Agendamientos';
import { Ventas } from '@/entities/Ventas';
import { Clases } from '@/entities/Clases';
import { User } from '@/entities/User';
import { sincronizarClienteDesdeVenta } from '@/components/SyncClientesHelper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, ShoppingCart, Filter, Eye, Edit, Trash2, Download, Upload, Undo2, CheckSquare, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { format } from 'date-fns';
import EdicionMasivaDialog from '@/components/EdicionMasivaDialog';
import { usePermisos } from '@/components/usePermisos';
import axios from 'axios';

export default function Prospectos() {
  // Hook de permisos
  const { tienePermiso, loading: loadingPermisos } = usePermisos();
  
  const [prospectos, setProspectos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [staff, setStaff] = useState([]);
  const [cerradores, setCerradores] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [clases, setClases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedProspecto, setSelectedProspecto] = useState(null);
  const [showAgendaDialog, setShowAgendaDialog] = useState(false);
  const [showVentaDialog, setShowVentaDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [user, setUser] = useState(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [fechaVisitaAgendada, setFechaVisitaAgendada] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importData, setImportData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [importStep, setImportStep] = useState(1);
  const [lastImportedIds, setLastImportedIds] = useState([]);
  const [selectedProspectos, setSelectedProspectos] = useState([]);
  const [showEdicionMasivaDialog, setShowEdicionMasivaDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); // Búsqueda por nombre o WhatsApp

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [jumpToPage, setJumpToPage] = useState('');

  const [filters, setFilters] = useState({
    fechaInicio: '',
    fechaFin: '',
    sede: 'all',
    vendedor: 'all',
    estado: 'all',
    tipo_invitacion: 'all'
  });

  const [formData, setFormData] = useState({
    nombre: '',
    rut: '',
    correo: '',
    fecha_nacimiento: '',
    fecha_ingreso: format(new Date(), 'yyyy-MM-dd'),
    objetivos: [],
    clase_asistira: '',
    whatsapp: '',
    sede: '',
    vendedor_asignado: '',
    tipo_invitacion: 'Invitación',
    fecha_visita: '',
    hora_visita: '',
    estado_pipeline: 'Agendado',
    notas: ''
  });

  const [agendaFormData, setAgendaFormData] = useState({
    fecha_hora: '',
    tipo_visita: 'Invitación',
    notas: ''
  });

  const [ventaFormData, setVentaFormData] = useState({
    tipo_venta: 'Online',
    fecha_venta: format(new Date(), 'yyyy-MM-dd'),
    cerrador: '',
    monto: '',
    plan: '',
    descuento: '',
    notas: ''
  });

  const estados = ['Agendado', 'Asistió', 'No asistió', 'Reagendado', 'Compró (en sede)', 'Compró (online)', 'No compró', 'Perdido', 'No califica'];

  useEffect(() => {
    loadCatalogos();
    fetchUser();
  }, []);

  useEffect(() => {
    fetchProspectos();
  }, [filters]);

  const loadCatalogos = async () => {
    try {
      const [sucursalesData, staffData, cerradoresData, planesData, clasesData] = await Promise.all([
        Sucursales.list(),
        Staff.list(),
        Cerradores.list(),
        Planes_Servicios.list(),
        Clases.list()
      ]);
      setSucursales(sucursalesData?.filter(s => s.activa) || []);
      setStaff(staffData?.filter(s => s.activo && s.roles?.includes('vendedor')) || []);
      setCerradores(cerradoresData?.filter(c => c.activo) || []);
      setPlanes(planesData?.filter(p => p.activo) || []);
      setClases(clasesData?.filter(c => c.activa) || []);
    } catch (error) {
      console.error('Error cargando catálogos:', error);
    }
  };

  const fetchUser = async () => {
    try {
      const userData = await User.me();
      setUser(userData);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchProspectos = async () => {
    setLoading(true);
    try {
      let result = await ProspectosEntity.list('-createdAt');
      
      // Aplicar filtros en el cliente
      if (result) {
        result = result.filter(prospecto => {
          // Filtro por periodo (usando fecha_visita en lugar de createdAt)
          if (filters.fechaInicio && filters.fechaFin) {
            if (!prospecto.fecha_visita) return false; // Excluir prospectos sin fecha de visita
            const fechaVisita = new Date(prospecto.fecha_visita);
            const inicio = new Date(filters.fechaInicio);
            const fin = new Date(filters.fechaFin);
            if (fechaVisita < inicio || fechaVisita > fin) return false;
          }
          
          // Filtro por sede
          if (filters.sede && filters.sede !== 'all' && prospecto.sede !== filters.sede) {
            return false;
          }
          
          // Filtro por vendedor
          if (filters.vendedor && filters.vendedor !== 'all' && prospecto.vendedor_asignado !== filters.vendedor) {
            return false;
          }
          
          // Filtro por estado
          if (filters.estado && filters.estado !== 'all' && prospecto.estado_pipeline !== filters.estado) {
            return false;
          }
          
          // Filtro por tipo de invitación
          if (filters.tipo_invitacion && filters.tipo_invitacion !== 'all' && prospecto.tipo_invitacion !== filters.tipo_invitacion) {
            return false;
          }
          
          return true;
        });
      }
      
      setProspectos(result || []);
    } catch (error) {
      console.error('Error fetching prospectos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para normalizar texto para búsqueda (sin acentos, minúsculas)
  const normalizeSearchText = (text) => {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  // Filtrar prospectos por búsqueda de texto (nombre o WhatsApp)
  const prospectosFiltrados = prospectos.filter(prospecto => {
    if (!searchQuery.trim()) return true;

    const query = normalizeSearchText(searchQuery);
    const nombre = normalizeSearchText(prospecto.nombre || '');
    const whatsapp = (prospecto.whatsapp || '').replace(/\D/g, ''); // Solo dígitos
    const queryDigits = searchQuery.replace(/\D/g, ''); // Solo dígitos de la búsqueda

    // Si hay dígitos en la búsqueda, buscar también por WhatsApp
    // Si no hay dígitos, solo buscar por nombre para evitar coincidencia con string vacío
    const matchWhatsApp = queryDigits.length > 0 && whatsapp.includes(queryDigits);

    return nombre.includes(query) || matchWhatsApp;
  });

  // Pagination calculations
  const totalRecords = prospectosFiltrados.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const prospectosPaginados = prospectosFiltrados.slice(startIndex, endIndex);

  // Reset to page 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchQuery, pageSize]);

  // Pagination helper functions
  const goToPage = (page) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
    setJumpToPage('');
  };

  const handleJumpToPage = (e) => {
    e.preventDefault();
    const page = parseInt(jumpToPage, 10);
    if (!isNaN(page)) {
      goToPage(page);
    }
  };

  // Generate pagination range with ellipsis for large datasets
  const getPaginationRange = () => {
    const delta = 2; // Number of pages to show around current page
    const range = [];
    const rangeWithDots = [];

    // Always include first page
    range.push(1);

    // Calculate range around current page
    const start = Math.max(2, currentPage - delta);
    const end = Math.min(totalPages - 1, currentPage + delta);

    for (let i = start; i <= end; i++) {
      range.push(i);
    }

    // Always include last page if more than 1 page
    if (totalPages > 1) {
      range.push(totalPages);
    }

    // Remove duplicates and sort
    const uniqueRange = [...new Set(range)].sort((a, b) => a - b);

    // Add ellipsis where needed
    let prev = 0;
    for (const page of uniqueRange) {
      if (page - prev > 1) {
        rangeWithDots.push('...');
      }
      rangeWithDots.push(page);
      prev = page;
    }

    return rangeWithDots;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Calcular edad si hay fecha de nacimiento
      let edad = null;
      if (formData.fecha_nacimiento) {
        const hoy = new Date();
        const fechaNac = new Date(formData.fecha_nacimiento);
        edad = hoy.getFullYear() - fechaNac.getFullYear();
        const mes = hoy.getMonth() - fechaNac.getMonth();
        if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
          edad--;
        }
      }

      // Crear el prospecto
      const nuevoProspecto = await ProspectosEntity.create({
        nombre: formData.nombre,
        rut: formData.rut,
        correo: formData.correo,
        fecha_nacimiento: formData.fecha_nacimiento,
        fecha_ingreso: formData.fecha_ingreso,
        edad: edad,
        objetivos: formData.objetivos,
        clase_asistira: formData.clase_asistira,
        whatsapp: formData.whatsapp,
        sede: formData.sede,
        vendedor_asignado: formData.vendedor_asignado,
        tipo_invitacion: formData.tipo_invitacion,
        fecha_visita: formData.fecha_visita,
        estado_pipeline: formData.estado_pipeline,
        notas: formData.notas
      });

      // Si tiene fecha de visita, crear automáticamente el agendamiento (con o sin hora)
      if (formData.fecha_visita) {
        try {
          const currentStaff = staff.find(s => s.email === user?.email);
          // Si no hay hora, usar 09:00 por defecto
          const horaVisita = formData.hora_visita || '09:00';
          const fechaHoraCompleta = `${formData.fecha_visita}T${horaVisita}:00`;
          
          // Determinar quién registra (prioridad: staff actual, usuario, vendedor asignado, sistema)
          const registradoPor = currentStaff?.id || user?.id || formData.vendedor_asignado || 'Sistema';
          
          await Agendamientos.create({
            prospecto_id: nuevoProspecto.id,
            prospecto_nombre: formData.nombre,
            sede: formData.sede,
            fecha_hora: fechaHoraCompleta,
            tipo_visita: formData.tipo_invitacion === 'Venta online' ? 'Invitación' : formData.tipo_invitacion,
            resultado_asistencia: 'Pendiente',
            registrado_por: registradoPor,
            notas: `Agendamiento automático desde prospecto: ${formData.notas || ''}`
          });
        } catch (agendaError) {
          console.error('Error creando agendamiento automático:', agendaError);
          // No detener el flujo si falla el agendamiento
        }
      }

      setShowForm(false);
      setFormData({
        nombre: '',
        rut: '',
        correo: '',
        fecha_nacimiento: '',
        fecha_ingreso: format(new Date(), 'yyyy-MM-dd'),
        objetivos: [],
        clase_asistira: '',
        whatsapp: '',
        sede: '',
        vendedor_asignado: '',
        tipo_invitacion: 'Invitación',
        fecha_visita: '',
        hora_visita: '',
        estado_pipeline: 'Agendado',
        notas: ''
      });
      await fetchProspectos();
    } catch (error) {
      console.error('Error creating prospecto:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProspecto = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Calcular edad si hay fecha de nacimiento
      let edad = null;
      if (formData.fecha_nacimiento) {
        const hoy = new Date();
        const fechaNac = new Date(formData.fecha_nacimiento);
        edad = hoy.getFullYear() - fechaNac.getFullYear();
        const mes = hoy.getMonth() - fechaNac.getMonth();
        if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
          edad--;
        }
      }

      await ProspectosEntity.update(selectedProspecto.id, {
        ...formData,
        edad: edad
      });

      // Si tiene fecha_visita, crear o actualizar agendamiento automáticamente
      if (formData.fecha_visita) {
        try {
          const currentStaff = staff.find(s => s.email === user?.email);
          // Si no hay hora, usar 09:00 por defecto
          const horaVisita = formData.hora_visita || '09:00';
          const fechaHoraCompleta = `${formData.fecha_visita}T${horaVisita}:00`;
          
          // Determinar quién registra (prioridad: staff actual, usuario, vendedor asignado, sistema)
          const registradoPor = currentStaff?.id || user?.id || formData.vendedor_asignado || 'Sistema';
          
          // Buscar si ya existe un agendamiento para este prospecto
          const agendamientosExistentes = await Agendamientos.filter(
            { prospecto_id: selectedProspecto.id },
            '-fecha_hora',
            1
          );
          
          if (agendamientosExistentes && agendamientosExistentes.length > 0) {
            // Actualizar el agendamiento más reciente
            await Agendamientos.update(agendamientosExistentes[0].id, {
              fecha_hora: fechaHoraCompleta,
              tipo_visita: formData.tipo_invitacion === 'Venta online' ? 'Invitación' : formData.tipo_invitacion,
              notas: `Agendamiento actualizado desde prospecto: ${formData.notas || ''}`
            });
          } else {
            // Crear nuevo agendamiento
            await Agendamientos.create({
              prospecto_id: selectedProspecto.id,
              prospecto_nombre: formData.nombre,
              sede: formData.sede,
              fecha_hora: fechaHoraCompleta,
              tipo_visita: formData.tipo_invitacion === 'Venta online' ? 'Invitación' : formData.tipo_invitacion,
              resultado_asistencia: 'Pendiente',
              registrado_por: registradoPor,
              notas: `Agendamiento automático desde prospecto: ${formData.notas || ''}`
            });
          }
        } catch (agendaError) {
          console.error('Error creando/actualizando agendamiento automático:', agendaError);
          // No detener el flujo si falla el agendamiento
        }
      }

      setShowEditDialog(false);
      setFechaVisitaAgendada(null);
      setFormData({
        nombre: '',
        rut: '',
        correo: '',
        fecha_nacimiento: '',
        fecha_ingreso: format(new Date(), 'yyyy-MM-dd'),
        objetivos: [],
        clase_asistira: '',
        whatsapp: '',
        sede: '',
        vendedor_asignado: '',
        tipo_invitacion: 'Invitación',
        fecha_visita: '',
        hora_visita: '',
        estado_pipeline: 'Agendado',
        notas: ''
      });
      await fetchProspectos();
    } catch (error) {
      console.error('Error updating prospecto:', error);
    } finally {
      setLoading(false)
;
    }
  };

  const handleCreateAgendamiento = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Buscar el staff actual
      const currentStaff = staff.find(s => s.email === user?.email);
      
      await Agendamientos.create({
        prospecto_id: selectedProspecto.id,
        prospecto_nombre: selectedProspecto.nombre,
        sede: selectedProspecto.sede,
        fecha_hora: agendaFormData.fecha_hora,
        tipo_visita: agendaFormData.tipo_visita,
        resultado_asistencia: 'Pendiente',
        registrado_por: currentStaff?.id || user?.id || 'Sistema',
        notas: agendaFormData.notas
      });

      await ProspectosEntity.update(selectedProspecto.id, {
        estado_pipeline: 'Agendado'
      });

      setShowAgendaDialog(false);
      setAgendaFormData({
        fecha_hora: '',
        tipo_visita: 'Invitación',
        notas: ''
      });
      await fetchProspectos();
    } catch (error) {
      console.error('Error creating agendamiento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVenta = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const ventaData = {
        prospecto_id: selectedProspecto.id,
        prospecto_nombre: selectedProspecto.nombre,
        tipo_venta: ventaFormData.tipo_venta,
        fecha_venta: ventaFormData.fecha_venta,
        vendedor: selectedProspecto.vendedor_asignado,
        sede: selectedProspecto.sede,
        estado: 'Cerrada',
        notas: ventaFormData.notas
      };

      if (ventaFormData.tipo_venta === 'En sede' && ventaFormData.cerrador) {
        ventaData.cerrador = ventaFormData.cerrador;
      }

      if (ventaFormData.monto) {
        ventaData.monto = parseFloat(ventaFormData.monto);
      }

      if (ventaFormData.plan) {
        ventaData.plan = ventaFormData.plan;
      }

      if (ventaFormData.descuento) {
        ventaData.descuento = parseFloat(ventaFormData.descuento);
      }

      const ventaCreada = await Ventas.create(ventaData);

      // Sincronizar con Clientes y Ciclos_Retencion
      try {
        await sincronizarClienteDesdeVenta(ventaCreada, selectedProspecto);
      } catch (syncError) {
        console.error('Error sincronizando cliente:', syncError);
        // No detener el flujo si falla la sincronización
      }

      const nuevoEstado = ventaFormData.tipo_venta === 'Online' ? 'Compró (online)' : 'Compró (en sede)';
      await ProspectosEntity.update(selectedProspecto.id, {
        estado_pipeline: nuevoEstado
      });

      // Actualizar automáticamente el agendamiento más reciente a "Asistió"
      try {
        const agendamientosProspecto = await Agendamientos.filter(
          { prospecto_id: selectedProspecto.id },
          '-fecha_hora',
          1
        );
        if (agendamientosProspecto && agendamientosProspecto.length > 0) {
          const agendamientoReciente = agendamientosProspecto[0];
          await Agendamientos.update(agendamientoReciente.id, {
            resultado_asistencia: 'Asistió'
          });
        }
      } catch (error) {
        console.error('Error actualizando agendamiento:', error);
      }

      setShowVentaDialog(false);
      setVentaFormData({
        tipo_venta: 'Online',
        fecha_venta: format(new Date(), 'yyyy-MM-dd'),
        cerrador: '',
        monto: '',
        plan: '',
        descuento: '',
        notas: ''
      });
      await fetchProspectos();
    } catch (error) {
      console.error('Error creating venta:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProspecto = async (prospectoId) => {
    if (!confirm('¿Estás seguro de eliminar este prospecto?')) return;
    setLoading(true);
    try {
      await ProspectosEntity.delete(prospectoId);
      await fetchProspectos();
    } catch (error) {
      console.error('Error deleting prospecto:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportProspectos = async () => {
    setLoading(true);
    try {
      // Preparar datos para exportar
      const dataToExport = prospectos.map(p => [
        p.nombre,
        p.rut || '',
        p.correo || '',
        p.fecha_nacimiento || '',
        p.edad || '',
        p.fecha_ingreso || '',
        p.whatsapp,
        getSedeName(p.sede),
        getStaffName(p.vendedor_asignado),
        getClaseName(p.clase_asistira),
        p.objetivos?.join(', ') || '',
        p.tipo_invitacion,
        p.estado_pipeline,
        p.fecha_visita || '',
        p.notas || ''
      ]);

      // Agregar encabezados
      const headers = [
        'Nombre',
        'RUT',
        'Correo',
        'Fecha Nacimiento',
        'Edad',
        'Fecha Ingreso',
        'WhatsApp',
        'Sede',
        'Vendedor',
        'Clase',
        'Objetivos',
        'Tipo Invitación',
        'Estado',
        'Fecha Visita',
        'Notas'
      ];

      const response = await axios.post(
        `${process.env.PROXY_INTEGRATION_URL}/documents/export-excel`,
        {
          sheets: [
            {
              name: 'Prospectos',
              data: [headers, ...dataToExport]
            }
          ]
        },
        {
          headers: {
            'x-api-key': window.config.apiKey
          }
        }
      );

      // Descargar el archivo
      const link = document.createElement('a');
      link.href = response.data.url;
      link.download = `prospectos_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exportando prospectos:', error);
      alert('Error al exportar prospectos');
    } finally {
      setLoading(false);
    }
  };

  // ============ FUNCIONES DE LIMPIEZA Y TRANSFORMACIÓN ============
  
  // Función para normalizar texto (eliminar acentos, espacios extras, convertir a minúsculas)
  const normalizeText = (text) => {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .trim()
      .normalize('NFD') // Descomponer caracteres con acentos
      .replace(/[\u0300-\u036f]/g, '') // Eliminar marcas diacríticas (acentos)
      .replace(/\s+/g, ' '); // Normalizar espacios múltiples a uno solo
  };
  
  // Eliminar emojis y caracteres especiales
  const cleanText = (text) => {
    if (!text) return '';
    return String(text)
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Símbolos y pictogramas
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transporte y símbolos de mapa
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Banderas
      .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Símbolos varios
      .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
      .replace(/🟦|🟧|🟨|🟩|🟥|🟪|🟫/g, '')    // Cuadrados de colores
      .trim();
  };

  // Limpiar número de WhatsApp
  const cleanWhatsApp = (phone) => {
    if (!phone) return '';
    return String(phone).replace(/\s+/g, '').replace(/[^\d+]/g, '');
  };

  // Limpiar nombre de vendedor (quitar prefijos como "V ", "/DIF", etc.)
  const cleanVendorName = (name) => {
    if (!name) return '';
    return String(name)
      .replace(/^V\s+/i, '')           // Quitar "V " al inicio
      .replace(/\/DIF$/i, '')          // Quitar "/DIF" al final
      .replace(/\/\w+$/i, '')          // Quitar cualquier /ALGO al final
      .trim();
  };

  // Convertir fechas en español a formato ISO (sin conversión de zona horaria)
  const parseSpanishDate = (dateStr, timeStr = '') => {
    if (!dateStr) return '';
    
    try {
      const cleanDate = String(dateStr).toLowerCase().trim();
      
      // Mapeo de meses en español
      const meses = {
        'ene': '01', 'enero': '01',
        'feb': '02', 'febrero': '02',
        'mar': '03', 'marzo': '03',
        'abr': '04', 'abril': '04',
        'may': '05', 'mayo': '05',
        'jun': '06', 'junio': '06',
        'jul': '07', 'julio': '07',
        'ago': '08', 'agosto': '08',
        'sep': '09', 'septiembre': '09', 'sept': '09',
        'oct': '10', 'octubre': '10',
        'nov': '11', 'noviembre': '11',
        'dic': '12', 'diciembre': '12'
      };

      // Intentar extraer día, mes y año
      // Formato: "miércoles, 3 de dic de 25" o "lunes, 1 de dic de 25"
      const regex = /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{2,4})/i;
      const match = cleanDate.match(regex);
      
      if (match) {
        let dia = match[1].padStart(2, '0');
        const mesTexto = match[2].toLowerCase();
        let anio = match[3];
        
        // Convertir año de 2 dígitos a 4 dígitos
        if (anio.length === 2) {
          anio = parseInt(anio) > 50 ? `19${anio}` : `20${anio}`;
        }
        
        const mes = meses[mesTexto];
        
        if (mes) {
          const fechaISO = `${anio}-${mes}-${dia}`;
          
          // Si hay hora, combinarla
          if (timeStr) {
            const cleanTime = String(timeStr).trim();
            // Formato: "9:00" o "16:00"
            const timeMatch = cleanTime.match(/(\d{1,2}):(\d{2})/);
            if (timeMatch) {
              const hora = timeMatch[1].padStart(2, '0');
              const minuto = timeMatch[2];
              return `${fechaISO}T${hora}:${minuto}:00`;
            }
          }
          
          return fechaISO;
        }
      }
      
      // Si no coincide con el formato español, intentar parsear como fecha ISO directa
      // IMPORTANTE: Si ya viene en formato ISO (YYYY-MM-DD), devolverla tal cual sin conversión
      if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        // Ya está en formato ISO, extraer solo la parte de fecha sin hora
        return dateStr.split('T')[0];
      }
      
      // Si es otro formato, intentar parsear pero sin conversión de zona horaria
      const testDate = new Date(dateStr + 'T00:00:00'); // Forzar medianoche local
      if (!isNaN(testDate.getTime())) {
        const year = testDate.getFullYear();
        const month = String(testDate.getMonth() + 1).padStart(2, '0');
        const day = String(testDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      
      return '';
    } catch (error) {
      console.warn('Error parseando fecha:', dateStr, error);
      return '';
    }
  };

  // Detectar automáticamente el mapeo de columnas
  const autoDetectColumnMapping = (headers) => {
    const mapping = {};
    
    const headerLower = headers.map(h => String(h).toLowerCase().trim());
    
    // Mapeo inteligente basado en palabras clave
    headerLower.forEach((header, index) => {
      const originalHeader = headers[index];
      
      // Nombre
      if (header.includes('nombre') && !header.includes('vendedor') && !header.includes('cerrador')) {
        if (!mapping.nombre) mapping.nombre = originalHeader;
      }
      
      // WhatsApp
      if (header.includes('whatsapp') || header.includes('telefono') || header.includes('teléfono') || header.includes('celular') || header.includes('phone')) {
        if (!mapping.whatsapp) mapping.whatsapp = originalHeader;
      }
      
      // Sede
      if (header.includes('sede') || header.includes('sucursal') || header.includes('local')) {
        if (!mapping.sede) mapping.sede = originalHeader;
      }
      
      // Vendedor
      if (header.includes('vendedor') || header.includes('agendado por') || header.includes('asignado')) {
        if (!mapping.vendedor_asignado) mapping.vendedor_asignado = originalHeader;
      }
      
      // RUT
      if (header.includes('rut') || header.includes('dni') || header.includes('cedula') || header.includes('cédula')) {
        if (!mapping.rut) mapping.rut = originalHeader;
      }
      
      // Correo
      if (header.includes('correo') || header.includes('email') || header.includes('mail')) {
        if (!mapping.correo) mapping.correo = originalHeader;
      }
      
      // Fecha de nacimiento
      if (header.includes('nacimiento') || header.includes('fecha nac') || header.includes('birthday')) {
        if (!mapping.fecha_nacimiento) mapping.fecha_nacimiento = originalHeader;
      }
      
      // Fecha de ingreso
      if (header.includes('ingreso') || header.includes('fecha ing') || header.includes('fecha de entrada') || header.includes('registro')) {
        if (!mapping.fecha_ingreso) mapping.fecha_ingreso = originalHeader;
      }
      
      // Clase
      if (header.includes('clase') || header.includes('class')) {
        if (!mapping.clase_asistira) mapping.clase_asistira = originalHeader;
      }
      
      // Objetivos
      if (header.includes('objetivo') || header.includes('meta') || header.includes('goal')) {
        if (!mapping.objetivos) mapping.objetivos = originalHeader;
      }
      
      // Tipo de invitación/agenda
      if (header.includes('tipo') && (header.includes('agenda') || header.includes('invitacion') || header.includes('invitación'))) {
        if (!mapping.tipo_invitacion) mapping.tipo_invitacion = originalHeader;
      }
      
      // Estado
      if (header.includes('estado') && !header.includes('civil')) {
        if (!mapping.estado_pipeline) mapping.estado_pipeline = originalHeader;
      }
      
      // Fecha de visita
      if (header.includes('fecha') && (header.includes('visita') || header.includes('cita') || header.includes('appointment'))) {
        if (!mapping.fecha_visita) mapping.fecha_visita = originalHeader;
      }
      
      // Notas
      if (header.includes('nota') || header.includes('observacion') || header.includes('observación') || header.includes('comentario')) {
        if (!mapping.notas) mapping.notas = originalHeader;
      }
    });
    
    return mapping;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await axios.post(
        `${process.env.PROXY_INTEGRATION_URL}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'x-api-key': window.config.apiKey
          }
        }
      );

      const { url } = uploadResponse.data;

      // Extraer datos del CSV/Excel
      const extractResponse = await axios.post(
        `${process.env.PROXY_INTEGRATION_URL}/documents/extract-csv`,
        { fileUrl: url },
        {
          headers: {
            'x-api-key': window.config.apiKey
          }
        }
      );

      const data = extractResponse.data;
      
      // Renombrar columnas vacías con nombres descriptivos
      if (data && data.headers) {
        const renamedHeaders = [];
        const headerCounts = {};
        
        data.headers.forEach((header, index) => {
          let cleanHeader = header && header.trim() !== '' ? header : null;
          
          if (!cleanHeader) {
            // Buscar un nombre representativo en la primera fila de datos
            const firstRowValue = data.rows[0] ? data.rows[0][header] : null;
            if (firstRowValue && String(firstRowValue).trim() !== '') {
              cleanHeader = `Columna_${index + 1}`;
            } else {
              cleanHeader = `Columna_${index + 1}`;
            }
          }
          
          // Evitar duplicados
          if (headerCounts[cleanHeader]) {
            headerCounts[cleanHeader]++;
            cleanHeader = `${cleanHeader}_${headerCounts[cleanHeader]}`;
          } else {
            headerCounts[cleanHeader] = 1;
          }
          
          renamedHeaders.push(cleanHeader);
        });
        
        // Actualizar las filas con los nuevos nombres de columnas
        const updatedRows = data.rows.map(row => {
          const newRow = {};
          data.headers.forEach((oldHeader, index) => {
            newRow[renamedHeaders[index]] = row[oldHeader];
          });
          return newRow;
        });
        
        data.headers = renamedHeaders;
        data.rows = updatedRows;
      }

      setImportData(data);
      setImportFile(file);
      
      // Auto-detectar mapeo de columnas
      const suggestedMapping = autoDetectColumnMapping(data.headers);
      setColumnMapping(suggestedMapping);
      
      setImportStep(2);
      setShowImportDialog(true);
    } catch (error) {
      console.error('Error cargando archivo:', error);
      alert('Error al cargar el archivo. Asegúrate de que sea un archivo CSV o Excel válido.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportProspectos = async () => {
    if (!importData || !columnMapping) return;
    
    // Prevenir múltiples clics durante la importación
    if (loading) return;

    setLoading(true);
    const errors = [];
    const warnings = [];
    const importedRows = [];
    
    try {
      const newProspectosIds = [];
      let rowIndex = 0;
      
      // Buscar columna de hora si existe
      let horaColumn = null;
      importData.headers.forEach(header => {
        if (String(header).toLowerCase().includes('hora') && !columnMapping.fecha_visita) {
          horaColumn = header;
        }
      });
      
      for (const row of importData.rows) {
        rowIndex++;
        // Mapear columnas según la configuración del usuario
        const prospectoData = {};
        
        Object.keys(columnMapping).forEach(targetField => {
          const sourceColumn = columnMapping[targetField];
          if (sourceColumn && sourceColumn !== 'skip_column' && row[sourceColumn] !== undefined && row[sourceColumn] !== null) {
            prospectoData[targetField] = row[sourceColumn];
          }
        });

        // ========== APLICAR LIMPIEZA AUTOMÁTICA ==========
        
        // Limpiar nombre (quitar emojis)
        if (prospectoData.nombre) {
          const originalNombre = prospectoData.nombre;
          prospectoData.nombre = cleanText(prospectoData.nombre);
          if (originalNombre !== prospectoData.nombre) {
            warnings.push(`Fila ${rowIndex}: Se limpiaron caracteres especiales del nombre`);
          }
        }
        
        // Limpiar WhatsApp (quitar espacios)
        if (prospectoData.whatsapp) {
          const originalWhatsApp = prospectoData.whatsapp;
          prospectoData.whatsapp = cleanWhatsApp(prospectoData.whatsapp);
          if (originalWhatsApp !== prospectoData.whatsapp) {
            warnings.push(`Fila ${rowIndex}: Se normalizó el número de WhatsApp`);
          }
        }
        
        // Limpiar nombre de vendedor (quitar prefijos)
        if (prospectoData.vendedor_asignado) {
          const originalVendedor = prospectoData.vendedor_asignado;
          prospectoData.vendedor_asignado = cleanVendorName(prospectoData.vendedor_asignado);
          if (originalVendedor !== prospectoData.vendedor_asignado) {
            warnings.push(`Fila ${rowIndex}: Se limpió el nombre del vendedor`);
          }
        }
        
        // Convertir fecha de visita en español a ISO
        if (prospectoData.fecha_visita) {
          const horaValue = horaColumn ? row[horaColumn] : '';
          const originalFecha = prospectoData.fecha_visita;
          prospectoData.fecha_visita = parseSpanishDate(prospectoData.fecha_visita, horaValue);
          if (originalFecha !== prospectoData.fecha_visita && prospectoData.fecha_visita) {
            warnings.push(`Fila ${rowIndex}: Se convirtió la fecha de visita de formato español a ISO`);
          }
        }
        
        // Convertir fecha de ingreso (sin conversión de zona horaria)
        if (prospectoData.fecha_ingreso) {
          const originalFechaIngreso = prospectoData.fecha_ingreso;
          prospectoData.fecha_ingreso = parseSpanishDate(prospectoData.fecha_ingreso);
          if (originalFechaIngreso !== prospectoData.fecha_ingreso && prospectoData.fecha_ingreso) {
            warnings.push(`Fila ${rowIndex}: Se normalizó la fecha de ingreso`);
          }
        }

        // Validar campos requeridos
        const missingFields = [];
        if (!prospectoData.nombre) missingFields.push('Nombre');
        if (!prospectoData.whatsapp) missingFields.push('WhatsApp');
        if (!prospectoData.sede) missingFields.push('Sede');
        if (!prospectoData.vendedor_asignado) missingFields.push('Vendedor');

        if (missingFields.length > 0) {
          errors.push(`Fila ${rowIndex}: Faltan campos requeridos (${missingFields.join(', ')})`);
          continue;
        }

        // Normalizar strings para búsqueda (usando normalizeText para mejor anclaje)
        const sedeNombreInput = normalizeText(prospectoData.sede || '');
        const vendedorNombreInput = normalizeText(prospectoData.vendedor_asignado || '');
        
        // Buscar IDs de sede y vendedor por nombre (con normalización mejorada)
        const sede = sucursales.find(s => normalizeText(s.nombre_sede || '') === sedeNombreInput);
        const vendedor = staff.find(s => normalizeText(s.nombre || '') === vendedorNombreInput);
        
        // Búsqueda de clase con normalización mejorada
        let clase = null;
        if (prospectoData.clase_asistira) {
            const claseNombreInput = normalizeText(prospectoData.clase_asistira);
            clase = clases.find(c => normalizeText(c.nombre_clase || '') === claseNombreInput);
        }
        
        // Normalizar tipo_invitacion y estado_pipeline para mejor anclaje
        if (prospectoData.tipo_invitacion) {
          const tipoNormalizado = normalizeText(prospectoData.tipo_invitacion);
          // Mapear variaciones comunes
          const tiposValidos = {
            'invitacion': 'Invitación',
            'promesa de compra': 'Promesa de compra',
            'venta online': 'Venta online'
          };
          prospectoData.tipo_invitacion = tiposValidos[tipoNormalizado] || prospectoData.tipo_invitacion;
        }
        
        if (prospectoData.estado_pipeline) {
          const estadoNormalizado = normalizeText(prospectoData.estado_pipeline);
          // Mapear variaciones comunes de estados
          const estadosValidos = {
            'agendado': 'Agendado',
            'asistio': 'Asistió',
            'no asistio': 'No asistió',
            'reagendado': 'Reagendado',
            'compro (en sede)': 'Compró (en sede)',
            'compro en sede': 'Compró (en sede)',
            'compro (online)': 'Compró (online)',
            'compro online': 'Compró (online)',
            'venta online': 'Compró (online)',
            'no compro': 'No compró',
            'perdido': 'Perdido',
            'no califica': 'No califica'
          };
          prospectoData.estado_pipeline = estadosValidos[estadoNormalizado] || prospectoData.estado_pipeline;
        }

        if (!sede) {
          errors.push(`Fila ${rowIndex}: Sede '${prospectoData.sede}' no encontrada. Las sedes disponibles son: ${sucursales.map(s => s.nombre_sede).join(', ')}`);
          continue;
        }
        if (!vendedor) {
          errors.push(`Fila ${rowIndex}: Vendedor '${prospectoData.vendedor_asignado}' no encontrado. Los vendedores disponibles son: ${staff.map(s => s.nombre).join(', ')}`);
          continue;
        }

        // Calcular edad si hay fecha de nacimiento
        let edad = null;
        if (prospectoData.fecha_nacimiento) {
          try {
            const hoy = new Date();
            const fechaNac = new Date(prospectoData.fecha_nacimiento);
            if (!isNaN(fechaNac.getTime())) {
                edad = hoy.getFullYear() - fechaNac.getFullYear();
                const mes = hoy.getMonth() - fechaNac.getMonth();
                if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
                  edad--;
                }
            }
          } catch (e) {
            console.warn('Error calculando edad:', e);
          }
        }

        // Procesar objetivos (convertir string separado por comas a array)
        let objetivos = [];
        if (prospectoData.objetivos && typeof prospectoData.objetivos === 'string') {
          objetivos = prospectoData.objetivos.split(',').map(o => o.trim());
        }

        // Crear prospecto
        try {
          const nuevoProspecto = await ProspectosEntity.create({
            nombre: prospectoData.nombre,
            rut: prospectoData.rut || '',
            correo: prospectoData.correo || '',
            fecha_nacimiento: prospectoData.fecha_nacimiento || '',
            fecha_ingreso: prospectoData.fecha_ingreso || format(new Date(), 'yyyy-MM-dd'),
            edad: edad,
            whatsapp: prospectoData.whatsapp,
            sede: sede.id,
            vendedor_asignado: vendedor.id,
            clase_asistira: clase?.id || '',
            objetivos: objetivos,
            tipo_invitacion: prospectoData.tipo_invitacion || 'Invitación',
            estado_pipeline: prospectoData.estado_pipeline || 'Agendado',
            fecha_visita: prospectoData.fecha_visita || '',
            notas: prospectoData.notas || ''
          });

          // Si tiene fecha_visita, crear agendamiento automáticamente
          if (prospectoData.fecha_visita) {
            try {
              // Extraer hora si la fecha viene con hora (formato ISO con T)
              let fechaHoraCompleta = prospectoData.fecha_visita;
              if (!prospectoData.fecha_visita.includes('T')) {
                // Si solo es fecha, agregar hora por defecto 09:00
                fechaHoraCompleta = `${prospectoData.fecha_visita}T09:00:00`;
              }
              
              // Determinar quién registra (prioridad: usuario, vendedor asignado, sistema)
              const registradoPor = user?.id || vendedor?.id || 'Sistema';
              
              await Agendamientos.create({
                prospecto_id: nuevoProspecto.id,
                prospecto_nombre: prospectoData.nombre,
                sede: sede.id,
                fecha_hora: fechaHoraCompleta,
                tipo_visita: prospectoData.tipo_invitacion === 'Venta online' ? 'Invitación' : (prospectoData.tipo_invitacion || 'Invitación'),
                resultado_asistencia: 'Pendiente',
                registrado_por: registradoPor,
                notas: `Agendamiento automático desde importación: ${prospectoData.notas || ''}`
              });
            } catch (agendaError) {
              console.warn(`No se pudo crear agendamiento para fila ${rowIndex}:`, agendaError);
              warnings.push(`Fila ${rowIndex}: No se pudo crear agendamiento automático - ${agendaError.message}`);
              // No detener la importación por error en agendamiento
            }
          }

          newProspectosIds.push(nuevoProspecto.id);
          importedRows.push(rowIndex);
        } catch (createError) {
          errors.push(`Fila ${rowIndex}: Error al crear prospecto - ${createError.message}`);
          console.error(`Error creando prospecto en fila ${rowIndex}:`, createError);
        }
      }

      setLastImportedIds(newProspectosIds);
      
      // Mostrar resultados
      let message = `✅ Importación completada exitosamente!\n\n`;
      message += `📊 Resumen:\n`;
      message += `• Registros importados: ${newProspectosIds.length}\n`;
      message += `• Registros fallidos: ${errors.length}\n`;
      
      if (warnings.length > 0) {
        message += `• Transformaciones aplicadas: ${warnings.length}\n`;
      }
      
      if (errors.length > 0) {
        message += `\n❌ Errores:\n`;
        const errorSummary = errors.length > 5 
            ? errors.slice(0, 5).join('\n') + `\n... y ${errors.length - 5} errores más.`
            : errors.join('\n');
        message += errorSummary;
      }
      
      if (warnings.length > 0 && warnings.length <= 10) {
        message += `\n\n🔧 Transformaciones:\n`;
        message += warnings.slice(0, 10).join('\n');
      }
      
      alert(message);
      
      // Si se importó al menos un registro, cerrar el diálogo
      if (newProspectosIds.length > 0) {
          setShowImportDialog(false);
          setImportStep(1);
          setImportData(null);
          setImportFile(null);
          setColumnMapping({});
          await fetchProspectos();
      }

    } catch (error) {
      console.error('Error importando prospectos:', error);
      alert('Error al importar prospectos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUndoImport = async () => {
    if (lastImportedIds.length === 0) {
      alert('No hay importación reciente para deshacer');
      return;
    }

    if (!confirm(`¿Estás seguro de deshacer la última importación? Se eliminarán ${lastImportedIds.length} prospectos.`)) {
      return;
    }

    setLoading(true);
    try {
      for (const id of lastImportedIds) {
        await ProspectosEntity.delete(id);
      }
      setLastImportedIds([]);
      await fetchProspectos();
      alert('Importación deshecha exitosamente');
    } catch (error) {
      console.error('Error deshaciendo importación:', error);
      alert('Error al deshacer la importación');
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadgeColor = (estado) => {
    const colors = {
      'Agendado': 'bg-blue-100 text-blue-800',
      'Asistió': 'bg-green-100 text-green-800',
      'No asistió': 'bg-red-100 text-red-800',
      'Reagendado': 'bg-yellow-100 text-yellow-800',
      'Compró (en sede)': 'bg-purple-100 text-purple-800',
      'Compró (online)': 'bg-indigo-100 text-indigo-800',
      'No compró': 'bg-gray-100 text-gray-800',
      'Perdido': 'bg-orange-100 text-orange-800',
      'No califica': 'bg-slate-100 text-slate-800'
    };
    return colors[estado] || 'bg-gray-100 text-gray-800';
  };

  const getSedeName = (sedeId) => {
    const sede = sucursales.find(s => s.id === sedeId);
    return sede?.nombre_sede || sedeId;
  };

  const getStaffName = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember?.nombre || staffId;
  };

  const getClaseName = (claseId) => {
    const clase = clases.find(c => c.id === claseId);
    return clase?.nombre_clase || 'N/A';
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      // Select only current page items for performance with large datasets
      setSelectedProspectos(prospectosPaginados.map(p => p.id));
    } else {
      setSelectedProspectos([]);
    }
  };

  // Select all filtered prospects (use with caution on large datasets)
  const handleSelectAllFiltered = () => {
    if (selectedProspectos.length === prospectosFiltrados.length) {
      setSelectedProspectos([]);
    } else {
      setSelectedProspectos(prospectosFiltrados.map(p => p.id));
    }
  };

  const handleSelectProspecto = (prospectoId, checked) => {
    if (checked) {
      setSelectedProspectos([...selectedProspectos, prospectoId]);
    } else {
      setSelectedProspectos(selectedProspectos.filter(id => id !== prospectoId));
    }
  };

  const handleEdicionMasiva = async (updates) => {
    setLoading(true);
    try {
      for (const prospectoId of selectedProspectos) {
        await ProspectosEntity.update(prospectoId, updates);
      }
      setShowEdicionMasivaDialog(false);
      setSelectedProspectos([]);
      await fetchProspectos();
      alert(`Se actualizaron ${selectedProspectos.length} prospectos exitosamente`);
    } catch (error) {
      console.error('Error en edición masiva:', error);
      alert('Error al actualizar prospectos');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedProspectos.length === 0) return;
    
    if (!confirm(`¿Estás seguro de eliminar ${selectedProspectos.length} prospecto(s) seleccionado(s)?`)) {
      return;
    }

    setLoading(true);
    try {
      for (const prospectoId of selectedProspectos) {
        await ProspectosEntity.delete(prospectoId);
      }
      setSelectedProspectos([]);
      await fetchProspectos();
      alert(`Se eliminaron ${selectedProspectos.length} prospectos exitosamente`);
    } catch (error) {
      console.error('Error eliminando prospectos:', error);
      alert('Error al eliminar prospectos');
    } finally {
      setLoading(false);
    }
  };

  // Mostrar mensaje de carga mientras se verifican permisos
  if (loadingPermisos) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Verificando permisos...</p>
      </div>
    );
  }

  // Verificar permiso básico de ver prospectos
  if (!tienePermiso('ver_prospectos')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-700 mb-2">Acceso Denegado</p>
          <p className="text-gray-500">No tienes permisos para ver esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Bandeja de Prospectos</h1>
        <div className="flex flex-wrap gap-2">
          {selectedProspectos.length > 0 && (
            <>
              {tienePermiso('editar_prospectos_masivo') && (
                <Button variant="outline" size="sm" onClick={() => setShowEdicionMasivaDialog(true)} className="text-xs sm:text-sm">
                  <CheckSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Editar {selectedProspectos.length}</span>
                  <span className="sm:hidden">Editar</span>
                </Button>
              )}
              {tienePermiso('eliminar_prospectos_masivo') && (
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteSelected}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300 text-xs sm:text-sm"
                >
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Eliminar {selectedProspectos.length}</span>
                  <span className="sm:hidden">Eliminar</span>
                </Button>
              )}
            </>
          )}
          {lastImportedIds.length > 0 && tienePermiso('deshacer_importacion') && (
            <Button variant="outline" size="sm" onClick={handleUndoImport} disabled={loading} className="text-xs sm:text-sm">
              <Undo2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Deshacer</span>
            </Button>
          )}
          {tienePermiso('exportar_prospectos') && (
            <Button variant="outline" size="sm" onClick={handleExportProspectos} disabled={loading} className="text-xs sm:text-sm">
              <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          )}
          {tienePermiso('importar_prospectos') && (
            <Button variant="outline" size="sm" onClick={() => document.getElementById('file-upload').click()} disabled={loading} className="text-xs sm:text-sm">
              <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Importar</span>
            </Button>
          )}
          <input
            id="file-upload"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
          {tienePermiso('crear_prospectos') && (
            <Button size="sm" onClick={() => setShowForm(!showForm)} className="text-xs sm:text-sm">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Nuevo Prospecto</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          )}
        </div>
      </div>

      {/* Formulario de Nuevo Prospecto */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Registrar Nuevo Prospecto</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre">Nombre Completo *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Nombre del prospecto"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="rut">RUT</Label>
                  <Input
                    id="rut"
                    value={formData.rut}
                    onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                    placeholder="12.345.678-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="correo">Correo Electrónico</Label>
                  <Input
                    id="correo"
                    type="email"
                    value={formData.correo}
                    onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="whatsapp">WhatsApp *</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="+56912345678"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fecha_ingreso">Fecha de Ingreso *</Label>
                  <Input
                    id="fecha_ingreso"
                    type="date"
                    value={formData.fecha_ingreso}
                    onChange={(e) => setFormData({ ...formData, fecha_ingreso: e.target.value })}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Fecha en que el prospecto ingresó al sistema</p>
                </div>
                <div>
                  <Label htmlFor="sede">Sede *</Label>
                  <Select
                    value={formData.sede}
                    onValueChange={(value) => setFormData({ ...formData, sede: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar sede" />
                    </SelectTrigger>
                    <SelectContent>
                      {sucursales.map((sede) => (
                        <SelectItem key={sede.id} value={sede.id}>
                          {sede.nombre_sede}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
                  <Input
                    id="fecha_nacimiento"
                    type="date"
                    value={formData.fecha_nacimiento}
                    onChange={(e) => {
                      const fechaNac = e.target.value;
                      setFormData({ ...formData, fecha_nacimiento: fechaNac });
                    }}
                  />
                  {formData.fecha_nacimiento && (() => {
                    const hoy = new Date();
                    const fechaNac = new Date(formData.fecha_nacimiento);
                    let edad = hoy.getFullYear() - fechaNac.getFullYear();
                    const mes = hoy.getMonth() - fechaNac.getMonth();
                    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
                      edad--;
                    }
                    return <p className="text-sm text-gray-600 mt-1">Edad: {edad} años</p>;
                  })()}
                </div>
                <div>
                  <Label htmlFor="clase_asistira">Clase que Asistirá</Label>
                  <Select
                    value={formData.clase_asistira}
                    onValueChange={(value) => setFormData({ ...formData, clase_asistira: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar clase" />
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
              </div>

              <div>
                <Label>Objetivos (puede seleccionar múltiples)</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {['Bajar de peso', 'Aumentar masa muscular', 'Distracción', 'Tonificar', 'Otros'].map((objetivo) => (
                    <div key={objetivo} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`objetivo-${objetivo}`}
                        checked={formData.objetivos.includes(objetivo)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, objetivos: [...formData.objetivos, objetivo] });
                          } else {
                            setFormData({ ...formData, objetivos: formData.objetivos.filter(o => o !== objetivo) });
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={`objetivo-${objetivo}`} className="text-sm font-normal cursor-pointer">
                        {objetivo}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vendedor_asignado">Vendedor Asignado *</Label>
                  <Select
                    value={formData.vendedor_asignado}
                    onValueChange={(value) => setFormData({ ...formData, vendedor_asignado: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((staffMember) => (
                        <SelectItem key={staffMember.id} value={staffMember.id}>
                          {staffMember.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tipo_invitacion">Tipo de Invitación</Label>
                  <Select
                    value={formData.tipo_invitacion}
                    onValueChange={(value) => setFormData({ ...formData, tipo_invitacion: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Invitación">Invitación</SelectItem>
                      <SelectItem value="Promesa de compra">Promesa de compra</SelectItem>
                      <SelectItem value="Venta online">Venta online</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3 text-gray-700">Fecha y Hora de Asistencia (Opcional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fecha_visita">Fecha de Visita</Label>
                    <Input
                      id="fecha_visita"
                      type="date"
                      value={formData.fecha_visita}
                      onChange={(e) => setFormData({ ...formData, fecha_visita: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hora_visita">Hora de Visita (Opcional)</Label>
                    <Select
                      value={formData.hora_visita}
                      onValueChange={(value) => setFormData({ ...formData, hora_visita: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar hora (por defecto 09:00)" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => {
                          const hora = i.toString().padStart(2, '0');
                          return (
                            <SelectItem key={hora} value={`${hora}:00`}>
                              {hora}:00
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {formData.fecha_visita && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ Se creará automáticamente un agendamiento para esta fecha{formData.hora_visita ? ` a las ${formData.hora_visita}` : ' a las 09:00 (hora por defecto)'}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="notas">Notas</Label>
                <Input
                  id="notas"
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  placeholder="Notas adicionales"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Buscador de texto */}
          <div className="mb-4">
            <Label htmlFor="search-query">Buscar por Nombre o WhatsApp</Label>
            <Input
              id="search-query"
              type="text"
              placeholder="Escribe nombre o número de WhatsApp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
            {searchQuery && (
              <p className="text-xs text-gray-500 mt-1">
                Mostrando {prospectosFiltrados.length} de {prospectos.length} prospectos
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="filter-fecha-inicio">Fecha Inicio</Label>
              <Input
                id="filter-fecha-inicio"
                type="date"
                value={filters.fechaInicio}
                onChange={(e) => setFilters({ ...filters, fechaInicio: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="filter-fecha-fin">Fecha Fin</Label>
              <Input
                id="filter-fecha-fin"
                type="date"
                value={filters.fechaFin}
                onChange={(e) => setFilters({ ...filters, fechaFin: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="filter-sede">Sede</Label>
              <Select
                value={filters.sede}
                onValueChange={(value) => setFilters({ ...filters, sede: value })}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="filter-vendedor">Vendedor</Label>
              <Select
                value={filters.vendedor}
                onValueChange={(value) => setFilters({ ...filters, vendedor: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los vendedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los vendedores</SelectItem>
                  {staff.map((staffMember) => (
                    <SelectItem key={staffMember.id} value={staffMember.id}>
                      {staffMember.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filter-estado">Estado</Label>
              <Select
                value={filters.estado}
                onValueChange={(value) => setFilters({ ...filters, estado: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {estados.map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filter-tipo">Tipo Invitación</Label>
              <Select
                value={filters.tipo_invitacion}
                onValueChange={(value) => setFilters({ ...filters, tipo_invitacion: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="Invitación">Invitación</SelectItem>
                  <SelectItem value="Promesa de compra">Promesa de compra</SelectItem>
                  <SelectItem value="Venta online">Venta online</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Prospectos */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-lg sm:text-xl">
              Prospectos ({totalRecords.toLocaleString()})
              {totalPages > 1 && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  - Página {currentPage} de {totalPages.toLocaleString()}
                </span>
              )}
            </CardTitle>
            {selectedProspectos.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">{selectedProspectos.length} seleccionado(s)</span>
                {selectedProspectos.length < prospectosFiltrados.length && prospectosFiltrados.length <= 1000 && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleSelectAllFiltered}
                    className="text-blue-600 p-0 h-auto"
                  >
                    Seleccionar todos ({prospectosFiltrados.length})
                  </Button>
                )}
                {selectedProspectos.length > 0 && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setSelectedProspectos([])}
                    className="text-gray-500 p-0 h-auto"
                  >
                    Limpiar selección
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : prospectosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No hay prospectos{searchQuery ? ' que coincidan con la búsqueda' : ''}</div>
          ) : (
            <>
              {/* Vista de Tarjetas para Móvil */}
              <div className="block md:hidden space-y-3">
                {prospectosPaginados.map((prospecto) => (
                  <div 
                    key={prospecto.id} 
                    id={`prospecto-${prospecto.id}`}
                    className="border rounded-lg p-3 bg-white shadow-sm transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedProspectos.includes(prospecto.id)}
                          onChange={(e) => handleSelectProspecto(prospecto.id, e.target.checked)}
                          className="rounded border-gray-300 mt-1"
                        />
                        <div>
                          <h3 className="font-semibold text-sm">{prospecto.nombre}</h3>
                          <p className="text-xs text-gray-500">{prospecto.whatsapp}</p>
                        </div>
                      </div>
                      <Badge className={getEstadoBadgeColor(prospecto.estado_pipeline)} className="text-xs">
                        {prospecto.estado_pipeline}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div>
                        <span className="text-gray-500">Sede:</span>
                        <p className="font-medium">{getSedeName(prospecto.sede)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Vendedor:</span>
                        <p className="font-medium">{getStaffName(prospecto.vendedor_asignado)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Clase:</span>
                        <p className="font-medium">{getClaseName(prospecto.clase_asistira)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Tipo:</span>
                        <Badge variant="outline" className="text-xs">{prospecto.tipo_invitacion}</Badge>
                      </div>
                      {prospecto.fecha_visita && (
                        <div className="col-span-2">
                          <span className="text-gray-500">Fecha Visita:</span>
                          <p className="font-medium">
                            {prospecto.fecha_visita.includes('T') 
                              ? format(new Date(prospecto.fecha_visita), 'dd/MM/yyyy HH:mm')
                              : format(new Date(prospecto.fecha_visita + 'T00:00:00'), 'dd/MM/yyyy')
                            }
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-1 pt-2 border-t">
                      {tienePermiso('editar_prospectos') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            setSelectedProspecto(prospecto);
                            setFormData({
                              nombre: prospecto.nombre,
                              rut: prospecto.rut || '',
                              correo: prospecto.correo || '',
                              fecha_nacimiento: prospecto.fecha_nacimiento || '',
                              fecha_ingreso: prospecto.fecha_ingreso || format(new Date(), 'yyyy-MM-dd'),
                              objetivos: prospecto.objetivos || [],
                              clase_asistira: prospecto.clase_asistira || '',
                              whatsapp: prospecto.whatsapp,
                              sede: prospecto.sede,
                              vendedor_asignado: prospecto.vendedor_asignado,
                              tipo_invitacion: prospecto.tipo_invitacion,
                              fecha_visita: prospecto.fecha_visita || '',
                              hora_visita: '',
                              estado_pipeline: prospecto.estado_pipeline,
                              notas: prospecto.notas || ''
                            });
                            
                            try {
                              const agendamientosProspecto = await Agendamientos.filter(
                                { prospecto_id: prospecto.id },
                                '-fecha_hora',
                                1
                              );
                              if (agendamientosProspecto && agendamientosProspecto.length > 0) {
                                const ultimoAgendamiento = agendamientosProspecto[0];
                                setFechaVisitaAgendada(ultimoAgendamiento.fecha_hora);
                              } else {
                                setFechaVisitaAgendada(null);
                              }
                            } catch (error) {
                              console.error('Error cargando fecha de visita:', error);
                              setFechaVisitaAgendada(null);
                            }
                            
                            setShowEditDialog(true);
                          }}
                          title="Corregir Prospecto"
                          className="flex-1"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          setSelectedProspecto(prospecto);
                          try {
                            const agendamientosProspecto = await Agendamientos.filter(
                              { prospecto_id: prospecto.id },
                              '-fecha_hora',
                              1
                            );
                            if (agendamientosProspecto && agendamientosProspecto.length > 0) {
                              const ultimoAgendamiento = agendamientosProspecto[0];
                              setAgendaFormData({
                                fecha_hora: ultimoAgendamiento.fecha_hora || '',
                                tipo_visita: ultimoAgendamiento.tipo_visita || 'Invitación',
                                notas: ''
                              });
                            } else {
                              setAgendaFormData({
                                fecha_hora: '',
                                tipo_visita: 'Invitación',
                                notas: ''
                              });
                            }
                          } catch (error) {
                            console.error('Error cargando agendamientos:', error);
                            setAgendaFormData({
                              fecha_hora: '',
                              tipo_visita: 'Invitación',
                              notas: ''
                            });
                          }
                          setShowAgendaDialog(true);
                        }}
                        title="Crear Agendamiento"
                        className="flex-1"
                      >
                        <Calendar className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedProspecto(prospecto);
                          setShowVentaDialog(true);
                        }}
                        title="Registrar Venta"
                        className="flex-1"
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </Button>
                      {tienePermiso('eliminar_prospectos') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProspecto(prospecto.id)}
                          title="Eliminar Prospecto"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Mobile Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col items-center gap-3 mt-4 pt-4 border-t">
                    <span className="text-sm text-gray-600">
                      Mostrando {startIndex + 1}-{endIndex} de {totalRecords.toLocaleString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronsLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="px-3 text-sm font-medium">
                        {currentPage} / {totalPages.toLocaleString()}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronsRight className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Por página:</Label>
                      <Select
                        value={pageSize.toString()}
                        onValueChange={(value) => setPageSize(parseInt(value, 10))}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Vista de Tabla para Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={prospectosPaginados.length > 0 && prospectosPaginados.every(p => selectedProspectos.includes(p.id))}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300"
                        title="Seleccionar página actual"
                      />
                    </TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>RUT</TableHead>
                    <TableHead>Edad</TableHead>
                    <TableHead>Fecha Ingreso</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Clase</TableHead>
                    <TableHead>Sede</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha Visita</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                 <TableBody>
                  {prospectosPaginados.map((prospecto) => (
                    <TableRow 
                      key={prospecto.id}
                      id={`prospecto-${prospecto.id}`}
                      className="transition-all duration-300"
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedProspectos.includes(prospecto.id)}
                          onChange={(e) => handleSelectProspecto(prospecto.id, e.target.checked)}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{prospecto.nombre}</TableCell>
                      <TableCell>{prospecto.rut || '-'}</TableCell>
                      <TableCell>{prospecto.edad ? `${prospecto.edad} años` : '-'}</TableCell>
                      <TableCell>{prospecto.fecha_ingreso ? format(new Date(prospecto.fecha_ingreso), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell>{prospecto.whatsapp}</TableCell>
                      <TableCell>{getClaseName(prospecto.clase_asistira)}</TableCell>
                      <TableCell>{getSedeName(prospecto.sede)}</TableCell>
                      <TableCell>{getStaffName(prospecto.vendedor_asignado)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{prospecto.tipo_invitacion}</Badge>
                      </TableCell>
                      <TableCell>
                        {prospecto.fecha_visita ? (
                          <span className="text-sm">
                            {prospecto.fecha_visita.includes('T') 
                              ? format(new Date(prospecto.fecha_visita), 'dd/MM/yyyy HH:mm')
                              : format(new Date(prospecto.fecha_visita + 'T00:00:00'), 'dd/MM/yyyy')
                            }
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getEstadoBadgeColor(prospecto.estado_pipeline)}>
                          {prospecto.estado_pipeline}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          {tienePermiso('editar_prospectos') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                setSelectedProspecto(prospecto);
                                setFormData({
                                  nombre: prospecto.nombre,
                                  rut: prospecto.rut || '',
                                  correo: prospecto.correo || '',
                                  fecha_nacimiento: prospecto.fecha_nacimiento || '',
                                  fecha_ingreso: prospecto.fecha_ingreso || format(new Date(), 'yyyy-MM-dd'),
                                  objetivos: prospecto.objetivos || [],
                                  clase_asistira: prospecto.clase_asistira || '',
                                  whatsapp: prospecto.whatsapp,
                                  sede: prospecto.sede,
                                  vendedor_asignado: prospecto.vendedor_asignado,
                                  tipo_invitacion: prospecto.tipo_invitacion,
                                  fecha_visita: prospecto.fecha_visita || '',
                                  hora_visita: '',
                                  estado_pipeline: prospecto.estado_pipeline,
                                  notas: prospecto.notas || ''
                                });
                                
                                // Cargar la fecha del último agendamiento
                                try {
                                  const agendamientosProspecto = await Agendamientos.filter(
                                    { prospecto_id: prospecto.id },
                                    '-fecha_hora',
                                    1
                                  );
                                  if (agendamientosProspecto && agendamientosProspecto.length > 0) {
                                    const ultimoAgendamiento = agendamientosProspecto[0];
                                    setFechaVisitaAgendada(ultimoAgendamiento.fecha_hora);
                                  } else {
                                    setFechaVisitaAgendada(null);
                                  }
                                } catch (error) {
                                  console.error('Error cargando fecha de visita:', error);
                                  setFechaVisitaAgendada(null);
                                }
                                
                                setShowEditDialog(true);
                              }}
                              title="Corregir Prospecto"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              setSelectedProspecto(prospecto);
                              // Cargar el último agendamiento del prospecto
                              try {
                                const agendamientosProspecto = await Agendamientos.filter(
                                  { prospecto_id: prospecto.id },
                                  '-fecha_hora',
                                  1
                                );
                                if (agendamientosProspecto && agendamientosProspecto.length > 0) {
                                  const ultimoAgendamiento = agendamientosProspecto[0];
                                  // Pre-cargar la fecha del último agendamiento
                                  setAgendaFormData({
                                    fecha_hora: ultimoAgendamiento.fecha_hora || '',
                                    tipo_visita: ultimoAgendamiento.tipo_visita || 'Invitación',
                                    notas: ''
                                  });
                                } else {
                                  // Si no hay agendamientos previos, limpiar el formulario
                                  setAgendaFormData({
                                    fecha_hora: '',
                                    tipo_visita: 'Invitación',
                                    notas: ''
                                  });
                                }
                              } catch (error) {
                                console.error('Error cargando agendamientos:', error);
                                setAgendaFormData({
                                  fecha_hora: '',
                                  tipo_visita: 'Invitación',
                                  notas: ''
                                });
                              }
                              setShowAgendaDialog(true);
                            }}
                            title="Crear Agendamiento"
                          >
                            <Calendar className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedProspecto(prospecto);
                              setShowVentaDialog(true);
                            }}
                            title="Registrar Venta"
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </Button>
                          {tienePermiso('eliminar_prospectos') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProspecto(prospecto.id)}
                              title="Eliminar Prospecto"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
                  {/* Info and Page Size */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-gray-600">
                    <span>
                      Mostrando {startIndex + 1}-{endIndex} de {totalRecords.toLocaleString()} prospectos
                    </span>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="page-size" className="text-sm whitespace-nowrap">Por página:</Label>
                      <Select
                        value={pageSize.toString()}
                        onValueChange={(value) => setPageSize(parseInt(value, 10))}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                          <SelectItem value="250">250</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Pagination Buttons */}
                  <div className="flex items-center gap-1">
                    {/* First Page */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(1)}
                      disabled={currentPage === 1}
                      title="Primera página"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </Button>

                    {/* Previous Page */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      title="Página anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>

                    {/* Page Numbers */}
                    <div className="hidden sm:flex items-center gap-1">
                      {getPaginationRange().map((page, index) => (
                        page === '...' ? (
                          <span key={`dots-${index}`} className="px-2 text-gray-400">...</span>
                        ) : (
                          <Button
                            key={page}
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => goToPage(page)}
                            className="min-w-[36px]"
                          >
                            {page.toLocaleString()}
                          </Button>
                        )
                      ))}
                    </div>

                    {/* Mobile Page Info */}
                    <span className="sm:hidden px-3 text-sm">
                      {currentPage} / {totalPages.toLocaleString()}
                    </span>

                    {/* Next Page */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      title="Página siguiente"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>

                    {/* Last Page */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(totalPages)}
                      disabled={currentPage === totalPages}
                      title="Última página"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Jump to Page */}
                  <form onSubmit={handleJumpToPage} className="flex items-center gap-2">
                    <Label htmlFor="jump-to-page" className="text-sm whitespace-nowrap">Ir a:</Label>
                    <Input
                      id="jump-to-page"
                      type="number"
                      min="1"
                      max={totalPages}
                      value={jumpToPage}
                      onChange={(e) => setJumpToPage(e.target.value)}
                      placeholder={currentPage.toString()}
                      className="w-20"
                    />
                    <Button type="submit" variant="outline" size="sm">
                      Ir
                    </Button>
                  </form>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog Crear Agendamiento */}
      <Dialog open={showAgendaDialog} onOpenChange={setShowAgendaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Agendamiento - {selectedProspecto?.nombre}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAgendamiento} className="space-y-4">
            <div>
              <Label htmlFor="fecha_hora">Fecha y Hora</Label>
              <Input
                id="fecha_hora"
                type="datetime-local"
                value={agendaFormData.fecha_hora}
                onChange={(e) => setAgendaFormData({ ...agendaFormData, fecha_hora: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="tipo_visita">Tipo de Visita</Label>
              <Select
                value={agendaFormData.tipo_visita}
                onValueChange={(value) => setAgendaFormData({ ...agendaFormData, tipo_visita: value })}
              >
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
            <div>
              <Label htmlFor="notas_agenda">Notas</Label>
              <Input
                id="notas_agenda"
                value={agendaFormData.notas}
                onChange={(e) => setAgendaFormData({ ...agendaFormData, notas: e.target.value })}
                placeholder="Notas adicionales"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Crear Agendamiento'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowAgendaDialog(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Prospecto */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) setFechaVisitaAgendada(null);
      }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Corregir Prospecto - {selectedProspecto?.nombre}</DialogTitle>
          </DialogHeader>
          
          {fechaVisitaAgendada && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>📅 Fecha de Visita Agendada:</strong> {format(new Date(fechaVisitaAgendada), 'dd/MM/yyyy HH:mm')}
              </p>
            </div>
          )}
          
          <form onSubmit={handleEditProspecto} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-nombre">Nombre Completo *</Label>
                <Input
                  id="edit-nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Nombre del prospecto"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-rut">RUT</Label>
                <Input
                  id="edit-rut"
                  value={formData.rut}
                  onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                  placeholder="12.345.678-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-correo">Correo Electrónico</Label>
                <Input
                  id="edit-correo"
                  type="email"
                  value={formData.correo}
                  onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div>
                <Label htmlFor="edit-whatsapp">WhatsApp *</Label>
                <Input
                  id="edit-whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="+56912345678"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-fecha-ingreso">Fecha de Ingreso *</Label>
                <Input
                  id="edit-fecha-ingreso"
                  type="date"
                  value={formData.fecha_ingreso}
                  onChange={(e) => setFormData({ ...formData, fecha_ingreso: e.target.value })}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Fecha en que el prospecto ingresó al sistema</p>
              </div>
              <div>
                <Label htmlFor="edit-fecha-nacimiento">Fecha de Nacimiento</Label>
                <Input
                  id="edit-fecha-nacimiento"
                  type="date"
                  value={formData.fecha_nacimiento}
                  onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                />
                {formData.fecha_nacimiento && (() => {
                  const hoy = new Date();
                  const fechaNac = new Date(formData.fecha_nacimiento);
                  let edad = hoy.getFullYear() - fechaNac.getFullYear();
                  const mes = hoy.getMonth() - fechaNac.getMonth();
                  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
                    edad--;
                  }
                  return <p className="text-sm text-gray-600 mt-1">Edad: {edad} años</p>;
                })()}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-clase">Clase que Asistirá</Label>
                <Select
                  value={formData.clase_asistira}
                  onValueChange={(value) => setFormData({ ...formData, clase_asistira: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar clase" />
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
            </div>

            <div>
              <Label>Objetivos (puede seleccionar múltiples)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {['Bajar de peso', 'Aumentar masa muscular', 'Distracción', 'Tonificar', 'Otros'].map((objetivo) => (
                  <div key={objetivo} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`edit-objetivo-${objetivo}`}
                      checked={formData.objetivos.includes(objetivo)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, objetivos: [...formData.objetivos, objetivo] });
                        } else {
                          setFormData({ ...formData, objetivos: formData.objetivos.filter(o => o !== objetivo) });
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor={`edit-objetivo-${objetivo}`} className="text-sm font-normal cursor-pointer">
                      {objetivo}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-sede">Sede *</Label>
                <Select
                  value={formData.sede}
                  onValueChange={(value) => setFormData({ ...formData, sede: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sede" />
                  </SelectTrigger>
                  <SelectContent>
                    {sucursales.map((sede) => (
                      <SelectItem key={sede.id} value={sede.id}>
                        {sede.nombre_sede}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-vendedor">Vendedor Asignado *</Label>
                <Select
                  value={formData.vendedor_asignado}
                  onValueChange={(value) => setFormData({ ...formData, vendedor_asignado: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((staffMember) => (
                      <SelectItem key={staffMember.id} value={staffMember.id}>
                        {staffMember.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-tipo">Tipo de Invitación</Label>
                <Select
                  value={formData.tipo_invitacion}
                  onValueChange={(value) => setFormData({ ...formData, tipo_invitacion: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Invitación">Invitación</SelectItem>
                    <SelectItem value="Promesa de compra">Promesa de compra</SelectItem>
                    <SelectItem value="Venta online">Venta online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-estado">Estado</Label>
                <Select
                  value={formData.estado_pipeline}
                  onValueChange={(value) => setFormData({ ...formData, estado_pipeline: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {estados.map((estado) => (
                      <SelectItem key={estado} value={estado}>
                        {estado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-notas">Notas</Label>
              <Input
                id="edit-notas"
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Notas adicionales"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
              <Button type="button" variant="outline" onClick={() => {
                setShowEditDialog(false);
                setFechaVisitaAgendada(null);
              }}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Registrar Venta */}
      <Dialog open={showVentaDialog} onOpenChange={setShowVentaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Venta - {selectedProspecto?.nombre}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateVenta} className="space-y-4">
            <div>
              <Label htmlFor="tipo_venta">Tipo de Venta</Label>
              <Select
                value={ventaFormData.tipo_venta}
                onValueChange={(value) => setVentaFormData({ ...ventaFormData, tipo_venta: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="En sede">En sede</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fecha_venta">Fecha de Venta</Label>
              <Input
                id="fecha_venta"
                type="date"
                value={ventaFormData.fecha_venta}
                onChange={(e) => setVentaFormData({ ...ventaFormData, fecha_venta: e.target.value })}
                required
              />
            </div>
            {ventaFormData.tipo_venta === 'En sede' && (
              <div>
                <Label htmlFor="cerrador">Cerrador</Label>
                <Select
                  value={ventaFormData.cerrador}
                  onValueChange={(value) => setVentaFormData({ ...ventaFormData, cerrador: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cerrador" />
                  </SelectTrigger>
                  <SelectContent>
                    {cerradores.map((cerrador) => (
                      <SelectItem key={cerrador.id} value={cerrador.id}>
                        {cerrador.nombre_cerrador}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="plan">Plan</Label>
              <Select
                value={ventaFormData.plan}
                onValueChange={(value) => {
                  const planSeleccionado = planes.find(p => p.id === value);
                  setVentaFormData({ 
                    ...ventaFormData, 
                    plan: value,
                    monto: planSeleccionado?.precio || ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plan" />
                </SelectTrigger>
                <SelectContent>
                  {planes.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.nombre_plan} ({plan.tipo}) {plan.precio ? `- $${plan.precio}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="monto">Monto</Label>
                <Input
                  id="monto"
                  type="number"
                  min="0"
                  step="0.01"
                  value={ventaFormData.monto}
                  onChange={(e) => setVentaFormData({ ...ventaFormData, monto: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="descuento">Descuento</Label>
                <Input
                  id="descuento"
                  type="number"
                  min="0"
                  step="0.01"
                  value={ventaFormData.descuento}
                  onChange={(e) => setVentaFormData({ ...ventaFormData, descuento: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notas_venta">Notas</Label>
              <Input
                id="notas_venta"
                value={ventaFormData.notas}
                onChange={(e) => setVentaFormData({ ...ventaFormData, notas: e.target.value })}
                placeholder="Notas adicionales"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Registrar Venta'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowVentaDialog(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Importar Prospectos */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>🚀 Importar Prospectos - Mapeo Inteligente</DialogTitle>
          </DialogHeader>
          
          {importData && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-medium mb-2">
                  ✨ <strong>Sistema Inteligente Activado</strong>
                </p>
                <p className="text-xs text-blue-700">
                  • Las columnas se han mapeado automáticamente<br/>
                  • Se limpiarán emojis, espacios en WhatsApp y prefijos de vendedores<br/>
                  • Las fechas en español se convertirán automáticamente a formato ISO<br/>
                  • Los campos marcados con * son obligatorios
                </p>
              </div>
              
              {/* Vista previa de transformaciones */}
              {importData.rows.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-900 mb-2">
                    📋 Vista Previa (Primera Fila)
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {columnMapping.nombre && importData.rows[0][columnMapping.nombre] && (
                      <div>
                        <span className="font-medium text-gray-700">Nombre:</span>
                        <div className="text-gray-600">
                          Original: {String(importData.rows[0][columnMapping.nombre]).substring(0, 30)}
                          {cleanText(importData.rows[0][columnMapping.nombre]) !== importData.rows[0][columnMapping.nombre] && (
                            <div className="text-green-600">→ Limpio: {cleanText(importData.rows[0][columnMapping.nombre]).substring(0, 30)}</div>
                          )}
                        </div>
                      </div>
                    )}
                    {columnMapping.whatsapp && importData.rows[0][columnMapping.whatsapp] && (
                      <div>
                        <span className="font-medium text-gray-700">WhatsApp:</span>
                        <div className="text-gray-600">
                          Original: {String(importData.rows[0][columnMapping.whatsapp])}
                          {cleanWhatsApp(importData.rows[0][columnMapping.whatsapp]) !== importData.rows[0][columnMapping.whatsapp] && (
                            <div className="text-green-600">→ Limpio: {cleanWhatsApp(importData.rows[0][columnMapping.whatsapp])}</div>
                          )}
                        </div>
                      </div>
                    )}
                    {columnMapping.vendedor_asignado && importData.rows[0][columnMapping.vendedor_asignado] && (
                      <div>
                        <span className="font-medium text-gray-700">Vendedor:</span>
                        <div className="text-gray-600">
                          Original: {String(importData.rows[0][columnMapping.vendedor_asignado])}
                          {cleanVendorName(importData.rows[0][columnMapping.vendedor_asignado]) !== importData.rows[0][columnMapping.vendedor_asignado] && (
                            <div className="text-green-600">→ Limpio: {cleanVendorName(importData.rows[0][columnMapping.vendedor_asignado])}</div>
                          )}
                        </div>
                      </div>
                    )}
                    {columnMapping.fecha_visita && importData.rows[0][columnMapping.fecha_visita] && (
                      <div>
                        <span className="font-medium text-gray-700">Fecha Visita:</span>
                        <div className="text-gray-600">
                          Original: {String(importData.rows[0][columnMapping.fecha_visita]).substring(0, 40)}
                          {(() => {
                            const horaCol = importData.headers.find(h => String(h).toLowerCase().includes('hora'));
                            const horaVal = horaCol ? importData.rows[0][horaCol] : '';
                            const converted = parseSpanishDate(importData.rows[0][columnMapping.fecha_visita], horaVal);
                            return converted && converted !== importData.rows[0][columnMapping.fecha_visita] ? (
                              <div className="text-green-600">→ ISO: {converted}</div>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre * (Campo del Sistema)</Label>
                    <Select
                      value={columnMapping.nombre || ''}
                      onValueChange={(value) => setColumnMapping({ ...columnMapping, nombre: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar columna del archivo" />
                      </SelectTrigger>
                      <SelectContent>
                        {importData.headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>WhatsApp * (Campo del Sistema)</Label>
                    <Select
                      value={columnMapping.whatsapp || ''}
                      onValueChange={(value) => setColumnMapping({ ...columnMapping, whatsapp: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar columna del archivo" />
                      </SelectTrigger>
                      <SelectContent>
                        {importData.headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Sede * (Campo del Sistema)</Label>
                    <Select
                      value={columnMapping.sede || ''}
                      onValueChange={(value) => setColumnMapping({ ...columnMapping, sede: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar columna del archivo" />
                      </SelectTrigger>
                      <SelectContent>
                        {importData.headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">Debe coincidir con el nombre exacto de la sede</p>
                  </div>

                  <div>
                    <Label>Vendedor Asignado * (Campo del Sistema)</Label>
                    <Select
                      value={columnMapping.vendedor_asignado || ''}
                      onValueChange={(value) => setColumnMapping({ ...columnMapping, vendedor_asignado: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar columna del archivo" />
                      </SelectTrigger>
                      <SelectContent>
                        {importData.headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">Debe coincidir con el nombre exacto del vendedor</p>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <h4 className="text-sm font-medium mb-3">Campos Opcionales</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>RUT</Label>
                      <Select
                        value={columnMapping.rut || ''}
                        onValueChange={(value) => setColumnMapping({ ...columnMapping, rut: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar columna del archivo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip_column">No mapear</SelectItem>
                          {importData.headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Correo</Label>
                      <Select
                        value={columnMapping.correo || ''}
                        onValueChange={(value) => setColumnMapping({ ...columnMapping, correo: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar columna del archivo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip_column">No mapear</SelectItem>
                          {importData.headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <Label>Fecha de Ingreso</Label>
                      <Select
                        value={columnMapping.fecha_ingreso || ''}
                        onValueChange={(value) => setColumnMapping({ ...columnMapping, fecha_ingreso: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar columna del archivo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip_column">No mapear</SelectItem>
                          {importData.headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">Fecha de registro en el sistema</p>
                    </div>

                    <div>
                      <Label>Fecha de Nacimiento</Label>
                      <Select
                        value={columnMapping.fecha_nacimiento || ''}
                        onValueChange={(value) => setColumnMapping({ ...columnMapping, fecha_nacimiento: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar columna del archivo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip_column">No mapear</SelectItem>
                          {importData.headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <Label>Clase que Asistirá</Label>
                      <Select
                        value={columnMapping.clase_asistira || ''}
                        onValueChange={(value) => setColumnMapping({ ...columnMapping, clase_asistira: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar columna del archivo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip_column">No mapear</SelectItem>
                          {importData.headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">Debe coincidir con el nombre exacto de la clase</p>
                    </div>

                    <div>
                      <Label>Objetivos</Label>
                      <Select
                        value={columnMapping.objetivos || ''}
                        onValueChange={(value) => setColumnMapping({ ...columnMapping, objetivos: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar columna del archivo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip_column">No mapear</SelectItem>
                          {importData.headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">Separados por comas</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <Label>Tipo de Invitación</Label>
                      <Select
                        value={columnMapping.tipo_invitacion || ''}
                        onValueChange={(value) => setColumnMapping({ ...columnMapping, tipo_invitacion: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar columna del archivo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip_column">No mapear</SelectItem>
                          {importData.headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Estado</Label>
                      <Select
                        value={columnMapping.estado_pipeline || ''}
                        onValueChange={(value) => setColumnMapping({ ...columnMapping, estado_pipeline: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar columna del archivo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip_column">No mapear</SelectItem>
                          {importData.headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <Label>Fecha de Visita</Label>
                      <Select
                        value={columnMapping.fecha_visita || ''}
                        onValueChange={(value) => setColumnMapping({ ...columnMapping, fecha_visita: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar columna del archivo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip_column">No mapear</SelectItem>
                          {importData.headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Notas</Label>
                      <Select
                        value={columnMapping.notas || ''}
                        onValueChange={(value) => setColumnMapping({ ...columnMapping, notas: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar columna del archivo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip_column">No mapear</SelectItem>
                          {importData.headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>Vista previa:</strong> Se importarán {importData.totalRows} filas
                </p>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleImportProspectos} 
                  disabled={loading || !columnMapping.nombre || !columnMapping.whatsapp || !columnMapping.sede || !columnMapping.vendedor_asignado}
                >
                  {loading ? 'Importando...' : 'Importar Prospectos'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowImportDialog(false);
                    setImportStep(1);
                    setImportData(null);
                    setImportFile(null);
                    setColumnMapping({});
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Edición Masiva */}
      <EdicionMasivaDialog
        open={showEdicionMasivaDialog}
        onOpenChange={setShowEdicionMasivaDialog}
        selectedCount={selectedProspectos.length}
        onApply={handleEdicionMasiva}
        sucursales={sucursales}
        staff={staff}
        clases={clases}
        loading={loading}
      />
    </div>
  );
}