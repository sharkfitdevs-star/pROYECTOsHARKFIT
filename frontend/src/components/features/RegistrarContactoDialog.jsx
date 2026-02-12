import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Seguimiento_Renovaciones } from '@/entities/Seguimiento_Renovaciones';
import { Seguimiento_Online } from '@/entities/Seguimiento_Online';
import { User } from '@/entities/User';
import { Staff } from '@/entities/Staff';
import moment from 'moment';

export default function RegistrarContactoDialog({ open, onOpenChange, cliente, onSuccess }) {
  const [contactado, setContactado] = useState('si');
  const [renovado, setRenovado] = useState('no');
  const [razonNoRenovacion, setRazonNoRenovacion] = useState('');
  const [detalleContacto, setDetalleContacto] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentStaff, setCurrentStaff] = useState(null);

  useEffect(() => {
    cargarUsuario();
  }, []);

  const cargarUsuario = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
      
      // Buscar staff por email
      const staffList = await Staff.filter({ email: user.email });
      if (staffList && staffList.length > 0) {
        setCurrentStaff(staffList[0]);
      }
    } catch (error) {
      console.error('Error cargando usuario:', error);
    }
  };

  const handleGuardar = async () => {
    if (!cliente) return;

    try {
      setLoading(true);

      const seguimientoData = {
        cliente_id: cliente.id,
        fecha_contacto: moment().format('YYYY-MM-DD'),
        contactado: contactado === 'si',
        renovado: renovado === 'si',
        razon_no_renovacion: renovado === 'no' ? razonNoRenovacion : '',
        detalle_contacto: detalleContacto,
        responsable: currentStaff?.id || '',
        sede: cliente.sede
      };

      await Seguimiento_Renovaciones.create(seguimientoData);

      // Actualizar estado en Seguimiento_Online
      const seguimientosOnline = await Seguimiento_Online.filter({ cliente_id: cliente.id });
      if (seguimientosOnline && seguimientosOnline.length > 0) {
        const seguimientoActivo = seguimientosOnline[0];
        
        // Determinar nuevo estado
        let nuevoEstado = 'Contactado';
        if (renovado === 'si') {
          nuevoEstado = 'Renovó';
        }
        
        await Seguimiento_Online.update(seguimientoActivo.id, {
          estado: nuevoEstado,
          fue_contactado: contactado === 'si',
          renovo: renovado === 'si',
          razon_no_renovacion: renovado === 'no' ? razonNoRenovacion : '',
          fecha_contacto: moment().toISOString()
        });
      }

      // Limpiar formulario
      setContactado('si');
      setRenovado('no');
      setRazonNoRenovacion('');
      setDetalleContacto('');

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error guardando seguimiento:', error);
      alert('Error al guardar el seguimiento');
    } finally {
      setLoading(false);
    }
  };

  const razonesNoRenovacion = [
    'Precio muy alto',
    'No vio resultados',
    'Problemas de salud',
    'Falta de tiempo',
    'Se cambió a otra sede/gimnasio',
    'Insatisfecho con el servicio',
    'Problemas económicos',
    'Ya no le interesa',
    'No contesta',
    'Otro'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Contacto - {cliente?.nombre_cliente}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contactado */}
          <div>
            <Label>¿Fue contactado?</Label>
            <Select value={contactado} onValueChange={setContactado}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="si">Sí</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {contactado === 'si' && (
            <>
              {/* Renovó */}
              <div>
                <Label>¿Renovó?</Label>
                <Select value={renovado} onValueChange={setRenovado}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="si">Sí</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Razón de no renovación */}
              {renovado === 'no' && (
                <div>
                  <Label>Razón de no renovación</Label>
                  <Select value={razonNoRenovacion} onValueChange={setRazonNoRenovacion}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una razón" />
                    </SelectTrigger>
                    <SelectContent>
                      {razonesNoRenovacion.map(razon => (
                        <SelectItem key={razon} value={razon}>{razon}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {/* Detalle del contacto */}
          <div>
            <Label>Detalle del contacto</Label>
            <Textarea
              value={detalleContacto}
              onChange={(e) => setDetalleContacto(e.target.value)}
              placeholder="Describe brevemente el contacto realizado..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleGuardar} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}