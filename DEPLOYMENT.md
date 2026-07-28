# Preparación de despliegue

## Comandos

```bash
npm ci
npm run db:migrate
npm test
npm start
```

El servidor expone frontend y API desde el mismo dominio. La comprobación de
salud está disponible en `GET /api/health`.

## Variables obligatorias

- `NODE_ENV=production`
- `PORT`
- `DATABASE_URL`
- `SESSION_TTL_HOURS`
- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `MAIL_TO`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`

## Integraciones opcionales

- `N8N_CHAT_WEBHOOK_URL`: webhook que recibe `sessionId`, `message`,
  `language` y `channel`. Puede responder `{ "reply": "..." }`.
- `WHATSAPP_NUMBER`: número internacional sin espacios que se utilizará al
  conectar WhatsApp Business.

Sin n8n, el chat permanece operativo con respuesta local y guarda las
conversaciones en PostgreSQL. Sin `SMTP_PASS`, el formulario de contacto guarda
los mensajes y los muestra en el panel administrador, pero no puede enviarlos
por Gmail.
