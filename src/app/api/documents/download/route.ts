import { NextRequest, NextResponse } from 'next/server'
import { MOA_TEMPLATE } from '@/lib/documents/moa-template'
import { AOA_TEMPLATE } from '@/lib/documents/aoa-template'
import {
  DESIGNER_OWNERSHIP_PURCHASE_TEMPLATE,
  DESIGNER_PREMIUM_PARTNERSHIP_TEMPLATE,
  DESIGNER_WORKFORHIRE_COMMISSION_TEMPLATE,
} from '@/lib/documents/designer-contract-templates'

/**
 * API Route to generate and download MOA/AOA/Designer Contracts as text or formatted document
 * GET /api/documents/download?type=moa|aoa|designer_ownership|designer_premium|designer_workforhire
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')?.toLowerCase()
    const format = searchParams.get('format') || 'txt' // txt, json, or html

    const validTypes = [
      'moa',
      'aoa',
      'designer_ownership',
      'designer_premium',
      'designer_workforhire',
    ]

    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        {
          error: 'Invalid document type. Use "moa", "aoa", "designer_ownership", "designer_premium", or "designer_workforhire"',
        },
        { status: 400 }
      )
    }

    const template =
      type === 'moa'
        ? MOA_TEMPLATE
        : type === 'aoa'
          ? AOA_TEMPLATE
          : type === 'designer_ownership'
            ? DESIGNER_OWNERSHIP_PURCHASE_TEMPLATE
            : type === 'designer_premium'
              ? DESIGNER_PREMIUM_PARTNERSHIP_TEMPLATE
              : DESIGNER_WORKFORHIRE_COMMISSION_TEMPLATE

    const documentNames: { [key: string]: string } = {
      moa: 'Memorandum_of_Association',
      aoa: 'Articles_of_Association',
      designer_ownership: 'Design_Ownership_Purchase_Agreement',
      designer_premium: 'Premium_Creator_Partnership_Agreement',
      designer_workforhire: 'Work_For_Hire_Commission_Agreement',
    }

    const documentName = documentNames[type]

    // Return as plain text file
    if (format === 'txt') {
      return new NextResponse(template, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${documentName}.txt"`,
        },
      })
    }

    // Return as JSON
    if (format === 'json') {
      const documentTypeLabels: { [key: string]: string } = {
        moa: 'Memorandum of Association',
        aoa: 'Articles of Association',
        designer_ownership: 'Design Ownership Purchase Agreement',
        designer_premium: 'Premium Creator Partnership Agreement',
        designer_workforhire: 'Work-For-Hire Commission Agreement',
      }

      return NextResponse.json({
        documentType: type.toUpperCase(),
        documentName,
        documentLabel: documentTypeLabels[type],
        content: template,
        generatedAt: new Date().toISOString(),
        instructions: [
          `This is a ${documentTypeLabels[type]}.`,
          'Please customize all bracketed sections [INSERT ...] with your actual information.',
          'Have this document reviewed by a legal professional in your jurisdiction.',
          'Once approved and finalized, execute with both parties.',
        ],
      })
    }

    // Return as HTML (styled for viewing/printing)
    if (format === 'html') {
      const htmlContent = formatAsHTML(template, documentName)
      return new NextResponse(htmlContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="${documentName}.html"`,
        },
      })
    }

    return NextResponse.json(
      { error: 'Invalid format. Use "txt", "json", or "html"' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Document generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate document' },
      { status: 500 }
    )
  }
}

/**
 * Format template as styled HTML for printing/viewing
 */
function formatAsHTML(content: string, title: string): string {
  // Parse content into structured sections for better styling
  const lines = content.split('\n')
  let htmlContent = ''
  let inSection = false
  const sectionNumber = 0

  for (const line of lines) {
    const trimmed = line.trim()

    // Section headers (e.g., "1. OWNERSHIP TRANSFER")
    if (/^\d+\./.test(trimmed)) {
      htmlContent += `<h3 class="section-heading">${escapeHtml(trimmed)}</h3>\n<div class="section-content">\n`
      inSection = true
    }
    // Bold subsection headers
    else if (/^[A-Z][A-Z\s]+:$/.test(trimmed) && trimmed.length < 80) {
      if (inSection) htmlContent += '</div>\n'
      htmlContent += `<h4 class="subsection-heading">${escapeHtml(trimmed)}</h4>\n`
      inSection = true
    }
    // Checkmarks and X marks with styling
    else if (trimmed.startsWith('✅') || trimmed.startsWith('✓')) {
      htmlContent += `<div class="item-approved">${escapeHtml(trimmed)}</div>\n`
    } else if (trimmed.startsWith('❌') || trimmed.startsWith('✗')) {
      htmlContent += `<div class="item-denied">${escapeHtml(trimmed)}</div>\n`
    }
    // Bullet points
    else if (trimmed.startsWith('-') && trimmed.length > 1) {
      htmlContent += `<div class="bullet-point">${escapeHtml(trimmed.substring(1).trim())}</div>\n`
    }
    // Numbered items
    else if (/^\d+\./.test(trimmed) && trimmed.length < 150) {
      htmlContent += `<div class="numbered-item">${escapeHtml(trimmed)}</div>\n`
    }
    // Horizontal dividers
    else if (trimmed === '---' || trimmed === '----') {
      if (inSection) htmlContent += '</div>\n'
      htmlContent += `<div class="divider"></div>\n`
      inSection = false
    }
    // Regular paragraph
    else if (trimmed.length > 0) {
      htmlContent += `<p class="paragraph">${escapeHtml(trimmed)}</p>\n`
    }
  }

  if (inSection) htmlContent += '</div>\n'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html {
      scroll-behavior: smooth;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      line-height: 1.8;
      color: #2c3e50;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      padding: 30px 20px;
      min-height: 100vh;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 60px 50px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      position: relative;
    }
    
    .container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      border-radius: 8px 8px 0 0;
    }
    
    .header {
      text-align: center;
      margin-bottom: 50px;
      padding-bottom: 30px;
      border-bottom: 2px solid #e8ebf0;
    }
    
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      color: #1a202c;
      margin-bottom: 12px;
      letter-spacing: -0.5px;
    }
    
    .header .company {
      font-size: 14px;
      color: #667eea;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    
    .header .date {
      font-size: 12px;
      color: #718096;
      font-style: italic;
    }
    
    .divider {
      height: 2px;
      background: linear-gradient(90deg, transparent, #e8ebf0, transparent);
      margin: 35px 0;
    }
    
    .section-heading {
      font-size: 18px;
      font-weight: 700;
      color: #1a202c;
      margin-top: 35px;
      margin-bottom: 18px;
      padding-bottom: 10px;
      border-bottom: 2px solid #667eea;
      display: inline-block;
    }
    
    .section-content {
      margin-left: 0;
      margin-bottom: 25px;
    }
    
    .subsection-heading {
      font-size: 14px;
      font-weight: 700;
      color: #2d3748;
      margin-top: 20px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #667eea;
    }
    
    .paragraph {
      margin-bottom: 14px;
      line-height: 1.8;
      text-align: justify;
    }
    
    .bullet-point {
      margin-left: 30px;
      margin-bottom: 10px;
      line-height: 1.7;
      border-left: 3px solid #e8ebf0;
      padding-left: 15px;
    }
    
    .numbered-item {
      margin-left: 30px;
      margin-bottom: 10px;
      line-height: 1.7;
      color: #2d3748;
    }
    
    .item-approved {
      margin-left: 30px;
      margin-bottom: 10px;
      color: #22863a;
      font-weight: 500;
      padding: 8px 12px;
      background-color: #f0f8f4;
      border-left: 3px solid #28a745;
      border-radius: 3px;
    }
    
    .item-denied {
      margin-left: 30px;
      margin-bottom: 10px;
      color: #cb2431;
      font-weight: 500;
      padding: 8px 12px;
      background-color: #ffeef0;
      border-left: 3px solid #cb2431;
      border-radius: 3px;
    }
    
    .disclaimer {
      margin-top: 40px;
      padding: 20px;
      background-color: #fef8e7;
      border-left: 4px solid #f39c12;
      border-radius: 4px;
      font-size: 12px;
      line-height: 1.7;
      color: #7d6608;
    }
    
    .disclaimer strong {
      color: #a97e04;
      display: block;
      margin-bottom: 8px;
      font-size: 13px;
    }
    
    .signatures {
      margin-top: 60px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
    }
    
    .signature-block {
      border-top: 1px solid #2c3e50;
      padding-top: 10px;
      text-align: left;
      font-size: 12px;
    }
    
    .signature-block strong {
      display: block;
      margin-bottom: 20px;
      font-size: 13px;
    }
    
    .signature-label {
      font-size: 11px;
      color: #718096;
      margin-bottom: 3px;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 25px;
      border-top: 2px solid #e8ebf0;
      text-align: center;
      font-size: 11px;
      color: #718096;
      line-height: 1.8;
    }
    
    .footer p {
      margin-bottom: 6px;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .container {
        box-shadow: none;
        border-radius: 0;
        max-width: 100%;
        padding: 50px 40px;
      }
      
      .container::before {
        background: #667eea;
      }
      
      @page {
        margin: 1in;
      }
      
      .divider {
        background: #e8ebf0;
      }
    }
    
    @media screen and (max-width: 600px) {
      .container {
        padding: 30px 20px;
      }
      
      .header h1 {
        font-size: 22px;
      }
      
      .section-heading {
        font-size: 16px;
      }
      
      .signatures {
        grid-template-columns: 1fr;
        gap: 30px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="company">Fashion Marketplace</div>
      <h1>${title}</h1>
      <div class="date">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>
    
    <div class="content">
${htmlContent}
    </div>
    
    <div class="signatures">
      <div class="signature-block">
        <strong>Designer / Creator</strong>
        <div class="signature-label">Signature: ________________________</div>
        <div class="signature-label">Name: ________________________</div>
        <div class="signature-label">Date: ________________________</div>
      </div>
      <div class="signature-block">
        <strong>Fashion Marketplace Platform</strong>
        <div class="signature-label">Signature: ________________________</div>
        <div class="signature-label">Name: ________________________</div>
        <div class="signature-label">Date: ________________________</div>
      </div>
    </div>
    
    <div class="disclaimer">
      <strong>⚠️ IMPORTANT DISCLAIMER</strong>
      This is a template document. Before execution, you MUST:
      <br>• Customize all [INSERT ...] sections with your actual information
      <br>• Have this reviewed by a legal professional in your jurisdiction
      <br>• Ensure compliance with local laws and regulations
      <br>• Both parties must sign and retain copies for their records
    </div>
    
    <div class="footer">
      <p><strong>Fashion Marketplace Platform Legal Document Management System</strong></p>
      <p>This document was generated from the Fashion Marketplace Platform. For legal advice, consult a qualified attorney.</p>
      <p style="margin-top: 15px; color: #cbd5e0;">© 2026 Fashion Marketplace. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}
