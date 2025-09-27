/*import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendMail({ to, subject, text, html, attachments = [] }) {
  return transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@dcmr.com',
    to, subject, text, html, attachments
  });
}*/

// server/utils/mailer.js
// En producción (Render): usaremos Brevo por API (HTTPS, sin puertos SMTP).
// En local (si quieres), puedes seguir usando Nodemailer con Gmail.

import nodemailer from 'nodemailer';

// --- ENV ---
const PROVIDER = process.env.EMAIL_PROVIDER || 'nodemailer'; // 'brevo' en Render
const FROM = process.env.MAIL_FROM || `"DCMR Mueblería" <${process.env.SMTP_USER || 'no-reply@dcmr.com'}>`;

// ---------- ENVÍO POR API (BREVO) ----------
async function sendViaBrevo({ to, subject, text, html, attachments = [] }) {
  const url = 'https://api.brevo.com/v3/smtp/email';

  // Brevo pide attachments en base64
  const mappedAttachments = (attachments || []).map(a => {
    let contentBase64 = '';
    if (a?.content) {
      contentBase64 = Buffer.isBuffer(a.content)
        ? a.content.toString('base64')
        : Buffer.from(String(a.content)).toString('base64');
    }
    return {
      name: a?.filename || a?.name || 'adjunto',
      content: contentBase64
    };
  });

  const body = {
    sender: {
      name: FROM.split('<')[0].replace(/"/g, '').trim(),
      email: (FROM.match(/<(.+?)>/) || [])[1] || FROM
    },
    to: [{ email: to }],
    subject,
    htmlContent: html || undefined,
    textContent: text || undefined,
    attachment: mappedAttachments.length ? mappedAttachments : undefined
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Brevo ${res.status}: ${errText}`);
  }
  return true;
}

// ---------- ENVÍO LOCAL POR SMTP (opcional) ----------
const smtpTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465, // 465 SSL, 587 STARTTLS
  auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  } : undefined,
  requireTLS: Number(process.env.SMTP_PORT) !== 465,
  tls: { minVersion: 'TLSv1.2' },
  pool: true
});

async function sendViaSMTP({ to, subject, text, html, attachments = [] }) {
  return smtpTransporter.sendMail({ from: FROM, to, subject, text, html, attachments });
}

// ---------- API PÚBLICA (misma firma que ya usas) ----------
export async function sendMail(opts) {
  if (PROVIDER === 'brevo') {
    return sendViaBrevo(opts);
  }
  return sendViaSMTP(opts);
}

// (opcional) endpoint de salud
export async function mailHealth() {
  if (PROVIDER === 'brevo') return { ok: true, provider: 'brevo' };
  await smtpTransporter.verify();
  return { ok: true, provider: 'smtp' };
}
