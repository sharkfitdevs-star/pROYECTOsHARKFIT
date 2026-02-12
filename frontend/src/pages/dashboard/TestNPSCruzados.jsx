import React, { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, PlayCircle, CheckCircle2, XCircle } from 'lucide-react';

export default function TestNPSCruzados() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const ejecutarFuncion = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await axios.post('/api/generarTareasNPSCruzados', {});
      setResult(response.data);
    } catch (err) {
      console.error('Error ejecutando función:', err);
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
            <PlayCircle className="h-6 w-6 text-blue-600" />
            Test Manual - Generar Tareas NPS Cruzados
          </CardTitle>
          <CardDescription>
            Ejecuta manualmente la función que genera tareas de NPS Cruzados cada hora.
            Esta página es temporal mientras se configura el scheduled trigger automático.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">¿Qué hace esta función?</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Busca prospectos en "NPS Online" con ≥2 días desde fecha_ingreso_nps</li>
              <li>✓ Filtra solo los que NO tienen compra de Plan/Programa</li>
              <li>✓ Aplica cruce de sedes (Nogales→Cisterna, Colón→Buin, etc.)</li>
              <li>✓ Crea tareas tipo "nps_cruzado" para el RS de la sede cruzada</li>
              <li>✓ Previene duplicados</li>
            </ul>
          </div>

          <Button 
            onClick={ejecutarFuncion} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Ejecutando función...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-5 w-5" />
                Ejecutar Ahora
              </>
            )}
          </Button>

          {result && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold text-green-900">✅ Función ejecutada exitosamente</p>
                  <div className="bg-white rounded p-3 text-sm">
                    <pre className="whitespace-pre-wrap text-gray-700">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                  {result.tareasCreadas !== undefined && (
                    <p className="text-green-800 font-medium">
                      📋 Tareas creadas: {result.tareasCreadas}
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold text-red-900">❌ Error al ejecutar la función</p>
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
            <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Nota Importante</h4>
            <p className="text-yellow-800">
              Esta página es solo para pruebas. Una vez configurado el scheduled trigger 
              en AgentUI Platform, esta función se ejecutará automáticamente cada hora 
              y podrás eliminar esta página de prueba.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
            <h4 className="font-semibold text-gray-900 mb-2">📧 Configurar Scheduled Trigger</h4>
            <p className="text-gray-700 mb-2">
              Contacta a soporte para configurar la ejecución automática:
            </p>
            <p className="text-gray-600">
              <strong>Email:</strong> katherine@agentui.ai
            </p>
            <div className="mt-3 bg-white rounded p-3 border border-gray-300">
              <p className="text-xs text-gray-600 mb-1">Configuración necesaria:</p>
              <ul className="text-xs text-gray-700 space-y-1 font-mono">
                <li>• Cron: 0 * * * *</li>
                <li>• URL: https://ventas.sharkfit.info/api/generarTareasNPSCruzados</li>
                <li>• Method: POST</li>
                <li>• Body: {'{}'}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}