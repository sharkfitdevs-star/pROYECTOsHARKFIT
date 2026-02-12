import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Bajas_Programadas } from '@/entities/Bajas_Programadas';
import { Tareas_RS } from '@/entities/Tareas_RS';
import { Clientes } from '@/entities/Clientes';
import { format, parseISO } from 'date-fns';

export default function GestionarBajaDialog({ open, onClose, bajaId, tareaId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [baja, setBaja] = useState(null);
  const [resultado, setResultado] = useState('');
  const [reporte, setReporte] = useState('');
  const [fechaContacto, setFechaContacto] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (open && bajaId) {
      cargarBaja();
    } else {
      resetForm();
    }
  }, [open, bajaId]);

  const cargarBaja = async () => {
    try {
      setLoading(true);
      const bajaData = await Bajas_Programadas.get(bajaId);
      setBaja(bajaData);
    } catch (error) {
      console.error('Error cargando baja:', error);
      alert('Error al cargar la información de la baja');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setBaja(null);
    setResultado('');
    setReporte('');
    setFechaContacto(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleSubmit = async () => {
    if (!resultado) {
      alert('Debe seleccionar un resultado del contacto');
      return;
    }

    if (!reporte.trim()) {
      alert('Debe agregar un reporte de la gestión realizada');
      return;
    }

    try {
      setLoading(true);

      // Determinar el estado de gestión según el resultado
      let estadoGestion = 'en_gestion';
      if (resultado === 'Continúa en Baja') {
        estadoGestion = 'continua_baja';
      } else if (resultado === 'Recuperado') {
        estadoGestion = 'recuperado';
      } else if (resultado === 'No contactado') {
        estadoGestion = 'no_contactado';
      } else if (resultado === 'Reprogramar seguimiento') {
        estadoGestion = 'en_gestion';
      }

      // 1. Actualizar el registro de Baja Programada
      await Bajas_Programadas.update(bajaId, {
        estado_gestion: estadoGestion,
        resultado_contacto: resultado,
        reporte_gestion: reporte,
        fecha_contacto: fechaContacto,
        fecha_resultado: format(new Date(), 'yyyy-MM-dd')
      });

      // 2. Si fue recuperado, actualizar el cliente (mantener activo)
      if (resultado === 'Recuperado' && baja?.cliente) {
        await Clientes.update(baja.cliente, {
          estado_suscripcion: 'Activo',
          notas: `${baja.cliente_nombre} - Recuperado de baja programada el ${format(new Date(), 'dd/MM/yyyy')}: ${reporte}`
        });
      }

      // 3. Si continúa en baja, podríamos marcar al cliente como "Baja" cuando llegue la fecha
      // (esto se puede automatizar con una función backend que revise las fechas)

      // 4. Marcar la tarea como completada
      if (tareaId) {
        await Tareas_RS.update(tareaId, {
          estado: 'completada',
          fecha_completada: format(new Date(), 'yyyy-MM-dd'),
          notas: `Resultado: ${resultado}. ${reporte}`
        });
      }

      // 5. Si se debe reprogramar, crear nueva tarea
      if (resultado === 'Reprogramar seguimiento') {
        const nuevaFechaLimite = new Date();
        nuevaFechaLimite.setDate(nuevaFechaLimite.getDate() + 7); // 7 días después

        await Tareas_RS.create({
          titulo: `Seguimiento Baja - ${baja.cliente_nombre}`,
          descripcion: `Seguimiento de baja programada.\n\nContacto anterior: ${reporte}`,
          tipo: 'seguimiento',
          prioridad: 'alta',
          fecha_limite: format(nuevaFechaLimite, 'yyyy-MM-dd'),
          estado: 'pendiente',
          responsable: baja.responsable_sede,
          sede: baja.sede,
          cliente_relacionado: baja.cliente,
          notas: `Baja programada ID: ${bajaId}`
        });
      }

      // Mostrar notificación de tarea completada
      if (onSuccess) {
        onSuccess({
          titulo: `Tarea completada: ${baja.cliente_nombre}`,
          descripcion: `Resultado: ${resultado}`,
          fecha: format(new Date(), 'dd/MM/yyyy HH:mm')
        });
      }
      onClose();
    } catch (error) {
      console.error('Error gestionando baja:', error);
      alert('Error al registrar la gestión. Por favor intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !baja) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestionar Baja Programada</DialogTitle>
        </DialogHeader>

        {baja && (
          <div className="space-y-4 py-4">
            {/* Información del Cliente */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h3 className="font-semibold text-lg">{baja.cliente_nombre}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">WhatsApp:</span>
                  <p className="font-medium">{baja.cliente_whatsapp}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Plan:</span>
                  <p className="font-medium">{baja.plan_actual}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Fecha de Baja:</span>
                  <p className="font-medium">
                    {format(parseISO(baja.fecha_baja_programada), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Motivo:</span>
                  <p className="font-medium">{baja.motivo}</p>
                </div>
                {baja.detalle_motivo && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Detalle:</span>
                    <p className="font-medium">{baja.detalle_motivo}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Último Cobro:</span>
                  <p className="font-medium">
                    {format(parseISO(baja.fecha_ultimo_cobro), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Método:</span>
                  <p className="font-medium">
                    {baja.metodo_cobro}
                    {baja.referencia_pago && ` (${baja.referencia_pago})`}
                  </p>
                </div>
              </div>
            </div>

            {/* Fecha de Contacto */}
            <div className="space-y-2">
              <Label htmlFor="fechaContacto">Fecha de Contacto *</Label>
              <Input
                id="fechaContacto"
                type="date"
                value={fechaContacto}
                onChange={(e) => setFechaContacto(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            {/* Resultado del Contacto */}
            <div className="space-y-2">
              <Label htmlFor="resultado">Resultado del Contacto *</Label>
              <Select value={resultado} onValueChange={setResultado}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar resultado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Continúa en Baja">
                    <div className="flex items-center">
                      <AlertCircle className="mr-2 h-4 w-4 text-red-500" />
                      Continúa en Baja
                    </div>
                  </SelectItem>
                  <SelectItem value="Recuperado">
                    <div className="flex items-center">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      Recuperado (sigue activo)
                    </div>
                  </SelectItem>
                  <SelectItem value="No contactado">
                    <div className="flex items-center">
                      <AlertCircle className="mr-2 h-4 w-4 text-orange-500" />
                      No contactado
                    </div>
                  </SelectItem>
                  <SelectItem value="Reprogramar seguimiento">
                    <div className="flex items-center">
                      <AlertCircle className="mr-2 h-4 w-4 text-blue-500" />
                      Reprogramar seguimiento
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reporte de Gestión */}
            <div className="space-y-2">
              <Label htmlFor="reporte">Reporte de Gestión *</Label>
              <Textarea
                id="reporte"
                value={reporte}
                onChange={(e) => setReporte(e.target.value)}
                placeholder="Describa el contacto realizado, la conversación con el cliente, acuerdos alcanzados, etc..."
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Documente detalladamente la gestión realizada para trazabilidad
              </p>
            </div>

            {/* Información según resultado */}
            {resultado === 'Recuperado' && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✓ El cliente se marcará como <strong>Activo</strong> y se cancelará la baja programada.
                </p>
              </div>
            )}

            {resultado === 'Continúa en Baja' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  ⚠ El cliente continuará con la baja programada. Se ejecutará en la fecha indicada.
                </p>
              </div>
            )}

            {resultado === 'Reprogramar seguimiento' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  📅 Se creará una nueva tarea de seguimiento para dentro de 7 días.
                </p>
              </div>
            )}

            {resultado === 'No contactado' && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  ⚠ Se registrará el intento fallido de contacto. Considere reprogramar el seguimiento.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !baja}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Registrar Gestión'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}