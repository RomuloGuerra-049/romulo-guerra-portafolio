import assert from "node:assert/strict";
import test from "node:test";
import { createMemoryRepositories } from "../server/repositories/memory.js";

test("publica y elimina proyectos del portafolio sin exponer la imagen en listados", async () => {
  const repositories = createMemoryRepositories();
  const item = await repositories.portfolioItems.create({
    id: "portfolio-test",
    title: "Proyecto real",
    description: "Descripción suficientemente completa.",
    technologies: ["Node.js", "PostgreSQL"],
    demoUrl: "https://example.com",
    repositoryUrl: "",
    imageData: Buffer.from("image"),
    imageMime: "image/png",
    published: true,
    createdAt: new Date().toISOString(),
  });

  assert.equal(item.imageData, undefined);
  assert.equal(item.imageUrl, "/api/portfolio/portfolio-test/image");
  assert.equal((await repositories.portfolioItems.list()).length, 1);
  assert.equal((await repositories.portfolioItems.findImage(item.id)).image_mime, "image/png");
  assert.equal(await repositories.portfolioItems.delete(item.id), true);
  assert.equal((await repositories.portfolioItems.list()).length, 0);
});

test("guarda conversaciones del asistente por sesión", async () => {
  const repositories = createMemoryRepositories();
  await repositories.chatMessages.create({
    id: "message-test",
    sessionId: "session-test",
    sender: "visitor",
    message: "Necesito una web.",
    language: "es",
    deliveryStatus: "local",
    createdAt: new Date().toISOString(),
  });

  const messages = await repositories.chatMessages.list(
    (message) => message.sessionId === "session-test",
  );
  assert.equal(messages.length, 1);
  assert.equal(messages[0].sender, "visitor");
});
