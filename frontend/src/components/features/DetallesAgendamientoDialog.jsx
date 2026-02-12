import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { Calendar, User, MapPin, Clock, Phone, Mail, Target, Dumbbell, FileText, UserCheck, Users, ChevronDown, ChevronUp } from 'lucide-react';

export default function DetallesAgendamientoDialog({ 
  open, 
  onClose, 
  agendamiento, 
  prospecto,
  vendedor,
  clase,
  cerrador,
  sede
}) {
  const [notasAgendamientoOpen, setNotasAgendamientoOpen] = useState(false);
  const [notasProspectoOpen, setNotasProspectoOpen] = useState(false);

  if (!agendamiento || !prospecto) return null;

  const getResultadoBadgeColor = (resultado) => {
    const colors = {
      'Pendiente': 'bg-yellow-100 text-yellow-800',
      'Asistió': 'bg-green-100 text-green-800',
      'No asistió': 'bg-red-100 text-red-800',
      'Reagendado': 'bg-blue-100 text-blue-800'
    };
    return colors[resultado] || 'bg-gray-100 text-gray-800';
  };

  const getEstadoBadgeColor = (estado) => {
    const colors = {
      'Agendado': 'bg-blue-100 text-blue-800',
      'Asistió': 'bg-green-100 text-green-800',
      'No asistió': 'bg-red-100 text-red-800',
      'Reagendado': 'bg-yellow-100 text-yellow-800',
      'Compró (online)': 'bg-purple-100 text-purple-800',
      'Compró (en sede)': 'bg-purple-100 text-purple-800',
      'Promesa de compra': 'bg-orange-100 text-orange-800',
      'Perdido': 'bg-gray-100 text-gray-800',
      'No califica': 'bg-gray-100 text-gray-800',
      'No contesta': 'bg-gray-100 text-gray-800'
    };
    return colors[estado] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Detalles del Agendamiento</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del Agendamiento */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Información del Agendamiento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Fecha y Hora:</span>
                <div className="font-medium">
                  {format(new Date(agendamiento.fecha_hora), 'dd/MM/yyyy HH:mm')}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Tipo de Visita:</span>
                <div>
                  <Badge variant="outline" className="mt-1">{agendamiento.tipo_visita}</Badge>
                </div>
              </div>
              <div>
                <span className="text-gray-600">Estado:</span>
                <div>
                  <Badge className={`${getResultadoBadgeColor(agendamiento.resultado_asistencia)} mt-1`}>
                    {agendamiento.resultado_asistencia}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-gray-600">Sede:</span>
                <div className="font-medium flex items-center mt-1">
                  <MapPin className="w-4 h-4 mr-1 text-gray-500" />
                  {sede?.nombre_sede || '-'}
                </div>
              </div>
            </div>
            
            {/* Notas del Agendamiento - Desplegable */}
            {agendamiento.notas && (
              <Collapsible open={notasAgendamientoOpen} onOpenChange={setNotasAgendamientoOpen} className="mt-3">
                <CollapsibleTrigger className="flex items-center justify-between w-full text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  <span className="font-medium">Notas del Agendamiento</span>
                  {notasAgendamientoOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="text-sm bg-white p-3 rounded border">
                    {agendamiento.notas}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>

          {/* Información del Prospecto */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-3 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Información del Prospecto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Nombre:</span>
                <div className="font-medium">{prospecto.nombre}</div>
              </div>
              <div>
                <span className="text-gray-600">WhatsApp:</span>
                <div className="font-medium flex items-center">
                  <Phone className="w-4 h-4 mr-1 text-gray-500" />
                  {prospecto.whatsapp || '-'}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Correo:</span>
                <div className="font-medium flex items-center">
                  <Mail className="w-4 h-4 mr-1 text-gray-500" />
                  {prospecto.correo || '-'}
                </div>
              </div>
              <div>
                <span className="text-gray-600">RUT:</span>
                <div className="font-medium">{prospecto.rut || '-'}</div>
              </div>
              <div>
                <span className="text-gray-600">Fecha de Nacimiento:</span>
                <div className="font-medium">
                  {prospecto.fecha_nacimiento ? format(new Date(prospecto.fecha_nacimiento), 'dd/MM/yyyy') : '-'}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Edad:</span>
                <div className="font-medium">{prospecto.edad || '-'} años</div>
              </div>
              <div>
                <span className="text-gray-600">Estado Pipeline:</span>
                <div>
                  <Badge className={`${getEstadoBadgeColor(prospecto.estado_pipeline)} mt-1`}>
                    {prospecto.estado_pipeline}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-gray-600">Tipo de Invitación:</span>
                <div className="font-medium">{prospecto.tipo_invitacion || '-'}</div>
              </div>
            </div>
          </div>

          {/* Objetivos */}
          {prospecto.objetivos && prospecto.objetivos.length > 0 && (
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-3 flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Objetivos
              </h3>
              <div className="flex flex-wrap gap-2">
                {prospecto.objetivos.map((objetivo, idx) => (
                  <Badge key={idx} variant="outline" className="bg-white">
                    {objetivo}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Información de Asignación */}
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="font-semibold text-orange-900 mb-3 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Asignaciones
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Vendedor Asignado:</span>
                <div className="font-medium flex items-center mt-1">
                  <UserCheck className="w-4 h-4 mr-1 text-gray-500" />
                  {vendedor?.nombre || '-'}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Clase que Asistirá:</span>
                <div className="font-medium flex items-center mt-1">
                  <Dumbbell className="w-4 h-4 mr-1 text-gray-500" />
                  {clase?.nombre_clase || '-'}
                </div>
              </div>
              {cerrador && (
                <div>
                  <span className="text-gray-600">Cerrador Asignado:</span>
                  <div className="font-medium flex items-center mt-1">
                    <UserCheck className="w-4 h-4 mr-1 text-gray-500" />
                    {cerrador.nombre}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notas del Prospecto - Desplegable */}
          {prospecto.notas && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <Collapsible open={notasProspectoOpen} onOpenChange={setNotasProspectoOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80 transition-opacity">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Notas del Prospecto
                  </h3>
                  {notasProspectoOpen ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="text-sm bg-white p-3 rounded border">
                    {prospecto.notas}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {/* Información de Registro */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Información de Registro
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Fecha de Ingreso:</span>
                <div className="font-medium">
                  {prospecto.fecha_ingreso ? format(new Date(prospecto.fecha_ingreso), 'dd/MM/yyyy') : '-'}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Fecha de Visita:</span>
                <div className="font-medium">
                  {prospecto.fecha_visita ? format(new Date(prospecto.fecha_visita), 'dd/MM/yyyy') : '-'}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Registrado por:</span>
                <div className="font-medium">{agendamiento.registrado_por || '-'}</div>
              </div>
              <div>
                <span className="text-gray-600">Creado:</span>
                <div className="font-medium">
                  {format(new Date(prospecto.createdAt), 'dd/MM/yyyy HH:mm')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}