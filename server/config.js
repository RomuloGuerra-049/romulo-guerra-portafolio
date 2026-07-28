const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const sessionTtlHours = Number.parseInt(
  process.env.SESSION_TTL_HOURS ?? "168",
  10,
);

function boolean(value) {
  return ["1", "true", "yes", "on"].includes(String(value ?? "").toLowerCase());
}

export const config = Object.freeze({
  port: Number.isInteger(port) && port > 0 ? port : 3000,
  isProduction: process.env.NODE_ENV === "production",
  sessionTtlMs:
    (Number.isInteger(sessionTtlHours) && sessionTtlHours > 0
      ? sessionTtlHours
      : 168) *
    60 *
    60 *
    1000,
  maxBodyBytes: 8 * 1024 * 1024,
  adminName: process.env.ADMIN_NAME ?? "",
  adminEmail: process.env.ADMIN_EMAIL ?? "",
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  seedClientName: process.env.SEED_CLIENT_NAME ?? "",
  seedClientEmail: process.env.SEED_CLIENT_EMAIL ?? "",
  seedClientPassword: process.env.SEED_CLIENT_PASSWORD ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  n8nWebhookUrl: process.env.N8N_CHAT_WEBHOOK_URL ?? "",
  whatsappNumber: process.env.WHATSAPP_NUMBER ?? "",
  mailTo: process.env.MAIL_TO ?? "",
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number.parseInt(process.env.SMTP_PORT ?? "465", 10),
    secure: boolean(process.env.SMTP_SECURE ?? "true"),
    user: process.env.SMTP_USER ?? "",
    password: process.env.SMTP_PASS ?? "",
  },
});
