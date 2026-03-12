/**
 * UNIVERSAL EXTRACTOR - API REST
 * Versión corregida: dataPath, auth, baseURL unificado, sin métodos duplicados
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

class UniversalExtractor {
  constructor(config) {
    this.config = config || {};
    this.extractorId = uuidv4();
    this.logs = [];

    logger.info(`🚀 UniversalExtractor inicializado`, {
      id: this.extractorId,
      baseURL: this.config.baseURL || this.config.baseUrl,
      endpoints: (this.config.endpoints || []).length
    });
  }

  /**
   * Extrae datos de un endpoint por path o nombre
   * @returns { success, data, source, duration, dataType, records }
   */
  async extract(endpoint) {
    const startTime = Date.now();
    const epConfig = this._resolveEndpoint(endpoint);

    if (!epConfig) {
      return {
        success: false,
        error: `Endpoint no encontrado: ${endpoint}`,
        data: [],
        records: 0,
        duration: 0
      };
    }

    try {
      logger.info(`▶ Iniciando extracción: ${epConfig.path}`);
      const { rawData, meta, logs } = await this._fetchAll(epConfig);

      // Aplicar dataPath
      const data = this._applyDataPath(rawData, epConfig.dataPath);

      // Aplicar filtro de fields
      const filtered = this._filterFields(data, epConfig.fields);

      const duration = Date.now() - startTime;

      logger.info(`✅ ${epConfig.path} → ${filtered.length} registros (${duration}ms)`);

      return {
        success: true,
        data: filtered,
        records: filtered.length,
        source: epConfig.path,
        dataType: epConfig.dataType || null,
        duration,
        meta,
        logs
      };

    } catch (err) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Error en ${epConfig.path}: ${err.message}`);
      return {
        success: false,
        error: err.message,
        data: [],
        records: 0,
        source: epConfig.path,
        dataType: epConfig.dataType || null,
        duration
      };
    }
  }

  // ─── PRIVATE ────────────────────────────────────────────

  _resolveEndpoint(endpoint) {
    if (!endpoint) return null;
    if (typeof endpoint === 'object') return endpoint;
    return (this.config.endpoints || []).find(
      e => e.name === endpoint || e.path === endpoint
    );
  }

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
          timeout: epConfig.timeout || 15000
        });
      } catch (err) {
        this.logs.push({
          url,
          statusCode: err.response?.status,
          errorMessage: err.message
        });
        throw err;
      }

      const pageData = resp.data;
      // Guardar raw completo para que dataPath lo procese después
      collected.push(pageData);
      count++;

      this.logs.push({
        url,
        statusCode: resp.status,
        count: Array.isArray(pageData) ? pageData.length : 1
      });

      // Paginación
      if (epConfig.pagination) {
        const p = epConfig.pagination;
        if (p.type === 'page-limit') {
          totalPages = resp.data.totalPages || resp.data.pages || 0;
          if (page >= totalPages || !resp.data) break;
          page++;
          continue;
        } else if (p.type === 'take-skip') {
          const items = this._applyDataPath(pageData, epConfig.dataPath);
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

    // Si solo hay una página, devolver el objeto directo (no array de páginas)
    const rawData = collected.length === 1 ? collected[0] : collected;

    return {
      rawData,
      meta: { count, pages: totalPages },
      logs: this.logs.slice()
    };
  }

  _createHttpClient() {
    const baseURL = this.config.baseURL || this.config.baseUrl;

    const client = axios.create({
      baseURL,
      timeout: 15000
    });

    const auth = this.config.auth || {};

    if (auth.type === 'basic') {
      client.defaults.auth = {
        username: auth.username || (auth.usernameEnv ? process.env[auth.usernameEnv] : undefined),
        password: auth.password || (auth.passwordEnv ? process.env[auth.passwordEnv] : undefined)
      };
    } else if (auth.type === 'bearer') {
      client.defaults.headers.common['Authorization'] = `Bearer ${auth.token}`;
    } else if (auth.type === 'apikey' || auth.type === 'apiKey') {
      const headerName = auth.headerName || 'X-API-Key';
      client.defaults.headers.common[headerName] = auth.key;
    } else if (auth.type === 'custom') {
      client.defaults.headers.common[auth.headerName] = auth.value;
    }

    if (this.config.headers) {
      Object.assign(client.defaults.headers.common, this.config.headers);
    }

    return client;
  }

  _applyDataPath(data, dataPath) {
    if (!dataPath || dataPath === '' || dataPath === '*') {
      return Array.isArray(data) ? data : [data];
    }

    const keys = dataPath.split('.');
    let result = data;

    for (const key of keys) {
      if (result == null) return [];
      result = result[key];
    }

    if (Array.isArray(result)) return result;
    if (result != null) return [result];
    return [];
  }

  _filterFields(data, fields) {
    if (!fields || fields === '*' || fields.length === 0) return data;

    const fieldList = Array.isArray(fields)
      ? fields
      : fields.split(',').map(f => f.trim());

    return data.map(item => {
      if (typeof item !== 'object' || item === null) return item;
      const mapped = {};
      fieldList.forEach(f => {
        mapped[f] = this._getNestedValue(item, f);
      });
      return mapped;
    });
  }

  _getNestedValue(obj, path) {
    if (!obj || !path) return null;
    return path.split('.').reduce((cur, prop) => cur?.[prop], obj);
  }

  _countRecords(data) {
    if (Array.isArray(data)) return data.length;
    if (typeof data === 'object' && data !== null) return 1;
    return 0;
  }
}

module.exports = UniversalExtractor;
