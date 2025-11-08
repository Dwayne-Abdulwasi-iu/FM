#!/usr/bin/env node
// Simple script to test email transport used by the app.
// Usage: node scripts/test-email.js recipient@example.com

require('dotenv').config()
const nodemailer = require('nodemailer')

async function main() {
  const to = process.argv[2]
  if (!to) {
    console.error('Usage: node scripts/test-email.js recipient@example.com')
    process.exit(2)
  }

  let transporter
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: (process.env.SMTP_SECURE === 'true'),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    })
  } else if (process.env.SENDGRID_API_KEY) {
    transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY }
    })
  } else {
    console.error('No SMTP or SendGrid config found in environment. Set SMTP_HOST/SMTP_USER/SMTP_PASS or SENDGRID_API_KEY')
    process.exit(1)
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'no-reply@example.com',
      to,
      subject: 'Test email from Fashion Marketplace',
      text: 'This is a test email to verify SMTP/SendGrid configuration.'
    })
    console.log('Message sent:', info.messageId || info.response || info)
    process.exit(0)
  } catch (err) {
    console.error('Failed to send test email:', err)
    process.exit(1)
  }
}

main()
