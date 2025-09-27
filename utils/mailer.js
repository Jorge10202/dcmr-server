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

const port = Number(process.env.SMTP_PORT) || 587;

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port,                 // 587
  secure: false,        // 587 = STARTTLS (NO SSL directo)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  requireTLS: true,     // fuerza STARTTLS
  tls: { minVersion: 'TLSv1.2' },
  pool: true,
  // logger: true,       // opcional para ver logs en Render
  // debug: true,
});

export async function sendMail({ to, subject, text, html, attachments = [] }) {
  const from =
    process.env.MAIL_FROM ||
    `"DCMR Mueblería" <${process.env.SMTP_USER}>`;

  return transporter.sendMail({ from, to, subject, text, html, attachments });
}

export async function verifyMailer() {
  return transporter.verify();
}
