/**
 * UNIVERSAL EXTRACTOR - MONGODB + REST APIs
 * Extrae datos de:
 * - MongoDB (colecciones)
 * - APIs REST (con múltiples estrategias de fallback)
 * 
 * Coherente con stack Node.js/JavaScript puro
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const DatabaseConnector = require('./DatabaseConnector');
const { logger } = require('../utils/logger');

class UniversalExtractor {
  constructor(config) {
    this.config = config;
    this.extractorId = uuidv4();
    this.cache = new Map();
    this.failureLog = [];
    
    logger.info(`🚀 UniversalExtractor initialized`, { 
      id: this.extractorId,
      type: config.type,
      source: config.id 
    });
  }

  /**
   * ⭐ MAIN: Extrae datos de cualquier fuente
   * @param {String} endpoint - Nombre del endpoint o tabla
   * @returns {Promise<Object>} { success, data, source, duration, attempts }
   */
  async extract(endpoint) {
    logger.info('──────────────────────────────────────────────────────────────────────────────');
    logger.info(`🔍 EXTRAYENDO: ${endpoint}`, { source: this.config.id, type: this.config.type });
    logger.info('──────────────────────────────────────────────────────────────────────────────');

    const startTime = Date.now();
    const result = {
      extractorId: this.extractorId,
      endpoint,
      success: false,
      data: null,
      source: null,
      duration: 0,
      attempts: [],
      attemptNumber: 0
    };

    // Construir estrategias según tipo de fuente
    const strategies = this.buildStrategies(endpoint);

    if (strategies.length === 0) {
      return this.buildFailureReport(result, 'No se encontraron estrategias para este endpoint');
    }

    // Intentar cada estrategia
    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i];
      const attemptNum = i + 1;

      try {
        logger.info(`Intento ${attemptNum}/${strategies.length}: ${strategy.name}`, {
          extractorId: this.extractorId,
          endpoint
        });

        // Ejecutar estrategia con timeout
        const data = await Promise.race([
          strategy.execute(),
          this._createTimeoutPromise(strategy.timeout || 10000)
        ]);

        // ✅ ÉXITO
        result.success = true;
        result.data = data;
        result.source = strategy.name;
        result.duration = Date.now() - startTime;
        result.attemptNumber = attemptNum;

        // Cachear para fallback futuro
        this._cacheData(endpoint, data);

        logger.info(`✅ ÉXITO en ${result.duration}ms`, { extractorId: this.extractorId, endpoint, strategy: strategy.name, duration: result.duration });
        logger.info(`📦 Registros extraídos: ${this._countRecords(data)}`);

        return result;

      } catch (error) {
        // ❌ FALLÓ - describe el error
        const errorDesc = this.describeError(error, strategy);

        result.attempts.push({
          strategy: strategy.name,
          error: errorDesc,
          code: error.code || error.status,
          message: error.message
        });

        logger.warn(`Intento ${attemptNum} falló: ${errorDesc}`, { extractorId: this.extractorId, endpoint, strategy: strategy.name });

        // Si hay más estrategias, continúa
        if (i < strategies.length - 1) {
          continue;
        }
      }
    }

    // TODO FALLÓ - retorna reporte detallado
    return this.buildFailureReport(result, endpoint);
  }

  /**
   * Construye estrategias según tipo de fuente
   */
  buildStrategies(endpoint) {
    const strategies = [];

    if (this.config.type === 'database') {
      // Estrategias para MongoDB
      strategies.push(
        {
          name: `MongoDB Direct Query`,
          timeout: 10000,
          execute: () => this._extractFromMongoDB(endpoint)
        },
        {
          name: `Cache local (últimas 24h)`,
          timeout: 100,
          execute: () => this._extractFromCache(endpoint)
        }
      );

    } else if (this.config.type === 'rest') {
      // Estrategias para APIs REST
      strategies.push(
        {
          name: `Direct HTTP Request`,
          timeout: 5000,
          execute: () => this._directRequest(endpoint)
        },
        {
          name: `GraphQL Query (si disponible)`,
          timeout: 8000,
          execute: () => this._graphqlQuery(endpoint)
        },
        {
          name: `JSON Path Extraction`,
          timeout: 6000,
          execute: () => this._jsonPathExtraction(endpoint)
        },
        {
          name: `Recursive Data Mining`,
          timeout: 7000,
          execute: () => this._recursiveExtraction(endpoint)
        },
        {
          name: `HTML Parsing`,
          timeout: 8000,
          execute: () => this._htmlScrapling(endpoint)
        },
        {
          name: `Cache local (últimas 24h)`,
          timeout: 100,
          execute: () => this._extractFromCache(endpoint)
        }
      );

    } else if (this.config.type === 'hybrid') {
      // Combina estrategias de MongoDB y REST
      strategies.push(
        {
          name: `MongoDB Principal`,
          timeout: 10000,
          execute: () => this._extractFromMongoDB(endpoint, this.config.database)
        },
        {
          name: `API Fallback`,
          timeout: 5000,
          execute: () => this._directRequest(endpoint)
        },
        {
          name: `Cache local`,
          timeout: 100,
          execute: () => this._extractFromCache(endpoint)
        }
      );
    }

    return strategies;
  }

  /**
   * Estrategia: Extrae de MongoDB
   */
  async _extractFromMongoDB(endpoint, dbConfig = null) {
    const config = dbConfig || this.config.source;
    const endpointConfig = this.config.endpoints?.find(e => e.path === endpoint);

    if (!endpointConfig) {
      throw new Error(`Endpoint "${endpoint}" no configurado`);
    }

    const connector = new DatabaseConnector(config);

    try {
      await connector.connect();

      const data = await connector.extract(
        endpointConfig.table || endpoint,
        {
          filter: endpointConfig.where ? connector.buildMongoFilter(endpointConfig.where) : {},
          projection: endpointConfig.columns || '*',
          limit: endpointConfig.limit || 1000,
          skip: endpointConfig.offset || 0,
          sort: endpointConfig.sort ? connector.buildMongoSort(endpointConfig.sort) : null
        }
      );

      // Extrae solo los campos solicitados
      return this._filterFields(data, endpointConfig.fields);

    } finally {
      await connector.disconnect();
    }
  }

  /**
   * Estrategia: Request HTTP Directo
   */
  async _directRequest(endpoint) {
    const endpointConfig = this.config.endpoints?.find(e => e.path === endpoint);

    if (!endpointConfig) {
      throw new Error(`Endpoint "${endpoint}" no configurado`);
    }

    const client = this._createHttpClient();

    const response = await client.request({
      method: endpointConfig.method || 'GET',
      url: endpointConfig.path || endpoint,
      params: endpointConfig.params,
      timeout: 5000
    });

    return this._extractData(response.data, endpointConfig);
  }

  /**
   * Estrategia: GraphQL
   */
  async _graphqlQuery(endpoint) {
    const endpointConfig = this.config.endpoints?.find(e => e.path === endpoint);

    if (!endpointConfig?.graphql) {
      throw new Error(`GraphQL no configurado para ${endpoint}`);
    }

    const client = this._createHttpClient();

    const response = await client.post('/graphql', {
      query: endpointConfig.graphql.query || this._buildGraphQLQuery(endpoint),
      variables: endpointConfig.graphql.variables
    });

    if (response.data.errors) {
      throw new Error(`GraphQL Error: ${response.data.errors[0]?.message}`);
    }

    return this._extractData(response.data.data, endpointConfig);
  }

  /**
   * Estrategia: JSON Path Extraction
   */
  async _jsonPathExtraction(endpoint) {
    const client = this._createHttpClient();
    const endpointConfig = this.config.endpoints?.find(e => e.path === endpoint);

    const response = await client.get(endpointConfig?.path || endpoint);
    const data = response.data;

    // Rutas comunes donde pueden estar los datos
    const commonPaths = [
      endpointConfig?.dataPath,
      'data',
      'items',
      'results',
      'records',
      'rows',
      endpoint.split('/').pop()
    ].filter(Boolean);

    for (const path of commonPaths) {
      const extracted = this._getNestedValue(data, path);
      if (extracted && Array.isArray(extracted) && extracted.length > 0) {
        return this._filterFields(extracted, endpointConfig?.fields);
      }
    }

    throw new Error(`No se encontró datos en rutas: ${commonPaths.join(', ')}`);
  }

  /**
   * Estrategia: Recursive Data Mining
   */
  async _recursiveExtraction(endpoint) {
    const client = this._createHttpClient();
    const endpointConfig = this.config.endpoints?.find(e => e.path === endpoint);

    const response = await client.get(endpointConfig?.path || endpoint);

    const foundArray = this._findFirstArray(response.data);

    if (!foundArray || foundArray.length === 0) {
      throw new Error('No se encontraron arrays en la respuesta');
    }

    return this._filterFields(foundArray, endpointConfig?.fields);
  }

  /**
   * Estrategia: HTML Scraping
   */
  async _htmlScrapling(endpoint) {
    const client = this._createHttpClient();
    const endpointConfig = this.config.endpoints?.find(e => e.path === endpoint);

    const response = await client.get(endpointConfig?.path || endpoint);

    if (typeof response.data !== 'string' || !response.data.includes('<')) {
      throw new Error('Respuesta no es HTML válido');
    }

    // Busca <script> tags con JSON
    const jsonMatch = response.data.match(/<script[^>]*>({[\s\S]*?})<\/script>/);

    if (!jsonMatch) {
      throw new Error('No se encontró JSON embebido en HTML');
    }

    const json = JSON.parse(jsonMatch[1]);
    return this._filterFields(json, endpointConfig?.fields);
  }

  /**
   * Estrategia: Cache Local
   */
  async _extractFromCache(endpoint) {
    const cached = this.cache.get(endpoint);

    if (!cached) {
      throw new Error('No hay datos en cache');
    }

    const ageHours = (Date.now() - cached.timestamp) / (1000 * 60 * 60);
    const maxAge = 24; // 24 horas

    if (ageHours > maxAge) {
      this.cache.delete(endpoint);
      throw new Error(`Cache expiró hace ${Math.round(ageHours)} horas`);
    }

    logger.info(`📦 Usando cache (${ageHours.toFixed(1)} horas antiguo)`);
    return cached.data;
  }

  /**
   * ⭐ Describe errores en español claro
   */
  describeError(error, strategy) {
    const message = error.message;
    const code = error.code || error.response?.status;

    // Timeouts
    if (message.includes('timeout') || message === 'ECONNABORTED') {
      return `⏱️ Timeout: La fuente tardó demasiado (>${strategy.timeout}ms)`;
    }

    // Conexión rechazada
    if (message.includes('ECONNREFUSED')) {
      return `🌐 Conexión rechazada: ¿Fuente accesible en ${this.config.baseURL || this.config.host}?`;
    }

    // DNS no resolvió
    if (message.includes('ENOTFOUND')) {
      return `🌐 DNS no resolvió: ¿Dominio existe?`;
    }

    // MongoDB/Conexión errors
    if (message.includes('ECONNREFUSED')) {
      return `🔴 Conexión rechazada: ¿MongoDB está corriendo?`;
    }

    if (message.includes('ECONNRESET') || message.includes('EHOSTUNREACH')) {
      return `🌐 Host no accesible: Verifica URL de MongoDB`;
    }

    if (message.includes('authentication failed') || message.includes('Authentication failed')) {
      return `🔐 Autenticación fallida: User/Password inválidos en MongoDB`;
    }

    if (message.includes('no reachable servers') || message.includes('connect ECONNREFUSED')) {
      return `❌ Servidor MongoDB no disponible`;
    }

    if (message.includes('Cannot find module') || message.includes('EPERM')) {
      return `📁 Error de permisos o archivo no encontrado`;
    }

    // HTTP errors
    if (code === 401) {
      return `🔐 401 Unauthorized: Credenciales inválidas o expiradas`;
    }

    if (code === 403) {
      return `🚫 403 Forbidden: Credenciales OK pero sin permisos`;
    }

    if (code === 404) {
      return `❓ 404 Not Found: El endpoint no existe`;
    }

    if (code === 429) {
      return `⚡ 429 Rate Limited: Demasiadas requests`;
    }

    if (code >= 500) {
      return `🔥 ${code}: Fuente caída o en mantenimiento`;
    }

    // JSON parsing
    if (message.includes('JSON')) {
      return `📄 JSON inválido: Respuesta en otro formato`;
    }

    // MongoDB
    if (message.includes('MongoDB')) {
      return `🍃 MongoDB error: ${message}`;
    }

    return `❌ Error desconocido: ${message}`;
  }

  /**
   * Genera reporte detallado cuando TODO falla
   */
  buildFailureReport(result, endpoint) {
    logger.error(`❌ Todas las estrategias fallaron`, {
      extractorId: this.extractorId,
      endpoint,
      attempts: result.attempts.length
    });

    logger.info('──────────────────────────────────────────────────────────────────────────────');
    console.log(`❌ REPORTE DE FALLOS - ${endpoint.toUpperCase()}\n`);

    result.attempts.forEach((attempt, idx) => {
      console.log(`${idx + 1}. ${attempt.strategy}`);
      console.log(`   ${attempt.error}`);
      if (attempt.message) {
        console.log(`   💬 ${attempt.message}`);
      }
      console.log('');
    });

    console.log(`Duración total: ${result.duration}ms`);
    console.log(`Próximo intento: ${new Date(Date.now() + 30 * 60 * 1000).toLocaleTimeString()}`);
    console.log('═'.repeat(75) + '\n');

    result.success = false;
    result.error = `No se pudo extraer datos de "${endpoint}" desde ${this.config.id}`;

    return result;
  }

  // ─────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────

  _createHttpClient() {
    const client = axios.create({
      baseURL: this.config.baseURL,
      timeout: 10000
    });

    // Applicar autenticación según tipo
    const auth = this.config.auth || {};

    if (auth.type === 'basic') {
      client.defaults.auth = {
        username: auth.username,
        password: auth.password
      };
    } else if (auth.type === 'bearer') {
      client.defaults.headers.common['Authorization'] = `Bearer ${auth.token}`;
    } else if (auth.type === 'apikey') {
      client.defaults.headers.common[auth.headerName] = auth.key;
    } else if (auth.type === 'custom') {
      client.defaults.headers.common[auth.headerName] = auth.value;
    }

    return client;
  }

  _extractData(rawData, config) {
    const array = Array.isArray(rawData) ? rawData : [rawData];
    return this._filterFields(array, config?.fields);
  }

  _filterFields(data, fields) {
    if (!fields || fields === '*' || fields.length === 0) {
      return data;
    }

    const isArray = Array.isArray(data);
    const arrayData = isArray ? data : [data];

    const filtered = arrayData.map(item => {
      if (typeof item !== 'object') return item;

      const mapped = {};
      (Array.isArray(fields) ? fields : fields.split(',')).forEach(field => {
        const trimmed = field.trim();
        mapped[trimmed] = this._getNestedValue(item, trimmed);
      });
      return mapped;
    });

    return isArray ? filtered : filtered[0];
  }

  _getNestedValue(obj, path) {
    if (!obj || !path) return null;
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  _findFirstArray(obj, depth = 0) {
    if (depth > 5) return null;
    if (Array.isArray(obj)) return obj;
    if (typeof obj !== 'object' || obj === null) return null;

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const result = this._findFirstArray(obj[key], depth + 1);
        if (result) return result;
      }
    }

    return null;
  }

  _cacheData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  _buildGraphQLQuery(entity) {
    // Query genérico si no está definido
    return `query { ${entity} { id created_at updated_at } }`;
  }

  _createTimeoutPromise(ms) {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), ms)
    );
  }

  _countRecords(data) {
    if (Array.isArray(data)) return data.length;
    if (typeof data === 'object' && data !== null) return 1;
    return 0;
  }
}

module.exports = UniversalExtractor;
