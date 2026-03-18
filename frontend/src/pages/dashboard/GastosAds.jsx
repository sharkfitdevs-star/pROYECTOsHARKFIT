import React, { useState, useEffect } from 'react';
import { Ads_Gasto_Diario } from '@/entities/Ads_Gasto_Diario';
import { Sucursales } from '@/entities/Sucursales';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Filter, Calendar } from 'lucide-react';
import { format, startOfWeek, startOfMonth, endOfMonth, subMonths, differenceInDays, parseISO, isWithinInterval } from 'date-fns';

export default function GastosAds() {
  const [gastos, setGastos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    periodo: 'mes_actual',
    fechaInicio: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    fechaFin: format(new Date(), 'yyyy-MM-dd'),
    sede: 'all'
  });

  const [formData, setFormData] = useState({
    tipo_gasto: 'unico',
    fecha: format(new Date(), 'yyyy-MM-dd'),
    fecha_fin: format(new Date(), 'yyyy-MM-dd'),
    sede: '',
    gasto_monto: 0,
    plataforma: '',
    campana: ''
  });

  const plataformas = ['Facebook Ads', 'Google Ads', 'Instagram Ads', 'TikTok Ads', 'LinkedIn Ads', 'Otra'];

  useEffect(() => {
    loadSucursales();
  }, []);

  useEffect(() => {
    if (sucursales.length > 0) {
      fetchGastos();
    }
  }, [filters, sucursales]);

  const loadSucursales = async () => {
    try {
      const sucursalesData = await Sucursales.list();
      setSucursales(sucursalesData?.filter(s => s.activa) || []);
    } catch (error) {
      console.error('Error cargando sucursales:', error);
    }
  };

  const handlePeriodoChange = (periodo) => {
    const today = new Date();
    let fechaInicio, fechaFin;

    switch (periodo) {
      case 'hoy':
        fechaInicio = format(today, 'yyyy-MM-dd');
        fechaFin = format(today, 'yyyy-MM-dd');
        break;
      case 'semana_actual':
        fechaInicio = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        fechaFin = format(today, 'yyyy-MM-dd');
        break;
      case 'mes_actual':
        fechaInicio = format(startOfMonth(today), 'yyyy-MM-dd');
        fechaFin = format(today, 'yyyy-MM-dd');
        break;
      case 'mes_anterior':
        const lastMonth = subMonths(today, 1);
        fechaInicio = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
        fechaFin = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
        break;
      case 'personalizado':
        // Mantener las fechas actuales
        return setFilters({ ...filters, periodo });
      default:
        fechaInicio = format(startOfMonth(today), 'yyyy-MM-dd');
        fechaFin = format(today, 'yyyy-MM-dd');
    }

    setFilters({ ...filters, periodo, fechaInicio, fechaFin });
  };

  const fetchGastos = async () => {
    setLoading(true);
    try {
      let result = await Ads_Gasto_Diario.list('-fecha');
      
      // Filtrar por sede
      if (filters.sede && filters.sede !== 'all') {
        result = result.filter(g => g.sede === filters.sede);
      }

      setGastos(result);
    } catch (error) {
      console.error('Error fetching gastos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataToSave = { ...formData };
      
      if (formData.tipo_gasto === 'periodo') {
        // Calcular días del periodo
        const fechaInicio = parseISO(formData.fecha);
        const fechaFin = parseISO(formData.fecha_fin);
        const diasPeriodo = differenceInDays(fechaFin, fechaInicio) + 1;
        
        if (diasPeriodo <= 0) {
          alert('La fecha de fin debe ser posterior a la fecha de inicio');
          setLoading(false);
          return;
        }
        
        // Calcular gasto diario
        const gastoDiario = formData.gasto_monto / diasPeriodo;
        
        dataToSave.gasto_total = formData.gasto_monto;
        dataToSave.dias_periodo = diasPeriodo;
        dataToSave.gasto_diario = gastoDiario;
      }
      
      await Ads_Gasto_Diario.create(dataToSave);
      setShowForm(false);
      setFormData({
        tipo_gasto: 'unico',
        fecha: format(new Date(), 'yyyy-MM-dd'),
        fecha_fin: format(new Date(), 'yyyy-MM-dd'),
        sede: '',
        gasto_monto: 0,
        plataforma: '',
        campana: ''
      });
      await fetchGastos();
    } catch (error) {
      console.error('Error creating gasto:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;
    setLoading(true);
    try {
      await Ads_Gasto_Diario.delete(id);
      await fetchGastos();
    } catch (error) {
      console.error('Error deleting gasto:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calcular el total considerando el fraccionamiento por periodo
  const calcularTotal = () => {
    const filterStart = parseISO(filters.fechaInicio);
    const filterEnd = parseISO(filters.fechaFin);
    
    return gastos.reduce((sum, gasto) => {
      if (gasto.tipo_gasto === 'periodo') {
        // Para gastos por periodo, calcular cuántos días del periodo caen dentro del filtro
        const gastoStart = parseISO(gasto.fecha);
        const gastoEnd = parseISO(gasto.fecha_fin);
        
        // Encontrar la intersección entre el periodo del gasto y el filtro
        const intersectionStart = gastoStart > filterStart ? gastoStart : filterStart;
        const intersectionEnd = gastoEnd < filterEnd ? gastoEnd : filterEnd;
        
        // Si hay intersección
        if (intersectionStart <= intersectionEnd) {
          const diasEnFiltro = differenceInDays(intersectionEnd, intersectionStart) + 1;
          const gastoDiario = gasto.gasto_diario || (gasto.gasto_total / gasto.dias_periodo);
          return sum + (gastoDiario * diasEnFiltro);
        }
        return sum;
      } else {
        // Para gastos únicos, verificar si la fecha está dentro del filtro
        const gastoFecha = parseISO(gasto.fecha);
        if (gastoFecha >= filterStart && gastoFecha <= filterEnd) {
          return sum + (gasto.gasto_monto || 0);
        }
        return sum;
      }
    }, 0);
  };

  // Filtrar gastos que aplican al periodo seleccionado
  const getGastosFiltrados = () => {
    const filterStart = parseISO(filters.fechaInicio);
    const filterEnd = parseISO(filters.fechaFin);
    
    return gastos.filter(gasto => {
      if (gasto.tipo_gasto === 'periodo') {
        const gastoStart = parseISO(gasto.fecha);
        const gastoEnd = parseISO(gasto.fecha_fin);
        // Incluir si hay alguna intersección con el periodo del filtro
        return gastoStart <= filterEnd && gastoEnd >= filterStart;
      } else {
        // Para gastos únicos, verificar si la fecha está dentro del filtro
        const gastoFecha = parseISO(gasto.fecha);
        return gastoFecha >= filterStart && gastoFecha <= filterEnd;
      }
    });
  };

  // Calcular el monto a mostrar en la tabla según el filtro
  const calcularMontoMostrado = (gasto) => {
    if (gasto.tipo_gasto === 'periodo') {
      const filterStart = parseISO(filters.fechaInicio);
      const filterEnd = parseISO(filters.fechaFin);
      const gastoStart = parseISO(gasto.fecha);
      const gastoEnd = parseISO(gasto.fecha_fin);
      
      const intersectionStart = gastoStart > filterStart ? gastoStart : filterStart;
      const intersectionEnd = gastoEnd < filterEnd ? gastoEnd : filterEnd;
      
      const diasEnFiltro = differenceInDays(intersectionEnd, intersectionStart) + 1;
      const gastoDiario = gasto.gasto_diario || (gasto.gasto_total / gasto.dias_periodo);
      
      return gastoDiario * diasEnFiltro;
    }
    return gasto.gasto_monto;
  };

  const gastosFiltrados = getGastosFiltrados();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Gastos en Publicidad</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Gasto
        </Button>
      </div>

      {/* Resumen */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-3xl font-bold text-green-600">
            ${calcularTotal().toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <p className="text-sm text-muted-foreground">Total Gastado (periodo seleccionado)</p>
        </CardContent>
      </Card>

      {/* Formulario de Ingreso */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Registrar Gasto en Publicidad</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tipo de Gasto */}
              <div>
                <Label htmlFor="tipo_gasto">Tipo de Gasto</Label>
                <Select
                  value={formData.tipo_gasto}
                  onValueChange={(value) => setFormData({ ...formData, tipo_gasto: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unico">Gasto Único (un día)</SelectItem>
                    <SelectItem value="periodo">Gasto por Periodo (varios días)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="fecha">
                    {formData.tipo_gasto === 'periodo' ? 'Fecha Inicio' : 'Fecha'}
                  </Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    required
                  />
                </div>
                
                {formData.tipo_gasto === 'periodo' && (
                  <div>
                    <Label htmlFor="fecha_fin">Fecha Fin</Label>
                    <Input
                      id="fecha_fin"
                      type="date"
                      value={formData.fecha_fin}
                      onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                      required
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="sede">Sede</Label>
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
                  <Label htmlFor="gasto_monto">
                    {formData.tipo_gasto === 'periodo' ? 'Monto Total del Periodo' : 'Monto Gastado'}
                  </Label>
                  <Input
                    id="gasto_monto"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.gasto_monto}
                    onChange={(e) => setFormData({ ...formData, gasto_monto: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              {/* Mostrar cálculo de gasto diario para periodos */}
              {formData.tipo_gasto === 'periodo' && formData.fecha && formData.fecha_fin && formData.gasto_monto > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-blue-800">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">
                      Días del periodo: {differenceInDays(parseISO(formData.fecha_fin), parseISO(formData.fecha)) + 1} días
                    </span>
                  </div>
                  <div className="text-sm text-blue-700 mt-1">
                    Gasto diario: ${(formData.gasto_monto / (differenceInDays(parseISO(formData.fecha_fin), parseISO(formData.fecha)) + 1)).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} / día
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="plataforma">Plataforma (opcional)</Label>
                  <Select
                    value={formData.plataforma}
                    onValueChange={(value) => setFormData({ ...formData, plataforma: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar plataforma" />
                    </SelectTrigger>
                    <SelectContent>
                      {plataformas.map((plat) => (
                        <SelectItem key={plat} value={plat}>
                          {plat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="campana">Campaña (opcional)</Label>
                  <Input
                    id="campana"
                    value={formData.campana}
                    onChange={(e) => setFormData({ ...formData, campana: e.target.value })}
                    placeholder="Nombre de la campaña"
                  />
                </div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="filter-periodo">Periodo</Label>
              <Select
                value={filters.periodo}
                onValueChange={handlePeriodoChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar periodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoy">Hoy</SelectItem>
                  <SelectItem value="semana_actual">Esta semana</SelectItem>
                  <SelectItem value="mes_actual">Este mes</SelectItem>
                  <SelectItem value="mes_anterior">Mes anterior</SelectItem>
                  <SelectItem value="personalizado">Rango personalizado</SelectItem>
                </SelectContent>
              </Select>
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

          {/* Rango personalizado */}
          {filters.periodo === 'personalizado' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla de Gastos */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Gastos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : gastosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No hay registros en el periodo seleccionado</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b hover:bg-gray-50">
                    <th className="text-left p-2 font-medium">Tipo</th>
                    <th className="text-left p-2 font-medium">Fecha(s)</th>
                    <th className="text-left p-2 font-medium">Sede</th>
                    <TableHead className="text-right">Monto (periodo filtrado)</th>
                    <TableHead className="text-right">Monto Total</th>
                    <th className="text-left p-2 font-medium">Plataforma</th>
                    <th className="text-left p-2 font-medium">Campaña</th>
                    <TableHead className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {gastosFiltrados.map((gasto) => {
                    const sede = sucursales.find(s => s.id === gasto.sede);
                    const montoMostrado = calcularMontoMostrado(gasto);
                    const montoTotal = gasto.tipo_gasto === 'periodo' ? gasto.gasto_total : gasto.gasto_monto;
                    
                    return (
                      <TableRow key={gasto.id}>
                        <td className="p-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            gasto.tipo_gasto === 'periodo' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {gasto.tipo_gasto === 'periodo' ? (
                              <>
                                <Calendar className="w-3 h-3 mr-1" />
                                Periodo
                              </>
                            ) : 'Único'}
                          </span>
                        </td>
                        <td className="p-2">
                          {gasto.tipo_gasto === 'periodo' ? (
                            <div className="text-sm">
                              <div>{format(parseISO(gasto.fecha), 'dd/MM/yyyy')}</div>
                              <div className="text-gray-500">al {format(parseISO(gasto.fecha_fin), 'dd/MM/yyyy')}</div>
                              <div className="text-xs text-gray-400">({gasto.dias_periodo} días)</div>
                            </div>
                          ) : (
                            format(parseISO(gasto.fecha), 'dd/MM/yyyy')
                          )}
                        </td>
                        <td className="p-2">{sede?.nombre_sede || gasto.sede}</td>
                        <TableCell className="text-right font-medium">
                          ${montoMostrado.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          {gasto.tipo_gasto === 'periodo' && (
                            <div className="text-xs text-gray-500">
                              ${(gasto.gasto_diario || 0).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/día
                            </div>
                          )}
                        </td>
                        <TableCell className="text-right text-gray-600">
                          ${montoTotal.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                        <td className="p-2">{gasto.plataforma || '-'}</td>
                        <td className="p-2">{gasto.campana || '-'}</td>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(gasto.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}