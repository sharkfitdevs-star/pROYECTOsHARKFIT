
# Sharkfit Dashboard Workspace

Este workspace contiene los servicios y frontends principales de Sharkfit, documentación y archivos Docker.

## Arquitectura actual
- users-microservice/: Microservicio de usuarios (Node.js)
- backend-data-intake/: Servicio de ingesta y proxy de datos EVO (Node.js)
- java-backend/: Backend en desarrollo (Spring Boot)
- frontend/: Dashboard principal (React + Vite)
- landing/: Landing/marketing (React + Vite)
- docs/: Documentación técnica y de entrega
- docker-compose.yml: Orquestación de contenedores locales
- MongoDB Atlas: Base de datos principal

## Quick start (Docker)
1) Copia el archivo de entorno: copia .env.example a .env
2) Ejecuta: docker-compose up --build

## Desarrollo local (sin Docker)
- users-microservice: cd users-microservice, npm install, npm run dev
- backend-data-intake: cd backend-data-intake, npm install, npm run dev
- frontend: cd frontend, npm install, npm run dev
- landing: cd landing, npm install, npm run dev

## Documentación
Comienza por docs/documentado/README.md para detalles técnicos y docs/ para guías de uso y arquitectura.
