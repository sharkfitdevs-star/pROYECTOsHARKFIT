import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Settings, 
  Plus, 
  Edit, 
  Copy, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  BookOpen,
  FileText
} from 'lucide-react';
import { Configuracion_Alertas } from '@/entities/Configuracion_Alertas';
import { Sucursales } from '@/entities/Sucursales';
import { Staff } from '@/entities/Staff';
import { useToast } from '@/components/ui/use-toast';
import { createPageUrl } from '@/utils';

export default function ConfiguracionAlertas() {
  const [reglas, setReglas] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reglaEditando, setReglaEditando] = useState(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    tipo_alerta: 'renovacion',
    nombre_regla: '',
    activa: true,
    dias_umbral_activacion: 3,
    dias_prioridad_alta: 7,
    dias_critico: 14,
    crear_tarea_automatica: false,
    notificar_supervisor: false,
    escalar_automaticamente: false,
    dias_para_escalar: 0,
    asignar_a: 'responsable_sede',
    staff_asignado_id: '',
    departamento: '',
    frecuencia_verificacion: 'diaria',
    aplicar_a_sedes: [],
    mensaje_alerta: '',
    notas: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [reglasData, sedesData, staffData] = await Promise.all([
        Configuracion_Alertas.list('-createdAt'),
        Sucursales.list('nombre'),
        Staff.list('nombre')
      ]);

      setReglas(reglasData || []);
      setSedes(sedesData.filter(s => s.activa) || []);
      setStaff(staffData.filter(s => s.activo) || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las configuraciones",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNuevaRegla = () => {
    setReglaEditando(null);
    setFormData({
      tipo_alerta: 'renovacion',
      nombre_regla: '',
      activa: true,
      dias_umbral_activacion: 3,
      dias_prioridad_alta: 7,
      dias_critico: 14,
      crear_tarea_automatica: false,
      notificar_supervisor: false,
      escalar_automaticamente: false,
      dias_para_escalar: 0,
      asignar_a: 'responsable_sede',
      staff_asignado_id: '',
      departamento: '',
      frecuencia_verificacion: 'diaria',
      aplicar_a_sedes: [],
      mensaje_alerta: '',
      notas: ''
    });
    setDialogOpen(true);
  };

  const handleEditarRegla = (regla) => {
    setReglaEditando(regla);
    setFormData({
      tipo_alerta: regla.tipo_alerta,
      nombre_regla: regla.nombre_regla,
      activa: regla.activa,
      dias_umbral_activacion: regla.dias_umbral_activacion,
      dias_prioridad_alta: regla.dias_prioridad_alta || 0,
      dias_critico: regla.dias_critico || 0,
      crear_tarea_automatica: regla.crear_tarea_automatica || false,
      notificar_supervisor: regla.notificar_supervisor || false,
      escalar_automaticamente: regla.escalar_automaticamente || false,
      dias_para_escalar: regla.dias_para_escalar || 0,
      asignar_a: regla.asignar_a || 'responsable_sede',
      staff_asignado_id: regla.staff_asignado_id || '',
      departamento: regla.departamento || '',
      frecuencia_verificacion: regla.frecuencia_verificacion || 'diaria',
      aplicar_a_sedes: regla.aplicar_a_sedes || [],
      mensaje_alerta: regla.mensaje_alerta || '',
      notas: regla.notas || ''
    });
    setDialogOpen(true);
  };

  const handleDuplicarRegla = (regla) => {
    setReglaEditando(null);
    setFormData({
      ...regla,
      nombre_regla: `${regla.nombre_regla} (Copia)`,
      activa: false
    });
    setDialogOpen(true);
  };

  const handleGuardarRegla = async () => {
    try {
      // Validación mejorada con mensajes específicos
      const errores = [];
      
      if (!formData.nombre_regla || formData.nombre_regla.trim() === '') {
        errores.push('Nombre de la Regla');
      }
      
      if (formData.dias_umbral_activacion === null || formData.dias_umbral_activacion === undefined || formData.dias_umbral_activacion === '') {
        errores.push('Días para Activar');
      }

      if (errores.length > 0) {
        toast({
          title: "Campos requeridos faltantes",
          description: `Por favor completa: ${errores.join(', ')}`,
          variant: "destructive"
        });
        return;
      }

      if (reglaEditando) {
        await Configuracion_Alertas.update(reglaEditando.id, formData);
        toast({
          title: "Regla actualizada",
          description: "La configuración ha sido actualizada correctamente"
        });
      } else {
        await Configuracion_Alertas.create(formData);
        toast({
          title: "Regla creada",
          description: "La nueva regla ha sido creada correctamente"
        });
      }

      setDialogOpen(false);
      cargarDatos();
    } catch (error) {
      console.error('Error guardando regla:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la regla",
        variant: "destructive"
      });
    }
  };

  const handleToggleActiva = async (regla) => {
    try {
      await Configuracion_Alertas.update(regla.id, {
        activa: !regla.activa
      });
      toast({
        title: regla.activa ? "Regla desactivada" : "Regla activada",
        description: `La regla "${regla.nombre_regla}" ha sido ${regla.activa ? 'desactivada' : 'activada'}`
      });
      cargarDatos();
    } catch (error) {
      console.error('Error actualizando regla:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la regla",
        variant: "destructive"
      });
    }
  };

  const handleEliminarRegla = async (reglaId) => {
    if (!confirm('¿Estás seguro de eliminar esta regla?')) return;

    try {
      await Configuracion_Alertas.delete(reglaId);
      toast({
        title: "Regla eliminada",
        description: "La regla ha sido eliminada correctamente"
      });
      cargarDatos();
    } catch (error) {
      console.error('Error eliminando regla:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la regla",
        variant: "destructive"
      });
    }
  };

  const getTipoAlertaLabel = (tipo) => {
    const labels = {
      renovacion: 'Renovación',
      deudor: 'Deudor',
      contrato_pendiente: 'Contrato Pendiente',
      tarjeta_pendiente: 'Tarjeta Pendiente',
      cliente_riesgo: 'Cliente en Riesgo',
      seguimiento_online: 'Seguimiento Online',
      baja_programada: 'Baja Programada',
      nps_cruzado: 'NPS Cruzado'
    };
    return labels[tipo] || tipo;
  };

  const getTipoAlertaDescripcion = (tipo) => {
    const descripciones = {
      renovacion: 'Detecta clientes con planes PREPAGO vencidos que no han renovado',
      deudor: 'Detecta clientes con deudas pendientes que superan días de atraso',
      contrato_pendiente: 'Detecta contratos que llevan días pendientes de firma',
      tarjeta_pendiente: 'Detecta tarjetas con intentos fallidos de registro',
      cliente_riesgo: 'Detecta clientes en riesgo de pérdida que llevan días sin gestión',
      seguimiento_online: 'Detecta clientes en seguimiento online (0-3 días vencidos) que necesitan contacto',
      baja_programada: 'Detecta bajas programadas que se acercan a su fecha de ejecución',
      nps_cruzado: 'Detecta encuestas NPS cruzadas pendientes',
      cliente_nuevo: 'Detecta clientes nuevos y genera tareas automáticas de onboarding a diferentes responsables'
    };
    return descripciones[tipo] || '';
  };

  const getTipoAlertaColor = (tipo) => {
    const colors = {
      renovacion: 'bg-orange-500',
      deudor: 'bg-red-500',
      contrato_pendiente: 'bg-blue-500',
      tarjeta_pendiente: 'bg-purple-500',
      cliente_riesgo: 'bg-yellow-500',
      seguimiento_online: 'bg-green-500',
      baja_programada: 'bg-pink-500',
      nps_cruzado: 'bg-indigo-500'
    };
    return colors[tipo] || 'bg-gray-500';
  };

  // Métricas
  const reglasActivas = reglas.filter(r => r.activa).length;
  const reglasPorTipo = reglas.reduce((acc, r) => {
    acc[r.tipo_alerta] = (acc[r.tipo_alerta] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="w-8 h-8" />
            Configuración de Alertas
          </h1>
          <p className="text-gray-600 mt-1">
            Gestiona las reglas automáticas de generación de alertas
          </p>
          <div className="mt-3 space-y-2">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-800">
                  💡 <strong>¿No sabes qué hace cada alerta?</strong> Lee la guía completa con ejemplos
                </p>
                <Link to={createPageUrl('GuiaTiposAlertas')}>
                  <Button size="sm" variant="outline" className="bg-white">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Ver Guía Completa
                  </Button>
                </Link>
              </div>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm text-green-800">
                  🔍 <strong>¿Quieres verificar tus reglas?</strong> Analiza el estado de configuración
                </p>
                <Link to={createPageUrl('AnalisisReglasAlertas')}>
                  <Button size="sm" variant="outline" className="bg-white">
                    <FileText className="w-4 h-4 mr-2" />
                    Analizar Reglas
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
        <Button onClick={handleNuevaRegla}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Regla
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{reglasActivas}</div>
            <p className="text-sm text-gray-600">Reglas Activas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-600">{reglas.length - reglasActivas}</div>
            <p className="text-sm text-gray-600">Reglas Inactivas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{reglas.length}</div>
            <p className="text-sm text-gray-600">Total Reglas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">{Object.keys(reglasPorTipo).length}</div>
            <p className="text-sm text-gray-600">Tipos Configurados</p>
          </CardContent>
        </Card>
      </div>

      {/* Listado de Reglas */}
      <Card>
        <CardHeader>
          <CardTitle>Reglas Configuradas ({reglas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {reglas.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No hay reglas configuradas</p>
              <Button className="mt-4" onClick={handleNuevaRegla}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Primera Regla
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {reglas.map(regla => (
                <div key={regla.id} className={`border rounded-lg p-4 ${regla.activa ? 'bg-white' : 'bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={getTipoAlertaColor(regla.tipo_alerta)}>
                          {getTipoAlertaLabel(regla.tipo_alerta)}
                        </Badge>
                        <h3 className="font-semibold text-lg">{regla.nombre_regla}</h3>
                        {regla.activa ? (
                          <Badge className="bg-green-500">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Activa
                          </Badge>
                        ) : (
                          <Badge variant="outline">Inactiva</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Umbral:</span>
                          <span className="ml-2 font-medium">{regla.dias_umbral_activacion} días</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Prioridad Alta:</span>
                          <span className="ml-2 font-medium">{regla.dias_prioridad_alta || '-'} días</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Crítico:</span>
                          <span className="ml-2 font-medium">{regla.dias_critico || '-'} días</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Frecuencia:</span>
                          <span className="ml-2 font-medium capitalize">{regla.frecuencia_verificacion}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-3 text-sm">
                        {regla.crear_tarea_automatica && (
                          <Badge variant="outline" className="bg-blue-50">
                            <Clock className="w-3 h-3 mr-1" />
                            Crea Tarea
                          </Badge>
                        )}
                        {regla.notificar_supervisor && (
                          <Badge variant="outline" className="bg-purple-50">
                            <Users className="w-3 h-3 mr-1" />
                            Notifica Supervisor
                          </Badge>
                        )}
                        {regla.escalar_automaticamente && (
                          <Badge variant="outline" className="bg-red-50">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Escala ({regla.dias_para_escalar}d)
                          </Badge>
                        )}
                      </div>

                      {regla.notas && (
                        <p className="text-sm text-gray-600 mt-2 italic">{regla.notas}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Switch
                        checked={regla.activa}
                        onCheckedChange={() => handleToggleActiva(regla)}
                      />
                      <Button size="sm" variant="outline" onClick={() => handleEditarRegla(regla)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDuplicarRegla(regla)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleEliminarRegla(regla.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Crear/Editar Regla */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {reglaEditando ? 'Editar Regla' : 'Nueva Regla de Alerta'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Información Básica */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Información Básica</h3>
              
              <div>
                <Label>Tipo de Alerta *</Label>
                <Select value={formData.tipo_alerta} onValueChange={(value) => setFormData({...formData, tipo_alerta: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="renovacion">Renovación</SelectItem>
                    <SelectItem value="deudor">Deudor</SelectItem>
                    <SelectItem value="contrato_pendiente">Contrato Pendiente</SelectItem>
                    <SelectItem value="tarjeta_pendiente">Tarjeta Pendiente</SelectItem>
                    <SelectItem value="cliente_riesgo">Cliente en Riesgo</SelectItem>
                    <SelectItem value="seguimiento_online">Seguimiento Online</SelectItem>
                    <SelectItem value="baja_programada">Baja Programada</SelectItem>
                    <SelectItem value="nps_cruzado">NPS Cruzado</SelectItem>
                    <SelectItem value="cliente_nuevo">Cliente Nuevo (Onboarding)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1 italic">
                  {getTipoAlertaDescripcion(formData.tipo_alerta)}
                </p>
              </div>

              <div>
                <Label>Nombre de la Regla *</Label>
                <Input
                  value={formData.nombre_regla}
                  onChange={(e) => setFormData({...formData, nombre_regla: e.target.value})}
                  placeholder="Ej: Alerta de renovación estándar"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.activa}
                  onCheckedChange={(checked) => setFormData({...formData, activa: checked})}
                />
                <Label>Regla activa</Label>
              </div>
            </div>

            {/* Umbrales */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Umbrales de Activación</h3>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Días para Activar *</Label>
                  <Input
                    type="number"
                    value={formData.dias_umbral_activacion}
                    onChange={(e) => setFormData({...formData, dias_umbral_activacion: parseInt(e.target.value)})}
                  />
                  <p className="text-xs text-blue-600 mt-1 font-medium">
                    💡 Umbral 0 = Crear tarea inmediatamente cuando se detecta la condición
                  </p>
                  <p className="text-xs text-gray-500">
                    Umbral mayor a 0 = Esperar esos días antes de crear la tarea
                  </p>
                </div>

                <div>
                  <Label>Días Prioridad Alta</Label>
                  <Input
                    type="number"
                    value={formData.dias_prioridad_alta}
                    onChange={(e) => setFormData({...formData, dias_prioridad_alta: parseInt(e.target.value)})}
                  />
                  <p className="text-xs text-gray-500 mt-1">Días para prioridad alta</p>
                </div>

                <div>
                  <Label>Días Crítico</Label>
                  <Input
                    type="number"
                    value={formData.dias_critico}
                    onChange={(e) => setFormData({...formData, dias_critico: parseInt(e.target.value)})}
                  />
                  <p className="text-xs text-gray-500 mt-1">Días para marcar crítico</p>
                </div>
              </div>
            </div>

            {/* Acciones Automáticas */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Acciones Automáticas</h3>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.crear_tarea_automatica}
                    onCheckedChange={(checked) => setFormData({...formData, crear_tarea_automatica: checked})}
                  />
                  <Label>Crear tarea automática en Tareas_RS</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.notificar_supervisor}
                    onCheckedChange={(checked) => setFormData({...formData, notificar_supervisor: checked})}
                  />
                  <Label>Notificar al supervisor</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.escalar_automaticamente}
                    onCheckedChange={(checked) => setFormData({...formData, escalar_automaticamente: checked})}
                  />
                  <Label>Escalar automáticamente</Label>
                </div>

                {formData.escalar_automaticamente && (
                  <div className="ml-6">
                    <Label>Días sin gestión para escalar</Label>
                    <Input
                      type="number"
                      value={formData.dias_para_escalar}
                      onChange={(e) => setFormData({...formData, dias_para_escalar: parseInt(e.target.value)})}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Asignación */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Asignación</h3>
              
              <div>
                <Label>Asignar a</Label>
                <Select value={formData.asignar_a} onValueChange={(value) => setFormData({...formData, asignar_a: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="responsable_sede">Responsable de Sede</SelectItem>
                    <SelectItem value="staff_especifico">Staff Específico</SelectItem>
                    <SelectItem value="departamento">Departamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.asignar_a === 'staff_especifico' && (
                <div>
                  <Label>Staff Asignado</Label>
                  <Select value={formData.staff_asignado_id} onValueChange={(value) => setFormData({...formData, staff_asignado_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.asignar_a === 'departamento' && (
                <div>
                  <Label>Departamento</Label>
                  <Select value={formData.departamento} onValueChange={(value) => setFormData({...formData, departamento: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ventas">Ventas</SelectItem>
                      <SelectItem value="financiero">Financiero</SelectItem>
                      <SelectItem value="retencion">Retención</SelectItem>
                      <SelectItem value="soporte">Soporte</SelectItem>
                      <SelectItem value="experiencia_cliente">Experiencia al Cliente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Configuración Adicional */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Configuración Adicional</h3>
              
              <div>
                <Label>Frecuencia de Verificación</Label>
                <Select value={formData.frecuencia_verificacion} onValueChange={(value) => setFormData({...formData, frecuencia_verificacion: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cada_hora">Cada Hora</SelectItem>
                    <SelectItem value="cada_4_horas">Cada 4 Horas</SelectItem>
                    <SelectItem value="diaria">Diaria</SelectItem>
                    <SelectItem value="cada_2_dias">Cada 2 Días</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Mensaje de Alerta</Label>
                <Textarea
                  value={formData.mensaje_alerta}
                  onChange={(e) => setFormData({...formData, mensaje_alerta: e.target.value})}
                  placeholder="Mensaje personalizado que aparecerá en la alerta"
                  rows={2}
                />
              </div>

              <div>
                <Label>Notas</Label>
                <Textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({...formData, notas: e.target.value})}
                  placeholder="Notas internas sobre esta regla"
                  rows={2}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarRegla}>
              {reglaEditando ? 'Actualizar' : 'Crear'} Regla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}