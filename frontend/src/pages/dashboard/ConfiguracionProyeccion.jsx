import React, { useState, useEffect } from 'react';
import { Proyeccion_Configuracion } from '@/entities/Proyeccion_Configuracion';
import { Ads_Gasto_Diario } from '@/entities/Ads_Gasto_Diario';
import { Leads_Diarios } from '@/entities/Leads_Diarios';
import { Prospectos } from '@/entities/Prospectos';
import { Agendamientos } from '@/entities/Agendamientos';
import { Ventas } from '@/entities/Ventas';
import { Planes_Servicios } from '@/entities/Planes_Servicios';
import { Sucursales } from '@/entities/Sucursales';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Settings, Plus, Edit, Trash2, TrendingUp, AlertCircle, Save, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';

export default function ConfiguracionProyeccion() {
  const [loading, setLoading] = useState(false);
  const [sedes, setSedes] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [configuraciones, setConfiguraciones] = useState([]);
  const [metricasCalculadas, setMetricasCalculadas] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [formData, setFormData] = useState({
    sede: '',
    mes: '',
    presupuesto_mensual: '',
    costo_por_lead: '',
    porcentaje_agendamiento: '',
    porcentaje_asistencia: '',
    porcentaje_conversion: '',
    ticket_promedio: '',
    activo: true,
    notas: ''
  });
  const [modoAvanzado, setModoAvanzado] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sedesData, planesData, configsData] = await Promise.all([
        Sucursales.list('nombre_sede'),
        Planes_Servicios.list(),
        Proyeccion_Configuracion.list('-mes')
      ]);

      setSedes(sedesData.filter(s => s.activa !== false));
      setPlanes(planesData.filter(p => p.activo !== false));
      setConfiguraciones(configsData);

      // Calcular métricas automáticas para cada sede
      await calcularMetricasTodasSedes(sedesData.filter(s => s.activa !== false), planesData);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calcularMetricasTodasSedes = async (sedesData, planesData) => {
    try {
      // Calcular rango de fechas del mes actual
      const hoy = new Date();
      const year = hoy.getFullYear();
      const month = String(hoy.getMonth() + 1).padStart(2, '0');
      const fechaInicio = `${year}-${month}-01`;
      const ultimoDia = new Date(year, hoy.getMonth() + 1, 0).getDate();
      const fechaFin = `${year}-${month}-${ultimoDia}`;

      const [gastosAll, leadsAll, prospectosAll, agendamientosAll, ventasAll] = await Promise.all([
        Ads_Gasto_Diario.list('-fecha'),
        Leads_Diarios.list('-fecha'),
        Prospectos.list('-fecha_ingreso'),
        Agendamientos.list('-fecha_hora'),
        Ventas.list('-fecha_venta')
      ]);

      // Filtrar datos por el mes actual
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

      const metricas = {};

      sedesData.forEach(sede => {
        const sedeId = sede.id;
        
        // Filtrar por sede
        const gastosS = gastosHistoricos.filter(g => g.sede === sedeId);
        const leadsS = leadsHistoricos.filter(l => l.sede === sedeId);
        const prospectosS = prospectosHistoricos.filter(p => p.sede === sedeId);
        const agendamientosS = agendamientosHistoricos.filter(a => a.sede === sedeId);
        const ventasS = ventasHistoricas.filter(v => v.sede === sedeId);

        // Calcular métricas
        const totalGasto = gastosS.reduce((sum, g) => sum + (g.gasto_monto || 0), 0);
        const totalLeads = leadsS.reduce((sum, l) => sum + (l.leads_totales || 0), 0);
        const totalAgendados = prospectosS.length;
        const totalAsistencias = agendamientosS.filter(a => a.resultado_asistencia === 'Asistió').length;

        // Calcular clientes nuevos
        const planesMap = {};
        planesData.forEach(p => {
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

        const totalClientesNuevos = Object.keys(clientesPorWhatsapp).length;

        // Calcular promedios
        const presupuestoMensualCalculado = totalGasto;
        const costoLeadCalculado = totalLeads > 0 ? totalGasto / totalLeads : 0;
        const porcAgendamientoCalculado = totalLeads > 0 ? (totalAgendados / totalLeads) * 100 : 0;
        const porcAsistenciaCalculado = totalAgendados > 0 ? (totalAsistencias / totalAgendados) * 100 : 0;
        const porcConversionCalculado = totalAgendados > 0 ? (totalClientesNuevos / totalAgendados) * 100 : 0;
        const ticketPromedioCalculado = totalClientesNuevos > 0 ? totalVentas / totalClientesNuevos : 0;

        metricas[sedeId] = {
          presupuestoMensual: presupuestoMensualCalculado,
          costoLead: costoLeadCalculado,
          porcAgendamiento: porcAgendamientoCalculado,
          porcAsistencia: porcAsistenciaCalculado,
          porcConversion: porcConversionCalculado,
          ticketPromedio: ticketPromedioCalculado,
          totalGasto,
          totalLeads,
          totalAgendados,
          totalAsistencias,
          totalClientesNuevos,
          totalVentas
        };
      });

      setMetricasCalculadas(metricas);

    } catch (error) {
      console.error('Error calculando métricas:', error);
    }
  };

  const handleOpenDialog = (config = null) => {
    if (config) {
      setEditingConfig(config);
      setFormData({
        sede: config.sede || '',
        mes: config.mes || '',
        presupuesto_mensual: config.presupuesto_mensual || '',
        costo_por_lead: config.costo_por_lead || '',
        porcentaje_agendamiento: config.porcentaje_agendamiento || '',
        porcentaje_asistencia: config.porcentaje_asistencia || '',
        porcentaje_conversion: config.porcentaje_conversion || '',
        ticket_promedio: config.ticket_promedio || '',
        activo: config.activo !== false,
        notas: config.notas || ''
      });
    } else {
      setEditingConfig(null);
      const hoy = new Date();
      const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
      setFormData({
        sede: '',
        mes: mesActual,
        presupuesto_mensual: '',
        costo_por_lead: '',
        porcentaje_agendamiento: '',
        porcentaje_asistencia: '',
        porcentaje_conversion: '',
        ticket_promedio: '',
        activo: true,
        notas: ''
      });
    }
    setModoAvanzado(false);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.sede || !formData.mes) {
      toast({
        title: "Error",
        description: "Sede y mes son obligatorios",
        variant: "destructive"
      });
      return;
    }

    try {
      const dataToSave = {
        sede: formData.sede,
        mes: formData.mes,
        activo: formData.activo,
        notas: formData.notas
      };

      // Solo guardar campos que tengan valor
      if (formData.presupuesto_mensual) {
        dataToSave.presupuesto_mensual = parseFloat(formData.presupuesto_mensual);
      }
      if (formData.costo_por_lead) {
        dataToSave.costo_por_lead = parseFloat(formData.costo_por_lead);
      }
      if (formData.porcentaje_agendamiento) {
        dataToSave.porcentaje_agendamiento = parseFloat(formData.porcentaje_agendamiento);
      }
      if (formData.porcentaje_asistencia) {
        dataToSave.porcentaje_asistencia = parseFloat(formData.porcentaje_asistencia);
      }
      if (formData.porcentaje_conversion) {
        dataToSave.porcentaje_conversion = parseFloat(formData.porcentaje_conversion);
      }
      if (formData.ticket_promedio) {
        dataToSave.ticket_promedio = parseFloat(formData.ticket_promedio);
      }

      if (editingConfig) {
        await Proyeccion_Configuracion.update(editingConfig.id, dataToSave);
        toast({
          title: "Éxito",
          description: "Configuración actualizada correctamente"
        });
      } else {
        await Proyeccion_Configuracion.create(dataToSave);
        toast({
          title: "Éxito",
          description: "Configuración creada correctamente"
        });
      }

      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta configuración?')) return;

    try {
      await Proyeccion_Configuracion.delete(id);
      toast({
        title: "Éxito",
        description: "Configuración eliminada correctamente"
      });
      fetchData();
    } catch (error) {
      console.error('Error deleting config:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la configuración",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '-';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value) => {
    if (!value) return '-';
    return `${value.toFixed(1)}%`;
  };

  const getSedeNombre = (sedeId) => {
    return sedes.find(s => s.id === sedeId)?.nombre_sede || sedeId;
  };

  const autocompletarMetricas = () => {
    if (!formData.sede) {
      toast({
        title: "Error",
        description: "Selecciona una sede primero",
        variant: "destructive"
      });
      return;
    }

    const metricas = metricasCalculadas[formData.sede];
    if (!metricas) {
      toast({
        title: "Error",
        description: "No hay datos históricos para esta sede",
        variant: "destructive"
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      costo_por_lead: metricas.costoLead.toFixed(2),
      porcentaje_agendamiento: metricas.porcAgendamiento.toFixed(1),
      porcentaje_asistencia: metricas.porcAsistencia.toFixed(1),
      porcentaje_conversion: metricas.porcConversion.toFixed(1),
      ticket_promedio: Math.round(metricas.ticketPromedio)
    }));

    toast({
      title: "Métricas autocompletadas",
      description: "Se han cargado las métricas calculadas del mes actual"
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Configuración de Proyección</h1>
          <p className="text-sm text-gray-500 mt-1">Configura el presupuesto proyectado mensual por sede. Las métricas de conversión se calculan automáticamente desde datos históricos.</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Configuración
        </Button>
      </div>

      {/* Alert informativo */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Recomendación:</strong> Solo configura el presupuesto proyectado mensual. Las métricas de conversión (costo por lead, %, ticket promedio) se calculan automáticamente desde los datos históricos de cada sede.
        </AlertDescription>
      </Alert>

      {/* Tabla de configuraciones */}
      <Card>
        <CardHeader>
          <CardTitle>Configuraciones Activas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : configuraciones.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay configuraciones. Crea una para empezar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b hover:bg-gray-50">
                    <th className="text-left p-2 font-medium">Sede</th>
                    <th className="text-left p-2 font-medium">Mes</th>
                    <TableHead className="text-right">Presupuesto Proyectado</th>
                    <TableHead className="text-right">Costo/Lead</th>
                    <TableHead className="text-right">% Agend.</th>
                    <TableHead className="text-right">% Asist.</th>
                    <TableHead className="text-right">% Conv.</th>
                    <TableHead className="text-right">Ticket Prom.</th>
                    <th className="text-left p-2 font-medium">Estado</th>
                    <TableHead className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {configuraciones.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">{getSedeNombre(config.sede)}</td>
                      <td className="p-2">{config.mes}</td>
                      <TableCell className="text-right text-blue-600 font-semibold">
                        {config.presupuesto_mensual ? formatCurrency(config.presupuesto_mensual) : <span className="text-gray-400">Auto</span>}
                      </td>
                      <TableCell className="text-right">
                        {config.costo_por_lead ? formatCurrency(config.costo_por_lead) : <span className="text-gray-400">Auto</span>}
                      </td>
                      <TableCell className="text-right">
                        {config.porcentaje_agendamiento ? formatPercent(config.porcentaje_agendamiento) : <span className="text-gray-400">Auto</span>}
                      </td>
                      <TableCell className="text-right">
                        {config.porcentaje_asistencia ? formatPercent(config.porcentaje_asistencia) : <span className="text-gray-400">Auto</span>}
                      </td>
                      <TableCell className="text-right">
                        {config.porcentaje_conversion ? formatPercent(config.porcentaje_conversion) : <span className="text-gray-400">Auto</span>}
                      </td>
                      <TableCell className="text-right">
                        {config.ticket_promedio ? formatCurrency(config.ticket_promedio) : <span className="text-gray-400">Auto</span>}
                      </td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          config.activo !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {config.activo !== false ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(config)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(config.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Métricas calculadas por sede */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas Calculadas Automáticamente (Mes Actual)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b hover:bg-gray-50">
                  <th className="text-left p-2 font-medium">Sede</th>
                  <TableHead className="text-right">Gasto Real</th>
                  <TableHead className="text-right">Leads</th>
                  <TableHead className="text-right">Costo/Lead</th>
                  <TableHead className="text-right">% Agendamiento</th>
                  <TableHead className="text-right">% Asistencia</th>
                  <TableHead className="text-right">% Conversión</th>
                  <TableHead className="text-right">Ticket Promedio</th>
                </tr>
              </thead>
              <tbody>
                {sedes.map((sede) => {
                  const metricas = metricasCalculadas[sede.id];
                  if (!metricas || metricas.totalGasto === 0) return null;
                  
                  return (
                    <TableRow key={sede.id}>
                      <TableCell className="font-medium">{sede.nombre_sede}</td>
                      <TableCell className="text-right">{formatCurrency(metricas.totalGasto)}</td>
                      <TableCell className="text-right">{metricas.totalLeads}</td>
                      <TableCell className="text-right text-blue-600">{formatCurrency(metricas.costoLead)}</td>
                      <TableCell className="text-right">{formatPercent(metricas.porcAgendamiento)}</td>
                      <TableCell className="text-right">{formatPercent(metricas.porcAsistencia)}</td>
                      <TableCell className="text-right">{formatPercent(metricas.porcConversion)}</td>
                      <TableCell className="text-right text-green-600">{formatCurrency(metricas.ticketPromedio)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para crear/editar configuración */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? 'Editar Configuración' : 'Nueva Configuración'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Campos básicos */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sede">Sede *</Label>
                <Select
                  value={formData.sede}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, sede: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una sede" />
                  </SelectTrigger>
                  <SelectContent>
                    {sedes.map((sede) => (
                      <SelectItem key={sede.id} value={sede.id}>
                        {sede.nombre_sede}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="mes">Mes *</Label>
                <Input
                  id="mes"
                  type="month"
                  value={formData.mes}
                  onChange={(e) => setFormData(prev => ({ ...prev, mes: e.target.value }))}
                />
              </div>
            </div>

            {/* Presupuesto mensual */}
            <div>
              <Label htmlFor="presupuesto_mensual">Presupuesto Proyectado Mensual (Requerido)</Label>
              <Input
                id="presupuesto_mensual"
                type="number"
                placeholder="Ej: 700000"
                value={formData.presupuesto_mensual}
                onChange={(e) => setFormData(prev => ({ ...prev, presupuesto_mensual: e.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-1">
                Este es el presupuesto que planeas invertir en el mes. Es necesario para generar la proyección completa del embudo de ventas.
              </p>
            </div>

            {/* Modo avanzado */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label htmlFor="modo-avanzado" className="font-medium">Modo Avanzado</Label>
                <p className="text-xs text-gray-500">Sobrescribir métricas calculadas automáticamente</p>
              </div>
              <Switch
                id="modo-avanzado"
                checked={modoAvanzado}
                onCheckedChange={setModoAvanzado}
              />
            </div>

            {/* Campos avanzados */}
            {modoAvanzado && (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Solo modifica estos valores si necesitas ajustar manualmente las métricas. De lo contrario, se calcularán automáticamente desde los datos históricos de la sede.
                  </AlertDescription>
                </Alert>

                <Button
                  variant="outline"
                  onClick={autocompletarMetricas}
                  className="w-full"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Autocompletar con Métricas Calculadas
                </Button>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="costo_por_lead">Costo por Lead</Label>
                    <Input
                      id="costo_por_lead"
                      type="number"
                      placeholder="Auto"
                      value={formData.costo_por_lead}
                      onChange={(e) => setFormData(prev => ({ ...prev, costo_por_lead: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="porcentaje_agendamiento">% Agendamiento</Label>
                    <Input
                      id="porcentaje_agendamiento"
                      type="number"
                      placeholder="Auto"
                      value={formData.porcentaje_agendamiento}
                      onChange={(e) => setFormData(prev => ({ ...prev, porcentaje_agendamiento: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="porcentaje_asistencia">% Asistencia</Label>
                    <Input
                      id="porcentaje_asistencia"
                      type="number"
                      placeholder="Auto"
                      value={formData.porcentaje_asistencia}
                      onChange={(e) => setFormData(prev => ({ ...prev, porcentaje_asistencia: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="porcentaje_conversion">% Conversión</Label>
                    <Input
                      id="porcentaje_conversion"
                      type="number"
                      placeholder="Auto"
                      value={formData.porcentaje_conversion}
                      onChange={(e) => setFormData(prev => ({ ...prev, porcentaje_conversion: e.target.value }))}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="ticket_promedio">Ticket Promedio</Label>
                    <Input
                      id="ticket_promedio"
                      type="number"
                      placeholder="Auto"
                      value={formData.ticket_promedio}
                      onChange={(e) => setFormData(prev => ({ ...prev, ticket_promedio: e.target.value }))}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Estado y notas */}
            <div className="flex items-center space-x-2">
              <Switch
                id="activo"
                checked={formData.activo}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, activo: checked }))}
              />
              <Label htmlFor="activo">Configuración activa</Label>
            </div>

            <div>
              <Label htmlFor="notas">Notas (opcional)</Label>
              <textarea
                id="notas"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Notas adicionales sobre esta configuración..."
                value={formData.notas}
                onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}