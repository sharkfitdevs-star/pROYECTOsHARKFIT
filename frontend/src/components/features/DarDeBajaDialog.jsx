import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { Clientes } from '@/entities/Clientes';
import { Ciclos_Retencion } from '@/entities/Ciclos_Retencion';

export default function DarDeBajaDialog({ open, onOpenChange, cliente, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [tipoEstado, setTipoEstado] = useState('Deudor'); // Deudor o Baja
  const [notas, setNotas] = useState('');

  const handleSubmit = async () => {
    if (!cliente) return;

    try {
      setLoading(true);

      // Actualizar estado del cliente
      await Clientes.update(cliente.id, {
        estado_suscripcion: tipoEstado,
        notas: notas ? `${cliente.notas || ''}\n[${new Date().toLocaleDateString()}] ${tipoEstado}: ${notas}`.trim() : cliente.notas
      });

      // Crear ciclo de retención
      await Ciclos_Retencion.create({
        cliente: cliente.id,
        sede: cliente.sede,
        fecha_evento: new Date().toISOString().split('T')[0],
        tipo_evento: tipoEstado === 'Deudor' ? 'No pagó' : 'Baja',
        plan: cliente.plan_actual,
        nota: notas || `Cliente marcado como ${tipoEstado}`
      });

      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setTipoEstado('Deudor');
      setNotas('');
    } catch (error) {
      console.error('Error al dar de baja cliente:', error);
      alert('Error al actualizar el estado del cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dar de Baja Suscripción</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Información del cliente */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-900">{cliente?.nombre_cliente}</p>
              <p className="text-amber-700">Plan: {cliente?.plan_nombre}</p>
              <p className="text-amber-700">Modalidad: {cliente?.modalidad_actual}</p>
            </div>
          </div>

          {/* Tipo de estado */}
          <div className="space-y-2">
            <Label htmlFor="tipo-estado">Estado *</Label>
            <Select value={tipoEstado} onValueChange={setTipoEstado}>
              <SelectTrigger id="tipo-estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Deudor">Deudor (No pagó)</SelectItem>
                <SelectItem value="Baja">Baja (Cancelar suscripción)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {tipoEstado === 'Deudor' 
                ? 'El cliente no realizó el pago mensual pero puede reactivarse' 
                : 'El cliente cancela definitivamente su suscripción'}
            </p>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notas">Motivo / Notas</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Describe el motivo de la baja o situación del cliente..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            variant={tipoEstado === 'Baja' ? 'destructive' : 'default'}
          >
            {loading ? 'Guardando...' : `Marcar como ${tipoEstado}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}