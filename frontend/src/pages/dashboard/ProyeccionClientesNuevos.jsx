import React, { useState, useEffect } from 'react';
import { Ads_Gasto_Diario } from '@/entities/Ads_Gasto_Diario';
import { Leads_Diarios } from '@/entities/Leads_Diarios';
import { Prospectos } from '@/entities/Prospectos';
import { Agendamientos } from '@/entities/Agendamientos';
import { Ventas } from '@/entities/Ventas';
import { Planes_Servicios } from '@/entities/Planes_Servicios';
import { Sucursales } from '@/entities/Sucursales';
import { Proyeccion_Configuracion } from '@/entities/Proyeccion_Configuracion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, DollarSign, Users, Target, Calendar, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ProyeccionClientesNuevos() {
  const [loading, setLoading] = useState(false);
  const [selectedSede, setSelectedSede] = useState('all');
  const [selectedMes, setSelectedMes] = useState('');
  const [sedes, setSedes] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [proyeccionGeneral, setProyeccionGeneral] = useState(null);
  const [proyeccionesPorSede, setProyeccionesPorSede] = useState([]);

  useEffect(() => {
    fetchSedes();
    fetchPlanes();
    // Establecer mes actual por defecto
    const hoy = new Date();
    const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMes(mesActual);
  }, []);

  useEffect(() => {
    if (sedes.length > 0 && selectedMes) {
      fetchProyeccion();
    }
  }, [selectedSede, selectedMes, sedes, planes]);

  const fetchSedes = async () => {
    try {
      const sedesData = await Sucursales.list('nombre_sede');
      setSedes(sedesData.filter(s => s.activa !== false));
    } catch (error) {
      console.error('Error fetching sedes:', error);
    }
  };

  const fetchPlanes = async () => {
    try {
      const planesData = await Planes_Servicios.list();
      setPlanes(planesData.filter(p => p.activo !== false));
    } catch (error) {
      console.error('Error fetching planes:', error);
    }
  };

  const fetchProyeccion = async () => {
    setLoading(true);
    try {
      // Calcular rango de fechas del mes seleccionado
      const [year, month] = selectedMes.split('-');
      const fechaInicio = `${year}-${month}-01`;
      const ultimoDia = new Date(parseInt(year), parseInt(month), 0).getDate();
      const fechaFin = `${year}-${month}-${ultimoDia}`;

      const [gastosAll, leadsAll, prospectosAll, agendamientosAll, ventasAll, configuraciones] = await Promise.all([
        Ads_Gasto_Diario.list('-fecha'),
        Leads_Diarios.list('-fecha'),
        Prospectos.list('-fecha_ingreso'),
        Agendamientos.list('-fecha_hora'),
        Ventas.list('-fecha_venta'),
        Proyeccion_Configuracion.list()
      ]);

      // Filtrar datos por el mes seleccionado
      const gastosHistoricos = gastosAll.filter(g => g.fecha >= fechaInicio && g.fecha <= fechaFin);
      const leadsHistoricos = leadsAll.filter(l => l.fecha >= fechaInicio && l.fecha <= fechaFin);
      const prospectosHistoricos = prospectosAll.filter(p => {
        const fecha = p.fecha_ingreso || '';
        return fecha >= fechaInicio && fecha <= fechaFin;
      });
      const agendamientosHistoricos = agendamientosAll.filter(a => {
        const fecha = a.fecha_hora?.split('T')[0] || '';
        return fecha >= fechaInicio && fecha <= fechaFin;
      });
      const ventasHistoricas = ventasAll.filter(v => {
        return v.fecha_venta >= fechaInicio && v.fecha_venta <= fechaFin && v.estado === 'Cerrada';
      });

      if (selectedSede === 'all') {
        // Proyecciones por sede
        const proyeccionesSedes = sedes.map(sede => {
          return calcularProyeccion(
            sede.id,
            gastosHistoricos,
            leadsHistoricos,
            prospectosHistoricos,
            agendamientosHistoricos,
            ventasHistoricas,
            configuraciones
          );
        }).filter(p => p.presupuestoMensual > 0 || p.leadsHistoricos > 0);

        setProyeccionesPorSede(proyeccionesSedes);

        // Proyección consolidada: sumar todas las proyecciones de sedes
        const proyeccionConsolidada = {
          sedeId: null,
          sedeNombre: 'Todas las sedes',
          // Sumar métricas históricas
          gastoHistorico: proyeccionesSedes.reduce((sum, p) => sum + p.gastoHistorico, 0),
          leadsHistoricos: proyeccionesSedes.reduce((sum, p) => sum + p.leadsHistoricos, 0),
          agendadosHistoricos: proyeccionesSedes.reduce((sum, p) => sum + p.agendadosHistoricos, 0),
          agendamientosVencidos: proyeccionesSedes.reduce((sum, p) => sum + p.agendamientosVencidos, 0), // CORREGIDO: sumar agendamientos vencidos
          asistenciasHistoricas: proyeccionesSedes.reduce((sum, p) => sum + p.asistenciasHistoricas, 0),
          clientesNuevosHistoricos: proyeccionesSedes.reduce((sum, p) => sum + p.clientesNuevosHistoricos, 0),
          ventasHistoricas: proyeccionesSedes.reduce((sum, p) => sum + p.ventasHistoricas, 0),
          // Sumar presupuesto proyectado
          presupuestoMensual: proyeccionesSedes.reduce((sum, p) => sum + p.presupuestoMensual, 0),
          // Sumar proyecciones
          leadsProyectados: proyeccionesSedes.reduce((sum, p) => sum + p.leadsProyectados, 0),
          agendadosProyectados: proyeccionesSedes.reduce((sum, p) => sum + p.agendadosProyectados, 0),
          asistenciasProyectadas: proyeccionesSedes.reduce((sum, p) => sum + p.asistenciasProyectadas, 0),
          clientesNuevosProyectados: proyeccionesSedes.reduce((sum, p) => sum + p.clientesNuevosProyectados, 0),
          ventasProyectadas: proyeccionesSedes.reduce((sum, p) => sum + p.ventasProyectadas, 0),
          // Calcular métricas promedio ponderadas
          costoLeadCalculado: 0,
          porcentajeAgendamientoCalculado: 0,
          porcentajeAsistenciaCalculado: 0,
          porcentajeConversionCalculado: 0,
          ticketPromedioCalculado: 0,
          costoLead: 0,
          porcAgendamiento: 0,
          porcAsistencia: 0,
          porcConversion: 0,
          ticketPromedio: 0,
          tieneConfigManual: proyeccionesSedes.some(p => p.tieneConfigManual),
          esProyeccionValida: proyeccionesSedes.length > 0 && proyeccionesSedes.some(p => p.esProyeccionValida)
        };

        // Calcular métricas consolidadas
        const totalGastoHistorico = proyeccionConsolidada.gastoHistorico;
        const totalLeadsHistoricos = proyeccionConsolidada.leadsHistoricos;
        const totalAgendadosHistoricos = proyeccionConsolidada.agendadosHistoricos;
        const totalAgendamientosVencidos = proyeccionConsolidada.agendamientosVencidos; // CORREGIDO: usar agendamientos vencidos
        const totalAsistenciasHistoricas = proyeccionConsolidada.asistenciasHistoricas;
        const totalClientesNuevosHistoricos = proyeccionConsolidada.clientesNuevosHistoricos;
        const totalVentasHistoricas = proyeccionConsolidada.ventasHistoricas;
        const totalPresupuestoProyectado = proyeccionConsolidada.presupuestoMensual;
        const totalLeadsProyectados = proyeccionConsolidada.leadsProyectados;

        proyeccionConsolidada.costoLeadCalculado = totalLeadsHistoricos > 0 ? totalGastoHistorico / totalLeadsHistoricos : 0;
        proyeccionConsolidada.porcentajeAgendamientoCalculado = totalLeadsHistoricos > 0 ? (totalAgendadosHistoricos / totalLeadsHistoricos) * 100 : 0;
        // CORREGIDO: usar agendamientos vencidos para calcular % asistencia
        proyeccionConsolidada.porcentajeAsistenciaCalculado = totalAgendamientosVencidos > 0 ? (totalAsistenciasHistoricas / totalAgendamientosVencidos) * 100 : 0;
        // CORREGIDO: usar agendamientos vencidos para calcular % conversión
        proyeccionConsolidada.porcentajeConversionCalculado = totalAgendamientosVencidos > 0 ? (totalClientesNuevosHistoricos / totalAgendamientosVencidos) * 100 : 0;
        proyeccionConsolidada.ticketPromedioCalculado = totalClientesNuevosHistoricos > 0 ? totalVentasHistoricas / totalClientesNuevosHistoricos : 0;

        proyeccionConsolidada.costoLead = totalLeadsProyectados > 0 ? totalPresupuestoProyectado / totalLeadsProyectados : proyeccionConsolidada.costoLeadCalculado;
        proyeccionConsolidada.porcAgendamiento = proyeccionConsolidada.porcentajeAgendamientoCalculado;
        proyeccionConsolidada.porcAsistencia = proyeccionConsolidada.porcentajeAsistenciaCalculado;
        proyeccionConsolidada.porcConversion = proyeccionConsolidada.porcentajeConversionCalculado;
        proyeccionConsolidada.ticketPromedio = proyeccionConsolidada.ticketPromedioCalculado;

        setProyeccionGeneral(proyeccionConsolidada);
      } else {
        // Proyección de una sede específica
        const proyeccion = calcularProyeccion(
          selectedSede,
          gastosHistoricos,
          leadsHistoricos,
          prospectosHistoricos,
          agendamientosHistoricos,
          ventasHistoricas,
          configuraciones
        );
        setProyeccionGeneral(proyeccion);
        setProyeccionesPorSede([]);
      }

    } catch (error) {
      console.error('Error fetching proyeccion:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularProyeccion = (sedeId, gastos, leads, prospectos, agendamientos, ventas, configuraciones) => {
    // Filtrar por sede si es necesario
    const gastosS = sedeId ? gastos.filter(g => g.sede === sedeId) : gastos;
    const leadsS = sedeId ? leads.filter(l => l.sede === sedeId) : leads;
    const prospectosS = sedeId ? prospectos.filter(p => p.sede === sedeId) : prospectos;
    const agendamientosS = sedeId ? agendamientos.filter(a => a.sede === sedeId) : agendamientos;
    const ventasS = sedeId ? ventas.filter(v => v.sede === sedeId) : ventas;

    // Buscar configuración manual para esta sede y mes
    const config = configuraciones.find(c => 
      c.sede === sedeId && 
      c.mes === selectedMes && 
      c.activo !== false
    );

    // Calcular métricas históricas (últimos 30 días)
    const totalGastoHistorico = gastosS.reduce((sum, g) => sum + (g.gasto_monto || 0), 0);
    const totalLeadsHistorico = leadsS.reduce((sum, l) => sum + (l.leads_totales || 0), 0);
    const totalAgendadosHistorico = prospectosS.length;
    
    // CORRECCIÓN: Calcular asistencias solo sobre agendamientos vencidos (fecha_hora <= hoy)
    const hoy = new Date().toISOString();
    const agendamientosVencidos = agendamientosS.filter(a => {
      const fechaVisita = a.fecha_hora || '';
      return fechaVisita <= hoy;
    });
    
    // Calcular asistencias (agendamientos vencidos con resultado "Asistió")
    const totalAsistenciasHistorico = agendamientosVencidos.filter(a => 
      a.resultado_asistencia === 'Asistió'
    ).length;
    
    // Total de agendamientos vencidos (para calcular porcentajes correctamente)
    const totalAgendamientosVencidos = agendamientosVencidos.length;

    // Calcular clientes nuevos (whatsapp único con venta de Plan o Programa)
    const planesMap = {};
    planes.forEach(p => {
      planesMap[p.id] = p;
    });

    const prospectoMap = {};
    prospectosS.forEach(p => {
      prospectoMap[p.id] = p;
    });

    const clientesPorWhatsapp = {};
    let totalVentas = 0;
    
    ventasS.forEach(venta => {
      const prospecto = prospectoMap[venta.prospecto_id];
      if (!prospecto?.whatsapp) return;

      const plan = planesMap[venta.plan];
      const tipoItem = plan?.tipo_item || '';
      
      if (tipoItem !== 'Plan' && tipoItem !== 'Programa') return;

      const whatsapp = prospecto.whatsapp;
      if (!clientesPorWhatsapp[whatsapp]) {
        clientesPorWhatsapp[whatsapp] = true;
      }

      totalVentas += (venta.monto || 0);
    });

    const totalClientesNuevosHistorico = Object.keys(clientesPorWhatsapp).length;

    // Calcular métricas promedio
    const costoLeadCalculado = totalLeadsHistorico > 0 ? totalGastoHistorico / totalLeadsHistorico : 0;
    const porcentajeAgendamientoCalculado = totalLeadsHistorico > 0 ? (totalAgendadosHistorico / totalLeadsHistorico) * 100 : 0;
    // CORRECCIÓN: % Asistencia se calcula sobre agendamientos vencidos, no sobre todos los agendamientos
    const porcentajeAsistenciaCalculado = agendamientosVencidos.length > 0 ? (totalAsistenciasHistorico / agendamientosVencidos.length) * 100 : 0;
    // CORRECCIÓN: % Conversión por Agendado = clientes nuevos / agendamientos vencidos (igual que DashboardComercial)
    const porcentajeConversionCalculado = agendamientosVencidos.length > 0 ? (totalClientesNuevosHistorico / agendamientosVencidos.length) * 100 : 0;
    const ticketPromedioCalculado = totalClientesNuevosHistorico > 0 ? totalVentas / totalClientesNuevosHistorico : 0;

    // IMPORTANTE: El presupuesto debe ser PROYECTADO (configurado manualmente), no el gasto histórico
    // Si no hay configuración manual, no se puede proyectar
    const presupuestoMensualProyectado = config?.presupuesto_mensual || 0;

    // Usar configuración manual si existe, sino usar valores calculados
    const presupuestoMensual = presupuestoMensualProyectado;
    const costoLead = config?.costo_por_lead || costoLeadCalculado;
    const porcAgendamiento = config?.porcentaje_agendamiento || porcentajeAgendamientoCalculado;
    const porcAsistencia = config?.porcentaje_asistencia || porcentajeAsistenciaCalculado;
    const porcConversion = config?.porcentaje_conversion || porcentajeConversionCalculado;
    const ticketPromedio = config?.ticket_promedio || ticketPromedioCalculado;

    // PROYECCIÓN COMPLETA: Desde presupuesto proyectado hacia todas las métricas
    const leadsProyectados = costoLead > 0 && presupuestoMensual > 0 ? presupuestoMensual / costoLead : 0;
    const agendadosProyectados = leadsProyectados * (porcAgendamiento / 100);
    // CORRECCIÓN: Las asistencias proyectadas deben calcularse sobre agendados proyectados usando el % de asistencia
    // que se calcula sobre agendamientos vencidos. Esto es correcto porque proyectamos que todos los agendados
    // eventualmente vencerán y tendrán el mismo % de asistencia histórico
    const asistenciasProyectadas = agendadosProyectados * (porcAsistencia / 100);
    // CORRECCIÓN: Los clientes nuevos proyectados se calculan sobre agendados proyectados (que eventualmente vencerán)
    // usando el % de conversión que se calcula sobre agendamientos vencidos
    const clientesNuevosProyectados = agendadosProyectados * (porcConversion / 100);
    const ventasProyectadas = clientesNuevosProyectados * ticketPromedio;

    const sedeNombre = sedeId ? sedes.find(s => s.id === sedeId)?.nombre_sede : 'Todas las sedes';

    return {
      sedeId,
      sedeNombre,
      // Métricas históricas
      gastoHistorico: totalGastoHistorico,
      leadsHistoricos: totalLeadsHistorico,
      agendadosHistoricos: totalAgendadosHistorico,
      agendamientosVencidos: totalAgendamientosVencidos, // NUEVO: para cálculo consolidado correcto
      asistenciasHistoricas: totalAsistenciasHistorico,
      clientesNuevosHistoricos: totalClientesNuevosHistorico,
      ventasHistoricas: totalVentas,
      // Métricas calculadas
      costoLeadCalculado,
      porcentajeAgendamientoCalculado,
      porcentajeAsistenciaCalculado,
      porcentajeConversionCalculado,
      ticketPromedioCalculado,
      // Métricas usadas (manual o calculadas)
      presupuestoMensual,
      costoLead,
      porcAgendamiento,
      porcAsistencia,
      porcConversion,
      ticketPromedio,
      // Proyección
      leadsProyectados: Math.round(leadsProyectados),
      agendadosProyectados: Math.round(agendadosProyectados),
      asistenciasProyectadas: Math.round(asistenciasProyectadas),
      clientesNuevosProyectados: Math.round(clientesNuevosProyectados),
      ventasProyectadas: Math.round(ventasProyectadas),
      // Indicadores
      tieneConfigManual: !!config,
      esProyeccionValida: presupuestoMensual > 0 && costoLead > 0 && porcAgendamiento > 0 && porcConversion > 0
    };
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Proyección Clientes Nuevos</h1>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="filter-sede">Sede</Label>
              <Select
                value={selectedSede}
                onValueChange={(value) => setSelectedSede(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las sedes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las sedes</SelectItem>
                  {sedes.map((sede) => (
                    <SelectItem key={sede.id} value={sede.id}>
                      {sede.nombre_sede}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filter-mes">Mes a Proyectar</Label>
              <input
                id="filter-mes"
                type="month"
                value={selectedMes}
                onChange={(e) => setSelectedMes(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-8">Cargando proyección...</div>
      ) : proyeccionGeneral && proyeccionGeneral.esProyeccionValida ? (
        <>
          {/* Alerta de configuración manual */}
          {proyeccionGeneral.tieneConfigManual && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Esta proyección usa presupuesto proyectado configurado manualmente. Las métricas de conversión (costo/lead, %, ticket) se calculan automáticamente desde los datos históricos del mes seleccionado.
              </AlertDescription>
            </Alert>
          )}

          {/* Métricas de Proyección */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <Card>
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex flex-col items-center text-center">
                  <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 mb-2" />
                  <div className="text-lg sm:text-xl font-bold text-blue-600">
                    {formatCurrency(proyeccionGeneral.presupuestoMensual)}
                  </div>
                  <p className="text-xs text-muted-foreground">Presupuesto Proyectado</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex flex-col items-center text-center">
                  <Target className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 mb-2" />
                  <div className="text-lg sm:text-xl font-bold">
                    {proyeccionGeneral.leadsProyectados}
                  </div>
                  <p className="text-xs text-muted-foreground">Leads</p>
                  <p className="text-xs text-gray-500">{formatCurrency(proyeccionGeneral.costoLead)}/lead</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex flex-col items-center text-center">
                  <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 mb-2" />
                  <div className="text-lg sm:text-xl font-bold">
                    {proyeccionGeneral.agendadosProyectados}
                  </div>
                  <p className="text-xs text-muted-foreground">Agendados</p>
                  <p className="text-xs text-gray-500">{formatPercent(proyeccionGeneral.porcAgendamiento)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex flex-col items-center text-center">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 mb-2" />
                  <div className="text-lg sm:text-xl font-bold">
                    {proyeccionGeneral.asistenciasProyectadas}
                  </div>
                  <p className="text-xs text-muted-foreground">Asistencias</p>
                  <p className="text-xs text-gray-500">{formatPercent(proyeccionGeneral.porcAsistencia)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex flex-col items-center text-center">
                  <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-500 mb-2" />
                  <div className="text-lg sm:text-xl font-bold text-indigo-600">
                    {proyeccionGeneral.clientesNuevosProyectados}
                  </div>
                  <p className="text-xs text-muted-foreground">Clientes Nuevos</p>
                  <p className="text-xs text-gray-500">{formatPercent(proyeccionGeneral.porcConversion)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex flex-col items-center text-center">
                  <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mb-2" />
                  <div className="text-lg sm:text-xl font-bold text-green-600">
                    {formatCurrency(proyeccionGeneral.ventasProyectadas)}
                  </div>
                  <p className="text-xs text-muted-foreground">Ventas Proyectadas</p>
                  <p className="text-xs text-gray-500">{formatCurrency(proyeccionGeneral.ticketPromedio)}/cliente</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detalle de Métricas Históricas */}
          <Card>
            <CardHeader>
              <CardTitle>Datos Históricos del Mes Seleccionado ({selectedMes})</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">Estos datos históricos se usan para calcular las métricas de conversión (costo/lead, %, ticket promedio)</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Gasto Real</p>
                  <p className="font-semibold">{formatCurrency(proyeccionGeneral.gastoHistorico)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Leads Reales</p>
                  <p className="font-semibold">{proyeccionGeneral.leadsHistoricos}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Agendados Reales</p>
                  <p className="font-semibold">{proyeccionGeneral.agendadosHistoricos}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Asistencias Reales</p>
                  <p className="font-semibold">{proyeccionGeneral.asistenciasHistoricas}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Clientes Nuevos Reales</p>
                  <p className="font-semibold">{proyeccionGeneral.clientesNuevosHistoricos}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ventas Reales</p>
                  <p className="font-semibold">{formatCurrency(proyeccionGeneral.ventasHistoricas)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de Proyecciones por Sede */}
          {proyeccionesPorSede.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Proyección por Sede</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sede</TableHead>
                        <TableHead className="text-right">Presupuesto Proyectado</TableHead>
                        <TableHead className="text-right">Leads Proyectados</TableHead>
                        <TableHead className="text-right">Agendados Proyectados</TableHead>
                        <TableHead className="text-right">Asistencias Proyectadas</TableHead>
                        <TableHead className="text-right">Clientes Nuevos Proyectados</TableHead>
                        <TableHead className="text-right">Ventas Proyectadas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {proyeccionesPorSede.map((p) => (
                        <TableRow key={p.sedeId}>
                          <TableCell className="font-medium">
                            {p.sedeNombre}
                            {p.tieneConfigManual && (
                              <span className="ml-2 text-xs text-blue-600">(Manual)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-blue-600 font-medium">
                            {formatCurrency(p.presupuestoMensual)}
                          </TableCell>
                          <TableCell className="text-right">{p.leadsProyectados}</TableCell>
                          <TableCell className="text-right">{p.agendadosProyectados}</TableCell>
                          <TableCell className="text-right">{p.asistenciasProyectadas}</TableCell>
                          <TableCell className="text-right text-indigo-600 font-semibold">
                            {p.clientesNuevosProyectados}
                          </TableCell>
                          <TableCell className="text-right text-green-600 font-bold">
                            {formatCurrency(p.ventasProyectadas)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Explicación del Cálculo */}
          <Card>
            <CardHeader>
              <CardTitle>Cómo se Calcula la Proyección</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-600">
                <div>
                  <strong className="text-gray-900">1. Presupuesto Proyectado:</strong> Se configura manualmente en "Configuración de Proyección" para el mes que deseas proyectar.
                </div>
                <div>
                  <strong className="text-gray-900">2. Leads Proyectados:</strong> Presupuesto Proyectado ÷ Costo por Lead = {proyeccionGeneral.leadsProyectados} leads
                </div>
                <div>
                  <strong className="text-gray-900">3. Agendados Proyectados:</strong> Leads Proyectados × {formatPercent(proyeccionGeneral.porcAgendamiento)} = {proyeccionGeneral.agendadosProyectados} agendados
                </div>
                <div>
                  <strong className="text-gray-900">4. Asistencias Proyectadas:</strong> Agendados Proyectados × {formatPercent(proyeccionGeneral.porcAsistencia)} = {proyeccionGeneral.asistenciasProyectadas} asistencias
                </div>
                <div>
                  <strong className="text-gray-900">5. Clientes Nuevos Proyectados:</strong> Agendados Proyectados × {formatPercent(proyeccionGeneral.porcConversion)} (% Conv. por Agendado) = {proyeccionGeneral.clientesNuevosProyectados} clientes nuevos
                </div>
                <div>
                  <strong className="text-gray-900">6. Ventas Proyectadas:</strong> Clientes Nuevos Proyectados × Ticket Promedio ({formatCurrency(proyeccionGeneral.ticketPromedio)}) = {formatCurrency(proyeccionGeneral.ventasProyectadas)}
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                  <p className="text-blue-900 font-medium">
                    💡 La proyección parte del presupuesto proyectado (configurado manualmente) y proyecta todo el embudo: leads → agendamientos → asistencias → conversión → ventas. Las métricas de conversión (costo/lead, %, ticket) se calculan automáticamente desde los datos históricos del mes seleccionado.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No hay configuración de presupuesto proyectado</p>
              <p className="text-sm mt-2">Para generar la proyección, debes configurar el presupuesto proyectado para el mes seleccionado ({selectedMes}) en la página "Configuración de Proyección".</p>
              <p className="text-sm mt-2 text-blue-600">💡 El sistema calculará automáticamente las métricas de conversión desde los datos históricos del mes seleccionado.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}