import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checklist_Asignados } from '@/entities/Checklist_Asignados';
import { Checklist_Templates } from '@/entities/Checklist_Templates';
import { Sucursales } from '@/entities/Sucursales';
import { Staff } from '@/entities/Staff';
import User from '@/entities/User';
import EjecutarChecklistDialog from '@/components/EjecutarChecklistDialog';
import { asignarChecklistAutomatico } from '@/utils/checklistHelpers';
import { Clock, CheckCircle2, AlertCircle, PlayCircle, Calendar } from 'lucide-react';
import moment from 'moment';

export default function MisChecklist() {
  const [usuario, setUsuario] = useState(null);
  const [staff, setStaff] = useState(null);
  const [checklistsHoy, setChecklistsHoy] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogEjecutar, setDialogEjecutar] = useState(false);
  const [checklistSeleccionado, setChecklistSeleccionado] = useState(null);
  const [sedeSeleccionada, setSedeSeleccionada] = useState('');
  const [turnoSeleccionado, setTurnoSeleccionado] = useState('');
  const [asignandoManual, setAsignandoManual] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar usuario actual
      const userData = await User.me();
      setUsuario(userData);

      // Buscar staff por email
      const staffData = await Staff.filter({ email: userData.email });
      if (staffData && staffData.length > 0) {
        setStaff(staffData[0]);
        
        // Cargar checklist del día
        await cargarChecklistsHoy(staffData[0].id);
      }

      // Cargar sedes
      const sedesData = await Sucursales.filter({ activo: true });
      setSedes(sedesData || []);
      
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarChecklistsHoy = async (staffId) => {
    try {
      const hoy = moment().format('YYYY-MM-DD');
      const checklistsData = await Checklist_Asignados.filter({
        usuario_id: staffId,
        fecha_asignacion: hoy
      });

      // Enriquecer con datos de plantilla
      const checklistsEnriquecidos = await Promise.all(
        (checklistsData || []).map(async (checklist) => {
          const plantilla = await Checklist_Templates.get(checklist.plantilla_id);
          return { ...checklist, plantilla };
        })
      );

      setChecklistsHoy(checklistsEnriquecidos.sort((a, b) => {
        // Ordenar: pendientes primero, luego en progreso, luego completados
        const orden = { pendiente: 1, en_progreso: 2, completado: 3, vencido: 4 };
        return (orden[a.estado] || 5) - (orden[b.estado] || 5);
      }));
    } catch (error) {
      console.error('Error al cargar checklist:', error);
    }
  };

  const handleAsignarManual = async () => {
    if (!sedeSeleccionada || !turnoSeleccionado) {
      alert('Selecciona sede y turno');
      return;
    }

    try {
      setAsignandoManual(true);
      const hoy = moment().format('YYYY-MM-DD');
      
      await asignarChecklistAutomatico(
        staff.id,
        hoy,
        sedeSeleccionada,
        turnoSeleccionado
      );

      await cargarChecklistsHoy(staff.id);
      setSedeSeleccionada('');
      setTurnoSeleccionado('');
    } catch (error) {
      console.error('Error al asignar checklist:', error);
      alert('Error al asignar checklist');
    } finally {
      setAsignandoManual(false);
    }
  };

  const handleIniciarChecklist = (checklist) => {
    setChecklistSeleccionado(checklist);
    setDialogEjecutar(true);
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      pendiente: { variant: 'secondary', label: 'Pendiente', icon: Clock },
      en_progreso: { variant: 'default', label: 'En Progreso', icon: PlayCircle },
      completado: { variant: 'default', label: 'Completado', icon: CheckCircle2, className: 'bg-green-600' },
      vencido: { variant: 'destructive', label: 'Vencido', icon: AlertCircle }
    };
    return badges[estado] || badges.pendiente;
  };

  const calcularRetraso = (checklist) => {
    if (!checklist.plantilla?.hora_inicio_esperada) return null;
    
    const ahora = moment();
    const [hora, minuto] = checklist.plantilla.hora_inicio_esperada.split(':');
    const horaEsperada = moment().set({ hour: parseInt(hora), minute: parseInt(minuto), second: 0 });
    
    if (ahora.isAfter(horaEsperada)) {
      const minutosRetraso = ahora.diff(horaEsperada, 'minutes');
      return minutosRetraso;
    }
    return null;
  };

  // Métricas del día
  const totalChecklist = checklistsHoy.length;
  const completados = checklistsHoy.filter(c => c.estado === 'completado').length;
  const enProgreso = checklistsHoy.filter(c => c.estado === 'en_progreso').length;
  const pendientes = checklistsHoy.filter(c => c.estado === 'pendiente').length;
  const vencidos = checklistsHoy.filter(c => c.estado === 'vencido').length;
  const porcentajeCompletado = totalChecklist > 0 ? Math.round((completados / totalChecklist) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-2">Usuario no encontrado</h2>
            <p className="text-sm text-slate-600">
              No se encontró tu perfil en el sistema. Contacta al administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold">Mis Checklist</h1>
              <p className="text-sm text-blue-100 mt-1">
                {moment().format('dddd, D [de] MMMM')}
              </p>
            </div>
            <Calendar className="w-8 h-8 opacity-80" />
          </div>

          {/* Progreso del día */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <div className="flex justify-between text-sm mb-2">
              <span>Progreso del día</span>
              <span className="font-bold">{completados} de {totalChecklist}</span>
            </div>
            <Progress value={porcentajeCompletado} className="h-2 bg-white/20" />
            <div className="text-right text-lg font-bold mt-1">
              {porcentajeCompletado}%
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Métricas */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{completados}</div>
              <div className="text-xs text-slate-600 mt-1">Completados</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{enProgreso}</div>
              <div className="text-xs text-slate-600 mt-1">En Progreso</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-slate-600">{pendientes}</div>
              <div className="text-xs text-slate-600 mt-1">Pendientes</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{vencidos}</div>
              <div className="text-xs text-slate-600 mt-1">Vencidos</div>
            </CardContent>
          </Card>
        </div>

        {/* Asignación manual si no hay checklist */}
        {totalChecklist === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Asignar Checklist Manual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                No tienes checklist asignados para hoy. Puedes asignarlos manualmente:
              </p>
              
              <Select value={sedeSeleccionada} onValueChange={setSedeSeleccionada}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sede" />
                </SelectTrigger>
                <SelectContent>
                  {sedes.map(sede => (
                    <SelectItem key={sede.id} value={sede.id}>{sede.nombre_sede}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={turnoSeleccionado} onValueChange={setTurnoSeleccionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar turno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mañana">Mañana</SelectItem>
                  <SelectItem value="tarde">Tarde</SelectItem>
                  <SelectItem value="noche">Noche</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={handleAsignarManual} 
                disabled={asignandoManual || !sedeSeleccionada || !turnoSeleccionado}
                className="w-full"
              >
                {asignandoManual ? 'Asignando...' : 'Asignar Checklist'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Listado de checklist */}
        {checklistsHoy.length > 0 && (
          <div className="space-y-3">
            {checklistsHoy.map(checklist => {
              const estadoBadge = getEstadoBadge(checklist.estado);
              const Icon = estadoBadge.icon;
              const retraso = calcularRetraso(checklist);
              const tieneRetraso = retraso && retraso > (checklist.plantilla?.minutos_alerta_retraso || 15);

              return (
                <Card key={checklist.id} className={tieneRetraso ? 'border-red-300' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-base">
                            {checklist.plantilla?.nombre_plantilla}
                          </h3>
                          <Badge 
                            variant={estadoBadge.variant}
                            className={estadoBadge.className}
                          >
                            <Icon className="w-3 h-3 mr-1" />
                            {estadoBadge.label}
                          </Badge>
                        </div>

                        <div className="space-y-1 text-sm text-slate-600">
                          <p className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Hora esperada: {checklist.plantilla?.hora_inicio_esperada}
                          </p>
                          <p>
                            Turno: <span className="font-medium">{checklist.turno}</span>
                          </p>
                        </div>

                        {tieneRetraso && checklist.estado === 'pendiente' && (
                          <div className="bg-red-50 border border-red-200 rounded p-2 mt-2 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-red-900">
                              <span className="font-semibold">Retraso de {retraso} minutos</span>
                              <br />
                              Inicia este checklist lo antes posible
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progreso */}
                    {checklist.estado !== 'pendiente' && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                          <span>Progreso</span>
                          <span>{checklist.items_completados} de {checklist.items_totales}</span>
                        </div>
                        <Progress value={checklist.porcentaje_completitud} className="h-2" />
                      </div>
                    )}

                    {/* Botón de acción */}
                    {checklist.estado !== 'completado' && (
                      <Button
                        onClick={() => handleIniciarChecklist(checklist)}
                        className="w-full"
                        variant={checklist.estado === 'pendiente' ? 'default' : 'outline'}
                      >
                        {checklist.estado === 'pendiente' ? (
                          <>
                            <PlayCircle className="w-4 h-4 mr-2" />
                            Iniciar Checklist
                          </>
                        ) : (
                          <>
                            <PlayCircle className="w-4 h-4 mr-2" />
                            Continuar Checklist
                          </>
                        )}
                      </Button>
                    )}

                    {checklist.estado === 'completado' && checklist.fecha_hora_finalizacion && (
                      <div className="bg-green-50 border border-green-200 rounded p-2 text-center">
                        <p className="text-sm text-green-900">
                          ✅ Completado a las {moment(checklist.fecha_hora_finalizacion).format('HH:mm')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog de ejecución */}
      <EjecutarChecklistDialog
        open={dialogEjecutar}
        onOpenChange={setDialogEjecutar}
        checklistAsignado={checklistSeleccionado}
        onSuccess={() => {
          cargarChecklistsHoy(staff.id);
          setChecklistSeleccionado(null);
        }}
      />
    </div>
  );
}