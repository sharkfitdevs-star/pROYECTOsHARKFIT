import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Checklist_Items } from '@/entities/Checklist_Items';

export default function AgregarItemDialog({ open, onOpenChange, plantillaId, item, maxOrden, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    descripcion_tarea: '',
    orden: maxOrden ? maxOrden + 1 : 1,
    es_obligatorio: true,
    requiere_evidencia: false,
    tipo_evidencia: 'ninguna',
    tiempo_estimado_minutos: 5,
    categoria: '',
    activo: true,
    notas_ayuda: ''
  });

  const categorias = [
    'Revisión',
    'Preparación',
    'Limpieza',
    'Reporte',
    'Comunicación',
    'Verificación',
    'Organización',
    'Otro'
  ];

  useEffect(() => {
    if (item) {
      setFormData({
        descripcion_tarea: item.descripcion_tarea || '',
        orden: item.orden || 1,
        es_obligatorio: item.es_obligatorio !== false,
        requiere_evidencia: item.requiere_evidencia || false,
        tipo_evidencia: item.tipo_evidencia || 'ninguna',
        tiempo_estimado_minutos: item.tiempo_estimado_minutos || 5,
        categoria: item.categoria || '',
        activo: item.activo !== false,
        notas_ayuda: item.notas_ayuda || ''
      });
    } else {
      setFormData({
        descripcion_tarea: '',
        orden: maxOrden ? maxOrden + 1 : 1,
        es_obligatorio: true,
        requiere_evidencia: false,
        tipo_evidencia: 'ninguna',
        tiempo_estimado_minutos: 5,
        categoria: '',
        activo: true,
        notas_ayuda: ''
      });
    }
  }, [item, maxOrden, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.descripcion_tarea) {
      alert('Por favor ingresa la descripción de la tarea');
      return;
    }

    setLoading(true);
    try {
      const data = {
        ...formData,
        plantilla_id: plantillaId
      };

      if (item) {
        await Checklist_Items.update(item.id, data);
      } else {
        await Checklist_Items.create(data);
      }
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error al guardar item:', error);
      alert('Error al guardar el item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item ? 'Editar Item' : 'Agregar Nuevo Item'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Descripción de la Tarea *</Label>
            <Textarea
              value={formData.descripcion_tarea}
              onChange={(e) => setFormData({ ...formData, descripcion_tarea: e.target.value })}
              placeholder="Ej: Revisar agenda del día y confirmar asistencias"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Orden</Label>
              <Input
                type="number"
                value={formData.orden}
                onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) })}
                min="1"
              />
            </div>

            <div>
              <Label>Tiempo Estimado (min)</Label>
              <Input
                type="number"
                value={formData.tiempo_estimado_minutos}
                onChange={(e) => setFormData({ ...formData, tiempo_estimado_minutos: parseInt(e.target.value) })}
                min="1"
                step="1"
              />
            </div>
          </div>

          <div>
            <Label>Categoría</Label>
            <Select value={formData.categoria} onValueChange={(value) => setFormData({ ...formData, categoria: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tipo de Evidencia</Label>
            <Select 
              value={formData.tipo_evidencia} 
              onValueChange={(value) => setFormData({ 
                ...formData, 
                tipo_evidencia: value,
                requiere_evidencia: value !== 'ninguna'
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ninguna">Sin evidencia</SelectItem>
                <SelectItem value="comentario">Comentario</SelectItem>
                <SelectItem value="foto">Foto</SelectItem>
                <SelectItem value="ambos">Comentario y Foto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notas de Ayuda</Label>
            <Textarea
              value={formData.notas_ayuda}
              onChange={(e) => setFormData({ ...formData, notas_ayuda: e.target.value })}
              placeholder="Instrucciones adicionales para completar esta tarea..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="es_obligatorio"
                checked={formData.es_obligatorio}
                onCheckedChange={(checked) => setFormData({ ...formData, es_obligatorio: checked })}
              />
              <label htmlFor="es_obligatorio" className="text-sm cursor-pointer">
                Item obligatorio
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="activo"
                checked={formData.activo}
                onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
              />
              <label htmlFor="activo" className="text-sm cursor-pointer">
                Item activo
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : item ? 'Actualizar' : 'Agregar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}