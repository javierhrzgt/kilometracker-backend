const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Envía un email de recuperación de contraseña via Brevo.
 * @param {string} toEmail - Dirección del destinatario
 * @param {string} toName - Nombre del destinatario
 * @param {string} resetUrl - URL completa con el token de reset
 */
async function sendPasswordResetEmail(toEmail, toName, resetUrl) {
  const payload = {
    sender: {
      name: process.env.BREVO_SENDER_NAME || 'KM Tracker',
      email: process.env.BREVO_SENDER_EMAIL,
    },
    to: [{ email: toEmail, name: toName }],
    subject: 'Recuperar contraseña — KM Tracker',
    htmlContent: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #3730a3;">KM Tracker</h2>
        <p>Hola <strong>${toName}</strong>,</p>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
        <p>Haz clic en el siguiente enlace. El enlace es válido por <strong>1 hora</strong>.</p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:12px 24px;background:#4338ca;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;">
          Restablecer contraseña
        </a>
        <p style="color:#6b7280;font-size:13px;">Si no solicitaste este cambio, ignora este correo — tu contraseña no se modificará.</p>
        <p style="color:#6b7280;font-size:13px;">
          O copia y pega esta URL en tu navegador:<br/>
          <a href="${resetUrl}" style="color:#4338ca;">${resetUrl}</a>
        </p>
      </div>
    `,
  };

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Error al enviar email: ${errorData.message || response.statusText}`);
  }

  return response.json();
}

module.exports = { sendPasswordResetEmail };
