export function esCorreoValido(c) {
  return typeof c === 'string' && c.trim().length > 0;
}

export function esClaveValida(p) {
  return p.length >= 12;
}