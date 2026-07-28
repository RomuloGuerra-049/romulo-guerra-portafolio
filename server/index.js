import "dotenv/config";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { config } from "./config.js";
import {
  HttpError,
  applyCors,
  assertSameOrigin,
  sendJson,
} from "./http.js";
import { createMemoryRepositories } from "./repositories/memory.js";
import { createPostgresRepositories } from "./repositories/postgres.js";
import { createAuthService } from "./services/auth.js";
import { createPortalService } from "./services/portal.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { createApiRouter } from "./routes/api.js";
import { createMailService } from "./services/mail.js";

const root = resolve(import.meta.dirname, "..");
const repositories = config.databaseUrl
  ? createPostgresRepositories(config.databaseUrl)
  : createMemoryRepositories();
const auth = createAuthService({
  users: repositories.users,
  sessions: repositories.sessions,
  sessionTtlMs: config.sessionTtlMs,
});
const portal = createPortalService(repositories);
const authMiddleware = createAuthMiddleware(auth);
const mailer = createMailService(config);
const attempts = new Map();

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function checkRateLimit(request, response, scope, limit = 12) {
  const ip = String(request.headers["x-forwarded-for"] ?? request.socket.remoteAddress)
    .split(",")[0]
    .trim();
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const record = attempts.get(key);
  if (!record || record.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  record.count += 1;
  if (record.count <= limit) return true;
  sendJson(response, 429, {
    error: "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.",
  });
  return false;
}

const handleApi = createApiRouter({
  auth,
  authMiddleware,
  portal,
  repositories,
  config,
  checkRateLimit,
  mailer,
});

async function serveStatic(response, pathname) {
  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  const decoded = decodeURIComponent(requested);
  const relative = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
  let filePath = join(root, relative);

  if (!filePath.startsWith(root)) throw new HttpError(403, "Acceso denegado.");
  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) filePath = join(filePath, "index.html");
    await stat(filePath);
  } catch {
    throw new HttpError(404, "Página no encontrada.");
  }

  response.writeHead(200, {
    "content-type": mimeTypes[extname(filePath).toLowerCase()] ?? "application/octet-stream",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "content-security-policy":
      "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data:; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  });
  createReadStream(filePath).pipe(response);
}

export function createAppServer() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
      if (url.pathname.startsWith("/api/")) {
        applyCors(request, response);
        if (request.method === "OPTIONS") {
          response.writeHead(204);
          response.end();
          return;
        }
        if (request.method !== "GET") assertSameOrigin(request);
        await handleApi(request, response, url);
      } else if (request.method === "GET" || request.method === "HEAD") {
        await serveStatic(response, url.pathname);
      } else {
        throw new HttpError(405, "Método no permitido.");
      }
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      if (status === 500) console.error(error);
      sendJson(response, status, {
        error: status === 500 ? "Ocurrió un error inesperado." : error.message,
      });
    }
  });
}

if (process.argv[1] === import.meta.filename) {
  if (typeof repositories.health === "function") {
    await repositories.health();
  }
  if (config.adminEmail && config.adminPassword) {
    const existing = await repositories.users.findByEmail(config.adminEmail.toLowerCase());
    if (!existing) {
      const result = await auth.createUser(
        {
          name: config.adminName || "Administrador",
          email: config.adminEmail,
          password: config.adminPassword,
        },
        { role: "admin", withoutSession: true },
      );
      if (result.error) console.error(`No se pudo crear el administrador inicial: ${result.error}`);
    }
  }
  if (config.seedClientEmail && config.seedClientPassword) {
    const existing = await repositories.users.findByEmail(
      config.seedClientEmail.toLowerCase(),
    );
    if (!existing) {
      const result = await auth.createUser(
        {
          name: config.seedClientName || "Cliente de prueba",
          email: config.seedClientEmail,
          password: config.seedClientPassword,
        },
        { role: "client", withoutSession: true },
      );
      if (result.error) {
        console.error(`No se pudo crear el cliente de prueba: ${result.error}`);
      }
    }
  }
  if (mailer.configured) {
    try {
      await mailer.verify();
    } catch {
      console.warn("El servidor SMTP no pudo verificarse.");
    }
  }
  createAppServer().listen(config.port, () => {
    console.log(`Portfolio disponible en http://localhost:${config.port}`);
  });
}
