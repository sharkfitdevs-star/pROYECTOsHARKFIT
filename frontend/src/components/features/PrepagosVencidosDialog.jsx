import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Phone, MessageCircle, Search, RefreshCw, Calendar } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import GestionRenovacionDialog from './GestionRenovacionDialog';

export default function PrepagosVencidosDialog({
  open,
  onClose,
  clientes,
  planesServicios,
  seguimientoOnline,
  sucursales,
  onRecargar
}) {
  const [busqueda, setBusqueda] = useState('');
  const [dialogRenovacion, setDialogRenovacion] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  // Filtrar clientes prepago/programa vencidos (día siguiente de su vencimiento)
  const clientesPrepagosVencidos = useMemo(() => {
    if (!clientes || !planesServicios) return [];
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    return clientes.filter(cliente => {
      // Verificar si tiene fecha de fin de plan
      if (!cliente.fecha_fin_plan_actual) return false;
      
      // Verificar que el plan sea Prepago
      if (cliente.modalidad_actual !== 'Prepago') return false;
      
      // Buscar el plan para verificar el tipo
      const plan = planesServicios.find(p => p.id === cliente.plan_actual);
      if (plan && plan.tipo_item !== 'Plan' && plan.tipo_item !== 'Programa') return false;
      
      // Si no hay plan pero modalidad es Prepago, incluirlo
      // Verificar si está vencido (fecha fin < hoy)
      const fechaFin = new Date(cliente.fecha_fin_plan_actual);
      fechaFin.setHours(0, 0, 0, 0);
      
      // Cliente vencido = fecha fin < hoy
      if (fechaFin >= hoy) return false;
      
      // Verificar que no esté ya en seguimiento online gestionado
      const yaTieneSeguimiento = seguimientoOnline?.find(s => 
        s.cliente_id === cliente.id && 
        (s.estado === 'Renovó' || s.estado === 'No Renovará')
      );
      if (yaTieneSeguimiento) return false;
      
      // Cliente activo
      if (!cliente.activo) return false;
      
      return true;
    }).map(cliente => {
      const fechaFin = parseISO(cliente.fecha_fin_plan_actual);
      const diasVencido = differenceInDays(new Date(), fechaFin);
      const plan = planesServicios.find(p => p.id === cliente.plan_actual);
      const sede = sucursales?.find(s => s.id === cliente.sede);
      
      // Buscar si ya tiene seguimiento online
      const seguimiento = seguimientoOnline?.find(s => s.cliente_id === cliente.id);
      
      return {
        ...cliente,
        dias_vencido: diasVencido,
        plan_nombre: plan?.nombre_plan || 'Plan no encontrado',
        tipo_plan: plan?.tipo_item || 'Desconocido',
        sede_nombre: sede?.nombre_sede || 'Sin sede',
        seguimiento_existente: seguimiento
      };
    }).sort((a, b) => a.dias_vencido - b.dias_vencido);
  }, [clientes, planesServicios, seguimientoOnline, sucursales]);

  // Filtrar por búsqueda
  const clientesFiltrados = useMemo(() => {
    if (!busqueda) return clientesPrepagosVencidos;
    const termino = busqueda.toLowerCase();
    return clientesPrepagosVencidos.filter(c =>
      c.nombre_cliente?.toLowerCase().includes(termino) ||
      c.whatsapp?.includes(termino) ||
      c.plan_nombre?.toLowerCase().includes(termino)
    );
  }, [clientesPrepagosVencidos, busqueda]);

  const handleGestionar = (cliente) => {
    // Crear objeto similar a seguimiento online para el dialog
    const seguimientoData = cliente.seguimiento_existente || {
      cliente_id: cliente.id,
      cliente_nombre: cliente.nombre_cliente,
      cliente_whatsapp: cliente.whatsapp,
      fecha_vencimiento: cliente.fecha_fin_plan_actual,
      dias_vencido: cliente.dias_vencido,
      sede: cliente.sede,
      estado: 'Seguimiento Online',
      fue_contactado: false
    };
    
    setClienteSeleccionado(seguimientoData);
    setDialogRenovacion(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-yellow-600" />
              Planes Prepago/Programa Vencidos - Por Contactar
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, whatsapp o plan..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Contador */}
            <div className="text-sm text-gray-500">
              {clientesFiltrados.length} clientes prepago/programa vencidos por contactar
            </div>

            {/* Listado */}
            <div className="space-y-3">
              {clientesFiltrados.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <RefreshCw className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No hay clientes prepago/programa vencidos por contactar</p>
                </div>
              ) : (
                clientesFiltrados.map(cliente => (
                  <div 
                    key={cliente.id}
                    className={`border rounded-lg p-4 hover:bg-gray-50 ${
                      cliente.dias_vencido > 7 ? 'border-red-300 bg-red-50' :
                      cliente.dias_vencido > 3 ? 'border-orange-300 bg-orange-50' :
                      'border-yellow-300 bg-yellow-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-semibold">{cliente.nombre_cliente}</h3>
                          <Badge variant="outline" className={
                            cliente.dias_vencido > 7 ? 'bg-red-100 text-red-700' :
                            cliente.dias_vencido > 3 ? 'bg-orange-100 text-orange-700' :
                            'bg-yellow-100 text-yellow-700'
                          }>
                            {cliente.dias_vencido} día{cliente.dias_vencido !== 1 ? 's' : ''} vencido
                          </Badge>
                          <Badge className="bg-purple-500 text-white">
                            {cliente.tipo_plan}
                          </Badge>
                          {cliente.seguimiento_existente?.fue_contactado && (
                            <Badge className="bg-blue-500 text-white">Contactado</Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-1">{cliente.whatsapp}</p>
                        
                        <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                          <span className="font-medium">{cliente.plan_nombre}</span>
                          <span className="text-gray-400">|</span>
                          <span>{cliente.sede_nombre}</span>
                          <span className="text-gray-400">|</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Venció: {format(parseISO(cliente.fecha_fin_plan_actual), 'dd/MM/yyyy')}
                          </span>
                        </div>
                        
                        {cliente.seguimiento_existente?.detalle_contacto && (
                          <p className="text-sm text-gray-600 mt-2 italic bg-white p-2 rounded">
                            Último contacto: {cliente.seguimiento_existente.detalle_contacto}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-green-600 border-green-300"
                          onClick={() => window.open(`https://wa.me/${cliente.whatsapp?.replace(/\D/g, '')}`, '_blank')}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(`tel:${cliente.whatsapp}`, '_blank')}
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleGestionar(cliente)}
                        >
                          Gestionar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Gestión Renovación */}
      <GestionRenovacionDialog
        open={dialogRenovacion}
        onClose={() => {
          setDialogRenovacion(false);
          setClienteSeleccionado(null);
        }}
        seguimiento={clienteSeleccionado}
        onSuccess={() => {
          onRecargar?.();
          setDialogRenovacion(false);
          setClienteSeleccionado(null);
        }}
      />
    </>
  );
}