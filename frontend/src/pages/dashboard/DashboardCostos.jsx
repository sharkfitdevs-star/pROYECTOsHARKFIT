import React, { useState, useEffect } from 'react';
import { Ads_Gasto_Diario } from '@/entities/Ads_Gasto_Diario';
import { Leads_Diarios } from '@/entities/Leads_Diarios';
import { Prospectos } from '@/entities/Prospectos';
import { Agendamientos } from '@/entities/Agendamientos';
import { Ventas } from '@/entities/Ventas';
import { Sucursales } from '@/entities/Sucursales';
import { Planes_Servicios } from '@/entities/Planes_Servicios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, TrendingDown, Target, TrendingUp, Minus } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function DashboardCostos() {
  const [loading, setLoading] = useState(false);
  const [selectedSede, setSelectedSede] = useState('all');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [metricas, setMetricas] = useState({
    totalGasto: 0,
    totalLeads: 0,
    totalAgendados: 0,
    totalClientesNuevos: 0,
    cpl: 0,
    costoPorAgendado: 0,
    costoPorConversion: 0
  });
  const [tendencias, setTendencias] = useState({
    totalGasto: { cambio: 0, porcentaje: 0 },
    cpl: { cambio: 0, porcentaje: 0 },
    costoPorAgendado: { cambio: 0, porcentaje: 0 },
    costoPorConversion: { cambio: 0, porcentaje: 0 }
  });
  const [metricasPorSede, setMetricasPorSede] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [planes, setPlanes] = useState([]);

  useEffect(() => {
    fetchSedes();
    fetchPlanes();
  }, []);

  useEffect(() => {
    if (sedes.length > 0) {
      fetchData();
    }
  }, [selectedSede, fechaInicio, fechaFin, sedes]);

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

  const fetchData = async () => {
    setLoading(true);
    try {
      // Obtener datos
      let gastosAll = await Ads_Gasto_Diario.list('-fecha');
      let leadsAll = await Leads_Diarios.list('-fecha');
      let prospectosAll = await Prospectos.list('-fecha_ingreso');
      let agendamientosAll = await Agendamientos.list('-fecha_hora');
      let ventasAll = await Ventas.list('-fecha_venta');

      // Calcular fechas del mes anterior (mismo periodo)
      let fechaInicioAnterior = '';
      let fechaFinAnterior = '';
      
      if (fechaInicio && fechaFin) {
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        
        // Restar un mes
        const inicioAnterior = new Date(inicio);
        inicioAnterior.setMonth(inicioAnterior.getMonth() - 1);
        
        const finAnterior = new Date(fin);
        finAnterior.setMonth(finAnterior.getMonth() - 1);
        
        fechaInicioAnterior = inicioAnterior.toISOString().split('T')[0];
        fechaFinAnterior = finAnterior.toISOString().split('T')[0];
      }

      // Filtrar datos del periodo actual
      let gastos = [...gastosAll];
      let leads = [...leadsAll];
      let prospectos = [...prospectosAll];
      let agendamientos = [...agendamientosAll];
      let ventas = [...ventasAll];

      if (fechaInicio) {
        gastos = gastos.filter(g => g.fecha >= fechaInicio);
        leads = leads.filter(l => l.fecha >= fechaInicio);
        prospectos = prospectos.filter(p => (p.fecha_ingreso || '') >= fechaInicio);
        agendamientos = agendamientos.filter(a => (a.fecha_hora?.split('T')[0] || '') >= fechaInicio);
        ventas = ventas.filter(v => v.fecha_venta >= fechaInicio);
      }
      if (fechaFin) {
        gastos = gastos.filter(g => g.fecha <= fechaFin);
        leads = leads.filter(l => l.fecha <= fechaFin);
        prospectos = prospectos.filter(p => (p.fecha_ingreso || '') <= fechaFin);
        agendamientos = agendamientos.filter(a => (a.fecha_hora?.split('T')[0] || '') <= fechaFin);
        ventas = ventas.filter(v => v.fecha_venta <= fechaFin);
      }

      if (selectedSede && selectedSede !== 'all') {
        gastos = gastos.filter(g => g.sede === selectedSede);
        leads = leads.filter(l => l.sede === selectedSede);
        prospectos = prospectos.filter(p => p.sede === selectedSede);
        agendamientos = agendamientos.filter(a => a.sede === selectedSede);
        ventas = ventas.filter(v => v.sede === selectedSede);
      }

      // Filtrar datos del mes anterior (mismo periodo)
      let gastosAnterior = [...gastosAll];
      let leadsAnterior = [...leadsAll];
      let prospectosAnterior = [...prospectosAll];
      let agendamientosAnterior = [...agendamientosAll];
      let ventasAnterior = [...ventasAll];

      if (fechaInicioAnterior && fechaFinAnterior) {
        gastosAnterior = gastosAnterior.filter(g => g.fecha >= fechaInicioAnterior && g.fecha <= fechaFinAnterior);
        leadsAnterior = leadsAnterior.filter(l => l.fecha >= fechaInicioAnterior && l.fecha <= fechaFinAnterior);
        prospectosAnterior = prospectosAnterior.filter(p => (p.fecha_ingreso || '') >= fechaInicioAnterior && (p.fecha_ingreso || '') <= fechaFinAnterior);
        agendamientosAnterior = agendamientosAnterior.filter(a => {
          const fechaAgenda = a.fecha_hora?.split('T')[0] || '';
          return fechaAgenda >= fechaInicioAnterior && fechaAgenda <= fechaFinAnterior;
        });
        ventasAnterior = ventasAnterior.filter(v => v.fecha_venta >= fechaInicioAnterior && v.fecha_venta <= fechaFinAnterior);
      }

      if (selectedSede && selectedSede !== 'all') {
        gastosAnterior = gastosAnterior.filter(g => g.sede === selectedSede);
        leadsAnterior = leadsAnterior.filter(l => l.sede === selectedSede);
        prospectosAnterior = prospectosAnterior.filter(p => p.sede === selectedSede);
        agendamientosAnterior = agendamientosAnterior.filter(a => a.sede === selectedSede);
        ventasAnterior = ventasAnterior.filter(v => v.sede === selectedSede);
      }

      // Calcular métricas del periodo actual
      const totalClientesNuevos = calcularClientesNuevos(ventas, prospectos);
      const totalGasto = gastos.reduce((sum, g) => sum + (g.gasto_monto || 0), 0);
      const totalLeads = leads.reduce((sum, l) => sum + (l.leads_totales || 0), 0);
      const totalAgendados = prospectos.length;

      // Calcular agendamientos vencidos (cuya fecha ya pasó)
      const hoy = new Date().toISOString();
      const agendamientosVencidos = agendamientos.filter(a => {
        const fechaVisita = a.fecha_hora || '';
        return fechaVisita <= hoy;
      });
      const totalAgendamientosVencidos = agendamientosVencidos.length;

      const cpl = totalLeads > 0 ? (totalGasto / totalLeads).toFixed(2) : 0;
      const tasaAgendamiento = totalLeads > 0 ? (totalAgendados / totalLeads) : 0;
      const costoPorAgendado = tasaAgendamiento > 0 ? (parseFloat(cpl) / tasaAgendamiento).toFixed(2) : 0;
      
      // CORRECCIÓN: Usar agendamientos vencidos para calcular % conversión por agendado
      const tasaConversionPorAgendado = totalAgendamientosVencidos > 0 ? (totalClientesNuevos / totalAgendamientosVencidos) : 0;
      const costoPorConversion = tasaConversionPorAgendado > 0 ? (parseFloat(costoPorAgendado) / tasaConversionPorAgendado).toFixed(2) : 0;

      // Calcular métricas del mes anterior
      const totalClientesNuevosAnterior = calcularClientesNuevos(ventasAnterior, prospectosAnterior);
      const totalGastoAnterior = gastosAnterior.reduce((sum, g) => sum + (g.gasto_monto || 0), 0);
      const totalLeadsAnterior = leadsAnterior.reduce((sum, l) => sum + (l.leads_totales || 0), 0);
      const totalAgendadosAnterior = prospectosAnterior.length;

      // Calcular agendamientos vencidos del mes anterior
      const agendamientosVencidosAnterior = agendamientosAnterior.filter(a => {
        const fechaVisita = a.fecha_hora || '';
        return fechaVisita <= hoy;
      });
      const totalAgendamientosVencidosAnterior = agendamientosVencidosAnterior.length;

      const cplAnterior = totalLeadsAnterior > 0 ? (totalGastoAnterior / totalLeadsAnterior) : 0;
      const tasaAgendamientoAnterior = totalLeadsAnterior > 0 ? (totalAgendadosAnterior / totalLeadsAnterior) : 0;
      const costoPorAgendadoAnterior = tasaAgendamientoAnterior > 0 ? (cplAnterior / tasaAgendamientoAnterior) : 0;
      
      // CORRECCIÓN: Usar agendamientos vencidos para calcular % conversión por agendado del mes anterior
      const tasaConversionPorAgendadoAnterior = totalAgendamientosVencidosAnterior > 0 ? (totalClientesNuevosAnterior / totalAgendamientosVencidosAnterior) : 0;
      const costoPorConversionAnterior = tasaConversionPorAgendadoAnterior > 0 ? (costoPorAgendadoAnterior / tasaConversionPorAgendadoAnterior) : 0;

      // Calcular tendencias (comparación con mes anterior)
      const calcularTendencia = (actual, anterior) => {
        if (!anterior || anterior === 0) {
          return { cambio: 0, porcentaje: 0 };
        }
        const cambio = actual - anterior;
        const porcentaje = ((cambio / anterior) * 100).toFixed(1);
        return { cambio, porcentaje: parseFloat(porcentaje) };
      };

      setMetricas({
        totalGasto,
        totalLeads,
        totalAgendados,
        totalClientesNuevos,
        cpl,
        costoPorAgendado,
        costoPorConversion
      });

      setTendencias({
        totalGasto: calcularTendencia(totalGasto, totalGastoAnterior),
        cpl: calcularTendencia(parseFloat(cpl), cplAnterior),
        costoPorAgendado: calcularTendencia(parseFloat(costoPorAgendado), costoPorAgendadoAnterior),
        costoPorConversion: calcularTendencia(parseFloat(costoPorConversion), costoPorConversionAnterior)
      });

      // Métricas por sede
      calcularMetricasPorSede(gastos, leads, prospectos, agendamientos, ventas);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularClientesNuevos = (ventas, prospectos) => {
    // Crear mapa de prospecto_id -> datos del prospecto
    const prospectoMap = {};
    prospectos.forEach(p => {
      prospectoMap[p.id] = p;
    });

    // Crear mapa de planes para verificar tipo
    const planesMap = {};
    planes.forEach(p => {
      planesMap[p.id] = p;
    });

    // Agrupar ventas por whatsapp (solo Planes y Programas, NO Servicios)
    const clientesPorWhatsapp = {};
    
    ventas.forEach(venta => {
      const prospecto = prospectoMap[venta.prospecto_id];
      
      if (!prospecto || !prospecto.whatsapp) {
        return;
      }

      // Verificar que sea Plan o Programa (NO Servicio)
      const plan = planesMap[venta.plan];
      const tipoItem = plan?.tipo_item || '';
      
      if (tipoItem !== 'Plan' && tipoItem !== 'Programa') {
        // Excluir servicios
        return;
      }

      const whatsapp = prospecto.whatsapp;
      
      if (!clientesPorWhatsapp[whatsapp]) {
        clientesPorWhatsapp[whatsapp] = true;
      }
    });

    return Object.keys(clientesPorWhatsapp).length;
  };

  // Componente para mostrar indicador de tendencia
  const TrendIndicator = ({ tendencia, invertido = false }) => {
    if (!tendencia || tendencia.porcentaje === 0) {
      return (
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
          <Minus className="w-3 h-3" />
          <span>Sin cambios</span>
        </div>
      );
    }

    // Para costos, menor es mejor (invertido = true)
    // Para otras métricas, mayor es mejor (invertido = false)
    const esMejor = invertido 
      ? tendencia.porcentaje < 0 
      : tendencia.porcentaje > 0;
    
    const colorClass = esMejor ? 'text-green-600' : 'text-red-600';
    const Icon = tendencia.porcentaje > 0 ? TrendingUp : TrendingDown;

    return (
      <div className={`flex items-center gap-1 text-xs ${colorClass} mt-1`}>
        <Icon className="w-3 h-3" />
        <span>{Math.abs(tendencia.porcentaje)}% vs mes anterior</span>
      </div>
    );
  };

  const calcularMetricasPorSede = (gastos, leads, prospectos, agendamientos, ventas) => {
    const metricasSede = {};
    const hoy = new Date().toISOString();

    sedes.forEach(sede => {
      const sedeId = sede.id;
      const sedeNombre = sede.nombre_sede;
      
      const gastosS = gastos.filter(g => g.sede === sedeId);
      const leadsS = leads.filter(l => l.sede === sedeId);
      const prospectosS = prospectos.filter(p => p.sede === sedeId);
      const agendamientosS = agendamientos.filter(a => a.sede === sedeId);
      const ventasS = ventas.filter(v => v.sede === sedeId && v.estado === 'Cerrada');

      // Calcular agendamientos vencidos de esta sede
      const agendamientosVencidosS = agendamientosS.filter(a => {
        const fechaVisita = a.fecha_hora || '';
        return fechaVisita <= hoy;
      });
      const totalAgendamientosVencidosS = agendamientosVencidosS.length;

      const totalGasto = gastosS.reduce((sum, g) => sum + (g.gasto_monto || 0), 0);
      const totalLeads = leadsS.reduce((sum, l) => sum + (l.leads_totales || 0), 0);
      const totalAgendados = prospectosS.length;
      const totalClientesNuevos = calcularClientesNuevos(ventasS, prospectosS);

      const cplSede = totalLeads > 0 ? (totalGasto / totalLeads).toFixed(2) : 0;
      const tasaAgendamientoSede = totalLeads > 0 ? (totalAgendados / totalLeads) : 0;
      const costoPorAgendadoSede = tasaAgendamientoSede > 0 ? (parseFloat(cplSede) / tasaAgendamientoSede).toFixed(2) : 0;
      
      // CORRECCIÓN: Usar agendamientos vencidos para calcular % conversión por agendado
      const tasaConversionPorAgendadoSede = totalAgendamientosVencidosS > 0 ? (totalClientesNuevos / totalAgendamientosVencidosS) : 0;

      metricasSede[sedeId] = {
        sedeId,
        sede: sedeNombre,
        gasto: totalGasto,
        leads: totalLeads,
        agendados: totalAgendados,
        clientesNuevos: totalClientesNuevos,
        cpl: cplSede,
        costoPorAgendado: costoPorAgendadoSede,
        costoPorConversion: tasaConversionPorAgendadoSede > 0 ? (parseFloat(costoPorAgendadoSede) / tasaConversionPorAgendadoSede).toFixed(2) : 0
      };
    });

    setMetricasPorSede(Object.values(metricasSede).filter(m => m.gasto > 0 || m.leads > 0));
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard de Costos</h1>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Label htmlFor="fecha-inicio">Fecha Inicio</Label>
              <Input
                id="fecha-inicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="fecha-fin">Fecha Fin</Label>
              <Input
                id="fecha-fin"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Generales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-lg sm:text-2xl font-bold text-red-600">
                  ${metricas.totalGasto.toLocaleString('es-CL')}
                </div>
                <p className="text-xs text-muted-foreground">Total Gastado</p>
                <TrendIndicator tendencia={tendencias.totalGasto} invertido={true} />
              </div>
              <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-2xl font-bold">${metricas.cpl}</div>
                <p className="text-xs text-muted-foreground">CPL (Costo por Lead)</p>
                <p className="text-xs text-gray-500">{metricas.totalLeads} leads</p>
                <TrendIndicator tendencia={tendencias.cpl} invertido={true} />
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-2xl font-bold">${metricas.costoPorAgendado}</div>
                <p className="text-xs text-muted-foreground">Costo por Agendado</p>
                <p className="text-xs text-gray-500">{metricas.totalAgendados} agendados</p>
                <TrendIndicator tendencia={tendencias.costoPorAgendado} invertido={true} />
              </div>
              <TrendingDown className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-2xl font-bold">${metricas.costoPorConversion}</div>
                <p className="text-xs text-muted-foreground">Costo por Conversión</p>
                <p className="text-xs text-gray-500">{metricas.totalClientesNuevos} clientes nuevos</p>
                <TrendIndicator tendencia={tendencias.costoPorConversion} invertido={true} />
              </div>
              <DollarSign className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Métricas por Sede */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas de Costos por Sede</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : metricasPorSede.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No hay datos disponibles</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sede</TableHead>
                    <TableHead className="text-right">Gasto Total</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Agendados</TableHead>
                    <TableHead className="text-right">Clientes Nuevos</TableHead>
                    <TableHead className="text-right">CPL</TableHead>
                    <TableHead className="text-right">Costo/Agendado</TableHead>
                    <TableHead className="text-right">Costo/Conversión</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metricasPorSede.map((m) => (
                    <TableRow key={m.sedeId}>
                      <TableCell className="font-medium">{m.sede}</TableCell>
                      <TableCell className="text-right font-bold text-red-600">
                        ${m.gasto.toLocaleString('es-CL')}
                      </TableCell>
                      <TableCell className="text-right">{m.leads}</TableCell>
                      <TableCell className="text-right">{m.agendados}</TableCell>
                      <TableCell className="text-right">{m.clientesNuevos}</TableCell>
                      <TableCell className="text-right text-blue-600 font-medium">
                        ${m.cpl}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        ${m.costoPorAgendado}
                      </TableCell>
                      <TableCell className="text-right text-purple-600 font-medium">
                        ${m.costoPorConversion}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información Adicional */}
      <Card>
        <CardHeader>
          <CardTitle>Interpretación de Métricas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div>
              <strong className="text-gray-900">CPL (Costo Por Lead):</strong> Cuánto cuesta generar un lead. Se calcula dividiendo la inversión total en publicidad por el número total de leads recibidos.
            </div>
            <div>
              <strong className="text-gray-900">Costo por Agendado:</strong> Cuánto cuesta conseguir que un lead agende una visita. Se calcula dividiendo el CPL por la tasa de agendamiento (CPL / % Agendados). Esta métrica permite medir cuánto nos cuesta que alguien agende.
            </div>
            <div>
              <strong className="text-gray-900">Costo por Conversión (CPC):</strong> Cuánto cuesta conseguir un cliente nuevo (whatsapp único con venta de Plan o Programa). Se calcula dividiendo el Costo por Agendado por el % de conversión por agendado (clientes nuevos / agendamientos vencidos). Esta métrica considera la proyección de agendados, no solo los cerrados.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}