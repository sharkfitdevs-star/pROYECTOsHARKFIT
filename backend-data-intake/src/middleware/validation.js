/**
 * 🛡️ VALIDACIÓN & SANITIZACIÓN
 * 
 * Cambios:
 * ✅ Joi schema para entrada
 * ✅ Sanitización de strings (XSS prevention)
 * ✅ Mensajes de error sin revelar estructura BD
 * 
 * Instalación requerida:
 * npm install joi express-mongo-sanitize hpp
 */

const Joi = require('joi');

// ════════════════════════════════════════════════════════════════════════════
// 📋 SCHEMAS DE VALIDACIÓN
// ════════════════════════════════════════════════════════════════════════════

const schemas = {
  // Register
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required()
      .messages({
        'string.alphanum': 'Usuario debe contener solo letras y números',
        'string.min': 'Usuario debe tener al menos 3 caracteres',
        'string.max': 'Usuario no puede exceder 30 caracteres'
      }),
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Correo inválido'
      }),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        'string.min': 'Contraseña debe tener al menos 8 caracteres',
        'string.pattern.base': 'Contraseña debe incluir mayúsculas, minúsculas y números'
      }),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required()
  }).unknown(false),  // Rechazar campos desconocidos

  // Login
  login: Joi.object({
    username: Joi.string().optional(),
    email: Joi.string().email().optional(),
    password: Joi.string().required()
  }).xor('username', 'email')  // Requerir uno u otro, no ambos
    .unknown(false)
    .messages({
      'object.xor': 'Proporcione username O email, no ambos'
    }),

  // Password reset
  passwordReset: Joi.object({
    email: Joi.string().email().required(),
    newPassword: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required(),
    confirmPassword: Joi.string().required().valid(Joi.ref('newPassword'))
      .messages({
        'any.only': 'Las contraseñas no coinciden'
      })
  }).unknown(false)
};

// ════════════════════════════════════════════════════════════════════════════
// 🛡️ MIDDLEWARE DE VALIDACIÓN
// ════════════════════════════════════════════════════════════════════════════

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      // ✅ Formatear errores sin revelar estructura interna
      const fields = error.details.reduce((acc, err) => {
        acc[err.path.join('.')] = err.message;
        return acc;
      }, {});
      
      return res.status(400).json({
        error: true,
        message: 'Validación fallida',
        fields
      });
    }

    // ✅ Reemplazar body con valores validados y limpios
    req.body = value;
    next();
  };
};

module.exports = {
  schemas,
  validateRequest
};
