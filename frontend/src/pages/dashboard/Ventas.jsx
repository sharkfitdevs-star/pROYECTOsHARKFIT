import React, { useState, useEffect } from 'react';
import { Ventas as VentasEntity } from '@/entities/Ventas';
import { Sucursales } from '@/entities/Sucursales';
import { Staff } from '@/entities/Staff';
import { Planes_Servicios } from '@/entities/Planes_Servicios';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Filter, DollarSign, Trash2, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import moment from 'moment';
import EditarVentaDialog from '@/components/EditarVentaDialog';

export default function Ventas() {
  const [ventas, setVentas] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [staff, setStaff] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState(null);
  const [filters, setFilters] = useState({
    sede: 'all',
    vendedor: '',
    tipo_venta: 'all',
    estado: 'all',
    plan: 'all',
    fecha_venta_desde: '',
    fecha_venta_hasta: '',
    fecha_vencimiento_desde: '',
    fecha_vencimiento_hasta: ''
  });

  useEffect(() => {
    loadCatalogos();
  }, []);

  useEffect(() => {
    if (planes.length > 0 || staff.length > 0) {
      fetchVentas();
    }
  }, [filters, planes, staff]); // Recargar cuando cambien filtros o catálogos

  const loadCatalogos = async () => {
    try {
      const [sucursalesData, staffData, planesData] = await Promise.all([
        Sucursales.list(),
        Staff.list(),
        Planes_Servicios.list()
      ]);
      setSucursales(sucursalesData?.filter(s => s.activa) || []);
      setStaff(staffData || []);
      setPlanes(planesData?.filter(p => p.activo) || []);
    } catch (error) {
      console.error('Error cargando catálogos:', error);
    }
  };

  const fetchVentas = async () => {
    setLoading(true);
    try {
      let result;
      const filterObj = {};
      if (filters.sede && filters.sede !== 'all') filterObj.sede = filters.sede;
      if (filters.vendedor) filterObj.vendedor = filters.vendedor;
      if (filters.tipo_venta && filters.tipo_venta !== 'all') filterObj.tipo_venta = filters.tipo_venta;
      if (filters.estado && filters.estado !== 'all') filterObj.estado = filters.estado;
      if (filters.plan && filters.plan !== 'all') filterObj.plan = filters.plan;

      if (Object.keys(filterObj).length > 0) {
        result = await VentasEntity.filter(filterObj, '-fecha_venta');
      } else {
        result = await VentasEntity.filter({}, '-fecha_venta');
      }
      
      // Enriquecer datos con fecha de vencimiento calculada
      const ventasEnriquecidas = result.map(v => {
        const plan = planes.find(p => p.id === v.plan);
        let fecha_vencimiento = null;
        
        if (plan && plan.duracion_meses && v.fecha_venta) {
          fecha_vencimiento = moment(v.fecha_venta).add(plan.duracion_meses, 'months').format('YYYY-MM-DD');
        }
        
        return { ...v, fecha_vencimiento, plan_obj: plan };
      });
      
      // Aplicar filtros de fecha en el cliente
      let filteredResult = ventasEnriquecidas;
      
      // Filtro por fecha de venta
      if (filters.fecha_venta_desde) {
        filteredResult = filteredResult.filter(v => 
          moment(v.fecha_venta).isSameOrAfter(moment(filters.fecha_venta_desde), 'day')
        );
      }
      if (filters.fecha_venta_hasta) {
        filteredResult = filteredResult.filter(v => 
          moment(v.fecha_venta).isSameOrBefore(moment(filters.fecha_venta_hasta), 'day')
        );
      }
      
      // Filtro por fecha de vencimiento/renovación
      if (filters.fecha_vencimiento_desde) {
        filteredResult = filteredResult.filter(v => {
          if (!v.fecha_vencimiento) return false;
          return moment(v.fecha_vencimiento).isSameOrAfter(moment(filters.fecha_vencimiento_desde), 'day');
        });
      }
      if (filters.fecha_vencimiento_hasta) {
        filteredResult = filteredResult.filter(v => {
          if (!v.fecha_vencimiento) return false;
          return moment(v.fecha_vencimiento).isSameOrBefore(moment(filters.fecha_vencimiento_hasta), 'day');
        });
      }
      
      setVentas(filteredResult);
    } catch (error) {
      console.error('Error fetching ventas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVenta = async (ventaId) => {
    if (!confirm('¿Estás seguro de eliminar esta venta?')) return;
    setLoading(true);
    try {
      await VentasEntity.delete(ventaId);
      await fetchVentas();
    } catch (error) {
      console.error('Error deleting venta:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditVenta = (venta) => {
    setSelectedVenta(venta);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    fetchVentas();
  };

  const getTipoVentaBadgeColor = (tipo) => {
    return tipo === 'Online' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
  };

  const getEstadoBadgeColor = (estado) => {
    return estado === 'Cerrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const calcularTotales = () => {
    const total = ventas.filter(v => v.estado === 'Cerrada').length;
    const online = ventas.filter(v => v.tipo_venta === 'Online' && v.estado === 'Cerrada').length;
    const enSede = ventas.filter(v => v.tipo_venta === 'En sede' && v.estado === 'Cerrada').length;
    const montoTotal = ventas
      .filter(v => v.estado === 'Cerrada' && v.monto)
      .reduce((sum, v) => sum + (v.monto || 0), 0);

    return { total, online, enSede, montoTotal };
  };

  const totales = calcularTotales();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Ventas</h1>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold">{totales.total}</div>
            <p className="text-xs text-muted-foreground">Total Ventas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{totales.online}</div>
            <p className="text-xs text-muted-foreground">Ventas Online</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-purple-600">{totales.enSede}</div>
            <p className="text-xs text-muted-foreground">Ventas En Sede</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-lg sm:text-2xl font-bold text-green-600">
              ${totales.montoTotal.toLocaleString('es-CL')}
            </div>
            <p className="text-xs text-muted-foreground">Monto Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="filter-sede">Sede</Label>
              <Select
                value={filters.sede}
                onValueChange={(value) => setFilters({ ...filters, sede: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las sedes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las sedes</SelectItem>
                  {sucursales.map((sede) => (
                    <SelectItem key={sede.id} value={sede.id}>
                      {sede.nombre_sede}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filter-vendedor">Vendedor</Label>
              <input
                id="filter-vendedor"
                value={filters.vendedor}
                onChange={(e) => setFilters({ ...filters, vendedor: e.target.value })}
                placeholder="Buscar vendedor"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div>
              <Label htmlFor="filter-tipo">Tipo de Venta</Label>
              <Select
                value={filters.tipo_venta}
                onValueChange={(value) => setFilters({ ...filters, tipo_venta: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="En sede">En sede</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filter-estado">Estado</Label>
              <Select
                value={filters.estado}
                onValueChange={(value) => setFilters({ ...filters, estado: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="Cerrada">Cerrada</SelectItem>
                  <SelectItem value="Anulada">Anulada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filter-plan">Plan/Servicio</Label>
              <Select
                value={filters.plan}
                onValueChange={(value) => setFilters({ ...filters, plan: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los planes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los planes</SelectItem>
                  {planes.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.nombre_plan}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Filtros de Fecha */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
            <div className="space-y-2">
              <Label className="font-semibold">Fecha de Venta</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="fecha-venta-desde" className="text-xs text-gray-600">Desde</Label>
                  <Input
                    id="fecha-venta-desde"
                    type="date"
                    value={filters.fecha_venta_desde}
                    onChange={(e) => setFilters({ ...filters, fecha_venta_desde: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="fecha-venta-hasta" className="text-xs text-gray-600">Hasta</Label>
                  <Input
                    id="fecha-venta-hasta"
                    type="date"
                    value={filters.fecha_venta_hasta}
                    onChange={(e) => setFilters({ ...filters, fecha_venta_hasta: e.target.value })}
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="font-semibold">Fecha de Vencimiento/Renovación</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="fecha-vencimiento-desde" className="text-xs text-gray-600">Desde</Label>
                  <Input
                    id="fecha-vencimiento-desde"
                    type="date"
                    value={filters.fecha_vencimiento_desde}
                    onChange={(e) => setFilters({ ...filters, fecha_vencimiento_desde: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="fecha-vencimiento-hasta" className="text-xs text-gray-600">Hasta</Label>
                  <Input
                    id="fecha-vencimiento-hasta"
                    type="date"
                    value={filters.fecha_vencimiento_hasta}
                    onChange={(e) => setFilters({ ...filters, fecha_vencimiento_hasta: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Botón para limpiar filtros */}
          {(filters.fecha_venta_desde || filters.fecha_venta_hasta || filters.fecha_vencimiento_desde || filters.fecha_vencimiento_hasta) && (
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({
                  ...filters,
                  fecha_venta_desde: '',
                  fecha_venta_hasta: '',
                  fecha_vencimiento_desde: '',
                  fecha_vencimiento_hasta: ''
                })}
              >
                Limpiar filtros de fecha
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla de Ventas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Listado de Ventas ({ventas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : ventas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No hay ventas registradas</p>
            </div>
          ) : (
            <>
              {/* Vista de Tarjetas para Móvil */}
              <div className="block md:hidden space-y-3">
                {ventas.map((venta) => {
                  const sede = sucursales.find(s => s.id === venta.sede);
                  const vendedor = staff.find(s => s.id === venta.vendedor);
                  const plan = planes.find(p => p.id === venta.plan);
                  
                  return (
                    <div key={venta.id} className="border rounded-lg p-3 bg-white shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-sm">{venta.prospecto_nombre}</h3>
                          <p className="text-xs text-gray-500">{moment(venta.fecha_venta).format('DD/MM/YYYY')}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={getTipoVentaBadgeColor(venta.tipo_venta)} className="text-xs">
                            {venta.tipo_venta}
                          </Badge>
                          <Badge className={getEstadoBadgeColor(venta.estado)} className="text-xs">
                            {venta.estado}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div>
                          <span className="text-gray-500">Sede:</span>
                          <p className="font-medium">{sede?.nombre_sede || venta.sede}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Vendedor:</span>
                          <p className="font-medium">{vendedor?.nombre || venta.vendedor}</p>
                        </div>
                        {venta.cerrador && (
                          <div>
                            <span className="text-gray-500">Cerrador:</span>
                            <p className="font-medium">{venta.cerrador}</p>
                          </div>
                        )}
                        {plan && (
                          <div>
                            <span className="text-gray-500">Plan:</span>
                            <p className="font-medium">{plan.nombre_plan}</p>
                          </div>
                        )}
                        {venta.monto && (
                          <div>
                            <span className="text-gray-500">Monto:</span>
                            <p className="font-semibold text-green-600">${venta.monto.toLocaleString('es-CL')}</p>
                          </div>
                        )}
                        {venta.descuento && (
                          <div>
                            <span className="text-gray-500">Descuento:</span>
                            <p className="font-semibold text-orange-600">${venta.descuento.toLocaleString('es-CL')}</p>
                          </div>
                        )}
                        {venta.notas && (
                          <div className="col-span-2">
                            <span className="text-gray-500">Notas:</span>
                            <p className="font-medium">{venta.notas}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-1 pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditVenta(venta)}
                          title="Editar Venta"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex-1"
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteVenta(venta.id)}
                          title="Eliminar Venta"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-1"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Vista de Tabla para Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Prospecto</TableHead>
                    <TableHead>Sede</TableHead>
                    <TableHead>Tipo Venta</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Cerrador</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead className="text-right">Descuento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ventas.map((venta) => {
                    const sede = sucursales.find(s => s.id === venta.sede);
                    const vendedor = staff.find(s => s.id === venta.vendedor);
                    return (
                      <TableRow key={venta.id}>
                        <TableCell>{moment(venta.fecha_venta).format('DD/MM/YYYY')}</TableCell>
                        <TableCell>
                          {venta.fecha_vencimiento ? moment(venta.fecha_vencimiento).format('DD/MM/YYYY') : '-'}
                        </TableCell>
                        <TableCell className="font-medium">{venta.prospecto_nombre}</TableCell>
                        <TableCell>{sede?.nombre_sede || venta.sede}</TableCell>
                        <TableCell>
                          <Badge className={getTipoVentaBadgeColor(venta.tipo_venta)}>
                            {venta.tipo_venta}
                          </Badge>
                        </TableCell>
                        <TableCell>{vendedor?.nombre || venta.vendedor}</TableCell>
                       <TableCell>{venta.cerrador || '-'}</TableCell>
                      <TableCell>
                        {(() => {
                          const plan = planes.find(p => p.id === venta.plan);
                          return plan?.nombre_plan || venta.plan || '-';
                        })()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {venta.monto ? `$${venta.monto.toLocaleString('es-CL')}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {venta.descuento ? `$${venta.descuento.toLocaleString('es-CL')}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getEstadoBadgeColor(venta.estado)}>
                          {venta.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {venta.notas || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-1 justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditVenta(venta)}
                            title="Editar Venta"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteVenta(venta.id)}
                            title="Eliminar Venta"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Editar Venta */}
      <EditarVentaDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        venta={selectedVenta}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}