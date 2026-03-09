import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Search, Eye } from 'lucide-react';
import { format } from 'date-fns';

export default function DetalleLeadsDialog({ open, onOpenChange, leadsData, sucursales, staffList }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSede, setFilterSede] = useState('all');
  const [filterVendedor, setFilterVendedor] = useState('all');

  // Filtrar datos
  const filteredData = useMemo(() => {
    return leadsData.filter(lead => {
      const matchSede = filterSede === 'all' || lead.sede === filterSede;
      const matchVendedor = filterVendedor === 'all' || lead.vendedor === filterVendedor;
      
      const sedeNombre = sucursales.find(s => s.id === lead.sede)?.nombre_sede || '';
      const vendedorNombre = staffList.find(s => s.id === lead.vendedor)?.nombre || '';
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || 
        sedeNombre.toLowerCase().includes(searchLower) ||
        vendedorNombre.toLowerCase().includes(searchLower) ||
        lead.fecha?.includes(searchTerm);
      
      return matchSede && matchVendedor && matchSearch;
    });
  }, [leadsData, filterSede, filterVendedor, searchTerm, sucursales, staffList]);

  // Exportar a CSV
  const exportToCSV = () => {
    const headers = ['Fecha', 'Sede', 'Vendedor', 'Turno', 'Leads Totales', 'No Agendados', 'Invitación', 'Promesa Compra', 'Venta Online'];
    const rows = filteredData.map(lead => {
      const sedeNombre = sucursales.find(s => s.id === lead.sede)?.nombre_sede || 'N/A';
      const vendedorNombre = staffList.find(s => s.id === lead.vendedor)?.nombre || 'N/A';
      
      return [
        lead.fecha || '',
        sedeNombre,
        vendedorNombre,
        lead.turno || '',
        lead.leads_totales || 0,
        lead.leads_no_agendados || 0,
        lead.leads_invitacion || 0,
        lead.leads_promesa_compra || 0,
        lead.leads_venta_online || 0
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `leads_detalle_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const totalLeads = filteredData.reduce((sum, l) => sum + (l.leads_totales || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Detalle de Leads ({filteredData.length} registros - {totalLeads} leads totales)
          </DialogTitle>
        </DialogHeader>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar..."
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
          <Select value={filterVendedor} onValueChange={setFilterVendedor}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los vendedores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los vendedores</SelectItem>
              {staffList.map(staff => (
                <SelectItem key={staff.id} value={staff.id}>{staff.nombre}</SelectItem>
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b hover:bg-gray-50">
                <th className="text-left p-2 font-medium">Fecha</th>
                <th className="text-left p-2 font-medium">Sede</th>
                <th className="text-left p-2 font-medium">Vendedor</th>
                <th className="text-left p-2 font-medium">Turno</th>
                <TableHead className="text-right">Total</th>
                <TableHead className="text-right">No Agendados</th>
                <TableHead className="text-right">Invitación</th>
                <TableHead className="text-right">Promesa</th>
                <TableHead className="text-right">Venta Online</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr className="border-b hover:bg-gray-50">
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No hay leads para mostrar
                  </td>
                </tr>
              ) : (
                filteredData.map((lead, idx) => {
                  const sedeNombre = sucursales.find(s => s.id === lead.sede)?.nombre_sede || 'N/A';
                  const vendedorNombre = staffList.find(s => s.id === lead.vendedor)?.nombre || 'N/A';
                  
                  return (
                    <TableRow key={idx}>
                      <td className="p-2">{lead.fecha ? format(new Date(lead.fecha + 'T00:00:00'), 'dd/MM/yyyy') : 'N/A'}</td>
                      <td className="p-2">{sedeNombre}</td>
                      <td className="p-2">{vendedorNombre}</td>
                      <td className="p-2">{lead.turno || 'N/A'}</td>
                      <TableCell className="text-right font-semibold">{lead.leads_totales || 0}</td>
                      <TableCell className="text-right">{lead.leads_no_agendados || 0}</td>
                      <TableCell className="text-right">{lead.leads_invitacion || 0}</td>
                      <TableCell className="text-right">{lead.leads_promesa_compra || 0}</td>
                      <TableCell className="text-right">{lead.leads_venta_online || 0}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}