import React, { useState, useEffect } from 'react';
import { Leads_Diarios } from '@/entities/Leads_Diarios';
import { Prospectos } from '@/entities/Prospectos';
import { Agendamientos } from '@/entities/Agendamientos';
import { Ventas } from '@/entities/Ventas';
import { Sucursales } from '@/entities/Sucursales';
import { Staff } from '@/entities/Staff';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Filter, Pencil, Users, Calendar, TrendingUp, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';

export default function LeadsDiarios() {
  const [leads, setLeads] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [filters, setFilters] = useState({
    fechaInicio: format(new Date(), 'yyyy-MM-dd'),
    fechaFin: format(new Date(), 'yyyy-MM-dd'),
    sede: 'all',
    vendedor: 'all',
    tipoAgendamiento: 'all'
  });
  const [metricas, setMetricas] = useState({
    totalLeads: 0,
    totalAgendados: 0,
    totalAsistieron: 0,
    totalConversiones: 0,
    tasaAgendamiento: 0,
    tasaAsistencia: 0,
    tasaConversion: 0
  });

  const [formData, setFormData] = useState({
    fecha: format(new Date(), 'yyyy-MM-dd'),
    sede: '',
    turno: 'Mañana',
    vendedor: '',
    leads_totales: 0,
    no_agendados: 0,
    invitacion: 0,
    promesa_compra: 0,
    venta_online: 0
  });

  const turnos = ['Mañana', 'Tarde', 'Noche'];

  useEffect(() => {
    loadCatalogos();
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [filters]);

  const loadCatalogos = async () => {
    try {
      const [sucursalesData, staffData] = await Promise.all([
        Sucursales.list(),
        Staff.list()
      ]);
      setSucursales(sucursalesData?.filter(s => s.activa) || []);
      // Filtrar solo staff que tenga "vendedor" en el array roles Y que esté activo
      setStaff(staffData?.filter(s => s.activo && s.roles?.includes('vendedor')) || []);
    } catch (error) {
      console.error('Error cargando catálogos:', error);
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      // Cargar todos los datos necesarios
      const [leadsData, prospectosData, agendamientosData, ventasData] = await Promise.all([
        Leads_Diarios.list('-fecha'),
        Prospectos.list('-fecha_ingreso'),
        Agendamientos.list('-fecha_hora'),
        Ventas.list('-fecha_venta')
      ]);

      let result = leadsData;
      
      // Aplicar filtros en el cliente
      if (result) {
        result = result.filter(lead => {
          const leadDate = new Date(lead.fecha);
          const inicio = new Date(filters.fechaInicio);
          const fin = new Date(filters.fechaFin);
          
          if (leadDate < inicio || leadDate > fin) return false;
          if (filters.sede !== 'all' && lead.sede !== filters.sede) return false;
          if (filters.vendedor !== 'all' && lead.vendedor !== filters.vendedor) return false;
          
          // Filtro por tipo de agendamiento
          if (filters.tipoAgendamiento !== 'all') {
            if (filters.tipoAgendamiento === 'invitacion' && (!lead.invitacion || lead.invitacion === 0)) return false;
            if (filters.tipoAgendamiento === 'promesa_compra' && (!lead.promesa_compra || lead.promesa_compra === 0)) return false;
            if (filters.tipoAgendamiento === 'venta_online' && (!lead.venta_online || lead.venta_online === 0)) return false;
          }
          
          return true;
        });
      }
      
      setLeads(result || []);

      // Calcular métricas basadas en los filtros aplicados
      calcularMetricas(result || [], prospectosData || [], agendamientosData || [], ventasData || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularMetricas = (leadsFiltered, prospectos, agendamientos, ventas) => {
    // Total de leads del periodo filtrado
    const totalLeads = leadsFiltered.reduce((sum, l) => sum + (l.leads_totales || 0), 0);

    // Filtrar prospectos por el periodo y sede/vendedor
    const prospectosFiltered = prospectos.filter(p => {
      const fechaProspecto = p.fecha_ingreso || '';
      const matchFecha = fechaProspecto >= filters.fechaInicio && fechaProspecto <= filters.fechaFin;
      const matchSede = filters.sede === 'all' || p.sede === filters.sede;
      const matchVendedor = filters.vendedor === 'all' || p.vendedor_asignado === filters.vendedor;
      return matchFecha && matchSede && matchVendedor;
    });
    const totalAgendados = prospectosFiltered.length;

    // Filtrar agendamientos por el periodo y sede
    const agendamientosFiltered = agendamientos.filter(a => {
      const fechaAgenda = a.fecha_hora?.split('T')[0] || '';
      const matchFecha = fechaAgenda >= filters.fechaInicio && fechaAgenda <= filters.fechaFin;
      const matchSede = filters.sede === 'all' || a.sede === filters.sede;
      return matchFecha && matchSede;
    });

    // % Asistencia: solo contar agendamientos cuya fecha_hora ya pasó
    const hoy = new Date().toISOString();
    const agendamientosVencidos = agendamientosFiltered.filter(a => {
      const fechaVisita = a.fecha_hora || '';
      return fechaVisita <= hoy;
    });
    const totalAsistieron = agendamientosVencidos.filter(a => a.resultado_asistencia === 'Asistió').length;

    // Filtrar ventas por el periodo y sede
    const ventasFiltered = ventas.filter(v => {
      const matchFecha = v.fecha_venta >= filters.fechaInicio && v.fecha_venta <= filters.fechaFin;
      const matchSede = filters.sede === 'all' || v.sede === filters.sede;
      return v.estado === 'Cerrada' && matchFecha && matchSede;
    });
    const totalConversiones = ventasFiltered.length;

    // % Conversión: ventas del periodo / agendamientos que asistieron con fecha_visita en el periodo
    const agendamientosAsistieronPeriodo = agendamientosFiltered.filter(a => a.resultado_asistencia === 'Asistió');

    // Calcular tasas
    const tasaAgendamiento = totalLeads > 0 ? ((totalAgendados / totalLeads) * 100).toFixed(2) : 0;
    const tasaAsistencia = agendamientosVencidos.length > 0 ? ((totalAsistieron / agendamientosVencidos.length) * 100).toFixed(2) : 0;
    const tasaConversion = agendamientosAsistieronPeriodo.length > 0 ? ((totalConversiones / agendamientosAsistieronPeriodo.length) * 100).toFixed(2) : 0;

    setMetricas({
      totalLeads,
      totalAgendados,
      totalAsistieron,
      totalConversiones,
      tasaAgendamiento,
      tasaAsistencia,
      tasaConversion
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingLead) {
        await Leads_Diarios.update(editingLead.id, formData);
        setEditingLead(null);
      } else {
        await Leads_Diarios.create(formData);
      }
      setShowForm(false);
      resetForm();
      await fetchLeads();
    } catch (error) {
      console.error('Error saving lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (lead) => {
    setEditingLead(lead);
    setFormData({
      fecha: lead.fecha ? lead.fecha.split('T')[0] : '',
      sede: lead.sede,
      turno: lead.turno,
      vendedor: lead.vendedor,
      leads_totales: lead.leads_totales,
      no_agendados: lead.no_agendados || 0,
      invitacion: lead.invitacion || 0,
      promesa_compra: lead.promesa_compra || 0,
      venta_online: lead.venta_online || 0
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;
    setLoading(true);
    try {
      await Leads_Diarios.delete(id);
      await fetchLeads();
    } catch (error) {
      console.error('Error deleting lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      fecha: format(new Date(), 'yyyy-MM-dd'),
      sede: '',
      turno: 'Mañana',
      vendedor: '',
      leads_totales: 0,
      no_agendados: 0,
      invitacion: 0,
      promesa_compra: 0,
      venta_online: 0
    });
  };

  const getSedeName = (sedeId) => {
    const sede = sucursales.find(s => s.id === sedeId);
    return sede?.nombre_sede || sedeId;
  };

  const getStaffName = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember?.nombre || staffId;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Leads Diarios</h1>
        <Button onClick={() => { setEditingLead(null); resetForm(); setShowForm(!showForm); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Registro
        </Button>
      </div>

      {/* Formulario de Ingreso/Edición */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLead ? 'Editar Registro' : 'Registrar Leads del Día'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="fecha">Fecha *</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="sede">Sede *</Label>
                <Select
                  value={formData.sede}
                  onValueChange={(value) => setFormData({ ...formData, sede: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sede" />
                  </SelectTrigger>
                  <SelectContent>
                    {sucursales.map((sede) => (
                      <SelectItem key={sede.id} value={sede.id}>
                        {sede.nombre_sede}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="turno">Turno *</Label>
                <Select
                  value={formData.turno}
                  onValueChange={(value) => setFormData({ ...formData, turno: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {turnos.map((turno) => (
                      <SelectItem key={turno} value={turno}>
                        {turno}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vendedor">Vendedor *</Label>
                <Select
                  value={formData.vendedor}
                  onValueChange={(value) => setFormData({ ...formData, vendedor: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((staffMember) => (
                      <SelectItem key={staffMember.id} value={staffMember.id}>
                        {staffMember.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="leads_totales">Leads Totales *</Label>
                <Input
                  id="leads_totales"
                  type="number"
                  min="0"
                  value={formData.leads_totales}
                  onChange={(e) => setFormData({ ...formData, leads_totales: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Segmentación de Leads</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="no_agendados">No Agendados *</Label>
                  <Input
                    id="no_agendados"
                    type="number"
                    min="0"
                    value={formData.no_agendados}
                    onChange={(e) => setFormData({ ...formData, no_agendados: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="invitacion">Invitación *</Label>
                  <Input
                    id="invitacion"
                    type="number"
                    min="0"
                    value={formData.invitacion}
                    onChange={(e) => setFormData({ ...formData, invitacion: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="promesa_compra">Promesa de Compra *</Label>
                  <Input
                    id="promesa_compra"
                    type="number"
                    min="0"
                    value={formData.promesa_compra}
                    onChange={(e) => setFormData({ ...formData, promesa_compra: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="venta_online">Venta Online *</Label>
                  <Input
                    id="venta_online"
                    type="number"
                    min="0"
                    value={formData.venta_online}
                    onChange={(e) => setFormData({ ...formData, venta_online: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : editingLead ? 'Actualizar' : 'Guardar'}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingLead(null); resetForm(); }}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="filter-fecha-inicio">Fecha Inicio</Label>
              <Input
                id="filter-fecha-inicio"
                type="date"
                value={filters.fechaInicio}
                onChange={(e) => setFilters({ ...filters, fechaInicio: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="filter-fecha-fin">Fecha Fin</Label>
              <Input
                id="filter-fecha-fin"
                type="date"
                value={filters.fechaFin}
                onChange={(e) => setFilters({ ...filters, fechaFin: e.target.value })}
              />
            </div>
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
              <Select
                value={filters.vendedor}
                onValueChange={(value) => setFilters({ ...filters, vendedor: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los vendedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los vendedores</SelectItem>
                  {staff.map((staffMember) => (
                    <SelectItem key={staffMember.id} value={staffMember.id}>
                      {staffMember.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filter-tipo">Tipo Agendamiento</Label>
              <Select
                value={filters.tipoAgendamiento}
                onValueChange={(value) => setFilters({ ...filters, tipoAgendamiento: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="invitacion">Invitación</SelectItem>
                  <SelectItem value="promesa_compra">Promesa de Compra</SelectItem>
                  <SelectItem value="venta_online">Venta Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{metricas.totalLeads}</div>
                <p className="text-xs text-muted-foreground">Total Leads</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{metricas.totalAgendados}</div>
                <p className="text-xs text-muted-foreground">Agendados</p>
                <p className="text-xs text-green-600 font-medium">{metricas.tasaAgendamiento}%</p>
              </div>
              <Calendar className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{metricas.totalAsistieron}</div>
                <p className="text-xs text-muted-foreground">Asistieron</p>
                <p className="text-xs text-purple-600 font-medium">{metricas.tasaAsistencia}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{metricas.totalConversiones}</div>
                <p className="text-xs text-muted-foreground">Conversiones</p>
                <p className="text-xs text-orange-600 font-medium">{metricas.tasaConversion}%</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Leads */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Leads</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : leads.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No hay registros</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b hover:bg-gray-50">
                    <th className="text-left p-2 font-medium">Fecha</th>
                    <th className="text-left p-2 font-medium">Sede</th>
                    <th className="text-left p-2 font-medium">Turno</th>
                    <th className="text-left p-2 font-medium">Vendedor</th>
                    <TableHead className="text-right">Leads Totales</th>
                    <TableHead className="text-right">No Agendados</th>
                    <TableHead className="text-right">Invitación</th>
                    <TableHead className="text-right">Promesa Compra</th>
                    <TableHead className="text-right">Venta Online</th>
                    <TableHead className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <td className="p-2">{lead.fecha ? lead.fecha.split('T')[0].split('-').reverse().join('/') : ''}</td>
                      <td className="p-2">{getSedeName(lead.sede)}</td>
                      <td className="p-2">{lead.turno || '-'}</td>
                      <td className="p-2">{getStaffName(lead.vendedor)}</td>
                      <TableCell className="text-right font-medium">{lead.leads_totales}</td>
                      <TableCell className="text-right">{lead.no_agendados || 0}</td>
                      <TableCell className="text-right">{lead.invitacion || 0}</td>
                      <TableCell className="text-right">{lead.promesa_compra || 0}</td>
                      <TableCell className="text-right">{lead.venta_online || 0}</td>
                      <TableCell className="text-center">
                        <div className="flex gap-1 justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(lead)}
                          >
                            <Pencil className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(lead.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}