import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clientes } from '@/entities/Clientes';
import { Planes_Servicios } from '@/entities/Planes_Servicios';
import { Ciclos_Retencion } from '@/entities/Ciclos_Retencion';
import User from '@/entities/User';
import { format, addMonths } from 'date-fns';

export default function RegistrarRenovacionDialog({ open, onOpenChange, cliente, onSuccess }) {
  const [fechaRenovacion, setFechaRenovacion] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [planSeleccionado, setPlanSeleccionado] = useState('');
  const [metodoPago, setMetodoPago] = useState('Tarjeta');
  const [monto, setMonto] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (open) {
      cargarDatos();
    }
  }, [open]);

  useEffect(() => {
    // Calcular fecha de vencimiento cuando se selecciona un plan
    if (planSeleccionado && fechaRenovacion) {
      const plan = planes.find(p => p.id === planSeleccionado);
      if (plan && plan.duracion_meses) {
        const nuevaFecha = addMonths(new Date(fechaRenovacion), plan.duracion_meses);
        setFechaVencimiento(format(nuevaFecha, 'yyyy-MM-dd'));
      }
      // Auto-llenar monto si el plan tiene precio
      if (plan && plan.precio) {
        setMonto(plan.precio.toString());
      }
    }
  }, [planSeleccionado, fechaRenovacion, planes]);

  const cargarDatos = async () => {
    try {
      const userData = await User.me();
      setUser(userData);

      // Cargar planes prepago activos
      const planesData = await Planes_Servicios.filter({ 
        activo: true,
        modalidad_cobro: 'Prepago'
      });
      setPlanes(planesData);

      // Pre-seleccionar el plan actual del cliente si existe
      if (cliente?.plan_actual?.id) {
        setPlanSeleccionado(cliente.plan_actual.id);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const handleGuardar = async () => {
    if (!cliente || !planSeleccionado || !monto || !fechaVencimiento) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    try {
      setLoading(true);

      const plan = planes.find(p => p.id === planSeleccionado);

      // Actualizar cliente
      await Clientes.update(cliente.id, {
        plan_actual: {
          id: plan.id,
          nombre_plan: plan.nombre_plan,
          precio: parseFloat(monto),
          modalidad_cobro: 'Prepago',
          duracion_meses: plan.duracion_meses
        },
        fecha_fin_plan: fechaVencimiento,
        estado_suscripcion: 'Activo',
        activo: true
      });

      // Crear registro en Ciclos_Retencion
      await Ciclos_Retencion.create({
        cliente: cliente.id,
        tipo_evento: 'Renovó',
        fecha_evento: fechaRenovacion,
        plan: plan.id,
        sede: cliente.sede,
        monto: parseFloat(monto),
        nota: `Renovación registrada por ${user?.email || 'sistema'}. Método: ${metodoPago}`
      });

      // Limpiar formulario
      setFechaRenovacion(format(new Date(), 'yyyy-MM-dd'));
      setPlanSeleccionado('');
      setMetodoPago('Tarjeta');
      setMonto('');
      setFechaVencimiento('');

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error registrando renovación:', error);
      alert('Error al registrar la renovación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Renovación</DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            Cliente: {cliente?.nombre}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Fecha de renovación */}
          <div>
            <Label>Fecha de renovación *</Label>
            <Input
              type="date"
              value={fechaRenovacion}
              onChange={(e) => setFechaRenovacion(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>

          {/* Plan renovado */}
          <div>
            <Label>Plan renovado *</Label>
            <Select value={planSeleccionado} onValueChange={setPlanSeleccionado}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un plan" />
              </SelectTrigger>
              <SelectContent>
                {planes.map(plan => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.nombre_plan} - {plan.duracion_meses} mes(es) - ${plan.precio?.toLocaleString('es-CL')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Método de pago */}
          <div>
            <Label>Método de pago</Label>
            <Select value={metodoPago} onValueChange={setMetodoPago}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                <SelectItem value="Efectivo">Efectivo</SelectItem>
                <SelectItem value="Transferencia">Transferencia</SelectItem>
                <SelectItem value="Mercado Pago">Mercado Pago</SelectItem>
                <SelectItem value="Evo">Evo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Monto */}
          <div>
            <Label>Monto pagado *</Label>
            <Input
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="Ej: 25000"
              min="0"
            />
          </div>

          {/* Nueva fecha de vencimiento (calculada automáticamente) */}
          <div>
            <Label>Nueva fecha de vencimiento</Label>
            <Input
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Se calcula automáticamente según la duración del plan
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleGuardar} disabled={loading}>
            {loading ? 'Guardando...' : 'Registrar Renovación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}