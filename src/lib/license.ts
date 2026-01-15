import { randomBytes } from 'crypto';
import prisma from './prisma';

/**
 * License Service
 * Handles license generation, verification, and certificate creation
 */

interface LicenseCreateInput {
  userId: string;
  designId: string;
  orderId: string;
  type: 'STANDARD' | 'EXTENDED' | 'EXCLUSIVE';
  purchaseType: 'REGULAR' | 'OWNERSHIP';
}

interface LicenseRights {
  printRights: boolean;
  digitalRights: boolean;
  commercialUse: boolean;
  exclusiveUse: boolean;
  modifications: boolean;
  maxDownloads: number;
}

/**
 * Get license rights based on license type
 */
function getLicenseRights(type: string, purchaseType: string): LicenseRights {
  const baseRights: LicenseRights = {
    printRights: false,
    digitalRights: true,
    commercialUse: false,
    exclusiveUse: false,
    modifications: false,
    maxDownloads: 3,
  };

  switch (type) {
    case 'STANDARD':
      return {
        ...baseRights,
        printRights: true,
        maxDownloads: 5,
      };
    case 'EXTENDED':
      return {
        ...baseRights,
        printRights: true,
        digitalRights: true,
        commercialUse: true,
        modifications: true,
        maxDownloads: 10,
      };
    case 'EXCLUSIVE':
      return {
        ...baseRights,
        printRights: true,
        digitalRights: true,
        commercialUse: true,
        exclusiveUse: true,
        modifications: true,
        maxDownloads: -1, // Unlimited
      };
    default:
      return baseRights;
  }
}

/**
 * Generate a unique license number
 */
function generateLicenseNumber(): string {
  const prefix = 'FM';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate a verification code
 */
function generateVerificationCode(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Create a new license for a purchase
 */
export async function createLicense(input: LicenseCreateInput) {
  const { userId, designId, orderId, type, purchaseType } = input;
  const rights = getLicenseRights(type, purchaseType);

  // Calculate expiry for non-exclusive licenses (1 year)
  const expiryDate = type !== 'EXCLUSIVE' 
    ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    : null;

  const license = await prisma.license.create({
    data: {
      licenseNumber: generateLicenseNumber(),
      verificationCode: generateVerificationCode(),
      type,
      userId,
      designId,
      orderId,
      expiryDate,
      ...rights,
    },
    include: {
      design: {
        select: {
          title: true,
          designer: { select: { name: true } },
        },
      },
    },
  });

  return license;
}

/**
 * Verify a license by verification code
 */
export async function verifyLicense(verificationCode: string) {
  const license = await prisma.license.findUnique({
    where: { verificationCode },
    include: {
      design: {
        select: {
          id: true,
          title: true,
          imageUrl: true,
          designer: { select: { name: true } },
        },
      },
    },
  });

  if (!license) {
    return { valid: false, error: 'License not found' };
  }

  // Check expiry
  if (license.expiryDate && new Date() > license.expiryDate) {
    return { valid: false, error: 'License has expired', license };
  }

  return { valid: true, license };
}

/**
 * Record a download and check if allowed
 */
export async function recordDownload(licenseId: string): Promise<{ allowed: boolean; remaining: number }> {
  const license = await prisma.license.findUnique({
    where: { id: licenseId },
  });

  if (!license) {
    return { allowed: false, remaining: 0 };
  }

  // Check if unlimited downloads
  if (license.maxDownloads === -1) {
    await prisma.license.update({
      where: { id: licenseId },
      data: {
        downloadCount: { increment: 1 },
        lastDownload: new Date(),
      },
    });
    return { allowed: true, remaining: -1 };
  }

  // Check download limit
  if (license.downloadCount >= license.maxDownloads) {
    return { allowed: false, remaining: 0 };
  }

  await prisma.license.update({
    where: { id: licenseId },
    data: {
      downloadCount: { increment: 1 },
      lastDownload: new Date(),
    },
  });

  return {
    allowed: true,
    remaining: license.maxDownloads - license.downloadCount - 1,
  };
}

/**
 * Generate license certificate data
 */
export function generateCertificateData(license: {
  licenseNumber: string;
  type: string;
  purchaseDate: Date;
  expiryDate: Date | null;
  printRights: boolean;
  digitalRights: boolean;
  commercialUse: boolean;
  exclusiveUse: boolean;
  modifications: boolean;
  design: { title: string; designer: { name: string | null } };
}) {
  return {
    certificateNumber: license.licenseNumber,
    issueDate: license.purchaseDate.toISOString(),
    expiryDate: license.expiryDate?.toISOString() || 'Never',
    licenseType: license.type,
    designTitle: license.design.title,
    designerName: license.design.designer.name || 'Unknown',
    rights: {
      'Print Rights': license.printRights ? 'Granted' : 'Not Included',
      'Digital Rights': license.digitalRights ? 'Granted' : 'Not Included',
      'Commercial Use': license.commercialUse ? 'Granted' : 'Not Included',
      'Exclusive Use': license.exclusiveUse ? 'Granted' : 'Not Included',
      'Modifications': license.modifications ? 'Allowed' : 'Not Allowed',
    },
    verificationUrl: `https://fashionmarketplace.com/verify/${license.licenseNumber}`,
  };
}

/**
 * Get user's licenses
 */
export async function getUserLicenses(userId: string) {
  return prisma.license.findMany({
    where: { userId },
    include: {
      design: {
        select: {
          id: true,
          title: true,
          thumbnailUrl: true,
          imageUrl: true,
          designer: { select: { name: true } },
        },
      },
    },
    orderBy: { purchaseDate: 'desc' },
  });
}
