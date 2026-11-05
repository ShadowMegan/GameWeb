/**
 * Valida que un DNI tenga exactamente 8 dígitos numéricos.
 *
 * @param {string} dni - DNI que se va a validar.
 * @returns {boolean} `true` si el DNI es válido; en caso contrario, `false`.
 */
export const validateDNI = (dni) => {
  const dniRegex = /^\d{8}$/;
  return dniRegex.test(dni);
};

/**
 * Calcula el IGV aplicando una tasa del 18 %.
 *
 * @param {number} monto - Monto base sobre el cual se calculará el impuesto.
 * @returns {number} Monto correspondiente al IGV.
 */
export const calcularIGV = (monto) => {
  return monto * 0.18;
};
