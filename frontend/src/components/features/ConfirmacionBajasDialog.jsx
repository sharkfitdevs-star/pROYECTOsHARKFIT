import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  AlertCircle, 
  Calendar, 
  Phone,
  MessageSquare,
  User,
  Building2,
  CheckCircle2,
  CreditCard,
  Search,
  Loader2,
  Send
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Tareas_Sistema_Online } from '@/entities/Tareas_Sistema_Online';
import { Bajas_Programadas } from '@/entities/Bajas_Programadas';

export default function ConfirmacionBajasDialog({
  open,
  onOpenChange,
  tareas = [],
  sucursales = [],
  staff = [],
  user = null,
  staffData = null,
  onSuccess
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Form state para confirmación
  const [confirmadoEvo, setConfirmadoEvo] = useState(false);
  const [enviarFinanciero, setEnviarFinanciero] = useState(false);
  const [notas, setNotas] = useState('');

  const getSedeNombre = (sedeId) => {
    const sede = sucursales.find(s => s.id === sedeId);
    return sede?.nombre_sede || 'N/A';
  };

  const getDiasParaVencimiento = (fechaVencimiento) => {
    if (!fechaVencimiento) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fecha = parseISO(fechaVencimiento);
    return differenceInDays(fecha, hoy);
  };

  const getDiasBadge = (dias) => {
    if (dias === null) return null;
    if (dias < 0) {
      return <Badge className="bg-red-500">Vencido hace {Math.abs(dias)} días</Badge>;
    } else if (dias === 0) {
      return <Badge className="bg-red-600">Hoy</Badge>;
    } else if (dias <= 2) {
      return <Badge className="bg-orange-500">En {dias} días</Badge>;
    } else if (dias <= 7) {
      return <Badge className="bg-yellow-500">En {dias} días</Badge>;
    } else {
      return <Badge className="bg-blue-500">En {dias} días</Badge>;
    }
  };

  const getMetodoCobro = (tarea) => {
    if (!tarea) return 'No especificado';
    const notasText = tarea.notas || tarea.descripcion || '';
    if (notasText.includes('Mercado Pago')) return 'Mercado Pago';
    if (notasText.includes('Evo') || notasText.includes('EVO')) return 'Evo';
    if (notasText.includes('Tarjeta')) return 'Tarjeta';
    return 'No especificado';
  };

  const esMercadoPago = (tarea) => {
    if (!tarea) return false;
    return getMetodoCobro(tarea) === 'Mercado Pago';
  };

  // Filtrar tareas de confirmación de baja pendientes
  const tareasPendientes = tareas.filter(t => 
    t.tipo_tarea === 'Confirmación Baja' && 
    t.estado === 'Pendiente'
  );

  const tareasFiltradas = tareasPendientes.filter(tarea => {
    const searchLower = searchTerm.toLowerCase();
    return (
      tarea.cliente_nombre?.toLowerCase().includes(searchLower) ||
      tarea.cliente_whatsapp?.includes(searchTerm) ||
      getSedeNombre(tarea.sede_id).toLowerCase().includes(searchLower)
    );
  }).sort((a, b) => {
    // Ordenar por días para vencimiento (más urgente primero)
    const diasA = getDiasParaVencimiento(a.fecha_vencimiento) ?? 999;
    const diasB = getDiasParaVencimiento(b.fecha_vencimiento) ?? 999;
    return diasA - diasB;
  });

  const handleLlamar = (tarea) => {
    if (tarea.cliente_whatsapp) {
      const numero = tarea.cliente_whatsapp.replace(/\D/g, '');
      window.open(`tel:${numero}`, '_self');
    }
  };

  const handleWhatsApp = (tarea) => {
    if (tarea.cliente_whatsapp) {
      const numero = tarea.cliente_whatsapp.replace(/\D/g, '');
      window.open(`https://wa.me/${numero}`, '_blank');
    }
  };

  const handleConfirmar = (tarea) => {
    setTareaSeleccionada(tarea);
    setConfirmadoEvo(false);
    setEnviarFinanciero(esMercadoPago(tarea));
    setNotas('');
    setConfirmDialogOpen(true);
  };

  const handleGuardarConfirmacion = async () => {
    if (!tareaSeleccionada) return;
    
    if (!confirmadoEvo) {
      alert('Debe confirmar que la baja está programada en EVO');
      return;
    }

    try {
      setLoading(true);
      const ahora = new Date();

      // Calcular tiempo de resolución
      const fechaCreacion = tareaSeleccionada.fecha_creacion || tareaSeleccionada.createdAt;
      let tiempoResolucion = 0;
      if (fechaCreacion) {
        tiempoResolucion = Math.round((ahora - new Date(fechaCreacion)) / 60000);
      }

      // Marcar tarea de soporte como completada
      await Tareas_Sistema_Online.update(tareaSeleccionada.id, {
        estado: 'Completada',
        fecha_completada: ahora.toISOString(),
        resultado: `Confirmado en EVO${enviarFinanciero ? ' - Enviado a Financiero' : ''}`,
        notas: `${tareaSeleccionada.notas || ''}\n\n[Soporte] ${format(ahora, 'dd/MM/yyyy HH:mm')}: ${notas || 'Baja confirmada en EVO'}`,
        tiempo_resolucion_minutos: tiempoResolucion,
        completado_por_id: staffData?.id || null,
        completado_por_nombre: staffData?.nombre || user?.fullName || user?.email
      });

      // Si es Mercado Pago y se marcó enviar a Financiero, crear tarea para Financiero
      if (enviarFinanciero && esMercadoPago(tareaSeleccionada)) {
        // Extraer fecha de último cobro de las notas o descripción
        const descripcionMatch = tareaSeleccionada.descripcion?.match(/Fecha último cobro: (\d{4}-\d{2}-\d{2})/);
        const fechaUltimoCobro = descripcionMatch ? descripcionMatch[1] : null;

        await Tareas_Sistema_Online.create({
          titulo: `Cancelar Suscripción MP: ${tareaSeleccionada.cliente_nombre}`,
          descripcion: `Cancelar suscripción en Mercado Pago para cliente con baja programada.\n\nCliente: ${tareaSeleccionada.cliente_nombre}\nWhatsApp: ${tareaSeleccionada.cliente_whatsapp}\nFecha de baja programada: ${tareaSeleccionada.fecha_vencimiento}\nFecha último cobro: ${fechaUltimoCobro || 'Ver detalle de baja'}\n\n⚠️ ALERTA: Cancelar antes del próximo cobro`,
          departamento: 'Financiero',
          tipo_tarea: 'Cancelar Suscripción MP',
          prioridad: 'Alta',
          estado: 'Pendiente',
          fecha_creacion: ahora.toISOString(),
          fecha_vencimiento: fechaUltimoCobro || tareaSeleccionada.fecha_vencimiento,
          sede_id: tareaSeleccionada.sede_id,
          cliente_id: tareaSeleccionada.cliente_id,
          cliente_nombre: tareaSeleccionada.cliente_nombre,
          cliente_whatsapp: tareaSeleccionada.cliente_whatsapp,
          referencia_id: tareaSeleccionada.referencia_id,
          referencia_tipo: 'Bajas_Programadas',
          notas: `Enviado desde Soporte.\nTarea origen: ${tareaSeleccionada.id}\n${notas || ''}`
        });
      }

      setConfirmDialogOpen(false);
      setTareaSeleccionada(null);
      
      if (onSuccess) onSuccess();
      
    } catch (error) {
      console.error('Error guardando confirmación:', error);
      alert('Error al guardar la confirmación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-500" />
              Confirmación de Bajas Programadas
              <Badge variant="secondary" className="ml-2">{tareasFiltradas.length}</Badge>
            </DialogTitle>
            <DialogDescription>
              Confirmar que las bajas están programadas correctamente en EVO
            </DialogDescription>
          </DialogHeader>

          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, whatsapp o sede..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="max-h-[55vh] pr-4">
            <div className="space-y-3">
              {tareasFiltradas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p>No hay bajas pendientes de confirmar</p>
                </div>
              ) : (
                tareasFiltradas.map((tarea) => {
                  const dias = getDiasParaVencimiento(tarea.fecha_vencimiento);
                  const metodoCobro = getMetodoCobro(tarea);
                  const requiereFinanciero = metodoCobro === 'Mercado Pago';
                  
                  return (
                    <div 
                      key={tarea.id} 
                      className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                        dias !== null && dias <= 2 ? 'border-red-300 bg-red-50' : 
                        dias !== null && dias <= 7 ? 'border-orange-300 bg-orange-50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-semibold text-lg">{tarea.cliente_nombre}</h3>
                            {getDiasBadge(dias)}
                            <Badge className={
                              metodoCobro === 'Mercado Pago' ? 'bg-blue-500' :
                              metodoCobro === 'Evo' ? 'bg-green-500' :
                              'bg-gray-500'
                            }>
                              {metodoCobro}
                            </Badge>
                            {requiereFinanciero && (
                              <Badge className="bg-yellow-500">
                                Requiere Financiero
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {tarea.cliente_whatsapp || 'Sin teléfono'}
                            </div>
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {getSedeNombre(tarea.sede_id)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Baja: {tarea.fecha_vencimiento ? format(parseISO(tarea.fecha_vencimiento), 'dd/MM/yyyy') : 'N/A'}
                            </div>
                            <div className="flex items-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              {metodoCobro}
                            </div>
                          </div>

                          {/* Descripción */}
                          {tarea.descripcion && (
                            <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded mb-2">
                              {tarea.descripcion.substring(0, 200)}...
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="border-green-500 text-green-600 hover:bg-green-50"
                            onClick={() => handleLlamar(tarea)}
                          >
                            <Phone className="h-4 w-4 mr-1" />
                            Llamar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="border-green-600 text-green-700 hover:bg-green-50"
                            onClick={() => handleWhatsApp(tarea)}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            WhatsApp
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleConfirmar(tarea)}
                          >
                            Confirmar
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmación */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Baja - {tareaSeleccionada?.cliente_nombre}</DialogTitle>
            <DialogDescription>
              Confirme que la baja está programada correctamente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Información del cliente */}
            {tareaSeleccionada && (
              <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
                <p><strong>Cliente:</strong> {tareaSeleccionada.cliente_nombre}</p>
                <p><strong>Fecha de baja:</strong> {tareaSeleccionada.fecha_vencimiento ? format(parseISO(tareaSeleccionada.fecha_vencimiento), 'dd/MM/yyyy') : 'N/A'}</p>
                <p><strong>Método de cobro:</strong> {getMetodoCobro(tareaSeleccionada)}</p>
              </div>
            )}

            {/* Checkbox confirmar EVO */}
            <div className="flex items-start space-x-3 p-3 border rounded-lg bg-blue-50">
              <Checkbox
                id="confirmadoEvo"
                checked={confirmadoEvo}
                onCheckedChange={setConfirmadoEvo}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="confirmadoEvo"
                  className="text-sm font-medium cursor-pointer"
                >
                  {getMetodoCobro(tareaSeleccionada) === 'Evo' || getMetodoCobro(tareaSeleccionada) === 'Tarjeta'
                    ? '¿Confirmas que la baja está programada en EVO?'
                    : '¿Confirmas que la baja está programada en EVO?'
                  }
                </label>
                <p className="text-xs text-gray-500">
                  Verificar en el sistema EVO que la cancelación está configurada
                </p>
              </div>
            </div>

            {/* Checkbox enviar a Financiero (solo si es Mercado Pago) */}
            {esMercadoPago(tareaSeleccionada) && (
              <div className="flex items-start space-x-3 p-3 border rounded-lg bg-yellow-50">
                <Checkbox
                  id="enviarFinanciero"
                  checked={enviarFinanciero}
                  onCheckedChange={setEnviarFinanciero}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="enviarFinanciero"
                    className="text-sm font-medium cursor-pointer flex items-center gap-2"
                  >
                    <Send className="h-4 w-4 text-yellow-600" />
                    Enviar tarea a Financiero
                  </label>
                  <p className="text-xs text-gray-500">
                    Se creará una tarea para que Financiero cancele la suscripción en Mercado Pago
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notas adicionales</Label>
              <Textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Observaciones o detalles adicionales..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarConfirmacion} disabled={loading || !confirmadoEvo}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmar Baja
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}