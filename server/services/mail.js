import nodemailer from "nodemailer";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]);
}

export function createMailService({ smtp, mailTo }) {
  const configured = Boolean(
    smtp.host &&
      smtp.port &&
      smtp.user &&
      smtp.password &&
      mailTo,
  );
  const transporter = configured
    ? nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: {
          user: smtp.user,
          pass: smtp.password,
        },
      })
    : null;

  return {
    configured,
    async verify() {
      if (!transporter) return false;
      await transporter.verify();
      return true;
    },
    async sendContact(contact) {
      if (!transporter) {
        const error = new Error(
          "El correo está pendiente de configurar con una contraseña de aplicación.",
        );
        error.code = "MAIL_NOT_CONFIGURED";
        throw error;
      }
      return transporter.sendMail({
        from: `"Portafolio Romulo Guerra" <${smtp.user}>`,
        to: mailTo,
        replyTo: contact.email,
        subject: `[Portafolio] ${contact.subject.replace(/[\r\n]/g, " ")}`,
        text: [
          `Nombre: ${contact.name}`,
          `Correo: ${contact.email}`,
          `Asunto: ${contact.subject}`,
          "",
          contact.message,
        ].join("\n"),
        html: `
          <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#171717">
            <h1 style="font-size:22px">Nuevo mensaje desde tu portafolio</h1>
            <p><strong>Nombre:</strong> ${escapeHtml(contact.name)}</p>
            <p><strong>Correo:</strong> ${escapeHtml(contact.email)}</p>
            <p><strong>Asunto:</strong> ${escapeHtml(contact.subject)}</p>
            <hr style="border:0;border-top:1px solid #ddd">
            <p style="white-space:pre-wrap">${escapeHtml(contact.message)}</p>
          </div>
        `,
      });
    },
  };
}
