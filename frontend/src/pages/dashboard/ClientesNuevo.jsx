import React, { useState, useEffect } from 'react';
import { Ventas } from '@/entities/Ventas';
import { Prospectos } from '@/entities/Prospectos';
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
import { Filter, Users, TrendingUp, DollarSign, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import moment from 'moment';

const ITEMS_PER_PAGE = 25;

export default function ClientesNuevo() {
  const [clientes, setClientes] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [prospectos, setProspectos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [staff, setStaff] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedCliente, setExpandedCliente] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    sede: 'all',
    busqueda: '',
    fecha_desde: '',
    fecha_hasta: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (ventas.length > 0 && prospectos.length > 0) {
      procesarClientes();
    }
  }, [filters, ventas, prospectos]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ventasData, prospectosData, sucursalesData, staffData, planesData] = await Promise.all([
        Ventas.filter({}, '-fecha_venta'),
        Prospectos.filter({}, '-createdAt'),
        Sucursales.list(),
        Staff.list(),
        Planes_Servicios.list()
      ]);
      
      setVentas(ventasData || []);
      setProspectos(prospectosData || []);
      setSucursales(sucursalesData?.filter(s => s.activa) || []);
      setStaff(staffData || []);
      setPlanes(planesData?.filter(p => p.activo) || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const procesarClientes = () => {
    // Crear mapa de prospecto_id -> datos del prospecto
    const prospectoMap = {};
    prospectos.forEach(p => {
      prospectoMap[p.id] = p;
    });

    // Crear mapa de planes para verificar tipo
    const planesMap = {};
    planes.forEach(p => {
      planesMap[p.id] = p;
    });

    // Agrupar ventas por whatsapp (solo Planes y Programas, NO Servicios)
    const clientesPorWhatsapp = {};
    
    ventas.forEach(venta => {
      const prospecto = prospectoMap[venta.prospecto_id];
      
      if (!prospecto || !prospecto.whatsapp) {
        console.warn(`Prospecto no encontrado o sin whatsapp para venta ${venta.id}`);
        return;
      }

      // Verificar que sea Plan o Programa (NO Servicio)
      const plan = planesMap[venta.plan];
      const tipoItem = plan?.tipo_item || '';
      
      if (tipoItem !== 'Plan' && tipoItem !== 'Programa') {
        // Excluir servicios
        return;
      }

      const whatsapp = prospecto.whatsapp;
      
      if (!clientesPorWhatsapp[whatsapp]) {
        clientesPorWhatsapp[whatsapp] = {
          whatsapp: whatsapp,
          nombre: prospecto.nombre,
          correo: prospecto.correo,
          sede_id: prospecto.sede,
          ventas: []
        };
      }
      
      clientesPorWhatsapp[whatsapp].ventas.push({
        ...venta,
        prospecto: prospecto
      });
    });

    // Convertir a array
    let clientesArray = Object.values(clientesPorWhatsapp);

    // Aplicar filtros
    if (filters.sede && filters.sede !== 'all') {
      clientesArray = clientesArray.filter(c => c.sede_id === filters.sede);
    }

    if (filters.busqueda) {
      const busqueda = filters.busqueda.toLowerCase();
      clientesArray = clientesArray.filter(c => 
        c.nombre?.toLowerCase().includes(busqueda) ||
        c.whatsapp?.includes(busqueda)
      );
    }

    if (filters.fecha_desde || filters.fecha_hasta) {
      clientesArray = clientesArray.filter(c => {
        const ventasFiltradas = c.ventas.filter(v => {
          if (filters.fecha_desde && moment(v.fecha_venta).isBefore(moment(filters.fecha_desde), 'day')) {
            return false;
          }
          if (filters.fecha_hasta && moment(v.fecha_venta).isAfter(moment(filters.fecha_hasta), 'day')) {
            return false;
          }
          return true;
        });
        return ventasFiltradas.length > 0;
      });
    }

    // Ordenar por cantidad de ventas (renovaciones) descendente
    clientesArray.sort((a, b) => b.ventas.length - a.ventas.length);

    setClientes(clientesArray);
  };

  const calcularMetricas = () => {
    const totalClientes = clientes.length;
    const clientesConRenovaciones = clientes.filter(c => c.ventas.length > 1).length;
    const tasaRenovacion = totalClientes > 0 ? ((clientesConRenovaciones / totalClientes) * 100).toFixed(1) : 0;
    
    const montoTotal = clientes.reduce((sum, c) => {
      const montoCliente = c.ventas
        .filter(v => v.estado === 'Cerrada' && v.monto)
        .reduce((s, v) => s + (v.monto || 0), 0);
      return sum + montoCliente;
    }, 0);

    return { totalClientes, clientesConRenovaciones, tasaRenovacion, montoTotal };
  };

  const metricas = calcularMetricas();

  // Pagination calculations
  const totalItems = clientes.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedClientes = clientes.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Pagination component renderer
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
        <div className="text-sm text-gray-600">
          Mostrando {startIndex + 1} - {Math.min(endIndex, totalItems)} de {totalItems} registros
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
          >
            Primera
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                return page === 1 ||
                       page === totalPages ||
                       Math.abs(page - currentPage) <= 1;
              })
              .reduce((acc, page, idx, arr) => {
                if (idx > 0 && page - arr[idx - 1] > 1) {
                  acc.push('...');
                }
                acc.push(page);
                return acc;
              }, [])
              .map((item, idx) => (
                item === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">...</span>
                ) : (
                  <Button
                    key={item}
                    variant={currentPage === item ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => handlePageChange(item)}
                  >
                    {item}
                  </Button>
                )
              ))
            }
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            Última
          </Button>
        </div>
      </div>
    );
  };

  const toggleExpand = (whatsapp) => {
    setExpandedCliente(expandedCliente === whatsapp ? null : whatsapp);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Clientes</h1>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold">{metricas.totalClientes}</div>
            <p className="text-xs text-muted-foreground">Total Clientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{metricas.clientesConRenovaciones}</div>
            <p className="text-xs text-muted-foreground">Con Renovaciones</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-green-600">{metricas.tasaRenovacion}%</div>
            <p className="text-xs text-muted-foreground">Tasa Renovación</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-lg sm:text-2xl font-bold text-purple-600">
              ${metricas.montoTotal.toLocaleString('es-CL')}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <Label htmlFor="filter-busqueda">Buscar</Label>
              <Input
                id="filter-busqueda"
                value={filters.busqueda}
                onChange={(e) => setFilters({ ...filters, busqueda: e.target.value })}
                placeholder="Nombre o WhatsApp"
              />
            </div>
            <div>
              <Label htmlFor="fecha-desde">Fecha Desde</Label>
              <Input
                id="fecha-desde"
                type="date"
                value={filters.fecha_desde}
                onChange={(e) => setFilters({ ...filters, fecha_desde: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="fecha-hasta">Fecha Hasta</Label>
              <Input
                id="fecha-hasta"
                type="date"
                value={filters.fecha_hasta}
                onChange={(e) => setFilters({ ...filters, fecha_hasta: e.target.value })}
              />
            </div>
          </div>
          
          {(filters.busqueda || filters.fecha_desde || filters.fecha_hasta || filters.sede !== 'all') && (
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({
                  sede: 'all',
                  busqueda: '',
                  fecha_desde: '',
                  fecha_hasta: ''
                })}
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla de Clientes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Listado de Clientes ({clientes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : clientes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No hay clientes registrados</p>
            </div>
          ) : (
            <>
              {/* Vista de Tarjetas para Móvil */}
              <div className="block md:hidden space-y-3">
                {paginatedClientes.map((cliente) => {
                  const sede = sucursales.find(s => s.id === cliente.sede_id);
                  const isExpanded = expandedCliente === cliente.whatsapp;
                  const totalVentas = cliente.ventas.length;
                  const montoTotal = cliente.ventas
                    .filter(v => v.estado === 'Cerrada' && v.monto)
                    .reduce((sum, v) => sum + (v.monto || 0), 0);
                  
                  return (
                    <div key={cliente.whatsapp} className="border rounded-lg p-3 bg-white shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">{cliente.nombre}</h3>
                          <p className="text-xs text-gray-500">{cliente.whatsapp}</p>
                          {sede && <p className="text-xs text-gray-500">{sede.nombre_sede}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className="bg-blue-100 text-blue-800 text-xs">
                            {totalVentas} {totalVentas === 1 ? 'venta' : 'ventas'}
                          </Badge>
                          {totalVentas > 1 && (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              {totalVentas - 1} renovaciones
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-xs mb-2">
                        <span className="text-gray-500">Monto Total:</span>
                        <span className="font-semibold text-green-600 ml-2">
                          ${montoTotal.toLocaleString('es-CL')}
                        </span>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(cliente.whatsapp)}
                        className="w-full text-xs"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-4 h-4 mr-1" />
                            Ocultar historial
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4 mr-1" />
                            Ver historial de ventas
                          </>
                        )}
                      </Button>
                      
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          {cliente.ventas
                            .sort((a, b) => new Date(b.fecha_venta) - new Date(a.fecha_venta))
                            .map((venta, idx) => {
                              const plan = planes.find(p => p.id === venta.plan);
                              const vendedor = staff.find(s => s.id === venta.vendedor);
                              
                              return (
                                <div key={venta.id} className="bg-gray-50 p-2 rounded text-xs">
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="font-semibold">
                                      {idx === 0 ? 'Última venta' : `Renovación ${cliente.ventas.length - idx}`}
                                    </span>
                                    <Badge className={venta.tipo_venta === 'Online' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
                                      {venta.tipo_venta}
                                    </Badge>
                                  </div>
                                  <div className="space-y-1 text-gray-600">
                                    <div>Fecha: {format(new Date(venta.fecha_venta), 'dd/MM/yyyy')}</div>
                                    {plan && <div>Plan: {plan.nombre_plan}</div>}
                                    {vendedor && <div>Vendedor: {vendedor.nombre}</div>}
                                    {venta.monto && (
                                      <div className="font-semibold text-green-600">
                                        Monto: ${venta.monto.toLocaleString('es-CL')}
                                      </div>
                                    )}
                                    {venta.notas && <div>Notas: {venta.notas}</div>}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Vista de Tabla para Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Sede</TableHead>
                      <TableHead className="text-center">Total Ventas</TableHead>
                      <TableHead className="text-center">Renovaciones</TableHead>
                      <TableHead className="text-right">Monto Total</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedClientes.map((cliente) => {
                      const sede = sucursales.find(s => s.id === cliente.sede_id);
                      const isExpanded = expandedCliente === cliente.whatsapp;
                      const totalVentas = cliente.ventas.length;
                      const renovaciones = totalVentas - 1;
                      const montoTotal = cliente.ventas
                        .filter(v => v.estado === 'Cerrada' && v.monto)
                        .reduce((sum, v) => sum + (v.monto || 0), 0);
                      
                      return (
                        <React.Fragment key={cliente.whatsapp}>
                          <TableRow>
                            <TableCell className="font-medium">{cliente.nombre}</TableCell>
                            <TableCell>{cliente.whatsapp}</TableCell>
                            <TableCell>{sede?.nombre_sede || '-'}</TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-blue-100 text-blue-800">
                                {totalVentas}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {renovaciones > 0 ? (
                                <Badge className="bg-green-100 text-green-800">
                                  {renovaciones}
                                </Badge>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-green-600">
                              ${montoTotal.toLocaleString('es-CL')}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpand(cliente.whatsapp)}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                          
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={7} className="bg-gray-50">
                                <div className="p-4">
                                  <h4 className="font-semibold mb-3">Historial de Ventas</h4>
                                  <div className="space-y-2">
                                    {cliente.ventas
                                      .sort((a, b) => new Date(b.fecha_venta) - new Date(a.fecha_venta))
                                      .map((venta, idx) => {
                                        const plan = planes.find(p => p.id === venta.plan);
                                        const vendedor = staff.find(s => s.id === venta.vendedor);
                                        
                                        return (
                                          <div key={venta.id} className="bg-white p-3 rounded border">
                                            <div className="grid grid-cols-6 gap-4 text-sm">
                                              <div>
                                                <span className="text-gray-500">Tipo:</span>
                                                <div className="font-medium">
                                                  {idx === 0 ? 'Última venta' : `Renovación ${cliente.ventas.length - idx}`}
                                                </div>
                                              </div>
                                              <div>
                                                <span className="text-gray-500">Fecha:</span>
                                                <div className="font-medium">
                                                  {format(new Date(venta.fecha_venta), 'dd/MM/yyyy')}
                                                </div>
                                              </div>
                                              <div>
                                                <span className="text-gray-500">Canal:</span>
                                                <div>
                                                  <Badge className={venta.tipo_venta === 'Online' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
                                                    {venta.tipo_venta}
                                                  </Badge>
                                                </div>
                                              </div>
                                              <div>
                                                <span className="text-gray-500">Plan:</span>
                                                <div className="font-medium">{plan?.nombre_plan || '-'}</div>
                                              </div>
                                              <div>
                                                <span className="text-gray-500">Vendedor:</span>
                                                <div className="font-medium">{vendedor?.nombre || '-'}</div>
                                              </div>
                                              <div>
                                                <span className="text-gray-500">Monto:</span>
                                                <div className="font-semibold text-green-600">
                                                  {venta.monto ? `$${venta.monto.toLocaleString('es-CL')}` : '-'}
                                                </div>
                                              </div>
                                            </div>
                                            {venta.notas && (
                                              <div className="mt-2 text-sm text-gray-600">
                                                <span className="font-medium">Notas:</span> {venta.notas}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {renderPagination()}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}