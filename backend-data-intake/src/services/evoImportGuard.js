'use strict';

const { RateLimiter } = require('./RateLimiter');
const { logger } = require('../utils/logger');

const PAGE_SIZE = 50;

function estimateHits(count) {
  if (!count || count <= 0) return 1;
  return Math.ceil(count / PAGE_SIZE);
}

async function preflightCheck(selections = []) {
  const limiter = new RateLimiter('EVO');
  const usage = await limiter.getMonthlyUsage();

  const dailyUsed      = Number(usage.dailyUsed)    || 0;
  const dailyLimit     = Number(usage.dailyLimit)    || 100;
  const monthlyUsed    = Number(usage.monthlyUsed)   || 0;
  const monthlyLimit   = Number(usage.monthlyLimit)  || 1000;
  const isPro          = String(usage.plan || '').toLowerCase() === 'pro';

  const dailyRemaining   = Math.max(0, dailyLimit - dailyUsed);
  const monthlyRemaining = isPro ? Infinity : Math.max(0, monthlyLimit - monthlyUsed);

  const breakdown = selections.map(sel => ({
    type:        sel.type,
    label:       sel.label || sel.type,
    recordCount: sel.count || 0,
    hitsNeeded:  estimateHits(sel.count || 0),
  }));

  const totalHits = breakdown.reduce((sum, b) => sum + b.hitsNeeded, 0);

  const exceedsDaily   = !isPro && totalHits > dailyRemaining;
  const exceedsMonthly = !isPro && totalHits > monthlyRemaining;

  let reason = null;
  if (exceedsMonthly) {
    reason = `Esta importación requiere ${totalHits} requests pero solo tienes ${monthlyRemaining} disponibles este mes (Plan Plus: 1.000/mes).`;
  } else if (exceedsDaily) {
    reason = `Esta importación requiere ${totalHits} requests pero solo tienes ${dailyRemaining} disponibles hoy (Plan Plus: 100/día). Intenta mañana o selecciona menos datasets.`;
  }

  return {
    canProceed: !exceedsDaily && !exceedsMonthly,
    reason,
    breakdown,
    totals: {
      totalHits,
      dailyUsed,
      dailyRemaining,
      dailyLimit,
      monthlyUsed,
      monthlyRemaining,
      monthlyLimit: isPro ? null : monthlyLimit,
      isPro,
      percentDailyUsedAfter:   isPro ? 0 : Math.round((dailyUsed + totalHits) / dailyLimit * 100),
      percentMonthlyUsedAfter: isPro ? 0 : Math.round((monthlyUsed + totalHits) / monthlyLimit * 100),
    },
  };
}

function getInterPageDelay(isPro = false) {
  return isPro ? 200 : 700;
}

function getInterDatasetDelay(isPro = false) {
  return isPro ? 500 : 1500;
}

module.exports = {
  estimateHits,
  preflightCheck,
  getInterPageDelay,
  getInterDatasetDelay,
  PAGE_SIZE,
};