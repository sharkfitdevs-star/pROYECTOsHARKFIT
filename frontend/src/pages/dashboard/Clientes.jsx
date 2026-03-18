import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Search, Filter, Plus, Download, Upload, Calendar, AlertCircle, CheckCircle, Clock, FileDown, ChevronLeft, ChevronRight, Pencil, Trash2, Eye } from 'lucide-react';
import { Clientes } from '@/entities/Clientes';
import { Ciclos_Retencion } from '@/entities/Ciclos_Retencion';
import { Sucursales } from '@/entities/Sucursales';
import { Planes_Servicios } from '@/entities/Planes_Servicios';
import { Staff } from '@/entities/Staff';
import { Cerradores } from '@/entities/Cerradores';
import moment from 'moment';
import axios from 'axios';
import CrearClienteDialog from '@/components/CrearClienteDialog';
import EditarClienteDialog from '@/components/EditarClienteDialog';
import HistorialClienteDialog from '@/components/HistorialClienteDialog';
import { Ventas } from '@/entities/Ventas';
import { Prospectos } from '@/entities/Prospectos';
import { sincronizarClienteDesdeVenta } from '@/components/SyncClientesHelper';
import { useToast } from '@/components/ui/use-toast';
import RegistrarVentaDialog from '@/components/RegistrarVentaDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RegistrarContactoDialog from '@/components/RegistrarContactoDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Seguimiento_Renovaciones } from '@/entities/Seguimiento_Renovaciones';
import { Seguimiento_Online } from '@/entities/Seguimiento_Online';
import DarDeBajaDialog from '@/components/DarDeBajaDialog';
import ProgramarBajaDialog from '@/components/ProgramarBajaDialog';
import CrearDeudorDialog from '@/components/CrearDeudorDialog';
import ProgramarPausaDialog from '@/components/ProgramarPausaDialog';
import { Bajas_Programadas } from '@/entities/Bajas_Programadas';
import { Deudores } from '@/entities/Deudores';
import DashboardRetencionSede from '@/components/DashboardRetencionSede';

const ITEMS_PER_PAGE = 25;

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [currentPageGeneral, setCurrentPageGeneral] = useState(1);
  const [currentPageVencimientos, setCurrentPageVencimientos] = useState(1);
  
  // Catálogos
  const [sedes, setSedes] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [staff, setStaff] = useState([]);
  const [cerradores, setCerradores] = useState([]);
  
  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [sedeFilter, setSedeFilter] = useState('todas');
  const [planFilter, setPlanFilter] = useState('todos');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [modalidadFilter, setModalidadFilter] = useState('todas');
  const [canalFilter, setCanalFilter] = useState('todos');
  
  // Dialogs
  const [crearDialogOpen, setCrearDialogOpen] = useState(false);
  const [editarDialogOpen, setEditarDialogOpen] = useState(false);
  const [historialDialogOpen, setHistorialDialogOpen] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  
  // Importación
  const [importando, setImportando] = useState(false);
  
  // Sincronización masiva
const [sincronizando, setSincronizando] = useState(false);
  const [renovacionDialogOpen, setRenovacionDialogOpen] = useState(false);
  const [prospectoParaRenovacion, setProspectoParaRenovacion] = useState(null);
  const [ciclosMes, setCiclosMes] = useState([]);
  const { toast } = useToast();
  
  // Nuevos estados para Vencimientos del Mes
  const [clientesSeleccionados, setClientesSeleccionados] = useState([]);
  const [tipoItemFilter, setTipoItemFilter] = useState('todos');
  const [contactoDialogOpen, setContactoDialogOpen] = useState(false);
  const [clienteParaContacto, setClienteParaContacto] = useState(null);
  const [seguimientos, setSeguimientos] = useState([]);
  const [seguimientosOnline, setSeguimientosOnline] = useState([]);
  
  // Filtros para Vencimientos del Mes
  const [sedeVencimientoFilter, setSedeVencimientoFilter] = useState('todas');
  const [periodoVencimientoFilter, setPeriodoVencimientoFilter] = useState('este_mes');
  
  // Dialog de Dar de Baja
  const [darDeBajaDialogOpen, setDarDeBajaDialogOpen] = useState(false);
  const [clienteParaBaja, setClienteParaBaja] = useState(null);
  
  // Dialog de Programar Baja
  const [programarBajaDialogOpen, setProgramarBajaDialogOpen] = useState(false);
  const [bajasProgramadas, setBajasProgramadas] = useState([]);
  const [deudoresList, setDeudoresList] = useState([]);
  
  // Dialog de Crear Deudor
  const [crearDeudorDialogOpen, setCrearDeudorDialogOpen] = useState(false);
  
  // Dialog de Programar Pausa
  const [programarPausaDialogOpen, setProgramarPausaDialogOpen] = useState(false);

  useEffect(() => {
    cargarDatos();
    generarAlertasAutomaticas();
  }, []);

  const generarAlertasAutomaticas = async () => {
    try {
      // Llamar a la función backend para generar alertas automáticas
      await axios.post('/api/generarAlertasRenovacion', {}, {
        headers: {
          'x-api-key': window.config.apiKey
        }
      });
    } catch (error) {
      console.error('Error generando alertas automáticas:', error);
      // No mostrar error al usuario, es un proceso en segundo plano
    }
  };

  useEffect(() => {
    aplicarFiltros();
  }, [clientes, busqueda, sedeFilter, planFilter, estadoFilter, modalidadFilter, canalFilter]);

  // Reset vencimientos page when its filters change
  useEffect(() => {
    setCurrentPageVencimientos(1);
  }, [sedeVencimientoFilter, tipoItemFilter, periodoVencimientoFilter]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [clientesData, sedesData, planesData, staffData, cerradoresData, ciclosData, seguimientosData, seguimientosOnlineData, bajasData, deudoresData] = await Promise.all([
        Clientes.list('-createdAt'),
        Sucursales.list('nombre_sede'),
        Planes_Servicios.list('nombre_plan'),
        Staff.list('nombre'),
        Cerradores.list('nombre_cerrador'),
        Ciclos_Retencion.list('-fecha_evento'),
        Seguimiento_Renovaciones.list('-fecha_contacto'),
        Seguimiento_Online.list('-createdAt'),
        Bajas_Programadas.list('-createdAt'),
        Deudores.list('-createdAt')
      ]);
      
      setClientes(clientesData);
      setSedes(sedesData.filter(s => s.activo));
      setPlanes(planesData.filter(p => p.activo));
      setStaff(staffData.filter(s => s.activo));
      setCerradores(cerradoresData.filter(c => c.activo));
      setCiclosMes(ciclosData || []);
      setSeguimientos(seguimientosData || []);
      setSeguimientosOnline(seguimientosOnlineData || []);
      setBajasProgramadas(bajasData || []);
      setDeudoresList(deudoresData || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let resultado = [...clientes];

    // Excluir Inscripciones (tipo_item === 'Servicio') del listado general
    resultado = resultado.filter(c => {
      if (!c.plan_actual) return true; // Mantener clientes sin plan
      const plan = planes.find(p => p.id === c.plan_actual);
      return !plan || plan.tipo_item !== 'Servicio'; // Excluir Servicios (Inscripción)
    });

    // Búsqueda por nombre o whatsapp
    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase();
      resultado = resultado.filter(c => 
        c.nombre_cliente?.toLowerCase().includes(termino) ||
        c.whatsapp?.toLowerCase().includes(termino)
      );
    }

    // Filtro por sede
    if (sedeFilter !== 'todas') {
      resultado = resultado.filter(c => c.sede === sedeFilter);
    }

    // Filtro por plan
    if (planFilter !== 'todos') {
      resultado = resultado.filter(c => c.plan_actual === planFilter);
    }

    // Filtro por estado
    if (estadoFilter !== 'todos') {
      resultado = resultado.filter(c => {
        const estado = obtenerEstadoCliente(c);
        return estado === estadoFilter;
      });
    }

    // Filtro por modalidad
    if (modalidadFilter !== 'todas') {
      resultado = resultado.filter(c => c.modalidad_actual === modalidadFilter);
    }

    // Filtro por canal
    if (canalFilter !== 'todos') {
      resultado = resultado.filter(c => c.canal_origen === canalFilter);
    }

    setClientesFiltrados(resultado);
    setCurrentPageGeneral(1); // Reset to first page when filters change
  };

  const obtenerEstadoCliente = (cliente) => {
    if (!cliente.fecha_fin_plan_actual) return 'sin_plan';
    
    // Para planes de Suscripción, verificar el estado_suscripcion
    if (cliente.modalidad_actual === 'Suscripción') {
      if (cliente.estado_suscripcion === 'Deudor') return 'deudor';
      if (cliente.estado_suscripcion === 'Baja') return 'baja';
      // Si está Activo, siempre mostrar como activo (no vence automáticamente)
      return 'activo';
    }
    
    // Para Prepago y Programas, verificar primero el campo activo
    // Si el cliente fue marcado explícitamente como activo, respetarlo
    if (cliente.activo === true) {
      return 'activo';
    }
    
    // Si no está marcado como activo, calcular vencimiento normal
    const hoy = moment();
    const fechaFin = moment(cliente.fecha_fin_plan_actual);
    const diasRestantes = fechaFin.diff(hoy, 'days');

    if (diasRestantes < 0) return 'vencido';
    if (diasRestantes <= 7) return 'vence_pronto';
    return 'activo';
  };

  const obtenerBadgeEstado = (cliente) => {
    const estado = obtenerEstadoCliente(cliente);
    
    switch (estado) {
      case 'activo':
        return <Badge className="bg-green-100 text-green-800">Activo</Badge>;
      case 'vence_pronto':
      case 'por vencer':
        return <Badge className="bg-yellow-100 text-yellow-800">Por vencer</Badge>;
      case 'vencido':
      case 'inactivo':
        return <Badge className="bg-red-100 text-red-800">Inactivo</Badge>;
      case 'deudor':
        return <Badge className="bg-red-100 text-red-800">Deudor</Badge>;
      case 'baja':
        return <Badge className="bg-gray-500">Baja</Badge>;
      default:
        return <Badge variant="outline">Sin plan</Badge>;
    }
  };

  const handleEliminar = async (clienteId) => {
    if (!confirm('¿Estás seguro de eliminar este cliente? Esta acción no se puede deshacer.')) return;
    
    try {
      await Clientes.delete(clienteId);
      await cargarDatos();
    } catch (error) {
      console.error('Error eliminando cliente:', error);
      alert('Error al eliminar el cliente');
    }
  };

  const handleExportar = async () => {
    try {
      const datosExportar = clientesFiltrados.map(c => {
        const sede = sedes.find(s => s.id === c.sede);
        const plan = planes.find(p => p.id === c.plan_actual);
        const vendedor = staff.find(s => s.id === c.vendedor_origen);
        const cerrador = cerradores.find(ce => ce.id === c.cerrador_origen);
        
        return [
          c.nombre_cliente,
          c.whatsapp,
          sede?.nombre_sede || '',
          moment(c.fecha_primer_compra).format('DD/MM/YYYY'),
          plan?.nombre_plan || '',
          c.modalidad_actual || '',
          c.duracion_actual_meses || '',
          c.canal_origen || '',
          vendedor?.nombre || '',
          cerrador?.nombre_cerrador || '',
          c.fecha_inicio_plan_actual ? moment(c.fecha_inicio_plan_actual).format('DD/MM/YYYY') : '',
          c.fecha_fin_plan_actual ? moment(c.fecha_fin_plan_actual).format('DD/MM/YYYY') : '',
          c.activo ? 'Sí' : 'No',
          c.notas || ''
        ];
      });

      const headers = [
        'Nombre Cliente',
        'WhatsApp',
        'Sede',
        'Fecha Primera Compra',
        'Plan Actual',
        'Modalidad',
        'Duración (meses)',
        'Canal Origen',
        'Vendedor Origen',
        'Cerrador Origen',
        'Fecha Inicio Plan',
        'Fecha Fin Plan',
        'Activo',
        'Notas'
      ];

      // función para limpiar clientes importados (link en UI)
      const handleLimpiarImportados = () => {
        if (window.confirm('¿Limpiar todos los datos importados? Esta acción no se puede deshacer.')) {
          setClientes([]);
          setClientesFiltrados([]);
          toast({ title: 'Datos limpiados', description: 'Los clientes importados fueron removidos de la vista.' });
        }
      };
      );

      // Descargar archivo
      const signedUrlResponse = await axios.get(
        `${process.env.PROXY_INTEGRATION_URL}/files/signed-url`,
        {
          params: { fileUrl: response.data.url },
          headers: { 'x-api-key': window.config.apiKey }
        }
      );

      window.open(signedUrlResponse.data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error exportando:', error);
      alert('Error al exportar clientes');
    }
  };

  const handleDescargarPlantilla = async () => {
    try {
      const headers = [
        'Nombre Cliente',
        'WhatsApp',
        'Sede',
        'Fecha Primera Compra (DD/MM/YYYY)',
        'Plan Actual',
        'Canal Origen (Online/En sede)',
        'Vendedor Origen',
        'Cerrador Origen',
        'Fecha Inicio Plan (DD/MM/YYYY)',
        'Activo (Sí/No)',
        'Notas'
      ];

      const ejemplos = [
        [
          'Juan Pérez',
          '+56912345678',
          'Sede Centro',
          '01/12/2024',
          'Plan Mensual',
          'En sede',
          'María González',
          'Pedro Soto',
          '01/12/2024',
          'Sí',
          'Cliente VIP'
        ]
      ];

      const response = await axios.post(
        `${process.env.PROXY_INTEGRATION_URL}/documents/export-excel`,
        {
          sheets: [
            {
              name: 'Plantilla Clientes',
              data: [headers, ...ejemplos]
            }
          ]
        },
        {
          headers: {
            'x-api-key': window.config.apiKey
          }
        }
      );

      const signedUrlResponse = await axios.get(
        `${process.env.PROXY_INTEGRATION_URL}/files/signed-url`,
        {
          params: { fileUrl: response.data.url },
          headers: { 'x-api-key': window.config.apiKey }
        }
      );

      window.open(signedUrlResponse.data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error descargando plantilla:', error);
      alert('Error al descargar plantilla');
    }
  };

  const handleImportar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportando(true);

      // Subir archivo
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

      // Extraer datos
      const extractResponse = await axios.post(
        `${process.env.PROXY_INTEGRATION_URL}/documents/extract-csv`,
        { fileUrl: uploadResponse.data.url },
        {
          headers: { 'x-api-key': window.config.apiKey }
        }
      );

      const { rows } = extractResponse.data;

      // Procesar e importar
      let importados = 0;
      let errores = 0;

      for (const row of rows) {
        try {
          // Buscar IDs de catálogos
          const sede = sedes.find(s => s.nombre_sede === row['Sede']);
          const plan = planes.find(p => p.nombre_plan === row['Plan Actual']);
          const vendedor = staff.find(s => s.nombre === row['Vendedor Origen']);
          const cerrador = cerradores.find(c => c.nombre_cerrador === row['Cerrador Origen']);

          if (!sede) {
            console.warn(`Sede no encontrada: ${row['Sede']}`);
            errores++;
            continue;
          }

          // Verificar duplicados por whatsapp
          const existente = clientes.find(c => c.whatsapp === row['WhatsApp']);
          
          const clienteData = {
            nombre_cliente: row['Nombre Cliente'],
            whatsapp: row['WhatsApp'],
            sede: sede.id,
            fecha_primer_compra: moment(row['Fecha Primera Compra (DD/MM/YYYY)'], 'DD/MM/YYYY').format('YYYY-MM-DD'),
            plan_actual: plan?.id,
            modalidad_actual: plan?.modalidad_cobro,
            duracion_actual_meses: plan?.duracion_meses,
            canal_origen: row['Canal Origen (Online/En sede)'],
            vendedor_origen: vendedor?.id,
            cerrador_origen: cerrador?.id,
            fecha_inicio_plan_actual: row['Fecha Inicio Plan (DD/MM/YYYY)'] 
              ? moment(row['Fecha Inicio Plan (DD/MM/YYYY)'], 'DD/MM/YYYY').format('YYYY-MM-DD')
              : null,
            activo: row['Activo (Sí/No)'] === 'Sí',
            notas: row['Notas'] || ''
          };

          // Calcular fecha_fin si hay inicio y duración
          if (clienteData.fecha_inicio_plan_actual && clienteData.duracion_actual_meses) {
            clienteData.fecha_fin_plan_actual = moment(clienteData.fecha_inicio_plan_actual)
              .add(clienteData.duracion_actual_meses, 'months')
              .format('YYYY-MM-DD');
          }

          if (existente) {
            await Clientes.update(existente.id, clienteData);
          } else {
            await Clientes.create(clienteData);
          }

          importados++;
        } catch (error) {
          console.error('Error procesando fila:', error);
          errores++;
        }
      }

      alert(`Importación completada:\n✅ ${importados} clientes importados\n❌ ${errores} errores`);
      await cargarDatos();
    } catch (error) {
      console.error('Error importando:', error);
      alert('Error al importar clientes');
    } finally {
      setImportando(false);
      e.target.value = '';
    }
  };

  const handleSincronizarMasivo = async () => {
    if (!confirm('¿Deseas sincronizar TODAS las ventas cerradas con la tabla de Clientes?\n\nEsto creará/actualizará clientes y registros de retención para todas las ventas que no se hayan sincronizado aún.\n\nEste proceso puede tardar varios minutos.')) {
      return;
    }

    try {
      setSincronizando(true);
      
      toast({
        title: "Sincronización iniciada",
        description: "Cargando ventas cerradas...",
      });

      // Cargar TODAS las ventas cerradas
      const todasLasVentas = await Ventas.filter({ estado: 'Cerrada' }, '-fecha_venta');
      
      let creados = 0;
      let actualizados = 0;
      let ciclosCreados = 0;
      let errores = 0;
      let omitidos = 0;

      toast({
        title: "Procesando ventas",
        description: `Sincronizando ${todasLasVentas.length} ventas...`,
      });

      for (const venta of todasLasVentas) {
        try {
          // Obtener prospecto para sacar el whatsapp correcto
          if (!venta.prospecto_id) {
             console.warn(`Venta ${venta.id} sin prospecto_id`);
             errores++;
             continue;
          }

          const prospecto = await Prospectos.get(venta.prospecto_id);

          if (!prospecto || !prospecto.whatsapp) {
             console.warn(`Prospecto no encontrado o sin whatsapp para venta ${venta.id}`);
             errores++;
             continue;
          }

          // Sincronizar venta pasando AMBOS argumentos
          const resultado = await sincronizarClienteDesdeVenta(venta, prospecto);
          
          if (resultado) {
            if (resultado.accion === 'created') creados++;
            if (resultado.accion === 'updated') actualizados++;
            if (resultado.cicloCreado) ciclosCreados++;
            if (!resultado.cicloCreado && resultado.accion === 'updated') omitidos++;
          }
        } catch (error) {
          console.error(`Error sincronizando venta ${venta.id}:`, error);
          errores++;
        }
      }

      toast({
        title: "Sincronización completada",
        description: `✅ ${creados} nuevos, 🔄 ${actualizados} actualizados, 📅 ${ciclosCreados} ciclos`,
      });

      alert(`Resumen de Sincronización:\n\n✅ Clientes Nuevos: ${creados}\n🔄 Clientes Actualizados: ${actualizados}\n📅 Ciclos de Retención Creados: ${ciclosCreados}\n⏭️ Ciclos Omitidos (ya existían): ${omitidos}\n❌ Errores/Sin datos: ${errores}\n\nTotal procesado: ${todasLasVentas.length}`);
      
      // Recargar datos
      await cargarDatos();
    } catch (error) {
      console.error('Error en sincronización masiva:', error);
      toast({
        title: "Error",
        description: "Error al sincronizar ventas masivamente",
        variant: "destructive",
      });
    } finally {
      setSincronizando(false);
    }
  };

  const handleRenovar = async (cliente) => {
    try {
      setLoading(true);
      // Buscar prospecto asociado por WhatsApp
      const prospectos = await Prospectos.filter({ whatsapp: cliente.whatsapp });
      
      if (prospectos && prospectos.length > 0) {
        setProspectoParaRenovacion(prospectos[0]);
        setClienteSeleccionado(cliente);
        setRenovacionDialogOpen(true);
      } else {
        alert('No se encontró un prospecto asociado a este cliente (por WhatsApp). Para renovar, el cliente debe tener un prospecto vinculado.');
      }
    } catch (error) {
      console.error('Error buscando prospecto:', error);
      toast({
        title: "Error",
        description: "Error al preparar la renovación",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarRenovacion = async (ventaData) => {
    try {
      // 1. Crear Venta
      const nuevaVenta = await Ventas.create({
        ...ventaData,
        prospecto_id: prospectoParaRenovacion.id,
        sede: clienteSeleccionado.sede, // Mantener sede del cliente
        estado: 'Cerrada'
      });

      // 2. Sincronizar Cliente (Actualiza fecha fin y crea ciclo tipo "Renovó")
      await sincronizarClienteDesdeVenta(nuevaVenta, prospectoParaRenovacion);

      // 3. Actualizar estado del Seguimiento_Online a "Renovó"
      const seguimientoActivo = seguimientosOnline.find(s => s.cliente_id === clienteSeleccionado.id);
      if (seguimientoActivo) {
        await Seguimiento_Online.update(seguimientoActivo.id, {
          estado: 'Renovó',
          renovo: true
        });
      }

      // 4. Actualizar el cliente para marcarlo como activo (estado renovado)
      // El estado se calcula automáticamente basándose en fecha_fin_plan_actual
      // que ya fue actualizada por sincronizarClienteDesdeVenta
      
      toast({
        title: "Renovación Exitosa",
        description: "La venta y el cliente han sido actualizados. El cliente ahora está activo."
      });

      setRenovacionDialogOpen(false);
      await cargarDatos();
    } catch (error) {
      console.error('Error guardando renovación:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar la renovación.",
        variant: "destructive"
      });
    }
  };

  // Cálculos para el segmento de Vencimientos
  // Calcular rango de fechas según el periodo seleccionado
  const obtenerRangoFechas = () => {
    const hoy = moment();
    
    switch (periodoVencimientoFilter) {
      case 'hoy':
        return {
          inicio: hoy.clone().startOf('day'),
          fin: hoy.clone().endOf('day')
        };
      case 'ayer':
        return {
          inicio: hoy.clone().subtract(1, 'day').startOf('day'),
          fin: hoy.clone().subtract(1, 'day').endOf('day')
        };
      case 'esta_semana':
        return {
          inicio: hoy.clone().startOf('week'),
          fin: hoy.clone().endOf('week')
        };
      case 'este_mes':
      default:
        return {
          inicio: hoy.clone().startOf('month'),
          fin: hoy.clone().endOf('month')
        };
    }
  };

  const { inicio: startOfMonth, fin: endOfMonth } = obtenerRangoFechas();

  // Filtrar clientes vencidos del mes, excluyendo Inscripción
  const clientesVencimientoMes = clientes.filter(c => {
    if (!c.fecha_fin_plan_actual || !c.plan_actual) return false;
    
    // Obtener el plan para verificar tipo_item
    const plan = planes.find(p => p.id === c.plan_actual);
    
    // Excluir si el plan no existe o si es tipo "Servicio" (Inscripción)
    if (!plan || plan.tipo_item === 'Servicio') return false;
    
    // Filtrar por sede si está seleccionada
    if (sedeVencimientoFilter !== 'todas' && c.sede !== sedeVencimientoFilter) return false;
    
    const fechaFin = moment(c.fecha_fin_plan_actual);
    return fechaFin.isBetween(startOfMonth, endOfMonth, 'day', '[]');
  });

  // Aplicar filtro por tipo de item
  const clientesVencimientoFiltrados = tipoItemFilter === 'todos' 
    ? clientesVencimientoMes 
    : clientesVencimientoMes.filter(c => {
        const plan = planes.find(p => p.id === c.plan_actual);
        if (!plan) return false;
        
        if (tipoItemFilter === 'Prepago') {
          return plan.modalidad_cobro === 'Prepago';
        } else if (tipoItemFilter === 'Suscripción') {
          return plan.modalidad_cobro === 'Suscripción';
        } else if (tipoItemFilter === 'Programa') {
          return plan.tipo_item === 'Programa';
        }
        return true;
      });

  const vencidosMesCount = clientesVencimientoFiltrados.filter(c => 
    moment(c.fecha_fin_plan_actual).isBefore(moment(), 'day')
  ).length;

  const renovadosMesCount = ciclosMes.filter(c => 
    c.tipo_evento === 'Renovó' && moment(c.fecha_evento).isSame(moment(), 'month')
  ).length;

  // Función para verificar si un cliente fue contactado
  const fueContactado = (clienteId) => {
    return seguimientos.some(s => s.cliente_id === clienteId);
  };

  // Función para obtener el estado del seguimiento online
  const obtenerEstadoSeguimiento = (clienteId) => {
    const seguimiento = seguimientosOnline.find(s => s.cliente_id === clienteId);
    return seguimiento?.estado || null;
  };

  // Función para obtener badge del estado de seguimiento
  const obtenerBadgeEstadoSeguimiento = (clienteId) => {
    const estado = obtenerEstadoSeguimiento(clienteId);
    
    if (!estado) return null;
    
    switch (estado) {
      case 'Seguimiento Online':
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Seguimiento Online</Badge>;
      case 'Contactado':
        return <Badge className="bg-blue-500"><CheckCircle className="w-3 h-3 mr-1" />Contactado</Badge>;
      case 'Renovó':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Renovó</Badge>;
      case 'Pasó a Alerta':
        return <Badge className="bg-red-500"><AlertCircle className="w-3 h-3 mr-1" />Alerta Activa</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  // Función para manejar selección de clientes
  const toggleSeleccionCliente = (clienteId) => {
    setClientesSeleccionados(prev => {
      if (prev.includes(clienteId)) {
        return prev.filter(id => id !== clienteId);
      } else {
        return [...prev, clienteId];
      }
    });
  };

  const toggleSeleccionTodos = () => {
    if (clientesSeleccionados.length === clientesVencimientoFiltrados.length) {
      setClientesSeleccionados([]);
    } else {
      setClientesSeleccionados(clientesVencimientoFiltrados.map(c => c.id));
    }
  };

  const handleRegistrarContacto = (cliente) => {
    setClienteParaContacto(cliente);
    setContactoDialogOpen(true);
  };

  const handleDarDeBaja = (cliente) => {
    // Agregar nombre del plan para mostrar en el dialog
    const plan = planes.find(p => p.id === cliente.plan_actual);
    setClienteParaBaja({
      ...cliente,
      plan_nombre: plan?.nombre_plan
    });
    setDarDeBajaDialogOpen(true);
  };

  // Función para obtener el estado de baja programada de un cliente
  const obtenerBajaProgramada = (clienteId) => {
    return bajasProgramadas.find(b => 
      b.cliente === clienteId && 
      ['programada', 'en_gestion'].includes(b.estado_gestion)
    );
  };

  // Función para obtener badge del estado de baja
  const obtenerBadgeBaja = (clienteId) => {
    const baja = obtenerBajaProgramada(clienteId);
    
    if (!baja) return null;
    
    const fechaBaja = moment(baja.fecha_baja_programada);
    const diasRestantes = fechaBaja.diff(moment(), 'days');
    
    if (baja.estado_gestion === 'en_gestion') {
      return <Badge className="bg-orange-500">En Gestión - Baja {fechaBaja.format('DD/MM')}</Badge>;
    }
    
    return <Badge className="bg-purple-500">Baja Programada - {fechaBaja.format('DD/MM')} ({diasRestantes}d)</Badge>;
  };

  // Pagination calculations for General tab
  const totalItemsGeneral = clientesFiltrados.length;
  const totalPagesGeneral = Math.ceil(totalItemsGeneral / ITEMS_PER_PAGE);
  const startIndexGeneral = (currentPageGeneral - 1) * ITEMS_PER_PAGE;
  const endIndexGeneral = startIndexGeneral + ITEMS_PER_PAGE;
  const paginatedClientesGeneral = clientesFiltrados.slice(startIndexGeneral, endIndexGeneral);

  // Pagination calculations for Vencimientos tab
  const totalItemsVencimientos = clientesVencimientoFiltrados.length;
  const totalPagesVencimientos = Math.ceil(totalItemsVencimientos / ITEMS_PER_PAGE);
  const startIndexVencimientos = (currentPageVencimientos - 1) * ITEMS_PER_PAGE;
  const endIndexVencimientos = startIndexVencimientos + ITEMS_PER_PAGE;
  const paginatedClientesVencimientos = clientesVencimientoFiltrados.slice(startIndexVencimientos, endIndexVencimientos);

  const handlePageChangeGeneral = (page) => {
    setCurrentPageGeneral(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageChangeVencimientos = (page) => {
    setCurrentPageVencimientos(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Pagination component renderer
  const renderPagination = (currentPage, totalPages, totalItems, startIndex, endIndex, onPageChange) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando clientes...</p>
        </div>
      </div>
    );
  }

  return (
   <div className="p-6 space-y-4">
     
     {/* Línea 1: Título + contador + botón */}
     <div className="flex justify-between items-center">
       <div>
         <h2 className="text-xl font-bold">Clientes</h2>
         <p className="text-xs text-gray-500">
           Los datos se obtienen de las importaciones realizadas en Excel/CSV
         </p>
       </div>
       <div className="flex items-center gap-4 text-sm text-gray-600">
         <span>Total clientes: {totalItemsGeneral} | Mostrando: {ITEMS_PER_PAGE}</span>
         <Button variant="outline" size="sm" onClick={handleLimpiarImportados}>
           Limpiar datos importados
         </Button>
       </div>
     </div>

     {/* Línea 2: Filtros en una sola fila */}
     <div className="flex flex-wrap gap-2 items-center">
       <Input
         placeholder="Cliente, plan, vendedor..."
         value={busqueda}
         onChange={e => setBusqueda(e.target.value)}
         className="w-48 h-8 text-sm"
       />
       <Select value={estadoFilter} onValueChange={setEstadoFilter}>
         <SelectTrigger className="w-36 h-8 text-sm">
           <SelectValue placeholder="Todos los estados" />
         </SelectTrigger>
         <SelectContent>
           <SelectItem value="todos">Todos los estados</SelectItem>
           <SelectItem value="activo">Activo</SelectItem>
           <SelectItem value="por vencer">Por vencer</SelectItem>
           <SelectItem value="inactivo">Inactivo</SelectItem>
         </SelectContent>
       </Select>
       <Select value={sedeFilter} onValueChange={setSedeFilter}>
         <SelectTrigger className="w-36 h-8 text-sm">
           <SelectValue placeholder="Todas las sedes" />
         </SelectTrigger>
         <SelectContent>
           <SelectItem value="todas">Todas las sedes</SelectItem>
           {sedes.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre_sede}</SelectItem>)}
         </SelectContent>
       </Select>
       <Select value={planFilter} onValueChange={setPlanFilter}>
         <SelectTrigger className="w-36 h-8 text-sm">
           <SelectValue placeholder="Todos los planes" />
         </SelectTrigger>
         <SelectContent>
           <SelectItem value="todos">Todos los planes</SelectItem>
           {planes.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre_plan}</SelectItem>)}
         </SelectContent>
       </Select>
       <Button variant="outline" size="sm" className="h-8 text-sm"
         onClick={() => { setBusqueda(''); setEstadoFilter('todos'); setSedeFilter('todas'); setPlanFilter('todos'); }}>
         Limpiar filtros
       </Button>
     </div>

     {/* Línea 3: Contador derecha */}
     <div className="flex justify-end text-sm text-gray-500">
       Total clientes: {totalItemsGeneral} | Mostrando: {Math.min(ITEMS_PER_PAGE, totalItemsGeneral)}
     </div>

     {/* Tabla */}
     <div className="overflow-x-auto rounded-md border">
       <Table>
         <TableHeader>
           <TableRow>
             <TableHead className="p-2">Fecha ingreso</TableHead>
             <TableHead className="p-2">Nombre</TableHead>
             <TableHead className="p-2">Email</TableHead>
             <TableHead className="p-2">Teléfono</TableHead>
             <TableHead className="p-2">Plan</TableHead>
             <TableHead className="p-2">Sede</TableHead>
             <TableHead className="p-2">Estado</TableHead>
             <TableHead className="p-2">Vence</TableHead>
             <TableHead className="p-2 text-center">Acciones</TableHead>
           </TableRow>
         </TableHeader>
         <TableBody>
           {paginatedClientesGeneral.map(cliente => {
             const sede = sedes.find(s => s.id === cliente.sede);
             const plan = planes.find(p => p.id === cliente.plan_actual);
             return (
               <TableRow key={cliente.id}>
                 <TableCell className="p-2 text-sm">
                   {cliente.fecha_primer_compra
                     ? moment(cliente.fecha_primer_compra).format('DD/MM/YYYY') : '-'}
                 </TableCell>
                 <TableCell className="p-2 text-sm font-medium">
                   {cliente.nombre_cliente || cliente.name || '(sin nombre)'}
                 </TableCell>
                 <TableCell className="p-2 text-sm">{cliente.email || '-'}</TableCell>
                 <TableCell className="p-2 text-sm">
                   {cliente.telefono || cliente.cellPhone || '-'}
                 </TableCell>
                 <TableCell className="p-2 text-sm">{plan?.nombre_plan || '-'}</TableCell>
                 <TableCell className="p-2 text-sm">{sede?.nombre_sede || '-'}</TableCell>
                 <TableCell className="p-2">{obtenerBadgeEstado(cliente)}</TableCell>
                 <TableCell className="p-2 text-sm">
                   {cliente.fecha_fin_plan_actual
                     ? moment(cliente.fecha_fin_plan_actual).format('DD/MM/YYYY')
                     : '-'}
                 </TableCell>
                 <TableCell className="p-2 text-center">
                   <div className="flex gap-1 justify-center">
                     <Button variant="ghost" size="sm"
                       onClick={() => { setClienteSeleccionado(cliente); setHistorialDialogOpen(true); }}
                       title="Ver historial">
                       <Eye className="w-4 h-4 text-blue-600" />
                     </Button>
                     <Button variant="ghost" size="sm"
                       onClick={() => { setClienteSeleccionado(cliente); setEditarDialogOpen(true); }}
                       title="Editar">
                       <Pencil className="w-4 h-4 text-blue-600" />
                     </Button>
                     <Button variant="ghost" size="sm"
                       onClick={() => handleDarDeBaja(cliente)}
                       title="Dar de baja">
                       <Trash2 className="w-4 h-4 text-red-600" />
                     </Button>
                   </div>
                 </TableCell>
               </TableRow>
             );
           })}
         </TableBody>
       </Table>
     </div>

     {/* Paginación */}
     <div className="flex items-center justify-between pt-2">
       <Button variant="outline" size="sm"
         onClick={() => handlePageChangeGeneral(currentPageGeneral - 1)}
         disabled={currentPageGeneral === 1}>
         Anterior
       </Button>
       <span className="text-sm">Página {currentPageGeneral}</span>
       <Button variant="outline" size="sm"
         onClick={() => handlePageChangeGeneral(currentPageGeneral + 1)}
         disabled={currentPageGeneral >= totalPagesGeneral}>
         Siguiente
       </Button>
     </div>

     {/* Dialogs — NO TOCAR */}
     <CrearClienteDialog open={crearDialogOpen} onOpenChange={setCrearDialogOpen}
       onSuccess={cargarDatos} sedes={sedes} planes={planes} staff={staff} cerradores={cerradores} />
     <EditarClienteDialog open={editarDialogOpen} onOpenChange={setEditarDialogOpen}
       cliente={clienteSeleccionado} onSuccess={cargarDatos} sedes={sedes} planes={planes}
       staff={staff} cerradores={cerradores} />
     <HistorialClienteDialog open={historialDialogOpen} onOpenChange={setHistorialDialogOpen}
       cliente={clienteSeleccionado} />
     <DarDeBajaDialog open={darDeBajaDialogOpen} onOpenChange={setDarDeBajaDialogOpen}
       cliente={clienteParaBaja} onSuccess={cargarDatos} />
     <ProgramarBajaDialog open={programarBajaDialogOpen} onOpenChange={setProgramarBajaDialogOpen}
       cliente={clienteSeleccionado} onSuccess={cargarDatos} />
     <CrearDeudorDialog open={crearDeudorDialogOpen} onOpenChange={setCrearDeudorDialogOpen}
       onSuccess={cargarDatos} />
     <ProgramarPausaDialog open={programarPausaDialogOpen} onOpenChange={setProgramarPausaDialogOpen}
       cliente={clienteSeleccionado} onSuccess={cargarDatos} />
   </div>

}




