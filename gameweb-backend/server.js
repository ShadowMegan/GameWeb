const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
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
const verificationCodes = new Map();
const verifiedEmails = new Set();

// Configurar Nodemailer con Gmail
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true para puerto 465, false para 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Endpoint para enviar el código de 6 dígitos
app.post('/api/auth/send-code', async (req, res) => {
  const { email } = req.body;
  if (typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ success: false, message: 'Falta el correo.' });
  }
  const normalizedEmail = email.trim().toLowerCase();

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 30 * 1000; // Expira estrictamente en 30 segundos

  verificationCodes.set(normalizedEmail, { code, expiresAt });
  verifiedEmails.delete(normalizedEmail);

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: normalizedEmail,
      subject: 'Código de verificación - GameWeb',
      text: `Tu código de 6 dígitos es: ${code}. Expira en 30 segundos.`
    });
    res.json({ success: true, message: 'Código enviado al correo.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error al enviar el correo.' });
  }
});

// Endpoint para verificar el código
app.post('/api/auth/verify-code', (req, res) => {
  const { email, code } = req.body;
  if (typeof email !== 'string' || typeof code !== 'string') {
    return res.status(400).json({ success: false, message: 'Correo o código inválido.' });
  }
  const normalizedEmail = email.trim().toLowerCase();
  const record = verificationCodes.get(normalizedEmail);

  if (!record) {
    return res.status(400).json({ success: false, message: 'No hay códigos solicitados.' });
  }

  if (Date.now() > record.expiresAt) {
    verificationCodes.delete(normalizedEmail);
    return res.status(400).json({ success: false, message: 'El código ha expirado.' });
  }

  if (record.code !== code) {
    return res.status(400).json({ success: false, message: 'Código incorrecto.' });
  }

  verificationCodes.delete(normalizedEmail);
  verifiedEmails.add(normalizedEmail);
  res.json({ success: true, message: 'Verificación exitosa.' });
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({ success: false, message: 'Correo y contraseña son obligatorios.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!verifiedEmails.has(normalizedEmail)) {
    return res.status(403).json({ success: false, message: 'Debes verificar tu correo antes de registrarte.' });
  }
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
    verifiedEmails.delete(normalizedEmail);
    res.status(201).json({
      success: true,
      message: 'Usuario registrado correctamente.',
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