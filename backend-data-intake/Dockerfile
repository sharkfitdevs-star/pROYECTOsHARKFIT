# Node Backend Dockerfile for MongoDB Migration
FROM node:20-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY . .

# Exponer puerto
EXPOSE 8000

# Comando de inicio
CMD ["npm", "run", "dev"]
