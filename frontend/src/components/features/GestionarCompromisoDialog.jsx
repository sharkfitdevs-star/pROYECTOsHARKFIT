import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Prospectos } from '@/entities/Prospectos';
import { Agendamientos } from '@/entities/Agendamientos';
import { Seguimiento_NPS } from '@/entities/Seguimiento_NPS';
import { User } from '@/entities/User';
import { Calendar, CheckCircle, XCircle, Target } from 'lucide-react';
import moment from 'moment';

export default function GestionarCompromisoDialog({ open, onClose, prospecto, agendamiento, onRegistrarVenta }) {
  const [fechaSeguimiento, setFechaSeguimiento] = useState('');
  const [resultado, setResultado] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!resultado) {
      alert('Por favor selecciona un resultado');
      return;
    }

    setLoading(true);
    try {
      // Marcar agendamiento como "ya_gestionado" (solo para cambiar el botón visualmente)
      if (agendamiento?.id) {
        await Agendamientos.update(agendamiento.id, {
          ya_gestionado: true
        });
      }

      if (resultado === 'compro') {
        // Si compró, abrir dialog de venta
        onClose();
        onRegistrarVenta();
      } else if (resultado === 'no_compro') {
        // Si no compró, mover a NPS Online y crear registro de seguimiento
        const updateData = {
          estado_pipeline: 'NPS Online',
          notas: notas ? `${prospecto.notas || ''}\\n[${moment().format('DD/MM/YYYY HH:mm')}] Gestión compromiso - No compró: ${notas}` : prospecto.notas
        };

        // Establecer fecha_ingreso_nps (solo si no existe)
        if (!prospecto.fecha_ingreso_nps) {
          updateData.fecha_ingreso_nps = new Date().toISOString();
        }

        await Prospectos.update(prospecto.id, updateData);

        // Crear registro en Seguimiento_NPS
        const user = await User.me();
        
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

        alert('Prospecto movido a NPS Online');
        onClose();
      } else if (resultado === 'indico_compromiso') {
        // Si indicó compromiso, mover a Compromiso de compra SIN reagendar
        const notaFinal = notas 
          ? `${prospecto.notas || ''}\n[${moment().format('DD/MM/YYYY HH:mm')}] Compromiso de compra: ${notas}`
          : prospecto.notas;
        
        await Prospectos.update(prospecto.id, {
          estado_pipeline: 'Compromiso de compra',
          notas: notaFinal
        });

        alert('Compromiso generado exitosamente');
        onClose();
      }
    } catch (error) {
      console.error('Error guardando compromiso:', error);
      alert('Error al gestionar el compromiso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gestionar Compromiso de Compra</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info del prospecto */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-blue-900">{prospecto?.nombre}</p>
            <p className="text-xs text-blue-700">{prospecto?.whatsapp}</p>
          </div>

          {/* Fecha de seguimiento - opcional */}
          <div>
            <Label htmlFor="fecha_seguimiento">
              Fecha de Seguimiento (opcional)
            </Label>
            <Input
              id="fecha_seguimiento"
              type="date"
              value={fechaSeguimiento}
              onChange={(e) => setFechaSeguimiento(e.target.value)}
              min={moment().format('YYYY-MM-DD')}
            />
            <p className="text-xs text-gray-500 mt-1">
              Fecha de referencia para dar seguimiento
            </p>
          </div>

          {/* Resultado */}
          <div>
            <Label htmlFor="resultado">
              Resultado de la Gestión <span className="text-red-500">*</span>
            </Label>
            <Select value={resultado} onValueChange={setResultado}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el resultado..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compro">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Cliente compró</span>
                  </div>
                </SelectItem>
                <SelectItem value="no_compro">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span>Cliente no compró</span>
                  </div>
                </SelectItem>
                <SelectItem value="indico_compromiso">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-600" />
                    <span>Indicó compromiso de compra</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notas */}
          <div>
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalles de la gestión..."
              rows={3}
            />
          </div>

          {/* Información adicional */}
          {resultado === 'compro' && (
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-800">
                <CheckCircle className="w-4 h-4 inline mr-1" />
                Se abrirá el formulario para registrar la venta
              </p>
            </div>
          )}

          {resultado === 'no_compro' && (
            <div className="bg-orange-50 p-3 rounded-lg">
              <p className="text-sm text-orange-800">
                <Calendar className="w-4 h-4 inline mr-1" />
                El prospecto se moverá a <strong>NPS Online</strong> para seguimiento
              </p>
            </div>
          )}

          {resultado === 'indico_compromiso' && (
            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-sm text-purple-800">
                <Target className="w-4 h-4 inline mr-1" />
                El prospecto se moverá a <strong>Compromisos de Compra</strong> sin reagendar
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !resultado}>
            {loading ? 'Procesando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}