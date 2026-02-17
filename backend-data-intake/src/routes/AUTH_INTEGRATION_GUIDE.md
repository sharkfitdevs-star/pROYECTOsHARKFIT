/**
 * 📝 HOW TO INTEGRATE EVENT-DRIVEN INTO auth.js
 * Cambios exactos a realizar en tu archivo auth.js existente
 */

// ========================================
// PASO 1: Agregar estas imports al inicio
// ========================================

// En la parte superior de auth.js, después de los otros requires:

const { getEventBus } = require('../events/EventBus');
const eventTypes = require('../events/eventTypes');

// Obtener la instancia del bus
const eventBus = getEventBus();


// ========================================
// PASO 2: MODIFICAR POST /register
// ========================================

/**
 * UBICACIÓN: Alrededor de línea 150 en auth.js
 * 
 * CAMBIO: Agregar evento después de guardar usuario
 */

// ANTES:
// await nuevoUsuario.save();
// if (REQUIRE_EMAIL_VERIFICATION) { ... }

// DESPUÉS: (reemplazar el bloque completo)

await nuevoUsuario.save();

// 🚀 NUEVO: Emitir evento de usuario creado
eventBus.publish(eventTypes.USER.CREATED, {
  userId: nuevoUsuario._id.toString(),
  email: nuevoUsuario.email,
  firstName: nuevoUsuario.firstName,
  lastName: nuevoUsuario.lastName,
  fullName: nuevoUsuario.fullName,
  role: nuevoUsuario.role,
  signupSource: 'web'
});

if (REQUIRE_EMAIL_VERIFICATION) {
  // ... resto del código ...
}


// ========================================
// PASO 3: MODIFICAR POST /login
// ========================================

/**
 * UBICACIÓN: POST /api/auth/login (alrededor de línea 300+)
 * 
 * CAMBIO: Emitir eventos en login exitoso y fallido
 */

// Encontrar este código en login:
// const user = await Usuario.findOne({ ... })
// if (!user || !await bcrypt.compare(password, user.password)) { ... }

// AGREGAR DESPUÉS:

if (!user || !(await bcrypt.compare(password, user.password))) {
  // 🚀 NUEVO: Emitir evento de login fallido
  eventBus.publish(eventTypes.AUTH.LOGIN_FAILED, {
    email,
    reason: user ? 'invalid_password' : 'user_not_found',
    ipAddress: getClientMeta(req).ip,
    userAgent: getClientMeta(req).userAgent,
    attempt: 1
  });

  return res.status(401).json({
    error: true,
    message: 'Usuario o contraseña incorrectos'
  });
}

// ... generar tokens ...

// 🚀 NUEVO: Emitir evento de login exitoso (ANTES DE RESPONDER)
eventBus.publish(eventTypes.AUTH.LOGIN_SUCCESS, {
  userId: user._id.toString(),
  email: user.email,
  firstName: user.firstName,
  ipAddress: getClientMeta(req).ip,
  userAgent: getClientMeta(req).userAgent,
  method: 'email'
});

// Luego responder normalmente
res.status(200).json({
  success: true,
  accessToken,
  // ...
});


// ========================================
// PASO 4: MODIFICAR POST /logout
// ========================================

/**
 * UBICACIÓN: POST /api/auth/logout
 * 
 * CAMBIO: Emitir evento de logout
 */

router.post('/logout', requireAuth, async (req, res) => {
  try {
    // Tu código actual...
    
    // 🚀 NUEVO: Emitir evento de logout
    eventBus.publish(eventTypes.AUTH.LOGOUT, {
      userId: req.user.id,
      email: req.user.email,
      timestamp: new Date()
    });

    clearRefreshCookie(res);
    res.json({ success: true, message: 'Logout exitoso' });
  } catch (error) {
    res.status(500).json({ error: true, message: 'Error en logout' });
  }
});


// ========================================
// PASO 5: MODIFICAR PASSWORD RESET
// ========================================

/**
 * UBICACIÓN: POST /api/auth/password-reset-confirm
 * 
 * CAMBIO: Emitir evento cuando se cambia contraseña
 */

// Después de actualizar la contraseña:

await usuario.save();

// 🚀 NUEVO: Emitir evento de cambio de contraseña
eventBus.publish(eventTypes.AUTH.PASSWORD_CHANGED, {
  userId: usuario._id.toString(),
  email: usuario.email,
  ipAddress: getClientMeta(req).ip,
  timestamp: new Date()
});

res.json({
  success: true,
  message: 'Contraseña cambiada exitosamente'
});


// ========================================
// PASO 6: VERIFICACIÓN DE EMAIL
// ========================================

/**
 * UBICACIÓN: POST /api/auth/verify-email
 * 
 * CAMBIO: Emitir evento cuando email es verificado
 */

// Después de marcar email como verificado:

user.status = 'active';
await user.save();

// 🚀 NUEVO: Emitir evento de email verificado
eventBus.publish(eventTypes.USER.EMAIL_VERIFIED, {
  userId: user._id.toString(),
  email: user.email,
  firstName: user.firstName,
  timestamp: new Date()
});

res.json({
  success: true,
  message: 'Email verificado exitosamente',
  accessToken: signAccessToken(user)
});


// ========================================
// RESUMEN DE CAMBIOS
// ========================================

/*
Cambios realizados:

1. Imports (al inicio)
   + const { getEventBus } = require('../events/EventBus');
   + const eventTypes = require('../events/eventTypes');
   + const eventBus = getEventBus();

2. POST /register
   + eventBus.publish(eventTypes.USER.CREATED, { ... })

3. POST /login
   + eventBus.publish(eventTypes.AUTH.LOGIN_FAILED, { ... })
   + eventBus.publish(eventTypes.AUTH.LOGIN_SUCCESS, { ... })

4. POST /logout
   + eventBus.publish(eventTypes.AUTH.LOGOUT, { ... })

5. Password Reset
   + eventBus.publish(eventTypes.AUTH.PASSWORD_CHANGED, { ... })

6. Email Verification
   + eventBus.publish(eventTypes.USER.EMAIL_VERIFIED, { ... })

Total: ~20 líneas de código nuevas
Impacto: Auth ahora es Event-Driven ✅
*/


// ========================================
// ARCHIVOS AFECTADOS
// ========================================

/*
Archivos que necesitan estos cambios:
1. backend-data-intake/src/routes/auth.js (este archivo)

Archivos que YA ESTÁN listos:
✅ backend-data-intake/src/events/EventBus.js
✅ backend-data-intake/src/services/EmailEventService.js
✅ backend-data-intake/src/services/NotificationEventService.js
✅ backend-data-intake/src/services/AuditLogEventService.js
✅ backend-data-intake/src/services/AnalyticsEventService.js
✅ backend-data-intake/src/services/WebhookEventService.js
✅ backend-data-intake/src/events/eventTypes.js
*/


// ========================================
// PRUEBA DE INTEGRACIÓN
// ========================================

/*
Después de hacer estos cambios:

1. Iniciar MongoDB (local o Atlas)
2. Iniciar backend: npm start
3. Hacer POST /register
   ✅ User creado en BD en 100ms
   ✅ Evento emitido
   ✅ Response al usuario en 115ms
   ✅ Luego async:
      - Email enviado (EmailService)
      - Notificación creada (NotificationService)
      - Auditoría registrada (AuditLogService)
      - Métricas actualizadas (AnalyticsService)
      - Slack notificado (WebhookService)

4. Verificar que el usuario fue creado: GET /api/auth/test-native-mongo
5. Revisar que Slack recibió notificación (si está configurado)
*/
