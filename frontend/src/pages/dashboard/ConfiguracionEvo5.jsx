import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Copy, ExternalLink, Settings } from 'lucide-react';

export default function ConfiguracionEvo5() {
  const [copied, setCopied] = useState('');

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(''), 2000);
  };

  const secretos = [
    {
      nombre: 'EVO5_API_KEY',
      valor: '4F09A73D-6626-42A1-9D4E-7A1C5FB6B7BC',
      descripcion: 'Token de autenticación de la API de Evo5',
      requerido: true
    },
    {
      nombre: 'EVO5_BASE_URL',
      valor: 'https://evo-integracao-api.w12app.com.br/api',
      descripcion: 'URL base de la API de Evo5 (w12app)',
      requerido: false
    },
    {
      nombre: 'EVO5_GYM_ID',
      valor: '1',
      descripcion: 'ID del gimnasio en Evo5',
      requerido: false
    }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Configuración Evo5</h1>
        </div>
        <p className="text-purple-100">Configura las variables de entorno para la sincronización con w12app</p>
      </div>

      {/* Instrucciones */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertDescription className="text-sm">
          <p className="font-semibold text-blue-900 mb-2">📋 Instrucciones:</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-800">
            <li>Copia cada valor haciendo clic en el botón "Copiar"</li>
            <li>Ve a <strong>Configuración → Secretos</strong> en AgentUI</li>
            <li>Agrega cada secreto con el nombre y valor exactos</li>
            <li>Guarda los cambios</li>
            <li>Vuelve a la página Home y ejecuta el test</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Secretos a configurar */}
      <Card>
        <CardHeader>
          <CardTitle>🔑 Variables de Entorno Requeridas</CardTitle>
          <CardDescription>
            Configura estos secretos en AgentUI para habilitar la sincronización
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {secretos.map((secreto) => (
            <div key={secreto.nombre} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Label className="text-base font-semibold">{secreto.nombre}</Label>
                    {secreto.requerido && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                        Requerido
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{secreto.descripcion}</p>
                  
                  <div className="flex gap-2">
                    <Input 
                      value={secreto.valor} 
                      readOnly 
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(secreto.valor, secreto.nombre)}
                      className="shrink-0"
                    >
                      {copied === secreto.nombre ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pasos detallados */}
      <Card>
        <CardHeader>
          <CardTitle>📝 Pasos Detallados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Accede a Configuración de Secretos</h3>
                <p className="text-sm text-gray-600 mb-2">
                  En el menú lateral de AgentUI, ve a <strong>Configuración → Secretos</strong>
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://ventasprueba.sharkfit.info/settings/secrets', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir Configuración de Secretos
                </Button>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Agrega EVO5_API_KEY</h3>
                <p className="text-sm text-gray-600">
                  Haz clic en "Agregar Secreto" y configura:
                </p>
                <div className="mt-2 p-3 bg-gray-50 rounded border text-sm font-mono">
                  <div><strong>Nombre:</strong> EVO5_API_KEY</div>
                  <div><strong>Valor:</strong> 4F09A73D-6626-42A1-9D4E-7A1C5FB6B7BC</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Agrega EVO5_GYM_ID</h3>
                <p className="text-sm text-gray-600">
                  Agrega otro secreto:
                </p>
                <div className="mt-2 p-3 bg-gray-50 rounded border text-sm font-mono">
                  <div><strong>Nombre:</strong> EVO5_GYM_ID</div>
                  <div><strong>Valor:</strong> 1</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Guarda y Verifica</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Guarda los cambios y vuelve a la página Home para ejecutar el test
                </p>
                <Button
                  onClick={() => window.location.href = '/'}
                >
                  Ir a Home y Ejecutar Test
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-yellow-900">⚠️ Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-yellow-800">
          <div>
            <p className="font-semibold mb-1">Si el test sigue fallando después de configurar:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Verifica que los nombres estén escritos <strong>exactamente</strong> como se muestran (mayúsculas/minúsculas)</li>
              <li>Asegúrate de no tener espacios al inicio o final de los valores</li>
              <li>Espera 10-15 segundos después de guardar antes de ejecutar el test</li>
              <li>Si persiste, recarga la página (F5) y vuelve a intentar</li>
            </ul>
          </div>
          
          <div className="pt-3 border-t border-yellow-200">
            <p className="font-semibold mb-1">¿El token es correcto?</p>
            <p>Verifica en el panel de Evo5:</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => window.open('https://evo5.w12app.com.br/#/app/sharkfitchile/1/configuracoes/evo-api/token', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir Panel Evo5
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}