/**
 * mailer.js
 *
 * Supports four providers via the MAIL_PROVIDER env var:
 *
 *   gmail   — Gmail App Password (SMTP, still works)
 *   resend  — Resend.com SMTP relay  (free 100/day, recommended)
 *   brevo   — Brevo (Sendinblue) SMTP (free 300/day)
 *   smtp    — Any custom SMTP server
 *
 * Outlook / Office365 basic SMTP auth was permanently disabled by
 * Microsoft in 2023 — it cannot be used here without a full OAuth2
 * Azure app registration (not worth the complexity for a portfolio).
 * Use Gmail, Resend, or Brevo instead.
 */

const nodemailer = require('nodemailer')

// ─── Build transporter based on MAIL_PROVIDER ────────────────────────────────
function createTransporter() {
  const provider = (process.env.MAIL_PROVIDER || 'smtp').toLowerCase()

  switch (provider) {

    // ── Gmail App Password ──────────────────────────────────────────────────
    // Docs: https://support.google.com/accounts/answer/185833
    // 1. Enable 2-Step Verification on your Google account
    // 2. Go to Google Account → Security → App Passwords
    // 3. Generate a password for "Mail"
    case 'gmail':
      return nodemailer.createTransport({
        service: 'gmail',          // pre-configured by nodemailer
        auth: {
          user: process.env.SMTP_USER, // your.gmail@gmail.com
          pass: process.env.SMTP_PASS, // 16-char App Password (no spaces needed)
        },
      })

    // ── Resend (recommended — modern, reliable, free 100/day) ───────────────
    // Docs: https://resend.com/docs/send-with-nodemailer
    // 1. Sign up at resend.com (free)
    // 2. Verify your domain OR use onboarding@resend.dev for testing
    // 3. Create an API key at resend.com/api-keys
    case 'resend':
      return nodemailer.createTransport({
        host:   'smtp.resend.com',
        port:   465,
        secure: true,
        auth: {
          user: 'resend',           // literally the string "resend"
          pass: process.env.SMTP_PASS, // your Resend API key (re_...)
        },
      })

    // ── Brevo / Sendinblue (free 300 emails/day) ────────────────────────────
    // Docs: https://help.brevo.com/hc/en-us/articles/209462765
    // 1. Sign up at brevo.com (free)
    // 2. Go to Settings → SMTP & API → SMTP tab
    // 3. Copy the SMTP login + master password (or generate SMTP key)
    case 'brevo':
      return nodemailer.createTransport({
        host:   'smtp-relay.brevo.com',
        port:   587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER, // your Brevo account email
          pass: process.env.SMTP_PASS, // Brevo SMTP key (not account password)
        },
      })

    // ── Generic SMTP (any host/port) ────────────────────────────────────────
    default:
      return nodemailer.createTransport({
        host:   process.env.SMTP_HOST,
        port:   Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
  }
}

const transporter = createTransporter()

// ─── Verify on startup ───────────────────────────────────────────────────────
async function verifyConnection() {
  const provider = process.env.MAIL_PROVIDER || 'smtp'
  try {
    await transporter.verify()
    console.log(`✅  SMTP connection verified  (provider: ${provider})`)
  } catch (err) {
    console.error(`❌  SMTP connection failed   (provider: ${provider})`)
    console.error(`    ${err.message}`)
    console.error(`\n    ─── Troubleshooting ─────────────────────────────────`)
    if (provider === 'gmail') {
      console.error(`    Gmail: make sure you are using an App Password, NOT`)
      console.error(`    your regular Gmail password.`)
      console.error(`    Guide: https://support.google.com/accounts/answer/185833`)
    } else if (provider === 'resend') {
      console.error(`    Resend: SMTP_PASS must be your Resend API key (re_...)`)
      console.error(`    SMTP_USER must be the literal string "resend"`)
      console.error(`    Guide: https://resend.com/docs/send-with-nodemailer`)
    } else if (provider === 'brevo') {
      console.error(`    Brevo: SMTP_PASS is the SMTP key from Brevo dashboard,`)
      console.error(`    NOT your Brevo account password.`)
      console.error(`    Guide: https://help.brevo.com/hc/en-us/articles/209462765`)
    } else {
      console.error(`    Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env`)
      console.error(`    NOTE: Outlook/Office365 basic SMTP auth is DISABLED by`)
      console.error(`    Microsoft. Switch MAIL_PROVIDER to gmail, resend, or brevo.`)
    }
    console.error(`    ──────────────────────────────────────────────────────\n`)
  }
}

// ─── HTML helpers ────────────────────────────────────────────────────────────
function escHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ─── Notification email → YOU ────────────────────────────────────────────────
function buildNotificationHtml({ name, email, budget, message }) {
  const budgetRow = budget
    ? `<tr style="background:rgba(255,255,255,0.02)">
         <td style="padding:8px 14px;color:#9999bb;font-size:13px;white-space:nowrap;border-bottom:1px solid rgba(255,255,255,0.05)">Budget</td>
         <td style="padding:8px 14px;color:#d0dcff;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.05)">${escHtml(budget)}</td>
       </tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>New message from ${escHtml(name)}</title>
</head>
<body style="margin:0;padding:0;background:#05050D;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#05050D;padding:40px 16px;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0A0A1A;border-radius:16px;border:1px solid rgba(0,238,255,0.2);overflow:hidden;">

    <!-- Gradient top bar -->
    <tr><td style="height:4px;background:linear-gradient(90deg,#00EEFF,#0055FF);padding:0;font-size:0;">&nbsp;</td></tr>

    <!-- Header -->
    <tr><td style="padding:32px 40px 20px;">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="width:36px;height:36px;background:linear-gradient(135deg,#00EEFF,#0055FF);border-radius:9px;text-align:center;vertical-align:middle;font-weight:800;font-size:13px;color:#000;letter-spacing:-0.03em;">DY</td>
        <td style="padding-left:12px;color:#D0DCFF;font-size:15px;font-weight:600;letter-spacing:0.04em;">Portfolio</td>
      </tr></table>
      <h1 style="margin:20px 0 4px;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.03em;">New Contact Form Submission</h1>
      <p style="margin:0;color:rgba(0,238,255,0.8);font-size:11px;font-weight:700;letter-spacing:0.16em;">SOMEONE WANTS TO WORK WITH YOU</p>
    </td></tr>

    <!-- Divider -->
    <tr><td style="padding:0 40px;"><div style="height:1px;background:linear-gradient(90deg,rgba(0,238,255,0.4),transparent);font-size:0;">&nbsp;</div></td></tr>

    <!-- Sender table -->
    <tr><td style="padding:24px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden;">
        <tr>
          <td style="padding:8px 14px;color:#9999bb;font-size:13px;white-space:nowrap;border-bottom:1px solid rgba(255,255,255,0.05);">Name</td>
          <td style="padding:8px 14px;color:#d0dcff;font-size:13px;font-weight:500;border-bottom:1px solid rgba(255,255,255,0.05);">${escHtml(name)}</td>
        </tr>
        <tr style="background:rgba(255,255,255,0.02);">
          <td style="padding:8px 14px;color:#9999bb;font-size:13px;white-space:nowrap;border-bottom:1px solid rgba(255,255,255,0.05);">Reply-to</td>
          <td style="padding:8px 14px;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.05);"><a href="mailto:${escHtml(email)}" style="color:#00EEFF;text-decoration:none;">${escHtml(email)}</a></td>
        </tr>
        ${budgetRow}
      </table>
    </td></tr>

    <!-- Message body -->
    <tr><td style="padding:0 40px 32px;">
      <p style="margin:0 0 10px;color:#9999bb;font-size:11px;font-weight:700;letter-spacing:0.16em;">MESSAGE</p>
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;color:#d0dcff;font-size:14px;line-height:1.8;white-space:pre-wrap;">${escHtml(message)}</div>
    </td></tr>

    <!-- Reply CTA -->
    <tr><td style="padding:0 40px 40px;">
      <a href="mailto:${escHtml(email)}?subject=Re%3A%20Your%20message%20on%20devamyadav"
         style="display:inline-block;background:linear-gradient(135deg,#00EEFF,#0055FF);color:#000;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:0.08em;padding:13px 28px;border-radius:40px;">
        REPLY TO ${escHtml(name.toUpperCase())} &rarr;
      </a>
    </td></tr>

    <!-- Footer -->
    <tr><td style="border-top:1px solid rgba(255,255,255,0.06);padding:18px 40px;">
      <p style="margin:0;color:rgba(208,220,255,0.3);font-size:12px;">Sent automatically from Devam Yadav contact form</p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>`
}

// ─── Auto-reply → VISITOR ─────────────────────────────────────────────────────
function buildAutoReplyHtml({ name }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Got your message!</title>
</head>
<body style="margin:0;padding:0;background:#05050D;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#05050D;padding:40px 16px;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0A0A1A;border-radius:16px;border:1px solid rgba(0,238,255,0.2);overflow:hidden;">

    <tr><td style="height:4px;background:linear-gradient(90deg,#00EEFF,#0055FF);padding:0;font-size:0;">&nbsp;</td></tr>

    <!-- Header -->
    <tr><td style="padding:40px 40px 28px;text-align:center;">
      <div style="display:inline-block;width:56px;height:56px;background:linear-gradient(135deg,#00EEFF,#0055FF);border-radius:13px;line-height:56px;text-align:center;font-weight:800;font-size:18px;color:#000;margin-bottom:24px;">DY</div>
      <h1 style="margin:0 0 8px;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.04em;">Got your message!</h1>
      <p style="margin:0;color:rgba(255, 251, 251, 0.8);font-size:11px;font-weight:700;letter-spacing:0.16em;">THANKS FOR REACHING OUT</p>
    </td></tr>

    <tr><td style="padding:0 40px;"><div style="height:1px;background:linear-gradient(90deg,rgba(0,238,255,0.4),transparent);font-size:0;">&nbsp;</div></td></tr>

    <!-- Body -->
    <tr><td style="padding:32px 40px;">
      <p style="margin:0 0 16px;color:#d0dcff;font-size:16px;line-height:1.7;">Hey ${escHtml(name)},</p>
      <p style="margin:0 0 16px;color:rgba(208,220,255,0.7);font-size:15px;line-height:1.8;">
        Your message landed safely in my inbox and I'll personally review it within
        <strong style="color:#00EEFF;">24 hours</strong>.
      </p>
      <p style="margin:0 0 16px;color:rgba(208,220,255,0.7);font-size:15px;line-height:1.8;">
        If your project is time-sensitive, just reply directly to this email — it goes straight to me.
      </p>
      <p style="margin:0;color:rgba(208,220,255,0.7);font-size:15px;line-height:1.8;">
        Talk soon,<br>
        <strong style="color:#d0dcff;">Devam Yadav</strong><br>
        <span style="color:rgba(0,238,255,0.7);font-size:13px;">Full Stack Developer &bull; Tokyo, Japan</span>
      </p>
    </td></tr>

    <!-- Footer -->
    <tr><td style="border-top:1px solid rgba(255,255,255,0.06);padding:18px 40px;">
      <p style="margin:0;color:rgba(208,220,255,0.3);font-size:12px;">
        This is an automated confirmation. You will only hear from Devam again when he replies personally.
      </p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>`
}

// ─── Public send function ────────────────────────────────────────────────────
async function sendContactEmails({ name, email, budget, message }) {
  const [notification, autoReply] = await Promise.allSettled([
    transporter.sendMail({
      from:    process.env.MAIL_FROM,
      to:      process.env.MAIL_TO,
      replyTo: email,
      subject: `[Devam Yadav] New message from ${name}`,
      html:    buildNotificationHtml({ name, email, budget, message }),
      text:    `New contact form submission\n\nName: ${name}\nEmail: ${email}\nBudget: ${budget || 'Not specified'}\n\nMessage:\n${message}`,
    }),
    transporter.sendMail({
      from:    process.env.MAIL_REPLY_FROM || process.env.MAIL_FROM,
      to:      email,
      subject: `Got your message, ${name} — Devam Yadav`,
      html:    buildAutoReplyHtml({ name }),
      text:    `Hey ${name},\n\nThanks for reaching out! I got your message and will reply within 24 hours.\n\Devam Yadav\n`,
    }),
  ])

  // Auto-reply failure is non-critical — log but don't throw
  if (autoReply.status === 'rejected') {
    console.warn('⚠️   Auto-reply failed (non-critical):', autoReply.reason?.message)
  }

  // Notification failure IS critical
  if (notification.status === 'rejected') {
    throw notification.reason
  }
}

module.exports = { sendContactEmails, verifyConnection }
