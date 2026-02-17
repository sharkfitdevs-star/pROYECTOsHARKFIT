#!/usr/bin/env markdown
# ⚡ QUICKSTART - Comienza en 5 minutos

## 🚀 Paso 1: Setup Automático (2 minutos)

```bash
cd backend-data-intake
node setup-enterprise.js
```

Esto te guiará interactivamente e instalará todo lo necesario.

---

## 🐳 Paso 2: Iniciar Servicios (1 minuto)

**Opción A: Con Docker**
```bash
# Terminal 1: Redis
docker run -d -p 6379:6379 --name redis-sharkfit redis:alpine

# Terminal 2: MongoDB
docker run -d -p 27017:27017 --name mongo-sharkfit mongo
```

**Opción B: Localmente**
```bash
# Asume que Redis y MongoDB ya están instalados
redis-server
mongod
```

---

## 🔥 Paso 3: Iniciar Backend (1 minuto)

```bash
# Terminal 3
cd backend-data-intake
npm run dev
```

Verás:
```
✅ MongoDB conectado
✅ Índices MongoDB creados
✅ Health checks iniciados
✅ Servidor listo en: http://localhost:3001
```

---

## ✅ Paso 4: Verificar Funcionamiento (1 minuto)

```bash
# Health check
curl http://localhost:3001/api/health

# Verifica que retorne:
{
  "status": "healthy",
  "services": { ... }
}
```

---

## 🧪 Paso 5: Probar Webhook (Extra)

```bash
curl -X POST http://localhost:3001/api/webhooks/evo \
  -H "Content-Type: application/json" \
  -d '{
    "evento": "cliente.creado",
    "data": {
      "id": 123,
      "nombre": "Test User",
      "email": "test@example.com"
    }
  }'
```

Respuesta esperada (< 200ms):
```json
{
  "exito": true,
  "webhookId": "evo-...",
  "estado": "encolado"
}
```

---

## 📊 Endpoints Importantes

```bash
# Status del webhook que acabas de enviar
curl http://localhost:3001/api/webhooks/status/evo-...

# Estadísticas de webhooks
curl http://localhost:3001/api/webhooks/stats

# Health de cada servicio
curl http://localhost:3001/api/health/evo
curl http://localhost:3001/api/health/mongodb
curl http://localhost:3001/api/health/redis

# ¿Es seguro sincronizar?
curl http://localhost:3001/api/health/sync-safe
```

---

## 🛠️ Comandos NPM Importantes

```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm start

# Ejecutar setup nuevamente
node setup-enterprise.js

# Ver logs
tail -f logs/*.log
```

---

## 📚 Documentación Completa

Para más detalles, lee:
```bash
cat ARQUITECTURA_MEJORADA_v2.md
cat COMPARATIVA_ANTES_DESPUES.md
```

---

## 🆘 Troubleshooting Rápido

### "Redis conexión rechazada"
```bash
docker run -d -p 6379:6379 redis:alpine
```

### "MongoDB conexión rechazada"
```bash
docker run -d -p 27017:27017 mongo
```

### "Webhooks quedan en pendiente"
```bash
# Verificar que Redis esté corriendo
redis-cli ping

# Verificar logs
tail -f logs/*.log
```

### "Health check dice unhealthy"
```bash
# Verificar cada servicio
curl http://localhost:3001/api/health/evo
curl http://localhost:3001/api/health/mongodb
curl http://localhost:3001/api/health/redis
```

---

## ✨ ¡Listo!

Tu sistema enterprise está operativo. Ahora puedes:

- ✅ Enviar 5+ webhooks simultáneos
- ✅ Recibir 20+ webhooks simultáneos
- ✅ Contar con retry automático
- ✅ Monitorear salud en tiempo real
- ✅ Evitar duplicados garantizado

**Siguiente:** Lee `ARQUITECTURA_MEJORADA_v2.md` para configuración avanzada.
