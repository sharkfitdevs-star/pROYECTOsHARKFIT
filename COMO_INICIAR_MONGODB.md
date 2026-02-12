# 🚀 INICIAR SHARKFIT - Guía Rápida MongoDB

## ❓ ¿Necesito cuenta en MongoDB.com?

**NO** para desarrollo local. Solo necesitas cuenta si usas MongoDB Atlas (opción cloud).

---

## 📋 3 Opciones para MongoDB

### ✅ OPCIÓN 1: Docker (MÁS FÁCIL - Recomendado)

**Ventajas:**
- ✅ No instalas nada en tu PC
- ✅ Ya está configurado en `docker-compose.yml`
- ✅ Se borra fácil (no deja basura)
- ✅ Mismo setup en cualquier computadora

**Requisitos:**
- Docker Desktop instalado

**Comando:**
```powershell
# Desde la raíz del proyecto
docker-compose up -d mongodb

# Verificar que está corriendo
docker ps
# Deberías ver: sharkfit_mongodb   Up
```

**Conexión:**
```
mongodb://admin:sharkfit2024@localhost:27017/sharkfit?authSource=admin
```

---

### ⚙️ OPCIÓN 2: MongoDB Community (Local sin Docker)

**Ventajas:**
- ✅ Sin Docker
- ✅ Más control
- ✅ Mejor para desarrollo intensivo

**Instalación:**
```powershell
# Con Chocolatey
choco install mongodb

# O descarga desde:
# https://www.mongodb.com/try/download/community
```

**Iniciar:**
```powershell
# Crear carpeta para datos
mkdir C:\data\db

# Iniciar MongoDB
mongod --dbpath C:\data\db --port 27017

# En otra terminal, puedes conectarte con:
mongosh
```

**Conexión:**
```
mongodb://localhost:27017/sharkfit
```

**Necesitas actualizar `.env`:**
```env
MONGODB_URI=mongodb://localhost:27017/sharkfit
```

---

### ☁️ OPCIÓN 3: MongoDB Atlas (Cloud - SÍ requiere login)

**Ventajas:**
- ✅ Cloud (accesible desde cualquier lugar)
- ✅ Plan gratis 512MB
- ✅ Backup automático

**Pasos:**
1. Ir a https://www.mongodb.com/cloud/atlas/register
2. Crear cuenta (gratis)
3. Crear cluster (gratis - M0)
4. Agregar IP: 0.0.0.0/0 (permitir todas - solo desarrollo)
5. Crear usuario de base de datos
6. Obtener connection string

**Conexión:**
```
mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/sharkfit?retryWrites=true&w=majority
```

**Actualizar `.env`:**
```env
MONGODB_URI=mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/sharkfit?retryWrites=true&w=majority
```

---

## 🎯 RECOMENDACIÓN: Usar Docker (Opción 1)

Ya está todo configurado. Solo necesitas:

### 1️⃣ Iniciar MongoDB con Docker

```powershell
# Desde: C:\Users\vecch\OneDrive\Escritorio\Dashboard Sharkfit 30 enero - Copy-export (1)

docker-compose up -d mongodb
```

**Salida esperada:**
```
Creating network "sharkfit_network" ... done
Creating sharkfit_mongodb ... done
```

### 2️⃣ Verificar que MongoDB está corriendo

```powershell
docker ps
```

**Deberías ver:**
```
CONTAINER ID   IMAGE       STATUS                    PORTS                      NAMES
abc123def456   mongo:7.0   Up 10 seconds (healthy)   0.0.0.0:27017->27017/tcp   sharkfit_mongodb
```

### 3️⃣ Iniciar el Backend Node

```powershell
cd backend-data-intake
npm run dev
```

**Salida esperada:**
```
> vendify-backend-intake@1.0.0 dev
> node --watch src/server.js

🔗 Conectando a MongoDB...
✅ MongoDB conectado exitosamente
🚀 Servidor iniciado en http://localhost:8000
```

### 4️⃣ Verificar que funciona

```powershell
# En otra terminal
curl http://localhost:8000/health

# O abre en navegador:
# http://localhost:8000/health
```

**Deberías ver:**
```json
{
  "status": "ok",
  "mongodb": "connected",
  "uptime": 5.2
}
```

---

## 🛠️ Comandos Útiles Docker

```powershell
# Ver logs de MongoDB
docker logs sharkfit_mongodb

# Detener MongoDB
docker-compose stop mongodb

# Iniciar MongoDB
docker-compose start mongodb

# Eliminar MongoDB (BORRA DATOS)
docker-compose down -v

# Reiniciar MongoDB
docker-compose restart mongodb

# Conectarse a MongoDB con shell
docker exec -it sharkfit_mongodb mongosh -u admin -p sharkfit2024 --authenticationDatabase admin
```

---

## 🔧 Iniciar TODO (Backend + MongoDB + Frontend)

```powershell
# Inicia MongoDB, Backend y Frontend juntos
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f

# Detener todo
docker-compose down
```

---

## 🐛 Troubleshooting

### ❌ Error: "connect ECONNREFUSED 127.0.0.1:27017"

**Causa:** MongoDB no está corriendo

**Solución:**
```powershell
docker-compose up -d mongodb
```

### ❌ Error: "Authentication failed"

**Causa:** Credenciales incorrectas en `.env`

**Solución:**
Verifica que `.env` tenga:
```env
MONGODB_URI=mongodb://admin:sharkfit2024@localhost:27017/sharkfit?authSource=admin
```

### ❌ Error: "Port 27017 is already in use"

**Causa:** Ya tienes MongoDB corriendo (local o Docker)

**Solución:**
```powershell
# Opción 1: Detener MongoDB local
net stop mongodb

# Opción 2: Detener container Docker
docker stop sharkfit_mongodb

# Opción 3: Cambiar puerto en docker-compose.yml
# ports:
#   - "27018:27017"
# Actualizar .env: mongodb://admin:sharkfit2024@localhost:27018/...
```

### ❌ Error: "Cannot connect to Docker daemon"

**Causa:** Docker Desktop no está corriendo

**Solución:**
1. Abrir Docker Desktop
2. Esperar a que inicie completamente (ícono en system tray)
3. Intentar de nuevo

---

## 📊 Ver los Datos en MongoDB

### Opción 1: MongoDB Compass (GUI - Recomendado)

1. Descargar: https://www.mongodb.com/try/download/compass
2. Instalar (gratis, no requiere login)
3. Conectar con:
   ```
   mongodb://admin:sharkfit2024@localhost:27017/sharkfit?authSource=admin
   ```
4. Ver colecciones: clientes, ventas, usuarios, etc.

### Opción 2: CLI (mongosh)

```powershell
# Conectar
docker exec -it sharkfit_mongodb mongosh -u admin -p sharkfit2024 --authenticationDatabase admin

# Comandos útiles
use sharkfit              # Cambiar a DB sharkfit
show collections          # Ver colecciones
db.clientes.find()        # Ver todos los clientes
db.clientes.countDocuments()  # Contar clientes
```

---

## ✅ Checklist Setup Completo

- [ ] Docker Desktop instalado y corriendo
- [ ] Archivo `.env` creado en `backend-data-intake/`
- [ ] MongoDB iniciado: `docker-compose up -d mongodb`
- [ ] Verificar MongoDB: `docker ps` (debe mostrar sharkfit_mongodb)
- [ ] Backend iniciado: `npm run dev` en `backend-data-intake/`
- [ ] Health check OK: http://localhost:8000/health
- [ ] (Opcional) MongoDB Compass instalado para ver datos

---

## 🎯 Resumen: NO NECESITAS CUENTA

Para desarrollo local:
- ✅ Docker + docker-compose (gratis, sin cuenta)
- ✅ MongoDB Community (gratis, sin cuenta)
- ☁️ MongoDB Atlas (gratis PERO requiere cuenta en mongodb.com)

**Recomendación:** Usa Docker (ya configurado, sin cuenta necesaria)
