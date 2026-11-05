import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Clock3,
  Crown,
  Eye,
  EyeOff,
  Flame,
  Gamepad2,
  Mail,
  RefreshCw,
  Skull,
  Trash2,
  Trophy,
  Zap,
} from 'lucide-react'
import GameCatalog from '../components/catalog.jsx'
import AdminPanel from '../components/admin/AdminPanel.jsx'
import ConfirmDialog from '../components/admin/ConfirmDialog.jsx'
import ThemeSelector from '../components/ThemeSelector.jsx'
import CommunityComments from '../components/CommunityComments.jsx'
import ArcadeAvatar from '../components/ArcadeAvatar.jsx'
import { useTheme } from '../context/theme.js'
import { containsBadWords, getBadWordsErrorMessage } from '../lib/badWords.js'
import { AVATAR_ICONS, NEON_COLORS } from '../lib/profile.js'
import { readCatalog } from '../lib/catalog.js'
import { purgeUserAccountData } from '../lib/accounts.js'
import { markUserOffline, markUserOnline } from '../lib/presence.js'
import { readHighScore, readPlayedGames } from '../lib/scores.js'

const USERS_KEY = 'gameweb_users'
const AUTH_API_URL =
  import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5000/api/auth'
const OTP_TTL_MS = 30000
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/
const DNI_LENGTH = 8
const VERIFICATION_CODE_TTL_MS = 30000
const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 32
const MAX_DESCRIPTION_LENGTH = 140
const MAX_PHONE_LENGTH = 15
const GENDERS = ['Masculino', 'Femenino', 'No binario', 'Prefiero no decirlo']
// Datos de prueba (mock): contraseñas pre-haseadas (salt:password + SHA-256)
// para poder iniciar sesión de inmediato sin registrarse.
//   jugador.test@gmail.com -> contraseña: Arcade2024
//   DNI 87654321 / jugador2.test@gmail.com -> contraseña: Password123
const MOCK_USERS = {
  12345678: {
    dni: '12345678',
    name: 'Jugador de Prueba',
    phone: '987654321',
    email: 'jugador.test@gmail.com',
    gender: 'Femenino',
    username: 'pixel_master',
    description: 'Fan de los RPG y los arcades retro.',
    salt: '0a1f2b3c4d5e6f70889a1b2c3d4e5f60',
    passwordHash:
      '7cb6a3b2e9d1bbfe918c7150dd2664128e148ade2432f329ac4066767b582d78',
    createdAt: '2026-01-05T10:00:00.000Z',
  },
  87654321: {
    dni: '87654321',
    name: 'Segundo Jugador',
    phone: '',
    email: 'jugador2.test@gmail.com',
    gender: 'Masculino',
    username: 'neon_ghost',
    description: 'Shooter competitivo. Speedrunner los fines de semana.',
    salt: '9f8e7d6c5b4a39281fa0b1c2d3e4f506',
    passwordHash:
      '6bd44a13221fa48b6700805790d40c34e63f7172ad5da09f6e900306612a8240',
    createdAt: '2026-01-06T18:30:00.000Z',
  },
}

const ADMIN_IDENTIFIERS = ['admin', '99999999']
const ADMIN_PASSWORD = 'admin'
const ADMIN_USER = {
  dni: 'admin',
  name: 'Administrador GameWeb',
  username: 'admin',
  email: 'admin@gameweb.test',
  phone: '',
  gender: 'Prefiero no decirlo',
  description: 'Cuenta de administración para gestionar el catálogo.',
  role: 'admin',
  avatar: 'crown',
  neonColor: 'yellow',
  createdAt: '2026-01-01T00:00:00.000Z',
}
const EMPTY_ADMIN_FORM = { identifier: '', password: '' }
const EMPTY_LOGIN_FORM = { identifier: '', password: '' }
const EMPTY_REGISTER_FORM = {
  name: '',
  phone: '',
  email: '',
  dni: '',
  gender: '',
  username: '',
  description: '',
  password: '',
  confirmPassword: '',
}

const inputBase = 'arcade-input px-4 py-3'
const labelClass = 'arcade-label mb-2 block'
const errorText = 'arcade-error mt-1.5'
const inputState = (hasError) => (hasError ? 'arcade-input-error' : '')

const AVATAR_ICON_MAP = {
  gamepad: Gamepad2,
  zap: Zap,
  flame: Flame,
  skull: Skull,
  crown: Crown,
}

function loadUsers() {
  try {
    const rawUsers = window.localStorage.getItem(USERS_KEY)
    if (rawUsers) {
      return JSON.parse(rawUsers)
    }
    saveUsers(MOCK_USERS)
    return MOCK_USERS
  } catch {
    return MOCK_USERS
  }
}

function saveUsers(users) {
  try {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users))
  } catch {
    // Si el navegador bloquea el almacenamiento, la sesión sigue activa en memoria.
  }
}

function validateEmail(rawEmail) {
  const email = rawEmail.trim().toLowerCase()
  if (!email) {
    return 'El correo electrónico es obligatorio.'
  }
  if (!EMAIL_REGEX.test(email)) {
    return 'Solo se permiten direcciones de correo @gmail.com.'
  }
  return ''
}

async function readAuthApiResponse(response, fallbackMessage) {
  let result
  try {
    result = await response.json()
  } catch {
    throw new Error(
      'El backend de autenticación devolvió una respuesta no válida. Verifica VITE_AUTH_API_URL y que el servicio esté disponible.',
    )
  }
  if (!result || typeof result !== 'object') {
    throw new Error(fallbackMessage)
  }

  if (
    !response.ok ||
    result.success === false ||
    result.verified === false ||
    result.valid === false
  ) {
    throw new Error(result.message || result.error || fallbackMessage)
  }

  return result
}

async function requestAuthApi(endpoint, payload, fallbackMessage) {
  let response

  try {
    response = await fetch(`${AUTH_API_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        `No se pudo conectar con el backend de autenticación (${AUTH_API_URL}). Verifica VITE_AUTH_API_URL, que el backend esté disponible y su configuración CORS.`,
        { cause: error },
      )
    }
    throw error
  }

  return readAuthApiResponse(response, fallbackMessage)
}

async function sendOtpCode(email) {
  return requestAuthApi(
    'send-code',
    { email },
    'No se pudo enviar el código OTP.',
  )
}

async function verifyOtpCode(email, code) {
  return requestAuthApi(
    'verify-code',
    { email, code },
    'El código OTP no es válido.',
  )
}

function createVerificationCode() {
  const values = new Uint32Array(1)
  window.crypto.getRandomValues(values)
  return String(values[0] % 1000000).padStart(6, '0')
}

function validateDni(rawDni) {
  const dni = rawDni.trim()
  if (!dni) {
    return 'El DNI es obligatorio.'
  }
  if (!/^\d+$/.test(dni)) {
    return 'El DNI solo puede contener números, sin letras ni símbolos.'
  }
  if (dni.length !== DNI_LENGTH) {
    return `El DNI debe tener ${DNI_LENGTH} dígitos.`
  }
  return ''
}

function validatePhone(phone) {
  if (!phone.trim()) {
    return ''
  }
  if (!/^\d+$/.test(phone.trim())) {
    return 'El teléfono solo puede contener números.'
  }
  if (phone.trim().length < 6) {
    return 'El teléfono debe tener al menos 6 dígitos.'
  }
  return ''
}

function validatePassword(password) {
  if (!password) {
    return 'La contraseña es obligatoria.'
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `La contraseña no puede superar los ${MAX_PASSWORD_LENGTH} caracteres.`
  }
  return ''
}

function validateUsername(rawUsername) {
  const username = rawUsername.trim()
  if (!username) {
    return 'El nombre de usuario es obligatorio.'
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return 'Usa entre 3 y 20 caracteres: letras, números o guion bajo.'
  }
  const badWordsError = containsBadWords(username)
  if (badWordsError) {
    return getBadWordsErrorMessage()
  }
  return ''
}

function validateDescription(description) {
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return `La descripción no puede superar los ${MAX_DESCRIPTION_LENGTH} caracteres.`
  }
  return ''
}

function isUsernameTaken(username, users, ignoreDni = '') {
  const normalized = username.trim().toLowerCase()
  return Object.values(users).some(
    (user) =>
      user.dni !== ignoreDni && user.username.toLowerCase() === normalized,
  )
}

function slugifyUsername(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20)
}

function createUniqueUsername(base, users, dni) {
  const slug = slugifyUsername(base)
  const fallbackBase = dni ? `player${dni}` : 'player'
  const safeBase = slug.length >= 3 ? slug : fallbackBase.slice(0, 20)
  let candidate = safeBase
  let index = 1

  while (isUsernameTaken(candidate, users)) {
    const suffix = String(index)
    candidate = `${safeBase.slice(0, 20 - suffix.length)}${suffix}`
    index += 1
  }

  return candidate
}

function buildRegisterErrors(form, users) {
  const errors = {}
  const name = form.name.trim()
  const email = form.email.trim().toLowerCase()
  const username = form.username.trim()

  if (!name) {
    errors.name = 'El nombre es obligatorio.'
  } else if (name.length < 3) {
    errors.name = 'El nombre debe tener al menos 3 caracteres.'
  }

  const phoneError = validatePhone(form.phone)
  if (phoneError) {
    errors.phone = phoneError
  }

  const emailError = validateEmail(form.email)
  if (emailError) {
    errors.email = emailError
  } else if (Object.values(users).some((user) => user.email === email)) {
    errors.email = 'Ya existe una cuenta registrada con este correo.'
  }

  const dniError = validateDni(form.dni)
  if (dniError) {
    errors.dni = dniError
  } else if (users[form.dni]) {
    errors.dni = 'Ya existe una cuenta registrada con este DNI.'
  }

  if (!form.gender) {
    errors.gender = 'Selecciona un género.'
  }

  if (username) {
    const usernameError = validateUsername(username)
    if (usernameError) {
      errors.username = usernameError
    } else if (isUsernameTaken(username, users)) {
      errors.username = 'Ese nombre de usuario ya está en uso.'
    }
  }

  const descriptionError = validateDescription(form.description)
  if (descriptionError) {
    errors.description = descriptionError
  }

  const passwordError = validatePassword(form.password)
  if (passwordError) {
    errors.password = passwordError
  }

  if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Las contraseñas no coinciden.'
  }

  return errors
}

function createSalt() {
  const bytes = new Uint8Array(16)
  window.crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function hashPassword(password, salt) {
  const bytes = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await window.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function FormMessage({ status }) {
  if (!status) {
    return null
  }

  const isError = status.type === 'error'
  const styles = isError
    ? 'arcade-message-error'
    : status.type === 'info'
      ? 'arcade-message-info'
      : 'arcade-message-success'

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live="polite"
      className={`arcade-message ${styles}`}
    >
      {isError ? (
        <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      ) : (
        <Check className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      )}
      <p>{status.message}</p>
    </div>
  )
}

function PasswordField({
  id,
  name,
  label,
  value,
  onChange,
  error,
  visible,
  onToggle,
  autoComplete,
  placeholder,
  hint,
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        {hint && <span className="arcade-hint">{hint}</span>}
      </div>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          maxLength={MAX_PASSWORD_LENGTH}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${inputBase} pr-12 ${inputState(Boolean(error))}`}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="arcade-eye absolute inset-y-0 right-0 flex items-center px-4 focus:outline-none"
        >
          {visible ? (
            <EyeOff className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <Eye className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
          )}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className={errorText}>
          {error}
        </p>
      )}
    </div>
  )
}

function LoginPage() {
  const [users, setUsers] = useState(() => loadUsers())
  const [view, setView] = useState('login')
  const [sessionDni, setSessionDni] = useState('')
  const [apiSessionUser, setApiSessionUser] = useState(null)
  const { themeId } = useTheme()

  const [loginForm, setLoginForm] = useState(EMPTY_LOGIN_FORM)
  const [loginErrors, setLoginErrors] = useState({})
  const [loginMessage, setLoginMessage] = useState(null)
  const [loginBusy, setLoginBusy] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  const [forgotEmail, setForgotEmail] = useState('')
  const [verification, setVerification] = useState(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationMessage, setVerificationMessage] = useState(null)
  const [verificationRemaining, setVerificationRemaining] = useState(0)
  const [resetEmail, setResetEmail] = useState('')
  const [resetForm, setResetForm] = useState({
    password: '',
    confirmPassword: '',
  })
  const [resetErrors, setResetErrors] = useState({})
  const [resetMessage, setResetMessage] = useState(null)
  const [resetBusy, setResetBusy] = useState(false)

  const [adminForm, setAdminForm] = useState(EMPTY_ADMIN_FORM)
  const [adminErrors, setAdminErrors] = useState({})
  const [adminMessage, setAdminMessage] = useState(null)
  const [showAdminPassword, setShowAdminPassword] = useState(false)

  const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER_FORM)
  const [registerErrors, setRegisterErrors] = useState({})
  const [registerStatus, setRegisterStatus] = useState(null)
  const [registerBusy, setRegisterBusy] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [pendingRegistration, setPendingRegistration] = useState(null)
  const [otpCode, setOtpCode] = useState('')
  const [otpStatus, setOtpStatus] = useState(null)
  const [otpBusy, setOtpBusy] = useState(false)
  const [otpExpiresAt, setOtpExpiresAt] = useState(0)
  const [otpRemaining, setOtpRemaining] = useState(0)

  const [profileForm, setProfileForm] = useState({
    username: '',
    description: '',
    avatar: 'gamepad',
    neonColor: 'pink',
  })
  const [profileErrors, setProfileErrors] = useState({})
  const [profileStatus, setProfileStatus] = useState(null)

  const [isAdmin, setIsAdmin] = useState(false)
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const sessionUser = isAdmin
    ? ADMIN_USER
    : sessionDni
      ? users[sessionDni]
      : apiSessionUser
  const sessionUserId = sessionUser?.dni ?? ''
  const catalog = readCatalog()
  const sessionPlayedGames = sessionUser
    ? catalog.filter((game) =>
        readPlayedGames(sessionUser.dni).includes(game.id),
      )
    : []

  useEffect(() => {
    if (!sessionUserId) {
      return undefined
    }

    markUserOnline(sessionUserId)
    const heartbeat = window.setInterval(
      () => markUserOnline(sessionUserId),
      15000,
    )

    function handleUnload() {
      markUserOffline(sessionUserId)
    }

    window.addEventListener('beforeunload', handleUnload)

    return () => {
      window.clearInterval(heartbeat)
      window.removeEventListener('beforeunload', handleUnload)
      markUserOffline(sessionUserId)
    }
  }, [sessionUserId])

  useEffect(() => {
    if (view !== 'verify-email' || otpExpiresAt === 0) {
      return undefined
    }

    function updateCountdown() {
      setOtpRemaining(Math.max(0, Math.ceil((otpExpiresAt - Date.now()) / 1000)))
    }

    updateCountdown()
    const timer = window.setInterval(updateCountdown, 250)
    return () => window.clearInterval(timer)
  }, [view, otpExpiresAt])

  useEffect(() => {
    if (view !== 'verify-email' || !verification) {
      return undefined
    }

    function updateCountdown() {
      setVerificationRemaining(
        Math.max(0, Math.ceil((verification.expiresAt - Date.now()) / 1000)),
      )
    }

    updateCountdown()
    const timer = window.setInterval(updateCountdown, 250)
    return () => window.clearInterval(timer)
  }, [view, verification])

  function switchView(nextView) {
    if (nextView === 'admin' && !isAdmin) {
      return
    }
    setRegisterStatus(null)
    setView(nextView)
  }

  function handleLoginChange(event) {
    const { name, value } = event.target

    setLoginForm((previous) => ({ ...previous, [name]: value }))
    setLoginErrors((previous) => ({ ...previous, [name]: '' }))
    setLoginMessage(null)
  }

  function openAdminLogin() {
    setAdminForm(EMPTY_ADMIN_FORM)
    setAdminErrors({})
    setAdminMessage(null)
    setShowAdminPassword(false)
    switchView('admin-login')
  }

  function handleAdminChange(event) {
    const { name, value } = event.target

    setAdminForm((previous) => ({ ...previous, [name]: value }))
    setAdminErrors((previous) => ({ ...previous, [name]: '' }))
    setAdminMessage(null)
  }

  function handleAdminSubmit(event) {
    event.preventDefault()

    const identifier = adminForm.identifier.trim()
    const password = adminForm.password
    const errors = {}

    if (!identifier) {
      errors.identifier =
        'El DNI o usuario de administrador es obligatorio.'
    }
    if (!password) {
      errors.password = 'La contraseña de administrador es obligatoria.'
    }

    setAdminErrors(errors)
    if (Object.keys(errors).length > 0) {
      setAdminMessage({
        type: 'error',
        message:
          'Completa tu DNI o usuario y tu contraseña de administrador para continuar.',
      })
      return
    }

    const identifierValid = ADMIN_IDENTIFIERS.includes(identifier.toLowerCase())
    const passwordValid = password === ADMIN_PASSWORD

    if (!identifierValid || !passwordValid) {
      setAdminErrors({
        identifier: identifierValid
          ? ''
          : 'El DNI o usuario de administrador es incorrecto.',
        password: passwordValid
          ? ''
          : 'La contraseña de administrador es incorrecta.',
      })
      setAdminMessage({
        type: 'error',
        message: 'Credenciales de administrador incorrectas. Acceso denegado.',
      })
      return
    }

    setIsAdmin(true)
    setSessionDni('admin')
    setApiSessionUser(null)
    setDeleteAccountOpen(false)
    setAdminForm(EMPTY_ADMIN_FORM)
    setAdminErrors({})
    setAdminMessage(null)
    setLoginMessage(null)
    setView('admin')
  }

  function handleRegisterChange(event) {
    const { name, value } = event.target
    let nextValue = value

    if (name === 'dni') {
      nextValue = value.replace(/\D/g, '').slice(0, DNI_LENGTH)
    }

    if (name === 'phone') {
      nextValue = value.replace(/\D/g, '').slice(0, MAX_PHONE_LENGTH)
    }

    setRegisterForm((previous) => ({ ...previous, [name]: nextValue }))
    setRegisterErrors((previous) => ({ ...previous, [name]: '' }))
    setRegisterStatus(null)
  }

  function issueVerification(email) {
    const code = createVerificationCode()
    setVerification({
      email,
      code,
      expiresAt: Date.now() + VERIFICATION_CODE_TTL_MS,
    })
    setVerificationCode('')
    setVerificationRemaining(30)
    setVerificationMessage({
      type: 'info',
      message: `Prototipo local: código de demostración ${code}. No se envió un correo real.`,
    })
    setView('verify-email')
  }

  function handleResendVerification() {
    if (!verification || verificationRemaining > 0) {
      return
    }
    issueVerification(verification.email)
  }

  function handleVerificationSubmit(event) {
    event.preventDefault()
    if (!verification) {
      return
    }
    if (Date.now() >= verification.expiresAt) {
      setVerificationRemaining(0)
      setVerificationMessage({
        type: 'error',
        message: 'El código venció. Solicita uno nuevo para continuar.',
      })
      return
    }
    if (!/^\d{6}$/.test(verificationCode)) {
      setVerificationMessage({
        type: 'error',
        message: 'Ingresa el código de 6 dígitos.',
      })
      return
    }
    if (verificationCode !== verification.code) {
      setVerificationMessage({
        type: 'error',
        message: 'El código no coincide. Revisa e inténtalo nuevamente.',
      })
      return
    }

    setResetEmail(verification.email)
    setResetForm({ password: '', confirmPassword: '' })
    setResetErrors({})
    setResetMessage(null)
    setVerification(null)
    setView('reset-password')
  }

  function handleForgotPasswordSubmit(event) {
    event.preventDefault()
    const email = forgotEmail.trim().toLowerCase()
    const emailError = validateEmail(email)
    const user = Object.values(users).find((candidate) => candidate.email === email)
    if (emailError) {
      setResetMessage({ type: 'error', message: emailError })
      return
    }
    if (!user) {
      setResetMessage({
        type: 'error',
        message: 'No encontramos una cuenta registrada con ese correo.',
      })
      return
    }
    issueVerification(email)
  }

  function handleResetChange(event) {
    const { name, value } = event.target
    setResetForm((previous) => ({ ...previous, [name]: value }))
    setResetErrors((previous) => ({ ...previous, [name]: '' }))
    setResetMessage(null)
  }

  async function handleResetPasswordSubmit(event) {
    event.preventDefault()
    const errors = {}
    const passwordError = validatePassword(resetForm.password)
    if (passwordError) {
      errors.password = passwordError
    }
    if (resetForm.password !== resetForm.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden.'
    }
    setResetErrors(errors)
    if (Object.keys(errors).length > 0) {
      return
    }

    const account = Object.values(users).find(
      (candidate) => candidate.email === resetEmail,
    )
    if (!account) {
      setResetMessage({
        type: 'error',
        message: 'No encontramos la cuenta para actualizar la contraseña.',
      })
      return
    }

    setResetBusy(true)
    try {
      const salt = createSalt()
      const passwordHash = await hashPassword(resetForm.password, salt)
      const nextUsers = {
        ...users,
        [account.dni]: { ...account, salt, passwordHash },
      }
      setUsers(nextUsers)
      saveUsers(nextUsers)
      setLoginForm({ identifier: resetEmail, password: '' })
      setLoginMessage({
        type: 'success',
        message: 'Contraseña actualizada. Ya puedes iniciar sesión.',
      })
      setResetForm({ password: '', confirmPassword: '' })
      setResetEmail('')
      setView('login')
    } catch {
      setResetMessage({
        type: 'error',
        message: 'No se pudo actualizar la contraseña. Inténtalo de nuevo.',
      })
    } finally {
      setResetBusy(false)
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault()
    if (loginBusy) {
      return
    }

    const errors = {}
    const identifier = loginForm.identifier.trim()

    if (!identifier) {
      errors.identifier = 'El correo electrónico es obligatorio.'
    } else {
      const emailError = validateEmail(identifier)
      if (emailError) {
        errors.identifier = emailError
      }
    }
    if (!loginForm.password) {
      errors.password = 'La contraseña es obligatoria.'
    }

    setLoginErrors(errors)
    if (Object.keys(errors).length > 0) {
      setLoginMessage({
        type: 'error',
        message: 'Revisa los campos marcados e inténtalo nuevamente.',
      })
      return
    }

    setLoginBusy(true)
    try {
      const data = await requestAuthApi(
        'login',
        {
          identifier,
          password: loginForm.password,
        },
        'No se pudo iniciar sesión.',
      )
      if (typeof data.token !== 'string' || !data.token) {
        throw new Error('El servidor no devolvió un token de acceso válido.')
      }

      window.localStorage.setItem('token', data.token)

      let user = users[identifier]
      if (!user && identifier.includes('@')) {
        user = Object.values(users).find(
          (candidate) => candidate.email === identifier.toLowerCase(),
        )
      }

      setIsAdmin(false)
      if (user) {
        setSessionDni(user.dni)
        setApiSessionUser(null)
        setProfileForm({
          username: user.username,
          description: user.description,
          avatar: user.avatar || 'gamepad',
          neonColor: user.neonColor || 'pink',
        })
      } else {
        const apiUser =
          data.user && typeof data.user === 'object' ? data.user : data
        const username =
          apiUser.username ||
          (identifier.includes('@') ? identifier.split('@')[0] : identifier)
        const authenticatedUser = {
          dni: String(apiUser.dni ?? apiUser.id ?? identifier),
          name: apiUser.name || username,
          username,
          email: apiUser.email || (identifier.includes('@') ? identifier : ''),
          phone: apiUser.phone || '',
          gender: apiUser.gender || 'Prefiero no decirlo',
          description: apiUser.description || '',
          avatar: apiUser.avatar || 'gamepad',
          neonColor: apiUser.neonColor || 'pink',
          role: apiUser.role || 'user',
        }
        setSessionDni('')
        setApiSessionUser(authenticatedUser)
        setProfileForm({
          username: authenticatedUser.username,
          description: authenticatedUser.description,
          avatar: authenticatedUser.avatar,
          neonColor: authenticatedUser.neonColor,
        })
      }
      setProfileErrors({})
      setProfileStatus(null)
      setLoginMessage(null)
      setView('catalog')
    } catch (error) {
      setLoginMessage({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo iniciar sesión. Inténtalo de nuevo.',
      })
    } finally {
      setLoginBusy(false)
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault()
    if (registerBusy) {
      return
    }

    const errors = buildRegisterErrors(registerForm, users)
    setRegisterErrors(errors)
    if (Object.keys(errors).length > 0) {
      setRegisterStatus({
        type: 'error',
        message: 'Revisa los campos marcados e inténtalo nuevamente.',
      })
      return
    }

    setRegisterBusy(true)

    try {
      await sendOtpCode(registerForm.email.trim().toLowerCase())
      setPendingRegistration({ ...registerForm })
      setOtpCode('')
      setOtpStatus({
        type: 'info',
        message: `Enviamos un código de verificación a ${registerForm.email.trim()}.`,
      })
      setOtpExpiresAt(Date.now() + OTP_TTL_MS)
      setOtpRemaining(30)
      setRegisterStatus(null)
      setView('verify-email')
    } catch (error) {
      setRegisterStatus({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo enviar el código. Inténtalo de nuevo.',
      })
    } finally {
      setRegisterBusy(false)
    }
  }

  async function handleOtpSubmit(event) {
    event.preventDefault()
    if (!pendingRegistration || otpBusy) {
      return
    }
    if (!/^\d{6}$/.test(otpCode)) {
      setOtpStatus({
        type: 'error',
        message: 'Ingresa el código de 6 dígitos enviado a tu correo.',
      })
      return
    }

    setOtpBusy(true)
    try {
      if (Date.now() >= otpExpiresAt) {
        setOtpRemaining(0)
        setOtpStatus({
          type: 'error',
          message: 'El código venció. Reenvía uno nuevo para continuar.',
        })
        return
      }
      await verifyOtpCode(
        pendingRegistration.email.trim().toLowerCase(),
        otpCode,
      )
      if (Date.now() >= otpExpiresAt) {
        setOtpRemaining(0)
        setOtpStatus({
          type: 'error',
          message: 'El código venció. Reenvía uno nuevo para continuar.',
        })
        return
      }

      const dni = pendingRegistration.dni
      const salt = createSalt()
      const passwordHash = await hashPassword(
        pendingRegistration.password,
        salt,
      )
      const typedUsername = pendingRegistration.username.trim()
      const username = typedUsername
        ? typedUsername
        : createUniqueUsername(
            slugifyUsername(
              pendingRegistration.email.split('@')[0] ||
                pendingRegistration.name,
            ),
            users,
            dni,
          )
      const nextUsers = {
        ...users,
        [dni]: {
          dni,
          name: pendingRegistration.name.trim(),
          phone: pendingRegistration.phone.trim(),
          email: pendingRegistration.email.trim().toLowerCase(),
          gender: pendingRegistration.gender,
          username,
          description: pendingRegistration.description.trim(),
          salt,
          passwordHash,
          createdAt: new Date().toISOString(),
        },
      }

      setUsers(nextUsers)
      if (apiSessionUser) {
        setApiSessionUser(nextUsers[sessionUser.dni])
      }
      saveUsers(nextUsers)
      setPendingRegistration(null)
      setOtpCode('')
      setOtpExpiresAt(0)
      setOtpRemaining(0)
      setOtpStatus(null)
      setRegisterForm(EMPTY_REGISTER_FORM)
      setRegisterErrors({})
      setLoginForm({ identifier: dni, password: '' })
      setLoginMessage({
        type: 'success',
        message: `Correo verificado. Registro completado; inicia sesión con tu DNI ${dni} o correo.`,
      })
      setLoginErrors({})
      setView('login')
    } catch (error) {
      setOtpStatus({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo verificar el código. Inténtalo de nuevo.',
      })
    } finally {
      setOtpBusy(false)
    }
  }

  async function handleOtpResend() {
    if (!pendingRegistration || otpBusy || otpRemaining > 0) {
      return
    }
    setOtpBusy(true)
    try {
      await sendOtpCode(pendingRegistration.email.trim().toLowerCase())
      setOtpCode('')
      setOtpExpiresAt(Date.now() + OTP_TTL_MS)
      setOtpRemaining(30)
      setOtpStatus({
        type: 'success',
        message: `Enviamos un nuevo código a ${pendingRegistration.email.trim()}.`,
      })
    } catch (error) {
      setOtpStatus({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo reenviar el código. Inténtalo de nuevo.',
      })
    } finally {
      setOtpBusy(false)
    }
  }

  function handleProfileSubmit(event) {
    event.preventDefault()
    if (!sessionUser) {
      return
    }

    const username = profileForm.username.trim()
    const errors = {}
    const usernameError = validateUsername(username)
    if (usernameError) {
      errors.username = usernameError
    } else if (isUsernameTaken(username, users, sessionUser.dni)) {
      errors.username = 'Ese nombre de usuario ya está en uso.'
    }

    const descriptionError = validateDescription(profileForm.description)
    if (descriptionError) {
      errors.description = descriptionError
    }

    setProfileErrors(errors)
    if (Object.keys(errors).length > 0) {
      setProfileStatus({
        type: 'error',
        message: 'Revisa los campos marcados e inténtalo nuevamente.',
      })
      return
    }

    const nextUsers = {
      ...users,
      [sessionUser.dni]: {
        ...sessionUser,
        username,
        description: profileForm.description.trim(),
        avatar: profileForm.avatar || sessionUser.avatar || 'gamepad',
        neonColor: profileForm.neonColor || sessionUser.neonColor || 'pink',
      },
    }

    setUsers(nextUsers)
    saveUsers(nextUsers)
    setProfileStatus({
      type: 'success',
      message: 'Perfil actualizado correctamente.',
    })
  }

  function handleLogout() {
    setSessionDni('')
    setApiSessionUser(null)
    setIsAdmin(false)
    window.localStorage.removeItem('token')
    setDeleteAccountOpen(false)
    setAdminForm(EMPTY_ADMIN_FORM)
    setAdminErrors({})
    setAdminMessage(null)
    setShowAdminPassword(false)
    setLoginForm({
      identifier:
        sessionUser && sessionUser.role !== 'admin'
          ? sessionUser.email || sessionUser.dni
          : '',
      password: '',
    })
    setLoginErrors({})
    setLoginMessage(null)
    setProfileStatus(null)
    setView('login')
  }

  function removeAccount(account) {
    if (!account) {
      return
    }
    const nextUsers = { ...users }
    delete nextUsers[account.dni]
    setUsers(nextUsers)
    saveUsers(nextUsers)
    purgeUserAccountData(account.dni, account.username)
  }

  function handleDeleteUser(account) {
    if (!isAdmin || !account) {
      return
    }
    removeAccount(account)
  }

  function handleDeleteOwnAccount() {
    if (!sessionUser || sessionUser.role === 'admin') {
      return
    }

    const deletedAccount = sessionUser
    removeAccount(deletedAccount)
    setDeleteAccountOpen(false)
    setSessionDni('')
    setApiSessionUser(null)
    setIsAdmin(false)
    window.localStorage.removeItem('token')
    setProfileForm({
      username: '',
      description: '',
      avatar: 'gamepad',
      neonColor: 'pink',
    })
    setProfileErrors({})
    setProfileStatus(null)
    setLoginForm(EMPTY_LOGIN_FORM)
    setLoginErrors({})
    setLoginMessage({
      type: 'info',
      message: `La cuenta @${deletedAccount.username} se eliminó definitivamente.`,
    })
    setView('login')
  }

  const headings = {
    login: {
      title: 'Inicia sesión en GameWeb',
      subtitle:
        'Accede con tu correo @gmail.com y tu contraseña para gestionar tu perfil.',
    },
    'admin-login': {
      title: 'Acceso administrador',
      subtitle:
        'Ingresa manualmente tus credenciales de administrador. Por seguridad, los campos nunca se rellenan automáticamente.',
    },
    'forgot-password': {
      title: 'Recuperar contraseña',
      subtitle: 'Te ayudaremos a restablecer el acceso a tu cuenta.',
    },
    'reset-password': {
      title: 'Crea una nueva contraseña',
      subtitle: 'Elige una contraseña segura para tu cuenta.',
    },
    register: {
      title: 'Crea tu perfil de jugador',
      subtitle: 'Regístrate con un correo @gmail.com y personaliza tu cuenta.',
    },
    'verify-email': {
      title: 'Verifica tu correo',
      subtitle: 'Ingresa el código de verificación para continuar.',
    },
    profile: {
      title: 'Tu perfil',
      subtitle: 'Cambia tu nombre de usuario y cuéntanos qué juegos te gustan.',
    },
    catalog: {
      title: 'Catálogo de juegos',
      subtitle:
        'Explora la sala GameWeb: busca por nombre o categoría y elige tu desafío.',
    },
    admin: {
      title: 'Panel de administración',
      subtitle:
        'Agrega, edita y elimina elementos del catálogo, revisa la autoría y gestiona los favoritos de la comunidad.',
    },
  }

  const heading = headings[view] || headings.login
  const cardWidth =
    view === 'catalog'
      ? 'max-w-[1700px]'
      : view === 'admin'
        ? 'max-w-7xl'
        : view === 'register'
          ? 'max-w-xl'
            : view === 'verify-email' || view === 'forgot-password' || view === 'reset-password'
              ? 'max-w-md'
            : view === 'profile'
            ? 'max-w-2xl'
            : 'max-w-md'

  return (
    <main
      className={`arcade-world theme-${themeId} relative flex min-h-dvh flex-col items-center gap-5 overflow-x-clip px-3 py-5 sm:gap-7 sm:px-4 sm:py-8 lg:py-10`}
    >
      <div className="arcade-sun" aria-hidden="true" />
      <div className="arcade-glow arcade-glow-pink" aria-hidden="true" />
      <div className="arcade-glow arcade-glow-cyan" aria-hidden="true" />
      <div className="arcade-scanlines" aria-hidden="true" />

      <section
        className={`arcade-panel relative w-full ${cardWidth} overflow-hidden p-4 transition-[max-width] duration-300 sm:p-7 lg:p-10`}
      >
        <header className="mb-5 text-center sm:mb-7">
          <div className="arcade-logo mx-auto mb-3 sm:mb-4" aria-hidden="true">
            <Gamepad2 className="h-7 w-7 sm:h-9 sm:w-9" />
          </div>
          <ThemeSelector />
          <h1 className="arcade-title mt-3">{heading.title}</h1>
          <p className="arcade-subtitle">{heading.subtitle}</p>
          {view !== 'profile' && <p className="arcade-coin">INSERT COIN</p>}
        </header>

        {(view === 'login' || view === 'register') && (
          <div className="arcade-tabs">
            <button
              type="button"
              onClick={() => switchView('login')}
              aria-pressed={view === 'login'}
              className={`arcade-tab ${view === 'login' ? 'arcade-tab-active' : ''}`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => switchView('register')}
              aria-pressed={view === 'register'}
              className={`arcade-tab ${view === 'register' ? 'arcade-tab-active' : ''}`}
            >
              Registrarme
            </button>
          </div>
        )}

        {view === 'login' && (
          <form
            key="login"
            className="animate-fade-slide space-y-5"
            onSubmit={handleLoginSubmit}
            noValidate
          >
            <div>
              <label htmlFor="login-identifier" className={labelClass}>
                Correo electrónico
              </label>
              <input
                id="login-identifier"
                name="identifier"
                type="email"
                autoComplete="email"
                value={loginForm.identifier}
                onChange={handleLoginChange}
                placeholder="tucorreo@gmail.com"
                aria-invalid={Boolean(loginErrors.identifier)}
                aria-describedby={
                  loginErrors.identifier ? 'login-identifier-error' : undefined
                }
                className={`${inputBase} ${inputState(
                  Boolean(loginErrors.identifier),
                )}`}
              />
              {loginErrors.identifier && (
                <p id="login-identifier-error" className={errorText}>
                  {loginErrors.identifier}
                </p>
              )}
            </div>

            <PasswordField
              id="login-password"
              name="password"
              label="Contraseña"
              value={loginForm.password}
              onChange={handleLoginChange}
              error={loginErrors.password}
              visible={showLoginPassword}
              onToggle={() => setShowLoginPassword((value) => !value)}
              autoComplete="current-password"
              placeholder="Tu contraseña"
            />

            <FormMessage status={loginMessage} />

            <button
              type="submit"
              disabled={loginBusy}
              className="arcade-btn arcade-btn-primary w-full px-4 py-3"
            >
              {loginBusy ? 'Ingresando...' : 'Iniciar sesión'}
            </button>

            <div className="mt-3 text-center">
              <button
                type="button"
                className="arcade-btn arcade-btn-secondary arcade-btn-sm"
                onClick={openAdminLogin}
              >
                Acceso Administrador
              </button>
            </div>

            <p className="arcade-hint text-center">
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(loginForm.identifier)
                  setResetMessage(null)
                  setView('forgot-password')
                }}
                className="arcade-link"
              >
                ¿No recuerdas tu contraseña?
              </button>
            </p>

            <p className="arcade-hint text-center">
              ¿Aún no tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => switchView('register')}
                className="arcade-link"
              >
                Crea tu perfil aquí
              </button>
            </p>

            <p className="arcade-hint text-center">
              Cuenta de prueba: jugador.test@gmail.com ·
              contraseña <strong>Arcade2024</strong>
            </p>
          </form>
        )}

        {view === 'forgot-password' && (
          <form
            className="animate-fade-slide space-y-5"
            onSubmit={handleForgotPasswordSubmit}
            noValidate
          >
            <div>
              <label htmlFor="forgot-email" className={labelClass}>
                Correo @gmail.com de tu cuenta
              </label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={forgotEmail}
                onChange={(event) => {
                  setForgotEmail(event.target.value)
                  setResetMessage(null)
                }}
                placeholder="tucorreo@gmail.com"
                className={inputBase}
              />
            </div>
            <FormMessage status={resetMessage} />
            <button
              type="submit"
              className="arcade-btn arcade-btn-primary w-full px-4 py-3"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Solicitar código
            </button>
            <button
              type="button"
              onClick={() => setView('login')}
              className="arcade-btn arcade-btn-secondary w-full px-4 py-3"
            >
              Volver al inicio de sesión
            </button>
          </form>
        )}

        {view === 'verify-email' && verification && !pendingRegistration && (
          <form
            className="animate-fade-slide space-y-5"
            onSubmit={handleVerificationSubmit}
            noValidate
          >
            <p className="arcade-hint text-center">
              Verifica tu identidad para restablecer la contraseña:{' '}
              <span className="text-white">{verification.email}</span>
            </p>
            <div className="arcade-message arcade-message-info">
              <Mail className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p>
                Prototipo local: código de demostración{' '}
                <strong className="select-all text-white">
                  {verification.code}
                </strong>
                . No se envió ningún correo.
              </p>
            </div>
            <div>
              <label htmlFor="verification-code" className={labelClass}>
                Código de verificación
              </label>
              <input
                id="verification-code"
                name="verificationCode"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="[0-9]{6}"
                value={verificationCode}
                onChange={(event) => {
                  setVerificationCode(
                    event.target.value.replace(/\D/g, '').slice(0, 6),
                  )
                  setVerificationMessage(null)
                }}
                placeholder="000000"
                className={`${inputBase} text-center font-mono text-2xl tracking-[0.5em]`}
                aria-describedby="verification-countdown"
              />
              <p
                id="verification-countdown"
                className="arcade-hint mt-2 flex items-center justify-center gap-1"
                aria-live="polite"
              >
                <Clock3 className="h-4 w-4" aria-hidden="true" />
                {verificationRemaining > 0
                  ? `El código vence en ${verificationRemaining} s`
                  : 'Código vencido'}
              </p>
            </div>
            <FormMessage status={verificationMessage} />
            <button
              type="submit"
              className="arcade-btn arcade-btn-primary w-full px-4 py-3"
            >
              Verificar código
            </button>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={verificationRemaining > 0}
              className="arcade-btn arcade-btn-secondary w-full px-4 py-3"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {verificationRemaining > 0
                ? `Solicitar otro código en ${verificationRemaining} s`
                : 'Solicitar código nuevo'}
            </button>
            <button
              type="button"
              onClick={() => {
                setVerification(null)
                setVerificationCode('')
                setVerificationRemaining(0)
                setView('login')
              }}
              className="arcade-link w-full text-center"
            >
              Cancelar
            </button>
          </form>
        )}

        {view === 'reset-password' && (
          <form
            className="animate-fade-slide space-y-5"
            onSubmit={handleResetPasswordSubmit}
            noValidate
          >
            <p className="arcade-hint text-center">
              Cuenta verificada: <span className="text-white">{resetEmail}</span>
            </p>
            <PasswordField
              id="reset-password"
              name="password"
              label="Nueva contraseña"
              value={resetForm.password}
              onChange={handleResetChange}
              error={resetErrors.password}
              visible={showRegisterPassword}
              onToggle={() => setShowRegisterPassword((value) => !value)}
              autoComplete="new-password"
              placeholder="Escribe una nueva contraseña"
            />
            <PasswordField
              id="reset-confirm-password"
              name="confirmPassword"
              label="Confirmar nueva contraseña"
              value={resetForm.confirmPassword}
              onChange={handleResetChange}
              error={resetErrors.confirmPassword}
              visible={showRegisterPassword}
              onToggle={() => setShowRegisterPassword((value) => !value)}
              autoComplete="new-password"
              placeholder="Repite la contraseña"
            />
            <FormMessage status={resetMessage} />
            <button
              type="submit"
              disabled={resetBusy}
              className="arcade-btn arcade-btn-primary w-full px-4 py-3"
            >
              {resetBusy ? 'Actualizando...' : 'Guardar contraseña'}
            </button>
          </form>
        )}

        {view === 'admin-login' && (
          <form
            key="admin-login"
            className="animate-fade-slide space-y-5"
            onSubmit={handleAdminSubmit}
            noValidate
            autoComplete="off"
          >
            <div>
              <label htmlFor="admin-identifier" className={labelClass}>
                DNI o usuario de administrador
              </label>
              <input
                id="admin-identifier"
                name="identifier"
                type="text"
                autoComplete="off"
                value={adminForm.identifier}
                onChange={handleAdminChange}
                placeholder="Escribe tu DNI o usuario"
                aria-invalid={Boolean(adminErrors.identifier)}
                aria-describedby={
                  adminErrors.identifier ? 'admin-identifier-error' : undefined
                }
                className={`${inputBase} ${inputState(
                  Boolean(adminErrors.identifier),
                )}`}
              />
              {adminErrors.identifier && (
                <p id="admin-identifier-error" className={errorText}>
                  {adminErrors.identifier}
                </p>
              )}
            </div>

            <PasswordField
              id="admin-password"
              name="password"
              label="Contraseña de administrador"
              value={adminForm.password}
              onChange={handleAdminChange}
              error={adminErrors.password}
              visible={showAdminPassword}
              onToggle={() => setShowAdminPassword((value) => !value)}
              autoComplete="off"
              placeholder="Escribe tu contraseña"
            />

            <FormMessage status={adminMessage} />

            <button
              type="submit"
              className="arcade-btn arcade-btn-primary w-full px-4 py-3"
            >
              Ingresar como administrador
            </button>

            <p className="arcade-hint text-center">
              <button
                type="button"
                onClick={() => switchView('login')}
                className="arcade-link"
              >
                Volver al inicio de sesión
              </button>
            </p>
          </form>
        )}

        {view === 'register' && (
          <form
            key="register"
            className="animate-fade-slide space-y-5"
            onSubmit={handleRegisterSubmit}
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="register-name" className={labelClass}>
                  Nombre completo
                </label>
                <input
                  id="register-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={registerForm.name}
                  onChange={handleRegisterChange}
                  placeholder="Tu nombre"
                  aria-invalid={Boolean(registerErrors.name)}
                  aria-describedby={
                    registerErrors.name ? 'register-name-error' : undefined
                  }
                  className={`${inputBase} ${inputState(
                    Boolean(registerErrors.name),
                  )}`}
                />
                {registerErrors.name && (
                  <p id="register-name-error" className={errorText}>
                    {registerErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="register-phone" className={labelClass}>
                  Teléfono{' '}
                  <span className="arcade-optional">(opcional)</span>
                </label>
                <input
                  id="register-phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  maxLength={MAX_PHONE_LENGTH}
                  autoComplete="tel"
                  value={registerForm.phone}
                  onChange={handleRegisterChange}
                  placeholder="Solo números"
                  aria-invalid={Boolean(registerErrors.phone)}
                  aria-describedby={
                    registerErrors.phone ? 'register-phone-error' : undefined
                  }
                  className={`${inputBase} ${inputState(
                    Boolean(registerErrors.phone),
                  )}`}
                />
                {registerErrors.phone && (
                  <p id="register-phone-error" className={errorText}>
                    {registerErrors.phone}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="register-email" className={labelClass}>
                  Correo electrónico
                </label>
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={registerForm.email}
                  onChange={handleRegisterChange}
                  placeholder="tucorreo@gmail.com"
                  aria-invalid={Boolean(registerErrors.email)}
                  aria-describedby={
                    registerErrors.email ? 'register-email-error' : undefined
                  }
                  className={`${inputBase} ${inputState(
                    Boolean(registerErrors.email),
                  )}`}
                />
                {registerErrors.email && (
                  <p id="register-email-error" className={errorText}>
                    {registerErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="register-dni" className={labelClass}>
                  DNI
                </label>
                <input
                  id="register-dni"
                  name="dni"
                  type="text"
                  inputMode="numeric"
                  maxLength={DNI_LENGTH}
                  autoComplete="off"
                  value={registerForm.dni}
                  onChange={handleRegisterChange}
                  placeholder="8 dígitos"
                  aria-invalid={Boolean(registerErrors.dni)}
                  aria-describedby={
                    registerErrors.dni ? 'register-dni-error' : undefined
                  }
                  className={`${inputBase} ${inputState(
                    Boolean(registerErrors.dni),
                  )}`}
                />
                {registerErrors.dni && (
                  <p id="register-dni-error" className={errorText}>
                    {registerErrors.dni}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="register-gender" className={labelClass}>
                  Género
                </label>
                <select
                  id="register-gender"
                  name="gender"
                  value={registerForm.gender}
                  onChange={handleRegisterChange}
                  aria-invalid={Boolean(registerErrors.gender)}
                  aria-describedby={
                    registerErrors.gender ? 'register-gender-error' : undefined
                  }
                  className={`${inputBase} ${inputState(
                    Boolean(registerErrors.gender),
                  )}`}
                >
                  <option value="">Selecciona una opción</option>
                  {GENDERS.map((gender) => (
                    <option key={gender} value={gender}>
                      {gender}
                    </option>
                  ))}
                </select>
                {registerErrors.gender && (
                  <p id="register-gender-error" className={errorText}>
                    {registerErrors.gender}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="register-username" className={labelClass}>
                  Nombre de usuario{' '}
                  <span className="arcade-optional">(opcional)</span>
                </label>
                <input
                  id="register-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={registerForm.username}
                  onChange={handleRegisterChange}
                  placeholder="Ejemplo: pixel_master"
                  aria-invalid={Boolean(registerErrors.username)}
                  aria-describedby={
                    registerErrors.username
                      ? 'register-username-error'
                      : 'register-username-help'
                  }
                  className={`${inputBase} ${inputState(
                    Boolean(registerErrors.username),
                  )}`}
                />
                {registerErrors.username ? (
                  <p id="register-username-error" className={errorText}>
                    {registerErrors.username}
                  </p>
                ) : (
                  <p
                    id="register-username-help"
                    className="arcade-hint mt-1.5"
                  >
                    Si lo dejas vacío, crearemos uno por ti.
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="register-description" className={labelClass}>
                  Descripción corta o juegos favoritos{' '}
                  <span className="arcade-optional">(opcional)</span>
                </label>
                <span className="arcade-hint">
                  {registerForm.description.length}/{MAX_DESCRIPTION_LENGTH}
                </span>
              </div>
              <textarea
                id="register-description"
                name="description"
                rows="3"
                maxLength={MAX_DESCRIPTION_LENGTH}
                value={registerForm.description}
                onChange={handleRegisterChange}
                placeholder="Cuéntanos qué juegos te gustan o cómo te describes."
                aria-invalid={Boolean(registerErrors.description)}
                aria-describedby={
                  registerErrors.description
                    ? 'register-description-error'
                    : undefined
                }
                className={`${inputBase} resize-none ${inputState(
                  Boolean(registerErrors.description),
                )}`}
              />
              {registerErrors.description && (
                <p id="register-description-error" className={errorText}>
                  {registerErrors.description}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <PasswordField
                id="register-password"
                name="password"
                label="Contraseña"
                value={registerForm.password}
                onChange={handleRegisterChange}
                error={registerErrors.password}
                visible={showRegisterPassword}
                onToggle={() => setShowRegisterPassword((value) => !value)}
                autoComplete="new-password"
                placeholder={`${MIN_PASSWORD_LENGTH} a ${MAX_PASSWORD_LENGTH} caracteres`}
              />

              <PasswordField
                id="register-confirm-password"
                name="confirmPassword"
                label="Confirmar contraseña"
                value={registerForm.confirmPassword}
                onChange={handleRegisterChange}
                error={registerErrors.confirmPassword}
                visible={showRegisterPassword}
                onToggle={() => setShowRegisterPassword((value) => !value)}
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
              />
            </div>

            <FormMessage status={registerStatus} />

            <button
              type="submit"
              disabled={registerBusy}
              className="arcade-btn arcade-btn-primary w-full px-4 py-3"
            >
              {registerBusy ? 'Creando perfil...' : 'Crear mi cuenta'}
            </button>
          </form>
        )}

        {view === 'verify-email' && pendingRegistration && (
          <form
            className="animate-fade-slide space-y-5"
            onSubmit={handleOtpSubmit}
            noValidate
          >
            <p className="arcade-hint text-center">
              Ingresa el código enviado a{' '}
              <span className="text-white">
                {pendingRegistration.email.trim()}
              </span>
              .
            </p>
            <div>
              <label htmlFor="register-otp" className={labelClass}>
                Código de verificación
              </label>
              <input
                id="register-otp"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otpCode}
                onChange={(event) => {
                  setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                  setOtpStatus(null)
                }}
                placeholder="000000"
                aria-label="Código OTP de seis dígitos"
                className={`${inputBase} text-center font-mono text-2xl tracking-[0.5em]`}
              />
              <p className="arcade-hint mt-2 text-center" aria-live="polite">
                {otpRemaining > 0
                  ? `El código vence en ${otpRemaining} s`
                  : 'El código venció. Solicita uno nuevo.'}
              </p>
            </div>
            <FormMessage status={otpStatus} />
            <button
              type="submit"
              disabled={otpBusy || otpRemaining === 0}
              className="arcade-btn arcade-btn-primary w-full px-4 py-3"
            >
              {otpBusy ? 'Verificando...' : 'Verificar código'}
            </button>
            <button
              type="button"
              onClick={handleOtpResend}
              disabled={otpBusy || otpRemaining > 0}
              className="arcade-btn arcade-btn-secondary w-full px-4 py-3"
            >
              {otpBusy
                ? 'Procesando...'
                : otpRemaining > 0
                  ? `Reenviar código en ${otpRemaining} s`
                  : 'Reenviar código'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingRegistration(null)
                setOtpCode('')
                setOtpStatus(null)
                setView('register')
              }}
              className="arcade-link w-full text-center"
            >
              Volver al registro
            </button>
          </form>
        )}

        {view === 'catalog' && sessionUser && (
          <GameCatalog
            user={sessionUser}
            isAdmin={isAdmin}
            onOpenAdmin={() => switchView('admin')}
            onEditProfile={() => switchView('profile')}
            onLogout={handleLogout}
          />
        )}

        {view === 'admin' && isAdmin && sessionUser && (
          <AdminPanel
            user={sessionUser}
            users={users}
            onDeleteUser={handleDeleteUser}
            onBack={() => switchView('catalog')}
          />
        )}

        {view === 'profile' && sessionUser && (
          <div key="profile" className="animate-fade-slide space-y-6">
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => switchView('catalog')}
                className="arcade-btn arcade-btn-secondary arcade-btn-sm flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al
                catálogo
              </button>
            </div>
            <div className="arcade-card p-5">
              <div className="flex flex-wrap items-center gap-4">
                <ArcadeAvatar user={sessionUser} size="lg" />
                <div className="min-w-0">
                  <p className="arcade-profile-name truncate">
                    @{sessionUser.username}
                  </p>
                  <p className="arcade-hint">
                    {sessionUser.name} · DNI {sessionUser.dni}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="arcade-btn arcade-btn-secondary arcade-btn-sm sm:ml-auto"
                >
                  Cerrar sesión
                </button>
              </div>

              {sessionUser.description && (
                <p className="arcade-subcard arcade-meta-value mt-4 p-3">
                  {sessionUser.description}
                </p>
              )}

              <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="arcade-subcard p-3">
                  <dt className="arcade-meta-label">Correo</dt>
                  <dd className="arcade-meta-value mt-1 truncate">
                    {sessionUser.email}
                  </dd>
                </div>
                <div className="arcade-subcard p-3">
                  <dt className="arcade-meta-label">Teléfono</dt>
                  <dd className="arcade-meta-value mt-1">
                    {sessionUser.phone || 'No registrado'}
                  </dd>
                </div>
                <div className="arcade-subcard p-3">
                  <dt className="arcade-meta-label">Género</dt>
                  <dd className="arcade-meta-value mt-1">{sessionUser.gender}</dd>
                </div>
              </dl>
            </div>

            <section
              className="arcade-card p-5"
              aria-labelledby="profile-stats-title"
            >
              <h2
                id="profile-stats-title"
                className="arcade-profile-name mb-4 flex items-center gap-2"
              >
                <Trophy className="h-5 w-5 text-[#ffd319]" aria-hidden="true" />
                Tus récords y juegos jugados
              </h2>
              {sessionPlayedGames.length > 0 ? (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {sessionPlayedGames.map((game) => {
                    const score = readHighScore(sessionUser.dni, game.id)
                    return (
                      <li
                        key={game.id}
                        className="arcade-subcard flex items-center justify-between gap-3 p-3"
                      >
                        <span className="arcade-meta-value truncate">
                          {game.name}
                        </span>
                        <span className="arcade-table-score shrink-0">
                          <Trophy
                            className="h-3.5 w-3.5 text-[#ffd319]"
                            aria-hidden="true"
                          />
                          {score > 0 ? `${score} pts` : 'Sin récord'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="arcade-hint">
                  Aún no has jugado ningún juego. Tus récords y juegos jugados
                  aparecerán aquí y serán solo tuyos.
                </p>
              )}
            </section>

            <section
              className="arcade-card p-5"
              aria-labelledby="profile-avatar-title"
            >
              <h2 id="profile-avatar-title" className="arcade-profile-name mb-4 text-center">
                Personaliza tu avatar
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {AVATAR_ICONS.map((option) => {
                  const Icon = AVATAR_ICON_MAP[option.id] ?? Gamepad2
                  const isActive = (profileForm.avatar || 'gamepad') === option.id
                  const neonColor = NEON_COLORS.find((c) => c.id === (profileForm.neonColor || 'pink'))?.value ?? '#ff2e88'
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      aria-label={`Avatar ${option.label}`}
                      title={option.label}
                      onClick={() => {
                        setProfileForm((previous) => ({
                          ...previous,
                          avatar: option.id,
                        }))
                        setProfileStatus(null)
                      }}
                      className="theme-swatch"
                      style={{
                        '--swatch-a': '#ff2e88',
                        '--swatch-b': '#00e5ff',
                        '--swatch-c': '#8a2be2',
                      }}
                    >
                      <span className="theme-swatch-ring" data-active={isActive || undefined}>
                        <span className="theme-swatch-inner" />
                      </span>
                      <span className="theme-swatch-label">{option.label}</span>
                      <Icon className="h-5 w-5" style={{ color: neonColor }} />
                    </button>
                  )
                })}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {NEON_COLORS.map((option) => {
                  const isActive = (profileForm.neonColor || 'pink') === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      aria-label={`Color de neón ${option.label}`}
                      title={option.label}
                      onClick={() => {
                        setProfileForm((previous) => ({
                          ...previous,
                          neonColor: option.id,
                        }))
                        setProfileStatus(null)
                      }}
                      className="arcade-btn arcade-btn-secondary arcade-btn-sm"
                      style={{
                        borderColor: option.value,
                        boxShadow: `0 0 10px ${option.value}55`,
                      }}
                    >
                      <span
                        className="inline-block h-3.5 w-3.5 rounded-full"
                        style={{ backgroundColor: option.value, boxShadow: `0 0 8px ${option.value}` }}
                        aria-hidden="true"
                      />
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </section>

            <FormMessage status={profileStatus} />

            <form className="space-y-5" onSubmit={handleProfileSubmit} noValidate>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="profile-username" className={labelClass}>
                    Nombre de usuario
                  </label>
                  <span className="arcade-hint">
                    Se muestra como @{profileForm.username || 'usuario'}
                  </span>
                </div>
                <input
                  id="profile-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={profileForm.username}
                  onChange={(event) => {
                    setProfileForm((previous) => ({
                      ...previous,
                      username: event.target.value,
                    }))
                    setProfileErrors((previous) => ({
                      ...previous,
                      username: '',
                    }))
                    setProfileStatus(null)
                  }}
                  placeholder="Tu nombre de usuario"
                  aria-invalid={Boolean(profileErrors.username)}
                  aria-describedby={
                    profileErrors.username
                      ? 'profile-username-error'
                      : 'profile-username-help'
                  }
                  className={`${inputBase} ${inputState(
                    Boolean(profileErrors.username),
                  )}`}
                />
                {profileErrors.username ? (
                  <p id="profile-username-error" className={errorText}>
                    {profileErrors.username}
                  </p>
                ) : (
                  <p
                    id="profile-username-help"
                    className="arcade-hint mt-1.5"
                  >
                    3 a 20 caracteres: letras, números o guion bajo.
                  </p>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="profile-description" className={labelClass}>
                    Descripción o juegos favoritos
                  </label>
                  <span className="arcade-hint">
                    {profileForm.description.length}/{MAX_DESCRIPTION_LENGTH}
                  </span>
                </div>
                <textarea
                  id="profile-description"
                  name="description"
                  rows="3"
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  value={profileForm.description}
                  onChange={(event) => {
                    setProfileForm((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                    setProfileErrors((previous) => ({
                      ...previous,
                      description: '',
                    }))
                    setProfileStatus(null)
                  }}
                  placeholder="Ejemplo: Fan de los RPG y los shooters competitivos."
                  aria-invalid={Boolean(profileErrors.description)}
                  aria-describedby={
                    profileErrors.description
                      ? 'profile-description-error'
                      : undefined
                  }
                  className={`${inputBase} resize-none ${inputState(
                    Boolean(profileErrors.description),
                  )}`}
                />
                {profileErrors.description && (
                  <p id="profile-description-error" className={errorText}>
                    {profileErrors.description}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="arcade-btn arcade-btn-primary w-full px-4 py-3"
              >
                Guardar cambios
              </button>
            </form>

            <section
              className="arcade-card border-[#ff4d6d55] p-5"
              aria-labelledby="delete-account-title"
            >
              <h2
                id="delete-account-title"
                className="arcade-profile-name mb-2 flex items-center gap-2"
              >
                <Trash2
                  className="h-5 w-5 text-[#ff4d6d]"
                  aria-hidden="true"
                />
                Zona de peligro
              </h2>
              <p className="arcade-hint mb-4">
                Eliminar tu cuenta borrará de forma definitiva tu perfil,
                récords, juegos jugados, favoritos y comentarios. No se puede
                deshacer.
              </p>
              <button
                type="button"
                onClick={() => setDeleteAccountOpen(true)}
                className="arcade-btn arcade-btn-sm flex items-center gap-2 border-[#ff4d6d] bg-[#ff4d6d22] text-[#ff8fa3] hover:bg-[#ff4d6d33]"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Eliminar mi cuenta
              </button>
            </section>
          </div>
        )}

      </section>

      {(view === 'login' || view === 'register') && (
        <div className="w-full max-w-5xl">
          <CommunityComments sessionUser={sessionUser} />
        </div>
      )}

      {deleteAccountOpen && sessionUser && sessionUser.role !== 'admin' && (
        <ConfirmDialog
          title="ELIMINAR MI CUENTA"
          message={`¿Seguro que quieres eliminar la cuenta @${sessionUser.username}? Se borrarán de forma definitiva tu perfil, récords, juegos jugados, favoritos y comentarios. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar mi cuenta"
          onConfirm={handleDeleteOwnAccount}
          onCancel={() => setDeleteAccountOpen(false)}
        />
      )}
    </main>
  )
}

export default LoginPage
