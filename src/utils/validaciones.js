export function esCorreoValido(c) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);
}

export function esClaveValida(p) {
  return p.length >= 12;
}