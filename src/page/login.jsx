import { useState } from 'react'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/
const MIN_PASSWORD_LENGTH = 6
const MAX_PASSWORD_LENGTH = 12
const TRUSTED_DOMAINS = [
  'gameweb.com',
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'yahoo.com',
]
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
const MOCK_USERS = {
  'demo@gameweb.com': 'Gameweb123',
  'player@gmail.com': 'Player1234',
}

function validateEmail(rawEmail) {
  const email = rawEmail.trim().toLowerCase()
  if (!email) {
    return 'El correo electrónico es obligatorio.'
  }
  if (!EMAIL_REGEX.test(email)) {
    return 'El correo no tiene una sintaxis válida (ejemplo: usuario@dominio.com).'
  }
  const domain = email.slice(email.lastIndexOf('@') + 1)
  if (SUSPICIOUS_DOMAINS.includes(domain)) {
    return 'No se permite el acceso con correos temporales o dominios sospechosos.'
  }
  if (!TRUSTED_DOMAINS.includes(domain)) {
    return `El dominio "${domain}" no está verificado. Usa un correo de confianza.`
  }
  return ''
}

function validatePassword(password) {
  if (!password) {
    return 'La contraseña es obligatoria.'
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `La contraseña no puede superar los ${MAX_PASSWORD_LENGTH} caracteres.`
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
  }
  return ''
}

function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const isSuccess = status === 'success'

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
    setStatus('idle')
    setMessage('')
  }

  function handleSubmit(event) {
    event.preventDefault()

    const emailError = validateEmail(form.email)
    const passwordError = validatePassword(form.password)
    setErrors({ email: emailError, password: passwordError })

    if (emailError || passwordError) {
      setStatus('error')
      setMessage('Revisa los datos ingresados e inténtalo de nuevo.')
      return
    }

    const email = form.email.trim().toLowerCase()
    if (MOCK_USERS[email] !== form.password) {
      setStatus('error')
      setMessage(
        'Usuario o contraseña incorrectos. Verifica tus datos e inténtalo otra vez.',
      )
      return
    }

    setStatus('success')
    setMessage('Acceso correcto. Puedes acceder a tu cuenta de GameWeb.')
  }

  const inputBase =
    'w-full rounded-xl border bg-slate-900/60 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:ring-2'
  const inputState = (hasError) =>
    hasError
      ? 'border-red-400/60 focus:border-red-400 focus:ring-red-500/30'
      : 'border-white/10 focus:border-indigo-400 focus:ring-indigo-500/30'

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-slate-100">
      <div className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-indigo-600/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-32 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />

      <section className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
        <header className="mb-8 text-center">
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
            Inicia sesión en GameWeb
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Accede a tu cuenta para gestionar tu perfil.
          </p>
        </header>

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              placeholder="usuario@dominio.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className={`${inputBase} ${inputState(Boolean(errors.email))}`}
            />
            {errors.email && (
              <p id="email-error" className="mt-2 text-sm text-red-300">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-200"
              >
                Contraseña
              </label>
              <span className="text-xs text-slate-500">
                {form.password.length}/{MAX_PASSWORD_LENGTH}
              </span>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                maxLength={MAX_PASSWORD_LENGTH}
                value={form.password}
                onChange={handleChange}
                placeholder="Máximo 12 caracteres"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? 'password-error' : undefined
                }
                className={`${inputBase} pr-12 ${inputState(
                  Boolean(errors.password),
                )}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={
                  showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                }
                className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 transition hover:text-indigo-300 focus:outline-none focus-visible:text-indigo-300"
              >
                {showPassword ? (
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
            {errors.password && (
              <p id="password-error" className="mt-2 text-sm text-red-300">
                {errors.password}
              </p>
            )}
          </div>

          {status !== 'idle' && (
            <div
              role={isSuccess ? 'status' : 'alert'}
              aria-live="polite"
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                isSuccess
                  ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                  : 'border-red-400/30 bg-red-500/10 text-red-200'
              }`}
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
                {isSuccess ? (
                  <path
                    d="m5 13 4 4L19 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <>
                    <circle cx="12" cy="12" r="9" />
                    <path
                      d="M12 8v5M12 16h.01"
                      strokeLinecap="round"
                    />
                  </>
                )}
              </svg>
              <p>{message}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-500 px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Iniciar sesión
          </button>
        </form>

        <p className="mt-6 rounded-xl border border-white/10 bg-slate-900/50 p-3 text-center text-xs text-slate-400">
          Demo: <span className="text-slate-200">demo@gameweb.com</span> /{' '}
          <span className="text-slate-200">Gameweb123</span>
        </p>
      </section>
    </main>
  )
}

export default LoginPage
