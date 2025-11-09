#!/usr/bin/env node
// Simple test harness that POSTs a minimal upload payload to the upload endpoint.
// Requirements: Next dev server running at http://localhost:3000
// Node 18+ (global fetch & FormData)

const endpoint = process.env.UPLOAD_ENDPOINT || 'http://localhost:3000/api/designs/upload-multi'

async function main() {
  console.log('Posting test upload to', endpoint)

  const formData = new FormData()
  // Minimal fields — adapt to your upload handler expectations
  formData.append('title', 'Test design from script')
  formData.append('description', 'Roundtrip currency test')
  formData.append('price', '9.99')
  formData.append('ownershipPrice', '')
  formData.append('currency', 'USD')
  formData.append('tags', JSON.stringify(['test', 'script']))

  const res = await fetch(endpoint, { method: 'POST', body: formData })
  const text = await res.text()
  console.log('Status:', res.status)
  console.log('Response:', text)
}

main().catch((err) => { console.error(err); process.exit(1) })
