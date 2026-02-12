import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clientes } from '@/entities/Clientes';
import { Tareas_RS } from '@/entities/Tareas_RS';
import { Ciclos_Retencion } from '@/entities/Ciclos_Retencion';
import { User } from '@/entities/User';
import { CalendarIcon, UserIcon, PhoneIcon, CreditCardIcon, AlertCircleIcon } from 'lucide-react';
import moment from 'moment';

export default function GestionarRenovacionPrepagoDialog({ open, onOpenChange, tarea, cliente, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  
  const [formData, setFormData] = useState({
    fecha_contacto: moment().format('YYYY-MM-DD'),
    resultado: '',
    detalle_contacto: '',
    fecha_seguimiento: ''
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await User.me();
        setUser(userData);
      } catch (error) {
        console.error('Error cargando usuario:', error);
      }
    };
    loadUser();
  }, []);

  // Calcular días vencidos
  const diasVencidos = cliente?.fecha_fin_plan_actual 
    ? moment().diff(moment(cliente.fecha_fin_plan_actual), 'days')
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.resultado) {
      alert('Por favor selecciona un resultado');
      return;
    }

    if (!formData.detalle_contacto.trim()) {
      alert('Por favor ingresa los detalles del contacto');
      return;
    }

    setLoading(true);

    try {
      const hoy = new Date().toISOString().split('T')[0];

      // 1. Si renovó, actualizar el cliente y crear ciclo de retención
      if (formData.resultado === 'renovo') {
        // Calcular nueva fecha de fin basada en la duración del plan actual
        const nuevaFechaInicio = new Date();
        const duracionMeses = cliente.duracion_actual_meses || 1;
        const nuevaFechaFin = new Date(nuevaFechaInicio);
        nuevaFechaFin.setMonth(nuevaFechaFin.getMonth() + duracionMeses);

        await Clientes.update(cliente.id, {
          fecha_inicio_plan_actual: nuevaFechaInicio.toISOString().split('T')[0],
          fecha_fin_plan_actual: nuevaFechaFin.toISOString().split('T')[0],
          activo: true
        });

        // Crear ciclo de retención tipo "Renovó"
        await Ciclos_Retencion.create({
          cliente: cliente.id,
          sede: cliente.sede,
          fecha_evento: hoy,
          tipo_evento: 'Renovó',
          plan: cliente.plan_actual,
          responsable_seguimiento: user?.email,
          nota: `Renovación gestionada desde RS. ${formData.detalle_contacto}`
        });
      }

      // 2. Marcar la tarea como completada
      await Tareas_RS.update(tarea.id, {
        estado: 'completada',
        fecha_completada: hoy,
        notas: `${tarea.notas || ''}\n\n[${moment().format('DD/MM/YYYY HH:mm')}] Resultado: ${formData.resultado}. ${formData.detalle_contacto}`
      });

      // 3. Si se debe reprogramar seguimiento, crear nueva tarea
      if (formData.resultado === 'promete_renovar' && formData.fecha_seguimiento) {
        await Tareas_RS.create({
          titulo: `Seguimiento Renovación - ${cliente.nombre_cliente}`,
          descripcion: `Cliente prometió renovar. Realizar seguimiento según lo acordado.`,
          tipo: 'seguimiento',
          prioridad: 'alta',
          fecha_limite: formData.fecha_seguimiento,
          estado: 'pendiente',
          responsable: tarea.responsable,
          sede: tarea.sede,
          cliente: cliente.id,
          notas: `Seguimiento programado desde gestión anterior. ${formData.detalle_contacto}`
        });
      }

      // 4. Si no renovó, crear ciclo de retención tipo "No pagó"
      if (formData.resultado === 'no_renovo') {
        await Ciclos_Retencion.create({
          cliente: cliente.id,
          sede: cliente.sede,
          fecha_evento: hoy,
          tipo_evento: 'No pagó',
          plan: cliente.plan_actual,
          responsable_seguimiento: user?.email,
          nota: `No renovó. ${formData.detalle_contacto}`
        });
      }

      alert('Gestión registrada exitosamente');
      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        fecha_contacto: moment().format('YYYY-MM-DD'),
        resultado: '',
        detalle_contacto: '',
        fecha_seguimiento: ''
      });

    } catch (error) {
      console.error('Error gestionando renovación:', error);
      alert('Error al registrar la gestión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5 text-orange-600" />
            Gestionar Renovación Prepago
          </DialogTitle>
          <DialogDescription>
            Registra el resultado del contacto con el cliente para gestionar su renovación
          </DialogDescription>
        </DialogHeader>

        {/* Información del Cliente */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <UserIcon className="h-4 w-4 text-orange-600" />
            <span className="font-semibold">{cliente?.nombre_cliente}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <PhoneIcon className="h-4 w-4 text-orange-600" />
            <span>{cliente?.whatsapp || 'Sin WhatsApp'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CreditCardIcon className="h-4 w-4 text-orange-600" />
            <span>Plan: {cliente?.plan_actual || 'No especificado'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CalendarIcon className="h-4 w-4 text-orange-600" />
            <span>Fecha vencimiento: {cliente?.fecha_fin_plan_actual ? moment(cliente.fecha_fin_plan_actual).format('DD/MM/YYYY') : 'No disponible'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <AlertCircleIcon className="h-4 w-4 text-red-600" />
            <span className="font-semibold text-red-600">Días vencidos: {diasVencidos}</span>
          </div>
        </div>

        {/* Formulario de Gestión */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fecha_contacto">Fecha de Contacto *</Label>
            <Input
              id="fecha_contacto"
              type="date"
              value={formData.fecha_contacto}
              onChange={(e) => setFormData({ ...formData, fecha_contacto: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resultado">Resultado del Contacto *</Label>
            <Select
              value={formData.resultado}
              onValueChange={(value) => setFormData({ ...formData, resultado: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el resultado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="renovo">✅ Renovó</SelectItem>
                <SelectItem value="no_renovo">❌ No renovó</SelectItem>
                <SelectItem value="promete_renovar">🤝 Promete renovar</SelectItem>
                <SelectItem value="no_contesta">📵 No contesta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="detalle_contacto">Detalles del Contacto *</Label>
            <Textarea
              id="detalle_contacto"
              value={formData.detalle_contacto}
              onChange={(e) => setFormData({ ...formData, detalle_contacto: e.target.value })}
              placeholder="Describe la conversación, acuerdos, motivos, etc."
              rows={4}
              required
            />
          </div>

          {formData.resultado === 'promete_renovar' && (
            <div className="space-y-2">
              <Label htmlFor="fecha_seguimiento">Fecha de Seguimiento</Label>
              <Input
                id="fecha_seguimiento"
                type="date"
                value={formData.fecha_seguimiento}
                onChange={(e) => setFormData({ ...formData, fecha_seguimiento: e.target.value })}
                min={moment().format('YYYY-MM-DD')}
              />
              <p className="text-xs text-gray-500">
                Se creará una nueva tarea para hacer seguimiento en esta fecha
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              {loading ? 'Guardando...' : 'Guardar Gestión'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}