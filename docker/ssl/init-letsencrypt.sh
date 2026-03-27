#!/bin/bash
# Script para obtener certificado Let's Encrypt en producción
# USO: ./init-letsencrypt.sh tudominio.com tu@email.com

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Uso: ./init-letsencrypt.sh DOMINIO EMAIL"
  echo "Ejemplo: ./init-letsencrypt.sh sharkfit.cl admin@sharkfit.cl"
  exit 1
fi

DOMAIN=$1
EMAIL=$2

echo "Obteniendo certificado para $DOMAIN..."

docker run --rm \
  -v "$(pwd)/docker/ssl/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/docker/ssl/certbot/www:/var/www/certbot" \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  --preferred-challenges http \
  --email $EMAIL \
  --agree-tos \
  --no-eff-email \
  -d $DOMAIN

echo "Certificado obtenido. Archivos en docker/ssl/certbot/conf/live/$DOMAIN/"
