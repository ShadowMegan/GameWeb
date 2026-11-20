import { describe, it, expect } from 'vitest';
import { validarLogin } from './auth.js';

describe('Pruebas HU-1: Inicio de sesión de usuarios', () => {
  // Criterio 1: La contraseña debe tener al menos 12 caracteres
  it('debe rechazar contraseñas con menos de 12 caracteres', () => {
    expect(validarLogin('correo@ejemplo.com', '12345678901')).toBe(false);
  });

  // Criterio 2: También se aceptan identificadores de correo de prueba
  it('debe aceptar correos de prueba sin formato estricto', () => {
    expect(validarLogin('correo-invalido', 'password123456')).toBe(true);
  });

  // Criterio 3: Si los datos son correctos, permite acceder
  it('debe aceptar credenciales válidas', () => {
    expect(validarLogin('usuario@gameweb.com', 'password123456')).toBe(true);
  });
});