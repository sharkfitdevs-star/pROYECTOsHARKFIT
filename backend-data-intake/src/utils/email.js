/**
 * EMAIL SERVICE: Servicio de envío de emails
 * Soporta múltiples proveedores (SendGrid, Mailgun, Console)
 */

const { logger } = require('./logger');

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'console';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@sharkfit.com';

/**
 * Envía un email usando el proveedor configurado
 * @param {Object} options - Opciones del email
 * @param {string} options.to - Email del destinatario
 * @param {string} options.subject - Asunto del email
 * @param {string} options.html - Contenido HTML del email
 * @param {string} options.text - Contenido de texto plano (opcional)
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    switch (EMAIL_PROVIDER.toLowerCase()) {
      case 'sendgrid':
        return await sendWithSendGrid({ to, subject, html, text });
      
      case 'mailgun':
        return await sendWithMailgun({ to, subject, html, text });
      
      case 'console':
      default:
        return sendWithConsole({ to, subject, html, text });
    }
  } catch (error) {
    logger.error('Error enviando email:', error);
    throw error;
  }
};

/**
 * SendGrid provider
 */
const sendWithSendGrid = async ({ to, subject, html, text }) => {
  const apiKey = process.env.SENDGRID_API_KEY;

  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY no configurado en .env');
  }

  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(apiKey);

    await sgMail.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '') // Fallback: strip HTML
    });

    logger.info(`✅ Email enviado via SendGrid a ${to}`);
  } catch (error) {
    logger.error('❌ Error SendGrid:', error.response?.body || error.message);
    throw new Error('Error enviando email via SendGrid');
  }
};

/**
 * Mailgun provider
 */
const sendWithMailgun = async ({ to, subject, html, text }) => {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;

  if (!apiKey || !domain) {
    throw new Error('MAILGUN_API_KEY y MAILGUN_DOMAIN no configurados en .env');
  }

  try {
    const mailgun = require('mailgun-js')({ apiKey, domain });

    await mailgun.messages().send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '')
    });

    logger.info(`✅ Email enviado via Mailgun a ${to}`);
  } catch (error) {
    logger.error('❌ Error Mailgun:', error.message);
    throw new Error('Error enviando email via Mailgun');
  }
};

/**
 * Console provider (desarrollo)
 * Imprime el email en la consola en lugar de enviarlo
 */
const sendWithConsole = ({ to, subject, html, text }) => {
  logger.warn('⚠️  EMAIL_PROVIDER=console - Email NO enviado (solo logs)');
  
  console.log('\n' + '='.repeat(80));
  console.log('📧 EMAIL SIMULADO (DESARROLLO)');
  console.log('='.repeat(80));
  console.log(`Para:     ${to}`);
  console.log(`De:       ${EMAIL_FROM}`);
  console.log(`Asunto:   ${subject}`);
  console.log('-'.repeat(80));
  console.log('Contenido:');
  console.log(text || html.replace(/<[^>]*>/g, ''));
  console.log('='.repeat(80) + '\n');

  return true;
};

/**
 * Template para email de verificación
 */
const sendVerificationEmail = async (user, token) => {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: 'Verifica tu cuenta SharkFit',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0066cc; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 30px; background: #0066cc; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏋️ SharkFit</h1>
          </div>
          <div class="content">
            <h2>¡Bienvenido ${user.firstName}!</h2>
            <p>Gracias por registrarte en SharkFit. Para activar tu cuenta, haz clic en el botón de abajo:</p>
            <div style="text-align: center;">
              <a href="${verifyUrl}" class="button">Verificar Email</a>
            </div>
            <p>O copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; color: #0066cc;">${verifyUrl}</p>
            <p><strong>Este enlace expira en 24 horas.</strong></p>
          </div>
          <div class="footer">
            <p>Si no creaste esta cuenta, puedes ignorar este email.</p>
            <p>&copy; ${new Date().getFullYear()} SharkFit. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Bienvenido ${user.firstName}!

Gracias por registrarte en SharkFit. Para activar tu cuenta, visita este enlace:

${verifyUrl}

Este enlace expira en 24 horas.

Si no creaste esta cuenta, puedes ignorar este email.
    `
  });
};

/**
 * Template para reset de password
 */
const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: 'Restablece tu contraseña - SharkFit',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 30px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Restablece tu Contraseña</h1>
          </div>
          <div class="content">
            <h2>Hola ${user.firstName},</h2>
            <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para crear una nueva:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
            </div>
            <p>O copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; color: #dc3545;">${resetUrl}</p>
            <p><strong>Este enlace expira en 1 hora.</strong></p>
          </div>
          <div class="footer">
            <p><strong>Si no solicitaste este cambio, ignora este email.</strong> Tu contraseña permanecerá sin cambios.</p>
            <p>&copy; ${new Date().getFullYear()} SharkFit. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Hola ${user.firstName},

Recibimos una solicitud para restablecer tu contraseña. Visita este enlace para crear una nueva:

${resetUrl}

Este enlace expira en 1 hora.

Si no solicitaste este cambio, ignora este email. Tu contraseña permanecerá sin cambios.
    `
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail
};
