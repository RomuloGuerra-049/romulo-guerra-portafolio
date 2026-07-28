import { apiUrl, fetchCredentials } from "./api.js";
import { currentLanguage } from "./i18n.js";

const copy = {
  es: { title: "Asistente de proyectos", status: "Disponible", greeting: "Hola 👋 ¿En qué proyecto puedo ayudarte?", placeholder: "Escribe tu mensaje…", send: "Enviar" },
  en: { title: "Project assistant", status: "Available", greeting: "Hello 👋 How can I help with your project?", placeholder: "Type your message…", send: "Send" },
  it: { title: "Assistente progetti", status: "Disponibile", greeting: "Ciao 👋 Come posso aiutarti con il tuo progetto?", placeholder: "Scrivi il tuo messaggio…", send: "Invia" },
};

const sessionId = localStorage.getItem("portfolio_chat_session") || crypto.randomUUID();
localStorage.setItem("portfolio_chat_session", sessionId);
const widget = document.createElement("aside");
widget.className = "chat-widget";
widget.innerHTML = `<button class="chat-launcher" type="button" aria-label="Abrir chat" aria-expanded="false">
  <svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16 3A12 12 0 0 0 5.7 21.2L4 28l7-1.8A12 12 0 1 0 16 3Zm0 21.8c-1.8 0-3.6-.5-5.1-1.4l-.5-.3-3.1.8.8-3-.3-.5A9.6 9.6 0 1 1 16 24.8Zm5.3-7.2c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.7.2-.2.3-.8.9-1 1.1-.2.2-.4.2-.7.1-1.9-.9-3.1-1.7-4.3-3.8-.3-.5.3-.5.9-1.6.1-.2.1-.4 0-.6l-.9-2.1c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.3 3.4 1.4 3.6c.2.2 2.5 3.8 6 5.3 2.2.9 3.1 1 4.2.8.7-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.4Z"/></svg>
</button>
<section class="chat-panel" hidden>
  <header><div><strong data-chat-title></strong><span><i></i><span data-chat-status></span></span></div><button type="button" data-chat-close aria-label="Cerrar">×</button></header>
  <div class="chat-messages" data-chat-messages aria-live="polite"></div>
  <form data-chat-form><input name="message" maxlength="1200" autocomplete="off" required /><button type="submit"></button></form>
</section>`;
document.body.append(widget);

const launcher = widget.querySelector(".chat-launcher");
const panel = widget.querySelector(".chat-panel");
const messages = widget.querySelector("[data-chat-messages]");
const form = widget.querySelector("[data-chat-form]");

function langCopy() {
  return copy[currentLanguage()] || copy.es;
}
function addMessage(text, sender) {
  const node = document.createElement("p");
  node.className = `chat-message chat-message--${sender}`;
  node.textContent = text;
  messages.append(node);
  messages.scrollTop = messages.scrollHeight;
}
function updateCopy(initial = false) {
  const content = langCopy();
  widget.querySelector("[data-chat-title]").textContent = content.title;
  widget.querySelector("[data-chat-status]").textContent = content.status;
  form.elements.message.placeholder = content.placeholder;
  form.querySelector("button").textContent = content.send;
  if (initial && !messages.children.length) addMessage(content.greeting, "assistant");
}
updateCopy(true);
window.addEventListener("languagechange", () => updateCopy(false));

function setOpen(open) {
  panel.hidden = !open;
  launcher.setAttribute("aria-expanded", String(open));
  if (open) form.elements.message.focus();
}
launcher.addEventListener("click", () => setOpen(panel.hidden));
widget.querySelector("[data-chat-close]").addEventListener("click", () => setOpen(false));
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = form.elements.message.value.trim();
  if (!message) return;
  addMessage(message, "visitor");
  form.reset();
  const button = form.querySelector("button");
  button.disabled = true;
  try {
    const response = await fetch(apiUrl("/api/chat"), {
      method: "POST",
      credentials: fetchCredentials,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, message, language: currentLanguage() }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "No se pudo enviar.");
    addMessage(body.reply, "assistant");
  } catch (error) {
    addMessage(error.message, "assistant");
  } finally {
    button.disabled = false;
  }
});
