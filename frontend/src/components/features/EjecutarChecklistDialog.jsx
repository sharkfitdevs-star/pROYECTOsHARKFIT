import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checklist_Asignados } from '@/entities/Checklist_Asignados';
import { Checklist_Items } from '@/entities/Checklist_Items';
import { Checklist_Ejecuciones } from '@/entities/Checklist_Ejecuciones';
import { Checklist_Templates } from '@/entities/Checklist_Templates';
import { calcularCompletitud } from '@/utils/checklistHelpers';
import { CheckCircle2, Circle, Camera, MessageSquare, Clock, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function EjecutarChecklistDialog({ open, onOpenChange, checklistAsignado, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [ejecuciones, setEjecuciones] = useState([]);
  const [plantilla, setPlantilla] = useState(null);
  const [evidencias, setEvidencias] = useState({});
  const [uploadingPhoto, setUploadingPhoto] = useState(null);

  useEffect(() => {
    if (open && checklistAsignado) {
      cargarDatos();
    }
  }, [open, checklistAsignado]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar plantilla
      const plantillaData = await Checklist_Templates.get(checklistAsignado.plantilla_id);
      setPlantilla(plantillaData);

      // Cargar items
      const itemsData = await Checklist_Items.filter({
        plantilla_id: checklistAsignado.plantilla_id,
        activo: true
      });
      setItems(itemsData.sort((a, b) => a.orden - b.orden));

      // Cargar ejecuciones existentes
      const ejecucionesData = await Checklist_Ejecuciones.filter({
        checklist_asignado_id: checklistAsignado.id
      });
      setEjecuciones(ejecucionesData);

      // Inicializar evidencias
      const evidenciasIniciales = {};
      ejecucionesData.forEach(ej => {
        evidenciasIniciales[ej.item_id] = {
          comentario: ej.evidencia_comentario || '',
          foto: ej.evidencia_foto_url || ''
        };
      });
      setEvidencias(evidenciasIniciales);

      // Si es la primera vez que se abre, marcar como en progreso
      if (checklistAsignado.estado === 'pendiente') {
        await Checklist_Asignados.update(checklistAsignado.id, {
          estado: 'en_progreso',
          fecha_hora_inicio: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const isItemCompletado = (itemId) => {
    const ejecucion = ejecuciones.find(e => e.item_id === itemId);
    return ejecucion?.completado || false;
  };

  const handleToggleItem = async (item) => {
    try {
      const ejecucionExistente = ejecuciones.find(e => e.item_id === item.id);
      const nuevoEstado = !isItemCompletado(item.id);

      // Validar evidencia si es requerida
      if (nuevoEstado && item.requiere_evidencia) {
        const evidencia = evidencias[item.id] || {};
        const tieneComentario = evidencia.comentario?.trim();
        const tieneFoto = evidencia.foto;

        if (item.tipo_evidencia === 'comentario' && !tieneComentario) {
          alert('Este item requiere un comentario como evidencia');
          return;
        }
        if (item.tipo_evidencia === 'foto' && !tieneFoto) {
          alert('Este item requiere una foto como evidencia');
          return;
        }
        if (item.tipo_evidencia === 'ambos' && (!tieneComentario || !tieneFoto)) {
          alert('Este item requiere comentario y foto como evidencia');
          return;
        }
      }

      const evidencia = evidencias[item.id] || {};
      const dataEjecucion = {
        checklist_asignado_id: checklistAsignado.id,
        item_id: item.id,
        completado: nuevoEstado,
        fecha_hora_ejecucion: new Date().toISOString(),
        evidencia_comentario: evidencia.comentario || null,
        evidencia_foto_url: evidencia.foto || null
      };

      if (ejecucionExistente) {
        await Checklist_Ejecuciones.update(ejecucionExistente.id, dataEjecucion);
        setEjecuciones(prev => prev.map(e => 
          e.id === ejecucionExistente.id ? { ...e, ...dataEjecucion } : e
        ));
      } else {
        const nuevaEjecucion = await Checklist_Ejecuciones.create(dataEjecucion);
        setEjecuciones(prev => [...prev, nuevaEjecucion]);
      }

      // Recalcular completitud
      await calcularCompletitud(checklistAsignado.id);
      
    } catch (error) {
      console.error('Error al actualizar item:', error);
      alert('Error al actualizar el item');
    }
  };

  const handleEvidenciaChange = (itemId, tipo, valor) => {
    setEvidencias(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [tipo]: valor
      }
    }));
  };

  const handleUploadFoto = async (itemId, file) => {
    try {
      setUploadingPhoto(itemId);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResponse = await axios.post(
        `${process.env.PROXY_INTEGRATION_URL}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'x-api-key': window.config.apiKey
          }
        }
      );

      const { url } = uploadResponse.data;
      handleEvidenciaChange(itemId, 'foto', url);
      
    } catch (error) {
      console.error('Error al subir foto:', error);
      alert('Error al subir la foto');
    } finally {
      setUploadingPhoto(null);
    }
  };

  const handleFinalizar = async () => {
    try {
      // Verificar items obligatorios
      const itemsObligatorios = items.filter(i => i.es_obligatorio);
      const obligatoriosPendientes = itemsObligatorios.filter(item => 
        !isItemCompletado(item.id)
      );

      if (obligatoriosPendientes.length > 0) {
        const confirmar = window.confirm(
          `Hay ${obligatoriosPendientes.length} item(s) obligatorio(s) sin completar. ¿Deseas finalizar de todas formas?`
        );
        if (!confirmar) return;
      }

      setLoading(true);

      await Checklist_Asignados.update(checklistAsignado.id, {
        estado: 'completado',
        fecha_hora_finalizacion: new Date().toISOString()
      });

      await calcularCompletitud(checklistAsignado.id);
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error al finalizar checklist:', error);
      alert('Error al finalizar el checklist');
    } finally {
      setLoading(false);
    }
  };

  const porcentajeCompletado = items.length > 0 
    ? Math.round((ejecuciones.filter(e => e.completado).length / items.length) * 100)
    : 0;

  const itemsCompletados = ejecuciones.filter(e => e.completado).length;

  // Agrupar items por categoría
  const itemsPorCategoria = items.reduce((acc, item) => {
    const cat = item.categoria || 'Sin categoría';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{plantilla?.nombre_plantilla}</span>
            <Badge variant={checklistAsignado?.estado === 'completado' ? 'default' : 'secondary'}>
              {checklistAsignado?.estado}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">Cargando...</div>
        ) : (
          <div className="space-y-4">
            {/* Progreso */}
            <div className="bg-slate-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Progreso</span>
                <span className="text-slate-600">{itemsCompletados} de {items.length} completados</span>
              </div>
              <Progress value={porcentajeCompletado} className="h-2" />
              <div className="text-right text-lg font-bold text-blue-600">
                {porcentajeCompletado}%
              </div>
            </div>

            {plantilla?.descripcion && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm">
                <p className="text-blue-900">{plantilla.descripcion}</p>
              </div>
            )}

            {/* Items por categoría */}
            <div className="space-y-4">
              {Object.entries(itemsPorCategoria).map(([categoria, itemsCategoria]) => (
                <div key={categoria} className="space-y-2">
                  <h3 className="font-semibold text-sm text-slate-700 border-b pb-1">
                    {categoria}
                  </h3>
                  
                  {itemsCategoria.map((item) => {
                    const completado = isItemCompletado(item.id);
                    const evidencia = evidencias[item.id] || {};
                    
                    return (
                      <div 
                        key={item.id} 
                        className={`border rounded-lg p-3 ${completado ? 'bg-green-50 border-green-200' : 'bg-white'}`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={completado}
                            onCheckedChange={() => handleToggleItem(item)}
                            className="mt-1"
                          />
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm ${completado ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                                {item.descripcion_tarea}
                                {item.es_obligatorio && (
                                  <span className="text-red-500 ml-1">*</span>
                                )}
                              </p>
                              
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                {item.tiempo_estimado_minutos && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {item.tiempo_estimado_minutos}min
                                  </span>
                                )}
                              </div>
                            </div>

                            {item.notas_ayuda && (
                              <p className="text-xs text-slate-500 italic">
                                💡 {item.notas_ayuda}
                              </p>
                            )}

                            {/* Evidencias */}
                            {item.requiere_evidencia && (
                              <div className="space-y-2 pt-2 border-t">
                                {(item.tipo_evidencia === 'comentario' || item.tipo_evidencia === 'ambos') && (
                                  <div>
                                    <Label className="text-xs flex items-center gap-1">
                                      <MessageSquare className="w-3 h-3" />
                                      Comentario {item.tipo_evidencia === 'ambos' && '*'}
                                    </Label>
                                    <Textarea
                                      value={evidencia.comentario || ''}
                                      onChange={(e) => handleEvidenciaChange(item.id, 'comentario', e.target.value)}
                                      placeholder="Agregar comentario..."
                                      rows={2}
                                      className="text-sm"
                                      disabled={completado}
                                    />
                                  </div>
                                )}

                                {(item.tipo_evidencia === 'foto' || item.tipo_evidencia === 'ambos') && (
                                  <div>
                                    <Label className="text-xs flex items-center gap-1">
                                      <Camera className="w-3 h-3" />
                                      Foto {item.tipo_evidencia === 'ambos' && '*'}
                                    </Label>
                                    {evidencia.foto ? (
                                      <div className="relative">
                                        <img 
                                          src={evidencia.foto} 
                                          alt="Evidencia" 
                                          className="w-32 h-32 object-cover rounded border"
                                        />
                                        {!completado && (
                                          <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            className="absolute top-1 right-1"
                                            onClick={() => handleEvidenciaChange(item.id, 'foto', '')}
                                          >
                                            ✕
                                          </Button>
                                        )}
                                      </div>
                                    ) : (
                                      <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleUploadFoto(item.id, file);
                                        }}
                                        disabled={completado || uploadingPhoto === item.id}
                                        className="text-sm"
                                      />
                                    )}
                                    {uploadingPhoto === item.id && (
                                      <p className="text-xs text-blue-600 mt-1">Subiendo foto...</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Advertencia de items obligatorios */}
            {items.filter(i => i.es_obligatorio && !isItemCompletado(i.id)).length > 0 && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <p className="font-medium">Items obligatorios pendientes</p>
                  <p className="text-xs mt-1">
                    Hay {items.filter(i => i.es_obligatorio && !isItemCompletado(i.id)).length} item(s) 
                    obligatorio(s) sin completar
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {checklistAsignado?.estado !== 'completado' && (
            <Button 
              onClick={handleFinalizar} 
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Finalizando...' : 'Finalizar Checklist'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}