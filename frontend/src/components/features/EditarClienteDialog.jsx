import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Clientes } from '@/entities/Clientes';
import moment from 'moment';

export default function EditarClienteDialog({ open, onOpenChange, cliente, onSuccess, sedes, planes, staff, cerradores }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre_cliente: '',
    whatsapp: '',
    sede: '',
    fecha_primer_compra: '',
    plan_actual: '',
    canal_origen: '',
    vendedor_origen: '',
    cerrador_origen: '',
    fecha_inicio_plan_actual: '',
    activo: true,
    notas: ''
  });

  const planSeleccionado = planes.find(p => p.id === formData.plan_actual);

  useEffect(() => {
    if (cliente && open) {
      setFormData({
        nombre_cliente: cliente.nombre_cliente || '',
        whatsapp: cliente.whatsapp || '',
        sede: cliente.sede || '',
        fecha_primer_compra: cliente.fecha_primer_compra || '',
        plan_actual: cliente.plan_actual || '',
        canal_origen: cliente.canal_origen || '',
        vendedor_origen: cliente.vendedor_origen || '',
        cerrador_origen: cliente.cerrador_origen || '',
        fecha_inicio_plan_actual: cliente.fecha_inicio_plan_actual || '',
        activo: cliente.activo !== undefined ? cliente.activo : true,
        notas: cliente.notas || ''
      });
    }
  }, [cliente, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre_cliente || !formData.whatsapp || !formData.sede) {
      alert('Por favor completa los campos obligatorios');
      return;
    }

    try {
      setLoading(true);

      const clienteData = {
        nombre_cliente: formData.nombre_cliente,
        whatsapp: formData.whatsapp,
        sede: formData.sede,
        fecha_primer_compra: formData.fecha_primer_compra,
        canal_origen: formData.canal_origen,
        activo: formData.activo,
        notas: formData.notas
      };

      // Agregar plan si fue seleccionado
      if (formData.plan_actual && planSeleccionado) {
        clienteData.plan_actual = formData.plan_actual;
        clienteData.modalidad_actual = planSeleccionado.modalidad_cobro;
        clienteData.duracion_actual_meses = planSeleccionado.duracion_meses;
        clienteData.fecha_inicio_plan_actual = formData.fecha_inicio_plan_actual;
        
        // Calcular fecha fin
        if (formData.fecha_inicio_plan_actual) {
          clienteData.fecha_fin_plan_actual = moment(formData.fecha_inicio_plan_actual)
            .add(planSeleccionado.duracion_meses, 'months')
            .format('YYYY-MM-DD');
        }
      } else {
        // Si no hay plan, limpiar campos relacionados
        clienteData.plan_actual = null;
        clienteData.modalidad_actual = null;
        clienteData.duracion_actual_meses = null;
        clienteData.fecha_inicio_plan_actual = null;
        clienteData.fecha_fin_plan_actual = null;
      }

      // Agregar vendedor si fue seleccionado
      if (formData.vendedor_origen) {
        clienteData.vendedor_origen = formData.vendedor_origen;
      } else {
        clienteData.vendedor_origen = null;
      }

      // Agregar cerrador si fue seleccionado
      if (formData.cerrador_origen) {
        clienteData.cerrador_origen = formData.cerrador_origen;
      } else {
        clienteData.cerrador_origen = null;
      }

      await Clientes.update(cliente.id, clienteData);
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error actualizando cliente:', error);
      alert('Error al actualizar el cliente');
    } finally {
      setLoading(false);
    }
  };

  if (!cliente) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Nombre */}
            <div className="col-span-2">
              <Label htmlFor="nombre_cliente">Nombre Cliente *</Label>
              <Input
                id="nombre_cliente"
                value={formData.nombre_cliente}
                onChange={(e) => setFormData({ ...formData, nombre_cliente: e.target.value })}
                placeholder="Juan Pérez"
                required
              />
            </div>

            {/* WhatsApp */}
            <div>
              <Label htmlFor="whatsapp">WhatsApp *</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="+56912345678"
                required
              />
            </div>

            {/* Sede */}
            <div>
              <Label htmlFor="sede">Sede *</Label>
              <Select value={formData.sede} onValueChange={(value) => setFormData({ ...formData, sede: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sede" />
                </SelectTrigger>
                <SelectContent>
                  {sedes.map(sede => (
                    <SelectItem key={sede.id} value={sede.id}>{sede.nombre_sede}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fecha Primera Compra */}
            <div>
              <Label htmlFor="fecha_primer_compra">Fecha Primera Compra *</Label>
              <Input
                id="fecha_primer_compra"
                type="date"
                value={formData.fecha_primer_compra}
                onChange={(e) => setFormData({ ...formData, fecha_primer_compra: e.target.value })}
                required
              />
            </div>

            {/* Canal Origen */}
            <div>
              <Label htmlFor="canal_origen">Canal Origen</Label>
              <Select value={formData.canal_origen} onValueChange={(value) => setFormData({ ...formData, canal_origen: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="En sede">En sede</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Plan Actual */}
            <div className="col-span-2">
              <Label htmlFor="plan_actual">Plan Actual (opcional)</Label>
              <Select value={formData.plan_actual || "none"} onValueChange={(value) => setFormData({ ...formData, plan_actual: value === "none" ? "" : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin plan</SelectItem>
                  {planes.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.nombre_plan} - {plan.duracion_meses} mes(es) - {plan.modalidad_cobro}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fecha Inicio Plan (solo si hay plan) */}
            {formData.plan_actual && (
              <div>
                <Label htmlFor="fecha_inicio_plan_actual">Fecha Inicio Plan</Label>
                <Input
                  id="fecha_inicio_plan_actual"
                  type="date"
                  value={formData.fecha_inicio_plan_actual}
                  onChange={(e) => setFormData({ ...formData, fecha_inicio_plan_actual: e.target.value })}
                />
              </div>
            )}

            {/* Fecha Fin Plan (calculada automáticamente) */}
            {formData.plan_actual && planSeleccionado && formData.fecha_inicio_plan_actual && (
              <div>
                <Label>Fecha Fin Plan (calculada)</Label>
                <Input
                  value={moment(formData.fecha_inicio_plan_actual)
                    .add(planSeleccionado.duracion_meses, 'months')
                    .format('DD/MM/YYYY')}
                  disabled
                  className="bg-gray-100"
                />
              </div>
            )}

            {/* Vendedor Origen */}
            <div>
              <Label htmlFor="vendedor_origen">Vendedor Origen (opcional)</Label>
              <Select value={formData.vendedor_origen || "none"} onValueChange={(value) => setFormData({ ...formData, vendedor_origen: value === "none" ? "" : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin vendedor</SelectItem>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cerrador Origen */}
            <div>
              <Label htmlFor="cerrador_origen">Cerrador Origen (opcional)</Label>
              <Select value={formData.cerrador_origen || "none"} onValueChange={(value) => setFormData({ ...formData, cerrador_origen: value === "none" ? "" : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cerrador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin cerrador</SelectItem>
                  {cerradores.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre_cerrador}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Estado Activo */}
            <div className="col-span-2">
              <Label htmlFor="activo">Estado</Label>
              <Select 
                value={formData.activo ? 'true' : 'false'} 
                onValueChange={(value) => setFormData({ ...formData, activo: value === 'true' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Activo</SelectItem>
                  <SelectItem value="false">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notas */}
            <div className="col-span-2">
              <Label htmlFor="notas">Notas (opcional)</Label>
              <Textarea
                id="notas"
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Información adicional sobre el cliente..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}