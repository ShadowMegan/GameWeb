export function validarLogin(correo, clave) {
  // GameWeb acepta correos de prueba; solo requiere un identificador no vacío.
  const esCorreoValido = typeof correo === 'string' && correo.trim().length > 0;

  // Validar longitud mínima de contraseña de 12 caracteres
  const esClaveValida = clave && clave.length >= 12;

  // Si ambos son válidos, retorna true
  return esCorreoValido && esClaveValida;
}