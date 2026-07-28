import { apiUrl, fetchCredentials } from "./api.js";

window.__adminModuleStarted = true;

const state = {
  user: null,
  projects: [],
  requests: [],
  notifications: [],
  activity: [],
  users: [],
  changes: [],
  portfolioItems: [],
  contacts: [],
};

const shell = document.querySelector("[data-admin]");
const loading = document.querySelector("[data-loading]");
const toast = document.querySelector("[data-admin-toast]");

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(apiUrl(path), {
      credentials: fetchCredentials,
      ...options,
      headers: { "content-type": "application/json", ...options.headers },
    });
  } catch {
    throw new Error("No se pudo conectar con el backend. Ejecuta npm run dev.");
  }
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) {
    window.location.replace("/auth.html");
    throw new Error("Sesión requerida.");
  }
  if (!response.ok) {
    throw new Error(body.error || `La solicitud falló con estado ${response.status}.`);
  }
  return body;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]);
}

function empty(title, text) {
  return `<div class="empty-state"><span>◇</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(text)}</p></div>`;
}

function showToast(message, type = "success") {
  toast.textContent = message;
  toast.dataset.state = type;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function clientName(clientId) {
  return state.users.find((user) => user.id === clientId)?.name ?? "Cliente";
}

function projectCard(project, compact = false) {
  return `<article class="${compact ? "admin-project-row" : "admin-project"}">
    <div class="admin-project__head">
      <div><span>${escapeHtml(clientName(project.clientId))}</span><h3>${escapeHtml(project.name)}</h3></div>
      <small>${escapeHtml(project.status)}</small>
    </div>
    ${compact ? "" : `<p>${escapeHtml(project.description)}</p>`}
    <div class="progress-copy"><span>Avance</span><strong>${project.progress}%</strong></div>
    <div class="progress-track"><span style="width:${project.progress}%"></span></div>
    ${compact ? "" : `<form class="admin-project-update" data-admin-project-update="${project.id}">
      <select name="status" aria-label="Estado de ${escapeHtml(project.name)}">
        ${["Planificación", "Diseño", "Desarrollo", "Pruebas", "Revisión del cliente", "Publicado", "Finalizado"].map((status) => `<option ${status === project.status ? "selected" : ""}>${status}</option>`).join("")}
      </select>
      <input name="progress" type="number" min="0" max="100" value="${project.progress}" aria-label="Progreso de ${escapeHtml(project.name)}">
      <button type="submit">Guardar</button>
    </form>`}
  </article>`;
}

function requestCard(request, change = false) {
  const title = change ? request.title : request.name;
  const type = change ? request.type : request.projectType;
  return `<article class="admin-request">
    <div><span>${escapeHtml(type)}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(request.description)}</p></div>
    <strong>${escapeHtml(request.status)}</strong>
  </article>`;
}

function renderUsers() {
  const clients = state.users.filter((user) => user.role === "client");
  document.querySelector("[data-admin-users]").innerHTML = state.users.length
    ? state.users.map((user) => `<article class="admin-user-row">
        <div class="admin-user-main"><span>${escapeHtml(user.name.slice(0, 2).toUpperCase())}</span><div><strong>${escapeHtml(user.name)}</strong><p>${escapeHtml(user.email)}</p></div></div>
        <small>${escapeHtml(user.role)}</small>
        <select data-admin-user-status="${user.id}" ${user.role === "admin" ? "disabled" : ""} aria-label="Estado de ${escapeHtml(user.name)}">
          <option value="active" ${user.status === "active" ? "selected" : ""}>Activo</option>
          <option value="pending" ${user.status === "pending" ? "selected" : ""}>Pendiente</option>
          <option value="suspended" ${user.status === "suspended" ? "selected" : ""}>Suspendido</option>
        </select>
      </article>`).join("")
    : empty("Sin usuarios", "Los clientes registrados aparecerán aquí.");

  document.querySelector("[data-admin-client-select]").innerHTML =
    `<option value="">Selecciona un cliente</option>${clients.map((client) =>
      `<option value="${client.id}">${escapeHtml(client.name)} — ${escapeHtml(client.email)}</option>`
    ).join("")}`;

  document.querySelectorAll("[data-admin-user-status]").forEach((select) => {
    select.addEventListener("change", async () => {
      try {
        await api(`/api/users/${select.dataset.adminUserStatus}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: select.value }),
        });
        const user = state.users.find(
          (item) => item.id === select.dataset.adminUserStatus,
        );
        if (user) user.status = select.value;
        showToast("Estado del usuario actualizado.");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
}

function renderPublicPortfolio() {
  const container = document.querySelector("[data-admin-public-projects]");
  if (!container) return;
  container.innerHTML = state.portfolioItems.length
    ? state.portfolioItems.map((item) => `<article class="admin-public-item">
        ${item.imageUrl ? `<img src="${escapeHtml(apiUrl(item.imageUrl))}" alt="">` : ""}
        <div><span>${item.published ? "Publicado" : "Borrador"}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p>
        <button type="button" data-delete-public-project="${item.id}">Eliminar</button></div>
      </article>`).join("")
    : empty("Sin publicaciones", "Los proyectos públicos aparecerán aquí.");

  container.querySelectorAll("[data-delete-public-project]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm("¿Eliminar este proyecto del portafolio público?")) return;
      try {
        await api(`/api/admin/portfolio/${button.dataset.deletePublicProject}`, {
          method: "DELETE",
        });
        state.portfolioItems = state.portfolioItems.filter(
          (item) => item.id !== button.dataset.deletePublicProject,
        );
        renderPublicPortfolio();
        showToast("Proyecto público eliminado.");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
}

function bindProjectUpdates() {
  document.querySelectorAll("[data-admin-project-update]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = form.querySelector("button");
      button.disabled = true;
      try {
        const { project } = await api(
          `/api/projects/${form.dataset.adminProjectUpdate}`,
          {
            method: "PATCH",
            body: JSON.stringify(Object.fromEntries(new FormData(form))),
          },
        );
        state.projects = state.projects.map((item) =>
          item.id === project.id ? project : item
        );
        render();
        showToast("Proyecto actualizado.");
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        button.disabled = false;
      }
    });
  });
}

function render() {
  const clients = state.users.filter((user) => user.role === "client");
  const activeProjects = state.projects.filter(
    (project) => !["Finalizado", "Cancelado"].includes(project.status),
  );
  const pendingRequests = state.requests.filter(
    (request) => request.status === "Pendiente de evaluación",
  );
  const unread = state.notifications.filter((item) => !item.read);

  document.querySelector("[data-admin-name]").textContent = state.user.name;
  document.querySelector("[data-admin-avatar]").textContent = state.user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  document.querySelector("[data-admin-date]").textContent =
    new Intl.DateTimeFormat("es-CO", { dateStyle: "full" }).format(new Date());

  const metrics = [
    ["Clientes", clients.length, "registrados"],
    ["Proyectos", activeProjects.length, "activos"],
    ["Solicitudes", pendingRequests.length, "por evaluar"],
    ["Alertas", unread.length, "sin leer"],
  ];
  document.querySelector("[data-admin-metrics]").innerHTML = metrics
    .map(([label, value, detail]) => `<article><p>${label}</p><strong>${value}</strong><span>${detail}</span></article>`)
    .join("");

  document.querySelector("[data-admin-project-preview]").innerHTML =
    state.projects.length
      ? state.projects.slice(0, 4).map((project) => projectCard(project, true)).join("")
      : empty("Sin proyectos", "Crea el primer proyecto y asígnalo a un cliente.");
  document.querySelector("[data-admin-projects]").innerHTML =
    state.projects.length
      ? state.projects.map((project) => projectCard(project)).join("")
      : empty("Sin proyectos", "Los proyectos creados aparecerán aquí.");
  document.querySelector("[data-admin-request-preview]").innerHTML =
    state.requests.length
      ? state.requests.slice(0, 4).map((request) => requestCard(request)).join("")
      : empty("Sin solicitudes", "No hay solicitudes pendientes.");
  document.querySelector("[data-admin-requests]").innerHTML =
    state.requests.length
      ? state.requests.map((request) => requestCard(request)).join("")
      : empty("Sin solicitudes", "No hay nuevas solicitudes de proyecto.");
  document.querySelector("[data-admin-changes]").innerHTML =
    state.changes.length
      ? state.changes.map((request) => requestCard(request, true)).join("")
      : empty("Sin cambios", "No hay solicitudes de cambio.");
  document.querySelector("[data-admin-contacts]").innerHTML =
    state.contacts.length
      ? state.contacts.map((contact) => `<article class="admin-request">
          <div><span>${escapeHtml(contact.email)}</span><h3>${escapeHtml(contact.subject)}</h3><p>${escapeHtml(contact.message)}</p></div>
          <div><strong>${escapeHtml(contact.deliveryStatus === "sent" ? "Enviado" : "Guardado")}</strong><button type="button" data-delete-contact="${contact.id}">Eliminar</button></div>
        </article>`).join("")
      : empty("Sin mensajes", "Los mensajes del formulario aparecerán aquí.");
  document.querySelector("[data-admin-activity]").innerHTML =
    state.activity.length
      ? state.activity.slice(0, 7).map((item) => `<article><span>↗</span><div><strong>${escapeHtml(item.description)}</strong><p>${new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</p></div></article>`).join("")
      : empty("Sin actividad", "Los movimientos administrativos aparecerán aquí.");

  renderUsers();
  renderPublicPortfolio();
  bindProjectUpdates();
  document.querySelectorAll("[data-delete-contact]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm("¿Eliminar este mensaje?")) return;
      try {
        await api(`/api/admin/contacts/${button.dataset.deleteContact}`, {
          method: "DELETE",
        });
        state.contacts = state.contacts.filter(
          (contact) => contact.id !== button.dataset.deleteContact,
        );
        render();
        showToast("Mensaje eliminado.");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
}

function showView(name) {
  document.querySelectorAll("[data-admin-view]").forEach((view) => {
    const active = view.dataset.adminView === name;
    view.hidden = !active;
    view.classList.toggle("active", active);
  });
  document.querySelectorAll("[data-admin-view-button]").forEach((button) => {
    button.classList.toggle("active", button.dataset.adminViewButton === name);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-admin-view-button]");
  if (button) showView(button.dataset.adminViewButton);
});

document.querySelector("[data-admin-logout]").addEventListener("click", async () => {
  await api("/api/auth/logout", { method: "POST", body: "{}" });
  window.location.replace("/");
});

document.querySelector("[data-admin-project-form]").addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector(".portal-status");
    button.disabled = true;
    status.textContent = "";
    try {
      const { project } = await api("/api/projects", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      state.projects.unshift(project);
      form.reset();
      render();
      showView("projects");
      showToast("Proyecto creado y cliente notificado.");
    } catch (error) {
      status.textContent = error.message;
      status.dataset.state = "error";
    } finally {
      button.disabled = false;
    }
  },
);

const portfolioForm = document.querySelector("[data-admin-portfolio-form]");
portfolioForm?.querySelector("[name=imageFile]")?.addEventListener("change", (event) => {
  const file = event.currentTarget.files[0];
  document.querySelector("[data-admin-image-name]").textContent =
    file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB` : "Selecciona una imagen JPG, PNG o WebP.";
});

function fileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}

portfolioForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector(".portal-status");
  const data = Object.fromEntries(new FormData(form));
  const file = form.elements.imageFile.files[0];
  if (!file || file.size > 5 * 1024 * 1024) {
    status.textContent = "Selecciona una imagen válida de máximo 5 MB.";
    status.dataset.state = "error";
    return;
  }
  button.disabled = true;
  status.textContent = "Subiendo y publicando…";
  status.dataset.state = "";
  try {
    const { item } = await api("/api/admin/portfolio", {
      method: "POST",
      body: JSON.stringify({
        ...data,
        image: await fileAsDataUrl(file),
        published: form.elements.published.checked,
      }),
    });
    state.portfolioItems.unshift(item);
    form.reset();
    document.querySelector("[data-admin-image-name]").textContent =
      "Selecciona una imagen JPG, PNG o WebP.";
    renderPublicPortfolio();
    status.textContent = "Proyecto publicado correctamente.";
    status.dataset.state = "success";
    showToast("El proyecto ya está visible en la web.");
  } catch (error) {
    status.textContent = error.message;
    status.dataset.state = "error";
  } finally {
    button.disabled = false;
  }
});

async function initialize() {
  try {
    const dashboard = await api("/api/portal/dashboard");
    if (dashboard.user.role !== "admin") {
      window.location.replace("/dashboard.html");
      return;
    }

    Object.assign(state, dashboard);
    render();
    loading.hidden = true;
    shell.hidden = false;

    const [usersResult, changesResult, portfolioResult, contactsResult] = await Promise.allSettled([
      api("/api/users"),
      api("/api/change-requests"),
      api("/api/admin/portfolio"),
      api("/api/admin/contacts"),
    ]);

    if (usersResult.status === "fulfilled") {
      state.users = usersResult.value.users;
    }
    if (changesResult.status === "fulfilled") {
      state.changes = changesResult.value.requests;
    }
    if (portfolioResult.status === "fulfilled") {
      state.portfolioItems = portfolioResult.value.items;
    }
    if (contactsResult.status === "fulfilled") {
      state.contacts = contactsResult.value.contacts;
    }

    render();

    if (
      usersResult.status === "rejected" ||
      changesResult.status === "rejected" ||
      portfolioResult.status === "rejected" ||
      contactsResult.status === "rejected"
    ) {
      showToast(
        "El panel abrió, pero algunos datos secundarios no pudieron cargarse.",
        "error",
      );
    }
  } catch (error) {
    loading.classList.add("portal-loading--error");
    loading.querySelector("p").textContent = error.message;
  }
}

initialize();
