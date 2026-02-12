import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Star, AlertCircle, CheckCircle2 } from 'lucide-react';
import { NPS_Cruzados } from '@/entities/NPS_Cruzados';
import { Tareas_RS } from '@/entities/Tareas_RS';
import { Clientes } from '@/entities/Clientes';
import User from '@/entities/User';

export default function GestionarNPSCruzadoDialog({ open, onClose, tareaId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [tarea, setTarea] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [npsRecord, setNpsRecord] = useState(null);
  const [user, setUser] = useState(null);

  // Campos del formulario
  const [puntajeNPS, setPuntajeNPS] = useState('');
  const [comentarioCliente, setComentarioCliente] = useState('');
  const [fechaContacto, setFechaContacto] = useState(new Date().toISOString().split('T')[0]);
  const [resultadoContacto, setResultadoContacto] = useState('');
  
  // Campos condicionales
  const [productoInteres, setProductoInteres] = useState('');
  const [plazoEstimadoCompra, setPlazoEstimadoCompra] = useState('');
  const [fechaReagendamiento, setFechaReagendamiento] = useState('');
  const [motivoReagendamiento, setMotivoReagendamiento] = useState('');
  const [motivoDesinteres, setMotivoDesinteres] = useState('');

  const [error, setError] = useState('');

  useEffect(() => {
    if (open && tareaId) {
      loadData();
    }
  }, [open, tareaId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Cargar usuario
      const userData = await User.me();
      setUser(userData);

      // Cargar tarea
      const tareaData = await Tareas_RS.get(tareaId);
      setTarea(tareaData);

      // Cargar cliente relacionado
      if (tareaData.cliente_relacionado) {
        const clienteData = await Clientes.get(tareaData.cliente_relacionado);
        setCliente(clienteData);
      }

      // Buscar registro NPS existente
      const npsRecords = await NPS_Cruzados.filter({ tarea_relacionada: tareaId });
      if (npsRecords.length > 0) {
        const nps = npsRecords[0];
        setNpsRecord(nps);
        
        // Pre-cargar datos si ya existen
        if (nps.puntaje_nps !== undefined) setPuntajeNPS(nps.puntaje_nps.toString());
        if (nps.comentario_cliente) setComentarioCliente(nps.comentario_cliente);
        if (nps.fecha_contacto) setFechaContacto(nps.fecha_contacto);
        if (nps.resultado_contacto) setResultadoContacto(nps.resultado_contacto);
        if (nps.producto_interes) setProductoInteres(nps.producto_interes);
        if (nps.plazo_estimado_compra) setPlazoEstimadoCompra(nps.plazo_estimado_compra);
        if (nps.fecha_reagendamiento) setFechaReagendamiento(nps.fecha_reagendamiento);
        if (nps.motivo_reagendamiento) setMotivoReagendamiento(nps.motivo_reagendamiento);
        if (nps.motivo_desinteres) setMotivoDesinteres(nps.motivo_desinteres);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar los datos de la tarea');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!puntajeNPS || puntajeNPS === '') {
      setError('El puntaje NPS es obligatorio');
      return;
    }

    const puntaje = parseInt(puntajeNPS);
    if (isNaN(puntaje) || puntaje < 0 || puntaje > 10) {
      setError('El puntaje NPS debe ser un número entre 0 y 10');
      return;
    }

    if (!comentarioCliente.trim()) {
      setError('El comentario del cliente es obligatorio');
      return;
    }

    if (!fechaContacto) {
      setError('La fecha de contacto es obligatoria');
      return;
    }

    if (!resultadoContacto) {
      setError('Debe seleccionar el resultado del contacto');
      return;
    }

    // Validaciones condicionales según resultado
    if (resultadoContacto === 'compromiso_compra') {
      if (!productoInteres.trim()) {
        setError('Debe indicar el producto de interés cuando hay compromiso de compra');
        return;
      }
      if (!plazoEstimadoCompra.trim()) {
        setError('Debe indicar el plazo estimado de compra');
        return;
      }
    }

    if (resultadoContacto === 'reagendo') {
      if (!fechaReagendamiento) {
        setError('Debe indicar la fecha de reagendamiento');
        return;
      }
      if (!motivoReagendamiento.trim()) {
        setError('Debe indicar el motivo del reagendamiento');
        return;
      }
    }

    if (resultadoContacto === 'no_interesado') {
      if (!motivoDesinteres.trim()) {
        setError('Debe indicar el motivo de desinterés');
        return;
      }
    }

    try {
      setLoading(true);

      // Determinar si requiere gestión (puntajes 0-6)
      const requiereGestion = puntaje >= 0 && puntaje <= 6;

      // Preparar datos del NPS
      const npsData = {
        puntaje_nps: puntaje,
        comentario_cliente: comentarioCliente,
        fecha_contacto: fechaContacto,
        resultado_contacto: resultadoContacto,
        requiere_gestion: requiereGestion,
        estado: resultadoContacto === 'reagendo' ? 'seguimiento' : 'completado'
      };

      // Agregar campos condicionales
      if (resultadoContacto === 'compromiso_compra') {
        npsData.producto_interes = productoInteres;
        npsData.plazo_estimado_compra = plazoEstimadoCompra;
      }

      if (resultadoContacto === 'reagendo') {
        npsData.fecha_reagendamiento = fechaReagendamiento;
        npsData.motivo_reagendamiento = motivoReagendamiento;
      }

      if (resultadoContacto === 'no_interesado') {
        npsData.motivo_desinteres = motivoDesinteres;
      }

      // Actualizar registro NPS
      if (npsRecord) {
        await NPS_Cruzados.update(npsRecord.id, npsData);
      }

      // Marcar tarea como completada
      await Tareas_RS.update(tareaId, {
        estado: 'completada',
        fecha_completada: new Date().toISOString()
      });

      setLoading(false);

      // Notificar éxito
      if (onSuccess) {
        onSuccess({
          titulo: `NPS Cruzado completado - ${cliente?.nombre || 'Cliente'}`,
          descripcion: `Puntaje: ${puntaje}/10 - ${resultadoContacto === 'compromiso_compra' ? 'Compromiso de compra' : resultadoContacto === 'reagendo' ? 'Reagendado' : 'No interesado'}`,
          fecha: new Date().toLocaleString('es-CL')
        });
      }

      onClose();
    } catch (err) {
      console.error('Error al guardar NPS:', err);
      setError('Error al guardar el NPS. Por favor intente nuevamente.');
      setLoading(false);
    }
  };

  const getPuntajeColor = (puntaje) => {
    if (puntaje >= 9) return 'text-green-600';
    if (puntaje >= 7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPuntajeLabel = (puntaje) => {
    if (puntaje >= 9) return 'Promotor';
    if (puntaje >= 7) return 'Pasivo';
    return 'Detractor';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-600" />
            Gestionar NPS Cruzado
          </DialogTitle>
          <DialogDescription>
            Complete todos los campos obligatorios para cerrar esta tarea de NPS
          </DialogDescription>
        </DialogHeader>

        {loading && !tarea ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Información del cliente */}
            {cliente && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Información del Cliente</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Nombre:</span>
                    <span className="ml-2 font-medium">{cliente.nombre}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">WhatsApp:</span>
                    <span className="ml-2 font-medium">{cliente.whatsapp}</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Puntaje NPS */}
            <div className="space-y-2">
              <Label htmlFor="puntaje" className="flex items-center gap-2">
                Puntaje NPS (0-10) <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="puntaje"
                  type="number"
                  min="0"
                  max="10"
                  value={puntajeNPS}
                  onChange={(e) => setPuntajeNPS(e.target.value)}
                  placeholder="Ingrese puntaje de 0 a 10"
                  className="flex-1"
                  required
                />
                {puntajeNPS && (
                  <span className={`font-semibold ${getPuntajeColor(parseInt(puntajeNPS))}`}>
                    {getPuntajeLabel(parseInt(puntajeNPS))}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                0-6: Detractor | 7-8: Pasivo | 9-10: Promotor
              </p>
            </div>

            {/* Comentario del cliente */}
            <div className="space-y-2">
              <Label htmlFor="comentario">
                Comentario del Cliente <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="comentario"
                value={comentarioCliente}
                onChange={(e) => setComentarioCliente(e.target.value)}
                placeholder="Registre el comentario completo del cliente sobre su experiencia..."
                rows={4}
                required
              />
            </div>

            {/* Fecha de contacto */}
            <div className="space-y-2">
              <Label htmlFor="fecha">
                Fecha de Contacto <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fecha"
                type="date"
                value={fechaContacto}
                onChange={(e) => setFechaContacto(e.target.value)}
                required
              />
            </div>

            {/* Resultado del contacto */}
            <div className="space-y-2">
              <Label htmlFor="resultado">
                Resultado del Contacto Comercial <span className="text-red-500">*</span>
              </Label>
              <Select value={resultadoContacto} onValueChange={setResultadoContacto} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione el resultado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compromiso_compra">✅ Compromiso de compra</SelectItem>
                  <SelectItem value="reagendo">📅 Reagendó</SelectItem>
                  <SelectItem value="no_interesado">❌ No interesado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campos condicionales: Compromiso de compra */}
            {resultadoContacto === 'compromiso_compra' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-green-900">Detalles del Compromiso de Compra</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="producto">
                    Producto/Plan de Interés <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="producto"
                    value={productoInteres}
                    onChange={(e) => setProductoInteres(e.target.value)}
                    placeholder="Ej: Plan Mensual, Plan Trimestral, etc."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plazo">
                    Plazo Estimado de Compra <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="plazo"
                    value={plazoEstimadoCompra}
                    onChange={(e) => setPlazoEstimadoCompra(e.target.value)}
                    placeholder="Ej: Esta semana, Próximo mes, etc."
                    required
                  />
                </div>
              </div>
            )}

            {/* Campos condicionales: Reagendó */}
            {resultadoContacto === 'reagendo' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-yellow-900">Detalles del Reagendamiento</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="fechaReagenda">
                    Fecha de Reagendamiento <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="fechaReagenda"
                    type="date"
                    value={fechaReagendamiento}
                    onChange={(e) => setFechaReagendamiento(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motivoReagenda">
                    Motivo del Reagendamiento <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="motivoReagenda"
                    value={motivoReagendamiento}
                    onChange={(e) => setMotivoReagendamiento(e.target.value)}
                    placeholder="Indique brevemente por qué se reagendó..."
                    rows={2}
                    required
                  />
                </div>
              </div>
            )}

            {/* Campos condicionales: No interesado */}
            {resultadoContacto === 'no_interesado' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-red-900">Motivo de Desinterés</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="motivoDesinteres">
                    Motivo <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="motivoDesinteres"
                    value={motivoDesinteres}
                    onChange={(e) => setMotivoDesinteres(e.target.value)}
                    placeholder="Indique brevemente el motivo del desinterés..."
                    rows={2}
                    required
                  />
                </div>
              </div>
            )}

            {/* Alerta para puntajes bajos */}
            {puntajeNPS && parseInt(puntajeNPS) <= 6 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Este puntaje será marcado como "Requiere gestión" para análisis posterior por parte de la dirección.
                </AlertDescription>
              </Alert>
            )}

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="bg-yellow-600 hover:bg-yellow-700">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Completar NPS
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}