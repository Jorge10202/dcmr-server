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

const port = Number(process.env.SMTP_PORT) || 465;
const secure = port === 465;

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port,
  secure,                  // 465 => true
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  // evita bloqueos eternos
  connectionTimeout: 15000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
  tls: { minVersion: 'TLSv1.2' },
  pool: true,
});

export async function sendMail({ to, subject, text, html, attachments = [] }) {
  const from = process.env.MAIL_FROM || `"DCMR Mueblería" <${process.env.SMTP_USER}>`;
  return transporter.sendMail({ from, to, subject, text, html, attachments });
}
