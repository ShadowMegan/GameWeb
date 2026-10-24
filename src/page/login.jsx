import { useEffect, useRef, useState } from 'react'

const USERS_KEY = 'gameweb_users'
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/
const DNI_LENGTH = 8
const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 32
const MAX_DESCRIPTION_LENGTH = 140
const MAX_PHONE_LENGTH = 15
const GENDERS = ['Masculino', 'Femenino', 'No binario', 'Prefiero no decirlo']
const SUSPICIOUS_DOMAINS = [
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'yopmail.com',
  'trashmail.com',
  'fakeinbox.com',
  'sharklasers.com',
]

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

const inputBase =
  'w-full rounded-xl border bg-slate-900/60 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:ring-2'
const labelClass = 'mb-2 block text-sm font-medium text-slate-200'
const errorText = 'mt-1.5 text-xs text-red-300'
const inputState = (hasError) =>
  hasError
    ? 'border-red-400/60 focus:border-red-400 focus:ring-red-500/30'
    : 'border-white/10 focus:border-indigo-400 focus:ring-indigo-500/30'

function loadUsers() {
  try {
    const rawUsers = window.localStorage.getItem(USERS_KEY)
    return rawUsers ? JSON.parse(rawUsers) : {}
  } catch {
    return {}
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
    return 'Ingresa un correo válido (ejemplo: nombre@gmail.com).'
  }
  const domain = email.slice(email.lastIndexOf('@') + 1)
  if (SUSPICIOUS_DOMAINS.includes(domain)) {
    return 'No se permiten correos temporales o de dominios sospechosos.'
  }
  return ''
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

function createUniqueUsername(base, users) {
  const slug = slugifyUsername(base)
  const safeBase = slug.length >= 3 ? slug : `player${slug}`.slice(0, 20)
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

function getInitials(user) {
  const source = (user.username || user.name || '?').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function FormMessage({ status }) {
  if (!status) {
    return null
  }

  const isError = status.type === 'error'
  const styles = isError
    ? 'border-red-400/30 bg-red-500/10 text-red-200'
    : status.type === 'info'
      ? 'border-sky-400/30 bg-sky-500/10 text-sky-200'
      : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live="polite"
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${styles}`}
    >
      <svg
        className="mt-0.5 h-5 w-5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        role="presentation"
        aria-hidden="true"
      >
        {isError ? (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
          </>
        ) : (
          <path
            d="m5 13 4 4L19 7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
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
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
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
          className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 transition hover:text-indigo-300 focus:outline-none focus-visible:text-indigo-300"
        >
          {visible ? (
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              role="presentation"
              aria-hidden="true"
            >
              <path
                d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8"
                strokeLinecap="round"
              />
              <path
                d="M6.6 6.6C4.5 8 3 9.9 2 12c1.7 3.6 5.5 6.5 10 6.5 1.6 0 3.1-.4 4.5-1M9.9 5.7c.7-.1 1.4-.2 2.1-.2 4.5 0 8.3 2.9 10 6.5-.5 1.1-1.2 2.1-2 3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              role="presentation"
              aria-hidden="true"
            >
              <path d="M2 12c1.7-3.6 5.5-6.5 10-6.5s8.3 2.9 10 6.5c-1.7 3.6-5.5 6.5-10 6.5S3.7 15.6 2 12Z" />
              <circle cx="12" cy="12" r="2.5" />
            </svg>
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

  const [loginForm, setLoginForm] = useState(EMPTY_LOGIN_FORM)
  const [loginErrors, setLoginErrors] = useState({})
  const [loginMessage, setLoginMessage] = useState(null)
  const [loginBusy, setLoginBusy] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER_FORM)
  const [registerErrors, setRegisterErrors] = useState({})
  const [registerStatus, setRegisterStatus] = useState(null)
  const [registerBusy, setRegisterBusy] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [pendingDni, setPendingDni] = useState('')

  const [profileForm, setProfileForm] = useState({
    username: '',
    description: '',
  })
  const [profileErrors, setProfileErrors] = useState({})
  const [profileStatus, setProfileStatus] = useState(null)

  const successTimer = useRef(null)
  const sessionUser = sessionDni ? users[sessionDni] : null

  useEffect(() => {
    return () => {
      if (successTimer.current) {
        window.clearTimeout(successTimer.current)
      }
    }
  }, [])

  function switchView(nextView) {
    if (successTimer.current) {
      window.clearTimeout(successTimer.current)
      successTimer.current = null
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

  async function handleLoginSubmit(event) {
    event.preventDefault()
    if (loginBusy) {
      return
    }

    const errors = {}
    const identifier = loginForm.identifier.trim()
    if (!identifier) {
      errors.identifier = 'El DNI o correo electrónico es obligatorio.'
    } else if (identifier.includes('@')) {
      const emailError = validateEmail(identifier)
      if (emailError) {
        errors.identifier = emailError
      }
    } else {
      const dniError = validateDni(identifier)
      if (dniError) {
        errors.identifier = dniError
      }
    }
    if (!loginForm.password) {
      errors.password = 'La contraseña es obligatoria.'
    }

    setLoginErrors(errors)
    if (Object.keys(errors).length > 0) {
      setLoginMessage({
        type: 'error',
        message: 'Revisa los datos ingresados e inténtalo de nuevo.',
      })
      return
    }

    let user = users[identifier]
    if (!user && identifier.includes('@')) {
      user = Object.values(users).find(
        (candidate) => candidate.email === identifier.toLowerCase(),
      )
    }

    if (!user) {
      setLoginMessage({
        type: 'error',
        message:
          'No existe una cuenta con ese DNI o correo. Regístrate para crear tu perfil.',
      })
      return
    }

    setLoginBusy(true)
    try {
      const passwordHash = await hashPassword(loginForm.password, user.salt)
      if (passwordHash !== user.passwordHash) {
        setLoginMessage({
          type: 'error',
          message: 'Contraseña incorrecta. Verifica tus datos e inténtalo otra vez.',
        })
        return
      }

      setSessionDni(user.dni)
      setProfileForm({
        username: user.username,
        description: user.description,
      })
      setProfileErrors({})
      setProfileStatus(null)
      setLoginMessage(null)
      setView('profile')
    } catch {
      setLoginMessage({
        type: 'error',
        message: 'No se pudo verificar la cuenta. Inténtalo de nuevo.',
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

    const dni = registerForm.dni
    setRegisterBusy(true)

    try {
      const salt = createSalt()
      const passwordHash = await hashPassword(registerForm.password, salt)
      const typedUsername = registerForm.username.trim()
      const username = typedUsername
        ? typedUsername
        : createUniqueUsername(
            slugifyUsername(
              registerForm.email.split('@')[0] || registerForm.name,
            ),
            users,
          )

      const nextUsers = {
        ...users,
        [dni]: {
          dni,
          name: registerForm.name.trim(),
          phone: registerForm.phone.trim(),
          email: registerForm.email.trim().toLowerCase(),
          gender: registerForm.gender,
          username,
          description: registerForm.description.trim(),
          salt,
          passwordHash,
          createdAt: new Date().toISOString(),
        },
      }

      setUsers(nextUsers)
      saveUsers(nextUsers)
      setPendingDni(dni)
      setRegisterStatus({ type: 'success' })

      successTimer.current = window.setTimeout(() => {
        setLoginForm({ identifier: dni, password: '' })
        setLoginMessage({
          type: 'info',
          message: `Registro completado. Ingresa tu contraseña para acceder con el DNI ${dni} o tu correo.`,
        })
        setLoginErrors({})
        setRegisterForm(EMPTY_REGISTER_FORM)
        setRegisterErrors({})
        setRegisterStatus(null)
        setView('login')
        successTimer.current = null
      }, 2200)
    } catch {
      setRegisterStatus({
        type: 'error',
        message: 'No se pudo completar el registro. Inténtalo de nuevo.',
      })
    } finally {
      setRegisterBusy(false)
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
    setLoginForm({
      identifier: sessionUser ? sessionUser.dni : '',
      password: '',
    })
    setLoginErrors({})
    setLoginMessage(null)
    setProfileStatus(null)
    setView('login')
  }

  const headings = {
    login: {
      title: 'Inicia sesión en GameWeb',
      subtitle:
        'Accede con tu DNI o correo electrónico y tu contraseña para gestionar tu perfil.',
    },
    register: {
      title: 'Crea tu perfil de jugador',
      subtitle:
        'Registra tus datos personales y personaliza tu cuenta de GameWeb.',
    },
    profile: {
      title: 'Tu perfil',
      subtitle: 'Cambia tu nombre de usuario y cuéntanos qué juegos te gustan.',
    },
  }

  const heading = headings[view]
  const cardWidth =
    view === 'register' ? 'max-w-xl' : view === 'profile' ? 'max-w-2xl' : 'max-w-md'

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-slate-100">
      <div className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-indigo-600/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-32 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />

      <section
        className={`relative w-full ${cardWidth} overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl transition-[max-width] duration-300 sm:p-10`}
      >
        <header className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/30">
            <svg
              className="h-7 w-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              role="presentation"
              aria-hidden="true"
            >
              <path
                d="M17.5 6.5h-11A4.5 4.5 0 0 0 2 11v2.5A3.5 3.5 0 0 0 8.4 16l1.2-1.5h4.8l1.2 1.5A3.5 3.5 0 0 0 22 13.5V11a4.5 4.5 0 0 0-4.5-4.5Z"
                strokeLinejoin="round"
              />
              <path d="M6 12h4M8 10v4" strokeLinecap="round" />
              <path
                d="M15 11h.01M17.5 13h.01"
                strokeLinecap="round"
                strokeWidth="2.4"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {heading.title}
          </h1>
          <p className="mt-2 text-sm text-slate-400">{heading.subtitle}</p>
        </header>

        {view !== 'profile' && (
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-slate-900/60 p-1">
            <button
              type="button"
              onClick={() => switchView('login')}
              aria-pressed={view === 'login'}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                view === 'login'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-950/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => switchView('register')}
              aria-pressed={view === 'register'}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                view === 'register'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-950/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
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
                DNI o correo electrónico
              </label>
              <input
                id="login-identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                value={loginForm.identifier}
                onChange={handleLoginChange}
                placeholder="8 dígitos o tucorreo@gmail.com"
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
              className="w-full rounded-xl bg-indigo-500 px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loginBusy ? 'Verificando...' : 'Iniciar sesión'}
            </button>

            <p className="text-center text-xs text-slate-500">
              ¿Aún no tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => switchView('register')}
                className="font-semibold text-indigo-300 transition hover:text-indigo-200"
              >
                Crea tu perfil aquí
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
                  <span className="font-normal text-slate-500">(opcional)</span>
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
                  placeholder="8 dígitos, sin letras"
                  aria-invalid={Boolean(registerErrors.dni)}
                  aria-describedby={
                    registerErrors.dni ? 'register-dni-error' : undefined
                  }
                  className={`${inputBase} tracking-[0.3em] ${inputState(
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
                  <span className="font-normal text-slate-500">(opcional)</span>
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
                    className="mt-1.5 text-xs text-slate-500"
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
                  <span className="font-normal text-slate-500">(opcional)</span>
                </label>
                <span className="text-xs text-slate-500">
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
              className="w-full rounded-xl bg-indigo-500 px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {registerBusy ? 'Creando perfil...' : 'Crear mi cuenta'}
            </button>
          </form>
        )}

        {view === 'profile' && sessionUser && (
          <div key="profile" className="animate-fade-slide space-y-6">
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/15 text-xl font-bold text-indigo-200 ring-1 ring-indigo-400/30">
                  {getInitials(sessionUser)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-white">
                    @{sessionUser.username}
                  </p>
                  <p className="text-sm text-slate-400">
                    {sessionUser.name} · DNI {sessionUser.dni}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="ml-auto rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                >
                  Cerrar sesión
                </button>
              </div>

              {sessionUser.description && (
                <p className="mt-4 rounded-xl border border-white/10 bg-slate-950/40 p-3 text-sm text-slate-300">
                  {sessionUser.description}
                </p>
              )}

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                  <dt className="text-xs text-slate-500">Correo</dt>
                  <dd className="mt-1 truncate text-slate-200">
                    {sessionUser.email}
                  </dd>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                  <dt className="text-xs text-slate-500">Teléfono</dt>
                  <dd className="mt-1 text-slate-200">
                    {sessionUser.phone || 'No registrado'}
                  </dd>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                  <dt className="text-xs text-slate-500">Género</dt>
                  <dd className="mt-1 text-slate-200">{sessionUser.gender}</dd>
                </div>
              </dl>
            </div>

            <FormMessage status={profileStatus} />

            <form className="space-y-5" onSubmit={handleProfileSubmit} noValidate>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="profile-username" className={labelClass}>
                    Nombre de usuario
                  </label>
                  <span className="text-xs text-slate-500">
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
                    className="mt-1.5 text-xs text-slate-500"
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
                  <span className="text-xs text-slate-500">
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
                className="w-full rounded-xl bg-indigo-500 px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Guardar cambios
              </button>
            </form>
          </div>
        )}

        {registerStatus?.type === 'success' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-3xl bg-slate-950/90 p-8 text-center backdrop-blur-md">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/20" />
              <span className="relative flex h-20 w-20 animate-pop-in items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/40">
                <svg
                  className="h-10 w-10 text-emerald-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  role="presentation"
                  aria-hidden="true"
                >
                  <path
                    d="m5 13 4 4L19 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
            <h2 className="animate-fade-slide text-2xl font-bold tracking-wide text-emerald-200">
              REGISTRO EXITOSO
            </h2>
            <p className="max-w-xs animate-fade-slide text-sm text-slate-300">
              Tu perfil fue creado. Te llevaremos al inicio de sesión con el DNI{' '}
              <span className="font-semibold text-white">{pendingDni}</span>.
            </p>
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-full origin-left animate-progress rounded-full bg-emerald-400" />
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

export default LoginPage
