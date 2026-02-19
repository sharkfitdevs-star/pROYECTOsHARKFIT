/*
 * EMAIL SERVICE — canonical clean file
 */

const { logger } = require('./logger');
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'console';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@sharkfit.com';

async function sendEmail({ to, subject, html, text }) {
  const provider = (EMAIL_PROVIDER || 'console').toLowerCase();
  try {
    if (provider === 'sendgrid') return await sendWithSendGrid({ to, subject, html, text });
    if (provider === 'mailgun') return await sendWithMailgun({ to, subject, html, text });
    return sendWithConsole({ to, subject, html, text });
  } catch (err) {
    logger.error('Error enviando email:', err);
    throw err;
  }
}

async function sendWithSendGrid({ to, subject, html, text }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error('SENDGRID_API_KEY no configurado');
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(apiKey);
  await sgMail.send({ from: EMAIL_FROM, to, subject, html, text: text || html.replace(/<[^>]*>/g, '') });
  logger.info(`Email enviado via SendGrid: ${to}`);
}

async function sendWithMailgun({ to, subject, html, text }) {
  const apiKey = process.env.MAILGUN_API_KEY; const domain = process.env.MAILGUN_DOMAIN;
  if (!apiKey || !domain) throw new Error('MAILGUN no configurado');
  const mailgun = require('mailgun-js')({ apiKey, domain });
  await mailgun.messages().send({ from: EMAIL_FROM, to, subject, html, text: text || html.replace(/<[^>]*>/g, '') });
  logger.info(`Email enviado via Mailgun: ${to}`);
}

function sendWithConsole({ to, subject, html, text }) {
  logger.warn('EMAIL_PROVIDER=console — email simulado');
  logger.info('\n' + '='.repeat(60));
  logger.info(`To: ${to}`);
  logger.info(`From: ${EMAIL_FROM}`);
  logger.info(`Subject: ${subject}`);
  logger.info(text || html.replace(/<[^>]*>/g, ''));
  logger.info('='.repeat(60) + '\n');
  return true;
}

async function sendVerificationEmail(user, token) {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
  return sendEmail({ to: user.email, subject: 'Verifica tu cuenta — SharkFit', html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#333"><div style="max-width:600px;margin:0 auto;padding:20px"><h2>¡Hola ${user.firstName}!</h2><p>Confirma tu email pulsando el botón a continuación:</p><p style="text-align:center"><a href="${verifyUrl}" style="background:#0066cc;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none;">Verificar email</a></p><p style="word-break:break-all;color:#0066cc">${verifyUrl}</p><p>Si no solicitaste esto, ignora este mensaje.</p></div></body></html>`, text: `Verifica tu cuenta: ${verifyUrl}` });
}

async function sendPasswordResetEmail(user, token) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
  return sendEmail({ to: user.email, subject: 'Restablece tu contraseña — SharkFit', html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#333"><div style="max-width:600px;margin:0 auto;padding:20px"><h2>Restablece tu contraseña</h2><p>Haz clic en el botón para crear una nueva contraseña:</p><p style="text-align:center"><a href="${resetUrl}" style="background:#dc3545;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none;">Restablecer contraseña</a></p><p style="word-break:break-all;color:#dc3545">${resetUrl}</p><p>Este enlace expira en 1 hora.</p></div></body></html>`, text: `Restablece tu contraseña: ${resetUrl}` });
}

async function sendAccessRequestEmail(request) {
  const adminEmail = process.env.SEED_OWNER_EMAIL || process.env.EMAIL_FROM || 'admin@sharkfit.com';
  return sendEmail({ to: adminEmail, subject: `Nueva solicitud de acceso — ${request.email}`, html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#333"><div style="max-width:600px;margin:0 auto;padding:20px"><h2>Nueva solicitud de acceso</h2><p><strong>${request.firstName} ${request.lastName}</strong> — ${request.email}</p><p>Empresa: ${request.company || '—'}</p><p>Mensaje: ${request.message || '—'}</p></div></body></html>`, text: `Solicitud: ${request.firstName} ${request.lastName} — ${request.email}\nEmpresa: ${request.company || '-'}\nMensaje: ${request.message || '-'}` });
}



/**
 * Console provider (desarrollo)
 * Imprime el email en la consola en lugar de enviarlo
 */


// ----------------------
// Email templates
// ----------------------








/**
 * Email para notificar al admin sobre una nueva solicitud de acceso
 */


module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAccessRequestEmail
};


