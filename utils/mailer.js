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

import nodemailer from 'nodemailer';

function buildTransport({ port }) {
  const secure = port === 465; // 465 = SSL directo; 587 = STARTTLS
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS, // App Password de Google (16 caracteres)
    },
    // timeouts para evitar cuelgues eternos
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    requireTLS: !secure,           // fuerza STARTTLS en 587
    tls: { minVersion: 'TLSv1.2' },
    pool: true,
  });
}

const t587 = buildTransport({ port: 587 });
const t465 = buildTransport({ port: 465 });

function isTimeoutOrConnErr(err) {
  const msg = String(err?.message || '').toLowerCase();
  return (
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('econ') ||      // ECONNRESET/ECONNREFUSED/ECONNECTION
    msg.includes('econn') ||
    msg.includes('must issue a starttls')
  );
}

export async function sendMail({ to, subject, text, html, attachments = [] }) {
  const from =
    process.env.MAIL_FROM || `"DCMR Mueblería" <${process.env.SMTP_USER}>`;

  // 1) intenta 587 (STARTTLS)
  try {
    await t587.verify();
    return await t587.sendMail({ from, to, subject, text, html, attachments });
  } catch (err) {
    console.error('[SMTP 587]', err?.message || err);
    if (!isTimeoutOrConnErr(err)) throw err;
  }

  // 2) fallback 465 (SSL)
  await t465.verify();
  return t465.sendMail({ from, to, subject, text, html, attachments });
}

export async function mailHealth() {
  try {
    await t587.verify();
    return { port: 587, ok: true };
  } catch (e1) {
    if (isTimeoutOrConnErr(e1)) {
      await t465.verify();
      return { port: 465, ok: true, fallback: true };
    }
    throw e1;
  }
}
