import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Save, X } from 'lucide-react';
import { Sucursales } from '@/entities/Sucursales';
import { Staff } from '@/entities/Staff';
import { Planes_Servicios } from '@/entities/Planes_Servicios';

export default function CorregirRegistroDialog({ open, onOpenChange, registro, onGuardar }) {
  const [formData, setFormData] = useState({});
  const [sedes, setSedes] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && registro) {
      setFormData({ ...registro });
      cargarCatalogos();
    }
  }, [open, registro]);

  const cargarCatalogos = async () => {
    try {
      const [sedesData, staffData, planesData] = await Promise.all([
        Sucursales.filter({ activo: true }),
        Staff.filter({ activo: true }),
        Planes_Servicios.filter({ activo: true })
      ]);
      setSedes(sedesData);
      setVendedores(staffData);
      setPlanes(planesData);
    } catch (error) {
      console.error('Error cargando catálogos:', error);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGuardar = () => {
    setLoading(true);
    onGuardar(formData);
    setLoading(false);
  };

  if (!registro) return null;

  const tiposInvitacion = ['Invitación', 'Promesa de compra', 'Venta online'];
  const estados = ['Asistió', 'No asistió', 'Pendiente'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Corregir Registro - Fila {registro.fila}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Datos Personales */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700">Datos Personales</h3>
            
            <div>
              <Label>Nombre y Apellido *</Label>
              <Input
                value={formData['Nombre y Apellido'] || ''}
                onChange={(e) => handleChange('Nombre y Apellido', e.target.value)}
                placeholder="Nombre completo"
              />
            </div>

            <div>
              <Label>WhatsApp *</Label>
              <Input
                value={formData.WhatsApp || ''}
                onChange={(e) => handleChange('WhatsApp', e.target.value)}
                placeholder="+56912345678"
              />
              <p className="text-xs text-gray-500 mt-1">
                Se normalizará automáticamente al formato +56XXXXXXXXX
              </p>
            </div>
          </div>

          {/* Fechas */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700">Fechas</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha de Ingreso *</Label>
                <Input
                  type="date"
                  value={formData['Fecha de Ingreso'] || ''}
                  onChange={(e) => handleChange('Fecha de Ingreso', e.target.value)}
                />
              </div>

              <div>
                <Label>Fecha de Visita</Label>
                <Input
                  type="date"
                  value={formData['Fecha de Visita'] || ''}
                  onChange={(e) => handleChange('Fecha de Visita', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Hora de Visita</Label>
                <Input
                  type="time"
                  value={formData.Hora || ''}
                  onChange={(e) => handleChange('Hora', e.target.value)}
                />
              </div>

              <div>
                <Label>Fecha de Compra *</Label>
                <Input
                  type="date"
                  value={formData['Fecha de Compra'] || ''}
                  onChange={(e) => handleChange('Fecha de Compra', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Asignaciones */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700">Asignaciones</h3>
            
            <div>
              <Label>Sede *</Label>
              <Select
                value={formData.Sede || ''}
                onValueChange={(value) => handleChange('Sede', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sede" />
                </SelectTrigger>
                <SelectContent>
                  {sedes.map(sede => (
                    <SelectItem key={sede.id} value={sede.nombre_sede}>
                      {sede.nombre_sede}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Vendedor</Label>
              <Select
                value={formData.Vendedor || ''}
                onValueChange={(value) => handleChange('Vendedor', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sin Registro">Sin Registro</SelectItem>
                  <SelectItem value="Referido">Referido</SelectItem>
                  {vendedores
                    .filter(v => v.roles?.includes('vendedor'))
                    .map(vendedor => (
                      <SelectItem key={vendedor.id} value={vendedor.nombre}>
                        {vendedor.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de Invitación</Label>
                <Select
                  value={formData['Tipo de Invitación'] || ''}
                  onValueChange={(value) => handleChange('Tipo de Invitación', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposInvitacion.map(tipo => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Estado</Label>
                <Select
                  value={formData.Estado || ''}
                  onValueChange={(value) => handleChange('Estado', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {estados.map(estado => (
                      <SelectItem key={estado} value={estado}>
                        {estado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Venta */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700">Información de Venta</h3>
            
            <div>
              <Label>Plan *</Label>
              <Select
                value={formData.Plan || ''}
                onValueChange={(value) => handleChange('Plan', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plan" />
                </SelectTrigger>
                <SelectContent>
                  {planes.map(plan => (
                    <SelectItem key={plan.id} value={plan.nombre_plan}>
                      {plan.nombre_plan} ({plan.tipo_item})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Monto *</Label>
                <Input
                  value={formData.Monto || ''}
                  onChange={(e) => handleChange('Monto', e.target.value)}
                  placeholder="$45.000"
                />
              </div>

              <div>
                <Label>Descuento</Label>
                <Input
                  value={formData.Descuento || ''}
                  onChange={(e) => handleChange('Descuento', e.target.value)}
                  placeholder="$5.000"
                />
              </div>

              <div>
                <Label>Inscripción</Label>
                <Input
                  value={formData.Inscripción || ''}
                  onChange={(e) => handleChange('Inscripción', e.target.value)}
                  placeholder="$15.000"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleGuardar}
            disabled={loading}
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}