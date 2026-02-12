import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertCircle, 
  Calendar, 
  Phone,
  MessageSquare,
  User,
  Building2,
  CheckCircle2,
  XCircle,
  Search,
  Loader2
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Bajas_Programadas } from '@/entities/Bajas_Programadas';
import { Tareas_RS } from '@/entities/Tareas_RS';
import { Tareas_Sistema_Online } from '@/entities/Tareas_Sistema_Online';
import { Clientes } from '@/entities/Clientes';

export default function BajasAContactarDialog({
  open,
  onOpenChange,
  bajasProgramadas = [],
  sucursales = [],
  staff = [],
  clientes = [],
  onSuccess
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [gestionDialogOpen, setGestionDialogOpen] = useState(false);
  const [bajaSeleccionada, setBajaSeleccionada] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Form state para gestión
  const [canalContacto, setCanalContacto] = useState('');
  const [resultadoContacto, setResultadoContacto] = useState('');
  const [detalleContacto, setDetalleContacto] = useState('');

  const getSedeNombre = (sedeId) => {
    const sede = sucursales.find(s => s.id === sedeId);
    return sede?.nombre_sede || 'N/A';
  };

  const getResponsableNombre = (staffId) => {
    const s = staff.find(st => st.id === staffId);
    return s?.nombre || 'N/A';
  };

  const getDiasParaBaja = (fechaBaja) => {
    if (!fechaBaja) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fecha = parseISO(fechaBaja);
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

  const getMotivoColor = (motivo) => {
    switch (motivo) {
      case 'Precio': return 'bg-yellow-100 text-yellow-800';
      case 'Mudanza': return 'bg-blue-100 text-blue-800';
      case 'No uso': return 'bg-gray-100 text-gray-800';
      case 'Servicio': return 'bg-red-100 text-red-800';
      case 'Competencia': return 'bg-purple-100 text-purple-800';
      case 'Salud': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filtrar bajas pendientes (estado_gestion = programada o en_gestion)
  const bajasPendientes = bajasProgramadas.filter(b => 
    b.estado_gestion === 'programada' || b.estado_gestion === 'en_gestion'
  );

  const bajasFiltradas = bajasPendientes.filter(baja => {
    const searchLower = searchTerm.toLowerCase();
    return (
      baja.cliente_nombre?.toLowerCase().includes(searchLower) ||
      baja.cliente_whatsapp?.includes(searchTerm) ||
      getSedeNombre(baja.sede).toLowerCase().includes(searchLower)
    );
  }).sort((a, b) => {
    // Ordenar por días para baja (más urgente primero)
    const diasA = getDiasParaBaja(a.fecha_baja_programada) ?? 999;
    const diasB = getDiasParaBaja(b.fecha_baja_programada) ?? 999;
    return diasA - diasB;
  });

  const handleLlamar = (baja) => {
    if (baja.cliente_whatsapp) {
      // Limpiar número
      const numero = baja.cliente_whatsapp.replace(/\D/g, '');
      window.open(`tel:${numero}`, '_self');
    }
  };

  const handleWhatsApp = (baja) => {
    if (baja.cliente_whatsapp) {
      const numero = baja.cliente_whatsapp.replace(/\D/g, '');
      const mensaje = encodeURIComponent(
        `Hola ${baja.cliente_nombre}, le escribimos de Vendify. Nos gustaría conversar con usted sobre su membresía.`
      );
      window.open(`https://wa.me/${numero}?text=${mensaje}`, '_blank');
    }
  };

  const handleGestionar = (baja) => {
    setBajaSeleccionada(baja);
    setCanalContacto('');
    setResultadoContacto('');
    setDetalleContacto('');
    setGestionDialogOpen(true);
  };

  const handleGuardarGestion = async () => {
    if (!bajaSeleccionada) return;
    if (!canalContacto) {
      alert('Debe seleccionar el canal de contacto');
      return;
    }
    if (!resultadoContacto) {
      alert('Debe seleccionar el resultado del contacto');
      return;
    }

    try {
      setLoading(true);
      const hoy = format(new Date(), 'yyyy-MM-dd');

      // Determinar el nuevo estado de gestión
      let nuevoEstadoGestion = 'en_gestion';
      if (resultadoContacto === 'Recuperado') {
        nuevoEstadoGestion = 'recuperado';
      } else if (resultadoContacto === 'Continúa en Baja') {
        nuevoEstadoGestion = 'continua_baja';
      } else if (resultadoContacto === 'No contactado') {
        nuevoEstadoGestion = 'no_contactado';
      }

      // Actualizar Baja Programada
      await Bajas_Programadas.update(bajaSeleccionada.id, {
        estado_gestion: nuevoEstadoGestion,
        resultado_contacto: resultadoContacto,
        reporte_gestion: `[${canalContacto}] ${detalleContacto}`,
        fecha_contacto: hoy,
        fecha_resultado: resultadoContacto !== 'Reprogramar seguimiento' ? hoy : null
      });

      // Si fue recuperado, actualizar cliente
      if (resultadoContacto === 'Recuperado' && bajaSeleccionada.cliente) {
        await Clientes.update(bajaSeleccionada.cliente, {
          tiene_baja_programada: false
        });
      }

      // Marcar tarea como completada si existe
      if (bajaSeleccionada.tarea_asignada) {
        await Tareas_RS.update(bajaSeleccionada.tarea_asignada, {
          estado: 'completada',
          fecha_completada: hoy,
          notas: `${bajaSeleccionada.notas || ''}\n\nResultado: ${resultadoContacto} - ${detalleContacto}`
        });
      }

      // Si la baja continúa (no fue recuperada), crear tarea de Confirmación de Baja para Soporte
      if (resultadoContacto === 'Continúa en Baja' || resultadoContacto === 'No contactado') {
        // Determinar la descripción según el método de cobro
        const metodoCobro = bajaSeleccionada.metodo_cobro || 'No especificado';
        let descripcionTarea = '';
        
        if (metodoCobro === 'Evo' || metodoCobro === 'Tarjeta') {
          descripcionTarea = `Confirmar que la baja está programada en EVO.\n\nCliente: ${bajaSeleccionada.cliente_nombre}\nWhatsApp: ${bajaSeleccionada.cliente_whatsapp}\nFecha de baja: ${bajaSeleccionada.fecha_baja_programada}\nMétodo de cobro: ${metodoCobro}\nMotivo: ${bajaSeleccionada.motivo}`;
        } else if (metodoCobro === 'Mercado Pago') {
          descripcionTarea = `Confirmar que la baja está programada en EVO y enviar tarea a Financiero para cancelar suscripción en Mercado Pago.\n\nCliente: ${bajaSeleccionada.cliente_nombre}\nWhatsApp: ${bajaSeleccionada.cliente_whatsapp}\nFecha de baja: ${bajaSeleccionada.fecha_baja_programada}\nFecha último cobro: ${bajaSeleccionada.fecha_ultimo_cobro}\nMétodo de cobro: ${metodoCobro}\nMotivo: ${bajaSeleccionada.motivo}`;
        }

        await Tareas_Sistema_Online.create({
          titulo: `Confirmación Baja: ${bajaSeleccionada.cliente_nombre}`,
          descripcion: descripcionTarea,
          departamento: 'Soporte',
          tipo_tarea: 'Confirmación Baja',
          prioridad: 'Alta',
          estado: 'Pendiente',
          fecha_creacion: new Date().toISOString(),
          fecha_vencimiento: bajaSeleccionada.fecha_baja_programada,
          sede_id: bajaSeleccionada.sede,
          cliente_id: bajaSeleccionada.cliente,
          cliente_nombre: bajaSeleccionada.cliente_nombre,
          cliente_whatsapp: bajaSeleccionada.cliente_whatsapp,
          referencia_id: bajaSeleccionada.id,
          referencia_tipo: 'Bajas_Programadas',
          notas: `Método cobro: ${metodoCobro}\nResultado contacto RS: ${resultadoContacto}\nDetalle: ${detalleContacto}`
        });
      }

      setGestionDialogOpen(false);
      setBajaSeleccionada(null);
      
      if (onSuccess) onSuccess();
      
    } catch (error) {
      console.error('Error guardando gestión:', error);
      alert('Error al guardar la gestión');
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
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Bajas a Contactar
              <Badge variant="secondary" className="ml-2">{bajasFiltradas.length}</Badge>
            </DialogTitle>
            <DialogDescription>
              Clientes con baja programada que necesitan ser contactados para retención
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
              {bajasFiltradas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p>No hay bajas pendientes de contactar</p>
                </div>
              ) : (
                bajasFiltradas.map((baja) => {
                  const dias = getDiasParaBaja(baja.fecha_baja_programada);
                  return (
                    <div 
                      key={baja.id} 
                      className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                        dias !== null && dias <= 2 ? 'border-red-300 bg-red-50' : 
                        dias !== null && dias <= 7 ? 'border-orange-300 bg-orange-50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-semibold text-lg">{baja.cliente_nombre}</h3>
                            {getDiasBadge(dias)}
                            <Badge className={getMotivoColor(baja.motivo)}>
                              {baja.motivo}
                            </Badge>
                            {baja.estado_gestion === 'en_gestion' && (
                              <Badge variant="outline" className="border-blue-500 text-blue-600">
                                En gestión
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {baja.cliente_whatsapp || 'Sin teléfono'}
                            </div>
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {getSedeNombre(baja.sede)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Baja: {baja.fecha_baja_programada ? format(parseISO(baja.fecha_baja_programada), 'dd/MM/yyyy') : 'N/A'}
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              RS: {getResponsableNombre(baja.responsable_sede)}
                            </div>
                          </div>

                          {/* Detalles adicionales */}
                          <div className="text-xs text-gray-500 space-y-1">
                            <p><strong>Plan:</strong> {baja.plan_actual || 'N/A'}</p>
                            {baja.detalle_motivo && (
                              <p><strong>Detalle:</strong> {baja.detalle_motivo}</p>
                            )}
                            {baja.reporte_gestion && (
                              <p className="text-blue-600"><strong>Última gestión:</strong> {baja.reporte_gestion}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="border-green-500 text-green-600 hover:bg-green-50"
                            onClick={() => handleLlamar(baja)}
                          >
                            <Phone className="h-4 w-4 mr-1" />
                            Llamar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="border-green-600 text-green-700 hover:bg-green-50"
                            onClick={() => handleWhatsApp(baja)}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            WhatsApp
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleGestionar(baja)}
                          >
                            Gestionar
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

      {/* Dialog de Gestión */}
      <Dialog open={gestionDialogOpen} onOpenChange={setGestionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gestionar Baja - {bajaSeleccionada?.cliente_nombre}</DialogTitle>
            <DialogDescription>
              Registre el resultado del contacto con el cliente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Canal de Contacto *</Label>
              <Select value={canalContacto} onValueChange={setCanalContacto}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar canal..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="Llamada">Llamada telefónica</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Presencial">Presencial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Resultado del Contacto *</Label>
              <Select value={resultadoContacto} onValueChange={setResultadoContacto}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar resultado..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Recuperado">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Recuperado - Cliente decide continuar
                    </div>
                  </SelectItem>
                  <SelectItem value="Continúa en Baja">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      Continúa en Baja - Cliente confirma salida
                    </div>
                  </SelectItem>
                  <SelectItem value="No contactado">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      No contactado - No contesta
                    </div>
                  </SelectItem>
                  <SelectItem value="Reprogramar seguimiento">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      Reprogramar seguimiento
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Detalle del Contacto</Label>
              <Textarea
                value={detalleContacto}
                onChange={(e) => setDetalleContacto(e.target.value)}
                placeholder="Escriba los detalles de la conversación, acuerdos, etc..."
                rows={4}
              />
            </div>

            {/* Información del cliente */}
            {bajaSeleccionada && (
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <p><strong>Motivo de baja:</strong> {bajaSeleccionada.motivo}</p>
                <p><strong>Plan:</strong> {bajaSeleccionada.plan_actual}</p>
                <p><strong>Fecha de baja:</strong> {bajaSeleccionada.fecha_baja_programada ? format(parseISO(bajaSeleccionada.fecha_baja_programada), 'dd/MM/yyyy') : 'N/A'}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setGestionDialogOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarGestion} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Gestión'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}