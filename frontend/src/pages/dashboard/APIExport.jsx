import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Download, Play, Code } from 'lucide-react';
import { obtenerMetricasClientes } from '@/utils/apiMetricasClientes';
import { obtenerTasasConversion } from '@/utils/apiTasasConversion';
import { obtenerMetricasComerciales } from '@/utils/apiMetricasComerciales';
import { Sucursales } from '@/entities/Sucursales';

export default function APIExport() {
  const [sedes, setSedes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('clientes');
  
  // Estados para filtros
  const [filtrosClientes, setFiltrosClientes] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    sede: ''
  });
  const [filtrosTasas, setFiltrosTasas] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    sede: ''
  });
  const [filtrosComerciales, setFiltrosComerciales] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    sede: ''
  });

  // Estados para resultados
  const [resultadoClientes, setResultadoClientes] = useState(null);
  const [resultadoTasas, setResultadoTasas] = useState(null);
  const [resultadoComerciales, setResultadoComerciales] = useState(null);

  useEffect(() => {
    cargarSedes();
  }, []);

  const cargarSedes = async () => {
    const sedesData = await Sucursales.list('nombre_sede');
    setSedes(sedesData.filter(s => s.activo));
  };

  const ejecutarMetricasClientes = async () => {
    setLoading(true);
    const resultado = await obtenerMetricasClientes(filtrosClientes);
    setResultadoClientes(resultado);
    setLoading(false);
  };

  const ejecutarTasasConversion = async () => {
    setLoading(true);
    const resultado = await obtenerTasasConversion(filtrosTasas);
    setResultadoTasas(resultado);
    setLoading(false);
  };

  const ejecutarMetricasComerciales = async () => {
    setLoading(true);
    const resultado = await obtenerMetricasComerciales(filtrosComerciales);
    setResultadoComerciales(resultado);
    setLoading(false);
  };

  const copiarJSON = (data) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    alert('JSON copiado al portapapeles');
  };

  const descargarJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
  };

  const FiltrosComunes = ({ filtros, setFiltros }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <div>
        <Label>Fecha Inicio</Label>
        <Input
          type="date"
          value={filtros.fecha_inicio}
          onChange={(e) => setFiltros({ ...filtros, fecha_inicio: e.target.value })}
        />
      </div>
      <div>
        <Label>Fecha Fin</Label>
        <Input
          type="date"
          value={filtros.fecha_fin}
          onChange={(e) => setFiltros({ ...filtros, fecha_fin: e.target.value })}
        />
      </div>
      <div>
        <Label>Sede</Label>
        <Select 
          value={filtros.sede || "todas"} 
          onValueChange={(value) => setFiltros({ ...filtros, sede: value === "todas" ? "" : value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todas las sedes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las sedes</SelectItem>
            {sedes.map(sede => (
              <SelectItem key={sede.id} value={sede.nombre_sede}>
                {sede.nombre_sede}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const ResultadoJSON = ({ data, filename }) => {
    if (!data) return null;

    return (
      <div className="mt-4">
        <div className="flex gap-2 mb-2">
          <Button size="sm" variant="outline" onClick={() => copiarJSON(data)}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar JSON
          </Button>
          <Button size="sm" variant="outline" onClick={() => descargarJSON(data, filename)}>
            <Download className="h-4 w-4 mr-2" />
            Descargar JSON
          </Button>
        </div>
        <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96 text-xs">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  };

  const EjemplosCodigo = ({ endpoint, filtros }) => (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Code className="h-4 w-4" />
          Ejemplo de uso desde aplicación externa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold">JavaScript / Node.js</Label>
            <pre className="bg-slate-900 text-blue-300 p-3 rounded text-xs overflow-auto mt-2">
{`import { ${endpoint} } from './utils/${endpoint}';

// Llamar la función con filtros
const resultado = await ${endpoint}({
  fecha_inicio: '${filtros.fecha_inicio || '2024-01-01'}',
  fecha_fin: '${filtros.fecha_fin || '2024-12-31'}',
  sede: '${filtros.sede || ''}'
});

console.log(resultado);`}
            </pre>
          </div>

          <div>
            <Label className="text-xs font-semibold">Python</Label>
            <pre className="bg-slate-900 text-yellow-300 p-3 rounded text-xs overflow-auto mt-2">
{`import requests

# Si expones esto como API REST
response = requests.get(
    'https://tu-dominio.com/api/${endpoint}',
    params={
        'fecha_inicio': '${filtros.fecha_inicio || '2024-01-01'}',
        'fecha_fin': '${filtros.fecha_fin || '2024-12-31'}',
        'sede': '${filtros.sede || ''}'
    },
    headers={'x-api-key': 'TU_API_KEY'}
)

data = response.json()
print(data)`}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">API Export - Prueba de Endpoints</h1>
        <p className="text-muted-foreground">
          Prueba los endpoints de exportación de métricas y obtén ejemplos de código para integrar con otras aplicaciones.
        </p>
      </div>

      <Alert className="mb-6">
        <AlertDescription>
          <strong>💡 Nota:</strong> Estas funciones están listas para ser expuestas como endpoints API REST. 
          Actualmente puedes usarlas directamente desde tu aplicación React. Para exponerlas como API pública, 
          necesitarás configurar un backend que las sirva con autenticación mediante API key.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="clientes">Métricas Clientes</TabsTrigger>
          <TabsTrigger value="tasas">Tasas Conversión</TabsTrigger>
          <TabsTrigger value="comerciales">Métricas Comerciales</TabsTrigger>
        </TabsList>

        {/* Tab Métricas Clientes */}
        <TabsContent value="clientes">
          <Card>
            <CardHeader>
              <CardTitle>Métricas de Clientes</CardTitle>
              <CardDescription>
                Obtén datos de clientes únicos, activos, tasa de renovación y evolución mensual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FiltrosComunes filtros={filtrosClientes} setFiltros={setFiltrosClientes} />
              
              <Button onClick={ejecutarMetricasClientes} disabled={loading} className="w-full">
                <Play className="h-4 w-4 mr-2" />
                {loading ? 'Ejecutando...' : 'Ejecutar Consulta'}
              </Button>

              <ResultadoJSON data={resultadoClientes} filename="metricas-clientes" />
              
              <EjemplosCodigo endpoint="obtenerMetricasClientes" filtros={filtrosClientes} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Tasas Conversión */}
        <TabsContent value="tasas">
          <Card>
            <CardHeader>
              <CardTitle>Tasas de Conversión</CardTitle>
              <CardDescription>
                Obtén tasas de agendamiento, asistencia, conversión y tasa global del embudo comercial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FiltrosComunes filtros={filtrosTasas} setFiltros={setFiltrosTasas} />
              
              <Button onClick={ejecutarTasasConversion} disabled={loading} className="w-full">
                <Play className="h-4 w-4 mr-2" />
                {loading ? 'Ejecutando...' : 'Ejecutar Consulta'}
              </Button>

              <ResultadoJSON data={resultadoTasas} filename="tasas-conversion" />
              
              <EjemplosCodigo endpoint="obtenerTasasConversion" filtros={filtrosTasas} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Métricas Comerciales */}
        <TabsContent value="comerciales">
          <Card>
            <CardHeader>
              <CardTitle>Métricas Comerciales</CardTitle>
              <CardDescription>
                Obtén métricas agregadas de leads, agendamientos, ventas y evolución mensual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FiltrosComunes filtros={filtrosComerciales} setFiltros={setFiltrosComerciales} />
              
              <Button onClick={ejecutarMetricasComerciales} disabled={loading} className="w-full">
                <Play className="h-4 w-4 mr-2" />
                {loading ? 'Ejecutando...' : 'Ejecutar Consulta'}
              </Button>

              <ResultadoJSON data={resultadoComerciales} filename="metricas-comerciales" />
              
              <EjemplosCodigo endpoint="obtenerMetricasComerciales" filtros={filtrosComerciales} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Documentación adicional */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>📚 Documentación de Endpoints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. Métricas de Clientes</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Retorna información sobre clientes únicos (por WhatsApp), incluyendo total de clientes, 
              activos, inactivos, tasa de renovación y evolución mensual.
            </p>
            <div className="bg-slate-100 p-2 rounded text-xs">
              <strong>Filtros:</strong> fecha_inicio, fecha_fin, sede
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. Tasas de Conversión</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Calcula las tasas del embudo comercial: agendamiento (leads → agendados), 
              asistencia (agendados → asistieron), conversión (asistieron → compraron) y tasa global.
            </p>
            <div className="bg-slate-100 p-2 rounded text-xs">
              <strong>Filtros:</strong> fecha_inicio, fecha_fin, sede
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. Métricas Comerciales</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Proporciona métricas agregadas del negocio incluyendo leads, agendamientos, ventas, 
              montos totales, desglose por sede y evolución mensual.
            </p>
            <div className="bg-slate-100 p-2 rounded text-xs">
              <strong>Filtros:</strong> fecha_inicio, fecha_fin, sede
            </div>
          </div>

          <Alert>
            <AlertDescription>
              <strong>🔐 Seguridad:</strong> Cuando expongas estos endpoints como API REST, 
              asegúrate de implementar autenticación mediante API key en el header <code>x-api-key</code>.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}