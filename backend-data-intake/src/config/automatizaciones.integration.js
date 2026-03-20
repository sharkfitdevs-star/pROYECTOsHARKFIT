const cron = require('node-cron');

const EventBus = require('../events/EventBus');
const LogAutomatizacion = require('../models/automatizaciones/LogAutomatizacion');
const { AutomatizacionService } = require('../services/AutomatizacionService');
const { AlertaRulesEngine } = require('../services/AlertaRulesEngine');

let automatizacionService = null;
let alertaRulesEngine = null;
let cronIniciado = false;

function getAutomatizacionService() {
  if (!automatizacionService) {
    automatizacionService = new AutomatizacionService(EventBus);
  }
  return automatizacionService;
}

function getAlertaRulesEngine() {
  if (!alertaRulesEngine) {
    alertaRulesEngine = new AlertaRulesEngine();
  }
  return alertaRulesEngine;
}

async function dispararEvento(evento, payload = {}, contexto = {}) {
  const service = getAutomatizacionService();
  await EventBus.emit(evento, { ...payload, contexto });
  return service.procesarEvento(evento, payload, contexto);
}

function registrarEventosSistema() {
  const service = getAutomatizacionService();

  EventBus.subscribe('sync.completed', async (event) => {
    await service.procesarEvento('SYNC_EVO_COMPLETADO', event?.data || {}, { origen: 'eventbus.sync.completed' });
  });

  EventBus.subscribe('sync.failed', async (event) => {
    await service.procesarEvento('IMPORTACION_ERROR', event?.data || {}, { origen: 'eventbus.sync.failed' });
  });

  EventBus.subscribe('file.processed', async (event) => {
    await service.procesarEvento('IMPORTACION_COMPLETADA', event?.data || {}, { origen: 'eventbus.file.processed' });
  });

  EventBus.subscribe('file.failed', async (event) => {
    await service.procesarEvento('IMPORTACION_ERROR', event?.data || {}, { origen: 'eventbus.file.failed' });
  });
}

function iniciarCronRules() {
  if (cronIniciado) return;
  const engine = getAlertaRulesEngine();

  cron.schedule('*/5 * * * *', async () => {
    await engine.evaluarPorFrecuencia('cada_5_min');
  });

  cron.schedule('0 * * * *', async () => {
    await engine.evaluarPorFrecuencia('cada_hora');
  });

  cron.schedule('0 7 * * *', async () => {
    await engine.evaluarPorFrecuencia('diaria');
  });

  cron.schedule('0 3 * * 0', async () => {
    const limite = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    await LogAutomatizacion.deleteMany({ createdAt: { $lt: limite } });
  });

  cronIniciado = true;
}

async function inicializarMotorAutomatizaciones(eventBusExterno = null) {
  const service = getAutomatizacionService();
  if (eventBusExterno && typeof eventBusExterno.subscribe === 'function' && typeof eventBusExterno.emit === 'function') {
    service.setEventBus(eventBusExterno);
  }

  await service.inicializar();
  iniciarCronRules();
}

module.exports = {
  inicializarMotorAutomatizaciones,
  registrarEventosSistema,
  dispararEvento,
  getAutomatizacionService,
  getAlertaRulesEngine,
};
