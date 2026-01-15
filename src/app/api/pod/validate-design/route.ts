import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * POST /api/pod/validate-design
 * Validate if a design image meets POD requirements
 * 
 * Requirements vary by product type:
 * - T-shirts: Minimum 150 DPI at print size, typically 4500x5400px for full front
 * - Mugs: 300 DPI, typically 2700x1100px wrap
 * - Posters: 150-300 DPI depending on size
 * - Phone cases: 300 DPI, typically 1800x2700px
 */

interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  recommendations: string[];
  imageInfo: {
    width?: number;
    height?: number;
    format?: string;
    sizeKB?: number;
    estimatedDPI?: number;
  };
  productCompatibility: {
    productType: string;
    compatible: boolean;
    reason?: string;
  }[];
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { designId, imageUrl, productTypes } = body;

    // Either designId or imageUrl required
    let targetImageUrl = imageUrl;
    
    if (designId && !imageUrl) {
      const design = await prisma.design.findUnique({
        where: { id: designId },
        select: { imageUrl: true, designerId: true }
      });
      
      if (!design) {
        return NextResponse.json(
          { message: 'Design not found' },
          { status: 404 }
        );
      }
      
      // Only allow designer or admin to validate
      if (design.designerId !== session.user.id && session.user.role !== 'ADMIN') {
        return NextResponse.json(
          { message: 'Unauthorized' },
          { status: 403 }
        );
      }
      
      targetImageUrl = design.imageUrl;
    }

    if (!targetImageUrl) {
      return NextResponse.json(
        { message: 'Image URL or design ID required' },
        { status: 400 }
      );
    }

    // Fetch image headers to get basic info
    const imageInfo = await getImageInfo(targetImageUrl);
    
    // Validate against POD requirements
    const validation = validateForPOD(imageInfo, productTypes || []);

    return NextResponse.json({
      success: true,
      ...validation
    });

  } catch (error) {
    console.error('Design validation error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to validate design'
    }, { status: 500 });
  }
}

/**
 * Get image information from URL
 */
async function getImageInfo(imageUrl: string): Promise<{
  width?: number;
  height?: number;
  format?: string;
  sizeKB?: number;
}> {
  try {
    // For Cloudinary URLs, extract dimensions from URL or transformations
    if (imageUrl.includes('cloudinary.com')) {
      const cloudinaryInfo = parseCloudinaryUrl(imageUrl);
      if (cloudinaryInfo.width && cloudinaryInfo.height) {
        return cloudinaryInfo;
      }
    }

    // Fetch image headers
    const response = await fetch(imageUrl, { method: 'HEAD' });
    
    if (!response.ok) {
      return {};
    }

    const contentType = response.headers.get('content-type') || '';
    const contentLength = response.headers.get('content-length');
    
    // Determine format from content type
    let format = 'unknown';
    if (contentType.includes('jpeg') || contentType.includes('jpg')) format = 'JPEG';
    else if (contentType.includes('png')) format = 'PNG';
    else if (contentType.includes('webp')) format = 'WebP';
    else if (contentType.includes('svg')) format = 'SVG';
    else if (contentType.includes('gif')) format = 'GIF';

    return {
      format,
      sizeKB: contentLength ? Math.round(parseInt(contentLength) / 1024) : undefined
    };
  } catch (error) {
    console.error('Failed to get image info:', error);
    return {};
  }
}

/**
 * Parse Cloudinary URL to extract image info
 */
function parseCloudinaryUrl(url: string): {
  width?: number;
  height?: number;
  format?: string;
} {
  const result: { width?: number; height?: number; format?: string } = {};
  
  // Extract format from URL
  const formatMatch = url.match(/\.([a-zA-Z]+)(\?|$)/);
  if (formatMatch) {
    result.format = formatMatch[1].toUpperCase();
  }

  // Look for width/height transformations
  const transformMatch = url.match(/\/([^/]+)\//g);
  if (transformMatch) {
    for (const transform of transformMatch) {
      const widthMatch = transform.match(/w_(\d+)/);
      const heightMatch = transform.match(/h_(\d+)/);
      if (widthMatch) result.width = parseInt(widthMatch[1]);
      if (heightMatch) result.height = parseInt(heightMatch[1]);
    }
  }

  return result;
}

/**
 * Validate image against POD requirements
 */
function validateForPOD(
  imageInfo: { width?: number; height?: number; format?: string; sizeKB?: number },
  requestedProducts: string[]
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    warnings: [],
    errors: [],
    recommendations: [],
    imageInfo: imageInfo,
    productCompatibility: []
  };

  // POD product requirements
  const productRequirements: Record<string, {
    minWidth: number;
    minHeight: number;
    recommendedWidth: number;
    recommendedHeight: number;
    maxFileSizeMB: number;
    supportedFormats: string[];
  }> = {
    'tshirt': {
      minWidth: 2400,
      minHeight: 3200,
      recommendedWidth: 4500,
      recommendedHeight: 5400,
      maxFileSizeMB: 25,
      supportedFormats: ['PNG', 'JPEG', 'JPG']
    },
    'hoodie': {
      minWidth: 2400,
      minHeight: 3200,
      recommendedWidth: 4500,
      recommendedHeight: 5400,
      maxFileSizeMB: 25,
      supportedFormats: ['PNG', 'JPEG', 'JPG']
    },
    'mug': {
      minWidth: 2000,
      minHeight: 800,
      recommendedWidth: 2700,
      recommendedHeight: 1100,
      maxFileSizeMB: 15,
      supportedFormats: ['PNG', 'JPEG', 'JPG']
    },
    'poster': {
      minWidth: 3000,
      minHeight: 4000,
      recommendedWidth: 4500,
      recommendedHeight: 6000,
      maxFileSizeMB: 50,
      supportedFormats: ['PNG', 'JPEG', 'JPG']
    },
    'phonecase': {
      minWidth: 1200,
      minHeight: 1800,
      recommendedWidth: 1800,
      recommendedHeight: 2700,
      maxFileSizeMB: 15,
      supportedFormats: ['PNG', 'JPEG', 'JPG']
    },
    'totebag': {
      minWidth: 2400,
      minHeight: 2400,
      recommendedWidth: 3600,
      recommendedHeight: 3600,
      maxFileSizeMB: 20,
      supportedFormats: ['PNG', 'JPEG', 'JPG']
    },
    'pillow': {
      minWidth: 2400,
      minHeight: 2400,
      recommendedWidth: 3600,
      recommendedHeight: 3600,
      maxFileSizeMB: 20,
      supportedFormats: ['PNG', 'JPEG', 'JPG']
    }
  };

  // Check format
  if (imageInfo.format) {
    const format = imageInfo.format.toUpperCase();
    if (format === 'SVG') {
      result.warnings.push('SVG format may not be supported by all POD providers. Consider converting to PNG.');
    } else if (format === 'GIF') {
      result.errors.push('GIF format is not supported for POD products. Please use PNG or JPEG.');
      result.isValid = false;
    } else if (format === 'WEBP') {
      result.warnings.push('WebP format may not be supported by all POD providers. Consider converting to PNG.');
    }
  }

  // Check file size
  if (imageInfo.sizeKB) {
    const sizeMB = imageInfo.sizeKB / 1024;
    if (sizeMB > 50) {
      result.errors.push(`File size (${sizeMB.toFixed(1)}MB) exceeds maximum allowed (50MB).`);
      result.isValid = false;
    } else if (sizeMB > 25) {
      result.warnings.push(`Large file size (${sizeMB.toFixed(1)}MB) may cause slower processing.`);
    }
  }

  // Check dimensions against each product type
  const productsToCheck = requestedProducts.length > 0 
    ? requestedProducts 
    : Object.keys(productRequirements);

  for (const productType of productsToCheck) {
    const req = productRequirements[productType.toLowerCase()];
    if (!req) continue;

    const compatibility: {
      productType: string;
      compatible: boolean;
      reason?: string;
    } = {
      productType: productType,
      compatible: true
    };

    if (imageInfo.width && imageInfo.height) {
      // Check minimum dimensions
      if (imageInfo.width < req.minWidth || imageInfo.height < req.minHeight) {
        compatibility.compatible = false;
        compatibility.reason = `Image dimensions (${imageInfo.width}x${imageInfo.height}px) are below minimum required (${req.minWidth}x${req.minHeight}px).`;
      }
      // Check recommended dimensions
      else if (imageInfo.width < req.recommendedWidth || imageInfo.height < req.recommendedHeight) {
        compatibility.reason = `Image dimensions (${imageInfo.width}x${imageInfo.height}px) are below recommended (${req.recommendedWidth}x${req.recommendedHeight}px). Print quality may be reduced.`;
      }

      // Estimate DPI for common print sizes
      const printWidthInches = req.recommendedWidth / 300; // Assuming 300 DPI target
      const estimatedDPI = Math.round(imageInfo.width / printWidthInches);
      result.imageInfo.estimatedDPI = estimatedDPI;

      if (estimatedDPI < 150) {
        result.warnings.push(`Estimated print DPI (${estimatedDPI}) is below recommended 150 DPI. Image may appear pixelated when printed.`);
      }
    } else {
      compatibility.reason = 'Unable to determine image dimensions. Cannot verify compatibility.';
    }

    // Check format compatibility
    if (imageInfo.format && !req.supportedFormats.includes(imageInfo.format.toUpperCase())) {
      compatibility.compatible = false;
      compatibility.reason = `Format ${imageInfo.format} is not supported. Use ${req.supportedFormats.join(' or ')}.`;
    }

    result.productCompatibility.push(compatibility);
  }

  // Add recommendations
  if (!imageInfo.width || !imageInfo.height) {
    result.recommendations.push('For best results, upload images with dimensions of at least 4500x5400 pixels for apparel.');
  }
  
  if (imageInfo.format?.toUpperCase() === 'JPEG' || imageInfo.format?.toUpperCase() === 'JPG') {
    result.recommendations.push('Consider using PNG format for designs with transparency or sharp edges.');
  }

  result.recommendations.push('Use high-resolution source files and avoid upscaling for optimal print quality.');

  // Update overall validity based on product compatibility
  const hasIncompatibleProducts = result.productCompatibility.some(p => !p.compatible);
  if (hasIncompatibleProducts) {
    result.isValid = false;
  }

  return result;
}

/**
 * GET /api/pod/validate-design
 * Get POD design requirements info
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    requirements: {
      general: {
        supportedFormats: ['PNG', 'JPEG', 'JPG'],
        maxFileSizeMB: 50,
        recommendedDPI: 300,
        minimumDPI: 150
      },
      byProduct: {
        tshirt: {
          minDimensions: '2400x3200px',
          recommendedDimensions: '4500x5400px',
          maxFileSize: '25MB',
          notes: 'Use PNG for transparent backgrounds'
        },
        hoodie: {
          minDimensions: '2400x3200px',
          recommendedDimensions: '4500x5400px',
          maxFileSize: '25MB',
          notes: 'Same as t-shirt requirements'
        },
        mug: {
          minDimensions: '2000x800px',
          recommendedDimensions: '2700x1100px',
          maxFileSize: '15MB',
          notes: 'Wide format for wrap-around printing'
        },
        poster: {
          minDimensions: '3000x4000px',
          recommendedDimensions: '4500x6000px',
          maxFileSize: '50MB',
          notes: 'Higher resolution needed for large prints'
        },
        phonecase: {
          minDimensions: '1200x1800px',
          recommendedDimensions: '1800x2700px',
          maxFileSize: '15MB',
          notes: 'Design will wrap around edges'
        },
        totebag: {
          minDimensions: '2400x2400px',
          recommendedDimensions: '3600x3600px',
          maxFileSize: '20MB',
          notes: 'Square format works best'
        },
        pillow: {
          minDimensions: '2400x2400px',
          recommendedDimensions: '3600x3600px',
          maxFileSize: '20MB',
          notes: 'Square format for pillow face'
        }
      },
      tips: [
        'Always use the highest resolution source file available',
        'PNG format is preferred for designs with transparency',
        'Avoid upscaling images as it reduces quality',
        'Ensure important elements are not too close to edges',
        'Test print a sample before selling to customers'
      ]
    }
  });
}
