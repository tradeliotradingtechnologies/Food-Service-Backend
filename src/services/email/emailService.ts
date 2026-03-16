import nodemailer from "nodemailer";
import * as templates from "./emailTemplates.js";

const getPrimaryClientUrl = (): string =>
  (process.env.CLIENT_URL || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .find(Boolean) || "http://localhost:3000";

// ── Transport Configuration ─────────────────────────────────────
// In development: uses Ethereal (fake SMTP) for testing
// In production: uses real SMTP (SendGrid, Mailgun, AWS SES, etc.)

let transporter: nodemailer.Transporter;

const createTransporter = async (): Promise<nodemailer.Transporter> => {
  if (transporter) return transporter;

  if (process.env.NODE_ENV === "production") {
    // Production SMTP
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true", // true for 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development: Ethereal test account
    // Emails are captured at https://ethereal.email
    const testAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    console.log(
      `📧 Ethereal email account: ${testAccount.user} (check https://ethereal.email)`,
    );
  }

  return transporter;
};

// ── Core Send Function ──────────────────────────────────────────

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

const sendMail = async (options: SendMailOptions): Promise<string | null> => {
  try {
    const transport = await createTransporter();

    const from =
      process.env.EMAIL_FROM ||
      '"Erica\'s Kitchen" <noreply@ericaskitchen.com>';

    const info = await transport.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo || process.env.EMAIL_REPLY_TO,
    });

    // In dev, log the preview URL
    if (process.env.NODE_ENV !== "production") {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`📧 Preview: ${previewUrl}`);
      }
    }

    return info.messageId;
  } catch (error) {
    console.error("❌ Email send failed:", error);
    // Don't throw — emails failing should not break the main flow
    return null;
  }
};

// ── Public API ──────────────────────────────────────────────────
// Each function is fire-and-forget safe (catches its own errors)

export const sendWelcomeEmail = async (
  email: string,
  name: string,
): Promise<string | null> => {
  const { subject, html } = templates.welcomeEmail(name);
  return sendMail({ to: email, subject, html });
};

export const sendEmailVerification = async (
  email: string,
  name: string,
  verificationToken: string,
): Promise<string | null> => {
  const baseUrl = getPrimaryClientUrl();
  const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
  const { subject, html } = templates.emailVerification(name, verificationUrl);
  return sendMail({ to: email, subject, html });
};

export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  resetToken: string,
): Promise<string | null> => {
  const baseUrl = getPrimaryClientUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
  const { subject, html } = templates.passwordReset(name, resetUrl);
  return sendMail({ to: email, subject, html });
};

export const sendPasswordChangedEmail = async (
  email: string,
  name: string,
): Promise<string | null> => {
  const { subject, html } = templates.passwordChanged(name);
  return sendMail({ to: email, subject, html });
};

export const sendOrderConfirmationEmail = async (
  email: string,
  data: {
    name: string;
    orderNumber: string;
    items: { name: string; quantity: number; lineTotal: number }[];
    subtotal: number;
    deliveryFee: number;
    tax: number;
    totalAmount: number;
    deliveryAddress: string;
    paymentMethod: string;
  },
): Promise<string | null> => {
  const { subject, html } = templates.orderConfirmation(data);
  return sendMail({ to: email, subject, html });
};

export const sendOrderStatusEmail = async (
  email: string,
  data: {
    name: string;
    orderNumber: string;
    status: string;
    note?: string;
  },
): Promise<string | null> => {
  const { subject, html } = templates.orderStatusUpdate(data);
  return sendMail({ to: email, subject, html });
};

export const sendReservationConfirmationEmail = async (
  email: string,
  data: {
    guestName: string;
    reservationNumber: string;
    date: string;
    time: string;
    partySize: number;
    specialRequests?: string;
  },
): Promise<string | null> => {
  const { subject, html } = templates.reservationConfirmation(data);
  return sendMail({ to: email, subject, html });
};

export const sendReservationStatusEmail = async (
  email: string,
  data: {
    guestName: string;
    reservationNumber: string;
    status: string;
    cancellationReason?: string;
  },
): Promise<string | null> => {
  const { subject, html } = templates.reservationStatusUpdate(data);
  return sendMail({ to: email, subject, html });
};

export const sendNewsletterWelcomeEmail = async (
  email: string,
): Promise<string | null> => {
  const { subject, html } = templates.newsletterWelcome(email);
  return sendMail({ to: email, subject, html });
};

export const sendPaymentConfirmationEmail = async (
  email: string,
  data: {
    name: string;
    orderNumber: string;
    amount: number;
    method: string;
    providerRef?: string;
  },
): Promise<string | null> => {
  const { subject, html } = templates.paymentConfirmation(data);
  return sendMail({ to: email, subject, html });
};

export const sendAccountDeactivatedEmail = async (
  email: string,
  name: string,
): Promise<string | null> => {
  const { subject, html } = templates.accountDeactivated(name);
  return sendMail({ to: email, subject, html });
};

export const sendAccountLockedEmail = async (
  email: string,
  name: string,
): Promise<string | null> => {
  const { subject, html } = templates.accountLockedOut(name);
  return sendMail({ to: email, subject, html });
};

// ── Bulk Email (Newsletter) ─────────────────────────────────────

export const sendBulkEmail = async (
  recipients: string[],
  subject: string,
  html: string,
): Promise<{ sent: number; failed: number }> => {
  let sent = 0;
  let failed = 0;

  // Send in batches of 10 to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((email) => sendMail({ to: email, subject, html })),
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) sent++;
      else failed++;
    }

    // Small delay between batches
    if (i + batchSize < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return { sent, failed };
};
