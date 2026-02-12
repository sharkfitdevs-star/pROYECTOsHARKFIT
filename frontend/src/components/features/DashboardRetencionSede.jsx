import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Target,
  Building2,
  UserX,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Phone,
  MessageCircle,
  X
} from 'lucide-react';
import moment from 'moment';

export default function DashboardRetencionSede({
  clientes = [],
  bajasProgramadas = [],
  deudores = [],
  ciclosRetencion = [],
  sedes = [],
  planes = [],
  mesActual = moment(),
  onRenovar,
  onContactar,
  onDarDeBaja
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTipo, setDialogTipo] = useState(null);
  const [dialogData, setDialogData] = useState([]);
  const [dialogTitle, setDialogTitle] = useState('');
  const [sedeSeleccionada, setSedeSeleccionada] = useState(null);

  const inicioMes = mesActual.clone().startOf('month');
  const finMes = mesActual.clone().endOf('month');
  const ultimoDiaMesAnterior = mesActual.clone().subtract(1, 'month').endOf('month');
  const hoy = moment();

  // Función helper para obtener clientes filtrados
  const getClientesFiltrados = (tipo, sedeId = null) => {
    let resultado = [];
    
    const clientesFiltradosSede = sedeId 
      ? clientes.filter(c => c.sede === sedeId)
      : clientes;

    // Filtrar clientes válidos (excluyendo servicios)
    const clientesValidos = clientesFiltradosSede.filter(c => {
      if (!c.plan_actual) return false;
      const plan = planes.find(p => p.id === c.plan_actual);
      return plan && plan.tipo_item !== 'Servicio';
    });

    switch (tipo) {
      case 'activos':
        // Activos = Clientes con plan activo al último día del mes anterior
        resultado = clientesValidos.filter(c => {
          if (c.modalidad_actual === 'Suscripción') {
            // Para suscripciones: que no estén dados de baja
            return c.estado_suscripcion !== 'Baja';
          }
          // Para Prepago/Programa: fecha_fin >= último día del mes anterior
          return c.fecha_fin_plan_actual && moment(c.fecha_fin_plan_actual).isSameOrAfter(ultimoDiaMesAnterior, 'day');
        });
        break;
      
      case 'aRenovar':
        resultado = clientesValidos.filter(c => {
          if (!c.fecha_fin_plan_actual) return false;
          const fechaFin = moment(c.fecha_fin_plan_actual);
          return fechaFin.isBetween(inicioMes, finMes, 'day', '[]');
        });
        break;
      
      case 'renovados':
        const ciclosFiltrados = sedeId 
          ? ciclosRetencion.filter(cr => cr.sede === sedeId)
          : ciclosRetencion;
        
        const clienteIdsRenovados = ciclosFiltrados
          .filter(cr => 
            cr.tipo_evento === 'Renovó' &&
            moment(cr.fecha_evento).isBetween(inicioMes, finMes, 'day', '[]')
          )
          .map(cr => cr.cliente);
        
        resultado = clientes.filter(c => clienteIdsRenovados.includes(c.id));
        break;
      
      case 'noRenovados':
        // No Renovados = Prepago y Programas que vencieron este mes y NO compraron Plan/Programa este mes
        const prepagoProgramasVencidos = clientesValidos.filter(c => {
          if (!c.fecha_fin_plan_actual) return false;
          const plan = planes.find(p => p.id === c.plan_actual);
          // Solo Prepago o Programas (no Suscripciones)
          if (!plan || (plan.modalidad_cobro === 'Suscripción' && plan.tipo_item !== 'Programa')) return false;
          const fechaFin = moment(c.fecha_fin_plan_actual);
          return fechaFin.isBetween(inicioMes, finMes, 'day', '[]') && fechaFin.isBefore(hoy, 'day');
        });
        
        const ciclosRenovSede = sedeId 
          ? ciclosRetencion.filter(cr => cr.sede === sedeId)
          : ciclosRetencion;
        
        const renovadosIds = ciclosRenovSede
          .filter(cr => 
            cr.tipo_evento === 'Renovó' &&
            moment(cr.fecha_evento).isBetween(inicioMes, finMes, 'day', '[]')
          )
          .map(cr => cr.cliente);
        
        resultado = prepagoProgramasVencidos.filter(c => !renovadosIds.includes(c.id));
        break;
      
      case 'bajas':
        const bajasFiltradas = sedeId 
          ? bajasProgramadas.filter(b => b.sede === sedeId)
          : bajasProgramadas;
        
        const bajasMes = bajasFiltradas.filter(b => 
          ['programada', 'continua_baja', 'ejecutada', 'en_gestion'].includes(b.estado_gestion) &&
          moment(b.fecha_baja_programada).isBetween(inicioMes, finMes, 'day', '[]')
        );
        
        const clienteIdsBajas = bajasMes.map(b => b.cliente);
        resultado = clientes.filter(c => clienteIdsBajas.includes(c.id));
        
        // Agregar info de baja a cada cliente
        resultado = resultado.map(c => {
          const baja = bajasMes.find(b => b.cliente === c.id);
          return { ...c, bajaProgramada: baja };
        });
        break;
      
      case 'deudores':
        // Deudores = Clientes con Suscripción marcados explícitamente como Deudor
        resultado = clientesValidos.filter(c => {
          const plan = planes.find(p => p.id === c.plan_actual);
          // Solo Suscripciones marcadas como Deudor
          if (!plan || plan.modalidad_cobro !== 'Suscripción') return false;
          return c.estado_suscripcion === 'Deudor';
        });
        break;
      
      default:
        resultado = [];
    }
    
    return resultado;
  };

  // Handler para abrir dialog
  const handleOpenDialog = (tipo, titulo, sedeId = null) => {
    const data = getClientesFiltrados(tipo, sedeId);
    setDialogTipo(tipo);
    setDialogTitle(titulo);
    setDialogData(data);
    setSedeSeleccionada(sedeId);
    setDialogOpen(true);
  };

  // Calcular métricas por sede
  const metricasPorSede = useMemo(() => {
    return sedes.map(sede => {
      const clientesSede = clientes.filter(c => {
        if (c.sede !== sede.id) return false;
        if (!c.plan_actual) return false;
        const plan = planes.find(p => p.id === c.plan_actual);
        return plan && plan.tipo_item !== 'Servicio';
      });

      // Activos al último día del mes anterior (base para calcular retención)
      const activosMesAnterior = clientesSede.filter(c => {
        if (c.modalidad_actual === 'Suscripción') {
          // Para suscripciones: que no estén dados de baja
          return c.estado_suscripcion !== 'Baja';
        }
        // Para Prepago/Programa: fecha_fin >= último día del mes anterior
        return c.fecha_fin_plan_actual && moment(c.fecha_fin_plan_actual).isSameOrAfter(ultimoDiaMesAnterior, 'day');
      });

      // A Renovar = clientes cuyo plan vence en el mes actual
      const aRenovar = clientesSede.filter(c => {
        if (!c.fecha_fin_plan_actual) return false;
        const fechaFin = moment(c.fecha_fin_plan_actual);
        return fechaFin.isBetween(inicioMes, finMes, 'day', '[]');
      });

      const vencidos = aRenovar.filter(c => 
        moment(c.fecha_fin_plan_actual).isBefore(hoy, 'day')
      );

      const renovadosMes = ciclosRetencion.filter(cr => 
        cr.sede === sede.id && 
        cr.tipo_evento === 'Renovó' &&
        moment(cr.fecha_evento).isBetween(inicioMes, finMes, 'day', '[]')
      );

      const bajasProgramadasMes = bajasProgramadas.filter(b => 
        b.sede === sede.id && 
        ['programada', 'continua_baja', 'ejecutada', 'en_gestion'].includes(b.estado_gestion) &&
        moment(b.fecha_baja_programada).isBetween(inicioMes, finMes, 'day', '[]')
      );

      // Deudores = Suscripciones marcadas explícitamente como Deudor
      const deudoresSede = clientesSede.filter(c => {
        const plan = planes.find(p => p.id === c.plan_actual);
        if (!plan || plan.modalidad_cobro !== 'Suscripción') return false;
        return c.estado_suscripcion === 'Deudor';
      });

      // No Renovados = Prepago y Programas que vencieron este mes y NO compraron Plan/Programa
      const prepagoProgramasVencidosSede = clientesSede.filter(c => {
        const plan = planes.find(p => p.id === c.plan_actual);
        if (!plan || (plan.modalidad_cobro === 'Suscripción' && plan.tipo_item !== 'Programa')) return false;
        if (!c.fecha_fin_plan_actual) return false;
        const fechaFin = moment(c.fecha_fin_plan_actual);
        return fechaFin.isBetween(inicioMes, finMes, 'day', '[]') && fechaFin.isBefore(hoy, 'day');
      });
      
      const renovadosClienteIds = renovadosMes.map(cr => cr.cliente);
      const noRenovados = prepagoProgramasVencidosSede.filter(c => !renovadosClienteIds.includes(c.id)).length;

      const recuperados = ciclosRetencion.filter(cr =>
        cr.sede === sede.id &&
        cr.tipo_evento === 'Recuperado' &&
        moment(cr.fecha_evento).isBetween(inicioMes, finMes, 'day', '[]')
      );

      // Total No Renovados = Bajas Programadas + Deudores + No Renov. (Prepago)
      const totalNoRenovados = bajasProgramadasMes.length + deudoresSede.length + noRenovados;
      
      // % Retención = (A Renovar - Total No Renovados) / A Renovar × 100
      const retencion = aRenovar.length > 0 
        ? (((aRenovar.length - totalNoRenovados) / aRenovar.length) * 100).toFixed(2)
        : 0;

      return {
        sede,
        activos: activosMesAnterior.length,
        aRenovar: aRenovar.length,
        vencidos: vencidos.length,
        renovados: renovadosMes.length,
        bajasProgramadas: bajasProgramadasMes.length,
        deudores: deudoresSede.length,
        deudoresList: deudoresSede,
        recuperados: recuperados.length,
        noRenovados,
        totalNoRenovados,
        retencion: parseFloat(retencion)
      };
    });
  }, [clientes, bajasProgramadas, deudores, ciclosRetencion, sedes, planes, inicioMes, finMes, ultimoDiaMesAnterior, hoy]);

  // Totales globales
  const totales = useMemo(() => {
    return metricasPorSede.reduce((acc, m) => ({
      activos: acc.activos + m.activos,
      aRenovar: acc.aRenovar + m.aRenovar,
      renovados: acc.renovados + m.renovados,
      bajasProgramadas: acc.bajasProgramadas + m.bajasProgramadas,
      deudores: acc.deudores + m.deudores,
      noRenovados: acc.noRenovados + m.noRenovados,
      recuperados: acc.recuperados + m.recuperados,
      totalNoRenovados: acc.totalNoRenovados + m.totalNoRenovados
    }), {
      activos: 0, aRenovar: 0, renovados: 0, bajasProgramadas: 0,
      deudores: 0, noRenovados: 0, recuperados: 0, totalNoRenovados: 0
    });
  }, [metricasPorSede]);

  // % Retención Global = (A Renovar - Total No Renovados) / A Renovar × 100
  const retencionGlobal = totales.aRenovar > 0
    ? (((totales.aRenovar - totales.totalNoRenovados) / totales.aRenovar) * 100).toFixed(2)
    : 0;

  const getColorByRetention = (value) => {
    if (value >= 85) return 'text-green-600';
    if (value >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (value) => {
    if (value >= 85) return 'bg-green-500';
    if (value >= 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getNombreSede = (sedeId) => {
    const sede = sedes.find(s => s.id === sedeId);
    return sede?.nombre_sede || '-';
  };

  const getNombrePlan = (planId) => {
    const plan = planes.find(p => p.id === planId);
    return plan?.nombre_plan || '-';
  };

  // Renderizar contenido del dialog según el tipo
  const renderDialogContent = () => {
    if (dialogData.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No hay clientes en esta categoría
        </div>
      );
    }

    return (
      <div className="max-h-[60vh] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Sede</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Vencimiento</TableHead>
              {dialogTipo === 'bajas' && <TableHead>Fecha Baja</TableHead>}
              {dialogTipo === 'deudores' && <TableHead>Monto</TableHead>}
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dialogData.map((cliente) => (
              <TableRow key={cliente.id}>
                <TableCell className="font-medium">{cliente.nombre_cliente}</TableCell>
                <TableCell>{cliente.whatsapp}</TableCell>
                <TableCell>{getNombreSede(cliente.sede)}</TableCell>
                <TableCell>{getNombrePlan(cliente.plan_actual)}</TableCell>
                <TableCell>
                  {cliente.fecha_fin_plan_actual 
                    ? moment(cliente.fecha_fin_plan_actual).format('DD/MM/YYYY')
                    : '-'
                  }
                </TableCell>
                {dialogTipo === 'bajas' && (
                  <TableCell>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700">
                      {cliente.bajaProgramada?.fecha_baja_programada 
                        ? moment(cliente.bajaProgramada.fecha_baja_programada).format('DD/MM/YYYY')
                        : '-'
                      }
                    </Badge>
                  </TableCell>
                )}
                {dialogTipo === 'deudores' && (
                  <TableCell>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700">
                      ${cliente.deudaInfo?.monto_adeudado?.toLocaleString() || 0}
                    </Badge>
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-300 hover:bg-green-50"
                      onClick={() => {
                        window.open(`https://wa.me/${cliente.whatsapp?.replace(/\D/g, '')}`, '_blank');
                      }}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    
                    {(dialogTipo === 'aRenovar' || dialogTipo === 'noRenovados') && onRenovar && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setDialogOpen(false);
                          onRenovar(cliente);
                        }}
                      >
                        Renovar
                      </Button>
                    )}
                    
                    {onContactar && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDialogOpen(false);
                          onContactar(cliente);
                        }}
                      >
                        Contacto
                      </Button>
                    )}
                    
                    {dialogTipo === 'activos' && cliente.modalidad_actual === 'Suscripción' && onDarDeBaja && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setDialogOpen(false);
                          onDarDeBaja(cliente);
                        }}
                      >
                        Dar Baja
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-600" />
            Dashboard de Retención por Sede
          </h2>
          <p className="text-gray-500 mt-1">
            Análisis de retención para {mesActual.format('MMMM YYYY')} - Click en las métricas para ver detalles
          </p>
        </div>
        <Badge className="text-lg px-4 py-2" variant="outline">
          Retención Global: <span className={`ml-2 font-bold ${getColorByRetention(retencionGlobal)}`}>{retencionGlobal}%</span>
        </Badge>
      </div>

      {/* KPIs Globales Clickeables */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card 
          className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-pointer hover:shadow-lg transition-all hover:scale-105"
          onClick={() => handleOpenDialog('activos', 'Clientes Activos')}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <Users className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold text-blue-700">{totales.activos}</span>
            </div>
            <p className="text-sm text-blue-600 mt-2">Activos (Base)</p>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200 cursor-pointer hover:shadow-lg transition-all hover:scale-105"
          onClick={() => handleOpenDialog('aRenovar', 'Clientes a Renovar Este Mes')}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <RefreshCw className="w-8 h-8 text-cyan-600" />
              <span className="text-2xl font-bold text-cyan-700">{totales.aRenovar}</span>
            </div>
            <p className="text-sm text-cyan-600 mt-2">A Renovar</p>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-pointer hover:shadow-lg transition-all hover:scale-105"
          onClick={() => handleOpenDialog('renovados', 'Clientes Renovados Este Mes')}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <span className="text-2xl font-bold text-green-700">{totales.renovados}</span>
            </div>
            <p className="text-sm text-green-600 mt-2">Renovados</p>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 cursor-pointer hover:shadow-lg transition-all hover:scale-105"
          onClick={() => handleOpenDialog('noRenovados', 'Clientes No Renovados')}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <XCircle className="w-8 h-8 text-red-600" />
              <span className="text-2xl font-bold text-red-700">{totales.noRenovados}</span>
            </div>
            <p className="text-sm text-red-600 mt-2">No Renov. (Prepago)</p>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-pointer hover:shadow-lg transition-all hover:scale-105"
          onClick={() => handleOpenDialog('bajas', 'Bajas Programadas')}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <UserX className="w-8 h-8 text-purple-600" />
              <span className="text-2xl font-bold text-purple-700">{totales.bajasProgramadas}</span>
            </div>
            <p className="text-sm text-purple-600 mt-2">Bajas Programadas</p>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 cursor-pointer hover:shadow-lg transition-all hover:scale-105"
          onClick={() => handleOpenDialog('deudores', 'Clientes Deudores')}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
              <span className="text-2xl font-bold text-orange-700">{totales.deudores}</span>
            </div>
            <p className="text-sm text-orange-600 mt-2">Deudores (Susc.)</p>
          </CardContent>
        </Card>
      </div>

      {/* Cards por Sede */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metricasPorSede.map((m) => (
          <Card key={m.sede.id} className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-700 text-white py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {m.sede.nombre_sede}
                </CardTitle>
                <div className={`text-xl font-bold ${m.retencion >= 80 ? 'text-green-400' : m.retencion >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {m.retencion}%
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Activos - Clickeable */}
              <div 
                className="bg-blue-50 rounded-lg p-3 cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => handleOpenDialog('activos', `Activos - ${m.sede.nombre_sede}`, m.sede.id)}
              >
                <div className="text-xs text-blue-600 font-medium mb-1">ACTIVOS (Base mes anterior)</div>
                <div className="text-3xl font-bold text-blue-700">{m.activos}</div>
                <div className="flex gap-4 mt-2 text-sm">
                  <div 
                    className="cursor-pointer hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDialog('aRenovar', `A Renovar - ${m.sede.nombre_sede}`, m.sede.id);
                    }}
                  >
                    <span className="text-gray-500">A Renovar (mes):</span>
                    <span className="font-semibold ml-1 text-cyan-600">{m.aRenovar}</span>
                  </div>
                </div>
              </div>

              {/* Métrica de retención */}
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-xs text-green-600 font-medium mb-1">% RETENCIÓN</div>
                <div className={`text-3xl font-bold ${getColorByRetention(m.retencion)}`}>
                  {m.retencion}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  ({m.aRenovar} - {m.totalNoRenovados}) / {m.aRenovar}
                </div>
              </div>

              {/* Barra de progreso */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progreso de retención</span>
                  <span 
                    className="cursor-pointer hover:underline text-green-600"
                    onClick={() => handleOpenDialog('renovados', `Renovados - ${m.sede.nombre_sede}`, m.sede.id)}
                  >
                    {m.renovados} renovados
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${getProgressColor(m.retencion)}`}
                    style={{ width: `${Math.min(100, Math.max(0, m.retencion))}%` }}
                  />
                </div>
              </div>

              {/* Bajas - Clickeable */}
              <div 
                className="bg-purple-50 rounded-lg p-3 cursor-pointer hover:bg-purple-100 transition-colors"
                onClick={() => handleOpenDialog('bajas', `Bajas - ${m.sede.nombre_sede}`, m.sede.id)}
              >
                <div className="text-xs text-purple-600 font-medium mb-2">BAJAS PROGRAMADAS</div>
                <div className="text-2xl font-bold text-purple-700">{m.bajasProgramadas}</div>
              </div>

              {/* Deudores - Clickeable */}
              <div 
                className="bg-orange-50 rounded-lg p-3 cursor-pointer hover:bg-orange-100 transition-colors"
                onClick={() => handleOpenDialog('deudores', `Deudores Suscripción - ${m.sede.nombre_sede}`, m.sede.id)}
              >
                <div className="text-xs text-orange-600 font-medium mb-2">DEUDORES (Suscripción)</div>
                <div className="text-2xl font-bold text-orange-700">{m.deudores}</div>
              </div>

              {/* No Renovados y Recuperados */}
              <div className="flex gap-3">
                <div 
                  className="flex-1 bg-red-50 rounded-lg p-2 text-center cursor-pointer hover:bg-red-100 transition-colors"
                  onClick={() => handleOpenDialog('noRenovados', `No Renovados Prepago/Programa - ${m.sede.nombre_sede}`, m.sede.id)}
                >
                  <div className="text-xs text-red-600 font-medium">NO RENOV. (Prepago)</div>
                  <div className="text-xl font-bold text-red-700">{m.noRenovados}</div>
                </div>
                <div className="flex-1 bg-emerald-50 rounded-lg p-2 text-center">
                  <div className="text-xs text-emerald-600 font-medium">RECUPERADOS</div>
                  <div className="text-xl font-bold text-emerald-700">{m.recuperados}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabla comparativa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Comparativa de Retención por Sede
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-semibold">Sede</th>
                  <th className="text-center p-3 font-semibold bg-blue-50">Activos</th>
                  <th className="text-center p-3 font-semibold bg-cyan-50">A Renovar</th>
                  <th className="text-center p-3 font-semibold bg-green-50">Renovados</th>
                  <th className="text-center p-3 font-semibold bg-red-50">No Renov.</th>
                  <th className="text-center p-3 font-semibold bg-purple-50">Bajas</th>
                  <th className="text-center p-3 font-semibold bg-orange-50">Deudores</th>
                  <th className="text-center p-3 font-semibold bg-emerald-50">Recup.</th>
                  <th className="text-center p-3 font-semibold">% Retención</th>
                </tr>
              </thead>
              <tbody>
                {metricasPorSede.map((m) => (
                  <tr key={m.sede.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{m.sede.nombre_sede}</td>
                    <td 
                      className="text-center p-3 bg-blue-50/50 cursor-pointer hover:bg-blue-100"
                      onClick={() => handleOpenDialog('activos', `Activos - ${m.sede.nombre_sede}`, m.sede.id)}
                    >
                      {m.activos}
                    </td>
                    <td 
                      className="text-center p-3 bg-cyan-50/50 cursor-pointer hover:bg-cyan-100"
                      onClick={() => handleOpenDialog('aRenovar', `A Renovar - ${m.sede.nombre_sede}`, m.sede.id)}
                    >
                      {m.aRenovar}
                    </td>
                    <td 
                      className="text-center p-3 bg-green-50/50 text-green-700 font-semibold cursor-pointer hover:bg-green-100"
                      onClick={() => handleOpenDialog('renovados', `Renovados - ${m.sede.nombre_sede}`, m.sede.id)}
                    >
                      {m.renovados}
                    </td>
                    <td 
                      className="text-center p-3 bg-red-50/50 text-red-700 font-semibold cursor-pointer hover:bg-red-100"
                      onClick={() => handleOpenDialog('noRenovados', `No Renovados - ${m.sede.nombre_sede}`, m.sede.id)}
                    >
                      {m.noRenovados}
                    </td>
                    <td 
                      className="text-center p-3 bg-purple-50/50 cursor-pointer hover:bg-purple-100"
                      onClick={() => handleOpenDialog('bajas', `Bajas - ${m.sede.nombre_sede}`, m.sede.id)}
                    >
                      {m.bajasProgramadas}
                    </td>
                    <td 
                      className="text-center p-3 bg-orange-50/50 cursor-pointer hover:bg-orange-100"
                      onClick={() => handleOpenDialog('deudores', `Deudores - ${m.sede.nombre_sede}`, m.sede.id)}
                    >
                      {m.deudores}
                    </td>
                    <td className="text-center p-3 bg-emerald-50/50 text-emerald-700">{m.recuperados}</td>
                    <td className="text-center p-3">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`font-bold ${getColorByRetention(m.retencion)}`}>
                          {m.retencion}%
                        </span>
                        {m.retencion >= 80 ? (
                          <ArrowUpRight className="w-4 h-4 text-green-500" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-bold">
                  <td className="p-3">TOTALES</td>
                  <td 
                    className="text-center p-3 cursor-pointer hover:bg-slate-200"
                    onClick={() => handleOpenDialog('activos', 'Todos los Activos')}
                  >
                    {totales.activos}
                  </td>
                  <td 
                    className="text-center p-3 cursor-pointer hover:bg-slate-200"
                    onClick={() => handleOpenDialog('aRenovar', 'Todos a Renovar')}
                  >
                    {totales.aRenovar}
                  </td>
                  <td 
                    className="text-center p-3 text-green-700 cursor-pointer hover:bg-slate-200"
                    onClick={() => handleOpenDialog('renovados', 'Todos los Renovados')}
                  >
                    {totales.renovados}
                  </td>
                  <td 
                    className="text-center p-3 text-red-700 cursor-pointer hover:bg-slate-200"
                    onClick={() => handleOpenDialog('noRenovados', 'Todos los No Renovados')}
                  >
                    {totales.noRenovados}
                  </td>
                  <td 
                    className="text-center p-3 cursor-pointer hover:bg-slate-200"
                    onClick={() => handleOpenDialog('bajas', 'Todas las Bajas')}
                  >
                    {totales.bajasProgramadas}
                  </td>
                  <td 
                    className="text-center p-3 cursor-pointer hover:bg-slate-200"
                    onClick={() => handleOpenDialog('deudores', 'Todos los Deudores')}
                  >
                    {totales.deudores}
                  </td>
                  <td className="text-center p-3 text-emerald-700">{totales.recuperados}</td>
                  <td className="text-center p-3">
                    <span className={`text-lg ${getColorByRetention(retencionGlobal)}`}>
                      {retencionGlobal}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para mostrar listados */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogTipo === 'activos' && <Users className="w-5 h-5 text-blue-600" />}
              {dialogTipo === 'aRenovar' && <RefreshCw className="w-5 h-5 text-cyan-600" />}
              {dialogTipo === 'renovados' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
              {dialogTipo === 'noRenovados' && <XCircle className="w-5 h-5 text-red-600" />}
              {dialogTipo === 'bajas' && <UserX className="w-5 h-5 text-purple-600" />}
              {dialogTipo === 'deudores' && <AlertTriangle className="w-5 h-5 text-orange-600" />}
              {dialogTitle}
              <Badge variant="outline" className="ml-2">{dialogData.length} clientes</Badge>
            </DialogTitle>
          </DialogHeader>
          {renderDialogContent()}
        </DialogContent>
      </Dialog>
    </div>
  );
}