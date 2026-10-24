const messages: Record<string, string> = {
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',
  TWO_FACTOR_REQUIRED: 'Introduce el código de tu aplicación autenticadora.',
  TWO_FACTOR_INVALID: 'El código de verificación no es válido o ha caducado.',
  INVALID_TWO_FACTOR: 'El código de verificación no es válido o ha caducado.',
  RATE_LIMITED: 'Demasiados intentos. Espera unos minutos antes de volver a probar.',
  AUTHENTICATION_UNAVAILABLE:
    'La autenticación no está disponible en este momento. Revisa la configuración del servidor.',
  UNAUTHENTICATED: 'Tu sesión ha caducado. Vuelve a iniciar sesión.',
  REQUEST_ERROR: 'La solicitud no es válida. Revisa los datos introducidos.',
  TWO_FACTOR_UNAVAILABLE: 'La configuración 2FA no está disponible en este servidor.',
  TWO_FACTOR_NOT_CONFIGURED: 'La configuración 2FA no es válida en este estado.',
  TWO_FACTOR_NOT_ENABLED: 'La configuración 2FA no está habilitada.',
  TWO_FACTOR_ALREADY_ENABLED: 'La configuración 2FA ya está habilitada.',
};

export function loginErrorMessage(code: string | undefined): string {
  if (!code) {
    return 'No se pudo iniciar sesión. Inténtalo de nuevo.';
  }
  return messages[code] ?? 'No se pudo iniciar sesión. Inténtalo de nuevo.';
}

export function twoFactorErrorMessage(code: string | undefined): string {
  if (code === 'TWO_FACTOR_INVALID' || code === 'INVALID_TWO_FACTOR') {
    return 'Código incorrecto. Genera uno nuevo en tu aplicación autenticadora.';
  }
  return loginErrorMessage(code);
}
