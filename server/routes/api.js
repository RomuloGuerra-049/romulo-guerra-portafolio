import { randomUUID } from "node:crypto";
import {
  clearSessionCookie,
  parseCookies,
  readJson,
  sendJson,
  sessionCookie,
} from "../http.js";

export function createApiRouter({
  auth,
  authMiddleware,
  portal,
  repositories,
  config,
  checkRateLimit,
  mailer,
}) {
  const { requireUser, requireRole } = authMiddleware;

  return async function routeApi(request, response, url) {
    const method = request.method ?? "GET";
    const path = url.pathname;

    if (path === "/api/health" && method === "GET") {
      return sendJson(response, 200, { status: "ok" });
    }
    if (path === "/api/auth/me" && method === "GET") {
      const user = await auth.authenticate(parseCookies(request).portfolio_session);
      return sendJson(response, 200, { user });
    }
    if (path === "/api/auth/register" && method === "POST") {
      if (!checkRateLimit(request, response, "register", 8)) return;
      const result = await auth.register(await readJson(request));
      if (result.error) return sendJson(response, result.status, { error: result.error });
      return sendJson(response, 201, { user: result.user }, {
        "set-cookie": sessionCookie(
          result.session.token,
          result.session.expiresAt,
          config.isProduction,
        ),
      });
    }
    if (path === "/api/auth/login" && method === "POST") {
      if (!checkRateLimit(request, response, "login", 12)) return;
      const result = await auth.login(await readJson(request));
      if (result.error) return sendJson(response, result.status, { error: result.error });
      return sendJson(response, 200, { user: result.user }, {
        "set-cookie": sessionCookie(
          result.session.token,
          result.session.expiresAt,
          config.isProduction,
        ),
      });
    }
    if (path === "/api/auth/logout" && method === "POST") {
      await auth.logout(parseCookies(request).portfolio_session);
      return sendJson(response, 200, { message: "Sesión cerrada." }, {
        "set-cookie": clearSessionCookie(config.isProduction),
      });
    }
    if (path === "/api/contact" && method === "POST") {
      if (!checkRateLimit(request, response, "contact", 6)) return;
      const body = await readJson(request);
      const contact = {
        id: randomUUID(),
        name: String(body.name ?? "").trim(),
        email: String(body.email ?? "").trim().toLowerCase(),
        subject: String(body.subject ?? "").trim(),
        message: String(body.message ?? "").trim(),
        createdAt: new Date().toISOString(),
      };
      if (
        contact.name.length < 2 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) ||
        contact.subject.length < 3 ||
        contact.message.length < 10 ||
        contact.message.length > 5000
      ) {
        return sendJson(response, 422, {
          error: "Revisa los campos e incluye un mensaje de al menos 10 caracteres.",
        });
      }
      await repositories.contacts.create({
        ...contact,
        deliveryStatus: "pending",
      });
      try {
        await mailer.sendContact(contact);
        await repositories.contacts.update(contact.id, {
          deliveryStatus: "sent",
          deliveryError: null,
        });
      } catch (error) {
        await repositories.contacts.update(contact.id, {
          deliveryStatus: "failed",
          deliveryError: error.code ?? "MAIL_DELIVERY_FAILED",
        });
        return sendJson(response, 202, {
          message:
            error.code === "MAIL_NOT_CONFIGURED"
              ? "Mensaje recibido y guardado correctamente."
              : "Mensaje recibido. La entrega por correo se reintentará más tarde.",
          deliveryStatus: "saved",
        });
      }
      return sendJson(response, 201, {
        message: "Mensaje enviado correctamente. Gracias por escribirme.",
      });
    }
    if (path === "/api/portfolio" && method === "GET") {
      return sendJson(response, 200, {
        items: await repositories.portfolioItems.list(),
      });
    }
    const publicPortfolioImage = path.match(
      /^\/api\/portfolio\/([0-9a-f-]+)\/image$/,
    );
    if (publicPortfolioImage && method === "GET") {
      const image = await repositories.portfolioItems.findImage(
        publicPortfolioImage[1],
      );
      if (!image?.image_data) {
        return sendJson(response, 404, { error: "Imagen no encontrada." });
      }
      response.writeHead(200, {
        "content-type": image.image_mime || "image/jpeg",
        "cache-control": "public, max-age=86400",
        "x-content-type-options": "nosniff",
      });
      response.end(image.image_data);
      return;
    }
    if (path === "/api/chat" && method === "POST") {
      if (!checkRateLimit(request, response, "chat", 30)) return;
      const body = await readJson(request);
      const message = String(body.message ?? "").trim();
      const sessionId = String(body.sessionId ?? "").trim().slice(0, 100);
      const language = ["es", "en", "it"].includes(body.language)
        ? body.language
        : "es";
      if (message.length < 1 || message.length > 1200 || sessionId.length < 8) {
        return sendJson(response, 422, {
          error: "Escribe un mensaje válido.",
        });
      }
      const record = {
        id: randomUUID(),
        sessionId,
        sender: "visitor",
        message,
        language,
        deliveryStatus: config.n8nWebhookUrl ? "queued" : "local",
        createdAt: new Date().toISOString(),
      };
      await repositories.chatMessages.create(record);

      let reply = {
        es: "¡Gracias por escribir! Soy el asistente virtual de Rómulo. He recibido tu mensaje. Cuéntame qué tipo de proyecto necesitas y dejaré la información preparada.",
        en: "Thanks for reaching out! I am Romulo's virtual assistant. Tell me what kind of project you need and I will prepare the information.",
        it: "Grazie per averci contattato! Sono l'assistente virtuale di Romulo. Raccontami che tipo di progetto ti serve.",
      }[language];

      if (config.n8nWebhookUrl) {
        try {
          const integration = await fetch(config.n8nWebhookUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              sessionId,
              message,
              language,
              channel: "website",
            }),
            signal: AbortSignal.timeout(8000),
          });
          const integrationBody = await integration.json().catch(() => ({}));
          if (integration.ok && typeof integrationBody.reply === "string") {
            reply = integrationBody.reply.slice(0, 2000);
          }
        } catch {
          // El chat local continúa disponible si n8n está temporalmente fuera.
        }
      }

      await repositories.chatMessages.create({
        id: randomUUID(),
        sessionId,
        sender: "assistant",
        message: reply,
        language,
        deliveryStatus: "local",
        createdAt: new Date().toISOString(),
      });
      return sendJson(response, 200, {
        reply,
        whatsappNumber: config.whatsappNumber,
      });
    }

    const user = await requireUser(request);

    if (path === "/api/admin/portfolio" && method === "GET") {
      requireRole(user, ["admin"]);
      return sendJson(response, 200, {
        items: await repositories.portfolioItems.list({
          includeUnpublished: true,
        }),
      });
    }
    if (path === "/api/admin/contacts" && method === "GET") {
      requireRole(user, ["admin"]);
      return sendJson(response, 200, {
        contacts: await repositories.contacts.list(),
      });
    }
    const adminContact = path.match(/^\/api\/admin\/contacts\/([0-9a-f-]+)$/);
    if (adminContact && method === "DELETE") {
      requireRole(user, ["admin"]);
      const removed = await repositories.contacts.delete(adminContact[1]);
      return sendJson(response, removed ? 200 : 404, {
        ...(removed
          ? { message: "Mensaje eliminado." }
          : { error: "Mensaje no encontrado." }),
      });
    }
    if (path === "/api/admin/portfolio" && method === "POST") {
      requireRole(user, ["admin"]);
      const body = await readJson(request);
      const title = String(body.title ?? "").trim();
      const description = String(body.description ?? "").trim();
      const technologies = String(body.technologies ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 12);
      const imageMatch = String(body.image ?? "").match(
        /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/,
      );
      const imageData = imageMatch
        ? Buffer.from(imageMatch[2], "base64")
        : null;
      if (
        title.length < 3 ||
        title.length > 120 ||
        description.length < 10 ||
        description.length > 2000 ||
        !imageData ||
        imageData.length > 5 * 1024 * 1024
      ) {
        return sendJson(response, 422, {
          error:
            "Completa título, descripción e imagen JPG, PNG o WebP de máximo 5 MB.",
        });
      }
      const item = await repositories.portfolioItems.create({
        id: randomUUID(),
        title,
        description,
        technologies,
        demoUrl: String(body.demoUrl ?? "").trim().slice(0, 500),
        repositoryUrl: String(body.repositoryUrl ?? "").trim().slice(0, 500),
        imageData,
        imageMime: imageMatch[1],
        published: body.published !== false,
        createdAt: new Date().toISOString(),
      });
      return sendJson(response, 201, { item });
    }
    const adminPortfolioItem = path.match(
      /^\/api\/admin\/portfolio\/([0-9a-f-]+)$/,
    );
    if (adminPortfolioItem && method === "DELETE") {
      requireRole(user, ["admin"]);
      const removed = await repositories.portfolioItems.delete(
        adminPortfolioItem[1],
      );
      return sendJson(response, removed ? 200 : 404, {
        ...(removed
          ? { message: "Proyecto eliminado." }
          : { error: "Proyecto no encontrado." }),
      });
    }

    if (path === "/api/portal/dashboard" && method === "GET") {
      return sendJson(response, 200, {
        user,
        ...(await portal.dashboard(user)),
      });
    }
    if (path === "/api/projects" && method === "GET") {
      return sendJson(response, 200, { projects: await portal.listProjects(user) });
    }
    if (path === "/api/projects" && method === "POST") {
      requireRole(user, ["admin"]);
      return sendJson(response, 201, {
        project: await portal.createProject(user, await readJson(request)),
      });
    }
    const projectMatch = path.match(/^\/api\/projects\/([0-9a-f-]+)$/);
    if (projectMatch && method === "GET") {
      return sendJson(response, 200, {
        project: await portal.getProject(user, projectMatch[1]),
      });
    }
    if (projectMatch && method === "PATCH") {
      requireRole(user, ["admin", "collaborator"]);
      return sendJson(response, 200, {
        project: await portal.updateProject(user, projectMatch[1], await readJson(request)),
      });
    }
    const changeMatch = path.match(/^\/api\/projects\/([0-9a-f-]+)\/change-requests$/);
    if (changeMatch && method === "POST") {
      return sendJson(response, 201, {
        request: await portal.createChangeRequest(
          user,
          changeMatch[1],
          await readJson(request),
        ),
      });
    }
    if (path === "/api/change-requests" && method === "GET") {
      return sendJson(response, 200, {
        requests: await portal.listChangeRequests(user),
      });
    }
    if (path === "/api/project-requests" && method === "POST") {
      return sendJson(response, 201, {
        request: await portal.createProjectRequest(user, await readJson(request)),
      });
    }
    if (path === "/api/users" && method === "GET") {
      requireRole(user, ["admin"]);
      return sendJson(response, 200, { users: await portal.listUsers(user) });
    }
    const userStatusMatch = path.match(/^\/api\/users\/([0-9a-f-]+)\/status$/);
    if (userStatusMatch && method === "PATCH") {
      requireRole(user, ["admin"]);
      const body = await readJson(request);
      return sendJson(response, 200, {
        user: await portal.updateUserStatus(user, userStatusMatch[1], body.status),
      });
    }
    if (path === "/api/notifications/read-all" && method === "POST") {
      return sendJson(response, 200, await portal.markNotificationsRead(user));
    }

    return sendJson(response, 404, { error: "Ruta no encontrada." });
  };
}
