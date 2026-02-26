const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// función reutilizable para validar contraseña según reglas compartidas
const isPasswordValid = (password) => {
  const hasMinLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasMinLength && hasUppercase && hasLowercase && hasNumber;
};

// Registro de usuario
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;

    // validación de contraseña antes de cualquier otra cosa
    if (!isPasswordValid(password)) {
      console.warn('REGISTER 400 – password does not meet complexity requirements');
      return res.status(400).json({
        error: true,
        message: 'Validación fallida',
        fields: {
          password: 'Contraseña debe incluir mayúsculas, minúsculas y números'
        }
      });
    }

    const user = new User({ username, email, password, fullName });
    await user.save();
    res.status(201).json({ message: 'Usuario registrado correctamente' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login de usuario (acepta email o username en identifier/email/username)
router.post('/login', async (req, res) => {
  try {
    const { identifier, email, username, password } = req.body;
    const loginIdentifier = identifier || email || username;

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        error: 'Email/usuario y contraseña son obligatorios',
      });
    }

    console.log('[LOGIN] Intento de login para:', loginIdentifier);

    const user = await User.findOne({
      $or: [
        { username: loginIdentifier },
        { email: loginIdentifier },
      ],
    });

    if (!user) {
      return res.status(400).json({ error: 'Usuario no encontrado' });
    }

    const isMatch = await (user.comparePassword
      ? user.comparePassword(password)
      : require('bcryptjs').compare(password, user.password));

    if (!isMatch) {
      return res.status(400).json({ error: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
