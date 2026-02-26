const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');

dotenv.config();

// advertencias de variables críticas
if (!process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET no está definida; los tokens podrían fallar');
}
if (!process.env.ACCESS_TOKEN_SECRET && !process.env.JWT_ACCESS_SECRET) {
  console.warn('⚠️ ACCESS_TOKEN_SECRET/JWT_ACCESS_SECRET no están definidas; los tokens podrían fallar');
}

connectDB();

const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

app.get('/', (req, res) => {
  res.send('Microservicio de usuarios activo');
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`✅ Users microservice listening on port ${PORT}`);
});
