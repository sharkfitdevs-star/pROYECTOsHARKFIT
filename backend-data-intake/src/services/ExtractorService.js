/**
 * ExtractorService.js
 *
 * Lógica central del extractor de datos API:
 * - Detecta conflicto con registros excel existentes
 * - Aplica la estrategia de resolución elegida por el usuario
 * - Hace upsert idempotente por externalId
 * - Persiste en Venta / Cliente según dataset
 * - Actualiza el SyncLog en cada paso
 */
const { v4: uuidv4 } = require('uuid');
const axios          = require('axios');
const mongoose       = require('mongoose');
const { SyncLog, ExtractorConfig, Venta, Cliente } = require('../models');
const { decrypt } = require('../utils/encryption');
const { RateLimiter } = require('./RateLimiter');
const { logger }      = require('../utils/logger');
const { findEvoMapping, applyEvoMapping } = require('../connectors/EvoMappings');

// URL base de EVO definida solo en backend (no editable desde frontend/DB)
const EVO_BASE_URL = 'https://evo-integracao.w12app.com.br';

// Definición central de tipos de datos EVO para flujo selectivo
const EVO_SELECTIVE_TYPES = [
  { type: 'ventas',     label: 'Ventas',              defaultTarget: 'ventas' },
  { type: 'clientes',   label: 'Clientes / Miembros', defaultTarget: 'clientes' },
  { type: 'prospectos', label: 'Prospectos / Leads',  defaultTarget: 'overview' },
  { type: 'membresias', label: 'Membresías',          defaultTarget: 'overview' },
  { type: 'pagos',      label: 'Pagos / Deudas',      defaultTarget: 'overview' },
  { type: 'entradas',   label: 'Accesos / Entradas',  defaultTarget: 'overview' },
];

class ExtractorUserError extends Error {
  constructor(message, userMessage, statusCode = 400) {
    super(message);
    this.name = 'ExtractorUserError';
    this.userMessage = userMessage;
    this.statusCode = statusCode;
  }
}

function buildConfigLookup(configId) {
  const lookup = [{ connectionName: configId }];
  if (mongoose.Types.ObjectId.isValid(configId)) {
    lookup.unshift({ _id: new mongoose.Types.ObjectId(configId) });
  }
  return lookup;
}

async function findExtractorConfig(configId) {
  return ExtractorConfig.findOne({ $or: buildConfigLookup(configId) });
}

function getEvoBaseUrl() {
  return EVO_BASE_URL;
}

function sanitizeBaseUrl(baseUrl) {
  // Remove trailing slash y cualquier path como /api/v1, /api/v2, etc.
  let sanitized = typeof baseUrl === 'string' ? baseUrl.trim() : '';
  
  // Eliminar trailing slashes
  sanitized = sanitized.replace(/\/+$/, '');
  
  // Eliminar paths comunes de API si están al final
  sanitized = sanitized.replace(/\/(api\/v[0-9]+|api|v[0-9]+)\/?$/, '');
  
  // Volver a eliminar trailing slashes en caso de que quedaran
  sanitized = sanitized.replace(/\/+$/, '');
  
  return sanitized;
}

function buildRequestParams(dateRange) {
  const params = {};
  if (dateRange?.from) params.from = new Date(dateRange.from).toISOString();
  if (dateRange?.to) params.to = new Date(dateRange.to).toISOString();
  return params;
}

function decryptCredential(value, missingMessage, invalidMessage) {
  if (!value || typeof value !== 'string') {
    throw new ExtractorUserError(missingMessage, invalidMessage);
  }

  try {
    return decrypt(value);
  } catch (error) {
    throw new ExtractorUserError(error.message, invalidMessage);
  }
}

function buildAuthConfig(config) {
  const headers = {};
  const axiosConfig = { headers };

  if (config.authType === 'bearer') {
    headers.Authorization = `Bearer ${decryptCredential(
      config.encryptedToken,
      'Falta encryptedToken para auth bearer',
      'Las credenciales de esta conexión no son válidas. Re-configúrala.'
    )}`;
    return axiosConfig;
  }

  if (config.authType === 'apikey') {
    headers['X-Api-Key'] = decryptCredential(
      config.encryptedKey,
      'Falta encryptedKey para auth apikey',
      'Las credenciales de esta conexión no son válidas. Re-configúrala.'
    );
    return axiosConfig;
  }

  if (config.authType === 'basic') {
    const usernameCipher = config.encryptedKey || config.encryptedToken;
    const username = decryptCredential(
      usernameCipher,
      'Falta usuario/API key para auth basic',
      'Las credenciales de esta conexión no son válidas. Re-configúrala.'
    );
    const password = decryptCredential(
      config.encryptedSecret,
      'Falta secret para auth basic',
      'Las credenciales de esta conexión no son válidas. Re-configúrala.'
    );
    axiosConfig.auth = { username, password };
  }

  // ─── Caso especial: EVO Basic Auth ──────────────────────────────────────────
  // DNS = usuario (sin cifrar, es el subdominio), API Key = password (cifrada)
  if (config.authType === 'basic_evo') {
    if (!config.dns || typeof config.dns !== 'string') {
      throw new ExtractorUserError(
        'Falta DNS para auth basic_evo',
        'El DNS del gimnasio es requerido. Re-configura la conexión EVO.'
      );
    }

    const apiKey = decryptCredential(
      config.apiKeyEncrypted,
      'Falta apiKeyEncrypted para auth basic_evo',
      'Las credenciales EVO no son válidas. Verifica tu API Key.'
    );

    // Basic Auth: username = DNS (sin encriptar), password = API Key (desencriptada)
    axiosConfig.auth = {
      username: config.dns,
      password: apiKey
    };

    logger.debug('✅ Auth EVO configurada', {
      provider: 'evo',
      dns: config.dns,
      authType: 'basic_evo'
    });
  }

  return axiosConfig;
}

function buildAuthConfigSafe(config) {
  try {
    return buildAuthConfig(config);
  } catch (error) {
    if (error instanceof ExtractorUserError) {
      logger.error('Error de credenciales al construir auth para extractor', {
        provider: config?.provider,
        baseUrl: config?.baseUrl,
        message: error.message,
      });
      throw new ExtractorUserError(
        error.message,
        'Credenciales inválidas, re-configura la conexión',
        400
      );
    }
    throw error;
  }
}

function extractResponseItems(payload, mapping) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  if (mapping?.dataPath && Array.isArray(payload[mapping.dataPath])) {
    return payload[mapping.dataPath];
  }

  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.clients)) return payload.clients;
  if (Array.isArray(payload.prospects)) return payload.prospects;

  return [];
}

function tagMappedEvoRecord(recordType, record) {
  if (recordType === 'ventas') {
    return {
      ...record,
      _recordType: 'venta',
      externalId: record.externalId || record.ventaId || record.eventoVentaId,
      idSale: record.idSale || record.ventaId || record.eventoVentaId,
      amount: record.amount ?? record.monto,
      memberName: record.memberName || record.nombreCliente,
      saleDate: record.saleDate || record.fecha,
      paymentStatus: record.paymentStatus || record.estatus,
      branchName: record.branchName || record.sede,
      cellPhone: record.cellPhone || record.telefono,
    };
  }

  return {
    ...record,
    _recordType: 'cliente',
    externalId: record.externalId || record.uniqueId || record.clienteId || record.idMember,
    name: record.name || record.nombre,
    cellPhone: record.cellPhone || record.telefono,
    status: record.status || record.estado,
    branchName: record.branchName || record.empresa,
  };
}

async function fetchEvoEndpoint(baseUrl, mapping, requestConfig, baseParams, limiter, filialId = null, config = null) {
  // ✅ EVO límite: máximo 50 items por página
  const pageSize = Math.min(mapping.pagination?.limit || 50, 50);
  const records = [];
  let skip = 0;

  logger.info(`🔄 Iniciando importación desde EVO`, {
    endpoint: mapping.path,
    dataType: mapping.dataType,
    pageSize,
    hasFilialId: !!filialId
  });

  while (true) {
    try {
      // Esperar si es necesario (pero NO incrementar contador aún)
      await limiter.wait();

      // Construir URL completa
      const fullUrl = `${baseUrl}${mapping.path}`;

      // Parámetros para la request
      const params = {
        ...baseParams,
        take: pageSize,
        skip,
      };

      // Agregar id-filial si está configurado
      if (filialId) {
        params['id-filial'] = filialId;
      }

      // 📝 LOG: URL y auth antes del request
      const authTypeForLog = requestConfig.auth ? 'basic' : (requestConfig.headers?.Authorization ? 'bearer' : 'cookie');
      logger.info(`📤 Request hacia EVO`, {
        url: fullUrl,
        endpoint: mapping.path,
        authType: authTypeForLog,
        page: skip / pageSize,
        skip,
        take: pageSize,
        hasFilialFilter: !!filialId
      });

      // Hacer request
      let response;
      let retryCount = 0;
      const MAX_RETRIES = 3;

      while (retryCount <= MAX_RETRIES) {
        try {
          response = await axios.get(fullUrl, {
            ...requestConfig,
            params,
            timeout: 300000, // 5min — EVO puede tardar hasta 3min en hora pico (confirmado por soporte)
            maxContentLength: 50 * 1024 * 1024, // 50MB max
            maxBodyLength: 50 * 1024 * 1024,
            decompress: true,
          });
          break; // éxito — salir del loop de retry
        } catch (retryErr) {
          const isAborted = retryErr.code === 'ERR_BAD_RESPONSE'
            || retryErr.code === 'ECONNRESET'
            || retryErr.message?.includes('stream has been aborted')
            || retryErr.message?.includes('socket hang up');

          if (isAborted && retryCount < MAX_RETRIES) {
            retryCount++;
            const waitMs = retryCount * 2000; // 2s, 4s, 6s
            logger.warn(`⚠️ EVO cortó la conexión. Reintentando (${retryCount}/${MAX_RETRIES}) en ${waitMs}ms`, {
              endpoint: mapping.path, code: retryErr.code
            });
            await new Promise(resolve => setTimeout(resolve, waitMs));
            continue;
          }
          throw retryErr; // no es retriable o se agotaron intentos
        }
      }

      // ✅ Request exitoso (2xx) — incrementar contador de rate limit
      await limiter.confirmRequest();

      // Detectar bloqueo diario de EVO (header bloqueiodiario: true)
      if (response.headers['bloqueiodiario'] === 'true') {
        throw new ExtractorUserError(
          'DAILY_LIMIT_EXCEEDED',
          'Límite diario EVO alcanzado (bloqueiodiario). El contador se resetea a medianoche hora São Paulo.',
          429
        );
      }

      limiter.updateFromResponse(response.headers);

      // Extraer items de la respuesta
      const rawItems = extractResponseItems(response.data, mapping);

      // Si la respuesta está vacía en la primera página, loggearlo como info
      if (skip === 0 && (!Array.isArray(rawItems) || rawItems.length === 0)) {
        logger.info(`⚠️ EVO devolvió 0 registros en endpoint`, {
          endpoint: mapping.path,
          dataType: mapping.dataType,
          message: 'Verificar que credenciales y permisos sean correctos'
        });
      }

      // Aplicar mapeo y validación
      const { valid, skipped } = applyEvoMapping(mapping, rawItems);
      records.push(...valid.map(item => tagMappedEvoRecord(mapping.dataType, item)));

      if (skipped.length > 0) {
        logger.debug(`⏭️ Registros omitidos en EVO`, {
          endpoint: mapping.path,
          count: skipped.length,
          reasons: skipped.slice(0, 3)
        });
      }

      // Detectar fin de paginación
      if (!Array.isArray(rawItems) || rawItems.length < pageSize) {
        logger.info(`✅ Paginación completada`, {
          endpoint: mapping.path,
          totalRecords: records.length,
          lastPageSize: rawItems?.length || 0,
          expectedPageSize: pageSize
        });
        break;
      }

      skip += pageSize;

    } catch (error) {
      // ❌ Request falló: no se incrementa rate limit (solo se incrementa en confirmRequest con 2xx)

      // Manejar errores específicos
      if (error.response?.status === 401) {
        if (error?.response?.headers?.['bloqueiodiario'] === 'true') {
          throw new ExtractorUserError(
            'DAILY_LIMIT_EXCEEDED',
            'Límite diario EVO alcanzado. Espera hasta las 21:00 hora Chile o crea un nuevo token en EVO.',
            429
          );
        }

        logger.error(`🔐 [401] Credenciales EVO inválidas`, {
          endpoint: mapping.path,
          dns: config?.dns,
          message: 'Verifica tu DNS y API Key en EVO'
        });
        throw new ExtractorUserError(
          `Credenciales EVO inválidas para endpoint ${mapping.path}`,
          'Credenciales incorrectas. Verifica tu DNS y API Key en la configuración de la conexión EVO.',
          401
        );
      }

      if (error.response?.status === 403) {
        logger.error(`🚫 [403] Sin permisos en EVO`, {
          endpoint: mapping.path,
          message: 'La API Key no tiene permisos para este endpoint'
        });
        throw new ExtractorUserError(
          `Sin permisos en endpoint ${mapping.path}`,
          'Tu API Key no tiene acceso a este tipo de datos. Verifica los permisos en EVO Settings → Integrations.',
          403
        );
      }

      if (error.response?.status === 429) {
        logger.warn(`⏱️ [429] Rate limit alcanzado en EVO`, {
          endpoint: mapping.path,
          retryAfter: error.response.headers['retry-after']
        });
        // No hacer rollback para 429 porque ya fue limitado por EVO
      }

      // Re-lanzar otros errores
      if (error instanceof ExtractorUserError) {
        throw error;
      }

      logger.error(`❌ Error al fetching EVO`, {
        endpoint: mapping.path,
        statusCode: error.response?.status,
        message: error.message,
        skip
      });

      logger.error('fetchEvoEndpoint ERROR DETALLADO', {
        endpoint: mapping?.path,
        statusCode: error?.response?.status,
        statusText: error?.response?.statusText,
        responseData: JSON.stringify(error?.response?.data || '').slice(0, 500),
        requestUrl: error?.config?.url,
        requestAuth: error?.config?.auth ? `user=${error.config.auth.username}, pass_len=${String(error.config.auth.password || '').length}` : 'sin auth',
        message: error.message,
        code: error.code,
      });

      // Detectar 401 con bloqueo diario
      if (error?.response?.status === 401 && error?.response?.headers?.['bloqueiodiario'] === 'true') {
        throw new ExtractorUserError(
          'DAILY_LIMIT_EXCEEDED', 
          'Límite diario EVO alcanzado. Espera hasta las 21:00 hora Chile o crea un nuevo token en EVO.',
          429
        );
      }

      throw new ExtractorUserError(
        `Error al importar desde EVO: ${error.message}`,
        `Error al conectar con EVO. Verifica tu conexión de internet y vuelve a intentar.`,
        error.response?.status || 500
      );
    }
  }

  logger.info(`✨ Importación completada desde ${mapping.path}`, {
    totalRecords: records.length,
    dataType: mapping.dataType
  });

  return records;
}

async function fetchFromEvoApi(config, dataset, dateRange) {
  const baseUrl = getEvoBaseUrl();
  if (!baseUrl) {
    throw new ExtractorUserError(
      'Base URL EVO no configurada',
      'La conexión EVO no tiene una URL válida. Re-configúrala.'
    );
  }

  const requestConfig = buildAuthConfigSafe(config);
  const params = buildRequestParams(dateRange);
  const limiter = new RateLimiter('EVO');
  const filialId = config.filialId || null;
  const planType = config.planType || 'plus';
  
  // Determinar delays entre endpoints según el plan
  const interRequestDelay = planType === 'plus' ? 1000 : 200; // ms

  // Función helper para obtener mappings
  const getDatasetEndpoints = (ds) => {
    const endpointMap = {
      'ventas': ['/api/v2/sales'],
      'clientes': ['/api/v1/members'],
      'ambos': ['/api/v2/sales', '/api/v1/members'],
      'prospectos': ['/api/v1/prospects'],
      'entradas': ['/api/v1/entries'],
      'membresias': ['/api/v1/membermembership'],
      'pagos': ['/api/v1/payables'],
      'todo': [
        '/api/v2/sales',
        '/api/v1/members',
        '/api/v1/prospects',
        '/api/v1/entries',
        '/api/v1/membermembership',
        '/api/v1/payables'
      ]
    };

    const paths = endpointMap[ds] || endpointMap['ambos'];
    return paths.map(p => findEvoMapping(p)).filter(Boolean);
  };

  const mappings = getDatasetEndpoints(dataset);
  if (!mappings.length) {
    throw new Error(`No hay mapeos EVO configurados para dataset: ${dataset}`);
  }

  const resultSets = [];
  for (let i = 0; i < mappings.length; i++) {
    const mapping = mappings[i];
    
    try {
      const records = await fetchEvoEndpoint(baseUrl, mapping, requestConfig, params, limiter, filialId, config);
      resultSets.push(records);

      // Agregar delay entre endpoints si hay más de uno y no es el último
      if (i < mappings.length - 1) {
        logger.debug(`⏸️ Pausa entre endpoints`, {
          delayMs: interRequestDelay,
          plan: planType,
          current: mapping.name,
          next: mappings[i + 1]?.name
        });
        await new Promise(resolve => setTimeout(resolve, interRequestDelay));
      }
    } catch (error) {
      logger.error(`Error en dataset ${dataset} - endpoint ${mapping.path}`, {
        error: error.message,
        mapping: mapping.name
      });
      throw error;
    }
  }

  return resultSets.flat();
}

function normalizeSelectiveSelections(selections = []) {
  if (!Array.isArray(selections)) return [];

  return selections
    .map((item) => {
      if (typeof item === 'string') {
        const found = EVO_SELECTIVE_TYPES.find(t => t.type === item);
        return found
          ? { type: item, targetSection: found.defaultTarget }
          : { type: item, targetSection: null };
      }

      if (!item || typeof item !== 'object') return null;

      const type = String(item.type || item.dataset || '').trim().toLowerCase();
      if (!type) return null;

      const targetRaw = String(item.targetSection || item.target || '').trim().toLowerCase();
      const found = EVO_SELECTIVE_TYPES.find(t => t.type === type);

      // Aceptar targetSection explicito O usar el defaultTarget del tipo
      const targetSection = ['clientes', 'ventas', 'overview'].includes(targetRaw)
        ? targetRaw
        : found?.defaultTarget || null;

      return { type, targetSection };
    })
    .filter(Boolean)
    .filter((item) => EVO_SELECTIVE_TYPES.some((t) => t.type === item.type));
}

async function discoverData(configId, dateRange) {
  const config = await findExtractorConfig(configId);
  if (!config) {
    throw new ExtractorUserError(
      'Configuración de conexión no encontrada',
      'Configuración de conexión no encontrada.',
      404
    );
  }

  if ((config.provider || '').toLowerCase() !== 'evo') {
    throw new ExtractorUserError(
      'discoverData solo disponible para conexiones EVO',
      'Este flujo selectivo solo está disponible para conexiones EVO.',
      400
    );
  }

  const requestConfig = buildAuthConfigSafe(config);
  const limiter       = new RateLimiter('EVO');
  const baseUrl       = getEvoBaseUrl();

  const DISCOVERY_ENDPOINTS = [
    { type: 'ventas',     label: 'Ventas',             endpoint: '/api/v2/sales',            defaultTarget: 'ventas'   },
    { type: 'clientes',   label: 'Clientes / Miembros', endpoint: '/api/v1/members',          defaultTarget: 'clientes' },
    { type: 'prospectos', label: 'Prospectos / Leads',  endpoint: '/api/v1/prospects',        defaultTarget: 'overview' },
    { type: 'membresias', label: 'Membresías',          endpoint: '/api/v1/membermembership', defaultTarget: 'overview' },
    { type: 'pagos',      label: 'Pagos / Deudas',      endpoint: '/api/v1/payables',         defaultTarget: 'overview' },
    { type: 'entradas',   label: 'Accesos / Entradas',  endpoint: '/api/v1/entries',          defaultTarget: 'overview' },
  ];

  const items = [];

  for (const ds of DISCOVERY_ENDPOINTS) {
    try {
      await limiter.wait();

      const url    = `${baseUrl}${ds.endpoint}`;
      const params = { take: 1, skip: 0 };
      if (config.filialId) params['id-filial'] = config.filialId;

      const response = await axios.get(url, {
        ...requestConfig,
        params,
        timeout: 15000,
      });

      await limiter.confirmRequest();
      limiter.updateFromResponse(response.headers);

      // EVO devuelve el total en el header X-Total-Count (confirmado con soporte EVO)
      const xTotalCount = response.headers['x-total-count']
        || response.headers['X-Total-Count']
        || null;

      const total = xTotalCount !== null
        ? Number(xTotalCount)
        : 0;

      logger.info(`discoverData: ${ds.type} → ${total} registros (X-Total-Count: ${xTotalCount})`);

      items.push({
        type:           ds.type,
        label:          ds.label,
        count:          total,
        hasPermission:  true,
        disabledReason: null,
        defaultTarget:  ds.defaultTarget,
      });

    } catch (error) {
      const status = error?.response?.status;

      if (status === 401) {
        throw new ExtractorUserError(
          'Credenciales EVO inválidas',
          'Credenciales incorrectas. Verifica tu DNS y API Key en la configuración de la conexión EVO.',
          401
        );
      }

      if (status === 403) {
        items.push({
          type:           ds.type,
          label:          ds.label,
          count:          0,
          hasPermission:  false,
          disabledReason: 'Sin permisos para este tipo de dato. Ajusta tu API Key en EVO Settings → Integrations.',
          defaultTarget:  ds.defaultTarget,
        });
        continue;
      }

      // Cualquier otro error: marcar con 0 pero no bloquear el resto
      logger.warn(`discoverData: error en ${ds.endpoint}`, {
        status,
        message: error.message,
      });

      items.push({
        type:           ds.type,
        label:          ds.label,
        count:          0,
        hasPermission:  true,
        disabledReason: `Error al consultar (${status || 'red'}): ${error.message}`,
        defaultTarget:  ds.defaultTarget,
      });
    }
  }

  // Retornar también el estado del rate limiter para el estimador de hits del wizard
  let usage = null;
  try {
    usage = await limiter.getMonthlyUsage();
  } catch (_) { /* best effort */ }

  return {
    items,
    usage,
    discoveredAt: new Date().toISOString(),
    totalRecords: items.reduce((acc, item) => acc + (Number(item.count) || 0), 0),
  };
}

async function previewImport(configId, selections = [], dateRange) {
  const normalizedSelections = normalizeSelectiveSelections(selections);
  if (!normalizedSelections.length) {
    throw new ExtractorUserError(
      'No hay selecciones para preview',
      'Selecciona al menos un tipo de dato para previsualizar.',
      400
    );
  }

  const discovery = await discoverData(configId, dateRange);
  const discoveryMap = new Map(discovery.items.map((item) => [item.type, item]));
  const limiter = new RateLimiter('EVO');
  const usage = await limiter.getMonthlyUsage();

  const selectedItems = normalizedSelections.map((selection) => {
    const discovered = discoveryMap.get(selection.type);
    const count = Number(discovered?.count) || 0;
    const estimatedRequests = count > 0 ? Math.ceil(count / 50) : 0;

    return {
      type: selection.type,
      label: discovered?.label || selection.type,
      targetSection: selection.targetSection || discovered?.defaultTarget || 'clientes',
      count,
      estimatedRequests,
      hasPermission: Boolean(discovered?.hasPermission),
      disabledReason: discovered?.disabledReason || null,
    };
  });

  const estimatedRequests = selectedItems.reduce((acc, item) => acc + item.estimatedRequests, 0);
  const dailyUsed = Number(usage.dailyUsed) || 0;
  const dailyLimit = Number(usage.dailyLimit) || 0;
  const monthlyUsed = Number(usage.monthlyUsed) || 0;
  const monthlyLimit = Number(usage.monthlyLimit);
  const hasMonthlyLimit = Number.isFinite(monthlyLimit) && monthlyLimit > 0;

  return {
    selectedItems,
    estimatedRequests,
    usage,
    willExceedDailyLimit: dailyLimit > 0 ? (dailyUsed + estimatedRequests) > dailyLimit : false,
    willExceedMonthlyLimit: hasMonthlyLimit ? (monthlyUsed + estimatedRequests) > monthlyLimit : false,
  };
}

async function runSelective(configId, selections = [], userId = null, dateRange) {
  try {
    logger.info('[runSelective] iniciando', {
      configId,
      selections,
      userId,
      dateRange
    });

    const preview = await previewImport(configId, selections, dateRange);
    if (preview.willExceedMonthlyLimit) {
      throw new ExtractorUserError(
        'MONTHLY_LIMIT_EXCEEDED',
        'Limite de requests EVO alcanzado. Plan Plus: 100/dia y 1.000/mes.',
        429
      );
    }

    if (preview.willExceedDailyLimit) {
      throw new ExtractorUserError(
        'DAILY_LIMIT_EXCEEDED',
        'Limite diario de requests EVO alcanzado. Plan Plus: 100/dia y 1.000/mes.',
        429
      );
    }

    const perType = [];
    let totalInserted = 0;
    let totalUpdated = 0;

    for (const item of preview.selectedItems) {
      if (!item.hasPermission) {
        perType.push({
          type: item.type,
          targetSection: item.targetSection,
          inserted: 0,
          updated: 0,
          skipped: 0,
          errors: 1,
          message: item.disabledReason || 'Sin permisos para este tipo de dato.',
        });
        continue;
      }

      const jobId = uuidv4();
      const result = await runImport({
        configId,
        dataset: item.type,
        strategy: 'overwrite',
        dateRange,
        jobId,
        userId,
        targetSection: item.targetSection,
      });

      totalInserted += Number(result.inserted) || 0;
      totalUpdated += Number(result.updated) || 0;
      perType.push({
        type: item.type,
        targetSection: item.targetSection,
        inserted: Number(result.inserted) || 0,
        updated: Number(result.updated) || 0,
        skipped: Number(result.skipped) || 0,
        errors: Number(result.errors) || 0,
      });
    }

    return {
      success: true,
      perType,
      totals: {
        inserted: totalInserted,
        updated: totalUpdated,
      },
    };
  } catch (err) {
    logger.error('[runSelective] ERROR COMPLETO', {
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode,
      userMessage: err.userMessage,
      code: err.code
    });
    throw err;
  }
}

// ─── Detección de conflicto ──────────────────────────────────────────────────
async function detectConflict(dataset) {
  const models = dataset === 'ambos'
    ? [Venta, Cliente]
    : dataset === 'ventas' ? [Venta] : [Cliente];

  let total = 0;
  for (const Model of models) {
    total += await Model.countDocuments({ source: 'excel' });
  }
  return { hasConflict: total > 0, excelRecordCount: total };
}

// ─── Aplicar estrategia antes de importar ───────────────────────────────────
async function applyConflictStrategy(strategy, dataset) {
  if (strategy === 'replace') {
    const models = dataset === 'ambos'
      ? [Venta, Cliente]
      : dataset === 'ventas' ? [Venta] : [Cliente];
    for (const Model of models) {
      await Model.deleteMany({ source: 'excel' });
    }
  }
  // 'overwrite', 'complement', 'cancel' se manejan en el upsert
}

function pickFirst(record, keys, fallback = null) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

function toNumber(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toBoolean(value, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'si', 'sí', 'activo', 'active'].includes(normalized)) return true;
    if (['false', '0', 'no', 'inactivo', 'inactive'].includes(normalized)) return false;
  }
  if (typeof value === 'number') return value === 1;
  return fallback;
}

function normalizeClienteRecord(rawRecord) {
  const externalId = pickFirst(rawRecord, ['externalId', 'uniqueId', 'idMember', 'memberId', 'id', 'clientId', 'clienteId']);
  const idMember = String(pickFirst(rawRecord, ['idMember', 'memberId', 'uniqueId', 'externalId', 'id', 'clientId', 'clienteId'], externalId || '')).trim();
  const uniqueId = String(pickFirst(rawRecord, ['uniqueId', 'externalId', 'idMember', 'memberId', 'id', 'clientId', 'clienteId'], externalId || idMember)).trim();
  const name = String(pickFirst(rawRecord, ['name', 'nombre', 'fullName', 'memberName', 'customerName', 'cliente', 'razonSocial'], 'Sin nombre')).trim();

  const statusRaw = pickFirst(rawRecord, ['status', 'estado']);
  const status = statusRaw ? String(statusRaw).toLowerCase() : undefined;
  const active = toBoolean(pickFirst(rawRecord, ['active']), status ? status === 'activo' : true);

  return {
    externalId: pickFirst(rawRecord, ['externalId', 'clienteId', 'uniqueId', 'idMember', 'memberId', 'id']) || uniqueId || idMember,
    uniqueId,
    idMember,
    name,
    email: pickFirst(rawRecord, ['email', 'mail', 'correo'], ''),
    cellPhone: pickFirst(rawRecord, ['cellPhone', 'phone', 'telefono', 'mobile', 'whatsapp'], ''),
    status: ['activo', 'inactivo', 'suspendido', 'prospecto'].includes(status) ? status : (active ? 'activo' : 'inactivo'),
    active,
    registrationDate: toDate(pickFirst(rawRecord, ['registrationDate', 'createdAt', 'fechaRegistro', 'signupDate'])) || new Date(),
    branchName: pickFirst(rawRecord, ['branchName', 'empresa', 'sede', 'branch', 'gymBranch'], ''),
  };
}

function normalizeVentaRecord(rawRecord) {
  const externalId = pickFirst(rawRecord, ['externalId', 'ventaId', 'eventoVentaId', 'idSale', 'saleId', 'idVenta', 'transactionId', 'id', 'code']);

  return {
    externalId: pickFirst(rawRecord, ['externalId', 'ventaId', 'eventoVentaId', 'idSale', 'saleId', 'idVenta', 'transactionId', 'id', 'code']) || undefined,
    idSale: String(pickFirst(rawRecord, ['idSale', 'saleId', 'idVenta', 'transactionId', 'ventaId', 'eventoVentaId', 'id', 'code'], externalId || uuidv4())),
    idMember: String(pickFirst(rawRecord, ['idMember', 'memberId', 'prospect_id', 'member_id', 'idMember'], '') || ''),
    memberName: pickFirst(rawRecord, ['memberName', 'nombreCliente', 'name', 'prospect_name'], ''),
    saleDate: toDate(pickFirst(rawRecord, ['saleDate', 'fecha', 'sale_date', 'date', 'createdAt', 'fechaCompra'])) || new Date(),
    amount: toNumber(pickFirst(rawRecord, ['amount', 'monto', 'value', 'totalAmount'], 0), 0),
    totalAmount: toNumber(pickFirst(rawRecord, ['totalAmount', 'monto', 'value', 'amount'], 0), 0),
    saleType: pickFirst(rawRecord, ['saleType', 'tipoVenta', 'type'], ''),
    paymentStatus: pickFirst(rawRecord, ['paymentStatus', 'estadoPago', 'statusPago', 'status', 'estatus'], 'pendiente'),
    branchName: pickFirst(rawRecord, ['branchName', 'sede', 'branch', 'gymBranch'], ''),
    cellPhone: pickFirst(rawRecord, ['cellPhone', 'phone', 'telefono', 'whatsapp'], ''),
    whatsapp: pickFirst(rawRecord, ['whatsapp', 'cellPhone', 'phone', 'telefono'], ''),
    planName: pickFirst(rawRecord, ['planName', 'plan', 'plan_name'], ''),
    employeeName: pickFirst(rawRecord, ['employeeName', 'employee', 'employee_name'], ''),
    idBranch: pickFirst(rawRecord, ['idBranch', 'branch_id'], ''),
    discount: toNumber(pickFirst(rawRecord, ['discount', 'descuento'], 0), 0),
    fechaCompra: toDate(pickFirst(rawRecord, ['fechaCompra', 'fecha', 'saleDate', 'sale_date'])),
  };
}

function normalizeRecordByModel(Model, rawRecord) {
  if (Model?.modelName === 'Venta') return normalizeVentaRecord(rawRecord);
  if (Model?.modelName === 'Cliente') return normalizeClienteRecord(rawRecord);
  return rawRecord;
}

function validateVentaRecord(record) {
  const errors = [];
  if (!record.externalId && !record.idSale) {
    errors.push('Sin identificador (externalId o idSale)');
  }
  if (!record.saleDate) {
    errors.push('Sin fecha de venta (saleDate)');
  }
  if (record.amount === undefined && record.totalAmount === undefined) {
    errors.push('Sin monto (amount/totalAmount)');
  }
  return { valid: errors.length === 0, errors };
}

function validateClienteRecord(record) {
  const errors = [];
  if (!record.externalId && !record.uniqueId && !record.idMember) {
    errors.push('Sin identificador');
  }
  if (!record.name && !record.email) {
    errors.push('Sin nombre ni email');
  }
  return { valid: errors.length === 0, errors };
}

function stripManagedTimestampFields(record) {
  if (!record || typeof record !== 'object') return record;
  const sanitized = Object.assign({}, record);
  delete sanitized.createdAt;
  delete sanitized.updatedAt;
  delete sanitized.lastUpdate;
  delete sanitized.__v;
  delete sanitized._id;
  return sanitized;
}

// ─── Upsert de un registro individual ───────────────────────────────────────
async function upsertRecord(Model, rawRecord, strategy, jobMeta) {
  const normalizedRecord = normalizeRecordByModel(Model, rawRecord);
  const persistableRecord = stripManagedTimestampFields(normalizedRecord);
  const isVentaModel = Model?.modelName === 'Venta';

  try {
    if (isVentaModel && !persistableRecord.externalId && !persistableRecord.idSale) {
      persistableRecord.idSale = uuidv4();
    }

    const filter = persistableRecord.externalId
      ? { externalId: persistableRecord.externalId }
      : persistableRecord.idSale
        ? { idSale: persistableRecord.idSale }
        : persistableRecord.uniqueId
          ? { uniqueId: persistableRecord.uniqueId }
          : { _id: persistableRecord._id };

    const dataSourceMeta = {
      type:           'api',
      connectionName: jobMeta.connectionName,
      sourceId:       normalizedRecord.externalId,
      importJobId:    jobMeta.jobId,
      importedAt:     new Date(),
    };

    // Construir el objeto de update SIN spread para evitar conflicto
    // con timestamps: true de Mongoose (updatedAt doble)
    const setPayload = Object.assign(
      {},
      persistableRecord,
      { source: 'api', dataSource: dataSourceMeta }
    );

    // Eliminar campos que Mongoose maneja solo — previene el conflicto
    delete setPayload.createdAt;
    delete setPayload.updatedAt;
    delete setPayload.lastUpdate;
    delete setPayload.__v;
    delete setPayload._id;

    const result = await Model.findOneAndUpdate(
      filter,
      { $set: setPayload },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        // timestamps: false le dice a Mongoose que NO agregue updatedAt al $set
        // en esta operación específica — evita el conflicto doble
        timestamps: false,
      }
    );

    const wasInserted = !result || result.__v === undefined
      || String(result._id) === String(result._id);

    // Determinar si fue insert o update comparando createdAt vs updatedAt
    const isNew = result?.createdAt && result?.updatedAt
      && Math.abs(result.createdAt - result.updatedAt) < 1000;

    return isNew ? 'inserted' : 'updated';
  } catch (err) {
    logger.error('upsertRecord error', {
      model:   Model?.modelName,
      message: err.message,
      code:    err.code,
      filter:  JSON.stringify(persistableRecord?.externalId || persistableRecord?.idSale),
    });
    throw err;
  }
}

// ─── Fetch de datos desde la API externa ────────────────────────────────────
async function fetchFromExternalApi(config, dateRange, dataset) {
  if ((config.provider || '').toLowerCase() === 'evo') {
    return fetchFromEvoApi(config, dataset, dateRange);
  }

  const requestConfig = buildAuthConfigSafe(config);
  const params = buildRequestParams(dateRange);

  const limiter = new RateLimiter(config.provider || 'default');
  const MAX_RETRIES = 3;
  let attempt = 0;

  while (true) {
    try {
      await limiter.wait();
      const response = await axios.get(sanitizeBaseUrl(config.baseUrl), {
        ...requestConfig,
        params,
        timeout: 30000,
      });
      limiter.updateFromResponse(response.headers);
      return response.data?.data || response.data || [];
    } catch (err) {
      if (err.message?.startsWith('MONTHLY_LIMIT_EXCEEDED')) {
        throw err;
      }

      if (err.response?.status === 429 && attempt < MAX_RETRIES) {
        attempt++;
        const retryAfterRaw =
          err.response.headers['retry-after'] ||
          err.response.headers['x-ratelimit-reset'];
        const retryAfterSec = retryAfterRaw ? parseInt(retryAfterRaw, 10) : 5;
        const waitMs = (retryAfterSec + 1) * 1000;
        logger.warn(
          `⏳ [RATE-LIMIT] ${config.provider || 'default'}: 429 recibido. Reintentando en ${retryAfterSec + 1}s... (intento ${attempt}/${MAX_RETRIES})`,
          { url: config.baseUrl, retryAfterSec, attempt }
        );
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }
      throw err;
    }
  }
}

// ─── Motor principal de importación ─────────────────────────────────────────
async function runImport({ configId, dataset, strategy, dateRange, jobId, userId = null, targetSection = null }) {
  const config = await findExtractorConfig(configId);
  if (!config) throw new Error('Configuración de conexión no encontrada');

  // Incremental sync: if no explicit dateRange provided, derive from config.lastSyncAt
  if (!dateRange) {
    const lastSync = config.lastSyncAt ? new Date(config.lastSyncAt) : null;
    if (lastSync) {
      dateRange = { from: lastSync };
      logger.info(`🔄 Sync incremental desde: ${lastSync.toISOString()}`, { configId });
    } else {
      logger.info(`🆕 Sync completo (primera vez)`, { configId });
    }
  }

  const log = await SyncLog.findOneAndUpdate(
    { jobId },
    {
      $set: { status: 'running', startedAt: new Date(), conflictStrategy: strategy, userId },
      $setOnInsert: {
        jobId,
        source: ['evo', 'w12', 'custom'].includes((config.provider || '').toLowerCase())
          ? config.provider.toLowerCase()
          : 'api',
        connectionName: config.connectionName,
        dataset,
        conflictDetected: false,
        excelRecordCount: 0,
      },
    },
    { new: true, upsert: true }
  );

  try {
    await applyConflictStrategy(strategy, dataset);

    const rawData = await fetchFromExternalApi(config, dateRange, dataset);
    log.recordsReceived = rawData.length;
    await log.save();

    const Model     = dataset === 'ventas' ? Venta : Cliente;
    const jobMeta   = { jobId, connectionName: config.connectionName };
    let inserted    = 0;
    let updated     = 0;
    let skipped     = 0;
    let skippedByValidation = 0;
    const errors    = [];

    for (const record of rawData) {
      try {
        // Si dataset es 'ambos', inferir modelo por tipo de registro
        const TargetModel = dataset === 'ambos'
          ? (record._recordType === 'cliente' ? Cliente : Venta)
          : (targetSection === 'ventas' ? Venta : targetSection === 'clientes' ? Cliente : Model);

        const normalized = normalizeRecordByModel(TargetModel, record);
        const validation = TargetModel?.modelName === 'Venta'
          ? validateVentaRecord(normalized)
          : validateClienteRecord(normalized);

        if (!validation.valid) {
          skipped++;
          skippedByValidation++;
          const normalizedExternalId = normalized?.externalId || normalized?.idSale || normalized?.idMember || null;
          errors.push({
            message: validation.errors.join('; '),
            record: { externalId: normalizedExternalId }
          });
          logger.warn('Registro descartado por validación pre-upsert', {
            jobId,
            dataset,
            model: TargetModel?.modelName,
            externalId: normalizedExternalId,
            errors: validation.errors
          });
          continue;
        }

        const result = await upsertRecord(TargetModel, normalized, strategy, jobMeta);
        if (result === 'inserted') inserted++;
        else updated++;
      } catch (err) {
        errors.push({ message: err.message, record });
        skipped++;
      }
    }

    await SyncLog.updateOne({ jobId }, {
      status:          errors.length === rawData.length ? 'failed' : 'completed',
      recordsInserted: inserted,
      recordsUpdated:  updated,
      recordsSkipped:  skipped,
      errors:          errors.slice(0, 50), // máx 50 errores guardados
      finishedAt:      new Date(),
      lastSyncAt:      new Date(),
    });

    await ExtractorConfig.updateOne({ _id: config._id }, { lastSyncAt: new Date() });

    return { inserted, updated, skipped, errors: errors.length, skippedByValidation };

  } catch (err) {
    await SyncLog.updateOne({ jobId }, {
      status:     'failed',
      errors:     [{ message: err.message }],
      finishedAt: new Date(),
    });
    throw err;
  }
}

module.exports = {
  detectConflict,
  runImport,
  discoverData,
  previewImport,
  runSelective,
};