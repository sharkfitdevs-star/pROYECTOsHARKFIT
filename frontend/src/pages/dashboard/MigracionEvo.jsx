import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import axios from 'axios';

export default function MigracionEvo() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  const obtenerYExportarDatos = async () => {
    setLoading(true);
    setError(null);
    setStatus('Obteniendo datos del webhook...');

    try {
      // Obtener datos del webhook
      const webhookResponse = await axios.post('https://api.agentui.ai/webhook/f4fce098-236a-4be4-a54b-c2b05752b237');
      
      if (!webhookResponse.data?.dataReceived?.list) {
        throw new Error('No se encontraron datos en el webhook');
      }

      const membresias = webhookResponse.data.dataReceived.list;
      setStatus(`Procesando ${membresias.length} membresías...`);

      // Preparar datos para Excel
      const datosExcel = membresias.map(m => ({
        'ID Membresía': m.idMembership || '',
        'Nombre': m.nameMembership || '',
        'Descripción': m.description || '',
        'Valor': m.value || 0,
        'Duración': m.duration || 0,
        'Tipo Duración': m.durationType || '',
        'Tipo Membresía': m.membershipType || '',
        'ID Sucursal': m.idBranch || '',
        'Inactivo': m.inactive ? 'Sí' : 'No',
        'Tipo Entradas': m.entries?.entriesTypeDescription || '',
        'Cantidad Entradas': m.entries?.entriesQuantity || 0,
        'Acepta Inscripción': m.acceptEnrollment ? 'Sí' : 'No',
        'Inscripción Requerida': m.enrollmentRequired ? 'Sí' : 'No',
        'Venta Externa Disponible': m.externalSaleAvailable ? 'Sí' : 'No',
        'Permite Cancelación por App': m.allowsCancellationByApp === true ? 'Sí' : m.allowsCancellationByApp === false ? 'No' : 'N/A',
        'Fecha Actualización': m.updateDate || ''
      }));

      setStatus('Generando archivo Excel...');

      // Generar Excel
      const excelResponse = await axios.post(
        `${process.env.PROXY_INTEGRATION_URL}/documents/export-excel-raw`,
        {
          fileName: `migracion-evo-${new Date().toISOString().split('T')[0]}`,
          sheets: [{
            name: 'Migración EVO',
            data: [
              Object.keys(datosExcel[0]),
              ...datosExcel.map(row => Object.values(row))
            ],
            cols: [12, 30, 35, 12, 10, 15, 20, 12, 10, 20, 15, 18, 18, 22, 25, 20],
            freeze: { row: 1 },
            autoFilter: true,
            styles: {
              '1:1': { 
                bold: true, 
                bg: '4472C4', 
                color: 'FFFFFF', 
                align: 'center',
                size: 11
              },
              'D:D': { format: '$#,##0', align: 'right' },
              'E:E': { align: 'center' },
              'F:F': { align: 'center' },
              'H:H': { align: 'center' },
              'I:I': { align: 'center' },
              'K:K': { align: 'center' },
              'L:L': { align: 'center' },
              'M:M': { align: 'center' },
              'N:N': { align: 'center' },
              'O:O': { align: 'center' }
            }
          }]
        },
        { 
          headers: { 
            'x-api-key': window.config.apiKey 
          } 
        }
      );

      setStatus('Obteniendo URL de descarga...');

      // Obtener URL firmada
      const signedUrlResponse = await axios.get(
        `${process.env.PROXY_INTEGRATION_URL}/files/signed-url`,
        {
          params: {
            fileUrl: excelResponse.data.url
          },
          headers: {
            'x-api-key': window.config.apiKey
          }
        }
      );

      // Descargar archivo
      const link = document.createElement('a');
      link.href = signedUrlResponse.data.signedUrl;
      link.download = `migracion-evo-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setStatus(`✓ Exportación completada: ${membresias.length} membresías exportadas`);
      
    } catch (err) {
      console.error('Error en exportación:', err);
      setError(err.response?.data?.error || err.message || 'Error al exportar datos');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-slate-900">Migración EVO</h1>
          <p className="text-slate-600">Exportación de datos de membresías desde Evolution API</p>
        </div>

        {/* Card Principal */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardTitle className="flex items-center gap-2">
              <Download className="h-6 w-6" />
              Exportar Datos de Membresías
            </CardTitle>
            <CardDescription className="text-blue-100">
              Obtiene datos del webhook de Evolution y los exporta a Excel
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Información del Webhook */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-2">Webhook Configurado</h3>
              <p className="text-sm text-slate-600 font-mono break-all">
                https://api.agentui.ai/webhook/f4fce098-236a-4be4-a54b-c2b05752b237
              </p>
            </div>

            {/* Botón de Exportación */}
            <div className="flex justify-center">
              <Button
                onClick={obtenerYExportarDatos}
                disabled={loading}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5" />
                    Exportar a Excel
                  </>
                )}
              </Button>
            </div>

            {/* Status */}
            {status && (
              <Alert className="bg-blue-50 border-blue-200">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  {status}
                </AlertDescription>
              </Alert>
            )}

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Información Adicional */}
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Información
              </h3>
              <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                <li>Los datos se exportan en formato Excel (.xlsx)</li>
                <li>Incluye todas las membresías activas e inactivas</li>
                <li>El archivo se descarga automáticamente al completar</li>
                <li>Los datos incluyen: ID, nombre, valor, duración, tipo y más</li>
              </ul>
            </div>

            {/* Campos Exportados */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3">Campos Exportados</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-slate-600">
                <div>• ID Membresía</div>
                <div>• Nombre</div>
                <div>• Descripción</div>
                <div>• Valor</div>
                <div>• Duración</div>
                <div>• Tipo Duración</div>
                <div>• Tipo Membresía</div>
                <div>• ID Sucursal</div>
                <div>• Estado (Activo/Inactivo)</div>
                <div>• Tipo Entradas</div>
                <div>• Cantidad Entradas</div>
                <div>• Acepta Inscripción</div>
                <div>• Inscripción Requerida</div>
                <div>• Venta Externa</div>
                <div>• Cancelación por App</div>
                <div>• Fecha Actualización</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}