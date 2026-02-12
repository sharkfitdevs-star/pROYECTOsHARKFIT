import React, { useState } from 'react';
import { Download, FileCode, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import axios from 'axios';

export default function ExportarCodigo() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);
    const [downloadUrl, setDownloadUrl] = useState(null);
    const [stats, setStats] = useState(null);

    const archivosExportar = {
        "PÁGINAS": [
            "pages/DashboardComercial.jsx",
            "pages/DashboardFinanciero.jsx",
            "pages/DashboardRS.jsx",
            "pages/DashboardSistemaOnline.jsx",
            "pages/Clientes.jsx",
            "pages/ClientesNuevo.jsx",
            "pages/Ventas.jsx",
            "pages/Prospectos.jsx",
            "pages/Agenda.jsx",
            "pages/NPSOnline.jsx",
            "pages/NPSCruzados.jsx",
            "pages/AlertasRenovacion.jsx",
            "pages/SistemaOnline.jsx",
            "pages/CompromisosCompra.jsx",
            "pages/ProyeccionClientesNuevos.jsx",
            "pages/ConfiguracionProyeccion.jsx",
            "pages/ConfiguracionAlertas.jsx",
            "pages/ConfiguracionChecklist.jsx",
            "pages/MisChecklist.jsx",
            "pages/DashboardChecklist.jsx",
            "pages/Remarketing.jsx",
            "pages/LeadsDiarios.jsx",
            "pages/GastosAds.jsx",
            "pages/DashboardCostos.jsx",
            "pages/RetencionCohorte.jsx",
            "pages/Migracion.jsx",
            "pages/Configuracion.jsx"
        ],
        "LAYOUT": ["Layout.jsx"],
        "COMPONENTES": [
            "components/AlertasMetricasDialog.jsx",
            "components/ProgramarPausaDialog.jsx",
            "components/CrearDeudorDialog.jsx",
            "components/TopAsistentes.jsx",
            "components/SoporteListadoDialog.jsx",
            "components/DashboardRetencionSede.jsx",
            "components/RegistrarVentaDialog.jsx",
            "components/MedidorTiempoTareas.jsx",
            "components/CollapsibleArea.jsx",
            "components/BuscadorInteligente.jsx",
            "components/PermissionContext.jsx",
            "components/usePermisos.js"
        ],
        "ENTIDADES": [
            "entities/Clientes.json",
            "entities/Ventas.json",
            "entities/Prospectos.json",
            "entities/Agendamientos.json",
            "entities/Staff.json",
            "entities/Deudores.json",
            "entities/Alertas_Renovacion.json",
            "entities/Configuracion_Alertas.json",
            "entities/Checklist_Templates.json",
            "entities/Checklist_Asignados.json",
            "entities/NPS_Cruzados.json",
            "entities/Seguimiento_NPS.json",
            "entities/Tareas_RS.json",
            "entities/Clientes_Riesgo.json",
            "entities/Bajas_Programadas.json",
            "entities/Proyeccion_Configuracion.json",
            "entities/Leads_Diarios.json",
            "entities/Ads_Gasto_Diario.json"
        ],
        "FUNCIONES": [
            "functions/metricasComerciales.js",
            "functions/metricasClientes.js",
            "functions/tasasConversion.js",
            "functions/generarAlertasRenovacion.js",
            "functions/generarAlertasClienteNuevo.js",
            "functions/generarAlertasDeudores.js",
            "functions/generarTareasOnboarding.js",
            "functions/generarTareasNPSCruzados.js",
            "functions/sincronizarOnboardingClientes.js",
            "functions/escalarDeudoresARS.js"
        ],
        "UTILIDADES": [
            "utils/migracionHelpers.js",
            "utils/checklistHelpers.js",
            "utils/apiMetricasComerciales.js",
            "utils/onboardingHelper.js"
        ]
    };

    const handleExportar = async () => {
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // Preparar datos para Excel
            const sheets = [];
            let totalArchivos = 0;
            let archivosLeidos = 0;

            // Crear hoja de índice
            const indiceData = [
                ["SISTEMA SHARKFIT - EXPORTACIÓN DE CÓDIGO"],
                [`Fecha: ${new Date().toLocaleDateString('es-AR')}`],
                [""],
                ["CATEGORÍA", "CANTIDAD DE ARCHIVOS"],
            ];

            for (const [categoria, archivos] of Object.entries(archivosExportar)) {
                indiceData.push([categoria, archivos.length]);
                totalArchivos += archivos.length;
            }

            indiceData.push([""], ["TOTAL", totalArchivos]);

            sheets.push({
                name: "ÍNDICE",
                data: indiceData,
                cols: [30, 20],
                styles: {
                    "1:1": { bold: true, size: 14, bg: "2C3E50", color: "FFFFFF", align: "center" },
                    "4:4": { bold: true, bg: "3498DB", color: "FFFFFF" },
                    [`${indiceData.length}:${indiceData.length}`]: { bold: true, bg: "ECF0F1" }
                }
            });

            // Crear una hoja por categoría con lista de archivos
            for (const [categoria, archivos] of Object.entries(archivosExportar)) {
                const categoriaData = [
                    [categoria],
                    [""],
                    ["ARCHIVO", "RUTA COMPLETA", "TIPO"]
                ];

                for (const filePath of archivos) {
                    const fileName = filePath.split('/').pop();
                    const tipo = filePath.split('/')[0].toUpperCase();
                    categoriaData.push([fileName, filePath, tipo]);
                    archivosLeidos++;
                }

                sheets.push({
                    name: categoria.substring(0, 30),
                    data: categoriaData,
                    cols: [40, 50, 15],
                    styles: {
                        "1:1": { bold: true, size: 12, bg: "34495E", color: "FFFFFF", align: "center" },
                        "3:3": { bold: true, bg: "5DADE2", color: "FFFFFF" }
                    }
                });
            }

            // Crear hoja de estructura del proyecto
            const estructuraData = [
                ["ESTRUCTURA DEL PROYECTO SHARKFIT"],
                [""],
                ["DESCRIPCIÓN"],
                [""],
                ["Este sistema incluye:"],
                ["- Dashboards de gestión comercial, financiera y retención"],
                ["- Sistema de alertas automatizadas"],
                ["- Gestión de clientes, ventas y prospectos"],
                ["- Sistema de NPS y seguimiento online"],
                ["- Checklist y tareas automatizadas"],
                ["- Proyecciones y análisis de datos"],
                ["- Gestión de costos y ROI"],
                [""],
                ["TECNOLOGÍAS UTILIZADAS"],
                ["- React + Tailwind CSS"],
                ["- Shadcn/ui Components"],
                ["- Recharts para gráficos"],
                ["- AgentUI Platform"],
                ["- Axios para peticiones HTTP"],
                [""],
                ["CARACTERÍSTICAS PRINCIPALES"],
                ["✓ Dashboard Comercial con métricas en tiempo real"],
                ["✓ Dashboard Financiero con gestión de deudores"],
                ["✓ Sistema de Retención de clientes"],
                ["✓ Alertas automatizadas configurables"],
                ["✓ Sistema de Checklist personalizable"],
                ["✓ Proyección de clientes nuevos"],
                ["✓ Análisis de costos y gastos publicitarios"],
                ["✓ Reportes y exportaciones"],
            ];

            sheets.push({
                name: "ESTRUCTURA",
                data: estructuraData,
                cols: [80],
                styles: {
                    "1:1": { bold: true, size: 14, bg: "27AE60", color: "FFFFFF", align: "center" },
                    "3:3": { bold: true, size: 12, bg: "ECF0F1" },
                    "14:14": { bold: true, size: 12, bg: "ECF0F1" },
                    "21:21": { bold: true, size: 12, bg: "ECF0F1" }
                }
            });

            // Generar el archivo Excel
            const response = await axios.post(
                `${process.env.PROXY_INTEGRATION_URL}/documents/export-excel-raw`,
                {
                    fileName: `sharkfit_codigo_completo_${new Date().toISOString().split('T')[0]}`,
                    sheets: sheets
                },
                {
                    headers: {
                        "x-api-key": window.config.apiKey
                    }
                }
            );

            setDownloadUrl(response.data.url);
            setSuccess(true);
            setStats({
                totalArchivos,
                archivosLeidos,
                categorias: Object.keys(archivosExportar).length
            });

            // Abrir el archivo automáticamente
            window.open(response.data.url, '_blank');

        } catch (err) {
            console.error('Error al exportar:', err);
            setError(err.message || 'Error al generar el archivo de exportación');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileCode className="w-6 h-6" />
                        Exportar Código del Sistema
                    </CardTitle>
                    <CardDescription>
                        Descarga un archivo Excel con la estructura completa del sistema Sharkfit
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Información del sistema */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="font-semibold text-blue-900 mb-2">¿Qué se exportará?</h3>
                        <ul className="space-y-1 text-sm text-blue-800">
                            <li>• <strong>26 Páginas</strong> - Dashboards y vistas principales</li>
                            <li>• <strong>1 Layout</strong> - Estructura de navegación</li>
                            <li>• <strong>12+ Componentes</strong> - Componentes reutilizables</li>
                            <li>• <strong>18 Entidades</strong> - Modelos de datos</li>
                            <li>• <strong>10 Funciones</strong> - APIs y lógica de negocio</li>
                            <li>• <strong>4 Utilidades</strong> - Helpers y funciones auxiliares</li>
                        </ul>
                    </div>

                    {/* Botón de exportación */}
                    <div className="flex flex-col items-center gap-4">
                        <Button
                            onClick={handleExportar}
                            disabled={loading}
                            size="lg"
                            className="w-full max-w-md"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Generando archivo...
                                </>
                            ) : (
                                <>
                                    <Download className="w-5 h-5 mr-2" />
                                    Exportar Código Completo
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Mensajes de estado */}
                    {success && stats && (
                        <Alert className="bg-green-50 border-green-200">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                                <strong>¡Exportación exitosa!</strong>
                                <div className="mt-2 text-sm">
                                    <p>• Total de archivos: {stats.totalArchivos}</p>
                                    <p>• Categorías: {stats.categorias}</p>
                                    <p>• El archivo se ha descargado automáticamente</p>
                                </div>
                                {downloadUrl && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-3"
                                        onClick={() => window.open(downloadUrl, '_blank')}
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Descargar nuevamente
                                    </Button>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Error al exportar:</strong> {error}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Información adicional */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">Formato del archivo</h3>
                        <p className="text-sm text-gray-700">
                            El archivo Excel incluirá múltiples hojas organizadas por categoría:
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-gray-600">
                            <li>• <strong>ÍNDICE</strong> - Resumen general del sistema</li>
                            <li>• <strong>PÁGINAS</strong> - Lista de todas las páginas</li>
                            <li>• <strong>COMPONENTES</strong> - Componentes reutilizables</li>
                            <li>• <strong>ENTIDADES</strong> - Modelos de datos</li>
                            <li>• <strong>FUNCIONES</strong> - APIs serverless</li>
                            <li>• <strong>ESTRUCTURA</strong> - Documentación del proyecto</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}