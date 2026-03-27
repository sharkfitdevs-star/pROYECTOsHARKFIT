#!/bin/bash
# Genera certificado SSL self-signed para testeo local
mkdir -p /etc/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/privkey.pem \
  -out /etc/nginx/ssl/fullchain.pem \
  -subj "/C=CL/ST=Santiago/L=Santiago/O=SharkFit/CN=localhost"
echo "Certificado SSL self-signed generado correctamente"
