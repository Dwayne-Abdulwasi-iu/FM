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
  const escapedContent = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')

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
    
    body {
      font-family: 'Times New Roman', Times, serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      padding: 20px;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      background-color: white;
      padding: 40px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px double #000;
      padding-bottom: 15px;
    }
    
    .header h1 {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    
    .header p {
      font-size: 12px;
      color: #666;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ccc;
      font-size: 10px;
      color: #999;
    }
    
    .content {
      white-space: pre-wrap;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      line-height: 1.5;
    }
    
    .disclaimer {
      margin-top: 20px;
      padding: 15px;
      background-color: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 4px;
      font-size: 10px;
    }
    
    @media print {
      body {
        background-color: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
      <p>Fashion Marketplace Platform</p>
      <p>Generated on ${new Date().toLocaleDateString()}</p>
    </div>
    
    <div class="content">
${escapedContent}
    </div>
    
    <div class="disclaimer">
      <strong>IMPORTANT DISCLAIMER:</strong><br>
      This is a template document. You MUST:
      <br>1. Customize all [INSERT ...] sections with your actual information
      <br>2. Have this reviewed by a legal professional in your jurisdiction
      <br>3. Comply with local company registration requirements
      <br>4. Register with the appropriate corporate authority
    </div>
    
    <div class="footer">
      <p>This document was generated by Fashion Marketplace Platform Management System</p>
      <p>For legal advice, please consult a qualified attorney.</p>
    </div>
  </div>
</body>
</html>
  `
}
