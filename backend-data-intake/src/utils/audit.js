const { AuditLog } = require('../models');

const logAudit = async ({
  userId = null,
  action,
  ip = null,
  userAgent = null,
  meta = {}
}) => {
  try {
    await AuditLog.create({
      userId,
      action,
      ip,
      userAgent,
      meta
    });
  } catch (error) {
    // No bloquear el flujo por fallas de auditoria
  }
};

module.exports = {
  logAudit
};
