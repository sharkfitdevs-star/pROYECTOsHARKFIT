import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Cerradores } from '@/entities/Cerradores';
import { UserCheck } from 'lucide-react';

export default function AsignarCerradorDialog({ open, onClose, agendamiento, onSave }) {
  const [cerradores, setCerradores] = useState([]);
  const [selectedCerrador, setSelectedCerrador] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadCerradores();
      // Pre-seleccionar cerrador si ya existe
      if (agendamiento?.cerrador_asignado) {
        setSelectedCerrador(agendamiento.cerrador_asignado);
      } else {
        setSelectedCerrador('');
      }
    }
  }, [open, agendamiento]);

  const loadCerradores = async () => {
    try {
      const data = await Cerradores.list();
      setCerradores(data?.filter(c => c.activo) || []);
    } catch (error) {
      console.error('Error cargando cerradores:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCerrador) {
      alert('Por favor selecciona un cerrador');
      return;
    }

    setLoading(true);
    try {
      await onSave({ cerrador_asignado: selectedCerrador });
      onClose();
    } catch (error) {
      console.error('Error asignando cerrador:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <UserCheck className="w-5 h-5 mr-2" />
            Asignar Cerrador
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cerrador">Cerrador *</Label>
              <Select
                value={selectedCerrador}
                onValueChange={setSelectedCerrador}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un cerrador" />
                </SelectTrigger>
                <SelectContent>
                  {cerradores.map((cerrador) => (
                    <SelectItem key={cerrador.id} value={cerrador.id}>
                      {cerrador.nombre_cerrador}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                El cerrador asignado aparecerá por defecto al registrar la venta
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Asignando...' : 'Asignar Cerrador'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}