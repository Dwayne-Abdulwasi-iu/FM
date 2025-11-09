#!/usr/bin/env node
// Test sending a message via SendGrid Web API using native fetch (Node 18+).
// Usage: node scripts/test-sendgrid-api.js recipient@example.com

require('dotenv').config();

const apiKey = process.env.SENDGRID_API_KEY;
const from = process.env.EMAIL_FROM;

if (!apiKey) {
  console.error('SENDGRID_API_KEY not set in environment');
  process.exit(2);
}
if (!from) {
  console.error('EMAIL_FROM not set in environment');
  process.exit(2);
}

const recipient = process.argv[2];
if (!recipient) {
  console.error('Usage: node scripts/test-sendgrid-api.js recipient@example.com');
  process.exit(2);
}

async function main() {
  try {
    const body = {
      personalizations: [{ to: [{ email: recipient }] }],
      from: { email: from.match(/<(.+)>/)?.[1] || from },
      subject: 'Test SendGrid Web API - Fashion Marketplace',
      content: [{ type: 'text/plain', value: 'This is a test email sent via SendGrid Web API.' }]
    };

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (res.status === 202) {
      console.log('SendGrid API: accepted (202). Email queued successfully.')
      process.exit(0);
    }

    const text = await res.text();
    console.error('SendGrid API error status:', res.status);
    try {
      const json = JSON.parse(text);
      console.error('SendGrid API response:', JSON.stringify(json, null, 2));
    } catch {
      console.error('SendGrid API response text:', text);
    }
    process.exit(1);
  } catch (err) {
    console.error('Request error', err);
    process.exit(1);
  }
}

main();
