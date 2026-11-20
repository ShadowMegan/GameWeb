const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const usersFile = path.join(__dirname, 'users.json');
const loadUsers = () => {
  if (!fs.existsSync(usersFile)) return [];

  const storedUsers = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
  if (!Array.isArray(storedUsers) || storedUsers.some((user) =>
    !user || typeof user.id !== 'string' || typeof user.email !== 'string' ||
    typeof user.passwordHash !== 'string'
  )) {
    throw new Error('El archivo users.json no contiene una lista válida de usuarios.');
  }
  return storedUsers;
};
const saveUsers = (nextUsers) => {
  const temporaryFile = `${usersFile}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(nextUsers, null, 2));
  fs.renameSync(temporaryFile, usersFile);
};

let users = loadUsers();

app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({ success: false, message: 'Correo y contraseña son obligatorios.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (users.some((user) => user.email === normalizedEmail)) {
    return res.status(409).json({ success: false, message: 'Ya existe una cuenta con ese correo.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    if (users.some((user) => user.email === normalizedEmail)) {
      return res.status(409).json({ success: false, message: 'Ya existe una cuenta con ese correo.' });
    }

    const user = { id: randomUUID(), email: normalizedEmail, passwordHash };
    const nextUsers = [...users, user];
    saveUsers(nextUsers);
    users = nextUsers;
    if (!process.env.JWT_SECRET) {
      console.error('Falta configurar JWT_SECRET para emitir tokens de autenticación.');
      return res.status(500).json({ success: false, message: 'La autenticación no está configurada.' });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.status(201).json({
      success: true,
      message: 'Usuario registrado correctamente.',
      token,
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    console.error('Error al registrar el usuario:', error);
    res.status(500).json({ success: false, message: 'Error al guardar el usuario.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({ success: false, message: 'Correo y contraseña son obligatorios.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  try {
    const user = users.find((storedUser) => storedUser.email === normalizedEmail);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: 'Correo o contraseña incorrectos.' });
    }
    if (!process.env.JWT_SECRET) {
      console.error('Falta configurar JWT_SECRET para emitir tokens de autenticación.');
      return res.status(500).json({ success: false, message: 'La autenticación no está configurada.' });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ success: true, token });
  } catch (error) {
    console.error('Error al autenticar el usuario:', error);
    res.status(500).json({ success: false, message: 'Error al iniciar sesión.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en el puerto ${PORT}`);
});