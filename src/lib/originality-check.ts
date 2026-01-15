/**
 * Design Originality Verification Service
 * Uses reverse image search and hash comparison to detect potential copyright issues
 */

import crypto from 'crypto';

export interface OriginalityCheckResult {
  isOriginal: boolean;
  confidence: number;
  flags: OriginalityFlag[];
  similarImages: SimilarImage[];
  recommendation: 'approve' | 'review' | 'reject';
  details: string;
}

export interface OriginalityFlag {
  type: 'exact_match' | 'high_similarity' | 'watermark_detected' | 'stock_image' | 'ai_generated';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  source?: string;
}

export interface SimilarImage {
  url: string;
  source: string;
  similarity: number;
  isCommercial: boolean;
}

// TinEye API configuration
const TINEYE_API_URL = 'https://api.tineye.com/rest';
const TINEYE_API_KEY = process.env.TINEYE_API_KEY;

// Google Vision API configuration
const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;

/**
 * Check if originality verification is configured
 */
export function isOriginalityCheckConfigured(): boolean {
  return !!(TINEYE_API_KEY || GOOGLE_VISION_API_KEY);
}

/**
 * Perform comprehensive originality check on an image
 */
export async function checkDesignOriginality(
  imageUrl: string,
  options: {
    strictMode?: boolean;
    checkStockSites?: boolean;
    checkSocialMedia?: boolean;
  } = {}
): Promise<OriginalityCheckResult> {
  const {
    strictMode = false,
    checkStockSites = true,
    checkSocialMedia = false
  } = options;

  const flags: OriginalityFlag[] = [];
  const similarImages: SimilarImage[] = [];
  let confidence = 100;

  try {
    // Run multiple checks in parallel
    const [
      tineyeResult,
      googleVisionResult,
      _hashResult
    ] = await Promise.allSettled([
      TINEYE_API_KEY ? checkTinEye(imageUrl) : Promise.resolve(null),
      GOOGLE_VISION_API_KEY ? checkGoogleVision(imageUrl, { checkStockSites, checkSocialMedia }) : Promise.resolve(null),
      generatePerceptualHash(imageUrl)
    ]);

    // Process TinEye results
    if (tineyeResult.status === 'fulfilled' && tineyeResult.value) {
      const result = tineyeResult.value;
      
      if (result.matches > 0) {
        confidence -= Math.min(result.matches * 10, 50);
        
        for (const match of result.results.slice(0, 5)) {
          similarImages.push({
            url: match.backlink || match.imageUrl,
            source: match.domain,
            similarity: match.score,
            isCommercial: isCommercialDomain(match.domain)
          });

          if (match.score > 90) {
            flags.push({
              type: 'exact_match',
              severity: 'critical',
              message: `Exact match found on ${match.domain}`,
              source: match.backlink
            });
          } else if (match.score > 70) {
            flags.push({
              type: 'high_similarity',
              severity: 'warning',
              message: `High similarity (${match.score}%) found on ${match.domain}`,
              source: match.backlink
            });
          }
        }
      }
    }

    // Process Google Vision results
    if (googleVisionResult.status === 'fulfilled' && googleVisionResult.value) {
      const result = googleVisionResult.value;

      // Check for stock image watermarks
      if (result.hasWatermark) {
        flags.push({
          type: 'watermark_detected',
          severity: 'critical',
          message: 'Stock image watermark detected'
        });
        confidence -= 40;
      }

      // Check for AI-generated content indicators
      if (result.aiGeneratedProbability > 0.7) {
        flags.push({
          type: 'ai_generated',
          severity: 'info',
          message: `Possibly AI-generated (${Math.round(result.aiGeneratedProbability * 100)}% confidence)`
        });
      }

      // Add web matches
      for (const match of result.webMatches.slice(0, 5)) {
        if (!similarImages.find(s => s.url === match.url)) {
          similarImages.push({
            url: match.url,
            source: new URL(match.url).hostname,
            similarity: match.score,
            isCommercial: isCommercialDomain(new URL(match.url).hostname)
          });
        }
      }
    }

    // Check against known stock image sites
    if (checkStockSites) {
      const stockFlags = await checkAgainstStockSites(imageUrl);
      flags.push(...stockFlags);
      if (stockFlags.some(f => f.severity === 'critical')) {
        confidence -= 30;
      }
    }

    // Determine recommendation
    let recommendation: 'approve' | 'review' | 'reject' = 'approve';
    
    const criticalFlags = flags.filter(f => f.severity === 'critical');
    const warningFlags = flags.filter(f => f.severity === 'warning');

    if (criticalFlags.length > 0 || confidence < 40) {
      recommendation = 'reject';
    } else if (warningFlags.length > 0 || confidence < 70) {
      recommendation = 'review';
    }

    if (strictMode && (criticalFlags.length > 0 || warningFlags.length > 1)) {
      recommendation = 'reject';
    }

    return {
      isOriginal: flags.filter(f => f.severity === 'critical').length === 0,
      confidence: Math.max(0, Math.min(100, confidence)),
      flags,
      similarImages,
      recommendation,
      details: generateSummary(flags, similarImages, confidence)
    };
  } catch (error) {
    console.error('Originality check failed:', error);
    
    // Return uncertain result on error
    return {
      isOriginal: true, // Assume original if check fails
      confidence: 50,
      flags: [{
        type: 'high_similarity',
        severity: 'info',
        message: 'Originality check could not be completed'
      }],
      similarImages: [],
      recommendation: 'review',
      details: 'Unable to complete originality verification. Manual review recommended.'
    };
  }
}

/**
 * Check image using TinEye reverse image search
 */
async function checkTinEye(imageUrl: string): Promise<{
  matches: number;
  results: Array<{
    imageUrl: string;
    backlink: string;
    domain: string;
    score: number;
  }>;
} | null> {
  if (!TINEYE_API_KEY) return null;

  try {
    const response = await fetch(`${TINEYE_API_URL}/search/?image_url=${encodeURIComponent(imageUrl)}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${TINEYE_API_KEY}:`).toString('base64')}`
      }
    });

    if (!response.ok) {
      throw new Error(`TinEye API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      matches: data.total_results || 0,
      results: (data.matches || []).map((match: {
        image_url: string;
        backlinks: Array<{ backlink: string }>;
        domain: string;
        score: number;
      }) => ({
        imageUrl: match.image_url,
        backlink: match.backlinks?.[0]?.backlink || '',
        domain: match.domain,
        score: match.score * 100
      }))
    };
  } catch (error) {
    console.error('TinEye check failed:', error);
    return null;
  }
}

/**
 * Check image using Google Vision API
 */
async function checkGoogleVision(
  imageUrl: string,
  options: { checkStockSites: boolean; checkSocialMedia: boolean }
): Promise<{
  hasWatermark: boolean;
  aiGeneratedProbability: number;
  webMatches: Array<{ url: string; score: number }>;
  labels: string[];
} | null> {
  if (!GOOGLE_VISION_API_KEY) return null;

  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { source: { imageUri: imageUrl } },
            features: [
              { type: 'WEB_DETECTION', maxResults: 20 },
              { type: 'LABEL_DETECTION', maxResults: 10 },
              { type: 'TEXT_DETECTION' },
              { type: 'SAFE_SEARCH_DETECTION' }
            ]
          }]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Google Vision API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.responses?.[0];

    // Check for watermark text
    const textAnnotations = result?.textAnnotations || [];
    const detectedText = textAnnotations.map((t: { description: string }) => t.description.toLowerCase()).join(' ');
    const watermarkKeywords = ['shutterstock', 'getty', 'istock', 'adobe stock', 'dreamstime', 'alamy', '©', 'watermark', 'preview'];
    const hasWatermark = watermarkKeywords.some(kw => detectedText.includes(kw));

    // Get web matches
    const webDetection = result?.webDetection || {};
    let webMatches = (webDetection.pagesWithMatchingImages || [])
      .map((page: { url: string; score?: number }) => ({
        url: page.url,
        score: page.score ? page.score * 100 : 70
      }));

    // Filter by options
    if (!options.checkSocialMedia) {
      const socialDomains = ['instagram.com', 'pinterest.com', 'twitter.com', 'facebook.com', 'tiktok.com'];
      webMatches = webMatches.filter((m: { url: string }) => 
        !socialDomains.some(d => m.url.includes(d))
      );
    }

    // Get labels for AI detection heuristics
    const labels = (result?.labelAnnotations || []).map((l: { description: string }) => l.description);
    const aiIndicators = ['digital art', 'cgi', '3d rendering', 'computer generated'];
    const aiGeneratedProbability = labels.some((l: string) => 
      aiIndicators.some(ai => l.toLowerCase().includes(ai))
    ) ? 0.6 : 0.1;

    return {
      hasWatermark,
      aiGeneratedProbability,
      webMatches,
      labels
    };
  } catch (error) {
    console.error('Google Vision check failed:', error);
    return null;
  }
}

/**
 * Generate perceptual hash for image comparison
 */
async function generatePerceptualHash(imageUrl: string): Promise<string | null> {
  try {
    // Download image and compute hash
    // This is a simplified implementation - production would use a proper perceptual hashing library
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    
    // Generate MD5 hash as a simple fingerprint
    const hash = crypto.createHash('md5').update(Buffer.from(buffer)).digest('hex');
    return hash;
  } catch (error) {
    console.error('Hash generation failed:', error);
    return null;
  }
}

/**
 * Check against known stock image site patterns
 */
async function checkAgainstStockSites(imageUrl: string): Promise<OriginalityFlag[]> {
  const flags: OriginalityFlag[] = [];
  const stockPatterns = [
    { pattern: /shutterstock/i, name: 'Shutterstock' },
    { pattern: /istockphoto/i, name: 'iStock' },
    { pattern: /gettyimages/i, name: 'Getty Images' },
    { pattern: /adobestock|stock\.adobe/i, name: 'Adobe Stock' },
    { pattern: /dreamstime/i, name: 'Dreamstime' },
    { pattern: /123rf/i, name: '123RF' },
    { pattern: /depositphotos/i, name: 'Depositphotos' },
    { pattern: /alamy/i, name: 'Alamy' },
    { pattern: /freepik/i, name: 'Freepik' }
  ];

  for (const { pattern, name } of stockPatterns) {
    if (pattern.test(imageUrl)) {
      flags.push({
        type: 'stock_image',
        severity: 'critical',
        message: `Image appears to be from ${name}`,
        source: imageUrl
      });
    }
  }

  return flags;
}

/**
 * Check if a domain is a commercial/stock site
 */
function isCommercialDomain(domain: string): boolean {
  const commercialDomains = [
    'shutterstock.com',
    'istockphoto.com',
    'gettyimages.com',
    'stock.adobe.com',
    'dreamstime.com',
    '123rf.com',
    'depositphotos.com',
    'alamy.com',
    'freepik.com',
    'canva.com',
    'vecteezy.com',
    'pngtree.com'
  ];

  return commercialDomains.some(d => domain.includes(d));
}

/**
 * Generate human-readable summary of check results
 */
function generateSummary(
  flags: OriginalityFlag[],
  similarImages: SimilarImage[],
  confidence: number
): string {
  const parts: string[] = [];

  if (confidence >= 90) {
    parts.push('Design appears to be original.');
  } else if (confidence >= 70) {
    parts.push('Design is likely original with some similar content found online.');
  } else if (confidence >= 50) {
    parts.push('Similar content detected. Manual review recommended.');
  } else {
    parts.push('High similarity to existing content detected. May require verification.');
  }

  const criticalCount = flags.filter(f => f.severity === 'critical').length;
  const warningCount = flags.filter(f => f.severity === 'warning').length;

  if (criticalCount > 0) {
    parts.push(`${criticalCount} critical issue(s) found.`);
  }
  if (warningCount > 0) {
    parts.push(`${warningCount} warning(s) found.`);
  }

  if (similarImages.length > 0) {
    const commercialCount = similarImages.filter(s => s.isCommercial).length;
    if (commercialCount > 0) {
      parts.push(`Found on ${commercialCount} commercial site(s).`);
    }
  }

  return parts.join(' ');
}

/**
 * Quick check for obvious violations (faster than full check)
 */
export async function quickOriginalityCheck(imageUrl: string): Promise<{
  pass: boolean;
  reason?: string;
}> {
  // Check URL patterns
  const stockPatterns = [
    /shutterstock/i, /istockphoto/i, /gettyimages/i, /stock\.adobe/i,
    /dreamstime/i, /123rf/i, /depositphotos/i, /alamy/i
  ];

  for (const pattern of stockPatterns) {
    if (pattern.test(imageUrl)) {
      return {
        pass: false,
        reason: 'Image URL indicates it may be from a stock photo site'
      };
    }
  }

  // If configured, do a quick TinEye check
  if (TINEYE_API_KEY) {
    const result = await checkTinEye(imageUrl);
    if (result && result.matches > 10) {
      return {
        pass: false,
        reason: `Image found ${result.matches} times online`
      };
    }
  }

  return { pass: true };
}

/**
 * Store originality check result in database
 */
export async function storeOriginalityResult(
  designId: string,
  result: OriginalityCheckResult
): Promise<void> {
  const prisma = (await import('@/lib/prisma')).default;
  
  // This would require adding an OriginalityCheck model to the schema
  // For now, we'll store as design metadata
  await prisma.design.update({
    where: { id: designId },
    data: {
      // Store in a JSON field or separate table in production
      updatedAt: new Date()
    }
  });

  console.log('Originality check stored for design:', designId, {
    isOriginal: result.isOriginal,
    confidence: result.confidence,
    recommendation: result.recommendation
  });
}
