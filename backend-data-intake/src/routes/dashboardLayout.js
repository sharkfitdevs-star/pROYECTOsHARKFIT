const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const OverviewLayout = require('../models/OverviewLayout');

router.get('/', requireAuth, async (req, res) => {
  try {
    const layout = await OverviewLayout.findOne({ 
      usuario: req.user.id, 
      activo: true 
    });
    res.json({ success: true, data: layout || { widgets: [] } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    let layout = await OverviewLayout.findOne({ usuario: req.user.id });
    
    if (layout) {
      layout.widgets = req.body.widgets || [];
      layout.layout_guardado = req.body.layout_guardado;
      await layout.save();
    } else {
      layout = new OverviewLayout({
        usuario: req.user.id,
        rol: req.user.role || 'staff',
        widgets: req.body.widgets || [],
        layout_guardado: req.body.layout_guardado
      });
      await layout.save();
    }
    
    res.json({ success: true, data: layout });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/', requireAuth, async (req, res) => {
  try {
    const layout = await OverviewLayout.findOneAndUpdate(
      { usuario: req.user.id },
      { 
        widgets: req.body.widgets,
        layout_guardado: req.body.layout_guardado
      },
      { new: true, upsert: true }
    );
    res.json({ success: true, data: layout });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/', requireAuth, async (req, res) => {
  try {
    await OverviewLayout.findOneAndUpdate(
      { usuario: req.user.id },
      { activo: false }
    );
    res.json({ success: true, message: 'Layout eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
