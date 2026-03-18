import React, { useState } from 'react';
import SeccionEvo from '@/components/SeccionEvo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, TrendingUp, Users, MessageSquare, PlayCircle, CheckCircle, XCircle, Loader2, RefreshCw, Download } from 'lucide-react';
import axios from 'axios';

export default function Home() {
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const ejecutarTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    
    try {
      const response = await axios.get('/api/health');
      const data = response.data || {};
      const isHealthy = data.status === 'ok' && data.estado === 'healthy';

      setTestResult({
        success: isHealthy,
        resumen: {
          total: 1,
          exitosos: isHealthy ? 1 : 0,
          fallidos: isHealthy ? 0 : 1
        },
        tests: {
          health: {
            status: isHealthy ? 'success' : 'error',
            message: isHealthy
              ? `Health check OK (${data.servicio || 'DATA-INTAKE'})`
              : `Health check no saludable (${data.estado || 'unknown'})`
          }
        },
        recomendaciones: isHealthy
          ? []
          : ['Revisar logs del backend y estado de MongoDB antes de sincronizar.']
      });
    } catch (error) {
      const backendError = error.response?.data?.error;
      setTestResult({
        success: false,
        error: backendError || 'No se pudo ejecutar el test de conexión',
        resumen: { total: 0, exitosos: 0, fallidos: 1 }
      });
    } finally {
      setTestLoading(false);
    }
  };

  const ejecutarSincronizacion = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    
    try {
      const response = await axios.post('/api/sync/run', {
        sourceId: 'evo',
        modo: 'incremental',
        entidades: ['clientes', 'ventas']
      });
      const data = response.data || {};

      setSyncResult({
        success: Boolean(data.exito),
        miembrosSincronizados: 0,
        prospectosSincronizados: 0,
        actividadesSincronizadas: 0,
        error: data.exito ? null : (data.error || 'No se pudo completar la sincronización')
      });
    } catch (error) {
      const backendError = error.response?.data?.error;
      setSyncResult({
        success: false,
        error: backendError || 'No se pudo completar la sincronización'
      });
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Dashboard Principal</h1>
        <p className="text-blue-100">Bienvenido al sistema de gestión Vendify</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado del Sistema</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Activo</div>
            <p className="text-xs text-muted-foreground">Sistema operativo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sincronización</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">Tiempo Real</div>
            <p className="text-xs text-muted-foreground">Actualización cada 60s</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Métricas</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">Comerciales</div>
            <p className="text-xs text-muted-foreground">Ventas y conversión</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Datos</CardTitle>
            <MessageSquare className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">Integrados</div>
            <p className="text-xs text-muted-foreground">Base de datos</p>
          </CardContent>
        </Card>
      </div>

      {/* Test de Sincronización Evo5 */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="text-purple-900">🔧 Sincronización Evo5</CardTitle>
          <CardDescription className="text-purple-700">
            Valida la conexión y sincroniza datos con la API de w12app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={ejecutarTest} 
                disabled={testLoading}
                className="flex-1 md:flex-none"
              >
                {testLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ejecutando test...
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Ejecutar Test de Conexión
                  </>
                )}
              </Button>

              {testResult && testResult.success && (
                <Button 
                  onClick={ejecutarSincronizacion}
                  disabled={syncLoading}
                  variant="default"
                  className="flex-1 md:flex-none bg-green-600 hover:bg-green-700"
                >
                  {syncLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Sincronizar Datos Ahora
                    </>
                  )}
                </Button>
              )}

              {testResult && !testResult.success && (
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="flex-1 md:flex-none"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Recargar Página
                </Button>
              )}
            </div>

            {syncResult && (
              <div className={`p-4 rounded-lg border ${
                syncResult.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  {syncResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <h3 className={`font-semibold ${
                    syncResult.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {syncResult.success ? 'Sincronización Completada' : 'Error en Sincronización'}
                  </h3>
                </div>

                {syncResult.success && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center p-2 bg-white rounded">
                      <div className="text-2xl font-bold text-blue-600">
                        {syncResult.miembrosSincronizados || 0}
                      </div>
                      <div className="text-xs text-gray-600">Miembros</div>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <div className="text-2xl font-bold text-purple-600">
                        {syncResult.prospectosSincronizados || 0}
                      </div>
                      <div className="text-xs text-gray-600">Prospectos</div>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <div className="text-2xl font-bold text-orange-600">
                        {syncResult.actividadesSincronizadas || 0}
                      </div>
                      <div className="text-xs text-gray-600">Actividades</div>
                    </div>
                  </div>
                )}

                {syncResult.error && (
                  <p className="text-sm text-red-800">{syncResult.error}</p>
                )}
              </div>
            )}

            {testResult && (
              <div className={`p-4 rounded-lg border ${
                testResult.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <h3 className={`font-semibold ${
                    testResult.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {testResult.success ? 'Test Exitoso' : 'Test Fallido'}
                  </h3>
                </div>

                {testResult.resumen && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center p-2 bg-white rounded">
                      <div className="text-2xl font-bold text-gray-900">
                        {testResult.resumen.total}
                      </div>
                      <div className="text-xs text-gray-600">Total</div>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <div className="text-2xl font-bold text-green-600">
                        {testResult.resumen.exitosos}
                      </div>
                      <div className="text-xs text-gray-600">Exitosos</div>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <div className="text-2xl font-bold text-red-600">
                        {testResult.resumen.fallidos}
                      </div>
                      <div className="text-xs text-gray-600">Fallidos</div>
                    </div>
                  </div>
                )}

                {testResult.tests && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-900">Resultados:</p>
                    {Object.entries(testResult.tests).map(([key, test]) => (
                      <div key={key} className="flex items-start gap-2 text-sm">
                        {test.status === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                        ) : test.status === 'error' ? (
                          <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                        ) : (
                          <div className="h-4 w-4 rounded-full bg-gray-300 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{key}</div>
                          <div className="text-xs text-gray-600">{test.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {testResult.recomendaciones && testResult.recomendaciones.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm font-semibold text-gray-900 mb-2">Recomendaciones:</p>
                    <ul className="space-y-1">
                      {testResult.recomendaciones.map((rec, idx) => (
                        <li key={idx} className="text-xs text-gray-700">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Información del Sistema */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">📊 Sistema de Métricas Comerciales</CardTitle>
          <CardDescription className="text-blue-700">
            Datos en tiempo real del sistema Vendify
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span><strong>Fuente de datos:</strong> Base de datos interna (AgentUI)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span><strong>Entidades utilizadas:</strong></span>
            </div>
            <ul className="ml-6 space-y-1 text-xs">
              <li>• Ventas - Registro de ventas cerradas</li>
              <li>• Leads_Diarios - Leads generados por día</li>
              <li>• Prospectos - Base de prospectos</li>
              <li>• Agendamientos - Citas y seguimientos</li>
            </ul>
            
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs font-semibold text-green-900 mb-1">✅ Métricas calculadas:</p>
              <ul className="text-xs text-green-800 space-y-1 ml-4">
                <li>✓ Total de ventas (Online y En Sede)</li>
                <li>✓ Monto total facturado</li>
                <li>✓ Leads, agendamientos y asistencia</li>
                <li>✓ Tasa de conversión</li>
                <li>✓ Días promedio de conversión</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Componente SeccionEvo */}
      <SeccionEvo />

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Accesos Rápidos</CardTitle>
          <CardDescription>Navega a las secciones principales del sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <a
              href="/dashboardcomercial"
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 mb-1">Dashboard Comercial</h3>
              <p className="text-sm text-gray-600">Métricas de ventas y conversión</p>
            </a>
            <a
              href="/dashboardfinanciero"
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 mb-1">Dashboard Financiero</h3>
              <p className="text-sm text-gray-600">Gestión de deudores y renovaciones</p>
            </a>
            <a
              href="/clientes"
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 mb-1">Clientes</h3>
              <p className="text-sm text-gray-600">Gestión y retención de clientes</p>
            </a>
            <a
              href="/prospectos"
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 mb-1">Prospectos</h3>
              <p className="text-sm text-gray-600">Seguimiento de leads</p>
            </a>
            <a
              href="/ventas"
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 mb-1">Ventas</h3>
              <p className="text-sm text-gray-600">Registro y análisis de ventas</p>
            </a>
            <a
              href="/agenda"
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 mb-1">Agenda</h3>
              <p className="text-sm text-gray-600">Agendamientos y seguimientos</p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}