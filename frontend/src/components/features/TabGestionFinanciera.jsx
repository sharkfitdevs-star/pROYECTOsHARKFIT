import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  Calendar, 
  Phone, 
  AlertTriangle,
  FileText,
  CreditCard,
  TrendingUp
} from 'lucide-react';
import { format, parseISO, differenceInDays, isBefore } from 'date-fns';

export default function TabGestionFinanciera({ 
  seguimientoOnline,
  alertasRenovacion,
  deudores,
  clientes,
  contratos,
  tarjetas,
  onRegistrarContacto,
  onRegistrarIntentoCobro,
  onRegistrarPago,
  onRegistrarRenovacion,
  onMarcarContratoFirmado,
  onRegistrarIntentoTarjeta
}) {
  const hoy = new Date();

  const getPrioridadColor = (prioridad) => {
    switch (prioridad) {
      case 'Alta': return 'bg-red-500 text-white';
      case 'Media': return 'bg-yellow-500 text-white';
      case 'Baja': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <Tabs defaultValue="seguimiento_online" className="w-full">
      <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
        <TabsTrigger value="seguimiento_online">Seguimiento Online</TabsTrigger>
        <TabsTrigger value="alertas">Alertas Renovación</TabsTrigger>
        <TabsTrigger value="deudores">Deudores</TabsTrigger>
        <TabsTrigger value="renovaciones">Renovaciones Prepago</TabsTrigger>
        <TabsTrigger value="contratos">Contratos</TabsTrigger>
        <TabsTrigger value="tarjetas">Tarjetas</TabsTrigger>
      </TabsList>

      {/* Seguimiento Online (0-3 días vencidos) */}
      <TabsContent value="seguimiento_online">
        <Card>
          <CardHeader>
            <CardTitle>Seguimiento Online (0-3 días vencidos)</CardTitle>
            <p className="text-sm text-gray-600">Clientes recién vencidos que requieren contacto inmediato</p>
          </CardHeader>
          <CardContent>
            {seguimientoOnline?.filter(s => s.estado === 'Seguimiento Online' || s.estado === 'Pendiente').length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No hay clientes en seguimiento online</p>
              </div>
            ) : (
              <div className="space-y-3">
                {seguimientoOnline?.filter(s => s.estado === 'Seguimiento Online' || s.estado === 'Pendiente').map(cliente => (
                  <div key={cliente.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold">{cliente.cliente_nombre}</h3>
                        <p className="text-sm text-gray-600">{cliente.cliente_whatsapp}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <Badge variant="outline" className="bg-yellow-50">
                            {cliente.dias_vencido} días vencido
                          </Badge>
                          <span className="text-gray-500">
                            Vencimiento: {format(parseISO(cliente.fecha_vencimiento), 'dd/MM/yyyy')}
                          </span>
                          {cliente.fue_contactado && (
                            <Badge className="bg-blue-500">Contactado</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => window.open(`https://wa.me/${cliente.cliente_whatsapp}`, '_blank')}>
                          <Phone className="h-4 w-4 mr-1" />
                          WhatsApp
                        </Button>
                        <Button size="sm" onClick={() => onRegistrarContacto?.(cliente)}>
                          Registrar Contacto
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Alertas de Renovación (+3 días vencidos) */}
      <TabsContent value="alertas">
        <Card>
          <CardHeader>
            <CardTitle>Alertas de Renovación (+3 días vencidos)</CardTitle>
            <p className="text-sm text-gray-600">Clientes con más de 3 días vencidos que requieren seguimiento urgente</p>
          </CardHeader>
          <CardContent>
            {alertasRenovacion?.filter(a => a.estado === 'Pendiente').length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No hay alertas de renovación pendientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alertasRenovacion?.filter(a => a.estado === 'Pendiente')
                  .sort((a, b) => b.dias_vencido - a.dias_vencido)
                  .map(alerta => (
                  <div key={alerta.id} className={`border rounded-lg p-4 ${alerta.dias_vencido > 14 ? 'bg-red-50 border-red-200' : alerta.dias_vencido > 7 ? 'bg-orange-50 border-orange-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className={`h-5 w-5 ${alerta.dias_vencido > 14 ? 'text-red-600' : alerta.dias_vencido > 7 ? 'text-orange-600' : 'text-yellow-600'}`} />
                          <h3 className="font-semibold">Cliente ID: {alerta.cliente_id}</h3>
                          <Badge className={getPrioridadColor(alerta.prioridad)}>
                            {alerta.prioridad}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <Badge variant="destructive">
                            {alerta.dias_vencido} días vencido
                          </Badge>
                          <span className="text-gray-600">
                            Vencimiento: {format(parseISO(alerta.fecha_vencimiento), 'dd/MM/yyyy')}
                          </span>
                          <span className="text-gray-600">
                            Tipo: {alerta.tipo_alerta}
                          </span>
                        </div>
                        {alerta.notas && (
                          <p className="text-sm text-gray-600 mt-2 italic">{alerta.notas}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => window.open(`https://wa.me/`, '_blank')}>
                          <Phone className="h-4 w-4 mr-1" />
                          Contactar
                        </Button>
                        <Button size="sm" onClick={() => onRegistrarContacto?.(alerta)}>
                          Registrar Gestión
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Deudores */}
      <TabsContent value="deudores">
        <Card>
          <CardHeader>
            <CardTitle>Deudores</CardTitle>
            <p className="text-sm text-gray-600">Clientes con deudas pendientes</p>
          </CardHeader>
          <CardContent>
            {deudores?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No hay deudores</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deudores?.map(deudor => (
                  <div key={deudor.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold">{deudor.cliente_nombre}</h3>
                        <p className="text-sm text-gray-600">{deudor.cliente_whatsapp}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                          <span className="text-red-600 font-semibold">
                            Deuda: ${deudor.monto_adeudado?.toLocaleString('es-CL')}
                          </span>
                          <Badge variant="outline">
                            {deudor.dias_atraso} días atraso
                          </Badge>
                          <Badge className={
                            deudor.estado_gestion === 'Promesa de pago' ? 'bg-blue-500' :
                            deudor.estado_gestion === 'Recuperado' ? 'bg-green-500' :
                            deudor.estado_gestion === 'Irrecuperable' ? 'bg-gray-500' :
                            'bg-yellow-500'
                          }>
                            {deudor.estado_gestion}
                          </Badge>
                          <span className="text-gray-500">
                            Intentos: {deudor.intentos_cobro || 0}
                          </span>
                        </div>
                        {deudor.fecha_promesa_pago && (
                          <p className="text-sm text-blue-600 mt-2">
                            Promesa de pago: {format(parseISO(deudor.fecha_promesa_pago), 'dd/MM/yyyy')}
                          </p>
                        )}
                        {deudor.ultimo_intento && (
                          <p className="text-sm text-gray-500 mt-1">
                            Último intento: {deudor.ultimo_intento.fecha} - {deudor.ultimo_intento.canal} - {deudor.ultimo_intento.resultado}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => window.open(`https://wa.me/${deudor.cliente_whatsapp}`, '_blank')}>
                          <Phone className="h-4 w-4 mr-1" />
                          Contactar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onRegistrarIntentoCobro?.(deudor)}>
                          Registrar Intento
                        </Button>
                        <Button size="sm" onClick={() => onRegistrarPago?.(deudor)}>
                          Registrar Pago
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Renovaciones Prepago */}
      <TabsContent value="renovaciones">
        <Card>
          <CardHeader>
            <CardTitle>Renovaciones Prepago</CardTitle>
            <p className="text-sm text-gray-600">Clientes con planes prepago próximos a vencer o vencidos</p>
          </CardHeader>
          <CardContent>
            {clientes?.filter(c => c.activo && c.plan_actual?.modalidad_cobro === 'Prepago' && c.fecha_fin_plan).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No hay renovaciones prepago pendientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientes?.filter(c => c.activo && c.plan_actual?.modalidad_cobro === 'Prepago' && c.fecha_fin_plan)
                  .sort((a, b) => new Date(a.fecha_fin_plan) - new Date(b.fecha_fin_plan))
                  .map(cliente => {
                    const fechaFin = parseISO(cliente.fecha_fin_plan);
                    const diasRestantes = differenceInDays(fechaFin, hoy);
                    const vencido = diasRestantes < 0;
                    
                    return (
                      <div key={cliente.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{cliente.nombre}</h3>
                              {vencido ? (
                                <Badge variant="destructive">Vencido</Badge>
                              ) : diasRestantes <= 7 ? (
                                <Badge variant="outline" className="bg-yellow-50">Por vencer</Badge>
                              ) : null}
                            </div>
                            <p className="text-sm text-gray-600">{cliente.whatsapp}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className={vencido ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                                Vence: {format(fechaFin, 'dd/MM/yyyy')}
                                {vencido ? ` (${Math.abs(diasRestantes)} días vencido)` : ` (${diasRestantes} días)`}
                              </span>
                              <span className="text-gray-500">
                                {cliente.plan_actual?.nombre_plan || 'N/A'}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => window.open(`https://wa.me/${cliente.whatsapp}`, '_blank')}>
                              <Phone className="h-4 w-4 mr-1" />
                              Contactar
                            </Button>
                            <Button size="sm" onClick={() => onRegistrarRenovacion?.(cliente)}>
                              Renovar
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Contratos Pendientes */}
      <TabsContent value="contratos">
        <Card>
          <CardHeader>
            <CardTitle>Contratos Pendientes</CardTitle>
            <p className="text-sm text-gray-600">Contratos pendientes de firma</p>
          </CardHeader>
          <CardContent>
            {contratos?.filter(c => c.estado === 'Pendiente').length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No hay contratos pendientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {contratos?.filter(c => c.estado === 'Pendiente').map(contrato => {
                  const diasPendiente = contrato.dias_pendiente || 0;
                  
                  return (
                    <div key={contrato.id} className={`border rounded-lg p-4 ${diasPendiente > 7 ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="font-semibold">Cliente ID: {contrato.cliente}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-gray-600">
                              Plan: {contrato.plan_contratado}
                            </span>
                            <span className="text-gray-600">
                              Fecha venta: {format(parseISO(contrato.fecha_venta), 'dd/MM/yyyy')}
                            </span>
                            <Badge variant={diasPendiente > 7 ? 'destructive' : 'outline'}>
                              {diasPendiente} días pendiente
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Método esperado: {contrato.metodo_firma}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            Enviar Recordatorio
                          </Button>
                          <Button size="sm" onClick={() => onMarcarContratoFirmado?.(contrato)}>
                            Marcar Firmado
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tarjetas Pendientes */}
      <TabsContent value="tarjetas">
        <Card>
          <CardHeader>
            <CardTitle>Tarjetas Pendientes</CardTitle>
            <p className="text-sm text-gray-600">Tarjetas pendientes de registro o con fallos</p>
          </CardHeader>
          <CardContent>
            {tarjetas?.filter(t => t.estado === 'Pendiente' || t.estado === 'Fallida').length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No hay tarjetas pendientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tarjetas?.filter(t => t.estado === 'Pendiente' || t.estado === 'Fallida').map(tarjeta => (
                  <div key={tarjeta.id} className={`border rounded-lg p-4 ${tarjeta.estado === 'Fallida' ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold">Cliente ID: {tarjeta.cliente}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <Badge variant={tarjeta.estado === 'Fallida' ? 'destructive' : 'outline'}>
                            {tarjeta.estado}
                          </Badge>
                          <span className="text-gray-600">
                            Tipo: {tarjeta.tipo_tarjeta}
                          </span>
                          <span className="text-gray-600">
                            Intentos: {tarjeta.intentos || 0}
                          </span>
                        </div>
                        {tarjeta.motivo_falla && (
                          <p className="text-sm text-red-600 mt-2">
                            Motivo falla: {tarjeta.motivo_falla}
                          </p>
                        )}
                        {tarjeta.banco_emisor && (
                          <p className="text-sm text-gray-500 mt-1">
                            Banco: {tarjeta.banco_emisor}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => onRegistrarIntentoTarjeta?.(tarjeta)}>
                          Registrar Intento
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}