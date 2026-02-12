// Función de automatización que se ejecuta cada hora
// Llama a las APIs de sincronización y escalamiento
export default async function(ctx) {
    const { env } = ctx;
    
    const SERVER_KEY = "2fa50294-e781-4ad8-abe4-78f21167d053";
    const BASE_URL = "https://ventasprueba.sharkfit.info";
    
    const results = {
        timestamp: new Date().toISOString(),
        sincronizacionOnboarding: null,
        escalarDeudores: null,
        sincronizacionEvo5: null,
        errors: []
    };
    
    try {
        // 1. Sincronizar Onboarding Clientes
        console.log('Ejecutando sincronización de onboarding clientes...');
        const syncResponse = await fetch(`${BASE_URL}/api/sincronizarOnboardingClientes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-server-key': SERVER_KEY
            },
            body: JSON.stringify({})
        });
        
        if (syncResponse.ok) {
            results.sincronizacionOnboarding = await syncResponse.json();
            console.log('✅ Sincronización completada:', results.sincronizacionOnboarding);
        } else {
            const errorText = await syncResponse.text();
            results.errors.push({
                api: 'sincronizarOnboardingClientes',
                status: syncResponse.status,
                error: errorText
            });
            console.error('❌ Error en sincronización:', errorText);
        }
        
    } catch (error) {
        results.errors.push({
            api: 'sincronizarOnboardingClientes',
            error: error.message
        });
        console.error('❌ Error ejecutando sincronización:', error);
    }
    
    try {
        // 2. Escalar Deudores ARS
        console.log('Ejecutando escalamiento de deudores...');
        const escalarResponse = await fetch(`${BASE_URL}/api/escalarDeudoresARS`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-server-key': SERVER_KEY
            },
            body: JSON.stringify({})
        });
        
        if (escalarResponse.ok) {
            results.escalarDeudores = await escalarResponse.json();
            console.log('✅ Escalamiento completado:', results.escalarDeudores);
        } else {
            const errorText = await escalarResponse.text();
            results.errors.push({
                api: 'escalarDeudoresARS',
                status: escalarResponse.status,
                error: errorText
            });
            console.error('❌ Error en escalamiento:', errorText);
        }
        
    } catch (error) {
        results.errors.push({
            api: 'escalarDeudoresARS',
            error: error.message
        });
        console.error('❌ Error ejecutando escalamiento:', error);
    }
    
    try {
        // 3. Sincronizar Evo5
        console.log('Ejecutando sincronización de Evo5...');
        const evo5Response = await fetch(`${BASE_URL}/api/sincronizarEvo5`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-server-key': SERVER_KEY
            },
            body: JSON.stringify({})
        });
        
        if (evo5Response.ok) {
            results.sincronizacionEvo5 = await evo5Response.json();
            console.log('✅ Sincronización Evo5 completada:', results.sincronizacionEvo5);
        } else {
            const errorText = await evo5Response.text();
            results.errors.push({
                api: 'sincronizarEvo5',
                status: evo5Response.status,
                error: errorText
            });
            console.error('❌ Error en sincronización Evo5:', errorText);
        }
        
    } catch (error) {
        results.errors.push({
            api: 'sincronizarEvo5',
            error: error.message
        });
        console.error('❌ Error ejecutando sincronización Evo5:', error);
    }
    
    // Resumen de ejecución
    const summary = {
        success: results.errors.length === 0,
        timestamp: results.timestamp,
        sincronizacionStatus: results.sincronizacionOnboarding ? 'OK' : 'ERROR',
        escalarDeudoresStatus: results.escalarDeudores ? 'OK' : 'ERROR',
        sincronizacionEvo5Status: results.sincronizacionEvo5 ? 'OK' : 'ERROR',
        totalErrors: results.errors.length
    };
    
    console.log('📊 Resumen de ejecución:', summary);
    
    return {
        success: summary.success,
        summary,
        details: results
    };
}