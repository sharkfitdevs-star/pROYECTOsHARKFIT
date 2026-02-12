# 🤖 CONFIGURACIÓN DE AUTOMATIZACIÓN HORARIA

## 📋 Función Creada

**Archivo:** `functions/automatizacionHoraria.js`

**Endpoint:** `/api/automatizacionHoraria`

**Descripción:** Ejecuta automáticamente cada hora:
1. Sincronización de Onboarding Clientes
2. Escalamiento de Deudores ARS

---

## ⚙️ Configuración del Trigger Automático

### **Opción 1: Usar un Servicio de Cron Externo (Recomendado)**

#### **1.1 Usando cron-job.org (Gratis)**

1. Ve a https://cron-job.org/
2. Crea una cuenta gratuita
3. Crea un nuevo Cron Job:
   - **URL:** `https://ventasprueba.sharkfit.info/api/automatizacionHoraria`
   - **Método:** POST
   - **Headers:**
     ```
     Content-Type: application/json
     x-server-key: 2fa50294-e781-4ad8-abe4-78f21167d053
     ```
   - **Schedule:** Cada hora (0 * * * *)
   - **Body:** `{}`

4. Guarda y activa el job

#### **1.2 Usando EasyCron (Gratis hasta 20 jobs)**

1. Ve a https://www.easycron.com/
2. Registra una cuenta
3. Crea un nuevo Cron Job:
   - **URL:** `https://ventasprueba.sharkfit.info/api/automatizacionHoraria`
   - **Cron Expression:** `0 * * * *` (cada hora)
   - **HTTP Method:** POST
   - **HTTP Headers:**
     ```
     Content-Type: application/json
     x-server-key: 2fa50294-e781-4ad8-abe4-78f21167d053
     ```

#### **1.3 Usando Zapier (Si ya tienes cuenta)**

1. Crea un nuevo Zap
2. **Trigger:** Schedule by Zapier
   - Frequency: Every Hour
3. **Action:** Webhooks by Zapier
   - Action Event: POST
   - URL: `https://ventasprueba.sharkfit.info/api/automatizacionHoraria`
   - Headers:
     ```
     Content-Type: application/json
     x-server-key: 2fa50294-e781-4ad8-abe4-78f21167d053
     ```
   - Data: `{}`

---

### **Opción 2: Usar GitHub Actions (Gratis)**

Crea un archivo `.github/workflows/hourly-automation.yml`:

\`\`\`yaml
name: Automatización Horaria Sharkfit

on:
  schedule:
    # Ejecutar cada hora
    - cron: '0 * * * *'
  workflow_dispatch: # Permite ejecución manual

jobs:
  run-automation:
    runs-on: ubuntu-latest
    steps:
      - name: Ejecutar Automatización
        run: |
          curl -X POST https://ventasprueba.sharkfit.info/api/automatizacionHoraria \
            -H "Content-Type: application/json" \
            -H "x-server-key: 2fa50294-e781-4ad8-abe4-78f21167d053" \
            -d '{}'
\`\`\`

---

### **Opción 3: Servidor Propio con Crontab**

Si tienes un servidor Linux:

1. Edita el crontab:
   \`\`\`bash
   crontab -e
   \`\`\`

2. Agrega esta línea:
   \`\`\`bash
   0 * * * * curl -X POST https://ventasprueba.sharkfit.info/api/automatizacionHoraria -H "Content-Type: application/json" -H "x-server-key: 2fa50294-e781-4ad8-abe4-78f21167d053" -d '{}'
   \`\`\`

---

## 🧪 Probar la Función Manualmente

### **Desde la terminal:**

\`\`\`bash
curl -X POST https://ventasprueba.sharkfit.info/api/automatizacionHoraria \
  -H "Content-Type: application/json" \
  -H "x-server-key: 2fa50294-e781-4ad8-abe4-78f21167d053" \
  -d '{}'
\`\`\`

### **Desde Python:**

\`\`\`python
import requests

url = "https://ventasprueba.sharkfit.info/api/automatizacionHoraria"
headers = {
    "Content-Type": "application/json",
    "x-server-key": "2fa50294-e781-4ad8-abe4-78f21167d053"
}

response = requests.post(url, json={}, headers=headers)
print(response.json())
\`\`\`

### **Desde JavaScript/Node.js:**

\`\`\`javascript
const response = await fetch('https://ventasprueba.sharkfit.info/api/automatizacionHoraria', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-server-key': '2fa50294-e781-4ad8-abe4-78f21167d053'
    },
    body: JSON.stringify({})
});

const result = await response.json();
console.log(result);
\`\`\`

---

## 📊 Respuesta Esperada

\`\`\`json
{
  "success": true,
  "summary": {
    "success": true,
    "timestamp": "2024-01-15T10:00:00.000Z",
    "sincronizacionStatus": "OK",
    "escalarDeudoresStatus": "OK",
    "totalErrors": 0
  },
  "details": {
    "timestamp": "2024-01-15T10:00:00.000Z",
    "sincronizacionOnboarding": {
      // Respuesta de la API de sincronización
    },
    "escalarDeudores": {
      // Respuesta de la API de escalamiento
    },
    "errors": []
  }
}
\`\`\`

---

## 🔍 Monitoreo y Logs

### **Ver logs en AgentUI:**

1. Ve a la consola de AgentUI
2. Navega a **Functions** → **automatizacionHoraria**
3. Revisa los logs de ejecución

### **Logs que verás:**

- ✅ `Ejecutando sincronización de onboarding clientes...`
- ✅ `Sincronización completada: {...}`
- ✅ `Ejecutando escalamiento de deudores...`
- ✅ `Escalamiento completado: {...}`
- 📊 `Resumen de ejecución: {...}`

---

## ⚠️ Solución de Problemas

### **Error: "x-server-key inválida"**
- Verifica que la key sea exactamente: `2fa50294-e781-4ad8-abe4-78f21167d053`
- Asegúrate de incluir el header `x-server-key`

### **Error: "API no responde"**
- Verifica que las APIs estén funcionando:
  - `/api/sincronizarOnboardingClientes`
  - `/api/escalarDeudoresARS`
- Prueba llamarlas manualmente primero

### **Error: "Timeout"**
- Las APIs pueden tardar. Aumenta el timeout del cron job a 60 segundos

---

## 📅 Horarios Recomendados

- **Cada hora:** `0 * * * *` (actual)
- **Cada 2 horas:** `0 */2 * * *`
- **Cada 30 minutos:** `*/30 * * * *`
- **Solo horario laboral (9am-6pm):** `0 9-18 * * *`

---

## 🔐 Seguridad

- ✅ La función usa `x-server-key` para autenticación
- ✅ Solo se ejecuta con la key correcta
- ✅ Los errores se registran pero no exponen información sensible
- ⚠️ **IMPORTANTE:** No compartas la `x-server-key` públicamente

---

## 📝 Notas Adicionales

1. **Ejecución Manual:** Puedes llamar a `/api/automatizacionHoraria` en cualquier momento para ejecutar manualmente
2. **Independencia:** Cada API se ejecuta independientemente, si una falla, la otra continúa
3. **Logs Detallados:** Todos los resultados y errores se registran en los logs de AgentUI
4. **Sin Duplicados:** Si usas múltiples servicios de cron, asegúrate de que no se solapen

---

## ✅ Checklist de Configuración

- [ ] Función `automatizacionHoraria.js` creada
- [ ] Servicio de cron configurado (cron-job.org, EasyCron, etc.)
- [ ] Prueba manual exitosa
- [ ] Verificar logs después de la primera ejecución automática
- [ ] Monitorear durante las primeras 24 horas

---

**¿Necesitas ayuda?** Revisa los logs en AgentUI o prueba la función manualmente primero.