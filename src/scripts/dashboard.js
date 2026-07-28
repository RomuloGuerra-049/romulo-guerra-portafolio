import { apiUrl, fetchCredentials } from "./api.js";

const state = { user: null, projects: [], requests: [], notifications: [], activity: [], changes: [] };
const portal = document.querySelector("[data-portal]");
const loading = document.querySelector("[data-loading]");
const sidebar = document.querySelector("[data-sidebar]");
const toast = document.querySelector("[data-toast]");

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(apiUrl(path), {
      credentials: fetchCredentials,
      ...options,
      headers: { "content-type": "application/json", ...options.headers },
    });
  } catch {
    throw new Error(
      "No se pudo conectar con el backend. Inicia el proyecto con npm run dev.",
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json().catch(() => ({}))
    : {};

  if (response.status === 401) {
    window.location.replace("/auth.html");
    throw new Error("Sesión requerida.");
  }
  if (!response.ok) {
    if (!contentType.includes("application/json")) {
      throw new Error(
        "El backend no está disponible en esta dirección. Abre el portal desde el servidor de npm run dev.",
      );
    }
    throw new Error(
      body.error || `No se pudo completar ${path} (error ${response.status}).`,
    );
  }
  return body;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character]);
}

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`));
}

function empty(title, copy) {
  return `<div class="empty-state"><span>◇</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(copy)}</p></div>`;
}

function showToast(message, stateName = "success") {
  toast.textContent = message;
  toast.dataset.state = stateName;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function projectMarkup(project, compact = false) {
  const stages = project.stages ?? [];
  return `<article class="${compact ? "project-row" : "portal-project-card"}">
    <div class="project-row__top"><div><span>${escapeHtml(project.serviceType)}</span><h3>${escapeHtml(project.name)}</h3></div><small>${escapeHtml(project.status)}</small></div>
    ${compact ? "" : `<p>${escapeHtml(project.description)}</p>`}
    <div class="progress-copy"><span>Avance</span><strong>${project.progress}%</strong></div>
    <div class="progress-track"><span style="width:${project.progress}%"></span></div>
    ${compact ? "" : `<div class="stage-line">${stages.map((stage) => `<span class="${stage.status === "En progreso" ? "active" : ""}">${escapeHtml(stage.name)}</span>`).join("")}</div>
    <div class="project-meta"><span>Prioridad: ${escapeHtml(project.priority)}</span><span>Entrega: ${formatDate(project.estimatedDelivery)}</span></div>`}
    ${state.user.role === "client" ? `<button class="portal-secondary" type="button" data-change-project="${project.id}">Solicitar cambio</button>` : ""}
  </article>`;
}

function render() {
  const { user, projects, requests, notifications, activity } = state;
  document.querySelector("[data-user-name]").textContent = user.name;
  document.querySelector("[data-first-name]").textContent = user.name.split(" ")[0];
  document.querySelector("[data-avatar]").textContent = user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  document.querySelector("[data-user-role]").textContent = ({ admin: "Administrador", client: "Cliente", collaborator: "Colaborador" })[user.role];
  document.querySelector("[data-today]").textContent = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  document.querySelector("[data-projects-title]").textContent = "Mis proyectos";
  document.querySelector("[data-welcome-copy]").textContent = "Aquí tienes el estado actual de tu trabajo.";
  const quick = document.querySelector("[data-quick-action]");
  quick.innerHTML = "Solicitar proyecto <span>→</span>";
  quick.dataset.target = "new-request";

  const active = projects.filter((project) => !["Finalizado", "Cancelado"].includes(project.status));
  const complete = projects.filter((project) => project.status === "Finalizado");
  const pendingNotifications = notifications.filter((item) => !item.read);
  const metrics = [["Proyectos activos", active.length], ["Finalizados", complete.length], ["Solicitudes", requests.length], ["Por revisar", pendingNotifications.length]];
  document.querySelector("[data-metrics]").innerHTML = metrics.map(([label, value], index) => `<article><span>0${index + 1}</span><strong>${value}</strong><p>${label}</p></article>`).join("");
  document.querySelector("[data-notification-count]").textContent = pendingNotifications.length;
  document.querySelector("[data-project-preview]").innerHTML = projects.length ? projects.slice(0, 3).map((project) => projectMarkup(project, true)).join("") : empty("Todavía no hay proyectos", "Cuando se cree el primer proyecto aparecerá aquí.");
  document.querySelector("[data-projects-list]").innerHTML = projects.length ? projects.map((project) => projectMarkup(project)).join("") : empty("Todavía no hay proyectos", "Cuando se cree tu primer proyecto aparecerá aquí.");
  document.querySelector("[data-notifications]").innerHTML = notifications.length ? notifications.slice(0, 5).map((item) => `<article class="${item.read ? "" : "unread"}"><span>◇</span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.message)}</p></div></article>`).join("") : empty("Todo al día", "No tienes notificaciones pendientes.");
  document.querySelector("[data-activity]").innerHTML = activity.length ? activity.map((item) => `<article><span>↗</span><div><strong>${escapeHtml(item.description)}</strong><p>${new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</p></div></article>`).join("") : empty("Sin actividad reciente", "Las acciones importantes aparecerán en este historial.");
  document.querySelector("[data-change-list]").innerHTML = state.changes.length ? state.changes.map((item) => `<article class="request-row"><div><span>${escapeHtml(item.type)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></div><strong>${escapeHtml(item.status)}</strong></article>`).join("") : empty("Sin solicitudes de cambio", "Las solicitudes asociadas a proyectos aparecerán aquí.");
  bindDynamicActions();
}

function bindDynamicActions() {
  document.querySelectorAll("[data-change-project]").forEach((button) => button.addEventListener("click", async () => {
    const title = window.prompt("Título breve del cambio");
    if (!title) return;
    const description = window.prompt("Describe el cambio que necesitas");
    if (!description) return;
    try {
      const { request } = await api(`/api/projects/${button.dataset.changeProject}/change-requests`, { method: "POST", body: JSON.stringify({ title, description, type: "Cambio solicitado", priority: "Media" }) });
      state.changes.unshift(request);
      render();
      showView("changes");
      showToast("Solicitud de cambio creada.");
    } catch (error) { showToast(error.message, "error"); }
  }));
}

function showView(name) {
  document.querySelectorAll("[data-view]").forEach((view) => {
    const active = view.dataset.view === name;
    view.hidden = !active;
    view.classList.toggle("active", active);
  });
  document.querySelectorAll("[data-view-button]").forEach((button) => button.classList.toggle("active", button.dataset.viewButton === name));
  sidebar.classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view-button]");
  if (viewButton) showView(viewButton.dataset.viewButton);
});
document.querySelector("[data-quick-action]").addEventListener("click", (event) => showView(event.currentTarget.dataset.target));
document.querySelector("[data-menu-open]").addEventListener("click", () => sidebar.classList.add("open"));
document.querySelector("[data-menu-close]").addEventListener("click", () => sidebar.classList.remove("open"));
document.querySelector("[data-logout]").addEventListener("click", async () => {
  await api("/api/auth/logout", { method: "POST", body: "{}" });
  window.location.replace("/");
});
document.querySelector("[data-mark-read]").addEventListener("click", async () => {
  await api("/api/notifications/read-all", { method: "POST", body: "{}" });
  state.notifications = state.notifications.map((item) => ({ ...item, read: true }));
  render();
});

function bindForm(selector, path, onSuccess) {
  document.querySelector(selector).addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector(".portal-status");
    button.disabled = true;
    status.textContent = "";
    try {
      const result = await api(path, { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      form.reset();
      status.textContent = "Guardado correctamente.";
      status.dataset.state = "success";
      await onSuccess(result);
    } catch (error) {
      status.textContent = error.message;
      status.dataset.state = "error";
    } finally { button.disabled = false; }
  });
}

bindForm("[data-project-request-form]", "/api/project-requests", async ({ request }) => {
  state.requests.unshift(request);
  render();
  showToast("Solicitud enviada.");
});

async function initialize() {
  try {
    const dashboard = await api("/api/portal/dashboard");
    Object.assign(state, dashboard);
    if (state.user.role === "admin") {
      window.location.replace("/admin.html");
      return;
    }

    // El resumen es la carga esencial. Las secciones secundarias no deben
    // bloquear todo el portal si una de ellas falla temporalmente.
    render();
    loading.hidden = true;
    portal.hidden = false;

    const secondaryRequests = [
      api("/api/change-requests")
        .then(({ requests }) => { state.changes = requests; }),
    ];
    const results = await Promise.allSettled(secondaryRequests);
    render();
    const failed = results.find((result) => result.status === "rejected");
    if (failed) {
      showToast(
        `El resumen cargó, pero una sección no respondió: ${failed.reason.message}`,
        "error",
      );
    }
  } catch (error) {
    loading.classList.add("portal-loading--error");
    loading.querySelector("p").textContent = error.message;
  }
}

initialize();
