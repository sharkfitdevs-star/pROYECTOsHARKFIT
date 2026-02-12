import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checklist_Asignados } from '@/entities/Checklist_Asignados';
import { Checklist_Templates } from '@/entities/Checklist_Templates';
import { Alertas_Checklist } from '@/entities/Alertas_Checklist';
import { Staff } from '@/entities/Staff';
import { Sucursales } from '@/entities/Sucursales';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  Calendar,
  Award,
  XCircle
} from 'lucide-react';
import moment from 'moment';

export default function DashboardChecklist() {
  const [checklistsData, setChecklistsData] = useState([]);
  const [alertasData, setAlertasData] = useState([]);
  const [staffData, setStaffData] = useState([]);
  const [sedesData, setSedesData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [periodo, setPeriodo] = useState('hoy');
  const [sedeFilter, setSedeFilter] = useState('todas');
  const [rolFilter, setRolFilter] = useState('todos');

  useEffect(() => {
    cargarDatos();
  }, [periodo, sedeFilter]);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      // Calcular rango de fechas
      const { fechaInicio, fechaFin } = calcularRangoFechas(periodo);

      // Cargar staff y sedes
      const [staff, sedes] = await Promise.all([
        Staff.filter({ activo: true }),
        Sucursales.filter({ activo: true })
      ]);
      setStaffData(staff || []);
      setSedesData(sedes || []);

      // Cargar checklist del periodo
      const checklist = await Checklist_Asignados.list('-fecha_asignacion');
      const checklistFiltrados = (checklist || []).filter(c => {
        const fecha = c.fecha_asignacion;
        const cumpleFecha = fecha >= fechaInicio && fecha <= fechaFin;
        const cumpleSede = sedeFilter === 'todas' || c.sede_id === sedeFilter;
        return cumpleFecha && cumpleSede;
      });

      // Enriquecer con datos de plantilla y staff
      const checklistEnriquecidos = await Promise.all(
        checklistFiltrados.map(async (c) => {
          const plantilla = await Checklist_Templates.get(c.plantilla_id);
          const usuario = staff?.find(s => s.id === c.usuario_id);
          return { ...c, plantilla, usuario };
        })
      );

      setChecklistsData(checklistEnriquecidos);

      // Cargar alertas activas
      const alertas = await Alertas_Checklist.filter({
        estado_alerta: 'activa'
      });
      
      const alertasEnriquecidas = await Promise.all(
        (alertas || []).map(async (a) => {
          const checklist = checklistEnriquecidos.find(c => c.id === a.checklist_asignado_id);
          const usuario = staff?.find(s => s.id === a.usuario_afectado_id);
          return { ...a, checklist, usuario };
        })
      );

      setAlertasData(alertasEnriquecidas.filter(a => a.checklist)); // Solo alertas con checklist válido

    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularRangoFechas = (periodo) => {
    const hoy = moment().format('YYYY-MM-DD');
    let fechaInicio, fechaFin;

    switch (periodo) {
      case 'hoy':
        fechaInicio = fechaFin = hoy;
        break;
      case 'ayer':
        fechaInicio = fechaFin = moment().subtract(1, 'day').format('YYYY-MM-DD');
        break;
      case 'semana':
        fechaInicio = moment().startOf('week').format('YYYY-MM-DD');
        fechaFin = hoy;
        break;
      case 'mes':
        fechaInicio = moment().startOf('month').format('YYYY-MM-DD');
        fechaFin = hoy;
        break;
      default:
        fechaInicio = fechaFin = hoy;
    }

    return { fechaInicio, fechaFin };
  };

  const handleResolverAlerta = async (alerta) => {
    try {
      await Alertas_Checklist.update(alerta.id, {
        estado_alerta: 'resuelta',
        fecha_resolucion: new Date().toISOString()
      });
      cargarDatos();
    } catch (error) {
      console.error('Error al resolver alerta:', error);
      alert('Error al resolver la alerta');
    }
  };

  // Filtrar por rol
  const checklistsFiltrados = rolFilter === 'todos' 
    ? checklistsData 
    : checklistsData.filter(c => c.usuario?.roles?.includes(rolFilter));

  // Calcular métricas
  const totalChecklist = checklistsFiltrados.length;
  const completados = checklistsFiltrados.filter(c => c.estado === 'completado').length;
  const enProgreso = checklistsFiltrados.filter(c => c.estado === 'en_progreso').length;
  const pendientes = checklistsFiltrados.filter(c => c.estado === 'pendiente').length;
  const vencidos = checklistsFiltrados.filter(c => c.estado === 'vencido').length;
  const tasaCumplimiento = totalChecklist > 0 ? Math.round((completados / totalChecklist) * 100) : 0;

  // Ranking de usuarios
  const rankingUsuarios = staffData.map(usuario => {
    const checklistsUsuario = checklistsFiltrados.filter(c => c.usuario_id === usuario.id);
    const completadosUsuario = checklistsUsuario.filter(c => c.estado === 'completado').length;
    const totalUsuario = checklistsUsuario.length;
    const tasaUsuario = totalUsuario > 0 ? Math.round((completadosUsuario / totalUsuario) * 100) : 0;

    return {
      usuario,
      total: totalUsuario,
      completados: completadosUsuario,
      tasa: tasaUsuario
    };
  }).filter(r => r.total > 0).sort((a, b) => b.tasa - a.tasa);

  // Métricas por rol
  const roles = ['vendedor', 'cerrador', 'jefe_ventas', 'RS', 'asistente'];
  const metricasPorRol = roles.map(rol => {
    const checklistsRol = checklistsFiltrados.filter(c => c.usuario?.roles?.includes(rol));
    const completadosRol = checklistsRol.filter(c => c.estado === 'completado').length;
    const totalRol = checklistsRol.length;
    const tasaRol = totalRol > 0 ? Math.round((completadosRol / totalRol) * 100) : 0;

    return {
      rol,
      total: totalRol,
      completados: completadosRol,
      tasa: tasaRol
    };
  }).filter(m => m.total > 0);

  const getRolLabel = (rol) => {
    const labels = {
      vendedor: 'Vendedor',
      cerrador: 'Cerrador',
      jefe_ventas: 'Jefe de Ventas',
      RS: 'RS',
      asistente: 'Asistente'
    };
    return labels[rol] || rol;
  };

  const getTipoAlertaLabel = (tipo) => {
    const labels = {
      retraso_inicio: 'Retraso en inicio',
      no_completado: 'No completado',
      item_omitido: 'Item omitido',
      patron_recurrente: 'Patrón recurrente',
      tiempo_excedido: 'Tiempo excedido'
    };
    return labels[tipo] || tipo;
  };

  const getSeveridadColor = (severidad) => {
    const colors = {
      info: 'bg-blue-100 text-blue-800',
      warning: 'bg-amber-100 text-amber-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[severidad] || colors.info;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="p-4">
          <h1 className="text-xl font-bold text-slate-900">Dashboard Checklist</h1>
          <p className="text-sm text-slate-600 mt-1">Control y seguimiento de cumplimiento</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Filtros */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoy">Hoy</SelectItem>
                  <SelectItem value="ayer">Ayer</SelectItem>
                  <SelectItem value="semana">Esta semana</SelectItem>
                  <SelectItem value="mes">Este mes</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sedeFilter} onValueChange={setSedeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las sedes</SelectItem>
                  {sedesData.map(sede => (
                    <SelectItem key={sede.id} value={sede.id}>{sede.nombre_sede}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Select value={rolFilter} onValueChange={setRolFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los roles</SelectItem>
                {roles.map(rol => (
                  <SelectItem key={rol} value={rol}>{getRolLabel(rol)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Métricas principales */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Tasa de Cumplimiento</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{tasaCumplimiento}%</p>
                </div>
                {tasaCumplimiento >= 80 ? (
                  <TrendingUp className="w-8 h-8 text-green-500" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-500" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Alertas Activas</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">{alertasData.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Completados</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{completados}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Vencidos</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">{vencidos}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="alertas" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="alertas">Alertas</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
            <TabsTrigger value="roles">Por Rol</TabsTrigger>
          </TabsList>

          {/* Tab Alertas */}
          <TabsContent value="alertas" className="space-y-3 mt-4">
            {alertasData.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-slate-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
                  <p>No hay alertas activas</p>
                </CardContent>
              </Card>
            ) : (
              alertasData.map(alerta => (
                <Card key={alerta.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getSeveridadColor(alerta.nivel_severidad)}>
                            {alerta.nivel_severidad}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {moment(alerta.fecha_hora_generacion).format('DD/MM HH:mm')}
                          </span>
                        </div>
                        <p className="font-semibold text-sm">
                          {getTipoAlertaLabel(alerta.tipo_alerta)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1 text-sm text-slate-600 mb-3">
                      <p>
                        <span className="font-medium">Usuario:</span> {alerta.usuario?.nombre}
                      </p>
                      <p>
                        <span className="font-medium">Checklist:</span> {alerta.checklist?.plantilla?.nombre_plantilla}
                      </p>
                      <p className="text-xs">{alerta.descripcion}</p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolverAlerta(alerta)}
                      className="w-full"
                    >
                      Marcar como Resuelta
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Tab Ranking */}
          <TabsContent value="ranking" className="space-y-3 mt-4">
            {rankingUsuarios.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay datos de cumplimiento</p>
                </CardContent>
              </Card>
            ) : (
              rankingUsuarios.map((item, index) => (
                <Card key={item.usuario.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {index === 0 && <Award className="w-8 h-8 text-yellow-500" />}
                        {index === 1 && <Award className="w-8 h-8 text-slate-400" />}
                        {index === 2 && <Award className="w-8 h-8 text-amber-700" />}
                        {index > 2 && (
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                            {index + 1}
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="font-semibold">{item.usuario.nombre}</p>
                        <p className="text-xs text-slate-600">
                          {item.completados} de {item.total} completados
                        </p>
                      </div>

                      <div className="text-right">
                        <p className={`text-2xl font-bold ${
                          item.tasa >= 80 ? 'text-green-600' : 
                          item.tasa >= 60 ? 'text-amber-600' : 
                          'text-red-600'
                        }`}>
                          {item.tasa}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Tab Por Rol */}
          <TabsContent value="roles" className="space-y-3 mt-4">
            {metricasPorRol.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay datos por rol</p>
                </CardContent>
              </Card>
            ) : (
              metricasPorRol.map(metrica => (
                <Card key={metrica.rol}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{getRolLabel(metrica.rol)}</h3>
                      <Badge variant={metrica.tasa >= 80 ? 'default' : 'secondary'}>
                        {metrica.tasa}%
                      </Badge>
                    </div>

                    <div className="space-y-1 text-sm text-slate-600">
                      <p>Total checklist: {metrica.total}</p>
                      <p>Completados: {metrica.completados}</p>
                      <p>Pendientes: {metrica.total - metrica.completados}</p>
                    </div>

                    <div className="mt-3">
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            metrica.tasa >= 80 ? 'bg-green-500' : 
                            metrica.tasa >= 60 ? 'bg-amber-500' : 
                            'bg-red-500'
                          }`}
                          style={{ width: `${metrica.tasa}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}