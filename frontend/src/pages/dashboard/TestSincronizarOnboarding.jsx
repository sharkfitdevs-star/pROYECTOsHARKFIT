import React, { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, PlayCircle, CheckCircle2, XCircle, Users, FileText } from 'lucide-react';

export default function TestSincronizarOnboarding() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const ejecutarSincronizacion = async () => {
    if (!confirm('¿Estás seguro de sincronizar todos los clientes? Esto creará registros de onboarding para todos los clientes que no lo tengan.')) {
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await axios.post('/api/sincronizarOnboardingClientes', {});
      setResult(response.data);
    } catch (err) {
      console.error('Error ejecutando sincronización:', err);
      setError(err.response?.data?.message || err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Sincronizar Onboarding de Clientes
          </CardTitle>
          <CardDescription>
            Esta función creará registros de onboarding para todos los clientes existentes que no tienen uno.
            Es útil para la migración inicial del sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Importante</h3>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Esta función solo debe ejecutarse UNA VEZ para la migración inicial</li>
              <li>• Creará registros de onboarding para TODOS los clientes sin uno</li>
              <li>• Los nuevos clientes se agregarán automáticamente en el futuro</li>
              <li>• No duplicará registros existentes</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">¿Qué hace esta función?</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Lee todos los clientes de la base de datos</li>
              <li>✓ Verifica cuáles NO tienen registro en Onboarding_Clientes</li>
              <li>✓ Crea un registro de onboarding para cada uno con:</li>
              <li className="ml-4">- contrato_firmado: false</li>
              <li className="ml-4">- tarjeta_registrada: false</li>
              <li className="ml-4">- estado_onboarding: Pendiente</li>
              <li>✓ Retorna un resumen de la operación</li>
            </ul>
          </div>

          <Button 
            onClick={ejecutarSincronizacion} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Sincronizando clientes...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-5 w-5" />
                Ejecutar Sincronización
              </>
            )}
          </Button>

          {result && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold text-green-900">✅ Sincronización completada</p>
                  
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div className="bg-white rounded p-3 border border-green-200">
                      <div className="text-2xl font-bold text-green-600">{result.totalClientes}</div>
                      <div className="text-xs text-gray-600">Total Clientes</div>
                    </div>
                    <div className="bg-white rounded p-3 border border-blue-200">
                      <div className="text-2xl font-bold text-blue-600">{result.clientesConOnboardingPrevio}</div>
                      <div className="text-xs text-gray-600">Ya tenían Onboarding</div>
                    </div>
                    <div className="bg-white rounded p-3 border border-green-200 col-span-2">
                      <div className="text-3xl font-bold text-green-600">{result.clientesCreados}</div>
                      <div className="text-xs text-gray-600">Registros Creados</div>
                    </div>
                  </div>

                  {result.resultados && result.resultados.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-green-900 mb-2">
                        Primeros {result.resultados.length} registros creados:
                      </p>
                      <div className="bg-white rounded p-3 text-xs max-h-40 overflow-y-auto">
                        {result.resultados.map((r, i) => (
                          <div key={i} className="py-1 border-b last:border-b-0">
                            {r.error ? (
                              <span className="text-red-600">❌ {r.nombre} - Error: {r.error}</span>
                            ) : (
                              <span className="text-green-700">✓ {r.nombre}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Próximo paso:</strong> Ve a la página "Sistema Online" para ver todos los clientes en onboarding.
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold text-red-900">❌ Error al ejecutar la sincronización</p>
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
            <h4 className="font-semibold text-gray-900 mb-2">📝 Después de la sincronización</h4>
            <ul className="text-gray-700 space-y-1">
              <li>1. Ve a la página <strong>Sistema Online</strong></li>
              <li>2. Verás todos los clientes con sus checks de contrato y tarjeta</li>
              <li>3. Marca los checks según corresponda</li>
              <li>4. El sistema generará tareas automáticas para los pendientes después de 2 días</li>
              <li>5. Esta página de prueba puede eliminarse después de la migración</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}