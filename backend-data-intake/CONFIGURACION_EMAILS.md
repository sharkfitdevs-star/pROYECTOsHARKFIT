# 📧 CONFIGURACIÓN DE EMAILS

## ✅ **YA COMPLETADO**

El sistema de emails **ya está implementado** y funcionando en modo `console` (desarrollo).

### **Estado Actual**

- ✅ Servicio de email implementado en [src/utils/email.js](src/utils/email.js)
- ✅ Templates HTML profesionales para:
  - Verificación de email
  - Reset de password
- ✅ Soporte para múltiples proveedores (SendGrid, Mailgun, Console)
- ✅ Integrado en rutas de autenticación

---

## 🔧 **MODO DESARROLLO (ACTUAL)**

**Configuración en `.env`**:
```env
EMAIL_PROVIDER=console
EMAIL_FROM=noreply@sharkfit.com
FRONTEND_URL=http://localhost:5173
```

**¿Cómo funciona?**

Los emails se imprimen en la **consola del servidor** en lugar de enviarse:

```
================================================================================
📧 EMAIL SIMULADO (DESARROLLO)
================================================================================
Para:     usuario@example.com
De:       noreply@sharkfit.com
Asunto:   Verifica tu cuenta SharkFit
--------------------------------------------------------------------------------
Contenido:
Bienvenido Juan!

Para activar tu cuenta, visita este enlace:
http://localhost:5173/verify-email?token=abc123...
================================================================================
```

**Ventajas**:
- ✅ No requiere configuración de terceros
- ✅ Puedes copiar el token de la consola manualmente
- ✅ Perfecto para desarrollo y testing

---

## 🚀 **MODO PRODUCCIÓN**

### **Opción 1: SendGrid (Recomendado)**

**Plan Gratuito**: 100 emails/día

#### **1. Crear cuenta**
1. Ir a [https://sendgrid.com/pricing/](https://sendgrid.com/pricing/)
2. Crear cuenta gratuita
3. Verificar email

#### **2. Obtener API Key**
1. Dashboard → Settings → API Keys
2. Click "Create API Key"
3. Nombre: `sharkfit-production`
4. Permisos: **Full Access**
5. Copiar API Key (solo se muestra una vez)

#### **3. Configurar en `.env.production`**
```env
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=noreply@sharkfit.com
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FRONTEND_URL=https://dashboard.sharkfit.com
```

#### **4. Verificar dominio (opcional pero recomendado)**
1. SendGrid → Settings → Sender Authentication
2. Authenticate Your Domain
3. Agregar registros DNS (SPF, DKIM, CNAME)
4. Mejora deliverability y evita spam

#### **5. Instalar dependencia**
```bash
npm install @sendgrid/mail
```

---

### **Opción 2: Mailgun**

**Plan Gratuito**: 5,000 emails/mes (primeros 3 meses)

#### **1. Crear cuenta**
1. Ir a [https://www.mailgun.com/](https://www.mailgun.com/)
2. Crear cuenta (requiere tarjeta, pero plan gratuito disponible)

#### **2. Obtener credenciales**
1. Dashboard → API Keys
2. Copiar Private API Key
3. Copiar Domain (ej: `mg.tudominio.com` o usar sandbox)

#### **3. Configurar en `.env.production`**
```env
EMAIL_PROVIDER=mailgun
EMAIL_FROM=noreply@sharkfit.com
MAILGUN_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MAILGUN_DOMAIN=mg.sharkfit.com
FRONTEND_URL=https://dashboard.sharkfit.com
```

#### **4. Instalar dependencia**
```bash
npm install mailgun-js
```

---

## 🧪 **TESTING**

### **Test en desarrollo (console)**

1. Iniciar servidor:
   ```bash
   npm run dev
   ```

2. Registrar usuario desde frontend

3. Ver email en consola:
   ```
   📧 EMAIL SIMULADO (DESARROLLO)
   ...token en la URL...
   ```

4. Copiar token y visitar manualmente:
   ```
   http://localhost:5173/verify-email?token=TOKEN_AQUI
   ```

---

### **Test en producción (antes de deploy)**

1. Configurar SendGrid/Mailgun en `.env` (local)

2. Cambiar temporalmente:
   ```env
   EMAIL_PROVIDER=sendgrid  # o mailgun
   ```

3. Registrar usuario de prueba

4. Verificar que llegue email real

5. Validar:
   - ✅ Email recibido en inbox (no spam)
   - ✅ Enlaces funcionan correctamente
   - ✅ Templates se ven correctos

---

## ⚙️ **PERSONALIZACIÓN**

### **Cambiar remitente (FROM)**

```env
EMAIL_FROM=soporte@sharkfit.com
```

⚠️ **Importante**: El dominio debe estar verificado en SendGrid/Mailgun

---

### **Modificar templates**

Editar [src/utils/email.js](src/utils/email.js):

```javascript
// Función sendVerificationEmail (línea ~150)
html: `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      /* TU CSS PERSONALIZADO */
    </style>
  </head>
  <body>
    <!-- TU TEMPLATE PERSONALIZADO -->
  </body>
  </html>
`
```

---

### **Agregar nuevo tipo de email**

Ejemplo: Email de bienvenida después de verificar

```javascript
// En src/utils/email.js
const sendWelcomeEmail = async (user) => {
  await sendEmail({
    to: user.email,
    subject: '¡Bienvenido a SharkFit!',
    html: `
      <h1>Hola ${user.firstName}!</h1>
      <p>Tu cuenta ha sido activada exitosamente.</p>
    `
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail  // ✅ Exportar nueva función
};
```

Usar en [src/routes/auth.js](src/routes/auth.js):

```javascript
// Después de verificar email
await sendWelcomeEmail(user);
```

---

## 🔍 **TROUBLESHOOTING**

### **Error: "Cannot find module '@sendgrid/mail'"**

**Solución**:
```bash
npm install @sendgrid/mail
```

---

### **Emails van a spam**

**Soluciones**:
1. ✅ Verificar dominio en SendGrid/Mailgun (SPF/DKIM)
2. ✅ Usar dominio propio en `EMAIL_FROM` (no @gmail.com)
3. ✅ Agregar texto plano además de HTML
4. ✅ Evitar palabras spam: "gratis", "oferta", "urgente"

---

### **SendGrid rechaza email: "The from address does not match a verified Sender Identity"**

**Solución**:
1. SendGrid → Settings → Sender Authentication
2. Verificar Single Sender (individual email) O
3. Verificar Domain (dominio completo - recomendado)

---

### **Emails no llegan en producción (sin errores)**

**Verificar**:
1. API Key correcta en `.env.production`
2. `EMAIL_PROVIDER` configurado (`sendgrid` o `mailgun`)
3. Logs del servidor:
   ```bash
   pm2 logs sharkfit-api
   ```
4. Dashboard de SendGrid/Mailgun → Activity → ver status

---

## 📊 **MONITOREO**

### **SendGrid Dashboard**

- **Activity**: Ver todos los emails enviados/rechazados
- **Statistics**: Métricas de deliverability
- **Alerts**: Configurar alertas de bounce/spam

### **Mailgun Dashboard**

- **Logs**: Historial completo de emails
- **Analytics**: Tasas de apertura/click (requiere tracking)
- **Suppressions**: Lista de bounces/spam complaints

---

## 🎯 **CHECKLIST PRODUCCIÓN**

- [ ] API Key de SendGrid/Mailgun configurada
- [ ] `EMAIL_PROVIDER` correcto en `.env.production`
- [ ] `EMAIL_FROM` usa dominio verificado
- [ ] `FRONTEND_URL` apunta a dominio de producción
- [ ] Dominio verificado (SPF/DKIM configurados)
- [ ] Test de email enviado exitosamente
- [ ] Email llega a inbox (no spam)
- [ ] Enlaces en email funcionan correctamente

---

## 💡 **PRÓXIMOS PASOS**

Después de configurar emails en producción:

1. **Habilitar verificación de email obligatoria**:
   ```env
   REQUIRE_EMAIL_VERIFICATION=true
   ```

2. **Monitorear deliverability** primeras 24h

3. **Opcional: Agregar más templates**:
   - Bienvenida al verificar
   - Notificación de login desde nueva ubicación
   - Cambio de password exitoso
   - Sesión cerrada por seguridad

---

**Última actualización**: Febrero 12, 2026  
**Sistema de emails**: ✅ Implementado y listo para producción
