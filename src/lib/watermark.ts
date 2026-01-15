import cloudinary from './cloudinary';

/**
 * Watermark Service
 * Provides image watermarking for intellectual property protection
 */

interface WatermarkOptions {
  text?: string;
  opacity?: number;
  position?: 'center' | 'tile' | 'corner';
  fontSize?: number;
}

/**
 * Generate a watermarked version of an image using Cloudinary transformations
 */
export function generateWatermarkedUrl(
  publicId: string,
  options: WatermarkOptions = {}
): string {
  const {
    text = 'PREVIEW - Fashion Marketplace',
    opacity = 30,
    position = 'tile',
    fontSize = 24
  } = options;

  // Create transformation based on position
  let overlay: object;

  if (position === 'tile') {
    // Tiled watermark across the entire image
    overlay = {
      overlay: {
        font_family: 'Arial',
        font_size: fontSize,
        font_weight: 'bold',
        text: encodeURIComponent(text),
      },
      color: 'white',
      opacity: opacity,
      flags: 'tiled',
      effect: 'brightness:-20',
    };
  } else if (position === 'center') {
    // Single centered watermark
    overlay = {
      overlay: {
        font_family: 'Arial',
        font_size: fontSize * 2,
        font_weight: 'bold',
        text: encodeURIComponent(text),
      },
      color: 'white',
      opacity: opacity,
      gravity: 'center',
    };
  } else {
    // Corner watermark
    overlay = {
      overlay: {
        font_family: 'Arial',
        font_size: fontSize,
        text: encodeURIComponent(text),
      },
      color: 'white',
      opacity: opacity,
      gravity: 'south_east',
      x: 10,
      y: 10,
    };
  }

  // Generate URL with watermark transformation
  return cloudinary.url(publicId, {
    transformation: [
      { quality: 'auto', format: 'auto' },
      {
        overlay: `text:Arial_${fontSize}_bold:${encodeURIComponent(text)}`,
        color: 'white',
        opacity: opacity,
        flags: position === 'tile' ? 'tiled' : undefined,
        gravity: position === 'center' ? 'center' : position === 'corner' ? 'south_east' : undefined,
      },
    ],
    secure: true,
  });
}

/**
 * Generate a blurred preview for premium content
 */
export function generateBlurredPreview(publicId: string): string {
  return cloudinary.url(publicId, {
    transformation: [
      { quality: 'auto', format: 'auto' },
      { effect: 'blur:1000' },
      { 
        overlay: `text:Arial_32_bold:${encodeURIComponent('Premium Content')}`,
        color: 'white',
        gravity: 'center',
      },
    ],
    secure: true,
  });
}

/**
 * Generate a low-resolution preview
 */
export function generateLowResPreview(publicId: string): string {
  return cloudinary.url(publicId, {
    transformation: [
      { width: 400, height: 400, crop: 'limit' },
      { quality: 30 },
      { format: 'jpg' },
    ],
    secure: true,
  });
}

/**
 * Check if a user has viewing rights for a design
 */
export function getPreviewUrl(
  publicId: string,
  imageUrl: string,
  hasAccess: boolean,
  isOwner: boolean
): string {
  if (hasAccess || isOwner) {
    return imageUrl; // Full quality
  }
  return generateWatermarkedUrl(publicId);
}
