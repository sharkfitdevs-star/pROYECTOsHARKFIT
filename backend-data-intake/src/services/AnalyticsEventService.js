/**
 * 📈 ANALYTICS SERVICE - Actualiza métricas y estadísticas en tiempo real
 * Dashboards, reportes, KPIs
 */

const { subscribe } = require('../events/EventBus');
const { logger } = require('../utils/logger');

const mongoose = require('mongoose');
const metricSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'metrics' });
const Metric = mongoose.models.Metric || mongoose.model('Metric', metricSchema);

// Helpers para métricas en MongoDB
const incrementMetric = async (key, value = 1) => {
  await Metric.findOneAndUpdate(
    { key },
    { $inc: { value }, $set: { updatedAt: new Date() } },
    { upsert: true, new: true }
  );
};

const setMetric = async (key, value) => {
  await Metric.findOneAndUpdate(
    { key },
    { $set: { value, updatedAt: new Date() } },
    { upsert: true, new: true }
  );
};

const getMetric = async (key) => {
  const metric = await Metric.findOne({ key });
  return metric ? metric.value : 0;
};

// === USUARIOS ===
subscribe('user.created', async (event) => {
  const { userId, plan } = event.data;

  logger.info(`📈 Actualizando métricas: nuevo usuario ${userId}`);

  try {
    // Total de usuarios
    await incrementMetric('users:total', 1);
    
    // Usuarios por plan
    await incrementMetric(`users:plan:${plan || 'free'}`, 1);
    
    // Timestamp del último usuario creado
    await setMetric('users:last_signup', new Date().getTime());
    
    // Análisis por día
    const today = new Date().toISOString().split('T')[0];
    await incrementMetric(`users:signup:${today}`, 1);

    logger.info(`✅ Métricas de usuario actualizadas (MongoDB)`);
  } catch (error) {
    logger.error(`❌ Error actualizando métricas de usuario:`, error);
  }
});

// === AUTENTICACIÓN ===
subscribe('login.success', async (event) => {
  const { userId } = event.data;

  try {
    await incrementMetric('auth:login_success', 1);
    
    // Track de usuarios activos
    const today = new Date().toISOString().split('T')[0];
    // await redis.sadd(`active_users:${today}`, userId); // ELIMINADO
    
    logger.info(`✅ Métrica de login exitoso`);
  } catch (error) {
    logger.error(`❌ Error en métrica de login:`, error);
  }
});

subscribe('login.failed', async (event) => {
  const { email, reason } = event.data;

  try {
    await incrementMetric('auth:login_failed', 1);
    await incrementMetric(`auth:failed_reason:${reason}`, 1);
    
    logger.warn(`⚠️ Métrica de login fallido`);
  } catch (error) {
    logger.error(`❌ Error registrando login fallido:`, error);
  }
});

// === ÓRDENES ===
subscribe('order.created', async (event) => {
  const { orderId, totalAmount, currency } = event.data;

  try {
    await incrementMetric('orders:total', 1);
    await incrementMetric(`orders:revenue:${currency}`, totalAmount);
    await setMetric('orders:last_created', new Date().getTime());
    
    const today = new Date().toISOString().split('T')[0];
    await incrementMetric(`orders:daily:${today}`, 1);
    await incrementMetric(`revenue:daily:${today}`, totalAmount);

    logger.info(`✅ Métricas de orden creada`);
  } catch (error) {
    logger.error(`❌ Error en métricas de orden:`, error);
  }
});

subscribe('order.paid', async (event) => {
  const { orderId, totalAmount } = event.data;

  try {
    await incrementMetric('payments:successful', 1);
    await incrementMetric('payments:revenue', totalAmount);
    
    logger.info(`✅ Métrica de pago exitoso`);
  } catch (error) {
    logger.error(`❌ Error registrando pago:`, error);
  }
});

subscribe('order.delivered', async (event) => {
  const { orderId, deliveryTime } = event.data;

  try {
    await incrementMetric('orders:delivered', 1);
    await incrementMetric('orders:delivery_time_sum', deliveryTime);
    
    // Promedio (calculado después)
    const completed = await getMetric('orders:delivered');
    const totalTime = await getMetric('orders:delivery_time_sum');
    const avg = Math.round(totalTime / completed);
    await setMetric('orders:avg_delivery_time', avg);

    logger.info(`✅ Métrica de orden entregada`);
  } catch (error) {
    logger.error(`❌ Error en métrica de entrega:`, error);
  }
});

// === SINCRONIZACIÓN ===
subscribe('sync.started', async (event) => {
  try {
    await incrementMetric('sync:total_attempts', 1);
    await setMetric('sync:last_started', new Date().getTime());
    
    logger.info(`✅ Métrica de inicio de sync`);
  } catch (error) {
    logger.error(`❌ Error registrando sync:`, error);
  }
});

subscribe('sync.completed', async (event) => {
  const { recordsProcessed, duration } = event.data;

  try {
    await incrementMetric('sync:successful', 1);
    await incrementMetric('sync:records_processed', recordsProcessed);
    await setMetric('sync:last_completed', new Date().getTime());
    await setMetric('sync:last_duration', duration);
    
    // Tasa de éxito
    const total = await getMetric('sync:total_attempts');
    const successful = await getMetric('sync:successful');
    const successRate = Math.round((successful / total) * 100);
    await setMetric('sync:success_rate', successRate);

    logger.info(`✅ Métrica de sync completado (${recordsProcessed} registros)`);
  } catch (error) {
    logger.error(`❌ Error en métrica de sync:`, error);
  }
});

subscribe('sync.failed', async (event) => {
  const { error } = event.data;

  try {
    await incrementMetric('sync:failed', 1);
    await setMetric('sync:last_error', error);
    await setMetric('sync:last_failed', new Date().getTime());

    logger.warn(`⚠️ Métrica de sync fallido`);
  } catch (error) {
    logger.error(`❌ Error registrando sync fallido:`, error);
  }
});

// === DASHBOARD SUMMARY ===
module.exports = {
  name: 'AnalyticsService',
  
  // Funciones para obtener métricas (para dashboards)
  getMetrics: async () => {
    try {
      return {
        users: {
          total: await getMetric('users:total'),
          lastSignup: await getMetric('users:last_signup')
        },
        auth: {
          loginSuccess: await getMetric('auth:login_success'),
          loginFailed: await getMetric('auth:login_failed')
        },
        orders: {
          total: await getMetric('orders:total'),
          delivered: await getMetric('orders:delivered'),
          avgDeliveryTime: await getMetric('orders:avg_delivery_time')
        },
        payments: {
          successful: await getMetric('payments:successful'),
          revenue: await getMetric('payments:revenue')
        },
        sync: {
          successRate: await getMetric('sync:success_rate'),
          lastDuration: await getMetric('sync:last_duration'),
          recordsProcessed: await getMetric('sync:records_processed')
        }
      };
    } catch (error) {
      logger.error(`❌ Error obteniendo métricas:`, error);
      return null;
    }
  },

  // Obtener usuarios activos hoy
  getActiveUsersToday: async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      // const count = await redis.scard(`active_users:${today}`); // ELIMINADO
      return count;
    } catch (error) {
      logger.error(`❌ Error obteniendo usuarios activos:`, error);
      return 0;
    }
  }
};
