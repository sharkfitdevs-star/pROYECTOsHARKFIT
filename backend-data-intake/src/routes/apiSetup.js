/**
 * API SETUP ROUTE
 * 
 * Expone el configurador interactivo de APIs como endpoint REST
 * - POST /api/setup/validate - Validar URL de API
 * - POST /api/setup/test-auth - Probar autenticación
 * - POST /api/setup/test-endpoint - Probar endpoint específico
 * - POST /api/setup/create - Crear configuración final
 */

const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { logger } = require('../utils/logger');
const { requireAuth } = require('../middleware/auth');
const { extractAndSync, extractAllApis } = require('../index');
const { findEvoMapping, applyEvoMapping, getEvoEndpointSuggestions } = require('../connectors/EvoMappings');

// models and repository helpers used by the new persistence logic
const ApiIntegration = require('../models/ApiIntegration');
const {
  upsertVenta,
  upsertCliente,
  upsertLead
} = require('../db/repositories.js');

const router = express.Router();

/**
 * Detectar tipos de datos basado en claves de un objeto
 */
function detectDataTypes(record) {
  if (!record || typeof record !== 'object') return [];

  const keys = Object.keys(record);
  const types = [];

  // Palabras clave para detectar tipos automáticamente
  const typeKeywords = {
    'clientes': ['cliente', 'customer', 'name', 'usuario', 'user', 'cuenta', 'account'],
    'ventas': ['venta', 'sale', 'order', 'pedido', 'transaccion', 'transaction', 'monto', 'amount', 'total'],
    'alertas': ['alerta', 'alert', 'notificacion', 'notification', 'estado', 'status', 'evento', 'event'],
    'cuenta': ['cuenta', 'account', 'subscription', 'plan', 'balance', 'saldo'],
    'estados': ['estado', 'status', 'condition', 'estado_pago', 'payment_status'],
    'otros': []
  };

  // Detectar por palabras clave
  for (const key of keys) {
    const keyLower = key.toLowerCase();
    for (const [type, keywords] of Object.entries(typeKeywords)) {
      if (type === 'otros') continue;
      if (keywords.some(kw => keyLower.includes(kw))) {
        if (!types.includes(type)) types.push(type);
      }
    }
  }

  // Si no detectó nada específico, agregar "otros"
  if (types.length === 0) {
    types.push('otros');
  }

  return types;
}


/**
 * Validar que la URL sea accesible
 */
router.post('/validate-url', requireAuth, async (req, res) => {
  try {
    const { url } = req.body;

    // Validar formato
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'URL inválida'
      });
    }

    // Intentar conexión
    try {
      const response = await axios.head(url, { timeout: 5000 });
      return res.json({
        success: true,
        message: '✅ URL es válida y accesible',
        status: response.status
      });
    } catch (error) {
      if (error.code === 'ENOTFOUND') {
        return res.json({
          success: false,
          error: '❌ DNS no resolvió. ¿La URL es correcta?'
        });
      }
      if (error.code === 'ECONNREFUSED') {
        return res.json({
          success: false,
          error: '⚠️ Conexión rechazada. ¿El servidor está corriendo?'
        });
      }
      return res.json({
        success: false,
        error: `❌ Error: ${error.message}`
      });
    }
  } catch (error) {
    logger.error('Error validando URL:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Probar autenticación
 */
router.post('/test-auth', requireAuth, async (req, res) => {
  try {
    const { baseURL, auth } = req.body;

    let headers = {};
    let credentials = {};

    if (auth.type === 'bearer') {
      headers['Authorization'] = `Bearer ${auth.token}`;
    } else if (auth.type === 'apikey') {
      headers[auth.headerName] = auth.key;
    } else if (auth.type === 'basic') {
      credentials = {
        username: auth.username,
        password: auth.password
      };
    } else if (auth.type === 'oauth') {
      // Para OAuth, intentar obtener token
      try {
        const tokenRes = await axios.post(auth.tokenURL, {
          client_id: auth.clientId,
          client_secret: auth.clientSecret,
          grant_type: 'client_credentials'
        }, { timeout: 10000 });

        headers['Authorization'] = `Bearer ${tokenRes.data.access_token}`;
      } catch (error) {
        return res.json({
          success: false,
          error: `❌ OAuth fallido: ${error.response?.data?.error || error.message}`
        });
      }
    }

    // Intentar GET a URL base para verificar auth
    try {
      const response = await axios.get(baseURL, {
        headers,
        auth: credentials,
        timeout: 10000,
        validateStatus: () => true // No lanzar error en respuestas ≥ 400
      });

      if (response.status === 401 || response.status === 403) {
        return res.json({
          success: false,
          error: `❌ Autenticación rechazada (HTTP ${response.status}). Verifica credenciales.`
        });
      }

      return res.json({
        success: true,
        message: '✅ Autenticación correcta',
        status: response.status
      });
    } catch (error) {
      return res.json({
        success: false,
        error: `❌ Error: ${error.message}`
      });
    }
  } catch (error) {
    logger.error('Error probando auth:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Probar endpoint específico
 */
router.post('/test-endpoint', requireAuth, async (req, res) => {
  try {
    const { baseURL, path: endpointPath, auth } = req.body;

    let headers = {};
    let credentials = {};

    if (auth.type === 'bearer') {
      headers['Authorization'] = `Bearer ${auth.token}`;
    } else if (auth.type === 'apikey') {
      headers[auth.headerName] = auth.key;
    } else if (auth.type === 'basic') {
      credentials = {
        username: auth.username,
        password: auth.password
      };
    }

    const fullURL = `${baseURL}${endpointPath}`;

    try {
      const response = await axios.get(fullURL, {
        headers,
        auth: credentials,
        timeout: 10000,
        params: { limit: 1 } // Solo traer 1 registro para testing
      });

      // Intentar extraer datos
      let data = response.data;
      let recordCount = 0;
      let dataTypes = [];
      let sampleRecord = null;

      if (Array.isArray(data)) {
        recordCount = data.length;
        sampleRecord = data[0];
        // Detectar tipos de datos basado en el contenido
        if (sampleRecord && typeof sampleRecord === 'object') {
          dataTypes = detectDataTypes(sampleRecord);
        }
      } else if (data && typeof data === 'object') {
        // Podría estar envuelto en una clave
        const keys = Object.keys(data);
        for (const key of keys) {
          if (Array.isArray(data[key])) {
            recordCount = data[key].length;
            sampleRecord = data[key][0];
            // Detectar tipos de datos
            if (sampleRecord && typeof sampleRecord === 'object') {
              dataTypes = detectDataTypes(sampleRecord);
            }
            break;
          }
        }
      }

      return res.json({
        success: true,
        message: `✅ Endpoint accesible`,
        recordCount,
        sampleRecord,
        suggestedDataTypes: dataTypes
      });
    } catch (error) {
      if (error.response?.status === 404) {
        return res.json({
          success: false,
          error: `❌ Endpoint no encontrado (404)`
        });
      }
      return res.json({
        success: false,
        error: `❌ Error: ${error.message}`
      });
    }
  } catch (error) {
    logger.error('Error probando endpoint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Crear y guardar configuración
 */
router.post('/create', requireAuth, async (req, res) => {
  try {
    const {
      apiName,
      baseURL,
      auth,
      endpoints,
      webhooksEnabled,
      historicalStartDate,
      historicalEndDate
    } = req.body;
    const supportsWebhooks = Boolean(webhooksEnabled);

    // Validar datos
    if (!apiName || !baseURL || !endpoints || endpoints.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Faltan datos requeridos'
      });
    }

    // Generar nombre de config
    const configName = apiName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const config = {
      id: `api-${configName}`,
      name: apiName,
      type: 'rest',
      description: `Extrae datos de ${apiName} hacia MongoDB`,
      baseURL,
      auth,
      endpoints,
      webhooks: {
        enabled: supportsWebhooks
      },
      historical: {
        startDate: historicalStartDate || null,
        endDate: historicalEndDate || null
      },
      syncInterval: 60,
      timeout: 30000,
      createdBy: req.user.id,
      createdAt: new Date()
    };

    // Guardar archivo JSON en configs
    const configPath = path.join(
      __dirname,
      '../../configs',
      `api-${configName}.json`
    );

    if (!fs.existsSync(path.dirname(configPath))) {
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // also persist metadata in MongoDB so the frontend can load
    // list of integrations even after server restarts
    try {
      await ApiIntegration.findOneAndUpdate(
        { tenantId: config.id },
        {
          tenantId: config.id,
          name: config.name,
          dns: config.baseURL,
          endpointsCount: Array.isArray(endpoints) ? endpoints.length : 0,
          status: 'active',
          encryptedToken: JSON.stringify(auth), // TODO: encrypt later
          updatedAt: new Date()
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (err) {
      // log warning but don't fail the request since JSON file is still valid
      logger.warn('Mongo upsert failed for ApiIntegration', { err: err.message });
    }

    logger.info(`✅ Config guardada: api-${configName}`, { userId: req.user.id });

    return res.json({
      success: true,
      message: `✅ Configuración guardada: api-${configName}`,
      configName: `api-${configName}`,
      endpoint: `/api/setup/extract/${configName}`
    });
  } catch (error) {
    logger.error('Error creando config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Ejecutar extracción manual (una config o todas)
 */
router.post('/extract', requireAuth, async (req, res) => {
  try {
    const { configName } = req.body;

    if (configName) {
      if (!configName.startsWith('api-')) {
        return res.status(400).json({
          success: false,
          error: 'Solo se permiten configuraciones api-*'
        });
      }

      // run the generic extractor which also returns raw data per endpoint
      const result = await extractAndSync(configName);

      // build a human-friendly summary using the returned data arrays
      const summary = {
        success: true,
        inserted: { ventas: 0, clientes: 0, prospectos: 0 },
        updated:  { ventas: 0, clientes: 0, prospectos: 0 },
        errors: []
      };

      for (const [epName, epRes] of Object.entries(result.results || {})) {
        if (!epRes.success || !Array.isArray(epRes.data)) continue;
        const dt = epRes.dataType;
        for (const item of epRes.data) {
          try {
            // auto mapeo EVO si existe configuración conocida
            const mapping = findEvoMapping(epRes.source || epName);
            const itemToProcess = mapping ? mapping.mapTo(item) : item;
            const it = itemToProcess;

            if (dt === 'ventas') {
              const venta = {
                ventaId: it.id || it.code || it.evo_sale_id,
                eventoVentaId: it.id,
                monto: it.value || it.amount || it.totalAmount || 0,
                nombreCliente: it.prospect_name || it.memberName || it.name,
                sede: it.branch || it.branchName || it.location,
                fecha: it.sale_date || it.saleDate || it.date,
                estatus: it.status || it.paymentStatus || 'Pendiente',
                fuente: 'api-import'
              };
              const r = await upsertVenta(venta);
              if (r.inserted) summary.inserted.ventas++;
              if (r.updated) summary.updated.ventas++;
            } else if (dt === 'clientes' || dt === 'miembros') {
              const cliente = {
                uniqueId: it.id || it.member_id,
                name: it.name || (it.first_name && it.last_name ? it.first_name + ' ' + it.last_name : null),
                email: it.email,
                phone: it.phone || it.cellPhone,
                registrationDate: it.registration_date || it.created_at,
                source: 'api-import'
              };
              const r = await upsertCliente(cliente);
              if (r.inserted) summary.inserted.clientes++;
              if (r.updated) summary.updated.clientes++;
            } else if (dt === 'prospectos') {
              const r = await upsertLead(it);
              if (r.inserted) summary.inserted.prospectos++;
              if (r.updated) summary.updated.prospectos++;
            }
          } catch (e) {
            summary.errors.push({ endpoint: epName, error: e.message });
          }
        }
      }

      return res.json(summary);
    }

    const results = await extractAllApis();
    return res.json({ success: true, results });
  } catch (error) {
    logger.error('Error en extracción manual:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Obtener configuración específica de una API
 */
router.get('/config/:configName', requireAuth, async (req, res) => {
  try {
    const { configName } = req.params;

    if (!configName.startsWith('api-') && !configName.startsWith('api_')) {
      const normalizedName = `api-${configName}`;
      return res.redirect(`/setup/config/${normalizedName}`);
    }

    const configPath = path.join(
      __dirname,
      '../../configs',
      `${configName}.json`
    );

    if (!fs.existsSync(configPath)) {
      return res.status(404).json({
        success: false,
        error: 'Configuración no encontrada'
      });
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    res.json({ success: true, config });
  } catch (error) {
    logger.error('Error obteniendo config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Extraer solo tipos de datos seleccionados
 */
router.post('/extract-selective', requireAuth, async (req, res) => {
  try {
    const { configName, selectedDataTypes } = req.body;

    if (!configName || !Array.isArray(selectedDataTypes) || selectedDataTypes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'configName y selectedDataTypes requeridos'
      });
    }

    if (!configName.startsWith('api-')) {
      return res.status(400).json({
        success: false,
        error: 'Solo se permiten configuraciones api-*'
      });
    }

    // Leer configuración
    const configPath = path.join(
      __dirname,
      '../../configs',
      `${configName}.json`
    );

    if (!fs.existsSync(configPath)) {
      return res.status(404).json({
        success: false,
        error: 'Configuración no encontrada'
      });
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Filtrar endpoints por tipos seleccionados
    const filteredEndpoints = config.endpoints.filter(ep => 
      selectedDataTypes.includes(ep.dataType)
    );

    logger.info(`[SELECTIVE_EXTRACT] ${configName}: extrayendo ${selectedDataTypes.join(', ')}`);
    logger.info(`[SELECTIVE_EXTRACT] Endpoints a extraer: ${filteredEndpoints.length}`);

    // TODO: Aquí se ejecutaría la extracción real con los endpoints filtrados
    // Por ahora, solo confirmamos que se inició

    return res.json({
      success: true,
      message: `✅ Extracción selectiva iniciada: ${selectedDataTypes.join(', ')}`,
      configName,
      selectedDataTypes,
      endpointsToExtract: filteredEndpoints.length
    });
  } catch (error) {
    logger.error('Error en extracción selectiva:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Listar configuraciones disponibles
 */
// Sugerencias de endpoints EVO conocidos
router.get('/evo-suggestions', requireAuth, (req, res) => {
  res.json({ success: true, suggestions: getEvoEndpointSuggestions() });
});

router.get('/list', requireAuth, async (req, res) => {
  try {
    // Try to read from MongoDB first. If anything goes wrong, fall back to JSON files.
    try {
      const docs = await ApiIntegration.find({}).lean();
      if (Array.isArray(docs) && docs.length > 0) {
        const configs = docs.map(doc => ({
          id: doc.tenantId,
          name: doc.name || null,
          baseURL: doc.dns,
          endpoints: doc.endpointsCount || 0,
          createdAt: doc.createdAt || doc.created_at || null
        }));
        return res.json({ success: true, configs });
      }
      // if no records returned we still fall through to file system - maybe just empty
    } catch (mongoErr) {
      logger.warn('Mongo read of ApiIntegration failed, falling back to FS', {
        message: mongoErr.message
      });
      // continue to filesystem logic below
    }

    // filesystem fallback
    const configsDir = path.join(__dirname, '../../configs');
    if (!fs.existsSync(configsDir)) {
      return res.json({ success: true, configs: [] });
    }

    const files = fs.readdirSync(configsDir)
      .filter(f => f.startsWith('api-') && f.endsWith('.json'));

    const configs = files.map(file => {
      const content = JSON.parse(
        fs.readFileSync(path.join(configsDir, file), 'utf8')
      );
      return {
        id: content.id,
        name: content.name,
        baseURL: content.baseURL,
        endpoints: content.endpoints?.length || 0,
        createdAt: content.createdAt
      };
    });

    res.json({ success: true, configs });
  } catch (error) {
    logger.error('Error listando configs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
