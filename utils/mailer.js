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
import nodemailer from 'nodemailer';

function buildTransport(port) {
  const secure = port === 465; // 465 = SSL directo, 587 = STARTTLS
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS, // App Password (16 caracteres)
    },
    // Evita colgues largos
    connectionTimeout: 20000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    // Forzar IPv4 (a veces el AAAA de Gmail hace timeout desde PaaS)
    dnsResolvePrefer: 'ipv4',
    requireTLS: !secure,               // solo aplica para 587
    tls: { minVersion: 'TLSv1.2' },
    pool: true,
  });
}

const t465 = buildTransport(465);
const t587 = buildTransport(587);

function isConnErr(e) {
  const m = String(e?.message || '').toLowerCase();
  return (
    m.includes('timeout') ||
    m.includes('econn') ||                // ECONNRESET / ECONNREFUSED / ECONNECTION
    m.includes('must issue a starttls')
  );
}

export async function sendMail({ to, subject, text, html, attachments = [] }) {
  const from = process.env.MAIL_FROM || `"DCMR Mueblería" <${process.env.SMTP_USER}>`;

  // 1) Intentar 465 (SSL directo)
  try {
    await t465.verify();
    console.log('[SMTP] usando 465');
    return await t465.sendMail({ from, to, subject, text, html, attachments });
  } catch (e) {
    console.error('[SMTP 465]', e?.code || '', e?.message || e);
    if (!isConnErr(e)) throw e;
  }

  // 2) Fallback a 587 (STARTTLS)
  await t587.verify();
  console.log('[SMTP] fallback a 587');
  return t587.sendMail({ from, to, subject, text, html, attachments });
}

export async function mailHealth() {
  try {
    await t465.verify();
    return { ok: true, port: 465 };
  } catch (e1) {
    if (isConnErr(e1)) {
      await t587.verify();
      return { ok: true, port: 587, fallback: true };
    }
    throw e1;
  }
}
