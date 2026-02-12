import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Save, Loader2, Settings } from 'lucide-react';
import { Configuracion_Evo5 } from '@/entities/Configuracion_Evo5';

export default function ConfigurarEvo5() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [config, setConfig] = useState({
    nombre: 'default',
    base_url: 'https://evo-integracao-api.w12app.com.br/api',
    api_key: '4F09A73D-6626-42A1-9D4E-7A1C5FB6B7BC',
    gym_id: '1',
    instance_id: 'sharkfitchile',
    activo: true
  });

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      const configs = await Configuracion_Evo5.filter({ nombre: 'default' });
      if (configs && configs.length > 0) {
        setConfig(configs[0]);
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    } finally {
      setLoading(false);
    }
  };

  const guardarConfiguracion = async () => {
    setSaving(true);
    setSaved(false);

    try {
      // Buscar si ya existe
      const existentes = await Configuracion_Evo5.filter({ nombre: 'default' });
      
      if (existentes && existentes.length > 0) {
        // Actualizar
        await Configuracion_Evo5.update(existentes[0].id, config);
      } else {
        // Crear
        await Configuracion_Evo5.create(config);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error guardando configuración:', error);
      alert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Configurar Evo5</h1>
        </div>
        <p className="text-blue-100">Configura la conexión con la API de w12app</p>
      </div>

      {/* Formulario */}
      <Card>
        <CardHeader>
          <CardTitle>🔑 Credenciales de Evo5</CardTitle>
          <CardDescription>
            Ingresa los datos de conexión a la API de w12app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="base_url">Base URL</Label>
            <Input
              id="base_url"
              value={config.base_url}
              onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
              placeholder="https://evo-integracao-api.w12app.com.br/api"
            />
            <p className="text-xs text-gray-500">URL base de la API de Evo5</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api_key">API Key *</Label>
            <Input
              id="api_key"
              value={config.api_key}
              onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
              placeholder="4F09A73D-6626-42A1-9D4E-7A1C5FB6B7BC"
              type="password"
            />
            <p className="text-xs text-gray-500">Token de autenticación de Evo5</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gym_id">Gym ID</Label>
              <Input
                id="gym_id"
                value={config.gym_id}
                onChange={(e) => setConfig({ ...config, gym_id: e.target.value })}
                placeholder="1"
              />
              <p className="text-xs text-gray-500">ID del gimnasio</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instance_id">Instance ID</Label>
              <Input
                id="instance_id"
                value={config.instance_id}
                onChange={(e) => setConfig({ ...config, instance_id: e.target.value })}
                placeholder="sharkfitchile"
              />
              <p className="text-xs text-gray-500">ID de la instancia</p>
            </div>
          </div>

          <Button
            onClick={guardarConfiguracion}
            disabled={saving || !config.api_key}
            className="w-full"
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Guardando...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="mr-2 h-5 w-5" />
                Guardado ✓
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                Guardar Configuración
              </>
            )}
          </Button>

          {saved && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="ml-6 text-green-800">
                Configuración guardada correctamente. Ahora puedes ejecutar el test de conexión.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Valores por defecto */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">📋 Valores Recomendados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-800">
          <div className="grid grid-cols-1 gap-2">
            <div className="p-3 bg-white rounded border">
              <strong>Base URL:</strong>
              <code className="block mt-1 text-xs">https://evo-integracao-api.w12app.com.br/api</code>
            </div>
            <div className="p-3 bg-white rounded border">
              <strong>API Key:</strong>
              <code className="block mt-1 text-xs">4F09A73D-6626-42A1-9D4E-7A1C5FB6B7BC</code>
            </div>
            <div className="p-3 bg-white rounded border">
              <strong>Gym ID:</strong>
              <code className="block mt-1 text-xs">1</code>
            </div>
            <div className="p-3 bg-white rounded border">
              <strong>Instance ID:</strong>
              <code className="block mt-1 text-xs">sharkfitchile</code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Siguiente paso */}
      <Card>
        <CardHeader>
          <CardTitle>✅ Siguiente Paso</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 mb-4">
            Después de guardar la configuración, ve a la página de Inicio y ejecuta el test de conexión.
          </p>
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
          >
            Ir a Inicio
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}