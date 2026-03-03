// ── Email HTML Templates ────────────────────────────────────────
// Branded templates for Erica's Kitchen

const BRAND_COLOR = "#c0392b";
const BRAND_SECONDARY = "#e74c3c";
const BG_COLOR = "#faf5f0";
const TEXT_COLOR = "#2c3e50";
const LIGHT_TEXT = "#7f8c8d";
const BORDER_COLOR = "#e8ddd3";

// ── Base Layout Wrapper ─────────────────────────────────────────

const baseLayout = (content: string, preheader = ""): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Erica's Kitchen</title>
  <style>
    body { margin:0; padding:0; font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; background:${BG_COLOR}; color:${TEXT_COLOR}; }
    .wrapper { max-width:600px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.06); }
    .header { background:${BRAND_COLOR}; padding:28px 32px; text-align:center; }
    .header h1 { margin:0; color:#ffffff; font-size:26px; letter-spacing:0.5px; }
    .header p { margin:4px 0 0; color:rgba(255,255,255,0.85); font-size:13px; }
    .body { padding:32px; }
    .footer { background:#f7f2ed; padding:20px 32px; text-align:center; border-top:1px solid ${BORDER_COLOR}; }
    .footer p { margin:4px 0; font-size:12px; color:${LIGHT_TEXT}; }
    .btn { display:inline-block; padding:14px 32px; background:${BRAND_COLOR}; color:#ffffff !important; text-decoration:none; border-radius:8px; font-weight:600; font-size:15px; }
    .btn:hover { background:${BRAND_SECONDARY}; }
    .divider { height:1px; background:${BORDER_COLOR}; margin:24px 0; }
    .info-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0ebe5; }
    .info-label { color:${LIGHT_TEXT}; font-size:13px; }
    .info-value { font-weight:600; font-size:14px; }
    .highlight-box { background:#fdf2f0; border-left:4px solid ${BRAND_COLOR}; padding:16px 20px; border-radius:0 8px 8px 0; margin:16px 0; }
    h2 { color:${TEXT_COLOR}; font-size:20px; margin:0 0 12px; }
    p { line-height:1.65; font-size:15px; margin:12px 0; }
    .preheader { display:none !important; visibility:hidden; mso-hide:all; font-size:1px; color:${BG_COLOR}; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; }
  </style>
</head>
<body>
  <span class="preheader">${preheader}</span>
  <div style="padding:24px 16px; background:${BG_COLOR};">
    <div class="wrapper">
      <div class="header">
        <h1>🍽️ Erica's Kitchen</h1>
        <p>Delicious food, delivered with love</p>
      </div>
      <div class="body">
        ${content}
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Erica's Kitchen. All rights reserved.</p>
        <p>Questions? Reply to this email or contact us at support@ericaskitchen.com</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

// ── Individual Templates ────────────────────────────────────────

export const welcomeEmail = (
  name: string,
): { subject: string; html: string } => ({
  subject: "Welcome to Erica's Kitchen! 🎉",
  html: baseLayout(
    `
    <h2>Welcome, ${name}! 👋</h2>
    <p>We're thrilled to have you join the Erica's Kitchen family. You're now part of a community that believes great food brings people together.</p>
    <div class="highlight-box">
      <strong>What you can do now:</strong>
      <ul style="margin:8px 0 0; padding-left:20px;">
        <li>Browse our daily-changing menu</li>
        <li>Place orders for delivery or pickup</li>
        <li>Reserve a table for dine-in</li>
        <li>Save your favorite dishes</li>
      </ul>
    </div>
    <p style="text-align:center; margin:28px 0;">
      <a href="${process.env.CLIENT_URL || "http://localhost:3000"}/menu" class="btn">Explore Our Menu</a>
    </p>
    <p>Bon appétit! 🍽️<br><strong>— The Erica's Kitchen Team</strong></p>
    `,
    "Welcome to Erica's Kitchen! Start exploring our delicious menu today.",
  ),
});

export const emailVerification = (
  name: string,
  verificationUrl: string,
): { subject: string; html: string } => ({
  subject: "Verify Your Email — Erica's Kitchen",
  html: baseLayout(
    `
    <h2>Verify Your Email</h2>
    <p>Hi ${name},</p>
    <p>Thanks for signing up! Please verify your email address to unlock all features of your account.</p>
    <p style="text-align:center; margin:28px 0;">
      <a href="${verificationUrl}" class="btn">Verify Email Address</a>
    </p>
    <p style="font-size:13px; color:${LIGHT_TEXT};">This link expires in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.</p>
    `,
    "Please verify your email to complete your registration.",
  ),
});

export const passwordReset = (
  name: string,
  resetUrl: string,
): { subject: string; html: string } => ({
  subject: "Password Reset — Erica's Kitchen",
  html: baseLayout(
    `
    <h2>Password Reset Request</h2>
    <p>Hi ${name},</p>
    <p>We received a request to reset your password. Click the button below to choose a new password:</p>
    <p style="text-align:center; margin:28px 0;">
      <a href="${resetUrl}" class="btn">Reset Password</a>
    </p>
    <div class="highlight-box">
      <strong>⏰ This link expires in 10 minutes.</strong><br>
      If you didn't request a password reset, please ignore this email or contact support if you have concerns.
    </div>
    `,
    "Reset your Erica's Kitchen password.",
  ),
});

export const passwordChanged = (
  name: string,
): { subject: string; html: string } => ({
  subject: "Password Changed Successfully — Erica's Kitchen",
  html: baseLayout(
    `
    <h2>Password Updated ✅</h2>
    <p>Hi ${name},</p>
    <p>Your password has been changed successfully. If you made this change, no further action is needed.</p>
    <div class="highlight-box">
      <strong>⚠️ Didn't change your password?</strong><br>
      If you did not make this change, please reset your password immediately and contact our support team.
    </div>
    `,
    "Your password was changed successfully.",
  ),
});

export const orderConfirmation = (data: {
  name: string;
  orderNumber: string;
  items: { name: string; quantity: number; lineTotal: number }[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  totalAmount: number;
  deliveryAddress: string;
  paymentMethod: string;
}): { subject: string; html: string } => {
  const itemsHtml = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 0; border-bottom:1px solid #f0ebe5; font-size:14px;">${item.name}</td>
      <td style="padding:10px 0; border-bottom:1px solid #f0ebe5; text-align:center; font-size:14px;">x${item.quantity}</td>
      <td style="padding:10px 0; border-bottom:1px solid #f0ebe5; text-align:right; font-weight:600; font-size:14px;">GHS ${item.lineTotal.toFixed(2)}</td>
    </tr>`,
    )
    .join("");

  return {
    subject: `Order Confirmed — #${data.orderNumber} 🎉`,
    html: baseLayout(
      `
      <h2>Order Confirmed! 🎉</h2>
      <p>Hi ${data.name},</p>
      <p>Great news — your order has been received and is being prepared!</p>
      
      <div class="highlight-box">
        <strong>Order #${data.orderNumber}</strong>
      </div>

      <table style="width:100%; border-collapse:collapse; margin:16px 0;">
        <thead>
          <tr style="border-bottom:2px solid ${BORDER_COLOR};">
            <th style="text-align:left; padding:8px 0; font-size:12px; text-transform:uppercase; color:${LIGHT_TEXT};">Item</th>
            <th style="text-align:center; padding:8px 0; font-size:12px; text-transform:uppercase; color:${LIGHT_TEXT};">Qty</th>
            <th style="text-align:right; padding:8px 0; font-size:12px; text-transform:uppercase; color:${LIGHT_TEXT};">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="background:#f7f2ed; padding:16px; border-radius:8px; margin:16px 0;">
        <table style="width:100%; font-size:14px;">
          <tr><td>Subtotal</td><td style="text-align:right;">GHS ${data.subtotal.toFixed(2)}</td></tr>
          <tr><td>Delivery Fee</td><td style="text-align:right;">GHS ${data.deliveryFee.toFixed(2)}</td></tr>
          <tr><td>Tax</td><td style="text-align:right;">GHS ${data.tax.toFixed(2)}</td></tr>
          <tr><td style="padding-top:8px; border-top:1px solid ${BORDER_COLOR}; font-weight:700; font-size:16px;">Total</td>
              <td style="padding-top:8px; border-top:1px solid ${BORDER_COLOR}; text-align:right; font-weight:700; font-size:16px; color:${BRAND_COLOR};">GHS ${data.totalAmount.toFixed(2)}</td></tr>
        </table>
      </div>

      <p><strong>Delivery to:</strong> ${data.deliveryAddress}</p>
      <p><strong>Payment:</strong> ${data.paymentMethod.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</p>
      
      <p style="text-align:center; margin:28px 0;">
        <a href="${process.env.CLIENT_URL || "http://localhost:3000"}/orders" class="btn">Track Your Order</a>
      </p>
      `,
      `Your order #${data.orderNumber} has been confirmed!`,
    ),
  };
};

export const orderStatusUpdate = (data: {
  name: string;
  orderNumber: string;
  status: string;
  note?: string;
}): { subject: string; html: string } => {
  const statusEmojis: Record<string, string> = {
    confirmed: "✅",
    preparing: "👨‍🍳",
    ready_for_pickup: "📦",
    out_for_delivery: "🚗",
    delivered: "🎉",
    cancelled: "❌",
  };

  const statusLabels: Record<string, string> = {
    confirmed: "Confirmed",
    preparing: "Being Prepared",
    ready_for_pickup: "Ready for Pickup",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };

  const emoji = statusEmojis[data.status] || "📋";
  const label = statusLabels[data.status] || data.status;

  return {
    subject: `Order #${data.orderNumber} — ${label} ${emoji}`,
    html: baseLayout(
      `
      <h2>Order Update ${emoji}</h2>
      <p>Hi ${data.name},</p>
      <p>Your order <strong>#${data.orderNumber}</strong> status has been updated:</p>
      
      <div class="highlight-box" style="text-align:center;">
        <span style="font-size:32px;">${emoji}</span><br>
        <strong style="font-size:18px;">${label}</strong>
      </div>

      ${data.note ? `<p><strong>Note:</strong> ${data.note}</p>` : ""}
      
      <p style="text-align:center; margin:28px 0;">
        <a href="${process.env.CLIENT_URL || "http://localhost:3000"}/orders" class="btn">View Order Details</a>
      </p>
      `,
      `Your order #${data.orderNumber} is now ${label}.`,
    ),
  };
};

export const reservationConfirmation = (data: {
  guestName: string;
  reservationNumber: string;
  date: string;
  time: string;
  partySize: number;
  specialRequests?: string;
}): { subject: string; html: string } => ({
  subject: `Reservation Confirmed — #${data.reservationNumber} 🍽️`,
  html: baseLayout(
    `
    <h2>Reservation Confirmed 🍽️</h2>
    <p>Hi ${data.guestName},</p>
    <p>Your table has been reserved. We look forward to welcoming you!</p>

    <div style="background:#f7f2ed; padding:20px; border-radius:8px; margin:16px 0;">
      <table style="width:100%; font-size:14px;">
        <tr><td style="padding:6px 0; color:${LIGHT_TEXT};">Reservation</td><td style="padding:6px 0; font-weight:600; text-align:right;">#${data.reservationNumber}</td></tr>
        <tr><td style="padding:6px 0; color:${LIGHT_TEXT};">Date</td><td style="padding:6px 0; font-weight:600; text-align:right;">${data.date}</td></tr>
        <tr><td style="padding:6px 0; color:${LIGHT_TEXT};">Time</td><td style="padding:6px 0; font-weight:600; text-align:right;">${data.time}</td></tr>
        <tr><td style="padding:6px 0; color:${LIGHT_TEXT};">Party Size</td><td style="padding:6px 0; font-weight:600; text-align:right;">${data.partySize} ${data.partySize === 1 ? "guest" : "guests"}</td></tr>
      </table>
    </div>

    ${data.specialRequests ? `<p><strong>Special Requests:</strong> ${data.specialRequests}</p>` : ""}

    <div class="highlight-box">
      <strong>📍 Location:</strong> Erica's Kitchen<br>
      Please arrive 10 minutes before your reservation time.
    </div>

    <p>Need to change or cancel? Contact us at least 2 hours before your reservation.</p>
    `,
    `Your reservation #${data.reservationNumber} is confirmed for ${data.date} at ${data.time}.`,
  ),
});

export const reservationStatusUpdate = (data: {
  guestName: string;
  reservationNumber: string;
  status: string;
  cancellationReason?: string;
}): { subject: string; html: string } => {
  const statusLabels: Record<string, string> = {
    confirmed: "Confirmed ✅",
    seated: "Seated 🪑",
    completed: "Completed — Thank You! 🎉",
    cancelled: "Cancelled ❌",
    no_show: "Missed ⏰",
  };

  const label = statusLabels[data.status] || data.status;

  return {
    subject: `Reservation #${data.reservationNumber} — ${label}`,
    html: baseLayout(
      `
      <h2>Reservation Update</h2>
      <p>Hi ${data.guestName},</p>
      <p>Your reservation <strong>#${data.reservationNumber}</strong> has been updated:</p>
      
      <div class="highlight-box" style="text-align:center;">
        <strong style="font-size:18px;">${label}</strong>
      </div>

      ${data.cancellationReason ? `<p><strong>Reason:</strong> ${data.cancellationReason}</p>` : ""}
      
      ${data.status === "completed" ? "<p>Thank you for dining with us! We'd love to hear your feedback. Leave us a review on the app!</p>" : ""}
      `,
      `Your reservation #${data.reservationNumber} is now ${label}.`,
    ),
  };
};

export const newsletterWelcome = (
  email: string,
): { subject: string; html: string } => ({
  subject: "You're Subscribed! 🎉 — Erica's Kitchen Newsletter",
  html: baseLayout(
    `
    <h2>You're In! 🎉</h2>
    <p>Hi there,</p>
    <p>Thanks for subscribing to the Erica's Kitchen newsletter! You'll be the first to know about:</p>
    <ul style="padding-left:20px; line-height:2;">
      <li>🆕 New menu items and daily specials</li>
      <li>🏷️ Exclusive discounts and offers</li>
      <li>📅 Upcoming events and seasonal menus</li>
      <li>👨‍🍳 Behind-the-scenes stories from our kitchen</li>
    </ul>
    <p style="text-align:center; margin:28px 0;">
      <a href="${process.env.CLIENT_URL || "http://localhost:3000"}/menu" class="btn">Check Today's Menu</a>
    </p>
    <p style="font-size:12px; color:${LIGHT_TEXT};">You can unsubscribe at any time by clicking the unsubscribe link in our emails.</p>
    `,
    "Welcome to the Erica's Kitchen newsletter! Great food awaits.",
  ),
});

export const paymentConfirmation = (data: {
  name: string;
  orderNumber: string;
  amount: number;
  method: string;
  providerRef?: string;
}): { subject: string; html: string } => ({
  subject: `Payment Received — GHS ${data.amount.toFixed(2)} 💳`,
  html: baseLayout(
    `
    <h2>Payment Confirmed 💳</h2>
    <p>Hi ${data.name},</p>
    <p>We've received your payment. Here are the details:</p>

    <div style="background:#f7f2ed; padding:20px; border-radius:8px; margin:16px 0;">
      <table style="width:100%; font-size:14px;">
        <tr><td style="padding:6px 0; color:${LIGHT_TEXT};">Order</td><td style="padding:6px 0; font-weight:600; text-align:right;">#${data.orderNumber}</td></tr>
        <tr><td style="padding:6px 0; color:${LIGHT_TEXT};">Amount</td><td style="padding:6px 0; font-weight:700; text-align:right; color:${BRAND_COLOR};">GHS ${data.amount.toFixed(2)}</td></tr>
        <tr><td style="padding:6px 0; color:${LIGHT_TEXT};">Method</td><td style="padding:6px 0; font-weight:600; text-align:right;">${data.method.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</td></tr>
        ${data.providerRef ? `<tr><td style="padding:6px 0; color:${LIGHT_TEXT};">Reference</td><td style="padding:6px 0; font-weight:600; text-align:right;">${data.providerRef}</td></tr>` : ""}
      </table>
    </div>

    <p>Thank you for your order! 🙏</p>
    `,
    `Payment of GHS ${data.amount.toFixed(2)} received for order #${data.orderNumber}.`,
  ),
});

export const accountDeactivated = (
  name: string,
): { subject: string; html: string } => ({
  subject: "Account Deactivated — Erica's Kitchen",
  html: baseLayout(
    `
    <h2>Account Deactivated</h2>
    <p>Hi ${name},</p>
    <p>Your Erica's Kitchen account has been deactivated by an administrator. You will no longer be able to log in or place orders.</p>
    <p>If you believe this was a mistake, please contact our support team:</p>
    <p style="text-align:center; margin:28px 0;">
      <a href="mailto:support@ericaskitchen.com" class="btn">Contact Support</a>
    </p>
    `,
    "Your Erica's Kitchen account has been deactivated.",
  ),
});

export const accountLockedOut = (
  name: string,
): { subject: string; html: string } => ({
  subject: "⚠️ Account Locked — Erica's Kitchen",
  html: baseLayout(
    `
    <h2>Security Alert ⚠️</h2>
    <p>Hi ${name},</p>
    <p>Your account has been temporarily locked due to multiple failed login attempts. This lock will automatically expire in <strong>15 minutes</strong>.</p>
    <div class="highlight-box">
      <strong>Wasn't you?</strong><br>
      If you didn't attempt to log in, someone may be trying to access your account. We recommend resetting your password immediately after the lock expires.
    </div>
    `,
    "Your account has been temporarily locked due to suspicious activity.",
  ),
});
