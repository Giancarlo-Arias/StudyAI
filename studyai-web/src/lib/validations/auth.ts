export function validateEmail(value: string): string {
  if (!value.trim()) {
    return "El correo electrónico es obligatorio.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    return "Ingresa un correo electrónico válido.";
  }

  return "";
}

export function validatePassword(value: string): string {
  if (!value) {
    return "La contraseña es obligatoria.";
  }

  return "";
}