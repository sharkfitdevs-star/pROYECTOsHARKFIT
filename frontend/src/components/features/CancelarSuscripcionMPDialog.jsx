import React, { useState, useMemo } from 'react';
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
  Building2,
  CheckCircle2,
  CreditCard,
  Search,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { format, parseISO, differenceInDays, isBefore, isToday } from 'date-fns';
import { Tareas_Sistema_Online } from '@/entities/Tareas_Sistema_Online';

export default function CancelarSuscripcionMPDialog({
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
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Form state para cancelación
  const [canceladoMP, setCanceladoMP] = useState(false);
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

  const esAlerta = (tarea) => {
    if (!tarea.fecha_vencimiento) return false;
    const fecha = parseISO(tarea.fecha_vencimiento);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    // Es alerta si ya venció o vence hoy
    return isBefore(fecha, hoy) || isToday(fecha);
  };

  const getDiasBadge = (dias, esAlertaUrgente) => {
    if (dias === null) return null;
    if (esAlertaUrgente) {
      return (
        <Badge className="bg-red-600 animate-pulse">
          <AlertTriangle className="h-3 w-3 mr-1" />
          ¡CANCELAR HOY!
        </Badge>
      );
    }
    if (dias < 0) {
      return <Badge className="bg-red-500">Vencido hace {Math.abs(dias)} días</Badge>;
    } else if (dias === 0) {
      return <Badge className="bg-red-600">¡Hoy!</Badge>;
    } else if (dias <= 2) {
      return <Badge className="bg-orange-500">En {dias} días</Badge>;
    } else if (dias <= 7) {
      return <Badge className="bg-yellow-500">En {dias} días</Badge>;
    } else {
      return <Badge className="bg-blue-500">En {dias} días</Badge>;
    }
  };

  // Filtrar tareas de cancelación de suscripción MP pendientes
  const tareasPendientes = tareas.filter(t => 
    t.tipo_tarea === 'Cancelar Suscripción MP' && 
    t.estado === 'Pendiente'
  );

  // Contar alertas (tareas que vencen hoy o ya vencieron)
  const alertasCount = useMemo(() => {
    return tareasPendientes.filter(t => esAlerta(t)).length;
  }, [tareasPendientes]);

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

  const handleCancelar = (tarea) => {
    setTareaSeleccionada(tarea);
    setCanceladoMP(false);
    setNotas('');
    setCancelDialogOpen(true);
  };

  const handleGuardarCancelacion = async () => {
    if (!tareaSeleccionada) return;
    
    if (!canceladoMP) {
      alert('Debe confirmar que canceló la suscripción en Mercado Pago');
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

      // Marcar tarea como completada
      await Tareas_Sistema_Online.update(tareaSeleccionada.id, {
        estado: 'Completada',
        fecha_completada: ahora.toISOString(),
        resultado: 'Suscripción cancelada en Mercado Pago',
        notas: `${tareaSeleccionada.notas || ''}\n\n[Financiero] ${format(ahora, 'dd/MM/yyyy HH:mm')}: Suscripción cancelada en MP. ${notas || ''}`,
        tiempo_resolucion_minutos: tiempoResolucion,
        completado_por_id: staffData?.id || null,
        completado_por_nombre: staffData?.nombre || user?.fullName || user?.email
      });

      setCancelDialogOpen(false);
      setTareaSeleccionada(null);
      
      if (onSuccess) onSuccess();
      
    } catch (error) {
      console.error('Error guardando cancelación:', error);
      alert('Error al guardar la cancelación');
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
              <CreditCard className="h-5 w-5 text-blue-500" />
              Cancelar Suscripciones Mercado Pago
              <Badge variant="secondary" className="ml-2">{tareasFiltradas.length}</Badge>
              {alertasCount > 0 && (
                <Badge className="bg-red-600 animate-pulse ml-2">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {alertasCount} urgente{alertasCount > 1 ? 's' : ''}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Cancelar suscripciones en Mercado Pago para clientes con baja programada
            </DialogDescription>
          </DialogHeader>

          {/* Alerta de urgencia */}
          {alertasCount > 0 && (
            <div className="p-3 bg-red-100 border border-red-300 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-800 font-medium">
                ¡Atención! Hay {alertasCount} suscripción{alertasCount > 1 ? 'es' : ''} que debe{alertasCount > 1 ? 'n' : ''} cancelarse HOY o ya están vencidas.
              </p>
            </div>
          )}

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

          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="space-y-3">
              {tareasFiltradas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p>No hay suscripciones pendientes de cancelar</p>
                </div>
              ) : (
                tareasFiltradas.map((tarea) => {
                  const dias = getDiasParaVencimiento(tarea.fecha_vencimiento);
                  const esUrgente = esAlerta(tarea);
                  
                  return (
                    <div 
                      key={tarea.id} 
                      className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                        esUrgente ? 'border-red-400 bg-red-50 animate-pulse' : 
                        dias !== null && dias <= 2 ? 'border-orange-300 bg-orange-50' : 
                        dias !== null && dias <= 7 ? 'border-yellow-300 bg-yellow-50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-semibold text-lg">{tarea.cliente_nombre}</h3>
                            {getDiasBadge(dias, esUrgente)}
                            <Badge className="bg-blue-500">
                              Mercado Pago
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600 mb-3">
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
                              Cancelar antes: {tarea.fecha_vencimiento ? format(parseISO(tarea.fecha_vencimiento), 'dd/MM/yyyy') : 'N/A'}
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
                            className={esUrgente ? 'bg-red-600 hover:bg-red-700' : ''}
                            onClick={() => handleCancelar(tarea)}
                          >
                            {esUrgente ? 'Cancelar Ahora' : 'Marcar Cancelado'}
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

      {/* Dialog de Confirmación de Cancelación */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar Suscripción MP - {tareaSeleccionada?.cliente_nombre}</DialogTitle>
            <DialogDescription>
              Confirme que canceló la suscripción en Mercado Pago
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Información del cliente */}
            {tareaSeleccionada && (
              <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
                <p><strong>Cliente:</strong> {tareaSeleccionada.cliente_nombre}</p>
                <p><strong>WhatsApp:</strong> {tareaSeleccionada.cliente_whatsapp}</p>
                <p><strong>Fecha límite:</strong> {tareaSeleccionada.fecha_vencimiento ? format(parseISO(tareaSeleccionada.fecha_vencimiento), 'dd/MM/yyyy') : 'N/A'}</p>
              </div>
            )}

            {/* Checkbox confirmar cancelación */}
            <div className="flex items-start space-x-3 p-3 border rounded-lg bg-blue-50">
              <Checkbox
                id="canceladoMP"
                checked={canceladoMP}
                onCheckedChange={setCanceladoMP}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="canceladoMP"
                  className="text-sm font-medium cursor-pointer"
                >
                  ¿Confirmas que cancelaste la suscripción en Mercado Pago?
                </label>
                <p className="text-xs text-gray-500">
                  Verificar en el panel de Mercado Pago que la suscripción fue cancelada correctamente
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas adicionales</Label>
              <Textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="ID de suscripción, observaciones, etc..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarCancelacion} disabled={loading || !canceladoMP}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmar Cancelación
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}