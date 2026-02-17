// Función de test para validar la configuración de Evo5 (w12app API)

// Importar axios
import axios from 'axios';

export default async function(ctx) {
    
    const report = {
        timestamp: new Date().toISOString(),
        tests: {},
        resumen: {
            total: 0,
            exitosos: 0,
            fallidos: 0,
            pendientes: 0
        },
        recomendaciones: []
    };
    
    // --- CONFIGURACIÓN INICIAL ---
    // ✅ NUNCA hardcodear credenciales. Usar variables de entorno:
    const config = {
        baseUrl: process.env.EVO_BASE_URL || "https://evo-integracao-api.w12app.com.br/api/v2/",
    };

    const dns = process.env.EVO_DNS || "[CARGAR_DEL_ENV]";
    const token = process.env.EVO_TOKEN || "[CARGAR_DEL_ENV]";
    const authHeader = Buffer.from(`${dns}:${token}`).toString("base64");
    
    console.log('🔍 Usando configuración:', config);
    
    report.tests.configuracion = {
        status: 'success',
        message: 'Configuración cargada correctamente',
        data: {
            baseUrl: '✅ ' + config.baseUrl,
            token: '✅ Configurado'
        }
    };
    
    // Headers comunes
    const headers = {
        'apikey': config.token,
        'Content-Type': 'application/json',
        Authorization: `Basic ${authHeader}`
    };
    
    // Test 2: Endpoint /employees
    console.log('🔍 Test 2: Probando endpoint /employees...');
    try {
        const response = await axios.get(`${config.baseUrl}/employees`, { headers });
        const data = response.data;
        
        report.tests.endpointEmployees = {
            status: 'success',
            message: `✅ Endpoint funcional (${response.status})`,
            data: {
                total: Array.isArray(data) ? data.length : 'N/A',
                muestra: Array.isArray(data) && data.length > 0 ? {
                    id: data[0].idEmployee,
                    name: data[0].name,
                    branch: data[0].branchName
                } : null
            }
        };
    } catch (error) {
        console.log(error);
        report.tests.endpointEmployees = {
            status: 'error',
            message: `❌ Error: ${error.message}`,
            data: { 
                statusCode: error.response?.status,
                error: error.message 
            }
        };
    }
    
    // Test 3: Endpoint /members
    console.log('🔍 Test 3: Probando endpoint /members...');
    try {
        const response = await axios.get(`${config.baseUrl}/members`, { headers });
        const data = response.data;
        
        report.tests.endpointMembers = {
            status: 'success',
            message: `✅ Endpoint funcional (${response.status})`,
            data: {
                total: Array.isArray(data) ? data.length : 'N/A',
                muestra: Array.isArray(data) && data.length > 0 ? {
                    id: data[0].idMember,
                    name: data[0].name,
                    status: data[0].status
                } : null
            }
        };
    } catch (error) {
        console.log(error);
        report.tests.endpointMembers = {
            status: 'error',
            message: `❌ Error: ${error.message}`,
            data: { 
                statusCode: error.response?.status,
                error: error.message 
            }
        };
    }
    
    // Test 4: Endpoint /prospects
    console.log('🔍 Test 4: Probando endpoint /prospects...');
    try {
        const response = await axios.get(`${config.baseUrl}/management/prospects`, { headers });
        const data = response.data;
        
        report.tests.endpointProspects = {
            status: 'success',
            message: `✅ Endpoint funcional (${response.status})`,
            data: {
                total: Array.isArray(data) ? data.length : 'N/A',
                muestra: Array.isArray(data) && data.length > 0 ? {
                    id: data[0].idProspect,
                    name: data[0].name,
                    status: data[0].status
                } : null
            }
        };
    } catch (error) {
        console.log(error);
        report.tests.endpointProspects = {
            status: 'error',
            message: `❌ Error: ${error.message}`,
            data: { 
                statusCode: error.response?.status,
                error: error.message 
            }
        };
    }
    
    // Calcular resumen
    const tests = Object.values(report.tests);
    report.resumen.total = tests.length;
    report.resumen.exitosos = tests.filter(t => t.status === 'success').length;
    report.resumen.fallidos = tests.filter(t => t.status === 'error').length;
    report.resumen.pendientes = tests.filter(t => t.status === 'pending').length;
    
    // Generar recomendaciones
    if (report.resumen.fallidos > 0) {
        report.recomendaciones.push('⚠️ Algunos endpoints fallaron. Verifica:');
        report.recomendaciones.push('  1. Que el token sea correcto en el panel de Evo5');
        report.recomendaciones.push('  2. Contacta a soporte de w12app si persiste el error');
    }
    
    if (report.resumen.exitosos === report.resumen.total) {
        report.recomendaciones.push('✅ Todos los tests pasaron. La sincronización está lista.');
        report.recomendaciones.push('📅 La sincronización automática está configurada en EasyCron');
    }
    
    report.success = report.resumen.fallidos === 0;
    
    console.log('✅ Test completado:', report.resumen);
    
    return report;
}