const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const mongoose = require('mongoose');
const { logger } = require('../utils/logger');
const { requireAuth, requireStaff } = require('../middleware/auth');

// shared helper functions used by both primary and alias endpoints
// default settings object returned when no document exists
const DEFAULT_SETTINGS = {
  importsConnected: false,
  providers: {},
  lastCheckedAt: null,
  updatedAt: null,
};

async function handleGetImports(req, res) {
  // add anti-cache headers so clients always get fresh JSON
  res.set('Cache-Control', 'no-store');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  // instrumentation: log minimal header info (boolean flags)
  logger.info('[REQ]', {
    path: req.path,
    method: req.method,
    hasCookie: !!req.headers.cookie,
    hasAuth: !!req.headers.authorization,
    hasSession: !!req.headers['x-session-token'],
    contentType: req.headers['content-type'] || null
  });

  try {
    // basic DB availability guard
    const { ok } = require('../db/db').getDbStatus();
    if (!ok) {
      return res.status(503).json({
        ok: false,
        error: 'DB_NOT_READY',
        importsConnected: false,
        providers: {},
        lastCheckedAt: null,
        updatedAt: null,
      });
    }

    const doc = await Setting.findOne({ key: 'imports_connected' }).lean();
    if (!doc) {
      // no document -> return defaults (guaranteed non-null fields)
      return res.json({
        ok: true,
        importsConnected: DEFAULT_SETTINGS.importsConnected,
        providers: DEFAULT_SETTINGS.providers,
        lastCheckedAt: DEFAULT_SETTINGS.lastCheckedAt,
        updatedAt: DEFAULT_SETTINGS.updatedAt,
      });
    }

    // value may be primitive or object; normalize
    const value = typeof doc.value === 'object' && doc.value !== null
      ? doc.value
      : { importsConnected: !!doc.value };

    const providers = value.providers || {};
    let importsConnected;
    if (typeof value.importsConnected === 'boolean') {
      // explicit flag wins
      importsConnected = value.importsConnected;
    } else {
      // infer from presence of providers
      importsConnected = Object.keys(providers).length > 0;
    }

    const result = {
      importsConnected,
      providers,
      lastCheckedAt: value.lastCheckedAt || null,
      updatedAt: value.updatedAt || null,
    };
    return res.json({ ok: true, ...result });
  } catch (err) {
    logger.error('[API ERROR]', {
      path: req.path,
      method: req.method,
      message: err.message,
      stack: err.stack
    });
    return res.status(500).json({ ok: false, error: 'INTERNAL_SERVER_ERROR', message: err.message });
  }
}

async function handlePatchImports(req, res) {
  // DB readiness
  const { ok } = require('../db/db').getDbStatus();
  if (!ok) {
    return res.status(503).json({ ok: false, error: 'DB_NOT_READY', importsConnected: null });
  }

  const { importsConnected, providers } = req.body;
  if (importsConnected !== undefined && typeof importsConnected !== 'boolean') {
    return res.status(400).json({ ok: false, error: 'INVALID_BODY' });
  }
  if (providers !== undefined && (typeof providers !== 'object' || Array.isArray(providers))) {
    return res.status(400).json({ ok: false, error: 'INVALID_BODY' });
  }

  try {
    const now = new Date();
    const userId = req.user?.id || req.user?._id || null;

    // build new value merging defaults with provided fields
    const newValue = Object.assign({}, DEFAULT_SETTINGS, {});
    if (importsConnected !== undefined) newValue.importsConnected = importsConnected;
    if (providers !== undefined) newValue.providers = providers;
    newValue.updatedAt = now;
    newValue.updatedBy = userId;

    const doc = await Setting.findOneAndUpdate(
      { key: 'imports_connected' },
      { value: newValue, updatedAt: now, updatedBy: userId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    logger.info('imports_connection_changed', { importsConnected: newValue.importsConnected, userId });
    // respond with normalized structure
    return res.json({
      ok: true,
      importsConnected: !!doc.value.importsConnected,
      providers: doc.value.providers || {},
      lastCheckedAt: doc.value.lastCheckedAt || null,
      updatedAt: doc.value.updatedAt || null,
    });
  } catch (err) {
    logger.error('Error updating imports connection setting', { err });
    return res.status(500).json({ ok: false, error: 'Error updating setting' });
  }
}

/**
 * canonical routes
 */
router.get('/imports-connection', requireAuth, handleGetImports);
router.patch('/imports-connection', requireAuth, requireStaff, handlePatchImports);

/**
 * backward-compatible aliases
 */
router.get('/imports-connected', requireAuth, handleGetImports);
router.patch('/imports-connected', requireAuth, requireStaff, handlePatchImports);


module.exports = router;
