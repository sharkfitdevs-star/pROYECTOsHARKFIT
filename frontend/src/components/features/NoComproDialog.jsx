import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Seguimiento_NPS } from '@/entities/Seguimiento_NPS';
import { User } from '@/entities/User';

export default function NoComproDialog({ open, onClose, onSave, prospecto, agendamiento }) {
  const [formData, setFormData] = useState({
    razon: 'No compró',
    notas: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Si la razón es "No compró", crear registro en Seguimiento_NPS y establecer fecha_ingreso_nps
    if (formData.razon === 'No compró' && prospecto) {
      try {
        const user = await User.me();
        const { Prospectos } = await import('@/entities/Prospectos');
        
        // Establecer fecha_ingreso_nps en el prospecto (solo si no existe)
        if (!prospecto.fecha_ingreso_nps) {
          await Prospectos.update(prospecto.id, {
            fecha_ingreso_nps: new Date().toISOString()
          });
        }
        
        // Verificar si ya existe un seguimiento para este prospecto
        const seguimientosExistentes = await Seguimiento_NPS.filter({ prospecto_id: prospecto.id });
        
        if (seguimientosExistentes.length === 0) {
          await Seguimiento_NPS.create({
            prospecto_id: prospecto.id,
            prospecto_nombre: prospecto.nombre,
            prospecto_whatsapp: prospecto.whatsapp,
            fecha_ingreso_nps: prospecto.fecha_ingreso_nps || new Date().toISOString(),
            sede: agendamiento?.sede || prospecto.sede,
            vendedor_asignado: prospecto.vendedor_asignado,
            fue_contactado: false,
            resultado_seguimiento: 'Pendiente'
          });
        }
      } catch (error) {
        console.error('Error creando seguimiento NPS:', error);
      }
    }
    
    onSave({
      razon: formData.razon,
      notas: formData.notas
    });
  };

  const handleClose = () => {
    setFormData({ razon: 'No compró', notas: '' });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Marcar como No Compró</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="razon">Razón</Label>
              <Select
                value={formData.razon}
                onValueChange={(value) => setFormData({ ...formData, razon: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="No compró">No compró</SelectItem>
                  <SelectItem value="Perdido">Perdido</SelectItem>
                  <SelectItem value="No califica">No califica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notas-no-compro">Notas</Label>
              <Textarea
                id="notas-no-compro"
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Motivo o detalles adicionales..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}