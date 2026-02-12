import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Search, Eye, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';

export default function DetalleVentasDialog({ 
  open, 
  onOpenChange, 
  ventasData,
  prospectosData,
  planesData,
  sucursales, 
  staffList,
  cerradores 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSede, setFilterSede] = useState('all');
  const [filterTipoVenta, setFilterTipoVenta] = useState('all');
  const [filterPlan, setFilterPlan] = useState('all');

  // Filtrar datos
  const filteredData = useMemo(() => {
    return ventasData.filter(venta => {
      const matchSede = filterSede === 'all' || venta.sede === filterSede;
      const matchTipo = filterTipoVenta === 'all' || venta.tipo_venta === filterTipoVenta;
      const matchPlan = filterPlan === 'all' || venta.plan === filterPlan;
      
      const prospecto = prospectosData.find(p => p.id === venta.prospecto_id);
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || 
        prospecto?.nombre?.toLowerCase().includes(searchLower) ||
        prospecto?.whatsapp?.includes(searchTerm) ||
        venta.prospecto_nombre?.toLowerCase().includes(searchLower);
      
      return matchSede && matchTipo && matchPlan && matchSearch;
    });
  }, [ventasData, filterSede, filterTipoVenta, filterPlan, searchTerm, prospectosData]);

  // Calcular totales
  const totalMonto = filteredData.reduce((sum, v) => sum + (parseFloat(v.monto) || 0), 0);
  const ticketPromedio = filteredData.length > 0 ? (totalMonto / filteredData.length) : 0;

  // Exportar a CSV
  const exportToCSV = () => {
    const headers = ['Cliente', 'WhatsApp', 'Fecha Venta', 'Tipo Venta', 'Sede', 'Plan', 'Monto', 'Vendedor', 'Cerrador', 'Estado'];
    const rows = filteredData.map(venta => {
      const prospecto = prospectosData.find(p => p.id === venta.prospecto_id);
      const sedeNombre = sucursales.find(s => s.id === venta.sede)?.nombre_sede || 'N/A';
      const planNombre = planesData.find(p => p.id === venta.plan)?.nombre_plan || 'N/A';
      const vendedorNombre = staffList.find(s => s.id === venta.vendedor)?.nombre || 'N/A';
      const cerradorNombre = cerradores.find(c => c.id === venta.cerrador)?.nombre_cerrador || 'N/A';
      
      return [
        venta.prospecto_nombre || prospecto?.nombre || '',
        prospecto?.whatsapp || '',
        venta.fecha_venta || '',
        venta.tipo_venta || '',
        sedeNombre,
        planNombre,
        venta.monto || 0,
        vendedorNombre,
        cerradorNombre,
        venta.estado || ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ventas_detalle_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-600" />
            Detalle de Ventas ({filteredData.length} ventas)
          </DialogTitle>
          <div className="flex gap-4 text-sm mt-2">
            <span className="text-gray-600">
              <strong>Total:</strong> ${totalMonto.toLocaleString('es-CL')}
            </span>
            <span className="text-gray-600">
              <strong>Ticket Promedio:</strong> ${ticketPromedio.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </DialogHeader>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterSede} onValueChange={setFilterSede}>
            <SelectTrigger>
              <SelectValue placeholder="Todas las sedes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las sedes</SelectItem>
              {sucursales.map(sede => (
                <SelectItem key={sede.id} value={sede.id}>{sede.nombre_sede}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTipoVenta} onValueChange={setFilterTipoVenta}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo de venta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="Online">Online</SelectItem>
              <SelectItem value="En sede">En sede</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPlan} onValueChange={setFilterPlan}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los planes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los planes</SelectItem>
              {planesData.map(plan => (
                <SelectItem key={plan.id} value={plan.id}>{plan.nombre_plan}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={exportToCSV} variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        {/* Tabla */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Sede</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Cerrador</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                    No hay ventas para mostrar
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((venta) => {
                  const prospecto = prospectosData.find(p => p.id === venta.prospecto_id);
                  const sedeNombre = sucursales.find(s => s.id === venta.sede)?.nombre_sede || 'N/A';
                  const planNombre = planesData.find(p => p.id === venta.plan)?.nombre_plan || 'N/A';
                  const vendedorNombre = staffList.find(s => s.id === venta.vendedor)?.nombre || 'N/A';
                  const cerradorNombre = cerradores.find(c => c.id === venta.cerrador)?.nombre_cerrador || '-';
                  
                  return (
                    <TableRow key={venta.id}>
                      <TableCell className="font-medium">
                        {venta.prospecto_nombre || prospecto?.nombre || 'N/A'}
                      </TableCell>
                      <TableCell>{prospecto?.whatsapp || 'N/A'}</TableCell>
                      <TableCell>
                        {venta.fecha_venta ? format(new Date(venta.fecha_venta + 'T00:00:00'), 'dd/MM/yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          venta.tipo_venta === 'Online' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {venta.tipo_venta || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{sedeNombre}</TableCell>
                      <TableCell className="text-sm">{planNombre}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ${parseFloat(venta.monto || 0).toLocaleString('es-CL')}
                      </TableCell>
                      <TableCell className="text-sm">{vendedorNombre}</TableCell>
                      <TableCell className="text-sm">{cerradorNombre}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          venta.estado === 'Cerrada' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {venta.estado || 'N/A'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}