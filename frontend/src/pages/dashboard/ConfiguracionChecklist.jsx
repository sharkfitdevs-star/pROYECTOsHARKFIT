import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checklist_Templates } from '@/entities/Checklist_Templates';
import { Checklist_Items } from '@/entities/Checklist_Items';
import CrearPlantillaDialog from '@/components/CrearPlantillaDialog';
import AgregarItemDialog from '@/components/AgregarItemDialog';
import { Plus, Edit, Trash2, List, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { formatearDuracion } from '@/utils/checklistHelpers';

export default function ConfiguracionChecklist() {
  const [plantillas, setPlantillas] = useState([]);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroRol, setFiltroRol] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [dialogPlantilla, setDialogPlantilla] = useState(false);
  const [dialogItem, setDialogItem] = useState(false);
  const [plantillaEditar, setPlantillaEditar] = useState(null);
  const [itemEditar, setItemEditar] = useState(null);
  const [expandidas, setExpandidas] = useState({});

  useEffect(() => {
    cargarPlantillas();
  }, []);

  useEffect(() => {
    if (plantillaSeleccionada) {
      cargarItems(plantillaSeleccionada.id);
    }
  }, [plantillaSeleccionada]);

  const cargarPlantillas = async () => {
    try {
      setLoading(true);
      const data = await Checklist_Templates.list('-createdAt');
      setPlantillas(data || []);
    } catch (error) {
      console.error('Error al cargar plantillas:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarItems = async (plantillaId) => {
    try {
      const data = await Checklist_Items.filter({
        plantilla_id: plantillaId
      });
      setItems((data || []).sort((a, b) => a.orden - b.orden));
    } catch (error) {
      console.error('Error al cargar items:', error);
    }
  };

  const handleEliminarPlantilla = async (plantilla) => {
    if (!window.confirm(`¿Eliminar la plantilla "${plantilla.nombre_plantilla}"? Esto también eliminará todos sus items.`)) {
      return;
    }

    try {
      // Eliminar items asociados
      const itemsPlantilla = await Checklist_Items.filter({
        plantilla_id: plantilla.id
      });
      for (const item of itemsPlantilla) {
        await Checklist_Items.delete(item.id);
      }

      // Eliminar plantilla
      await Checklist_Templates.delete(plantilla.id);
      
      if (plantillaSeleccionada?.id === plantilla.id) {
        setPlantillaSeleccionada(null);
        setItems([]);
      }
      
      cargarPlantillas();
    } catch (error) {
      console.error('Error al eliminar plantilla:', error);
      alert('Error al eliminar la plantilla');
    }
  };

  const handleEliminarItem = async (item) => {
    if (!window.confirm(`¿Eliminar el item "${item.descripcion_tarea}"?`)) {
      return;
    }

    try {
      await Checklist_Items.delete(item.id);
      cargarItems(plantillaSeleccionada.id);
    } catch (error) {
      console.error('Error al eliminar item:', error);
      alert('Error al eliminar el item');
    }
  };

  const handleEditarPlantilla = (plantilla) => {
    setPlantillaEditar(plantilla);
    setDialogPlantilla(true);
  };

  const handleEditarItem = (item) => {
    setItemEditar(item);
    setDialogItem(true);
  };

  const handleNuevaPlantilla = () => {
    setPlantillaEditar(null);
    setDialogPlantilla(true);
  };

  const handleNuevoItem = () => {
    if (!plantillaSeleccionada) {
      alert('Selecciona una plantilla primero');
      return;
    }
    setItemEditar(null);
    setDialogItem(true);
  };

  const toggleExpandir = (plantillaId) => {
    setExpandidas(prev => ({
      ...prev,
      [plantillaId]: !prev[plantillaId]
    }));
  };

  const plantillasFiltradas = plantillas.filter(p => {
    if (filtroRol !== 'todos' && p.rol_asociado !== filtroRol) return false;
    if (filtroTipo !== 'todos' && p.tipo_checklist !== filtroTipo) return false;
    return true;
  });

  const roles = [
    { value: 'todos', label: 'Todos los roles' },
    { value: 'vendedor', label: 'Vendedor' },
    { value: 'cerrador', label: 'Cerrador' },
    { value: 'jefe_ventas', label: 'Jefe de Ventas' },
    { value: 'RS', label: 'RS' },
    { value: 'asistente', label: 'Asistente' },
    { value: 'direccion', label: 'Dirección' }
  ];

  const getRolLabel = (rol) => {
    return roles.find(r => r.value === rol)?.label || rol;
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="p-4">
          <h1 className="text-xl font-bold text-slate-900">Configuración de Checklist</h1>
          <p className="text-sm text-slate-600 mt-1">Gestiona plantillas e items de checklist</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Filtros y acciones */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Select value={filtroRol} onValueChange={setFiltroRol}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(rol => (
                    <SelectItem key={rol.value} value={rol.value}>{rol.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  <SelectItem value="apertura">Apertura</SelectItem>
                  <SelectItem value="cierre">Cierre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleNuevaPlantilla} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Plantilla
            </Button>
          </CardContent>
        </Card>

        {/* Listado de plantillas */}
        {loading ? (
          <div className="text-center py-8">Cargando...</div>
        ) : plantillasFiltradas.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              <List className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay plantillas configuradas</p>
              <Button onClick={handleNuevaPlantilla} className="mt-4">
                Crear primera plantilla
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {plantillasFiltradas.map(plantilla => {
              const isExpandida = expandidas[plantilla.id];
              const itemsPlantilla = items.filter(i => i.plantilla_id === plantilla.id);
              const isSeleccionada = plantillaSeleccionada?.id === plantilla.id;

              return (
                <Card 
                  key={plantilla.id}
                  className={isSeleccionada ? 'border-blue-500 border-2' : ''}
                >
                  <CardHeader 
                    className="p-4 cursor-pointer"
                    onClick={() => {
                      setPlantillaSeleccionada(plantilla);
                      toggleExpandir(plantilla.id);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base">
                            {plantilla.nombre_plantilla}
                          </CardTitle>
                          <Badge variant={plantilla.activo ? 'default' : 'secondary'}>
                            {plantilla.activo ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-600 flex-wrap">
                          <span className="bg-slate-100 px-2 py-1 rounded">
                            {getRolLabel(plantilla.rol_asociado)}
                          </span>
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {plantilla.tipo_checklist === 'apertura' ? '🌅 Apertura' : '🌙 Cierre'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {plantilla.hora_inicio_esperada}
                          </span>
                          <span>
                            {formatearDuracion(plantilla.minutos_max_completar)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-2 text-xs">
                          <span className="text-slate-600">
                            📅 {plantilla.dias_activos?.join(', ')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {isExpandida ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {isExpandida && (
                    <CardContent className="p-4 pt-0 space-y-3 border-t">
                      {/* Alertas configuradas */}
                      <div className="bg-slate-50 p-3 rounded-lg space-y-1 text-xs">
                        <p className="font-medium text-slate-700">Configuración de alertas:</p>
                        {plantilla.genera_alerta_retraso && (
                          <p className="text-slate-600">
                            ⏰ Alerta por retraso ({plantilla.minutos_alerta_retraso} min)
                          </p>
                        )}
                        {plantilla.genera_alerta_incompleto && (
                          <p className="text-slate-600">
                            ⚠️ Alerta si no se completa
                          </p>
                        )}
                        {plantilla.notificar_supervisor && (
                          <p className="text-slate-600">
                            👤 Notifica al supervisor
                          </p>
                        )}
                      </div>

                      {/* Acciones de plantilla */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditarPlantilla(plantilla);
                          }}
                          className="flex-1"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEliminarPlantilla(plantilla);
                          }}
                          className="flex-1 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Eliminar
                        </Button>
                      </div>

                      {/* Items de la plantilla */}
                      <div className="border-t pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-sm">
                            Items ({isSeleccionada ? itemsPlantilla.length : '...'})
                          </h4>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNuevoItem();
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Agregar
                          </Button>
                        </div>

                        {isSeleccionada && itemsPlantilla.length === 0 ? (
                          <p className="text-sm text-slate-500 text-center py-4">
                            No hay items. Agrega el primero.
                          </p>
                        ) : isSeleccionada ? (
                          <div className="space-y-2">
                            {itemsPlantilla.map((item, index) => (
                              <div
                                key={item.id}
                                className="bg-white border rounded-lg p-3 text-sm"
                              >
                                <div className="flex items-start gap-2">
                                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-medium">
                                    {item.orden}
                                  </span>
                                  <div className="flex-1">
                                    <p className="text-slate-900">
                                      {item.descripcion_tarea}
                                      {item.es_obligatorio && (
                                        <span className="text-red-500 ml-1">*</span>
                                      )}
                                    </p>
                                    
                                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                                      {item.categoria && (
                                        <span className="bg-slate-100 px-2 py-0.5 rounded">
                                          {item.categoria}
                                        </span>
                                      )}
                                      {item.tiempo_estimado_minutos && (
                                        <span className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {item.tiempo_estimado_minutos}min
                                        </span>
                                      )}
                                      {item.requiere_evidencia && (
                                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                          📸 {item.tipo_evidencia}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditarItem(item);
                                      }}
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEliminarItem(item);
                                      }}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CrearPlantillaDialog
        open={dialogPlantilla}
        onOpenChange={setDialogPlantilla}
        plantilla={plantillaEditar}
        onSuccess={() => {
          cargarPlantillas();
          setPlantillaEditar(null);
        }}
      />

      <AgregarItemDialog
        open={dialogItem}
        onOpenChange={setDialogItem}
        plantillaId={plantillaSeleccionada?.id}
        item={itemEditar}
        maxOrden={items.length > 0 ? Math.max(...items.map(i => i.orden)) : 0}
        onSuccess={() => {
          if (plantillaSeleccionada) {
            cargarItems(plantillaSeleccionada.id);
          }
          setItemEditar(null);
        }}
      />
    </div>
  );
}