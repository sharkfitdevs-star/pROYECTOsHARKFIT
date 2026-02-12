import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { CheckCircle, Calendar as CalendarIcon, DollarSign, Ban, Phone, UserX, Clock, UserCheck, CheckCheck } from 'lucide-react';

export default function AccionesAgendamientoMenu({ 
  agendamiento, 
  tieneVenta = false,
  onRegistrarVenta,
  onCompromisoCompra,
  onNoCompro,
  onReagendar,
  onNoInteresado,
  onNoContesta,
  onAsignarCerrador,
  disabled = false,
  yaGestionado = false // Nueva prop para indicar si ya fue gestionado
}) {
  // Si ya tiene venta, mostrar solo el check de Cliente Activo
  if (tieneVenta) {
    return (
      <Button 
        variant="outline"
        size="sm" 
        disabled
        className="bg-green-50 border-green-500 text-green-700 cursor-default"
      >
        <CheckCircle className="w-4 h-4 mr-1" />
        <span className="hidden sm:inline">Cliente Activo</span>
      </Button>
    );
  }

  // Determinar si la fecha/hora ya pasó (verde) o aún no llega (rojo)
  const fechaAgenda = new Date(agendamiento.fecha_hora);
  const ahora = new Date();
  const yaVencio = fechaAgenda < ahora;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={yaVencio ? "default" : "outline"}
          size="sm" 
          disabled={disabled}
          className={
            yaGestionado 
              ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600'
              : yaVencio 
                ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
                : 'border-orange-500 text-orange-600 hover:bg-orange-50 hover:text-orange-700'
          }
        >
          {yaGestionado ? (
            <>
              <CheckCheck className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Gestionado</span>
            </>
          ) : yaVencio ? (
            <>
              <DollarSign className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Gestionar</span>
            </>
          ) : (
            <>
              <Clock className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Pendiente</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {yaVencio ? (
          // VERDE: La fecha/hora ya pasó - opciones de resultado de visita
          <>
            <DropdownMenuLabel className="text-green-700 font-semibold">
              Resultado de Visita
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onRegistrarVenta} className="cursor-pointer">
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              <div>
                <div className="font-medium">Compró</div>
                <div className="text-xs text-gray-500">Registrar venta</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCompromisoCompra} className="cursor-pointer">
              <CalendarIcon className="w-4 h-4 mr-2 text-blue-600" />
              <div>
                <div className="font-medium">Compromiso de Compra</div>
                <div className="text-xs text-gray-500">Marcar promesa y reagendar</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onReagendar} className="cursor-pointer">
              <CalendarIcon className="w-4 h-4 mr-2 text-orange-600" />
              <div>
                <div className="font-medium">Reagendar</div>
                <div className="text-xs text-gray-500">Cambiar fecha/hora de visita</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onNoCompro} className="cursor-pointer">
              <Ban className="w-4 h-4 mr-2 text-red-600" />
              <div>
                <div className="font-medium">No Compró</div>
                <div className="text-xs text-gray-500">Indicar razón</div>
              </div>
            </DropdownMenuItem>
          </>
        ) : (
          // ROJO: La fecha/hora aún no llega - opciones de gestión previa
          <>
            <DropdownMenuLabel className="text-red-700 font-semibold">
              Gestionar Agendamiento
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onRegistrarVenta} className="cursor-pointer">
              <DollarSign className="w-4 h-4 mr-2 text-green-600" />
              <div>
                <div className="font-medium">Vender</div>
                <div className="text-xs text-gray-500">Registrar venta anticipada</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onReagendar} className="cursor-pointer">
              <CalendarIcon className="w-4 h-4 mr-2 text-blue-600" />
              <div>
                <div className="font-medium">Reagendar</div>
                <div className="text-xs text-gray-500">Cambiar fecha/hora</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onNoInteresado} className="cursor-pointer">
              <UserX className="w-4 h-4 mr-2 text-orange-600" />
              <div>
                <div className="font-medium">No Interesado</div>
                <div className="text-xs text-gray-500">Marcar como perdido</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onNoContesta} className="cursor-pointer">
              <Phone className="w-4 h-4 mr-2 text-gray-600" />
              <div>
                <div className="font-medium">No Contesta</div>
                <div className="text-xs text-gray-500">Registrar intento fallido</div>
              </div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}