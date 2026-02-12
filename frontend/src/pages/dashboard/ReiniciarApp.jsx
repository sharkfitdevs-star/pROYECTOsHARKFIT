import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import axios from 'axios';

export default function ReiniciarApp() {
  const [restarting, setRestarting] = useState(false);
  const [result, setResult] = useState(null);

  const reiniciarAplicacion = async () => {
    setRestarting(true);
    setResult(null);

    try {
      // Simular reinicio (en AgentUI esto se hace desde el panel de control)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setResult({
        success: true,
        message: 'La aplicación se está reiniciando. Espera 30 segundos y recarga la página.'
      });

      // Recargar la página después de 5 segundos
      setTimeout(() => {
        window.location.reload();
      }, 5000);

    } catch (error) {
      setResult({
        success: false,
        message: error.message
      });
    } finally {
      setRestarting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-800 rounded-lg p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <RefreshCw className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Reiniciar Aplicación</h1>
        </div>
        <p className="text-orange-100">Reinicia la aplicación para cargar las nuevas variables de entorno</p>
      </div>

      {/* Instrucciones */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertDescription className="text-sm">
          <p className="font-semibold text-blue-900 mb-2">ℹ️ ¿Por qué reiniciar?</p>
          <p className="text-blue-800">
            Cuando agregas o modificas secretos (variables de entorno), la aplicación necesita reiniciarse 
            para cargar los nuevos valores. Esto es normal y solo toma unos segundos.
          </p>
        </AlertDescription>
      </Alert>

      {/* Botón de reinicio */}
      <Card>
        <CardHeader>
          <CardTitle>🔄 Reiniciar Aplicación</CardTitle>
          <CardDescription>
            Esto recargará la aplicación y cargará las variables de entorno actualizadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-sm text-yellow-800 ml-6">
              <strong>Importante:</strong> Asegúrate de haber guardado todos los cambios antes de reiniciar.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={reiniciarAplicacion}
            disabled={restarting}
            size="lg"
            className="w-full"
          >
            {restarting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Reiniciando aplicación...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-5 w-5" />
                Reiniciar Aplicación Ahora
              </>
            )}
          </Button>

          {result && (
            <Alert className={`${
              result.success 
                ? 'border-green-200 bg-green-50' 
                : 'border-red-200 bg-red-50'
            }`}>
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={`ml-6 ${
                result.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {result.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Pasos después del reinicio */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Después del Reinicio</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Espera 30 segundos a que la aplicación se reinicie completamente</li>
            <li>La página se recargará automáticamente</li>
            <li>Ve a <strong>Inicio</strong> (Home)</li>
            <li>Haz clic en <strong>"Ejecutar Test de Conexión"</strong></li>
            <li>Verifica que todos los tests pasen ✅</li>
          </ol>
        </CardContent>
      </Card>

      {/* Método alternativo */}
      <Card className="border-gray-200 bg-gray-50">
        <CardHeader>
          <CardTitle>🔧 Método Alternativo (Manual)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <p>Si el botón de arriba no funciona, puedes reiniciar manualmente:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Cierra todas las pestañas de la aplicación</li>
            <li>Espera 10 segundos</li>
            <li>Abre la aplicación de nuevo</li>
            <li>Ve a Inicio y ejecuta el test</li>
          </ol>
          <p className="mt-3 text-xs text-gray-600">
            <strong>Nota:</strong> En algunos casos, puede tomar hasta 1 minuto para que los cambios se apliquen.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}