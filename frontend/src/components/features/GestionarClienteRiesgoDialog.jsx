import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clientes_Riesgo } from '@/entities/Clientes_Riesgo';
import { format, differenceInDays, parseISO } from 'date-fns';
import { AlertTriangle } from 'lucide-react';

export default function GestionarClienteRiesgoDialog({ open, onOpenChange, clienteRiesgo, onSuccess }) {
  const [fechaContacto, setFechaContacto] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [resultado, setResultado] = useState('Sigue en riesgo');
  const [accionTomada, setAccionTomada] = useState('');
  const [fechaSeguimiento, setFechaSeguimiento] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);

  const getNivelRiesgoColor = (nivel) => {
    switch (nivel) {
      case 'Crítico': return 'bg-red-500';
      case 'Alto': return 'bg-orange-500';
      case 'Medio': return 'bg-yellow-500';
      case 'Bajo': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const diasSinGestion = clienteRiesgo?.fecha_identificacion 
    ? differenceInDays(new Date(), parseISO(clienteRiesgo.fecha_identificacion))
    : 0;

  const handleGuardar = async () => {
    if (!clienteRiesgo) return;

    if (!accionTomada.trim()) {
      alert('Por favor describe la acción tomada');
      return;
    }

    try {
      setLoading(true);

      // Determinar nuevo estado según resultado
      let nuevoEstado = 'Contactado';
      if (resultado === 'Recuperado') {
        nuevoEstado = 'Recuperado';
      } else if (resultado === 'Perdido') {
        nuevoEstado = 'Perdido';
      } else if (resultado === 'Sigue en riesgo') {
        nuevoEstado = 'En gestión';
      }

      // Preparar datos de actualización
      const updateData = {
        fue_contactado: true,
        fecha_contacto: new Date(fechaContacto).toISOString(),
        resultado_contacto: resultado,
        accion_tomada: accionTomada,
        estado: nuevoEstado,
        notas: notas.trim() ? (clienteRiesgo.notas || '') + `\n[${fechaContacto}] ${notas}` : clienteRiesgo.notas
      };

      // Agregar fecha de seguimiento si se especificó
      if (fechaSeguimiento) {
        updateData.fecha_seguimiento = fechaSeguimiento;
      }

      await Clientes_Riesgo.update(clienteRiesgo.id, updateData);

      // Limpiar formulario
      setFechaContacto(format(new Date(), 'yyyy-MM-dd'));
      setResultado('Sigue en riesgo');
      setAccionTomada('');
      setFechaSeguimiento('');
      setNotas('');

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error gestionando cliente en riesgo:', error);
      alert('Error al guardar la gestión');
    } finally {
      setLoading(false);
    }
  };

  if (!clienteRiesgo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestionar Cliente en Riesgo</DialogTitle>
        </DialogHeader>

        {/* Información del cliente */}
        <div className="bg-slate-50 p-4 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">{clienteRiesgo.cliente_nombre}</h3>
              <p className="text-sm text-gray-600">{clienteRiesgo.cliente_whatsapp}</p>
            </div>
            <Badge className={getNivelRiesgoColor(clienteRiesgo.nivel_riesgo)}>
              {clienteRiesgo.nivel_riesgo}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Motivo:</span>
              <p className="text-gray-700">{clienteRiesgo.motivo_riesgo}</p>
            </div>
            <div>
              <span className="font-medium">Días sin gestión:</span>
              <p className="text-gray-700">{diasSinGestion} días</p>
            </div>
          </div>

          {clienteRiesgo.detalle_motivo && (
            <div className="text-sm">
              <span className="font-medium">Detalle:</span>
              <p className="text-gray-700">{clienteRiesgo.detalle_motivo}</p>
            </div>
          )}

          {clienteRiesgo.fue_contactado && clienteRiesgo.fecha_contacto && (
            <div className="bg-blue-50 border border-blue-200 p-2 rounded text-sm">
              <p className="font-medium text-blue-900">Último contacto:</p>
              <p className="text-blue-700">
                {format(parseISO(clienteRiesgo.fecha_contacto), 'dd/MM/yyyy')} - {clienteRiesgo.resultado_contacto}
              </p>
              {clienteRiesgo.accion_tomada && (
                <p className="text-blue-700 mt-1">Acción: {clienteRiesgo.accion_tomada}</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Fecha de contacto */}
          <div>
            <Label>Fecha de contacto *</Label>
            <Input
              type="date"
              value={fechaContacto}
              onChange={(e) => setFechaContacto(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>

          {/* Resultado */}
          <div>
            <Label>Resultado del contacto *</Label>
            <Select value={resultado} onValueChange={setResultado}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Recuperado">✅ Recuperado - Cliente fuera de riesgo</SelectItem>
                <SelectItem value="Sigue en riesgo">⚠️ Sigue en riesgo - Requiere seguimiento</SelectItem>
                <SelectItem value="Perdido">❌ Perdido - Cliente se fue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Acción tomada */}
          <div>
            <Label>Acción tomada *</Label>
            <Textarea
              value={accionTomada}
              onChange={(e) => setAccionTomada(e.target.value)}
              placeholder="Ej: Se ofreció descuento del 20%, cambio de plan, congelamiento gratuito, etc."
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              Describe qué se hizo para intentar retener al cliente
            </p>
          </div>

          {/* Fecha de seguimiento (opcional) */}
          {resultado === 'Sigue en riesgo' && (
            <div>
              <Label>Fecha de próximo seguimiento (opcional)</Label>
              <Input
                type="date"
                value={fechaSeguimiento}
                onChange={(e) => setFechaSeguimiento(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          )}

          {/* Notas adicionales */}
          <div>
            <Label>Notas adicionales</Label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Comentarios adicionales sobre el contacto..."
              rows={2}
            />
          </div>

          {/* Advertencia si es crítico */}
          {clienteRiesgo.nivel_riesgo === 'Crítico' && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-900">
                <p className="font-medium">Cliente en riesgo crítico</p>
                <p className="text-xs mt-1">
                  Requiere atención inmediata. Considera escalar a dirección si no se logra retener.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleGuardar} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Gestión'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}