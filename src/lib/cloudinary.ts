import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export async function uploadToCloudinary(
  file: Buffer,
  options: {
    folder?: string;
    transformation?: unknown;
    resource_type?: "image" | "video" | "raw" | "auto";
    public_id?: string;
  } = {}
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
    folder: options.folder || 'fashion-marketplace',
    resource_type: options.resource_type || 'auto',
    public_id: options.public_id,
    // transformation may be unknown at this boundary; cast to any for the
    // cloudinary client which accepts various shapes.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transformation: options.transformation as any,
      },
      (error: unknown, result: unknown) => {
        if (error) {
          reject(error)
          return
        }

        // Coerce the result to the expected shape when available.
        if (result && typeof result === 'object') {
          resolve(result as UploadResult)
        } else {
          // Fail safe: resolve with a minimal empty object matching UploadResult
          resolve({
            public_id: '',
            secure_url: '',
            width: 0,
            height: 0,
            format: '',
            bytes: 0,
          })
        }
      }
    ).end(file);
  });
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export function generateThumbnailUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    width: 300,
    height: 300,
    crop: 'fit',
    quality: 'auto',
    format: 'auto',
  });
}

/**
 * Generate a watermarked preview image
 * Adds diagonal "PREVIEW" text overlay to prevent unauthorized use
 */
export function generateWatermarkedUrl(publicId: string, options?: {
  width?: number;
  height?: number;
  watermarkText?: string;
  opacity?: number;
}): string {
  const {
    width = 800,
    height = 800,
    watermarkText = 'PREVIEW',
    opacity = 40
  } = options || {};

  return cloudinary.url(publicId, {
    width,
    height,
    crop: 'fit',
    quality: 'auto',
    format: 'auto',
    transformation: [
      // First, resize the image
      { width, height, crop: 'fit' },
      // Add tiled watermark overlay
      {
        overlay: {
          font_family: 'Arial',
          font_size: 60,
          font_weight: 'bold',
          text: watermarkText
        },
        opacity,
        color: '#ffffff',
        gravity: 'center',
        angle: -30
      },
      // Add second watermark for tiling effect
      {
        overlay: {
          font_family: 'Arial',
          font_size: 40,
          text: watermarkText
        },
        opacity: opacity - 10,
        color: '#000000',
        gravity: 'north_west',
        x: 50,
        y: 100,
        angle: -30
      },
      // Add third watermark
      {
        overlay: {
          font_family: 'Arial',
          font_size: 40,
          text: watermarkText
        },
        opacity: opacity - 10,
        color: '#000000',
        gravity: 'south_east',
        x: 50,
        y: 100,
        angle: -30
      }
    ]
  });
}

/**
 * Generate watermarked URL with site branding
 */
export function generateBrandedWatermarkUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    width: 1200,
    height: 1200,
    crop: 'fit',
    quality: 'auto',
    format: 'auto',
    transformation: [
      { width: 1200, height: 1200, crop: 'fit' },
      // Main diagonal watermark
      {
        overlay: {
          font_family: 'Arial',
          font_size: 70,
          font_weight: 'bold',
          text: 'FASHIONMARKET'
        },
        opacity: 25,
        color: '#ffffff',
        gravity: 'center',
        angle: -35
      },
      // Corner branding
      {
        overlay: {
          font_family: 'Arial',
          font_size: 24,
          text: 'fashionmarketplace.com'
        },
        opacity: 60,
        color: '#333333',
        gravity: 'south_east',
        x: 20,
        y: 20
      }
    ]
  });
}

/**
 * Upload image and automatically generate watermarked version
 */
export async function uploadWithWatermark(
  file: Buffer,
  options: {
    folder?: string;
    designerId?: string;
  } = {}
): Promise<{
  original: UploadResult;
  watermarkedUrl: string;
  thumbnailUrl: string;
}> {
  // Upload original (protected, full quality)
  const original = await uploadToCloudinary(file, {
    folder: options.folder || 'fashion-marketplace/designs',
  });

  // Generate watermarked preview URL
  const watermarkedUrl = generateWatermarkedUrl(original.public_id);
  
  // Generate thumbnail URL
  const thumbnailUrl = generateThumbnailUrl(original.public_id);

  return {
    original,
    watermarkedUrl,
    thumbnailUrl
  };
}

/**
 * Validate that a URL is a valid Cloudinary URL
 * Accepts URLs from res.cloudinary.com with the configured cloud name
 */
export function isValidCloudinaryUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    
    // Must be HTTPS
    if (parsed.protocol !== 'https:') {
      return false;
    }
    
    // Must be from Cloudinary's domain
    if (!parsed.hostname.endsWith('cloudinary.com')) {
      return false;
    }
    
    // Should contain our cloud name in the path
    if (cloudName && !parsed.pathname.includes(`/${cloudName}/`)) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate an array of attachment URLs
 * Returns true if all URLs are valid Cloudinary URLs or empty array
 */
export function validateAttachmentUrls(urls: unknown): { valid: boolean; error?: string } {
  if (!urls) {
    return { valid: true };
  }
  
  if (!Array.isArray(urls)) {
    return { valid: false, error: "Attachments must be an array" };
  }
  
  if (urls.length > 10) {
    return { valid: false, error: "Maximum 10 attachments allowed" };
  }
  
  for (const url of urls) {
    if (typeof url !== 'string') {
      return { valid: false, error: "All attachments must be URL strings" };
    }
    
    if (!isValidCloudinaryUrl(url)) {
      return { valid: false, error: "Invalid attachment URL. Only Cloudinary URLs are allowed." };
    }
  }
  
  return { valid: true };
}

export default cloudinary;