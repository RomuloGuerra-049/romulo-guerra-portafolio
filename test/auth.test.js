import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemoryRepositories } from "../server/repositories/memory.js";
import { createAuthService } from "../server/services/auth.js";

function setup() {
  const repositories = createMemoryRepositories();
  return createAuthService({
    users: repositories.users,
    sessions: repositories.sessions,
    sessionTtlMs: 60_000,
  });
}

test("registra, autentica y cierra una sesión", async () => {
  const auth = setup();
  const registered = await auth.register({
    name: "Romulo Guerra",
    email: "ROMULO@example.com",
    password: "Segura123",
  });

  assert.equal(registered.user.email, "romulo@example.com");
  assert.equal(registered.user.passwordHash, undefined);
  assert.deepEqual(
    await auth.authenticate(registered.session.token),
    registered.user,
  );

  await auth.logout(registered.session.token);
  assert.equal(await auth.authenticate(registered.session.token), null);
});

test("evita correos duplicados y contraseñas incorrectas", async () => {
  const auth = setup();
  await auth.register({
    name: "Romulo Guerra",
    email: "romulo@example.com",
    password: "Segura123",
  });

  const duplicate = await auth.register({
    name: "Otro usuario",
    email: "romulo@example.com",
    password: "OtraClave2",
  });
  assert.equal(duplicate.status, 409);

  const rejected = await auth.login({
    email: "romulo@example.com",
    password: "incorrecta1",
  });
  assert.equal(rejected.status, 401);
});

test("valida los datos de registro", async () => {
  const auth = setup();
  const invalid = await auth.register({
    name: "R",
    email: "correo-invalido",
    password: "123",
  });
  assert.equal(invalid.status, 422);
});
