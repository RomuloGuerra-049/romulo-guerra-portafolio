import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  };
}

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  const [algorithm, salt, keyHex] = String(storedHash).split(":");
  if (algorithm !== "scrypt" || !salt || !keyHex) return false;
  const storedKey = Buffer.from(keyHex, "hex");
  const suppliedKey = await scrypt(password, salt, storedKey.length);
  return timingSafeEqual(storedKey, suppliedKey);
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function createAuthService({ users, sessions, sessionTtlMs }) {
  async function issueSession(userId) {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + sessionTtlMs).toISOString();
    await sessions.create({
      id: randomUUID(),
      userId,
      tokenHash: tokenHash(token),
      expiresAt,
      createdAt: new Date().toISOString(),
    });
    return { token, expiresAt };
  }

  async function createUser(input, trusted = {}) {
      const name = String(input.name ?? "").trim().replace(/\s+/g, " ");
      const email = normalizeEmail(input.email);
      const password = String(input.password ?? "");

      if (name.length < 2 || name.length > 80) {
        return { error: "Escribe un nombre válido.", status: 422 };
      }
      if (!EMAIL_PATTERN.test(email) || email.length > 254) {
        return { error: "Escribe un correo válido.", status: 422 };
      }
      if (
        password.length < 8 ||
        password.length > 128 ||
        !/[a-záéíóúñ]/i.test(password) ||
        !/\d/.test(password)
      ) {
        return {
          error: "La contraseña debe tener 8 caracteres, letras y un número.",
          status: 422,
        };
      }
      if (await users.findByEmail(email)) {
        return { error: "Ya existe una cuenta con ese correo.", status: 409 };
      }

      const user = {
        id: randomUUID(),
        name,
        email,
        passwordHash: await hashPassword(password),
        role: trusted.role ?? "client",
        status: trusted.status ?? "active",
        createdAt: new Date().toISOString(),
      };

      try {
        await users.create(user);
      } catch (error) {
        if (error.code === "EMAIL_EXISTS") {
          return { error: "Ya existe una cuenta con ese correo.", status: 409 };
        }
        throw error;
      }

      return {
        user: publicUser(user),
        session: trusted.withoutSession ? null : await issueSession(user.id),
      };
  }

  return {
    async register(input) {
      return createUser(input);
    },

    async createUser(input, trusted = {}) {
      return createUser(input, trusted);
    },

    async login(input) {
      const email = normalizeEmail(input.email);
      const password = String(input.password ?? "");
      const user = await users.findByEmail(email);
      const valid = user && (await verifyPassword(password, user.passwordHash));

      if (!valid) {
        return { error: "Correo o contraseña incorrectos.", status: 401 };
      }
      if (user.status === "suspended") {
        return { error: "Esta cuenta está suspendida.", status: 403 };
      }
      return { user: publicUser(user), session: await issueSession(user.id) };
    },

    async authenticate(token) {
      if (!token) return null;
      await sessions.deleteExpired();
      const session = await sessions.findByTokenHash(tokenHash(token));
      if (!session || new Date(session.expiresAt) <= new Date()) return null;
      const user = await users.findById(session.userId);
      return user ? publicUser(user) : null;
    },

    async logout(token) {
      if (token) await sessions.deleteByTokenHash(tokenHash(token));
    },
  };
}
