import { it, expect } from 'vitest';
import { esCorreoValido, esClaveValida } from './validaciones';

// Pruebas de casos negativos (rechazo)
it('rechaza correo sin dominio', () => {
  expect(esCorreoValido('ana@correo')).toBe(false);
});

it('rechaza clave de 11 caracteres', () => {
  expect(esClaveValida('a'.repeat(11))).toBe(false);
});

// Pruebas de casos positivos (aceptación)
it('acepta correo válido', () => {
  expect(esCorreoValido('ana@correo.com')).toBe(true);
});

it('acepta clave de 12 caracteres', () => {
  expect(esClaveValida('a'.repeat(12))).toBe(true);
});