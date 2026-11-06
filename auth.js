export function validarLogin(correo, clave) {
  // Validar formato de correo mediante regex
  const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const esCorreoValido = regexCorreo.test(correo);

  // Validar longitud mínima de contraseña de 12 caracteres
  const esClaveValida = clave && clave.length >= 12;

  // Si ambos son válidos, retorna true
  return esCorreoValido && esClaveValida;
}