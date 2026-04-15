import fs from 'fs/promises'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

async function main() {
  const md = await fs.readFile('./loan-proposal.md', 'utf8')
  const lines = md.split(/\r?\n/)

  const children = []
  const doc = new Document({ sections: [{ children }] })

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) {
      children.push(new Paragraph({}))
      continue
    }

    if (line.startsWith('#')) {
      const text = line.replace(/^#+\s*/, '')
      children.push(new Paragraph({ text, heading: HeadingLevel.HEADING_1 }))
      continue
    }

    if (line.startsWith('---')) {
      children.push(new Paragraph({}))
      continue
    }

    // Bullet list
    if (/^[-*]\s+/.test(line)) {
      const text = line.replace(/^[-*]\s+/, '')
      children.push(new Paragraph({ text, bullet: { level: 0 } }))
      continue
    }

    // Key: value lines
    const kv = line.match(/^([^:]+):\s*(.+)$/)
    if (kv) {
      const key = kv[1].trim()
      const value = kv[2].trim()
      children.push(new Paragraph({ children: [new TextRun({ text: key + ': ', bold: true }), new TextRun({ text: value })] }))
      continue
    }

    // Default paragraph
    children.push(new Paragraph({ text: line }))
  }

  // Add signature lines
  children.push(new Paragraph({}))
  children.push(new Paragraph({ children: [new TextRun({ text: 'Borrower signature: ', bold: true }), new TextRun('______________________    Date: __________')]}))
  children.push(new Paragraph({ children: [new TextRun({ text: 'Lender signature:   ', bold: true }), new TextRun('______________________    Date: __________')]}))

  // Document was created with sections containing `children` already.

  const buffer = await Packer.toBuffer(doc)
  await fs.mkdir('./public/documents', { recursive: true })
  await fs.writeFile('./public/documents/loan-proposal-rich.docx', buffer)
  console.log('Wrote public/documents/loan-proposal-rich.docx')
}

main().catch(err => { console.error(err); process.exit(1) })
