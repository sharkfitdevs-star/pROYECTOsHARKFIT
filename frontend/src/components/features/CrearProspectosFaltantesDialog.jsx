import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, UserPlus, AlertCircle } from 'lucide-react';
import { Prospectos } from '@/entities/Prospectos';
import { normalizarWhatsApp } from '@/utils/migracionHelpers';

export default function CrearProspectosFaltantesDialog({ 
  open, 
  onOpenChange, 
  registrosSinProspecto,
  catalogos,
  onProspectosCreados 
}) {
  const [seleccionados, setSeleccionados] = useState({});
  const [creando, setCreando] = useState(false);
  const [todosSeleccionados, setTodosSeleccionados] = useState(true);

  // Inicializar todos como seleccionados
  useEffect(() => {
    if (registrosSinProspecto?.length > 0) {
      const inicial = {};
      registrosSinProspecto.forEach((_, idx) => {
        inicial[idx] = true;
      });
      setSeleccionados(inicial);
      setTodosSeleccionados(true);
    }
  }, [registrosSinProspecto]);

  const handleToggleSeleccion = (index) => {
    setSeleccionados(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleToggleTodos = () => {
    const nuevoEstado = !todosSeleccionados;
    const nuevaSeleccion = {};
    registrosSinProspecto.forEach((_, idx) => {
      nuevaSeleccion[idx] = nuevoEstado;
    });
    setSeleccionados(nuevaSeleccion);
    setTodosSeleccionados(nuevoEstado);
  };

  const handleCrearProspectos = async () => {
    setCreando(true);
    
    const prospectosCreados = [];
    const errores = [];
    
    try {
      // Filtrar solo los seleccionados
      const registrosACrear = registrosSinProspecto.filter((_, idx) => seleccionados[idx]);
      
      console.log(`🚀 Creando ${registrosACrear.length} prospectos...`);
      
      for (const registro of registrosACrear) {
        try {
          const whatsappNormalizado = normalizarWhatsApp(registro.whatsapp);
          
          // Buscar sede
          const sede = catalogos.sedes.find(s => 
            s.nombre_sede.toLowerCase().trim() === registro.sede?.toLowerCase().trim()
          );
          
          if (!sede) {
            errores.push({
              nombre: registro.nombre,
              error: `Sede "${registro.sede}" no encontrada`
            });
            continue;
          }
          
          // Buscar vendedor (opcional)
          let vendedor = null;
          if (registro.vendedor) {
            vendedor = catalogos.vendedores.find(v => 
              v.nombre.toLowerCase().trim() === registro.vendedor.toLowerCase().trim()
            );
          }
          
          // Crear prospecto
          const datosProspecto = {
            nombre: registro.nombre,
            whatsapp: whatsappNormalizado,
            fecha_ingreso: registro.fecha_ingreso || new Date().toISOString().split('T')[0],
            sede: sede.id,
            tipo_invitacion: 'Invitación',
            estado_pipeline: 'Agendado',
            notas: 'Creado automáticamente desde migración de clientes/ventas'
          };
          
          if (vendedor) {
            datosProspecto.vendedor_asignado = vendedor.id;
          }
          
          const nuevoProspecto = await Prospectos.create(datosProspecto);
          prospectosCreados.push({
            ...nuevoProspecto,
            whatsapp: whatsappNormalizado
          });
          
          console.log(`✅ Prospecto creado: ${registro.nombre} (${whatsappNormalizado})`);
        } catch (error) {
          console.error(`❌ Error creando prospecto ${registro.nombre}:`, error);
          errores.push({
            nombre: registro.nombre,
            error: error.message
          });
        }
      }
      
      console.log(`✅ Proceso completado: ${prospectosCreados.length} creados, ${errores.length} errores`);
      
      // Notificar al componente padre
      onProspectosCreados({
        prospectosCreados,
        errores
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error en proceso de creación:', error);
      alert('Error al crear prospectos: ' + error.message);
    } finally {
      setCreando(false);
    }
  };

  const cantidadSeleccionada = Object.values(seleccionados).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Crear Prospectos Faltantes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Alerta informativa */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">
                  Se detectaron {registrosSinProspecto?.length || 0} registros sin prospecto asociado
                </p>
                <p>
                  Selecciona los registros para los cuales deseas crear prospectos automáticamente.
                  Después de crearlos, las ventas se vincularán automáticamente.
                </p>
              </div>
            </div>
          </div>

          {/* Checkbox para seleccionar todos */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
            <Checkbox
              checked={todosSeleccionados}
              onCheckedChange={handleToggleTodos}
              id="select-all"
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium cursor-pointer"
            >
              Seleccionar todos ({registrosSinProspecto?.length || 0})
            </label>
          </div>

          {/* Lista de registros */}
          <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
            {registrosSinProspecto?.map((registro, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors"
              >
                <Checkbox
                  checked={seleccionados[idx] || false}
                  onCheckedChange={() => handleToggleSeleccion(idx)}
                  id={`registro-${idx}`}
                />
                <label
                  htmlFor={`registro-${idx}`}
                  className="flex-1 cursor-pointer"
                >
                  <div className="font-medium text-gray-900">
                    {registro.nombre}
                  </div>
                  <div className="text-sm text-gray-600 space-y-0.5">
                    <div>📱 {registro.whatsapp}</div>
                    <div>🏢 {registro.sede}</div>
                    {registro.vendedor && (
                      <div>👤 {registro.vendedor}</div>
                    )}
                    {registro.fecha_ingreso && (
                      <div>📅 {registro.fecha_ingreso}</div>
                    )}
                  </div>
                </label>
              </div>
            ))}
          </div>

          {/* Resumen de selección */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
            <strong>{cantidadSeleccionada}</strong> de{' '}
            <strong>{registrosSinProspecto?.length || 0}</strong> registros seleccionados
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={creando}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCrearProspectos}
            disabled={creando || cantidadSeleccionada === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {creando ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Crear {cantidadSeleccionada} Prospecto{cantidadSeleccionada !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}