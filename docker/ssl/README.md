# SSL — SharkFit

## Opción 1: Sin SSL (desarrollo local)
```bash
docker-compose --env-file .env.production up --build
# Acceder en http://localhost
```

## Opción 2: SSL Self-Signed (testeo local con HTTPS)
```bash
# Generar certificado self-signed
mkdir -p docker/ssl/certs
docker run --rm -v "$(pwd)/docker/ssl/certs:/etc/nginx/ssl" alpine/openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/nginx/ssl/privkey.pem -out /etc/nginx/ssl/fullchain.pem -subj "/CN=localhost"

# Levantar con SSL
docker-compose -f docker-compose.ssl.yml --env-file .env.production up --build
# Acceder en https://localhost (warning de certificado es normal)
```

## Opción 3: Let's Encrypt (producción con dominio real)
```bash
# Requisitos: servidor con IP pública, dominio apuntando a esa IP, puerto 80 libre

# Obtener certificado
bash docker/ssl/init-letsencrypt.sh tudominio.com tu@email.com

# Copiar certificados a la carpeta de nginx
cp docker/ssl/certbot/conf/live/tudominio.com/fullchain.pem docker/ssl/certs/
cp docker/ssl/certbot/conf/live/tudominio.com/privkey.pem docker/ssl/certs/

# Levantar con SSL
docker-compose -f docker-compose.ssl.yml --env-file .env.production up --build
# Acceder en https://tudominio.com
```

## Renovar certificado Let's Encrypt
```bash
docker run --rm -v "$(pwd)/docker/ssl/certbot/conf:/etc/letsencrypt" certbot/certbot renew
# Luego reiniciar nginx: docker-compose -f docker-compose.ssl.yml restart nginx
```

## Archivos importantes
- `docker-compose.yml` → Sin SSL (puerto 80)
- `docker-compose.ssl.yml` → Con SSL (puertos 80 + 443)
- `nginx/nginx.conf` → Config nginx sin SSL
- `nginx/nginx-ssl.conf` → Config nginx con SSL + redirect HTTP→HTTPS
- `docker/ssl/certs/` → Aquí van fullchain.pem y privkey.pem
- `docker/ssl/generate-self-signed.sh` → Script para certificado local
- `docker/ssl/init-letsencrypt.sh` → Script para Let's Encrypt
