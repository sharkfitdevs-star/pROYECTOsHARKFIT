import React, { useState, useEffect } from 'react';
import { Leads_Diarios } from '@/entities/Leads_Diarios';
import { Prospectos } from '@/entities/Prospectos';
import { Agendamientos } from '@/entities/Agendamientos';
import { Ventas } from '@/entities/Ventas';
import { Clientes } from '@/entities/Clientes';
import { Planes_Servicios } from '@/entities/Planes_Servicios';
import { Sucursales } from '@/entities/Sucursales';
import { Staff } from '@/entities/Staff';
import { Cerradores } from '@/entities/Cerradores';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BarChart3, TrendingUp, Users, Calendar, ShoppingCart, ShieldAlert, Loader2, Clock, ArrowUp, ArrowDown, Minus, AlertTriangle, ChevronDown, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as RechartsPrimitive from 'recharts';
import { usePermission } from '@/components/PermissionContext';
import DetalleLeadsDialog from '@/components/DetalleLeadsDialog';
import DetalleAgendamientosDialog from '@/components/DetalleAgendamientosDialog';
import DetalleAsistenciasDialog from '@/components/DetalleAsistenciasDialog';
import DetalleVentasDialog from '@/components/DetalleVentasDialog';
import SeccionEvo from '@/components/SeccionEvo';

export default function DashboardComercial() {
  const { permissions, loading: permissionsLoading, hasPermission, user, staff: userStaff, role } = usePermission();
  const [loading, setLoading] = useState(false);
  const [selectedSede, setSelectedSede] = useState('all');
  
  // Filtro de mes/año
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  
  const formatDate = (date) => date.toISOString().split('T')[0];
  
  // Calcular fechas basadas en mes/año seleccionado
  const firstDayOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
  const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0);
  const fechaInicio = formatDate(firstDayOfMonth);
  const fechaFin = formatDate(lastDayOfMonth);
  
  // Calcular fechas del mes anterior para comparación
  const firstDayPrevMonth = new Date(selectedYear, selectedMonth - 2, 1);
  const lastDayPrevMonth = new Date(selectedYear, selectedMonth - 1, 0);
  const fechaInicioPrev = formatDate(firstDayPrevMonth);
  const fechaFinPrev = formatDate(lastDayPrevMonth);
  const [sucursales, setSucursales] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [cerradores, setCerradores] = useState([]);
  const [metricas, setMetricas] = useState({
    totalLeads: 0,
    totalAgendados: 0,
    totalAsistieron: 0,
    totalVentas: 0,
    totalClientesNuevos: 0,
    // % agendamiento "clásico" (ya existente): prospectos registrados / leads
    tasaAgendamiento: 0,
    tasaAsistencia: 0,
    tasaConversion: 0,
    tiempoPromedioConversion: 0
  });
  const [metricasMesAnterior, setMetricasMesAnterior] = useState({
    totalLeads: 0,
    totalAgendados: 0,
    totalAsistieron: 0,
    totalVentas: 0,
    totalClientesNuevos: 0,
    // % agendamiento "clásico" (ya existente): prospectos registrados / leads
    tasaAgendamiento: 0,
    tasaAsistencia: 0,
    tasaConversion: 0,
    tiempoPromedioConversion: 0
  });
  const [alertasSedes, setAlertasSedes] = useState([]);
  const [metricasPorSede, setMetricasPorSede] = useState([]);
  const [metricasPorVendedor, setMetricasPorVendedor] = useState([]);
  const [metricasPorCerrador, setMetricasPorCerrador] = useState([]);
  const [metricasSeguimiento, setMetricasSeguimiento] = useState([]);
  const [sedeSeleccionada, setSedeSeleccionada] = useState(null);
  const [alertasOpen, setAlertasOpen] = useState(false);
  
  // Estados para los diálogos de detalle
  const [dialogLeadsOpen, setDialogLeadsOpen] = useState(false);
  const [dialogAgendamientosOpen, setDialogAgendamientosOpen] = useState(false);
  const [dialogAsistenciasOpen, setDialogAsistenciasOpen] = useState(false);
  const [dialogVentasOpen, setDialogVentasOpen] = useState(false);
  
  // Datos filtrados para los diálogos
  const [leadsData, setLeadsData] = useState([]);
  const [prospectosData, setProspectosData] = useState([]);
  const [agendamientosData, setAgendamientosData] = useState([]);
  const [ventasData, setVentasData] = useState([]);
  
  // Estado para el collapsible de información
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    loadSucursales();
    loadCatalogos();
  }, []);

  useEffect(() => {
    if (sucursales.length > 0 && planes.length > 0) {
      fetchData();
    }
  }, [selectedSede, selectedMonth, selectedYear, sucursales, planes]);

  const loadSucursales = async () => {
    const sucursalesData = await Sucursales.list();
    setSucursales(sucursalesData?.filter(s => s.activa) || []);
  };

  const loadCatalogos = async () => {
    const [staffData, cerradoresData, planesData] = await Promise.all([
      Staff.list(),
      Cerradores.list(),
      Planes_Servicios.list()
    ]);
    // Cargar TODO el staff (activos e inactivos) para poder mostrar nombres de vendedores históricos
    setStaffList(staffData || []);
    setCerradores(cerradoresData?.filter(c => c.activo) || []);
    setPlanes(planesData?.filter(p => p.activo) || []);
  };

  const fetchData = async () => {
    setLoading(true);
    // Obtener datos
    const leads = await Leads_Diarios.list('-fecha');
    const prospectos = await Prospectos.list('-createdAt');
    const agendamientos = await Agendamientos.list('-fecha_hora');
    const ventas = await Ventas.list('-fecha_venta');
    // const clientes = await Clientes.list() || []; // Ya no se usa Clientes entity para métricas

    // Filtrar por sede y periodo
    const leadsFiltered = leads.filter(l => {
      const matchSede = !selectedSede || selectedSede === 'all' || l.sede === selectedSede;
      const matchFecha = (!fechaInicio || l.fecha >= fechaInicio) && (!fechaFin || l.fecha <= fechaFin);
      return matchSede && matchFecha;
    });

    const prospectosFiltered = prospectos.filter(p => {
      const matchSede = !selectedSede || selectedSede === 'all' || p.sede === selectedSede;
      const fechaProspecto = p.fecha_ingreso || '';
      const matchFecha = (!fechaInicio || fechaProspecto >= fechaInicio) && (!fechaFin || fechaProspecto <= fechaFin);
      return matchSede && matchFecha;
    });

    const agendamientosFiltered = agendamientos.filter(a => {
      const matchSede = !selectedSede || selectedSede === 'all' || a.sede === selectedSede;
      const fechaAgenda = a.fecha_hora?.split('T')[0] || '';
      const matchFecha = (!fechaInicio || fechaAgenda >= fechaInicio) && (!fechaFin || fechaAgenda <= fechaFin);
      return matchSede && matchFecha;
    });


    // CORRECCIÓN: Filtrar ventas usando la fecha del agendamiento asociado, no la fecha_venta
    // Esto asegura que las ventas estén sincronizadas con los agendamientos del periodo
    const ventasConAgendamiento = ventas.filter(v => {
      if (v.estado !== 'Cerrada') return false;
      
      // Si tiene agendamiento_id, verificar que el agendamiento esté en el periodo
      if (v.agendamiento_id) {
        const agendamiento = agendamientos.find(a => a.id === v.agendamiento_id);
        if (agendamiento) {
          const fechaAgenda = agendamiento.fecha_hora?.split('T')[0] || '';
          const matchSede = !selectedSede || selectedSede === 'all' || agendamiento.sede === selectedSede;
          const matchFecha = (!fechaInicio || fechaAgenda >= fechaInicio) && (!fechaFin || fechaAgenda <= fechaFin);
          return matchSede && matchFecha;
        }
      }
      return false;
    });
    
    // Ventas sin agendamiento (directas, walk-in, online sin agendar)
    const ventasSinAgendamiento = ventas.filter(v => {
      const matchSede = !selectedSede || selectedSede === 'all' || v.sede === selectedSede;
      const matchFecha = (!fechaInicio || v.fecha_venta >= fechaInicio) && (!fechaFin || v.fecha_venta <= fechaFin);
      return v.estado === 'Cerrada' && !v.agendamiento_id && matchSede && matchFecha;
    });
    
    // Total de ventas = con agendamiento + sin agendamiento
    const ventasFiltered = [...ventasConAgendamiento, ...ventasSinAgendamiento];
    
    // Guardar datos filtrados para los diálogos
    setLeadsData(leadsFiltered);
    setProspectosData(prospectosFiltered);
    setAgendamientosData(agendamientosFiltered);
    setVentasData(ventasFiltered);

    // Calcular métricas generales con lógica de fechas correcta
    const totalLeads = leadsFiltered.reduce((sum, l) => sum + (l.leads_totales || 0), 0);
    const totalAgendados = agendamientosFiltered.length; // Agendamientos por fecha_hora en el periodo
    
    // % Agendamiento: usa prospectos por fecha_ingreso (no agendamientos por fecha_hora)
    const totalProspectosRegistrados = prospectosFiltered.length; // Prospectos por fecha_ingreso
    
    // % Asistencia: solo agendamientos cuya fecha_hora ya pasó
    const hoy = new Date().toISOString();
    const agendamientosVencidos = agendamientosFiltered.filter(a => {
      const fechaVisita = a.fecha_hora || '';
      return fechaVisita <= hoy;
    });
    
    // Contar asistencias: incluye los que marcaron "Asistió" + los que convirtieron (compraron)
    const agendamientosConVenta = new Set(ventasConAgendamiento.map(v => v.agendamiento_id).filter(Boolean));
    const totalAsistieron = agendamientosVencidos.filter(a => 
      a.resultado_asistencia === 'Asistió' || agendamientosConVenta.has(a.id)
    ).length;
    
    // % Conversión: SOLO primera compra de Plan/Programa por whatsapp único
    const planesMap = {};
    planes.forEach(p => planesMap[p.id] = p);
    
    // Obtener TODAS las ventas de Plan/Programa (sin filtro de fecha) para determinar primera compra
    const todasVentasPlanPrograma = ventas.filter(v => {
        const plan = planesMap[v.plan];
        const tipoItem = plan?.tipo_item || '';
        return (tipoItem === 'Plan' || tipoItem === 'Programa') && v.estado === 'Cerrada';
    });
    
    // Agrupar por whatsapp y encontrar la primera compra de cada cliente
    const primerasComprasPorWhatsapp = {};
    todasVentasPlanPrograma.forEach(venta => {
        const prospecto = prospectos.find(p => p.id === venta.prospecto_id);
        if (prospecto && prospecto.whatsapp) {
            const whatsapp = prospecto.whatsapp;
            if (!primerasComprasPorWhatsapp[whatsapp] || venta.fecha_venta < primerasComprasPorWhatsapp[whatsapp].fecha_venta) {
                primerasComprasPorWhatsapp[whatsapp] = venta;
            }
        }
    });
    
    // CORRECCIÓN: Contar primeras compras usando la fecha del agendamiento (no fecha_venta)
    const clientesNuevosEnPeriodo = Object.values(primerasComprasPorWhatsapp).filter(primeraVenta => {
        const matchSede = !selectedSede || selectedSede === 'all' || primeraVenta.sede === selectedSede;
        
        // Si tiene agendamiento, usar fecha del agendamiento
        if (primeraVenta.agendamiento_id) {
            const agendamiento = agendamientos.find(a => a.id === primeraVenta.agendamiento_id);
            if (agendamiento) {
                const fechaAgenda = agendamiento.fecha_hora?.split('T')[0] || '';
                const matchFecha = (!fechaInicio || fechaAgenda >= fechaInicio) && (!fechaFin || fechaAgenda <= fechaFin);
                return matchFecha;
            }
        }
        
        // Si no tiene agendamiento, usar fecha_venta
        const matchFecha = (!fechaInicio || primeraVenta.fecha_venta >= fechaInicio) && (!fechaFin || primeraVenta.fecha_venta <= fechaFin);
        return matchFecha;
    });
    
    const totalClientesNuevos = clientesNuevosEnPeriodo.length;

    const agendamientosAsistieronPeriodo = agendamientosFiltered.filter(a => a.resultado_asistencia === 'Asistió');
    
    // CORRECCIÓN: Separar ventas con agendamiento vs sin agendamiento
    const totalVentasConAgendamiento = ventasConAgendamiento.length;
    const totalVentasSinAgendamiento = ventasSinAgendamiento.length;
    const totalVentas = ventasFiltered.length;

    const tasaAgendamiento = totalLeads > 0 ? (totalProspectosRegistrados / totalLeads * 100).toFixed(2) : 0;

    const tasaAsistencia = agendamientosVencidos.length > 0 ? (totalAsistieron / agendamientosVencidos.length * 100).toFixed(2) : 0;
    const tasaConversion = agendamientosAsistieronPeriodo.length > 0 ? (totalClientesNuevos / agendamientosAsistieronPeriodo.length * 100).toFixed(2) : 0;

    // Calcular tiempo promedio de conversión (días desde agenda hasta primera compra de Plan/Programa)
    let tiempoPromedioConversion = 0;
    const tiemposConversion = [];
    
    clientesNuevosEnPeriodo.forEach(venta => {
      const prospecto = prospectos.find(p => p.id === venta.prospecto_id);
      if (prospecto) {
        // Buscar el primer agendamiento del prospecto (campo correcto: prospecto_id)
        const agendamientosProspecto = agendamientos
          .filter(a => a.prospecto_id === prospecto.id)
          .sort((a, b) => (a.fecha_hora || '').localeCompare(b.fecha_hora || ''));
        
        if (agendamientosProspecto.length > 0) {
          const primerAgendamiento = agendamientosProspecto[0];
          const fechaAgenda = primerAgendamiento.fecha_hora?.split('T')[0];
          const fechaVenta = venta.fecha_venta;
          
          if (fechaAgenda && fechaVenta) {
            const dateAgenda = new Date(fechaAgenda);
            const dateVenta = new Date(fechaVenta);
            const diffTime = dateVenta - dateAgenda;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 0) {
              tiemposConversion.push(diffDays);
            }
          }
        }
      }
    });
    
    if (tiemposConversion.length > 0) {
      const sumaTiempos = tiemposConversion.reduce((sum, t) => sum + t, 0);
      tiempoPromedioConversion = (sumaTiempos / tiemposConversion.length).toFixed(1);
    }

    setMetricas({
      totalLeads,
      totalAgendados,
      totalAsistieron,
      totalVentas,
      totalClientesNuevos,
      tasaAgendamiento,
      tasaAsistencia,
      tasaConversion,
      tiempoPromedioConversion
    });

    // Calcular métricas del mes anterior para comparación
    calcularMetricasMesAnterior(leads, prospectos, agendamientos, ventas);

    // Métricas por sede
    calcularMetricasPorSede(leads, prospectos, agendamientos, ventas, prospectos);

    // Métricas por vendedor
    calcularMetricasPorVendedor(leads, prospectos, agendamientos, ventas, prospectos, selectedSede);

    // Métricas por cerrador
    calcularMetricasPorCerrador(ventas, agendamientos, prospectos, selectedSede);

    setLoading(false);
  };

  const calcularMetricasPorSede = (leads, prospectos, agendamientos, ventas, allProspectos) => {
    const metricasSede = {};
    const planesMap = {};
    planes.forEach(p => planesMap[p.id] = p);

    sucursales.forEach(sucursal => {
      const sedeId = sucursal.id;
      
      // Filtrar por sede y periodo
      const leadsS = leads.filter(l => {
        const matchSede = l.sede === sedeId;
        const matchFecha = (!fechaInicio || l.fecha >= fechaInicio) && (!fechaFin || l.fecha <= fechaFin);
        return matchSede && matchFecha;
      });
      
      const prospectosS = prospectos.filter(p => {
        const matchSede = p.sede === sedeId;
        const fechaProspecto = p.fecha_ingreso || '';
        const matchFecha = (!fechaInicio || fechaProspecto >= fechaInicio) && (!fechaFin || fechaProspecto <= fechaFin);
        return matchSede && matchFecha;
      });
      
      const agendamientosS = agendamientos.filter(a => {
        const matchSede = a.sede === sedeId;
        const fechaAgenda = a.fecha_hora?.split('T')[0] || '';
        const matchFecha = (!fechaInicio || fechaAgenda >= fechaInicio) && (!fechaFin || fechaAgenda <= fechaFin);
        return matchSede && matchFecha;
      });
      
      // CORRECCIÓN: Filtrar ventas por fecha del agendamiento asociado
      const ventasConAgendamientoS = ventas.filter(v => {
        if (v.estado !== 'Cerrada' || v.sede !== sedeId) return false;
        
        if (v.agendamiento_id) {
          const agendamiento = agendamientos.find(a => a.id === v.agendamiento_id);
          if (agendamiento) {
            const fechaAgenda = agendamiento.fecha_hora?.split('T')[0] || '';
            const matchFecha = (!fechaInicio || fechaAgenda >= fechaInicio) && (!fechaFin || fechaAgenda <= fechaFin);
            return matchFecha;
          }
        }
        return false;
      });
      
      const ventasSinAgendamientoS = ventas.filter(v => {
        const matchSede = v.sede === sedeId;
        const matchFecha = (!fechaInicio || v.fecha_venta >= fechaInicio) && (!fechaFin || v.fecha_venta <= fechaFin);
        return v.estado === 'Cerrada' && !v.agendamiento_id && matchSede && matchFecha;
      });
      
      const ventasS = [...ventasConAgendamientoS, ...ventasSinAgendamientoS];

      // Calcular clientes únicos (Conversiones) - SOLO primera compra por whatsapp
      // Obtener TODAS las ventas de Plan/Programa de esta sede (sin filtro de fecha)
      const todasVentasSede = ventas.filter(v => {
          const plan = planesMap[v.plan];
          const tipoItem = plan?.tipo_item || '';
          return (tipoItem === 'Plan' || tipoItem === 'Programa') && v.estado === 'Cerrada' && v.sede === sedeId;
      });
      
      // Agrupar por whatsapp y encontrar la primera compra de cada cliente
      const primerasComprasPorWhatsappSede = {};
      todasVentasSede.forEach(venta => {
          const prospecto = allProspectos.find(p => p.id === venta.prospecto_id);
          if (prospecto && prospecto.whatsapp) {
              const whatsapp = prospecto.whatsapp;
              if (!primerasComprasPorWhatsappSede[whatsapp] || venta.fecha_venta < primerasComprasPorWhatsappSede[whatsapp].fecha_venta) {
                  primerasComprasPorWhatsappSede[whatsapp] = venta;
              }
          }
      });
      
      // CORRECCIÓN: Contar primeras compras usando fecha del agendamiento cuando existe
      const clientesNuevosEnPeriodoSede = Object.values(primerasComprasPorWhatsappSede).filter(primeraVenta => {
          // Si tiene agendamiento, usar fecha del agendamiento
          if (primeraVenta.agendamiento_id) {
              const agendamiento = agendamientos.find(a => a.id === primeraVenta.agendamiento_id);
              if (agendamiento) {
                  const fechaAgenda = agendamiento.fecha_hora?.split('T')[0] || '';
                  const matchFecha = (!fechaInicio || fechaAgenda >= fechaInicio) && (!fechaFin || fechaAgenda <= fechaFin);
                  return matchFecha;
              }
          }
          
          // Si no tiene agendamiento, usar fecha_venta
          const matchFecha = (!fechaInicio || primeraVenta.fecha_venta >= fechaInicio) && (!fechaFin || primeraVenta.fecha_venta <= fechaFin);
          return matchFecha;
      });
      
      const totalClientesNuevos = clientesNuevosEnPeriodoSede.length;

      const totalLeads = leadsS.reduce((sum, l) => sum + (l.leads_totales || 0), 0);
      const totalAgendados = agendamientosS.length; // Agendamientos por fecha_hora en el periodo
      const totalProspectosRegistradosSede = prospectosS.length; // Prospectos por fecha_ingreso
      
      // % Asistencia: solo agendamientos cuya fecha_hora ya pasó
      const hoy = new Date().toISOString();
      const agendamientosVencidos = agendamientosS.filter(a => {
        const fechaVisita = a.fecha_hora || '';
        return fechaVisita <= hoy;
      });
      
      // Contar asistencias: incluye los que marcaron "Asistió" + los que convirtieron (compraron)
      const agendamientosConVentaSede = new Set(ventasConAgendamientoS.map(v => v.agendamiento_id).filter(Boolean));
      const totalAsistieron = agendamientosVencidos.filter(a => 
        a.resultado_asistencia === 'Asistió' || agendamientosConVentaSede.has(a.id)
      ).length;
      
      // % Conversión: Clientes Nuevos del periodo / agendamientos que asistieron con fecha_visita en el periodo
      const agendamientosAsistieronPeriodo = agendamientosS.filter(a => a.resultado_asistencia === 'Asistió');
      
      // CORRECCIÓN: totalVentas debe ser igual a totalClientesNuevos (primera compra)
      // No todas las ventas, solo las conversiones (clientes nuevos)
      const totalVentas = totalClientesNuevos;

      // % Conversión por Agendado: Clientes Nuevos / agendamientos vencidos (cuya fecha ya pasó)
      const tasaConversionPorAgendado = agendamientosVencidos.length > 0 ? ((totalClientesNuevos / agendamientosVencidos.length) * 100).toFixed(2) : 0;

      metricasSede[sedeId] = {
        sede: sucursal.nombre_sede,
        leads: totalLeads,
        agendados: totalAgendados,
        asistieron: totalAsistieron,
        ventas: totalVentas, // Ahora es igual a clientesNuevos
        ventasConAgendamiento: ventasConAgendamientoS.length,
        ventasSinAgendamiento: ventasSinAgendamientoS.length,
        clientesNuevos: totalClientesNuevos,
        tasaAgendamiento: totalLeads > 0 ? ((totalProspectosRegistradosSede / totalLeads) * 100).toFixed(2) : 0,
        tasaAsistencia: agendamientosVencidos.length > 0 ? ((totalAsistieron / agendamientosVencidos.length) * 100).toFixed(2) : 0,
        tasaConversion: agendamientosAsistieronPeriodo.length > 0 ? ((totalClientesNuevos / agendamientosAsistieronPeriodo.length) * 100).toFixed(2) : 0,
        tasaConversionPorLeads: totalLeads > 0 ? ((totalClientesNuevos / totalLeads) * 100).toFixed(2) : 0,
        tasaConversionPorAgendado
      };
    });

    const metricasArray = Object.values(metricasSede);
    setMetricasPorSede(metricasArray);
    
    // Calcular alertas rojas (solo sedes con asistencia < 60% O conversión < 65%)
    const alertasRojas = metricasArray.filter(sede => {
      const asistencia = parseFloat(sede.tasaAsistencia);
      const conversion = parseFloat(sede.tasaConversion);
      return asistencia < 60 || conversion < 65;
    }).map(sede => ({
      sede: sede.sede,
      tasaAsistencia: sede.tasaAsistencia,
      tasaConversion: sede.tasaConversion,
      estadoAsistencia: parseFloat(sede.tasaAsistencia) < 60 ? 'Muy Bajo' : parseFloat(sede.tasaAsistencia) <= 70 ? 'Normal' : 'Excelente',
      estadoConversion: parseFloat(sede.tasaConversion) < 65 ? 'Muy Bajo' : parseFloat(sede.tasaConversion) <= 70 ? 'Normal' : 'Excelente',
      colorAsistencia: parseFloat(sede.tasaAsistencia) < 60 ? 'bg-red-100 text-red-800' : parseFloat(sede.tasaAsistencia) <= 70 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800',
      colorConversion: parseFloat(sede.tasaConversion) < 65 ? 'bg-red-100 text-red-800' : parseFloat(sede.tasaConversion) <= 70 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
    }));
    
    setAlertasSedes(alertasRojas);
  };

  const calcularMetricasPorVendedor = (leads, prospectos, agendamientos, ventas, allProspectos, sede) => {
    const metricasVendedor = {};
    const planesMap = {};
    planes.forEach(p => planesMap[p.id] = p);

    // Filtrar por sede y periodo
    const leadsF = leads.filter(l => {
      const matchSede = !sede || sede === 'all' || l.sede === sede;
      const matchFecha = (!fechaInicio || l.fecha >= fechaInicio) && (!fechaFin || l.fecha <= fechaFin);
      return matchSede && matchFecha;
    });
    
    const prospectosF = prospectos.filter(p => {
      const matchSede = !sede || sede === 'all' || p.sede === sede;
      const fechaProspecto = p.fecha_ingreso || '';
      const matchFecha = (!fechaInicio || fechaProspecto >= fechaInicio) && (!fechaFin || fechaProspecto <= fechaFin);
      return matchSede && matchFecha;
    });
    
    // CORRECCIÓN: Filtrar ventas por fecha del agendamiento asociado
    const ventasConAgendamientoF = ventas.filter(v => {
      if (v.estado !== 'Cerrada') return false;
      const matchSede = !sede || sede === 'all' || v.sede === sede;
      
      if (v.agendamiento_id) {
        const agendamiento = agendamientos.find(a => a.id === v.agendamiento_id);
        if (agendamiento) {
          const fechaAgenda = agendamiento.fecha_hora?.split('T')[0] || '';
          const matchFecha = (!fechaInicio || fechaAgenda >= fechaInicio) && (!fechaFin || fechaAgenda <= fechaFin);
          return matchSede && matchFecha;
        }
      }
      return false;
    });
    
    const ventasSinAgendamientoF = ventas.filter(v => {
      const matchSede = !sede || sede === 'all' || v.sede === sede;
      const matchFecha = (!fechaInicio || v.fecha_venta >= fechaInicio) && (!fechaFin || v.fecha_venta <= fechaFin);
      return v.estado === 'Cerrada' && !v.agendamiento_id && matchSede && matchFecha;
    });
    
    const ventasF = [...ventasConAgendamientoF, ...ventasSinAgendamientoF];

    // Agrupar leads por vendedor
    leadsF.forEach(lead => {
      if (!metricasVendedor[lead.vendedor]) {
        metricasVendedor[lead.vendedor] = {
          vendedor: lead.vendedor,
          leads: 0,
          agendados: 0,
          ventas: 0,
          clientesNuevos: 0
        };
      }
      metricasVendedor[lead.vendedor].leads += lead.leads_totales || 0;
    });

    // Agrupar prospectos por vendedor
    prospectosF.forEach(prospecto => {
      if (!metricasVendedor[prospecto.vendedor_asignado]) {
        metricasVendedor[prospecto.vendedor_asignado] = {
          vendedor: prospecto.vendedor_asignado,
          leads: 0,
          agendados: 0,
          ventas: 0,
          clientesNuevos: 0
        };
      }
      metricasVendedor[prospecto.vendedor_asignado].agendados += 1;
    });

    // Agrupar ventas por vendedor (el vendedor viene de la venta)
    ventasF.forEach(venta => {
      if (venta.vendedor) {
        if (!metricasVendedor[venta.vendedor]) {
          metricasVendedor[venta.vendedor] = {
            vendedor: venta.vendedor,
            leads: 0,
            agendados: 0,
            ventas: 0,
            clientesNuevos: 0
          };
        }
        metricasVendedor[venta.vendedor].ventas += 1;
      }
    });

    // Agrupar clientes nuevos (SOLO primera compra por whatsapp) por vendedor
    // Obtener TODAS las ventas de Plan/Programa (sin filtro de fecha) para determinar primera compra
    const todasVentasPlanPrograma = ventas.filter(v => {
        const plan = planesMap[v.plan];
        const tipoItem = plan?.tipo_item || '';
        const matchSede = !sede || sede === 'all' || v.sede === sede;
        return (tipoItem === 'Plan' || tipoItem === 'Programa') && v.estado === 'Cerrada' && matchSede;
    });
    
    // Agrupar por whatsapp y encontrar la primera compra de cada cliente
    const primerasComprasPorWhatsappVendedor = {};
    todasVentasPlanPrograma.forEach(venta => {
        const prospecto = allProspectos.find(p => p.id === venta.prospecto_id);
        if (prospecto && prospecto.whatsapp) {
            const whatsapp = prospecto.whatsapp;
            if (!primerasComprasPorWhatsappVendedor[whatsapp] || venta.fecha_venta < primerasComprasPorWhatsappVendedor[whatsapp].fecha_venta) {
                primerasComprasPorWhatsappVendedor[whatsapp] = venta;
            }
        }
    });
    
    // Contar solo las primeras compras que caen en el periodo seleccionado, agrupadas por vendedor
    Object.values(primerasComprasPorWhatsappVendedor).forEach(primeraVenta => {
        const matchFecha = (!fechaInicio || primeraVenta.fecha_venta >= fechaInicio) && (!fechaFin || primeraVenta.fecha_venta <= fechaFin);
        if (matchFecha && primeraVenta.vendedor) {
            const vendedorId = primeraVenta.vendedor;
            if (!metricasVendedor[vendedorId]) {
                metricasVendedor[vendedorId] = {
                    vendedor: vendedorId,
                    leads: 0, agendados: 0, ventas: 0, clientesNuevos: 0
                };
            }
            metricasVendedor[vendedorId].clientesNuevos += 1;
        }
    });

    // Calcular agendamientos vencidos por vendedor para % Conversión por Agendado
    const hoy = new Date().toISOString();
    const agendamientosF = agendamientos.filter(a => {
      const matchSede = !sede || sede === 'all' || a.sede === sede;
      const fechaAgenda = a.fecha_hora?.split('T')[0] || '';
      const matchFecha = (!fechaInicio || fechaAgenda >= fechaInicio) && (!fechaFin || fechaAgenda <= fechaFin);
      const fechaVencida = a.fecha_hora <= hoy;
      return matchSede && matchFecha && fechaVencida;
    });

    const agendamientosVencidosPorVendedor = {};
    agendamientosF.forEach(a => {
      const prospectoId = a.prospecto;
      const prospecto = prospectosF.find(p => p.id === prospectoId);
      if (prospecto?.vendedor_asignado) {
        agendamientosVencidosPorVendedor[prospecto.vendedor_asignado] = 
          (agendamientosVencidosPorVendedor[prospecto.vendedor_asignado] || 0) + 1;
      }
    });

    // Calcular tasas y obtener nombres
    const resultado = Object.values(metricasVendedor).map(m => {
      const staffMember = staffList.find(s => s.id === m.vendedor);
      const agendamientosVencidos = agendamientosVencidosPorVendedor[m.vendedor] || 0;
      const tasaConversionPorAgendado = agendamientosVencidos > 0 ? ((m.clientesNuevos / agendamientosVencidos) * 100).toFixed(2) : 0;
      
      return {
        ...m,
        vendedorNombre: staffMember?.nombre || 'Sin asignar',
        agendamientosVencidos,
        tasaAgendamiento: m.leads > 0 ? ((m.agendados / m.leads) * 100).toFixed(2) : 0,
        tasaConversion: m.agendados > 0 ? ((m.clientesNuevos / m.agendados) * 100).toFixed(2) : 0,
        tasaConversionPorLeads: m.leads > 0 ? ((m.clientesNuevos / m.leads) * 100).toFixed(2) : 0,
        tasaConversionPorAgendado
      };
    });

    setMetricasPorVendedor(resultado.sort((a, b) => b.ventas - a.ventas));
  };

  const calcularMetricasPorCerrador = (ventas, agendamientos, allProspectos, sede) => {
    const metricasCerrador = {};
    const metricasSeguimientoMap = {};
    const planesMap = {};
    planes.forEach(p => planesMap[p.id] = p);

    // CORRECCIÓN: Filtrar ventas en sede por fecha del agendamiento asociado
    const ventasEnSedeConAgendamiento = ventas.filter(v => {
      if (v.tipo_venta !== 'En sede' || v.estado !== 'Cerrada' || !v.cerrador) return false;
      const matchSede = !sede || sede === 'all' || v.sede === sede;
      
      if (v.agendamiento_id) {
        const agendamiento = agendamientos.find(a => a.id === v.agendamiento_id);
        if (agendamiento) {
          const fechaAgenda = agendamiento.fecha_hora?.split('T')[0] || '';
          const matchFecha = (!fechaInicio || fechaAgenda >= fechaInicio) && (!fechaFin || fechaAgenda <= fechaFin);
          return matchSede && matchFecha;
        }
      }
      return false;
    });
    
    const ventasEnSedeSinAgendamiento = ventas.filter(v => 
      v.tipo_venta === 'En sede' && 
      v.estado === 'Cerrada' && 
      v.cerrador &&
      !v.agendamiento_id &&
      (!sede || sede === 'all' || v.sede === sede) &&
      (!fechaInicio || v.fecha_venta >= fechaInicio) && 
      (!fechaFin || v.fecha_venta <= fechaFin)
    );
    
    const ventasEnSede = [...ventasEnSedeConAgendamiento, ...ventasEnSedeSinAgendamiento];

    const agendamientosF = agendamientos.filter(a => {
      const matchSede = !sede || sede === 'all' || a.sede === sede;
      const fechaAgenda = a.fecha_hora?.split('T')[0] || '';
      const matchFecha = (!fechaInicio || fechaAgenda >= fechaInicio) && (!fechaFin || fechaAgenda <= fechaFin);
      return matchSede && matchFecha;
    });
    
    // Contar asistencias: incluye los que marcaron "Asistió" + los que convirtieron (compraron)
    const ventasF = ventas.filter(v => {
      const matchSede = !sede || sede === 'all' || v.sede === sede;
      const matchFecha = (!fechaInicio || v.fecha_venta >= fechaInicio) && (!fechaFin || v.fecha_venta <= fechaFin);
      return v.estado === 'Cerrada' && matchSede && matchFecha;
    });
    const agendamientosConVentaCerrador = new Set(ventasF.map(v => v.agendamiento_id).filter(Boolean));
    const totalAsistieron = agendamientosF.filter(a => 
      a.resultado_asistencia === 'Asistió' || agendamientosConVentaCerrador.has(a.id)
    ).length;

    // Calcular clientes nuevos por cerrador (SOLO primera compra por whatsapp)
    // Obtener TODAS las ventas de Plan/Programa en sede (sin filtro de fecha) para determinar primera compra
    const todasVentasEnSede = ventas.filter(v => {
        const plan = planesMap[v.plan];
        const tipoItem = plan?.tipo_item || '';
        const matchSede = !sede || sede === 'all' || v.sede === sede;
        return v.tipo_venta === 'En sede' && (tipoItem === 'Plan' || tipoItem === 'Programa') && v.estado === 'Cerrada' && v.cerrador && matchSede;
    });
    
    // Agrupar por whatsapp y encontrar la primera compra de cada cliente
    const primerasComprasPorWhatsappCerrador = {};
    todasVentasEnSede.forEach(venta => {
        const prospecto = allProspectos.find(p => p.id === venta.prospecto_id);
        if (prospecto && prospecto.whatsapp) {
            const whatsapp = prospecto.whatsapp;
            if (!primerasComprasPorWhatsappCerrador[whatsapp] || venta.fecha_venta < primerasComprasPorWhatsappCerrador[whatsapp].fecha_venta) {
                primerasComprasPorWhatsappCerrador[whatsapp] = venta;
            }
        }
    });
    
    // Contar solo las primeras compras que caen en el periodo seleccionado, agrupadas por cerrador
    const clientesPorCerrador = {}; // Map cerradorId -> count
    Object.values(primerasComprasPorWhatsappCerrador).forEach(primeraVenta => {
        const matchFecha = (!fechaInicio || primeraVenta.fecha_venta >= fechaInicio) && (!fechaFin || primeraVenta.fecha_venta <= fechaFin);
        if (matchFecha && primeraVenta.cerrador) {
            const cerradorId = primeraVenta.cerrador;
            clientesPorCerrador[cerradorId] = (clientesPorCerrador[cerradorId] || 0) + 1;
        }
    });

    ventasEnSede.forEach(venta => {
      // Métricas por cerrador
      if (!metricasCerrador[venta.cerrador]) {
        metricasCerrador[venta.cerrador] = {
          cerrador: venta.cerrador,
          ventasCerradas: 0,
          ventasDirectas: 0,
          ventasPostAsistencia: 0,
          clientesNuevos: 0
        };
      }
      metricasCerrador[venta.cerrador].ventasCerradas += 1;
      
      // Asignar clientes nuevos (siempre actualizado)
      if (clientesPorCerrador[venta.cerrador]) {
        metricasCerrador[venta.cerrador].clientesNuevos = clientesPorCerrador[venta.cerrador];
      }
      
      if (venta.es_post_asistencia) {
        metricasCerrador[venta.cerrador].ventasPostAsistencia += 1;
        
        // Métricas de seguimiento
        if (venta.responsable_seguimiento) {
          if (!metricasSeguimientoMap[venta.responsable_seguimiento]) {
            metricasSeguimientoMap[venta.responsable_seguimiento] = {
              responsable: venta.responsable_seguimiento,
              contribuciones: 0
            };
          }
          metricasSeguimientoMap[venta.responsable_seguimiento].contribuciones += 1;
        }
      } else {
        metricasCerrador[venta.cerrador].ventasDirectas += 1;
      }
    });

    // Obtener nombres de cerradores
    const resultado = Object.values(metricasCerrador).map(m => {
      const cerrador = cerradores.find(c => c.id === m.cerrador);
      const clientesNuevos = m.clientesNuevos || 0;
      return {
        ...m,
        cerradorNombre: cerrador?.nombre_cerrador || 'Sin asignar',
        tasaConversion: totalAsistieron > 0 ? ((clientesNuevos / totalAsistieron) * 100).toFixed(2) : 0
      };
    });

    // Obtener nombres del equipo de seguimiento
    const resultadoSeguimiento = Object.values(metricasSeguimientoMap).map(m => {
      const staffMember = staffList.find(s => s.id === m.responsable);
      return {
        ...m,
        responsableNombre: staffMember?.nombre || 'Sin asignar'
      };
    });

    setMetricasPorCerrador(resultado.sort((a, b) => b.ventasCerradas - a.ventasCerradas));
    setMetricasSeguimiento(resultadoSeguimiento.sort((a, b) => b.contribuciones - a.contribuciones));
  };

  const calcularMetricasMesAnterior = (leads, prospectos, agendamientos, ventas) => {
    // Filtrar datos del mes anterior
    const leadsPrev = leads.filter(l => {
      const matchSede = !selectedSede || selectedSede === 'all' || l.sede === selectedSede;
      const matchFecha = (!fechaInicioPrev || l.fecha >= fechaInicioPrev) && (!fechaFinPrev || l.fecha <= fechaFinPrev);
      return matchSede && matchFecha;
    });

    const prospectosPrev = prospectos.filter(p => {
      const matchSede = !selectedSede || selectedSede === 'all' || p.sede === selectedSede;
      const fechaProspecto = p.fecha_ingreso || '';
      const matchFecha = (!fechaInicioPrev || fechaProspecto >= fechaInicioPrev) && (!fechaFinPrev || fechaProspecto <= fechaFinPrev);
      return matchSede && matchFecha;
    });

    // Para el cálculo de Agendados del mes anterior, usar fecha_hora del agendamiento
    const agendamientosPrev = agendamientos.filter(a => {
      const matchSede = !selectedSede || selectedSede === 'all' || a.sede === selectedSede;
      const fechaAgenda = a.fecha_hora?.split('T')[0] || '';
      const matchFecha = (!fechaInicioPrev || fechaAgenda >= fechaInicioPrev) && (!fechaFinPrev || fechaAgenda <= fechaFinPrev);
      return matchSede && matchFecha;
    });


    // CORRECCIÓN: Filtrar ventas del mes anterior por fecha del agendamiento asociado
    const ventasConAgendamientoPrev = ventas.filter(v => {
      if (v.estado !== 'Cerrada') return false;
      const matchSede = !selectedSede || selectedSede === 'all' || v.sede === selectedSede;
      
      if (v.agendamiento_id) {
        const agendamiento = agendamientos.find(a => a.id === v.agendamiento_id);
        if (agendamiento) {
          const fechaAgenda = agendamiento.fecha_hora?.split('T')[0] || '';
          const matchFecha = (!fechaInicioPrev || fechaAgenda >= fechaInicioPrev) && (!fechaFinPrev || fechaAgenda <= fechaFinPrev);
          return matchSede && matchFecha;
        }
      }
      return false;
    });
    
    const ventasSinAgendamientoPrev = ventas.filter(v => {
      const matchSede = !selectedSede || selectedSede === 'all' || v.sede === selectedSede;
      const matchFecha = (!fechaInicioPrev || v.fecha_venta >= fechaInicioPrev) && (!fechaFinPrev || v.fecha_venta <= fechaFinPrev);
      return v.estado === 'Cerrada' && !v.agendamiento_id && matchSede && matchFecha;
    });
    
    const ventasPrev = [...ventasConAgendamientoPrev, ...ventasSinAgendamientoPrev];

    const totalLeadsPrev = leadsPrev.reduce((sum, l) => sum + (l.leads_totales || 0), 0);
    const totalAgendadosPrev = agendamientosPrev.length; // Agendamientos por fecha_hora en el periodo anterior
    const totalProspectosRegistradosPrev = prospectosPrev.length; // Prospectos por fecha_ingreso
    
    const hoy = new Date().toISOString();
    const agendamientosVencidosPrev = agendamientosPrev.filter(a => {
      const fechaVisita = a.fecha_hora || '';
      return fechaVisita <= hoy;
    });
    
    // Contar asistencias: incluye los que marcaron "Asistió" + los que convirtieron (compraron)
    const agendamientosConVentaPrev = new Set(ventasConAgendamientoPrev.map(v => v.agendamiento_id).filter(Boolean));
    const totalAsistieronPrev = agendamientosVencidosPrev.filter(a => 
      a.resultado_asistencia === 'Asistió' || agendamientosConVentaPrev.has(a.id)
    ).length;
    
    const planesMap = {};
    planes.forEach(p => planesMap[p.id] = p);
    
    // Obtener TODAS las ventas de Plan/Programa (sin filtro de fecha) para determinar primera compra
    const todasVentasPlanPrograma = ventas.filter(v => {
        const plan = planesMap[v.plan];
        const tipoItem = plan?.tipo_item || '';
        const matchSede = !selectedSede || selectedSede === 'all' || v.sede === selectedSede;
        return (tipoItem === 'Plan' || tipoItem === 'Programa') && v.estado === 'Cerrada' && matchSede;
    });
    
    // Agrupar por whatsapp y encontrar la primera compra de cada cliente
    const primerasComprasPorWhatsappPrev = {};
    todasVentasPlanPrograma.forEach(venta => {
        const prospecto = prospectos.find(p => p.id === venta.prospecto_id);
        if (prospecto && prospecto.whatsapp) {
            const whatsapp = prospecto.whatsapp;
            if (!primerasComprasPorWhatsappPrev[whatsapp] || venta.fecha_venta < primerasComprasPorWhatsappPrev[whatsapp].fecha_venta) {
                primerasComprasPorWhatsappPrev[whatsapp] = venta;
            }
        }
    });
    
    // Contar solo las primeras compras que caen en el periodo anterior
    const clientesNuevosEnPeriodoPrev = Object.values(primerasComprasPorWhatsappPrev).filter(primeraVenta => {
        const matchFecha = (!fechaInicioPrev || primeraVenta.fecha_venta >= fechaInicioPrev) && (!fechaFinPrev || primeraVenta.fecha_venta <= fechaFinPrev);
        return matchFecha;
    });
    
    const totalClientesNuevosPrev = clientesNuevosEnPeriodoPrev.length;
    const ventasValidasPrev = clientesNuevosEnPeriodoPrev;
    const agendamientosAsistieronPeriodoPrev = agendamientosPrev.filter(a => a.resultado_asistencia === 'Asistió');
    const totalVentasPrev = ventasPrev.length;

    const tasaAgendamientoPrev = totalLeadsPrev > 0 ? (totalProspectosRegistradosPrev / totalLeadsPrev * 100).toFixed(2) : 0;

    const tasaAsistenciaPrev = agendamientosVencidosPrev.length > 0 ? (totalAsistieronPrev / agendamientosVencidosPrev.length * 100).toFixed(2) : 0;
    const tasaConversionPrev = agendamientosAsistieronPeriodoPrev.length > 0 ? (totalClientesNuevosPrev / agendamientosAsistieronPeriodoPrev.length * 100).toFixed(2) : 0;

    let tiempoPromedioConversionPrev = 0;
    const tiemposConversionPrev = [];
    
    ventasValidasPrev.forEach(venta => {
      const prospecto = prospectos.find(p => p.id === venta.prospecto_id);
      if (prospecto) {
        const agendamientosProspecto = agendamientos
          .filter(a => a.prospecto_id === prospecto.id)
          .sort((a, b) => (a.fecha_hora || '').localeCompare(b.fecha_hora || ''));
        
        if (agendamientosProspecto.length > 0) {
          const primerAgendamiento = agendamientosProspecto[0];
          const fechaAgenda = primerAgendamiento.fecha_hora?.split('T')[0];
          const fechaVenta = venta.fecha_venta;
          
          if (fechaAgenda && fechaVenta) {
            const dateAgenda = new Date(fechaAgenda);
            const dateVenta = new Date(fechaVenta);
            const diffTime = dateVenta - dateAgenda;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 0) {
              tiemposConversionPrev.push(diffDays);
            }
          }
        }
      }
    });
    
    if (tiemposConversionPrev.length > 0) {
      const sumaTiempos = tiemposConversionPrev.reduce((sum, t) => sum + t, 0);
      tiempoPromedioConversionPrev = (sumaTiempos / tiemposConversionPrev.length).toFixed(1);
    }

    setMetricasMesAnterior({
      totalLeads: totalLeadsPrev,
      totalAgendados: totalAgendadosPrev,
      totalAsistieron: totalAsistieronPrev,
      totalVentas: totalVentasPrev,
      totalClientesNuevos: totalClientesNuevosPrev,
      tasaAgendamiento: tasaAgendamientoPrev,
      tasaAsistencia: tasaAsistenciaPrev,
      tasaConversion: tasaConversionPrev,
      tiempoPromedioConversion: tiempoPromedioConversionPrev
    });
  };

  const calcularTendencia = (valorActual, valorAnterior) => {
    if (!valorAnterior || valorAnterior === 0) return { porcentaje: 0, direccion: 'igual' };
    const cambio = ((valorActual - valorAnterior) / valorAnterior) * 100;
    const direccion = cambio > 0 ? 'arriba' : cambio < 0 ? 'abajo' : 'igual';
    return { porcentaje: Math.abs(cambio).toFixed(1), direccion };
  };

  const TrendIndicator = ({ actual, anterior }) => {
    const { porcentaje, direccion } = calcularTendencia(parseFloat(actual), parseFloat(anterior));
    
    if (direccion === 'igual') {
      return (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Minus className="w-3 h-3" />
          <span>0%</span>
        </div>
      );
    }
    
    return (
      <div className={`flex items-center gap-1 text-xs ${direccion === 'arriba' ? 'text-green-600' : 'text-red-600'}`}>
        {direccion === 'arriba' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
        <span>{porcentaje}%</span>
      </div>
    );
  };

  const getAlertColor = (valor, tipo) => {
    const num = parseFloat(valor);
    if (tipo === 'asistencia') {
      if (num > 70) return 'bg-green-500';
      if (num >= 60) return 'bg-yellow-500';
      return 'bg-red-500';
    } else if (tipo === 'conversion') {
      if (num > 70) return 'bg-green-500';
      if (num >= 65) return 'bg-yellow-500';
      return 'bg-red-500';
    }
    return 'bg-gray-500';
  };

  const getAlertText = (valor, tipo) => {
    const num = parseFloat(valor);
    if (tipo === 'asistencia') {
      if (num > 70) return 'Excelente';
      if (num >= 60) return 'Normal';
      return 'Muy Bajo';
    } else if (tipo === 'conversion') {
      if (num > 70) return 'Excelente';
      if (num >= 65) return 'Normal';
      return 'Muy Bajo';
    }
    return '';
  };

  // Show loading while permissions are being fetched
  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
          <p className="mt-2 text-gray-500">Cargando permisos...</p>
        </div>
      </div>
    );
  }

  // Check permission - show access denied if no permission
  if (!hasPermission('ver_dashboard_comercial')) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <ShieldAlert className="w-16 h-16 mx-auto text-red-500 mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
              <p className="text-gray-500 mb-4">
                No tienes permisos para ver el Dashboard Comercial.
              </p>
              <div className="text-sm text-gray-400 bg-gray-50 p-3 rounded">
                <p><strong>Usuario:</strong> {user?.email || 'N/A'}</p>
                <p><strong>Staff:</strong> {userStaff?.nombre || 'No encontrado'}</p>
                <p><strong>Rol:</strong> {role?.nombre_rol || 'Sin rol asignado'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard Comercial</h1>
      </div>

      {/* Debug info - remove in production */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-4">
          <p className="text-sm text-green-800">
            ✅ <strong>Permisos cargados correctamente</strong> | 
            Usuario: {user?.email} | 
            Staff: {userStaff?.nombre || 'N/A'} | 
            Rol: {role?.nombre_rol || 'N/A'}
          </p>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="filter-sede">Filtrar por Sede</Label>
              <Select
                value={selectedSede}
                onValueChange={(value) => setSelectedSede(value)}
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
            <div>
              <Label htmlFor="filter-month">Mes</Label>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar mes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Enero</SelectItem>
                  <SelectItem value="2">Febrero</SelectItem>
                  <SelectItem value="3">Marzo</SelectItem>
                  <SelectItem value="4">Abril</SelectItem>
                  <SelectItem value="5">Mayo</SelectItem>
                  <SelectItem value="6">Junio</SelectItem>
                  <SelectItem value="7">Julio</SelectItem>
                  <SelectItem value="8">Agosto</SelectItem>
                  <SelectItem value="9">Septiembre</SelectItem>
                  <SelectItem value="10">Octubre</SelectItem>
                  <SelectItem value="11">Noviembre</SelectItem>
                  <SelectItem value="12">Diciembre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filter-year">Año</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar año" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas de Sedes - Desplegable y Discreto */}
      {alertasSedes.length > 0 ? (
        <Collapsible open={alertasOpen} onOpenChange={setAlertasOpen}>
          <Card className="border-gray-200">
            <CollapsibleTrigger className="w-full">
              <CardHeader className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2 text-gray-700">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Sedes que requieren atención ({alertasSedes.length})
                  </CardTitle>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${alertasOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {alertasSedes.map((alerta, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSedeSeleccionada(alerta)}
                      className="px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-full text-xs font-semibold transition-colors flex items-center gap-1 border border-orange-300"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {alerta.sede}
                    </button>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ) : (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-green-800">
              <div className="text-2xl">✅</div>
              <p className="text-sm font-medium">Todas las sedes están dentro del rango esperado</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Detalle de Alerta */}
      <Dialog open={!!sedeSeleccionada} onOpenChange={() => setSedeSeleccionada(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Detalle de Alertas - {sedeSeleccionada?.sede}
            </DialogTitle>
          </DialogHeader>
          
          {sedeSeleccionada && (
            <div className="space-y-4">
              {/* Asistencia */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-3">ASISTENCIA</h3>
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-3 py-1.5 rounded text-sm font-semibold ${sedeSeleccionada.colorAsistencia}`}>
                    {sedeSeleccionada.estadoAsistencia}
                  </span>
                  <span className="text-2xl font-bold">{sedeSeleccionada.tasaAsistencia}%</span>
                </div>
                <div className="mt-3 text-xs text-gray-600 space-y-1 bg-gray-50 p-2 rounded">
                  <p>🟢 Excelente: Mayor de 70%</p>
                  <p>🟡 Normal: Entre 60% y 70%</p>
                  <p>🔴 Muy Bajo: Menor de 60%</p>
                </div>
              </div>

              {/* Conversión */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-3">CONVERSIÓN</h3>
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-3 py-1.5 rounded text-sm font-semibold ${sedeSeleccionada.colorConversion}`}>
                    {sedeSeleccionada.estadoConversion}
                  </span>
                  <span className="text-2xl font-bold">{sedeSeleccionada.tasaConversion}%</span>
                </div>
                <div className="mt-3 text-xs text-gray-600 space-y-1 bg-gray-50 p-2 rounded">
                  <p>🟢 Excelente: Mayor de 70%</p>
                  <p>🟡 Normal: Entre 65% y 70%</p>
                  <p>🔴 Muy Bajo: Menor de 65%</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogos de Detalle */}
      <DetalleLeadsDialog 
        open={dialogLeadsOpen}
        onOpenChange={setDialogLeadsOpen}
        leadsData={leadsData}
        sucursales={sucursales}
        staffList={staffList}
      />
      
      <DetalleAgendamientosDialog 
        open={dialogAgendamientosOpen}
        onOpenChange={setDialogAgendamientosOpen}
        prospectosData={prospectosData}
        sucursales={sucursales}
        staffList={staffList}
      />
      
      <DetalleAsistenciasDialog 
        open={dialogAsistenciasOpen}
        onOpenChange={setDialogAsistenciasOpen}
        agendamientosData={agendamientosData}
        prospectosData={prospectosData}
        sucursales={sucursales}
        staffList={staffList}
        cerradores={cerradores}
      />
      
      <DetalleVentasDialog 
        open={dialogVentasOpen}
        onOpenChange={setDialogVentasOpen}
        ventasData={ventasData}
        prospectosData={prospectosData}
        planesData={planes}
        sucursales={sucursales}
        staffList={staffList}
        cerradores={cerradores}
      />

      {/* Métricas Generales con Comparativa */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow hover:border-blue-500" 
          onClick={() => {
            console.log('Click en Total Leads, abriendo diálogo con', leadsData.length, 'registros');
            setDialogLeadsOpen(true);
          }}
        >
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <div className="text-xl sm:text-2xl font-bold">{metricas.totalLeads}</div>
                <p className="text-xs text-muted-foreground">Total Leads</p>
              </div>
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-gray-500">Mes anterior: {metricasMesAnterior.totalLeads}</span>
              <TrendIndicator actual={metricas.totalLeads} anterior={metricasMesAnterior.totalLeads} />
            </div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow hover:border-green-500" 
          onClick={() => {
            console.log('Click en Agendamientos, abriendo diálogo con', prospectosData.length, 'registros');
            setDialogAgendamientosOpen(true);
          }}
        >
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <div className="text-xl sm:text-2xl font-bold">{metricas.totalAgendados}</div>
                <p className="text-xs text-muted-foreground">Agendados</p>
                <div className="text-xs space-y-0.5">
                  <p className="text-green-600 font-medium">% Agend (Prospectos): {metricas.tasaAgendamiento}%</p>
                </div>
              </div>
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-gray-500">Mes anterior: {metricasMesAnterior.totalAgendados}</span>
              <TrendIndicator actual={metricas.totalAgendados} anterior={metricasMesAnterior.totalAgendados} />
            </div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow hover:border-purple-500" 
          onClick={() => {
            console.log('Click en Asistencias, abriendo diálogo con', agendamientosData.length, 'agendamientos');
            setDialogAsistenciasOpen(true);
          }}
        >
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <div className="text-xl sm:text-2xl font-bold">{metricas.totalAsistieron}</div>
                <p className="text-xs text-muted-foreground">Asistieron</p>
                <p className="text-xs text-purple-600 font-medium">{metricas.tasaAsistencia}%</p>
              </div>
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-gray-500">Mes anterior: {metricasMesAnterior.totalAsistieron}</span>
              <TrendIndicator actual={metricas.totalAsistieron} anterior={metricasMesAnterior.totalAsistieron} />
            </div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow hover:border-orange-500" 
          onClick={() => {
            // Filtrar solo ventas de clientes nuevos (primera compra por whatsapp)
            const planesMap = {};
            planes.forEach(p => planesMap[p.id] = p);
            
            const ventasValidas = ventasData.filter(v => {
              const plan = planesMap[v.plan];
              const tipoItem = plan?.tipo_item || '';
              return tipoItem === 'Plan' || tipoItem === 'Programa';
            });
            
            // Agrupar por whatsapp y tomar solo la primera venta de cada cliente
            const ventasPorWhatsapp = {};
            ventasValidas.forEach(venta => {
              const prospecto = prospectosData.find(p => p.id === venta.prospecto_id);
              if (prospecto && prospecto.whatsapp) {
                if (!ventasPorWhatsapp[prospecto.whatsapp]) {
                  ventasPorWhatsapp[prospecto.whatsapp] = venta;
                }
              }
            });
            
            const ventasClientesNuevos = Object.values(ventasPorWhatsapp);
            console.log('Click en Conversiones, abriendo diálogo con', ventasClientesNuevos.length, 'clientes nuevos');
            setVentasData(ventasClientesNuevos);
            setDialogVentasOpen(true);
          }}
        >
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <div className="text-xl sm:text-2xl font-bold">{metricas.totalClientesNuevos}</div>
                <p className="text-xs text-muted-foreground">Conversiones</p>
                <p className="text-xs text-orange-600 font-medium">{metricas.tasaConversion}%</p>
              </div>
              <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-gray-500">Mes anterior: {metricasMesAnterior.totalClientesNuevos}</span>
              <TrendIndicator actual={metricas.totalClientesNuevos} anterior={metricasMesAnterior.totalClientesNuevos} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <div className="text-xl sm:text-2xl font-bold">{metricas.tiempoPromedioConversion}</div>
                <p className="text-xs text-muted-foreground">Días Promedio</p>
                <p className="text-xs text-cyan-600 font-medium">Conversión</p>
              </div>
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-500" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-gray-500">Mes anterior: {metricasMesAnterior.tiempoPromedioConversion}</span>
              <TrendIndicator actual={metricas.tiempoPromedioConversion} anterior={metricasMesAnterior.tiempoPromedioConversion} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs con Métricas Detalladas */}
      <Tabs defaultValue="sede" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sede">Por Sede</TabsTrigger>
          <TabsTrigger value="vendedor">Por Vendedor</TabsTrigger>
          <TabsTrigger value="cerrador">Por Cerrador</TabsTrigger>
          <TabsTrigger value="seguimiento">Seguimiento</TabsTrigger>
        </TabsList>

        {/* Métricas por Sede */}
        <TabsContent value="sede">
          <Card>
            <CardHeader>
              <CardTitle>Métricas por Sede</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Cargando...</div>
              ) : (
                <>
                  <Collapsible open={infoOpen} onOpenChange={setInfoOpen}>
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mb-4 w-full sm:w-auto flex items-center gap-2 text-blue-700 border-blue-300 hover:bg-blue-50"
                      >
                        <Info className="w-4 h-4" />
                        <span>Cálculo de Ventas Corregido</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${infoOpen ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded text-sm">
                        <ul className="space-y-1 text-blue-800">
                          <li>• <strong>Con Agenda:</strong> Ventas vinculadas a un agendamiento (se cuentan por fecha del agendamiento)</li>
                          <li>• <strong>Sin Agenda:</strong> Ventas directas, walk-in u online sin agendamiento previo</li>
                          <li>• <strong>Clientes Nuevos:</strong> Primera compra de Plan/Programa por cliente único (WhatsApp)</li>
                          <li>• <strong>Asistieron:</strong> Ahora SIEMPRE será ≥ Ventas Con Agenda (lógica consistente)</li>
                        </ul>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                  <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sede</TableHead>
                        <TableHead className="text-right">Leads</TableHead>
                        <TableHead className="text-right">Agendados</TableHead>
                        <TableHead className="text-right">Asistieron</TableHead>
                        <TableHead className="text-right">Ventas Total</TableHead>
                        <TableHead className="text-right">Con Agenda</TableHead>
                        <TableHead className="text-right">Sin Agenda</TableHead>
                        <TableHead className="text-right">Clientes Nuevos</TableHead>
                        <TableHead className="text-right">% Agendamiento</TableHead>
                        <TableHead className="text-right">% Asistencia</TableHead>
                        <TableHead className="text-right">% Conversión</TableHead>
                        <TableHead className="text-right">% Conv. por Agendado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metricasPorSede.map((m) => (
                        <TableRow key={m.sede}>
                          <TableCell className="font-medium">{m.sede}</TableCell>
                          <TableCell className="text-right">{m.leads}</TableCell>
                          <TableCell className="text-right">{m.agendados}</TableCell>
                          <TableCell className="text-right">{m.asistieron}</TableCell>
                          <TableCell className="text-right font-bold">{m.ventas}</TableCell>
                          <TableCell className="text-right text-blue-600">{m.ventasConAgendamiento}</TableCell>
                          <TableCell className="text-right text-gray-500">{m.ventasSinAgendamiento}</TableCell>
                          <TableCell className="text-right text-green-600 font-medium">{m.clientesNuevos}</TableCell>
                          <TableCell className="text-right text-green-600 font-medium">{m.tasaAgendamiento}%</TableCell>
                          <TableCell className="text-right text-purple-600 font-medium">{m.tasaAsistencia}%</TableCell>
                          <TableCell className="text-right text-orange-600 font-medium">{m.tasaConversion}%</TableCell>
                          <TableCell className="text-right text-pink-600 font-medium">{m.tasaConversionPorAgendado}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Métricas por Vendedor */}
        <TabsContent value="vendedor">
          <Card>
            <CardHeader>
              <CardTitle>Métricas por Vendedor</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Cargando...</div>
              ) : metricasPorVendedor.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No hay datos</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendedor</TableHead>
                        <TableHead className="text-right">Leads</TableHead>
                        <TableHead className="text-right">Agendados</TableHead>
                        <TableHead className="text-right">Ventas</TableHead>
                        <TableHead className="text-right">% Agendamiento</TableHead>
                        <TableHead className="text-right">% Conversión</TableHead>
                        <TableHead className="text-right">% Conv. por Agendado</TableHead>
                        <TableHead className="text-right">% Conv. por Leads</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metricasPorVendedor.map((m, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{m.vendedorNombre}</TableCell>
                          <TableCell className="text-right">{m.leads}</TableCell>
                          <TableCell className="text-right">{m.agendados}</TableCell>
                          <TableCell className="text-right">{m.ventas}</TableCell>
                          <TableCell className="text-right text-green-600 font-medium">{m.tasaAgendamiento}%</TableCell>
                          <TableCell className="text-right text-orange-600 font-medium">{m.tasaConversion}%</TableCell>
                          <TableCell className="text-right text-pink-600 font-medium">{m.tasaConversionPorAgendado}%</TableCell>
                          <TableCell className="text-right text-blue-600 font-medium">{m.tasaConversionPorLeads}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Métricas por Cerrador */}
        <TabsContent value="cerrador">
          <Card>
            <CardHeader>
              <CardTitle>Métricas por Cerrador (Ventas en Sede)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Cargando...</div>
              ) : metricasPorCerrador.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No hay datos de cerradores</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cerrador</TableHead>
                        <TableHead className="text-right">Ventas Totales</TableHead>
                        <TableHead className="text-right">Directas</TableHead>
                        <TableHead className="text-right">Post-Asistencia</TableHead>
                        <TableHead className="text-right">% Conversión</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metricasPorCerrador.map((m, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{m.cerradorNombre}</TableCell>
                          <TableCell className="text-right font-bold">{m.ventasCerradas}</TableCell>
                          <TableCell className="text-right text-green-600">{m.ventasDirectas}</TableCell>
                          <TableCell className="text-right text-blue-600">
                            {m.ventasPostAsistencia > 0 && (
                              <span className="inline-flex items-center">
                                {m.ventasPostAsistencia}
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({((m.ventasPostAsistencia / m.ventasCerradas) * 100).toFixed(0)}%)
                                </span>
                              </span>
                            )}
                            {m.ventasPostAsistencia === 0 && '-'}
                          </TableCell>
                          <TableCell className="text-right text-orange-600 font-medium">{m.tasaConversion}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded text-sm">
                    <p className="font-medium text-blue-900">ℹ️ Interpretación:</p>
                    <ul className="mt-2 space-y-1 text-blue-800">
                      <li>• <strong>Ventas Totales:</strong> Total de ventas cerradas por el cerrador</li>
                      <li>• <strong>Directas:</strong> Ventas cerradas en el momento de la visita</li>
                      <li>• <strong>Post-Asistencia:</strong> Ventas cerradas después con ayuda del seguimiento online</li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Métricas de Seguimiento Online */}
        <TabsContent value="seguimiento">
          <Card>
            <CardHeader>
              <CardTitle>Contribuciones del Equipo de Seguimiento Online</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Cargando...</div>
              ) : metricasSeguimiento.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No hay ventas post-asistencia registradas en este periodo</p>
                  <p className="text-sm mt-2">Las ventas post-asistencia se registran cuando se marca el checkbox en el formulario de venta</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Responsable</TableHead>
                          <TableHead className="text-right">Ventas Apoyadas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metricasSeguimiento.map((m, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{m.responsableNombre}</TableCell>
                            <TableCell className="text-right text-blue-600 font-bold">{m.contribuciones}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-500 rounded text-sm">
                    <p className="font-medium text-green-900">✅ Impacto del Seguimiento Online:</p>
                    <p className="mt-2 text-green-800">
                      Estas ventas fueron cerradas por cerradores después de la visita, pero con el apoyo del seguimiento online. 
                      El cerrador mantiene el crédito de la venta, pero aquí se reconoce la contribución del equipo de seguimiento.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ========================================
          SECCIÓN EVO: DATOS DE WHATSAPP/CONTACTOS
          ======================================== */}
      <SeccionEvo />

    </div>
  );
}