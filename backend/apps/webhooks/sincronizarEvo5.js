// Función de sincronización con Evo5 (w12app API)
// Se ejecuta cada 30 minutos via webhook

// Importar axios (disponible en el entorno)
import axios from 'axios';

export default async function(ctx) {
    
    // --- CONFIGURACIÓN INICIAL ---
    const config = {
        baseUrl: "https://evo-integracao.w12app.com.br/api/v1",
        dns: "sharkfitchile",
        token: "4F09A73D-6626-42A1-9D4E-7A1C5FB6B7BC"
    };
    
    const timestamp = new Date().toISOString();
    console.log(`🔄 Iniciando sincronización Evo5 - ${timestamp}`);
    
    let miembrosSincronizados = 0;
    let prospectosSincronizados = 0;
    let actividadesSincronizadas = 0;
    const errores = [];
    
    try {
        // Importar entidad Datos_EVO
        const { Datos_EVO } = await import('@/entities/Datos_EVO');
        
        // Headers comunes
        const headers = {
            'apikey': config.token,
            'Content-Type': 'application/json'
        };
        
        // 1. OBTENER EMPLEADOS (employees)
        console.log('📥 Obteniendo empleados de Evo5...');
        let empleados = [];
        try {
            const empleadosResponse = await axios.get(`${config.baseUrl}/employees`, { headers });
            empleados = empleadosResponse.data;
            console.log(`✅ Empleados obtenidos: ${Array.isArray(empleados) ? empleados.length : 0}`);
        } catch (error) {
            console.error('❌ Error en petición de empleados:', error.message);
            errores.push({ tipo: 'empleados', error: error.message });
        }
        
        // 2. OBTENER MIEMBROS (members)
        console.log('📥 Obteniendo miembros de Evo5...');
        let miembros = [];
        try {
            const miembrosResponse = await axios.get(`${config.baseUrl}/members`, { headers });
            miembros = miembrosResponse.data;
            console.log(`✅ Miembros obtenidos: ${Array.isArray(miembros) ? miembros.length : 0}`);
        } catch (error) {
            console.error('❌ Error en petición de miembros:', error.message);
            errores.push({ tipo: 'miembros', error: error.message });
        }
        
        // 3. OBTENER PROSPECTOS (prospects)
        console.log('📥 Obteniendo prospectos de Evo5...');
        let prospectos = [];
        try {
            const prospectosResponse = await axios.get(`${config.baseUrl}/prospects`, { headers });
            prospectos = prospectosResponse.data;
            console.log(`✅ Prospectos obtenidos: ${Array.isArray(prospectos) ? prospectos.length : 0}`);
        } catch (error) {
            console.error('❌ Error en petición de prospectos:', error.message);
            errores.push({ tipo: 'prospectos', error: error.message });
        }
        
        // 4. OBTENER SOLO LOS REGISTROS QUE NECESITAMOS
        // Recopilar todos los IDs que vamos a procesar
        const idsABuscar = [
            ...miembros.map(m => `MEMBER-${m.idMember || m.id}`),
            ...prospectos.map(p => `PROSPECT-${p.idProspect || p.id}`)
        ];
        
        // Query selectiva: solo buscar los registros que podrían existir
        const registrosExistentes = await Datos_EVO.list({
            filters: [
                { key: 'evo5_id', operation: 'in', value: idsABuscar }
            ]
        });
        
        // Indexar para búsqueda rápida O(1)
        const registrosPorWhatsapp = {};
        const registrosPorEmail = {};
        const registrosPorEvo5Id = {};
        
        registrosExistentes.forEach(reg => {
            if (reg.whatsapp) {
                registrosPorWhatsapp[reg.whatsapp] = reg;
            }
            if (reg.email) {
                registrosPorEmail[reg.email.toLowerCase()] = reg;
            }
            if (reg.evo5_id) {
                registrosPorEvo5Id[reg.evo5_id] = reg;
            }
        });
        
        console.log(`📊 Registros existentes encontrados: ${registrosExistentes.length} de ${idsABuscar.length} posibles`);
        
        // 5. PROCESAR MIEMBROS EN LOTE
        if (Array.isArray(miembros) && miembros.length > 0) {
            console.log(`🔄 Procesando ${miembros.length} miembros en lote...`);
            
            const operacionesCrear = [];
            const operacionesActualizar = [];
            
            for (const miembro of miembros) {
                try {
                    const evo5_id = `MEMBER-${miembro.idMember || miembro.id}`;
                    const nombre = miembro.name || miembro.fullName;
                    const whatsapp = miembro.cellphone || miembro.phone || miembro.whatsapp;
                    const email = miembro.currentEmail || miembro.email;
                    
                    // ✅ VALIDACIÓN: Solo procesar si tiene datos mínimos
                    if (!nombre || (!whatsapp && !email)) {
                        errores.push({
                            tipo: 'miembro',
                            id: miembro.idMember || miembro.id,
                            error: 'Datos insuficientes (falta nombre o contacto)'
                        });
                        continue;
                    }
                    
                    const whatsappLimpio = whatsapp ? String(whatsapp).replace(/\D/g, '') : null;
                    const emailLimpio = email ? email.toLowerCase() : null;
                    
                    const datosMiembro = {
                        tipo_evo5: 'miembro',
                        evo5_id,
                        nombre,
                        whatsapp: whatsappLimpio,
                        email: emailLimpio,
                        telefono: whatsapp,
                        ultimo_contacto: miembro.updatedAt || miembro.createdAt || timestamp,
                        estado_evo5: miembro.status || 'activo',
                        tipo_miembro: miembro.membershipType || 'regular',
                        fecha_vencimiento_evo5: miembro.expirationDate || null,
                        metadata: {
                            idBranch: miembro.idBranch,
                            branchName: miembro.branchName,
                            cpf: miembro.cpf,
                            birthDate: miembro.birthDate,
                            gender: miembro.gender
                        },
                        datos_raw: miembro,
                        fecha_sincronizacion: timestamp,
                        activo: miembro.status !== 'Inativo'
                    };
                    
                    // Buscar registro existente
                    const existente = registrosPorEvo5Id[evo5_id] || 
                                    (whatsappLimpio && registrosPorWhatsapp[whatsappLimpio]) ||
                                    (emailLimpio && registrosPorEmail[emailLimpio]);
                    
                    if (existente) {
                        operacionesActualizar.push({ id: existente.id, datos: datosMiembro });
                    } else {
                        operacion EN LOTE
        if (Array.isArray(prospectos) && prospectos.length > 0) {
            console.log(`🔄 Procesando ${prospectos.length} prospectos en lote...`);
            
            const operacionesCrear = [];
            const operacionesActualizar = [];
            
            for (const prospecto of prospectos) {
                try {
                    const evo5_id = `PROSPECT-${prospecto.idProspect || prospecto.id}`;
                    const nombre = prospecto.name || prospecto.fullName;
                    const whatsapp = prospecto.cellphone || prospecto.phone || prospecto.whatsapp;
                    const email = prospecto.currentEmail || prospecto.email;
                    
                    // ✅ VALIDACIÓN: Solo procesar si tiene datos mínimos
                    if (!nombre || (!whatsapp && !email)) {
                        errores.push({
                            tipo: 'prospecto',
                            id: prospecto.idProspect || prospecto.id,
                            error: 'Datos insuficientes (falta nombre o contacto)'
                        });
                        continue;
                    }
                    
                    const whatsappLimpio = whatsapp ? String(whatsapp).replace(/\D/g, '') : null;
                    const emailLimpio = email ? email.toLowerCase() : null;
                    
                    const datosProspecto = {
                        tipo_evo5: 'prospecto',
                        evo5_id,
                        nombre,
                        whatsapp: whatsappLimpio,
                        email: emailLimpio,
                        telefono: whatsapp,
                        ultimo_contacto: prospecto.lastContact || prospecto.createdAt || timestamp,
                        estado_evo5: prospecto.status || 'pendiente',
                        tipo_miembro: null,
                        fecha_vencimiento_evo5: null,
                        metadata: {
                            idBranch: prospecto.idBranch,
                            branchName: prospecto.branchName,
                            source: prospecto.source,
                            interest: prospecto.interest
                        },
                        datos_raw: prospecto,
                        fecha_sincronizacion: timestamp,
                        activo: true
                    };
                    
                    // Buscar registro existente
                    const existente = registrosPorEvo5Id[evo5_id] || 
                                    (whatsappLimpio && registrosPorWhatsapp[whatsappLimpio]) ||
                                    (emailLimpio && registrosPorEmail[emailLimpio]);
                    
                    if (existente) {
                        operacionesActualizar.push({ id: existente.id, datos: datosProspecto });
                    } else {
                        operacionesCrear.push(datosProspecto);
                    }
                    
                } catch (error) {
                    errores.push({
                        tipo: 'prospecto',
                        id: prospecto.idProspect || prospecto.id,
                        error: error.message
                    });
                }
            }
            
            // ⚡ BATCH INSERT: Crear todos los nuevos a la vez
            if (operacionesCrear.length > 0) {
                try {
                    await Promise.all(operacionesCrear.map(datos => Datos_EVO.create(datos)));
                    console.log(`✨ Creados ${operacionesCrear.length} prospectos nuevos`);
                    prospectosSincronizados += operacionesCrear.length;
                } catch (error) {
                    console.error(`❌ Error en batch create prospectos:`, error.message);
                    errores.push({ tipo: 'batch_create_prospectos', error: error.message });
                }
            }
            
            // ⚡ BATCH UPDATE: Actualizar todos los existentes a la vez
            if (operacionesActualizar.length > 0) {
                try {
                    await Promise.all(operacionesActualizar.map(op => Datos_EVO.update(op.id, op.datos)));
                    console.log(`🔄 Actualizados ${operacionesActualizar.length} prospectos existentes`);
                    prospectosSincronizados += operacionesActualizar.length;
                } catch (error) {
                    console.error(`❌ Error en batch update prospectos:`, error.message);
                    errores.push({ tipo: 'batch_update_prospectos', error: error.message     telefono: whatsapp,
                        ultimo_contacto: prospecto.lastContact || prospecto.createdAt || timestamp,
                        estado_evo5: prospecto.status || 'pendiente',
                        tipo_miembro: null,
                        fecha_vencimiento_evo5: null,
                        metadata: {
                            idBranch: prospecto.idBranch,
                            branchName: prospecto.branchName,
                            source: prospecto.source,
                            interest: prospecto.interest
                        },
                        datos_raw: prospecto,
                        fecha_sincronizacion: timestamp,
                        activo: true
                    };
                    
                    // Buscar registro existente
                    const existente = registrosPorEvo5Id[evo5_id] || 
                                    (whatsapp && registrosPorWhatsapp[datosProspecto.whatsapp]) ||
                                    (email && registrosPorEmail[datosProspecto.email]);
                    
                    if (existente) {
                        await Datos_EVO.update(existente.id, datosProspecto);
                        console.log(`🔄 Actualizado prospecto: ${nombre}`);
                    } else {
                        await Datos_EVO.create(datosProspecto);
                        console.log(`✨ Creado prospecto: ${nombre}`);
                    }
                    
                    prospectosSincronizados++;
                    
                } catch (error) {
                    console.error(`❌ Error procesando prospecto:`, error.message);
                    errores.push({
                        tipo: 'prospecto',
                        id: prospecto.idProspect || prospecto.id,
                        error: error.message
                    });
                }
            }
        }
        
        // Resumen final
        const resumen = {
            success: true,
            timestamp,
            miembrosSincronizados,
            prospectosSincronizados,
            actividadesSincronizadas,
            empleadosObtenidos: empleados.length,
            totalSincronizado: miembrosSincronizados + prospectosSincronizados,
            errores: errores.length,
            detalleErrores: errores.slice(0, 10)
        };
        
        console.log('✅ Sincronización completada:', resumen);
        
        return resumen;
        
    } catch (error) {
        console.error('❌ Error en sincronización Evo5:', error);
        return {
            success: false,
            error: error.message,
            timestamp,
            miembrosSincronizados,
            prospectosSincronizados,
            actividadesSincronizadas
        };
    }
}