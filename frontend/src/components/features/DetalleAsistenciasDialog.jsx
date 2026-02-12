import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Search, Eye, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function DetalleAsistenciasDialog({ 
  open, 
  onOpenChange, 
  agendamientosData, 
  prospectosData,
  sucursales, 
  staffList,
  cerradores 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSede, setFilterSede] = useState('all');
  const [filterCerrador, setFilterCerrador] = useState('all');

  // Filtrar solo agendamientos que asistieron
  const asistenciasData = useMemo(() => {
    return agendamientosData.filter(a => a.resultado_asistencia === 'Asistió');
  }, [agendamientosData]);

  // Filtrar datos
  const filteredData = useMemo(() => {
    return asistenciasData.filter(agendamiento => {
      const matchSede = filterSede === 'all' || agendamiento.sede === filterSede;
      const matchCerrador = filterCerrador === 'all' || agendamiento.cerrador_asignado === filterCerrador;
      
      const prospecto = prospectosData.find(p => p.id === agendamiento.prospecto_id);
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || 
        prospecto?.nombre?.toLowerCase().includes(searchLower) ||
        prospecto?.whatsapp?.includes(searchTerm);
      
      return matchSede && matchCerrador && matchSearch;
    });
  }, [asistenciasData, filterSede, filterCerrador, searchTerm, prospectosData]);

  // Exportar a CSV
  const exportToCSV = () => {
    const headers = ['Nombre', 'WhatsApp', 'Fecha Visita', 'Sede', 'Vendedor', 'Cerrador Asignado', 'Tipo Visita'];
    const rows = filteredData.map(agendamiento => {
      const prospecto = prospectosData.find(p => p.id === agendamiento.prospecto_id);
      const sedeNombre = sucursales.find(s => s.id === agendamiento.sede)?.nombre_sede || 'N/A';
      const vendedorNombre = staffList.find(s => s.id === prospecto?.vendedor_asignado)?.nombre || 'N/A';
      const cerradorNombre = cerradores.find(c => c.id === agendamiento.cerrador_asignado)?.nombre_cerrador || 'N/A';
      
      return [
        prospecto?.nombre || '',
        prospecto?.whatsapp || '',
        agendamiento.fecha_hora || '',
        sedeNombre,
        vendedorNombre,
        cerradorNombre,
        agendamiento.tipo_visita || ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `asistencias_detalle_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Detalle de Asistencias ({filteredData.length} prospectos)
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
          <Select value={filterCerrador} onValueChange={setFilterCerrador}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los cerradores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los cerradores</SelectItem>
              {cerradores.map(cerrador => (
                <SelectItem key={cerrador.id} value={cerrador.id}>{cerrador.nombre_cerrador}</SelectItem>
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
                <TableHead>Nombre</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Fecha Visita</TableHead>
                <TableHead>Sede</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Cerrador</TableHead>
                <TableHead>Tipo Visita</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No hay asistencias para mostrar
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((agendamiento) => {
                  const prospecto = prospectosData.find(p => p.id === agendamiento.prospecto_id);
                  const sedeNombre = sucursales.find(s => s.id === agendamiento.sede)?.nombre_sede || 'N/A';
                  const vendedorNombre = staffList.find(s => s.id === prospecto?.vendedor_asignado)?.nombre || 'N/A';
                  const cerradorNombre = cerradores.find(c => c.id === agendamiento.cerrador_asignado)?.nombre_cerrador || 'Sin asignar';
                  
                  return (
                    <TableRow key={agendamiento.id}>
                      <TableCell className="font-medium">{prospecto?.nombre || 'N/A'}</TableCell>
                      <TableCell>{prospecto?.whatsapp || 'N/A'}</TableCell>
                      <TableCell>
                        {agendamiento.fecha_hora ? format(new Date(agendamiento.fecha_hora), 'dd/MM/yyyy HH:mm') : 'N/A'}
                      </TableCell>
                      <TableCell>{sedeNombre}</TableCell>
                      <TableCell>{vendedorNombre}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                          {cerradorNombre}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{agendamiento.tipo_visita || 'N/A'}</TableCell>
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