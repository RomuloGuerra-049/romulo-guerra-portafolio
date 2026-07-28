import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemoryRepositories } from "../server/repositories/memory.js";
import { createAuthService } from "../server/services/auth.js";
import { createPortalService } from "../server/services/portal.js";

async function setup() {
  const repositories = createMemoryRepositories();
  const auth = createAuthService({
    users: repositories.users,
    sessions: repositories.sessions,
    sessionTtlMs: 60_000,
  });
  const portal = createPortalService(repositories);
  const admin = (await auth.createUser(
    { name: "Admin Portal", email: "admin@example.com", password: "Admin1234" },
    { role: "admin", withoutSession: true },
  )).user;
  const clientA = (await auth.register(
    { name: "Cliente Uno", email: "uno@example.com", password: "Cliente123" },
  )).user;
  const clientB = (await auth.register(
    { name: "Cliente Dos", email: "dos@example.com", password: "Cliente123" },
  )).user;
  return { repositories, portal, admin, clientA, clientB };
}

test("solo un administrador puede crear proyectos", async () => {
  const { portal, admin, clientA } = await setup();
  const input = {
    clientId: clientA.id,
    name: "Portal comercial",
    description: "Desarrollo completo del portal comercial del cliente.",
    serviceType: "Aplicación web",
    status: "Desarrollo",
    progress: 30,
  };

  await assert.rejects(() => portal.createProject(clientA, input), {
    status: 403,
  });
  const project = await portal.createProject(admin, input);
  assert.equal(project.clientId, clientA.id);
  assert.equal(project.progress, 30);
});

test("un cliente nunca puede consultar proyectos de otro cliente", async () => {
  const { portal, admin, clientA, clientB } = await setup();
  const project = await portal.createProject(admin, {
    clientId: clientA.id,
    name: "Proyecto privado",
    description: "Información reservada exclusivamente para el primer cliente.",
    serviceType: "Sitio web",
    progress: 10,
  });

  assert.equal((await portal.getProject(clientA, project.id)).id, project.id);
  await assert.rejects(() => portal.getProject(clientB, project.id), {
    status: 404,
  });
  assert.deepEqual(await portal.listProjects(clientB), []);
});

test("valida el rango de progreso y registra actualizaciones", async () => {
  const { portal, admin, clientA } = await setup();
  await assert.rejects(() => portal.createProject(admin, {
    clientId: clientA.id,
    name: "Proyecto inválido",
    description: "Este proyecto contiene un porcentaje fuera de rango.",
    serviceType: "Aplicación web",
    progress: 101,
  }), { status: 422 });

  const project = await portal.createProject(admin, {
    clientId: clientA.id,
    name: "Proyecto válido",
    description: "Este proyecto contiene un porcentaje dentro del rango.",
    serviceType: "Aplicación web",
    progress: 40,
  });
  const updated = await portal.updateProject(admin, project.id, {
    progress: 70,
    status: "Pruebas",
  });
  assert.equal(updated.progress, 70);
  assert.equal(updated.status, "Pruebas");
});

test("las solicitudes quedan asociadas al cliente autenticado", async () => {
  const { portal, clientA, clientB } = await setup();
  const request = await portal.createProjectRequest(clientA, {
    name: "Nueva tienda",
    description: "Necesito una tienda virtual completa para vender productos.",
    objective: "Aumentar ventas y recibir pedidos en línea.",
    projectType: "Tienda virtual",
  });
  assert.equal(request.clientId, clientA.id);

  const dashboardA = await portal.dashboard(clientA);
  const dashboardB = await portal.dashboard(clientB);
  assert.equal(dashboardA.requests.length, 1);
  assert.equal(dashboardB.requests.length, 0);
});

test("un usuario no administrador no puede listar clientes", async () => {
  const { portal, clientA } = await setup();
  await assert.rejects(() => portal.listUsers(clientA), { status: 403 });
});
