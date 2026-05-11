require('dotenv').config()

const express = require('express')
const cors = require('cors')
const contactRoute = require('./routes/contact')
const { verifyConnection } = require('./utils/mailer')

const app = express()
const PORT = process.env.PORT || 4000

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://portfolio-devamyadav147-5018s-projects.vercel.app',
  methods: ['GET', 'POST'],
}))

app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

app.use('/api/contact', contactRoute)

// ─── 404 catch-all ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'Not found' })
})

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n🚀  Server running → http://localhost:${PORT}`)
  console.log(`   Health check  → http://localhost:${PORT}/api/health`)
  console.log(`   Contact API   → POST http://localhost:${PORT}/api/contact\n`)
  await verifyConnection()
})
