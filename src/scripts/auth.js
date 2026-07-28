import { apiUrl, fetchCredentials } from "./api.js";

const card = document.querySelector("[data-auth-card]");
const modeButtons = document.querySelectorAll("[data-mode-button]");
const forms = document.querySelectorAll("[data-auth-form]");
const authLoader = document.querySelector("[data-auth-loader]");

function destinationFor(user) {
  return user.role === "admin" ? "/admin.html" : "/dashboard.html";
}

function switchMode(mode) {
  card.dataset.mode = mode;
  modeButtons.forEach((button) => {
    const active = button.dataset.modeButton === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  forms.forEach((form) => {
    const active = form.dataset.authForm === mode;
    form.classList.toggle("active", active);
    form.setAttribute("aria-hidden", String(!active));
    form.inert = !active;
    if (active) {
      window.setTimeout(() => form.querySelector("input")?.focus(), 360);
    }
  });
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => switchMode(button.dataset.modeButton));
});

document.querySelectorAll("[data-password-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = button.previousElementSibling;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.textContent = show ? "Ocultar" : "Ver";
    button.setAttribute("aria-label", show ? "Ocultar contraseña" : "Mostrar contraseña");
  });
});

forms.forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const mode = form.dataset.authForm;
    const status = form.querySelector(".auth-status");
    const submit = form.querySelector(".auth-submit");
    const data = Object.fromEntries(new FormData(form));
    delete data.terms;

    submit.disabled = true;
    authLoader.hidden = false;
    submit.querySelector("span").textContent =
      mode === "login" ? "Ingresando…" : "Creando cuenta…";
    status.textContent = "";
    status.dataset.state = "";

    try {
      const response = await fetch(apiUrl(`/api/auth/${mode}`), {
        method: "POST",
        credentials: fetchCredentials,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "No se pudo completar la solicitud.");
      status.textContent = `Todo listo, ${result.user.name.split(" ")[0]}. Redirigiendo…`;
      status.dataset.state = "success";
      card.classList.add("auth-card--success");
      window.setTimeout(
        () => window.location.assign(destinationFor(result.user)),
        700,
      );
    } catch (error) {
      authLoader.hidden = true;
      status.textContent = error.message;
      status.dataset.state = "error";
      card.classList.remove("auth-card--shake");
      requestAnimationFrame(() => card.classList.add("auth-card--shake"));
    } finally {
      submit.disabled = false;
      submit.querySelector("span").textContent =
        mode === "login" ? "Entrar a mi cuenta" : "Crear mi cuenta";
    }
  });
});

fetch(apiUrl("/api/auth/me"), { credentials: fetchCredentials })
  .then((response) => response.json())
  .then(({ user }) => {
    if (user) window.location.replace(destinationFor(user));
  })
  .catch(() => {});
