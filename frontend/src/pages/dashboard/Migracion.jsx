import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Download } from 'lucide-react';
import axios from 'axios';
import ValidacionMigracionDialog from '@/components/ValidacionMigracionDialog';
import CrearProspectosFaltantesDialog from '@/components/CrearProspectosFaltantesDialog';
import { procesarRegistroMigracion, normalizarWhatsApp, normalizarEstadoPipeline, validarRegistroProspecto, procesarRegistroProspecto, validarRegistroClienteActivo, procesarRegistroClienteActivo } from '@/utils/migracionHelpers';
import { Prospectos } from '@/entities/Prospectos';
import { Sucursales } from '@/entities/Sucursales';
import { Staff } from '@/entities/Staff';
import { Planes_Servicios } from '@/entities/Planes_Servicios';
import { Clientes } from '@/entities/Clientes';

export default function Migracion() {
  // Estados para Clientes y Ventas
  const [archivoCSV, setArchivoCSV] = useState(null);
  const [registrosCSV, setRegistrosCSV] = useState([]);
  const [cargandoCSV, setCargandoCSV] = useState(false);
  const [mostrarValidacion, setMostrarValidacion] = useState(false);
  const [migrando, setMigrando] = useState(false);
  const [resultadoMigracion, setResultadoMigracion] = useState(null);

  // Estados para Prospectos
  const [archivoProspectos, setArchivoProspectos] = useState(null);
  const [registrosProspectos, setRegistrosProspectos] = useState([]);
  const [cargandoProspectos, setCargandoProspectos] = useState(false);
  const [migrandoProspectos, setMigrandoProspectos] = useState(false);
  const [resultadoProspectos, setResultadoProspectos] = useState(null);

  // Estados para creación de prospectos faltantes
  const [registrosSinProspecto, setRegistrosSinProspecto] = useState([]);
  const [mostrarCrearProspectos, setMostrarCrearProspectos] = useState(false);
  const [catalogos, setCatalogos] = useState(null);

  // Estados para Clientes Activos
  const [archivoClientesActivos, setArchivoClientesActivos] = useState(null);
  const [registrosClientesActivos, setRegistrosClientesActivos] = useState([]);
  const [cargandoClientesActivos, setCargandoClientesActivos] = useState(false);
  const [migrandoClientesActivos, setMigrandoClientesActivos] = useState(false);
  const [resultadoClientesActivos, setResultadoClientesActivos] = useState(null);

  const handleSeleccionarArchivo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setArchivoCSV(file);
    setCargandoCSV(true);
    setRegistrosCSV([]);
    setResultadoMigracion(null);

    try {
      // Subir archivo
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await axios.post(
        `${process.env.PROXY_INTEGRATION_URL}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'x-api-key': window.config.apiKey
          }
        }
      );

      const { url } = uploadResponse.data;

      // Extraer datos del CSV
      const extractResponse = await axios.post(
        `${process.env.PROXY_INTEGRATION_URL}/documents/extract-csv`,
        { fileUrl: url },
        {
          headers: {
            'x-api-key': window.config.apiKey
          }
        }
      );

      setRegistrosCSV(extractResponse.data.rows || []);
    } catch (error) {
      console.error('Error cargando CSV:', error);
      alert('Error al cargar el archivo CSV');
    } finally {
      setCargandoCSV(false);
    }
  };

  const handleIniciarMigracion = () => {
    if (registrosCSV.length === 0) {
      alert('Por favor, carga un archivo CSV primero');
      return;
    }
    
    setMostrarValidacion(true);
  };

  const handleContinuarMigracion = async (registrosValidados) => {
    setMostrarValidacion(false);
    
    // Cargar catálogos
    const [sedesData, staffData, planesData] = await Promise.all([
      Sucursales.filter({ activo: true }),
      Staff.filter({ activo: true }),
      Planes_Servicios.filter({ activo: true })
    ]);
    
    const catalogosData = {
      sedes: sedesData,
      vendedores: staffData,
      planes: planesData
    };
    
    setCatalogos(catalogosData);
    
    // Detectar registros sin prospecto
    const sinProspecto = [];
    
    for (const registro of registrosValidados) {
      const whatsappNormalizado = normalizarWhatsApp(registro.WhatsApp);
      const prospectosExistentes = await Prospectos.filter({ whatsapp: whatsappNormalizado });
      
      if (prospectosExistentes.length === 0) {
        // Buscar sede para incluir en la info
        const sede = catalogosData.sedes.find(s => 
          s.nombre_sede.toLowerCase().trim() === registro.Sede?.toLowerCase().trim()
        );
        
        sinProspecto.push({
          nombre: registro['Nombre y Apellido'],
          whatsapp: whatsappNormalizado,
          sede: registro.Sede,
          vendedor: registro.Vendedor,
          fecha_ingreso: registro['Fecha de Ingreso'],
          registroOriginal: registro
        });
      }
    }
    
    // Si hay registros sin prospecto, mostrar dialog
    if (sinProspecto.length > 0) {
      console.log(`⚠️ Se detectaron ${sinProspecto.length} registros sin prospecto asociado`);
      setRegistrosSinProspecto(sinProspecto);
      setMostrarCrearProspectos(true);
      return; // Esperar a que el usuario cree los prospectos
    }
    
    // Si todos tienen prospecto, continuar con la migración
    await ejecutarMigracion(registrosValidados, catalogosData);
  };

  const ejecutarMigracion = async (registrosValidados, catalogosData) => {
    setMigrando(true);
    
    const resultados = {
      prospectosCreados: 0,
      prospectosActualizados: 0,
      agendamientosCreados: 0,
      ventasCreadas: 0,
      clientesSincronizados: 0,
      errores: []
    };
    
    try {
      
      // Detectar prospectos existentes ANTES de procesar
      const prospectosExistentesMap = new Map();
      for (const registro of registrosValidados) {
        const whatsappNormalizado = normalizarWhatsApp(registro.WhatsApp);
        const prospectosExistentes = await Prospectos.filter({ whatsapp: whatsappNormalizado });
        prospectosExistentesMap.set(whatsappNormalizado, prospectosExistentes.length > 0);
      }
      
      // Procesar cada registro
      for (const registro of registrosValidados) {
        try {
          const whatsappNormalizado = normalizarWhatsApp(registro.WhatsApp);
          const existiaAntes = prospectosExistentesMap.get(whatsappNormalizado);
          
          const resultado = await procesarRegistroMigracion(registro, catalogosData);
          
          if (resultado.exito) {
            if (resultado.prospectoId) {
              // Contar según si existía ANTES de procesar
              if (existiaAntes) {
                resultados.prospectosActualizados++;
              } else {
                resultados.prospectosCreados++;
              }
            }
            if (resultado.agendamientoId) resultados.agendamientosCreados++;
            resultados.ventasCreadas += resultado.ventasIds.length;
            if (resultado.clienteSincronizado) resultados.clientesSincronizados++;
          } else {
            resultados.errores.push({
              registro: registro['Nombre y Apellido'],
              errores: resultado.errores
            });
          }
        } catch (error) {
          console.error('Error procesando registro:', error);
          resultados.errores.push({
            registro: registro['Nombre y Apellido'],
            errores: [error.message]
          });
        }
      }
      
      setResultadoMigracion(resultados);
    } catch (error) {
      console.error('Error en migración:', error);
      alert('Error durante la migración: ' + error.message);
    } finally {
      setMigrando(false);
    }
  };

  const descargarLogErrores = () => {
    if (!resultadoMigracion?.errores?.length) return;

    const contenido = resultadoMigracion.errores
      .map(e => `${e.registro}: ${e.errores.join(', ')}`)
      .join('\n');

    const blob = new Blob([contenido], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'errores_migracion.txt';
    a.click();
  };

  const handleProspectosCreados = async ({ prospectosCreados, errores }) => {
    console.log(`✅ Prospectos creados: ${prospectosCreados.length}`);
    
    if (errores.length > 0) {
      console.warn(`⚠️ Errores al crear prospectos:`, errores);
      alert(`Se crearon ${prospectosCreados.length} prospectos, pero hubo ${errores.length} errores. Revisa la consola para más detalles.`);
    }
    
    // Continuar con la migración ahora que los prospectos existen
    setMostrarCrearProspectos(false);
    
    // Obtener los registros validados originales
    const registrosValidados = registrosSinProspecto.map(r => r.registroOriginal);
    
    await ejecutarMigracion(registrosValidados, catalogos);
  };

  // ========== FUNCIONES PARA PROSPECTOS ==========

  const handleSeleccionarArchivoProspectos = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setArchivoProspectos(file);
    setCargandoProspectos(true);
    setRegistrosProspectos([]);
    setResultadoProspectos(null);

    try {
      // Subir archivo
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await axios.post(
        `${process.env.PROXY_INTEGRATION_URL}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'x-api-key': window.config.apiKey
          }
        }
      );

      const { url } = uploadResponse.data;

      // Extraer datos del CSV
      const extractResponse = await axios.post(
        `${process.env.PROXY_INTEGRATION_URL}/documents/extract-csv`,
        { fileUrl: url },
        {
          headers: {
            'x-api-key': window.config.apiKey
          }
        }
      );

      setRegistrosProspectos(extractResponse.data.rows || []);
    } catch (error) {
      console.error('Error cargando CSV:', error);
      alert('Error al cargar el archivo CSV');
    } finally {
      setCargandoProspectos(false);
    }
  };

  const handleIniciarMigracionProspectos = async () => {
    if (registrosProspectos.length === 0) {
      alert('Por favor, carga un archivo CSV primero');
      return;
    }

    setMigrandoProspectos(true);

    const resultados = {
      prospectosCreados: 0,
      prospectosActualizados: 0,
      agendamientosCreados: 0,
      errores: []
    };

    try {
      console.log('🔄 Iniciando migración de prospectos...');
      console.log('📊 Total de registros:', registrosProspectos.length);
      
      // Cargar catálogos una vez
      const [sedesData, staffData] = await Promise.all([
        Sucursales.filter({ activo: true }),
        Staff.filter({ activo: true })
      ]);

      console.log('📍 Sedes cargadas:', sedesData.length);
      console.log('👥 Staff cargado:', staffData.length);

      const catalogos = {
        sedes: sedesData,
        vendedores: staffData
      };

      // Validar y procesar cada registro
      for (let i = 0; i < registrosProspectos.length; i++) {
        const registro = registrosProspectos[i];
        console.log(`\n📝 Procesando registro ${i + 1}/${registrosProspectos.length}:`, registro['Nombre y Apellido']);
        
        try {
          // Validar registro
          console.log('  ✓ Validando...');
          const validacion = await validarRegistroProspecto(registro, catalogos);
          console.log('  ✓ Resultado validación:', validacion);

          if (!validacion.valido) {
            console.log('  ❌ Validación falló:', validacion.errores);
            resultados.errores.push({
              registro: registro['Nombre y Apellido'] || 'Sin nombre',
              errores: validacion.errores
            });
            continue;
          }

          // Procesar registro
          console.log('  ✓ Procesando...');
          const whatsappNormalizado = normalizarWhatsApp(registro.WhatsApp);
          const prospectosExistentes = await Prospectos.filter({ whatsapp: whatsappNormalizado });
          const esActualizacion = prospectosExistentes.length > 0;
          console.log('  ✓ Es actualización:', esActualizacion);

          const resultado = await procesarRegistroProspecto(registro, catalogos);
          console.log('  ✓ Resultado procesamiento:', resultado);

          if (resultado.exito) {
            if (esActualizacion) {
              resultados.prospectosActualizados++;
              console.log('  ✅ Prospecto actualizado');
            } else {
              resultados.prospectosCreados++;
              console.log('  ✅ Prospecto creado');
            }
            
            // Contar agendamientos creados
            if (resultado.agendamientoId) {
              resultados.agendamientosCreados++;
              console.log('  ✅ Agendamiento creado');
            }
          } else {
            console.log('  ❌ Procesamiento falló:', resultado.errores);
            resultados.errores.push({
              registro: registro['Nombre y Apellido'] || 'Sin nombre',
              errores: resultado.errores
            });
          }
        } catch (error) {
          console.error('  ❌ Error procesando registro:', error);
          resultados.errores.push({
            registro: registro['Nombre y Apellido'] || 'Sin nombre',
            errores: [error.message || 'Error desconocido']
          });
        }
      }

      console.log('\n✅ Migración completada');
      console.log('📊 Resultados:', resultados);
      setResultadoProspectos(resultados);
    } catch (error) {
      console.error('❌ Error en migración:', error);
      alert('Error durante la migración: ' + error.message);
    } finally {
      setMigrandoProspectos(false);
    }
  };

  const descargarLogErroresProspectos = () => {
    if (!resultadoProspectos?.errores?.length) return;

    const contenido = resultadoProspectos.errores
      .map(e => `${e.registro}: ${e.errores.join(', ')}`)
      .join('\n');

    const blob = new Blob([contenido], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'errores_prospectos.txt';
    a.click();
  };

  // ========== FUNCIONES PARA CLIENTES ACTIVOS ==========

  const handleSeleccionarArchivoClientesActivos = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setArchivoClientesActivos(file);
    setCargandoClientesActivos(true);
    setRegistrosClientesActivos([]);
    setResultadoClientesActivos(null);

    try {
      // Subir archivo
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await axios.post(
        `${process.env.PROXY_INTEGRATION_URL}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'x-api-key': window.config.apiKey
          }
        }
      );

      const { url } = uploadResponse.data;

      // Extraer datos del CSV
      const extractResponse = await axios.post(
        `${process.env.PROXY_INTEGRATION_URL}/documents/extract-csv`,
        { fileUrl: url },
        {
          headers: {
            'x-api-key': window.config.apiKey
          }
        }
      );

      setRegistrosClientesActivos(extractResponse.data.rows || []);
    } catch (error) {
      console.error('Error cargando CSV:', error);
      alert('Error al cargar el archivo CSV');
    } finally {
      setCargandoClientesActivos(false);
    }
  };

  const handleIniciarMigracionClientesActivos = async () => {
    if (registrosClientesActivos.length === 0) {
      alert('Por favor, carga un archivo CSV primero');
      return;
    }

    setMigrandoClientesActivos(true);

    const resultados = {
      clientesCreados: 0,
      ventasCreadas: 0,
      deudoresRegistrados: 0,
      ciclosRetencionCreados: 0,
      errores: []
    };

    try {
      console.log('🔄 Iniciando migración de clientes activos...');
      console.log('📊 Total de registros:', registrosClientesActivos.length);
      
      // Cargar catálogos una vez
      const [sedesData, staffData, planesData] = await Promise.all([
        Sucursales.filter({ activo: true }),
        Staff.filter({ activo: true }),
        Planes_Servicios.filter({ activo: true })
      ]);

      const catalogos = {
        sedes: sedesData,
        vendedores: staffData,
        planes: planesData
      };

      // Validar y procesar cada registro
      for (let i = 0; i < registrosClientesActivos.length; i++) {
        const registro = registrosClientesActivos[i];
        console.log(`\n📝 Procesando registro ${i + 1}/${registrosClientesActivos.length}:`, registro['Nombre y Apellido']);
        
        try {
          // Validar registro
          const validacion = await validarRegistroClienteActivo(registro, catalogos);

          if (!validacion.valido) {
            console.log('  ❌ Validación falló:', validacion.errores);
            resultados.errores.push({
              registro: registro['Nombre y Apellido'] || 'Sin nombre',
              errores: validacion.errores
            });
            continue;
          }

          // Procesar registro
          const resultado = await procesarRegistroClienteActivo(registro, catalogos);

          if (resultado.exito) {
            resultados.clientesCreados++;
            if (resultado.ventaId) resultados.ventasCreadas++;
            if (resultado.cicloRetencionId) resultados.ciclosRetencionCreados++;
            
            // Contar deudores
            const esDeudorRaw = registro.Deudor || registro['Es Deudor'] || 'No';
            const esDeudor = ['Si', 'Sí', 'SI', 'si', 'sí', 'true', '1'].includes(esDeudorRaw?.toString().trim());
            if (esDeudor) resultados.deudoresRegistrados++;
            
            console.log('  ✅ Cliente creado');
          } else {
            console.log('  ❌ Procesamiento falló:', resultado.errores);
            resultados.errores.push({
              registro: registro['Nombre y Apellido'] || 'Sin nombre',
              errores: resultado.errores
            });
          }
        } catch (error) {
          console.error('  ❌ Error procesando registro:', error);
          resultados.errores.push({
            registro: registro['Nombre y Apellido'] || 'Sin nombre',
            errores: [error.message || 'Error desconocido']
          });
        }
      }

      console.log('\n✅ Migración completada');
      console.log('📊 Resultados:', resultados);
      setResultadoClientesActivos(resultados);
    } catch (error) {
      console.error('❌ Error en migración:', error);
      alert('Error durante la migración: ' + error.message);
    } finally {
      setMigrandoClientesActivos(false);
    }
  };

  const descargarLogErroresClientesActivos = () => {
    if (!resultadoClientesActivos?.errores?.length) return;

    const contenido = resultadoClientesActivos.errores
      .map(e => `${e.registro}: ${e.errores.join(', ')}`)
      .join('\n');

    const blob = new Blob([contenido], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'errores_clientes_activos.txt';
    a.click();
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">🔄 Migración de Datos</h1>
        <p className="text-gray-600 mt-2">
          Importa datos desde archivos CSV con validación automática
        </p>
      </div>

      <Tabs defaultValue="clientes" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="prospectos">📋 Prospectos</TabsTrigger>
          <TabsTrigger value="clientes">👥 Clientes y Ventas</TabsTrigger>
          <TabsTrigger value="clientesActivos">🟢 Clientes Activos</TabsTrigger>
        </TabsList>

        {/* TAB: Prospectos */}
        <TabsContent value="prospectos">
          <Card>
            <CardHeader>
              <CardTitle>Importar Prospectos desde CSV</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Formato esperado */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">📄 Formato esperado del CSV:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Nombre y Apellido</strong> (obligatorio)</li>
                  <li>• <strong>WhatsApp</strong> (obligatorio)</li>
                  <li>• <strong>Fecha de Ingreso</strong> (obligatorio)</li>
                  <li>• <strong>Sede</strong> (obligatorio)</li>
                  <li>• Vendedor (opcional, se creará si no existe)</li>
                  <li>• Tipo de Invitación (opcional, por defecto: Invitación)</li>
                  <li>• Estado o Estado Pipeline (opcional, por defecto: Agendado)</li>
                  <li>• Fecha de Visita (opcional)</li>
                  <li>• Notas (opcional)</li>
                </ul>
                <p className="text-xs text-blue-700 mt-3 italic">
                  ℹ️ Si el prospecto tiene Fecha de Visita, se creará automáticamente un agendamiento. Los clientes pueden existir independientemente y se vincularán por WhatsApp.
                </p>
              </div>

              {/* Selector de archivo */}
              <div>
                <label className="block mb-2 font-medium text-gray-700">
                  Seleccionar archivo CSV
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleSeleccionarArchivoProspectos}
                    className="hidden"
                    id="csv-upload-prospectos"
                  />
                  <label
                    htmlFor="csv-upload-prospectos"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
                  >
                    <Upload className="h-4 w-4" />
                    Seleccionar CSV
                  </label>
                  {archivoProspectos && (
                    <span className="text-sm text-gray-600">
                      {archivoProspectos.name} ({registrosProspectos.length} registros)
                    </span>
                  )}
                </div>
              </div>

              {/* Loading */}
              {cargandoProspectos && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-3 text-lg">Cargando archivo...</span>
                </div>
              )}

              {/* Vista previa */}
              {registrosProspectos.length > 0 && !cargandoProspectos && !migrandoProspectos && !resultadoProspectos && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">
                    📊 Vista Previa (primeras 5 filas):
                  </h3>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nombre</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">WhatsApp</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha Ingreso</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Sede</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Vendedor</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {registrosProspectos.slice(0, 5).map((registro, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm">{registro['Nombre y Apellido']}</td>
                            <td className="px-4 py-2 text-sm">{registro.WhatsApp}</td>
                            <td className="px-4 py-2 text-sm">{registro['Fecha de Ingreso']}</td>
                            <td className="px-4 py-2 text-sm">{registro.Sede}</td>
                            <td className="px-4 py-2 text-sm">{registro.Vendedor || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <Button
                    onClick={handleIniciarMigracionProspectos}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    🚀 Iniciar Migración de Prospectos
                  </Button>
                </div>
              )}

              {/* Migrando */}
              {migrandoProspectos && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
                  <span className="text-xl font-semibold">Migrando prospectos...</span>
                  <span className="text-sm text-gray-600 mt-2">
                    Esto puede tomar varios minutos
                  </span>
                </div>
              )}

              {/* Resultado */}
              {resultadoProspectos && !migrandoProspectos && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <h3 className="text-xl font-bold text-green-900">
                        ✅ MIGRACIÓN COMPLETADA
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-white rounded-lg p-4 border border-green-200">
                        <div className="text-2xl font-bold text-green-700">
                          {resultadoProspectos.prospectosCreados}
                        </div>
                        <div className="text-sm text-gray-600">Prospectos creados</div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-green-200">
                        <div className="text-2xl font-bold text-green-700">
                          {resultadoProspectos.prospectosActualizados}
                        </div>
                        <div className="text-sm text-gray-600">Prospectos actualizados</div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-green-200">
                        <div className="text-2xl font-bold text-green-700">
                          {resultadoProspectos.agendamientosCreados || 0}
                        </div>
                        <div className="text-sm text-gray-600">Agendamientos creados</div>
                      </div>

                      {resultadoProspectos.errores.length > 0 && (
                        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                          <div className="text-2xl font-bold text-red-700">
                            {resultadoProspectos.errores.length}
                          </div>
                          <div className="text-sm text-gray-600">Errores</div>
                        </div>
                      )}
                    </div>

                    {resultadoProspectos.errores.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-red-900">⚠️ Advertencias:</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={descargarLogErroresProspectos}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Descargar Log
                          </Button>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-2">
                          {resultadoProspectos.errores.map((error, idx) => (
                            <div key={idx} className="text-sm text-red-700">
                              • {error.registro}: {error.errores.join(', ')}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={() => {
                        setResultadoProspectos(null);
                        setRegistrosProspectos([]);
                        setArchivoProspectos(null);
                      }}
                      className="w-full mt-4"
                      variant="outline"
                    >
                      Nueva Migración
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Clientes y Ventas */}
        <TabsContent value="clientes">
          <Card>
            <CardHeader>
              <CardTitle>Importar Clientes con Ventas desde CSV</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Formato esperado */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">📄 Formato esperado del CSV:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Nombre y Apellido</li>
                  <li>• WhatsApp</li>
                  <li>• Fecha de Ingreso</li>
                  <li>• Fecha de Visita + Hora</li>
                  <li>• Tipo de Invitación</li>
                  <li>• Estado (Asistió/No asistió)</li>
                  <li>• Vendedor</li>
                  <li>• Fecha de Compra</li>
                  <li>• Plan</li>
                  <li>• Monto</li>
                  <li>• Descuento</li>
                  <li>• Inscripción (monto)</li>
                  <li>• Sede</li>
                </ul>
              </div>

              {/* Selector de archivo */}
              <div>
                <label className="block mb-2 font-medium text-gray-700">
                  Seleccionar archivo CSV
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleSeleccionarArchivo}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
                  >
                    <Upload className="h-4 w-4" />
                    Seleccionar CSV
                  </label>
                  {archivoCSV && (
                    <span className="text-sm text-gray-600">
                      {archivoCSV.name} ({registrosCSV.length} registros)
                    </span>
                  )}
                </div>
              </div>

              {/* Loading */}
              {cargandoCSV && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-3 text-lg">Cargando archivo...</span>
                </div>
              )}

              {/* Vista previa */}
              {registrosCSV.length > 0 && !cargandoCSV && !migrando && !resultadoMigracion && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">
                    📊 Vista Previa (primeras 5 filas):
                  </h3>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nombre</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">WhatsApp</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Plan</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Monto</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Sede</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {registrosCSV.slice(0, 5).map((registro, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm">{registro['Nombre y Apellido']}</td>
                            <td className="px-4 py-2 text-sm">{registro.WhatsApp}</td>
                            <td className="px-4 py-2 text-sm">{registro.Plan}</td>
                            <td className="px-4 py-2 text-sm">{registro.Monto}</td>
                            <td className="px-4 py-2 text-sm">{registro.Sede}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <Button
                    onClick={handleIniciarMigracion}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    🚀 Iniciar Validación y Migración
                  </Button>
                </div>
              )}

              {/* Migrando */}
              {migrando && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
                  <span className="text-xl font-semibold">Migrando datos...</span>
                  <span className="text-sm text-gray-600 mt-2">
                    Esto puede tomar varios minutos
                  </span>
                </div>
              )}

              {/* Resultado */}
              {resultadoMigracion && !migrando && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <h3 className="text-xl font-bold text-green-900">
                        ✅ MIGRACIÓN COMPLETADA
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-white rounded-lg p-4 border border-green-200">
                        <div className="text-2xl font-bold text-green-700">
                          {resultadoMigracion.prospectosCreados}
                        </div>
                        <div className="text-sm text-gray-600">Prospectos creados</div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-green-200">
                        <div className="text-2xl font-bold text-green-700">
                          {resultadoMigracion.prospectosActualizados}
                        </div>
                        <div className="text-sm text-gray-600">Prospectos actualizados</div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-green-200">
                        <div className="text-2xl font-bold text-green-700">
                          {resultadoMigracion.agendamientosCreados}
                        </div>
                        <div className="text-sm text-gray-600">Agendamientos creados</div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-green-200">
                        <div className="text-2xl font-bold text-green-700">
                          {resultadoMigracion.ventasCreadas}
                        </div>
                        <div className="text-sm text-gray-600">Ventas registradas</div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-green-200">
                        <div className="text-2xl font-bold text-green-700">
                          {resultadoMigracion.clientesSincronizados}
                        </div>
                        <div className="text-sm text-gray-600">Clientes sincronizados</div>
                      </div>

                      {resultadoMigracion.errores.length > 0 && (
                        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                          <div className="text-2xl font-bold text-red-700">
                            {resultadoMigracion.errores.length}
                          </div>
                          <div className="text-sm text-gray-600">Errores</div>
                        </div>
                      )}
                    </div>

                    {resultadoMigracion.errores.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-red-900">⚠️ Advertencias:</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={descargarLogErrores}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Descargar Log
                          </Button>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-2">
                          {resultadoMigracion.errores.map((error, idx) => (
                            <div key={idx} className="text-sm text-red-700">
                              • {error.registro}: {error.errores.join(', ')}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={() => {
                        setResultadoMigracion(null);
                        setRegistrosCSV([]);
                        setArchivoCSV(null);
                      }}
                      className="w-full mt-4"
                      variant="outline"
                    >
                      Nueva Migración
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Clientes Activos */}
        <TabsContent value="clientesActivos">
          <Card>
            <CardHeader>
              <CardTitle>Importar Clientes Activos del Mes desde CSV</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Formato esperado */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">📄 Formato esperado del CSV:</h3>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• <strong>Nombre y Apellido</strong> (obligatorio)</li>
                  <li>• <strong>WhatsApp</strong> (obligatorio - no se admiten duplicados)</li>
                  <li>• <strong>Sede</strong> (obligatorio)</li>
                  <li>• <strong>Fecha de Conversion</strong> o <strong>Fecha de Primer Plan</strong> (obligatorio - su primera compra)</li>
                  <li>• <strong>Fecha de Renovacion</strong> (obligatorio - fecha de renovación este mes)</li>
                  <li>• <strong>Plan</strong> (obligatorio - plan actual)</li>
                  <li>• <strong>Deudor</strong> (opcional - Si/No, indica si es deudor)</li>
                  <li>• Monto (opcional - monto de la renovación)</li>
                  <li>• Vendedor (opcional)</li>
                </ul>
                <p className="text-xs text-green-700 mt-3 italic">
                  ⚠️ Si el WhatsApp ya existe en el sistema, el registro será rechazado. Se creará el cliente y una venta de renovación.
                </p>
              </div>

              {/* Selector de archivo */}
              <div>
                <label className="block mb-2 font-medium text-gray-700">
                  Seleccionar archivo CSV
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleSeleccionarArchivoClientesActivos}
                    className="hidden"
                    id="csv-upload-clientes-activos"
                  />
                  <label
                    htmlFor="csv-upload-clientes-activos"
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg cursor-pointer hover:bg-green-700"
                  >
                    <Upload className="h-4 w-4" />
                    Seleccionar CSV
                  </label>
                  {archivoClientesActivos && (
                    <span className="text-sm text-gray-600">
                      {archivoClientesActivos.name} ({registrosClientesActivos.length} registros)
                    </span>
                  )}
                </div>
              </div>

              {/* Loading */}
              {cargandoClientesActivos && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                  <span className="ml-3 text-lg">Cargando archivo...</span>
                </div>
              )}

              {/* Vista previa */}
              {registrosClientesActivos.length > 0 && !cargandoClientesActivos && !migrandoClientesActivos && !resultadoClientesActivos && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">
                    📊 Vista Previa (primeras 5 filas):
                  </h3>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nombre</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">WhatsApp</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Sede</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">F. Conversión</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">F. Renovación</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Plan</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Deudor</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {registrosClientesActivos.slice(0, 5).map((registro, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm">{registro['Nombre y Apellido']}</td>
                            <td className="px-4 py-2 text-sm">{registro.WhatsApp}</td>
                            <td className="px-4 py-2 text-sm">{registro.Sede}</td>
                            <td className="px-4 py-2 text-sm">{registro['Fecha de Conversion'] || registro['Fecha Conversion'] || registro['Fecha de Primer Plan'] || '-'}</td>
                            <td className="px-4 py-2 text-sm">{registro['Fecha de Renovacion'] || registro['Fecha Renovacion'] || registro['Fecha Renovación'] || '-'}</td>
                            <td className="px-4 py-2 text-sm">{registro.Plan}</td>
                            <td className="px-4 py-2 text-sm">
                              {['Si', 'Sí', 'SI', 'si', 'sí', 'true', '1'].includes((registro.Deudor || registro['Es Deudor'])?.toString().trim()) 
                                ? <span className="text-red-600 font-medium">Sí</span> 
                                : <span className="text-green-600">No</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <Button
                    onClick={handleIniciarMigracionClientesActivos}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    🚀 Iniciar Migración de Clientes Activos
                  </Button>
                </div>
              )}

              {/* Migrando */}
              {migrandoClientesActivos && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-green-500 mb-4" />
                  <span className="text-xl font-semibold">Migrando clientes activos...</span>
                  <span className="text-sm text-gray-600 mt-2">
                    Esto puede tomar varios minutos
                  </span>
                </div>
              )}

              {/* Resultado */}
              {resultadoClientesActivos && !migrandoClientesActivos && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <h3 className="text-xl font-bold text-green-900">
                        ✅ MIGRACIÓN COMPLETADA
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-white rounded-lg p-4 border border-green-200">
                        <div className="text-2xl font-bold text-green-700">
                          {resultadoClientesActivos.clientesCreados}
                        </div>
                        <div className="text-sm text-gray-600">Clientes creados</div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-green-200">
                        <div className="text-2xl font-bold text-green-700">
                          {resultadoClientesActivos.ventasCreadas}
                        </div>
                        <div className="text-sm text-gray-600">Ventas de renovación</div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <div className="text-2xl font-bold text-blue-700">
                          {resultadoClientesActivos.ciclosRetencionCreados || 0}
                        </div>
                        <div className="text-sm text-gray-600">Ciclos retención</div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-orange-200">
                        <div className="text-2xl font-bold text-orange-700">
                          {resultadoClientesActivos.deudoresRegistrados}
                        </div>
                        <div className="text-sm text-gray-600">Deudores registrados</div>
                      </div>

                      {resultadoClientesActivos.errores.length > 0 && (
                        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                          <div className="text-2xl font-bold text-red-700">
                            {resultadoClientesActivos.errores.length}
                          </div>
                          <div className="text-sm text-gray-600">Errores/Duplicados</div>
                        </div>
                      )}
                    </div>

                    {resultadoClientesActivos.errores.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-red-900">⚠️ Registros no importados (duplicados o errores):</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={descargarLogErroresClientesActivos}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Descargar Log
                          </Button>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-2">
                          {resultadoClientesActivos.errores.map((error, idx) => (
                            <div key={idx} className="text-sm text-red-700">
                              • {error.registro}: {error.errores.join(', ')}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={() => {
                        setResultadoClientesActivos(null);
                        setRegistrosClientesActivos([]);
                        setArchivoClientesActivos(null);
                      }}
                      className="w-full mt-4"
                      variant="outline"
                    >
                      Nueva Migración
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Validación */}
      <ValidacionMigracionDialog
        open={mostrarValidacion}
        onOpenChange={setMostrarValidacion}
        registros={registrosCSV}
        onContinuar={handleContinuarMigracion}
      />

      {/* Dialog de Crear Prospectos Faltantes */}
      <CrearProspectosFaltantesDialog
        open={mostrarCrearProspectos}
        onOpenChange={setMostrarCrearProspectos}
        registrosSinProspecto={registrosSinProspecto}
        catalogos={catalogos}
        onProspectosCreados={handleProspectosCreados}
      />
    </div>
  );
}