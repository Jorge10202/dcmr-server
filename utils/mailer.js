import nodemailer from 'nodemailer';

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
}
