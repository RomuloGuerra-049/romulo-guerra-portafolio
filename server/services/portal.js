import { randomUUID } from "node:crypto";
import { HttpError } from "../http.js";
import { optionalText, progress, projectStatus, text } from "../validators/portal.js";

function newestFirst(items) {
  return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function createPortalService(repositories) {
  const {
    users,
    projects,
    projectRequests,
    changeRequests,
    notifications,
    activity,
  } = repositories;

  async function record(user, action, resource, resourceId, description) {
    const entry = {
      id: randomUUID(),
      userId: user.id,
      action,
      resource,
      resourceId,
      description,
      createdAt: new Date().toISOString(),
    };
    await activity.create(entry);
    return entry;
  }

  function canAccessProject(user, project) {
    return user.role === "admin" ||
      project.clientId === user.id ||
      (user.role === "collaborator" && project.collaboratorIds.includes(user.id));
  }

  return {
    async dashboard(user) {
      const visibleProjects = await projects.list((project) => canAccessProject(user, project));
      const visibleRequests = await projectRequests.list(
        (request) => user.role === "admin" || request.clientId === user.id,
      );
      const userNotifications = await notifications.list(
        (notification) => notification.userId === user.id,
      );
      const recentActivity = await activity.list((entry) =>
        user.role === "admin" ||
        entry.userId === user.id ||
        visibleProjects.some((project) => project.id === entry.resourceId),
      );
      return {
        projects: newestFirst(visibleProjects),
        requests: newestFirst(visibleRequests),
        notifications: newestFirst(userNotifications),
        activity: newestFirst(recentActivity).slice(0, 8),
      };
    },

    async listUsers(user) {
      if (user.role !== "admin") throw new HttpError(403, "No tienes permisos.");
      return (await users.list()).map(({ passwordHash, ...safeUser }) => safeUser);
    },

    async updateUserStatus(user, userId, status) {
      if (user.role !== "admin") throw new HttpError(403, "No tienes permisos.");
      if (!["active", "pending", "suspended"].includes(status)) {
        throw new HttpError(422, "Estado de usuario inválido.");
      }
      const updated = await users.update(userId, { status });
      if (!updated) throw new HttpError(404, "Usuario no encontrado.");
      await record(user, "user.status_updated", "user", userId, `Estado actualizado a ${status}.`);
      const { passwordHash, ...safeUser } = updated;
      return safeUser;
    },

    async listProjects(user) {
      return newestFirst(await projects.list((project) => canAccessProject(user, project)));
    },

    async getProject(user, id) {
      const project = await projects.findById(id);
      if (!project || !canAccessProject(user, project)) {
        throw new HttpError(404, "Proyecto no encontrado.");
      }
      return project;
    },

    async createProject(user, input) {
      if (user.role !== "admin") throw new HttpError(403, "No tienes permisos.");
      const client = await users.findById(input.clientId);
      if (!client || client.role !== "client") throw new HttpError(422, "Cliente inválido.");
      const now = new Date().toISOString();
      const project = {
        id: randomUUID(),
        clientId: client.id,
        name: text(input.name, "Nombre", { min: 3, max: 120 }),
        description: text(input.description, "Descripción", { min: 10, max: 2000 }),
        serviceType: text(input.serviceType, "Tipo de servicio", { min: 3, max: 100 }),
        status: projectStatus(input.status ?? "Planificación"),
        progress: progress(input.progress ?? 0),
        priority: ["Baja", "Media", "Alta"].includes(input.priority) ? input.priority : "Media",
        estimatedDelivery: optionalText(input.estimatedDelivery, 30),
        budget: Math.max(0, Number(input.budget) || 0),
        collaboratorIds: Array.isArray(input.collaboratorIds) ? input.collaboratorIds : [],
        stages: [
          "Planificación",
          "Diseño",
          "Desarrollo",
          "Pruebas",
          "Revisión",
          "Publicación",
        ].map((name, index) => ({ name, status: index === 0 ? "En progreso" : "Pendiente" })),
        createdAt: now,
        updatedAt: now,
      };
      await projects.create(project);
      await notifications.create({
        id: randomUUID(),
        userId: client.id,
        type: "project.created",
        title: "Nuevo proyecto",
        message: `${project.name} ya está disponible en tu portal.`,
        resourceId: project.id,
        read: false,
        createdAt: now,
      });
      await record(user, "project.created", "project", project.id, `Proyecto ${project.name} creado.`);
      return project;
    },

    async updateProject(user, id, input) {
      if (user.role !== "admin" && user.role !== "collaborator") {
        throw new HttpError(403, "No tienes permisos.");
      }
      const current = await this.getProject(user, id);
      const changes = {
        updatedAt: new Date().toISOString(),
      };
      if (input.status !== undefined) changes.status = projectStatus(input.status);
      if (input.progress !== undefined) changes.progress = progress(input.progress);
      const updated = await projects.update(id, changes);
      await notifications.create({
        id: randomUUID(),
        userId: current.clientId,
        type: "project.updated",
        title: "Proyecto actualizado",
        message: `${updated.name} ahora está en ${updated.status} (${updated.progress}%).`,
        resourceId: id,
        read: false,
        createdAt: changes.updatedAt,
      });
      await record(user, "project.updated", "project", id, `Proyecto actualizado al ${updated.progress}%.`);
      return updated;
    },

    async createProjectRequest(user, input) {
      if (user.role !== "client") throw new HttpError(403, "Solo los clientes pueden solicitar proyectos.");
      const now = new Date().toISOString();
      const request = {
        id: randomUUID(),
        clientId: user.id,
        name: text(input.name, "Nombre del proyecto", { min: 3, max: 120 }),
        company: optionalText(input.company, 120),
        description: text(input.description, "Descripción", { min: 20, max: 3000 }),
        objective: text(input.objective, "Objetivo", { min: 10, max: 1000 }),
        projectType: text(input.projectType, "Tipo de proyecto", { min: 3, max: 100 }),
        approximateBudget: optionalText(input.approximateBudget, 80),
        desiredDate: optionalText(input.desiredDate, 30),
        status: "Pendiente de evaluación",
        createdAt: now,
        updatedAt: now,
      };
      await projectRequests.create(request);
      await record(user, "project_request.created", "project_request", request.id, `Solicitud ${request.name} creada.`);
      return request;
    },

    async createChangeRequest(user, projectId, input) {
      const project = await this.getProject(user, projectId);
      if (user.role !== "client") throw new HttpError(403, "Solo el cliente puede solicitar cambios.");
      const now = new Date().toISOString();
      const request = {
        id: randomUUID(),
        projectId: project.id,
        clientId: user.id,
        title: text(input.title, "Título", { min: 3, max: 150 }),
        description: text(input.description, "Descripción", { min: 10, max: 3000 }),
        type: text(input.type, "Tipo", { min: 3, max: 100 }),
        priority: ["Baja", "Media", "Alta", "Urgente"].includes(input.priority)
          ? input.priority
          : "Media",
        status: "Recibida",
        createdAt: now,
        updatedAt: now,
      };
      await changeRequests.create(request);
      await record(user, "change_request.created", "change_request", request.id, `Cambio solicitado en ${project.name}.`);
      return request;
    },

    async listChangeRequests(user) {
      const visibleProjects = await this.listProjects(user);
      const ids = new Set(visibleProjects.map(({ id }) => id));
      return newestFirst(await changeRequests.list((request) => ids.has(request.projectId)));
    },

    async markNotificationsRead(user) {
      const own = await notifications.list((item) => item.userId === user.id && !item.read);
      await Promise.all(own.map((item) => notifications.update(item.id, { read: true })));
      return { updated: own.length };
    },
  };
}
