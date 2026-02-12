import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, MapPin, User, Phone } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function AgendadosHoyDialog({ open, onOpenChange, agendamientos, sucursales, staff }) {
  const ahora = new Date();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const hoyStr = format(hoy, 'yyyy-MM-dd');

  const { agendadosHoy, agendadosSinGestionar } = useMemo(() => {
    const hoyList = [];
    const sinGestionarList = [];

    (agendamientos || []).forEach(a => {
      if (!a?.fecha_hora) return;

      const fechaHoraAgendamiento = parseISO(a.fecha_hora);
      const fechaAgendamientoStr = format(fechaHoraAgendamiento, 'yyyy-MM-dd');

      // Agendados para hoy
      if (fechaAgendamientoStr === hoyStr) {
        hoyList.push(a);
      }

      // Sin gestionar: hora ya pasó y sin estado
      const yaPaso = fechaHoraAgendamiento < ahora;
      const sinGestionar = !a.resultado_asistencia || a.resultado_asistencia === 'Pendiente';
      if (yaPaso && sinGestionar) {
        sinGestionarList.push(a);
      }
    });

    // Ordenar por hora
    hoyList.sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));
    sinGestionarList.sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora)); // Más recientes primero

    return { agendadosHoy: hoyList, agendadosSinGestionar: sinGestionarList };
  }, [agendamientos, hoyStr, ahora]);

  const getSedeNombre = (sedeId) => {
    const sede = (sucursales || []).find(s => s.id === sedeId);
    return sede?.nombre_sede || 'N/A';
  };

  const getVendedorNombre = (vendedorId) => {
    const vendedor = (staff || []).find(s => s.id === vendedorId);
    return vendedor?.nombre || 'N/A';
  };

  const renderAgendamiento = (agendamiento) => {
    const fechaHora = parseISO(agendamiento.fecha_hora);
    const yaPaso = fechaHora < ahora;

    return (
      <div
        key={agendamiento.id}
        className={`border rounded-lg p-4 ${yaPaso ? 'bg-red-50 border-red-200' : 'bg-white'}`}
      >
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">{agendamiento.prospecto_nombre || 'Sin nombre'}</h3>
              {yaPaso && (
                <Badge variant="destructive" className="text-xs">
                  Hora pasada
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="h-4 w-4" />
                <span>{agendamiento.prospecto_whatsapp || 'N/A'}</span>
              </div>

              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>{getSedeNombre(agendamiento.sede)}</span>
              </div>

              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>{format(fechaHora, 'dd/MM/yyyy')}</span>
              </div>

              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-4 w-4" />
                <span className={yaPaso ? 'font-bold text-red-600' : ''}>
                  {format(fechaHora, 'HH:mm')}
                </span>
              </div>

              <div className="flex items-center gap-2 text-gray-600">
                <User className="h-4 w-4" />
                <span>{getVendedorNombre(agendamiento.vendedor_asignado)}</span>
              </div>

              {agendamiento.resultado_asistencia && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {agendamiento.resultado_asistencia}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agendamientos - Gestión del Día</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="hoy" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="hoy">
              Agendados Hoy ({agendadosHoy.length})
            </TabsTrigger>
            <TabsTrigger value="sin-gestionar">
              Sin Gestionar ({agendadosSinGestionar.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hoy" className="space-y-3 mt-4">
            {agendadosHoy.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No hay agendamientos para hoy</p>
              </div>
            ) : (
              agendadosHoy.map(renderAgendamiento)
            )}
          </TabsContent>

          <TabsContent value="sin-gestionar" className="space-y-3 mt-4">
            {agendadosSinGestionar.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No hay agendamientos sin gestionar</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ Atención:</strong> Estos agendamientos ya pasaron su hora de visita y no tienen estado definido. 
                    Es necesario actualizar su estado en la página de Agenda.
                  </p>
                </div>
                {agendadosSinGestionar.map(renderAgendamiento)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}