# 🚀 GUÍA RÁPIDA: UI de Configuración

## ✅ Lo que acabas de recibir

**Archivo creado**: `frontend/src/pages/dashboard/ConfiguracionFuentesDatos.jsx`

Es una UI React **completa y funcional** con 4 características clave:

1. ✅ **Upload Excel/CSV** → Sube archivo → backend procesa → guarda en BD
2. ✅ **Configurar EVO** → Con secrets guardados en backend (zero trust en frontend)
3. ✅ **Historial** → Tabla con fecha, entidad, estado, registros, duración
4. ✅ **Sync Now** → Botón para sincronización manual

---

## 🎯 Principio de Seguridad (Tu requerimiento)

```
┌──────────────┐                      ┌──────────────┐
│   FRONTEND   │   Solo dispara →    │   BACKEND    │
│   (React)    │                      │  (Node.js)   │
├──────────────┤                      ├──────────────┤
│ • Botones    │                      │ • API Keys   │
│ • Inputs     │   ← Datos seguros   │ • Tokens     │
│ • Gráficos   │                      │ • BD Write   │
│              │                      │ • EVO calls  │
└──────────────┘                      └──────────────┘
      🔓                                    🔒
  Sin secretos                       Todo sensible aquí
```

**El frontend NUNCA:**
- ❌ Guarda tokens en localStorage/sessionStorage
- ❌ Llama directamente a EVO
- ❌ Escribe en SQLite
- ❌ Expone credentials en código

**El backend siempre:**
- ✅ Valida requests
- ✅ Encripta secrets
- ✅ Hace las llamadas sensibles
- ✅ Devuelve solo datos necesarios

---

## 📦 Instalación y Uso

### 1️⃣ **Configurar Frontend**

```bash
cd frontend

# Instalar dependencias SI NO LO HICISTE
npm install

# Configurar variables de entorno
copy .env.example .env

# Editar .env
notepad .env
```

Contenido de `.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

### 2️⃣ **Iniciar Backend** (si no está corriendo)

```bash
# En otra terminal
cd ..\backend-data-intake

npm install
copy .env.example .env
# Editar .env (SQLite no requiere URI)
npm run dev
```

Verificar: http://localhost:5000/health

### 3️⃣ **Agregar Ruta en Frontend**

Editar: `frontend/src/App.jsx` o tu archivo de rutas:

```jsx
import ConfiguracionFuentesDatos from './pages/dashboard/ConfiguracionFuentesDatos';

// Dentro de tus <Routes>
<Route path="/configuracion/fuentes" element={<ConfiguracionFuentesDatos />} />
```

O si usas layout con sidebar, agregar en tu menú:

```jsx
<Link to="/configuracion/fuentes">
  ⚙️ Fuentes de Datos
</Link>
```

### 4️⃣ **Iniciar Frontend**

```bash
cd frontend
npm run dev
```

Abrir: http://localhost:5173

---

## 🎨 Cómo Usar la UI

### **Tab 1: Importar Archivos**

**Flujo completo:**

1. Selecciona tipo: Excel o CSV
2. Click "Seleccionar archivo"
3. Elige tu archivo `.xlsx` o `.csv`
4. Click "🚀 Importar Ahora"
5. Espera procesamiento (backend maneja todo)
6. Ve resultado:
   ```
   ✅ Importación Exitosa
   • 500 registros procesados
   • 480 clientes nuevos
   • 20 actualizados
   • 0 errores
   ```

**Mapeo automático de columnas:**

El código incluye mapeo básico:
```javascript
{
  'Nombre': 'nombre',
  'Correo': 'email',
  'Teléfono': 'telefono',
  'RFC': 'rfc',
  'Empresa': 'empresa'
}
```

**Para personalizar el mapeo**, edita línea 52 de `ConfiguracionFuentesDatos.jsx`.

---

### **Tab 2: Configurar EVO**

**Campos requeridos:**

1. **Nombre**: Identificador amigable (ej: "EVO Producción")
2. **Instance/DNS** (opcional): `miempresa.evo.com`
3. **Base URL**: `https://api.evo.com`
4. **API Key**: Tu token/key de EVO

**Botones:**

- **🔍 Probar Conexión**: 
  - Hace llamada GET a `/clientes` (1 registro)
  - Muestra latencia
  - Verifica que credentials son válidos

- **💾 Guardar Configuración**:
  - Envía config al backend
  - Backend **encripta el API Key**
  - Frontend limpia el campo (seguridad)

**Resultado exitoso:**
```
✅ Conexión exitosa
Latencia: 45ms
```

**Seguridad:**
```javascript
// Lo que hace el frontend:
POST /api/sources/api/save
{
  "baseURL": "https://api.evo.com",
  "headers": { "Authorization": "Bearer abc123" }
}

// Backend lo guarda encriptado en BD:
{
  "_id": "...",
  "baseURL": "https://api.evo.com",
  "headers": "***ENCRYPTED***"  // No legible
}
```

---

### **Tab 3: Historial**

**Muestra tabla con:**

| Columna | Descripción |
|---------|-------------|
| **Fecha/Hora** | Cuándo ocurrió la sincronización |
| **Fuente** | EVO, Excel, CSV, W12, webhook |
| **Registros** | Total procesados |
| **Insertados** | Nuevos en BD |
| **Actualizados** | Existentes modificados |
| **Estado** | ✅ Éxito / ⚠️ Parcial / ❌ Error |
| **Duración** | Tiempo en segundos |

**Botones:**

- **🔄 Sync Now**: Ejecuta sincronización manual desde EVO
- **🔄 Refrescar**: Recarga la tabla

**Ejemplo de uso Sync Now:**

1. Click "🔄 Sync Now"
2. Backend ejecuta:
   - GET a EVO para traer cambios desde última sync
   - Procesa y normaliza datos
  - Inserta/actualiza en SQLite
   - Registra en syncLog
3. UI muestra resultado:
   ```
   ✅ Sincronización Exitosa
   • Clientes nuevos: 12
   • Clientes actualizados: 45
   • Ventas nuevas: 8
   • Duración: 1250ms
   ```
4. Tabla se actualiza automáticamente

---

## 🧪 Testing End-to-End

### **Test 1: Upload Excel**

```bash
# Crear archivo de prueba clientes.xlsx con columnas:
# Nombre | Correo | Teléfono | RFC | Empresa

# Subir desde UI → Ver resultado
```

**Verificar en SQLite:**
```bash
sqlite3 ../../backend/db.sqlite3 "SELECT * FROM clientes LIMIT 5;"
```

### **Test 2: Configurar EVO (simulación)**

Si no tienes credenciales EVO reales, usa modo test del backend:

1. Ingresa URL fake: `https://api.fake-evo.com`
2. API Key fake: `test-key-123`
3. Click "Probar Conexión"
4. Backend responde con simulación (código ya preparado)

### **Test 3: Sync Now**

Requiere configuración EVO guardada:

1. Guarda config EVO (paso anterior)
2. Click "🔄 Sync Now"
3. Backend intenta sincronizar (puede fallar si EVO no es real)
4. Ve resultado en historial

---

## 🔧 Personalización

### **Cambiar colores**

Busca en el código:
```javascript
background: '#2563eb'  // Azul primario
background: '#10b981'  // Verde éxito
background: '#ef4444'  // Rojo error
```

### **Agregar más entidades**

En Sync Now, línea 165:
```javascript
entidades: ['clientes', 'ventas', 'leads']  // Agregar 'leads'
```

### **Cambiar mapeo automático**

Línea 52-62, modifica el objeto `mapeo`:
```javascript
const mapeo = {
  'Tu Columna Excel': 'campo_bd',
  'Fecha Alta': 'createdAt',
  'Membresía': 'membresia.tipo'
};
```

---

## 🐛 Troubleshooting

### Error: "Network Error"

**Causa**: Backend no está corriendo o URL incorrecta

**Solución**:
```bash
# Verificar backend
curl http://localhost:5000/health

# Si no responde, iniciar:
cd backend-data-intake
npm run dev
```

### Error: "CORS policy"

**Causa**: Backend no permite requests desde frontend

**Solución**: En `backend-data-intake/src/server.js` línea 25:
```javascript
cors({
  origin: 'http://localhost:5173',  // Verificar puerto de Vite
  credentials: true
})
```

### Upload falla con "File too large"

**Causa**: Límite de 50MB por defecto

**Solución**: Aumentar en `backend-data-intake/.env`:
```env
MAX_FILE_SIZE_MB=100
```

### Sincronización devuelve 0 registros

**Causa**: EVO no tiene cambios desde última sync (incremental)

**Prueba**: Cambiar a modo "full" en línea 163:
```javascript
modo: 'full',  // En vez de 'incremental'
```

---

## 📊 Flujo Completo de Datos

```
User → Frontend UI → Backend API → EVO/SQLite → Frontend Stats

1. User sube Excel
        ↓
2. Frontend POST /api/import/excel
        ↓
3. Backend procesa con ExcelJS
        ↓
4. Backend normaliza → SQLite
        ↓
5. Backend recalcula stats
        ↓
6. Frontend recibe resultado
        ↓
7. Frontend dispara evento 'refreshStats'
        ↓
8. Dashboard actualiza métricas automáticamente
```

---

## ✅ Checklist de Implementación

- [x] UI creada (`ConfiguracionFuentesDatos.jsx`)
- [x] `.env.example` con `VITE_API_URL`
- [ ] Agregar ruta en `App.jsx`
- [ ] Iniciar backend (`npm run dev`)
- [ ] Iniciar frontend (`npm run dev`)
- [ ] Probar upload Excel
- [ ] Probar config EVO
- [ ] Verificar historial

---

## 🚀 Próximo Paso

**Para integrar completamente:**

1. Agrega la ruta en tu router
2. Crea un botón en sidebar: "⚙️ Configuración"
3. Conecta el evento `refreshStats` a tu dashboard para actualizar gráficos automáticamente

**¿Necesitas ayuda con alguno de estos pasos?**
