import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function CompromisoCompraDialog({ open, onClose, agendamiento, onSave }) {
  const [fechaHora, setFechaHora] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fechaHora) {
      alert('Por favor selecciona una fecha y hora para el compromiso');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        fecha_hora: fechaHora,
        notas: notas || 'Compromiso de compra registrado'
      });
      // Reset form
      setFechaHora('');
      setNotas('');
    } catch (error) {
      console.error('Error guardando compromiso:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFechaHora('');
    setNotas('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Compromiso de Compra
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Prospecto:</strong> {agendamiento?.prospecto_nombre}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                El prospecto mostró interés pero necesita más tiempo. Se marcará como "Compromiso de compra" y aparecerá en la página de Compromisos de Compra para seguimiento.
              </p>
            </div>

            <div>
              <Label htmlFor="fecha_hora">
                Nueva Fecha y Hora del Compromiso <span className="text-red-500">*</span>
              </Label>
              <input
                id="fecha_hora"
                type="datetime-local"
                value={fechaHora}
                onChange={(e) => setFechaHora(e.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Selecciona cuándo se compromete a regresar o decidir
              </p>
            </div>

            <div>
              <Label htmlFor="notas">Notas del Compromiso</Label>
              <Textarea
                id="notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Necesita consultar con su pareja, espera recibir pago el viernes, quiere probar una clase más..."
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                Describe el motivo del compromiso y cualquier detalle relevante
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Registrar Compromiso'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}