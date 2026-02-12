import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Settings,
  ArrowLeft,
  FileText,
  Clock,
  Users
} from 'lucide-react';
import { Configuracion_Alertas } from '@/entities/Configuracion_Alertas';
import { createPageUrl } from '@/utils';

export default function AnalisisReglasAlertas() {
  const [reglas, setReglas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analisis, setAnalisis] = useState([]);

  useEffect(() => {
    cargarYAnalizar();
  }, []);

  const cargarYAnalizar = async () => {
    try {
      setLoading(true);
      const reglasData = await Configuracion_Alertas.list('-createdAt');
      setReglas(reglasData || []);
      
      // Analizar cada regla
      const analisisDetallado = reglasData.map(regla => analizarRegla(regla));
      setAnalisis(analisisDetallado);
    } catch (error) {
      console.error('Error cargando reglas:', error);
    } finally {
      setLoading(false);
    }
  };

  const analizarRegla = (regla) => {
    const problemas = [];
    const advertencias = [];
    const recomendaciones = [];

    // Validar campos requeridos
    if (!regla.nombre_regla || regla.nombre_regla.trim() === '') {
      problemas.push('Falta nombre de la regla');
    }

    // dias_umbral_activacion puede ser 0 (tarea inmediata), null o undefined es error
    if ((regla.dias_umbral_activacion === null || regla.dias_umbral_activacion === undefined) && regla.tipo_alerta !== 'cliente_nuevo') {
      problemas.push('Falta dias_umbral_activacion (campo requerido)');
    }

    // Validar configuración según tipo
    if (regla.tipo_alerta === 'cliente_nuevo') {
      // Validar tareas automáticas
      const tareasAutomaticas = regla.tareas_automaticas || [];
      
      if (tareasAutomaticas.length === 0) {
        advertencias.push('No tiene tareas automáticas configuradas. Se creará una tarea genérica de bienvenida.');
        recomendaciones.push('Configura tareas específicas para diferentes departamentos (Soporte, Experiencia Cliente, etc.)');
      } else {
        // Validar cada tarea
        tareasAutomaticas.forEach((tarea, idx) => {
          if (!tarea.titulo) {
            problemas.push(`Tarea ${idx + 1}: falta título`);
          }
          if (!tarea.descripcion) {
            advertencias.push(`Tarea ${idx + 1}: falta descripción`);
          }
          if (!tarea.asignar_a) {
            problemas.push(`Tarea ${idx + 1}: falta asignar_a`);
          }
          if (tarea.asignar_a === 'staff_especifico' && !tarea.staff_id) {
            problemas.push(`Tarea ${idx + 1}: asignación a staff específico pero falta staff_id`);
          }
          if (tarea.asignar_a === 'departamento' && !tarea.departamento) {
            problemas.push(`Tarea ${idx + 1}: asignación a departamento pero falta departamento`);
          }
          if (!tarea.dias_limite) {
            advertencias.push(`Tarea ${idx + 1}: no tiene días límite (usará 3 días por defecto)`);
          }
        });
      }
    } else {
      // Para otros tipos de alerta
      if (!regla.dias_prioridad_alta) {
        advertencias.push('No tiene dias_prioridad_alta configurado. Las alertas no escalarán a prioridad Alta.');
        recomendaciones.push('Configura dias_prioridad_alta para escalar alertas importantes.');
      }
      if (!regla.dias_critico) {
        advertencias.push('No tiene dias_critico configurado. Las alertas no escalarán a Crítica.');
        recomendaciones.push('Configura dias_critico para casos urgentes que requieren atención inmediata.');
      }
      if (!regla.crear_tarea_automatica) {
        advertencias.push('No crea tareas automáticas. Solo generará alertas en la tabla Alertas_Renovacion.');
        recomendaciones.push('Activa "crear_tarea_automatica" para que aparezcan en el panel del RS.');
      }
    }

    // Validar asignación
    if (regla.asignar_a === 'staff_especifico' && !regla.staff_asignado_id) {
      problemas.push('Asignación a staff específico pero falta staff_asignado_id');
    }
    if (regla.asignar_a === 'departamento' && !regla.departamento) {
      problemas.push('Asignación a departamento pero falta departamento');
    }

    // Validar frecuencia
    if (!regla.frecuencia_verificacion) {
      advertencias.push('No tiene frecuencia de verificación (usará "diaria" por defecto)');
    }

    // Determinar estado
    let estado = 'correcta';
    let estadoTexto = '✅ CORRECTAMENTE CONFIGURADA';
    let estadoColor = 'bg-green-500';

    if (problemas.length > 0) {
      estado = 'no_ejecutable';
      estadoTexto = '❌ NO EJECUTABLE';
      estadoColor = 'bg-red-500';
    } else if (advertencias.length > 0) {
      estado = 'ejecutable_con_advertencias';
      estadoTexto = '⚠️ EJECUTABLE CON ADVERTENCIAS';
      estadoColor = 'bg-yellow-500';
    }

    return {
      regla,
      estado,
      estadoTexto,
      estadoColor,
      problemas,
      advertencias,
      recomendaciones
    };
  };

  const getTipoAlertaLabel = (tipo) => {
    const labels = {
      renovacion: 'Renovación',
      deudor: 'Deudor',
      contrato_pendiente: 'Contrato Pendiente',
      tarjeta_pendiente: 'Tarjeta Pendiente',
      cliente_riesgo: 'Cliente en Riesgo',
      seguimiento_online: 'Seguimiento Online',
      baja_programada: 'Baja Programada',
      nps_cruzado: 'NPS Cruzado',
      cliente_nuevo: 'Cliente Nuevo (Onboarding)'
    };
    return labels[tipo] || tipo;
  };

  const getTipoAlertaColor = (tipo) => {
    const colors = {
      renovacion: 'bg-orange-500',
      deudor: 'bg-red-500',
      contrato_pendiente: 'bg-blue-500',
      tarjeta_pendiente: 'bg-purple-500',
      cliente_riesgo: 'bg-yellow-500',
      seguimiento_online: 'bg-green-500',
      baja_programada: 'bg-pink-500',
      nps_cruzado: 'bg-indigo-500',
      cliente_nuevo: 'bg-cyan-500'
    };
    return colors[tipo] || 'bg-gray-500';
  };

  // Métricas
  const totalReglas = reglas.length;
  const reglasActivas = reglas.filter(r => r.activa).length;
  const reglasCorrectas = analisis.filter(a => a.estado === 'correcta').length;
  const reglasConAdvertencias = analisis.filter(a => a.estado === 'ejecutable_con_advertencias').length;
  const reglasNoEjecutables = analisis.filter(a => a.estado === 'no_ejecutable').length;

  // Tipos de alerta esperados
  const tiposEsperados = [
    'renovacion',
    'deudor',
    'contrato_pendiente',
    'tarjeta_pendiente',
    'cliente_riesgo',
    'seguimiento_online',
    'baja_programada',
    'nps_cruzado',
    'cliente_nuevo'
  ];

  const tiposConfigurados = tiposEsperados.map(tipo => {
    const reglasDelTipo = reglas.filter(r => r.tipo_alerta === tipo);
    const activas = reglasDelTipo.filter(r => r.activa).length;
    return {
      tipo,
      label: getTipoAlertaLabel(tipo),
      color: getTipoAlertaColor(tipo),
      configurada: reglasDelTipo.length > 0,
      cantidad: reglasDelTipo.length,
      activas
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Analizando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('ConfiguracionAlertas')}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </Link>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="w-8 h-8" />
              Análisis de Reglas de Alertas
            </h1>
          </div>
          <p className="text-gray-600 mt-1">
            Verificación de configuración y estado de ejecución
          </p>
        </div>
        <Button onClick={cargarYAnalizar}>
          Recargar Análisis
        </Button>
      </div>

      {/* Métricas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{totalReglas}</div>
            <p className="text-sm text-gray-600">Total Reglas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{reglasActivas}</div>
            <p className="text-sm text-gray-600">Activas</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{reglasCorrectas}</div>
            <p className="text-sm text-gray-600">✅ Correctas</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{reglasConAdvertencias}</div>
            <p className="text-sm text-gray-600">⚠️ Con Advertencias</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{reglasNoEjecutables}</div>
            <p className="text-sm text-gray-600">❌ No Ejecutables</p>
          </CardContent>
        </Card>
      </div>

      {/* Resumen por Tipo de Alerta */}
      <Card>
        <CardHeader>
          <CardTitle>Tipos de Alerta Configurados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {tiposConfigurados.map(tipo => (
              <div 
                key={tipo.tipo} 
                className={`border rounded-lg p-3 ${tipo.configurada ? 'bg-white' : 'bg-gray-50'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={tipo.color}>
                      {tipo.label}
                    </Badge>
                    {tipo.configurada ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {tipo.activas}/{tipo.cantidad} activas
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Análisis Detallado */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis Detallado de Reglas ({analisis.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {analisis.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No hay reglas configuradas para analizar</p>
              <Link to={createPageUrl('ConfiguracionAlertas')}>
                <Button className="mt-4">
                  <Settings className="w-4 h-4 mr-2" />
                  Ir a Configuración
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {analisis.map((item, idx) => (
                <div 
                  key={item.regla.id} 
                  className={`border rounded-lg p-4 ${
                    item.estado === 'no_ejecutable' ? 'border-red-300 bg-red-50' :
                    item.estado === 'ejecutable_con_advertencias' ? 'border-yellow-300 bg-yellow-50' :
                    'border-green-300 bg-green-50'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={getTipoAlertaColor(item.regla.tipo_alerta)}>
                          {getTipoAlertaLabel(item.regla.tipo_alerta)}
                        </Badge>
                        <h3 className="font-semibold text-lg">{item.regla.nombre_regla}</h3>
                        {item.regla.activa ? (
                          <Badge className="bg-green-500">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Activa
                          </Badge>
                        ) : (
                          <Badge variant="outline">Inactiva</Badge>
                        )}
                      </div>
                      <Badge className={item.estadoColor}>
                        {item.estadoTexto}
                      </Badge>
                    </div>
                  </div>

                  {/* Configuración */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">Umbral:</span>
                      <span className="ml-2 font-medium">
                        {item.regla.dias_umbral_activacion === 0 ? (
                          <span className="text-blue-600 font-semibold">0 días (Inmediato)</span>
                        ) : (
                          `${item.regla.dias_umbral_activacion || 'N/A'} días`
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Prioridad Alta:</span>
                      <span className="ml-2 font-medium">{item.regla.dias_prioridad_alta || 'N/A'} días</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Crítico:</span>
                      <span className="ml-2 font-medium">{item.regla.dias_critico || 'N/A'} días</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Frecuencia:</span>
                      <span className="ml-2 font-medium capitalize">{item.regla.frecuencia_verificacion || 'diaria'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-3 text-sm">
                    {item.regla.crear_tarea_automatica && (
                      <Badge variant="outline" className="bg-blue-50">
                        <Clock className="w-3 h-3 mr-1" />
                        Crea Tarea
                      </Badge>
                    )}
                    {item.regla.asignar_a && (
                      <Badge variant="outline" className="bg-purple-50">
                        <Users className="w-3 h-3 mr-1" />
                        {item.regla.asignar_a === 'responsable_sede' ? 'RS' : 
                         item.regla.asignar_a === 'staff_especifico' ? 'Staff' : 
                         'Departamento'}
                      </Badge>
                    )}
                    {item.regla.tipo_alerta === 'cliente_nuevo' && item.regla.tareas_automaticas && (
                      <Badge variant="outline" className="bg-cyan-50">
                        {item.regla.tareas_automaticas.length} tareas automáticas
                      </Badge>
                    )}
                  </div>

                  {/* Problemas */}
                  {item.problemas.length > 0 && (
                    <div className="mb-3 p-3 bg-red-100 border border-red-300 rounded">
                      <div className="flex items-start gap-2">
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-red-800 mb-1">Problemas Críticos:</p>
                          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                            {item.problemas.map((problema, i) => (
                              <li key={i}>{problema}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Advertencias */}
                  {item.advertencias.length > 0 && (
                    <div className="mb-3 p-3 bg-yellow-100 border border-yellow-300 rounded">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-yellow-800 mb-1">Advertencias:</p>
                          <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                            {item.advertencias.map((advertencia, i) => (
                              <li key={i}>{advertencia}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recomendaciones */}
                  {item.recomendaciones.length > 0 && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-blue-800 mb-1">Recomendaciones:</p>
                          <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                            {item.recomendaciones.map((recomendacion, i) => (
                              <li key={i}>{recomendacion}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumen Final */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-lg mb-3">📋 Resumen del Análisis</h3>
          <div className="space-y-2 text-sm">
            <p>
              ✅ <strong>{reglasCorrectas}</strong> reglas están correctamente configuradas y son ejecutables sin problemas.
            </p>
            <p>
              ⚠️ <strong>{reglasConAdvertencias}</strong> reglas son ejecutables pero tienen advertencias que deberías revisar.
            </p>
            <p>
              ❌ <strong>{reglasNoEjecutables}</strong> reglas tienen problemas críticos y NO son ejecutables.
            </p>
            {reglasNoEjecutables > 0 && (
              <p className="text-red-700 font-semibold mt-3">
                ⚠️ Debes corregir las reglas no ejecutables antes de activarlas.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}