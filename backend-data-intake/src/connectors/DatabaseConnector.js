/**
 * DATABASE CONNECTOR - MONGODB
 * Conexión y extracción de datos desde MongoDB
 * Interfaz unificada para consultas y upserts
 */

const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

class DatabaseConnector {
  constructor(config) {
    this.config = config;
    this.connection = null;
    this.connected = false;
  }

  /**
   * Inicializa conexión a MongoDB
   */
  async connect() {
    try {
      logger.info(`🔌 Conectando a MongoDB...`, { host: this.config.host });
      await this._connectMongoDB();
      this.connected = true;
      logger.info(`✅ Conectado a MongoDB`);
      return true;

    } catch (error) {
      logger.error(`❌ Error conectando a MongoDB:`, error);
      this.connected = false;
      throw error;
    }
  }

  /**
   * MongoDB Connection
   */
  async _connectMongoDB() {
    try {
      const mongoURI = `mongodb://${this.config.user}:${this.config.password}@${this.config.host}:${
        this.config.port || 27017
      }/${this.config.database}`;

      await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        connectTimeoutMS: this.config.timeout || 10000
      });

      this.connection = mongoose.connection;
    } catch (error) {
      throw new Error(`MongoDB Connection Failed: ${error.message}`);
    }
  }



  /**
   * ⭐ MAIN: Extrae datos con retry automático
   */
  async extract(table, options = {}) {
    const {
      columns = '*',
      where = null,
      limit = 1000,
      offset = 0,
      sort = null,
      retries = 3
    } = options;

    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        logger.info(`[${attempt}/${retries}] Extrayendo "${table}" desde ${this.type}`);

        let data;

        data = await this._extractMongoDB(table, { columns, where, limit, offset, sort });

        logger.info(`✅ Extracción exitosa: ${Array.isArray(data) ? data.length : 1} registros`);
        return data;

      } catch (error) {
        lastError = error;
        logger.warn(`⚠️ Intento ${attempt} falló: ${error.message}`);

        // Exponential backoff
        if (attempt < retries) {
          const delayMs = Math.pow(2, attempt) * 1000;
          logger.info(`⏳ Esperando ${delayMs}ms antes de reintentar...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    throw lastError;
  }

  /**
   * MongoDB Extract
   */
  async _extractMongoDB(collection, options) {
    const { columns, where, limit, offset, sort } = options;

    try {
      let query = this.connection.collection(collection);

      // Filtro
      let filter = where ? this._buildMongoFilter(where) : {};

      // Proyección
      let projection = columns === '*' ? {} : this._buildMongoProjection(columns);

      // Query
      let cursor = query.find(filter);

      if (Object.keys(projection).length > 0) {
        cursor = cursor.project(projection);
      }

      // Sort
      if (sort) {
        cursor = cursor.sort(sort);
      }

      // Paginación
      if (offset) cursor = cursor.skip(offset);
      cursor = cursor.limit(limit);

      const data = await cursor.toArray();
      return data;

    } catch (error) {
      throw new Error(`MongoDB Query Error: ${error.message}`);
    }
  }



  /**
   * Upsert (Insert or Update)
   */
  async upsert(table, data, uniqueKey) {
    try {
      logger.info(`💾 Upserting data en "${table}"`);

      return await this._upsertMongoDB(table, data, uniqueKey);

    } catch (error) {
      logger.error(`❌ Upsert failed:`, error);
      throw error;
    }
  }

  /**
   * MongoDB Upsert
   */
  async _upsertMongoDB(collection, data, uniqueKey) {
    const collection_ref = this.connection.collection(collection);
    
    const operations = Array.isArray(data) ? data : [data];
    
    const bulkOps = operations.map(doc => ({
      updateOne: {
        filter: { [uniqueKey]: doc[uniqueKey] },
        update: { $set: doc },
        upsert: true
      }
    }));

    const result = await collection_ref.bulkWrite(bulkOps);
    
    return {
      inserted: result.upsertedCount,
      updated: result.modifiedCount
    };
  }

  /**
   * Health Check
   */
  async healthCheck() {
    try {
      await this.connection.db.admin().ping();
      return { healthy: true };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  /**
   * Desconectar de MongoDB
   */
  async disconnect() {
    try {
      await mongoose.disconnect();
      this.connected = false;
      logger.info(`🔌 Desconectado de MongoDB`);
    } catch (error) {
      logger.error(`Error desconectando:`, error);
    }
  }

  // ─────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────

  _buildMongoFilter(where) {
    // where: { field: 'status', operator: '=', value: 'active' }
    if (!where) return {};
    
    const filter = {};
    const operators = {
      '=': '$eq',
      '!=': '$ne',
      '>': '$gt',
      '>=': '$gte',
      '<': '$lt',
      '<=': '$lte',
      'in': '$in',
      'nin': '$nin'
    };

    const op = operators[where.operator] || '$eq';
    filter[where.field] = { [op]: where.value };
    
    return filter;
  }

  _buildMongoProjection(columns) {
    const projection = {};
    columns.split(',').forEach(col => {
      projection[col.trim()] = 1;
    });
    return projection;
  }

}


module.exports = DatabaseConnector;
