import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Phone, MessageCircle, Calendar, User, Loader2 } from 'lucide-react';
import { Seguimiento_Online } from '@/entities/Seguimiento_Online';
import { format } from 'date-fns';
import moment from 'moment';

export default function GestionRenovacionDialog({ 
  open, 
  onClose, 
  seguimiento, 
  onSuccess,
  onRenovar
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultado, setResultado] = useState('');
  const [detalle, setDetalle] = useState('');
  const [fechaCompromiso, setFechaCompromiso] = useState('');
  const [fechaProximoSeguimiento, setFechaProximoSeguimiento] = useState('');
  const [razonNoRenovacion, setRazonNoRenovacion] = useState('');

  const handleSubmit = async () => {
    if (!resultado) {
      toast({
        title: "Error",
        description: "Selecciona el resultado del contacto",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData = {
        fue_contactado: true,
        fecha_contacto: new Date().toISOString(),
        detalle_contacto: detalle,
        notas: `${seguimiento.notas || ''}\n[${format(new Date(), 'dd/MM/yyyy HH:mm')}] ${resultado}: ${detalle}`.trim()
      };

      switch (resultado) {
        case 'renovara':
          updateData.estado = 'Contactado';
          updateData.fecha_compromiso_renovacion = fechaCompromiso;
          updateData.fecha_proximo_seguimiento = fechaCompromiso;
          break;
        case 'seguimiento':
          updateData.estado = 'Contactado';
          updateData.fecha_proximo_seguimiento = fechaProximoSeguimiento;
          break;
        case 'no_renovara':
          updateData.estado = 'No Renovará';
          updateData.razon_no_renovacion = razonNoRenovacion;
          break;
        case 'renovo':
          updateData.estado = 'Renovó';
          updateData.renovo = true;
          break;
      }

      await Seguimiento_Online.update(seguimiento.id, updateData);

      toast({
        title: "Seguimiento registrado",
        description: "El resultado del contacto ha sido guardado"
      });

      // Si renovó, abrir dialog de venta
      if (resultado === 'renovo' && onRenovar) {
        onRenovar(seguimiento);
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error guardando seguimiento:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el seguimiento",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setResultado('');
    setDetalle('');
    setFechaCompromiso('');
    setFechaProximoSeguimiento('');
    setRazonNoRenovacion('');
  };

  React.useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  if (!seguimiento) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Gestionar Renovación
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info del cliente */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg">{seguimiento.cliente_nombre}</h3>
              <Badge variant="outline" className="bg-yellow-50">
                {seguimiento.dias_vencido} días vencido
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-2">{seguimiento.cliente_whatsapp}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 border-green-300"
                onClick={() => window.open(`https://wa.me/${seguimiento.cliente_whatsapp?.replace(/\D/g, '')}`, '_blank')}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                WhatsApp
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(`tel:${seguimiento.cliente_whatsapp}`, '_blank')}
              >
                <Phone className="w-4 h-4 mr-1" />
                Llamar
              </Button>
            </div>
          </div>

          {/* Resultado del contacto */}
          <div className="space-y-2">
            <Label>Resultado del contacto *</Label>
            <Select value={resultado} onValueChange={setResultado}>
              <SelectTrigger>
                <SelectValue placeholder="¿Qué indicó el cliente?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="renovara">✅ Indicó que renovará</SelectItem>
                <SelectItem value="seguimiento">📅 Necesita más tiempo / Reagendar</SelectItem>
                <SelectItem value="no_renovara">❌ No renovará</SelectItem>
                <SelectItem value="renovo">🎉 Ya renovó (registrar venta)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campos condicionales según resultado */}
          {resultado === 'renovara' && (
            <div className="space-y-2 border-l-4 border-green-500 pl-4 bg-green-50 p-3 rounded">
              <Label>Fecha en que quedó en renovar *</Label>
              <Input
                type="date"
                value={fechaCompromiso}
                onChange={(e) => setFechaCompromiso(e.target.value)}
                min={moment().format('YYYY-MM-DD')}
              />
              <p className="text-xs text-gray-500">Se programará seguimiento para esta fecha</p>
            </div>
          )}

          {resultado === 'seguimiento' && (
            <div className="space-y-2 border-l-4 border-blue-500 pl-4 bg-blue-50 p-3 rounded">
              <Label>Fecha próximo seguimiento *</Label>
              <Input
                type="date"
                value={fechaProximoSeguimiento}
                onChange={(e) => setFechaProximoSeguimiento(e.target.value)}
                min={moment().format('YYYY-MM-DD')}
              />
            </div>
          )}

          {resultado === 'no_renovara' && (
            <div className="space-y-2 border-l-4 border-red-500 pl-4 bg-red-50 p-3 rounded">
              <Label>Razón de no renovación</Label>
              <Select value={razonNoRenovacion} onValueChange={setRazonNoRenovacion}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar razón" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Precio">Precio</SelectItem>
                  <SelectItem value="Mudanza">Mudanza</SelectItem>
                  <SelectItem value="No usa el servicio">No usa el servicio</SelectItem>
                  <SelectItem value="Problemas económicos">Problemas económicos</SelectItem>
                  <SelectItem value="Competencia">Se fue a la competencia</SelectItem>
                  <SelectItem value="Salud">Problemas de salud</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {resultado === 'renovo' && (
            <div className="space-y-2 border-l-4 border-purple-500 pl-4 bg-purple-50 p-3 rounded">
              <p className="text-sm text-purple-700">
                Al guardar se abrirá el formulario para registrar la venta de renovación
              </p>
            </div>
          )}

          {/* Detalle/Notas */}
          <div className="space-y-2">
            <Label>Detalle del contacto</Label>
            <Textarea
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              placeholder="¿Qué comentó el cliente? Detalles importantes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Resultado'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}