import { config } from "./config.js";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function readJson(request) {
  const contentType = request.headers["content-type"] ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "El contenido debe enviarse como JSON.");
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > config.maxBodyBytes) {
      throw new HttpError(413, "La solicitud es demasiado grande.");
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new HttpError(400, "El JSON no es válido.");
  }
}

export function sendJson(response, status, payload, headers = {}) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

export function parseCookies(request) {
  return Object.fromEntries(
    String(request.headers.cookie ?? "")
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)]),
  );
}

export function sessionCookie(token, expiresAt, isProduction) {
  const parts = [
    `portfolio_session=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${new Date(expiresAt).toUTCString()}`,
  ];
  if (isProduction) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(isProduction) {
  return sessionCookie("", new Date(0).toISOString(), isProduction);
}

export function assertSameOrigin(request) {
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (!origin || !host) return;
  let originUrl;
  try {
    originUrl = new URL(origin);
  } catch {
    throw new HttpError(403, "Origen no permitido.");
  }
  if (originUrl.host === host) return;

  const requestHostname = host.split(":")[0];
  const localHosts = new Set(["localhost", "127.0.0.1"]);
  const isLocalDevelopment =
    !config.isProduction &&
    localHosts.has(originUrl.hostname) &&
    localHosts.has(requestHostname);

  if (!isLocalDevelopment) throw new HttpError(403, "Origen no permitido.");
}

export function applyCors(request, response) {
  const origin = request.headers.origin;
  if (!origin || config.isProduction) return false;
  let originUrl;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }
  if (!["localhost", "127.0.0.1"].includes(originUrl.hostname)) return false;

  response.setHeader("access-control-allow-origin", origin);
  response.setHeader("access-control-allow-credentials", "true");
  response.setHeader(
    "access-control-allow-methods",
    "GET, POST, PATCH, DELETE, OPTIONS",
  );
  response.setHeader("access-control-allow-headers", "Content-Type");
  response.setHeader("vary", "Origin");
  return true;
}
