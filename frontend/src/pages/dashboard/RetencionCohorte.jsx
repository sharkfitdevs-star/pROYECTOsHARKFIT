import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Clientes } from '@/entities/Clientes';
import { Ciclos_Retencion } from '@/entities/Ciclos_Retencion';
import { Sucursales } from '@/entities/Sucursales';
import { Planes_Servicios } from '@/entities/Planes_Servicios';
import { startOfMonth, endOfMonth, format, parseISO, addMonths, differenceInMonths } from 'date-fns';
import { TrendingUp, TrendingDown, Users } from 'lucide-react';

export default function RetencionCohorte() {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [planes, setPlanes] = useState([]);
  
  // Filtros
  const [sedeFilter, setSedeFilter] = useState('todas');
  const [planFilter, setPlanFilter] = useState('todos');
  const [modalidadFilter, setModalidadFilter] = useState('todas');
  const [canalFilter, setCanalFilter] = useState('todos');
  const [cohorteInicio, setCohorteInicio] = useState('');
  const [cohorteFin, setCohorteFin] = useState('');

  // Datos procesados
  const [cohortes, setCohortes] = useState([]);
  const [metricsResumen, setMetricsResumen] = useState({
    totalClientes: 0,
    retencionPromedio: 0,
    mejorCohorte: null,
    peorCohorte: null
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (clientes.length > 0 && ciclos.length > 0) {
      procesarCohortes();
    }
  }, [clientes, ciclos, sedeFilter, planFilter, modalidadFilter, canalFilter, cohorteInicio, cohorteFin]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientesData, ciclosData, sucursalesData, planesData] = await Promise.all([
        Clientes.list('-fecha_primer_compra'),
        Ciclos_Retencion.list('-fecha_evento'),
        Sucursales.list(),
        Planes_Servicios.list()
      ]);

      setClientes(clientesData || []);
      setCiclos(ciclosData || []);
      setSucursales(sucursalesData || []);
      setPlanes(planesData || []);

      // Establecer fechas por defecto (últimos 6 meses)
      const hoy = new Date();
      const hace6Meses = addMonths(hoy, -6);
      setCohorteInicio(format(startOfMonth(hace6Meses), 'yyyy-MM-dd'));
      setCohorteFin(format(endOfMonth(hoy), 'yyyy-MM-dd'));
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const procesarCohortes = () => {
    // Filtrar clientes según criterios
    let clientesFiltrados = clientes.filter(cliente => {
      if (!cliente.fecha_primer_compra) return false;
      
      // Filtro de fecha de cohorte
      if (cohorteInicio && cliente.fecha_primer_compra < cohorteInicio) return false;
      if (cohorteFin && cliente.fecha_primer_compra > cohorteFin) return false;
      
      // Filtro de sede
      if (sedeFilter !== 'todas' && cliente.sede !== sedeFilter) return false;
      
      // Filtro de plan
      if (planFilter !== 'todos' && cliente.plan_actual !== planFilter) return false;
      
      // Filtro de modalidad
      if (modalidadFilter !== 'todas' && cliente.modalidad_actual !== modalidadFilter) return false;
      
      // Filtro de canal
      if (canalFilter !== 'todos' && cliente.canal_origen !== canalFilter) return false;
      
      return true;
    });

    // Agrupar por mes de primera compra
    const cohortesPorMes = {};
    
    clientesFiltrados.forEach(cliente => {
      const mesCohorte = format(parseISO(cliente.fecha_primer_compra), 'yyyy-MM');
      
      if (!cohortesPorMes[mesCohorte]) {
        cohortesPorMes[mesCohorte] = {
          mes: mesCohorte,
          totalClientes: 0,
          clientes: []
        };
      }
      
      cohortesPorMes[mesCohorte].totalClientes++;
      cohortesPorMes[mesCohorte].clientes.push(cliente);
    });

    // Obtener mes actual para excluir renovaciones incompletas
    const mesActual = format(new Date(), 'yyyy-MM');

    // Calcular retención por mes (Mes 2, 3, 4...) para cada cohorte
    const cohortesConRetencion = Object.values(cohortesPorMes).map(cohorte => {
      const mesesRetencion = {}; // Cambio: ahora usamos "meses" en lugar de "etapas"
      
      cohorte.clientes.forEach(cliente => {
        const fechaPrimerCompra = parseISO(cliente.fecha_primer_compra);
        const fechaFinPlan = cliente.fecha_fin_plan ? parseISO(cliente.fecha_fin_plan) : null;
        
        // Si no tiene fecha_fin_plan, no podemos calcular retención
        if (!fechaFinPlan) return;
        
        // Calcular el mes de renovación esperado (Mes 2 = primera renovación)
        const mesRenovacionEsperado = format(fechaFinPlan, 'yyyy-MM');
        
        // Excluir si la renovación esperada es en el mes actual (aún no cerrado)
        if (mesRenovacionEsperado === mesActual) return;
        
        // Calcular en qué "Mes X" debería renovar
        const mesesDesdeCompra = differenceInMonths(fechaFinPlan, fechaPrimerCompra);
        const mesRetencion = mesesDesdeCompra + 1; // Mes 2, 3, 4...
        
        // Verificar si renovó en ese periodo
        const renovacionesCliente = ciclos.filter(
          ciclo => ciclo.cliente === cliente.id && ciclo.tipo_evento === 'Renovó'
        );
        
        // Buscar si hay una renovación cercana a la fecha esperada (±30 días)
        const renovoEnPeriodo = renovacionesCliente.some(renovacion => {
          const fechaRenovacion = parseISO(renovacion.fecha_evento);
          const diffDias = Math.abs(differenceInMonths(fechaRenovacion, fechaFinPlan) * 30);
          return diffDias <= 30; // Tolerancia de 30 días
        });
        
        if (mesRetencion >= 2 && mesRetencion <= 13) { // Mes 2 a Mes 13
          if (!mesesRetencion[mesRetencion]) {
            mesesRetencion[mesRetencion] = {
              esperados: 0,
              renovados: 0
            };
          }
          mesesRetencion[mesRetencion].esperados++;
          if (renovoEnPeriodo) {
            mesesRetencion[mesRetencion].renovados++;
          }
        }
      });
      
      // Calcular porcentajes de retención por mes
      const retencionPorMes = {};
      for (let i = 2; i <= 13; i++) { // Mes 2 a Mes 13
        const datos = mesesRetencion[i] || { esperados: 0, renovados: 0 };
        retencionPorMes[i] = {
          esperados: datos.esperados,
          renovados: datos.renovados,
          porcentaje: datos.esperados > 0 ? (datos.renovados / datos.esperados) * 100 : null
        };
      }
      
      return {
        ...cohorte,
        retencionPorMes
      };
    });

    // Ordenar por mes descendente
    cohortesConRetencion.sort((a, b) => b.mes.localeCompare(a.mes));

    // Calcular promedios por mes (excluyendo cohortes sin datos completos)
    const promediosPorMes = {};
    for (let mes = 2; mes <= 13; mes++) {
      const cohortesConDatos = cohortesConRetencion.filter(c => {
        const datos = c.retencionPorMes[mes];
        return datos && datos.esperados > 0 && datos.porcentaje !== null;
      });
      
      if (cohortesConDatos.length > 0) {
        const sumaRetenciones = cohortesConDatos.reduce((sum, c) => {
          return sum + (c.retencionPorMes[mes]?.porcentaje || 0);
        }, 0);
        promediosPorMes[mes] = sumaRetenciones / cohortesConDatos.length;
      } else {
        promediosPorMes[mes] = null;
      }
    }

    // Calcular métricas resumen (basadas en Mes 2)
    const totalClientes = clientesFiltrados.length;
    const cohortesConMes2 = cohortesConRetencion.filter(c => {
      const datos = c.retencionPorMes[2];
      return datos && datos.esperados > 0 && datos.porcentaje !== null;
    });
    
    const retencionPromedio = cohortesConMes2.length > 0
      ? cohortesConMes2.reduce((sum, c) => sum + (c.retencionPorMes[2]?.porcentaje || 0), 0) / cohortesConMes2.length
      : 0;

    const mejorCohorte = cohortesConMes2.reduce((mejor, actual) => {
      const retencionActual = actual.retencionPorMes[2]?.porcentaje || 0;
      const retencionMejor = mejor?.retencionPorMes[2]?.porcentaje || 0;
      return retencionActual > retencionMejor ? actual : mejor;
    }, null);

    const peorCohorte = cohortesConMes2.reduce((peor, actual) => {
      const retencionActual = actual.retencionPorMes[2]?.porcentaje || 0;
      const retencionPeor = peor?.retencionPorMes[2]?.porcentaje || 100;
      return retencionActual < retencionPeor && retencionActual > 0 ? actual : peor;
    }, null);

    setCohortes(cohortesConRetencion);
    setMetricsResumen({
      totalClientes,
      retencionPromedio,
      mejorCohorte,
      peorCohorte,
      promediosPorMes // Agregar promedios para mostrar en la tabla
    });
  };

  const formatMesCohorte = (mes) => {
    try {
      const [year, month] = mes.split('-');
      const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      return `${meses[parseInt(month) - 1]} ${year}`;
    } catch {
      return mes;
    }
  };

  if (loading) {
    return <div className="p-8">Cargando análisis de cohortes...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Retención por Cohorte</h1>
      </div>

      {/* Tarjetas de Métricas Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricsResumen.totalClientes}</div>
            <p className="text-xs text-muted-foreground">En cohortes seleccionadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retención Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricsResumen.retencionPromedio.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Mes 2 (primera renovación)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mejor Cohorte</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metricsResumen.mejorCohorte ? formatMesCohorte(metricsResumen.mejorCohorte.mes) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {metricsResumen.mejorCohorte ? `${metricsResumen.mejorCohorte.retencionPorMes[2]?.porcentaje.toFixed(1)}% retención` : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peor Cohorte</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metricsResumen.peorCohorte ? formatMesCohorte(metricsResumen.peorCohorte.mes) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {metricsResumen.peorCohorte ? `${metricsResumen.peorCohorte.retencionPorMes[2]?.porcentaje.toFixed(1)}% retención` : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Análisis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>Periodo Cohorte (Inicio)</Label>
              <input
                type="date"
                value={cohorteInicio}
                onChange={(e) => setCohorteInicio(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Periodo Cohorte (Fin)</Label>
              <input
                type="date"
                value={cohorteFin}
                onChange={(e) => setCohorteFin(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Sede</Label>
              <Select value={sedeFilter} onValueChange={setSedeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las sedes</SelectItem>
                  {sucursales.filter(s => s.activa).map(sede => (
                    <SelectItem key={sede.id} value={sede.id}>{sede.nombre_sede}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los planes</SelectItem>
                  {planes.filter(p => p.activo).map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>{plan.nombre_plan}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Modalidad</Label>
              <Select value={modalidadFilter} onValueChange={setModalidadFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="Suscripción">Suscripción</SelectItem>
                  <SelectItem value="Prepago">Prepago</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Canal</Label>
              <Select value={canalFilter} onValueChange={setCanalFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="En sede">En sede</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Cohortes */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Retención por Cohorte</CardTitle>
          <p className="text-sm text-muted-foreground">
            Porcentaje de clientes que renovaron en cada mes. Mes 2 = primera renovación esperada.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cohorte (Mes)</TableHead>
                  <TableHead className="text-center">Clientes</TableHead>
                  <TableHead className="text-center">Mes 2</TableHead>
                  <TableHead className="text-center">Mes 3</TableHead>
                  <TableHead className="text-center">Mes 4</TableHead>
                  <TableHead className="text-center">Mes 5</TableHead>
                  <TableHead className="text-center">Mes 6</TableHead>
                  <TableHead className="text-center">Mes 7</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cohortes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No hay datos para mostrar con los filtros seleccionados
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {cohortes.map((cohorte) => (
                      <TableRow key={cohorte.mes}>
                        <TableCell className="font-medium">
                          {formatMesCohorte(cohorte.mes)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{cohorte.totalClientes}</Badge>
                        </TableCell>
                        {[2, 3, 4, 5, 6, 7].map(mes => {
                          const datos = cohorte.retencionPorMes[mes];
                          const porcentaje = datos?.porcentaje;
                          const renovados = datos?.renovados || 0;
                          const esperados = datos?.esperados || 0;
                          
                          return (
                            <TableCell key={mes} className="text-center">
                              {porcentaje !== null && esperados > 0 ? (
                                <div className="flex flex-col items-center">
                                  <span className={`font-semibold ${
                                    porcentaje >= 70 ? 'text-green-600' :
                                    porcentaje >= 50 ? 'text-yellow-600' :
                                    'text-red-600'
                                  }`}>
                                    {porcentaje.toFixed(1)}%
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    ({renovados}/{esperados})
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                    
                    {/* Fila de Promedios */}
                    {metricsResumen.promediosPorMes && (
                      <TableRow className="bg-muted/50 font-semibold border-t-2">
                        <TableCell className="font-bold">PROMEDIO</TableCell>
                        <TableCell className="text-center">-</TableCell>
                        {[2, 3, 4, 5, 6, 7].map(mes => {
                          const promedio = metricsResumen.promediosPorMes[mes];
                          
                          return (
                            <TableCell key={mes} className="text-center">
                              {promedio !== null ? (
                                <span className={`font-bold ${
                                  promedio >= 70 ? 'text-green-600' :
                                  promedio >= 50 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {promedio.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle>Cómo interpretar esta tabla</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>Cohorte:</strong> Mes en que los clientes realizaron su primera compra</p>
          <p>• <strong>Mes 2, 3, 4...:</strong> Representa el mes de renovación esperado desde la primera compra</p>
          <ul className="ml-6 space-y-1">
            <li>- <strong>Mes 2:</strong> Primera renovación esperada (1 mes después de la compra inicial)</li>
            <li>- <strong>Mes 3:</strong> Segunda renovación esperada (2 meses después)</li>
            <li>- Y así sucesivamente...</li>
          </ul>
          <p>• <strong>Porcentaje:</strong> % de clientes que renovaron vs. los que debían renovar en ese mes</p>
          <p>• <strong>Fila PROMEDIO:</strong> Promedio de retención por mes (excluye mes actual incompleto)</p>
          <p>• <strong>Colores:</strong> Verde ≥70%, Amarillo ≥50%, Rojo &lt;50%</p>
        </CardContent>
      </Card>
    </div>
  );
}