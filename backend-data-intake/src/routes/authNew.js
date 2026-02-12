const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * POST /api/auth/login
 * Iniciar sesión
 */
router.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validar campos
    if (!password || (!username && !email)) {
      return res.status(400).json({
        error: true,
        message: 'Username/email y password son requeridos'
      });
    }

    // Buscar usuario
    const usuario = await Usuario.findOne({
      $or: [
        { username: username },
        { email: email }
      ]
    });

    if (!usuario) {
      return res.status(401).json({
        error: true,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar si está activo
    if (!usuario.active) {
      return res.status(403).json({
        error: true,
        message: 'Usuario desactivado'
      });
    }

    // Verificar contraseña
    const passwordMatch = await usuario.comparePassword(password);
    
    if (!passwordMatch) {
      return res.status(401).json({
        error: true,
        message: 'Credenciales inválidas'
      });
    }

    // Actualizar último login
    usuario.lastLogin = new Date();
    usuario.failedLoginAttempts = 0;
    await usuario.save();

    // Generar token
    const token = jwt.sign(
      {
        userId: usuario._id,
        username: usuario.username,
        role: usuario.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      token,
      user: usuario.toJSON()
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      error: true,
      message: 'Error al iniciar sesión'
    });
  }
});

/**
 * POST /api/auth/register
 * Registrar nuevo usuario
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role } = req.body;

    // Validar campos requeridos
    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: true,
        message: 'Todos los campos son requeridos'
      });
    }

    // Verificar si el usuario ya existe
    const existingUser = await Usuario.findOne({
      $or: [
        { username },
        { email }
      ]
    });

    if (existingUser) {
      return res.status(409).json({
        error: true,
        message: 'Username o email ya registrado'
      });
    }

    // Crear nuevo usuario
    const nuevoUsuario = new Usuario({
      username,
      email,
      password,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      role: role || 'recepcionista',
      active: true
    });

    await nuevoUsuario.save();

    // Generar token
    const token = jwt.sign(
      {
        userId: nuevoUsuario._id,
        username: nuevoUsuario.username,
        role: nuevoUsuario.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      token,
      user: nuevoUsuario.toJSON()
    });
  } catch (error) {
    console.error('Error en register:', error);
    res.status(500).json({
      error: true,
      message: 'Error al registrar usuario'
      });
  }
});

/**
 * GET /api/auth/me
 * Obtener usuario autenticado
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: true,
        message: 'No autorizado'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const usuario = await Usuario.findById(decoded.userId);

    if (!usuario) {
      return res.status(404).json({
        error: true,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      user: usuario.toJSON()
    });
  } catch (error) {
    console.error('Error en me:', error);
    res.status(401).json({
      error: true,
      message: 'Token inválido'
    });
  }
});

/**
 * POST /api/auth/logout
 * Cerrar sesión
 */
router.post('/logout', (req, res) => {
  // En JWT no hay logout real del lado del servidor
  // El cliente debe eliminar el token
  res.json({
    success: true,
    message: 'Sesión cerrada exitosamente'
  });
});

module.exports = router;
