import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function EditAgendamientoDialog({ open, onClose, agendamiento, onSave }) {
  const [formData, setFormData] = useState({
    fecha: '',
    hora: '',
    tipo_visita: '',
    notas: ''
  });

  useEffect(() => {
    if (agendamiento && open) {
      const fechaHora = new Date(agendamiento.fecha_hora);
      setFormData({
        fecha: fechaHora.toISOString().split('T')[0],
        hora: fechaHora.toTimeString().slice(0, 5),
        tipo_visita: agendamiento.tipo_visita || '',
        notas: agendamiento.notas || ''
      });
    }
  }, [agendamiento, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const fecha_hora = new Date(`${formData.fecha}T${formData.hora}`).toISOString();
    onSave({
      fecha_hora,
      tipo_visita: formData.tipo_visita,
      notas: formData.notas
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Agendamiento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-fecha">Fecha</Label>
              <input
                id="edit-fecha"
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-hora">Hora</Label>
              <input
                id="edit-hora"
                type="time"
                value={formData.hora}
                onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tipo">Tipo de Visita</Label>
              <Select
                value={formData.tipo_visita}
                onValueChange={(value) => setFormData({ ...formData, tipo_visita: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Invitación">Invitación</SelectItem>
                  <SelectItem value="Promesa de compra">Promesa de compra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notas">Notas</Label>
              <Textarea
                id="edit-notas"
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Notas adicionales..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Guardar Cambios</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}