import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Search, Eye, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export default function DetalleAgendamientosDialog({ open, onOpenChange, prospectosData, sucursales, staffList }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSede, setFilterSede] = useState('all');
  const [filterVendedor, setFilterVendedor] = useState('all');

  // Filtrar datos
  const filteredData = useMemo(() => {
    return prospectosData.filter(prospecto => {
      const matchSede = filterSede === 'all' || prospecto.sede === filterSede;
      const matchVendedor = filterVendedor === 'all' || prospecto.vendedor_asignado === filterVendedor;
      
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || 
        prospecto.nombre?.toLowerCase().includes(searchLower) ||
        prospecto.whatsapp?.includes(searchTerm) ||
        prospecto.correo?.toLowerCase().includes(searchLower);
      
      return matchSede && matchVendedor && matchSearch;
    });
  }, [prospectosData, filterSede, filterVendedor, searchTerm]);

  // Exportar a CSV
  const exportToCSV = () => {
    const headers = ['Nombre', 'WhatsApp', 'Correo', 'Fecha Ingreso', 'Sede', 'Vendedor', 'Estado Pipeline', 'Tipo Invitación'];
    const rows = filteredData.map(prospecto => {
      const sedeNombre = sucursales.find(s => s.id === prospecto.sede)?.nombre_sede || 'N/A';
      const vendedorNombre = staffList.find(s => s.id === prospecto.vendedor_asignado)?.nombre || 'N/A';
      
      return [
        prospecto.nombre || '',
        prospecto.whatsapp || '',
        prospecto.correo || '',
        prospecto.fecha_ingreso || '',
        sedeNombre,
        vendedorNombre,
        prospecto.estado_pipeline || '',
        prospecto.tipo_invitacion || ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `agendamientos_detalle_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Detalle de Agendamientos ({filteredData.length} prospectos)
          </DialogTitle>
        </DialogHeader>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por nombre, whatsapp..."
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
                <th className="text-left p-2 font-medium">Nombre</th>
                <th className="text-left p-2 font-medium">WhatsApp</th>
                <th className="text-left p-2 font-medium">Correo</th>
                <th className="text-left p-2 font-medium">Fecha Ingreso</th>
                <th className="text-left p-2 font-medium">Sede</th>
                <th className="text-left p-2 font-medium">Vendedor</th>
                <th className="text-left p-2 font-medium">Estado</th>
                <th className="text-left p-2 font-medium">Tipo Invitación</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr className="border-b hover:bg-gray-50">
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No hay prospectos agendados para mostrar
                  </td>
                </tr>
              ) : (
                filteredData.map((prospecto) => {
                  const sedeNombre = sucursales.find(s => s.id === prospecto.sede)?.nombre_sede || 'N/A';
                  const vendedorNombre = staffList.find(s => s.id === prospecto.vendedor_asignado)?.nombre || 'N/A';
                  
                  return (
                    <TableRow key={prospecto.id}>
                      <TableCell className="font-medium">{prospecto.nombre || 'N/A'}</td>
                      <td className="p-2">{prospecto.whatsapp || 'N/A'}</td>
                      <TableCell className="text-sm">{prospecto.correo || 'N/A'}</td>
                      <td className="p-2">
                        {prospecto.fecha_ingreso ? format(new Date(prospecto.fecha_ingreso + 'T00:00:00'), 'dd/MM/yyyy') : 'N/A'}
                      </td>
                      <td className="p-2">{sedeNombre}</td>
                      <td className="p-2">{vendedorNombre}</td>
                      <td className="p-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {prospecto.estado_pipeline || 'N/A'}
                        </span>
                      </td>
                      <TableCell className="text-sm">{prospecto.tipo_invitacion || 'N/A'}</td>
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