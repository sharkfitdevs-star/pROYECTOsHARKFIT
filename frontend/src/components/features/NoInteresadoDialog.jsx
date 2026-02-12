import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserX, Phone } from 'lucide-react';

export default function NoInteresadoDialog({ open, onClose, agendamiento, tipo = 'no_interesado', onSave }) {
  const [razon, setRazon] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);

  const esNoInteresado = tipo === 'no_interesado';

  const razonesNoInteresado = [
    'Precio muy alto',
    'Encontró otra opción',
    'No es el momento',
    'No le convence el servicio',
    'Problemas de ubicación',
    'Otro motivo'
  ];

  const razonesNoContesta = [
    'No contesta llamadas',
    'No responde WhatsApp',
    'Teléfono apagado',
    'Número equivocado',
    'Bloqueó el contacto',
    'Otro motivo'
  ];

  const razones = esNoInteresado ? razonesNoInteresado : razonesNoContesta;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!razon) {
      alert('Por favor selecciona una razón');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        tipo: esNoInteresado ? 'no_interesado' : 'no_contesta',
        razon,
        notas
      });
      // Reset form
      setRazon('');
      setNotas('');
    } catch (error) {
      console.error('Error guardando:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRazon('');
    setNotas('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {esNoInteresado ? (
              <>
                <UserX className="w-5 h-5 text-orange-600" />
                No Interesado
              </>
            ) : (
              <>
                <Phone className="w-5 h-5 text-gray-600" />
                No Contesta
              </>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className={`${esNoInteresado ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'} border rounded-lg p-3 mb-4`}>
              <p className="text-sm font-medium">
                <strong>Prospecto:</strong> {agendamiento?.prospecto_nombre}
              </p>
              <p className={`text-xs mt-1 ${esNoInteresado ? 'text-orange-600' : 'text-gray-600'}`}>
                {esNoInteresado 
                  ? 'El prospecto indicó que no está interesado en el servicio. Se marcará como "Perdido".'
                  : 'No se ha logrado contactar al prospecto. Se registrará el intento fallido.'}
              </p>
            </div>

            <div>
              <Label htmlFor="razon">
                Razón <span className="text-red-500">*</span>
              </Label>
              <Select value={razon} onValueChange={setRazon} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una razón" />
                </SelectTrigger>
                <SelectContent>
                  {razones.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notas">Notas Adicionales</Label>
              <Textarea
                id="notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder={esNoInteresado 
                  ? "Ej: Mencionó que el precio es muy alto comparado con la competencia..."
                  : "Ej: Se intentó contactar 3 veces en diferentes horarios sin respuesta..."}
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                Agrega detalles relevantes sobre la situación
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              variant={esNoInteresado ? 'destructive' : 'default'}
            >
              {loading ? 'Guardando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}