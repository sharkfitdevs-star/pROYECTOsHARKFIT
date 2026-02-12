import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Star, 
  TrendingUp, 
  Users, 
  Target,
  Download,
  Filter,
  Calendar,
  Building2
} from 'lucide-react';
import { NPS_Cruzados } from '@/entities/NPS_Cruzados';
import { Clientes } from '@/entities/Clientes';
import { Sucursales } from '@/entities/Sucursales';
import { Staff } from '@/entities/Staff';
import { format, parseISO, subDays } from 'date-fns';
import * as RechartsPrimitive from 'recharts';

export default function ReporteNPSCruzados() {
  const [loading, setLoading] = useState(true);
  const [npsData, setNpsData] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [staff, setStaff] = useState([]);

  // Filtros
  const [fechaDesde, setFechaDesde] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [fechaHasta, setFechaHasta] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sedeEvaluadaFiltro, setSedeEvaluadaFiltro] = useState('todas');
  const [responsableFiltro, setResponsableFiltro] = useState('todos');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');

  // Métricas
  const [metricas, setMetricas] = useState({
    totalNPS: 0,
    promedioNPS: 0,
    promotores: 0,
    pasivos: 0,
    detractores: 0,
    compromisos: 0,
    reagendados: 0,
    noInteresados: 0,
    tasaConversion: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (npsData.length > 0) {
      calcularMetricas();
    }
  }, [npsData, fechaDesde, fechaHasta, sedeEvaluadaFiltro, responsableFiltro, estadoFiltro]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [npsDataResult, sedesData, staffData] = await Promise.all([
        NPS_Cruzados.list(),
        Sucursales.list(),
        Staff.list()
      ]);

      setNpsData(npsDataResult);
      setSedes(sedesData);
      setStaff(staffData);

      setLoading(false);
    } catch (error) {
      console.error('Error cargando datos:', error);
      setLoading(false);
    }
  };

  const getNpsFiltrados = () => {
    return npsData.filter(nps => {
      // Filtro por fecha
      if (nps.fecha_contacto) {
        const fechaNPS = parseISO(nps.fecha_contacto);
        const desde = parseISO(fechaDesde);
        const hasta = parseISO(fechaHasta);
        if (fechaNPS < desde || fechaNPS > hasta) return false;
      }

      // Filtro por sede evaluada
      if (sedeEvaluadaFiltro !== 'todas' && nps.sede_evaluada !== sedeEvaluadaFiltro) {
        return false;
      }

      // Filtro por responsable
      if (responsableFiltro !== 'todos' && nps.responsable_asignado !== responsableFiltro) {
        return false;
      }

      // Filtro por estado
      if (estadoFiltro !== 'todos' && nps.estado !== estadoFiltro) {
        return false;
      }

      return true;
    });
  };

  const calcularMetricas = () => {
    const npsFiltrados = getNpsFiltrados();
    const npsCompletados = npsFiltrados.filter(n => n.estado === 'completado' && n.puntaje_nps !== undefined);

    const totalNPS = npsCompletados.length;
    
    if (totalNPS === 0) {
      setMetricas({
        totalNPS: 0,
        promedioNPS: 0,
        promotores: 0,
        pasivos: 0,
        detractores: 0,
        compromisos: 0,
        reagendados: 0,
        noInteresados: 0,
        tasaConversion: 0
      });
      return;
    }

    // Calcular promedio
    const sumaPuntajes = npsCompletados.reduce((sum, nps) => sum + (nps.puntaje_nps || 0), 0);
    const promedioNPS = (sumaPuntajes / totalNPS).toFixed(1);

    // Clasificar por categoría
    const promotores = npsCompletados.filter(n => n.puntaje_nps >= 9).length;
    const pasivos = npsCompletados.filter(n => n.puntaje_nps >= 7 && n.puntaje_nps <= 8).length;
    const detractores = npsCompletados.filter(n => n.puntaje_nps <= 6).length;

    // Resultados comerciales
    const compromisos = npsCompletados.filter(n => n.resultado_contacto === 'compromiso_compra').length;
    const reagendados = npsFiltrados.filter(n => n.resultado_contacto === 'reagendo').length;
    const noInteresados = npsCompletados.filter(n => n.resultado_contacto === 'no_interesado').length;

    // Tasa de conversión a compromiso
    const tasaConversion = totalNPS > 0 ? ((compromisos / totalNPS) * 100).toFixed(1) : 0;

    setMetricas({
      totalNPS,
      promedioNPS,
      promotores,
      pasivos,
      detractores,
      compromisos,
      reagendados,
      noInteresados,
      tasaConversion
    });
  };

  const getDistribucionPuntajes = () => {
    const npsFiltrados = getNpsFiltrados().filter(n => n.puntaje_nps !== undefined);
    const distribucion = Array(11).fill(0);
    
    npsFiltrados.forEach(nps => {
      if (nps.puntaje_nps >= 0 && nps.puntaje_nps <= 10) {
        distribucion[nps.puntaje_nps]++;
      }
    });

    return distribucion.map((count, puntaje) => ({
      puntaje: puntaje.toString(),
      cantidad: count
    }));
  };

  const getAnalisisPorResponsable = () => {
    const npsFiltrados = getNpsFiltrados().filter(n => n.puntaje_nps !== undefined);
    const porResponsable = {};

    npsFiltrados.forEach(nps => {
      const responsableId = nps.responsable_asignado;
      if (!porResponsable[responsableId]) {
        porResponsable[responsableId] = {
          total: 0,
          sumaPuntajes: 0,
          compromisos: 0
        };
      }
      porResponsable[responsableId].total++;
      porResponsable[responsableId].sumaPuntajes += nps.puntaje_nps;
      if (nps.resultado_contacto === 'compromiso_compra') {
        porResponsable[responsableId].compromisos++;
      }
    });

    return Object.entries(porResponsable).map(([responsableId, data]) => {
      const responsable = staff.find(s => s.id === responsableId);
      return {
        responsable: responsable?.nombre || 'Desconocido',
        total: data.total,
        promedio: (data.sumaPuntajes / data.total).toFixed(1),
        compromisos: data.compromisos,
        tasaConversion: ((data.compromisos / data.total) * 100).toFixed(1)
      };
    }).sort((a, b) => b.total - a.total);
  };

  const exportarCSV = () => {
    const npsFiltrados = getNpsFiltrados();
    
    const headers = [
      'Fecha Contacto',
      'Cliente',
      'Sede Evaluada',
      'Responsable',
      'Puntaje NPS',
      'Categoría',
      'Resultado Contacto',
      'Comentario',
      'Estado'
    ];

    const rows = npsFiltrados.map(nps => {
      const sede = sedes.find(s => s.id === nps.sede_evaluada);
      const responsable = staff.find(s => s.id === nps.responsable_asignado);
      const categoria = nps.puntaje_nps >= 9 ? 'Promotor' : nps.puntaje_nps >= 7 ? 'Pasivo' : 'Detractor';

      return [
        nps.fecha_contacto ? format(parseISO(nps.fecha_contacto), 'dd/MM/yyyy') : '',
        nps.cliente_nombre || '',
        sede?.nombre || '',
        responsable?.nombre || '',
        nps.puntaje_nps !== undefined ? nps.puntaje_nps : '',
        categoria,
        nps.resultado_contacto || '',
        nps.comentario_cliente || '',
        nps.estado || ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_nps_cruzados_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
  };

  const getPuntajeColor = (puntaje) => {
    if (puntaje >= 9) return 'text-green-600 bg-green-50';
    if (puntaje >= 7) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getPuntajeLabel = (puntaje) => {
    if (puntaje >= 9) return 'Promotor';
    if (puntaje >= 7) return 'Pasivo';
    return 'Detractor';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando reporte...</p>
        </div>
      </div>
    );
  }

  const distribucionPuntajes = getDistribucionPuntajes();
  const analisisPorResponsable = getAnalisisPorResponsable();

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Star className="h-8 w-8 text-yellow-600" />
          Reporte NPS Cruzados
        </h1>
        <p className="text-gray-600 mt-1">
          Análisis de encuestas NPS realizadas entre sedes
        </p>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Desde</label>
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Hasta</label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sede Evaluada</label>
              <Select value={sedeEvaluadaFiltro} onValueChange={setSedeEvaluadaFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las sedes</SelectItem>
                  {sedes.map(sede => (
                    <SelectItem key={sede.id} value={sede.id}>{sede.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Responsable</label>
              <Select value={responsableFiltro} onValueChange={setResponsableFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {staff.filter(s => s.roles?.includes('RS')).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                  <SelectItem value="seguimiento">Seguimiento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={exportarCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total NPS Realizados</p>
                <p className="text-2xl font-bold">{metricas.totalNPS}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Puntaje Promedio</p>
                <p className="text-2xl font-bold">{metricas.promedioNPS}</p>
                <p className="text-xs text-gray-500">de 10</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Distribución</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Promotores</span>
                  <span className="font-semibold">{metricas.promotores}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-600">Pasivos</span>
                  <span className="font-semibold">{metricas.pasivos}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-600">Detractores</span>
                  <span className="font-semibold">{metricas.detractores}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conversión a Compromiso</p>
                <p className="text-2xl font-bold">{metricas.tasaConversion}%</p>
                <p className="text-xs text-gray-500">{metricas.compromisos} compromisos</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de distribución de puntajes */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Distribución de Puntajes NPS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
              <RechartsPrimitive.BarChart data={distribucionPuntajes}>
                <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" />
                <RechartsPrimitive.XAxis dataKey="puntaje" />
                <RechartsPrimitive.YAxis />
                <RechartsPrimitive.Bar dataKey="cantidad" fill="#eab308" />
              </RechartsPrimitive.BarChart>
            </RechartsPrimitive.ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Análisis por responsable */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Análisis por Responsable de Sede</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Responsable</th>
                  <th className="text-center p-2">Total NPS</th>
                  <th className="text-center p-2">Promedio</th>
                  <th className="text-center p-2">Compromisos</th>
                  <th className="text-center p-2">Tasa Conversión</th>
                </tr>
              </thead>
              <tbody>
                {analisisPorResponsable.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2">{item.responsable}</td>
                    <td className="text-center p-2">{item.total}</td>
                    <td className="text-center p-2">
                      <Badge className={getPuntajeColor(parseFloat(item.promedio))}>
                        {item.promedio}
                      </Badge>
                    </td>
                    <td className="text-center p-2">{item.compromisos}</td>
                    <td className="text-center p-2">{item.tasaConversion}%</td>
                  </tr>
                ))}
                {analisisPorResponsable.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center p-8 text-gray-500">
                      No hay datos para mostrar
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Listado detallado */}
      <Card>
        <CardHeader>
          <CardTitle>Listado Detallado de NPS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {getNpsFiltrados().map((nps) => {
              const sede = sedes.find(s => s.id === nps.sede_evaluada);
              const responsable = staff.find(s => s.id === nps.responsable_asignado);

              return (
                <div key={nps.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{nps.cliente_nombre}</h3>
                        {nps.puntaje_nps !== undefined && (
                          <Badge className={getPuntajeColor(nps.puntaje_nps)}>
                            {nps.puntaje_nps}/10 - {getPuntajeLabel(nps.puntaje_nps)}
                          </Badge>
                        )}
                        <Badge variant="outline">{nps.estado}</Badge>
                      </div>
                      <div className="text-sm space-y-1">
                        <p className="text-gray-600">
                          <span className="font-medium">Sede:</span> {sede?.nombre || 'N/A'}
                        </p>
                        <p className="text-gray-600">
                          <span className="font-medium">Responsable:</span> {responsable?.nombre || 'N/A'}
                        </p>
                        {nps.fecha_contacto && (
                          <p className="text-gray-600">
                            <span className="font-medium">Fecha:</span> {format(parseISO(nps.fecha_contacto), 'dd/MM/yyyy')}
                          </p>
                        )}
                        {nps.resultado_contacto && (
                          <p className="text-gray-600">
                            <span className="font-medium">Resultado:</span> {nps.resultado_contacto}
                          </p>
                        )}
                        {nps.comentario_cliente && (
                          <p className="text-gray-600 italic mt-2">
                            "{nps.comentario_cliente}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {getNpsFiltrados().length === 0 && (
              <div className="text-center py-8">
                <Star className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No hay NPS que coincidan con los filtros</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}