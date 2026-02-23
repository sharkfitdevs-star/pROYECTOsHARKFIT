/**
 * GENERIC API CLIENT
 *
 * Transforma un `config` sencillo en un cliente que puede recorrer uno o
 * varios endpoints HTTP y regresar todos los registros, manejando paginación
 * automática y generando un informe de logs.
 *
 * Config esperado:
 * {
 *   baseUrl: 'https://api.foo.com',
 *   endpoints: [
 *     { name: 'members', path: '/v1/members', method: 'GET', headers:{}, params:{}, pagination: { type:'page-limit', pageParam:'page', limitParam:'limit', limit:100 } },
 *     // o { path:'/v2/items', pagination:{type:'cursor', cursorParam:'cursor', nextField:'nextCursor'} }
 *   ]
 * }
 *
 * Retorna
 *   { data: [...], meta:{count,pages}, logs:[{url,statusCode,bodyPreview,count,errorMessage}], sourceInfo }
 *
 * Ejemplo de uso:
 *   const extractor = new UniversalExtractor({ baseUrl:'https://api.example.com', endpoints:[{path:'/members',pagination:{type:'page-limit',limit:50}}] });
 *   const res = await extractor.extract({path:'/members'});
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

class UniversalExtractor {
  constructor(config) {
    this.config = config || {};
    this.extractorId = uuidv4();
    this.logs = [];
logger.info(`🚀 API Extractor initialized`, {
      id: this.extractorId,
      baseUrl: this.config.baseUrl
    });
  }

  /**
   * ⭐ MAIN: Extrae datos de cualquier fuente
   * @param {String} endpoint - Nombre del endpoint o tabla
   * @returns {Promise<Object>} { success, data, source, duration, attempts }
   */
  /**
   * Extrae datos de un endpoint API.
   * `endpoint` puede ser un objeto de configuración o una cadena que
   * coincide con `config.endpoints[].name` o `path`.
   */
  async extract(endpoint) {
    const epConfig = this._resolveEndpoint(endpoint);
    if (!epConfig) {
      throw new Error('Endpoint no encontrado: ' + endpoint);
    }

    const { data, meta, logs, sourceInfo } = await this._fetchAll(epConfig);
    return { data, meta, logs, sourceInfo };
  }

  /**
   * Construye estrategias según tipo de fuente
   */
  // ya no utiliza buildStrategies

  // removed old DB and other private methods - rewritten below

  /**
   * Buscar configuración de endpoint por objeto o clave
   */
  _resolveEndpoint(endpoint) {
    if (!endpoint) return null;
    if (typeof endpoint === 'object') return endpoint;
    return (this.config.endpoints || []).find(
      e => e.name === endpoint || e.path === endpoint
    );
  }

  /**
   * Core: recorrer paginación y juntar resultados
   */
  async _fetchAll(epConfig) {
    const client = this._createHttpClient();
    let collected = [];
    let page = 1;
    let cursor = null;
    let totalPages = 0;
    let count = 0;

    while (true) {
      const params = Object.assign({}, epConfig.params);
      if (epConfig.pagination) {
        const p = epConfig.pagination;
        if (p.type === 'page-limit') {
          params[p.pageParam || 'page'] = page;
          params[p.limitParam || 'limit'] = p.limit || 100;
        } else if (p.type === 'take-skip') {
          params[p.takeParam || 'take'] = p.limit || 100;
          params[p.skipParam || 'skip'] = (page - 1) * (p.limit || 100);
        } else if (p.type === 'cursor' && cursor) {
          params[p.cursorParam || 'cursor'] = cursor;
        }
      }

      const url = epConfig.path;
      let resp;
      try {
        resp = await client.request({
          method: epConfig.method || 'GET',
          url,
          headers: epConfig.headers,
          params,
          timeout: epConfig.timeout || 10000
        });
      } catch (err) {
        const errInfo = {
          url,
          statusCode: err.response?.status,
          bodyPreview: err.response?.data,
          errorMessage: err.message
        };
        this.logs.push(errInfo);
        throw err;
      }

      const pageData = resp.data;
      const items = Array.isArray(pageData) ? pageData : pageData.items || [];
      collected.push(...items);
      count += items.length;
      this.logs.push({ url, statusCode: resp.status, bodyPreview: items.slice(0,3), count: items.length });

      // handle pagination
      if (epConfig.pagination) {
        const p = epConfig.pagination;
        if (p.type === 'page-limit') {
          totalPages = resp.data.totalPages || resp.data.pages || 0;
          if (page >= totalPages || items.length === 0) break;
          page++;
          continue;
        } else if (p.type === 'take-skip') {
          if (items.length < (p.limit || 100)) break;
          page++;
          continue;
        } else if (p.type === 'cursor') {
          cursor = resp.data[p.nextField || 'nextCursor'];
          if (!cursor) break;
          continue;
        }
      }
      break;
    }

    return {
      data: collected,
      meta: { count, pages: totalPages },
      logs: this.logs.slice(),
      sourceInfo: { baseUrl: this.config.baseUrl, endpoint: epConfig.path }
    };
  }

  /**
   * Crea cliente HTTP con auth y headers del config
   */
  _createHttpClient() {
    const client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 10000
    });
    if (this.config.headers) {
      client.defaults.headers.common = Object.assign({}, client.defaults.headers.common, this.config.headers);
    }
    return client;
  }

  /**
   * filtrar campos de un conjunto si se solicita
   * (la versión completa está más abajo, esta es la definición antigua
   * que se eliminó para evitar duplicados y errores de sintaxis)
   */
  // (el método real se encuentra más adelante, después de helpers)

  /**
   * Genera reporte detallado cuando TODO falla
   */ 

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
