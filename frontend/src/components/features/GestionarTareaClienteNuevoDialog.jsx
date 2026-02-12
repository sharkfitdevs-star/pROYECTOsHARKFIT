import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle } from 'lucide-react';

import { Tareas_RS } from '@/entities/Tareas_RS';
import { Contratos } from '@/entities/Contratos';
import { Tarjetas_Registradas } from '@/entities/Tarjetas_Registradas';
import User from '@/entities/User';

export default function GestionarTareaClienteNuevoDialog({ open, onOpenChange, tarea, cliente, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState('');
  const [notas, setNotas] = useState('');

  // Estados específicos para tarjeta
  const [estadoTarjeta, setEstadoTarjeta] = useState('');
  const [ultimosDigitos, setUltimosDigitos] = useState('');
  const [tipoTarjeta, setTipoTarjeta] = useState('');
  const [bancoEmisor, setBancoEmisor] = useState('');
  const [motivoFalla, setMotivoFalla] = useState('');

  // Estados específicos para contrato
  const [estadoContrato, setEstadoContrato] = useState('');
  const [metodoFirma, setMetodoFirma] = useState('');

  const handleClose = () => {
    setResultado('');
    setNotas('');
    setEstadoTarjeta('');
    setUltimosDigitos('');
    setTipoTarjeta('');
    setBancoEmisor('');
    setMotivoFalla('');
    setEstadoContrato('');
    setMetodoFirma('');
    setError('');
    onOpenChange(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await User.me();

      // Determinar qué tipo de tarea es según el título
      const esTareaTarjeta = tarea?.titulo?.toLowerCase().includes('tarjeta');
      const esTareaContrato = tarea?.titulo?.toLowerCase().includes('contrato');

      if (esTareaTarjeta) {
        // Validar campos de tarjeta
        if (!estadoTarjeta) {
          setError('Debes seleccionar el estado de la tarjeta');
          setLoading(false);
          return;
        }

        // Crear o actualizar registro en Tarjetas_Registradas
        await Tarjetas_Registradas.create({
          cliente: cliente.id,
          sede: cliente.sede,
          fecha_registro: new Date().toISOString().split('T')[0],
          estado: estadoTarjeta,
          ultimos_digitos: ultimosDigitos || null,
          tipo_tarjeta: tipoTarjeta || null,
          banco_emisor: bancoEmisor || null,
          motivo_falla: motivoFalla || null,
          intentos: estadoTarjeta === 'Fallida' ? 1 : 0,
          registrada_por: user.id,
          notas: notas
        });
      } else if (esTareaContrato) {
        // Validar campos de contrato
        if (!estadoContrato) {
          setError('Debes seleccionar el estado del contrato');
          setLoading(false);
          return;
        }

        // Crear o actualizar registro en Contratos
        await Contratos.create({
          cliente: cliente.id,
          sede: cliente.sede,
          plan_contratado: cliente.plan_actual?.nombre_plan || 'N/A',
          fecha_venta: cliente.fecha_primer_compra || new Date().toISOString().split('T')[0],
          estado: estadoContrato,
          fecha_firma: estadoContrato === 'Firmado' ? new Date().toISOString().split('T')[0] : null,
          metodo_firma: metodoFirma || null,
          recibido_por: user.id,
          notas: notas
        });
      }

      // Marcar tarea como completada
      await Tareas_RS.update(tarea.id, {
        estado: 'completada',
        fecha_completada: new Date().toISOString(),
        notas: `${tarea.notas || ''}\n\nCompletada: ${esTareaTarjeta ? `Tarjeta ${estadoTarjeta}` : `Contrato ${estadoContrato}`}. ${notas || ''}`
      });

      onSuccess?.();
      handleClose();
    } catch (err) {
      console.error('Error al gestionar tarea:', err);
      setError(err.message || 'Error al procesar la tarea');
    } finally {
      setLoading(false);
    }
  };

  if (!tarea || !cliente) return null;

  const esTareaTarjeta = tarea?.titulo?.toLowerCase().includes('tarjeta');
  const esTareaContrato = tarea?.titulo?.toLowerCase().includes('contrato');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {esTareaTarjeta ? '💳 Registrar Tarjeta' : '📄 Registrar Contrato'} - Cliente Nuevo
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Información del cliente */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Información del Cliente</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Nombre:</span>
                <span className="ml-2 font-medium">{cliente.nombre}</span>
              </div>
              <div>
                <span className="text-gray-600">WhatsApp:</span>
                <span className="ml-2 font-medium">{cliente.whatsapp || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Plan:</span>
                <span className="ml-2 font-medium">{cliente.plan_actual?.nombre_plan || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Fecha Compra:</span>
                <span className="ml-2 font-medium">{cliente.fecha_primer_compra || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Información de la tarea */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Tarea</h3>
            <p className="text-sm text-gray-700">{tarea.titulo}</p>
            <p className="text-xs text-gray-500 mt-1">{tarea.descripcion}</p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Formulario específico para TARJETA */}
          {esTareaTarjeta && (
            <>
              <div className="space-y-2">
                <Label htmlFor="estadoTarjeta">Estado de la Tarjeta *</Label>
                <Select value={estadoTarjeta} onValueChange={setEstadoTarjeta} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Registrada">✅ Registrada</SelectItem>
                    <SelectItem value="Pendiente">⏳ Pendiente</SelectItem>
                    <SelectItem value="Fallida">❌ Fallida</SelectItem>
                    <SelectItem value="Rechazada">🚫 Rechazada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {estadoTarjeta === 'Registrada' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ultimosDigitos">Últimos 4 Dígitos</Label>
                      <input
                        id="ultimosDigitos"
                        type="text"
                        maxLength="4"
                        value={ultimosDigitos}
                        onChange={(e) => setUltimosDigitos(e.target.value.replace(/\D/g, ''))}
                        className="w-full border rounded px-3 py-2"
                        placeholder="1234"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tipoTarjeta">Tipo de Tarjeta</Label>
                      <Select value={tipoTarjeta} onValueChange={setTipoTarjeta}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Débito">Débito</SelectItem>
                          <SelectItem value="Crédito">Crédito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bancoEmisor">Banco Emisor</Label>
                    <input
                      id="bancoEmisor"
                      type="text"
                      value={bancoEmisor}
                      onChange={(e) => setBancoEmisor(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: Banco de Chile"
                    />
                  </div>
                </>
              )}

              {(estadoTarjeta === 'Fallida' || estadoTarjeta === 'Rechazada') && (
                <div className="space-y-2">
                  <Label htmlFor="motivoFalla">Motivo de Falla/Rechazo</Label>
                  <Textarea
                    id="motivoFalla"
                    value={motivoFalla}
                    onChange={(e) => setMotivoFalla(e.target.value)}
                    placeholder="Describe el motivo..."
                    rows={3}
                  />
                </div>
              )}
            </>
          )}

          {/* Formulario específico para CONTRATO */}
          {esTareaContrato && (
            <>
              <div className="space-y-2">
                <Label htmlFor="estadoContrato">Estado del Contrato *</Label>
                <Select value={estadoContrato} onValueChange={setEstadoContrato} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Firmado">✅ Firmado</SelectItem>
                    <SelectItem value="Pendiente">⏳ Pendiente</SelectItem>
                    <SelectItem value="Rechazado">❌ Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {estadoContrato === 'Firmado' && (
                <div className="space-y-2">
                  <Label htmlFor="metodoFirma">Método de Firma</Label>
                  <Select value={metodoFirma} onValueChange={setMetodoFirma}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Presencial">Presencial</SelectItem>
                      <SelectItem value="Digital">Digital</SelectItem>
                      <SelectItem value="Email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {/* Notas adicionales */}
          <div className="space-y-2">
            <Label htmlFor="notas">Notas Adicionales</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Agrega cualquier observación relevante..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Completar Tarea
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}