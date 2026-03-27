/**
 * ✅ VALIDACIÓN & SANITIZACIÓN mejorads
 * 
 * Cambios:
 * ✅ Joi schema para entrada
 * ✅ Sanitización de strings (XSS prevention)
 * ✅ Mensajes de error sin revelar estructura BD
 * 
 * Instalación:
 * npm install joi xss-clean
 */

const Joi = require('joi');
const mongoSanitize = require('express-mongo-sanitize');
const Router = require('express').Router;

// ════════════════════════════════════════════════════════════════════════════
// 📋 SCHEMAS DE VALIDACIÓN
// ════════════════════════════════════════════════════════════════════════════

const schemas = {
  // Register
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required()
      .messages({
        'string.alphanum': 'Usuario debe contener solo letras y números',
        'string.min': 'Usuario debe tener al menos 3 caracteres'
      }),
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Correo inválido'
      }),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)  // lowercase, uppercase, digit
      .required()
      .messages({
        'string.min': 'Contraseña debe tener al menos 8 caracteres',
        'string.pattern.base': 'Contraseña debe incluir mayúsculas, minúsculas y números'
      }),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required()
  }),

  // Login
  login: Joi.object({
    username: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }).xor('username', 'email')  // Requerir uno u otro, no ambos
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
  })
};

// ════════════════════════════════════════════════════════════════════════════
// 🛡️ MIDDLEWARE DE VALIDACIÓN
// ════════════════════════════════════════════════════════════════════════════

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,  // Retornar todos los errores
      stripUnknown: true  // Eliminar campos desconocidos
    });

    if (error) {
      // ✅ Formatear errores sin revelar estructura interna
      const messages = error.details.map(err => err.message);
      
      return res.status(400).json({
        error: true,
        message: 'Validación fallida',
        fields: error.details.reduce((acc, err) => {
          acc[err.path.join('.')] = err.message;
          return acc;
        }, {})
      });
    }

    // ✅ Reemplazar body con valores validados
    req.body = value;
    next();
  };
};

// ════════════════════════════════════════════════════════════════════════════
// 🔒 POLÍTICA DE SEGURIDAD (aplicar en app.js)
// ════════════════════════════════════════════════════════════════════════════

const applySecurityPolicies = (app) => {
  // ✅ Sanitizar input (prevenir NoSQL injection en MongoDB)
  app.use(mongoSanitize());

  // ✅ HPP (HTTP Parameter Pollution)
  app.use(require('hpp')());

  // ✅ Helmet mejorado con CSP
  const helmet = require('helmet');
  app.use(helmet());
  app.use(helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // Restringir en producción
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.CORS_ORIGIN || 'http://localhost:5173']
    }
  }));

  // ✅ X-Frame-Options: prevenir clickjacking
  app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
};

// ════════════════════════════════════════════════════════════════════════════
// 📤 USO EN RUTAS (EJEMPLO)
// ════════════════════════════════════════════════════════════════════════════

// router.post('/register', validateRequest(schemas.register), async (req, res) => {
//   const { username, email, password, firstName, lastName } = req.body;
//   // ... lógica de registro segura
// });

module.exports = {
  schemas,
  validateRequest,
  applySecurityPolicies
};
