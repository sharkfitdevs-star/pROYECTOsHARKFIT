# CONFIGURACIÓN DEL MIDDLEWARE EVO

## 📋 Requisitos Previos

1. Node.js instalado (v14 o superior)
2. Acceso a la API de Evo
3. Credenciales de Evo

## 🚀 Pasos para Configurar el Middleware

### 1. Crear el archivo del servidor

Crea un archivo `server.js` en tu carpeta del middleware con el siguiente contenido:

```javascript
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3000;

// Configuración de CORS - IMPORTANTE para que funcione con AgentUI
app.use(cors({
  origin: '*', // En producción, especifica tu dominio
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Configuración de Evo - REEMPLAZA CON TUS CREDENCIALES
const EVO_CONFIG = {
  baseURL: 'https://tu-instancia-evo.com/api', // URL de tu instancia Evo
  apiKey: 'TU_API_KEY_AQUI', // Tu API Key de Evo
  instanceId: 'TU_INSTANCE_ID' // Tu Instance ID
};

// Cliente Axios configurado para Evo
const evoClient = axios.create({
  baseURL: EVO_CONFIG.baseURL,
  headers: {
    'Authorization': `Bearer ${EVO_CONFIG.apiKey}`,
    'Content-Type': 'application/json'
  }
});

// ============================================================
// ENDPOINTS
// ============================================================

// Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Middleware Evo funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Obtener Contactos
app.get('/api/contacts', async (req, res) => {
  try {
    const response = await evoClient.get(`/instances/${EVO_CONFIG.instanceId}/contacts`);
    res.json({
      success: true,
      data: response.data || []
    });
  } catch (error) {
    console.error('Error obteniendo contactos:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo contactos de Evo',
      details: error.message
    });
  }
});

// Obtener Chats
app.get('/api/chats', async (req, res) => {
  try {
    const response = await evoClient.get(`/instances/${EVO_CONFIG.instanceId}/chats`);
    res.json({
      success: true,
      data: response.data || []
    });
  } catch (error) {
    console.error('Error obteniendo chats:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo chats de Evo',
      details: error.message
    });
  }
});

// Obtener Grupos
app.get('/api/groups', async (req, res) => {
  try {
    const response = await evoClient.get(`/instances/${EVO_CONFIG.instanceId}/groups`);
    res.json({
      success: true,
      data: response.data || []
    });
  } catch (error) {
    console.error('Error obteniendo grupos:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo grupos de Evo',
      details: error.message
    });
  }
});

// Obtener Mensajes
app.get('/api/messages', async (req, res) => {
  try {
    const response = await evoClient.get(`/instances/${EVO_CONFIG.instanceId}/messages`);
    res.json({
      success: true,
      data: response.data || []
    });
  } catch (error) {
    console.error('Error obteniendo mensajes:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo mensajes de Evo',
      details: error.message
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Middleware Evo corriendo en http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📱 Endpoints disponibles:`);
  console.log(`   - GET /api/contacts`);
  console.log(`   - GET /api/chats`);
  console.log(`   - GET /api/groups`);
  console.log(`   - GET /api/messages`);
});
```

### 2. Instalar dependencias

```bash
npm init -y
npm install express cors axios
```

### 3. Configurar tus credenciales

Edita el archivo `server.js` y reemplaza:
- `baseURL`: URL de tu instancia de Evo
- `apiKey`: Tu API Key de Evo
- `instanceId`: Tu Instance ID de Evo

### 4. Iniciar el servidor

```bash
node server.js
```

Deberías ver:
```
🚀 Middleware Evo corriendo en http://localhost:3000
📊 Health check: http://localhost:3000/health
```

### 5. Probar la conexión

```bash
# Verificar estado
curl http://localhost:3000/health

# Probar endpoints
curl http://localhost:3000/api/contacts
curl http://localhost:3000/api/chats
curl http://localhost:3000/api/groups
curl http://localhost:3000/api/messages
```

## 🔧 Solución de Problemas

### Error: "CORS policy"
- Asegúrate de que el middleware tenga `cors` instalado y configurado
- Verifica que el servidor esté corriendo en el puerto correcto

### Error: "Connection refused"
- Verifica que el middleware esté corriendo: `node server.js`
- Comprueba que el puerto 3000 no esté ocupado

### Error: "Unauthorized" o "403"
- Verifica tus credenciales de Evo (apiKey, instanceId)
- Comprueba que tu API Key tenga los permisos necesarios

### Error: "Network error"
- Verifica tu conexión a internet
- Comprueba que la URL de Evo sea correcta
- Asegúrate de que Evo esté accesible

## 📝 Notas Importantes

1. **Seguridad**: En producción, NO uses `origin: '*'` en CORS. Especifica tu dominio exacto.
2. **Variables de entorno**: Considera usar `.env` para las credenciales:
   ```bash
   npm install dotenv
   ```
   
   Luego crea `.env`:
   ```
   EVO_BASE_URL=https://tu-instancia-evo.com/api
   EVO_API_KEY=tu_api_key
   EVO_INSTANCE_ID=tu_instance_id
   PORT=3000
   ```

3. **Logs**: El servidor imprime logs en consola para debugging

## 🌐 Despliegue en Producción

Para usar en producción (ventasprueba.sharkfit.info):

1. Despliega el middleware en un servidor (Heroku, Railway, DigitalOcean, etc.)
2. Actualiza la URL en el componente SeccionEvo
3. Configura CORS para permitir solo tu dominio
4. Usa HTTPS

## 📚 Documentación de Evo

Consulta la documentación oficial de Evo para más endpoints y opciones:
- https://doc.evolution-api.com/