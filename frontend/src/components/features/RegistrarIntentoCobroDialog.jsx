import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Deudores } from '@/entities/Deudores';
import { format } from 'date-fns';

export default function RegistrarIntentoCobroDialog({ open, onOpenChange, deudor, onSuccess }) {
  const [fechaIntento, setFechaIntento] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [canal, setCanal] = useState('WhatsApp');
  const [resultado, setResultado] = useState('Contactado');
  const [fechaPromesa, setFechaPromesa] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGuardar = async () => {
    if (!deudor) return;

    // Validar fecha de promesa si el resultado es "Promesa de pago"
    if (resultado === 'Promesa de pago' && !fechaPromesa) {
      alert('Debes ingresar la fecha de promesa de pago');
      return;
    }

    try {
      setLoading(true);

      // Preparar datos del último intento
      const ultimoIntento = {
        fecha: fechaIntento,
        canal: canal,
        resultado: resultado
      };

      // Preparar datos de actualización
      const updateData = {
        intentos_cobro: (deudor.intentos_cobro || 0) + 1,
        ultimo_intento: ultimoIntento,
        fecha_ultimo_intento: fechaIntento
      };

      // Si hay promesa de pago, actualizar
      if (resultado === 'Promesa de pago') {
        updateData.fecha_promesa_pago = fechaPromesa;
        updateData.estado_gestion = 'Promesa de pago';
      } else if (resultado === 'Contactado') {
        updateData.estado_gestion = 'En gestión';
      }

      // Agregar notas si existen
      if (notas.trim()) {
        updateData.notas = (deudor.notas || '') + `\n[${fechaIntento}] ${notas}`;
      }

      await Deudores.update(deudor.id, updateData);

      // Limpiar formulario
      setFechaIntento(format(new Date(), 'yyyy-MM-dd'));
      setCanal('WhatsApp');
      setResultado('Contactado');
      setFechaPromesa('');
      setNotas('');

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error registrando intento de cobro:', error);
      alert('Error al registrar el intento de cobro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Intento de Cobro</DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            Cliente: {deudor?.cliente_nombre}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Fecha del intento */}
          <div>
            <Label>Fecha del intento</Label>
            <Input
              type="date"
              value={fechaIntento}
              onChange={(e) => setFechaIntento(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>

          {/* Canal usado */}
          <div>
            <Label>Canal usado</Label>
            <Select value={canal} onValueChange={setCanal}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                <SelectItem value="Llamada">Llamada</SelectItem>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="Presencial">Presencial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Resultado */}
          <div>
            <Label>Resultado del intento</Label>
            <Select value={resultado} onValueChange={setResultado}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Contactado">Contactado</SelectItem>
                <SelectItem value="No contesta">No contesta</SelectItem>
                <SelectItem value="Promesa de pago">Promesa de pago</SelectItem>
                <SelectItem value="Rechazó pagar">Rechazó pagar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fecha de promesa (solo si resultado es "Promesa de pago") */}
          {resultado === 'Promesa de pago' && (
            <div>
              <Label>Fecha de promesa de pago *</Label>
              <Input
                type="date"
                value={fechaPromesa}
                onChange={(e) => setFechaPromesa(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          )}

          {/* Notas */}
          <div>
            <Label>Notas del contacto</Label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Describe brevemente el contacto realizado..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleGuardar} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Intento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}