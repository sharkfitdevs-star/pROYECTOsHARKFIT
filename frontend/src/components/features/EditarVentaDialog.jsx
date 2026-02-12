import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Ventas } from '@/entities/Ventas';
import { Sucursales } from '@/entities/Sucursales';
import { Staff } from '@/entities/Staff';
import { Cerradores } from '@/entities/Cerradores';
import { Planes_Servicios } from '@/entities/Planes_Servicios';
import { Checkbox } from '@/components/ui/checkbox';
import moment from 'moment';

export default function EditarVentaDialog({ open, onOpenChange, venta, onSuccess }) {
  const [formData, setFormData] = useState({
    fecha_venta: '',
    tipo_venta: '',
    sede: '',
    vendedor: '',
    cerrador: '',
    plan: '',
    monto: '',
    descuento: '',
    estado: '',
    notas: '',
    es_post_asistencia: false,
    responsable_seguimiento: ''
  });
  const [loading, setLoading] = useState(false);
  const [sucursales, setSucursales] = useState([]);
  const [staff, setStaff] = useState([]);
  const [staffSeguimiento, setStaffSeguimiento] = useState([]);
  const [cerradores, setCerradores] = useState([]);
  const [planes, setPlanes] = useState([]);

  useEffect(() => {
    if (open) {
      loadCatalogos();
      if (venta) {
        setFormData({
          fecha_venta: venta.fecha_venta ? moment(venta.fecha_venta).format('YYYY-MM-DD') : '',
          tipo_venta: venta.tipo_venta || '',
          sede: venta.sede || '',
          vendedor: venta.vendedor || '',
          cerrador: venta.cerrador || 'no_cerrador',
          plan: venta.plan || '',
          monto: venta.monto || '',
          descuento: venta.descuento || '',
          estado: venta.estado || '',
          notas: venta.notas || '',
          es_post_asistencia: venta.es_post_asistencia || false,
          responsable_seguimiento: venta.responsable_seguimiento || ''
        });
      }
    }
  }, [open, venta]);

  const loadCatalogos = async () => {
    try {
      const [sucursalesData, staffData, cerradoresData, planesData] = await Promise.all([
        Sucursales.list(),
        Staff.list(),
        Cerradores.list(),
        Planes_Servicios.list()
      ]);
      setSucursales(sucursalesData?.filter(s => s.activa) || []);
      setStaff(staffData?.filter(s => s.activo) || []);
      // Filtrar staff con roles de vendedor, RS o asistente para seguimiento
      setStaffSeguimiento(staffData?.filter(s => s.activo && s.roles?.some(r => ['vendedor', 'RS', 'asistente'].includes(r))) || []);
      setCerradores(cerradoresData?.filter(c => c.activo) || []);
      setPlanes(planesData?.filter(p => p.activo) || []);
    } catch (error) {
      console.error('Error cargando catálogos:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        fecha_venta: formData.fecha_venta,
        tipo_venta: formData.tipo_venta,
        sede: formData.sede,
        vendedor: formData.vendedor,
        plan: formData.plan,
        monto: formData.monto ? parseFloat(formData.monto) : null,
        descuento: formData.descuento ? parseFloat(formData.descuento) : null,
        estado: formData.estado,
        notas: formData.notas,
        es_post_asistencia: formData.es_post_asistencia,
        responsable_seguimiento: formData.es_post_asistencia ? formData.responsable_seguimiento : null
      };

      // Solo incluir cerrador si el tipo de venta es "En sede"
      if (formData.tipo_venta === 'En sede' && formData.cerrador && formData.cerrador !== 'no_cerrador') {
        updateData.cerrador = formData.cerrador;
      } else {
        updateData.cerrador = null;
      }

      await Ventas.update(venta.id, updateData);
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error actualizando venta:', error);
      alert('Error al actualizar la venta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Venta</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fecha de Venta */}
            <div>
              <Label htmlFor="fecha_venta">Fecha de Venta *</Label>
              <Input
                id="fecha_venta"
                type="date"
                value={formData.fecha_venta}
                onChange={(e) => setFormData({ ...formData, fecha_venta: e.target.value })}
                required
              />
            </div>

            {/* Tipo de Venta */}
            <div>
              <Label htmlFor="tipo_venta">Tipo de Venta *</Label>
              <Select
                value={formData.tipo_venta}
                onValueChange={(value) => setFormData({ ...formData, tipo_venta: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="En sede">En sede</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sede */}
            <div>
              <Label htmlFor="sede">Sede *</Label>
              <Select
                value={formData.sede}
                onValueChange={(value) => setFormData({ ...formData, sede: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sede" />
                </SelectTrigger>
                <SelectContent>
                  {sucursales.map((sede) => (
                    <SelectItem key={sede.id} value={sede.id}>
                      {sede.nombre_sede}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vendedor */}
            <div>
              <Label htmlFor="vendedor">Vendedor *</Label>
              <Select
                value={formData.vendedor}
                onValueChange={(value) => setFormData({ ...formData, vendedor: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cerrador (solo si es venta en sede) */}
            {formData.tipo_venta === 'En sede' && (
              <>
                <div>
                  <Label htmlFor="cerrador">Cerrador</Label>
                  <Select
                    value={formData.cerrador}
                    onValueChange={(value) => setFormData({ ...formData, cerrador: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cerrador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_cerrador">Sin cerrador</SelectItem>
                      {cerradores.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre_cerrador}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Checkbox de venta post-asistencia */}
                <div className="md:col-span-2">
                  <div className="space-y-3 border-l-4 border-blue-500 pl-4 bg-blue-50 p-3 rounded">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="post-asistencia-edit"
                        checked={formData.es_post_asistencia}
                        onCheckedChange={(checked) => setFormData({ 
                          ...formData, 
                          es_post_asistencia: checked,
                          responsable_seguimiento: checked ? formData.responsable_seguimiento : ''
                        })}
                      />
                      <Label htmlFor="post-asistencia-edit" className="text-sm font-medium cursor-pointer">
                        Venta post-asistencia (con seguimiento online)
                      </Label>
                    </div>

                    {formData.es_post_asistencia && (
                      <div className="space-y-2 mt-2">
                        <Label htmlFor="responsable-seguimiento-edit" className="text-sm">
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
                </div>
              </>
            )}

            {/* Plan/Servicio */}
            <div>
              <Label htmlFor="plan">Plan/Servicio *</Label>
              <Select
                value={formData.plan}
                onValueChange={(value) => setFormData({ ...formData, plan: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plan" />
                </SelectTrigger>
                <SelectContent>
                  {planes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre_plan}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Monto */}
            <div>
              <Label htmlFor="monto">Monto</Label>
              <Input
                id="monto"
                type="number"
                value={formData.monto}
                onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                placeholder="0"
              />
            </div>

            {/* Descuento */}
            <div>
              <Label htmlFor="descuento">Descuento</Label>
              <Input
                id="descuento"
                type="number"
                value={formData.descuento}
                onChange={(e) => setFormData({ ...formData, descuento: e.target.value })}
                placeholder="0"
              />
            </div>

            {/* Estado */}
            <div>
              <Label htmlFor="estado">Estado *</Label>
              <Select
                value={formData.estado}
                onValueChange={(value) => setFormData({ ...formData, estado: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cerrada">Cerrada</SelectItem>
                  <SelectItem value="Anulada">Anulada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notas */}
          <div>
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Notas adicionales sobre la venta..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
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