const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

// AUTH SIMPLIFICADO
const simpleAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ ok: false, error: "Token requerido" });
    const token = authHeader.slice(7);
    const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ ok: false, error: "JWT no configurado" });
    const decoded = jwt.verify(token, secret);
    req.user = {
      id: (decoded.userId || decoded.id || decoded.sub || "").toString(),
      role: decoded.role || "user",
      username: decoded.username || ""
    };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError")
      return res.status(401).json({ ok: false, error: "Token expirado" });
    return res.status(401).json({ ok: false, error: "Token invalido" });
  }
};

// MODELO FLEXIBLE
const getOrCreateModel = (name, collection) => {
  if (mongoose.models[name]) return mongoose.models[name];
  return mongoose.model(name, new mongoose.Schema({}, {
    collection, strict: false, timestamps: true
  }));
};

const SECTIONS = {
  "sf-colaboradores": "sf_colaboradores",
  "sf-remuneraciones": "sf_remuneraciones",
  "sf-evaluaciones": "sf_evaluaciones",
  "sf-documentos": "sf_documentos",
  "sf-reclutamiento": "sf_reclutamiento",
  "sf-distribucion": "sf_distribucion",
  "sf-productos": "sf_productos",
  "sf-stock": "sf_stock",
  "sf-proveedores": "sf_proveedores",
  "sf-entregas": "sf_entregas",
  "sf-compras": "sf_compras",
};

const models = {};
for (const [route, col] of Object.entries(SECTIONS)) {
  models[route] = getOrCreateModel(route.replace(/-/g, "_"), col);
}

for (const [route] of Object.entries(SECTIONS)) {
  const Model = models[route];
  const path = "/" + route;

  // CREATE
  router.post(path, simpleAuth, async (req, res) => {
    try {
      const doc = new Model({
        ...req.body, _createdBy: req.user.username || req.user.id, _active: true
      });
      const saved = await doc.save();
      res.status(201).json({ ok: true, success: true, data: saved });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
  });

  // READ ALL
  router.get(path, simpleAuth, async (req, res) => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const query = { _active: { $ne: false } };
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [docs, total] = await Promise.all([
        Model.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
        Model.countDocuments(query)
      ]);
      res.json({ ok: true, success: true, data: docs,
        pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / +limit) }
      });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
  });

  // READ ONE
  router.get(path + "/:id", simpleAuth, async (req, res) => {
    try {
      const doc = await Model.findById(req.params.id).lean();
      if (!doc) return res.status(404).json({ ok: false, error: "No encontrado" });
      res.json({ ok: true, data: doc });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
  });

  // UPDATE
  router.put(path + "/:id", simpleAuth, async (req, res) => {
    try {
      const doc = await Model.findByIdAndUpdate(req.params.id,
        { ...req.body, _updatedBy: req.user.username || req.user.id },
        { new: true, runValidators: false }
      );
      if (!doc) return res.status(404).json({ ok: false, error: "No encontrado" });
      res.json({ ok: true, data: doc });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
  });

  // DELETE (soft)
  router.delete(path + "/:id", simpleAuth, async (req, res) => {
    try {
      const doc = await Model.findByIdAndUpdate(req.params.id,
        { _active: false, _deletedBy: req.user.username, _deletedAt: new Date() },
        { new: true }
      );
      if (!doc) return res.status(404).json({ ok: false, error: "No encontrado" });
      res.json({ ok: true, message: "Eliminado" });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
  });

  // RESUMEN
  router.get(path + "-resumen", simpleAuth, async (req, res) => {
    try {
      const total = await Model.countDocuments({ _active: { $ne: false } });
      res.json({ ok: true, data: { totales: { total } } });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
  });
}

module.exports = router;
