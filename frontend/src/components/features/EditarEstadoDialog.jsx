import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function EditarEstadoDialog({ open, onClose, agendamiento, onSave }) {
  const [estado, setEstado] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (agendamiento) {
      setEstado(agendamiento.resultado_asistencia || 'Pendiente');
    }
  }, [agendamiento]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({ resultado_asistencia: estado });
    } finally {
      setLoading(false);
    }
  };

  const estadosDisponibles = [
    { value: 'Pendiente', label: 'Pendiente' },
    { value: 'Asistió', label: 'Asistió' },
    { value: 'No asistió', label: 'No asistió' },
    { value: 'Reagendado', label: 'Reagendado' },
    { value: 'Gestionado', label: 'Gestionado' },
    { value: 'Compromiso de compra', label: 'Compromiso de compra' },
    { value: 'No contesta', label: 'No contesta' }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Estado del Agendamiento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select
                value={estado}
                onValueChange={setEstado}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {estadosDisponibles.map((est) => (
                    <SelectItem key={est.value} value={est.value}>
                      {est.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}