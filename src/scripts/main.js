import { apiUrl, fetchCredentials } from "./api.js";

const menuButton = document.querySelector(".menu-button");
const navigation = document.querySelector(".navigation");
const navigationLinks = document.querySelectorAll(".navigation__link");
const currentYear = document.querySelector("#current-year");
const mobileBreakpoint = window.matchMedia("(max-width: 780px)");
const contactForm = document.querySelector("[data-contact-form]");
const contactStatus = contactForm?.querySelector(".contact-form__status");
const authLink = document.querySelector("[data-auth-link]");
const logoutButton = document.querySelector("[data-logout]");
const publicProjects = document.querySelector("[data-public-projects]");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]);
}

function setMenuState(isOpen) {
  menuButton?.setAttribute("aria-expanded", String(isOpen));
  menuButton?.setAttribute(
    "aria-label",
    isOpen ? "Cerrar menú" : "Abrir menú",
  );

  if (navigation) {
    navigation.dataset.open = String(isOpen);
  }
}

menuButton?.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  setMenuState(!isOpen);
});

navigationLinks.forEach((link) => {
  link.addEventListener("click", () => {
    setMenuState(false);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setMenuState(false);
    menuButton?.focus();
  }
});

mobileBreakpoint.addEventListener("change", (event) => {
  if (!event.matches) {
    setMenuState(false);
  }
});

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}

async function request(url, options = {}) {
  const response = await fetch(apiUrl(url), {
    credentials: fetchCredentials,
    ...options,
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "No se pudo completar la solicitud.");
  return body;
}

async function renderSession() {
  try {
    const { user } = await request("/api/auth/me", { method: "GET" });
    if (!user || !authLink || !logoutButton) return;
    authLink.textContent = "Portal";
    authLink.href = user.role === "admin" ? "/admin.html" : "/dashboard.html";
    authLink.setAttribute("aria-label", `Abrir portal de ${user.name}`);
    logoutButton.hidden = false;
  } catch {
    // La navegación sigue disponible aunque el backend aún esté iniciando.
  }
}

logoutButton?.addEventListener("click", async () => {
  logoutButton.disabled = true;
  try {
    await request("/api/auth/logout", {
      method: "POST",
      body: "{}",
    });
    window.location.reload();
  } catch {
    logoutButton.disabled = false;
  }
});

contactForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = contactForm.querySelector('button[type="submit"]');
  const payload = Object.fromEntries(new FormData(contactForm));
  submitButton.disabled = true;
  submitButton.textContent = "Enviando…";
  contactStatus.textContent = "";
  contactStatus.dataset.state = "";

  try {
    const result = await request("/api/contact", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    contactForm.reset();
    contactStatus.textContent = result.message;
    contactStatus.dataset.state = "success";
  } catch (error) {
    contactStatus.textContent = error.message;
    contactStatus.dataset.state = "error";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Enviar mensaje";
  }
});

async function renderPortfolio() {
  if (!publicProjects) return;
  try {
    const { items } = await request("/api/portfolio");
    if (!items.length) {
      return;
    }
    publicProjects.innerHTML = items.map((item) => {
      const demoUrl = item.demoUrl || "#";
      return `<article class="project-card">
        <a class="project-card__image-link" href="${escapeHtml(demoUrl)}" ${item.demoUrl ? 'target="_blank" rel="noopener noreferrer"' : 'aria-disabled="true"'}>
          <img class="project-card__image" src="${escapeHtml(apiUrl(item.imageUrl))}" alt="Vista del proyecto ${escapeHtml(item.title)}" loading="lazy" width="600" height="360" />
        </a>
        <div class="project-card__content">
          <h3 class="project-card__title">${escapeHtml(item.title)}</h3>
          <p class="project-card__description">${escapeHtml(item.description)}</p>
          <ul class="project-card__technologies" aria-label="Tecnologías utilizadas">${item.technologies.map((technology) => `<li>${escapeHtml(technology)}</li>`).join("")}</ul>
          <div class="project-card__links">
            ${item.repositoryUrl ? `<a href="${escapeHtml(item.repositoryUrl)}" target="_blank" rel="noopener noreferrer">Código</a>` : ""}
            ${item.demoUrl ? `<a href="${escapeHtml(item.demoUrl)}" target="_blank" rel="noopener noreferrer">Demo</a>` : ""}
          </div>
        </div>
      </article>`;
    }).join("");
  } catch {
    publicProjects.innerHTML = `<div class="projects-empty"><strong>No se pudieron cargar los proyectos.</strong><p>Intenta nuevamente en unos momentos.</p></div>`;
  }
}

renderSession();
renderPortfolio();
