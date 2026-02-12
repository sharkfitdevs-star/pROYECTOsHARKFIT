import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function EdicionMasivaDialog({ 
  open, 
  onOpenChange, 
  selectedCount, 
  onApply,
  sucursales,
  staff,
  clases,
  loading
}) {
  const [updateFields, setUpdateFields] = useState({
    fecha_ingreso: { enabled: false, value: '' },
    sede: { enabled: false, value: '' },
    vendedor_asignado: { enabled: false, value: '' },
    clase_asistira: { enabled: false, value: '' },
    tipo_invitacion: { enabled: false, value: '' },
    estado_pipeline: { enabled: false, value: '' }
  });

  const estados = ['Agendado', 'Asistió', 'No asistió', 'Reagendado', 'Compró (en sede)', 'Compró (online)', 'No compró', 'Perdido', 'No califica'];

  const handleApply = () => {
    // Construir objeto solo con campos habilitados
    const updates = {};
    Object.keys(updateFields).forEach(field => {
      if (updateFields[field].enabled && updateFields[field].value) {
        updates[field] = updateFields[field].value;
      }
    });
    
    if (Object.keys(updates).length === 0) {
      alert('Debe seleccionar al menos un campo para actualizar');
      return;
    }
    
    onApply(updates);
  };

  const toggleField = (field) => {
    setUpdateFields({
      ...updateFields,
      [field]: { ...updateFields[field], enabled: !updateFields[field].enabled }
    });
  };

  const updateFieldValue = (field, value) => {
    setUpdateFields({
      ...updateFields,
      [field]: { ...updateFields[field], value }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edición Masiva - {selectedCount} prospecto(s) seleccionado(s)</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              ℹ️ Seleccione los campos que desea actualizar. Solo los campos marcados se modificarán en los prospectos seleccionados.
            </p>
          </div>

          {/* Fecha de Ingreso */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                id="enable-fecha-ingreso"
                checked={updateFields.fecha_ingreso.enabled}
                onChange={() => toggleField('fecha_ingreso')}
                className="rounded border-gray-300"
              />
              <Label htmlFor="enable-fecha-ingreso" className="cursor-pointer font-medium">
                Actualizar Fecha de Ingreso
              </Label>
            </div>
            {updateFields.fecha_ingreso.enabled && (
              <Input
                type="date"
                value={updateFields.fecha_ingreso.value}
                onChange={(e) => updateFieldValue('fecha_ingreso', e.target.value)}
                placeholder="Seleccionar fecha"
              />
            )}
          </div>

          {/* Sede */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                id="enable-sede"
                checked={updateFields.sede.enabled}
                onChange={() => toggleField('sede')}
                className="rounded border-gray-300"
              />
              <Label htmlFor="enable-sede" className="cursor-pointer font-medium">
                Actualizar Sede
              </Label>
            </div>
            {updateFields.sede.enabled && (
              <Select
                value={updateFields.sede.value}
                onValueChange={(value) => updateFieldValue('sede', value)}
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
            )}
          </div>

          {/* Vendedor */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                id="enable-vendedor"
                checked={updateFields.vendedor_asignado.enabled}
                onChange={() => toggleField('vendedor_asignado')}
                className="rounded border-gray-300"
              />
              <Label htmlFor="enable-vendedor" className="cursor-pointer font-medium">
                Actualizar Vendedor Asignado
              </Label>
            </div>
            {updateFields.vendedor_asignado.enabled && (
              <Select
                value={updateFields.vendedor_asignado.value}
                onValueChange={(value) => updateFieldValue('vendedor_asignado', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((staffMember) => (
                    <SelectItem key={staffMember.id} value={staffMember.id}>
                      {staffMember.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Clase */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                id="enable-clase"
                checked={updateFields.clase_asistira.enabled}
                onChange={() => toggleField('clase_asistira')}
                className="rounded border-gray-300"
              />
              <Label htmlFor="enable-clase" className="cursor-pointer font-medium">
                Actualizar Clase
              </Label>
            </div>
            {updateFields.clase_asistira.enabled && (
              <Select
                value={updateFields.clase_asistira.value}
                onValueChange={(value) => updateFieldValue('clase_asistira', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar clase" />
                </SelectTrigger>
                <SelectContent>
                  {clases.map((clase) => (
                    <SelectItem key={clase.id} value={clase.id}>
                      {clase.nombre_clase}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Tipo de Invitación */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                id="enable-tipo"
                checked={updateFields.tipo_invitacion.enabled}
                onChange={() => toggleField('tipo_invitacion')}
                className="rounded border-gray-300"
              />
              <Label htmlFor="enable-tipo" className="cursor-pointer font-medium">
                Actualizar Tipo de Invitación
              </Label>
            </div>
            {updateFields.tipo_invitacion.enabled && (
              <Select
                value={updateFields.tipo_invitacion.value}
                onValueChange={(value) => updateFieldValue('tipo_invitacion', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Invitación">Invitación</SelectItem>
                  <SelectItem value="Promesa de compra">Promesa de compra</SelectItem>
                  <SelectItem value="Venta online">Venta online</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Estado */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                id="enable-estado"
                checked={updateFields.estado_pipeline.enabled}
                onChange={() => toggleField('estado_pipeline')}
                className="rounded border-gray-300"
              />
              <Label htmlFor="enable-estado" className="cursor-pointer font-medium">
                Actualizar Estado
              </Label>
            </div>
            {updateFields.estado_pipeline.enabled && (
              <Select
                value={updateFields.estado_pipeline.value}
                onValueChange={(value) => updateFieldValue('estado_pipeline', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {estados.map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleApply} disabled={loading}>
              {loading ? 'Aplicando...' : 'Aplicar Cambios'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}