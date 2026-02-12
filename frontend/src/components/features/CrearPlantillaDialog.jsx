import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Checklist_Templates } from '@/entities/Checklist_Templates';

export default function CrearPlantillaDialog({ open, onOpenChange, plantilla, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre_plantilla: '',
    rol_asociado: '',
    tipo_checklist: '',
    dias_activos: [],
    hora_inicio_esperada: '',
    minutos_max_completar: 30,
    es_obligatorio: true,
    genera_alerta_retraso: true,
    genera_alerta_incompleto: true,
    minutos_alerta_retraso: 15,
    notificar_supervisor: true,
    activo: true,
    descripcion: ''
  });

  const diasSemana = [
    { value: 'lunes', label: 'Lunes' },
    { value: 'martes', label: 'Martes' },
    { value: 'miercoles', label: 'Miércoles' },
    { value: 'jueves', label: 'Jueves' },
    { value: 'viernes', label: 'Viernes' },
    { value: 'sabado', label: 'Sábado' },
    { value: 'domingo', label: 'Domingo' }
  ];

  const roles = [
    { value: 'vendedor', label: 'Vendedor' },
    { value: 'cerrador', label: 'Cerrador' },
    { value: 'jefe_ventas', label: 'Jefe de Ventas' },
    { value: 'RS', label: 'RS' },
    { value: 'asistente', label: 'Asistente' },
    { value: 'direccion', label: 'Dirección' }
  ];

  useEffect(() => {
    if (plantilla) {
      setFormData({
        nombre_plantilla: plantilla.nombre_plantilla || '',
        rol_asociado: plantilla.rol_asociado || '',
        tipo_checklist: plantilla.tipo_checklist || '',
        dias_activos: plantilla.dias_activos || [],
        hora_inicio_esperada: plantilla.hora_inicio_esperada || '',
        minutos_max_completar: plantilla.minutos_max_completar || 30,
        es_obligatorio: plantilla.es_obligatorio !== false,
        genera_alerta_retraso: plantilla.genera_alerta_retraso !== false,
        genera_alerta_incompleto: plantilla.genera_alerta_incompleto !== false,
        minutos_alerta_retraso: plantilla.minutos_alerta_retraso || 15,
        notificar_supervisor: plantilla.notificar_supervisor !== false,
        activo: plantilla.activo !== false,
        descripcion: plantilla.descripcion || ''
      });
    } else {
      setFormData({
        nombre_plantilla: '',
        rol_asociado: '',
        tipo_checklist: '',
        dias_activos: [],
        hora_inicio_esperada: '',
        minutos_max_completar: 30,
        es_obligatorio: true,
        genera_alerta_retraso: true,
        genera_alerta_incompleto: true,
        minutos_alerta_retraso: 15,
        notificar_supervisor: true,
        activo: true,
        descripcion: ''
      });
    }
  }, [plantilla, open]);

  const handleDiaToggle = (dia) => {
    setFormData(prev => ({
      ...prev,
      dias_activos: prev.dias_activos.includes(dia)
        ? prev.dias_activos.filter(d => d !== dia)
        : [...prev.dias_activos, dia]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre_plantilla || !formData.rol_asociado || !formData.tipo_checklist || 
        formData.dias_activos.length === 0 || !formData.hora_inicio_esperada) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      if (plantilla) {
        await Checklist_Templates.update(plantilla.id, formData);
      } else {
        await Checklist_Templates.create(formData);
      }
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error al guardar plantilla:', error);
      alert('Error al guardar la plantilla');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {plantilla ? 'Editar Plantilla' : 'Crear Nueva Plantilla'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Información básica */}
          <div className="space-y-4">
            <div>
              <Label>Nombre de la Plantilla *</Label>
              <Input
                value={formData.nombre_plantilla}
                onChange={(e) => setFormData({ ...formData, nombre_plantilla: e.target.value })}
                placeholder="Ej: Apertura Vendedor Mañana"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rol Asociado *</Label>
                <Select value={formData.rol_asociado} onValueChange={(value) => setFormData({ ...formData, rol_asociado: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(rol => (
                      <SelectItem key={rol.value} value={rol.value}>{rol.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tipo de Checklist *</Label>
                <Select value={formData.tipo_checklist} onValueChange={(value) => setFormData({ ...formData, tipo_checklist: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apertura">Apertura</SelectItem>
                    <SelectItem value="cierre">Cierre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Días Activos *</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {diasSemana.map(dia => (
                  <div key={dia.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={dia.value}
                      checked={formData.dias_activos.includes(dia.value)}
                      onCheckedChange={() => handleDiaToggle(dia.value)}
                    />
                    <label htmlFor={dia.value} className="text-sm cursor-pointer">
                      {dia.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hora de Inicio Esperada *</Label>
                <Input
                  type="time"
                  value={formData.hora_inicio_esperada}
                  onChange={(e) => setFormData({ ...formData, hora_inicio_esperada: e.target.value })}
                />
              </div>

              <div>
                <Label>Tiempo Máximo (minutos)</Label>
                <Input
                  type="number"
                  value={formData.minutos_max_completar}
                  onChange={(e) => setFormData({ ...formData, minutos_max_completar: parseInt(e.target.value) })}
                  min="5"
                  step="5"
                />
              </div>
            </div>

            <div>
              <Label>Descripción</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Instrucciones generales para este checklist..."
                rows={3}
              />
            </div>
          </div>

          {/* Configuración de alertas */}
          <div className="border-t pt-4 space-y-3">
            <h3 className="font-semibold text-sm">Configuración de Alertas</h3>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="es_obligatorio"
                checked={formData.es_obligatorio}
                onCheckedChange={(checked) => setFormData({ ...formData, es_obligatorio: checked })}
              />
              <label htmlFor="es_obligatorio" className="text-sm cursor-pointer">
                Checklist obligatorio
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="genera_alerta_retraso"
                checked={formData.genera_alerta_retraso}
                onCheckedChange={(checked) => setFormData({ ...formData, genera_alerta_retraso: checked })}
              />
              <label htmlFor="genera_alerta_retraso" className="text-sm cursor-pointer">
                Generar alerta por retraso en inicio
              </label>
            </div>

            {formData.genera_alerta_retraso && (
              <div className="ml-6">
                <Label>Minutos de tolerancia antes de alertar</Label>
                <Input
                  type="number"
                  value={formData.minutos_alerta_retraso}
                  onChange={(e) => setFormData({ ...formData, minutos_alerta_retraso: parseInt(e.target.value) })}
                  min="5"
                  step="5"
                  className="w-32"
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="genera_alerta_incompleto"
                checked={formData.genera_alerta_incompleto}
                onCheckedChange={(checked) => setFormData({ ...formData, genera_alerta_incompleto: checked })}
              />
              <label htmlFor="genera_alerta_incompleto" className="text-sm cursor-pointer">
                Generar alerta si no se completa
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="notificar_supervisor"
                checked={formData.notificar_supervisor}
                onCheckedChange={(checked) => setFormData({ ...formData, notificar_supervisor: checked })}
              />
              <label htmlFor="notificar_supervisor" className="text-sm cursor-pointer">
                Notificar al supervisor
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="activo"
                checked={formData.activo}
                onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
              />
              <label htmlFor="activo" className="text-sm cursor-pointer">
                Plantilla activa
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : plantilla ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}