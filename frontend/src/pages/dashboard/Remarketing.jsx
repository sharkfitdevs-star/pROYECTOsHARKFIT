import React, { useState, useEffect } from 'react';
import { Remarketing } from '@/entities/Remarketing';
import { Staff } from '@/entities/Staff';
import { Sucursales } from '@/entities/Sucursales';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, MessageSquare, Users, Calendar, TrendingUp } from 'lucide-react';
import moment from 'moment';

export default function RemarketingPage() {
  const [bloques, setBloques] = useState([]);
  const [staff, setStaff] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Formulario
  const [formData, setFormData] = useState({
    fecha: moment().format('YYYY-MM-DD'),
    vendedor: '',
    sede: '',
    mensajes_enviados: '',
    respuestas: '',
    agendamientos: '',
    ventas: '',
    notas: ''
  });

  // Filtros
  const [filtros, setFiltros] = useState({
    fechaInicio: moment().startOf('month').format('YYYY-MM-DD'),
    fechaFin: moment().format('YYYY-MM-DD'),
    sede: 'todas',
    vendedor: 'todos'
  });

  // Métricas
  const [metricas, setMetricas] = useState({
    totalMensajes: 0,
    totalRespuestas: 0,
    totalAgendamientos: 0,
    totalVentas: 0,
    tasaRespuesta: 0,
    tasaAgendamiento: 0,
    tasaConversion: 0
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    cargarBloques();
  }, [filtros]);

  useEffect(() => {
    calcularMetricas();
  }, [bloques]);

  const cargarDatos = async () => {
    try {
      const [staffData, sedesData] = await Promise.all([
        Staff.list(),
        Sucursales.list()
      ]);
      // Filtrar solo staff que tenga "vendedor" en el array roles Y que esté activo
      setStaff(staffData.filter(s => s.activo && s.roles?.includes('vendedor')));
      setSedes(sedesData.filter(s => s.activa));
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const cargarBloques = async () => {
    try {
      setLoading(true);
      let bloquesData = await Remarketing.list('-fecha');

      // Aplicar filtros
      bloquesData = bloquesData.filter(bloque => {
        const fechaBloque = moment(bloque.fecha);
        const dentroRango = fechaBloque.isBetween(filtros.fechaInicio, filtros.fechaFin, 'day', '[]');
        const coincideSede = filtros.sede === 'todas' || bloque.sede === filtros.sede;
        const coincideVendedor = filtros.vendedor === 'todos' || bloque.vendedor === filtros.vendedor;
        
        return dentroRango && coincideSede && coincideVendedor;
      });

      setBloques(bloquesData);
    } catch (error) {
      console.error('Error cargando bloques:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularMetricas = () => {
    const totalMensajes = bloques.reduce((sum, b) => sum + (b.mensajes_enviados || 0), 0);
    const totalRespuestas = bloques.reduce((sum, b) => sum + (b.respuestas || 0), 0);
    const totalAgendamientos = bloques.reduce((sum, b) => sum + (b.agendamientos || 0), 0);
    const totalVentas = bloques.reduce((sum, b) => sum + (b.ventas || 0), 0);

    const tasaRespuesta = totalMensajes > 0 ? (totalRespuestas / totalMensajes * 100) : 0;
    const tasaAgendamiento = totalRespuestas > 0 ? (totalAgendamientos / totalRespuestas * 100) : 0;
    const tasaConversion = totalAgendamientos > 0 ? (totalVentas / totalAgendamientos * 100) : 0;

    setMetricas({
      totalMensajes,
      totalRespuestas,
      totalAgendamientos,
      totalVentas,
      tasaRespuesta,
      tasaAgendamiento,
      tasaConversion
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.vendedor || !formData.sede || !formData.mensajes_enviados) {
      alert('Por favor completa los campos obligatorios: Vendedor, Sede y Mensajes Enviados');
      return;
    }

    try {
      setLoading(true);
      await Remarketing.create({
        fecha: formData.fecha,
        vendedor: formData.vendedor,
        sede: formData.sede,
        mensajes_enviados: parseInt(formData.mensajes_enviados) || 0,
        respuestas: parseInt(formData.respuestas) || 0,
        agendamientos: parseInt(formData.agendamientos) || 0,
        ventas: parseInt(formData.ventas) || 0,
        notas: formData.notas
      });

      // Resetear formulario
      setFormData({
        fecha: moment().format('YYYY-MM-DD'),
        vendedor: '',
        sede: '',
        mensajes_enviados: '',
        respuestas: '',
        agendamientos: '',
        ventas: '',
        notas: ''
      });

      await cargarBloques();
      alert('Bloque de remarketing registrado exitosamente');
    } catch (error) {
      console.error('Error registrando bloque:', error);
      alert('Error al registrar el bloque de remarketing');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este bloque de remarketing?')) return;

    try {
      setLoading(true);
      await Remarketing.delete(id);
      await cargarBloques();
      alert('Bloque eliminado exitosamente');
    } catch (error) {
      console.error('Error eliminando bloque:', error);
      alert('Error al eliminar el bloque');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Remarketing</h1>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={filtros.fechaInicio}
                onChange={(e) => setFiltros({ ...filtros, fechaInicio: e.target.value })}
              />
            </div>
            <div>
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={filtros.fechaFin}
                onChange={(e) => setFiltros({ ...filtros, fechaFin: e.target.value })}
              />
            </div>
            <div>
              <Label>Sede</Label>
              <Select value={filtros.sede} onValueChange={(value) => setFiltros({ ...filtros, sede: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las sedes</SelectItem>
                  {sedes.map(sede => (
                    <SelectItem key={sede.id} value={sede.nombre_sede}>
                      {sede.nombre_sede}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vendedor</Label>
              <Select value={filtros.vendedor} onValueChange={(value) => setFiltros({ ...filtros, vendedor: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los vendedores</SelectItem>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.nombre}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Mensajes</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.totalMensajes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tasa Respuesta: {metricas.tasaRespuesta.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Respuestas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.totalRespuestas}</div>
            <p className="text-xs text-muted-foreground mt-1">
              De {metricas.totalMensajes} mensajes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamientos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.totalAgendamientos}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tasa: {metricas.tasaAgendamiento.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.totalVentas}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Conversión: {metricas.tasaConversion.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Formulario de Registro */}
      <Card>
        <CardHeader>
          <CardTitle>Registrar Bloque de Remarketing</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Vendedor *</Label>
                <Select value={formData.vendedor} onValueChange={(value) => setFormData({ ...formData, vendedor: value })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map(s => (
                      <SelectItem key={s.id} value={s.nombre}>
                        {s.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sede *</Label>
                <Select value={formData.sede} onValueChange={(value) => setFormData({ ...formData, sede: value })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sede" />
                  </SelectTrigger>
                  <SelectContent>
                    {sedes.map(sede => (
                      <SelectItem key={sede.id} value={sede.nombre_sede}>
                        {sede.nombre_sede}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Mensajes Enviados *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.mensajes_enviados}
                  onChange={(e) => setFormData({ ...formData, mensajes_enviados: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <Label>Respuestas</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.respuestas}
                  onChange={(e) => setFormData({ ...formData, respuestas: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Agendamientos</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.agendamientos}
                  onChange={(e) => setFormData({ ...formData, agendamientos: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Ventas</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.ventas}
                  onChange={(e) => setFormData({ ...formData, ventas: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Comentarios sobre el bloque de trabajo..."
                rows={3}
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Registrar Bloque'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tabla de Bloques */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Bloques de Remarketing</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-4">Cargando...</p>
          ) : bloques.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">No hay bloques registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Fecha</th>
                    <th className="text-left p-2">Vendedor</th>
                    <th className="text-left p-2">Sede</th>
                    <th className="text-center p-2">Mensajes</th>
                    <th className="text-center p-2">Respuestas</th>
                    <th className="text-center p-2">Agendados</th>
                    <th className="text-center p-2">Ventas</th>
                    <th className="text-center p-2">Tasa Resp.</th>
                    <th className="text-center p-2">Tasa Conv.</th>
                    <th className="text-left p-2">Notas</th>
                    <th className="text-center p-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {bloques.map(bloque => {
                    const tasaResp = bloque.mensajes_enviados > 0 
                      ? ((bloque.respuestas || 0) / bloque.mensajes_enviados * 100).toFixed(1) 
                      : '0.0';
                    const tasaConv = (bloque.agendamientos || 0) > 0 
                      ? ((bloque.ventas || 0) / bloque.agendamientos * 100).toFixed(1) 
                      : '0.0';

                    return (
                      <tr key={bloque.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">{moment(bloque.fecha).format('DD/MM/YYYY')}</td>
                        <td className="p-2">{bloque.vendedor}</td>
                        <td className="p-2">{bloque.sede}</td>
                        <td className="text-center p-2">{bloque.mensajes_enviados || 0}</td>
                        <td className="text-center p-2">{bloque.respuestas || 0}</td>
                        <td className="text-center p-2">{bloque.agendamientos || 0}</td>
                        <td className="text-center p-2">{bloque.ventas || 0}</td>
                        <td className="text-center p-2">{tasaResp}%</td>
                        <td className="text-center p-2">{tasaConv}%</td>
                        <td className="p-2 max-w-xs truncate">{bloque.notas || '-'}</td>
                        <td className="text-center p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEliminar(bloque.id)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}