import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, AlertTriangle, Loader2, FileDown, X, Edit, Trash2 } from 'lucide-react';
import { Sucursales } from '@/entities/Sucursales';
import { Staff } from '@/entities/Staff';
import { Planes_Servicios } from '@/entities/Planes_Servicios';
import CorregirRegistroDialog from './CorregirRegistroDialog';
import { validarRegistro, normalizarWhatsApp } from '@/utils/migracionHelpers';

export default function ValidacionMigracionDialog({ open, onOpenChange, registros, onContinuar }) {
  const [validaciones, setValidaciones] = useState([]);
  const [catalogos, setCatalogos] = useState({ sedes: [], vendedores: [], planes: [] });
  const [loading, setLoading] = useState(false);
  const [registroEditando, setRegistroEditando] = useState(null);
  const [registrosOmitidos, setRegistrosOmitidos] = useState(new Set());

  useEffect(() => {
    if (open && registros?.length > 0) {
      cargarCatalogosYValidar();
    }
  }, [open, registros]);

  const cargarCatalogosYValidar = async () => {
    setLoading(true);
    try {
      // Cargar catálogos
      const [sedesData, staffData, planesData] = await Promise.all([
        Sucursales.filter({ activo: true }),
        Staff.filter({ activo: true }),
        Planes_Servicios.filter({ activo: true })
      ]);

      const cats = {
        sedes: sedesData,
        vendedores: staffData,
        planes: planesData
      };
      setCatalogos(cats);

      // Validar cada registro
      const validacionesPromises = registros.map(async (registro, index) => {
        const validacion = await validarRegistro(registro, cats);
        return {
          fila: index + 1,
          registro,
          ...validacion
        };
      });

      const resultados = await Promise.all(validacionesPromises);
      setValidaciones(resultados);
    } catch (error) {
      console.error('Error validando registros:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCorregirRegistro = (validacion) => {
    setRegistroEditando({ ...validacion.registro, fila: validacion.fila });
  };

  const handleGuardarCorreccion = async (registroCorregido) => {
    // Actualizar el registro en la lista
    const nuevasValidaciones = [...validaciones];
    const index = nuevasValidaciones.findIndex(v => v.fila === registroCorregido.fila);
    
    if (index !== -1) {
      // Re-validar el registro corregido
      const validacion = await validarRegistro(registroCorregido, catalogos);
      nuevasValidaciones[index] = {
        fila: registroCorregido.fila,
        registro: registroCorregido,
        ...validacion
      };
      setValidaciones(nuevasValidaciones);
    }
    
    setRegistroEditando(null);
  };

  const handleOmitirRegistro = (fila) => {
    setRegistrosOmitidos(prev => new Set([...prev, fila]));
  };

  const handleIncluirRegistro = (fila) => {
    setRegistrosOmitidos(prev => {
      const nuevo = new Set(prev);
      nuevo.delete(fila);
      return nuevo;
    });
  };

  const handleContinuar = () => {
    // Filtrar registros válidos y no omitidos
    const registrosValidos = validaciones
      .filter(v => v.valido && !registrosOmitidos.has(v.fila))
      .map(v => v.registro);
    
    onContinuar(registrosValidos);
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-3 text-lg">Validando registros...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const registrosValidos = validaciones.filter(v => v.valido && !registrosOmitidos.has(v.fila));
  const registrosConErrores = validaciones.filter(v => !v.valido && !registrosOmitidos.has(v.fila));
  const registrosConAdvertencias = validaciones.filter(v => v.valido && v.advertencias.length > 0 && !registrosOmitidos.has(v.fila));
  const totalOmitidos = registrosOmitidos.size;

  const puedenContinuar = registrosConErrores.length === 0 && registrosValidos.length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              Validación de Datos - Revisar antes de migrar
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Resumen */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-900">Válidos</span>
                </div>
                <div className="text-2xl font-bold text-green-700">{registrosValidos.length}</div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span className="font-semibold text-yellow-900">Advertencias</span>
                </div>
                <div className="text-2xl font-bold text-yellow-700">{registrosConAdvertencias.length}</div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-900">Errores</span>
                </div>
                <div className="text-2xl font-bold text-red-700">{registrosConErrores.length}</div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <X className="h-5 w-5 text-gray-600" />
                  <span className="font-semibold text-gray-900">Omitidos</span>
                </div>
                <div className="text-2xl font-bold text-gray-700">{totalOmitidos}</div>
              </div>
            </div>

            {/* Errores Críticos */}
            {registrosConErrores.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  ERRORES CRÍTICOS (deben corregirse)
                </h3>
                <div className="space-y-2">
                  {registrosConErrores.map(validacion => (
                    <div key={validacion.fila} className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-red-900 mb-2">
                            Fila {validacion.fila}: {validacion.registro['Nombre y Apellido']}
                          </div>
                          <ul className="space-y-1">
                            {validacion.errores.map((error, idx) => (
                              <li key={idx} className="text-sm text-red-700 flex items-start gap-2">
                                <span className="text-red-500">❌</span>
                                {error}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCorregirRegistro(validacion)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Corregir
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOmitirRegistro(validacion.fila)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Omitir
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Advertencias */}
            {registrosConAdvertencias.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-yellow-700 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  ADVERTENCIAS (se pueden migrar, pero revisar)
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {registrosConAdvertencias.map(validacion => (
                    <div key={validacion.fila} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-yellow-900 mb-2">
                            Fila {validacion.fila}: {validacion.registro['Nombre y Apellido']}
                          </div>
                          <ul className="space-y-1">
                            {validacion.advertencias.map((advertencia, idx) => (
                              <li key={idx} className="text-sm text-yellow-700 flex items-start gap-2">
                                <span className="text-yellow-500">⚠️</span>
                                {advertencia}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCorregirRegistro(validacion)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Registros Omitidos */}
            {totalOmitidos > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                  <X className="h-5 w-5" />
                  REGISTROS OMITIDOS
                </h3>
                <div className="space-y-2">
                  {validaciones
                    .filter(v => registrosOmitidos.has(v.fila))
                    .map(validacion => (
                      <div key={validacion.fila} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-gray-900">
                              Fila {validacion.fila}: {validacion.registro['Nombre y Apellido']}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleIncluirRegistro(validacion.fila)}
                          >
                            Incluir nuevamente
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Validaciones Correctas */}
            {registrosValidos.length > 0 && registrosConAdvertencias.length === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">
                    {registrosValidos.length} registros sin problemas y listos para migrar
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={cargarCatalogosYValidar}
              >
                🔄 Re-validar
              </Button>
              <Button
                onClick={handleContinuar}
                disabled={!puedenContinuar}
                className="bg-blue-600 hover:bg-blue-700"
              >
                🚀 Continuar con Migración ({registrosValidos.length} registros)
              </Button>
            </div>
          </DialogFooter>

          {!puedenContinuar && registrosConErrores.length > 0 && (
            <div className="text-center text-sm text-red-600 pb-2">
              ⚠️ No puedes continuar hasta resolver los errores críticos
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Corrección */}
      <CorregirRegistroDialog
        open={!!registroEditando}
        onOpenChange={(open) => !open && setRegistroEditando(null)}
        registro={registroEditando}
        onGuardar={handleGuardarCorreccion}
      />
    </>
  );
}