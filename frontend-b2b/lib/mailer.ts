import nodemailer from 'nodemailer';

type MailArgs = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

function smtpPort() {
  const raw = Number(process.env.LEADPULSE_SMTP_PORT || 465);
  return Number.isFinite(raw) ? raw : 465;
}

function smtpSecure() {
  const raw = String(process.env.LEADPULSE_SMTP_SECURE || 'true').toLowerCase();
  return raw !== 'false';
}

export function isSmtpConfigured() {
  return Boolean(
    process.env.LEADPULSE_SMTP_HOST &&
      process.env.LEADPULSE_SMTP_USER &&
      process.env.LEADPULSE_SMTP_PASS &&
      process.env.LEADPULSE_EMAIL_FROM,
  );
}

function transporter() {
  if (!isSmtpConfigured()) {
    throw new Error('SMTP 未配置完整。');
  }

  return nodemailer.createTransport({
    host: process.env.LEADPULSE_SMTP_HOST,
    port: smtpPort(),
    secure: smtpSecure(),
    auth: {
      user: process.env.LEADPULSE_SMTP_USER,
      pass: process.env.LEADPULSE_SMTP_PASS,
    },
  });
}

export async function sendEmail(args: MailArgs) {
  const tx = transporter();

  return tx.sendMail({
    from: process.env.LEADPULSE_EMAIL_FROM,
    to: args.to,
    subject: args.subject,
    text: args.text,
    replyTo: args.replyTo || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || process.env.LEADPULSE_SMTP_USER,
  });
}
