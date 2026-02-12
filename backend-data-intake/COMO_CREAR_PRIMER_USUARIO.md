# 👤 Cómo Crear el Primer Usuario Owner

Tienes **DOS OPCIONES** para crear el primer usuario administrador (owner) en el sistema.

---

## 🚀 OPCIÓN 1: Seed automático al iniciar (Recomendado)

El sistema creará automáticamente el usuario owner cuando inicies el servidor **SI**:
- La base de datos está vacía (sin usuarios)
- Has configurado `SEED_OWNER_PASSWORD` en el archivo `.env`

### Pasos:

1. **Abre el archivo `.env`**

2. **Configura tu contraseña personal:**
   ```env
   SEED_OWNER_EMAIL=admin@sharkfit.com
   SEED_OWNER_PASSWORD=TuPasswordSuperSegura123!@#
   SEED_OWNER_FIRSTNAME=Admin
   SEED_OWNER_LASTNAME=Principal
   SEED_OWNER_USERNAME=admin
   ```

3. **Inicia el servidor:**
   ```bash
   npm start
   ```

4. **Verás en los logs:**
   ```
   ✅ Usuario owner creado automáticamente
   📧 Email: admin@sharkfit.com
   ```

5. **Ya puedes hacer login** con el email y password que configuraste

### ⚠️ Requisitos de la contraseña:
- **Mínimo 8 caracteres** (obligatorio)
- **Recomendado 16+ caracteres** para mayor seguridad
- Combina mayúsculas, minúsculas, números y símbolos
- Ejemplo: `kJ#8mN$pL2@qR5tX9vW!zC7bD4fG6h`

### 🔒 Seguridad:
- Esta contraseña es **TUYA** - nadie más debe saberla
- El archivo `.env` **NO debe subirse a git** (ya incluido en `.gitignore`)
- Después de crear el usuario, puedes vaciar `SEED_OWNER_PASSWORD` en el `.env` si quieres

---

## 🖥️ OPCIÓN 2: Script interactivo (Más control)

Si prefieres un proceso guiado paso a paso, usa el script interactivo.

### Pasos:

1. **Ejecuta el comando:**
   ```bash
   npm run create-owner
   ```

2. **Sigue las indicaciones:**
   ```
   👤 CREAR PRIMER USUARIO OWNER
   =================================================================
   
   📝 Ingresa los datos del usuario owner:
   
   Nombre: Juan
   Apellido: Pérez
   Username: juanperez
   Email: juan@sharkfit.com
   
   Contraseña (mínimo 8 caracteres): ****************
   Confirmar contraseña: ****************
   
   📋 CONFIRMA LOS DATOS:
   Nombre:   Juan Pérez
   Username: juanperez
   Email:    juan@sharkfit.com
   Password: **************** (16 caracteres)
   Role:     owner
   
   ¿Crear usuario? (S/n): s
   ```

3. **El script creará el usuario:**
   ```
   ✅ USUARIO OWNER CREADO EXITOSAMENTE
   📧 Email:    juan@sharkfit.com
   👤 Username: juanperez
   🔑 Role:     owner
   
   💡 Ahora puedes hacer login con estas credenciales
   ```

### Ventajas del script interactivo:
- ✅ Validación en tiempo real
- ✅ Confirmación de contraseña
- ✅ No necesitas editar el `.env`
- ✅ Las credenciales nunca quedan en archivos de configuración

---

## 🤔 ¿Cuál opción elegir?

| Criterio | Seed automático | Script interactivo |
|----------|-----------------|-------------------|
| **Facilidad** | ⭐⭐⭐ Simple | ⭐⭐ Requiere interacción |
| **Seguridad** | ⭐⭐ Password en .env | ⭐⭐⭐ No queda en archivos |
| **Automatización** | ⭐⭐⭐ Ideal para CI/CD | ⭐ Manual |
| **Producción** | ✅ Recomendado | ⚠️ Solo para debug |
| **Desarrollo** | ✅ Muy cómodo | ✅ También funciona |

### Recomendación:
- **Desarrollo local**: Usa el seed automático (Opción 1)
- **Producción**: Usa el seed automático con password fuerte y única
- **Testing/Debug**: Usa el script interactivo (Opción 2)

---

## 🔄 Crear usuarios adicionales

Una vez tengas el primer usuario owner, puedes:

1. **Hacer login** con las credenciales del owner
2. **Desde el dashboard** crear más usuarios con diferentes roles
3. El owner puede crear: admin, manager, staff, viewer, instructor, etc.

---

## ❓ Preguntas Frecuentes

### ¿Qué pasa si la password del .env es débil?
El sistema te advertirá en los logs si tiene menos de 16 caracteres, pero igual la aceptará (mínimo 8 caracteres).

### ¿Puedo cambiar la password del owner después?
Sí, desde el dashboard en `/account` puedes cambiar tu contraseña.

### ¿Qué hago si olvidé la password del owner?
1. Detén el servidor
2. Borra el usuario de la base de datos manualmente (MongoDB Compass o mongosh)
3. Vuelve a ejecutar el seed con una nueva password

### ¿Puede haber más de un usuario owner?
Sí, pero el seed solo crea uno automáticamente. Puedes ejecutar `npm run create-owner` varias veces si necesitas múltiples owners.

### ¿Debo borrar la password del .env después de crear el usuario?
Es recomendable si quieres mayor seguridad, pero no es obligatorio. El seed solo se ejecuta si no hay usuarios en la DB.

---

## 🛡️ Mejores Prácticas

1. **Passwords fuertes**: Mínimo 16 caracteres con variedad
2. **No reutilices passwords**: Usa una única para este sistema
3. **Protege el .env**: Nunca lo subas a repositorios públicos
4. **Cambia passwords periódicamente**: Cada 3-6 meses en producción
5. **Usa gestores de passwords**: LastPass, 1Password, Bitwarden, etc.

---

¿Necesitas ayuda? Revisa los logs del servidor al iniciar para ver mensajes de error específicos.
