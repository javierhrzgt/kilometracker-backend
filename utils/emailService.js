const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Envía un email de confirmación de eliminación permanente de usuario via Brevo.
 * @param {string} rootEmail - Email del usuario root solicitante
 * @param {string} rootUsername - Username del usuario root solicitante
 * @param {string} targetUsername - Username del usuario que se va a eliminar
 * @param {string} code - Código de verificación de 6 dígitos
 */
async function sendDeleteConfirmationEmail(rootEmail, rootUsername, targetUsername, code) {
  const payload = {
    sender: {
      name: process.env.BREVO_SENDER_NAME || 'KM Tracker',
      email: process.env.BREVO_SENDER_EMAIL,
    },
    to: [{ email: rootEmail, name: rootUsername }],
    subject: 'Confirmación de eliminación permanente de usuario',
    htmlContent: `
      <h2>Código de verificación</h2>
      <p>Has solicitado eliminar permanentemente al usuario <strong>${targetUsername}</strong>.</p>
      <p>Tu código de verificación es: <strong style="font-size:24px">${code}</strong></p>
      <p>Este código expira en <strong>10 minutos</strong>.</p>
      <p style="color:red"><strong>Esta acción eliminará permanentemente la cuenta y TODOS sus datos asociados (vehículos, rutas, recargas, mantenimientos y gastos). Es irreversible.</strong></p>
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

module.exports = { sendDeleteConfirmationEmail };
