import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertCircle, 
  Calendar, 
  CheckCircle2, 
  DollarSign, 
  Eye, 
  MessageSquare,
  Phone,
  User,
  Building2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function MetricaListadoDialog({
  open,
  onOpenChange,
  titulo,
  tipo,
  items = [],
  sucursales = [],
  staffAll = [],
  clientes = [],
  onGestionarTarea,
  onRegistrarContacto,
  onRegistrarIntentoCobro,
  onMarcarCompletada
}) {
  const getSedeNombre = (sedeId) => {
    const sede = sucursales.find(s => s.id === sedeId);
    return sede?.nombre_sede || 'N/A';
  };

  const getStaffNombre = (staffId) => {
    const staff = staffAll.find(s => s.id === staffId);
    return staff?.nombre || 'N/A';
  };

  const getClienteNombre = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente?.nombre || 'N/A';
  };

  const getPrioridadColor = (prioridad) => {
    switch (prioridad) {
      case 'urgente': return 'bg-red-500';
      case 'alta': return 'bg-orange-500';
      case 'media': return 'bg-yellow-500';
      case 'baja': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const renderTareas = () => (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-center text-gray-500 py-4">No hay tareas en esta categoría</p>
      ) : (
        items.map((tarea) => (
          <div key={tarea.id} className="border rounded-lg p-4 hover:bg-gray-50">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold">{tarea.titulo}</h3>
                  <Badge className={getPrioridadColor(tarea.prioridad)}>
                    {tarea.prioridad}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {tarea.tipo}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">{tarea.descripcion}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Vence: {tarea.fecha_limite ? format(parseISO(tarea.fecha_limite), 'dd/MM/yyyy') : 'N/A'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {getSedeNombre(tarea.sede)}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {getStaffNombre(tarea.responsable)}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {onGestionarTarea && (
                  <Button size="sm" onClick={() => onGestionarTarea(tarea)}>
                    Gestionar
                  </Button>
                )}
                {onMarcarCompletada && (
                  <Button size="sm" variant="outline" onClick={() => onMarcarCompletada(tarea)}>
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderAlertasRenovacion = () => (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-center text-gray-500 py-4">No hay alertas críticas</p>
      ) : (
        items.map((alerta) => (
          <div key={alerta.id} className="border rounded-lg p-4 hover:bg-gray-50 border-orange-200">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold">{alerta.cliente_nombre || getClienteNombre(alerta.cliente)}</h3>
                  <Badge className={alerta.prioridad === 'Alta' ? 'bg-red-500' : 'bg-orange-500'}>
                    {alerta.prioridad || 'Media'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {alerta.dias_vencido > 0 ? `${alerta.dias_vencido} días vencido` : 'Por vencer'}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {getSedeNombre(alerta.sede)}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {alerta.plan_nombre || 'Plan no especificado'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {onRegistrarContacto && (
                  <Button size="sm" onClick={() => onRegistrarContacto(alerta)}>
                    Contactar
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderDeudores = () => (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-center text-gray-500 py-4">No hay deudores</p>
      ) : (
        items.map((deudor) => (
          <div key={deudor.id} className="border rounded-lg p-4 hover:bg-gray-50 border-purple-200">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold">{deudor.cliente_nombre || getClienteNombre(deudor.cliente)}</h3>
                  <Badge className="bg-purple-500">
                    ${(deudor.monto_adeudado || 0).toLocaleString('es-CL')}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Intentos de cobro: {deudor.intentos_cobro || 0}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {getSedeNombre(deudor.sede)}
                  </span>
                  {deudor.fecha_ultimo_intento && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Último intento: {format(parseISO(deudor.fecha_ultimo_intento), 'dd/MM/yyyy')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {onRegistrarIntentoCobro && (
                  <Button size="sm" onClick={() => onRegistrarIntentoCobro(deudor)}>
                    Registrar Cobro
                  </Button>
                )}
                <Button size="sm" variant="outline">
                  <Phone className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderGenerico = () => (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-center text-gray-500 py-4">No hay elementos para mostrar</p>
      ) : (
        items.map((item, index) => (
          <div key={item.id || index} className="border rounded-lg p-4 hover:bg-gray-50">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1">
                <h3 className="font-semibold">{item.titulo || item.nombre || item.cliente_nombre || `Item ${index + 1}`}</h3>
                {item.descripcion && (
                  <p className="text-sm text-gray-600">{item.descripcion}</p>
                )}
              </div>
              <Button size="sm" variant="outline">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderContent = () => {
    switch (tipo) {
      case 'tareas_vencidas':
      case 'tareas_pendientes':
      case 'tareas_por_vencer':
        return renderTareas();
      case 'alertas_criticas':
        return renderAlertasRenovacion();
      case 'deudores':
        return renderDeudores();
      default:
        return renderGenerico();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {titulo}
            <Badge variant="secondary" className="ml-2">{items.length}</Badge>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          {renderContent()}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}