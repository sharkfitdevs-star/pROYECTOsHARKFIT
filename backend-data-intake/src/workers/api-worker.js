/**
 * 🔧 API WORKER - Procesa llamadas a APIs externas con Retry
 * 
 * Características:
 * ✅ Retry automático con backoff exponencial
 * ✅ Circuit breaker para APIs fallidas
 * ✅ Timeout configurable por API
 * ✅ Logging completo de intentos
 * ✅ Soporte para rate limiting
 */

const axios = require('axios');
const { logger } = require('../utils/logger');
const { RateLimiter } = require('../services/RateLimiter');

// ============================================================================
// CONFIGURACIÓN DE COLAS
// ============================================================================

// Delegate queue implementation to `queueInterface` (InMemory / Agenda)
const { getQueue, InMemoryQueue } = require('./queueInterface');

const apiQueue = getQueue('api-calls');
const webhookQueue = getQueue('webhooks');
const syncQueue = getQueue('sync-tasks');
const importQueue = getQueue('imports');

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

class CircuitBreaker {
  constructor(name, failureThreshold = 5, resetTimeout = 60000) {
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.failures = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }

  call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttempt) {
        this.state = 'HALF_OPEN';
        logger.warn(`⚠️  Circuit Breaker ${this.name}: Intentando recuperación`);
      } else {
        throw new Error(`🔴 Circuit Breaker ${this.name}: Abierto (${this.resetTimeout}ms)`);
      }
    }

    try {
      const result = fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
        logger.info(`🟢 Circuit Breaker ${this.name}: Cerrado (recuperado)`);
      }
      return result;
    } catch (error) {
      this.failures++;
      logger.error(`⚠️  Circuit Breaker ${this.name}: Fallo ${this.failures}/${this.failureThreshold}`);
      
      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
        this.nextAttempt = Date.now() + this.resetTimeout;
        logger.error(`🔴 Circuit Breaker ${this.name}: Abierto por ${this.resetTimeout}ms`);
      }
      throw error;
    }
  }
}

const circuitBreakers = new Map();

function getCircuitBreaker(apiName) {
  if (!circuitBreakers.has(apiName)) {
    circuitBreakers.set(apiName, new CircuitBreaker(apiName));
  }
  return circuitBreakers.get(apiName);
}

// ============================================================================
// PROCESADOR DE API CALLS
// ============================================================================

async function processApiCall(job) {
  const { apiName, method, url, data, auth, timeout = 15000, retryCount = 0, maxRetries = 3 } = job.data;

  logger.info(`📤 [API-WORKER] Procesando: ${apiName} ${method} ${url}`, {
    jobId: job.id,
    intento: retryCount + 1,
    maxRetries
  });

  try {
    // 1. Verificar Circuit Breaker
    const breaker = getCircuitBreaker(apiName);
    
    return await breaker.call(async () => {
      // 2. Aplicar Rate Limiting
      const rateLimiter = new RateLimiter(apiName);
      await rateLimiter.wait();

      // 3. Hacer request
      const response = await axios({
        method,
        url,
        data,
        auth,
        timeout,
        headers: {
          'User-Agent': 'SharkfitWorker/1.0',
          'X-Request-ID': job.id
        }
      });

      logger.info(`✅ [API-WORKER] Éxito: ${apiName}`, {
        jobId: job.id,
        status: response.status,
        dataSize: JSON.stringify(response.data).length
      });

      return {
        success: true,
        status: response.status,
        data: response.data,
        headers: response.headers
      };
    });

  } catch (error) {
    const isRetryable = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'EHOSTUNREACH',
      408, // Request Timeout
      429, // Too Many Requests
      500, // Server Error
      502, // Bad Gateway
      503, // Service Unavailable
      504  // Gateway Timeout
    ].includes(error.code || error.response?.status);

    logger.error(`❌ [API-WORKER] Error en ${apiName}:`, {
      jobId: job.id,
      error: error.message,
      code: error.code || error.response?.status,
      retryable: isRetryable,
      intento: retryCount + 1,
      maxRetries
    });

    // Retry si es recuperable
    if (isRetryable && retryCount < maxRetries) {
      const delayMs = Math.pow(2, retryCount) * 1000; // Backoff: 1s, 2s, 4s
      logger.info(`⏳ [API-WORKER] Reintentando en ${delayMs}ms...`, { jobId: job.id });
      
      throw new Error(`Reintentar en ${delayMs}ms`);
    }

    throw new Error(`API ${apiName} fallo permanentemente: ${error.message}`);
  }
}

// ============================================================================
// PROCESADOR DE WEBHOOKS (Idempotentes)
// ============================================================================

async function processWebhook(job) {
  const { webhookId, evento, data, source, timestamp } = job.data;

  logger.info(`🔔 [WEBHOOK-WORKER] Procesando: ${source} - ${evento}`, {
    jobId: job.id,
    webhookId,
    timestamp
  });

  try {
    // 1. Verificar idempotencia (evitar procesar duplicados)
    const { checkWebhookIdempotency, markWebhookProcessed } = require('../db/repositories');
    const alreadyProcessed = await checkWebhookIdempotency(webhookId);
    
    if (alreadyProcessed) {
      logger.warn(`⏭️  [WEBHOOK-WORKER] Webhook ya procesado: ${webhookId}`);
      return { skipped: true, reason: 'Already processed' };
    }

    // 2. Procesar según tipo de evento
    const { webhookProcessor } = require('../services/WebhookProcessor');
    const result = await webhookProcessor(source, evento, data);

    // 3. Marcar como procesado
    await markWebhookProcessed(webhookId);

    logger.info(`✅ [WEBHOOK-WORKER] Webhook procesado: ${source}`, {
      jobId: job.id,
      webhookId,
      result: result.processedRecords
    });

    return result;

  } catch (error) {
    logger.error(`❌ [WEBHOOK-WORKER] Error procesando webhook:`, {
      jobId: job.id,
      webhookId,
      error: error.message,
      intento: job.attemptsMade + 1
    });

    // Reintentará automáticamente hasta 3 veces con backoff
    throw error;
  }
}

// ============================================================================
// PROCESADOR DE SINCRONIZACIÓN
// ============================================================================

async function processSyncTask(job) {
  const { taskId, sourceApi, endpoint, batchSize = 100 } = job.data;

  logger.info(`🔄 [SYNC-WORKER] Sincronizando: ${sourceApi}/${endpoint}`, {
    jobId: job.id,
    taskId,
  });

  try {
    const { SyncService } = require('../services/SyncService');
    const result = await SyncService.syncEndpoint(sourceApi, endpoint, { batchSize });

    logger.info(`✅ [SYNC-WORKER] Sync completado: ${sourceApi}`, {
      jobId: job.id,
      taskId,
      recordsProcessed: result.total
    });

    return result;

  } catch (error) {
    logger.error(`❌ [SYNC-WORKER] Error en sync:`, {
      jobId: job.id,
      taskId,
      error: error.message
    });

    throw error;
  }
}

/**
 * Procesador de importaciones (Excel / CSV)
 * job.data expected: { type: 'excel'|'csv', file: { path, originalname }, mapeo, entidad, delimitador }
 */
async function processImport(job) {
  const { type, file, mapeo, entidad = 'clientes', delimitador } = job.data;
  logger.info(`📥 [IMPORT-WORKER] Procesando import (${type}) - ${file?.originalname || file?.path}`, { jobId: job.id });

  try {
    const { ImportService } = require('../services/ImportService');

    if (String(type).toLowerCase() === 'csv') {
      const result = await ImportService.processCSVFile(file, mapeo, entidad, delimitador || ',');
      logger.info(`✅ [IMPORT-WORKER] CSV import completado`, { jobId: job.id });
      return result;
    }

    // Default to Excel
    const result = await ImportService.processExcelFile(file, mapeo, entidad);
    logger.info(`✅ [IMPORT-WORKER] Excel import completado`, { jobId: job.id });
    return result;
  } catch (error) {
    logger.error(`❌ [IMPORT-WORKER] Error en import:`, { jobId: job.id, error: error.message });
    throw error;
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

// API Queue
apiQueue.on('failed', (job, err) => {
  logger.error(`🔴 [API-QUEUE] Job fallido: ${job.id}`, {
    attempts: job.attemptsMade,
    maxAttempts: job.opts.attempts,
    error: err.message
  });
});

apiQueue.on('completed', (job) => {
  logger.debug(`🟢 [API-QUEUE] Job completado: ${job.id}`);
});

// Webhook Queue
webhookQueue.on('failed', (job, err) => {
  logger.error(`🔴 [WEBHOOK-QUEUE] Job fallido: ${job.id}`, {
    attempts: job.attemptsMade,
    error: err.message
  });
});

webhookQueue.on('completed', (job) => {
  logger.debug(`🟢 [WEBHOOK-QUEUE] Job completado: ${job.id}`);
});

// Import Queue
importQueue.on('failed', (job, err) => {
  logger.error(`🔴 [IMPORT-QUEUE] Job fallido: ${job.id}`, {
    attempts: job.attemptsMade,
    error: err.message
  });
});

importQueue.on('completed', (job) => {
  logger.debug(`🟢 [IMPORT-QUEUE] Job completado: ${job.id}`);
});

// ============================================================================
// REGISTRAR PROCESADORES
// ============================================================================

apiQueue.process(5, processApiCall); // 5 workers paralelos
webhookQueue.process(10, processWebhook); // 10 workers para webhooks
syncQueue.process(2, processSyncTask); // 2 workers para sync
importQueue.process(2, processImport); // 2 workers para imports

// ============================================================================
// FUNCIONES PÚBLICAS
// ============================================================================

/**
 * Cola una llamada a API externa
 */
async function queueApiCall(apiName, method, url, data, auth, options = {}) {
  const jobConfig = {
    priority: options.priority || 5,
    attempts: options.maxRetries ? options.maxRetries + 1 : 4,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: true,
    removeOnFail: false
  };

  const job = await apiQueue.add(
    {
      apiName,
      method,
      url,
      data,
      auth,
      timeout: options.timeout || 15000,
      maxRetries: options.maxRetries || 3
    },
    jobConfig
  );

  logger.info(`📋 [QUEUE] API call en cola: ${job.id}`, { apiName, method, url });
  return job;
}

/**
 * Cola un webhook para procesamiento
 */
async function queueWebhook(webhookId, source, evento, data, priority = 5) {
  const job = await webhookQueue.add(
    {
      webhookId,
      source,
      evento,
      data,
      timestamp: new Date().toISOString()
    },
    {
      priority,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      },
      removeOnComplete: true
    }
  );

  logger.info(`📋 [QUEUE] Webhook en cola: ${job.id}`, { webhookId, source });
  return job;
}

/**
 * Cola una tarea de sincronización
 */
async function queueSyncTask(sourceApi, endpoint, options = {}) {
  const job = await syncQueue.add(
    {
      taskId: options.taskId || `${sourceApi}-${endpoint}-${Date.now()}`,
      sourceApi,
      endpoint,
      batchSize: options.batchSize || 100
    },
    {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      removeOnComplete: true
    }
  );

  logger.info(`📋 [QUEUE] Sync task en cola: ${job.id}`, { sourceApi, endpoint });
  return job;
}

/**
 * Cola una tarea de importación (Excel / CSV)
 * job.data: { type, file, mapeo, entidad, delimitador }
 */
async function queueImportTask(type, file, mapeo = {}, entidad = 'clientes', opts = {}) {
  const job = await importQueue.add(
    {
      type,
      file,
      mapeo,
      entidad,
      delimitador: opts.delimitador
    },
    {
      attempts: opts.attempts || 2,
      backoff: { type: 'exponential', delay: opts.delay || 2000 },
      removeOnComplete: true
    }
  );

  logger.info(`📋 [QUEUE] Import task en cola: ${job.id}`, { type, file: file?.path || file?.originalname });
  return job;
}

// ============================================================================
// MONITOREO
// ============================================================================

async function getWorkerStats() {
  const [apiCounts, webhookCounts, syncCounts] = await Promise.all([
    apiQueue.getJobCounts(),
    webhookQueue.getJobCounts(),
    syncQueue.getJobCounts()
  ]);

  return {
    api: {
      queue: apiCounts,
      circuitBreakers: Array.from(circuitBreakers.entries()).map(([name, breaker]) => ({
        name,
        state: breaker.state,
        failures: breaker.failures
      }))
    },
    webhooks: webhookCounts,
    sync: syncCounts,
    timestamp: new Date().toISOString()
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Colas
  apiQueue,
  webhookQueue,
  syncQueue,
  importQueue,
  
  // Funciones
  queueApiCall,
  queueWebhook,
  queueSyncTask,
  queueImportTask,
  getWorkerStats,
  // Procesadores (exportados para adaptación con Agenda)
  processApiCall,
  processWebhook,
  processSyncTask,
  processImport,
  
  // Clase Circuit Breaker
  CircuitBreaker
};
