import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Cerradores } from '@/entities/Cerradores';
import { Planes_Servicios } from '@/entities/Planes_Servicios';
import { Staff } from '@/entities/Staff';
import { Checkbox } from '@/components/ui/checkbox';

export default function RegistrarVentaDialog({ open, onClose, agendamiento, prospecto, onSave, esRenovacion = false }) {
  const { toast } = useToast();
  const [cerradores, setCerradores] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [staffSeguimiento, setStaffSeguimiento] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    tipo_venta: 'En sede',
    cerrador: '',
    fecha_venta: moment().format('YYYY-MM-DD'),
    notas: '',
    es_post_asistencia: false,
    responsable_seguimiento: ''
  });
  const [productos, setProductos] = useState([
    { plan: '', monto: '', descuento: '' }
  ]);

  useEffect(() => {
    if (open) {
      loadCatalogos();
      setIsSubmitting(false);
      // Pre-seleccionar cerrador si ya está asignado en el agendamiento
      setFormData({
        tipo_venta: 'En sede',
        cerrador: agendamiento?.cerrador_asignado || '',
        fecha_venta: moment().format('YYYY-MM-DD'),
        notas: '',
        es_post_asistencia: false,
        responsable_seguimiento: ''
      });
      setProductos([{ plan: '', monto: '', descuento: '' }]);
    }
  }, [open, agendamiento]);

  const loadCatalogos = async () => {
    try {
      const [cerradoresData, planesData, staffData] = await Promise.all([
        Cerradores.list(),
        Planes_Servicios.list(),
        Staff.list()
      ]);
      setCerradores(cerradoresData?.filter(c => c.activo) || []);
      setPlanes(planesData?.filter(p => p.activo) || []);
      // Filtrar staff con roles de vendedor, RS o asistente para seguimiento
      setStaffSeguimiento(staffData?.filter(s => s.activo && s.roles?.some(r => ['vendedor', 'RS', 'asistente'].includes(r))) || []);
    } catch (error) {
      console.error('Error cargando catálogos:', error);
    }
  };

  const handlePlanChange = (index, planId) => {
    const nuevosProductos = [...productos];
    nuevosProductos[index].plan = planId;
    
    // Auto-llenar el monto si el plan tiene precio
    const planSeleccionado = planes.find(p => p.id === planId);
    if (planSeleccionado?.precio) {
      nuevosProductos[index].monto = planSeleccionado.precio.toString();
    }
    
    setProductos(nuevosProductos);
  };

  const handleProductoChange = (index, field, value) => {
    const nuevosProductos = [...productos];
    nuevosProductos[index][field] = value;
    setProductos(nuevosProductos);
  };

  const agregarProducto = () => {
    setProductos([...productos, { plan: '', monto: '', descuento: '' }]);
  };

  const eliminarProducto = (index) => {
    if (productos.length > 1) {
      const nuevosProductos = productos.filter((_, i) => i !== index);
      setProductos(nuevosProductos);
    }
  };

  const calcularTotal = () => {
    return productos.reduce((total, producto) => {
      const monto = parseFloat(producto.monto) || 0;
      const descuento = parseFloat(producto.descuento) || 0;
      return total + (monto - descuento);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Crear una venta por cada producto
      for (const producto of productos) {
        if (producto.plan) {
          await onSave({
            tipo_venta: formData.tipo_venta,
            cerrador: formData.tipo_venta === 'En sede' ? formData.cerrador : null,
            plan: producto.plan,
            monto: producto.monto ? parseFloat(producto.monto) : null,
            descuento: producto.descuento ? parseFloat(producto.descuento) : null,
            fecha_venta: formData.fecha_venta,
            notas: formData.notas,
            es_post_asistencia: formData.es_post_asistencia,
            responsable_seguimiento: formData.es_post_asistencia ? formData.responsable_seguimiento : null
          });
        }
      }
      
      toast({
        title: "✅ Venta registrada exitosamente",
        description: productos.length > 1 ? `${productos.length} productos registrados` : "Puedes proceder con la siguiente",
        duration: 3000,
      });
      
      onClose();
    } catch (error) {
      console.error('Error al registrar venta:', error);
      toast({
        title: "Error al registrar venta",
        description: "Por favor intenta nuevamente",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{esRenovacion ? 'Registrar Renovación' : 'Registrar Venta'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="venta-tipo">Tipo de Venta *</Label>
              <Select
                value={formData.tipo_venta}
                onValueChange={(value) => setFormData({ ...formData, tipo_venta: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="En sede">En sede</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="Solo Inscripción">Solo Inscripción</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.tipo_venta === 'En sede' && !esRenovacion && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="venta-cerrador">Cerrador *</Label>
                  <Select
                    value={formData.cerrador}
                    onValueChange={(value) => setFormData({ ...formData, cerrador: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cerrador" />
                    </SelectTrigger>
                    <SelectContent>
                      {cerradores.map((cerrador) => (
                        <SelectItem key={cerrador.id} value={cerrador.id}>
                          {cerrador.nombre_cerrador}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Checkbox de venta post-asistencia */}
                <div className="space-y-3 border-l-4 border-blue-500 pl-4 bg-blue-50 p-3 rounded">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="post-asistencia"
                      checked={formData.es_post_asistencia}
                      onCheckedChange={(checked) => setFormData({ 
                        ...formData, 
                        es_post_asistencia: checked,
                        responsable_seguimiento: checked ? formData.responsable_seguimiento : ''
                      })}
                    />
                    <Label htmlFor="post-asistencia" className="text-sm font-medium cursor-pointer">
                      Venta post-asistencia (con seguimiento online)
                    </Label>
                  </div>

                  {formData.es_post_asistencia && (
                    <div className="space-y-2 mt-2">
                      <Label htmlFor="responsable-seguimiento" className="text-sm">
                        ¿Quién realizó el seguimiento? *
                      </Label>
                      <Select
                        value={formData.responsable_seguimiento}
                        onValueChange={(value) => setFormData({ ...formData, responsable_seguimiento: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar responsable" />
                        </SelectTrigger>
                        <SelectContent>
                          {staffSeguimiento.map((staff) => (
                            <SelectItem key={staff.id} value={staff.id}>
                              {staff.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Esta venta se contará para el cerrador, pero se registrará la contribución del seguimiento online
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="venta-fecha">Fecha de Venta *</Label>
              <Input
                id="venta-fecha"
                type="date"
                value={formData.fecha_venta}
                onChange={(e) => setFormData({ ...formData, fecha_venta: e.target.value })}
                required
              />
            </div>

            {/* Productos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Productos</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={agregarProducto}
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar
                </Button>
              </div>

              {productos.map((producto, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-3 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Producto {index + 1}</span>
                    {productos.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminarProducto(index)}
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Plan/Servicio</Label>
                    <Select
                      value={producto.plan}
                      onValueChange={(value) => handlePlanChange(index, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {planes.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.nombre_plan} - {plan.duracion_meses || 1}m - {plan.modalidad_cobro || 'N/A'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Monto</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={producto.monto}
                        onChange={(e) => handleProductoChange(index, 'monto', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Descuento</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={producto.descuento}
                        onChange={(e) => handleProductoChange(index, 'descuento', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Total */}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-semibold">Total:</span>
                <span className="text-lg font-bold text-green-600">
                  ${calcularTotal().toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="venta-notas">Notas</Label>
              <Textarea
                id="venta-notas"
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Notas adicionales..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                esRenovacion ? 'Registrar Renovación' : 'Registrar Venta'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}