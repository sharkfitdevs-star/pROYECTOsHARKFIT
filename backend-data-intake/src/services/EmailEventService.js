/**
 * 📧 EMAIL SERVICE - Escucha eventos y envía emails
 * Ejemplo de servicio desacoplado que reacciona a eventos
 */

const { subscribe } = require('../events/EventBus');
const { sendEmail } = require('../utils/email');
const { logger } = require('../utils/logger');

// Escuchar evento de usuario creado
subscribe('user.created', async (event) => {
  const { firstName, lastName, email, username } = event.data;

  logger.info(`📧 Enviando email de bienvenida a ${email}`);

  try {
    await sendEmail({
      to: email,
      subject: '¡Bienvenido a SharkFit!',
      template: 'welcome',
      data: {
        firstName,
        lastName,
        username,
        activationLink: `https://dashboard.sharkfit.com/activate?user=${username}`
      }
    });

    logger.info(`✅ Email de bienvenida enviado a ${email}`);
  } catch (error) {
    logger.error(`❌ Error enviando email de bienvenida a ${email}:`, error);
    throw error; // reintentar
  }
});

// Escuchar evento de contraseña olvidada
subscribe('user.password.changed', async (event) => {
  const { email, firstName } = event.data;

  logger.info(`📧 Enviando confirmación de contraseña a ${email}`);

  try {
    await sendEmail({
      to: email,
      subject: 'Tu contraseña ha sido actualizada',
      template: 'password-changed',
      data: { firstName }
    });

    logger.info(`✅ Email de contraseña actualizada enviado a ${email}`);
  } catch (error) {
    logger.error(`❌ Error enviando email a ${email}:`, error);
    throw error;
  }
});

// Escuchar evento de pago
subscribe('order.paid', async (event) => {
  const { email, orderId, amount } = event.data;

  logger.info(`📧 Enviando confirmación de pago para orden ${orderId}`);

  try {
    await sendEmail({
      to: email,
      subject: `Pago confirmado - Orden #${orderId}`,
      template: 'payment-confirmed',
      data: { orderId, amount }
    });

    logger.info(`✅ Email de pago enviado`);
  } catch (error) {
    logger.error(`❌ Error enviando email de pago:`, error);
    throw error;
  }
});

module.exports = {
  name: 'EmailService'
};
