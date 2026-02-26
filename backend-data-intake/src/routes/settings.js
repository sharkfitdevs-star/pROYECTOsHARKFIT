const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const { logger } = require('../utils/logger');
const { requireAuth, requireStaff } = require('../middleware/auth');

// shared helper functions used by both primary and alias endpoints
async function handleGetImports(req, res) {
  try {
    let doc;
    try {
      doc = await Setting.findOne({ key: 'imports_connected' }).lean();
    } catch (error) {
      // log detailed read failure
      logger.error('failed to read imports_connected setting', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      });
      // fallback value
      const importsConnected = true;
      return res.json({ ok: true, importsConnected, warning: 'failed to read setting imports_connected' });
    }

    const importsConnected = doc ? !!doc.value : true;
    res.json({ ok: true, importsConnected });
  } catch (err) {
    // critical unexpected error
    logger.error('Error reading imports connection setting', { err });
    res.status(500).json({ ok: false, error: 'Error reading setting' });
  }
}

async function handlePatchImports(req, res) {
  try {
    const { importsConnected } = req.body;
    if (typeof importsConnected !== 'boolean') {
      return res.status(400).json({ ok: false, error: 'importsConnected boolean required' });
    }
    const now = new Date();
    const userId = req.user ? req.user.id : null;
    const update = {
      value: importsConnected,
      updatedAt: now,
      updatedBy: userId
    };
    const doc = await Setting.findOneAndUpdate(
      { key: 'imports_connected' },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    logger.info('imports_connection_changed', { importsConnected, userId });
    return res.json({ ok: true, importsConnected: !!doc.value });
  } catch (err) {
    logger.error('Error updating imports connection setting', { err });
    return res.status(500).json({ ok: false, error: 'Error updating setting' });
  }
}

/**
 * canonical routes
 */
router.get('/imports-connection', handleGetImports);
router.patch('/imports-connection', requireAuth, requireStaff, handlePatchImports);

/**
 * backward-compatible aliases
 */
router.get('/imports-connected', handleGetImports);
router.patch('/imports-connected', requireAuth, requireStaff, handlePatchImports);


module.exports = router;
