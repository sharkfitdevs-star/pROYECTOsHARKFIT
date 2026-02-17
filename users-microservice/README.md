# Microservicio de Usuarios (Node.js + MongoDB)

## Endpoints principales

- `POST /api/auth/register` — Registro de usuario
- `POST /api/auth/login` — Login de usuario (devuelve JWT)
- `GET /api/users` — Listar usuarios (sin contraseñas)

## Uso rápido

1. Copia `.env.example` a `.env` y pon tus credenciales de MongoDB Atlas y un secreto JWT.
2. Instala dependencias:
   ```
   npm install
   ```
3. Inicia el microservicio:
   ```
   npm run dev
   # o
   npm start
   ```
4. Prueba los endpoints con Postman, Insomnia o desde tu frontend.

## Modelo de usuario
- username (único)
- email (único)
- password (hash, nunca se expone)
- fullName
- role
- active
- createdAt

## Notas
- El endpoint `/api/users` es solo para pruebas, restringe su acceso en producción.
- El microservicio usa JWT para autenticación.
- Puedes extender el modelo y los endpoints según tus necesidades.
