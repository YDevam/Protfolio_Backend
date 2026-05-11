const express     = require('express')
const rateLimit   = require('express-rate-limit')
const { sendContactEmails } = require('../utils/mailer')

const router = express.Router()

// ─── Rate limiter: max 5 submissions per IP per 15 minutes ───────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: 'Too many messages sent from this IP. Please try again in 15 minutes.',
  },
})

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isValidEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)
}

function sanitise(str = '', maxLen = 2000) {
  return String(str).trim().slice(0, maxLen)
}

// ─── POST /api/contact ────────────────────────────────────────────────────────
router.post('/', limiter, async (req, res) => {
  try {
    const name    = sanitise(req.body.name,    100)
    const email   = sanitise(req.body.email,   200)
    const budget  = sanitise(req.body.budget,  100)
    const message = sanitise(req.body.message, 2000)

    // ── Validate ──────────────────────────────────────────────────────────────
    const errors = {}
    if (!name)                        errors.name    = 'Name is required.'
    if (!email)                       errors.email   = 'Email is required.'
    else if (!isValidEmail(email))    errors.email   = 'Please enter a valid email address.'
    if (!message)                     errors.message = 'Message is required.'
    else if (message.length < 10)     errors.message = 'Message is too short (min 10 characters).'

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ ok: false, errors })
    }

    // ── Send ──────────────────────────────────────────────────────────────────
    await sendContactEmails({ name, email, budget, message })

    console.log(`📬  Contact email sent | from: ${email} | name: ${name}`)

    return res.status(200).json({
      ok: true,
      message: `Thanks ${name}! Your message has been sent. I'll reply within 24 hours.`,
    })
  } catch (err) {
    console.error('❌  Contact route error:', err)
    return res.status(500).json({
      ok: false,
      error: 'Failed to send your message. Please try again or email me directly at alex@kim.dev.',
    })
  }
})

module.exports = router
