import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Phone, MessageCircle, DollarSign, Loader2, AlertTriangle } from 'lucide-react';
import { Deudores } from '@/entities/Deudores';
import { Clientes } from '@/entities/Clientes';
import { format } from 'date-fns';
import moment from 'moment';

export default function GestionDeudorDialog({ 
  open, 
  onClose, 
  deudor, 
  onSuccess 
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultado, setResultado] = useState('');
  const [detalle, setDetalle] = useState('');
  const [fechaPromesaPago, setFechaPromesaPago] = useState('');
  const [canalContacto, setCanalContacto] = useState('WhatsApp');

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
        intentos_cobro: (deudor.intentos_cobro || 0) + 1,
        ultimo_intento: new Date().toISOString(),
        canal_ultimo_intento: canalContacto,
        resultado_ultimo_intento: detalle,
        notas: `${deudor.notas || ''}\n[${format(new Date(), 'dd/MM/yyyy HH:mm')}] ${resultado}: ${detalle}`.trim()
      };

      switch (resultado) {
        case 'promesa_pago':
          updateData.estado_gestion = 'Promesa de pago';
          updateData.fecha_promesa_pago = fechaPromesaPago;
          break;
        case 'contactado':
          updateData.estado_gestion = 'Contactado';
          break;
        case 'no_contesta':
          updateData.estado_gestion = 'En gestión';
          break;
        case 'pago_realizado':
          updateData.estado_gestion = 'Recuperado';
          // Actualizar también el cliente
          if (deudor.cliente_id) {
            await Clientes.update(deudor.cliente_id, {
              estado_suscripcion: 'Activo'
            });
          }
          break;
        case 'rechaza_pagar':
          updateData.estado_gestion = 'Irrecuperable';
          break;
      }

      await Deudores.update(deudor.id, updateData);

      toast({
        title: "Gestión registrada",
        description: resultado === 'pago_realizado' 
          ? "El deudor ha sido marcado como recuperado"
          : "El resultado del contacto ha sido guardado"
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error guardando gestión:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la gestión",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setResultado('');
    setDetalle('');
    setFechaPromesaPago('');
    setCanalContacto('WhatsApp');
  };

  React.useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  if (!deudor) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Gestionar Deudor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info del deudor */}
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg">{deudor.cliente_nombre}</h3>
              <Badge className="bg-red-600 text-white">
                ${deudor.monto_adeudado?.toLocaleString('es-CL') || 0}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-2">{deudor.cliente_whatsapp}</p>
            <div className="flex items-center gap-4 text-sm mb-3">
              <span className="text-orange-700 font-medium">
                {deudor.dias_atraso} días de atraso
              </span>
              <span className="text-gray-500">
                Intentos: {deudor.intentos_cobro || 0}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 border-green-300"
                onClick={() => window.open(`https://wa.me/${deudor.cliente_whatsapp?.replace(/\D/g, '')}`, '_blank')}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                WhatsApp
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(`tel:${deudor.cliente_whatsapp}`, '_blank')}
              >
                <Phone className="w-4 h-4 mr-1" />
                Llamar
              </Button>
            </div>
          </div>

          {/* Canal de contacto */}
          <div className="space-y-2">
            <Label>Canal de contacto</Label>
            <Select value={canalContacto} onValueChange={setCanalContacto}>
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

          {/* Resultado del contacto */}
          <div className="space-y-2">
            <Label>Resultado del contacto *</Label>
            <Select value={resultado} onValueChange={setResultado}>
              <SelectTrigger>
                <SelectValue placeholder="¿Cuál fue el resultado?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="promesa_pago">📅 Promesa de pago</SelectItem>
                <SelectItem value="contactado">📞 Contactado - Sin definición</SelectItem>
                <SelectItem value="no_contesta">❌ No contesta</SelectItem>
                <SelectItem value="pago_realizado">✅ Pagó - Recuperado</SelectItem>
                <SelectItem value="rechaza_pagar">🚫 Rechaza pagar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campos condicionales según resultado */}
          {resultado === 'promesa_pago' && (
            <div className="space-y-2 border-l-4 border-blue-500 pl-4 bg-blue-50 p-3 rounded">
              <Label>Fecha de promesa de pago *</Label>
              <Input
                type="date"
                value={fechaPromesaPago}
                onChange={(e) => setFechaPromesaPago(e.target.value)}
                min={moment().format('YYYY-MM-DD')}
              />
              <p className="text-xs text-gray-500">Se hará seguimiento en esta fecha</p>
            </div>
          )}

          {resultado === 'pago_realizado' && (
            <div className="space-y-2 border-l-4 border-green-500 pl-4 bg-green-50 p-3 rounded">
              <p className="text-sm text-green-700 font-medium">
                ✅ El cliente será marcado como recuperado y su suscripción se activará
              </p>
            </div>
          )}

          {resultado === 'rechaza_pagar' && (
            <div className="space-y-2 border-l-4 border-red-500 pl-4 bg-red-50 p-3 rounded">
              <p className="text-sm text-red-700 font-medium">
                ⚠️ El cliente será marcado como irrecuperable
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