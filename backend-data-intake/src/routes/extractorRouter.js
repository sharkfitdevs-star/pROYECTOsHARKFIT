/**
 * SISTEMA B: Extractor directo con configuración persistida en MongoDB.
 *
 * Este router expone endpoints bajo /api/extractor/* para:
 * - guardar/listar conexiones (ExtractorConfig)
 * - iniciar importación
 * - resolver conflictos detectados
 * - consultar estado e historial de jobs
 *
 * La lógica de extracción vive en ExtractorService.js
 * (detectConflict y runImport), que consume APIs externas y coordina persistencia.
 *
 * Este flujo maneja conflictos con datos provenientes de Excel y permite
 * estrategias explícitas de resolución antes de continuar la importación.
 *
 * Nota de arquitectura:
 * Este módulo pertenece al Sistema B y no debe confundirse con apiSetup.js,
 * que implementa el Sistema A (Setup visual + UniversalExtractor).
 */
const express  = require('express');
const mongoose = require('mongoose');
const router   = express.Router();
const { v4: uuidv4 }   = require('uuid');
const { SyncLog, ExtractorConfig } = require('../models');
const { encrypt } = require('../utils/encryption');
const { requireAuth } = require('../middleware/auth');
const { extractionRateLimiter } = require('../middleware/rateLimiter');
const { detectConflict, runImport, discoverData, previewImport, runSelective } = require('../services/ExtractorService');
const { preflightCheck } = require('../services/evoImportGuard');
const { logger } = require('../utils/logger');

function validateCredentials(configDoc) {
  const authType = configDoc.authType;
  if (authType === 'basic_evo') {
    if (!configDoc.dns || !configDoc.dns.trim())
      return 'La conexión EVO no tiene DNS configurado. Edita la conexión y agrega el DNS del gimnasio.';
    if (!configDoc.apiKeyEncrypted)
      return 'La conexión EVO no tiene API Key. Edita la conexión y agrega la API Key.';
    return null;
  }
  if (authType === 'bearer') {
    if (!configDoc.encryptedToken)
      return 'La conexión no tiene token Bearer. Edita la conexión y agrega el token.';
    return null;
  }
  if (authType === 'apikey') {
    if (!configDoc.encryptedKey)
      return 'La conexión no tiene API Key. Edita la conexión y agrega la clave.';
    return null;
  }
  if (authType === 'basic') {
    if (!configDoc.encryptedKey || !configDoc.encryptedSecret)
      return 'La conexión Basic no tiene usuario o contraseña. Edita la conexión.';
    return null;
  }
  return null;
}

function buildConfigLookup(configId) {
  const lookup = [{ connectionName: configId }];
  if (mongoose.Types.ObjectId.isValid(configId)) {
    lookup.unshift({ _id: new mongoose.Types.ObjectId(configId) });
  }
  return lookup;
}

// ── POST /api/extractor/config ───────────────────────────────────────────────
router.post('/config', requireAuth, async (req, res) => {
  try {
    const {
      connectionName, provider, baseUrl, authType,
      token, apiKey, secret, defaultDataset, autoSyncEnabled,
      // Campos nuevos para EVO Basic Auth
      dns, filialId, planType
    } = req.body;

    const providerNormalized = String(provider || '').toLowerCase();

    // Validar campos requeridos
    if (!connectionName || !provider || (providerNormalized !== 'evo' && !baseUrl)) {
      return res.status(400).json({ 
        error: true, 
        message: 'Faltan campos requeridos: connectionName, provider y baseUrl (excepto EVO)' 
      });
    }

    // Para EVO: forzar authType a 'basic_evo' y validar campos
    let finalAuthType = authType;
    if (providerNormalized === 'evo') {
      finalAuthType = 'basic_evo';
      
      if (!dns) {
        return res.status(400).json({ 
          error: true, 
          message: 'El DNS del gimnasio es requerido para configuración EVO' 
        });
      }
      
      if (!apiKey) {
        return res.status(400).json({ 
          error: true, 
          message: 'La API Key es requerida para configuración EVO' 
        });
      }
    }

    // Sanitizar baseUrl: eliminar trailing slashes y paths como /api/v1
    let sanitizedUrl = '';
    if (providerNormalized !== 'evo') {
      sanitizedUrl = String(baseUrl || '').trim();
      sanitizedUrl = sanitizedUrl.replace(/\/+$/, ''); // Remove trailing slashes
      sanitizedUrl = sanitizedUrl.replace(/\/(api\/v[0-9]+|api|v[0-9]+)\/?$/, ''); // Remove API paths
      sanitizedUrl = sanitizedUrl.replace(/\/+$/, ''); // Final cleanup
    }

    // Construir documento de actualización
    const updateData = {
      provider,
      authType: finalAuthType,
      defaultDataset: defaultDataset || 'ambos',
      autoSyncEnabled: autoSyncEnabled || false,
      isActive: true,
    };

    // Para EVO, la URL base es constante en backend y no se expone en frontend
    if (providerNormalized !== 'evo') {
      updateData.baseUrl = sanitizedUrl;
    }

    // Agregar credenciales si se proporcionan
    if (token) {
      updateData.encryptedToken = encrypt(token);
    }
    if (apiKey && providerNormalized !== 'evo') {
      // Para non-EVO: guardar como encryptedKey
      updateData.encryptedKey = encrypt(apiKey);
    }
    if (secret) {
      updateData.encryptedSecret = encrypt(secret);
    }

    // Campos específicos para EVO
    if (providerNormalized === 'evo') {
      updateData.dns = dns; // No cifrar — es metadata pública (subdominio)
      updateData.apiKeyEncrypted = encrypt(apiKey); // Cifrar la API Key
      updateData.planType = planType || 'plus'; // Tipo de plan para rate limiter
      
      if (filialId) {
        updateData.filialId = filialId;
      }
    }

    const doc = await ExtractorConfig.findOneAndUpdate(
      { connectionName },
      updateData,
      { upsert: true, new: true }
    );

    // Para EVO, limpiar baseUrl persistida para que no quede en DB
    if (providerNormalized === 'evo') {
      await ExtractorConfig.updateOne({ _id: doc._id }, { $unset: { baseUrl: 1 } });
    }

    logger.info(`✅ Config de extractor guardada`, {
      connectionName,
      provider,
      authType: finalAuthType,
      hasFilial: !!filialId,
      planType
    });

    res.json({ success: true, data: doc.toSafeJSON() });
  } catch (err) {
    logger.error('Error al guardar config de extractor', { 
      message: err.message, 
      stack: err.stack 
    });
    res.status(400).json({ error: true, message: 'Error en la solicitud' });
  }
});

// ── GET /api/extractor/config ────────────────────────────────────────────────
  router.get('/config', requireAuth, async (req, res) => {
  try {
    const configs = await ExtractorConfig.find({ isActive: true });
    res.json({ success: true, data: configs.map(c => c.toSafeJSON()) });
  } catch (err) {
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
});

// ── POST /api/extractor/discover ────────────────────────────────────────────
// Paso 1: descubre tipos disponibles, permisos y conteo real por tipo.
router.post('/discover', requireAuth, extractionRateLimiter, async (req, res) => {
  try {
    const { configId, dateRange } = req.body || {};

    if (!configId || typeof configId !== 'string' || !configId.trim()) {
      return res.status(400).json({
        error: true,
        message: 'Debes seleccionar una conexión antes de analizar datos.'
      });
    }

    const configDoc = await ExtractorConfig.findOne({ $or: buildConfigLookup(configId) });
    if (!configDoc) {
      return res.status(404).json({
        error: true,
        message: 'Conexión no encontrada. Verifica que la conexión existe.'
      });
    }

    const credentialError = validateCredentials(configDoc);
    if (credentialError) {
      return res.status(400).json({ error: true, message: credentialError });
    }

    const result = await Promise.race([
      discoverData(configId, dateRange),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 30000)
      )
    ]);

    res.json({ success: true, ...result });

  } catch (err) {
    logger.error('Error en POST /api/extractor/discover', { message: err.message });

    if (err.message === 'TIMEOUT') {
      return res.status(504).json({
        error: true,
        message: 'EVO tardó demasiado en responder (30s). Intenta más tarde.'
      });
    }
    if (err.statusCode && err.userMessage) {
      return res.status(err.statusCode).json({ error: true, message: err.userMessage });
    }
    res.status(500).json({
      error: true,
      message: 'Error interno al analizar datos de EVO. Revisa los logs del servidor.'
    });
  }
});

// ── POST /api/extractor/preview ─────────────────────────────────────────────
// Paso 2/3: previsualiza requests estimados y valida límites antes de ejecutar.
router.post('/preview', requireAuth, extractionRateLimiter, async (req, res) => {
  try {
    const { configId, selections = [], dateRange } = req.body || {};
    if (!configId) {
      return res.status(400).json({ error: true, message: 'configId requerido' });
    }

    const result = await previewImport(configId, selections, dateRange);
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('Error en POST /api/extractor/preview', { message: err.message, stack: err.stack });
    if (err.statusCode && err.userMessage) {
      return res.status(err.statusCode).json({ error: true, message: err.userMessage });
    }
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
});

// ── POST /api/extractor/run-selective ───────────────────────────────────────
// Paso 3: ejecuta importación selectiva luego de confirmación explícita.
router.post('/run-selective', requireAuth, extractionRateLimiter, async (req, res) => {
  try {
    const { configId, selections = [], dateRange } = req.body || {};

    if (!configId || typeof configId !== 'string' || !configId.trim()) {
      return res.status(400).json({
        error: true,
        message: 'Debes seleccionar una conexión antes de importar.'
      });
    }

    const configDoc = await ExtractorConfig.findOne({ $or: buildConfigLookup(configId) });
    if (!configDoc) {
      return res.status(404).json({ error: true, message: 'Conexión no encontrada.' });
    }

    const credentialError = validateCredentials(configDoc);
    if (credentialError) {
      return res.status(400).json({ error: true, message: credentialError });
    }

    if (!Array.isArray(selections) || selections.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'Selecciona al menos un tipo de datos para importar.'
      });
    }

    // Timeout de 6min para dar margen a EVO en hora pico (hasta 3min confirmado por soporte)
    req.setTimeout(360000);
    res.setTimeout(360000);

    const result = await runSelective(
      configId,
      selections,
      req.user?.id || null,
      dateRange
    );

    res.json(result);

  } catch (err) {
    logger.error('Error en POST /api/extractor/run-selective', { message: err.message });

    if (err.message?.includes('MONTHLY_LIMIT_EXCEEDED')) {
      return res.status(429).json({
        error: true,
        message: 'Límite mensual EVO alcanzado. Plan Plus: 100/día y 1.000/mes.'
      });
    }
    if (err.message?.includes('DAILY_LIMIT_EXCEEDED')) {
      return res.status(429).json({
        error: true,
        message: 'Límite diario EVO alcanzado. Plan Plus: 100 requests por día.'
      });
    }
    if (err.statusCode && err.userMessage) {
      return res.status(err.statusCode).json({ error: true, message: err.userMessage });
    }
    res.status(500).json({
      error: true,
      message: 'Error interno al ejecutar la importación.'
    });
  }
});

// ── POST /api/extractor/run ──────────────────────────────────────────────────
// Paso 1: detecta conflicto. Si hay conflicto devuelve 409 con jobId guardado.
// Si no hay conflicto, lanza la importación directamente.
router.post('/run', requireAuth, extractionRateLimiter, async (req, res) => {
  try {
    const { configId, dataset = 'ambos', dateRange } = req.body;
    if (!configId) return res.status(400).json({ error: true, message: 'configId requerido' });

    // Buscar la configuración
    const configDoc = await ExtractorConfig.findOne({ $or: buildConfigLookup(configId) });
    if (!configDoc) {
      return res.status(404).json({ error: true, message: 'Configuración de conexión no encontrada' });
    }

    // ✅ Validar que la conexión tiene las credenciales correctas según authType
    if (configDoc.authType === 'basic_evo') {
      if (!configDoc.dns || !configDoc.apiKeyEncrypted) {
        return res.status(400).json({ 
          error: true, 
          message: 'Configuración incompleta: falta DNS o API Key. Actualiza la conexión EVO.' 
        });
      }
    } else if (configDoc.authType === 'bearer' && !configDoc.encryptedToken) {
      return res.status(400).json({ 
        error: true, 
        message: 'Configuración incompleta: falta el token. Actualiza la conexión.' 
      });
    } else if (configDoc.authType === 'apikey' && !configDoc.encryptedKey) {
      return res.status(400).json({ 
        error: true, 
        message: 'Configuración incompleta: falta la API Key. Actualiza la conexión.' 
      });
    } else if (configDoc.authType === 'basic' && (!configDoc.encryptedKey || !configDoc.encryptedSecret)) {
      return res.status(400).json({ 
        error: true, 
        message: 'Configuración incompleta: falta usuario o contraseña. Actualiza la conexión.' 
      });
    }

    const { hasConflict, excelRecordCount } = await detectConflict(dataset);
    const jobId = uuidv4();
    const userId = req.user?.id || null;
    
    await SyncLog.create({
      jobId,
      source:           configDoc.provider || 'api',
      connectionName:   configDoc.connectionName || configId,
      dataset,
      status:           hasConflict ? 'conflict_pending' : 'queued',
      conflictDetected: hasConflict,
      excelRecordCount,
      userId,
    });

    if (hasConflict) {
      return res.status(409).json({
        success:         false,
        conflict:        true,
        jobId,
        excelRecordCount,
        message: `Hay ${excelRecordCount} registros importados desde Excel. Elegí una estrategia.`,
      });
    }

    // Sin conflicto: importar directo con estrategia overwrite por defecto
    const result = await runImport({ configId, dataset, strategy: 'overwrite', dateRange, jobId, userId });
    res.json({ success: true, jobId, result });

  } catch (err) {
    logger.error('Error en POST /api/extractor/run', { message: err.message, stack: err.stack });
    if (err.statusCode && err.userMessage) {
      return res.status(err.statusCode).json({ error: true, message: err.userMessage });
    }
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
});

// ── POST /api/extractor/resolve ──────────────────────────────────────────────
// Paso 2 (solo si hubo conflicto): recibe la estrategia elegida y ejecuta.
router.post('/resolve', requireAuth, extractionRateLimiter, async (req, res) => {
  try {
    const { jobId, strategy, configId, dataset, dateRange } = req.body;

    if (!jobId || !strategy || !configId) {
      return res.status(400).json({ error: true, message: 'jobId, strategy y configId son requeridos' });
    }
    if (strategy === 'cancel') {
      await SyncLog.updateOne({ jobId }, { status: 'cancelled_by_user', conflictStrategy: 'cancel' });
      return res.json({ success: true, message: 'Importación cancelada. Datos sin cambios.' });
    }

    const result = await runImport({ configId, dataset, strategy, dateRange, jobId, userId: req.user?.id || null });
    res.json({ success: true, jobId, result });

  } catch (err) {
    logger.error('Error en POST /api/extractor/resolve', { message: err.message, stack: err.stack });
    if (err.statusCode && err.userMessage) {
      return res.status(err.statusCode).json({ error: true, message: err.userMessage });
    }
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
});

// ── GET /api/extractor/status/:jobId ────────────────────────────────────────
router.get('/status/:jobId', requireAuth, async (req, res) => {
  try {
    const log = await SyncLog.findOne({ jobId: req.params.jobId });
    if (!log) return res.status(404).json({ error: true, message: 'Job no encontrado' });
    res.json({ ok: true, success: true, data: log });
  } catch (err) {
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
});

// ── GET /api/extractor/logs ──────────────────────────────────────────────────
router.get('/logs', requireAuth, async (req, res) => {
  try {
    const { source, status, limit = 20 } = req.query;
    const filtro = {};
    if (source) filtro.source = source;
    if (status) filtro.status = status;

    const logs = await SyncLog.find(filtro)
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(limit), 100));

    res.json({ ok: true, success: true, data: logs });
  } catch (err) {
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
});

// ── DELETE /api/extractor/config/:name ──────────────────────────────────────
router.delete('/config/:name', requireAuth, async (req, res) => {
  try {
    const result = await ExtractorConfig.findOneAndDelete({ connectionName: req.params.name });
    if (!result) return res.status(404).json({ error: true, message: 'Conexión no encontrada' });
    res.json({ success: true, message: `Conexión "${req.params.name}" eliminada.` });
  } catch (err) {
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
});

module.exports = router;
