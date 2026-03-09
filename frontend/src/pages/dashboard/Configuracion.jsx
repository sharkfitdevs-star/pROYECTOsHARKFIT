import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Sucursales } from '@/entities/Sucursales';
import { Staff } from '@/entities/Staff';
import { Cerradores } from '@/entities/Cerradores';
import { Planes_Servicios } from '@/entities/Planes_Servicios';
import { Roles } from '@/entities/Roles';
import { Clases } from '@/entities/Clases';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

export default function Configuracion() {
  const [sucursales, setSucursales] = useState([]);
  const [staff, setStaff] = useState([]);
  const [cerradores, setCerradores] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [clases, setClases] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para diálogos
  const [sedeDialog, setSedeDialog] = useState(false);
  const [staffDialog, setStaffDialog] = useState(false);
  const [cerradorDialog, setCerradorDialog] = useState(false);
  const [planDialog, setPlanDialog] = useState(false);
  const [claseDialog, setClaseDialog] = useState(false);
  const [rolDialog, setRolDialog] = useState(false);

  // Estados para formularios
  const [sedeForm, setSedeForm] = useState({ nombre_sede: '', responsable_sede: '', activa: true });
  const [staffForm, setStaffForm] = useState({ nombre: '', email: '', sede_principal: '', roles: [], rol_personalizado: '', activo: true });
  const [cerradorForm, setCerradorForm] = useState({ nombre_cerrador: '', staff_relacionado: '', activo: true });
  const [planForm, setPlanForm] = useState({ nombre_plan: '', tipo_item: 'Plan', duracion_meses: 1, modalidad_cobro: 'Suscripción', precio: '', activo: true });
  const [claseForm, setClaseForm] = useState({ nombre_clase: '', descripcion: '', activa: true });
  const [rolForm, setRolForm] = useState({ nombre_rol: '', descripcion: '', permisos: {}, activo: true });

  // Estados para edición
  const [editingId, setEditingId] = useState(null);

  const SEDES_INICIALES = [
    'Nogales',
    'Colón',
    'El Bosque',
    'La Cisterna',
    'Buin',
    'Santiago Centro',
    'Vendify Pro'
  ];

  const ROLES_DISPONIBLES = [
    { value: 'vendedor', label: 'Vendedor' },
    { value: 'asistente', label: 'Asistente' },
    { value: 'RS', label: 'RS (Responsable de Sede)' },
    { value: 'jefe_ventas', label: 'Jefe de Ventas' },
    { value: 'direccion', label: 'Dirección' },
    { value: 'staff', label: 'Staff' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sucursalesData, staffData, cerradoresData, planesData, clasesData, rolesData] = await Promise.all([
        Sucursales.list(),
        Staff.list(),
        Cerradores.list(),
        Planes_Servicios.list(),
        Clases.list(),
        Roles.list()
      ]);

      setSucursales(sucursalesData || []);
      setStaff(staffData || []);
      setCerradores(cerradoresData || []);
      setPlanes(planesData || []);
      setClases(clasesData || []);
      setRoles(rolesData || []);

      // Crear sedes iniciales si no existen
      if (!sucursalesData || sucursalesData.length === 0) {
        await crearSedesIniciales();
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const crearSedesIniciales = async () => {
    try {
      const sedesCreadas = await Promise.all(
        SEDES_INICIALES.map(nombre => 
          Sucursales.create({ nombre_sede: nombre, activa: true })
        )
      );
      setSucursales(sedesCreadas);
    } catch (error) {
      console.error('Error creando sedes iniciales:', error);
    }
  };

  // CRUD Sucursales
  const handleSaveSede = async () => {
    try {
      if (editingId) {
        await Sucursales.update(editingId, sedeForm);
      } else {
        await Sucursales.create(sedeForm);
      }
      await loadData();
      setSedeDialog(false);
      resetSedeForm();
    } catch (error) {
      console.error('Error guardando sede:', error);
    }
  };

  const handleEditSede = (sede) => {
    setSedeForm({ nombre_sede: sede.nombre_sede, responsable_sede: sede.responsable_sede || '', activa: sede.activa });
    setEditingId(sede.id);
    setSedeDialog(true);
  };

  const handleDeleteSede = async (id) => {
    if (confirm('¿Estás seguro de eliminar esta sede?')) {
      try {
        await Sucursales.delete(id);
        await loadData();
      } catch (error) {
        console.error('Error eliminando sede:', error);
      }
    }
  };

  const resetSedeForm = () => {
    setSedeForm({ nombre_sede: '', responsable_sede: '', activa: true });
    setEditingId(null);
  };

  // CRUD Staff
  const handleSaveStaff = async () => {
    try {
      if (editingId) {
        await Staff.update(editingId, staffForm);
      } else {
        await Staff.create(staffForm);
      }
      await loadData();
      setStaffDialog(false);
      resetStaffForm();
    } catch (error) {
      console.error('Error guardando staff:', error);
    }
  };

  const handleEditStaff = (staffMember) => {
    setStaffForm({
      nombre: staffMember.nombre,
      email: staffMember.email || '',
      sede_principal: staffMember.sede_principal || '',
      roles: staffMember.roles || [],
      rol_personalizado: staffMember.rol_personalizado || '',
      activo: staffMember.activo
    });
    setEditingId(staffMember.id);
    setStaffDialog(true);
  };

  const handleDeleteStaff = async (id) => {
    if (confirm('¿Estás seguro de eliminar este staff?')) {
      try {
        await Staff.delete(id);
        await loadData();
      } catch (error) {
        console.error('Error eliminando staff:', error);
      }
    }
  };

  const resetStaffForm = () => {
    setStaffForm({ nombre: '', email: '', sede_principal: '', roles: [], rol_personalizado: '', activo: true });
    setEditingId(null);
  };

  const toggleRole = (role) => {
    setStaffForm(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
  };

  // CRUD Cerradores
  const handleSaveCerrador = async () => {
    try {
      if (editingId) {
        await Cerradores.update(editingId, cerradorForm);
      } else {
        await Cerradores.create(cerradorForm);
      }
      await loadData();
      setCerradorDialog(false);
      resetCerradorForm();
    } catch (error) {
      console.error('Error guardando cerrador:', error);
    }
  };

  const handleEditCerrador = (cerrador) => {
    setCerradorForm({
      nombre_cerrador: cerrador.nombre_cerrador,
      staff_relacionado: cerrador.staff_relacionado || '',
      activo: cerrador.activo
    });
    setEditingId(cerrador.id);
    setCerradorDialog(true);
  };

  const handleDeleteCerrador = async (id) => {
    if (confirm('¿Estás seguro de eliminar este cerrador?')) {
      try {
        await Cerradores.delete(id);
        await loadData();
      } catch (error) {
        console.error('Error eliminando cerrador:', error);
      }
    }
  };

  const resetCerradorForm = () => {
    setCerradorForm({ nombre_cerrador: '', staff_relacionado: '', activo: true });
    setEditingId(null);
  };

  // CRUD Planes
  const handleSavePlan = async () => {
    try {
      const planData = {
        ...planForm,
        duracion_meses: planForm.duracion_meses ? parseInt(planForm.duracion_meses) : 1,
        precio: planForm.precio ? parseFloat(planForm.precio) : undefined
      };
      if (editingId) {
        await Planes_Servicios.update(editingId, planData);
      } else {
        await Planes_Servicios.create(planData);
      }
      await loadData();
      setPlanDialog(false);
      resetPlanForm();
    } catch (error) {
      console.error('Error guardando plan:', error);
    }
  };

  const handleEditPlan = (plan) => {
    setPlanForm({
      nombre_plan: plan.nombre_plan,
      tipo_item: plan.tipo_item || plan.tipo || 'Plan',
      duracion_meses: plan.duracion_meses || 1,
      modalidad_cobro: plan.modalidad_cobro || 'Suscripción',
      precio: plan.precio || '',
      activo: plan.activo
    });
    setEditingId(plan.id);
    setPlanDialog(true);
  };

  const handleDeletePlan = async (id) => {
    if (confirm('¿Estás seguro de eliminar este plan/servicio?')) {
      try {
        await Planes_Servicios.delete(id);
        await loadData();
      } catch (error) {
        console.error('Error eliminando plan:', error);
      }
    }
  };

  const resetPlanForm = () => {
    setPlanForm({ nombre_plan: '', tipo_item: 'Plan', duracion_meses: 1, modalidad_cobro: 'Suscripción', precio: '', activo: true });
    setEditingId(null);
  };

  // CRUD Clases
  const handleSaveClase = async () => {
    try {
      if (editingId) {
        await Clases.update(editingId, claseForm);
      } else {
        await Clases.create(claseForm);
      }
      await loadData();
      setClaseDialog(false);
      resetClaseForm();
    } catch (error) {
      console.error('Error guardando clase:', error);
    }
  };

  const handleEditClase = (clase) => {
    setClaseForm({
      nombre_clase: clase.nombre_clase,
      descripcion: clase.descripcion || '',
      activa: clase.activa
    });
    setEditingId(clase.id);
    setClaseDialog(true);
  };

  const handleDeleteClase = async (id) => {
    if (confirm('¿Estás seguro de eliminar esta clase?')) {
      try {
        await Clases.delete(id);
        await loadData();
      } catch (error) {
        console.error('Error eliminando clase:', error);
      }
    }
  };

  const resetClaseForm = () => {
    setClaseForm({ nombre_clase: '', descripcion: '', activa: true });
    setEditingId(null);
  };

  const getStaffName = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember?.nombre || 'N/A';
  };

  const getSedeName = (sedeId) => {
    const sede = sucursales.find(s => s.id === sedeId);
    return sede?.nombre_sede || 'N/A';
  };

  const getRolName = (rolId) => {
    const rol = roles.find(r => r.id === rolId);
    return rol?.nombre_rol || 'N/A';
  };

  // CRUD Roles
  const PERMISOS_DISPONIBLES = [
    { key: 'ver_dashboard_comercial', label: 'Ver Dashboard Comercial', categoria: 'Dashboards' },
    { key: 'ver_dashboard_costos', label: 'Ver Dashboard Costos', categoria: 'Dashboards' },
    { key: 'gestionar_leads_diarios', label: 'Gestionar Leads Diarios', categoria: 'Leads' },
    { key: 'ver_agenda', label: 'Ver Agenda', categoria: 'Agenda' },
    { key: 'gestionar_agenda', label: 'Gestionar Agenda', categoria: 'Agenda' },
    { key: 'ver_prospectos', label: 'Ver Prospectos', categoria: 'Prospectos' },
    { key: 'crear_prospectos', label: 'Crear Prospectos', categoria: 'Prospectos' },
    { key: 'editar_prospectos', label: 'Editar Prospectos', categoria: 'Prospectos' },
    { key: 'eliminar_prospectos', label: 'Eliminar Prospectos (Individual)', categoria: 'Prospectos' },
    { key: 'eliminar_prospectos_masivo', label: 'Eliminar Prospectos (Masivo)', categoria: 'Prospectos' },
    { key: 'editar_prospectos_masivo', label: 'Editar Prospectos (Masivo)', categoria: 'Prospectos' },
    { key: 'importar_prospectos', label: 'Importar Prospectos', categoria: 'Prospectos' },
    { key: 'exportar_prospectos', label: 'Exportar Prospectos', categoria: 'Prospectos' },
    { key: 'deshacer_importacion', label: 'Deshacer Importación', categoria: 'Prospectos' },
    { key: 'ver_ventas', label: 'Ver Ventas', categoria: 'Ventas' },
    { key: 'gestionar_ventas', label: 'Gestionar Ventas', categoria: 'Ventas' },
    { key: 'eliminar_ventas', label: 'Eliminar Ventas', categoria: 'Ventas' },
    { key: 'gestionar_gastos_ads', label: 'Gestionar Gastos ADS', categoria: 'Marketing' },
    { key: 'gestionar_remarketing', label: 'Gestionar Remarketing', categoria: 'Marketing' },
    { key: 'acceso_configuracion', label: 'Acceso a Configuración', categoria: 'Configuración' },
    { key: 'gestionar_sucursales', label: 'Gestionar Sucursales', categoria: 'Configuración' },
    { key: 'gestionar_staff', label: 'Gestionar Staff', categoria: 'Configuración' },
    { key: 'gestionar_cerradores', label: 'Gestionar Cerradores', categoria: 'Configuración' },
    { key: 'gestionar_planes', label: 'Gestionar Planes', categoria: 'Configuración' },
    { key: 'gestionar_clases', label: 'Gestionar Clases', categoria: 'Configuración' },
    { key: 'gestionar_roles', label: 'Gestionar Roles', categoria: 'Configuración' }
  ];

  const handleSaveRol = async () => {
    try {
      if (editingId) {
        await Roles.update(editingId, rolForm);
      } else {
        await Roles.create(rolForm);
      }
      await loadData();
      setRolDialog(false);
      resetRolForm();
    } catch (error) {
      console.error('Error guardando rol:', error);
    }
  };

  const handleEditRol = (rol) => {
    setRolForm({
      nombre_rol: rol.nombre_rol,
      descripcion: rol.descripcion || '',
      permisos: rol.permisos || {},
      activo: rol.activo
    });
    setEditingId(rol.id);
    setRolDialog(true);
  };

  const handleDeleteRol = async (id) => {
    if (confirm('¿Estás seguro de eliminar este rol?')) {
      try {
        await Roles.delete(id);
        await loadData();
      } catch (error) {
        console.error('Error eliminando rol:', error);
      }
    }
  };

  const resetRolForm = () => {
    setRolForm({ nombre_rol: '', descripcion: '', permisos: {}, activo: true });
    setEditingId(null);
  };

  const togglePermiso = (permisoKey) => {
    setRolForm(prev => ({
      ...prev,
      permisos: {
        ...prev.permisos,
        [permisoKey]: !prev.permisos[permisoKey]
      }
    }));
  };

  const toggleTodosPermisos = () => {
    const todosActivos = PERMISOS_DISPONIBLES.every(p => rolForm.permisos[p.key]);
    const nuevosPermisos = {};
    PERMISOS_DISPONIBLES.forEach(p => {
      nuevosPermisos[p.key] = !todosActivos;
    });
    setRolForm(prev => ({ ...prev, permisos: nuevosPermisos }));
  };



  if (loading) {
    return <div className="p-8">Cargando configuración...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Configuración</h1>

      <Tabs defaultValue="sucursales" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="sucursales">Sucursales</TabsTrigger>
          <TabsTrigger value="staff">Equipo</TabsTrigger>
          <TabsTrigger value="cerradores">Cerradores</TabsTrigger>
          <TabsTrigger value="planes">Planes y Servicios</TabsTrigger>
          <TabsTrigger value="clases">Clases</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permisos">Permisos</TabsTrigger>
        </TabsList>

        {/* TAB SUCURSALES */}
        <TabsContent value="sucursales">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Gestión de Sucursales</CardTitle>
              <Dialog open={sedeDialog} onOpenChange={(open) => { setSedeDialog(open); if (!open) resetSedeForm(); }}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" /> Agregar Sucursal</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingId ? 'Editar' : 'Agregar'} Sucursal</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nombre de la Sede</Label>
                      <Input
                        value={sedeForm.nombre_sede}
                        onChange={(e) => setSedeForm({ ...sedeForm, nombre_sede: e.target.value })}
                        placeholder="Ej: Nogales"
                      />
                    </div>
                    <div>
                      <Label>Responsable de Sede (RS)</Label>
                      <Select value={sedeForm.responsable_sede} onValueChange={(value) => setSedeForm({ ...sedeForm, responsable_sede: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar responsable" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ninguno">Ninguno</SelectItem>
                          {staff.filter(s => s.activo && s.roles?.includes('RS')).map((staffMember) => (
                            <SelectItem key={staffMember.id} value={staffMember.id}>{staffMember.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={sedeForm.activa}
                        onCheckedChange={(checked) => setSedeForm({ ...sedeForm, activa: checked })}
                      />
                      <Label>Activa</Label>
                    </div>
                    <Button onClick={handleSaveSede} className="w-full">Guardar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b hover:bg-gray-50">
                    <th className="text-left p-2 font-medium">Nombre</th>
                    <th className="text-left p-2 font-medium">Responsable (RS)</th>
                    <th className="text-left p-2 font-medium">Estado</th>
                    <th className="text-left p-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sucursales.map((sede) => (
                    <TableRow key={sede.id}>
                      <td className="p-2">{sede.nombre_sede}</td>
                      <td className="p-2">
                        {sede.responsable_sede ? (
                          <Badge variant="outline">{getStaffName(sede.responsable_sede)}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Sin asignar</span>
                        )}
                      </td>
                      <td className="p-2">
                        <Badge variant={sede.activa ? 'default' : 'secondary'}>
                          {sede.activa ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditSede(sede)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteSede(sede.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB STAFF */}
        <TabsContent value="staff">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Gestión de Equipo</CardTitle>
              <Dialog open={staffDialog} onOpenChange={(open) => { setStaffDialog(open); if (!open) resetStaffForm(); }}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" /> Agregar Colaborador</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingId ? 'Editar' : 'Agregar'} Colaborador</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nombre</Label>
                      <Input
                        value={staffForm.nombre}
                        onChange={(e) => setStaffForm({ ...staffForm, nombre: e.target.value })}
                        placeholder="Nombre completo"
                      />
                    </div>
                    <div>
                      <Label>Email (opcional)</Label>
                      <Input
                        type="email"
                        value={staffForm.email}
                        onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                        placeholder="email@ejemplo.com"
                      />
                    </div>
                    <div>
                      <Label>Sede Principal (opcional)</Label>
                      <Select value={staffForm.sede_principal} onValueChange={(value) => setStaffForm({ ...staffForm, sede_principal: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar sede" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ninguna">Ninguna</SelectItem>
                          {sucursales.filter(s => s.activa).map((sede) => (
                            <SelectItem key={sede.id} value={sede.id}>{sede.nombre_sede}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Roles</Label>
                      <div className="space-y-2 mt-2">
                        {ROLES_DISPONIBLES.map((rol) => (
                          <div key={rol.value} className="flex items-center space-x-2">
                            <Checkbox
                              checked={staffForm.roles.includes(rol.value)}
                              onCheckedChange={() => toggleRole(rol.value)}
                            />
                            <Label>{rol.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Rol Personalizado (opcional)</Label>
                      <Select value={staffForm.rol_personalizado} onValueChange={(value) => setStaffForm({ ...staffForm, rol_personalizado: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar rol personalizado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ninguno">Ninguno</SelectItem>
                          {roles.filter(r => r.activo).map((rol) => (
                            <SelectItem key={rol.id} value={rol.id}>{rol.nombre_rol}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={staffForm.activo}
                        onCheckedChange={(checked) => setStaffForm({ ...staffForm, activo: checked })}
                      />
                      <Label>Activo</Label>
                    </div>
                    <Button onClick={handleSaveStaff} className="w-full">Guardar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b hover:bg-gray-50">
                    <th className="text-left p-2 font-medium">Nombre</th>
                    <th className="text-left p-2 font-medium">Email</th>
                    <th className="text-left p-2 font-medium">Sede Principal</th>
                    <th className="text-left p-2 font-medium">Roles</th>
                    <th className="text-left p-2 font-medium">Rol Personalizado</th>
                    <th className="text-left p-2 font-medium">Estado</th>
                    <th className="text-left p-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((staffMember) => (
                    <TableRow key={staffMember.id}>
                      <td className="p-2">{staffMember.nombre}</td>
                      <td className="p-2">{staffMember.email || 'N/A'}</td>
                      <td className="p-2">{getSedeName(staffMember.sede_principal)}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {staffMember.roles?.map((rol) => (
                            <Badge key={rol} variant="outline" className="text-xs">
                              {ROLES_DISPONIBLES.find(r => r.value === rol)?.label || rol}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-2">
                        {staffMember.rol_personalizado ? (
                          <Badge variant="secondary">{getRolName(staffMember.rol_personalizado)}</Badge>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="p-2">
                        <Badge variant={staffMember.activo ? 'default' : 'secondary'}>
                          {staffMember.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditStaff(staffMember)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteStaff(staffMember.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB CERRADORES */}
        <TabsContent value="cerradores">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Gestión de Cerradores</CardTitle>
              <Dialog open={cerradorDialog} onOpenChange={(open) => { setCerradorDialog(open); if (!open) resetCerradorForm(); }}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" /> Agregar Cerrador</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingId ? 'Editar' : 'Agregar'} Cerrador</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nombre del Cerrador</Label>
                      <Input
                        value={cerradorForm.nombre_cerrador}
                        onChange={(e) => setCerradorForm({ ...cerradorForm, nombre_cerrador: e.target.value })}
                        placeholder="Nombre completo"
                      />
                    </div>
                    <div>
                      <Label>Staff Relacionado (opcional)</Label>
                      <Select value={cerradorForm.staff_relacionado} onValueChange={(value) => setCerradorForm({ ...cerradorForm, staff_relacionado: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar staff" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ninguno">Ninguno</SelectItem>
                          {staff.filter(s => s.activo).map((staffMember) => (
                            <SelectItem key={staffMember.id} value={staffMember.id}>{staffMember.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={cerradorForm.activo}
                        onCheckedChange={(checked) => setCerradorForm({ ...cerradorForm, activo: checked })}
                      />
                      <Label>Activo</Label>
                    </div>
                    <Button onClick={handleSaveCerrador} className="w-full">Guardar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b hover:bg-gray-50">
                    <th className="text-left p-2 font-medium">Nombre</th>
                    <th className="text-left p-2 font-medium">Staff Relacionado</th>
                    <th className="text-left p-2 font-medium">Estado</th>
                    <th className="text-left p-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cerradores.map((cerrador) => (
                    <TableRow key={cerrador.id}>
                      <td className="p-2">{cerrador.nombre_cerrador}</td>
                      <td className="p-2">{getStaffName(cerrador.staff_relacionado)}</td>
                      <td className="p-2">
                        <Badge variant={cerrador.activo ? 'default' : 'secondary'}>
                          {cerrador.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditCerrador(cerrador)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteCerrador(cerrador.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB PLANES Y SERVICIOS */}
        <TabsContent value="planes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Gestión de Planes y Servicios</CardTitle>
              <Dialog open={planDialog} onOpenChange={(open) => { setPlanDialog(open); if (!open) resetPlanForm(); }}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" /> Agregar Plan/Servicio</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingId ? 'Editar' : 'Agregar'} Plan/Servicio</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nombre del Plan/Servicio</Label>
                      <Input
                        value={planForm.nombre_plan}
                        onChange={(e) => setPlanForm({ ...planForm, nombre_plan: e.target.value })}
                        placeholder="Ej: Plan Mensual"
                      />
                    </div>
                    <div>
                      <Label>Tipo de Item</Label>
                      <Select value={planForm.tipo_item} onValueChange={(value) => setPlanForm({ ...planForm, tipo_item: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Plan">Plan</SelectItem>
                          <SelectItem value="Servicio">Servicio</SelectItem>
                          <SelectItem value="Programa">Programa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Duración (meses)</Label>
                      <Input
                        type="number"
                        value={planForm.duracion_meses}
                        onChange={(e) => setPlanForm({ ...planForm, duracion_meses: e.target.value })}
                        placeholder="1"
                        min="1"
                      />
                    </div>
                    <div>
                      <Label>Modalidad de Cobro</Label>
                      <Select value={planForm.modalidad_cobro} onValueChange={(value) => setPlanForm({ ...planForm, modalidad_cobro: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Suscripción">Suscripción (recurrente)</SelectItem>
                          <SelectItem value="Prepago">Prepago (pago único)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Precio (opcional)</Label>
                      <Input
                        type="number"
                        value={planForm.precio}
                        onChange={(e) => setPlanForm({ ...planForm, precio: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={planForm.activo}
                        onCheckedChange={(checked) => setPlanForm({ ...planForm, activo: checked })}
                      />
                      <Label>Activo</Label>
                    </div>
                    <Button onClick={handleSavePlan} className="w-full">Guardar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b hover:bg-gray-50">
                    <th className="text-left p-2 font-medium">Nombre</th>
                    <th className="text-left p-2 font-medium">Tipo</th>
                    <th className="text-left p-2 font-medium">Duración</th>
                    <th className="text-left p-2 font-medium">Modalidad</th>
                    <th className="text-left p-2 font-medium">Precio</th>
                    <th className="text-left p-2 font-medium">Estado</th>
                    <th className="text-left p-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {planes.map((plan) => (
                    <TableRow key={plan.id}>
                      <td className="p-2">{plan.nombre_plan}</td>
                      <td className="p-2">
                        <Badge variant="outline">{plan.tipo_item || plan.tipo || 'Plan'}</Badge>
                      </td>
                      <td className="p-2">{plan.duracion_meses ? `${plan.duracion_meses} ${plan.duracion_meses === 1 ? 'mes' : 'meses'}` : 'N/A'}</td>
                      <td className="p-2">
                        <Badge variant={plan.modalidad_cobro === 'Suscripción' ? 'default' : 'secondary'}>
                          {plan.modalidad_cobro || 'N/A'}
                        </Badge>
                      </td>
                      <td className="p-2">{plan.precio ? `$${plan.precio.toLocaleString()}` : 'N/A'}</td>
                      <td className="p-2">
                        <Badge variant={plan.activo ? 'default' : 'secondary'}>
                          {plan.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditPlan(plan)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeletePlan(plan.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB CLASES */}
        <TabsContent value="clases">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Gestión de Clases</CardTitle>
              <Dialog open={claseDialog} onOpenChange={(open) => { setClaseDialog(open); if (!open) resetClaseForm(); }}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" /> Agregar Clase</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingId ? 'Editar' : 'Agregar'} Clase</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nombre de la Clase</Label>
                      <Input
                        value={claseForm.nombre_clase}
                        onChange={(e) => setClaseForm({ ...claseForm, nombre_clase: e.target.value })}
                        placeholder="Ej: Spinning, Yoga, CrossFit"
                      />
                    </div>
                    <div>
                      <Label>Descripción (opcional)</Label>
                      <Input
                        value={claseForm.descripcion}
                        onChange={(e) => setClaseForm({ ...claseForm, descripcion: e.target.value })}
                        placeholder="Descripción de la clase"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={claseForm.activa}
                        onCheckedChange={(checked) => setClaseForm({ ...claseForm, activa: checked })}
                      />
                      <Label>Activa</Label>
                    </div>
                    <Button onClick={handleSaveClase} className="w-full">Guardar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b hover:bg-gray-50">
                    <th className="text-left p-2 font-medium">Nombre</th>
                    <th className="text-left p-2 font-medium">Descripción</th>
                    <th className="text-left p-2 font-medium">Estado</th>
                    <th className="text-left p-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clases.map((clase) => (
                    <TableRow key={clase.id}>
                      <td className="p-2">{clase.nombre_clase}</td>
                      <td className="p-2">{clase.descripcion || 'N/A'}</td>
                      <td className="p-2">
                        <Badge variant={clase.activa ? 'default' : 'secondary'}>
                          {clase.activa ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditClase(clase)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteClase(clase.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB ROLES */}
        <TabsContent value="roles">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Gestión de Roles</CardTitle>
              <Dialog open={rolDialog} onOpenChange={(open) => { setRolDialog(open); if (!open) resetRolForm(); }}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" /> Agregar Rol</Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingId ? 'Editar' : 'Agregar'} Rol</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nombre del Rol</Label>
                      <Input
                        value={rolForm.nombre_rol}
                        onChange={(e) => setRolForm({ ...rolForm, nombre_rol: e.target.value })}
                        placeholder="Ej: Gerente de Ventas"
                      />
                    </div>
                    <div>
                      <Label>Descripción (opcional)</Label>
                      <Input
                        value={rolForm.descripcion}
                        onChange={(e) => setRolForm({ ...rolForm, descripcion: e.target.value })}
                        placeholder="Descripción del rol"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={rolForm.activo}
                        onCheckedChange={(checked) => setRolForm({ ...rolForm, activo: checked })}
                      />
                      <Label>Activo</Label>
                    </div>
                    <Button onClick={handleSaveRol} className="w-full">Guardar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b hover:bg-gray-50">
                    <th className="text-left p-2 font-medium">Nombre</th>
                    <th className="text-left p-2 font-medium">Descripción</th>
                    <th className="text-left p-2 font-medium">Estado</th>
                    <th className="text-left p-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((rol) => (
                    <TableRow key={rol.id}>
                      <td className="p-2">{rol.nombre_rol}</td>
                      <td className="p-2">{rol.descripcion || 'N/A'}</td>
                      <td className="p-2">
                        <Badge variant={rol.activo ? 'default' : 'secondary'}>
                          {rol.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditRol(rol)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteRol(rol.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB PERMISOS */}
        <TabsContent value="permisos">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Permisos por Rol</CardTitle>
            </CardHeader>
            <CardContent>
              {roles.length === 0 ? (
                <p className="text-muted-foreground">No hay roles creados. Crea un rol primero en la pestaña Roles.</p>
              ) : (
                <div className="space-y-6">
                  {roles.map((rol) => (
                    <Card key={rol.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{rol.nombre_rol}</CardTitle>
                            {rol.descripcion && (
                              <p className="text-sm text-muted-foreground mt-1">{rol.descripcion}</p>
                            )}
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditRol(rol)}
                          >
                            Editar Permisos
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {PERMISOS_DISPONIBLES.map((permiso) => (
                            <div key={permiso.key} className="flex items-center space-x-2">
                              <Checkbox
                                checked={rol.permisos?.[permiso.key] || false}
                                disabled
                              />
                              <Label className="text-sm">{permiso.label}</Label>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dialog para editar permisos */}
          <Dialog open={rolDialog} onOpenChange={(open) => { setRolDialog(open); if (!open) resetRolForm(); }}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Permisos: {rolForm.nombre_rol}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nombre del Rol</Label>
                  <Input
                    value={rolForm.nombre_rol}
                    onChange={(e) => setRolForm({ ...rolForm, nombre_rol: e.target.value })}
                    placeholder="Ej: Gerente de Ventas"
                  />
                </div>
                <div>
                  <Label>Descripción (opcional)</Label>
                  <Input
                    value={rolForm.descripcion}
                    onChange={(e) => setRolForm({ ...rolForm, descripcion: e.target.value })}
                    placeholder="Descripción del rol"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-base font-semibold">Permisos</Label>
                    <Button 
                      type="button"
                      size="sm" 
                      variant="outline"
                      onClick={toggleTodosPermisos}
                    >
                      {PERMISOS_DISPONIBLES.every(p => rolForm.permisos[p.key]) ? 'Desmarcar Todos' : 'Seleccionar Todos'}
                    </Button>
                  </div>
                  <div className="max-h-96 overflow-y-auto border rounded-md p-4">
                    {/* Agrupar permisos por categoría */}
                    {['Dashboards', 'Leads', 'Agenda', 'Prospectos', 'Ventas', 'Marketing', 'Configuración'].map((categoria) => {
                      const permisosCategoria = PERMISOS_DISPONIBLES.filter(p => p.categoria === categoria);
                      if (permisosCategoria.length === 0) return null;
                      
                      return (
                        <div key={categoria} className="mb-4">
                          <h4 className="font-semibold text-sm mb-2 text-gray-700 border-b pb-1">{categoria}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {permisosCategoria.map((permiso) => (
                              <div key={permiso.key} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={rolForm.permisos[permiso.key] || false}
                                  onCheckedChange={() => togglePermiso(permiso.key)}
                                />
                                <Label className="cursor-pointer text-sm">{permiso.label}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={rolForm.activo}
                    onCheckedChange={(checked) => setRolForm({ ...rolForm, activo: checked })}
                  />
                  <Label>Activo</Label>
                </div>
                <Button onClick={handleSaveRol} className="w-full">Guardar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>


    </div>
  );
}