import { describe, it, expect } from 'vitest';
import { validateDNI, calcularIGV } from './util.js';

describe('Pruebas para util.js', () => {
  it('Debería validar un DNI correcto', () => {
    expect(validateDNI('12345678')).toBe(true);
  });

  it('Debería calcular el IGV correctamente', () => {
    expect(calcularIGV(100)).toBe(18);
  });
});
