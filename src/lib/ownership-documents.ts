import prisma from './prisma'
import { sendEmail } from './email'
import { deleteFromCloudinary } from './cloudinary'
import { deleteFromCloudinaryWithRetry, logCloudinaryDeleteFailure } from './cloudinary-cleanup'

/**
 * Generate a unique contract number for ownership transfers
 * Format: OC-YYYY-MM-XXXXX (e.g., OC-2026-01-12345)
 */
export function generateContractNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const random = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, '0')
  return `OC-${year}-${month}-${random}`
}

/**
 * Generate HTML content for legal ownership transfer contract
 */
export function generateLegalContractHTML(designTitle: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
          background: #f5f5f5;
        }
        .contract {
          background: white;
          padding: 40px;
          border: 2px solid #333;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          text-transform: uppercase;
        }
        .header p {
          margin: 5px 0;
          color: #666;
        }
        .content {
          margin: 30px 0;
        }
        .clause {
          margin: 20px 0;
          padding: 15px;
          background: #f9f9f9;
          border-left: 4px solid #4f46e5;
        }
        .clause-title {
          font-weight: bold;
          color: #4f46e5;
          margin-bottom: 8px;
        }
        .clause-text {
          font-size: 14px;
          line-height: 1.6;
        }
        .signature-section {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #333;
        }
        .signature-block {
          margin-top: 30px;
          page-break-inside: avoid;
        }
        .signature-block h3 {
          margin: 0 0 10px 0;
          font-size: 14px;
        }
        .signature-line {
          margin: 30px 0 5px 0;
          border-bottom: 1px solid #333;
          width: 250px;
          min-height: 40px;
        }
        .signature-label {
          font-size: 12px;
          color: #666;
        }
        .placeholder {
          color: #999;
          font-style: italic;
        }
        .design-info {
          background: #e3f2fd;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .design-info strong {
          color: #1976d2;
        }
        @media print {
          body {
            background: white;
            padding: 0;
          }
          .contract {
            border: none;
            box-shadow: none;
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="contract">
        <div class="header">
          <h1>Exclusive Design Ownership Transfer Agreement</h1>
          <p>Design Intellectual Property Transfer & Rights Assignment</p>
          <p style="color: #999; font-size: 12px;">Date: <span id="contract-date"></span></p>
        </div>

        <div class="content">
          <div class="clause">
            <div class="clause-title">1. PARTIES TO THE AGREEMENT</div>
            <div class="clause-text">
              <p>This agreement is entered into between:</p>
              <p><strong>ORIGINAL DESIGNER (SELLER):</strong></p>
              <p>Full Name: <span class="placeholder" id="seller-name-display">[Seller Full Name]</span></p>
              <p>Username: <span class="placeholder" id="seller-username-display">[Username]</span></p>
              <p>Platform: Fashion Marketplace</p>
              <p style="margin-top: 15px;"><strong>BUYER (NEW OWNER):</strong></p>
              <p>Full Name: <span class="placeholder" id="buyer-name-display">[Buyer Full Name]</span></p>
              <p>Username: <span class="placeholder" id="buyer-username-display">[Username]</span></p>
              <p>Platform: Fashion Marketplace</p>
            </div>
          </div>

          <div class="clause">
            <div class="clause-title">2. DESIGN SUBJECT MATTER</div>
            <div class="clause-text">
              <div class="design-info">
                <strong>Design Title:</strong> ${designTitle}<br>
                <strong>Transfer Type:</strong> Exclusive Ownership - Full Rights Assignment<br>
                <strong>Transfer Date:</strong> <span id="contract-date-2"></span>
              </div>
            </div>
          </div>

          <div class="clause">
            <div class="clause-title">3. EXCLUSIVE OWNERSHIP TRANSFER</div>
            <div class="clause-text">
              <p>The Original Designer hereby irrevocably transfers <strong>100% exclusive ownership</strong> of the Design, including all associated intellectual property rights, to the Buyer. This transfer includes:</p>
              <ul>
                <li><strong>Exclusive Use Rights:</strong> The Buyer shall have the sole and exclusive right to use the Design for any purpose, including commercial, personal, and licensing purposes.</li>
                <li><strong>Reproduction Rights:</strong> The Buyer may reproduce the Design in any format, quantity, and manner without limitation.</li>
                <li><strong>Modification Rights:</strong> The Buyer may modify, adapt, or alter the Design as desired.</li>
                <li><strong>Distribution Rights:</strong> The Buyer may distribute, sell, license, or sublicense the Design to third parties.</li>
                <li><strong>Branding Rights:</strong> The Buyer may use the Design as a trademark, brand mark, or company signature.</li>
              </ul>
            </div>
          </div>

          <div class="clause">
            <div class="clause-title">4. DESIGNER ACKNOWLEDGMENT & WAIVER</div>
            <div class="clause-text">
              <p>The Original Designer acknowledges and agrees that:</p>
              <ul>
                <li>They have the full right and authority to transfer ownership of this Design.</li>
                <li>The Design is original work or they hold all necessary rights to transfer it.</li>
                <li>Upon completion of payment, they waive all future claims to the Design.</li>
                <li>They will not reproduce, use, or license this Design to any other party.</li>
                <li>The Design shall be immediately and permanently delisted from the Fashion Marketplace.</li>
                <li>They retain no rights to the Design after this transfer is executed.</li>
              </ul>
            </div>
          </div>

          <div class="clause">
            <div class="clause-title">5. BUYER ACKNOWLEDGMENT & ACCEPTANCE</div>
            <div class="clause-text">
              <p>The Buyer acknowledges and accepts that:</p>
              <ul>
                <li>They are acquiring exclusive, perpetual ownership of the Design.</li>
                <li>They have inspected the Design and accept it in its current form.</li>
                <li>Upon execution of this agreement and payment, they own all rights to the Design.</li>
                <li>The Design will be immediately removed from the Fashion Marketplace's public listings.</li>
                <li>They may use the Design for any lawful purpose without restrictions or limitations.</li>
              </ul>
            </div>
          </div>

          <div class="clause">
            <div class="clause-title">6. CONSIDERATION (PAYMENT)</div>
            <div class="clause-text">
              <p>The Buyer agrees to pay the agreed-upon ownership price through the Fashion Marketplace payment system. The Designer agrees to transfer exclusive ownership upon confirmation of full payment.</p>
            </div>
          </div>

          <div class="clause">
            <div class="clause-title">7. EFFECTIVE DATE & BINDING EFFECT</div>
            <div class="clause-text">
              <p>This agreement becomes effective and binding upon:</p>
              <ul>
                <li>Full payment of the agreed-upon ownership price by the Buyer</li>
                <li>Execution of this document by both the Designer and Buyer</li>
                <li>Verification and approval by Fashion Marketplace administrators</li>
              </ul>
              <p>From the Effective Date forward, the Buyer is the sole and exclusive owner of the Design and all associated intellectual property rights.</p>
            </div>
          </div>

          <div class="clause">
            <div class="clause-title">8. DISPUTE RESOLUTION</div>
            <div class="clause-text">
              <p>Both parties agree that the Fashion Marketplace and its administrators serve as the mediator for any disputes arising from this agreement. Both parties agree to abide by the Fashion Marketplace's dispute resolution policies and decisions.</p>
            </div>
          </div>

          <div class="clause">
            <div class="clause-title">9. LEGAL ACKNOWLEDGMENT</div>
            <div class="clause-text">
              <p>Both parties confirm that:</p>
              <ul>
                <li>They have read and understood all terms of this agreement.</li>
                <li>They are of legal age and have the authority to enter this agreement.</li>
                <li>They understand the permanent and irrevocable nature of this transfer.</li>
                <li>They agree to be legally bound by these terms.</li>
              </ul>
            </div>
          </div>

          <div class="signature-section">
            <h2 style="text-align: center; margin-bottom: 30px;">SIGNATURES & EXECUTION</h2>

            <div class="signature-block">
              <h3>ORIGINAL DESIGNER (SELLER)</h3>
              <p><strong>By signing below, the Designer confirms the transfer of exclusive ownership of the Design.</strong></p>
              <div class="signature-line" id="designer-signature-line"></div>
              <div class="signature-label">Designer/Seller Signature Name</div>
              <p style="margin-top: 10px; font-size: 12px;">Printed: <span id="designer-name-print" class="placeholder">[Designer Full Name]</span></p>
              <p style="font-size: 12px;">Date: <span id="designer-date"></span></p>
            </div>

            <div class="signature-block">
              <h3>BUYER (NEW OWNER)</h3>
              <p><strong>By signing below, the Buyer confirms acceptance of exclusive ownership of the Design.</strong></p>
              <div class="signature-line" id="buyer-signature-line"></div>
              <div class="signature-label">Buyer/New Owner Signature Name</div>
              <p style="margin-top: 10px; font-size: 12px;">Printed: <span id="buyer-name-print" class="placeholder">[Buyer Full Name]</span></p>
              <p style="font-size: 12px;">Date: <span id="buyer-date"></span></p>
            </div>

            <div class="signature-block">
              <h3>FASHION MARKETPLACE VERIFICATION</h3>
              <p><strong>Verified and approved by Fashion Marketplace administrators.</strong></p>
              <p>Contract Number: <span id="contract-number-display" class="placeholder">[Contract #]</span></p>
              <p>Admin Verification Date: <span id="admin-date"></span></p>
            </div>
          </div>

          <div class="clause" style="margin-top: 30px;">
            <div class="clause-title">TERMS & CONDITIONS NOTICE</div>
            <div class="clause-text">
              <p style="font-size: 12px;">This agreement incorporates the Fashion Marketplace Terms of Service and Privacy Policy. Both parties agree to all applicable platform policies regarding intellectual property, payment, and dispute resolution. This document serves as a legally binding contract between the parties and the Fashion Marketplace platform for the exclusive transfer of design ownership.</p>
            </div>
          </div>
        </div>
      </div>

      <script>
        // Auto-populate dates
        const today = new Date();
        const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        document.querySelectorAll('#contract-date, #contract-date-2, #designer-date, #buyer-date, #admin-date').forEach(el => {
          el.textContent = dateStr;
        });
      </script>
    </body>
    </html>
  `
}

/**
 * Create an ownership document when seller chooses to upload ownership design
 */
export async function createOwnershipDocument(
  designId: string,
  sellerId: string,
  sellerFullName: string,
  sellerUsername: string | undefined,
  sellerSignature: string,
  designTitle: string
) {
  const documentContent = generateLegalContractHTML(designTitle)

  return await prisma.ownershipDocument.create({
    data: {
      designId,
      sellerId,
      sellerFullName,
      sellerUsername: sellerUsername || null,
      sellerSignature,
      documentContent,
      documentVersion: 1,
      status: 'PENDING'
    },
    include: {
      design: {
        select: { id: true, title: true }
      },
      seller: {
        select: { id: true, name: true, email: true }
      }
    }
  })
}

/**
 * Approve ownership document (admin only)
 * FLAW FIX #17: Validate preview exists before approval
 */
export async function approveOwnershipDocument(
  documentId: string,
  adminId: string
) {
  // FLAW FIX #17: Ensure preview file exists before approval
  const documentCheck = await prisma.ownershipDocument.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      status: true,
      previewFileUrl: true,
      previewFileType: true,
      sellerFullName: true
    }
  })

  if (!documentCheck) {
    throw new Error('Document not found')
  }

  if (documentCheck.status !== 'PENDING') {
    throw new Error('Only pending documents can be approved')
  }

  // FLAW FIX #17: Reject approval if no preview uploaded
  if (!documentCheck.previewFileUrl || !documentCheck.previewFileType) {
    throw new Error(
      `Cannot approve document without preview file. ${documentCheck.sellerFullName || 'Seller'} must upload a preview (image or video) before this document can be approved.`
    )
  }

  const document = await prisma.ownershipDocument.update({
    where: { id: documentId },
    data: {
      status: 'APPROVED',
      legallyBinding: true,
      verifiedBy: adminId,
      verifiedAt: new Date()
    },
    include: {
      seller: {
        select: { email: true, name: true }
      },
      design: {
        select: { title: true }
      }
    }
  })

  // Send approval email to seller
  try {
    await sendEmail({
      to: document.seller.email,
      subject: 'Design Ownership Document Approved',
      html: `
        <h2>Document Approved ✓</h2>
        <p>Hi ${document.seller.name || 'Designer'},</p>
        <p>Your ownership document for <strong>"${document.design.title}"</strong> has been approved by our team.</p>
        <p>Your design is now legally protected and available for exclusive ownership purchase. Buyers can now purchase the exclusive rights to your design.</p>
        <p><strong>Next Steps:</strong></p>
        <ul>
          <li>Your design is now listed as available for OWNERSHIP purchase</li>
          <li>Buyers will see your verified ownership agreement</li>
          <li>When a buyer purchases, you'll receive payment and a signed contract</li>
        </ul>
        <hr />
        <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply to this email.</p>
      `
    })
  } catch (error) {
    console.error(`Failed to send approval email to ${document.seller.email}:`, error)
  }

  return document
}

/**
 * FLAW FIX #5 & #8: Clean up preview files when document is rejected
 * Prevents orphaned Cloudinary files and ensures cleanup
 */
async function cleanupPreviewFiles(document: any) {
  if (!document.previewFileUrl) return

  try {
    // FLAW FIX #16: Use retry logic with exponential backoff
    const result = await deleteFromCloudinaryWithRetry(document.previewFileUrl, 3)
    
    if (result.success) {
      console.log(`Cleaned up preview file for document ${document.id}`)
    } else {
      // Log failed deletion for manual retry
      await logCloudinaryDeleteFailure(
        prisma,
        document.id,
        document.previewFileUrl,
        result.error || 'Unknown error'
      )
      console.error(`Failed to cleanup preview for document ${document.id} after retries:`, result.error)
    }
  } catch (error) {
    // Log the error but don't throw - cleanup failure shouldn't block rejection
    console.error(`Failed to cleanup preview for document ${document.id}:`, error)
    await logCloudinaryDeleteFailure(
      prisma,
      document.id,
      document.previewFileUrl,
      String(error)
    )
  }
}

/**
 * Reject ownership document (admin only)
 */
export async function rejectOwnershipDocument(
  documentId: string,
  adminId: string,
  rejectionReason: string
) {
  const document = await prisma.ownershipDocument.update({
    where: { id: documentId },
    data: {
      status: 'REJECTED',
      rejectionReason,
      verifiedBy: adminId,
      verifiedAt: new Date()
    },
    include: {
      seller: {
        select: { email: true, name: true }
      },
      design: {
        select: { title: true, id: true }
      }
    }
  })

  // FLAW FIX #8: Clean up preview files when rejected
  await cleanupPreviewFiles(document)

  // Send rejection email to seller
  try {
    await sendEmail({
      to: document.seller.email,
      subject: 'Design Ownership Document Rejected',
      html: `
        <h2>Document Requires Revision</h2>
        <p>Hi ${document.seller.name || 'Designer'},</p>
        <p>Your ownership document for <strong>"${document.design.title}"</strong> requires revision before it can be approved.</p>
        <p><strong>Reason:</strong></p>
        <p>${rejectionReason}</p>
        <p>Please review the feedback and resubmit your ownership document. If you have questions, please contact our support team.</p>
        <hr />
        <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply to this email.</p>
      `
    })
  } catch (error) {
    console.error(`Failed to send rejection email to ${document.seller.email}:`, error)
  }

  return document
}

/**
 * @deprecated Use the new signature above with rejectionReason parameter
 */
export async function rejectOwnershipDocumentLegacy(
  documentId: string,
  adminId: string,
  rejectionReason: string
) {
  return await prisma.ownershipDocument.update({
    where: { id: documentId },
    data: {
      status: 'REJECTED',
      rejectionReason,
      verifiedBy: adminId,
      verifiedAt: new Date()
    }
  })
}

/**
 * Get ownership document for a design
 */
export async function getOwnershipDocumentForDesign(designId: string) {
  return await prisma.ownershipDocument.findFirst({
    where: { designId, status: 'APPROVED' },
    include: {
      seller: {
        select: { id: true, name: true, displayName: true, email: true }
      }
    }
  })
}

/**
 * Create ownership contract when buyer purchases ownership
 */
export async function createOwnershipContract(
  purchaseId: string,
  buyerId: string,
  sellerId: string,
  buyerFullName: string,
  buyerUsername: string | undefined,
  buyerSignature: string,
  designId: string,
  designTitle: string,
  ownershipDocumentId: string,
  sellerFullName: string,
  sellerSignature: string
) {
  const contractNumber = generateContractNumber()
  const contractContent = generateOwnershipContractHTML(
    designTitle,
    sellerFullName,
    sellerSignature,
    buyerFullName,
    buyerSignature,
    contractNumber
  )

  const contract = await prisma.ownershipContract.create({
    data: {
      purchaseId,
      buyerId,
      sellerId,
      buyerFullName,
      buyerUsername: buyerUsername || null,
      buyerSignature,
      sellerFullName,
      sellerSignature,
      designId,
      designTitle,
      ownershipDocumentId,
      contractNumber,
      contractContent,
      status: 'SIGNED',
      executedAt: new Date()
    },
    include: {
      buyer: {
        select: { id: true, name: true, email: true }
      },
      seller: {
        select: { id: true, name: true, email: true }
      },
      purchase: true
    }
  })

  // Send contract emails to both parties
  try {
    await sendEmail({
      to: contract.buyer.email,
      subject: `Design Ownership Agreement: ${designTitle}`,
      html: `
        <h2>Your Ownership Contract is Ready</h2>
        <p>Hi ${contract.buyer.name || 'Buyer'},</p>
        <p>Congratulations! Your exclusive ownership transfer for <strong>"${designTitle}"</strong> is complete.</p>
        <p><strong>Contract Number:</strong> ${contractNumber}</p>
        <p>You now have <strong>100% exclusive ownership</strong> of this design with all associated intellectual property rights.</p>
        <p><strong>What You Can Do:</strong></p>
        <ul>
          <li>Use the design for any purpose (commercial, personal, licensing)</li>
          <li>Modify or alter the design as desired</li>
          <li>Distribute, sell, or license the design to others</li>
          <li>Use it as a trademark or brand mark</li>
          <li>Download and print your ownership certificate</li>
        </ul>
        <p>Visit your dashboard to download and print your signed ownership certificate.</p>
        <hr />
        <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply to this email.</p>
      `
    })
  } catch (error) {
    console.error(`Failed to send contract email to buyer ${contract.buyer.email}:`, error)
  }

  try {
    await sendEmail({
      to: contract.seller.email,
      subject: `Design Ownership Transfer Complete: ${designTitle}`,
      html: `
        <h2>Ownership Transfer Complete</h2>
        <p>Hi ${contract.seller.name || 'Designer'},</p>
        <p>Your exclusive ownership transfer for <strong>"${designTitle}"</strong> has been completed successfully.</p>
        <p><strong>Contract Number:</strong> ${contractNumber}</p>
        <p>The buyer has now taken full ownership of the design. You have received payment and are no longer able to modify, use, or license this design.</p>
        <p><strong>Important:</strong> The design has been removed from the Fashion Marketplace and is no longer available for sale.</p>
        <p>Thank you for contributing your work to the platform!</p>
        <hr />
        <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply to this email.</p>
      `
    })
  } catch (error) {
    console.error(`Failed to send contract email to seller ${contract.seller.email}:`, error)
  }

  return contract
}

/**
 * Get ownership contract for a purchase
 */
export async function getOwnershipContractForPurchase(purchaseId: string) {
  return await prisma.ownershipContract.findUnique({
    where: { purchaseId },
    include: {
      buyer: {
        select: { id: true, name: true, displayName: true }
      },
      seller: {
        select: { id: true, name: true, displayName: true }
      }
    }
  })
}

/**
 * Get ownership contract by contract number (for display/printing)
 */
export async function getOwnershipContractByNumber(contractNumber: string) {
  return await prisma.ownershipContract.findUnique({
    where: { contractNumber },
    include: {
      buyer: {
        select: { id: true, name: true, displayName: true, email: true }
      },
      seller: {
        select: { id: true, name: true, displayName: true, email: true }
      },
      purchase: true
    }
  })
}

/**
 * Generate the full ownership contract HTML with buyer and seller details
 */
export function generateOwnershipContractHTML(
  designTitle: string,
  sellerFullName: string,
  sellerSignature: string,
  buyerFullName: string,
  buyerSignature: string,
  contractNumber: string
): string {
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
          background: #f5f5f5;
        }
        .contract {
          background: white;
          padding: 40px;
          border: 2px solid #333;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          text-transform: uppercase;
        }
        .header p {
          margin: 5px 0;
          color: #666;
        }
        .header .contract-number {
          font-weight: bold;
          color: #4f46e5;
          font-size: 14px;
        }
        .content {
          margin: 30px 0;
        }
        .clause {
          margin: 20px 0;
          padding: 15px;
          background: #f9f9f9;
          border-left: 4px solid #4f46e5;
        }
        .clause-title {
          font-weight: bold;
          color: #4f46e5;
          margin-bottom: 8px;
        }
        .clause-text {
          font-size: 14px;
          line-height: 1.6;
        }
        .signature-section {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #333;
        }
        .signature-block {
          margin-top: 30px;
          page-break-inside: avoid;
        }
        .signature-block h3 {
          margin: 0 0 10px 0;
          font-size: 14px;
        }
        .signature-line {
          margin: 30px 0 5px 0;
          border-bottom: 1px solid #333;
          width: 250px;
          min-height: 40px;
        }
        .signature-label {
          font-size: 12px;
          color: #666;
        }
        .design-info {
          background: #e3f2fd;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .design-info strong {
          color: #1976d2;
        }
        .party-info {
          background: #f0f9ff;
          padding: 10px;
          margin: 10px 0;
          border-radius: 3px;
          border-left: 3px solid #1976d2;
        }
        .party-info strong {
          color: #1976d2;
        }
        @media print {
          body {
            background: white;
            padding: 0;
          }
          .contract {
            border: none;
            box-shadow: none;
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="contract">
        <div class="header">
          <h1>Exclusive Design Ownership Transfer Agreement</h1>
          <p>Design Intellectual Property Transfer & Rights Assignment</p>
          <p class="contract-number">Contract #: ${contractNumber}</p>
          <p style="color: #999; font-size: 12px;">Execution Date: ${today}</p>
        </div>

        <div class="content">
          <div class="clause">
            <div class="clause-title">1. PARTIES TO THE AGREEMENT</div>
            <div class="clause-text">
              <p><strong>ORIGINAL DESIGNER (SELLER):</strong></p>
              <div class="party-info">
                <strong>Full Name:</strong> ${sellerFullName}<br>
                <strong>Signature Name:</strong> ${sellerSignature}<br>
                <strong>Platform:</strong> Fashion Marketplace
              </div>
              
              <p style="margin-top: 15px;"><strong>BUYER (NEW OWNER):</strong></p>
              <div class="party-info">
                <strong>Full Name:</strong> ${buyerFullName}<br>
                <strong>Signature Name:</strong> ${buyerSignature}<br>
                <strong>Platform:</strong> Fashion Marketplace
              </div>
            </div>
          </div>

          <div class="clause">
            <div class="clause-title">2. DESIGN SUBJECT MATTER</div>
            <div class="clause-text">
              <div class="design-info">
                <strong>Design Title:</strong> ${designTitle}<br>
                <strong>Transfer Type:</strong> Exclusive Ownership - Full Rights Assignment<br>
                <strong>Effective Date:</strong> ${today}
              </div>
            </div>
          </div>

          <div class="clause">
            <div class="clause-title">3. EXCLUSIVE OWNERSHIP TRANSFER</div>
            <div class="clause-text">
              <p>The Original Designer hereby irrevocably transfers <strong>100% exclusive ownership</strong> of the Design to the Buyer. This transfer includes:</p>
              <ul>
                <li><strong>Exclusive Use Rights:</strong> The Buyer shall have the sole and exclusive right to use the Design for any purpose.</li>
                <li><strong>Reproduction Rights:</strong> The Buyer may reproduce the Design in any format without limitation.</li>
                <li><strong>Modification Rights:</strong> The Buyer may modify, adapt, or alter the Design as desired.</li>
                <li><strong>Distribution Rights:</strong> The Buyer may distribute, sell, or license the Design to third parties.</li>
                <li><strong>Branding Rights:</strong> The Buyer may use the Design as a trademark or brand mark.</li>
              </ul>
            </div>
          </div>

          <div class="clause">
            <div class="clause-title">4. DESIGNER ACKNOWLEDGMENT & WAIVER</div>
            <div class="clause-text">
              <p>The Original Designer (${sellerFullName}) acknowledges and agrees that:</p>
              <ul>
                <li>They have the full right and authority to transfer ownership of this Design.</li>
                <li>Upon payment, they waive all future claims to the Design.</li>
                <li>They will not reproduce, use, or license this Design to any other party.</li>
                <li>The Design shall be permanently delisted from the Fashion Marketplace.</li>
                <li>They retain no rights to the Design after this transfer.</li>
              </ul>
            </div>
          </div>

          <div class="clause">
            <div class="clause-title">5. BUYER ACKNOWLEDGMENT & ACCEPTANCE</div>
            <div class="clause-text">
              <p>The Buyer (${buyerFullName}) acknowledges and accepts that:</p>
              <ul>
                <li>They are acquiring exclusive, perpetual ownership of the Design.</li>
                <li>Upon payment, they own all rights to the Design.</li>
                <li>The Design will be immediately removed from Fashion Marketplace public listings.</li>
                <li>They may use the Design for any lawful purpose without restrictions.</li>
              </ul>
            </div>
          </div>

          <div class="clause">
            <div class="clause-title">6. BINDING EFFECT & LEGAL ACKNOWLEDGMENT</div>
            <div class="clause-text">
              <p>Both parties confirm that:</p>
              <ul>
                <li>They have read and understood all terms of this agreement.</li>
                <li>They are of legal age and have the authority to enter this agreement.</li>
                <li>They understand the permanent and irrevocable nature of this transfer.</li>
                <li>They agree to be legally bound by these terms.</li>
                <li>This agreement has been verified and approved by Fashion Marketplace administrators.</li>
              </ul>
            </div>
          </div>

          <div class="signature-section">
            <h2 style="text-align: center; margin-bottom: 30px;">SIGNATURES & EXECUTION</h2>

            <div class="signature-block">
              <h3>ORIGINAL DESIGNER (SELLER)</h3>
              <p><strong>By signing below, the Designer confirms the transfer of exclusive ownership.</strong></p>
              <div class="signature-line"></div>
              <div class="signature-label">Designer Signature (${sellerSignature})</div>
              <p style="margin-top: 10px; font-size: 12px;">Printed: ${sellerFullName}</p>
              <p style="font-size: 12px;">Date: ${today}</p>
            </div>

            <div class="signature-block">
              <h3>BUYER (NEW OWNER)</h3>
              <p><strong>By signing below, the Buyer confirms acceptance of exclusive ownership.</strong></p>
              <div class="signature-line"></div>
              <div class="signature-label">Buyer Signature (${buyerSignature})</div>
              <p style="margin-top: 10px; font-size: 12px;">Printed: ${buyerFullName}</p>
              <p style="font-size: 12px;">Date: ${today}</p>
            </div>

            <div class="signature-block">
              <h3>FASHION MARKETPLACE VERIFICATION</h3>
              <p><strong>Verified and approved by Fashion Marketplace administrators.</strong></p>
              <p>Contract Number: <strong>${contractNumber}</strong></p>
              <p>Admin Verification: Confirmed<br>
              Legal Status: <strong>BINDING</strong></p>
            </div>
          </div>

          <div class="clause" style="margin-top: 30px;">
            <div class="clause-title">PLATFORM ACKNOWLEDGMENT</div>
            <div class="clause-text">
              <p style="font-size: 12px;">This agreement incorporates the Fashion Marketplace Terms of Service. Both parties agree to all applicable platform policies regarding intellectual property, payment, and dispute resolution. This document serves as a legally binding contract for the exclusive transfer of design ownership.</p>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}
