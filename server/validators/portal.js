import { HttpError } from "../http.js";

const projectStatuses = new Set([
  "Planificación",
  "Diseño",
  "Desarrollo",
  "Pruebas",
  "Revisión del cliente",
  "Listo para publicar",
  "Publicado",
  "Mantenimiento",
  "Finalizado",
  "Pausado",
]);

export function text(value, name, { min = 1, max = 1000 } = {}) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  if (normalized.length < min || normalized.length > max) {
    throw new HttpError(422, `${name} debe tener entre ${min} y ${max} caracteres.`);
  }
  return normalized;
}

export function optionalText(value, max = 1000) {
  const normalized = String(value ?? "").trim();
  if (normalized.length > max) throw new HttpError(422, "Uno de los campos es demasiado largo.");
  return normalized;
}

export function progress(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 100) {
    throw new HttpError(422, "El progreso debe estar entre 0 y 100.");
  }
  return Math.round(number);
}

export function projectStatus(value) {
  if (!projectStatuses.has(value)) throw new HttpError(422, "Estado de proyecto inválido.");
  return value;
}
